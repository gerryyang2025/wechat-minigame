'use strict';

var PlaneMinigameApp = require('./src/minigame-app');

if (typeof GameGlobal !== 'undefined' && GameGlobal.__planeGameApp) {
  if (typeof GameGlobal.__planeGameApp.destroy === 'function') {
    GameGlobal.__planeGameApp.destroy();
  }
}

var app = new PlaneMinigameApp();

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__planeGameApp = app;
}

app.init();
