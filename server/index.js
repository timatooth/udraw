'use strict';
const cluster = require('cluster');
const http = require('http');
const os = require('os');
const numCPUs = (os.cpus().length > 1) ? os.cpus().length : 2;

const canvasApiServer = require('./canvasApiServer');
const websocketServer = require('./websocketServer');

// Canvas REST api server is clustered
// Socket.io server is NOT clustered... yet

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
    
    //TODO: Investigate best option forsocket.io for worker for session sanity.
    // e.g Ngix hasing or sticky-session with node clustering
    let socketPort = process.env.WEBSOCKET_PORT || 3001;
    websocketServer().listen(socketPort);
} else {
    // Workers can share any TCP connection
    // In this case it is an HTTP server
    let apiPort = process.env.API_PORT || 3000;
    canvasApiServer().listen(apiPort);
}