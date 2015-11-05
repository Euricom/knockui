var gulp = require('gulp');

// Tools
var del = require('del');
var connect = require('gulp-connect');
var run = require('gulp-run-sequence');
var plumber = require('gulp-plumber');
var escape = require('escape-html');
var tidy = require('htmltidy2').tidy;
var deasync = require('deasync');

// Compilation
var jade = require('jade');
var compileJade = require('gulp-jade');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var scsslint = require('gulp-scss-lint');
var nodesass = require('node-sass');


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
        .pipe(scsslint({
            'config': 'scsslint.yml'
        }))
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(gulp.dest(paths.tmp))
        .pipe(connect.reload());
});

jade.filters.jade =  function(content){
    var htmlContent = jade.render(content);
    var done = false;
    tidy(htmlContent, {
        'show-body-only': 'auto',
        hideComments: false,
        indent: true
    }, function(err, html) {
        htmlContent = html;
        done = true;
    });

    deasync.loopWhile(function(){
        return !done;
    });
    return '<div class="example">' + jade.render(content) + '</div><pre class="code"><span class="code__copy">copy to clipboard</span><code class="html">' + escape(htmlContent) + '</code></pre>';
};

jade.filters.html =  function(content){
    var htmlContent = content;
    var done = false;
    tidy(htmlContent, {
        'show-body-only': 'auto',
        hideComments: false,
        indent: true
    }, function(err, html) {
        htmlContent = html;
        done = true;
    });

    deasync.loopWhile(function(){
        return !done;
    });
    return '<div class="example">' + content + '</div><pre class="code"><span class="code__copy">copy to clipboard</span><code class="html">' + escape(htmlContent) + '</code></pre>';
};

jade.filters.scss =  function(content){
    var done = false;
    var cssContent = '@import "./lib/knockui";' + content;
    nodesass.render({
        data: cssContent
    }, function(error, result) { // node-style callback from v3.0.0 onwards
        if (result) {
            cssContent = result.css.toString();
        }
        done = true;
    });

    deasync.loopWhile(function(){
        return !done;
    });

    return '<pre class="code"><span class="code__copy">copy to clipboard</span><code class="scss">' + content + '</code></pre><style>' + cssContent + '</style>';
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
