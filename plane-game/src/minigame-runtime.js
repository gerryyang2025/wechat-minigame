'use strict';

var utils = require('./utils');
var entities = require('./entities');
var gameMeta = require('./game-meta');
var MiniGameAudio = require('./audio');
var fontUtils = require('./font');
var powerUpStyles = require('./powerup-style');

var STORAGE_KEY = 'plane-game-best-score';
var LEADERBOARD_KEY = 'plane-game-leaderboard';
var PAPER_LIGHT = '#f8f3e8';
var PAPER_MID = '#ebe2d3';
var PAPER_DARK = '#d9cfbf';
var INK = '#342d28';
var SOFT_INK = '#6a6056';
var LIGHT_INK = '#9b8f84';
var PANEL_FILL = 'rgba(248, 244, 236, 0.94)';
var PANEL_FILL_ALT = 'rgba(236, 228, 215, 0.98)';
var PANEL_STROKE = 'rgba(71, 61, 51, 0.82)';
var BOMB_SUPPLY_INTERVAL_MIN = 15;
var BOMB_SUPPLY_INTERVAL_RANGE = 7;
var SLOW_MOTION_DURATION = 6;
var SCORE_BOOST_DURATION = 10;
var SCORE_BOOST_MULTIPLIER = 2;
var MAX_SHARE_REVIVES = 3;
var Player = entities.Player;
var Enemy = entities.Enemy;
var Explosion = entities.Explosion;
var PowerUp = entities.PowerUp;

function getPowerUpStyle(type) {
  return powerUpStyles.getPowerUpStyle(type);
}

function pickTouch(event, identifier) {
  var touches = [];

  if (event && event.touches && event.touches.length) {
    touches = event.touches;
  } else if (event && event.changedTouches && event.changedTouches.length) {
    touches = event.changedTouches;
  }

  if (identifier === null || identifier === undefined) {
    return normalizeTouch(touches[0] || null);
  }

  for (var i = 0; i < touches.length; i += 1) {
    if (touches[i].identifier === identifier) {
      return normalizeTouch(touches[i]);
    }
  }

  return null;
}

function normalizeTouch(touch) {
  if (!touch) {
    return null;
  }

  return {
    identifier: touch.identifier,
    x: touch.x !== undefined ? touch.x : (touch.clientX !== undefined ? touch.clientX : touch.pageX),
    y: touch.y !== undefined ? touch.y : (touch.clientY !== undefined ? touch.clientY : touch.pageY)
  };
}

function setUiFont(ctx, size, weight) {
  fontUtils.applyCanvasFont(ctx, size, weight);
}

function setCoverFont(ctx, size, weight) {
  fontUtils.applyCanvasFont(ctx, size, weight);
}

function drawCoverDisplayText(ctx, text, x, y, options) {
  var settings = options || {};
  var size = settings.size || 24;
  var fillStyle = settings.fillStyle || INK;
  var strokeStyle = settings.strokeStyle || 'rgba(255, 255, 255, 0.72)';
  var lineWidth = settings.lineWidth || Math.max(1.4, size * 0.08);

  ctx.save();
  ctx.textAlign = settings.textAlign || 'center';
  ctx.textBaseline = settings.textBaseline || 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = settings.shadowColor || 'rgba(56, 46, 38, 0.14)';
  ctx.shadowBlur = settings.shadowBlur || 0;
  ctx.shadowOffsetY = settings.shadowOffsetY || Math.max(1, size * 0.05);
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  setCoverFont(ctx, size, settings.weight || null);
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPaperPanel(ctx, x, y, width, height, radius, fillStyle) {
  utils.drawSketchRoundRect(
    ctx,
    x,
    y,
    width,
    height,
    radius,
    fillStyle || PANEL_FILL,
    PANEL_STROKE,
    1.4
  );
}

function drawPanelUnderline(ctx, x, y, width, alpha) {
  return;
}

function drawPencilButton(ctx, rect, label, options) {
  var settings = options || {};
  var fillStyle = settings.fillStyle || (settings.primary ? PANEL_FILL_ALT : PANEL_FILL);
  var textColor = settings.textColor || INK;

  drawPaperPanel(ctx, rect.x, rect.y, rect.width, rect.height, 18, fillStyle);
  drawPanelUnderline(ctx, rect.x + 18, rect.y + rect.height - 12, rect.width - 36, 0.36);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  if (settings.displayStyle === 'cover') {
    drawCoverDisplayText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 2, {
      size: settings.fontSize || 20,
      fillStyle: textColor,
      strokeStyle: settings.strokeStyle || 'rgba(255, 255, 255, 0.78)',
      lineWidth: Math.max(0.9, (settings.fontSize || 20) * 0.055),
      weight: settings.fontWeight || null,
      shadowColor: 'rgba(70, 58, 45, 0.12)',
      shadowOffsetY: 1.2
    });
  } else {
    setUiFont(ctx, settings.fontSize || 19, 'bold');
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 2);
  }
  ctx.restore();
}

function drawSummaryCard(ctx, rect, label, value) {
  var labelSize = Math.max(10, rect.height * 0.2);
  var valueSize = Math.max(15, rect.height * 0.32);

  drawPaperPanel(ctx, rect.x, rect.y, rect.width, rect.height, 18, 'rgba(247, 243, 236, 0.94)');

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = SOFT_INK;
  setUiFont(ctx, labelSize, null);
  ctx.fillText(label, rect.x + 12, rect.y + 10);

  ctx.fillStyle = INK;
  setUiFont(ctx, valueSize, null);
  ctx.fillText(value, rect.x + 12, rect.y + 30);
  ctx.restore();
}

