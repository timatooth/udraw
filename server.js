/*
 udraw

 (c) 2015 Tim Sullivan
 udraw may be freely distributed under the MIT license.
 For all details and documentation: github.com/timatooth/udraw
 */

/* eslint no-console: 0*/
/* eslint-env node */
/* global __dirname */
'use strict';
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var rateLimit = require('express-rate-limit');
var cors = require('cors');
var redis = require('redis');
var adapter = require('socket.io-redis');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var secure = false;
/** Boundary limit for fetching tiles */
var tileRadius = 300;
var patchPass = 'meh patch pass yo';
//location of static web files
var staticDir = path.join(__dirname, 'static')

var redisPort = 6379;
var host = 'localhost';
var tileRedis = redis.createClient(redisPort, host, {return_buffers: true});

io.adapter(adapter(redis.createClient({host: host, port: redisPort})));

app.set('trust proxy', 'loopback');
app.set('x-powered-by', false);
//app.set('etag', 'strong'); //need to revisit this. Edge caches too aggressively

var putLimiter = rateLimit({
    /* config */
    delayAfter: 0,
    max: 150
});


//Express Middleware
app.use('/', express.static(staticDir));
app.use(morgan('combined'));
app.use(bodyParser.raw({type: 'image/png', limit: '250kb'}));
app.use(bodyParser.json({type: 'application/json', limit: '250kb'}));
app.use(cors());

app.get('/', function (req, res) {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.get('/:x/:y', function (req, res) {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.get('/ogimage/:x/:y', function (req, res) {
    res.sendFile(path.join(staticDir, 'images/og-image.png'));
});

app.put('/canvases/:name/:zoom/:x/:y', putLimiter, function (req, res) {
    var p = req.params;
    if (p.name !== "main") {
        return res.sendStatus(404);
    } else if (Number(p.zoom) !== 1) {
        return res.sendStatus(404);
    } else if (Number(p.x) < -(tileRadius / 2) ||
            Number(p.x) > tileRadius / 2 ||
            Number(p.y) < -(tileRadius / 2) ||
            Number(p.y) > tileRadius / 2) {
        return res.sendStatus(416); //requested outside range
    }

    var key = "tile:" + req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;

    tileRedis.hget(key, "protection", function (err, data) {
        if (Number(data) === 0) {
            saveTile(key, req, res);
        } else {
            tileRedis.hget(key, "lastuser", function (err, user) {
                console.log(String(user));
                if (String(user) === req.ip) {
                    saveTile(key, req, res);
                } else {
                    res.sendStatus(403);
                }
            });
        }
    });
});

var saveTile = function (key, req, res) {
    tileRedis.hset(key, "data", req.body);
    tileRedis.hset(key, "lastuser", req.ip);
    tileRedis.hset(key, "lastupdate", Date.now() / 1000);
    tileRedis.hset(key, "protection", 0);

    res.sendStatus(201);
    tileRedis.incr('putcount');
    tileRedis.hincrby("user:" + req.ip, "putcount", 1);
};

app.get('/canvases/:name/:zoom/:x/:y', function (req, res) {
    var p = req.params;
    if (p.name !== "main") {
        return res.sendStatus(404);
    } else if (Number(p.zoom) !== 1) {
        return res.sendStatus(404);
    } else if (Number(p.x) < -(tileRadius / 2) ||
            Number(p.x) > tileRadius / 2 ||
            Number(p.y) < -(tileRadius / 2) ||
            Number(p.y) > tileRadius / 2) {
        return res.sendStatus(416); //requested outside range
    }

    var key = req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;
    tileRedis.hget("tile:" + key, "data", function (err, reply) {
        if (err !== null) {
            console.log(err);
            res.sendStatus(500);
        } else if (reply === null) {
            res.sendStatus(204); //make them create the tile
        } else {
            tileRedis.incr('getcount');
            tileRedis.hincrby("user:" + req.ip, "getcount", 1);
            res.set('Content-Type', 'image/png');
            res.send(reply);
        }
    });
});

app.patch('/canvases/:name/:zoom/:x/:y', function (req, res) {
    if (('creds' in req.body) && req.body.creds === patchPass) {
        var key = "tile:" + req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;
        tileRedis.hset(key, "protection", 1, function (err) {
            if (err === null) {
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
        });
    } else {
        res.sendStatus(401);
    }
});

/******************** - Socket.IO code - ********************************/

/** Store the socket id with tool states and pan offsets */
var clientStates = {};
tileRedis.set("currentconnections", 0); //reset on boot

io.on('connection', function (socket) {
    var ip = socket.request.connection.remoteAddress;
    tileRedis.incr("totalconnections");
    tileRedis.incr("currentconnections");
    tileRedis.hset("user:" + ip, "lastconnect", Date.now() / 1000 | 0);
    tileRedis.hincrby("user:" + ip, "connectcount", 1);

    socket.emit('states', clientStates);

    socket.on('disconnect', function () {
        if (clientStates.hasOwnProperty(socket.id)) {
            delete clientStates[socket.id];
        }
        tileRedis.decr("currentconnections");
    });

    function inRadius(diamater, x, y, client) {
        var r = diamater / 2;
        if (x > -r + client.offset.x && x < r + client.offset.y && y > -r + client.offset.y && r + client.offset.y) {
            return true;
        }
        return false;
    }

    socket.on('move', function (msg) {
        msg.id = socket.id;
        Object.keys(clientStates).forEach(function (key) {
            if (socket.id === key) { //not send move to initator of the move
                return;
            }
            //when someone is 3000px or more from the client don't relay the move
            if (inRadius(6000, msg.x, msg.y, clientStates[key]) === true) {
                io.to(key).emit('move', msg);
            }
        });
    });

    socket.on('pan', function (msg) {
        msg.id = socket.id;
        socket.broadcast.emit('pan', msg);
        if (clientStates.hasOwnProperty(socket.id)) {
            clientStates[socket.id].offset = msg
        }
    });

    socket.on('ping', function () {
        socket.emit('pong');
    });

    socket.on('status', function (msg) {
        if (msg.size > 60 || msg.size < 1 || msg.opacity > 1 || msg.opacity < 0) {
            tileRedis.sadd("malicious", ip);
            return;
        }
        clientStates[socket.id] = msg;
        msg.id = socket.id;
        socket.broadcast.emit('status', msg);
    });
});

var port = process.env.PORT || 3000;

if (process.argv.length > 2) {
    //listen on all ports in dev
    http.listen(port, function () {
        console.log('http listening on *:' + port);
    });
} else {
    //only listen on localhost
    http.listen(port, 'localhost', function () {
        console.log('http listening on localhost:' + port);
    });
}
