'use strict';
const webpack = require('webpack');
const webpackDevServer = require('webpack-dev-server');


const config = require("./webpack.config.js");
config.entry.app.unshift("webpack-dev-server/client?http://localhost:8080");
let compiler = webpack(config);

let server = new webpackDevServer(compiler, {
    historyApiFallback: true, //allow /z/x/y request to reach index instead of 404,
    proxy: {
        "/canvases/*": "http://localhost:3000",
    },
    headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true'
    }
});

server.listen(8080);
