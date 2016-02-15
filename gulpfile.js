var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var minifyCss = require('gulp-minify-css');
var concat = require('gulp-concat');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var opn = require('opn');
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');

gulp.task('browserify', function () {
    var bro = browserify({
        entries: './src/js/udraw.js',
        debug: true
    });

    return bro.bundle()
            .pipe(source('./udraw-bundle.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
            // Add transformation tasks to the pipeline here.
            .pipe(uglify())
            .on('error', gutil.log)
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./static/js/'));
});

//webpack build
var webpackConfig = require("./webpack.config");

gulp.task('webpack', function(callback){
    webpack(webpackConfig, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString({
            // output options
        }));
        callback();
    });
})

//webpack dev server (run on watch)
gulp.task("webpack-dev-server", function(callback) {
    // Start a webpack-dev-server
    var compiler = webpack(webpackConfig);

    new WebpackDevServer(compiler, {
        // server and middleware options
        contentBase: path.resolve(__dirname, "static"),
        historyApiFallback: true, //allow /z/x/y request to reach index instead of 404,
        publicPath: "/assets/", //wtf is this for...
        proxy: {
            "/canvases/*": "http://localhost:3000",
            "/socket.io/*": "http://localhost:3000"
        }
    }).listen(8080, "localhost", function(err) {
        if(err) throw new gutil.PluginError("webpack-dev-server", err);
        // Server listening
        gutil.log("[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/");

        // keep the server alive or continue?
        // callback();
        opn("http://localhost:8080/webpack-dev-server/index.html");
    });
});

gulp.task('copystatic', function () {
    gulp.src('src/fonts/**/')
            .pipe(gulp.dest('static/fonts'));
    gulp.src('src/images/**/')
            .pipe(gulp.dest('static/images'));
    gulp.src('src/index.html')
            .pipe(gulp.dest('static'));
});

gulp.task('minify-css', function () {
    return gulp.src([
        'src/css/font-awesome.css',
        'src/css/ionicons.css',
        'src/css/pnotify.brighttheme.css',
        'src/css/spectrum.css',
        'src/css/style.css'
    ])
            .pipe(concat('bundle.css'))
            .pipe(minifyCss())
            .pipe(gulp.dest('static/css'));
});

gulp.task('watch', ['webpack-dev-server'], function () {
    //gulp.watch('src/js/*.js', ['webpack']);
    gulp.watch('src/css/*.css', ['minify-css']);
});

gulp.task('default', ['webpack', 'copystatic', 'minify-css']);
