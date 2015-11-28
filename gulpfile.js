var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var minifyCss = require('gulp-minify-css');
var concat = require('gulp-concat');

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
        'src/css/spectrum.css',
        'src/css/style.css'
    ])
    .pipe(concat('bundle.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest('static/css'));
});

gulp.task('default', ['webpack', 'copystatic', 'minify-css']);
