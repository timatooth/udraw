var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
        app: [
            'webpack-dev-server/client?http://0.0.0.0:8080', // WebpackDevServer host and port
            'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors
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
        new webpack.HotModuleReplacementPlugin(), //not needed when using webpack-dev-server from CLI
    ]
};
