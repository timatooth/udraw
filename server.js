/* global __dirname */
var express = require('express');
var app = express();
var http = require('http');//.Server(app);
var https = require('https');//.Server(app);
var fs = require('fs');
var io = require('socket.io')(http);

var options = {
    key: fs.readFileSync(__dirname + '/udraw.key'),
    cert: fs.readFileSync(__dirname + '/udraw.crt')
};

app.use('/static', express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('disconnect', function () {
        console.log('user disconnected');
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

http.createServer(app).listen(3000);
https.createServer(options, app).listen(3443);

/*
 http.listen(3000, function () {
 console.log('http listening on *:3000');
 });
 
 http.listen(3443, function () {
 console.log('HTTPS listening on *:3443');
 });*/
