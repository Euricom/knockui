var gulp = require('gulp');

// Tools
var del = require('del');
var connect = require('gulp-connect');
var run = require('gulp-run-sequence');
var plumber = require('gulp-plumber');
var escape = require('escape-html');

// Compilation
var jade = require('jade');
var compileJade = require('gulp-jade');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

// Config
var paths = {
    demo: {
        styles: 'demo/**/*.scss',
        views: 'demo/**/*.jade'
    },
    lib: 'lib/**/*.scss',
    tmp: '.tmp'
};

var ports = {
    tmp: 50000
};

// Compilation
gulp.task('clean', function () {
    del.sync(paths.tmp);
});

gulp.task('styles', function () {
    return gulp.src(paths.demo.styles)
        .pipe(plumber())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(gulp.dest(paths.tmp))
        .pipe(connect.reload());
});

jade.filters.source =  function(src, options){
    return '<div class="example">' + jade.render(src, options) + '</div><pre class="code"><code class="html">' + escape(jade.render(src, options)) + '</code></pre>';
};

gulp.task('views', function () {
    return gulp.src(paths.demo.views)
        .pipe(compileJade({
            jade: jade
        }))
        .pipe(gulp.dest(paths.tmp))
        .pipe(connect.reload());
});

gulp.task('compile', function (cb) {
    run('clean', [
        'styles',
        'views'
    ], cb);
});

gulp.task('serve', ['compile'], function () {
    gulp.watch(paths.demo.views, ['views']);
    gulp.watch(paths.demo.styles, ['styles']);
    gulp.watch(paths.lib, ['styles']);

    // Connect to server
    connect.server({
        root: [paths.tmp, './'],
        port: ports.tmp,
        livereload: true
    });
});

// Default Task
gulp.task('default', [
    'serve'
]);
