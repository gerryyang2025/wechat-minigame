'use strict';

var fs = require('fs');
var path = require('path');

var rootDir = path.resolve(__dirname, '..');
var jsFiles = [
  'game.js',
  'libs/three.js',
  'scripts/runtime-sim.js',
  'scripts/smoke.js',
  'scripts/validate.js',
  'src/audio.js',
  'src/game-meta.js',
  'src/minigame-app.js',
  'src/minigame-runtime.js',
  'src/three-scope.js',
  'src/utils.js'
];
var jsonFiles = [
  'game.json',
  'project.config.json',
  'project.private.config.example.json'
];
var failures = [];

function checkJs(file) {
  var fullPath = path.join(rootDir, file);
  try {
    new Function(fs.readFileSync(fullPath, 'utf8'));
    console.log('OK  ', file);
  } catch (error) {
    failures.push(file + ': ' + error.message);
    console.log('FAIL', file, error.message);
  }
}

function checkJson(file) {
  var fullPath = path.join(rootDir, file);
  try {
    JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log('OK  ', file);
  } catch (error) {
    failures.push(file + ': ' + error.message);
    console.log('FAIL', file, error.message);
  }
}

jsFiles.forEach(checkJs);
jsonFiles.forEach(checkJson);

if (failures.length) {
  console.log('');
  console.log('Validation failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('');
console.log('Validated ' + (jsFiles.length + jsonFiles.length) + ' files successfully.');
