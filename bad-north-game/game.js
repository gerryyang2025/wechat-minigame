'use strict';

var BadNorthMinigameApp = require('./src/minigame-app');

if (typeof GameGlobal !== 'undefined' && GameGlobal.__badNorthGameApp) {
  if (typeof GameGlobal.__badNorthGameApp.destroy === 'function') {
    GameGlobal.__badNorthGameApp.destroy();
  }
}

var app = new BadNorthMinigameApp();

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__badNorthGameApp = app;
}

app.init();
