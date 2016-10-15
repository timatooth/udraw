var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        app: [
            "./src/js/udraw.js"
        ]
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: "js/udraw-bundle.js",
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/, //this covers .js and .jsx extensions
                exclude: /(node_modules|bower_components)/,
                loaders: ['react-hot', 'babel?presets[]=react,presets[]=es2015'],
            },
            {
                test: /\.scss$/,
                loaders: ["style", "css", "sass"]
            },
            {
                test: /\.png$/, loader: "file-loader"
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': { 'NODE_ENV': JSON.stringify('production') }
        }),
        new HtmlWebpackPlugin({
          title: 'Custom template',
          template: 'src/index.ejs',
        })
    ]
};
