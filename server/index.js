'use strict';
const http = require('http');

const canvasApiApp = require('./canvasApiServer');

let httpServer = http.Server(canvasApiApp());

let apiPort = process.env.API_PORT || 3000;
httpServer.listen(apiPort);
