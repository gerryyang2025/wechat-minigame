'use strict';

var utils = require('./utils');
var gameMeta = require('./game-meta');
var MarvelMinigameRuntime = require('./minigame-runtime');

function collectRuntimeInfo() {
  var windowInfo = {};
  var deviceInfo = {};

  if (typeof wx.getWindowInfo === 'function') {
    windowInfo = wx.getWindowInfo();
  } else if (typeof wx.getSystemInfoSync === 'function') {
    windowInfo = wx.getSystemInfoSync();
  }

  if (typeof wx.getDeviceInfo === 'function') {
    deviceInfo = wx.getDeviceInfo();
  }

  return {
    windowInfo: windowInfo,
    deviceInfo: deviceInfo
  };
}

function MarvelMinigameApp() {
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

MarvelMinigameApp.prototype.init = function () {
  this.bindEvents();
  this.showShareMenu();
  this.registerShareHandlers();
  this.createGame();
};

MarvelMinigameApp.prototype.showShareMenu = function () {
  if (!wx.showShareMenu) {
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

MarvelMinigameApp.prototype.registerShareHandlers = function () {
  if (typeof GameGlobal !== 'undefined' && GameGlobal.__marvelGameShareHandlersRegistered) {
    return;
  }

  function getSnapshot() {
    if (typeof GameGlobal === 'undefined' || !GameGlobal.__marvelGameApp) {
      return null;
    }

    var app = GameGlobal.__marvelGameApp;
    return app.game && app.game.getSnapshot ? app.game.getSnapshot() : null;
  }

  if (wx.onShareAppMessage) {
    wx.onShareAppMessage(function () {
      return gameMeta.buildShareOptions(getSnapshot());
    });
  }

  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__marvelGameShareHandlersRegistered = true;
  }
};

MarvelMinigameApp.prototype.refreshRuntimeInfo = function () {
  this.runtimeInfo = collectRuntimeInfo();
  return this.runtimeInfo;
};

MarvelMinigameApp.prototype.getViewportKey = function (runtimeInfo) {
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 812;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 375;
  var pixelRatio = windowInfo.pixelRatio || 1;
  return [width, height, pixelRatio].join('x');
};

MarvelMinigameApp.prototype.createGame = function () {
  var runtimeInfo = this.refreshRuntimeInfo();
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 812;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 375;
  var pixelRatio = windowInfo.pixelRatio || 1;

  this.viewportKey = this.getViewportKey(runtimeInfo);

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.renderer = utils.createRenderer(width, height, pixelRatio);
  this.game = new MarvelMinigameRuntime({
    canvas: this.renderer.canvas,
    ctx: this.renderer.ctx,
    width: width,
    height: height,
    pixelRatio: pixelRatio,
    runtimeInfo: runtimeInfo
  });
  this.game.init();
};

MarvelMinigameApp.prototype.bindEvents = function () {
  if (this.bound) {
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

MarvelMinigameApp.prototype.unbindEvents = function () {
  if (!this.bound) {
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

MarvelMinigameApp.prototype.handleTouchStart = function (event) {
  if (this.game) {
    this.game.handleTouchStart(event);
  }
};

MarvelMinigameApp.prototype.handleTouchMove = function (event) {
  if (this.game) {
    this.game.handleTouchMove(event);
  }
};

MarvelMinigameApp.prototype.handleTouchEnd = function (event) {
  if (this.game) {
    this.game.handleTouchEnd(event);
  }
};

MarvelMinigameApp.prototype.handleTouchCancel = function (event) {
  if (this.game) {
    this.game.handleTouchCancel(event);
  }
};

MarvelMinigameApp.prototype.handleShow = function () {
  if (this.game && this.game.handleShow) {
    this.game.handleShow();
  }
};

MarvelMinigameApp.prototype.handleHide = function () {
  if (this.game && this.game.handleHide) {
    this.game.handleHide();
  }
};

MarvelMinigameApp.prototype.handleResize = function () {
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

MarvelMinigameApp.prototype.destroy = function () {
  this.unbindEvents();

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.game = null;
  this.renderer = null;
};

module.exports = MarvelMinigameApp;

