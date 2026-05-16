'use strict';

var BrickBreakerMinigameApp = require('./src/minigame-app');

if (typeof GameGlobal !== 'undefined' && GameGlobal.__brickBreakerGameApp) {
  if (typeof GameGlobal.__brickBreakerGameApp.destroy === 'function') {
    GameGlobal.__brickBreakerGameApp.destroy();
  }
}

var app = new BrickBreakerMinigameApp();

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__brickBreakerGameApp = app;
}

app.init();
