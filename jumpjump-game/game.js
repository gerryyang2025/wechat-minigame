'use strict';

var JumpJumpMinigameApp = require('./src/minigame-app');

if (typeof GameGlobal !== 'undefined' && GameGlobal.__jumpJumpGameApp) {
  if (typeof GameGlobal.__jumpJumpGameApp.destroy === 'function') {
    GameGlobal.__jumpJumpGameApp.destroy();
  }
}

var app = new JumpJumpMinigameApp();

if (typeof GameGlobal !== 'undefined') {
  GameGlobal.__jumpJumpGameApp = app;
}

app.init();
