var path = require('path');

module.exports = {
    entry: {
        app: ["./src/js/udraw.js"]
    },
    output: {
        path: path.resolve(__dirname, "static"),
        filename: "js/udraw-bundle.js",
        publicPath: "/static/",
    },
    //module: {
    //    loaders: [
    //        { test: /\.css$/, loader: "style!css" }
    //    ]
    //}
};