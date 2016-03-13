var path = require('path');
var webpack = require('webpack');
var webpackDevServer = require('webpack-dev-server');

//phase 1 start udraw rest API server

//...

//phase 2. start webpack-dev-server proxying api requests to express
var config = require("./webpack.config.js");
config.entry.app.unshift("webpack-dev-server/client?http://localhost:8080");
var compiler = webpack(config);

var server = new webpackDevServer(compiler, {
    contentBase: path.resolve(__dirname, "static"),
    hot: true,
    historyApiFallback: true, //allow /z/x/y request to reach index instead of 404,
    publicPath: "/assets/", //wtf is this for...
    proxy: {
        "/canvases/*": "http://localhost:3000",
        "/socket.io/*": "http://localhost:3000"
    }
});

server.listen(8080);