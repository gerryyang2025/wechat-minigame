'use strict';

var utils = require('./utils');
var gameMeta = require('./game-meta');
var MiniGameAudio = require('./audio');
var platformAssets = require('./platform-assets');

var STORAGE_BEST_SCORE_KEY = 'jumpjump-game-best-score';
var STORAGE_PLAY_COUNT_KEY = 'jumpjump-game-play-count';
var STORAGE_LEADERBOARD_KEY = 'jumpjump-game-local-leaderboard';
var STORAGE_AIM_LINE_KEY = 'jumpjump-game-show-aim-line-v2';

var MAX_CHARGE_SECONDS = 3;
var CHARGE_VISUAL_SECONDS = 1.6;
var MIN_RELEASE_SECONDS = 0.08;
var CHARGE_DISTANCE_PER_SECOND = 200;
var MAX_ARC_HEIGHT = 108;
var PLATFORM_PRESS_MAX_SQUASH = 0.14;
var PLATFORM_PRESS_MAX_STRETCH = 0.04;
var BACKGROUND_SWITCH_INTERVAL = 15;
var PLAYER_WIDTH = 26;
var PLAYER_HEIGHT = 68;
var STAGE_WIDTH = 480;
var STAGE_HEIGHT = 360;
var STAGE_CENTER_X = STAGE_WIDTH / 2;
var STAGE_CENTER_Y = STAGE_HEIGHT / 2;
var SQRT_THREE = Math.sqrt(3);
var PLATFORM_SCALE = 4;
var OVER1000_PLATFORM_TYPE_ID = 162;
var MENU_CURRENT_PLATFORM_TYPE_ID = 161;
var MENU_TARGET_PLATFORM_TYPE_ID = 151;
var START_CURRENT_X = STAGE_CENTER_X - 60.585;
var START_TARGET_X = STAGE_CENTER_X + 60.585;
var PLATFORM_TYPE_RADII = [
  null,
  17.5, 16, 16, 16.2, 15.8, 15, 17, 15.5, 16.2, 16, 16, 15.2, 16, 14.6, 15.5, 15.8,
  16, 16.5, 14.7, 15.5, 14.5, 16.3, 14.5, 15.2, 15.5, 15.8, 14.8, 15.8, 18.8, 17.4,
  13.5, 11.4, 13, 14, 13.4, 12.5, 14, 14.1, 14.6, 13.7, 12.3, 12.5, 13.2, 14.2, 13,
  11.5, 14.2, 12.3, 13.7, 12.5, 11.8, 13.6, 11.8, 13.5, 11.9, 12.9, 11.5, 12.7, 12.9,
  12.5, 12.5, 13.5, 13.6, 12.4, 15.4, 14.1, 13.6, 10.4, 10.3, 8.9, 10.8, 10.5, 11.5,
  10.5, 9.5, 10.6, 11.1, 8.8, 10.2, 10.9, 9, 10.3, 9.6, 9.5, 10, 9.9, 10.6, 10.5,
  9.5, 11.5, 10.8, 10.6, 12.6, 7.4, 6.9, 8.4, 6.6, 9, 7.3, 9.3, 8.4, 7.4, 7.6, 6,
  6.2, 8.4, 7.3, 7.5, 8.1, 7.2, 6.2, 8.5, 6.8, 6.6, 5.2, 4.6, 5.6, 4.9, 4.6, 5.2,
  5.9, 5.3, 4.7, 5.5, 4.9, 4.9, 5.5, 5.5, 5, 5.7, 5, 4.5, 5, 5.2, 4.8, 4.5, 5.4,
  6.8, 17.4, 16.2, 16.4, 15.5, 15, 14.7, 16, 20.5, 13, 12.2, 13.4, 17.4
];
var SPECIAL_PLATFORM_RADII = {
  151: 16.4,
  152: 16.2,
  153: 16.4,
  154: 15.5,
  155: 15,
  156: 14.7,
  157: 14.4,
  158: 16,
  159: 13,
  160: 12.2,
  161: 13.4,
  162: 17.5
};

var COLORS = {
  ink: '#ffffff',
  inkSoft: 'rgba(255, 255, 255, 0.82)',
  inkMuted: 'rgba(255, 255, 255, 0.62)',
  outline: 'rgba(42, 40, 62, 0.24)',
  panel: 'rgba(21, 23, 37, 0.46)',
  panelStrong: 'rgba(18, 20, 32, 0.64)',
  panelStroke: 'rgba(255, 255, 255, 0.14)',
  accent: '#9b8cff',
  accentWarm: '#ffd37f',
  accentDanger: '#ff8f9f',
  scoreGain: '#ff6a2a',
  scoreCenter: '#ffd21f',
  scoreBonus: '#15d889',
  gameText: 'rgba(44, 47, 55, 0.82)',
  gameTextStrong: 'rgba(38, 40, 48, 0.9)'
};

