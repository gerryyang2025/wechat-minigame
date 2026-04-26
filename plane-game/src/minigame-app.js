'use strict';

var utils = require('./utils');
var settingsStore = require('./settings');
var gameMeta = require('./game-meta');
var fontUtils = require('./font');
var PlaneMinigameRuntime = require('./minigame-runtime');

function collectRuntimeInfo() {
  var deviceInfo = {};
  var windowInfo = {};
  var menuButtonInfo = null;

  if (typeof wx.getDeviceInfo === 'function') {
    deviceInfo = wx.getDeviceInfo();
  }

  if (typeof wx.getWindowInfo === 'function') {
    windowInfo = wx.getWindowInfo();
  } else {
    windowInfo = wx.getSystemInfoSync();
  }

  if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
    try {
      menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    } catch (error) {
      menuButtonInfo = null;
    }
  }

  var safeArea = windowInfo.safeArea || null;
  var screenWidth = windowInfo.screenWidth || windowInfo.windowWidth || 0;
  var screenHeight = windowInfo.screenHeight || windowInfo.windowHeight || 0;
  var safeAreaInsets = {
    top: safeArea ? safeArea.top : 0,
    right: safeArea ? Math.max(screenWidth - safeArea.right, 0) : 0,
    bottom: safeArea ? Math.max(screenHeight - safeArea.bottom, 0) : 0,
    left: safeArea ? safeArea.left : 0
  };

  return {
    deviceInfo: deviceInfo,
    windowInfo: windowInfo,
    menuButtonInfo: menuButtonInfo,
    safeAreaInsets: safeAreaInsets
  };
}

function PlaneMinigameApp() {
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

PlaneMinigameApp.prototype.init = function () {
  fontUtils.ensureLoaded();

  if (wx.setKeepScreenOn) {
    try {
      wx.setKeepScreenOn({
        keepScreenOn: true
      });
    } catch (error) {
      // Ignore unsupported environments.
    }
  }

  this.bindEvents();
  this.showShareMenu();
  this.registerShareHandlers();
  this.createGame();
};

PlaneMinigameApp.prototype.showShareMenu = function () {
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

PlaneMinigameApp.prototype.registerShareHandlers = function () {
  function getSnapshot() {
    if (typeof GameGlobal === 'undefined' || !GameGlobal.__planeGameApp) {
      return null;
    }

    var app = GameGlobal.__planeGameApp;
    return app.game && app.game.getSnapshot ? app.game.getSnapshot() : null;
  }

  if (typeof GameGlobal !== 'undefined' && GameGlobal.__planeGameShareHandlersRegistered) {
    return;
  }

  if (wx.onShareAppMessage) {
    wx.onShareAppMessage(function () {
      return gameMeta.buildShareOptions(getSnapshot(), 'shareAppMessage');
    });
  }

  if (wx.onShareTimeline) {
    wx.onShareTimeline(function () {
      return gameMeta.buildShareOptions(getSnapshot(), 'shareTimeline');
    });
  }

  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__planeGameShareHandlersRegistered = true;
  }
};

PlaneMinigameApp.prototype.refreshRuntimeInfo = function () {
  this.runtimeInfo = collectRuntimeInfo();
  return this.runtimeInfo;
};

PlaneMinigameApp.prototype.getViewportKey = function (runtimeInfo) {
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 375;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 667;
  var pixelRatio = windowInfo.pixelRatio || 1;

  return [width, height, pixelRatio].join('x');
};

PlaneMinigameApp.prototype.createGame = function () {
  var runtimeInfo = this.refreshRuntimeInfo();
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 375;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 667;
  var pixelRatio = windowInfo.pixelRatio || 1;
  var settings = settingsStore.loadSettings();

  this.viewportKey = this.getViewportKey(runtimeInfo);

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.renderer = utils.createRenderer(width, height, pixelRatio);

  this.game = new PlaneMinigameRuntime({
    canvas: this.renderer.canvas,
    ctx: this.renderer.ctx,
    width: width,
    height: height,
    pixelRatio: pixelRatio,
    runtimeInfo: runtimeInfo,
    settings: settings
  });

  this.game.init();
};

PlaneMinigameApp.prototype.bindEvents = function () {
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

PlaneMinigameApp.prototype.unbindEvents = function () {
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

PlaneMinigameApp.prototype.handleTouchStart = function (event) {
  if (this.game) {
    this.game.handleTouchStart(event);
  }
};

PlaneMinigameApp.prototype.handleTouchMove = function (event) {
  if (this.game) {
    this.game.handleTouchMove(event);
  }
};

PlaneMinigameApp.prototype.handleTouchEnd = function (event) {
  if (this.game) {
    this.game.handleTouchEnd(event);
  }
};

PlaneMinigameApp.prototype.handleTouchCancel = function (event) {
  if (this.game) {
    this.game.handleTouchCancel(event);
  }
};

PlaneMinigameApp.prototype.handleShow = function () {
  if (!this.game) {
    return;
  }

  this.game.updateSettings(settingsStore.loadSettings());
  this.game.onShow();
};

PlaneMinigameApp.prototype.handleHide = function () {
  if (this.game) {
    this.game.onHide();
  }
};

PlaneMinigameApp.prototype.handleResize = function () {
  var nextRuntimeInfo = collectRuntimeInfo();
  var nextViewportKey = this.getViewportKey(nextRuntimeInfo);

  if (nextViewportKey === this.viewportKey) {
    return;
  }

  this.createGame();
};

PlaneMinigameApp.prototype.destroy = function () {
  this.unbindEvents();

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.game = null;
  this.renderer = null;

  if (wx.setKeepScreenOn) {
    try {
      wx.setKeepScreenOn({
        keepScreenOn: false
      });
    } catch (error) {
      // Ignore unsupported environments.
    }
  }
};

module.exports = PlaneMinigameApp;
