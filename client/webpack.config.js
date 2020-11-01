var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        app: [
            "./src/index.js"
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "udraw-client.js",
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/, //this covers .js and .jsx extensions
                exclude: /(node_modules)/,
                use: ['babel-loader'],
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(png|jpg)$/,
                use: "file-loader"
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                use: 'file-loader'
            }
        ]
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new HtmlWebpackPlugin({
          title: 'udraw multiplayer',
          template: 'src/index.html'
        })
    ]
};
