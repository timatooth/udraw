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
var port = 6379;
var host = 'localhost'; //problems here with going over the net stick with localhost for now
var tileRedis = redis.createClient(port, host, {return_buffers: true});

io.adapter(adapter(redis.createClient({host: 'localhost', port: 6379})));

//rate limit trust nginx
app.enable('trust proxy');

var putLimiter = rateLimit({
    /* config */
    delayAfter: 0,
    max: 150
});

//Express Middleware
app.use('/static', express.static(__dirname + '/dist'));
app.use(morgan('combined'));
app.use(bodyParser.raw({type: 'image/png', limit: '250kb'}));
//app.use('/canvases', limiter);

app.get('/', function (req, res) {
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

    var key = req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;
    console.log(req.body.length);
    tileRedis.set(key, req.body);
    res.sendStatus(201);
    tileRedis.incr('total puts');
    tileRedis.hincrby("user:" + req.ip, "putcount", 1);
});

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
    tileRedis.get(key, function (err, reply) {
        if (err !== null) {
            console.log(err);
            res.sendStatus(500);
        } else if (reply === null) {
            res.sendStatus(204); //make them create the tile
        } else {
            tileRedis.incr('total gets');
            res.set('Content-Type', 'image/png');
            res.send(reply);
        }
    });
});

var clientStates = {};
tileRedis.set("current connections", 0); //reset on boot
io.on('connection', function (socket) {
    var ip = socket.request.connection.remoteAddress;
    tileRedis.incr("total connections");
    tileRedis.incr("current connections");
    tileRedis.hsetnx("user:" + ip, "lastconnect", Date.now() / 1000 | 0);
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
    https.listen(securePort, function () {
        console.log('HTTPS listening on *:' + securePort);
    });
} else {
    http.listen(port, function () {
        console.log('http listening on *:' + port);
    });
}

