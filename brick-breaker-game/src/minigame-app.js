'use strict';

var utils = require('./utils');
var gameMeta = require('./game-meta');
var threeScope = require('./three-scope');
var BrickBreakerRuntime = require('./minigame-runtime');
var MAX_RENDER_PIXEL_RATIO = 1.5;

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

function BrickBreakerMinigameApp() {
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

BrickBreakerMinigameApp.prototype.init = function () {
  if (typeof wx !== 'undefined' && wx.setKeepScreenOn) {
    try {
      wx.setKeepScreenOn({ keepScreenOn: true });
    } catch (error) {
      // Ignore unsupported environments.
    }
  }
  this.bindEvents();
  this.showShareMenu();
  this.registerShareHandlers();
  this.createGame();
};

BrickBreakerMinigameApp.prototype.showShareMenu = function () {
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

BrickBreakerMinigameApp.prototype.registerShareHandlers = function () {
  function getSnapshot() {
    if (typeof GameGlobal === 'undefined' || !GameGlobal.__brickBreakerGameApp) {
      return null;
    }
    var app = GameGlobal.__brickBreakerGameApp;
    return app.game && app.game.getSnapshot ? app.game.getSnapshot() : null;
  }

  if (typeof GameGlobal !== 'undefined' && GameGlobal.__brickBreakerShareHandlersRegistered) {
    return;
  }

  if (typeof wx !== 'undefined' && wx.onShareAppMessage) {
    wx.onShareAppMessage(function () {
      return gameMeta.buildShareOptions(getSnapshot());
    });
  }

  if (typeof wx !== 'undefined' && wx.onShareTimeline) {
    wx.onShareTimeline(function () {
      return gameMeta.buildShareOptions(getSnapshot());
    });
  }

  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__brickBreakerShareHandlersRegistered = true;
  }
};

BrickBreakerMinigameApp.prototype.refreshRuntimeInfo = function () {
  this.runtimeInfo = collectRuntimeInfo();
  return this.runtimeInfo;
};

BrickBreakerMinigameApp.prototype.getViewportKey = function (runtimeInfo) {
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 430;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 932;
  var devicePixelRatio = windowInfo.pixelRatio || 1;
  var pixelRatio = Math.min(windowInfo.pixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
  return [width, height, pixelRatio].join('x');
};

BrickBreakerMinigameApp.prototype.createGame = function () {
  var runtimeInfo = this.refreshRuntimeInfo();
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 430;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 932;
  var devicePixelRatio = windowInfo.pixelRatio || 1;
  var pixelRatio = Math.min(windowInfo.pixelRatio || 1, MAX_RENDER_PIXEL_RATIO);

  this.viewportKey = this.getViewportKey(runtimeInfo);

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.renderer = utils.createRenderer(width, height, pixelRatio, 'webgl');
  try {
    var THREE = threeScope.createScopedThreejs(this.renderer.canvas);
    this.game = new BrickBreakerRuntime({
      canvas: this.renderer.canvas,
      THREE: THREE,
      width: width,
      height: height,
      pixelRatio: pixelRatio,
      devicePixelRatio: devicePixelRatio,
      runtimeInfo: runtimeInfo
    });
    this.game.init();
  } catch (error) {
    this.game = null;
    this.drawBootError(this.renderer.canvas, width, height, pixelRatio, error);
    if (typeof console !== 'undefined' && console.error) {
      console.error('[brick-breaker-game] boot failed:', error);
    }
  }
};

BrickBreakerMinigameApp.prototype.drawBootError = function (canvas, width, height, pixelRatio, error) {
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
  ctx.fillStyle = '#06101f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px sans-serif';
  ctx.fillText('方块破坏王启动失败', 24, 54);
  ctx.font = '12px sans-serif';
  ctx.fillText('请查看微信开发者工具 Console 的 WebGL 报错。', 24, 82);
  ctx.fillText(error && error.message ? error.message : String(error), 24, 106);
};

BrickBreakerMinigameApp.prototype.bindEvents = function () {
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

BrickBreakerMinigameApp.prototype.unbindEvents = function () {
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

BrickBreakerMinigameApp.prototype.handleTouchStart = function (event) {
  if (this.game && this.game.handleTouchStart) {
    this.game.handleTouchStart(event);
  }
};

BrickBreakerMinigameApp.prototype.handleTouchMove = function (event) {
  if (this.game && this.game.handleTouchMove) {
    this.game.handleTouchMove(event);
  }
};

BrickBreakerMinigameApp.prototype.handleTouchEnd = function (event) {
  if (this.game && this.game.handleTouchEnd) {
    this.game.handleTouchEnd(event);
  }
};

BrickBreakerMinigameApp.prototype.handleTouchCancel = function (event) {
  if (this.game && this.game.handleTouchCancel) {
    this.game.handleTouchCancel(event);
  }
};

BrickBreakerMinigameApp.prototype.handleShow = function () {
  if (this.game && this.game.handleShow) {
    this.game.handleShow();
  }
};

BrickBreakerMinigameApp.prototype.handleHide = function () {
  if (this.game && this.game.handleHide) {
    this.game.handleHide();
  }
};

BrickBreakerMinigameApp.prototype.handleResize = function () {
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

BrickBreakerMinigameApp.prototype.destroy = function () {
  this.unbindEvents();
  if (this.game && this.game.destroy) {
    this.game.destroy();
  }
  this.game = null;
  this.renderer = null;
};

module.exports = BrickBreakerMinigameApp;
