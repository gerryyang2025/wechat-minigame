'use strict';

var utils = require('./utils');
var font = require('./font');
var gameMeta = require('./game-meta');
var DefenseMinigameRuntime = require('./minigame-runtime');

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

function DefenseMinigameApp() {
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

DefenseMinigameApp.prototype.init = function () {
  font.ensureLoaded();
  this.bindEvents();
  this.showShareMenu();
  this.registerShareHandlers();
  this.createGame();
};

DefenseMinigameApp.prototype.showShareMenu = function () {
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

DefenseMinigameApp.prototype.registerShareHandlers = function () {
  if (typeof GameGlobal !== 'undefined' && GameGlobal.__defenseGameShareHandlersRegistered) {
    return;
  }

  function getSnapshot() {
    if (typeof GameGlobal === 'undefined' || !GameGlobal.__defenseGameApp) {
      return null;
    }
    return GameGlobal.__defenseGameApp.game && GameGlobal.__defenseGameApp.game.getSnapshot
      ? GameGlobal.__defenseGameApp.game.getSnapshot()
      : null;
  }

  if (wx.onShareAppMessage) {
    wx.onShareAppMessage(function () {
      return gameMeta.buildShareOptions(getSnapshot(), 'menu');
    });
  }

  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__defenseGameShareHandlersRegistered = true;
  }
};

DefenseMinigameApp.prototype.refreshRuntimeInfo = function () {
  this.runtimeInfo = collectRuntimeInfo();
  return this.runtimeInfo;
};

DefenseMinigameApp.prototype.getViewportKey = function (runtimeInfo) {
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 430;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 932;
  var pixelRatio = windowInfo.pixelRatio || 1;
  return [width, height, pixelRatio].join('x');
};

DefenseMinigameApp.prototype.createGame = function () {
  var runtimeInfo = this.refreshRuntimeInfo();
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var width = windowInfo.windowWidth || windowInfo.screenWidth || 430;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || 932;
  var pixelRatio = windowInfo.pixelRatio || 1;

  this.viewportKey = this.getViewportKey(runtimeInfo);

  if (this.game && this.game.destroy) {
    this.game.destroy();
  }

  this.renderer = utils.createRenderer(width, height, pixelRatio);
  this.game = new DefenseMinigameRuntime({
    canvas: this.renderer.canvas,
    ctx: this.renderer.ctx,
    width: width,
    height: height,
    pixelRatio: pixelRatio,
    runtimeInfo: runtimeInfo
  });
  this.game.init();
};

DefenseMinigameApp.prototype.bindEvents = function () {
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

DefenseMinigameApp.prototype.unbindEvents = function () {
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

DefenseMinigameApp.prototype.handleTouchStart = function (event) {
  if (this.game) {
    this.game.handleTouchStart(event);
  }
};

DefenseMinigameApp.prototype.handleTouchMove = function (event) {
  if (this.game && this.game.handleTouchMove) {
    this.game.handleTouchMove(event);
  }
};

DefenseMinigameApp.prototype.handleTouchEnd = function (event) {
  if (this.game && this.game.handleTouchEnd) {
    this.game.handleTouchEnd(event);
  }
};

DefenseMinigameApp.prototype.handleTouchCancel = function (event) {
  if (this.game && this.game.handleTouchCancel) {
    this.game.handleTouchCancel(event);
  }
};

DefenseMinigameApp.prototype.handleShow = function () {
  if (this.game && this.game.handleShow) {
    this.game.handleShow();
  }
};

DefenseMinigameApp.prototype.handleHide = function () {
  if (this.game && this.game.handleHide) {
    this.game.handleHide();
  }
};

DefenseMinigameApp.prototype.handleResize = function () {
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

DefenseMinigameApp.prototype.destroy = function () {
  this.unbindEvents();
  if (this.game && this.game.destroy) {
    this.game.destroy();
  }
  this.game = null;
  this.renderer = null;
};

module.exports = DefenseMinigameApp;
