var path = require('path');

module.exports = {
    entry: {
        app: ["./src/js/App.jsx"]
    },
    output: {
        path: path.resolve(__dirname, "static"),
        filename: "js/udraw-bundle.js",
        publicPath: "/assets/",
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/, //this covers .js and .jsx extensions
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader', // 'babel' or 'babel-loader' is also a legal name to reference
                query: {
                    presets: ['react', 'es2015']
                }
            }, //end of babel loader
            {
                test: /\.scss$/,
                loaders: ["style", "css", "sass"]
            }
        ]
    }
};