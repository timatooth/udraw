'use strict';
const path = require('path');
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');
const canvasApiServer = require('./server/canvasApiServer');
const websocketServer = require('./server/websocketServer');

//phase 1a start udraw rest API server
canvasApiServer().listen(3000);
//phase 1b start websocket server
websocketServer().listen(3001);

//phase 2. start webpack-dev-server proxying api requests to express api server and websocket server
const config = require("./webpack.config.js");
config.entry.app.unshift("webpack-dev-server/client?http://localhost:8080");
let compiler = webpack(config);

let server = new webpackDevServer(compiler, {
    contentBase: path.resolve(__dirname, 'public'),
    hot: true,
    historyApiFallback: true, //allow /z/x/y request to reach index instead of 404,
    proxy: {
        "/canvases/*": "http://localhost:3000",
        "/socket.io/*": "http://localhost:3001"
    },
    headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true'
    }
});

server.listen(8080);
