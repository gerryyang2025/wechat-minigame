'use strict';

var MarvelMinigameApp = require('./src/minigame-app');

if (typeof GameGlobal !== 'undefined' && GameGlobal.__marvelGameApp) {
  if (typeof GameGlobal.__marvelGameApp.destroy === 'function') {
    GameGlobal.__marvelGameApp.destroy();
  }
}

var app = new MarvelMinigameApp();

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__marvelGameApp = app;
}

app.init();