function drawHudBadgeIcon(ctx, x, y, size, style) {
  var iconColor = style.ink || INK;
  var accent = style.accent || SOFT_INK;

  ctx.save();

  if (style.icon === 'double') {
    utils.drawSketchLine(ctx, x - size * 0.22, y - size * 0.28, x - size * 0.12, y + size * 0.18, {
      strokeStyle: iconColor,
      lineWidth: 1.15,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x + size * 0.02, y - size * 0.28, x + size * 0.12, y + size * 0.18, {
      strokeStyle: iconColor,
      lineWidth: 1.15,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x - size * 0.28, y + size * 0.12, x - size * 0.06, y + size * 0.12, {
      strokeStyle: accent,
      lineWidth: 0.95,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x - size * 0.04, y + size * 0.12, x + size * 0.18, y + size * 0.12, {
      strokeStyle: accent,
      lineWidth: 0.95,
      jitter: 0.14
    });
  } else if (style.icon === 'firepower') {
    utils.drawSketchLine(ctx, x, y - size * 0.32, x, y + size * 0.16, {
      strokeStyle: iconColor,
      lineWidth: 1.15,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x - size * 0.2, y - size * 0.08, x - size * 0.1, y + size * 0.22, {
      strokeStyle: accent,
      lineWidth: 1.05,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x + size * 0.2, y - size * 0.08, x + size * 0.1, y + size * 0.22, {
      strokeStyle: accent,
      lineWidth: 1.05,
      jitter: 0.14
    });
    utils.drawSketchStroke(ctx, function (strokeCtx) {
      strokeCtx.moveTo(x, y - size * 0.34);
      strokeCtx.lineTo(x + size * 0.1, y - size * 0.12);
      strokeCtx.lineTo(x, y - size * 0.04);
      strokeCtx.lineTo(x - size * 0.1, y - size * 0.12);
      strokeCtx.closePath();
    }, {
      strokeStyle: iconColor,
      lineWidth: 1,
      jitter: 0.12
    });
  } else if (style.icon === 'shield') {
    utils.drawSketchStroke(ctx, function (strokeCtx) {
      strokeCtx.moveTo(x, y - size * 0.32);
      strokeCtx.lineTo(x + size * 0.18, y - size * 0.14);
      strokeCtx.lineTo(x + size * 0.14, y + size * 0.16);
      strokeCtx.lineTo(x, y + size * 0.3);
      strokeCtx.lineTo(x - size * 0.14, y + size * 0.16);
      strokeCtx.lineTo(x - size * 0.18, y - size * 0.14);
      strokeCtx.closePath();
    }, {
      strokeStyle: iconColor,
      lineWidth: 1.05,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x, y - size * 0.2, x, y + size * 0.18, {
      strokeStyle: accent,
      lineWidth: 0.95,
      jitter: 0.14
    });
  } else if (style.icon === 'slow') {
    utils.drawSketchStroke(ctx, function (strokeCtx) {
      strokeCtx.moveTo(x - size * 0.18, y - size * 0.28);
      strokeCtx.lineTo(x + size * 0.18, y - size * 0.28);
      strokeCtx.lineTo(x + size * 0.06, y - size * 0.02);
      strokeCtx.lineTo(x + size * 0.06, y + size * 0.04);
      strokeCtx.lineTo(x + size * 0.18, y + size * 0.28);
      strokeCtx.lineTo(x - size * 0.18, y + size * 0.28);
      strokeCtx.lineTo(x - size * 0.06, y + size * 0.04);
      strokeCtx.lineTo(x - size * 0.06, y - size * 0.02);
      strokeCtx.closePath();
    }, {
      strokeStyle: iconColor,
      lineWidth: 1,
      jitter: 0.14
    });
    utils.drawSketchLine(ctx, x - size * 0.08, y - size * 0.16, x + size * 0.08, y - size * 0.16, {
      strokeStyle: accent,
      lineWidth: 0.9,
      jitter: 0.12
    });
    utils.drawSketchLine(ctx, x - size * 0.08, y + size * 0.16, x + size * 0.08, y + size * 0.16, {
      strokeStyle: accent,
      lineWidth: 0.9,
      jitter: 0.12
    });
  } else if (style.icon === 'score') {
    ctx.fillStyle = iconColor;
    setUiFont(ctx, size * 0.62, 'bold');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x2', x, y);
    utils.drawSketchLine(ctx, x - size * 0.24, y + size * 0.26, x + size * 0.24, y + size * 0.26, {
      strokeStyle: accent,
      lineWidth: 0.9,
      jitter: 0.12
    });
  } else {
    ctx.fillStyle = iconColor;
    setUiFont(ctx, size * 0.62, 'bold');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.label || '补', x, y);
  }

  ctx.restore();
}

function renderHudBadge(ctx, badge, x, y, width, height, scale) {
  var centerY = y + height / 2;
  var iconX = x + 18 * scale;
  var iconSize = 14 * scale;
  var textX = x + 34 * scale;

  utils.drawSketchRoundRect(
    ctx,
    x,
    y,
    width,
    height,
    999,
    badge.fill,
    badge.stroke,
    1.1
  );
  drawHudBadgeIcon(ctx, iconX, centerY, iconSize, badge.style);

  ctx.save();
  ctx.fillStyle = badge.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setUiFont(ctx, 11 * scale, 'bold');
  ctx.fillText(
    badge.label + ' ' + badge.timer.toFixed(1) + '秒',
    textX,
    centerY + 1 * scale
  );
  ctx.restore();
}

function drawHpPips(ctx, x, y, hp, maxHp, scale) {
  var pipWidth = 16 * scale;
  var pipHeight = 8 * scale;
  var gap = 5 * scale;

  for (var i = 0; i < maxHp; i += 1) {
    utils.drawSketchRoundRect(
      ctx,
      x + i * (pipWidth + gap),
      y,
      pipWidth,
      pipHeight,
      999,
      i < hp ? 'rgba(220, 108, 79, 0.95)' : 'rgba(219, 209, 194, 0.68)',
      i < hp ? 'rgba(131, 76, 54, 0.52)' : 'rgba(109, 98, 88, 0.28)',
      1
    );
  }
}

function drawCoverPlaneIcon(ctx, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(66, 57, 48, 0.08)';
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.84, width * 0.28, height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width * 0.5, 0);
  ctx.lineTo(width * 0.92, height * 0.8);
  ctx.lineTo(width * 0.62, height * 0.64);
  ctx.lineTo(width * 0.56, height);
  ctx.lineTo(width * 0.5, height * 0.82);
  ctx.lineTo(width * 0.44, height);
  ctx.lineTo(width * 0.38, height * 0.64);
  ctx.lineTo(width * 0.08, height * 0.8);
  ctx.closePath();
  ctx.fillStyle = '#f8f4ec';
  ctx.fill();

  utils.drawSketchStroke(ctx, function (strokeCtx) {
    strokeCtx.moveTo(width * 0.5, 0);
    strokeCtx.lineTo(width * 0.92, height * 0.8);
    strokeCtx.lineTo(width * 0.62, height * 0.64);
    strokeCtx.lineTo(width * 0.56, height);
    strokeCtx.lineTo(width * 0.5, height * 0.82);
    strokeCtx.lineTo(width * 0.44, height);
    strokeCtx.lineTo(width * 0.38, height * 0.64);
    strokeCtx.lineTo(width * 0.08, height * 0.8);
    strokeCtx.closePath();
  }, {
    strokeStyle: INK,
    lineWidth: 1.8,
    jitter: 0.95
  });

  utils.drawSketchLine(ctx, width * 0.5, height * 0.08, width * 0.5, height * 0.82, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.3,
    jitter: 0.45
  });
  utils.drawSketchLine(ctx, width * 0.5, height * 0.2, width * 0.18, height * 0.72, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.1,
    jitter: 0.4
  });
  utils.drawSketchLine(ctx, width * 0.5, height * 0.2, width * 0.82, height * 0.72, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.1,
    jitter: 0.4
  });
  ctx.restore();
}

function normalizeLeaderboard(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.filter(function (record) {
    return record && typeof record.score === 'number' && record.score >= 0;
  }).sort(function (a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (b.survivalTime || 0) - (a.survivalTime || 0);
  }).slice(0, 5);
}

function PlaneMinigameRuntime(options) {
  options = options || {};

  var runtimeInfo = options.runtimeInfo || {};
  var windowInfo = runtimeInfo.windowInfo || utils.getWindowInfo();
  var safeArea = windowInfo.safeArea || null;

  this.canvas = options.canvas;
  this.ctx = options.ctx;
  this.width = options.width || windowInfo.windowWidth || windowInfo.screenWidth || 375;
  this.height = options.height || windowInfo.windowHeight || windowInfo.screenHeight || 667;
  this.pixelRatio = options.pixelRatio || windowInfo.pixelRatio || 1;
  this.runtimeInfo = runtimeInfo;
  this.onUiChange = options.onUiChange || null;
  this.scale = utils.clamp(this.width / 390, 0.82, 1.18);
  this.safeTopInset = safeArea ? Math.max(18, safeArea.top + 8) : 24;
  this.safeBottomInset = safeArea
    ? Math.max(12, this.height - safeArea.bottom + 8)
    : 16;

  this.assets = {
    player: null,
    enemy: null,
    bullet: null
  };

  this.state = 'loading';
  this.errorMessage = '';
  this.level = 1;
  this.score = 0;
  this.bestScore = utils.safeGetStorage(STORAGE_KEY, 0);
  this.leaderboard = normalizeLeaderboard(utils.safeGetStorage(LEADERBOARD_KEY, []));
  this.currentRunRank = null;
  this.leaderboardVisible = false;
  this.leaderboardMode = 'local';
  this.friendRankSupported = false;
  this.friendRankDirty = false;
  this.friendRankError = '';
  this.friendRankRect = null;
  this.survivalTime = 0;
  this.spawnTimer = 0;
  this.waveCount = 0;
  this.spawnQueue = [];
  this.bombSupplyTimer = 0;
  this.slowMotionTime = 0;
  this.scoreMultiplierTime = 0;
  this.bullets = [];
  this.enemyBullets = [];
  this.enemies = [];
  this.explosions = [];
  this.powerUps = [];
  this.floatingTexts = [];
  this.muzzleFlashes = [];
  this.player = null;
  this.bombs = 0;
  this.clearCharges = 0;
  this.stars = utils.createStars(this.width, this.height, Math.max(28, Math.round(this.width / 8)));
  this.buttonRect = this.createPrimaryButtonRect();
  this.pauseButtonRect = this.createPauseButtonRect();
  this.bombButtonRect = this.createBombButtonRect();
  this.clearButtonRect = this.createClearButtonRect();
  this.leaderboardButtonRect = null;
  this.leaderboardCloseRect = null;
  this.leaderboardPanelRect = null;
  this.leaderboardTabRects = null;
  this.openDataContext = null;
  this.sharedCanvas = null;
  this.pointerIdentifier = null;
  this.dragOffsetX = 0;
  this.dragOffsetY = 0;
  this.banner = null;
  this.screenFlashAlpha = 0;
  this.screenFlashColor = '#f8f4ec';
  this.shakeTime = 0;
  this.shakeStrength = 0;
  this.paused = false;
  this.manualPause = false;
  this.reviveCount = 0;
  this.revivePending = false;
  this.reviveHideDetectedAt = 0;
  this.pendingRunRecord = false;
  this.destroyed = false;
  this.raf = utils.getRequestAnimationFrame();
  this.lastTimestamp = 0;
  this.audio = new MiniGameAudio();
  this.userSettings = Object.assign({
    musicEnabled: true,
    sfxEnabled: true,
    vibrationEnabled: true
  }, options.settings || {});

  this.loop = this.loop.bind(this);
}

PlaneMinigameRuntime.prototype.init = function () {
  if (wx.setPreferredFPS) {
    wx.setPreferredFPS(60);
  }

  this.setupOpenDataContext();
  this.audio.init();
  this.audio.updateSettings(this.userSettings);
  this.loadAssets();
  this.emitUiChange();
  this.raf(this.loop);
};

PlaneMinigameRuntime.prototype.setupOpenDataContext = function () {
  if (!wx.getOpenDataContext) {
    return;
  }

  try {
    this.openDataContext = wx.getOpenDataContext();
    this.sharedCanvas = this.openDataContext && this.openDataContext.canvas
      ? this.openDataContext.canvas
      : null;
    this.friendRankSupported = !!(this.openDataContext && this.sharedCanvas);
  } catch (error) {
    this.openDataContext = null;
    this.sharedCanvas = null;
    this.friendRankSupported = false;
  }
};

PlaneMinigameRuntime.prototype.getSnapshot = function () {
  return {
    state: this.state,
    paused: this.paused,
    manualPause: this.manualPause,
    level: this.level,
    score: this.score,
    bestScore: this.bestScore,
    bombs: this.bombs,
    clearCharges: this.clearCharges,
    currentRunRank: this.currentRunRank,
    leaderboardVisible: this.leaderboardVisible,
    leaderboardMode: this.leaderboardMode,
    friendRankSupported: this.friendRankSupported,
    survivalTime: this.survivalTime,
    slowMotionTime: this.slowMotionTime,
    scoreMultiplierTime: this.scoreMultiplierTime,
    hp: this.player ? this.player.hp : 0,
    maxHp: this.player ? this.player.maxHp : 0,
    invincible: !!(this.player && this.player.isInvincible && this.player.isInvincible()),
    doubleShotTime: this.player ? this.player.doubleShotTime : 0,
    firepowerTime: this.player ? this.player.firepowerTime : 0,
    shieldTime: this.player ? this.player.shieldTime : 0,
    hasSlowMotion: this.slowMotionTime > 0,
    hasScoreBoost: this.scoreMultiplierTime > 0,
    hasFirepower: !!(this.player && this.player.hasFirepowerUpgrade && this.player.hasFirepowerUpgrade()),
    hasDoubleShot: !!(this.player && this.player.hasDoubleShot && this.player.hasDoubleShot()),
    hasShield: !!(this.player && this.player.hasShield && this.player.hasShield())
  };
};

PlaneMinigameRuntime.prototype.updateSettings = function (settings) {
  this.userSettings = Object.assign({}, this.userSettings, settings || {});
  this.audio.updateSettings(this.userSettings);
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.triggerVibration = function (type) {
  if (!this.userSettings.vibrationEnabled || !wx.vibrateShort) {
    return;
  }

  try {
    wx.vibrateShort({ type: type || 'light' });
  } catch (error) {
    return;
  }
};

PlaneMinigameRuntime.prototype.emitUiChange = function () {
  if (typeof this.onUiChange === 'function') {
    this.onUiChange(this.getSnapshot());
  }
};

PlaneMinigameRuntime.prototype.loadAssets = function () {
  var self = this;

  return Promise.all([
    utils.loadImage(this.canvas, 'images/boss.jpg', { removeWhiteBg: true, threshold: 212 }),
    utils.loadImage(this.canvas, 'images/bullet.jpg', { removeWhiteBg: true, threshold: 232 })
  ]).then(function (assets) {
    self.assets.player = null;
    self.assets.enemy = assets[0];
    self.assets.bullet = assets[1];
    self.state = 'ready';
    self.emitUiChange();
    self.render();
  }).catch(function (error) {
    self.errorMessage = error && error.message ? error.message : '游戏资源加载失败';
    self.state = 'error';
    self.emitUiChange();
    self.render();
  });
};

PlaneMinigameRuntime.prototype.createPrimaryButtonRect = function () {
  var buttonWidth = Math.min(this.width * 0.62, 240);
  var buttonHeight = Math.max(54, 56 * this.scale);

  return {
    x: (this.width - buttonWidth) / 2,
    y: this.height * 0.68,
    width: buttonWidth,
    height: buttonHeight
  };
};

PlaneMinigameRuntime.prototype.getCoverLayout = function () {
  var buttonWidth = Math.min(this.width * 0.5, 196 * this.scale);
  var buttonHeight = Math.max(46, 48 * this.scale);
  var contentWidth = Math.min(this.width - 48 * this.scale, 294 * this.scale);
  var titleY = Math.max(this.safeTopInset + 44 * this.scale, this.height * 0.168);
  var titleFontSize = Math.max(30, Math.round(36 * this.scale));
  var sloganY = titleY + 34 * this.scale;
  var sloganFontSize = Math.max(14, Math.round(15 * this.scale));
  var panelY = sloganY + 28 * this.scale;
  var previewHeight = Math.max(60 * this.scale, Math.min(76 * this.scale, this.height * 0.108));
  var previewWidth = previewHeight * (96 / 112);
  var previewY = panelY + 16 * this.scale;
  var descFontSize = Math.max(12, Math.round(12.2 * this.scale));
  var descStartY = previewY + previewHeight + 18 * this.scale;
  var descAvailableHeight;
  var descLineHeight = Math.max(
    19 * this.scale,
    22 * this.scale
  );
  var authorY = descStartY + descLineHeight * Math.max(1, gameMeta.COVER_DESCRIPTION_LINES.length) + 16 * this.scale;
  var contentBottom = authorY + 18 * this.scale;
  var desiredPanelHeight = Math.max(198 * this.scale, contentBottom - panelY + 18 * this.scale);
  var buttonGap = 24 * this.scale;
  var maxButtonY = this.height - this.safeBottomInset - buttonHeight - 28 * this.scale;
  var maxPanelHeight = Math.max(192 * this.scale, maxButtonY - panelY - buttonGap);
  var panelHeight = Math.min(desiredPanelHeight, maxPanelHeight);
  var buttonY = panelY + panelHeight + buttonGap;
  authorY = panelY + panelHeight - 20 * this.scale;
  descAvailableHeight = Math.max(64 * this.scale, authorY - descStartY - 10 * this.scale);
  descLineHeight = Math.max(
    18 * this.scale,
    Math.min(22 * this.scale, descAvailableHeight / Math.max(1, gameMeta.COVER_DESCRIPTION_LINES.length))
  );

  return {
    panelX: (this.width - contentWidth) / 2,
    panelY: panelY,
    panelWidth: contentWidth,
    panelHeight: panelHeight,
    titleY: titleY,
    titleFontSize: titleFontSize,
    sloganY: sloganY,
    sloganFontSize: sloganFontSize,
    descFontSize: descFontSize,
    descStartY: descStartY,
    descLineHeight: descLineHeight,
    previewX: this.width / 2 - previewWidth / 2,
    previewY: previewY,
    previewWidth: previewWidth,
    previewHeight: previewHeight,
    authorX: (this.width + contentWidth) / 2 - 18 * this.scale,
    authorY: authorY,
    buttonRect: {
      x: (this.width - buttonWidth) / 2,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    }
  };
};

PlaneMinigameRuntime.prototype.createPauseButtonRect = function () {
  var size = 42 * this.scale;

  return {
    x: this.width - size - 18 * this.scale,
    y: this.safeTopInset + 70 * this.scale,
    width: size,
    height: size
  };
};

PlaneMinigameRuntime.prototype.createBombButtonRect = function () {
  var width = 56 * this.scale;
  var height = 40 * this.scale;

  return {
    x: 16 * this.scale,
    y: this.height - this.safeBottomInset - height - 20 * this.scale,
    width: width,
    height: height
  };
};

PlaneMinigameRuntime.prototype.createClearButtonRect = function () {
  var width = 56 * this.scale;
  var height = 40 * this.scale;

  return {
    x: 16 * this.scale + width + 10 * this.scale,
    y: this.height - this.safeBottomInset - height - 20 * this.scale,
    width: width,
    height: height
  };
};

PlaneMinigameRuntime.prototype.createLeaderboardButtonRect = function (y) {
  var buttonWidth = Math.min(this.width * 0.62, 240);
  var buttonHeight = Math.max(46, 48 * this.scale);

  return {
    x: (this.width - buttonWidth) / 2,
    y: y,
    width: buttonWidth,
    height: buttonHeight
  };
};

PlaneMinigameRuntime.prototype.createLeaderboardCloseRect = function (panelX, panelY, panelWidth) {
  var size = 34 * this.scale;

  return {
    x: panelX + panelWidth - size - 12 * this.scale,
    y: panelY + 12 * this.scale,
    width: size,
    height: size
  };
};

PlaneMinigameRuntime.prototype.createLeaderboardTabRects = function (panelX, panelY, panelWidth) {
  if (!this.friendRankSupported) {
    return null;
  }

  var gap = 10 * this.scale;
  var buttonWidth = Math.min(122 * this.scale, (panelWidth - 52 * this.scale - gap) / 2);
  var buttonHeight = 36 * this.scale;
  var totalWidth = buttonWidth * 2 + gap;
  var startX = panelX + (panelWidth - totalWidth) / 2;
  var y = panelY + 72 * this.scale;

  return {
    local: {
      x: startX,
      y: y,
      width: buttonWidth,
      height: buttonHeight
    },
    friends: {
      x: startX + buttonWidth + gap,
      y: y,
      width: buttonWidth,
      height: buttonHeight
    }
  };
};

PlaneMinigameRuntime.prototype.getPauseOverlayButtons = function () {
  var buttonWidth = Math.min(this.width * 0.62, 240);
  var buttonHeight = Math.max(52, 54 * this.scale);
  var primaryY = this.height * 0.58;

  return {
    primary: {
      x: (this.width - buttonWidth) / 2,
      y: primaryY,
      width: buttonWidth,
      height: buttonHeight
    },
    secondary: {
      x: (this.width - buttonWidth) / 2,
      y: primaryY + buttonHeight + 14 * this.scale,
      width: buttonWidth,
      height: buttonHeight
    }
  };
};

PlaneMinigameRuntime.prototype.getGameOverButtons = function (panelY, panelHeight) {
  if (panelY === undefined || panelHeight === undefined) {
    panelHeight = 220 * this.scale;
    panelY = this.height * 0.23;
  }

  var buttonWidth = Math.min(this.width * 0.56, 220);
  var buttonHeight = Math.max(42, 44 * this.scale);
  var buttonGap = 10 * this.scale;
  var startY = panelY + panelHeight + 18 * this.scale;
  var startX = (this.width - buttonWidth) / 2;
  var restartButton = {
    x: startX,
    y: startY,
    width: buttonWidth,
    height: buttonHeight
  };

  if (!this.canReviveByShare()) {
    return {
      primary: restartButton,
      secondary: {
        x: startX,
        y: startY + buttonHeight + buttonGap,
        width: buttonWidth,
        height: buttonHeight
      },
      tertiary: null
    };
  }

  return {
    primary: {
      x: startX,
      y: startY,
      width: buttonWidth,
      height: buttonHeight
    },
    secondary: {
      x: startX,
      y: startY + buttonHeight + buttonGap,
      width: buttonWidth,
      height: buttonHeight
    },
    tertiary: {
      x: startX,
      y: startY + (buttonHeight + buttonGap) * 2,
      width: buttonWidth,
      height: buttonHeight
    }
  };
};

PlaneMinigameRuntime.prototype.canReviveByShare = function () {
  return this.state === 'over' && this.reviveCount < MAX_SHARE_REVIVES && !!wx.shareAppMessage;
};

PlaneMinigameRuntime.prototype.getRemainingShareRevives = function () {
  return Math.max(0, MAX_SHARE_REVIVES - this.reviveCount);
};

PlaneMinigameRuntime.prototype.getShareReviveButtonLabel = function () {
  if (this.revivePending) {
    return '分享中...';
  }

  return '分享复活 x' + this.getRemainingShareRevives();
};

PlaneMinigameRuntime.prototype.recordLeaderboardEntry = function () {
  var records = normalizeLeaderboard(this.leaderboard).slice();
  var record = {
    score: this.score,
    level: this.level,
    survivalTime: Number(this.survivalTime.toFixed(1)),
    playedAt: Date.now()
  };

  records.push(record);
  records.sort(function (a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.survivalTime - a.survivalTime;
  });

  records = records.slice(0, 5);
  this.currentRunRank = null;

  for (var i = 0; i < records.length; i += 1) {
    if (records[i] === record) {
      this.currentRunRank = i + 1;
      break;
    }
  }

  this.leaderboard = records;
  utils.safeSetStorage(LEADERBOARD_KEY, records);
};

PlaneMinigameRuntime.prototype.toggleLeaderboard = function (visible) {
  this.leaderboardVisible = visible === undefined ? !this.leaderboardVisible : !!visible;
  if (!this.leaderboardVisible) {
    this.leaderboardTabRects = null;
    this.postOpenDataMessage('hideFriendLeaderboard');
  }
  this.render();
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.postOpenDataMessage = function (type, data) {
  if (!this.openDataContext || !this.openDataContext.postMessage) {
    return;
  }

  try {
    this.openDataContext.postMessage(Object.assign({
      type: type
    }, data || {}));
  } catch (error) {
    return;
  }
};

PlaneMinigameRuntime.prototype.syncCloudLeaderboard = function () {
  if (!wx.setUserCloudStorage) {
    return;
  }

  try {
    wx.setUserCloudStorage({
      KVDataList: [
        {
          key: 'plane_best_score',
          value: String(this.bestScore)
        }
      ]
    });
  } catch (error) {
    return;
  }
};

PlaneMinigameRuntime.prototype.openLeaderboard = function (mode) {
  if (mode === 'friends' && this.friendRankSupported) {
    this.syncCloudLeaderboard();
    this.leaderboardMode = 'friends';
    this.friendRankDirty = true;
    this.friendRankError = '';
  } else {
    this.leaderboardMode = 'local';
  }

  this.toggleLeaderboard(true);
};

PlaneMinigameRuntime.prototype.getFormationDrift = function (xRatio, magnitude, towardCenter) {
  if (xRatio === undefined || xRatio === null) {
    return (Math.random() < 0.5 ? -1 : 1) * magnitude;
  }

  if (towardCenter) {
    return xRatio < 0.5 ? magnitude : -magnitude;
  }

  return xRatio < 0.5 ? -magnitude : magnitude;
};

PlaneMinigameRuntime.prototype.pickEnemyFlightPlan = function (type, xRatio) {
  var roll = Math.random();

  if (type === 'large') {
    return {
      flightPattern: 'hover',
      flightAmplitude: (30 + Math.random() * 18) * this.scale,
      flightFrequency: 0.42 + Math.random() * 0.18,
      hoverThreshold: this.height * (0.22 + Math.random() * 0.06),
      horizontalDrift: this.getFormationDrift(xRatio, 16 * this.scale, true),
      driftCurve: 1.8
    };
  }

  if (type === 'medium') {
    if (roll > 0.55) {
      return {
        flightPattern: 'swoop',
        flightAmplitude: (14 + Math.random() * 12) * this.scale,
        flightFrequency: 0.78 + Math.random() * 0.22,
        horizontalDrift: this.getFormationDrift(xRatio, (34 + Math.random() * 18) * this.scale, true),
        driftCurve: 2.1
      };
    }

    return {
      flightPattern: 'arc',
      flightAmplitude: (16 + Math.random() * 10) * this.scale,
      flightFrequency: 0.58 + Math.random() * 0.18,
      horizontalDrift: this.getFormationDrift(xRatio, (26 + Math.random() * 16) * this.scale, true),
      driftCurve: 1.85
    };
  }

  if (roll > 0.7) {
    return {
      flightPattern: 'zigzag',
      flightAmplitude: (20 + Math.random() * 16) * this.scale,
      flightFrequency: 0.9 + Math.random() * 0.3
    };
  }

  if (roll > 0.34) {
    return {
      flightPattern: 'sine',
      flightAmplitude: (18 + Math.random() * 14) * this.scale,
      flightFrequency: 0.66 + Math.random() * 0.26
    };
  }

  return {
    flightPattern: 'straight'
  };
};

PlaneMinigameRuntime.prototype.spawnEnemyAt = function (type, xRatio, yOffset, speedScale, options) {
  var enemy = new Enemy(this, this.assets.enemy, this.level, type, options);

  if (xRatio !== undefined && xRatio !== null) {
    enemy.x = utils.clamp(this.width * xRatio - enemy.width / 2, 0, this.width - enemy.width);
  }

  if (yOffset !== undefined && yOffset !== null) {
    enemy.y = yOffset;
  }

  if (speedScale) {
    enemy.speed *= speedScale;
  }

  enemy.spawnX = enemy.x;
  this.enemies.push(enemy);
};

PlaneMinigameRuntime.prototype.enqueueEnemySpawn = function (type, xRatio, yOffset, delay, speedScale, options) {
  this.spawnQueue.push({
    type: type,
    xRatio: xRatio,
    yOffset: yOffset,
    delay: delay || 0,
    speedScale: speedScale || 1,
    options: options || null
  });
};

PlaneMinigameRuntime.prototype.flushSpawnQueue = function (deltaTime) {
  for (var queueIndex = this.spawnQueue.length - 1; queueIndex >= 0; queueIndex -= 1) {
    var item = this.spawnQueue[queueIndex];
    item.delay -= deltaTime;

    if (item.delay > 0) {
      continue;
    }

    this.spawnEnemyAt(item.type, item.xRatio, item.yOffset, item.speedScale, item.options);
    this.spawnQueue.splice(queueIndex, 1);
  }
};

PlaneMinigameRuntime.prototype.launchFormationWave = function () {
  var formationType = this.waveCount % 5;
  var topY = -48 * this.scale;
  var i = 0;

  if (formationType === 0) {
    for (i = 0; i < 5; i += 1) {
      this.enqueueEnemySpawn('small', 0.18 + i * 0.16, topY - i * 6 * this.scale, i * 0.08, 1.02, {
        flightPattern: i % 2 === 0 ? 'zigzag' : 'sine',
        flightAmplitude: (18 + i * 2.5) * this.scale,
        flightFrequency: 0.82 + i * 0.04,
        flightSeed: i * 0.14
      });
    }
    this.showBanner('敌机编队', '#645a52', 0.85);
    return;
  }

  if (formationType === 1) {
    var vPattern = [
      { x: 0.5, y: topY, delay: 0 },
      { x: 0.36, y: topY - 18 * this.scale, delay: 0.1 },
      { x: 0.64, y: topY - 18 * this.scale, delay: 0.1 },
      { x: 0.24, y: topY - 34 * this.scale, delay: 0.2 },
      { x: 0.76, y: topY - 34 * this.scale, delay: 0.2 }
    ];

    for (i = 0; i < vPattern.length; i += 1) {
      this.enqueueEnemySpawn('small', vPattern[i].x, vPattern[i].y, vPattern[i].delay, 1.05, {
        flightPattern: i === 0 ? 'sine' : 'swoop',
        flightAmplitude: (i === 0 ? 12 : 16) * this.scale,
        flightFrequency: 0.72 + i * 0.06,
        horizontalDrift: i === 0 ? 0 : this.getFormationDrift(vPattern[i].x, 42 * this.scale, true),
        driftCurve: 2.2,
        flightSeed: i * 0.11
      });
    }
    this.showBanner('V 字突袭', '#645a52', 0.85);
    return;
  }

  if (formationType === 2 && this.level >= 4) {
    this.enqueueEnemySpawn('medium', 0.34, topY - 10 * this.scale, 0, 1, {
      flightPattern: 'arc',
      flightAmplitude: 14 * this.scale,
      flightFrequency: 0.62,
      horizontalDrift: 58 * this.scale,
      driftCurve: 1.95
    });
    this.enqueueEnemySpawn('medium', 0.66, topY - 10 * this.scale, 0.14, 1, {
      flightPattern: 'arc',
      flightAmplitude: 14 * this.scale,
      flightFrequency: 0.62,
      horizontalDrift: -58 * this.scale,
      driftCurve: 1.95
    });
    this.enqueueEnemySpawn('small', 0.18, topY - 18 * this.scale, 0.18, 1.06, {
      flightPattern: 'zigzag',
      flightAmplitude: 18 * this.scale,
      flightFrequency: 1.02
    });
    this.enqueueEnemySpawn('small', 0.82, topY - 18 * this.scale, 0.18, 1.06, {
      flightPattern: 'zigzag',
      flightAmplitude: 18 * this.scale,
      flightFrequency: 1.02,
      flightSeed: 0.5
    });
    this.showBanner('中队来袭', '#645a52', 0.9);
    return;
  }

  if (formationType === 3 && this.level >= 5) {
    this.enqueueEnemySpawn('small', 0.2, topY - 8 * this.scale, 0, 1.12, {
      flightPattern: 'swoop',
      flightAmplitude: 14 * this.scale,
      flightFrequency: 0.88,
      horizontalDrift: 62 * this.scale,
      driftCurve: 2.6
    });
    this.enqueueEnemySpawn('small', 0.8, topY - 8 * this.scale, 0.06, 1.12, {
      flightPattern: 'swoop',
      flightAmplitude: 14 * this.scale,
      flightFrequency: 0.88,
      horizontalDrift: -62 * this.scale,
      driftCurve: 2.6
    });
    this.enqueueEnemySpawn('small', 0.34, topY - 26 * this.scale, 0.14, 1.08, {
      flightPattern: 'arc',
      flightAmplitude: 10 * this.scale,
      flightFrequency: 0.76,
      horizontalDrift: 30 * this.scale,
      driftCurve: 1.9
    });
    this.enqueueEnemySpawn('small', 0.66, topY - 26 * this.scale, 0.2, 1.08, {
      flightPattern: 'arc',
      flightAmplitude: 10 * this.scale,
      flightFrequency: 0.76,
      horizontalDrift: -30 * this.scale,
      driftCurve: 1.9
    });
    this.showBanner('回旋俯冲', '#5f564e', 0.88);
    return;
  }

  this.enqueueEnemySpawn('large', 0.5, -72 * this.scale, 0, 0.94, {
    flightPattern: 'hover',
    flightAmplitude: 32 * this.scale,
    flightFrequency: 0.44,
    hoverThreshold: this.height * 0.24,
    horizontalDrift: 0
  });
  this.enqueueEnemySpawn('medium', 0.26, -54 * this.scale, 0.22, 1.05, {
    flightPattern: 'swoop',
    flightAmplitude: 12 * this.scale,
    flightFrequency: 0.9,
    horizontalDrift: 54 * this.scale,
    driftCurve: 2.05
  });
  this.enqueueEnemySpawn('medium', 0.74, -54 * this.scale, 0.22, 1.05, {
    flightPattern: 'swoop',
    flightAmplitude: 12 * this.scale,
    flightFrequency: 0.9,
    horizontalDrift: -54 * this.scale,
    driftCurve: 2.05
  });
  this.enqueueEnemySpawn('small', 0.14, -28 * this.scale, 0.34, 1.12, {
    flightPattern: 'arc',
    flightAmplitude: 14 * this.scale,
    flightFrequency: 0.74,
    horizontalDrift: 44 * this.scale,
    driftCurve: 1.8
  });
  this.enqueueEnemySpawn('small', 0.86, -28 * this.scale, 0.34, 1.12, {
    flightPattern: 'arc',
    flightAmplitude: 14 * this.scale,
    flightFrequency: 0.74,
    horizontalDrift: -44 * this.scale,
    driftCurve: 1.8
  });
  this.showBanner('大型敌机来袭', '#4a4038', 1.1);
  this.triggerScreenFlash('#f1e9dd', 0.14);
  this.triggerShake(0.1, 3.8 * this.scale);
};

PlaneMinigameRuntime.prototype.pickEnemyType = function () {
  var roll = Math.random();

  if (this.level >= 6 && roll > 0.9) {
    return 'large';
  }

  if (this.level >= 3 && roll > 0.62) {
    return 'medium';
  }

  if (this.level >= 8 && roll < 0.06) {
    return 'large';
  }

  return 'small';
};

PlaneMinigameRuntime.prototype.pickPowerUpType = function (enemy) {
  var pool = null;
  var totalWeight = 0;
  var roll = 0;
  var i = 0;

  if (enemy.type === 'large') {
    pool = [
      { type: 'slow', weight: 28 },
      { type: 'score', weight: 24 },
      { type: 'double', weight: 18 },
      { type: 'firepower', weight: 14 },
      { type: 'clear', weight: 16 },
      { type: 'shield', weight: 12 }
    ];
  } else if (enemy.type === 'medium') {
    pool = [
      { type: 'double', weight: 24 },
      { type: 'firepower', weight: 12 },
      { type: 'clear', weight: 24 },
      { type: 'score', weight: 20 },
      { type: 'slow', weight: 18 },
      { type: 'shield', weight: 10 }
    ];
  } else {
    pool = [
      { type: 'double', weight: 34 },
      { type: 'firepower', weight: 8 },
      { type: 'clear', weight: 28 },
      { type: 'score', weight: 18 },
      { type: 'shield', weight: 14 }
    ];
  }

  for (i = 0; i < pool.length; i += 1) {
    totalWeight += pool[i].weight;
  }

  roll = Math.random() * totalWeight;

  for (i = 0; i < pool.length; i += 1) {
    roll -= pool[i].weight;
    if (roll <= 0) {
      return pool[i].type;
    }
  }

  return pool[0].type;
};

PlaneMinigameRuntime.prototype.createBombSupplyTimer = function () {
  var levelFactor = Math.min(4, Math.max(0, this.level - 1)) * 0.55;
  return (BOMB_SUPPLY_INTERVAL_MIN + Math.random() * BOMB_SUPPLY_INTERVAL_RANGE) - levelFactor;
};

PlaneMinigameRuntime.prototype.hasActivePowerUpType = function (type) {
  for (var i = 0; i < this.powerUps.length; i += 1) {
    if (this.powerUps[i].type === type) {
      return true;
    }
  }

  return false;
};

PlaneMinigameRuntime.prototype.spawnIndependentPowerUp = function (type, xRatio) {
  var spawnX = this.width * (xRatio !== undefined ? xRatio : (0.18 + Math.random() * 0.64));
  var powerUp = new PowerUp(this, type, spawnX, -10 * this.scale);

  powerUp.y = -powerUp.size * 0.95;
  this.powerUps.push(powerUp);

  return powerUp;
};

PlaneMinigameRuntime.prototype.maybeSpawnBombSupply = function (deltaTime) {
  var bombStyle = getPowerUpStyle('bomb');

  this.bombSupplyTimer -= deltaTime;

  if (this.bombSupplyTimer > 0) {
    return;
  }

  this.bombSupplyTimer = this.createBombSupplyTimer();

  if (this.bombs >= 3 || this.hasActivePowerUpType('bomb')) {
    return;
  }

  var bombSupply = this.spawnIndependentPowerUp('bomb');
  this.showBanner('炸弹空投', bombStyle.pickupAccent, 0.9);
  this.addFloatingText(
    '炸弹空投',
    bombSupply.x + bombSupply.size / 2,
    this.safeTopInset + 90 * this.scale,
    bombStyle.ink
  );
};

PlaneMinigameRuntime.prototype.spawnEnemy = function () {
  var type = this.pickEnemyType();
  this.spawnEnemyAt(type, null, null, 1, this.pickEnemyFlightPlan(type, null));
};

PlaneMinigameRuntime.prototype.maybeSpawnPowerUp = function (enemy) {
  var roll = Math.random();
  var type = null;
  var chance = enemy.type === 'large' ? 0.34 : (enemy.type === 'medium' ? 0.2 : 0.1);

  if (roll > chance) {
    return;
  }

  type = this.pickPowerUpType(enemy);

  if (!type) {
    return;
  }

  this.powerUps.push(new PowerUp(
    this,
    type,
    enemy.x + enemy.width / 2,
    enemy.y + enemy.height / 2
  ));
  var style = getPowerUpStyle(type);
  this.addFloatingText(
    style.spawnLabel,
    enemy.x + enemy.width / 2,
    enemy.y + enemy.height / 2 - 18 * this.scale,
    style.ink
  );
};

PlaneMinigameRuntime.prototype.applyPowerUp = function (type, x, y) {
  if (!this.player && (type === 'double' || type === 'firepower' || type === 'shield')) {
    return;
  }

  var style = getPowerUpStyle(type);

  if (type === 'double') {
    this.player.activatePowerUp(type);
    this.showBanner('双重火力', style.pickupAccent, 1.05);
    this.addFloatingText('双重火力', x, y, style.ink);
    this.triggerScreenFlash('#f3eee3', 0.14);
  } else if (type === 'firepower') {
    this.player.activatePowerUp(type);
    this.showBanner('火力升级', style.pickupAccent, 1.08);
    this.addFloatingText('三线火力', x, y, style.ink);
    this.triggerScreenFlash('#f1e8da', 0.18);
  } else if (type === 'shield') {
    this.player.activatePowerUp(type);
    this.showBanner('能量护盾', style.pickupAccent, 1.05);
    this.addFloatingText('护盾启动', x, y, style.ink);
    this.triggerScreenFlash('#f6f2e9', 0.14);
  } else if (type === 'clear') {
    this.clearCharges = Math.min(3, this.clearCharges + 1);
    this.showBanner('净空补给', style.pickupAccent, 0.95);
    this.addFloatingText('净空 +1', x, y, style.ink);
    this.triggerScreenFlash('#f2ebe0', 0.16);
  } else if (type === 'slow') {
    this.slowMotionTime = Math.max(this.slowMotionTime, SLOW_MOTION_DURATION);
    this.showBanner('时间减速', style.pickupAccent, 1.05);
    this.addFloatingText('敌机减速', x, y, style.ink);
    this.triggerScreenFlash('#f0eadf', 0.16);
  } else if (type === 'score') {
    this.scoreMultiplierTime = Math.max(this.scoreMultiplierTime, SCORE_BOOST_DURATION);
    this.showBanner('双倍得分', style.pickupAccent, 1.05);
    this.addFloatingText('得分 x' + SCORE_BOOST_MULTIPLIER, x, y, style.ink);
    this.triggerScreenFlash('#f4eee2', 0.16);
  } else if (type === 'bomb') {
    this.bombs += 1;
    this.showBanner('炸弹补给', style.pickupAccent, 1.05);
    this.addFloatingText('炸弹 +1', x, y, style.ink);
    this.triggerScreenFlash('#f2ebe0', 0.16);
  }

  this.audio.playEffect('levelup');
  this.triggerShake(0.08, 2.4 * this.scale);
  this.triggerVibration('light');
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.useBomb = function () {
  var clearedCount = 0;
  var gainedScore = 0;
  var clearedBullets = this.enemyBullets.length;
  var scoreGain = 0;

  if (this.state !== 'running' || this.paused || this.bombs <= 0) {
    return false;
  }

  this.bombs -= 1;

  for (var enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    var enemy = this.enemies[enemyIndex];
    clearedCount += 1;
    gainedScore += enemy.score;
    this.explosions.push(new Explosion(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2,
      Math.max(this.scale, enemy.scale * 0.85)
    ));
  }

  this.enemies = [];
  this.enemyBullets = [];
  scoreGain = gainedScore * (this.scoreMultiplierTime > 0 ? SCORE_BOOST_MULTIPLIER : 1);
  this.score += scoreGain;
  this.audio.playEffect('hit');
  this.showBanner('全屏炸弹', '#3d342c', 1);
  this.addFloatingText(
    scoreGain > 0
      ? ('+' + scoreGain + (this.scoreMultiplierTime > 0 ? ' x2' : ''))
      : (clearedBullets > 0 ? '清空弹幕' : '前方净空'),
    this.width / 2,
    this.height * 0.44,
    '#3d342c'
  );
  this.triggerScreenFlash('#ece2d6', 0.22);
  this.triggerShake(0.14, 4.5 * this.scale);
  this.triggerVibration('medium');
  this.emitUiChange();
  return clearedCount > 0 || clearedBullets > 0;
};

PlaneMinigameRuntime.prototype.useScreenClear = function () {
  var clearedBullets = this.enemyBullets.length;

  if (this.state !== 'running' || this.paused || this.clearCharges <= 0) {
    return false;
  }

  this.clearCharges -= 1;
  this.enemyBullets = [];
  this.audio.playEffect('hit');
  this.showBanner('弹幕净空', '#4f453d', 0.95);
  this.addFloatingText(
    clearedBullets > 0 ? '清空弹幕' : '前方净空',
    this.width / 2,
    this.height * 0.48,
    '#4f453d'
  );
  this.triggerScreenFlash('#f2ebe0', 0.16);
  this.triggerShake(0.08, 2.6 * this.scale);
  this.triggerVibration('light');
  this.emitUiChange();

  return true;
};

PlaneMinigameRuntime.prototype.showBanner = function (text, accent, duration) {
  this.banner = {
    text: text,
    accent: accent || '#5f554d',
    duration: duration || 1,
    age: 0
  };
};

PlaneMinigameRuntime.prototype.addFloatingText = function (text, x, y, color) {
  this.floatingTexts.push({
    text: text,
    x: x,
    y: y,
    color: color || INK,
    age: 0,
    duration: 0.65
  });
};

PlaneMinigameRuntime.prototype.addMuzzleFlash = function (x, y) {
  this.muzzleFlashes.push({
    x: x,
    y: y,
    age: 0,
    duration: 0.08,
    radius: 10 * this.scale
  });
};

PlaneMinigameRuntime.prototype.triggerScreenFlash = function (color, alpha) {
  this.screenFlashColor = color || '#f8f4ec';
  this.screenFlashAlpha = Math.max(this.screenFlashAlpha, alpha || 0.16);
};

PlaneMinigameRuntime.prototype.triggerShake = function (duration, strength) {
  this.shakeTime = Math.max(this.shakeTime, duration || 0.12);
  this.shakeStrength = Math.max(this.shakeStrength, strength || 4 * this.scale);
};

PlaneMinigameRuntime.prototype.updateFeedback = function (deltaTime) {
  for (var flashIndex = this.muzzleFlashes.length - 1; flashIndex >= 0; flashIndex -= 1) {
    var muzzleFlash = this.muzzleFlashes[flashIndex];
    muzzleFlash.age += deltaTime;

    if (muzzleFlash.age >= muzzleFlash.duration) {
      this.muzzleFlashes.splice(flashIndex, 1);
    }
  }

  for (var textIndex = this.floatingTexts.length - 1; textIndex >= 0; textIndex -= 1) {
    var floatingText = this.floatingTexts[textIndex];
    floatingText.age += deltaTime;
    floatingText.y -= 52 * this.scale * deltaTime;

    if (floatingText.age >= floatingText.duration) {
      this.floatingTexts.splice(textIndex, 1);
    }
  }

  if (this.banner) {
    this.banner.age += deltaTime;

    if (this.banner.age >= this.banner.duration) {
      this.banner = null;
    }
  }

  this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - deltaTime * 1.6);
  this.shakeTime = Math.max(0, this.shakeTime - deltaTime);

  if (this.shakeTime === 0) {
    this.shakeStrength = 0;
  }
};

PlaneMinigameRuntime.prototype.getShakeOffset = function () {
  if (this.shakeTime <= 0 || this.shakeStrength <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (Math.random() * 2 - 1) * this.shakeStrength,
    y: (Math.random() * 2 - 1) * this.shakeStrength * 0.7
  };
};

PlaneMinigameRuntime.prototype.startGame = function () {
  if (this.state === 'over') {
    this.finalizePendingRunRecord();
  }

  if (!this.assets.enemy || !this.assets.bullet) {
    return;
  }

  this.audio.stopAllEffects();
  this.audio.playEffect('start');
  this.audio.startBgm();

  this.state = 'running';
  this.level = 1;
  this.score = 0;
  this.currentRunRank = null;
  this.leaderboardVisible = false;
  this.leaderboardMode = 'local';
  this.friendRankDirty = false;
  this.friendRankError = '';
  this.survivalTime = 0;
  this.spawnTimer = 0;
  this.waveCount = 0;
  this.spawnQueue = [];
  this.bombSupplyTimer = this.createBombSupplyTimer();
  this.slowMotionTime = 0;
  this.scoreMultiplierTime = 0;
  this.bullets = [];
  this.enemyBullets = [];
  this.enemies = [];
  this.explosions = [];
  this.powerUps = [];
  this.floatingTexts = [];
  this.muzzleFlashes = [];
  this.bombs = 0;
  this.clearCharges = 0;
  this.player = new Player(this, this.assets.player, this.assets.bullet);
  this.pointerIdentifier = null;
  this.dragOffsetX = 0;
  this.dragOffsetY = 0;
  this.banner = null;
  this.screenFlashAlpha = 0;
  this.shakeTime = 0;
  this.shakeStrength = 0;
  this.paused = false;
  this.manualPause = false;
  this.reviveCount = 0;
  this.revivePending = false;
  this.reviveHideDetectedAt = 0;
  this.pendingRunRecord = false;
  this.lastTimestamp = 0;
  this.pauseButtonRect = this.createPauseButtonRect();
  this.bombButtonRect = this.createBombButtonRect();
  this.clearButtonRect = this.createClearButtonRect();
  this.leaderboardButtonRect = null;
  this.leaderboardCloseRect = null;
  this.leaderboardPanelRect = null;
  this.leaderboardTabRects = null;
  this.friendRankRect = null;
  this.showBanner('准备起飞', '#4a433d', 1.4);
  this.triggerScreenFlash('#f5f1e8', 0.12);
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.canPause = function () {
  return this.state === 'running';
};

PlaneMinigameRuntime.prototype.pauseGame = function () {
  if (!this.canPause() || this.paused) {
    return;
  }

  this.paused = true;
  this.manualPause = true;
  this.audio.pauseBgm();
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.resumeGame = function () {
  if (this.state !== 'running' || !this.paused) {
    return;
  }

  this.paused = false;
  this.manualPause = false;
  this.lastTimestamp = 0;
  this.audio.resumeBgm();
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.requestShareRevive = function () {
  var self = this;

  if (!this.canReviveByShare() || this.revivePending) {
    return;
  }

  this.revivePending = true;
  this.reviveHideDetectedAt = 0;
  this.emitUiChange();
  this.render();

  try {
    wx.shareAppMessage({
      title: gameMeta.GAME_TITLE + '：' + gameMeta.GAME_SLOGAN,
      imageUrl: 'images/player1.png',
      query: 'from=revive',
      success: function () {
        if (self.state === 'over' && self.revivePending) {
          self.reviveAfterShare();
        }
      },
      fail: function () {
        self.cancelShareRevive();
      },
      complete: function () {
        if (self.state === 'over' && self.revivePending) {
          self.render();
        }
      }
    });
  } catch (error) {
    this.cancelShareRevive();
  }
};

PlaneMinigameRuntime.prototype.cancelShareRevive = function () {
  this.revivePending = false;
  this.reviveHideDetectedAt = 0;
  this.emitUiChange();
  this.render();
};

PlaneMinigameRuntime.prototype.reviveAfterShare = function () {
  var carriedBombs = this.bombs;
  var carriedClearCharges = this.clearCharges;

  this.reviveCount += 1;
  this.revivePending = false;
  this.reviveHideDetectedAt = 0;
  this.pendingRunRecord = false;
  this.state = 'running';
  this.level = 1 + Math.floor(this.score / 500);
  this.currentRunRank = null;
  this.spawnTimer = 0;
  this.waveCount = 0;
  this.spawnQueue = [];
  this.bombSupplyTimer = this.createBombSupplyTimer();
  this.slowMotionTime = 0;
  this.scoreMultiplierTime = 0;
  this.bullets = [];
  this.enemyBullets = [];
  this.enemies = [];
  this.explosions = [];
  this.powerUps = [];
  this.floatingTexts = [];
  this.muzzleFlashes = [];
  this.bombs = carriedBombs;
  this.clearCharges = carriedClearCharges;
  this.player = new Player(this, this.assets.player, this.assets.bullet);
  this.player.invincibleTime = 2;
  this.pointerIdentifier = null;
  this.dragOffsetX = 0;
  this.dragOffsetY = 0;
  this.banner = null;
  this.screenFlashAlpha = 0;
  this.shakeTime = 0;
  this.shakeStrength = 0;
  this.paused = false;
  this.manualPause = false;
  this.leaderboardVisible = false;
  this.leaderboardMode = 'local';
  this.friendRankDirty = false;
  this.friendRankError = '';
  this.lastTimestamp = 0;
  this.pauseButtonRect = this.createPauseButtonRect();
  this.bombButtonRect = this.createBombButtonRect();
  this.clearButtonRect = this.createClearButtonRect();
  this.leaderboardButtonRect = null;
  this.leaderboardCloseRect = null;
  this.leaderboardPanelRect = null;
  this.leaderboardTabRects = null;
  this.friendRankRect = null;
  this.audio.stopAllEffects();
  this.audio.startBgm();
  this.showBanner('分享复活 ' + this.reviveCount + '/' + MAX_SHARE_REVIVES, '#4a433d', 1.25);
  this.triggerScreenFlash('#f5f1e8', 0.18);
  this.triggerShake(0.12, 4 * this.scale);
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.handleTouchStart = function (event) {
  var touch = pickTouch(event, null);

  if (!touch) {
    return;
  }

  if (this.state === 'ready') {
    if (utils.pointInRect(touch.x, touch.y, this.buttonRect)) {
      this.startGame();
    }
    return;
  }

  if (this.state === 'over') {
    if (this.leaderboardVisible) {
      if (this.leaderboardCloseRect && utils.pointInRect(touch.x, touch.y, this.leaderboardCloseRect)) {
        this.toggleLeaderboard(false);
        return;
      }

      if (this.leaderboardTabRects) {
        if (this.leaderboardTabRects.local && utils.pointInRect(touch.x, touch.y, this.leaderboardTabRects.local)) {
          this.openLeaderboard('local');
          return;
        }

        if (this.leaderboardTabRects.friends && utils.pointInRect(touch.x, touch.y, this.leaderboardTabRects.friends)) {
          this.openLeaderboard('friends');
          return;
        }
      }

      return;
    }

    var gameOverButtons = this.getGameOverButtons();

    if (this.canReviveByShare() && gameOverButtons.primary && utils.pointInRect(touch.x, touch.y, gameOverButtons.primary)) {
      this.requestShareRevive();
      return;
    }

    if (this.canReviveByShare()) {
      if (gameOverButtons.secondary && utils.pointInRect(touch.x, touch.y, gameOverButtons.secondary)) {
        this.startGame();
        return;
      }

      if (gameOverButtons.tertiary && utils.pointInRect(touch.x, touch.y, gameOverButtons.tertiary)) {
        this.openLeaderboard('local');
      }
      return;
    }

    if (gameOverButtons.primary && utils.pointInRect(touch.x, touch.y, gameOverButtons.primary)) {
      this.startGame();
      return;
    }

    if (gameOverButtons.secondary && utils.pointInRect(touch.x, touch.y, gameOverButtons.secondary)) {
      this.openLeaderboard('local');
    }
    return;
  }

  if (this.state === 'running' && this.paused) {
    var pauseButtons = this.getPauseOverlayButtons();

    if (utils.pointInRect(touch.x, touch.y, pauseButtons.primary)) {
      this.resumeGame();
      return;
    }

    if (utils.pointInRect(touch.x, touch.y, pauseButtons.secondary)) {
      this.startGame();
    }
    return;
  }

  if (this.state !== 'running' || !this.player) {
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.pauseButtonRect)) {
    this.pauseGame();
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.bombButtonRect)) {
    this.useBomb();
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.clearButtonRect)) {
    this.useScreenClear();
    return;
  }

  if (!this.player.containsPoint(touch.x, touch.y)) {
    return;
  }

  this.pointerIdentifier = touch.identifier;
  this.dragOffsetX = touch.x - this.player.x;
  this.dragOffsetY = touch.y - this.player.y;
};

PlaneMinigameRuntime.prototype.handleTouchMove = function (event) {
  if (this.state !== 'running' || this.paused || this.pointerIdentifier === null || !this.player) {
    return;
  }

  var touch = pickTouch(event, this.pointerIdentifier);

  if (!touch) {
    return;
  }

  this.player.moveTo(
    touch.x - this.dragOffsetX + this.player.width / 2,
    touch.y - this.dragOffsetY + this.player.height / 2
  );
};

PlaneMinigameRuntime.prototype.handleTouchEnd = function (event) {
  if (this.pointerIdentifier === null) {
    return;
  }

  var touch = pickTouch(event, this.pointerIdentifier);

  if (touch) {
    this.pointerIdentifier = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }
};

PlaneMinigameRuntime.prototype.handleTouchCancel = function (event) {
  this.handleTouchEnd(event);
};

PlaneMinigameRuntime.prototype.onHide = function () {
  this.paused = true;
  if (this.state === 'over' && this.revivePending) {
    this.reviveHideDetectedAt = utils.now();
  }
  this.postOpenDataMessage('hideFriendLeaderboard');
  this.audio.pauseBgm();
  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.onShow = function () {
  if (this.state === 'over' && this.revivePending && this.reviveHideDetectedAt > 0) {
    this.reviveAfterShare();
    return;
  }

  if (this.state === 'running' && !this.manualPause) {
    this.paused = false;
    this.lastTimestamp = 0;
    this.audio.resumeBgm();
  }

  this.emitUiChange();
};

PlaneMinigameRuntime.prototype.loop = function (timestamp) {
  if (this.destroyed) {
    return;
  }

  var currentTime = timestamp || utils.now();
  var deltaTime = 0;

  if (this.lastTimestamp) {
    deltaTime = Math.min(0.033, (currentTime - this.lastTimestamp) / 1000);
  }

  this.lastTimestamp = currentTime;

  if (!this.paused) {
    this.update(deltaTime);
  }

  this.render();

  this.raf(this.loop);
};

PlaneMinigameRuntime.prototype.destroy = function () {
  if (this.destroyed) {
    return;
  }

  this.destroyed = true;
  this.paused = true;
  this.postOpenDataMessage('hideFriendLeaderboard');
  this.pointerIdentifier = null;
  this.dragOffsetX = 0;
  this.dragOffsetY = 0;
  this.audio.destroy();
};

PlaneMinigameRuntime.prototype.applyPlayerHit = function (reason, hitX, hitY) {
  var result = null;

  if (!this.player) {
    return false;
  }

  result = this.player.takeDamage(1);

  if (!result.damaged) {
    return false;
  }

  this.audio.playEffect('hit');

  if (result.defeated) {
    this.explosions.push(new Explosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      this.scale
    ));
    this.audio.stopBgm();
    this.audio.playEffect('gameover');
    this.showBanner(reason === 'collision' ? '战机被击毁' : '被敌机击中', '#3f3732', 1.05);
    this.triggerShake(0.24, 7 * this.scale);
    this.triggerScreenFlash('#ece5da', 0.24);
    this.endGame();
    return true;
  }

  this.showBanner('机体受损', '#5a4f47', 0.88);
  this.addFloatingText(
    'HP -1',
    hitX || (this.player.x + this.player.width / 2),
    hitY || (this.player.y + this.player.height / 2),
    '#5a4f47'
  );
  this.triggerShake(0.12, 3.6 * this.scale);
  this.triggerScreenFlash('#f0e8db', 0.18);
  this.triggerVibration('light');
  this.emitUiChange();
  return false;
};

PlaneMinigameRuntime.prototype.update = function (deltaTime) {
  utils.updateStars(this.stars, deltaTime, this.height);
  this.updateFeedback(deltaTime);

  if (this.state !== 'running' || !this.player) {
    return;
  }

  this.slowMotionTime = Math.max(0, this.slowMotionTime - deltaTime);
  this.scoreMultiplierTime = Math.max(0, this.scoreMultiplierTime - deltaTime);
  this.maybeSpawnBombSupply(deltaTime);

  this.survivalTime += deltaTime;
  var nextLevel = 1 + Math.floor(this.survivalTime / 12);
  var enemyDeltaTime = deltaTime * (this.slowMotionTime > 0 ? 0.68 : 1);

  if (nextLevel > this.level) {
    this.level = nextLevel;
    this.audio.playEffect('levelup');
    this.showBanner('第 ' + this.level + ' 关', '#6b6057', 1.2);
    this.triggerScreenFlash('#f3eee4', 0.15);
    this.triggerShake(0.1, 3.5 * this.scale);
  } else {
    this.level = nextLevel;
  }

  this.spawnTimer += deltaTime;
  this.flushSpawnQueue(deltaTime);

  var spawnInterval = Math.max(0.34, 0.95 - (this.level - 1) * 0.05);

  while (this.spawnTimer >= spawnInterval) {
    this.spawnTimer -= spawnInterval;
    this.waveCount += 1;

    if (this.level >= 2 && this.waveCount % 4 === 0) {
      this.launchFormationWave();
    } else {
      this.spawnEnemy();
    }
  }

  var shots = this.player.update(deltaTime);
  for (var i = 0; i < shots; i += 1) {
    var spawnedBullets = this.player.spawnBullets();

    for (var bulletCreateIndex = 0; bulletCreateIndex < spawnedBullets.length; bulletCreateIndex += 1) {
      var bullet = spawnedBullets[bulletCreateIndex];
      this.bullets.push(bullet);
      this.addMuzzleFlash(
        bullet.x + bullet.width / 2,
        this.player.y + 8 * this.scale
      );
    }
  }

  for (var bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    var activeBullet = this.bullets[bulletIndex];
    activeBullet.update(deltaTime);

    if (activeBullet.isOutOfBounds()) {
      this.bullets.splice(bulletIndex, 1);
    }
  }

  for (var enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    var enemy = this.enemies[enemyIndex];
    enemy.update(enemyDeltaTime);

    if (enemy.isOutOfBounds()) {
      this.enemies.splice(enemyIndex, 1);
      continue;
    }

    if (utils.intersects(enemy.getBounds(), this.player.getBounds())) {
      this.enemies.splice(enemyIndex, 1);
      this.explosions.push(new Explosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        Math.max(this.scale, enemy.scale * 0.85)
      ));

      if (this.player.consumeShield && this.player.consumeShield()) {
        this.audio.playEffect('hit');
        this.showBanner('护盾破裂', '#71655b', 0.9);
        this.triggerShake(0.12, 3.2 * this.scale);
        this.triggerScreenFlash('#f2eee5', 0.18);
        this.triggerVibration('light');
        this.emitUiChange();
        continue;
      }

      if (this.applyPlayerHit('collision', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)) {
        return;
      }

      if (this.state !== 'running') {
        return;
      }

      continue;
    }

    var spawnedEnemyBullets = enemy.tryShoot ? enemy.tryShoot(enemyDeltaTime) : [];
    for (var enemyBulletSpawnIndex = 0; enemyBulletSpawnIndex < spawnedEnemyBullets.length; enemyBulletSpawnIndex += 1) {
      this.enemyBullets.push(spawnedEnemyBullets[enemyBulletSpawnIndex]);
    }
  }

  for (var enemyBulletIndex = this.enemyBullets.length - 1; enemyBulletIndex >= 0; enemyBulletIndex -= 1) {
    var enemyBullet = this.enemyBullets[enemyBulletIndex];
    enemyBullet.update(enemyDeltaTime);

    if (enemyBullet.isOutOfBounds()) {
      this.enemyBullets.splice(enemyBulletIndex, 1);
      continue;
    }

    if (utils.intersects(enemyBullet.getBounds(), this.player.getBounds())) {
      this.enemyBullets.splice(enemyBulletIndex, 1);

      if (this.player.consumeShield && this.player.consumeShield()) {
        this.audio.playEffect('hit');
        this.showBanner('护盾抵挡', '#71655b', 0.75);
        this.triggerScreenFlash('#f2eee5', 0.14);
        this.emitUiChange();
        continue;
      }

      if (this.applyPlayerHit('bullet', enemyBullet.x + enemyBullet.width / 2, enemyBullet.y + enemyBullet.height / 2)) {
        return;
      }

      if (this.state !== 'running') {
        return;
      }

      continue;
    }
  }

  for (var collisionEnemyIndex = this.enemies.length - 1; collisionEnemyIndex >= 0; collisionEnemyIndex -= 1) {
    var collisionEnemy = this.enemies[collisionEnemyIndex];
    var enemyBounds = collisionEnemy.getBounds();
    var enemyDestroyed = false;

    for (var collisionBulletIndex = this.bullets.length - 1; collisionBulletIndex >= 0; collisionBulletIndex -= 1) {
      var collisionBullet = this.bullets[collisionBulletIndex];

      if (!utils.intersects(enemyBounds, collisionBullet.getBounds())) {
        continue;
      }

      this.bullets.splice(collisionBulletIndex, 1);
      enemyDestroyed = collisionEnemy.takeHit(1);

      if (!enemyDestroyed) {
        if (collisionEnemy.consumePhaseChange && collisionEnemy.consumePhaseChange()) {
          if (collisionEnemy.getAttackPhase && collisionEnemy.getAttackPhase() === 2) {
            this.showBanner('大型敌机压制升级', '#5a4f47', 0.95);
            this.addFloatingText('压制升级', collisionEnemy.x + collisionEnemy.width / 2, collisionEnemy.y - 18 * this.scale, '#5a4f47');
          } else if (collisionEnemy.getAttackPhase && collisionEnemy.getAttackPhase() === 3) {
            this.showBanner('大型敌机狂暴', '#4a4038', 1.05);
            this.addFloatingText('狂暴阶段', collisionEnemy.x + collisionEnemy.width / 2, collisionEnemy.y - 18 * this.scale, '#4a4038');
          }
          this.triggerScreenFlash('#f1e9dd', 0.12);
          this.triggerShake(0.1, 3.4 * this.scale);
        }

        this.audio.playEffect('hit');
        this.addFloatingText(
          '命中',
          collisionEnemy.x + collisionEnemy.width / 2,
          collisionEnemy.y + collisionEnemy.height / 2,
          '#5a5149'
        );
        break;
      }

      this.enemies.splice(collisionEnemyIndex, 1);
      this.score += collisionEnemy.score * (this.scoreMultiplierTime > 0 ? SCORE_BOOST_MULTIPLIER : 1);
      this.explosions.push(new Explosion(
        collisionEnemy.x + collisionEnemy.width / 2,
        collisionEnemy.y + collisionEnemy.height / 2,
        Math.max(this.scale, collisionEnemy.scale * 0.82)
      ));
      this.maybeSpawnPowerUp(collisionEnemy);
      this.audio.playEffect('hit');
      this.addFloatingText(
        '+' + (collisionEnemy.score * (this.scoreMultiplierTime > 0 ? SCORE_BOOST_MULTIPLIER : 1)) + (this.scoreMultiplierTime > 0 ? ' x2' : ''),
        collisionEnemy.x + collisionEnemy.width / 2,
        collisionEnemy.y + collisionEnemy.height / 2,
        '#4b433d'
      );
      this.triggerShake(0.08, 2.8 * this.scale);
      enemyDestroyed = true;
      break;
    }

    if (enemyDestroyed) {
      continue;
    }
  }

  for (var powerUpIndex = this.powerUps.length - 1; powerUpIndex >= 0; powerUpIndex -= 1) {
    var powerUp = this.powerUps[powerUpIndex];
    powerUp.update(deltaTime);

    if (powerUp.isOutOfBounds()) {
      this.powerUps.splice(powerUpIndex, 1);
      continue;
    }

    if (utils.intersects(powerUp.getBounds(), this.player.getBounds())) {
      this.powerUps.splice(powerUpIndex, 1);
      this.applyPowerUp(
        powerUp.type,
        powerUp.x + powerUp.size / 2,
        powerUp.y + powerUp.size * 0.62
      );
    }
  }

  for (var explosionIndex = this.explosions.length - 1; explosionIndex >= 0; explosionIndex -= 1) {
    if (!this.explosions[explosionIndex].update(deltaTime)) {
      this.explosions.splice(explosionIndex, 1);
    }
  }
};

PlaneMinigameRuntime.prototype.endGame = function () {
  this.state = 'over';
  this.paused = false;
  this.manualPause = false;
  this.pendingRunRecord = true;

  if (!this.canReviveByShare()) {
    this.finalizePendingRunRecord();
  }

  this.emitUiChange();
  this.triggerVibration('medium');
};

PlaneMinigameRuntime.prototype.finalizePendingRunRecord = function () {
  if (!this.pendingRunRecord) {
    return;
  }

  this.pendingRunRecord = false;
  this.bestScore = Math.max(this.bestScore, this.score);
  this.recordLeaderboardEntry();
  utils.safeSetStorage(STORAGE_KEY, this.bestScore);
  this.syncCloudLeaderboard();
};

PlaneMinigameRuntime.prototype.render = function () {
  var ctx = this.ctx;
  var shakeOffset = this.getShakeOffset();

  ctx.clearRect(0, 0, this.width, this.height);
  this.renderBackground(ctx);

  ctx.save();
  ctx.translate(shakeOffset.x, shakeOffset.y);

  if (this.player) {
    this.player.draw(ctx);
  }

  for (var enemyBulletRenderIndex = 0; enemyBulletRenderIndex < this.enemyBullets.length; enemyBulletRenderIndex += 1) {
    this.enemyBullets[enemyBulletRenderIndex].draw(ctx);
  }

  this.renderMuzzleFlashes(ctx);

  for (var i = 0; i < this.bullets.length; i += 1) {
    this.bullets[i].draw(ctx);
  }

  for (var j = 0; j < this.enemies.length; j += 1) {
    this.enemies[j].draw(ctx);
  }

  this.renderEnemyWarnings(ctx);

  for (var k = 0; k < this.powerUps.length; k += 1) {
    this.powerUps[k].draw(ctx);
  }

  for (var explosionIndex = 0; explosionIndex < this.explosions.length; explosionIndex += 1) {
    this.explosions[explosionIndex].draw(ctx);
  }

  this.renderFloatingTexts(ctx);
  ctx.restore();

  if (this.state === 'running') {
    this.renderHud(ctx);
  }
  this.renderBanner(ctx);
  this.renderScreenFlash(ctx);

  if (this.state === 'loading') {
    this.renderLoading(ctx);
  } else if (this.state === 'ready') {
    this.renderCover(ctx);
  } else if (this.state === 'running' && this.paused) {
    this.renderPausedOverlay(ctx);
  } else if (this.state === 'over') {
    this.renderGameOver(ctx);
    if (this.leaderboardVisible) {
      this.renderLeaderboard(ctx);
    }
  } else if (this.state === 'error') {
    this.renderError(ctx);
  }
};

PlaneMinigameRuntime.prototype.renderBackground = function (ctx) {
  var gradient = ctx.createLinearGradient(0, 0, 0, this.height);
  gradient.addColorStop(0, PAPER_LIGHT);
  gradient.addColorStop(0.52, PAPER_MID);
  gradient.addColorStop(1, PAPER_DARK);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, this.width, this.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(136, 126, 114, 0.12)';
  ctx.lineWidth = 1;

  for (var i = 0; i < this.stars.length; i += 1) {
    var star = this.stars[i];
    ctx.globalAlpha = star.alpha * 0.14;
    ctx.fillStyle = INK;
    ctx.fillRect(star.x, star.y, Math.max(1, star.size * 0.7), Math.max(1, star.size * 0.7));
  }
  ctx.restore();

  return;
};

PlaneMinigameRuntime.prototype.renderMuzzleFlashes = function (ctx) {
  for (var i = 0; i < this.muzzleFlashes.length; i += 1) {
    var flash = this.muzzleFlashes[i];
    var progress = flash.age / flash.duration;
    var radius = flash.radius * (1 + progress * 0.6);
    var alpha = 0.72 - progress * 0.34;

    utils.drawSketchLine(ctx, flash.x - radius * 0.55, flash.y, flash.x + radius * 0.55, flash.y, {
      strokeStyle: 'rgba(72, 63, 55, ' + alpha + ')',
      lineWidth: 1.2,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, flash.x, flash.y - radius * 0.55, flash.x, flash.y + radius * 0.55, {
      strokeStyle: 'rgba(72, 63, 55, ' + alpha + ')',
      lineWidth: 1.2,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, flash.x - radius * 0.42, flash.y - radius * 0.42, flash.x + radius * 0.42, flash.y + radius * 0.42, {
      strokeStyle: 'rgba(90, 80, 71, ' + (alpha * 0.86) + ')',
      lineWidth: 1,
      jitter: 0.3
    });
  }
};

PlaneMinigameRuntime.prototype.renderEnemyWarnings = function (ctx) {
  if (this.state !== 'running') {
    return;
  }

  var playerCenterX = this.player ? this.player.x + this.player.width / 2 : this.width / 2;
  var warningTargetY = this.player
    ? this.player.y + this.player.height * 0.22
    : this.height - this.safeBottomInset - 84 * this.scale;
  var warningSpeedScale = this.slowMotionTime > 0 ? 0.68 : 1;

  ctx.save();

  for (var enemyIndex = 0; enemyIndex < this.enemies.length; enemyIndex += 1) {
    var enemy = this.enemies[enemyIndex];
    var telegraph = enemy.getTelegraphData ? enemy.getTelegraphData() : null;

    if (!telegraph || !telegraph.lines || !telegraph.lines.length) {
      continue;
    }

    var phaseBoost = telegraph.phase === 3 ? 0.12 : (telegraph.phase === 2 ? 0.06 : 0);
    var alpha = Math.min(0.72, 0.16 + telegraph.progress * 0.38 + phaseBoost);

    for (var lineIndex = 0; lineIndex < telegraph.lines.length; lineIndex += 1) {
      var line = telegraph.lines[lineIndex];
      var effectiveVy = line.vy * warningSpeedScale;
      var effectiveVx = line.vx * warningSpeedScale;
      var travelTime = Math.max(0.22, (warningTargetY - line.y) / Math.max(120, effectiveVy));
      var projectedX = utils.clamp(line.x + effectiveVx * travelTime, 18 * this.scale, this.width - 18 * this.scale);
      var danger = Math.abs(projectedX - playerCenterX) <= (this.player ? this.player.width * 0.9 : 36 * this.scale);
      var segmentCount = line.pattern === 'heavy' ? 4 : 5;
      var strokeStyle = danger
        ? 'rgba(92, 67, 52, ' + alpha + ')'
        : 'rgba(120, 108, 96, ' + (alpha * 0.88) + ')';

      for (var segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 2) {
        var startT = segmentIndex / segmentCount;
        var endT = Math.min(1, startT + 0.16 + telegraph.progress * 0.08);
        var startX = line.x + (projectedX - line.x) * startT;
        var startY = line.y + (warningTargetY - line.y) * startT;
        var endX = line.x + (projectedX - line.x) * endT;
        var endY = line.y + (warningTargetY - line.y) * endT;

        utils.drawSketchLine(ctx, startX, startY, endX, endY, {
          strokeStyle: strokeStyle,
          lineWidth: line.pattern === 'heavy' ? 1.45 : 1.1,
          jitter: 0.24
        });
      }

      if (telegraph.progress > 0.45) {
        utils.drawSketchLine(ctx, line.x - 4 * this.scale, line.y, line.x + 4 * this.scale, line.y, {
          strokeStyle: strokeStyle,
          lineWidth: 1,
          jitter: 0.2
        });
        utils.drawSketchLine(ctx, line.x, line.y - 4 * this.scale, line.x, line.y + 4 * this.scale, {
          strokeStyle: strokeStyle,
          lineWidth: 1,
          jitter: 0.2
        });
      }

      if (danger && telegraph.progress > 0.6) {
        utils.drawSketchLine(ctx, projectedX - 7 * this.scale, warningTargetY - 7 * this.scale, projectedX + 7 * this.scale, warningTargetY + 7 * this.scale, {
          strokeStyle: 'rgba(94, 72, 58, ' + Math.min(0.78, alpha + 0.08) + ')',
          lineWidth: 1.1,
          jitter: 0.26
        });
        utils.drawSketchLine(ctx, projectedX + 7 * this.scale, warningTargetY - 7 * this.scale, projectedX - 7 * this.scale, warningTargetY + 7 * this.scale, {
          strokeStyle: 'rgba(94, 72, 58, ' + Math.min(0.78, alpha + 0.08) + ')',
          lineWidth: 1.1,
          jitter: 0.26
        });
      }
    }
  }

  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderFloatingTexts = function (ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setUiFont(ctx, 18 * this.scale, 'bold');

  for (var i = 0; i < this.floatingTexts.length; i += 1) {
    var floatingText = this.floatingTexts[i];
    var progress = floatingText.age / floatingText.duration;

    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = 'rgba(255, 249, 240, 0.6)';
    ctx.fillText(floatingText.text, floatingText.x + 1, floatingText.y + 1);
    ctx.fillStyle = floatingText.color || INK;
    ctx.fillText(floatingText.text, floatingText.x, floatingText.y);
  }

  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderBanner = function (ctx) {
  if (!this.banner) {
    return;
  }

  var progress = this.banner.age / this.banner.duration;
  var fadeIn = Math.min(1, progress / 0.18);
  var fadeOut = Math.min(1, (1 - progress) / 0.24);
  var alpha = Math.min(fadeIn, fadeOut);
  var cardWidth = Math.min(this.width * 0.62, 268 * this.scale);
  var cardHeight = 52 * this.scale;
  var x = (this.width - cardWidth) / 2;
  var y = this.safeTopInset + 72 * this.scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPaperPanel(ctx, x, y, cardWidth, cardHeight, 18, PANEL_FILL_ALT);
  drawPanelUnderline(ctx, x + 18 * this.scale, y + cardHeight - 10 * this.scale, cardWidth - 36 * this.scale, 0.42);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  setUiFont(ctx, 20 * this.scale, 'bold');
  ctx.fillText(this.banner.text, this.width / 2, y + cardHeight / 2 - 2 * this.scale);
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderScreenFlash = function (ctx) {
  if (this.screenFlashAlpha <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = this.screenFlashAlpha;
  ctx.fillStyle = this.screenFlashColor;
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderHud = function (ctx) {
  if (this.state !== 'running') {
    return;
  }

  var cardWidth = 124 * this.scale;
  var cardHeight = 56 * this.scale;
  var top = this.safeTopInset;
  var left = 16 * this.scale;
  var right = this.width - cardWidth - 16 * this.scale;
  var badges = [];

  this.pauseButtonRect = this.createPauseButtonRect();
  this.bombButtonRect = this.createBombButtonRect();
  this.clearButtonRect = this.createClearButtonRect();

  drawPaperPanel(ctx, left, top, cardWidth, cardHeight, 16, 'rgba(248, 244, 236, 0.8)');
  drawPaperPanel(ctx, right, top, cardWidth, cardHeight, 16, 'rgba(248, 244, 236, 0.8)');

  ctx.save();
  ctx.fillStyle = SOFT_INK;
  setUiFont(ctx, 12 * this.scale, 'bold');
  ctx.fillText('得分', left + 16 * this.scale, top + 18 * this.scale);
  ctx.fillText('最高', right + 16 * this.scale, top + 18 * this.scale);

  ctx.fillStyle = INK;
  setUiFont(ctx, 24 * this.scale, 'bold');
  ctx.fillText(String(this.score), left + 16 * this.scale, top + 42 * this.scale);
  ctx.fillText(String(this.bestScore), right + 16 * this.scale, top + 42 * this.scale);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  setUiFont(ctx, 18 * this.scale, 'bold');
  ctx.fillText('第 ' + this.level + ' 关', this.width / 2, top + 26 * this.scale);
  ctx.fillStyle = SOFT_INK;
  setUiFont(ctx, 12 * this.scale, 'bold');
  ctx.textAlign = 'right';
  ctx.fillText('HP', this.width / 2 - 18 * this.scale, top + 46 * this.scale);
  drawHpPips(ctx, this.width / 2 - 10 * this.scale, top + 41 * this.scale, this.player.hp, this.player.maxHp, this.scale);
  if (this.player.isInvincible && this.player.isInvincible()) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9a5f31';
    setUiFont(ctx, 11 * this.scale, 'bold');
    ctx.fillText('无敌', this.width / 2 + 56 * this.scale, top + 46 * this.scale);
  }
  this.renderPauseButton(ctx);
  this.renderBombButton(ctx);
  this.renderClearButton(ctx);
  ctx.restore();

  if (this.player && this.player.hasFirepowerUpgrade && this.player.hasFirepowerUpgrade()) {
    var firepowerStyle = getPowerUpStyle('firepower');
    badges.push({
      label: firepowerStyle.hudLabel,
      timer: this.player.firepowerTime,
      fill: firepowerStyle.badgeFill,
      stroke: firepowerStyle.badgeStroke,
      text: firepowerStyle.badgeText,
      style: firepowerStyle
    });
  }

  if (
    this.player &&
    this.player.hasDoubleShot &&
    this.player.hasDoubleShot() &&
    !(this.player.hasFirepowerUpgrade && this.player.hasFirepowerUpgrade())
  ) {
    var doubleStyle = getPowerUpStyle('double');
    badges.push({
      label: doubleStyle.hudLabel,
      timer: this.player.doubleShotTime,
      fill: doubleStyle.badgeFill,
      stroke: doubleStyle.badgeStroke,
      text: doubleStyle.badgeText,
      style: doubleStyle
    });
  }

  if (this.player && this.player.hasShield && this.player.hasShield()) {
    var shieldStyle = getPowerUpStyle('shield');
    badges.push({
      label: shieldStyle.hudLabel,
      timer: this.player.shieldTime,
      fill: shieldStyle.badgeFill,
      stroke: shieldStyle.badgeStroke,
      text: shieldStyle.badgeText,
      style: shieldStyle
    });
  }

  if (this.slowMotionTime > 0) {
    var slowStyle = getPowerUpStyle('slow');
    badges.push({
      label: slowStyle.hudLabel,
      timer: this.slowMotionTime,
      fill: slowStyle.badgeFill,
      stroke: slowStyle.badgeStroke,
      text: slowStyle.badgeText,
      style: slowStyle
    });
  }

  if (this.scoreMultiplierTime > 0) {
    var scoreStyle = getPowerUpStyle('score');
    badges.push({
      label: scoreStyle.hudLabel,
      timer: this.scoreMultiplierTime,
      fill: scoreStyle.badgeFill,
      stroke: scoreStyle.badgeStroke,
      text: scoreStyle.badgeText,
      style: scoreStyle
    });
  }

  if (!badges.length) {
    return;
  }

  var badgeGap = 10 * this.scale;
  var badgeHeight = 30 * this.scale;
  var badgeWidth = badges.length > 2 ? 114 * this.scale : 122 * this.scale;
  var badgeY = top + cardHeight + 12 * this.scale;
  var maxPerRow = badges.length > 2 ? 2 : badges.length;
  var rowCount = Math.ceil(badges.length / maxPerRow);
  var badgeIndex = 0;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (var rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    var rowStart = rowIndex * maxPerRow;
    var rowEnd = Math.min(rowStart + maxPerRow, badges.length);
    var rowSize = rowEnd - rowStart;
    var totalWidth = rowSize * badgeWidth + (rowSize - 1) * badgeGap;
    var badgeX = (this.width - totalWidth) / 2;

    for (badgeIndex = rowStart; badgeIndex < rowEnd; badgeIndex += 1) {
      var badge = badges[badgeIndex];
      var x = badgeX + (badgeIndex - rowStart) * (badgeWidth + badgeGap);
      renderHudBadge(
        ctx,
        badge,
        x,
        badgeY + rowIndex * (badgeHeight + 8 * this.scale),
        badgeWidth,
        badgeHeight,
        this.scale
      );
    }
  }

  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderPauseButton = function (ctx) {
  if (this.state !== 'running' || !this.pauseButtonRect) {
    return;
  }

  var rect = this.pauseButtonRect;
  var barWidth = 4 * this.scale;
  var barHeight = 14 * this.scale;
  var barGap = 4 * this.scale;
  var centerX = rect.x + rect.width / 2;
  var centerY = rect.y + rect.height / 2;

  drawPaperPanel(ctx, rect.x, rect.y, rect.width, rect.height, 999, 'rgba(245, 239, 229, 0.94)');
  utils.drawSketchLine(ctx, centerX - barGap / 2 - barWidth / 2, centerY - barHeight / 2, centerX - barGap / 2 - barWidth / 2, centerY + barHeight / 2, {
    strokeStyle: INK,
    lineWidth: barWidth,
    jitter: 0.22
  });
  utils.drawSketchLine(ctx, centerX + barGap / 2 + barWidth / 2, centerY - barHeight / 2, centerX + barGap / 2 + barWidth / 2, centerY + barHeight / 2, {
    strokeStyle: INK,
    lineWidth: barWidth,
    jitter: 0.22
  });
};

PlaneMinigameRuntime.prototype.renderBombButton = function (ctx) {
  if (this.state !== 'running' || !this.bombButtonRect) {
    return;
  }

  var rect = this.bombButtonRect;
  var bombStyle = getPowerUpStyle('bomb');
  var iconX = rect.x + 16 * this.scale;
  var centerY = rect.y + rect.height / 2;
  var iconRadius = rect.height * 0.19;
  var alpha = this.bombs > 0 ? 1 : 0.46;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPaperPanel(ctx, rect.x, rect.y, rect.width, rect.height, 14, bombStyle.badgeFill);
  utils.drawSketchLine(ctx, iconX, centerY - iconRadius * 1.15, iconX + iconRadius * 0.52, centerY - iconRadius * 1.75, {
    strokeStyle: bombStyle.ink,
    lineWidth: 1.05,
    jitter: 0.16
  });
  utils.drawSketchLine(ctx, iconX + iconRadius * 0.52, centerY - iconRadius * 1.75, iconX + iconRadius * 1.02, centerY - iconRadius * 1.45, {
    strokeStyle: bombStyle.accent,
    lineWidth: 0.9,
    jitter: 0.16
  });
  utils.drawSketchStroke(ctx, function (strokeCtx) {
    strokeCtx.arc(iconX, centerY, iconRadius, 0, Math.PI * 2);
  }, {
    strokeStyle: bombStyle.ink,
    lineWidth: 1.3,
    jitter: 0.24
  });
  ctx.fillStyle = bombStyle.badgeText;
  setUiFont(ctx, 13 * this.scale, 'bold');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('x' + this.bombs, rect.x + 28 * this.scale, centerY + 1 * this.scale);
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderClearButton = function (ctx) {
  if (this.state !== 'running' || !this.clearButtonRect) {
    return;
  }

  var rect = this.clearButtonRect;
  var clearStyle = getPowerUpStyle('clear');
  var iconX = rect.x + 16 * this.scale;
  var centerY = rect.y + rect.height / 2;
  var alpha = this.clearCharges > 0 ? 1 : 0.46;
  var span = rect.height * 0.16;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawPaperPanel(ctx, rect.x, rect.y, rect.width, rect.height, 14, clearStyle.badgeFill);
  utils.drawSketchLine(ctx, iconX - span, centerY - span, iconX + span, centerY + span, {
    strokeStyle: clearStyle.ink,
    lineWidth: 1.25,
    jitter: 0.2
  });
  utils.drawSketchLine(ctx, iconX + span, centerY - span, iconX - span, centerY + span, {
    strokeStyle: clearStyle.ink,
    lineWidth: 1.25,
    jitter: 0.2
  });
  utils.drawSketchLine(ctx, iconX - span * 1.35, centerY, iconX + span * 1.35, centerY, {
    strokeStyle: clearStyle.accent,
    lineWidth: 0.95,
    jitter: 0.18
  });
  ctx.fillStyle = clearStyle.badgeText;
  setUiFont(ctx, 13 * this.scale, 'bold');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('x' + this.clearCharges, rect.x + 28 * this.scale, centerY + 1 * this.scale);
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderLoading = function (ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  setUiFont(ctx, 30 * this.scale, 'bold');
  ctx.fillText(gameMeta.GAME_TITLE, this.width / 2, this.height * 0.34);
  drawPanelUnderline(ctx, this.width / 2 - 82 * this.scale, this.height * 0.365, 164 * this.scale, 0.3);
  setUiFont(ctx, 16 * this.scale, null);
  ctx.fillStyle = SOFT_INK;
  ctx.fillText('正在加载游戏资源...', this.width / 2, this.height * 0.42);
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderCover = function (ctx) {
  var layout = this.getCoverLayout();
  this.buttonRect = layout.buttonRect;

  ctx.save();
  ctx.textAlign = 'center';
  drawCoverDisplayText(ctx, gameMeta.GAME_TITLE, this.width / 2, layout.titleY, {
    size: layout.titleFontSize,
    fillStyle: INK,
    strokeStyle: 'rgba(241, 237, 230, 0.82)',
    lineWidth: 1.4,
    weight: null,
    shadowColor: 'rgba(58, 49, 40, 0.16)',
    shadowOffsetY: 1.6
  });

  drawCoverDisplayText(ctx, gameMeta.GAME_SLOGAN, this.width / 2, layout.sloganY, {
    size: layout.sloganFontSize,
    fillStyle: '#7f6a53',
    strokeStyle: 'rgba(244, 239, 229, 0.72)',
    lineWidth: 0.8,
    weight: null,
    shadowColor: 'rgba(58, 49, 40, 0.08)',
    shadowOffsetY: 1
  });

  drawPaperPanel(ctx, layout.panelX, layout.panelY, layout.panelWidth, layout.panelHeight, 22, 'rgba(247, 243, 236, 0.88)');

  drawCoverPlaneIcon(ctx, layout.previewX, layout.previewY, layout.previewWidth, layout.previewHeight);

  ctx.fillStyle = SOFT_INK;
  setCoverFont(ctx, layout.descFontSize, null);
  for (var lineIndex = 0; lineIndex < gameMeta.COVER_DESCRIPTION_LINES.length; lineIndex += 1) {
    ctx.fillText(
      gameMeta.COVER_DESCRIPTION_LINES[lineIndex],
      this.width / 2,
      layout.descStartY + lineIndex * layout.descLineHeight
    );
  }

  drawCoverDisplayText(ctx, '作者 ' + gameMeta.GAME_AUTHOR, layout.authorX, layout.authorY, {
    size: 11.5 * this.scale,
    fillStyle: '#8b6b3f',
    strokeStyle: 'rgba(247, 243, 236, 0.68)',
    lineWidth: 0.7,
    weight: null,
    textAlign: 'right',
    shadowColor: 'rgba(58, 49, 40, 0.06)',
    shadowOffsetY: 0.8
  });

  drawPencilButton(ctx, this.buttonRect, '开始游戏', {
    primary: true,
    displayStyle: 'cover',
    fontSize: 18.5 * this.scale,
    fontWeight: null,
    textColor: '#5f4b38'
  });
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderPausedOverlay = function (ctx) {
  var buttons = this.getPauseOverlayButtons();
  var panelWidth = Math.min(this.width - 40 * this.scale, 320);
  var panelHeight = 220 * this.scale;
  var panelX = (this.width - panelWidth) / 2;
  var panelY = this.height * 0.22;

  ctx.save();
  ctx.fillStyle = 'rgba(242, 236, 227, 0.72)';
  ctx.fillRect(0, 0, this.width, this.height);
  drawPaperPanel(ctx, panelX, panelY, panelWidth, panelHeight, 22, PANEL_FILL);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  setUiFont(ctx, 30 * this.scale, 'bold');
  ctx.fillText('游戏暂停', this.width / 2, panelY + 44 * this.scale);
  drawPanelUnderline(ctx, panelX + 34 * this.scale, panelY + 58 * this.scale, panelWidth - 68 * this.scale, 0.28);

  ctx.fillStyle = SOFT_INK;
  setUiFont(ctx, 16 * this.scale, null);
  ctx.fillText('本局得分 ' + this.score, this.width / 2, panelY + 94 * this.scale);
  ctx.fillText('最高分 ' + this.bestScore, this.width / 2, panelY + 124 * this.scale);
  ctx.fillText('生存时间 ' + this.survivalTime.toFixed(1) + ' 秒', this.width / 2, panelY + 154 * this.scale);

  drawPencilButton(ctx, buttons.primary, '继续游戏', { primary: true });
  drawPencilButton(ctx, buttons.secondary, '重新开始');
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderGameOver = function (ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(239, 232, 223, 0.76)';
  ctx.fillRect(0, 0, this.width, this.height);

  var panelWidth = Math.min(this.width - 44 * this.scale, 318 * this.scale);
  var panelHeight = 220 * this.scale;
  var panelX = (this.width - panelWidth) / 2;
  var panelY = this.height * 0.23;
  var buttons = this.getGameOverButtons(panelY, panelHeight);
  var pillWidth = 92 * this.scale;
  var pillHeight = 28 * this.scale;
  var pillX = this.width / 2 - pillWidth / 2;
  var pillY = panelY + 12 * this.scale;
  var cardInsetX = 18 * this.scale;
  var cardGap = 10 * this.scale;
  var cardWidth = (panelWidth - cardInsetX * 2 - cardGap) / 2;
  var cardHeight = 52 * this.scale;
  var firstRowY = panelY + 104 * this.scale;
  var secondRowY = firstRowY + cardHeight + 10 * this.scale;
  var leftCardX = panelX + cardInsetX;
  var rightCardX = leftCardX + cardWidth + cardGap;
  var currentRankText = this.currentRunRank ? ('第 ' + this.currentRunRank + ' 名') : '未上榜';

  drawPaperPanel(ctx, panelX, panelY, panelWidth, panelHeight, 22, PANEL_FILL_ALT);
  drawPaperPanel(ctx, pillX, pillY, pillWidth, pillHeight, 16, 'rgba(247, 243, 236, 0.96)');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  setUiFont(ctx, 12 * this.scale, null);
  ctx.fillText('战绩结算', this.width / 2, pillY + pillHeight / 2 + 1);
  drawCoverDisplayText(ctx, '挑战结束', this.width / 2, panelY + 36 * this.scale, {
    size: 28 * this.scale,
    fillStyle: INK,
    strokeStyle: 'rgba(246, 241, 232, 0.7)',
    lineWidth: 0.9,
    weight: null,
    shadowColor: 'rgba(58, 49, 40, 0.08)',
    shadowOffsetY: 1
  });

  ctx.fillStyle = SOFT_INK;
  setUiFont(ctx, 13.5 * this.scale, null);
  ctx.fillText('第 ' + this.level + ' 关  ·  生存 ' + this.survivalTime.toFixed(1) + ' 秒', this.width / 2, panelY + 64 * this.scale);

  drawSummaryCard(ctx, {
    x: leftCardX,
    y: firstRowY,
    width: cardWidth,
    height: cardHeight
  }, '本局得分', String(this.score));
  drawSummaryCard(ctx, {
    x: rightCardX,
    y: firstRowY,
    width: cardWidth,
    height: cardHeight
  }, '最高分', String(this.bestScore));
  drawSummaryCard(ctx, {
    x: leftCardX,
    y: secondRowY,
    width: cardWidth,
    height: cardHeight
  }, '生存时间', this.survivalTime.toFixed(1) + ' 秒');
  drawSummaryCard(ctx, {
    x: rightCardX,
    y: secondRowY,
    width: cardWidth,
    height: cardHeight
  }, '本机排行', currentRankText);

  if (buttons.primary) {
    drawPencilButton(ctx, buttons.primary,
      this.canReviveByShare()
        ? this.getShareReviveButtonLabel()
        : '再来一局',
      {
        primary: true,
        displayStyle: 'cover',
        fontSize: 17 * this.scale,
        fillStyle: this.canReviveByShare() ? PANEL_FILL_ALT : PANEL_FILL
      }
    );
  }

  if (buttons.secondary) {
    drawPencilButton(ctx, buttons.secondary, this.canReviveByShare() ? '再来一局' : '战绩排行', {
      displayStyle: 'cover',
      fontSize: 16.5 * this.scale
    });
  }

  if (buttons.tertiary) {
    this.leaderboardButtonRect = buttons.tertiary;
    drawPencilButton(ctx, buttons.tertiary, '战绩排行', {
      displayStyle: 'cover',
      fontSize: 16.5 * this.scale,
      fillStyle: 'rgba(244, 237, 227, 0.92)'
    });
  } else {
    this.leaderboardButtonRect = buttons.secondary;
  }
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderLeaderboard = function (ctx) {
  var panelWidth = Math.min(this.width - 34 * this.scale, 336 * this.scale);
  var panelHeight = Math.min(this.height * 0.58, 360 * this.scale);
  var panelX = (this.width - panelWidth) / 2;
  var panelY = this.height * 0.18;
  var closeRect = this.createLeaderboardCloseRect(panelX, panelY, panelWidth);
  var tabRects = this.createLeaderboardTabRects(panelX, panelY, panelWidth);
  var contentX = panelX + 18 * this.scale;
  var contentY = panelY + (tabRects ? 126 * this.scale : 84 * this.scale);
  var contentWidth = panelWidth - 36 * this.scale;
  var contentBottomY = panelY + panelHeight - 20 * this.scale;
  var contentHeight = Math.max(72 * this.scale, contentBottomY - contentY);
  var records = this.leaderboard.length ? this.leaderboard : [{
    score: 0,
    level: 0,
    survivalTime: 0,
    playedAt: 0
  }];

  this.leaderboardPanelRect = {
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight
  };
  this.leaderboardCloseRect = closeRect;
  this.leaderboardTabRects = tabRects;

  ctx.save();
  ctx.fillStyle = 'rgba(242, 236, 227, 0.96)';
  ctx.fillRect(0, 0, this.width, this.height);
  drawPaperPanel(ctx, panelX, panelY, panelWidth, panelHeight, 22, PANEL_FILL_ALT);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  setUiFont(ctx, 28 * this.scale, 'bold');
  ctx.fillText(
    this.leaderboardMode === 'friends' ? '好友排行' : '本机战绩排行',
    this.width / 2,
    panelY + 42 * this.scale
  );

  drawPencilButton(ctx, closeRect, '×', {
    fontSize: 24 * this.scale
  });

  if (tabRects) {
    drawPencilButton(ctx, tabRects.local, '本机战绩', {
      primary: this.leaderboardMode === 'local',
      fillStyle: 'rgba(244, 237, 227, 0.94)',
      alpha: this.leaderboardMode === 'local' ? 1 : 0.72,
      fontSize: 17 * this.scale
    });
    drawPencilButton(ctx, tabRects.friends, '好友排行', {
      primary: this.leaderboardMode === 'friends',
      fillStyle: 'rgba(244, 237, 227, 0.94)',
      alpha: this.leaderboardMode === 'friends' ? 1 : 0.72,
      fontSize: 17 * this.scale
    });
  }

  if (this.leaderboardMode === 'friends' && this.friendRankSupported && this.sharedCanvas) {
    utils.drawSketchRoundRect(
      ctx,
      contentX,
      contentY,
      contentWidth,
      contentHeight,
      16,
      'rgba(246, 241, 233, 0.76)',
      'rgba(96, 86, 77, 0.28)',
      1
    );

    if (
      this.friendRankDirty ||
      !this.friendRankRect ||
      this.friendRankRect.width !== contentWidth ||
      this.friendRankRect.height !== contentHeight
    ) {
      this.friendRankRect = {
        x: contentX,
        y: contentY,
        width: contentWidth,
        height: contentHeight
      };
      this.postOpenDataMessage('showFriendLeaderboard', {
        width: Math.round(contentWidth),
        height: Math.round(contentHeight),
        pixelRatio: this.pixelRatio,
        scoreKey: 'plane_best_score',
        title: '好友排行',
        selfScore: this.bestScore
      });
      this.friendRankDirty = false;
    }

    try {
      if (this.sharedCanvas.width > 0 && this.sharedCanvas.height > 0) {
        ctx.drawImage(this.sharedCanvas, contentX, contentY, contentWidth, contentHeight);
      } else {
        ctx.fillStyle = SOFT_INK;
        setUiFont(ctx, 14 * this.scale, null);
        ctx.fillText('正在加载好友数据...', this.width / 2, contentY + contentHeight / 2);
      }
    } catch (error) {
      ctx.fillStyle = SOFT_INK;
      setUiFont(ctx, 14 * this.scale, null);
      ctx.fillText('好友排行暂时不可用，稍后再试', this.width / 2, contentY + contentHeight / 2);
    }
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var recordCount = Math.max(1, records.length);
    var rowGap = 8 * this.scale;
    var rowHeight = Math.max(
      30 * this.scale,
      Math.min(36 * this.scale, (contentHeight - rowGap * (recordCount - 1)) / recordCount)
    );

    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      var itemY = contentY + rowHeight / 2 + i * (rowHeight + rowGap);
      var highlight = this.currentRunRank === i + 1;

      utils.drawSketchRoundRect(
        ctx,
        panelX + 18 * this.scale,
        itemY - rowHeight / 2,
        panelWidth - 36 * this.scale,
        rowHeight,
        14,
        highlight ? 'rgba(232, 223, 211, 0.98)' : 'rgba(246, 241, 233, 0.76)',
        'rgba(96, 86, 77, 0.28)',
        1
      );

      ctx.fillStyle = INK;
      setUiFont(ctx, 14 * this.scale, 'bold');
      ctx.fillText('#' + (i + 1), panelX + 34 * this.scale, itemY);

      ctx.fillStyle = SOFT_INK;
      setUiFont(ctx, 13 * this.scale, null);
      ctx.fillText(
        record.score > 0
          ? ('得分 ' + record.score + '  ·  第 ' + record.level + ' 关  ·  ' + record.survivalTime + ' 秒')
          : '还没有有效战绩，先开始一局吧',
        panelX + 72 * this.scale,
        itemY
      );
    }
  }
  ctx.restore();
};

PlaneMinigameRuntime.prototype.renderError = function (ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  setUiFont(ctx, 28 * this.scale, 'bold');
  ctx.fillText('加载失败', this.width / 2, this.height * 0.4);
  drawPanelUnderline(ctx, this.width / 2 - 72 * this.scale, this.height * 0.425, 144 * this.scale, 0.28);
  setUiFont(ctx, 15 * this.scale, null);
  ctx.fillStyle = SOFT_INK;
  ctx.fillText(this.errorMessage || '请检查游戏资源路径和开发者工具项目类型。', this.width / 2, this.height * 0.48);
  ctx.restore();
};

module.exports = PlaneMinigameRuntime;
