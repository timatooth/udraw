/* global __dirname */
var fs = require('fs');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var redis = require('redis').createClient;
var adapter = require('socket.io-redis');
var app = express();
var http, https, io;
var secure = false;

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
var pass = "superbugoutshonehereofdraughtretrocedeMeyerbeer";
var port = 6379;
var host = 'localhost'; //problems here with going over the net stick with localhost for now
var pub = redis(port, host, {return_buffers: true, auth_pass: pass}); //FIXME
var sub = redis(port, host, {return_buffers: true, auth_pass: pass});
io.adapter(adapter({pubClient: pub, subClient: sub}));

//Express Middleware
app.use('/static', express.static(__dirname + '/public'));
app.use(morgan('combined'));
app.use(bodyParser.raw({type: 'image/png'}));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.put('/canvases/:name/:zoom/:x/:y', function (req, res) {
    var key = req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;
    console.log(req.body.length);
    pub.set(key, req.body);
    res.sendStatus(201);
});

app.get('/canvases/:name/:zoom/:x/:y', function (req, res) {
    var key = req.params.name + ':' + req.params.zoom + ':' + req.params.x + ':' + req.params.y;
    pub.get(key, function (err, reply) {
        if (err !== null) {
            console.log(err);
            res.sendStatus(500);
        } else if (reply === null) {
            res.sendStatus(404); //eh?
        } else {
            //console.log(reply);
            console.log("res size is " + reply.length);
            res.set('Content-Type', 'image/png');
            res.send(reply);
        }
    });
});

var clientStates = {};

io.on('connection', function (socket) {
    var ip = socket.request.connection.remoteAddress;
    console.log('a user connected: ' + ip);

    socket.emit('states', clientStates);

    socket.on('disconnect', function () {
        if (socket.id in clientStates) {
            delete clientStates[socket.id];
        }

        console.log('user disconnected: ' + ip);
    });

    socket.on('move', function (msg) {
        msg.id = socket.id;
        socket.broadcast.emit('move', msg);
    });

    socket.on('status', function (msg) {
        if (msg.size > 30 || msg.size < 1 || msg.opacity > 1 || msg.opacity < 0) {
            console.log("Got malicious input from user changing tool size: " + socket.request.connection.remoteAddress);
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

