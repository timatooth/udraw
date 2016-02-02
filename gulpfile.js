var gulp = require('gulp');
var gutil = require('gulp-util');
var minifyCss = require('gulp-minify-css');
var concat = require('gulp-concat');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');

gulp.task('browserify', function () {
    var bro = browserify({
        entries: './src/js/udraw.js',
        debug: true
    });

    return bro.bundle()
            .pipe(source('./udraw.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
            // Add transformation tasks to the pipeline here.
            .pipe(uglify())
            .on('error', gutil.log)
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./static/js/'));
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

gulp.task('watch', function () {
    gulp.watch('src/js/*.js', ['browserify']);
    gulp.watch('src/css/*.css', ['minify-css']);
});

gulp.task('default', ['browserify', 'copystatic', 'minify-css']);
