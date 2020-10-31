var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
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
        rules: [
            {
                test: /\.jsx?$/, //this covers .js and .jsx extensions
                exclude: /(node_modules|bower_components)/,
                use: ['babel-loader'],
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(png|jpg)$/,
                use: "file-loader?name=images/[name].[ext]"
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                use: 'file-loader?name=public/fonts/[name].[ext]'
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
              'NODE_ENV': JSON.stringify('production'),
              'SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN || ''),
              'SENTRY_PUBLIC_DSN': JSON.stringify(process.env.SENTRY_PUBLIC_DSN || ''),
            }
        }),
        new webpack.HotModuleReplacementPlugin(), //not needed when using webpack-dev-server from CLI
        new HtmlWebpackPlugin({
          title: 'Custom template',
          template: 'src/index.ejs',
        })
    ]
};
