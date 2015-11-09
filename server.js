/* eslint no-console: 0*/
/* eslint-env node */
/* global __dirname */
var fs = require('fs');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var rateLimit = require('express-rate-limit');
var redis = require('redis');
var adapter = require('socket.io-redis');
var app = express();
var http, https, io;
var secure = false;
var tileRadius = 300;
var patchPass = 'meh patch pass yo';

try {
    var options = {
        key: fs.readFileSync(__dirname + '/udraw.key'),
        cert: fs.readFileSync(__dirname + '/udraw.crt')
    };
    https = require('https').Server(options, app);
    io = require('socket.io')(https);
    secure = true;
} catch (e) {
    console.log("No SSL certs found. using normal http.");
    http = require('http').Server(app);
    io = require('socket.io')(http);
}
var redisPort = 6379;
var host = 'localhost'; //problems here with going over the net stick with localhost for now
var tileRedis = redis.createClient(redisPort, host, {return_buffers: true});

io.adapter(adapter(redis.createClient({host: 'localhost', port: redisPort})));

app.set('trust proxy', 'loopback');
app.set('x-powered-by', false);
app.set('etag', 'strong');

var putLimiter = rateLimit({
    /* config */
    delayAfter: 0,
    max: 150
});

var staticDir = '/dist';
if (process.argv.length > 2) {
    console.warn("Serving dev files!");
    staticDir = '/public';
}

//Express Middleware
app.use('/static', express.static(__dirname + staticDir));
app.use(morgan('combined'));
app.use(bodyParser.raw({type: 'image/png', limit: '250kb'}));
app.use(bodyParser.json({type: 'application/json', limit: '250kb'}));
//app.use('/canvases', limiter);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/:x/:y', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/ogimage/:x/:y', function (req, res) {
    res.sendFile(__dirname + '/index.html');
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

var clientStates = {};
tileRedis.set("current connections", 0); //reset on boot
io.on('connection', function (socket) {
    var ip = socket.request.connection.remoteAddress;
    tileRedis.incr("totalconnections");
    tileRedis.incr("currentconnections");
    tileRedis.hset("user:" + ip, "lastconnect", Date.now() / 1000 | 0);
    tileRedis.hincrby("user:" + ip, "connectcount", 1);

    socket.emit('states', clientStates);

    socket.on('disconnect', function () {
        if (socket.id in clientStates) {
            delete clientStates[socket.id];
        }
        tileRedis.decr("current connections");
    });

    socket.on('move', function (msg) {
        msg.id = socket.id;
        socket.broadcast.emit('move', msg);
    });

    socket.on('pan', function (msg) {
        msg.id = socket.id;
        socket.broadcast.emit('pan', msg);
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
var securePort = process.env.SECUREPORT || process.env.PORT || 3443;

if (secure) {
    if (process.argv.length > 2) {
        https.listen(securePort, function () {
            console.log('HTTPS listening on *:' + securePort);
        });
    } else {
        https.listen(securePort, 'localhost', function () {
            console.log('HTTPS listening on localhost:' + securePort);
        });
    }

} else {
    if (process.argv.length > 2) {
        http.listen(port, function () {
            console.log('http listening on *:' + port);
        });
    } else {
        http.listen(port, 'localhost', function () {
            console.log('http listening on localhost:' + port);
        });
    }
}

