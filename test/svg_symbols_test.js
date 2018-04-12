'use strict';

var grunt = require('grunt');
var path = require('path');

var read = function() {
  var filepath = path.join.apply(null, arguments);
  return grunt.util.normalizelf(grunt.file.read(filepath));
};

exports.svg_symbols = {
  prestorified_files: function(test) {
    var files = [
      'current_color.svg',
      'custom_options.svg',
      'default_options.svg',
      'preserve_viewbox.svg',
      'remove_attrs.svg'
    ];

    test.expect(files.length);

    files.forEach(function(file) {
      var actual = read('tmp', file);
      var expected = read('test/expected', file);
      test.equal(actual, expected, 'task output should equal ' + file);
    });

    test.done();
  }
};
