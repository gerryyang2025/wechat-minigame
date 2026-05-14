'use strict';

var utils = require('./utils');
var gameMeta = require('./game-meta');
var threeScope = require('./three-scope');
var BadNorthRuntime = require('./minigame-runtime');

function collectRuntimeInfo() {
  var windowInfo = {};
  var deviceInfo = {};
  var menuButtonInfo = null;

  if (typeof wx !== 'undefined' && typeof wx.getWindowInfo === 'function') {
    windowInfo = wx.getWindowInfo();
  } else if (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function') {
    windowInfo = wx.getSystemInfoSync();
  } else {
    windowInfo = utils.getWindowInfo();
  }

  if (typeof wx !== 'undefined' && typeof wx.getDeviceInfo === 'function') {
    deviceInfo = wx.getDeviceInfo();
  }

  if (typeof wx !== 'undefined' && typeof wx.getMenuButtonBoundingClientRect === 'function') {
    try {
      menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    } catch (error) {
      menuButtonInfo = null;
    }
  }

  return {
    windowInfo: windowInfo,
    deviceInfo: deviceInfo,
    menuButtonInfo: menuButtonInfo
  };
}

function BadNorthMinigameApp() {
  this.runtimeInfo = null;
  this.renderer = null;
  this.game = null;
  this.viewportKey = '';
  this.bound = false;

  this.handleTouchStart = this.handleTouchStart.bind(this);
  this.handleTouchMove = this.handleTouchMove.bind(this);
  this.handleTouchEnd = this.handleTouchEnd.bind(this);
  this.handleTouchCancel = this.handleTouchCancel.bind(this);
  this.handleShow = this.handleShow.bind(this);
  this.handleHide = this.handleHide.bind(this);
  this.handleResize = this.handleResize.bind(this);
}

BadNorthMinigameApp.prototype.init = function () {
  if (typeof wx !== 'undefined' && wx.setKeepScreenOn) {
    try {
      wx.setKeepScreenOn({
        keepScreenOn: true
      });
    } catch (error) {
      // Unsupported environments can ignore this.
    }
  }

  this.bindEvents();
  this.showShareMenu();
  this.registerShareHandlers();
  this.createGame();
};

BadNorthMinigameApp.prototype.showShareMenu = function () {
  if (typeof wx === 'undefined' || !wx.showShareMenu) {
    return;
  }

  try {
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });
  } catch (error) {
    wx.showShareMenu();
  }
};

BadNorthMinigameApp.prototype.registerShareHandlers = function () {
  function getSnapshot() {
    if (typeof GameGlobal === 'undefined' || !GameGlobal.__badNorthGameApp) {
      return null;
    }
    var app = GameGlobal.__badNorthGameApp;
    return app.game && app.game.getSnapshot ? app.game.getSnapshot() : null;
  }

  if (typeof GameGlobal !== 'undefined' && GameGlobal.__badNorthGameShareHandlersRegistered) {
    return;
  }

  if (typeof wx !== 'undefined' && wx.onShareAppMessage) {
    wx.onShareAppMessage(function () {
      return gameMeta.buildShareOptions(getSnapshot(), 'shareAppMessage');
    });
  }

  if (typeof wx !== 'undefined' && wx.onShareTimeline) {
    wx.onShareTimeline(function () {
      return gameMeta.buildShareOptions(getSnapshot(), 'shareTimeline');
    });
  }

  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__badNorthGameShareHandlersRegistered = true;
  }
};

BadNorthMinigameApp.prototype.refreshRuntimeInfo = function () {
  this.runtimeInfo = collectRuntimeInfo();
  return this.runtimeInfo;
};

BadNorthMinigameApp.prototype.getViewportKey = function (runtimeInfo) {
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 430;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 932;
  var pixelRatio = windowInfo.pixelRatio || 1;
  return [width, height, pixelRatio].join('x');
};

BadNorthMinigameApp.prototype.createGame = function () {
  var runtimeInfo = this.refreshRuntimeInfo();
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 430;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 932;
  var pixelRatio = windowInfo.pixelRatio || 1;

  this.viewportKey = this.getViewportKey(runtimeInfo);

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.renderer = utils.createRenderer(width, height, pixelRatio, 'webgl');
  try {
    var THREE = threeScope.createScopedThreejs(this.renderer.canvas);
    this.game = new BadNorthRuntime({
      canvas: this.renderer.canvas,
      ctx: this.renderer.ctx,
      THREE: THREE,
      width: width,
      height: height,
      pixelRatio: pixelRatio,
      runtimeInfo: runtimeInfo
    });
    this.game.init();
  } catch (error) {
    this.game = null;
    this.drawBootError(this.renderer.canvas, width, height, pixelRatio, error);
    if (typeof console !== 'undefined' && console.error) {
      console.error('[bad-north-game] boot failed:', error);
    }
  }
};