function formatScore(score) {
  return String(Math.max(0, Math.floor(score || 0)));
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sampleDistanceFromBand(band) {
  return randomInt(band.min, band.max);
}

function clonePlatform(platform) {
  return {
    x: platform.x,
    y: platform.y,
    radius: platform.radius,
    size: platform.size,
    typeId: platform.typeId,
    isTarget: !!platform.isTarget,
    isCurrent: !!platform.isCurrent
  };
}

function getPlatformRadius(typeId) {
  if (SPECIAL_PLATFORM_RADII[typeId]) {
    return SPECIAL_PLATFORM_RADII[typeId];
  }

  return PLATFORM_TYPE_RADII[typeId] || 15;
}

function getPlatformSize(radius) {
  return radius * PLATFORM_SCALE;
}

function getPlatformLandingBonus(typeId) {
  if (typeId === 157) {
    return 30;
  }

  if (typeId === 151 || typeId === 152 || typeId === 154 || typeId === 155 || typeId === 159 || typeId === 160) {
    return 20;
  }

  if (typeId === 153 || typeId === 156 || typeId === 161) {
    return 10;
  }

  if (typeId === 158) {
    return Math.random() < 1 / 3 ? 20 : 5;
  }

  if (typeId === 162) {
    return -20;
  }

  return 0;
}

function getChargeJumpDistance(heldSeconds) {
  return utils.clamp(heldSeconds, 0, MAX_CHARGE_SECONDS) * CHARGE_DISTANCE_PER_SECOND;
}

function getChargeVisualRatio(heldSeconds) {
  var normalized = utils.clamp(heldSeconds / CHARGE_VISUAL_SECONDS, 0, 1);

  return utils.easeOutCubic(normalized);
}

function getJumpTuning(heldSeconds) {
  if (heldSeconds > 1.5) {
    return { repeats: 18, xSpeed: 5.5, ySpeed: 27 };
  }

  if (heldSeconds > 1) {
    return { repeats: 16, xSpeed: 5, ySpeed: 27.5 };
  }

  if (heldSeconds > 0.7) {
    return { repeats: 14, xSpeed: 4.5, ySpeed: 30 };
  }

  if (heldSeconds > 0.5) {
    return { repeats: 14, xSpeed: 3.8, ySpeed: 29 };
  }

  if (heldSeconds > 0.3) {
    return { repeats: 14, xSpeed: 3.2, ySpeed: 28.2 };
  }

  if (heldSeconds > 0.1) {
    return { repeats: 13, xSpeed: 2.8, ySpeed: 30 };
  }

  return { repeats: 12, xSpeed: 2, ySpeed: 32 };
}

function sanitizeLeaderboard(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(function (entry) {
      return entry && typeof entry.score === 'number';
    })
    .map(function (entry) {
      return {
        score: Math.max(0, Math.floor(entry.score)),
        time: normalizeLeaderboardTime(entry.time)
      };
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, 5);
}

function normalizeLeaderboardTime(value) {
  var time = String(value || '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(time)) {
    return time + ' 00:00:00';
  }

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(time)) {
    return time + ':00';
  }

  return time;
}

function resolveBestScore(storedBestScore, leaderboard, currentScore) {
  var bestScore = Math.max(0, Math.floor(Number(storedBestScore) || 0));
  var current = Math.max(0, Math.floor(Number(currentScore) || 0));
  var entries = Array.isArray(leaderboard) ? leaderboard : [];

  bestScore = Math.max(bestScore, current);

  for (var i = 0; i < entries.length; i += 1) {
    bestScore = Math.max(bestScore, Math.max(0, Math.floor(Number(entries[i].score) || 0)));
  }

  return bestScore;
}

function createLeaderboardEntry(score) {
  var stamp = '';

  try {
    var date = new Date();
    stamp = [
      date.getFullYear(),
      padNumber(date.getMonth() + 1),
      padNumber(date.getDate())
    ].join('-') + ' ' + [
      padNumber(date.getHours()),
      padNumber(date.getMinutes()),
      padNumber(date.getSeconds())
    ].join(':');
  } catch (error) {
    stamp = '';
  }

  return {
    score: Math.max(0, Math.floor(score || 0)),
    time: stamp
  };
}

function padNumber(value) {
  return value < 10 ? '0' + value : String(value);
}

function drawCenteredText(ctx, text, x, y, size, fillStyle, weight) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle || COLORS.ink;
  ctx.font = (weight ? weight + ' ' : '') + size + 'px sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = Math.max(2, size * 0.16);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawLeftText(ctx, text, x, y, size, fillStyle, weight) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle || COLORS.ink;
  ctx.font = (weight ? weight + ' ' : '') + size + 'px sans-serif';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawRightText(ctx, text, x, y, size, fillStyle, weight) {
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle || COLORS.ink;
  ctx.font = (weight ? weight + ' ' : '') + size + 'px sans-serif';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawMonoText(ctx, text, x, y, size, fillStyle, weight, align) {
  ctx.save();
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle || COLORS.ink;
  ctx.font = (weight ? weight + ' ' : '') + size + 'px Menlo, Consolas, monospace';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawLeaderboardHeader(ctx, columns, y, size) {
  drawLeftText(ctx, '名次', columns.rankX, y, size, COLORS.inkMuted, '600');
  drawRightText(ctx, '分数', columns.scoreX, y, size, COLORS.inkMuted, '600');
  if (columns.timeAlign === 'left') {
    drawLeftText(ctx, '时间', columns.timeX, y, size, COLORS.inkMuted, '600');
  } else {
    drawRightText(ctx, '时间', columns.timeX, y, size, COLORS.inkMuted, '600');
  }
}

function drawLeaderboardEntry(ctx, rank, entry, columns, y, scoreSize, timeSize) {
  drawLeftText(ctx, rank + '.', columns.rankX, y, scoreSize, COLORS.inkSoft, '700');
  drawRightText(ctx, formatScore(entry.score), columns.scoreX, y, scoreSize, COLORS.inkSoft, '700');
  drawMonoText(
    ctx,
    normalizeLeaderboardTime(entry.time),
    columns.timeX,
    y,
    timeSize,
    COLORS.inkMuted,
    '500',
    columns.timeAlign || 'right'
  );
}

function drawPanel(ctx, rect, fillStyle) {
  utils.drawRoundRect(
    ctx,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    rect.radius || 24,
    fillStyle || COLORS.panel,
    COLORS.panelStroke,
    1.2
  );
}

function drawButton(ctx, rect, label, primary) {
  drawPanel(ctx, rect, primary ? 'rgba(31, 35, 57, 0.78)' : COLORS.panel);

  ctx.save();
  ctx.strokeStyle = primary ? 'rgba(155, 140, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = primary ? 2 : 1;
  utils.drawRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.radius || 22, null, ctx.strokeStyle, ctx.lineWidth);
  ctx.restore();

  drawCenteredText(
    ctx,
    label,
    rect.x + rect.width / 2,
    rect.y + rect.height / 2 + 1,
    Math.max(18, rect.height * 0.32),
    primary ? '#faf8ff' : COLORS.ink,
    '600'
  );
}

function drawMenuPrimaryButton(ctx, rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(25, 205, 182, 0.28)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 9;
  var fill = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.46, '#edfffb');
  fill.addColorStop(1, '#f3edff');
  utils.drawRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.radius, fill, 'rgba(255, 255, 255, 0.76)', 1);
  ctx.restore();

  var iconX = rect.x + rect.width * 0.27;
  var iconY = rect.y + rect.height / 2;
  var iconSize = rect.height * 0.34;

  ctx.save();
  var iconFill = ctx.createLinearGradient(iconX - iconSize, iconY - iconSize, iconX + iconSize, iconY + iconSize);
  iconFill.addColorStop(0, '#16e1ff');
  iconFill.addColorStop(0.5, '#08d58a');
  iconFill.addColorStop(1, '#ffe177');
  ctx.fillStyle = iconFill;
  ctx.beginPath();
  ctx.moveTo(iconX - iconSize * 0.42, iconY - iconSize * 0.62);
  ctx.lineTo(iconX - iconSize * 0.42, iconY + iconSize * 0.62);
  ctx.lineTo(iconX + iconSize * 0.64, iconY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawCenteredText(ctx, '开始游戏', rect.x + rect.width * 0.58, rect.y + rect.height / 2 + 1, 28, '#101116', '500');
}

function drawMenuLink(ctx, rect, label) {
  ctx.save();
  ctx.shadowColor = 'rgba(93, 226, 255, 0.35)';
  ctx.shadowBlur = 12;
  drawCenteredText(ctx, label, rect.x + rect.width / 2, rect.y + rect.height / 2, 21, 'rgba(255, 255, 255, 0.94)', '400');
  ctx.restore();
}

function drawMenuToggleButton(ctx, rect, label, active) {
  var switchWidth = 48;
  var switchHeight = 24;
  var switchX = rect.x + rect.width - switchWidth - 12;
  var switchY = rect.y + (rect.height - switchHeight) / 2;
  var knobRadius = 9;
  var knobX = active ? switchX + switchWidth - switchHeight / 2 : switchX + switchHeight / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 10;
  utils.drawRoundRect(
    ctx,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    rect.radius || rect.height / 2,
    'rgba(255, 255, 255, 0.14)',
    active ? 'rgba(67, 238, 173, 0.76)' : 'rgba(255, 255, 255, 0.32)',
    1.2
  );
  ctx.restore();

  drawLeftText(ctx, label, rect.x + 16, rect.y + rect.height / 2, 15, 'rgba(255, 255, 255, 0.92)', '500');

  ctx.save();
  utils.drawRoundRect(
    ctx,
    switchX,
    switchY,
    switchWidth,
    switchHeight,
    switchHeight / 2,
    active ? 'rgba(21, 216, 137, 0.82)' : 'rgba(35, 38, 50, 0.46)',
    'rgba(255, 255, 255, 0.36)',
    1
  );
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(knobX, switchY + switchHeight / 2, knobRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMenuNavIcon(ctx, kind, centerX, centerY) {
  var radius = 30;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 2.2;
  ctx.strokeRect(centerX - 15, centerY + 2, 6, 13);
  ctx.strokeRect(centerX - 3, centerY - 8, 6, 23);
  ctx.strokeRect(centerX + 9, centerY - 1, 6, 16);

  ctx.restore();
}

function drawMenuNavItem(ctx, item) {
  drawMenuNavIcon(ctx, item.kind, item.centerX, item.iconY);
  drawCenteredText(ctx, item.label, item.centerX, item.labelY, 15, 'rgba(255, 255, 255, 0.9)', '400');
}

function drawMenuColorSparks(ctx, width, height, phase) {
  var sparks = [
    { x: 0.15, y: 0.43, s: 5, c: '#7fffd2', p: 0.2 },
    { x: 0.24, y: 0.55, s: 3.8, c: '#ffdb70', p: 1.4 },
    { x: 0.35, y: 0.39, s: 4.4, c: '#8cecff', p: 2.1 },
    { x: 0.63, y: 0.45, s: 4.2, c: '#b89cff', p: 3.3 },
    { x: 0.72, y: 0.34, s: 3.6, c: '#3ce4a2', p: 4.5 },
    { x: 0.82, y: 0.54, s: 4.8, c: '#ffd37f', p: 5.4 },
    { x: 0.19, y: 0.69, s: 4.2, c: '#82f0ff', p: 6.2 },
    { x: 0.74, y: 0.68, s: 3.7, c: '#ff9fc5', p: 7.6 }
  ];

  ctx.save();
  for (var i = 0; i < sparks.length; i += 1) {
    var spark = sparks[i];
    var twinkle = Math.sin(phase + spark.p);
    var x = width * spark.x + Math.cos(phase * 0.7 + spark.p) * 5;
    var y = height * spark.y + Math.sin(phase * 0.6 + spark.p) * 4;
    var size = spark.s * (0.9 + twinkle * 0.12);

    ctx.save();
    ctx.globalAlpha = utils.clamp(0.3 + twinkle * 0.12, 0.18, 0.46);
    ctx.fillStyle = spark.c;
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4 + twinkle * 0.12);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.restore();
}

function drawMenuScenePlayer(ctx, image, x, footY, scale, phase) {
  var width = PLAYER_WIDTH * scale;
  var height = PLAYER_HEIGHT * scale;
  var bob = Math.sin(phase) * 2 * scale;
  var y = footY + bob;

  ctx.save();
  ctx.fillStyle = 'rgba(22, 24, 39, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x - width * 0.06, y + 5 * scale, width * 0.52, height * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  if (image) {
    ctx.drawImage(image, x - width / 2, y - height, width, height);
  } else {
    ctx.fillStyle = '#2b2a47';
    ctx.beginPath();
    ctx.arc(x, y - height * 0.78, width * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - width * 0.24, y);
    ctx.lineTo(x + width * 0.24, y);
    ctx.lineTo(x + width * 0.16, y - height * 0.58);
    ctx.lineTo(x - width * 0.16, y - height * 0.58);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawPlatformImage(ctx, platform, image, assetInfo, options) {
  if (!image || !image.width || !image.height || !assetInfo) {
    return false;
  }

  var scale = assetInfo.scale || 0.225;
  var drawWidth = image.width * scale;
  var drawHeight = image.height * scale;
  var pressRatio = options && options.pressRatio ? utils.clamp(options.pressRatio, 0, 1) : 0;

  ctx.save();

  if (pressRatio > 0) {
    var squashY = 1 - pressRatio * PLATFORM_PRESS_MAX_SQUASH;
    var stretchX = 1 + pressRatio * PLATFORM_PRESS_MAX_STRETCH;

    ctx.translate(platform.x, platform.y);
    ctx.scale(stretchX, squashY);
    ctx.drawImage(image, -assetInfo.centerX * scale, -assetInfo.centerY * scale, drawWidth, drawHeight);
  } else {
    ctx.drawImage(
      image,
      platform.x - assetInfo.centerX * scale,
      platform.y - assetInfo.centerY * scale,
      drawWidth,
      drawHeight
    );
  }

  ctx.restore();

  return true;
}

function diamondMetric(platform, x, y) {
  var dx = Math.abs(x - platform.x) / (platform.size * 0.92);
  var dy = Math.abs(y - platform.y) / (platform.size * 0.42);
  return dx + dy;
}

function platformContains(platform, x, y) {
  return diamondMetric(platform, x, y) <= 1;
}

function isCenterHit(platform, x, y) {
  return diamondMetric(platform, x, y) <= 0.26;
}

function JumpJumpRuntime(options) {
  this.canvas = options.canvas;
  this.ctx = options.ctx;
  this.width = options.width;
  this.height = options.height;
  this.pixelRatio = options.pixelRatio || 1;
  this.runtimeInfo = options.runtimeInfo || null;

  this.assets = {};
  this.audio = new MiniGameAudio({
    charge: 'audio/charge.wav',
    chargeMax: 'audio/charge-max.mp3',
    land: 'audio/land.wav',
    center: 'audio/center.wav',
    fail: 'audio/fail.wav',
    click: 'audio/click.wav'
  });

  this.raf = utils.getRequestAnimationFrame();
  this.destroyed = false;
  this.paused = false;
  this.lastTimestamp = 0;

  this.state = 'loading';
  this.loadingProgress = 0;
  this.errorMessage = '';
  this.buttons = {};
  this.menuPanel = null;
  this.viewport = null;
  this.updateViewport();

  var storedBestScore = Number(utils.safeGetStorage(STORAGE_BEST_SCORE_KEY, 0)) || 0;
  var storedShowAimLine = utils.safeGetStorage(STORAGE_AIM_LINE_KEY, true);
  this.playCount = Number(utils.safeGetStorage(STORAGE_PLAY_COUNT_KEY, 0)) || 0;
  this.localLeaderboard = sanitizeLeaderboard(utils.safeGetStorage(STORAGE_LEADERBOARD_KEY, []));
  this.bestScore = resolveBestScore(storedBestScore, this.localLeaderboard);
  this.showAimLine = storedShowAimLine !== false && storedShowAimLine !== 'false' && storedShowAimLine !== 0;
  if (this.bestScore !== storedBestScore) {
    utils.safeSetStorage(STORAGE_BEST_SCORE_KEY, this.bestScore);
  }

  this.anchor = {
    x: STAGE_CENTER_X,
    y: this.getPlayCenterY()
  };

  this.chargeTouchId = null;
  this.chargeStartedAt = 0;
  this.chargeElapsed = 0;
  this.chargeRatio = 0;
  this.chargeMaxPlayed = false;

  this.score = 0;
  this.landings = 0;
  this.combo = 0;
  this.backgroundIndex = 0;
  this.backgroundTransition = null;
  this.smallPlatformProbability = 0;
  this.bonusPlatformProbability = 2;
  this.over1000Count = 0;
  this.over1000Milestone = 0;

  this.platforms = [];
  this.currentDirection = 1;
  this.lastGeneratedDirection = 1;
  this.jump = null;
  this.shift = null;
  this.fall = null;

  this.player = {
    x: this.anchor.x,
    y: this.anchor.y,
    arc: 0,
    rotation: 0,
    squashX: 1,
    squashY: 1
  };

  this.popups = [];
  this.aimPoint = null;
  this.menuPulse = 0;
}

JumpJumpRuntime.prototype.init = function () {
  var self = this;

  this.loadAssets()
    .then(function () {
      self.state = 'menu';
      self.setupIdleScene();
    })
    .catch(function (error) {
      self.errorMessage = String(error && error.message ? error.message : error);
      self.state = 'error';
    });

  this.startLoop();
};

JumpJumpRuntime.prototype.loadAssets = function () {
  var self = this;
  var imageSources = {
    title: 'images/title.png',
    menuScene: 'images/menu-scene.png',
    player: 'images/player.png',
    background1: 'images/background-1.png',
    background2: 'images/background-2.png',
    background3: 'images/background-3.png',
    background4: 'images/background-4.png',
    background5: 'images/background-5.png',
    background6: 'images/background-6.png',
    background7: 'images/background-7.png'
  };
  for (var typeId = 1; typeId < platformAssets.length; typeId += 1) {
    if (platformAssets[typeId] && platformAssets[typeId].target) {
      imageSources[platformAssets[typeId].target.src] = platformAssets[typeId].target.src;
    }
    if (platformAssets[typeId] && platformAssets[typeId].current) {
      imageSources[platformAssets[typeId].current.src] = platformAssets[typeId].current.src;
    }
  }
  var keys = Object.keys(imageSources);
  var loaded = 0;

  return Promise.all(keys.map(function (key) {
    return utils.loadImage(self.canvas, imageSources[key]).then(function (image) {
      self.assets[key] = image;
      loaded += 1;
      self.loadingProgress = loaded / keys.length;
    });
  }));
};

JumpJumpRuntime.prototype.startLoop = function () {
  var self = this;

  function frame(timestamp) {
    if (self.destroyed) {
      return;
    }

    self.tick(timestamp);
    self.raf(frame);
  }

  this.raf(frame);
};

JumpJumpRuntime.prototype.tick = function (timestamp) {
  var frameTime = typeof timestamp === 'number' && isFinite(timestamp) ? timestamp : utils.now();

  if (this.paused) {
    this.lastTimestamp = frameTime;
    return;
  }

  if (!this.lastTimestamp) {
    this.lastTimestamp = frameTime;
  }

  var deltaTime = Math.min(0.05, Math.max(0.001, (frameTime - this.lastTimestamp) / 1000));
  this.lastTimestamp = frameTime;

  this.update(deltaTime, frameTime);
  this.render();
};

JumpJumpRuntime.prototype.onShow = function () {
  this.paused = false;
  this.lastTimestamp = utils.now();
};

JumpJumpRuntime.prototype.onHide = function () {
  this.paused = true;
  this.cancelCharge();
};

JumpJumpRuntime.prototype.destroy = function () {
  this.destroyed = true;
  this.audio.destroy();
};

JumpJumpRuntime.prototype.updateViewport = function () {
  var scale = this.width / STAGE_WIDTH || 1;
  var stageHeight = Math.max(STAGE_HEIGHT, this.height / scale);

  this.viewport = {
    x: 0,
    y: 0,
    width: this.width,
    height: this.height,
    scale: scale,
    stageWidth: STAGE_WIDTH,
    stageHeight: stageHeight
  };
};

JumpJumpRuntime.prototype.getStageHeight = function () {
  return this.viewport && this.viewport.stageHeight ? this.viewport.stageHeight : STAGE_HEIGHT;
};

JumpJumpRuntime.prototype.getStageSafeTop = function () {
  var safeTop = 0;
  var scale = this.viewport && this.viewport.scale ? this.viewport.scale : 1;

  if (this.runtimeInfo && this.runtimeInfo.safeAreaInsets) {
    safeTop = Math.max(safeTop, this.runtimeInfo.safeAreaInsets.top || 0);
  }

  if (this.runtimeInfo && this.runtimeInfo.menuButtonInfo) {
    safeTop = Math.max(safeTop, (this.runtimeInfo.menuButtonInfo.bottom || 0) + 10);
  }

  return safeTop / scale;
};

JumpJumpRuntime.prototype.getStageSafeBottom = function () {
  var safeBottom = 0;
  var scale = this.viewport && this.viewport.scale ? this.viewport.scale : 1;

  if (this.runtimeInfo && this.runtimeInfo.safeAreaInsets) {
    safeBottom = this.runtimeInfo.safeAreaInsets.bottom || 0;
  }

  return safeBottom / scale;
};

JumpJumpRuntime.prototype.getPlayCenterY = function () {
  var stageHeight = this.getStageHeight();
  var desired = Math.max(STAGE_CENTER_Y, stageHeight * 0.52);
  var minCenter = this.getStageSafeTop() + 140;
  var maxCenter = stageHeight - this.getStageSafeBottom() - 180;

  if (maxCenter > minCenter) {
    return utils.clamp(desired, minCenter, maxCenter);
  }

  return desired;
};

JumpJumpRuntime.prototype.getStartCurrentY = function () {
  return this.getPlayCenterY() + 35;
};

JumpJumpRuntime.prototype.getStartTargetY = function () {
  return this.getPlayCenterY() - 35;
};

JumpJumpRuntime.prototype.getCurrentPlatformIndex = function () {
  return Math.max(0, this.platforms.length - 2);
};

JumpJumpRuntime.prototype.getTargetPlatformIndex = function () {
  return Math.max(0, this.platforms.length - 1);
};

JumpJumpRuntime.prototype.getCurrentPlatform = function () {
  return this.platforms[this.getCurrentPlatformIndex()] || null;
};

JumpJumpRuntime.prototype.getTargetPlatform = function () {
  return this.platforms[this.getTargetPlatformIndex()] || null;
};

JumpJumpRuntime.prototype.updatePlatformRoles = function () {
  var currentIndex = this.getCurrentPlatformIndex();
  var targetIndex = this.getTargetPlatformIndex();

  for (var i = 0; i < this.platforms.length; i += 1) {
    this.platforms[i].isCurrent = i === currentIndex;
    this.platforms[i].isTarget = i === targetIndex;
  }
};

JumpJumpRuntime.prototype.isPlatformInView = function (platform) {
  if (!platform) {
    return false;
  }

  var margin = Math.max(180, platform.size * 2.6);
  var stageHeight = this.getStageHeight();

  return (
    platform.x > -margin &&
    platform.x < STAGE_WIDTH + margin &&
    platform.y > -margin &&
    platform.y < stageHeight + margin
  );
};

JumpJumpRuntime.prototype.pruneInvisiblePlatforms = function () {
  if (this.platforms.length <= 2) {
    this.updatePlatformRoles();
    return;
  }

  var currentIndex = this.getCurrentPlatformIndex();
  var targetIndex = this.getTargetPlatformIndex();
  var keptPlatforms = [];

  for (var i = 0; i < this.platforms.length; i += 1) {
    if (i === currentIndex || i === targetIndex || this.isPlatformInView(this.platforms[i])) {
      keptPlatforms.push(this.platforms[i]);
    }
  }

  this.platforms = keptPlatforms;
  this.updatePlatformRoles();
};

JumpJumpRuntime.prototype.normalizeScreenTouch = function (touch) {
  if (!touch) {
    return null;
  }

  var x = Number(touch.x);
  var y = Number(touch.y);

  if (!isFinite(x) || !isFinite(y)) {
    return null;
  }

  if (this.pixelRatio > 1 && (x > this.width + 1 || y > this.height + 1)) {
    var scaledX = x / this.pixelRatio;
    var scaledY = y / this.pixelRatio;

    if (scaledX >= 0 && scaledX <= this.width + 1 && scaledY >= 0 && scaledY <= this.height + 1) {
      x = scaledX;
      y = scaledY;
    }
  }

  return {
    identifier: touch.identifier,
    x: x,
    y: y
  };
};

JumpJumpRuntime.prototype.toStageTouch = function (touch) {
  var screenTouch = this.normalizeScreenTouch(touch);

  if (!screenTouch || !this.viewport) {
    return null;
  }

  var stageX = (screenTouch.x - this.viewport.x) / this.viewport.scale;
  var stageY = (screenTouch.y - this.viewport.y) / this.viewport.scale;

  if (stageX < 0 || stageX > STAGE_WIDTH || stageY < 0 || stageY > this.getStageHeight()) {
    return null;
  }

  return {
    identifier: screenTouch.identifier,
    x: stageX,
    y: stageY
  };
};

JumpJumpRuntime.prototype.getResolvedBestScore = function () {
  return resolveBestScore(this.bestScore, this.localLeaderboard, this.score);
};

JumpJumpRuntime.prototype.syncBestScore = function () {
  var nextBestScore = this.getResolvedBestScore();

  if (nextBestScore !== this.bestScore) {
    this.bestScore = nextBestScore;
    utils.safeSetStorage(STORAGE_BEST_SCORE_KEY, this.bestScore);
  }

  return this.bestScore;
};

JumpJumpRuntime.prototype.clearLocalScores = function () {
  this.localLeaderboard = [];
  this.bestScore = 0;
  this.playCount = 0;
  this.score = 0;
  this.landings = 0;
  this.combo = 0;
  utils.safeSetStorage(STORAGE_LEADERBOARD_KEY, this.localLeaderboard);
  utils.safeSetStorage(STORAGE_BEST_SCORE_KEY, this.bestScore);
  utils.safeSetStorage(STORAGE_PLAY_COUNT_KEY, this.playCount);
};

JumpJumpRuntime.prototype.toggleAimLine = function () {
  this.showAimLine = !this.showAimLine;
  utils.safeSetStorage(STORAGE_AIM_LINE_KEY, this.showAimLine);
};

JumpJumpRuntime.prototype.getSnapshot = function () {
  return {
    state: this.state === 'over' ? 'over' : (this.state === 'playing' ? 'playing' : 'menu'),
    score: this.score,
    bestScore: this.getResolvedBestScore(),
    landings: this.landings
  };
};

JumpJumpRuntime.prototype.setupIdleScene = function () {
  var currentY = this.getStartCurrentY();
  var targetY = this.getStartTargetY();

  this.backgroundIndex = 6;
  this.backgroundTransition = null;
  this.platforms = [
    this.createPlatform(
      START_CURRENT_X,
      currentY,
      getPlatformRadius(MENU_CURRENT_PLATFORM_TYPE_ID),
      MENU_CURRENT_PLATFORM_TYPE_ID,
      false
    ),
    this.createPlatform(
      START_TARGET_X,
      targetY,
      getPlatformRadius(MENU_TARGET_PLATFORM_TYPE_ID),
      MENU_TARGET_PLATFORM_TYPE_ID,
      true
    )
  ];
  this.updatePlatformRoles();
  this.player.x = this.getCurrentPlatform().x;
  this.player.y = this.getCurrentPlatform().y;
  this.player.arc = 0;
  this.player.rotation = 0;
  this.player.squashX = 1;
  this.player.squashY = 1;
};

JumpJumpRuntime.prototype.startGame = function () {
  var currentTypeId = randomInt(1, 6);
  var targetTypeId = randomInt(1, 6);
  var currentY = this.getStartCurrentY();
  var targetY = this.getStartTargetY();

  this.state = 'playing';
  this.menuPanel = null;
  this.score = 0;
  this.syncBestScore();
  this.landings = 0;
  this.combo = 0;
  this.backgroundIndex = 0;
  this.backgroundTransition = null;
  this.popups.length = 0;
  this.currentDirection = 1;
  this.lastGeneratedDirection = 1;
  this.smallPlatformProbability = 0;
  this.bonusPlatformProbability = 2;
  this.over1000Count = 0;
  this.over1000Milestone = 0;

  var current = this.createPlatform(
    START_CURRENT_X,
    currentY,
    getPlatformRadius(currentTypeId),
    currentTypeId,
    false
  );
  var next = this.createPlatform(
    START_TARGET_X,
    targetY,
    getPlatformRadius(targetTypeId),
    targetTypeId,
    true
  );

  current.isCurrent = true;
  next.isTarget = true;

  this.platforms = [current, next];
  this.updatePlatformRoles();
  this.player.x = current.x;
  this.player.y = current.y;
  this.player.arc = 0;
  this.player.rotation = 0;
  this.player.squashX = 1;
  this.player.squashY = 1;
  this.aimPoint = null;
  this.cancelCharge();
};

JumpJumpRuntime.prototype.finishGame = function () {
  this.state = 'over';
  this.cancelCharge();
  this.playCount += 1;
  utils.safeSetStorage(STORAGE_PLAY_COUNT_KEY, this.playCount);

  if (this.score > 0) {
    this.localLeaderboard = sanitizeLeaderboard(
      this.localLeaderboard.concat([createLeaderboardEntry(this.score)])
    );
    utils.safeSetStorage(STORAGE_LEADERBOARD_KEY, this.localLeaderboard);
  }

  this.syncBestScore();
};

JumpJumpRuntime.prototype.createPlatform = function (x, y, radius, typeId, isTarget) {
  return {
    x: x,
    y: y,
    radius: radius,
    size: getPlatformSize(radius),
    typeId: typeId,
    isTarget: !!isTarget,
    isCurrent: !isTarget
  };
};

JumpJumpRuntime.prototype.pickPlatformTypeForJumpCount = function (jumpCount, currentTypeId) {
  if (this.over1000Count > 0) {
    var specialTypeId = this.over1000Count > 2 ? OVER1000_PLATFORM_TYPE_ID : 4;
    this.over1000Count -= 1;
    return specialTypeId;
  }

  var selection = randomInt(1, 100);
  var nextTypeId = currentTypeId;

  function pickType(min, max) {
    nextTypeId = randomInt(min, max);
  }

  if (jumpCount < 21) {
    if (selection < 6) {
      pickType(1, 6);
    } else if (selection < 45) {
      pickType(14, 31);
    } else if (selection < 55) {
      pickType(43, 65);
    } else if (selection < 57) {
      pickType(7, 13);
    } else if (selection < 77) {
      pickType(32, 42);
    } else if (selection < 91) {
      pickType(66, 79);
    } else if (selection < 94) {
      pickType(this.bonusPlatformProbability > 4 ? 151 : 14, this.bonusPlatformProbability > 4 ? 153 : 31);
    } else {
      pickType(this.bonusPlatformProbability > 4 ? 154 : 14, this.bonusPlatformProbability > 4 ? 158 : 31);
    }
  } else if (jumpCount < 41) {
    if (selection < 11) {
      pickType(14, 31);
    } else if (selection < 48) {
      pickType(43, 65);
    } else if (selection < 53) {
      pickType(80, 98);
    } else if (selection < 63) {
      pickType(32, 42);
    } else if (selection < 82) {
      pickType(66, 79);
    } else if (selection < 91) {
      pickType(99, 105);
    } else if (selection < 96) {
      pickType(this.bonusPlatformProbability > 4 ? 154 : 14, this.bonusPlatformProbability > 4 ? 158 : 31);
    } else {
      pickType(this.bonusPlatformProbability > 4 ? 159 : 43, this.bonusPlatformProbability > 4 ? 161 : 65);
    }
  } else if (jumpCount < 61) {
    if (selection < 25) {
      pickType(43, 65);
    } else if (selection < 51) {
      pickType(80, 98);
    } else if (selection < 56) {
      pickType(106, 126);
    } else if (selection < 72) {
      pickType(66, 79);
    } else if (selection < 88) {
      pickType(99, 105);
    } else if (selection < 91) {
      if (this.smallPlatformProbability > 9) {
        nextTypeId = currentTypeId;
        this.smallPlatformProbability = -1;
      } else {
        pickType(99, 105);
      }
    } else if (selection < 93) {
      pickType(this.bonusPlatformProbability > 4 ? 154 : 43, this.bonusPlatformProbability > 4 ? 158 : 65);
    } else {
      pickType(this.bonusPlatformProbability > 4 ? 159 : 80, this.bonusPlatformProbability > 4 ? 161 : 98);
    }
  } else if (jumpCount < 91) {
    if (selection < 15) {
      pickType(43, 65);
    } else if (selection < 39) {
      pickType(80, 98);
    } else if (selection < 52) {
      pickType(106, 126);
    } else if (selection < 62) {
      pickType(66, 79);
    } else if (selection < 86) {
      pickType(99, 105);
    } else if (selection < 91) {
      if (this.smallPlatformProbability > 6) {
        nextTypeId = currentTypeId;
        this.smallPlatformProbability = 3;
      } else {
        pickType(99, 105);
      }
    } else if (this.bonusPlatformProbability > 5) {
      pickType(157, 161);
    } else {
      pickType(80, 98);
    }
  } else if (jumpCount < 121) {
    if (selection < 21) {
      pickType(80, 98);
    } else if (selection < 50) {
      pickType(106, 126);
    } else if (selection < 57) {
      if (this.smallPlatformProbability > 8) {
        pickType(127, 149);
        this.smallPlatformProbability -= 5;
      } else {
        pickType(106, 126);
      }
    } else if (selection < 67) {
      pickType(66, 79);
    } else if (selection < 86) {
      pickType(99, 105);
    } else if (selection < 91) {
      if (this.smallPlatformProbability > 8) {
        nextTypeId = currentTypeId;
        this.smallPlatformProbability -= 4;
      } else {
        pickType(99, 105);
      }
    } else if (this.bonusPlatformProbability > 4) {
      pickType(157, 161);
    } else {
      pickType(80, 98);
    }
  } else if (jumpCount > 121 && jumpCount < 161) {
    // The original Scratch script leaves selections 17 and 18 as repeat-current gaps.
    if (selection < 17) {
      pickType(80, 98);
    } else if (selection > 18 && selection < 43) {
      pickType(106, 126);
    } else if (selection > 42 && selection < 56) {
      if (this.smallPlatformProbability > 6) {
        pickType(127, 150);
        this.smallPlatformProbability -= 3;
      } else {
        pickType(106, 126);
      }
    } else if (selection > 55 && selection < 69) {
      pickType(66, 79);
    } else if (selection > 68 && selection < 91) {
      pickType(99, 105);
    } else if (selection > 90) {
      if (this.bonusPlatformProbability > 4) {
        pickType(157, 161);
      } else {
        pickType(80, 98);
      }
    }
  } else if (jumpCount > 160) {
    if (selection < 13) {
      pickType(80, 98);
    } else if (selection < 34) {
      pickType(106, 126);
    } else if (selection < 56) {
      if (this.smallPlatformProbability > 4) {
        pickType(127, 150);
        this.smallPlatformProbability -= 3;
      } else {
        pickType(106, 126);
      }
    } else if (selection < 66) {
      pickType(66, 79);
    } else if (selection < 91) {
      pickType(99, 105);
    } else if (this.bonusPlatformProbability > 4) {
      pickType(157, 161);
    } else {
      pickType(80, 98);
    }
  }

  if (nextTypeId > 150) {
    this.bonusPlatformProbability = -1;
  }

  if (this.smallPlatformProbability < 10) {
    this.smallPlatformProbability += 1;
  }

  if (this.bonusPlatformProbability < 10) {
    this.bonusPlatformProbability += 1;
  }

  return nextTypeId;
};

JumpJumpRuntime.prototype.updateOver1000Milestone = function () {
  while (this.score > 1000 * (this.over1000Milestone + 1)) {
    this.over1000Count = 3;
    this.over1000Milestone += 1;
  }
};

JumpJumpRuntime.prototype.samplePlatformDistance = function (jumpCount) {
  var bands;
  var roll;
  var rhythm = jumpCount % 7;

  if (jumpCount < 21) {
    bands = {
      near: { min: 8, max: 22 },
      mid: { min: 24, max: 42 },
      far: { min: 44, max: 58 }
    };
  } else if (jumpCount < 61) {
    bands = {
      near: { min: 6, max: 24 },
      mid: { min: 26, max: 52 },
      far: { min: 54, max: 74 }
    };
  } else if (jumpCount < 201) {
    bands = {
      near: { min: 5, max: 26 },
      mid: { min: 28, max: 60 },
      far: { min: 62, max: 90 }
    };
  } else {
    bands = {
      near: { min: 4, max: 28 },
      mid: { min: 30, max: 68 },
      far: { min: 70, max: 104 }
    };
  }

  if (rhythm === 3 || rhythm === 6) {
    return sampleDistanceFromBand(bands.far);
  }

  if (rhythm === 1 || rhythm === 5) {
    return sampleDistanceFromBand(bands.mid);
  }

  roll = randomInt(1, 100);

  if (roll <= 28) {
    return sampleDistanceFromBand(bands.near);
  }

  if (roll <= 68) {
    return sampleDistanceFromBand(bands.mid);
  }

  return sampleDistanceFromBand(bands.far);
};

JumpJumpRuntime.prototype.getShiftDuration = function (currentPlatform, nextPlatform) {
  var midpointX = (currentPlatform.x + nextPlatform.x) / 2;
  var midpointY = (currentPlatform.y + nextPlatform.y) / 2;
  var distanceSquared =
    Math.pow(midpointX - STAGE_CENTER_X, 2) +
    Math.pow(midpointY - this.getPlayCenterY(), 2);

  if (distanceSquared > 17500) {
    return 0.5;
  }

  if (distanceSquared > 5000) {
    return 0.45;
  }

  return 0.4;
};

JumpJumpRuntime.prototype.getViewportCorrection = function (platform) {
  var stageHeight = this.getStageHeight();
  var safeTop = this.getStageSafeTop();
  var safeBottom = this.getStageSafeBottom();
  var sidePadding = Math.max(72, platform.size * 0.76);
  var topLimit = Math.max(safeTop + 112, stageHeight * 0.15);
  var bottomLimit = stageHeight - Math.max(safeBottom + 92, 118);
  var leftLimit = sidePadding;
  var rightLimit = STAGE_WIDTH - sidePadding;
  var shiftX = 0;
  var shiftY = 0;

  if (platform.x < leftLimit) {
    shiftX = leftLimit - platform.x;
  } else if (platform.x > rightLimit) {
    shiftX = rightLimit - platform.x;
  }

  if (platform.y < topLimit) {
    shiftY = topLimit - platform.y;
  } else if (platform.y > bottomLimit) {
    shiftY = bottomLimit - platform.y;
  }

  return {
    x: shiftX,
    y: shiftY
  };
};

JumpJumpRuntime.prototype.generateNextPlatform = function (fromPlatform, completedJumpCount, selectionJumpCount) {
  var nextTypeId = this.pickPlatformTypeForJumpCount(selectionJumpCount, fromPlatform.typeId);
  var direction = this.over1000Count > 2 ? 1 : (Math.random() < 0.5 ? 1 : -1);
  var nextRadius = getPlatformRadius(nextTypeId);
  var distance = this.samplePlatformDistance(completedJumpCount);
  var span = distance + fromPlatform.radius + nextRadius;

  this.currentDirection = direction;
  this.lastGeneratedDirection = direction;

  return this.createPlatform(
    fromPlatform.x + direction * SQRT_THREE * span,
    fromPlatform.y - span,
    nextRadius,
    nextTypeId,
    true
  );
};

JumpJumpRuntime.prototype.startChargeSound = function () {
  this.audio.stopAll();
  this.audio.play('charge', {
    volume: 0.72,
    loop: true
  });
};

JumpJumpRuntime.prototype.playChargeMaxSound = function () {
  if (this.chargeMaxPlayed) {
    return;
  }

  this.chargeMaxPlayed = true;
  this.audio.stop('charge');
  this.audio.play('chargeMax', { volume: 0.62, loop: true });
};

JumpJumpRuntime.prototype.stopChargeSound = function (stopAllSounds) {
  if (stopAllSounds) {
    this.audio.stopAll();
    return;
  }

  this.audio.stopMany(['charge', 'chargeMax']);
};

JumpJumpRuntime.prototype.cancelCharge = function (stopAllSounds) {
  this.stopChargeSound(!!stopAllSounds);
  this.chargeTouchId = null;
  this.chargeStartedAt = 0;
  this.chargeElapsed = 0;
  this.chargeRatio = 0;
  this.chargeMaxPlayed = false;
  this.aimPoint = null;
};

JumpJumpRuntime.prototype.getChargePressRatio = function () {
  if (this.chargeTouchId === null || this.chargeTouchId === undefined) {
    return 0;
  }

  return getChargeVisualRatio(this.chargeElapsed);
};

JumpJumpRuntime.prototype.canStartCharge = function () {
  return (
    this.state === 'playing' &&
    !this.jump &&
    !this.shift &&
    !this.fall
  );
};

JumpJumpRuntime.prototype.beginCharge = function (screenTouch) {
  if (!this.canStartCharge()) {
    return;
  }

  this.chargeTouchId = screenTouch && screenTouch.identifier !== undefined ? screenTouch.identifier : 0;
  this.chargeStartedAt = utils.now();
  this.chargeElapsed = 0;
  this.chargeRatio = 0;
  this.chargeMaxPlayed = false;
  this.startChargeSound();
  this.updateAimPoint();
};

JumpJumpRuntime.prototype.handleTouchStart = function (event) {
  var screenTouch = this.normalizeScreenTouch(utils.pickChangedTouch(event, null) || utils.pickTouch(event, null));

  if (!screenTouch) {
    return;
  }

  if (this.state === 'menu') {
    this.handleMenuTouch(screenTouch);
    return;
  }

  if (this.state === 'playing') {
    this.beginCharge(screenTouch);
    return;
  }

  var touch = this.toStageTouch(screenTouch);

  if (!touch) {
    return;
  }

  if (this.state === 'help') {
    this.handleHelpTouch(touch);
    return;
  }

  if (this.state === 'over') {
    this.handleOverTouch(touch);
    return;
  }
};

JumpJumpRuntime.prototype.handleTouchMove = function () {
  return;
};

JumpJumpRuntime.prototype.handleTouchEnd = function (event) {
  if (this.chargeTouchId === null || this.chargeTouchId === undefined) {
    return;
  }

  this.releaseJump();
};

JumpJumpRuntime.prototype.handleTouchCancel = function (event) {
  if (this.chargeTouchId === null || this.chargeTouchId === undefined) {
    return;
  }

  if (event && event.changedTouches && event.changedTouches.length) {
    if (!utils.pickChangedTouch(event, this.chargeTouchId) && utils.pickActiveTouch(event, this.chargeTouchId)) {
      return;
    }
  }

  this.cancelCharge(true);
};

JumpJumpRuntime.prototype.handleMenuTouch = function (touch) {
  this.computeMenuButtons();
  this.audio.play('click', { volume: 0.42 });

  if (this.menuPanel === 'leaderboard') {
    if (utils.pointInRect(touch.x, touch.y, this.buttons.leaderboardClear || {})) {
      this.clearLocalScores();
      return;
    }

    if (
      utils.pointInRect(touch.x, touch.y, this.buttons.leaderboardBack || {}) ||
      !utils.pointInRect(touch.x, touch.y, this.buttons.leaderboardPanel || {})
    ) {
      this.menuPanel = null;
    }
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.buttons.primary || {})) {
    this.startGame();
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.buttons.secondary || {})) {
    this.menuPanel = null;
    this.state = 'help';
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.buttons.aimToggle || {})) {
    this.toggleAimLine();
    return;
  }

  if (this.buttons.menuNav) {
    for (var i = 0; i < this.buttons.menuNav.length; i += 1) {
      if (utils.pointInRect(touch.x, touch.y, this.buttons.menuNav[i])) {
        if (this.buttons.menuNav[i].kind === 'ranking') {
          this.menuPanel = 'leaderboard';
        }
        return;
      }
    }
  }
};

JumpJumpRuntime.prototype.handleHelpTouch = function (touch) {
  this.audio.play('click', { volume: 0.42 });

  if (utils.pointInRect(touch.x, touch.y, this.buttons.primary || {})) {
    this.startGame();
    return;
  }

  this.state = 'menu';
};

JumpJumpRuntime.prototype.handleOverTouch = function (touch) {
  this.audio.play('click', { volume: 0.42 });

  if (utils.pointInRect(touch.x, touch.y, this.buttons.primary || {})) {
    this.startGame();
    return;
  }

  if (utils.pointInRect(touch.x, touch.y, this.buttons.secondary || {})) {
    this.state = 'menu';
    this.setupIdleScene();
  }
};

JumpJumpRuntime.prototype.releaseJump = function () {
  var heldSeconds = this.chargeElapsed;
  var tuning = getJumpTuning(heldSeconds);

  if (heldSeconds < MIN_RELEASE_SECONDS) {
    this.cancelCharge(true);
    return;
  }

  var nextPlatform = this.getTargetPlatform();
  var currentPlatform = this.getCurrentPlatform();

  if (!currentPlatform || !nextPlatform) {
    this.cancelCharge(true);
    return;
  }

  var startX = this.player.x;
  var startY = this.player.y;
  var dx = nextPlatform.x - startX;
  var dy = nextPlatform.y - startY;
  var distance = Math.sqrt(dx * dx + dy * dy) || 1;
  var directionX = dx / distance;
  var directionY = dy / distance;
  var jumpDistance = getChargeJumpDistance(heldSeconds);
  var chargeRatio = utils.clamp(heldSeconds / MAX_CHARGE_SECONDS, 0, 1);
  var duration = tuning.repeats / 60;

  this.jump = {
    elapsed: 0,
    duration: duration,
    startX: startX,
    startY: startY,
    endX: startX + directionX * jumpDistance,
    endY: startY + directionY * jumpDistance,
    apex: Math.min(118, tuning.ySpeed * 3.1 + chargeRatio * 8),
    rotation: 360 + chargeRatio * 120
  };

  this.cancelCharge(true);
};

JumpJumpRuntime.prototype.update = function (deltaTime, timestamp) {
  this.menuPulse += deltaTime;

  if (this.state === 'playing' && this.chargeTouchId !== null && this.chargeTouchId !== undefined) {
    this.chargeElapsed = utils.clamp(this.chargeElapsed + deltaTime, 0, MAX_CHARGE_SECONDS);
    this.chargeRatio = this.chargeElapsed / MAX_CHARGE_SECONDS;

    if (this.chargeElapsed >= MAX_CHARGE_SECONDS) {
      this.playChargeMaxSound();
    }

    this.updateAimPoint();
  }

  this.updateJump(deltaTime);
  this.updateShift(deltaTime);
  this.updateFall(deltaTime);
  this.updateBackgroundTransition(deltaTime);
  this.updatePopups(deltaTime);
  this.updatePlayerSquash(deltaTime);
};

JumpJumpRuntime.prototype.updateAimPoint = function () {
  this.aimPoint = this.getChargeAimPoint();
};

JumpJumpRuntime.prototype.getChargeAimPoint = function () {
  var currentPlatform = this.getCurrentPlatform();
  var nextPlatform = this.getTargetPlatform();

  if (!currentPlatform || !nextPlatform) {
    return null;
  }

  var dx = nextPlatform.x - this.player.x;
  var dy = nextPlatform.y - this.player.y;
  var length = Math.sqrt(dx * dx + dy * dy) || 1;
  var directionX = dx / length;
  var directionY = dy / length;
  var jumpDistance = getChargeJumpDistance(this.chargeElapsed);

  return {
    x: this.player.x + directionX * jumpDistance,
    y: this.player.y + directionY * jumpDistance
  };
};

JumpJumpRuntime.prototype.updatePlayerSquash = function (deltaTime) {
  var targetX = 1;
  var targetY = 1;

  if (this.chargeTouchId !== null && this.chargeTouchId !== undefined) {
    var pressRatio = getChargeVisualRatio(this.chargeElapsed);

    targetX = 1 + pressRatio * 0.2;
    targetY = 1 - pressRatio * 0.34;
  }

  this.player.squashX = utils.lerp(this.player.squashX, targetX, Math.min(1, deltaTime * 18));
  this.player.squashY = utils.lerp(this.player.squashY, targetY, Math.min(1, deltaTime * 18));
};

JumpJumpRuntime.prototype.updateJump = function (deltaTime) {
  if (!this.jump) {
    return;
  }

  this.jump.elapsed += deltaTime;

  var t = utils.clamp(this.jump.elapsed / this.jump.duration, 0, 1);
  var eased = utils.easeInOutQuad(t);

  this.player.x = utils.lerp(this.jump.startX, this.jump.endX, eased);
  this.player.y = utils.lerp(this.jump.startY, this.jump.endY, eased);
  this.player.arc = Math.sin(t * Math.PI) * this.jump.apex;
  this.player.rotation = eased * this.jump.rotation * (this.lastGeneratedDirection >= 0 ? 1 : -1);

  if (t >= 1) {
    this.player.arc = 0;
    this.player.rotation = 0;
    this.finishJump();
    this.jump = null;
  }
};

JumpJumpRuntime.prototype.finishJump = function () {
  var currentPlatform = this.getCurrentPlatform();
  var targetPlatform = this.getTargetPlatform();

  if (!currentPlatform || !targetPlatform) {
    this.beginFall();
    return;
  }

  if (platformContains(targetPlatform, this.player.x, this.player.y)) {
    this.handleLanding(targetPlatform);
    return;
  }

  if (platformContains(currentPlatform, this.player.x, this.player.y)) {
    this.beginFall();
    return;
  }

  this.beginFall();
};

JumpJumpRuntime.prototype.handleLanding = function (targetPlatform) {
  var centered = isCenterHit(targetPlatform, this.player.x, this.player.y);
  var gained = 1;
  var platformBonus = getPlatformLandingBonus(targetPlatform.typeId);

  this.landings += 1;

  if (centered) {
    this.combo += 1;
    gained += Math.min(6, this.combo);
    this.audio.play('center', { volume: 0.72 });
    this.popups.push({
      x: targetPlatform.x,
      y: targetPlatform.y - targetPlatform.size * 1.1,
      text: '中心 +' + gained,
      life: 1.25,
      color: COLORS.scoreCenter,
      scale: 1.08
    });
  } else {
    this.combo = 0;
    this.audio.play('land', { volume: 0.62 });
    this.popups.push({
      x: targetPlatform.x,
      y: targetPlatform.y - targetPlatform.size * 0.95,
      text: '+1',
      life: 1.05,
      color: COLORS.scoreGain,
      scale: 0.92
    });
  }

  if (platformBonus) {
    this.popups.push({
      x: targetPlatform.x,
      y: targetPlatform.y - targetPlatform.size * (centered ? 1.42 : 1.18),
      text: platformBonus > 0 ? '奖分 +' + platformBonus : '扣分 ' + platformBonus,
      life: 1.45,
      color: platformBonus > 0 ? COLORS.scoreBonus : COLORS.accentDanger,
      scale: platformBonus > 0 ? 1.08 : 0.98
    });
  }

  this.score += gained + platformBonus;
  this.updateOver1000Milestone();
  this.bestScore = this.getResolvedBestScore();

  var nextBackgroundIndex = Math.floor(this.landings / BACKGROUND_SWITCH_INTERVAL) % 7;

  if (nextBackgroundIndex !== this.backgroundIndex) {
    this.backgroundTransition = {
      from: this.backgroundIndex,
      to: nextBackgroundIndex,
      elapsed: 0,
      duration: 0.42
    };
  }

  this.beginShiftToTarget();
};

JumpJumpRuntime.prototype.beginShiftToTarget = function () {
  var landedPlatform = clonePlatform(this.getTargetPlatform());
  var futurePlatform = this.generateNextPlatform(
    landedPlatform,
    this.landings,
    Math.max(0, this.landings - 1)
  );
  var viewportCorrection = this.getViewportCorrection(futurePlatform);
  var shiftX = viewportCorrection.x;
  var shiftY = viewportCorrection.y;
  var fromPlatforms = this.platforms
    .map(clonePlatform)
    .concat([clonePlatform(futurePlatform)]);

  this.platforms = fromPlatforms.map(clonePlatform);
  this.updatePlatformRoles();

  if (Math.abs(shiftX) < 0.5 && Math.abs(shiftY) < 0.5) {
    this.pruneInvisiblePlatforms();
    return;
  }

  var toPlatforms = fromPlatforms.map(function (platform) {
    return this.createPlatform(
      platform.x + shiftX,
      platform.y + shiftY,
      platform.radius,
      platform.typeId,
      platform.isTarget
    );
  }, this);

  this.shift = {
    elapsed: 0,
    duration: this.getShiftDuration(landedPlatform, futurePlatform),
    fromPlatforms: this.platforms.map(clonePlatform),
    toPlatforms: toPlatforms,
    fromPlayer: {
      x: this.player.x,
      y: this.player.y
    },
    toPlayer: {
      x: this.player.x + shiftX,
      y: this.player.y + shiftY
    }
  };

  this.updatePlatformRoles();
};

JumpJumpRuntime.prototype.updateShift = function (deltaTime) {
  if (!this.shift) {
    return;
  }

  this.shift.elapsed += deltaTime;

  var t = utils.clamp(this.shift.elapsed / this.shift.duration, 0, 1);
  var eased = utils.easeOutCubic(t);

  for (var i = 0; i < this.platforms.length; i += 1) {
    this.platforms[i].x = utils.lerp(this.shift.fromPlatforms[i].x, this.shift.toPlatforms[i].x, eased);
    this.platforms[i].y = utils.lerp(this.shift.fromPlatforms[i].y, this.shift.toPlatforms[i].y, eased);
    this.platforms[i].radius = this.shift.toPlatforms[i].radius;
    this.platforms[i].size = this.shift.toPlatforms[i].size;
    this.platforms[i].typeId = this.shift.toPlatforms[i].typeId;
  }

  this.player.x = utils.lerp(this.shift.fromPlayer.x, this.shift.toPlayer.x, eased);
  this.player.y = utils.lerp(this.shift.fromPlayer.y, this.shift.toPlayer.y, eased);

  if (t >= 1) {
    this.platforms = this.shift.toPlatforms.map(clonePlatform);
    this.player.x = this.shift.toPlayer.x;
    this.player.y = this.shift.toPlayer.y;
    this.pruneInvisiblePlatforms();
    this.shift = null;
  }
};

JumpJumpRuntime.prototype.beginFall = function () {
  this.audio.play('fail', { volume: 0.68 });
  this.combo = 0;
  this.fall = {
    velocityY: 16,
    velocityX: this.lastGeneratedDirection * 32,
    elapsed: 0,
    duration: 0.72
  };
};

JumpJumpRuntime.prototype.updateFall = function (deltaTime) {
  if (!this.fall) {
    return;
  }

  this.fall.elapsed += deltaTime;
  this.fall.velocityY += 128 * deltaTime;
  this.player.x += this.fall.velocityX * deltaTime;
  this.player.y += this.fall.velocityY * deltaTime;
  this.player.rotation += deltaTime * 520 * (this.lastGeneratedDirection >= 0 ? 1 : -1);

  if (this.fall.elapsed >= this.fall.duration || this.player.y > this.getStageHeight() + 160) {
    this.player.rotation = 0;
    this.fall = null;
    this.finishGame();
  }
};

JumpJumpRuntime.prototype.updateBackgroundTransition = function (deltaTime) {
  if (!this.backgroundTransition) {
    return;
  }

  this.backgroundTransition.elapsed += deltaTime;

  if (this.backgroundTransition.elapsed >= this.backgroundTransition.duration) {
    this.backgroundIndex = this.backgroundTransition.to;
    this.backgroundTransition = null;
  }
};

JumpJumpRuntime.prototype.updatePopups = function (deltaTime) {
  for (var i = this.popups.length - 1; i >= 0; i -= 1) {
    var popup = this.popups[i];
    popup.life -= deltaTime;
    popup.y -= deltaTime * 28;

    if (popup.life <= 0) {
      this.popups.splice(i, 1);
    }
  }
};

JumpJumpRuntime.prototype.render = function () {
  var ctx = this.ctx;
  var stageHeight = this.getStageHeight();

  ctx.clearRect(0, 0, this.width, this.height);

  if (this.state === 'menu') {
    this.renderMenu(ctx);
    return;
  }

  this.renderOuterFrame(ctx);

  ctx.save();
  ctx.translate(this.viewport.x, this.viewport.y);
  ctx.scale(this.viewport.scale, this.viewport.scale);
  ctx.beginPath();
  ctx.rect(0, 0, STAGE_WIDTH, stageHeight);
  ctx.clip();

  this.renderBackground(ctx);

  if (this.state === 'loading') {
    this.renderLoading(ctx);
    ctx.restore();
    return;
  }

  if (this.state === 'error') {
    this.renderError(ctx);
    ctx.restore();
    return;
  }

  this.renderPlatforms(ctx);
  this.renderPlayer(ctx);
  this.renderChargeEffect(ctx);
  this.renderPopups(ctx);

  if (this.state === 'help') {
    this.renderHelp(ctx);
    ctx.restore();
    return;
  }

  if (this.state !== 'over') {
    this.renderHud(ctx);
  }

  if (this.state === 'over') {
    this.renderOver(ctx);
  }

  ctx.restore();
};

JumpJumpRuntime.prototype.renderOuterFrame = function (ctx) {
  ctx.save();
  ctx.fillStyle = '#0f1118';
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.restore();
};

JumpJumpRuntime.prototype.renderBackground = function (ctx) {
  var baseIndex = this.backgroundTransition ? this.backgroundTransition.from : this.backgroundIndex;
  var currentKey = 'background' + (baseIndex + 1);
  var currentImage = this.assets[currentKey];
  var stageHeight = this.getStageHeight();

  if (!currentImage) {
    ctx.fillStyle = '#a5a7b7';
    ctx.fillRect(0, 0, STAGE_WIDTH, stageHeight);
    return;
  }

  utils.drawCoverImage(ctx, currentImage, 0, 0, STAGE_WIDTH, stageHeight);

  if (this.backgroundTransition) {
    var transitionKey = 'background' + (this.backgroundTransition.to + 1);
    var nextImage = this.assets[transitionKey];
    var alpha = utils.clamp(
      this.backgroundTransition.elapsed / this.backgroundTransition.duration,
      0,
      1
    );

    if (nextImage) {
      ctx.save();
      ctx.globalAlpha = alpha;
      utils.drawCoverImage(ctx, nextImage, 0, 0, STAGE_WIDTH, stageHeight);
      ctx.restore();
    }
  }

  ctx.save();
  if (this.state === 'playing') {
    var playWash = ctx.createLinearGradient(0, 0, 0, stageHeight);
    playWash.addColorStop(0, 'rgba(216, 222, 236, 0.42)');
    playWash.addColorStop(0.48, 'rgba(194, 201, 218, 0.32)');
    playWash.addColorStop(1, 'rgba(177, 184, 201, 0.3)');
    ctx.fillStyle = playWash;
  } else {
    ctx.fillStyle = 'rgba(17, 18, 28, 0.08)';
  }
  ctx.fillRect(0, 0, STAGE_WIDTH, stageHeight);
  ctx.restore();
};

JumpJumpRuntime.prototype.renderLoading = function (ctx) {
  var stageHeight = this.getStageHeight();

  ctx.fillStyle = 'rgba(15, 16, 24, 0.3)';
  ctx.fillRect(0, 0, STAGE_WIDTH, stageHeight);

  var barWidth = STAGE_WIDTH * 0.58;
  var barHeight = 12;
  var barX = (STAGE_WIDTH - barWidth) / 2;
  var barY = stageHeight * 0.58;

  drawCenteredText(ctx, '正在载入原作素材', STAGE_WIDTH / 2, stageHeight * 0.52, 20, COLORS.ink, '600');

  utils.drawRoundRect(ctx, barX, barY, barWidth, barHeight, 10, 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.14)', 1);
  utils.drawRoundRect(ctx, barX, barY, barWidth * this.loadingProgress, barHeight, 10, 'rgba(255, 255, 255, 0.84)', null, 0);

  drawCenteredText(ctx, Math.round(this.loadingProgress * 100) + '%', STAGE_WIDTH / 2, barY + 30, 16, COLORS.inkSoft, '500');
};

JumpJumpRuntime.prototype.renderError = function (ctx) {
  var stageHeight = this.getStageHeight();

  ctx.fillStyle = 'rgba(24, 18, 24, 0.5)';
  ctx.fillRect(0, 0, STAGE_WIDTH, stageHeight);

  drawCenteredText(ctx, '加载失败', STAGE_WIDTH / 2, stageHeight * 0.42, 28, COLORS.ink, '700');
  drawCenteredText(ctx, this.errorMessage || '未知错误', STAGE_WIDTH / 2, stageHeight * 0.5, 14, COLORS.inkSoft, '400');
};

JumpJumpRuntime.prototype.renderPlatforms = function (ctx) {
  if (!this.platforms.length) {
    return;
  }

  var visiblePlatforms = [];

  for (var i = 0; i < this.platforms.length; i += 1) {
    var platform = this.platforms[i];

    if (this.isPlatformInView(platform)) {
      visiblePlatforms.push(platform);
    }
  }

  visiblePlatforms.sort(function (a, b) {
    return a.y - b.y;
  });

  for (var visibleIndex = 0; visibleIndex < visiblePlatforms.length; visibleIndex += 1) {
    var visiblePlatform = visiblePlatforms[visibleIndex];
    var role = visiblePlatform.isCurrent ? 'current' : 'target';
    var platformAsset = platformAssets[visiblePlatform.typeId] && platformAssets[visiblePlatform.typeId][role];
    var pressRatio = visiblePlatform.isCurrent ? this.getChargePressRatio() : 0;

    if (platformAsset) {
      drawPlatformImage(ctx, visiblePlatform, this.assets[platformAsset.src], platformAsset, {
        pressRatio: pressRatio
      });
    }
  }
};

JumpJumpRuntime.prototype.renderPlayer = function (ctx) {
  var playerImage = this.assets.player;
  var drawX = this.player.x;
  var width = PLAYER_WIDTH * this.player.squashX;
  var height = PLAYER_HEIGHT * this.player.squashY;
  var footLocalY = height / 2 + 10;
  var drawY = this.player.y - this.player.arc - footLocalY;

  ctx.save();

  ctx.translate(drawX, drawY);
  if (this.player.rotation) {
    ctx.rotate(this.player.rotation * Math.PI / 180);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.beginPath();
  ctx.ellipse(
    0,
    footLocalY + 5 + this.player.arc * 0.05,
    12 + this.player.squashX * 8,
    4 + this.player.squashY * 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  if (playerImage) {
    ctx.drawImage(playerImage, -width / 2, -height / 2 + 10, width, height);
  } else {
    ctx.fillStyle = '#292843';
    ctx.beginPath();
    ctx.arc(0, -height * 0.3, width * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-width * 0.24, height * 0.2);
    ctx.lineTo(width * 0.24, height * 0.2);
    ctx.lineTo(width * 0.15, -height * 0.18);
    ctx.lineTo(-width * 0.15, -height * 0.18);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
};

JumpJumpRuntime.prototype.renderChargeEffect = function (ctx) {
  if (this.chargeTouchId === null || this.chargeTouchId === undefined) {
    return;
  }

  var platform = this.getCurrentPlatform();

  if (!platform) {
    return;
  }

  var ratio = utils.clamp(this.chargeRatio, 0, 1);
  var visualRatio = getChargeVisualRatio(this.chargeElapsed);
  var phase = this.menuPulse * 7;
  var centerX = this.player.x;
  var centerY = this.player.y - 34 + (PLAYER_HEIGHT - PLAYER_HEIGHT * this.player.squashY) * 0.28;
  var spread = 0.86 + visualRatio * 0.3;
  var particles = [
    { x: -40, y: -3, r: 3.2, c: '#ffffff', p: 0.1 },
    { x: -27, y: -20, r: 3, c: '#ffffff', p: 1.5 },
    { x: -14, y: -13, r: 2.6, c: '#35c77a', p: 2.7 },
    { x: 7, y: -17, r: 2.7, c: '#ffffff', p: 3.6 },
    { x: 25, y: -9, r: 2.8, c: '#ffffff', p: 4.8 },
    { x: 34, y: 8, r: 2.4, c: '#ffffff', p: 5.7 },
    { x: -31, y: 12, r: 2.5, c: '#ffffff', p: 6.5 },
    { x: -7, y: 20, r: 2.9, c: '#ffffff', p: 7.4 },
    { x: 14, y: 17, r: 2.8, c: '#48c886', p: 8.3 },
    { x: -48, y: 15, r: 2.1, c: '#7ed6ff', p: 9.1 },
    { x: -18, y: 28, r: 2, c: '#ffd66f', p: 10.4 },
    { x: 18, y: -29, r: 2.1, c: '#b8a1ff', p: 11.2 },
    { x: 42, y: -19, r: 1.9, c: '#7fffd2', p: 12.5 },
    { x: 39, y: 24, r: 2, c: '#ffcf96', p: 13.4 },
    { x: -3, y: -33, r: 1.8, c: '#a6f26c', p: 14.1 }
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  if (this.showAimLine) {
    var aimPoint = this.aimPoint || this.getChargeAimPoint();

    if (aimPoint) {
      var lineStartX = this.player.x;
      var lineStartY = this.player.y - 8;
      var lineEndY = aimPoint.y - 8;
      var dx = aimPoint.x - lineStartX;
      var dy = lineEndY - lineStartY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var dashLength = 11;
      var gapLength = 8;
      var progress = 0;
      var lineAlpha = 0.22 + ratio * 0.32;
      var dotRadius = 4.2 + ratio * 2.4;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(54, 57, 66, ' + lineAlpha + ')';
      ctx.lineWidth = 2.2;

      while (progress < distance) {
        var segmentEnd = Math.min(progress + dashLength, distance);
        var startRatio = distance > 0 ? progress / distance : 0;
        var endRatio = distance > 0 ? segmentEnd / distance : 0;

        ctx.beginPath();
        ctx.moveTo(lineStartX + dx * startRatio, lineStartY + dy * startRatio);
        ctx.lineTo(lineStartX + dx * endRatio, lineStartY + dy * endRatio);
        ctx.stroke();

        progress += dashLength + gapLength;
      }

      ctx.globalAlpha = 0.52 + ratio * 0.2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(aimPoint.x, lineEndY, dotRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6 + ratio * 0.24;
      ctx.strokeStyle = 'rgba(54, 57, 66, 0.58)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(aimPoint.x, lineEndY, dotRadius + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.48 + ratio * 0.24;
      ctx.fillStyle = 'rgba(54, 57, 66, 0.78)';
      ctx.beginPath();
      ctx.arc(aimPoint.x, lineEndY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (var i = 0; i < particles.length; i += 1) {
    var particle = particles[i];
    var pulse = Math.sin(phase + particle.p);
    var x = centerX + particle.x * spread + pulse * 2.4;
    var y = centerY + particle.y * spread + Math.cos(phase * 0.8 + particle.p) * 2.2;
    var radius = particle.r * (0.86 + visualRatio * 0.22 + pulse * 0.08);
    var alpha = utils.clamp(0.58 + visualRatio * 0.34 + pulse * 0.14, 0.32, 0.96);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.c;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (particle.c !== '#ffffff') {
      ctx.globalAlpha = alpha * 0.22;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

JumpJumpRuntime.prototype.renderPopups = function (ctx) {
  for (var i = 0; i < this.popups.length; i += 1) {
    var popup = this.popups[i];
    var alpha = utils.clamp(popup.life / 0.8, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    drawCenteredText(
      ctx,
      popup.text,
      popup.x,
      popup.y,
      18 * (popup.scale || 1),
      popup.color || COLORS.ink,
      '700'
    );
    ctx.restore();
  }
};

JumpJumpRuntime.prototype.renderHud = function (ctx) {
  var stageHeight = this.getStageHeight();
  var scoreY = Math.max(this.getStageSafeTop() + 64, stageHeight * 0.18);
  var bottomTextY = stageHeight - Math.max(18, this.getStageSafeBottom() + 20);

  drawLeftText(ctx, formatScore(this.score), 54, scoreY, 52, 'rgba(55, 57, 64, 0.9)', '800');

  if (this.combo > 1) {
    drawCenteredText(
      ctx,
      '连击 x' + this.combo,
      STAGE_WIDTH / 2,
      scoreY,
      18,
      COLORS.gameTextStrong,
      '700'
    );
  }

  if (this.landings === 0 && this.score === 0) {
    drawCenteredText(
      ctx,
      '长按蓄力，松手起跳',
      STAGE_WIDTH / 2,
      bottomTextY,
      13,
      'rgba(55, 57, 64, 0.48)',
      '500'
    );
  }
};

JumpJumpRuntime.prototype.computeMenuButtons = function () {
  var safeBottom = this.runtimeInfo && this.runtimeInfo.safeAreaInsets
    ? this.runtimeInfo.safeAreaInsets.bottom
    : 0;
  var navHeight = Math.max(126, Math.min(this.height * 0.2, 176)) + safeBottom;
  var navY = this.height - navHeight;
  var buttonWidth = Math.max(246, Math.min(this.width * 0.58, 380));
  var buttonHeight = Math.max(54, Math.min(this.height * 0.075, 68));
  var controlGap = Math.max(18, Math.min(this.height * 0.024, 28));
  var secondaryWidth = 178;
  var secondaryHeight = 42;
  var toggleWidth = 172;
  var toggleHeight = 36;
  var toggleGap = 10;
  var primaryY = Math.max(
    this.height * 0.55,
    Math.min(
      navY - buttonHeight - secondaryHeight - toggleHeight - controlGap - toggleGap - 18,
      this.height * 0.66
    )
  );
  var secondaryY = Math.min(
    primaryY + buttonHeight + controlGap,
    navY - secondaryHeight - toggleHeight - toggleGap - 14
  );
  var toggleY = secondaryY + secondaryHeight + toggleGap;
  var navContentHeight = navHeight - safeBottom;
  var navIconY = navY + navContentHeight * 0.42;
  var navLabelY = navIconY + 54;

  if (secondaryY < primaryY + buttonHeight + 16) {
    primaryY = secondaryY - buttonHeight - 16;
    toggleY = secondaryY + secondaryHeight + toggleGap;
  }

  if (toggleY > navY - toggleHeight - 12) {
    var overflow = toggleY - (navY - toggleHeight - 12);
    primaryY -= overflow;
    secondaryY -= overflow;
    toggleY -= overflow;
  }

  this.buttons.primary = {
    x: (this.width - buttonWidth) / 2,
    y: primaryY,
    width: buttonWidth,
    height: buttonHeight,
    radius: buttonHeight / 2
  };
  this.buttons.secondary = {
    x: (this.width - secondaryWidth) / 2,
    y: secondaryY,
    width: secondaryWidth,
    height: secondaryHeight,
    radius: secondaryHeight / 2
  };
  this.buttons.aimToggle = {
    x: (this.width - toggleWidth) / 2,
    y: toggleY,
    width: toggleWidth,
    height: toggleHeight,
    radius: toggleHeight / 2
  };
  this.buttons.menuNavBar = {
    x: 0,
    y: navY,
    width: this.width,
    height: navHeight
  };
  this.buttons.menuNav = [
    {
      x: this.width / 2 - 54,
      y: navIconY - 46,
      width: 108,
      height: 112,
      centerX: this.width / 2,
      iconY: navIconY,
      labelY: navLabelY,
      kind: 'ranking',
      label: '排行榜'
    }
  ];

  var leaderboardWidth = Math.max(268, Math.min(this.width - 56, 380));
  var leaderboardHeight = Math.max(308, Math.min(this.height * 0.46, 388));
  var leaderboardX = (this.width - leaderboardWidth) / 2;
  var leaderboardY = Math.max(86, Math.min(this.height * 0.26, this.height - leaderboardHeight - navHeight - 28));
  var leaderboardButtonWidth = Math.min(126, (leaderboardWidth - 56) / 2);
  var leaderboardButtonGap = Math.max(12, Math.min(20, leaderboardWidth * 0.04));
  var leaderboardButtonsX = leaderboardX + (leaderboardWidth - leaderboardButtonWidth * 2 - leaderboardButtonGap) / 2;
  var leaderboardButtonsY = leaderboardY + leaderboardHeight - 58;

  this.buttons.leaderboardPanel = {
    x: leaderboardX,
    y: leaderboardY,
    width: leaderboardWidth,
    height: leaderboardHeight,
    radius: 24
  };
  this.buttons.leaderboardClear = {
    x: leaderboardButtonsX,
    y: leaderboardButtonsY,
    width: leaderboardButtonWidth,
    height: 40,
    radius: 20
  };
  this.buttons.leaderboardBack = {
    x: leaderboardButtonsX + leaderboardButtonWidth + leaderboardButtonGap,
    y: leaderboardButtonsY,
    width: leaderboardButtonWidth,
    height: 40,
    radius: 20
  };
};

JumpJumpRuntime.prototype.computeOverButtons = function (preferredY) {
  var width = 146;
  var height = 40;
  var gap = 18;
  var startX = (STAGE_WIDTH - width * 2 - gap) / 2;
  var maxY = this.getStageHeight() - Math.max(62, this.getStageSafeBottom() + 58);
  var y = preferredY !== undefined ? Math.min(preferredY, maxY) : maxY;

  this.buttons.primary = {
    x: startX,
    y: y,
    width: width,
    height: height,
    radius: 18
  };
  this.buttons.secondary = {
    x: startX + width + gap,
    y: y,
    width: width,
    height: height,
    radius: 18
  };
};

JumpJumpRuntime.prototype.renderMenuPlatformScene = function (ctx, rect, pulse) {
  var scale = utils.clamp(rect.width / 390, 0.82, 1.18);
  var platforms = [
    { typeId: 18, role: 'target', x: 0.73, y: 0.28, scale: 1.16, float: -0.6 },
    { typeId: 20, role: 'current', x: 0.34, y: 0.58, scale: 1.16, player: true, float: 1 },
    { typeId: 3, role: 'target', x: -0.03, y: 0.86, scale: 1.02, float: 0.4 }
  ];
  var drewScene = false;

  platforms.sort(function (a, b) {
    return a.y - b.y;
  });

  ctx.save();
  for (var i = 0; i < platforms.length; i += 1) {
    var item = platforms[i];
    var assetGroup = platformAssets[item.typeId];
    var assetInfo = assetGroup && (assetGroup[item.role] || assetGroup.target);

    if (!assetInfo) {
      continue;
    }

    var image = this.assets[assetInfo.src];
    var platformX = rect.x + rect.width * item.x;
    var platformY = rect.y + rect.height * item.y + pulse * item.float;
    var scaledAssetInfo = {
      centerX: assetInfo.centerX,
      centerY: assetInfo.centerY,
      scale: assetInfo.scale * scale * (item.scale || 1)
    };

    if (drawPlatformImage(ctx, { x: platformX, y: platformY }, image, scaledAssetInfo)) {
      drewScene = true;
    }

    if (item.player) {
      drawMenuScenePlayer(ctx, this.assets.player, platformX, platformY - 2 * scale, scale * 1.04, this.menuPulse * 2.1);
    }
  }

  ctx.restore();
  return drewScene;
};

JumpJumpRuntime.prototype.renderMenu = function (ctx) {
  this.computeMenuButtons();

  var backgroundImage = this.assets.background7;
  var menuSceneImage = this.assets.menuScene;
  var safeTop = this.runtimeInfo && this.runtimeInfo.safeAreaInsets
    ? this.runtimeInfo.safeAreaInsets.top
    : 0;
  var pulse = Math.sin(this.menuPulse * 2.2);
  var primaryButton = this.buttons.primary;
  var secondaryButton = this.buttons.secondary;
  var aimToggleButton = this.buttons.aimToggle;
  var navBar = this.buttons.menuNavBar;
  var titleHeight = Math.max(58, Math.min(this.height * 0.08, 78));
  var titleFontSize = Math.max(46, Math.min(this.width * 0.14, 68));
  var titleY = Math.max(safeTop + 82, this.height * 0.24);
  var sceneWidth = Math.min(this.width * 0.84, 500);

  if (backgroundImage) {
    utils.drawCoverImage(ctx, backgroundImage, 0, 0, this.width, this.height);
  } else {
    ctx.fillStyle = '#9b9fa7';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  ctx.save();
  ctx.fillStyle = 'rgba(117, 121, 130, 0.44)';
  ctx.fillRect(0, 0, this.width, this.height);
  var menuGradient = ctx.createLinearGradient(0, 0, 0, this.height);
  menuGradient.addColorStop(0, 'rgba(142, 146, 155, 0.18)');
  menuGradient.addColorStop(0.48, 'rgba(128, 132, 140, 0.04)');
  menuGradient.addColorStop(1, 'rgba(84, 89, 98, 0.32)');
  ctx.fillStyle = menuGradient;
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.globalAlpha = 0.12;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(20, this.width * 0.045);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.moveTo(-this.width * 0.08, this.height * 0.18);
  ctx.lineTo(this.width * 0.68, this.height * 0.02);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(this.width * 0.28, this.height * 0.74);
  ctx.lineTo(this.width * 1.08, this.height * 0.56);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 ' + titleFontSize + 'px sans-serif';
  ctx.lineWidth = Math.max(3, titleFontSize * 0.08);
  ctx.strokeStyle = 'rgba(92, 96, 106, 0.18)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = 10;
  ctx.strokeText(gameMeta.GAME_TITLE, this.width / 2, titleY + titleHeight / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(gameMeta.GAME_TITLE, this.width / 2, titleY + titleHeight / 2);
  ctx.restore();

  var sceneAspect = 0.58;
  var minSceneTop = titleY + titleHeight + Math.max(24, this.height * 0.03);
  var maxSceneBottom = primaryButton.y - Math.max(16, this.height * 0.024);
  var sceneHeight = Math.min(sceneWidth * sceneAspect, maxSceneBottom - minSceneTop);

  if (sceneHeight < 150) {
    sceneHeight = Math.max(128, maxSceneBottom - minSceneTop);
  }

  sceneWidth = Math.min(sceneWidth, sceneHeight / sceneAspect);

  var sceneRect = {
    x: (this.width - sceneWidth) / 2,
    y: Math.max(minSceneTop, maxSceneBottom - sceneHeight),
    width: sceneWidth,
    height: sceneHeight
  };

  if (!this.renderMenuPlatformScene(ctx, sceneRect, pulse)) {
    if (menuSceneImage) {
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.drawImage(
        menuSceneImage,
        sceneRect.x,
        sceneRect.y + pulse * 3,
        sceneRect.width,
        sceneRect.height
      );
      ctx.restore();
    }
  }

  drawMenuPrimaryButton(ctx, primaryButton);
  drawMenuLink(ctx, secondaryButton, '玩法说明  ›');
  drawMenuToggleButton(ctx, aimToggleButton, '瞄准线', this.showAimLine);

  ctx.save();
  var navFill = ctx.createLinearGradient(navBar.x, navBar.y, navBar.x + navBar.width, navBar.y + navBar.height);
  navFill.addColorStop(0, 'rgba(87, 91, 100, 0.64)');
  navFill.addColorStop(0.5, 'rgba(98, 102, 110, 0.62)');
  navFill.addColorStop(1, 'rgba(82, 86, 96, 0.64)');
  ctx.fillStyle = navFill;
  ctx.fillRect(navBar.x, navBar.y, navBar.width, navBar.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(navBar.x, navBar.y, navBar.width, 1);
  ctx.restore();

  for (var i = 0; i < this.buttons.menuNav.length; i += 1) {
    drawMenuNavItem(ctx, this.buttons.menuNav[i]);
  }

  if (this.menuPanel === 'leaderboard') {
    this.renderMenuLeaderboard(ctx);
  }
};

JumpJumpRuntime.prototype.renderMenuLeaderboard = function (ctx) {
  var panel = this.buttons.leaderboardPanel;
  var clearButton = this.buttons.leaderboardClear;
  var backButton = this.buttons.leaderboardBack;
  var bestScore = this.getResolvedBestScore();

  ctx.save();
  ctx.fillStyle = 'rgba(9, 10, 18, 0.36)';
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.restore();

  drawPanel(ctx, panel, 'rgba(28, 31, 44, 0.94)');
  drawCenteredText(ctx, '本机排行榜', panel.x + panel.width / 2, panel.y + 36, 22, COLORS.ink, '700');
  drawCenteredText(
    ctx,
    '最佳 ' + formatScore(bestScore) + '  ·  成绩 ' + this.localLeaderboard.length + ' 条',
    panel.x + panel.width / 2,
    panel.y + 68,
    13,
    COLORS.inkMuted,
    '500'
  );

  if (this.localLeaderboard.length) {
    var headerY = panel.y + 104;
    var rowY = headerY + 30;
    var rowGap = 34;
    var columns = {
      rankX: panel.x + 38,
      scoreX: panel.x + 122,
      timeX: panel.x + panel.width - 164,
      timeAlign: 'left'
    };

    drawLeaderboardHeader(ctx, columns, headerY, 12);
    for (var i = 0; i < Math.min(5, this.localLeaderboard.length); i += 1) {
      drawLeaderboardEntry(ctx, i + 1, this.localLeaderboard[i], columns, rowY + i * rowGap, 18, 12);
    }
  } else {
    drawCenteredText(ctx, '暂无成绩', panel.x + panel.width / 2, panel.y + 162, 18, COLORS.inkSoft, '600');
    drawCenteredText(ctx, '先来一局吧', panel.x + panel.width / 2, panel.y + 194, 14, COLORS.inkMuted, '500');
  }

  drawButton(ctx, clearButton, '清空成绩', false);
  drawButton(ctx, backButton, '返回首页', false);
};

JumpJumpRuntime.prototype.renderHelp = function (ctx) {
  this.computeOverButtons();

  var stageHeight = this.getStageHeight();
  var safeBottom = this.getStageSafeBottom();
  var panelY = Math.max(22, this.getStageSafeTop() + 12);
  var panelHeight = Math.min(
    366,
    Math.max(354, stageHeight - panelY - Math.max(136, safeBottom + 124))
  );

  ctx.fillStyle = 'rgba(12, 14, 24, 0.4)';
  ctx.fillRect(0, 0, STAGE_WIDTH, stageHeight);

  var panel = {
    x: 22,
    y: panelY,
    width: STAGE_WIDTH - 44,
    height: panelHeight,
    radius: 26
  };
  var leftX = panel.x + 24;

  drawPanel(ctx, panel, 'rgba(17, 20, 31, 0.68)');
  drawCenteredText(ctx, '玩法说明', STAGE_WIDTH / 2, panel.y + 32, 25, COLORS.ink, '700');

  for (var i = 0; i < gameMeta.HELP_LINES.length; i += 1) {
    drawLeftText(ctx, '· ' + gameMeta.HELP_LINES[i], leftX, panel.y + 82 + i * 29, 16, COLORS.inkSoft, '500');
  }

  drawLeftText(ctx, '计分规则', leftX, panel.y + 212, 19, COLORS.ink, '700');
  drawLeftText(ctx, '· 普通落台：+1', leftX, panel.y + 244, 16, COLORS.inkSoft, '500');
  drawLeftText(ctx, '· 命中中心：连击追加分数', leftX, panel.y + 272, 16, COLORS.inkSoft, '500');
  drawLeftText(ctx, '· 特殊方格会提供不同奖励或扣分', leftX, panel.y + 300, 16, COLORS.inkSoft, '500');
  drawLeftText(ctx, '· 每 15 次成功跳跃切换背景', leftX, panel.y + 328, 16, COLORS.inkSoft, '500');

  drawButton(ctx, this.buttons.primary, '开始游戏', true);
  drawButton(ctx, this.buttons.secondary, '返回首页', false);
};

JumpJumpRuntime.prototype.renderOver = function (ctx) {
  var stageHeight = this.getStageHeight();
  var safeTop = this.getStageSafeTop();
  var safeBottom = this.getStageSafeBottom();
  var bestScore = this.getResolvedBestScore();
  var panelWidth = Math.min(STAGE_WIDTH - 56, 416);
  var availableHeight = stageHeight - safeTop - safeBottom;
  var panelHeight = utils.clamp(availableHeight - 104, 356, 410);
  var panelY = utils.clamp(
    this.getPlayCenterY() - panelHeight * 0.46,
    safeTop + 18,
    stageHeight - safeBottom - panelHeight - 86
  );

  ctx.fillStyle = 'rgba(8, 10, 18, 0.48)';
  ctx.fillRect(0, 0, STAGE_WIDTH, stageHeight);

  var panel = {
    x: (STAGE_WIDTH - panelWidth) / 2,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    radius: 26
  };

  drawPanel(ctx, panel, 'rgba(24, 27, 42, 0.95)');
  drawCenteredText(ctx, '本次得分', STAGE_WIDTH / 2, panel.y + 38, 18, COLORS.inkSoft, '700');
  drawCenteredText(ctx, formatScore(this.score), STAGE_WIDTH / 2, panel.y + 92, 46, COLORS.ink, '800');

  var contentX = panel.x + 24;
  var contentWidth = panel.width - 48;
  var cardGap = 16;
  var cardWidth = (contentWidth - cardGap) / 2;
  var cardHeight = 76;
  var cardY = panel.y + 140;
  var leftCard = {
    x: contentX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    radius: 18
  };
  var rightCard = {
    x: contentX + cardWidth + cardGap,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    radius: 18
  };

  drawPanel(ctx, leftCard, COLORS.panel);
  drawPanel(ctx, rightCard, COLORS.panel);
  drawLeftText(ctx, '最佳纪录', leftCard.x + 16, leftCard.y + 24, 14, COLORS.inkMuted, '600');
  drawLeftText(ctx, formatScore(bestScore), leftCard.x + 16, leftCard.y + 56, 26, COLORS.ink, '700');
  drawLeftText(ctx, '成功跳跃', rightCard.x + 16, rightCard.y + 24, 14, COLORS.inkMuted, '600');
  drawLeftText(ctx, String(this.landings), rightCard.x + 16, rightCard.y + 56, 26, COLORS.ink, '700');

  var maxRows = panel.height < 374 ? 2 : 3;
  var rowGap = 30;
  var leaderboardY = cardY + cardHeight + 32;
  var scoreX = contentX + 2;
  var timeX = panel.x + panel.width - 166;
  var rowColumns = {
    rankX: scoreX,
    scoreX: scoreX + 92,
    timeX: timeX,
    timeAlign: 'left'
  };

  drawLeftText(ctx, '本机排行', scoreX, leaderboardY, 16, COLORS.ink, '700');
  if (this.localLeaderboard.length) {
    drawLeaderboardHeader(ctx, rowColumns, leaderboardY + 28, 12);
    for (var i = 0; i < Math.min(maxRows, this.localLeaderboard.length); i += 1) {
      drawLeaderboardEntry(ctx, i + 1, this.localLeaderboard[i], rowColumns, leaderboardY + 54 + i * rowGap, 14, 12);
    }
  } else {
    drawLeftText(ctx, '还没有可显示的成绩。', scoreX, leaderboardY + 32, 13, COLORS.inkSoft, '500');
  }

  this.computeOverButtons(panel.y + panel.height + 24);
  drawButton(ctx, this.buttons.primary, '再来一局', true);
  drawButton(ctx, this.buttons.secondary, '返回首页', false);
};

module.exports = JumpJumpRuntime;
