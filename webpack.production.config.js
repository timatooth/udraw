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
        path: path.resolve(__dirname, 'public'),
        filename: "js/udraw-bundle.js"
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/, //this covers .js and .jsx extensions
                exclude: /(node_modules|bower_components)/,
                loaders: ['babel-loader?presets[]=react,presets[]=es2015'],
            },
            {
                test: /\.scss$/,
                loaders: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.(png|jpg)$/,
                loader: "file-loader?name=images/[name].[ext]"
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file-loader?name=fonts/[name].[ext]'
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
              'NODE_ENV': JSON.stringify('production'),
              'SENTRY_KEY': JSON.stringify(process.env.SENTRY_KEY || '')
            }
        }),
        new HtmlWebpackPlugin({
          title: 'Custom template',
          template: 'src/index.ejs',
        })
    ]
};
