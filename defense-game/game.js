'use strict';

var DefenseMinigameApp = require('./src/minigame-app');

if (typeof GameGlobal !== 'undefined' && GameGlobal.__defenseGameApp) {
  if (typeof GameGlobal.__defenseGameApp.destroy === 'function') {
    GameGlobal.__defenseGameApp.destroy();
  }
}

var app = new DefenseMinigameApp();

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__defenseGameApp = app;
}

app.init();
