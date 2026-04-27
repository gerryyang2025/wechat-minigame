'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var rootDir = path.resolve(__dirname, '..');
var jsFiles = [];
var jsonFiles = [];

function walk(dir) {
  fs.readdirSync(dir, {
    withFileTypes: true
  }).forEach(function (entry) {
    var fullPath = path.join(dir, entry.name);
    var relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        return;
      }
      walk(fullPath);
      return;
    }

    if (relativePath === 'project.private.config.json') {
      return;
    }

    if (entry.name.slice(-3) === '.js') {
      jsFiles.push(relativePath);
      return;
    }

    if (entry.name.slice(-5) === '.json') {
      jsonFiles.push(relativePath);
    }
  });
}

function validateJs(relativePath) {
  var fullPath = path.join(rootDir, relativePath);
  var source = fs.readFileSync(fullPath, 'utf8');
  new vm.Script(source, {
    filename: relativePath
  });
  console.log('OK  ', relativePath);
}

function validateJson(relativePath) {
  var fullPath = path.join(rootDir, relativePath);
  JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  console.log('OK  ', relativePath);
}

walk(rootDir);
jsFiles.sort();
jsonFiles.sort();

jsFiles.forEach(validateJs);
jsonFiles.forEach(validateJson);

console.log('');
console.log('Validated ' + (jsFiles.length + jsonFiles.length) + ' files successfully.');
