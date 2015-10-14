/* global __dirname */
var fs = require('fs');
var express = require('express');
var app = express();
var options = {
    key: fs.readFileSync(__dirname + '/udraw.key'),
    cert: fs.readFileSync(__dirname + '/udraw.crt')
};
var http = require('http');//.Server(app);
var https = require('https').Server(options, app);
var io = require('socket.io')(https);

app.use('/static', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    var ip = socket.request.connection.remoteAddress;
    console.log('a user connected: ' + ip);

    socket.on('disconnect', function () {
        console.log('user disconnected: ' + ip);
    });

    socket.on('move', function (msg) {
        msg.id = socket.id;
        socket.broadcast.emit('move', msg);
    });

    socket.on('status', function (msg) {
        if (msg.size > 20 || msg.size < 1 || msg.opacity > 1 || msg.opacity < 0) {
            console.log("Got malicious input from user changing tool size: " + socket.request.connection.remoteAddress);
            return;
        }
        msg.id = socket.id;
        socket.broadcast.emit('status', msg);
    });
});


/*
 http.listen(3000, function () {
 console.log('http listening on *:3000');
 });
 */

https.listen(3443, function () {
    console.log('HTTPS listening on *:3443');
});