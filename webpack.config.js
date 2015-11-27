var path = require('path');

module.exports = {
    entry: "./public/js/canvaspaint.js",
    output: {
        filename: "bundle.js",
        path: path.join(__dirname, 'static'),
        publicPath: './'
    },
    module: {
        loaders: [
        //     { test: /\.css$/, loader: "style!css" }
          {
            test: /.*.js/,
            loader: "uglify"
          }
        ]
    },
    'uglify-loader': {
      mangle: true
    }
};