BadNorthMinigameApp.prototype.drawBootError = function (canvas, width, height, pixelRatio, error) {
  var ctx;
  try {
    ctx = canvas.getContext('2d');
  } catch (error2) {
    ctx = null;
  }
  if (!ctx) {
    return;
  }
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  if (ctx.setTransform) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }
  ctx.fillStyle = '#101820';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f8fbf5';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('北境孤岛启动失败', 24, 54);
  ctx.fillStyle = 'rgba(248,251,245,0.78)';
  ctx.font = '12px sans-serif';
  ctx.fillText('请查看微信开发者工具 Console 的 WebGL 报错。', 24, 82);
  ctx.fillText(error && error.message ? error.message : String(error), 24, 106);
};

BadNorthMinigameApp.prototype.bindEvents = function () {
  if (this.bound || typeof wx === 'undefined') {
    return;
  }

  if (wx.onTouchStart) {
    wx.onTouchStart(this.handleTouchStart);
  }
  if (wx.onTouchMove) {
    wx.onTouchMove(this.handleTouchMove);
  }
  if (wx.onTouchEnd) {
    wx.onTouchEnd(this.handleTouchEnd);
  }
  if (wx.onTouchCancel) {
    wx.onTouchCancel(this.handleTouchCancel);
  }
  if (wx.onShow) {
    wx.onShow(this.handleShow);
  }
  if (wx.onHide) {
    wx.onHide(this.handleHide);
  }
  if (wx.onWindowResize) {
    wx.onWindowResize(this.handleResize);
  }

  this.bound = true;
};

BadNorthMinigameApp.prototype.unbindEvents = function () {
  if (!this.bound || typeof wx === 'undefined') {
    return;
  }

  if (wx.offTouchStart) {
    wx.offTouchStart(this.handleTouchStart);
  }
  if (wx.offTouchMove) {
    wx.offTouchMove(this.handleTouchMove);
  }
  if (wx.offTouchEnd) {
    wx.offTouchEnd(this.handleTouchEnd);
  }
  if (wx.offTouchCancel) {
    wx.offTouchCancel(this.handleTouchCancel);
  }
  if (wx.offShow) {
    wx.offShow(this.handleShow);
  }
  if (wx.offHide) {
    wx.offHide(this.handleHide);
  }
  if (wx.offWindowResize) {
    wx.offWindowResize(this.handleResize);
  }

  this.bound = false;
};

BadNorthMinigameApp.prototype.handleTouchStart = function (event) {
  if (this.game && this.game.handleTouchStart) {
    this.game.handleTouchStart(event);
  }
};

BadNorthMinigameApp.prototype.handleTouchMove = function (event) {
  if (this.game && this.game.handleTouchMove) {
    this.game.handleTouchMove(event);
  }
};

BadNorthMinigameApp.prototype.handleTouchEnd = function (event) {
  if (this.game && this.game.handleTouchEnd) {
    this.game.handleTouchEnd(event);
  }
};

BadNorthMinigameApp.prototype.handleTouchCancel = function (event) {
  if (this.game && this.game.handleTouchCancel) {
    this.game.handleTouchCancel(event);
  }
};

BadNorthMinigameApp.prototype.handleShow = function () {
  if (this.game && this.game.handleShow) {
    this.game.handleShow();
  }
};

BadNorthMinigameApp.prototype.handleHide = function () {
  if (this.game && this.game.handleHide) {
    this.game.handleHide();
  }
};

BadNorthMinigameApp.prototype.handleResize = function () {
  var runtimeInfo = this.refreshRuntimeInfo();
  var nextViewportKey = this.getViewportKey(runtimeInfo);

  if (nextViewportKey !== this.viewportKey) {
    this.createGame();
    return;
  }

  if (this.game && this.game.handleResize) {
    this.game.handleResize(runtimeInfo.windowInfo);
  }
};

BadNorthMinigameApp.prototype.destroy = function () {
  this.unbindEvents();
  if (this.game && this.game.destroy) {
    this.game.destroy();
  }
  this.game = null;
  this.renderer = null;
};

module.exports = BadNorthMinigameApp;
