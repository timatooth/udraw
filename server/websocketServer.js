'use strict';
const redis = require('redis');
const adapter = require('socket.io-redis');
const http = require('http');
const socketio = require('socket.io');
const StatsD = require('node-dogstatsd').StatsD;
const dogstatsd = new StatsD();

const websocketServer = () => {
    let app = require('express')();
    let httpServer = require('http').Server(app);
    let io = socketio(httpServer);
    
    let tileRedis = redis.createClient(
        process.env.REDIS_PORT || 6379,
        process.env.REDIS_HOST || 'localhost',
        { return_buffers: true }
    );
    
    /** Store the socket id with tool states and pan offsets */
    let clientStates = {};
    
    io.on('connection', (socket) => {
        let ip = socket.request.connection.remoteAddress;
        tileRedis.incr("totalconnections");
        tileRedis.incr("currentconnections");
        tileRedis.hset("user:" + ip, "lastconnect", Date.now() / 1000 | 0);
        tileRedis.hincrby("user:" + ip, "connectcount", 1);
        dogstatsd.increment('websocket.connections');
        
        socket.emit('states', clientStates);
        
        socket.on('disconnect', () => {
            if (clientStates.hasOwnProperty(socket.id)) {
                delete clientStates[socket.id];
            }
            tileRedis.decr("currentconnections");
            dogstatsd.increment('websocket.disconnections');
        });

        function inRadius(diamater, x, y, client) {
            let r = diamater / 2;
            return x > -r + client.offsetX &&
                x < r + client.offsetX &&
                y > -r + client.offsetY &&
                y < r + client.offsetY
        }
        
        socket.on('move', (msg) => {
            let id = socket.id;
            msg.id = id;
            Object.keys(clientStates).forEach( (key) => {
                if (socket.id === key) { //not send move to initator of the move
                    return;
                }
                //when someone is 3000px or more from the client don't relay the move
                if (inRadius(6000, msg.x, msg.y, clientStates[key])) {
                    io.to(key).emit('move', msg);
                }
            });
            dogstatsd.increment('websocket.move');
        });
        
        socket.on('pan', (msg) => {
            msg.id = socket.id;
            socket.broadcast.emit('pan', msg);
            if (clientStates.hasOwnProperty(socket.id)) {
                clientStates[socket.id].offset = msg
            }
            dogstatsd.increment('websocket.pan');
        });
        
        socket.on('ping', () => {
            socket.emit('pong');
        });
        
        socket.on('status', (msg) => {
            if (msg.size > 120 || msg.size < 1 || msg.opacity > 1 || msg.opacity < 0) {
                tileRedis.sadd("malicious", ip);
                return;
            }
            clientStates[socket.id] = msg;
            msg.id = socket.id;
            socket.broadcast.emit('status', msg);
            dogstatsd.increment('websocket.statuschange');
        });
        
    });
    
    return httpServer;
}

module.exports = websocketServer;
