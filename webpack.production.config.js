const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        app: [
            "./src/js/udraw.js"
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "udraw-bundle.js"
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
        new HtmlWebpackPlugin({
          title: 'Custom template',
          template: 'src/index.ejs',
        })
    ]
};
