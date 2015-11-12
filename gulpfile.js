var gulp = require('gulp');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var eslint = require('gulp-eslint');

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

gulp.task('lint', function () {
    return gulp.src(['public/**/*.js', 'server.js', 'gulpfile.js'])
            // eslint() attaches the lint output to the "eslint" property 
            // of the file object so it can be used by other modules. 
            .pipe(eslint())
            // eslint.format() outputs the lint results to the console. 
            // Alternatively use eslint.formatEach() (see Docs). 
            .pipe(eslint.format())
            // To have the process exit with an error code (1) on 
            // lint error, return the stream and pipe to failAfterError last. 
            .pipe(eslint.failAfterError());
});

gulp.task('default', ['lint', 'uglifyjs', 'copystatic', 'minify-css']);
