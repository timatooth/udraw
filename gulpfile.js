var gulp = require('gulp');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');

gulp.task('uglifyjs', function () {
    return gulp.src('public/js/canvaspaint.js')
            .pipe(uglify())
            .pipe(gulp.dest('dist/js'));
});

gulp.task('copystatic', function () {
    gulp.src('public/fonts/**/')
            .pipe(gulp.dest('dist/fonts'));
    gulp.src('public/images/**/')
            .pipe(gulp.dest('dist/images'));
    gulp.src('index.html')
            .pipe(gulp.dest('dist'));
});

gulp.task('minify-css', function () {
    return gulp.src('public/css/*.css')
            .pipe(minifyCss())
            .pipe(gulp.dest('dist/css'));
});

gulp.task('default', ['uglifyjs', 'copystatic', 'minify-css']);