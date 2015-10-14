/* global __dirname */
var fs = require('fs');
var express = require('express');
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

app.use('/static', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
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

if (secure) {
    https.listen(3443, function () {
        console.log('HTTPS listening on *:3443');
    });
} else {
    http.listen(3000, function () {
        console.log('http listening on *:3000');
    });
}

