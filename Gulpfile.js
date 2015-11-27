var gulp = require('gulp');

// Tools
var del = require('del');
var cleanUpDirectories = require('remove-empty-directories');
var connect = require('gulp-connect');
var run = require('gulp-run-sequence');
var plumber = require('gulp-plumber');
var escape = require('escape-html');
var tidy = require('htmltidy2').tidy;
var deasync = require('deasync');
var filter = require('gulp-filter');
var replace = require('gulp-replace');

// Compilation
var jade = require('jade');
var compileJade = require('gulp-jade');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var scsslint = require('gulp-scss-lint');
var nodesass = require('node-sass');
var iconfont = require('gulp-iconfont');
var iconfontCss = require('gulp-iconfont-css');
var cssMin = require('gulp-cssmin');

// Deployment
var git = require('gulp-git');
var bump = require('gulp-bump');
var args = require('yargs').argv;
var tag = require('gulp-tag-version');

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
    tmp: 50000,
    reload: 50001
};

// Compilation
gulp.task('clean', function () {
    del.sync(paths.tmp);
});

gulp.task('lint', function() {
    return gulp.src(paths.lib)
        .pipe(scsslint({
            'config': 'scsslint.yml'
        }));
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

var fontName = 'ko-icon';
var runTimestamp = Math.round(Date.now()/1000);
gulp.task('iconfont', function(){
    gulp.src(['assets/**/*.svg'])
        .pipe(iconfontCss({
            path: 'assets/scss.template',
            fontName: fontName,
            targetPath: '../utils/_icons.scss',
            fontPath: '#{$ko-font-path}',
            cssClass: 'ko-icon'
        }))
        .pipe(iconfont({
            formats: ['ttf', 'eot', 'woff', 'svg'],
            fontName: fontName,
            timestamp: runTimestamp
        }))
        .pipe(gulp.dest('lib/fonts/'));
});
gulp.task('iconfont-placeholders', function(){
    gulp.src(['assets/**/*.svg'])
        .pipe(iconfontCss({
            path: 'assets/placeholders.template',
            fontName: fontName,
            targetPath: '../shared/placeholders/_icons.scss',
            fontPath: '#{$ko-font-path}',
            cssClass: 'ko-icon'
        }))
        .pipe(iconfont({
            formats: ['ttf', 'eot', 'woff', 'svg'],
            fontName: fontName,
            timestamp: runTimestamp
        }))
        .pipe(gulp.dest('lib/fonts/'));
});

var tidyOptions = {
    'input-xml': true,
    'show-body-only': 'auto',
    hideComments: false,
    indent: true,
    'drop-empty-elements': false,
    'drop-empty-paras': false,
    'merge-divs': false,
    'merge-emphasis': false,
    'merge-spans': false,
    'output-html': true
};

jade.filters.jade =  function(content){
    var renderedContent = jade.render(content, {
        debug: false
    });
    var htmlContent = renderedContent;
    var done = false;
    tidy(htmlContent, tidyOptions, function(err, html) {
        htmlContent = html;
        done = true;
    });
    deasync.loopWhile(function(){
        return !done;
    });
    htmlContent = escape(htmlContent);
    return '<div class="example">' + renderedContent + '</div><pre class="code"><span class="code__copy">copy to clipboard</span><code class="html">' + htmlContent + '</code></pre>';
};

jade.filters.html =  function(content){
    var htmlContent = content;
    var done = false;
    tidy(htmlContent, tidyOptions, function(err, html) {
        htmlContent = html;
        done = true;
    });

    deasync.loopWhile(function(){
        return !done;
    });
    htmlContent = escape(htmlContent);
    return '<div class="example">' + content + '</div><pre class="code"><span class="code__copy">copy to clipboard</span><code class="html">' + htmlContent + '</code></pre>';
};

jade.filters.scss =  function(content){
    var done = false;
    var cssContent = '@import "./lib/knockui";' + content;
    nodesass.render({
        data: cssContent
    }, function(error, result) {
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
        'lint',
        'styles',
        'views'
    ], cb);
});

// Serve
gulp.task('serve', ['compile'], function () {
    gulp.watch(paths.demo.views, ['styles', 'views']);
    gulp.watch(paths.demo.styles, ['styles']);
    gulp.watch(paths.lib, ['lint', 'styles']);

    // Connect to server
    connect.server({
        root: [paths.tmp, './'],
        port: ports.tmp,
        livereload: {
            port: ports.reload
        }
    });
});

// Prepare dist folder
gulp.task('prepare', [
  'iconfont',
  'iconfont-placeholders',
  'compile'
]);

gulp.task('prepare-sass', ['prepare'], function(){
  return gulp.src('lib/**/*')
    .pipe(gulp.dest('dist/sass'));
});

gulp.task('prepare-css', ['prepare-sass'], function(done){
  var copySass = gulp.src('lib/**/*.scss')
    .pipe(replace(/(@extend %ko)/g, '@extend .ko'))
    .pipe(replace(/(%ko)/g, '.ko'))
    .pipe(replace(/\.\.\/fonts\//g, './fonts/'))
    .pipe(gulp.dest('dist/css'));
  var compileSassDone = false;

  var copyFonts = gulp.src('lib/fonts/**/*')
    .pipe(gulp.dest('dist/css/fonts'));
  var copyFontsDone = false;

  copySass.on('end', function() {
    var compileSass = gulp.src('dist/css/**/*.scss')
      .pipe(sass())
      .pipe(autoprefixer())
      .pipe(cssMin())
      .pipe(gulp.dest('dist/css'));

    compileSass.on('end', function() {
      compileSassDone = true;

      del.sync('dist/css/**/*.scss');
      cleanUpDirectories('dist');

      if (copyFontsDone && compileSassDone) {
        done();
      }
    });
  });

  copyFonts.on('end', function() {
    copyFontsDone = true;
    if (copyFontsDone && compileSassDone) {
      done();
    }
  });
});

gulp.task('build', ['prepare-css']);

// Deployment
function handleError(err) {
  if (err) throw err;
}

gulp.task('push-build', [
    'build'
], function(done) {
  var stream = gulp.src(['./demo/**/*', './lib/**/*', './dist/**/*'])
    .pipe(git.commit('build new version'));

  stream.on('end', function() {
    git.push('origin', 'develop', function(err){
      handleError(err);
      done();
    });
  });
});

function release(importance, done) {
  git.fetch('origin', '', function(err){
    handleError(err);
    git.checkout('master', function(err){
      handleError(err);
      git.merge('develop', function(err){
        handleError(err);
        var stream = gulp.src(['./package.json', './bower.json'])
            .pipe(bump({type: importance}))
            .pipe(gulp.dest('./'))
            .pipe(git.commit('bumps package version'))
            .pipe(filter('package.json'))
            .pipe(tag());

        stream.on('end', function() {
          git.push('origin', 'master', {args: '--follow-tags'}, function(err){
            handleError(err);
            done();
          });
        });
      })
    })
  })
}

gulp.task('patch', ['push-build'], function(done) { release('patch', done); })
gulp.task('minor', ['push-build'], function(done) { release('minor', done); })
gulp.task('major', ['push-build'], function(done) { release('major', done); })

// Default Task
gulp.task('default', [
    'serve'
]);
