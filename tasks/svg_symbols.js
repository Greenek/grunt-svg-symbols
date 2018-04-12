/*
 * @greenek/grunt-svg-symbols
 * https://github.com/Greenek/grunt-svg-symbols
 *
 * Copyright (c) 2018 Paweł Golonko
 * Copyright (c) 2015 Manuel Wieser
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');

var cheerio = require('cheerio');
var SVGO = require('svgo');
var handlebars = require('handlebars');

module.exports = function(grunt) {
  grunt.registerMultiTask(
    'svg_symbols',
    'Generate an SVG icon system (based on `<symbol>`) of a specified folder',
    function() {
      var done = this.async();

      var options = this.options({
        className: 'u-hidden',
        currentColor: false,
        height: null,
        preserveViewBox: false,
        svgoOptions: {},
        template: null,
        width: null,
      });

      if (options.svgoOptions !== false) {
        var svgoOptions = Object.assign({
          floatPrecision: 1,
        }, options.svgoOptions);

        if (!Array.isArray(svgoOptions.plugins)) {
          svgoOptions.plugins = [];
        }

        // Backward compatibility
        if ('precision' in options) {
          svgoOptions.floatPrecision = Number(options.precision);
        }

        if ('removeAttrs' in options) {
          svgoOptions.plugins.push({
            removeAttrs: { attrs: options.removeAttrs },
          });
        }

        var svgo = new SVGO(svgoOptions);

        options.preProcess = svgo.optimize.bind(svgo);
      }

      if (typeof options.template !== 'function') {
        var templatePath = options.template || path.resolve(__dirname, '../templates/template.hbs');
        options.template = handlebars.compile(grunt.file.read(templatePath));
      }

      var promises = this.files.map(function(f) {
        var files = f.src
          .filter(function(filepath) {
            if (!grunt.file.exists(filepath)) {
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false;
            } else {
              return true;
            }
          })
          .map(function(filepath) {
            var src = grunt.file.read(filepath);

            if (typeof options.preProcess === 'function') {
              src = options.preProcess(src, { path: filepath });
            }

            return Promise.resolve(src).then(function(result) {
              var $ = cheerio.load(result.data || result);
              var $svg = $('svg');

              if (options.currentColor) {
                $svg.find('[fill]:not([fill="none"])').attr('fill', 'currentColor');
                $svg.find('[stroke]:not([stroke="none"])').attr('stroke', 'currentColor');

                $svg.find(':not([fill])').each(function() {
                  if (!$(this).parents('g[fill]').length) {
                    $(this).attr('fill', 'currentColor');
                  }
                });
              }

              var info = Object.assign({}, result.info || { width: $svg.width(), height: $svg.height() }, { filepath: filepath });

              var name = path.basename(filepath, '.svg');
              var symbols = {};

              if (typeof options.process === 'function') {
                Object.assign(symbols, options.process($svg, name, info));
              }

              symbols.name = symbols.name || name;

              if (options.preserveViewBox) {
                symbols.viewBox = $svg.attr('viewbox');
              } else {
                symbols.viewBox = symbols.viewBox || [0, 0, options.width || info.width, options.height || info.height].join(' ');
              }

              symbols.content = symbols.content || $svg.html();

              return symbols;
            });
          });

        return Promise.all(files).then(function(symbols) {
          var result = options.template({
            symbols: symbols,
            className: options.className
          });

          grunt.file.write(f.dest, result);
          grunt.log.writeln('File "' + f.dest + '" created.');
        });
      });

      Promise.all(promises).then(done);
    }
  );
};
