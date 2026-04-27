'use strict';

var utils = require('./utils');
var content = require('./content');
var gameMeta = require('./game-meta');
var assets = require('./assets');
var audioModule = require('./audio');

var BG_TOP = '#fff3db';
var BG_BOTTOM = '#f4e5cc';
var PANEL_FILL = 'rgba(255, 250, 242, 0.96)';
var PANEL_STROKE = 'rgba(84, 65, 40, 0.26)';
var INK = '#433224';
var SOFT_INK = 'rgba(67, 50, 36, 0.68)';
var ACCENT = '#ffb05c';
var GOLD = '#ffcc66';
var SUCCESS = '#7bcf8a';
var DANGER = '#ef7b6d';
var PATH_COLOR = '#d8b185';
var FLOOR_COLOR = '#f8ebd7';
var SLOT_IDLE = 'rgba(125, 91, 54, 0.12)';
var SLOT_ACTIVE = 'rgba(255, 176, 92, 0.22)';
var STORAGE_BEST_WAVES = 'defense_game_best_waves_v2';
var STORAGE_AUDIO_SETTINGS = 'defense_game_audio_settings_v1';

function DefenseMinigameRuntime(options) {
  this.canvas = options.canvas;
  this.ctx = options.ctx;
  this.width = options.width;
  this.height = options.height;
  this.pixelRatio = options.pixelRatio || 1;
  this.runtimeInfo = options.runtimeInfo || {};
  this.scale = utils.clamp(Math.min(this.width / 430, this.height / 932), 0.66, 1.24);
  this.assets = assets.createAssetStore(this.canvas);
  this.audioSettings = this.normalizeAudioSettings(utils.safeGetStorage(STORAGE_AUDIO_SETTINGS, {}));
  this.audio = new audioModule.AudioManager(this.audioSettings);
  this.stageCatalog = content.getStageCatalog();
  this.selectedStageKey = content.STAGE_ORDER[0];

  this.state = 'title';
  this.stage = null;
  this.towers = [];
  this.enemies = [];
  this.projectiles = [];
  this.selectedTowerKey = '';
  this.selectedPlacedTowerId = '';
  this.waveCursor = 0;
  this.activeWaveNumber = 0;
  this.clearedWaveCount = 0;
  this.pendingSpawns = [];
  this.waveInProgress = false;
  this.nextWaveDelayMs = 0;
  this.gold = 0;
  this.lives = 0;
  this.kills = 0;
  this.elapsedTime = 0;
  this.bestWaves = this.normalizeBestWaves(utils.safeGetStorage(STORAGE_BEST_WAVES, {}));
  this.lastResult = null;
  this.nextEntityId = 1;
  this.bannerText = '';
  this.bannerSubtext = '';
  this.bannerUntil = 0;
  this.hintText = '';
  this.hintUntil = 0;
  this.feedbackMarks = [];
  this.waveThreatShown = {};
  this.lastPressureCueAt = 0;

  this.touchRects = {};
  this.lastTimestamp = 0;
  this.loopHandle = null;
  this.running = false;
  this.hidden = false;

  this.loop = this.loop.bind(this);
}

DefenseMinigameRuntime.prototype.init = function () {
  this.running = true;
  this.audio.playBgm('bgmMain');
  this.render();
  this.requestNextFrame();
};

DefenseMinigameRuntime.prototype.destroy = function () {
  this.running = false;
  if (typeof cancelAnimationFrame === 'function' && this.loopHandle) {
    cancelAnimationFrame(this.loopHandle);
  }
  if (typeof clearTimeout === 'function' && this.loopHandle) {
    clearTimeout(this.loopHandle);
  }
  this.loopHandle = null;
  this.assets.destroy();
  this.audio.destroy();
};

DefenseMinigameRuntime.prototype.requestNextFrame = function () {
  var self = this;
  if (!this.running) {
    return;
  }

  if (typeof requestAnimationFrame === 'function') {
    this.loopHandle = requestAnimationFrame(this.loop);
    return;
  }

  this.loopHandle = setTimeout(function () {
    self.loop(Date.now());
  }, 1000 / 60);
};

DefenseMinigameRuntime.prototype.loop = function (timestamp) {
  var now = typeof timestamp === 'number' ? timestamp : Date.now();
  var dt = 0;

  if (!this.running) {
    return;
  }

  if (this.lastTimestamp) {
    dt = Math.min(0.05, (now - this.lastTimestamp) / 1000);
  }
  this.lastTimestamp = now;

  if (!this.hidden) {
    this.update(dt, now);
    this.render();
  }

  this.requestNextFrame();
};

DefenseMinigameRuntime.prototype.handleShow = function () {
  this.hidden = false;
  this.lastTimestamp = Date.now();
  this.audio.resumeBgm();
};

DefenseMinigameRuntime.prototype.handleHide = function () {
  this.hidden = true;
  this.audio.pauseBgm();
};

DefenseMinigameRuntime.prototype.handleResize = function () {
  return;
};

DefenseMinigameRuntime.prototype.getScaledSize = function (base, min, max) {
  var value = base * this.scale;
  if (min !== undefined) {
    value = Math.max(min, value);
  }
  if (max !== undefined) {
    value = Math.min(max, value);
  }
  return value;
};

DefenseMinigameRuntime.prototype.getSafeInsets = function () {
  var windowInfo = this.runtimeInfo && this.runtimeInfo.windowInfo ? this.runtimeInfo.windowInfo : {};
  var safeArea = windowInfo.safeArea || null;
  var left = 0;
  var top = 0;
  var right = 0;
  var bottom = 0;

  if (safeArea) {
    left = Math.max(0, safeArea.left || 0);
    top = Math.max(0, safeArea.top || 0);
    right = Math.max(0, this.width - ((safeArea.left || 0) + (safeArea.width || this.width)));
    bottom = Math.max(0, this.height - ((safeArea.top || 0) + (safeArea.height || this.height)));
  }

  return {
    left: left,
    top: top,
    right: right,
    bottom: bottom
  };
};

DefenseMinigameRuntime.prototype.measureTextWidth = function (text, size, weight) {
  var label = text === undefined || text === null ? '' : String(text);
  utils.setTextStyle(this.ctx, size, weight, '#000000', 'left', 'alphabetic');
  return this.ctx.measureText(label).width;
};

DefenseMinigameRuntime.prototype.getClampedTextSpec = function (text, maxWidth, baseSize, minSize, weight) {
  var label = text === undefined || text === null ? '' : String(text);
  var floor = minSize === undefined ? Math.max(8, baseSize - 4) : minSize;
  var size = baseSize;
  var displayText = label;
  var ellipsis = '…';

  if (!maxWidth || !label) {
    return {
      text: label,
      size: baseSize
    };
  }

  while (size > floor && this.measureTextWidth(displayText, size, weight) > maxWidth) {
    size -= 1;
  }

  if (this.measureTextWidth(displayText, size, weight) <= maxWidth) {
    return {
      text: displayText,
      size: size
    };
  }

  while (displayText.length > 0 && this.measureTextWidth(displayText + ellipsis, size, weight) > maxWidth) {
    displayText = displayText.slice(0, -1);
  }

  return {
    text: (displayText || '') + (displayText !== label ? ellipsis : ''),
    size: size
  };
};

DefenseMinigameRuntime.prototype.drawClampedText = function (text, x, y, maxWidth, baseSize, minSize, weight, color, align, baseline) {
  var spec = this.getClampedTextSpec(text, maxWidth, baseSize, minSize, weight);
  utils.setTextStyle(this.ctx, spec.size, weight, color, align, baseline);
  this.ctx.fillText(spec.text, x, y);
  return spec;
};

DefenseMinigameRuntime.prototype.getStageViewportMetrics = function () {
  var safe = this.getSafeInsets();
  var metrics = this.getUiMetrics();

  return {
    topHudHeight: safe.top + metrics.edgeGap + metrics.topHudCardHeight,
    bottomHudHeight: safe.bottom + metrics.bottomBarHeight,
    playTopGap: this.getScaledSize(16, 12, 18),
    playBottomGap: this.getScaledSize(12, 8, 14)
  };
};

DefenseMinigameRuntime.prototype.getSnapshot = function () {
  var currentWave = this.activeWaveNumber;

  if (!currentWave && this.stage && this.stage.waves && this.stage.waves.length) {
    currentWave = Math.min(this.clearedWaveCount + 1, this.stage.waves.length);
  }

  return {
    state: this.state,
    wave: currentWave,
    lives: this.lives,
    stageKey: this.stage ? this.stage.key : this.selectedStageKey
  };
};

DefenseMinigameRuntime.prototype.normalizeBestWaves = function (value) {
  var map = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    content.STAGE_ORDER.forEach(function (stageKey) {
      map[stageKey] = 0;
    });
    return map;
  }

  content.STAGE_ORDER.forEach(function (stageKey) {
    map[stageKey] = typeof value[stageKey] === 'number' ? value[stageKey] : 0;
  });
  return map;
};

DefenseMinigameRuntime.prototype.normalizeAudioSettings = function (value) {
  var settings = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    musicEnabled: settings.musicEnabled !== false,
    sfxEnabled: settings.sfxEnabled !== false
  };
};

DefenseMinigameRuntime.prototype.saveAudioSettings = function () {
  utils.safeSetStorage(STORAGE_AUDIO_SETTINGS, this.audioSettings);
};

DefenseMinigameRuntime.prototype.toggleMusicEnabled = function () {
  var nextEnabled = !this.audioSettings.musicEnabled;

  if (this.audioSettings.sfxEnabled) {
    this.audio.playSfx('uiTap');
  }

  this.audioSettings.musicEnabled = nextEnabled;
  this.audio.setMusicEnabled(nextEnabled);
  this.saveAudioSettings();
};

DefenseMinigameRuntime.prototype.toggleSfxEnabled = function () {
  var nextEnabled = !this.audioSettings.sfxEnabled;

  if (!nextEnabled && this.audioSettings.sfxEnabled) {
    this.audio.playSfx('uiTap');
  }

  this.audioSettings.sfxEnabled = nextEnabled;
  this.audio.setSfxEnabled(nextEnabled);
  this.saveAudioSettings();

  if (nextEnabled) {
    this.audio.playSfx('uiTap');
  }
};

DefenseMinigameRuntime.prototype.getBestWaveForStage = function (stageKey) {
  return this.bestWaves[stageKey] || 0;
};

DefenseMinigameRuntime.prototype.getSelectedStageMeta = function () {
  var found = null;

  this.stageCatalog.some(function (stageMeta) {
    if (stageMeta.key === this.selectedStageKey) {
      found = stageMeta;
      return true;
    }
    return false;
  }, this);

  return found || this.stageCatalog[0];
};

DefenseMinigameRuntime.prototype.saveBestWaves = function () {
  utils.safeSetStorage(STORAGE_BEST_WAVES, this.bestWaves);
};

DefenseMinigameRuntime.prototype.startGame = function () {
  this.stage = content.createStageData(this.width, this.height, this.scale, this.selectedStageKey, this.getStageViewportMetrics());
  this.towers = [];
  this.enemies = [];
  this.projectiles = [];
  this.selectedTowerKey = 'tabby';
  this.selectedPlacedTowerId = '';
  this.waveCursor = 0;
  this.activeWaveNumber = 0;
  this.clearedWaveCount = 0;
  this.pendingSpawns = [];
  this.waveInProgress = false;
  this.nextWaveDelayMs = 900;
  this.gold = this.stage.startingGold;
  this.lives = this.stage.startingLives;
  this.kills = 0;
  this.elapsedTime = 0;
  this.lastResult = null;
  this.bannerText = '';
  this.bannerSubtext = '';
  this.bannerUntil = 0;
  this.hintText = '';
  this.hintUntil = 0;
  this.feedbackMarks = [];
  this.waveThreatShown = {};
  this.lastPressureCueAt = 0;
  this.state = 'playing';
  this.showHint(this.stage.introHint || '点选猫塔，再点空塔位建造', 1650);
};

DefenseMinigameRuntime.prototype.pauseGame = function () {
  if (this.state === 'playing') {
    this.state = 'paused';
    this.audio.playSfx('uiTap');
  }
};

DefenseMinigameRuntime.prototype.resumeGame = function () {
  if (this.state === 'paused') {
    this.state = 'playing';
    this.lastTimestamp = Date.now();
    this.audio.playSfx('uiTap');
  }
};

DefenseMinigameRuntime.prototype.returnToTitle = function () {
  this.state = 'title';
  this.stage = null;
  this.selectedPlacedTowerId = '';
  this.selectedTowerKey = '';
  this.feedbackMarks = [];
  this.lastPressureCueAt = 0;
  this.audio.playSfx('uiTap');
  this.audio.playBgm('bgmMain');
};

DefenseMinigameRuntime.prototype.finishRun = function (didWin) {
  var clearedWave = didWin && this.stage ? this.stage.waves.length : this.clearedWaveCount;
  var previousBestWave = this.getBestWaveForStage(this.stage.key);
  this.lastResult = {
    didWin: didWin,
    clearedWave: clearedWave,
    lives: this.lives,
    kills: this.kills,
    gold: this.gold,
    time: this.elapsedTime,
    wasNewBestWave: clearedWave > previousBestWave
  };
  if (clearedWave > previousBestWave) {
    this.bestWaves[this.stage.key] = clearedWave;
    this.saveBestWaves();
  }
  this.audio.playSfx(didWin ? 'victory' : 'defeat');
  this.state = didWin ? 'victory' : 'gameover';
};

DefenseMinigameRuntime.prototype.showHint = function (text, durationMs) {
  this.hintText = text || '';
  this.hintUntil = Date.now() + (durationMs || 1200);
};

DefenseMinigameRuntime.prototype.showBanner = function (title, subtitle, durationMs) {
  this.bannerText = title || '';
  this.bannerSubtext = subtitle || '';
  this.bannerUntil = Date.now() + (durationMs || 1700);
};

DefenseMinigameRuntime.prototype.pushFeedbackMark = function (kind, x, y, options) {
  this.feedbackMarks.push({
    kind: kind,
    x: x,
    y: y,
    age: 0,
    lifetime: (options && options.lifetime) || 0.42,
    radius: (options && options.radius) || 24 * this.scale,
    tint: (options && options.tint) || ACCENT
  });
};

DefenseMinigameRuntime.prototype.getTouchPoint = function (event) {
  var touch = event && event.changedTouches && event.changedTouches[0];
  if (!touch) {
    touch = event && event.touches && event.touches[0];
  }
  if (!touch) {
    return null;
  }
  return {
    x: touch.x !== undefined ? touch.x : touch.clientX,
    y: touch.y !== undefined ? touch.y : touch.clientY
  };
};

DefenseMinigameRuntime.prototype.handleTouchStart = function (event) {
  var point = this.getTouchPoint(event);
  var selectedStageKey;

  if (!point) {
    return;
  }

  this.audio.activate();

  if (this.state === 'title') {
    if (utils.pointInRect(point.x, point.y, this.touchRects.titleMusicButton)) {
      this.toggleMusicEnabled();
      return;
    }
    if (utils.pointInRect(point.x, point.y, this.touchRects.titleSfxButton)) {
      this.toggleSfxEnabled();
      return;
    }
    selectedStageKey = this.findTitleStageAtPoint(point);
    if (selectedStageKey) {
      this.selectedStageKey = selectedStageKey;
      this.audio.playSfx('uiTap');
      return;
    }
    if (utils.pointInRect(point.x, point.y, this.touchRects.titleStartButton)) {
      this.audio.playSfx('uiTap');
      this.startGame();
    }
    return;
  }

  if (this.state === 'paused') {
    if (utils.pointInRect(point.x, point.y, this.touchRects.pauseMusicButton)) {
      this.toggleMusicEnabled();
    } else if (utils.pointInRect(point.x, point.y, this.touchRects.pauseSfxButton)) {
      this.toggleSfxEnabled();
    } else if (utils.pointInRect(point.x, point.y, this.touchRects.pauseResumeButton)) {
      this.resumeGame();
    } else if (utils.pointInRect(point.x, point.y, this.touchRects.pauseRestartButton)) {
      this.audio.playSfx('uiTap');
      this.startGame();
    } else if (utils.pointInRect(point.x, point.y, this.touchRects.pauseBackButton)) {
      this.returnToTitle();
    }
    return;
  }

  if (this.state === 'victory' || this.state === 'gameover') {
    if (utils.pointInRect(point.x, point.y, this.touchRects.resultPrimaryButton)) {
      this.audio.playSfx('uiTap');
      this.startGame();
    } else if (utils.pointInRect(point.x, point.y, this.touchRects.resultBackButton)) {
      this.returnToTitle();
    }
    return;
  }

  if (this.state !== 'playing') {
    return;
  }

  if (utils.pointInRect(point.x, point.y, this.touchRects.pauseButton)) {
    this.pauseGame();
    return;
  }

  if (utils.pointInRect(point.x, point.y, this.touchRects.waveButton)) {
    this.nextWaveDelayMs = 0;
    this.selectedPlacedTowerId = '';
    this.audio.playSfx('uiTap');
    return;
  }

  if (this.selectedPlacedTowerId) {
    if (utils.pointInRect(point.x, point.y, this.touchRects.upgradeButton)) {
      this.tryUpgradeTower(this.selectedPlacedTowerId);
      return;
    }
    if (utils.pointInRect(point.x, point.y, this.touchRects.sellButton)) {
      this.sellTower(this.selectedPlacedTowerId);
      return;
    }
  }

  if (this.trySelectBuildButton(point)) {
    this.selectedPlacedTowerId = '';
    return;
  }

  if (this.trySelectPlacedTower(point)) {
    return;
  }

  if (this.tryPlaceTower(point)) {
    return;
  }

  this.selectedPlacedTowerId = '';
};

DefenseMinigameRuntime.prototype.handleTouchMove = function () {
  return;
};

DefenseMinigameRuntime.prototype.handleTouchEnd = function () {
  return;
};

DefenseMinigameRuntime.prototype.handleTouchCancel = function () {
  return;
};

DefenseMinigameRuntime.prototype.findTitleStageAtPoint = function (point) {
  var rects = this.touchRects.titleStageButtons || {};
  var foundKey = '';

  Object.keys(rects).some(function (key) {
    if (utils.pointInRect(point.x, point.y, rects[key])) {
      foundKey = key;
      return true;
    }
    return false;
  });

  return foundKey;
};

DefenseMinigameRuntime.prototype.trySelectBuildButton = function (point) {
  var towerButtons = this.getTowerButtonRects();
  var foundKey = '';
  var towerType;

  Object.keys(towerButtons).some(function (key) {
    if (utils.pointInRect(point.x, point.y, towerButtons[key])) {
      foundKey = key;
      return true;
    }
    return false;
  });

  if (!foundKey) {
    return false;
  }

  this.selectedTowerKey = foundKey;
  towerType = this.stage.towerTypes[foundKey];
  if (towerType) {
    this.showHint('已选 ' + towerType.name + ' · ' + towerType.role + ' · ' + towerType.cost, 900);
  }
  this.audio.playSfx('uiTap');
  return true;
};

DefenseMinigameRuntime.prototype.trySelectPlacedTower = function (point) {
  var foundTower = null;

  this.towers.some(function (tower) {
    if (utils.pointInCircle(point.x, point.y, {
      x: tower.x,
      y: tower.y,
      radius: 26 * this.scale
    })) {
      foundTower = tower;
      return true;
    }
    return false;
  }, this);

  if (!foundTower) {
    return false;
  }

  this.selectedPlacedTowerId = foundTower.id;
  this.audio.playSfx('uiTap');
  return true;
};

DefenseMinigameRuntime.prototype.tryPlaceTower = function (point) {
  var slot = null;
  var towerType;
  var occupied;
  var towerId;

  if (!this.selectedTowerKey) {
    return false;
  }

  towerType = this.stage.towerTypes[this.selectedTowerKey];
  if (!towerType || this.gold < towerType.cost) {
    this.showHint('小鱼干不足', 900);
    return false;
  }

  this.stage.buildSlots.some(function (candidate) {
    if (utils.pointInCircle(point.x, point.y, candidate)) {
      slot = candidate;
      return true;
    }
    return false;
  });

  if (!slot) {
    this.showHint('请点击空塔位', 900);
    return false;
  }

  occupied = this.towers.some(function (tower) {
    return tower.slotId === slot.id;
  });
  if (occupied) {
    this.showHint('这里已经有猫塔了', 900);
    return false;
  }

  towerId = 'tower-' + this.nextEntityId;
  this.nextEntityId += 1;
  this.gold -= towerType.cost;
  this.towers.push({
    id: towerId,
    slotId: slot.id,
    typeKey: towerType.key,
    level: 1,
    x: slot.x,
    y: slot.y,
    cooldownMs: 0
  });
  this.selectedPlacedTowerId = towerId;
  this.showHint(towerType.name + ' 已就位', 850);
  this.audio.playSfx('towerPlace');
  return true;
};

DefenseMinigameRuntime.prototype.tryUpgradeTower = function (towerId) {
  var tower = this.findTowerById(towerId);
  var towerType;
  var nextLevelIndex;
  var cost;

  if (!tower) {
    return;
  }

  towerType = this.stage.towerTypes[tower.typeKey];
  nextLevelIndex = tower.level - 1;
  cost = towerType.upgradeCosts[nextLevelIndex];

  if (!cost) {
    this.showHint('已经满级', 900);
    return;
  }

  if (this.gold < cost) {
    this.showHint('小鱼干不足', 900);
    return;
  }

  this.gold -= cost;
  tower.level += 1;
  this.showHint(towerType.name + ' 升到 Lv.' + tower.level, 850);
  this.audio.playSfx('towerUpgrade');
};

DefenseMinigameRuntime.prototype.sellTower = function (towerId) {
  var tower = this.findTowerById(towerId);
  var towerType;
  var totalSpent;
  var i;

  if (!tower) {
    return;
  }

  towerType = this.stage.towerTypes[tower.typeKey];
  totalSpent = towerType.cost;
  for (i = 0; i < tower.level - 1; i += 1) {
    totalSpent += towerType.upgradeCosts[i] || 0;
  }
  this.gold += Math.round(totalSpent * 0.7);
  this.towers = this.towers.filter(function (candidate) {
    return candidate.id !== towerId;
  });
  this.selectedPlacedTowerId = '';
  this.showHint(towerType.name + ' 已卖出', 850);
  this.audio.playSfx('uiTap');
};

DefenseMinigameRuntime.prototype.findTowerById = function (towerId) {
  var i;
  for (i = 0; i < this.towers.length; i += 1) {
    if (this.towers[i].id === towerId) {
      return this.towers[i];
    }
  }
  return null;
};

DefenseMinigameRuntime.prototype.getWaveSummary = function (waveIndex) {
  var wave = this.stage && this.stage.waves ? this.stage.waves[waveIndex] : null;
  var counts = {};
  var orderedTypes = [];
  var segments = [];

  if (!wave) {
    return '';
  }

  wave.spawns.forEach(function (spawn) {
    if (!counts[spawn.type]) {
      counts[spawn.type] = 0;
      orderedTypes.push(spawn.type);
    }
    counts[spawn.type] += 1;
  });

  orderedTypes.forEach(function (typeKey) {
    var type = content.ENEMY_TYPES[typeKey];
    if (!type) {
      return;
    }
    segments.push(counts[typeKey] + type.name);
  });

  return segments.join(' · ');
};

DefenseMinigameRuntime.prototype.getTowerActionSummary = function (tower) {
  var towerType = this.stage.towerTypes[tower.typeKey];
  var nextIndex = tower.level - 1;
  var nextCost = towerType.upgradeCosts[nextIndex] || 0;
  var currentStats = this.getTowerStats(tower);
  var nextDamage;
  var nextRange;
  var totalSpent = towerType.cost;
  var i;

  for (i = 0; i < tower.level - 1; i += 1) {
    totalSpent += towerType.upgradeCosts[i] || 0;
  }

  nextDamage = nextCost ? towerType.upgradeDamage[nextIndex] : currentStats.damage;
  nextRange = nextCost ? towerType.upgradeRange[nextIndex] : currentStats.range;

  return {
    nextCost: nextCost,
    damageGain: Math.max(0, nextDamage - currentStats.damage),
    rangeGain: Math.max(0, Math.round(nextRange - currentStats.range)),
    refund: Math.round(totalSpent * 0.7)
  };
};

DefenseMinigameRuntime.prototype.getNearestPathPoint = function (x, y) {
  var bestPoint = null;
  var bestDistance = Infinity;
  var i;
  var from;
  var to;
  var dx;
  var dy;
  var lengthSq;
  var t;
  var px;
  var py;
  var distanceSq;

  if (!this.stage || !this.stage.path || this.stage.path.length < 2) {
    return null;
  }

  for (i = 0; i < this.stage.path.length - 1; i += 1) {
    from = this.stage.path[i];
    to = this.stage.path[i + 1];
    dx = to.x - from.x;
    dy = to.y - from.y;
    lengthSq = dx * dx + dy * dy || 1;
    t = ((x - from.x) * dx + (y - from.y) * dy) / lengthSq;
    t = utils.clamp(t, 0, 1);
    px = from.x + dx * t;
    py = from.y + dy * t;
    distanceSq = utils.distanceSquared(x, y, px, py);
    if (distanceSq < bestDistance) {
      bestDistance = distanceSq;
      bestPoint = { x: px, y: py };
    }
  }

  return bestPoint;
};

DefenseMinigameRuntime.prototype.update = function (dt, now) {
  if (this.state !== 'playing' || !this.stage) {
    return;
  }

  this.elapsedTime += dt;
  this.updateWaveFlow(dt);
  this.updateEnemies(dt);
  this.updateTowers(dt);
  this.updateProjectiles(dt);
  this.cleanupDefeatedEnemies();
  this.updateFeedbackMarks(dt);

  if (this.lives <= 0) {
    this.finishRun(false);
    return;
  }

  if (!this.waveInProgress && this.waveCursor >= this.stage.waves.length && this.enemies.length === 0 && this.pendingSpawns.length === 0) {
    this.finishRun(true);
  }
};

DefenseMinigameRuntime.prototype.updateWaveFlow = function (dt) {
  var dtMs = dt * 1000;
  var nextSpawn;

  if (!this.waveInProgress) {
    if (this.waveCursor < this.stage.waves.length) {
      this.nextWaveDelayMs = Math.max(0, this.nextWaveDelayMs - dtMs);
      if (this.nextWaveDelayMs <= 0) {
        this.startWave(this.waveCursor);
      }
    }
    return;
  }

  if (this.pendingSpawns.length > 0) {
    this.pendingSpawns[0].delayRemaining -= dtMs;
    while (this.pendingSpawns.length > 0 && this.pendingSpawns[0].delayRemaining <= 0) {
      nextSpawn = this.pendingSpawns.shift();
      this.spawnEnemy(nextSpawn.type);
      if (this.pendingSpawns.length > 0) {
        this.pendingSpawns[0].delayRemaining += nextSpawn.delayRemaining;
      }
    }
  }

  if (this.pendingSpawns.length === 0 && this.enemies.length === 0) {
    this.waveInProgress = false;
    this.clearedWaveCount = Math.max(this.clearedWaveCount, this.activeWaveNumber);
    if (this.waveCursor < this.stage.waves.length) {
      this.showBanner('第 ' + this.activeWaveNumber + ' 波清场', '准备下一波防守', 1500);
    } else {
      this.showBanner('全部敌人清空', '金枪鱼罐头守住了', 1800);
    }
    if (this.waveCursor < this.stage.waves.length) {
      this.nextWaveDelayMs = this.stage.waveDelayMs;
    }
  }
};

DefenseMinigameRuntime.prototype.startWave = function (waveIndex) {
  var wave = this.stage.waves[waveIndex];
  var summary = this.getWaveSummary(waveIndex);
  this.waveInProgress = true;
  this.waveCursor = waveIndex + 1;
  this.activeWaveNumber = this.waveCursor;
  this.waveThreatShown = {};
  this.pendingSpawns = wave.spawns.map(function (spawn) {
    return {
      type: spawn.type,
      delayRemaining: spawn.delay
    };
  });
  this.showBanner(wave.label + ' 来袭', summary || '准备拦住所有敌人', 1800);
  this.audio.playSfx('waveStart');
};

DefenseMinigameRuntime.prototype.spawnEnemy = function (typeKey) {
  var enemyType = this.stage.enemyTypes[typeKey];
  var startPoint = this.stage.path[0];
  var id = 'enemy-' + this.nextEntityId;

  this.nextEntityId += 1;
  this.enemies.push({
    id: id,
    typeKey: typeKey,
    width: enemyType.size * this.scale,
    height: enemyType.size * this.scale,
    x: startPoint.x - (enemyType.size * this.scale) / 2,
    y: startPoint.y - (enemyType.size * this.scale) / 2,
    speed: enemyType.speed * this.scale,
    maxHealth: enemyType.maxHealth,
    health: enemyType.maxHealth,
    reward: enemyType.reward,
    damage: enemyType.damage,
    waypointIndex: 0,
    progress: 0,
    slowUntil: 0,
    slowAmount: 1,
    isDead: false
  });
  this.showEnemyThreatCue(typeKey);
};

DefenseMinigameRuntime.prototype.showEnemyThreatCue = function (typeKey) {
  if (this.waveThreatShown[typeKey]) {
    return;
  }

  if (typeKey === 'vacuum') {
    this.waveThreatShown[typeKey] = true;
    this.showBanner(
      '重甲敌人出现',
      this.stage && this.stage.key === 'kitchen_loop' ? '减速塔更适合拖住它们' : '优先集火，别让它拖过拐点',
      1450
    );
    return;
  }

  if (typeKey === 'mailman') {
    this.waveThreatShown[typeKey] = true;
    this.showBanner('首领进入路线', '集中火力守住最后一波', 1650);
  }
};

DefenseMinigameRuntime.prototype.isEnemyPressuringTarget = function (enemy) {
  return !!this.stage && enemy && !enemy.isDead && enemy.waypointIndex >= this.stage.path.length - 2;
};

DefenseMinigameRuntime.prototype.isTargetUnderPressure = function () {
  var self = this;
  return this.enemies.some(function (enemy) {
    return self.isEnemyPressuringTarget(enemy);
  });
};

DefenseMinigameRuntime.prototype.updateEnemies = function (dt) {
  var reachedTargetIds = [];
  var now = Date.now();
  var self = this;

  this.enemies.forEach(function (enemy) {
    var nextWaypoint;
    var centerX;
    var centerY;
    var dx;
    var dy;
    var dist;
    var speedFactor;
    var step;

    if (enemy.isDead) {
      return;
    }

    nextWaypoint = self.stage.path[enemy.waypointIndex + 1];
    if (!nextWaypoint) {
      reachedTargetIds.push(enemy.id);
      return;
    }

    centerX = enemy.x + enemy.width / 2;
    centerY = enemy.y + enemy.height / 2;
    dx = nextWaypoint.x - centerX;
    dy = nextWaypoint.y - centerY;
    dist = Math.sqrt(dx * dx + dy * dy) || 1;
    speedFactor = Date.now() < enemy.slowUntil ? enemy.slowAmount : 1;
    step = enemy.speed * speedFactor * dt;

    if (dist <= step) {
      enemy.x = nextWaypoint.x - enemy.width / 2;
      enemy.y = nextWaypoint.y - enemy.height / 2;
      enemy.progress += dist;
      enemy.waypointIndex += 1;
      if (enemy.waypointIndex >= self.stage.path.length - 1) {
        reachedTargetIds.push(enemy.id);
      }
      return;
    }

    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
    enemy.progress += step;

    if (self.isEnemyPressuringTarget(enemy) && now - self.lastPressureCueAt > 1800) {
      self.lastPressureCueAt = now;
      self.showHint('警报：敌人逼近' + self.stage.target.label, 1000);
    }
  });

  if (reachedTargetIds.length) {
    this.audio.playSfx('targetHit');
    this.enemies = this.enemies.filter(function (enemy) {
      if (reachedTargetIds.indexOf(enemy.id) >= 0) {
        self.lives -= enemy.damage;
        self.pushFeedbackMark('targetHit', self.stage.target.x, self.stage.target.y, {
          radius: 26 * self.scale,
          tint: DANGER,
          lifetime: 0.46
        });
        return false;
      }
      return true;
    });
  }
};

DefenseMinigameRuntime.prototype.getTowerStats = function (tower) {
  var towerType = this.stage.towerTypes[tower.typeKey];
  var levelIndex = tower.level - 1;
  return {
    cost: towerType.cost,
    range: levelIndex === 0 ? towerType.range : towerType.upgradeRange[levelIndex - 1],
    fireRate: towerType.fireRate,
    damage: levelIndex === 0 ? towerType.damage : towerType.upgradeDamage[levelIndex - 1],
    projectileSpeed: towerType.projectileSpeed,
    projectileType: towerType.projectileType,
    splashRadius: towerType.splashRadius || 0,
    slowAmount: towerType.slowAmount || 1,
    slowDuration: towerType.slowDuration || 0,
    tint: towerType.tint,
    name: towerType.name,
    role: towerType.role
  };
};

DefenseMinigameRuntime.prototype.updateTowers = function (dt) {
  var dtMs = dt * 1000;
  var self = this;

  this.towers.forEach(function (tower) {
    var stats;
    var target;
    var projectile;

    tower.cooldownMs = Math.max(0, tower.cooldownMs - dtMs);
    stats = self.getTowerStats(tower);
    if (tower.cooldownMs > 0) {
      return;
    }

    target = self.acquireTargetForTower(tower, stats.range * self.scale);
    if (!target) {
      return;
    }

    projectile = self.createTowerProjectile(tower, stats, target);
    if (projectile) {
      self.projectiles.push(projectile);
      tower.cooldownMs = 1000 / stats.fireRate;
    }
  });
};

DefenseMinigameRuntime.prototype.acquireTargetForTower = function (tower, range) {
  var bestTarget = null;
  var bestProgress = -1;
  var rangeSq = range * range;

  this.enemies.forEach(function (enemy) {
    var centerX;
    var centerY;
    if (enemy.isDead) {
      return;
    }
    centerX = enemy.x + enemy.width / 2;
    centerY = enemy.y + enemy.height / 2;
    if (utils.distanceSquared(tower.x, tower.y, centerX, centerY) > rangeSq) {
      return;
    }
    if (enemy.progress > bestProgress) {
      bestProgress = enemy.progress;
      bestTarget = enemy;
    }
  });

  return bestTarget;
};

DefenseMinigameRuntime.prototype.createTowerProjectile = function (tower, stats, target) {
  var startX = tower.x;
  var startY = tower.y;
  var projectile = {
    x: startX,
    y: startY,
    age: 0,
    lifetime: 2.1,
    speed: stats.projectileSpeed * this.scale,
    damage: stats.damage,
    tint: stats.tint,
    kind: stats.projectileType,
    splashRadius: stats.splashRadius * this.scale,
    slowAmount: stats.slowAmount,
    slowDuration: stats.slowDuration
  };

  if (stats.projectileType === 'bun') {
    projectile.targetEnemy = target;
    projectile.targetX = target.x + target.width / 2;
    projectile.targetY = target.y + target.height / 2;
  } else {
    projectile.targetEnemy = target;
  }

  return projectile;
};

DefenseMinigameRuntime.prototype.updateProjectiles = function (dt) {
  var dtMs = dt * 1000;
  var self = this;

  this.projectiles = this.projectiles.filter(function (projectile) {
    var target;
    var targetX;
    var targetY;
    var dx;
    var dy;
    var dist;
    var step;

    projectile.age += dt;
    if (projectile.age >= projectile.lifetime) {
      return false;
    }

    target = projectile.targetEnemy;
    if (projectile.kind === 'bun') {
      targetX = projectile.targetX;
      targetY = projectile.targetY;
    } else {
      if (!target || target.isDead) {
        return false;
      }
      targetX = target.x + target.width / 2;
      targetY = target.y + target.height / 2;
    }

    dx = targetX - projectile.x;
    dy = targetY - projectile.y;
    dist = Math.sqrt(dx * dx + dy * dy) || 1;
    step = projectile.speed * dt;

    if (dist <= step) {
      projectile.x = targetX;
      projectile.y = targetY;
      self.resolveProjectileImpact(projectile, targetX, targetY);
      return false;
    }

    projectile.x += (dx / dist) * step;
    projectile.y += (dy / dist) * step;
    return true;
  });
};

DefenseMinigameRuntime.prototype.resolveProjectileImpact = function (projectile, x, y) {
  var impactRadius = projectile.splashRadius || 0;
  var hitCount = 0;
  var impactKind = projectile.kind === 'bone' ? 'sniperHit' : (projectile.kind === 'bun' ? 'splashHit' : (projectile.kind === 'boba' ? 'slowHit' : 'rapidHit'));

  this.enemies.forEach(function (enemy) {
    var centerX;
    var centerY;
    var hitRadius;
    if (enemy.isDead) {
      return;
    }
    centerX = enemy.x + enemy.width / 2;
    centerY = enemy.y + enemy.height / 2;
    hitRadius = impactRadius > 0 ? impactRadius : (enemy.width * 0.5 + 12 * this.scale);
    if (utils.distanceSquared(centerX, centerY, x, y) <= hitRadius * hitRadius) {
      this.applyDamageToEnemy(enemy, projectile.damage);
      if (projectile.kind === 'boba' && projectile.slowDuration > 0) {
        enemy.slowUntil = Date.now() + projectile.slowDuration;
        enemy.slowAmount = projectile.slowAmount;
      }
      hitCount += 1;
    }
  }, this);

  if (hitCount > 0) {
    this.pushFeedbackMark(impactKind, x, y, {
      radius: impactRadius > 0 ? Math.max(14 * this.scale, impactRadius * 0.58) : 16 * this.scale,
      tint: projectile.tint,
      lifetime: projectile.kind === 'bone' ? 0.22 : 0.18
    });
  }

  return hitCount;
};

DefenseMinigameRuntime.prototype.applyDamageToEnemy = function (enemy, damage) {
  enemy.health -= damage;
  if (enemy.health <= 0 && !enemy.isDead) {
    enemy.isDead = true;
    this.gold += enemy.reward;
    this.kills += 1;
    this.audio.playSfx('enemyDown');
    this.pushFeedbackMark('enemyDown', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, {
      radius: Math.max(16 * this.scale, enemy.width * 0.5),
      tint: SUCCESS,
      lifetime: 0.4
    });
  }
};

DefenseMinigameRuntime.prototype.cleanupDefeatedEnemies = function () {
  var activeLeft = this.enemies.filter(function (enemy) {
    return !enemy.isDead;
  });
  this.enemies = activeLeft;
};

DefenseMinigameRuntime.prototype.updateFeedbackMarks = function (dt) {
  this.feedbackMarks = this.feedbackMarks.filter(function (mark) {
    mark.age += dt;
    return mark.age < mark.lifetime;
  });
};

DefenseMinigameRuntime.prototype.getTowerButtonRects = function () {
  var sections = this.getHudSectionRects();
  var area = sections.towerButtonArea || sections.towerGroup;
  var gap = sections.compactHud ? this.getScaledSize(6, 6, 8) : this.getScaledSize(10, 8, 10);
  var buttonWidth = (area.width - gap * 3) / 4;
  var x = area.x;
  var y = area.y;

  return {
    tabby: { x: x, y: y, width: buttonWidth, height: area.height },
    siamese: { x: x + (buttonWidth + gap), y: y, width: buttonWidth, height: area.height },
    chonky: { x: x + (buttonWidth + gap) * 2, y: y, width: buttonWidth, height: area.height },
    boba: { x: x + (buttonWidth + gap) * 3, y: y, width: buttonWidth, height: area.height }
  };
};

DefenseMinigameRuntime.prototype.getBottomBarRect = function () {
  return this.getGameplayHudLayout().bottomBar;
};

DefenseMinigameRuntime.prototype.getPauseRect = function () {
  return this.getGameplayHudLayout().pauseRect;
};

DefenseMinigameRuntime.prototype.getWaveButtonRect = function () {
  return this.getGameplayHudLayout().waveButton;
};

DefenseMinigameRuntime.prototype.getHudSectionRects = function () {
  var layout = this.getGameplayHudLayout();
  return {
    towerGroup: layout.towerGroup,
    waveGroup: layout.waveGroup,
    towerButtonArea: layout.towerButtonArea,
    compactHud: layout.compactHud
  };
};

DefenseMinigameRuntime.prototype.getSelectedTowerPanelRect = function () {
  var bar = this.getBottomBarRect();
  var panelGap = this.getScaledSize(12, 10, 14);
  var panelHeight = this.getScaledSize(122, 100, 128);

  return {
    x: bar.x,
    y: bar.y - panelGap - panelHeight,
    width: bar.width,
    height: panelHeight
  };
};

DefenseMinigameRuntime.prototype.getGameplayHudLayout = function () {
  var metrics = this.getUiMetrics();
  var safe = this.getSafeInsets();
  var leftInset = safe.left + metrics.pageMargin;
  var rightInset = safe.right + metrics.pageMargin;
  var topInset = safe.top + metrics.edgeGap;
  var pauseRect = {
    x: this.width - rightInset - metrics.pauseButtonSize,
    y: topInset,
    width: metrics.pauseButtonSize,
    height: metrics.pauseButtonSize
  };
  var topCard = {
    x: leftInset,
    y: topInset,
    width: pauseRect.x - leftInset - metrics.sectionGap,
    height: metrics.topHudCardHeight
  };
  var bottomBar = {
    x: leftInset,
    y: this.height - safe.bottom - metrics.bottomBarHeight,
    width: this.width - leftInset - rightInset,
    height: metrics.bottomBarHeight
  };
  var groupPaddingX = this.getScaledSize(12, 10, 14);
  var groupPaddingY = this.getScaledSize(10, 8, 12);
  var waveGroupWidth = this.getScaledSize(100, 84, 104);
  var compactHud = bottomBar.width < 388;
  var groupHeaderSpace = compactHud ? this.getScaledSize(18, 16, 20) : this.getScaledSize(34, 30, 36);
  var summarySpace = compactHud ? this.getScaledSize(18, 16, 20) : this.getScaledSize(20, 18, 22);
  var groupFooterSpace = compactHud ? summarySpace + this.getScaledSize(6, 6, 8) : summarySpace + this.getScaledSize(10, 8, 12);
  var towerGroup;
  var waveGroup;
  var towerButtonArea;
  var waveButton;

  towerGroup = {
    x: bottomBar.x + groupPaddingX,
    y: bottomBar.y + groupPaddingY,
    width: bottomBar.width - groupPaddingX * 2 - metrics.groupGap - waveGroupWidth,
    height: bottomBar.height - groupPaddingY * 2
  };
  waveGroup = {
    x: towerGroup.x + towerGroup.width + metrics.groupGap,
    y: towerGroup.y,
    width: waveGroupWidth,
    height: towerGroup.height
  };
  towerButtonArea = {
    x: towerGroup.x,
    y: towerGroup.y + groupHeaderSpace,
    width: towerGroup.width,
    height: towerGroup.height - groupHeaderSpace - groupFooterSpace
  };
  waveButton = {
    x: waveGroup.x + this.getScaledSize(6, 6, 8),
    y: waveGroup.y + groupHeaderSpace,
    width: waveGroup.width - this.getScaledSize(12, 12, 16),
    height: waveGroup.height - groupHeaderSpace - groupFooterSpace
  };

  return {
    topCard: topCard,
    pauseRect: pauseRect,
    bottomBar: bottomBar,
    towerGroup: towerGroup,
    waveGroup: waveGroup,
    towerButtonArea: towerButtonArea,
    waveButton: waveButton,
    compactHud: compactHud,
    bottomSummaryY: bottomBar.y + bottomBar.height - this.getScaledSize(14, 12, 16)
  };
};

DefenseMinigameRuntime.prototype.getTitleLayout = function () {
  var metrics = this.getUiMetrics();
  var safe = this.getSafeInsets();
  var panelX = safe.left + metrics.pageMargin;
  var panelWidth = this.width - safe.left - safe.right - metrics.pageMargin * 2;
  var titleY = safe.top + metrics.edgeGap + metrics.titleFont * 0.52;
  var sloganY = titleY + this.getScaledSize(32, 26, 36);
  var basePanelY = sloganY + this.getScaledSize(22, 18, 26);
  var availablePanelHeight = this.height - basePanelY - safe.bottom - metrics.pageMargin;
  var panelHeight = Math.min(availablePanelHeight, this.getScaledSize(620, 520, 640));
  var panelY = basePanelY + Math.max(0, Math.min(this.getScaledSize(24, 12, 28), (availablePanelHeight - panelHeight) * 0.26));
  var innerPadX = this.getScaledSize(18, 14, 20);
  var innerPadY = this.getScaledSize(18, 14, 20);
  var toggleGap = this.getScaledSize(8, 6, 10);
  var toggleWidth = this.getScaledSize(58, 50, 64);
  var badgeAvailableWidth = panelWidth - innerPadX * 2 - toggleWidth * 2 - toggleGap * 2;
  var stageGap = this.getScaledSize(12, 8, 14);
  var stageWidth = (panelWidth - innerPadX * 2 - stageGap) / 2;
  var stageX = panelX + innerPadX;
  var stageHeight = this.getScaledSize(74, 64, 76);
  var cardGapX = this.getScaledSize(12, 8, 14);
  var cardGapY = this.getScaledSize(10, 8, 12);
  var cardWidth = (panelWidth - innerPadX * 2 - cardGapX) / 2;
  var cardHeight = this.getScaledSize(64, 54, 66);
  var startButtonWidth = Math.min(panelWidth - innerPadX * 2, this.getScaledSize(216, 180, 224));
  var startButtonHeight = metrics.primaryButtonHeight + (metrics.compact ? 0 : this.getScaledSize(4, 2, 6));
  var startButtonY = panelY + panelHeight - innerPadY - startButtonHeight;
  var footerTextY = startButtonY - this.getScaledSize(26, 20, 30);
  var footerLineY = footerTextY - this.getScaledSize(18, 14, 22);
  var cardsY = footerLineY - this.getScaledSize(18, 14, 22) - (cardHeight * 2 + cardGapY);
  var stageY = cardsY - this.getScaledSize(18, 14, 22) - stageHeight;
  var stageLabelY = stageY - this.getScaledSize(18, 14, 20);
  var badgeY = panelY + innerPadY;
  var gapToHero = this.getScaledSize(18, 12, 20);
  var gapBelowHero = this.getScaledSize(16, 12, 18);
  var descGap = this.getScaledSize(28, 20, 30);
  var heroSize = this.getScaledSize(84, 68, 86);
  var minHeroSize = this.getScaledSize(70, 60, 72);
  var minDescGap = this.getScaledSize(22, 18, 24);
  var descCount = gameMeta.GAME_DESCRIPTION.length;
  var availableTopHeight = stageLabelY - this.getScaledSize(18, 12, 20) - (badgeY + metrics.badgeHeight);
  var neededTopHeight = gapToHero + heroSize + gapBelowHero + descGap * Math.max(0, descCount - 1);
  var overflow = neededTopHeight - availableTopHeight;
  var descStartY;
  var heroY;

  if (overflow > 0) {
    heroSize = Math.max(minHeroSize, heroSize - overflow);
    overflow = gapToHero + heroSize + gapBelowHero + descGap * Math.max(0, descCount - 1) - availableTopHeight;
  }
  if (overflow > 0 && descCount > 1) {
    descGap = Math.max(minDescGap, descGap - overflow / (descCount - 1));
    overflow = gapToHero + heroSize + gapBelowHero + descGap * (descCount - 1) - availableTopHeight;
  }
  if (overflow > 0) {
    gapToHero = Math.max(this.getScaledSize(12, 10, 14), gapToHero - overflow / 2);
    gapBelowHero = Math.max(this.getScaledSize(10, 8, 12), gapBelowHero - overflow / 2);
  }

  heroY = badgeY + metrics.badgeHeight + gapToHero + heroSize / 2;
  descStartY = heroY + heroSize / 2 + gapBelowHero;

  return {
    panel: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight
    },
    titleY: titleY,
    sloganY: sloganY,
    heroY: heroY,
    heroSize: heroSize,
    descStartY: descStartY,
    descGap: descGap,
    descWidth: panelWidth - innerPadX * 2 - this.getScaledSize(12, 8, 16),
    stageLabelY: stageLabelY,
    footerLineY: footerLineY,
    footerTextY: footerTextY,
    badgeY: badgeY,
    badgeWidth: Math.min(Math.max(this.getScaledSize(116, 104, 124), badgeAvailableWidth), this.getScaledSize(156, 136, 168)),
    panelPaddingX: innerPadX,
    titleIconOffset: Math.min(panelWidth * 0.34, this.getScaledSize(106, 82, 108)),
    audioButtons: {
      music: {
        x: panelX + innerPadX,
        y: badgeY,
        width: toggleWidth,
        height: metrics.badgeHeight
      },
      sfx: {
        x: panelX + panelWidth - innerPadX - toggleWidth,
        y: badgeY,
        width: toggleWidth,
        height: metrics.badgeHeight
      }
    },
    stageButtons: {
      living_room: {
        x: stageX,
        y: stageY,
        width: stageWidth,
        height: stageHeight
      },
      kitchen_loop: {
        x: stageX + stageWidth + stageGap,
        y: stageY,
        width: stageWidth,
        height: stageHeight
      }
    },
    towerCards: {
      x: panelX + innerPadX,
      y: cardsY,
      width: cardWidth,
      height: cardHeight,
      gapX: cardGapX,
      gapY: cardGapY
    },
    startButton: {
      x: panelX + (panelWidth - startButtonWidth) / 2,
      y: startButtonY,
      width: startButtonWidth,
      height: startButtonHeight
    }
  };
};

DefenseMinigameRuntime.prototype.getTitleStartButtonRect = function () {
  return this.getTitleLayout().startButton;
};

DefenseMinigameRuntime.prototype.getTitleStageButtonRects = function () {
  return this.getTitleLayout().stageButtons;
};

DefenseMinigameRuntime.prototype.getTitleAudioButtonRects = function () {
  return this.getTitleLayout().audioButtons;
};

DefenseMinigameRuntime.prototype.getPauseOverlayLayout = function () {
  var metrics = this.getUiMetrics();
  var safe = this.getSafeInsets();
  var availableWidth = this.width - safe.left - safe.right - metrics.pageMargin * 2;
  var availableHeight = this.height - safe.top - safe.bottom - metrics.pageMargin * 2;
  var panelWidth = Math.min(availableWidth, this.getScaledSize(362, 288, 362));
  var panelX = safe.left + metrics.pageMargin + (availableWidth - panelWidth) / 2;
  var topPad = this.getScaledSize(16, 14, 18);
  var toggleInset = this.getScaledSize(18, 14, 20);
  var toggleGap = this.getScaledSize(8, 6, 10);
  var toggleWidth = this.getScaledSize(62, 54, 66);
  var badgeWidth = Math.min(Math.max(this.getScaledSize(104, 96, 112), panelWidth - toggleInset * 2 - toggleWidth * 2 - toggleGap * 2), this.getScaledSize(132, 120, 136));
  var metricGap = this.getScaledSize(10, 8, 12);
  var metricWidth = (panelWidth - 48 * this.scale - metricGap) / 2;
  var metricHeight = this.getScaledSize(58, 52, 60);
  var titleYFromTop = topPad + metrics.badgeHeight + this.getScaledSize(12, 10, 14);
  var subtitleYFromTop = titleYFromTop + this.getScaledSize(24, 22, 26);
  var sectionLineYFromTop = subtitleYFromTop + this.getScaledSize(20, 18, 22);
  var row1YFromTop = sectionLineYFromTop + this.getScaledSize(16, 14, 18);
  var row2YFromTop = row1YFromTop + metricHeight + this.getScaledSize(12, 10, 14);
  var buttonWidth = panelWidth - this.getScaledSize(88, 64, 92);
  var buttonHeight = metrics.primaryButtonHeight;
  var buttonGap = this.getScaledSize(8, 8, 10);
  var firstButtonYFromTop = row2YFromTop + metricHeight + this.getScaledSize(18, 16, 20);
  var requiredHeight = firstButtonYFromTop + buttonHeight * 3 + buttonGap * 2 + this.getScaledSize(16, 14, 18);
  var panelHeight = Math.min(availableHeight, Math.max(this.getScaledSize(422, 360, 422), requiredHeight));
  var panelY = safe.top + metrics.pageMargin + (availableHeight - panelHeight) / 2;
  var buttonX = panelX + (panelWidth - buttonWidth) / 2;
  var badgeTop = panelY + topPad;
  var titleY = panelY + titleYFromTop;
  var subtitleY = panelY + subtitleYFromTop;
  var sectionLineY = panelY + sectionLineYFromTop;
  var row1Y = panelY + row1YFromTop;
  var row2Y = panelY + row2YFromTop;
  var firstButtonY = panelY + firstButtonYFromTop;

  return {
    panel: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight
    },
    badgeY: badgeTop,
    badgeWidth: badgeWidth,
    titleY: titleY,
    subtitleY: subtitleY,
    sectionLineY: sectionLineY,
    audioButtons: {
      music: {
        x: panelX + toggleInset,
        y: badgeTop,
        width: toggleWidth,
        height: metrics.badgeHeight
      },
      sfx: {
        x: panelX + panelWidth - toggleInset - toggleWidth,
        y: badgeTop,
        width: toggleWidth,
        height: metrics.badgeHeight
      }
    },
    row1Left: { x: panelX + 24 * this.scale, y: row1Y, width: metricWidth, height: metricHeight },
    row1Right: { x: panelX + 24 * this.scale + metricWidth + metricGap, y: row1Y, width: metricWidth, height: metricHeight },
    row2Full: { x: panelX + 24 * this.scale, y: row2Y, width: panelWidth - 48 * this.scale, height: metricHeight },
    buttons: {
      primary: { x: buttonX, y: firstButtonY, width: buttonWidth, height: buttonHeight },
      secondary: { x: buttonX, y: firstButtonY + buttonHeight + buttonGap, width: buttonWidth, height: buttonHeight },
      tertiary: { x: buttonX, y: firstButtonY + (buttonHeight + buttonGap) * 2, width: buttonWidth, height: buttonHeight }
    }
  };
};

DefenseMinigameRuntime.prototype.getResultOverlayLayout = function () {
  var metrics = this.getUiMetrics();
  var safe = this.getSafeInsets();
  var availableWidth = this.width - safe.left - safe.right - metrics.pageMargin * 2;
  var availableHeight = this.height - safe.top - safe.bottom - metrics.pageMargin * 2;
  var panelWidth = Math.min(availableWidth, this.getScaledSize(362, 288, 362));
  var panelX = safe.left + metrics.pageMargin + (availableWidth - panelWidth) / 2;
  var topPad = this.getScaledSize(16, 14, 18);
  var metricGap = this.getScaledSize(10, 8, 12);
  var metricWidth = (panelWidth - 48 * this.scale - metricGap) / 2;
  var metricHeight = this.getScaledSize(60, 54, 62);
  var titleYFromTop = topPad + metrics.badgeHeight + this.getScaledSize(12, 10, 14);
  var summaryYFromTop = titleYFromTop + this.getScaledSize(22, 20, 24);
  var detailYFromTop = summaryYFromTop + this.getScaledSize(20, 18, 22);
  var sectionLineYFromTop = detailYFromTop + this.getScaledSize(16, 14, 18);
  var row1YFromTop = sectionLineYFromTop + this.getScaledSize(16, 14, 18);
  var row2YFromTop = row1YFromTop + metricHeight + this.getScaledSize(12, 10, 14);
  var buttonWidth = panelWidth - this.getScaledSize(88, 64, 92);
  var buttonHeight = metrics.primaryButtonHeight;
  var buttonGap = this.getScaledSize(8, 8, 10);
  var firstButtonYFromTop = row2YFromTop + metricHeight + this.getScaledSize(18, 16, 22);
  var requiredHeight = firstButtonYFromTop + buttonHeight * 2 + buttonGap + this.getScaledSize(16, 14, 18);
  var panelHeight = Math.min(availableHeight, Math.max(this.getScaledSize(380, 336, 380), requiredHeight));
  var panelY = safe.top + metrics.pageMargin + (availableHeight - panelHeight) / 2;
  var buttonX = panelX + (panelWidth - buttonWidth) / 2;
  var badgeY = panelY + topPad;
  var titleY = panelY + titleYFromTop;
  var summaryY = panelY + summaryYFromTop;
  var detailY = panelY + detailYFromTop;
  var sectionLineY = panelY + sectionLineYFromTop;
  var row1Y = panelY + row1YFromTop;
  var row2Y = panelY + row2YFromTop;
  var firstButtonY = panelY + firstButtonYFromTop;

  return {
    panel: {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight
    },
    badgeY: badgeY,
    titleY: titleY,
    summaryY: summaryY,
    detailY: detailY,
    sectionLineY: sectionLineY,
    row1Left: { x: panelX + 24 * this.scale, y: row1Y, width: metricWidth, height: metricHeight },
    row1Right: { x: panelX + 24 * this.scale + metricWidth + metricGap, y: row1Y, width: metricWidth, height: metricHeight },
    row2Left: { x: panelX + 24 * this.scale, y: row2Y, width: metricWidth, height: metricHeight },
    row2Right: { x: panelX + 24 * this.scale + metricWidth + metricGap, y: row2Y, width: metricWidth, height: metricHeight },
    buttons: {
      primary: { x: buttonX, y: firstButtonY, width: buttonWidth, height: buttonHeight },
      secondary: { x: buttonX, y: firstButtonY + buttonHeight + buttonGap, width: buttonWidth, height: buttonHeight }
    }
  };
};

DefenseMinigameRuntime.prototype.getModalLayout = function () {
  return {
    panel: this.getPauseOverlayLayout().panel
  };
};

DefenseMinigameRuntime.prototype.getPauseAudioButtonRects = function () {
  return this.getPauseOverlayLayout().audioButtons;
};

DefenseMinigameRuntime.prototype.getSelectedTowerActionRects = function (panel) {
  var buttonWidth = this.getScaledSize(70, 68, 74);
  var buttonHeight = this.getScaledSize(32, 30, 34);
  var insetRight = this.getScaledSize(20, 14, 24);
  var gap = this.getScaledSize(8, 6, 8);
  var stackHeight = buttonHeight * 2 + gap;
  var topOffset = (panel.height - stackHeight) / 2;

  return {
    upgradeButton: {
      x: panel.x + panel.width - insetRight - buttonWidth,
      y: panel.y + topOffset,
      width: buttonWidth,
      height: buttonHeight
    },
    sellButton: {
      x: panel.x + panel.width - insetRight - buttonWidth,
      y: panel.y + topOffset + buttonHeight + gap,
      width: buttonWidth,
      height: buttonHeight
    }
  };
};

DefenseMinigameRuntime.prototype.getSelectedTowerPanelLayout = function () {
  var panel = this.getSelectedTowerPanelRect();
  var actions = this.getSelectedTowerActionRects(panel);
  var contentInsetLeft = this.getScaledSize(18, 14, 20);
  var contentGapRight = this.getScaledSize(16, 12, 18);
  var metricGap = this.getScaledSize(8, 6, 8);
  var contentX = panel.x + contentInsetLeft;
  var contentWidth = Math.max(this.getScaledSize(124, 116, 138), actions.upgradeButton.x - contentX - contentGapRight);
  var titleY = panel.y + this.getScaledSize(22, 18, 24);
  var metricY = titleY + this.getScaledSize(18, 16, 20);
  var summaryY = panel.y + panel.height - this.getScaledSize(18, 14, 20);
  var metricHeight = Math.max(
    this.getScaledSize(32, 30, 34),
    Math.min(this.getScaledSize(40, 36, 42), summaryY - metricY - this.getScaledSize(8, 6, 10))
  );
  var metricWidth = (contentWidth - metricGap) / 2;

  return {
    panel: panel,
    actions: actions,
    titleX: contentX,
    titleY: titleY,
    titleWidth: contentWidth,
    summaryX: contentX,
    summaryY: summaryY,
    summaryWidth: contentWidth,
    statCards: {
      damage: {
        x: contentX,
        y: metricY,
        width: metricWidth,
        height: metricHeight
      },
      range: {
        x: contentX + metricWidth + metricGap,
        y: metricY,
        width: metricWidth,
        height: metricHeight
      }
    }
  };
};

DefenseMinigameRuntime.prototype.rebuildTouchRects = function () {
  var selectedTowerPanel = this.state === 'playing' && this.selectedPlacedTowerId ? this.getSelectedTowerPanelRect() : null;
  var titleLayout = this.getTitleLayout();
  var pauseLayout = this.getPauseOverlayLayout();
  var resultLayout = this.getResultOverlayLayout();
  var towerActions;

  this.touchRects.pauseButton = this.stage ? this.getPauseRect() : null;
  this.touchRects.waveButton = this.stage ? this.getWaveButtonRect() : null;
  this.touchRects.titleStartButton = titleLayout.startButton;
  this.touchRects.titleStageButtons = titleLayout.stageButtons;
  this.touchRects.titleMusicButton = titleLayout.audioButtons.music;
  this.touchRects.titleSfxButton = titleLayout.audioButtons.sfx;

  if (selectedTowerPanel) {
    towerActions = this.getSelectedTowerActionRects(selectedTowerPanel);
    this.touchRects.upgradeButton = towerActions.upgradeButton;
    this.touchRects.sellButton = towerActions.sellButton;
  } else {
    this.touchRects.upgradeButton = null;
    this.touchRects.sellButton = null;
  }

  this.touchRects.pauseResumeButton = pauseLayout.buttons.primary;
  this.touchRects.pauseRestartButton = pauseLayout.buttons.secondary;
  this.touchRects.pauseBackButton = pauseLayout.buttons.tertiary;
  this.touchRects.pauseMusicButton = pauseLayout.audioButtons.music;
  this.touchRects.pauseSfxButton = pauseLayout.audioButtons.sfx;
  this.touchRects.resultPrimaryButton = resultLayout.buttons.primary;
  this.touchRects.resultBackButton = resultLayout.buttons.secondary;
};

DefenseMinigameRuntime.prototype.render = function () {
  this.rebuildTouchRects();
  this.ctx.clearRect(0, 0, this.width, this.height);
  this.drawBackground();

  if (this.state === 'title') {
    this.renderTitle();
    return;
  }

  if (this.stage) {
    this.renderStage();
  }

  if (this.state === 'playing') {
    this.renderGameplayHud();
    this.drawGameplayCue();
  } else if (this.state === 'paused') {
    this.renderGameplayHud();
    this.renderPauseOverlay();
  } else if (this.state === 'victory') {
    this.renderResultOverlay(true);
  } else if (this.state === 'gameover') {
    this.renderResultOverlay(false);
  }
};

DefenseMinigameRuntime.prototype.drawBackground = function () {
  var gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
  var bgImage = this.assets.get('livingRoomBg');
  gradient.addColorStop(0, BG_TOP);
  gradient.addColorStop(1, BG_BOTTOM);
  this.ctx.fillStyle = gradient;
  this.ctx.fillRect(0, 0, this.width, this.height);

  if (bgImage) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    this.ctx.drawImage(bgImage, 0, 0, this.width, this.height);
    this.ctx.restore();
  }

  this.ctx.save();
  this.ctx.globalAlpha = 0.08;
  this.ctx.strokeStyle = 'rgba(92, 72, 40, 0.45)';
  this.ctx.lineWidth = 1.5 * this.scale;
  this.ctx.beginPath();
  this.ctx.arc(66 * this.scale, 76 * this.scale, 28 * this.scale, 0, Math.PI * 2);
  this.ctx.stroke();
  this.ctx.beginPath();
  this.ctx.arc(this.width - 68 * this.scale, 112 * this.scale, 36 * this.scale, 0, Math.PI * 2);
  this.ctx.stroke();
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.buildRoundRectPath = function (x, y, width, height, radius) {
  var safeRadius = Math.min(radius, width / 2, height / 2);

  this.ctx.beginPath();
  this.ctx.moveTo(x + safeRadius, y);
  this.ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  this.ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  this.ctx.arcTo(x, y + height, x, y, safeRadius);
  this.ctx.arcTo(x, y, x + width, y, safeRadius);
  this.ctx.closePath();
};

DefenseMinigameRuntime.prototype.drawAssetCentered = function (image, x, y, width, height, alpha) {
  if (!image) {
    return false;
  }

  this.ctx.save();
  if (alpha !== undefined) {
    this.ctx.globalAlpha = alpha;
  }
  this.ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  this.ctx.restore();
  return true;
};

DefenseMinigameRuntime.prototype.drawAssetFit = function (image, x, y, width, height, alpha) {
  if (!image) {
    return false;
  }

  this.ctx.save();
  if (alpha !== undefined) {
    this.ctx.globalAlpha = alpha;
  }
  this.ctx.drawImage(image, x, y, width, height);
  this.ctx.restore();
  return true;
};

DefenseMinigameRuntime.prototype.drawPanelTexture = function (x, y, width, height, radius, alpha) {
  var panelImage = this.assets.get('titleBg') || this.assets.get('livingRoomBg');

  if (!panelImage) {
    return false;
  }

  this.ctx.save();
  this.buildRoundRectPath(x, y, width, height, radius);
  this.ctx.clip();
  this.ctx.globalAlpha = alpha === undefined ? 0.12 : alpha;
  this.ctx.drawImage(panelImage, x, y, width, height);
  this.ctx.restore();
  return true;
};

DefenseMinigameRuntime.prototype.getUiMetrics = function () {
  var compactWidth = this.width < 390;
  var compactHeight = this.height < 720;

  return {
    compact: compactWidth || compactHeight,
    compactWidth: compactWidth,
    compactHeight: compactHeight,
    pageMargin: this.getScaledSize(18, 12, 24),
    edgeGap: this.getScaledSize(18, 10, 24),
    sectionGap: this.getScaledSize(12, 8, 18),
    panelRadius: this.getScaledSize(28, 20, 32),
    cardRadius: this.getScaledSize(18, 14, 20),
    badgeHeight: this.getScaledSize(30, 28, 32),
    badgeRadius: this.getScaledSize(15, 14, 16),
    badgeFont: this.getScaledSize(12, 11, 13),
    primaryButtonHeight: this.getScaledSize(44, 42, 48),
    primaryButtonRadius: this.getScaledSize(20, 18, 22),
    primaryButtonFont: this.getScaledSize(19, compactWidth ? 16 : 17, 20),
    secondaryButtonHeight: this.getScaledSize(44, 42, 48),
    secondaryButtonRadius: this.getScaledSize(20, 18, 22),
    secondaryButtonFont: this.getScaledSize(19, compactWidth ? 16 : 17, 20),
    smallButtonHeight: this.getScaledSize(32, 30, 34),
    smallButtonRadius: this.getScaledSize(12, 10, 14),
    smallButtonFont: this.getScaledSize(12, 11, 13),
    metricLabelFont: this.getScaledSize(12, 11, 13),
    metricValueFont: this.getScaledSize(16, 15, 17),
    sectionLineInset: this.getScaledSize(28, 18, 32),
    titleFont: this.getScaledSize(34, 28, 36),
    sloganFont: this.getScaledSize(16, 14, 18),
    bodyFont: this.getScaledSize(15, 12, 16),
    captionFont: this.getScaledSize(12, 10, 13),
    detailFont: this.getScaledSize(10, 9, 11),
    topHudCardHeight: this.getScaledSize(84, 74, 88),
    bottomBarHeight: this.getScaledSize(164, 108, 164),
    pauseButtonSize: this.getScaledSize(48, 44, 50),
    groupGap: this.getScaledSize(12, 8, 14)
  };
};

DefenseMinigameRuntime.prototype.drawSectionRule = function (panelX, panelY, panelWidth, y) {
  var metrics = this.getUiMetrics();

  this.ctx.save();
  this.ctx.globalAlpha = 0.16;
  this.ctx.strokeStyle = 'rgba(84, 65, 40, 0.42)';
  this.ctx.lineWidth = 2 * this.scale;
  this.ctx.beginPath();
  this.ctx.moveTo(panelX + metrics.sectionLineInset, y);
  this.ctx.lineTo(panelX + panelWidth - metrics.sectionLineInset, y);
  this.ctx.stroke();
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.getTowerAssetKey = function (typeKey, useIcon) {
  if (typeKey === 'tabby') {
    return useIcon ? 'iconTowerTabby' : 'catTabby';
  }
  if (typeKey === 'siamese') {
    return useIcon ? 'iconTowerSiamese' : 'catSiamese';
  }
  if (typeKey === 'chonky') {
    return useIcon ? 'iconTowerFat' : 'catFat';
  }
  if (typeKey === 'boba') {
    return useIcon ? 'iconTowerCalico' : 'catCalico';
  }
  return '';
};

DefenseMinigameRuntime.prototype.getEnemyAssetKey = function (typeKey) {
  if (typeKey === 'dust') {
    return 'enemyDust';
  }
  if (typeKey === 'cucumber') {
    return 'enemyCucumber';
  }
  if (typeKey === 'vacuum') {
    return 'enemyVacuum';
  }
  if (typeKey === 'mailman') {
    return 'enemyMailman';
  }
  return '';
};

DefenseMinigameRuntime.prototype.getProjectileAssetKey = function (kind) {
  if (kind === 'bone') {
    return 'projBone';
  }
  if (kind === 'bun') {
    return 'projBun';
  }
  if (kind === 'boba') {
    return 'projBoba';
  }
  return 'projMung';
};

DefenseMinigameRuntime.prototype.getStageIconKey = function (stageKey) {
  if (stageKey === 'kitchen_loop') {
    return 'iconTowerCalico';
  }
  return 'iconTowerTabby';
};

DefenseMinigameRuntime.prototype.getStageHeroTowerKey = function (stageKey) {
  if (stageKey === 'kitchen_loop') {
    return 'boba';
  }
  return 'tabby';
};

DefenseMinigameRuntime.prototype.getStagePalette = function (stageKey) {
  if (stageKey === 'kitchen_loop') {
    return {
      accent: '#7ab7cf',
      accentSoft: 'rgba(181, 217, 236, 0.24)',
      accentFill: 'rgba(181, 217, 236, 0.16)',
      accentText: '#476272',
      progressBase: 'rgba(71, 98, 114, 0.16)'
    };
  }

  return {
    accent: ACCENT,
    accentSoft: 'rgba(255, 184, 106, 0.22)',
    accentFill: 'rgba(255, 184, 106, 0.16)',
    accentText: '#9a5e1b',
    progressBase: 'rgba(90, 58, 32, 0.16)'
  };
};

DefenseMinigameRuntime.prototype.drawBadgePill = function (centerX, y, width, label, iconKey, fillStyle, strokeStyle, textColor) {
  var iconImage = iconKey ? this.assets.get(iconKey) : null;
  var metrics = this.getUiMetrics();
  var iconSize = this.getScaledSize(18, 16, 20);
  var textX = centerX;
  var badgeHeight = metrics.badgeHeight;
  var badgeRadius = metrics.badgeRadius;
  var textWidth = width - this.getScaledSize(iconImage ? 52 : 20, iconImage ? 46 : 18, iconImage ? 54 : 22);

  utils.fillRoundRect(this.ctx, centerX - width / 2, y, width, badgeHeight, badgeRadius, fillStyle || 'rgba(255, 184, 106, 0.18)');
  this.drawPanelTexture(centerX - width / 2, y, width, badgeHeight, badgeRadius, 0.08);
  utils.strokeRoundRect(this.ctx, centerX - width / 2, y, width, badgeHeight, badgeRadius, strokeStyle || 'rgba(84, 65, 40, 0.16)', 2);
  if (iconImage) {
    this.drawAssetCentered(iconImage, centerX - width / 2 + this.getScaledSize(18, 16, 20), y + badgeHeight / 2, iconSize, iconSize, 0.92);
    textX += this.getScaledSize(10, 8, 12);
  }
  this.drawClampedText(label, textX, y + badgeHeight / 2, textWidth, metrics.badgeFont, metrics.detailFont, 'bold', textColor || INK, 'center', 'middle');
};

DefenseMinigameRuntime.prototype.drawInlinePill = function (x, y, width, height, label, options) {
  var radius = Math.min(height / 2, this.getScaledSize(10, 8, 10));
  var fillStyle;
  var strokeStyle;
  var textColor;
  var textureAlpha;

  options = options || {};
  fillStyle = options.fillStyle || 'rgba(255, 184, 106, 0.18)';
  strokeStyle = options.strokeStyle || 'rgba(84, 65, 40, 0.14)';
  textColor = options.textColor || INK;
  textureAlpha = options.textureAlpha === undefined ? 0.05 : options.textureAlpha;

  this.drawTexturedButton(
    {
      x: x,
      y: y,
      width: width,
      height: height
    },
    radius,
    fillStyle,
    strokeStyle,
    2,
    textureAlpha
  );
  this.drawClampedText(
    label,
    x + width / 2,
    y + height / 2,
    width - this.getScaledSize(8, 6, 10),
    this.getScaledSize(9, 8, 10),
    this.getScaledSize(7, 7, 8),
    'bold',
    textColor,
    'center',
    'middle'
  );
};

DefenseMinigameRuntime.prototype.drawInsetTray = function (rect, options) {
  var radius;
  var fillStyle;
  var strokeStyle;
  var textureAlpha;

  options = options || {};
  radius = options.radius || this.getScaledSize(18, 14, 20);
  fillStyle = options.fillStyle || 'rgba(255, 248, 238, 0.72)';
  strokeStyle = options.strokeStyle || 'rgba(84, 65, 40, 0.12)';
  textureAlpha = options.textureAlpha === undefined ? 0.04 : options.textureAlpha;

  this.drawTexturedButton(rect, radius, fillStyle, strokeStyle, 2, textureAlpha);
};

DefenseMinigameRuntime.prototype.drawPauseGlyph = function (rect, color) {
  var barWidth = Math.max(3 * this.scale, rect.width * 0.14);
  var barHeight = rect.height * 0.42;
  var gap = rect.width * 0.12;
  var radius = Math.min(barWidth / 2, this.getScaledSize(4, 3, 4));
  var top = rect.y + (rect.height - barHeight) / 2;
  var leftBarX = rect.x + rect.width / 2 - gap / 2 - barWidth;
  var rightBarX = rect.x + rect.width / 2 + gap / 2;

  this.ctx.save();
  this.ctx.fillStyle = color || '#fff7eb';
  utils.fillRoundRect(this.ctx, leftBarX, top, barWidth, barHeight, radius, this.ctx.fillStyle);
  utils.fillRoundRect(this.ctx, rightBarX, top, barWidth, barHeight, radius, this.ctx.fillStyle);
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawTexturedButton = function (rect, radius, fillStyle, strokeStyle, lineWidth, textureAlpha) {
  utils.fillRoundRect(this.ctx, rect.x, rect.y, rect.width, rect.height, radius, fillStyle);
  this.drawPanelTexture(rect.x, rect.y, rect.width, rect.height, radius, textureAlpha === undefined ? 0.14 : textureAlpha);
  utils.strokeRoundRect(this.ctx, rect.x, rect.y, rect.width, rect.height, radius, strokeStyle, lineWidth || 2);
};

DefenseMinigameRuntime.prototype.renderTitle = function () {
  var layout = this.getTitleLayout();
  var metrics = this.getUiMetrics();
  var panel = layout.panel;
  var panelX = panel.x;
  var panelY = panel.y;
  var panelWidth = panel.width;
  var panelHeight = panel.height;
  var button = layout.startButton;
  var stageRects = layout.stageButtons || {};
  var selectedStage = this.getSelectedStageMeta();
  var i;
  var towerKeys = ['tabby', 'siamese', 'chonky', 'boba'];
  var cardWidth = layout.towerCards.width;
  var cardHeight = layout.towerCards.height;
  var cardGap = layout.towerCards.gapX;
  var rowBaseY = layout.towerCards.y;
  var towerType;
  var stageMeta;
  var stageRect;
  var stageBest;
  var isSelected;
  var col;
  var row;
  var cardX;
  var cardY;
  var heroTowerKey = this.getStageHeroTowerKey(selectedStage.key);
  var heroImage = this.assets.get(this.getTowerAssetKey(heroTowerKey, false));
  var cardTextWidth;
  var stageTitleRightX;
  var stageTitleWidth;
  var stageSummaryWidth;
  var palette;
  var progressRatio;
  var progressWidth;
  var progressY;
  var badgeWidth;
  var stageStatusLabel;
  var audioButtons = layout.audioButtons;

  this.drawClampedText(gameMeta.GAME_TITLE, this.width / 2, layout.titleY, this.width - metrics.pageMargin * 2 - this.getScaledSize(120, 96, 126), metrics.titleFont, metrics.titleFont - 6, 'bold', INK, 'center', 'middle');
  this.drawClampedText(gameMeta.GAME_SLOGAN, this.width / 2, layout.sloganY, this.width - metrics.pageMargin * 2, metrics.sloganFont, metrics.sloganFont - 3, 'bold', SOFT_INK, 'center', 'middle');
  this.drawAssetCentered(this.assets.get('iconTowerTabby'), this.width / 2 - layout.titleIconOffset, layout.titleY + 2 * this.scale, this.getScaledSize(28, 22, 28), this.getScaledSize(28, 22, 28), 0.88);
  this.drawAssetCentered(this.assets.get('iconTowerCalico'), this.width / 2 + layout.titleIconOffset, layout.titleY + 2 * this.scale, this.getScaledSize(28, 22, 28), this.getScaledSize(28, 22, 28), 0.88);

  utils.drawPanel(this.ctx, panelX, panelY, panelWidth, panelHeight, {
    fillStyle: PANEL_FILL,
    strokeStyle: PANEL_STROKE,
    radius: metrics.panelRadius,
    lineWidth: 2.5
  });
  this.drawPanelTexture(panelX, panelY, panelWidth, panelHeight, metrics.panelRadius, 0.16);

  this.drawBadgePill(this.width / 2, layout.badgeY, layout.badgeWidth, '双关守卫 · 5 波挑战', 'iconKibble');
  this.drawAudioToggleButton(audioButtons.music, '音乐', this.audioSettings.musicEnabled);
  this.drawAudioToggleButton(audioButtons.sfx, '音效', this.audioSettings.sfxEnabled);

  this.ctx.save();
  this.ctx.globalAlpha = 0.16;
  this.ctx.fillStyle = 'rgba(84, 65, 40, 0.26)';
  this.ctx.beginPath();
  this.ctx.ellipse(this.width / 2, layout.heroY + layout.heroSize * 0.44, layout.heroSize * 0.46, this.getScaledSize(10, 8, 10), 0, 0, Math.PI * 2);
  this.ctx.fill();
  this.ctx.restore();
  if (!this.drawAssetCentered(heroImage, this.width / 2, layout.heroY, layout.heroSize, layout.heroSize)) {
    this.drawTowerIcon(this.ctx, {
      x: this.width / 2,
      y: layout.heroY - 2 * this.scale,
      typeKey: heroTowerKey,
      radius: layout.heroSize * 0.38
    });
  }

  for (i = 0; i < gameMeta.GAME_DESCRIPTION.length; i += 1) {
    this.drawClampedText(
      gameMeta.GAME_DESCRIPTION[i],
      this.width / 2,
      layout.descStartY + i * layout.descGap,
      layout.descWidth,
      metrics.bodyFont,
      metrics.captionFont,
      i === 0 ? 'bold' : null,
      INK,
      'center',
      'middle'
    );
  }

  this.drawClampedText('选择路线', this.width / 2, layout.stageLabelY, panelWidth - layout.panelPaddingX * 2, metrics.captionFont, metrics.detailFont, 'bold', SOFT_INK, 'center', 'middle');

  for (i = 0; i < this.stageCatalog.length; i += 1) {
    stageMeta = this.stageCatalog[i];
    stageRect = stageRects[stageMeta.key];
    if (!stageRect) {
      continue;
    }
    stageBest = this.getBestWaveForStage(stageMeta.key);
    isSelected = stageMeta.key === this.selectedStageKey;
    palette = this.getStagePalette(stageMeta.key);
    stageTitleRightX = stageRect.x + stageRect.width - this.getScaledSize(12, 10, 14);
    stageSummaryWidth = stageRect.width - this.getScaledSize(28, 24, 30);
    progressRatio = utils.clamp(stageMeta.waveCount ? stageBest / stageMeta.waveCount : 0, 0, 1);
    progressWidth = stageRect.width - this.getScaledSize(24, 20, 26);
    progressY = stageRect.y + stageRect.height - this.getScaledSize(9, 8, 10);
    badgeWidth = Math.min(
      Math.max(this.getScaledSize(50, 44, 54), this.measureTextWidth(stageMeta.badge, this.getScaledSize(9, 8, 10), 'bold') + this.getScaledSize(16, 14, 18)),
      stageRect.width - this.getScaledSize(82, 74, 88)
    );
    stageTitleWidth = stageRect.width - badgeWidth - this.getScaledSize(52, 46, 56);
    stageStatusLabel = isSelected ? '已选路线' : '点击切换';

    utils.fillRoundRect(
      this.ctx,
      stageRect.x,
      stageRect.y,
      stageRect.width,
      stageRect.height,
      metrics.cardRadius,
      isSelected ? palette.accentFill : 'rgba(255, 250, 242, 0.88)'
    );
    utils.strokeRoundRect(
      this.ctx,
      stageRect.x,
      stageRect.y,
      stageRect.width,
      stageRect.height,
      metrics.cardRadius,
      isSelected ? palette.accent : 'rgba(84, 65, 40, 0.14)',
      isSelected ? 3 : 2
    );
    this.drawPanelTexture(stageRect.x, stageRect.y, stageRect.width, stageRect.height, metrics.cardRadius, isSelected ? 0.18 : 0.12);
    utils.fillRoundRect(this.ctx, stageRect.x + this.getScaledSize(8, 6, 8), stageRect.y + this.getScaledSize(10, 8, 10), this.getScaledSize(4, 4, 5), stageRect.height - this.getScaledSize(20, 16, 20), this.getScaledSize(3, 3, 4), isSelected ? palette.accent : 'rgba(84, 65, 40, 0.12)');
    this.drawAssetCentered(this.assets.get(this.getStageIconKey(stageMeta.key)), stageRect.x + this.getScaledSize(18, 16, 20), stageRect.y + this.getScaledSize(20, 18, 22), this.getScaledSize(20, 18, 22), this.getScaledSize(20, 18, 22), isSelected ? 0.96 : 0.82);
    this.drawClampedText(stageMeta.title, stageRect.x + this.getScaledSize(34, 30, 36), stageRect.y + this.getScaledSize(21, 18, 22), stageTitleWidth, this.getScaledSize(13, 11, 14), this.getScaledSize(10, 9, 11), 'bold', INK, 'left', 'middle');
    this.drawInlinePill(
      stageRect.x + stageRect.width - this.getScaledSize(12, 10, 14) - badgeWidth,
      stageRect.y + this.getScaledSize(12, 10, 12),
      badgeWidth,
      this.getScaledSize(16, 14, 16),
      stageMeta.badge,
      {
        fillStyle: palette.accentSoft,
        strokeStyle: isSelected ? palette.accent : 'rgba(84, 65, 40, 0.12)',
        textColor: palette.accentText
      }
    );
    this.drawClampedText(stageMeta.summary, stageRect.x + this.getScaledSize(14, 12, 16), stageRect.y + this.getScaledSize(42, 36, 44), stageSummaryWidth, this.getScaledSize(10, 9, 11), this.getScaledSize(8, 8, 9), null, SOFT_INK, 'left', 'middle');
    this.drawClampedText(stageStatusLabel, stageRect.x + this.getScaledSize(14, 12, 16), stageRect.y + stageRect.height - this.getScaledSize(18, 16, 20), stageRect.width * 0.45, this.getScaledSize(9, 8, 10), this.getScaledSize(8, 7, 8), 'bold', isSelected ? palette.accentText : 'rgba(84, 65, 40, 0.56)', 'left', 'middle');
    this.drawClampedText(stageBest + '/' + stageMeta.waveCount + ' 波', stageTitleRightX, stageRect.y + stageRect.height - this.getScaledSize(18, 16, 20), stageRect.width * 0.42, this.getScaledSize(9, 8, 10), this.getScaledSize(8, 7, 8), 'bold', INK, 'right', 'middle');
    utils.fillRoundRect(this.ctx, stageRect.x + this.getScaledSize(12, 10, 14), progressY, progressWidth, this.getScaledSize(4, 4, 5), this.getScaledSize(3, 3, 4), palette.progressBase);
    utils.fillRoundRect(this.ctx, stageRect.x + this.getScaledSize(12, 10, 14), progressY, progressWidth * progressRatio, this.getScaledSize(4, 4, 5), this.getScaledSize(3, 3, 4), palette.accent);
  }

  for (i = 0; i < towerKeys.length; i += 1) {
    towerType = this.stage ? this.stage.towerTypes[towerKeys[i]] : content.TOWER_TYPES[towerKeys[i]];
    row = Math.floor(i / 2);
    col = i % 2;
    cardX = layout.towerCards.x + col * (cardWidth + cardGap);
    cardY = rowBaseY + row * (cardHeight + layout.towerCards.gapY);
    cardTextWidth = cardWidth - this.getScaledSize(52, 44, 56);

    utils.fillRoundRect(this.ctx, cardX, cardY, cardWidth, cardHeight, metrics.cardRadius, 'rgba(255, 250, 242, 0.88)');
    utils.strokeRoundRect(this.ctx, cardX, cardY, cardWidth, cardHeight, metrics.cardRadius, 'rgba(84, 65, 40, 0.14)', 2);
    this.drawPanelTexture(cardX, cardY, cardWidth, cardHeight, metrics.cardRadius, 0.08);
    this.drawTowerIcon(this.ctx, {
      x: cardX + this.getScaledSize(24, 20, 24),
      y: cardY + cardHeight / 2,
      typeKey: towerType.key,
      radius: this.getScaledSize(12, 10, 13)
    });
    this.drawClampedText(towerType.name, cardX + this.getScaledSize(42, 36, 44), cardY + this.getScaledSize(24, 20, 24), cardTextWidth, metrics.captionFont, metrics.detailFont, 'bold', INK, 'left', 'middle');
    this.drawClampedText(towerType.role + ' · ' + towerType.cost, cardX + this.getScaledSize(42, 36, 44), cardY + this.getScaledSize(45, 39, 46), cardTextWidth, metrics.detailFont, metrics.detailFont - 1, null, SOFT_INK, 'left', 'middle');
  }

  this.drawSectionRule(panelX, panelY, panelWidth, layout.footerLineY);
  this.drawClampedText(
    '当前关卡最佳 ' + this.getBestWaveForStage(selectedStage.key) + '/' + selectedStage.waveCount + ' · ' + selectedStage.objective,
    this.width / 2,
    layout.footerTextY,
    panelWidth - layout.panelPaddingX * 2,
    this.getScaledSize(14, 12, 15),
    this.getScaledSize(11, 10, 12),
    'bold',
    SOFT_INK,
    'center',
    'middle'
  );

  this.drawPrimaryButton(button, '开始防守', { iconKey: 'iconKibble' });
};

DefenseMinigameRuntime.prototype.renderStage = function () {
  var path = this.stage.path;
  var theme = this.stage.theme || {};
  var i;
  var slot;
  var tower;
  var enemy;
  var projectile;
  var target = this.stage.target;

  this.ctx.fillStyle = FLOOR_COLOR;
  this.ctx.fillRect(0, this.stage.playTop, this.width, this.stage.playBottom - this.stage.playTop);
  this.drawStageUnderlay();

  this.ctx.save();
  this.ctx.strokeStyle = theme.pathColor || PATH_COLOR;
  this.ctx.lineWidth = 44 * this.scale;
  this.ctx.lineCap = 'round';
  this.ctx.lineJoin = 'round';
  this.ctx.beginPath();
  this.ctx.moveTo(path[0].x, path[0].y);
  for (i = 1; i < path.length; i += 1) {
    this.ctx.lineTo(path[i].x, path[i].y);
  }
  this.ctx.stroke();
  this.ctx.restore();
  this.drawPathMarkers(path);

  this.ctx.save();
  this.ctx.globalAlpha = 0.18;
  this.ctx.strokeStyle = theme.pathGlow || 'rgba(255,255,255,0.65)';
  this.ctx.lineWidth = 12 * this.scale;
  this.ctx.beginPath();
  this.ctx.moveTo(path[0].x, path[0].y);
  for (i = 1; i < path.length; i += 1) {
    this.ctx.lineTo(path[i].x, path[i].y);
  }
  this.ctx.stroke();
  this.ctx.restore();

  this.drawSpawnMarker(path[0]);
  this.drawTarget(target);
  this.drawStageDecor();

  for (i = 0; i < this.stage.buildSlots.length; i += 1) {
    slot = this.stage.buildSlots[i];
    this.drawSlot(slot);
  }

  for (i = 0; i < this.towers.length; i += 1) {
    tower = this.towers[i];
    this.drawTower(tower);
  }

  for (i = 0; i < this.enemies.length; i += 1) {
    enemy = this.enemies[i];
    this.drawEnemy(enemy);
  }

  for (i = 0; i < this.projectiles.length; i += 1) {
    projectile = this.projectiles[i];
    this.drawProjectile(projectile);
  }

  for (i = 0; i < this.feedbackMarks.length; i += 1) {
    this.drawFeedbackMark(this.feedbackMarks[i]);
  }
};

DefenseMinigameRuntime.prototype.drawStageDecor = function () {
  var boxImage = this.assets.get('obstacleBox');
  var shoeImage = this.assets.get('obstacleShoe');
  var top = this.stage.playTop;

  if (this.stage.key === 'kitchen_loop') {
    this.drawAssetCentered(boxImage, 72 * this.scale, top + 72 * this.scale, 44 * this.scale, 44 * this.scale, 0.88);
    this.drawAssetCentered(boxImage, this.width - 68 * this.scale, top + 228 * this.scale, 40 * this.scale, 40 * this.scale, 0.74);
    this.drawAssetCentered(shoeImage, this.width - 92 * this.scale, top + 112 * this.scale, 34 * this.scale, 34 * this.scale, 0.26);
  } else {
    this.drawAssetCentered(shoeImage, 70 * this.scale, top + 92 * this.scale, 44 * this.scale, 44 * this.scale, 0.86);
    this.drawAssetCentered(boxImage, this.width - 72 * this.scale, top + 208 * this.scale, 42 * this.scale, 42 * this.scale, 0.76);
    this.drawAssetCentered(shoeImage, this.width - 126 * this.scale, top + 282 * this.scale, 32 * this.scale, 32 * this.scale, 0.22);
  }
};

DefenseMinigameRuntime.prototype.renderGameplayHud = function () {
  var metrics = this.getUiMetrics();
  var hudLayout = this.getGameplayHudLayout();
  var topCard = hudLayout.topCard;
  var bottomBar = this.getBottomBarRect();
  var pauseRect = this.touchRects.pauseButton;
  var buttons = this.getTowerButtonRects();
  var waveRect = this.touchRects.waveButton;
  var selectedTower = this.findTowerById(this.selectedPlacedTowerId);
  var panel;
  var stats;
  var actionSummary;
  var actionRects;
  var upgradeCost;
  var visibleWave = this.waveInProgress ? this.activeWaveNumber : Math.min(this.waveCursor + 1, this.stage.waves.length);
  var topCardRightX = topCard.x + topCard.width - this.getScaledSize(18, 14, 20);
  var nextWaveSummary = '';
  var statusText = '';
  var hudSections = this.getHudSectionRects();
  var compactWaveButton = hudLayout.compactHud || waveRect.width < this.getScaledSize(78, 74, 80);
  var panelLayout;
  var statDividerX;
  var stagePalette = this.getStagePalette(this.stage.key);
  var stageBadgeText = this.stage.badge || '守卫路线';
  var stageBadgeWidth;
  var stageTitleWidth;
  var stageBadgeHeight;
  var statusPillWidth;
  var statusPillY;
  var statusFill;
  var statusStroke;
  var statusTextColor;
  var waveLabel;
  var waveDetail;
  var wavePillWidth;
  var wavePillHeight;
  var wavePillFill;
  var wavePillStroke;
  var wavePillTextColor;
  var waveTitleColor;
  var selectedBuildTower = this.selectedTowerKey ? this.stage.towerTypes[this.selectedTowerKey] : null;
  var towerGuideText;
  var towerHeaderTextX;
  var towerHeaderTextWidth;
  var headerCenterY;
  var headerDividerY;
  var summaryTrayWidth;
  var summaryTrayHeight;

  if (this.waveCursor >= this.stage.waves.length) {
    visibleWave = this.stage.waves.length;
  }

  if (!this.waveInProgress && this.waveCursor < this.stage.waves.length) {
    nextWaveSummary = this.getWaveSummary(this.waveCursor);
  }

  statusText = this.waveInProgress ? '战斗中' : (this.waveCursor >= this.stage.waves.length ? '最后清场' : '下一波 ' + utils.formatTime(this.nextWaveDelayMs / 1000));
  if (this.isTargetUnderPressure()) {
    statusText += ' · 目标警戒';
  }

  utils.drawPanel(this.ctx, topCard.x, topCard.y, topCard.width, topCard.height, {
    fillStyle: 'rgba(68, 52, 34, 0.9)',
    strokeStyle: 'rgba(255,255,255,0.08)',
    radius: metrics.cardRadius
  });
  this.drawPanelTexture(topCard.x, topCard.y, topCard.width, topCard.height, metrics.cardRadius, 0.12);
  stageBadgeHeight = this.getScaledSize(16, 14, 16);
  stageBadgeWidth = Math.min(
    Math.max(this.getScaledSize(56, 48, 60), this.measureTextWidth(stageBadgeText, this.getScaledSize(9, 8, 10), 'bold') + this.getScaledSize(18, 16, 20)),
    topCard.width * 0.38
  );
  stageTitleWidth = topCard.width - stageBadgeWidth - this.getScaledSize(54, 46, 58);
  this.drawClampedText(this.stage.title + ' · ' + this.stage.objective, topCard.x + this.getScaledSize(18, 16, 20), topCard.y + this.getScaledSize(18, 16, 20), stageTitleWidth, this.getScaledSize(13, 11, 14), this.getScaledSize(10, 9, 11), 'bold', 'rgba(255,247,235,0.76)', 'left', 'middle');
  this.drawInlinePill(
    topCardRightX - stageBadgeWidth,
    topCard.y + this.getScaledSize(10, 8, 10),
    stageBadgeWidth,
    stageBadgeHeight,
    stageBadgeText,
    {
      fillStyle: stagePalette.accentSoft,
      strokeStyle: 'rgba(255,255,255,0.14)',
      textColor: '#fff7eb',
      textureAlpha: 0.04
    }
  );
  statDividerX = topCard.x + topCard.width * 0.58;
  this.ctx.save();
  this.ctx.globalAlpha = 0.12;
  this.ctx.strokeStyle = '#fff7eb';
  this.ctx.lineWidth = 2 * this.scale;
  this.ctx.beginPath();
  this.ctx.moveTo(statDividerX, topCard.y + this.getScaledSize(28, 24, 30));
  this.ctx.lineTo(statDividerX, topCard.y + topCard.height - this.getScaledSize(16, 12, 16));
  this.ctx.stroke();
  this.ctx.restore();
  this.drawClampedText('生命 ' + this.lives, topCard.x + this.getScaledSize(18, 16, 20), topCard.y + this.getScaledSize(44, 38, 46), topCard.width * 0.55, this.getScaledSize(22, 18, 22), this.getScaledSize(16, 14, 17), 'bold', '#fff7eb', 'left', 'middle');
  this.drawAssetCentered(this.assets.get('iconKibble'), topCard.x + this.getScaledSize(24, 20, 26), topCard.y + topCard.height - this.getScaledSize(18, 14, 18), this.getScaledSize(20, 18, 22), this.getScaledSize(20, 18, 22), 0.96);
  this.drawClampedText('小鱼干 ' + this.gold, topCard.x + this.getScaledSize(38, 34, 40), topCard.y + topCard.height - this.getScaledSize(18, 14, 18), topCard.width * 0.52, this.getScaledSize(18, 14, 18), this.getScaledSize(12, 11, 13), 'bold', GOLD, 'left', 'middle');
  this.drawClampedText('波次 ' + visibleWave + '/' + this.stage.waves.length, topCardRightX, topCard.y + this.getScaledSize(38, 32, 40), topCard.width * 0.44, this.getScaledSize(16, 13, 16), this.getScaledSize(11, 10, 12), 'bold', '#fff7eb', 'right', 'middle');
  if (this.isTargetUnderPressure()) {
    statusFill = 'rgba(239, 123, 109, 0.22)';
    statusStroke = 'rgba(255,255,255,0.18)';
    statusTextColor = '#fff7eb';
    statusText = '目标警戒';
  } else if (this.waveInProgress) {
    statusFill = 'rgba(255,255,255,0.08)';
    statusStroke = 'rgba(255,255,255,0.12)';
    statusTextColor = '#fff7eb';
    statusText = '战斗中';
  } else if (this.waveCursor >= this.stage.waves.length) {
    statusFill = 'rgba(255, 184, 106, 0.18)';
    statusStroke = 'rgba(255,255,255,0.18)';
    statusTextColor = '#fff7eb';
    statusText = '最后清场';
  } else {
    statusFill = stagePalette.accentSoft;
    statusStroke = 'rgba(255,255,255,0.16)';
    statusTextColor = '#fff7eb';
    statusText = '下一波 ' + utils.formatTime(this.nextWaveDelayMs / 1000);
  }
  statusPillWidth = Math.min(
    Math.max(this.getScaledSize(74, 66, 80), this.measureTextWidth(statusText, this.getScaledSize(9, 8, 10), 'bold') + this.getScaledSize(18, 16, 20)),
    topCard.width * 0.44
  );
  statusPillY = topCard.y + topCard.height - this.getScaledSize(26, 22, 28);
  this.drawInlinePill(
    topCardRightX - statusPillWidth,
    statusPillY,
    statusPillWidth,
    this.getScaledSize(16, 14, 18),
    statusText,
    {
      fillStyle: statusFill,
      strokeStyle: statusStroke,
      textColor: statusTextColor,
      textureAlpha: 0.04
    }
  );

  this.drawTexturedButton(pauseRect, this.getScaledSize(14, 12, 16), 'rgba(68, 52, 34, 0.9)', 'rgba(255,255,255,0.08)', 2, 0.12);
  this.drawPauseGlyph(pauseRect, '#fff7eb');

  utils.fillRoundRect(this.ctx, bottomBar.x, bottomBar.y, bottomBar.width, bottomBar.height, metrics.cardRadius, 'rgba(79, 58, 35, 0.96)');
  this.drawPanelTexture(bottomBar.x, bottomBar.y, bottomBar.width, bottomBar.height, metrics.cardRadius, 0.1);
  utils.strokeRoundRect(this.ctx, bottomBar.x, bottomBar.y, bottomBar.width, bottomBar.height, metrics.cardRadius, 'rgba(255,255,255,0.06)', 2);
  this.drawTexturedButton(hudSections.towerGroup, metrics.cardRadius, 'rgba(255, 250, 242, 0.08)', 'rgba(255,255,255,0.08)', 2, 0.08);
  this.drawTexturedButton(hudSections.waveGroup, metrics.cardRadius, 'rgba(255, 250, 242, 0.08)', 'rgba(255,255,255,0.08)', 2, 0.08);
  towerGuideText = selectedBuildTower ? ('已选 ' + selectedBuildTower.name + ' · 点塔位建造') : (selectedTower ? '点空塔位建造 · 点猫塔管理' : '先选猫塔，再点空塔位');
  headerCenterY = hudLayout.compactHud ? hudSections.towerGroup.y + this.getScaledSize(12, 10, 14) : hudSections.towerGroup.y + this.getScaledSize(23, 20, 24);
  headerDividerY = hudLayout.towerButtonArea.y - this.getScaledSize(6, 5, 8);
  if (hudLayout.compactHud) {
    this.drawInlinePill(
      hudSections.towerGroup.x + this.getScaledSize(8, 6, 10),
      hudSections.towerGroup.y + this.getScaledSize(4, 4, 6),
      this.getScaledSize(56, 48, 60),
      this.getScaledSize(16, 14, 16),
      '猫塔',
      {
        fillStyle: 'rgba(255,184,106,0.18)',
        strokeStyle: 'rgba(255,255,255,0.12)',
        textColor: '#fff7eb',
        textureAlpha: 0.04
      }
    );
    towerHeaderTextX = hudSections.towerGroup.x + this.getScaledSize(72, 60, 76);
    towerHeaderTextWidth = hudSections.towerGroup.x + hudSections.towerGroup.width - towerHeaderTextX - this.getScaledSize(10, 8, 12);
    this.drawClampedText(towerGuideText, towerHeaderTextX, headerCenterY, towerHeaderTextWidth, this.getScaledSize(9, 8, 10), this.getScaledSize(8, 7, 8), 'bold', selectedBuildTower ? 'rgba(255,247,235,0.84)' : 'rgba(255,247,235,0.58)', 'left', 'middle');
    this.drawInlinePill(
      hudSections.waveGroup.x + (hudSections.waveGroup.width - this.getScaledSize(48, 42, 52)) / 2,
      hudSections.waveGroup.y + this.getScaledSize(4, 4, 6),
      this.getScaledSize(48, 42, 52),
      this.getScaledSize(16, 14, 16),
      '波次',
      {
        fillStyle: stagePalette.accentSoft,
        strokeStyle: 'rgba(255,255,255,0.12)',
        textColor: '#fff7eb',
        textureAlpha: 0.04
      }
    );
  } else {
    this.drawBadgePill(
      hudSections.towerGroup.x + this.getScaledSize(58, 54, 60),
      hudSections.towerGroup.y + this.getScaledSize(8, 6, 8),
      this.getScaledSize(86, 80, 90),
      '猫塔栏',
      'iconTowerTabby',
      'rgba(255,184,106,0.18)',
      'rgba(255,255,255,0.12)',
      '#fff7eb'
    );
    towerHeaderTextX = hudSections.towerGroup.x + this.getScaledSize(108, 100, 112);
    towerHeaderTextWidth = hudSections.towerGroup.x + hudSections.towerGroup.width - towerHeaderTextX - this.getScaledSize(12, 10, 14);
    this.drawClampedText(towerGuideText, towerHeaderTextX, headerCenterY, towerHeaderTextWidth, this.getScaledSize(10, 9, 11), this.getScaledSize(8, 7, 9), 'bold', selectedBuildTower ? 'rgba(255,247,235,0.84)' : 'rgba(255,247,235,0.58)', 'left', 'middle');
    this.drawBadgePill(
      hudSections.waveGroup.x + hudSections.waveGroup.width / 2,
      hudSections.waveGroup.y + this.getScaledSize(8, 6, 8),
      this.getScaledSize(72, 68, 74),
      '波次',
      'spawnDoor',
      'rgba(255,184,106,0.18)',
      'rgba(255,255,255,0.12)',
      '#fff7eb'
    );
  }
  this.ctx.save();
  this.ctx.globalAlpha = 0.12;
  this.ctx.strokeStyle = '#fff7eb';
  this.ctx.lineWidth = 2 * this.scale;
  this.ctx.beginPath();
  this.ctx.moveTo(hudSections.towerGroup.x + this.getScaledSize(10, 8, 12), headerDividerY);
  this.ctx.lineTo(hudSections.towerGroup.x + hudSections.towerGroup.width - this.getScaledSize(10, 8, 12), headerDividerY);
  this.ctx.moveTo(hudSections.waveGroup.x + this.getScaledSize(10, 8, 12), headerDividerY);
  this.ctx.lineTo(hudSections.waveGroup.x + hudSections.waveGroup.width - this.getScaledSize(10, 8, 12), headerDividerY);
  this.ctx.stroke();
  this.ctx.restore();

  this.drawBuildButton(buttons.tabby, this.stage.towerTypes.tabby, this.selectedTowerKey === 'tabby');
  this.drawBuildButton(buttons.siamese, this.stage.towerTypes.siamese, this.selectedTowerKey === 'siamese');
  this.drawBuildButton(buttons.chonky, this.stage.towerTypes.chonky, this.selectedTowerKey === 'chonky');
  this.drawBuildButton(buttons.boba, this.stage.towerTypes.boba, this.selectedTowerKey === 'boba');

  waveLabel = this.waveInProgress ? '进行中' : '下一波';
  waveDetail = this.waveInProgress ? '等待清场' : (this.nextWaveDelayMs > 0 ? utils.formatTime(this.nextWaveDelayMs / 1000) : '立即开始');
  wavePillHeight = this.getScaledSize(16, 14, 18);
  if (this.waveInProgress) {
    wavePillFill = 'rgba(255,255,255,0.08)';
    wavePillStroke = 'rgba(255,255,255,0.12)';
    wavePillTextColor = '#d9dde6';
    waveTitleColor = '#d9dde6';
  } else {
    wavePillFill = stagePalette.accentSoft;
    wavePillStroke = 'rgba(255,255,255,0.16)';
    wavePillTextColor = '#5a3a20';
    waveTitleColor = '#5a3a20';
  }
  wavePillWidth = Math.min(
    Math.max(this.getScaledSize(44, 40, 48), this.measureTextWidth(waveDetail, this.getScaledSize(9, 8, 10), 'bold') + this.getScaledSize(16, 14, 18)),
    waveRect.width - this.getScaledSize(10, 8, 12)
  );
  this.drawTexturedButton(
    waveRect,
    metrics.cardRadius,
    this.waveInProgress ? 'rgba(124, 130, 144, 0.54)' : 'rgba(255, 184, 106, 0.94)',
    this.waveInProgress ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.28)',
    2,
    0.08
  );
  if (compactWaveButton) {
    this.drawAssetCentered(this.assets.get('spawnDoor'), waveRect.x + waveRect.width / 2, waveRect.y + this.getScaledSize(14, 12, 16), this.getScaledSize(18, 16, 20), this.getScaledSize(18, 16, 20), this.waveInProgress ? 0.48 : 0.86);
    this.drawClampedText(waveLabel, waveRect.x + waveRect.width / 2, waveRect.y + waveRect.height * 0.54, waveRect.width - this.getScaledSize(10, 8, 12), this.getScaledSize(11, 9, 12), this.getScaledSize(9, 8, 9), 'bold', waveTitleColor, 'center', 'middle');
    this.drawInlinePill(
      waveRect.x + (waveRect.width - wavePillWidth) / 2,
      waveRect.y + waveRect.height - wavePillHeight - this.getScaledSize(6, 6, 8),
      wavePillWidth,
      wavePillHeight,
      waveDetail,
      {
        fillStyle: wavePillFill,
        strokeStyle: wavePillStroke,
        textColor: wavePillTextColor,
        textureAlpha: 0.04
      }
    );
  } else {
    this.drawAssetCentered(this.assets.get('spawnDoor'), waveRect.x + this.getScaledSize(24, 20, 26), waveRect.y + waveRect.height / 2, this.getScaledSize(22, 18, 22), this.getScaledSize(22, 18, 22), this.waveInProgress ? 0.48 : 0.86);
    this.drawClampedText(waveLabel, waveRect.x + waveRect.width / 2 + this.getScaledSize(10, 8, 10), waveRect.y + this.getScaledSize(24, 20, 26), waveRect.width - this.getScaledSize(36, 32, 38), this.getScaledSize(12, 10, 12), this.getScaledSize(9, 8, 9), 'bold', waveTitleColor, 'center', 'middle');
    this.drawInlinePill(
      waveRect.x + (waveRect.width - wavePillWidth) / 2,
      waveRect.y + waveRect.height - wavePillHeight - this.getScaledSize(10, 8, 12),
      wavePillWidth,
      wavePillHeight,
      waveDetail,
      {
        fillStyle: wavePillFill,
        strokeStyle: wavePillStroke,
        textColor: wavePillTextColor,
        textureAlpha: 0.04
      }
    );
  }
  if (nextWaveSummary) {
    summaryTrayHeight = this.getScaledSize(18, 16, 20);
    summaryTrayWidth = Math.min(
      bottomBar.width - this.getScaledSize(26, 22, 32),
      Math.max(
        this.getScaledSize(120, 108, 132),
        this.measureTextWidth(nextWaveSummary, this.getScaledSize(9, 8, 10), 'bold') + this.getScaledSize(28, 24, 32)
      )
    );
    this.drawInsetTray(
      {
        x: bottomBar.x + (bottomBar.width - summaryTrayWidth) / 2,
        y: hudLayout.bottomSummaryY - summaryTrayHeight / 2,
        width: summaryTrayWidth,
        height: summaryTrayHeight
      },
      {
        fillStyle: 'rgba(255, 250, 242, 0.08)',
        strokeStyle: 'rgba(255,255,255,0.08)',
        radius: this.getScaledSize(10, 8, 12),
        textureAlpha: 0.03
      }
    );
    this.drawClampedText(nextWaveSummary, bottomBar.x + bottomBar.width / 2, hudLayout.bottomSummaryY + 1 * this.scale, summaryTrayWidth - this.getScaledSize(16, 12, 18), this.getScaledSize(9, 8, 10), this.getScaledSize(8, 7, 8), 'bold', 'rgba(255,247,235,0.7)', 'center', 'middle');
  }

  if (selectedTower) {
    panelLayout = this.getSelectedTowerPanelLayout();
    panel = panelLayout.panel;
    stats = this.getTowerStats(selectedTower);
    actionSummary = this.getTowerActionSummary(selectedTower);
    upgradeCost = this.stage.towerTypes[selectedTower.typeKey].upgradeCosts[selectedTower.level - 1] || 0;
    utils.drawPanel(this.ctx, panel.x, panel.y, panel.width, panel.height, {
      fillStyle: 'rgba(255, 250, 242, 0.97)',
      strokeStyle: 'rgba(84, 65, 40, 0.18)',
      radius: metrics.cardRadius
    });
    this.drawPanelTexture(panel.x, panel.y, panel.width, panel.height, metrics.cardRadius, 0.1);
    actionRects = panelLayout.actions;
    this.drawClampedText(stats.name + ' Lv.' + selectedTower.level + ' · ' + stats.role, panelLayout.titleX, panelLayout.titleY, panelLayout.titleWidth, this.getScaledSize(15, 13, 16), this.getScaledSize(11, 10, 12), 'bold', INK, 'left', 'middle');
    this.drawMiniMetricCard(panelLayout.statCards.damage, '伤害', String(stats.damage), {
      valueColor: '#9a5e1b'
    });
    this.drawMiniMetricCard(panelLayout.statCards.range, '射程', String(Math.round(stats.range)), {
      valueColor: '#476272'
    });
    this.drawClampedText(
      actionSummary.nextCost
        ? ('返还 ' + actionSummary.refund + ' · 下级 +' + actionSummary.damageGain + '伤害 / +' + actionSummary.rangeGain + '射程')
        : ('已满级 · 可返还 ' + actionSummary.refund + ' 小鱼干'),
      panelLayout.summaryX,
      panelLayout.summaryY,
      panelLayout.summaryWidth,
      this.getScaledSize(10, 9, 11),
      this.getScaledSize(8, 7, 9),
      'bold',
      actionSummary.nextCost ? 'rgba(90,58,32,0.84)' : 'rgba(124, 130, 144, 0.9)',
      'left',
      'middle'
    );
    this.drawSmallButton(actionRects.upgradeButton, upgradeCost ? ('升 ' + upgradeCost) : '满级', upgradeCost && this.gold >= upgradeCost ? ACCENT : 'rgba(140,140,140,0.72)', !!upgradeCost && this.gold >= upgradeCost);
    this.drawSmallButton(actionRects.sellButton, '卖出', DANGER, true);
  }
};

DefenseMinigameRuntime.prototype.renderPauseOverlay = function () {
  var layout = this.getPauseOverlayLayout();
  var metrics = this.getUiMetrics();
  var panel = layout.panel;
  var audioButtons = layout.audioButtons;
  var visibleWave = this.waveInProgress ? this.activeWaveNumber : Math.min(this.waveCursor + 1, this.stage.waves.length);
  var actionTray;
  var actionLabelY;

  if (this.waveCursor >= this.stage.waves.length) {
    visibleWave = this.stage.waves.length;
  }

  this.ctx.fillStyle = 'rgba(24, 18, 12, 0.42)';
  this.ctx.fillRect(0, 0, this.width, this.height);
  utils.drawPanel(this.ctx, panel.x, panel.y, panel.width, panel.height, {
    fillStyle: 'rgba(255, 250, 242, 0.98)',
    strokeStyle: 'rgba(84, 65, 40, 0.18)',
    radius: metrics.panelRadius
  });
  this.drawPanelTexture(panel.x, panel.y, panel.width, panel.height, metrics.panelRadius, 0.14);
  this.drawBadgePill(this.width / 2, layout.badgeY, layout.badgeWidth, '防守暂停', 'iconTowerTabby');
  this.drawAudioToggleButton(audioButtons.music, '音乐', this.audioSettings.musicEnabled);
  this.drawAudioToggleButton(audioButtons.sfx, '音效', this.audioSettings.sfxEnabled);
  this.drawClampedText('暂停中', this.width / 2, layout.titleY, panel.width - this.getScaledSize(48, 32, 52), this.getScaledSize(30, 24, 30), this.getScaledSize(20, 18, 22), 'bold', INK, 'center', 'middle');
  this.drawClampedText(this.stage.title + ' · 第 ' + visibleWave + ' 波', this.width / 2, layout.subtitleY, panel.width - this.getScaledSize(48, 32, 52), this.getScaledSize(14, 12, 14), this.getScaledSize(10, 9, 11), null, SOFT_INK, 'center', 'middle');
  this.drawSectionRule(panel.x, panel.y, panel.width, layout.sectionLineY);
  this.drawMetricCard(layout.row1Left.x, layout.row1Left.y, layout.row1Left.width, layout.row1Left.height, '当前金币', String(this.gold), { iconKey: 'iconKibble' });
  this.drawMetricCard(layout.row1Right.x, layout.row1Right.y, layout.row1Right.width, layout.row1Right.height, '剩余生命', String(this.lives), { iconKey: 'defenseTarget' });
  this.drawMetricCard(layout.row2Full.x, layout.row2Full.y, layout.row2Full.width, layout.row2Full.height, '生存时间', utils.formatTime(this.elapsedTime));
  actionLabelY = layout.row2Full.y + layout.row2Full.height + (layout.buttons.primary.y - (layout.row2Full.y + layout.row2Full.height)) * 0.5;
  actionTray = {
    x: panel.x + this.getScaledSize(16, 12, 18),
    y: layout.buttons.primary.y - this.getScaledSize(8, 6, 10),
    width: panel.width - this.getScaledSize(32, 24, 36),
    height: layout.buttons.tertiary.y + layout.buttons.tertiary.height - (layout.buttons.primary.y - this.getScaledSize(8, 6, 10)) + this.getScaledSize(8, 6, 10)
  };
  this.drawClampedText('操作选项', this.width / 2, actionLabelY, panel.width - this.getScaledSize(72, 56, 80), this.getScaledSize(10, 9, 10), this.getScaledSize(8, 7, 8), 'bold', SOFT_INK, 'center', 'middle');
  this.drawInsetTray(actionTray);
  this.drawPrimaryButton(this.touchRects.pauseResumeButton, '继续游戏', { iconKey: 'iconKibble' });
  this.drawSecondaryButton(this.touchRects.pauseRestartButton, '重新开始', { iconKey: 'spawnDoor' });
  this.drawSecondaryButton(this.touchRects.pauseBackButton, '返回首页', { iconKey: 'iconTowerTabby' });
};

DefenseMinigameRuntime.prototype.renderResultOverlay = function (didWin) {
  var layout = this.getResultOverlayLayout();
  var metrics = this.getUiMetrics();
  var panel = layout.panel;
  var result = this.lastResult || {
    clearedWave: this.clearedWaveCount,
    lives: this.lives,
    kills: this.kills,
    time: this.elapsedTime
  };
  var primaryLabel = didWin ? '再守一局' : '重新挑战';
  var bestWave = this.stage ? this.getBestWaveForStage(this.stage.key) : 0;
  var resultSummary = this.stage ? (this.stage.title + ' · ' + result.clearedWave + '/' + this.stage.waves.length + ' 波') : ('完成波次 ' + result.clearedWave);
  var actionTray;
  var actionLabelY;

  this.ctx.fillStyle = 'rgba(24, 18, 12, 0.46)';
  this.ctx.fillRect(0, 0, this.width, this.height);
  utils.drawPanel(this.ctx, panel.x, panel.y, panel.width, panel.height, {
    fillStyle: 'rgba(255, 250, 242, 0.98)',
    strokeStyle: 'rgba(84, 65, 40, 0.18)',
    radius: metrics.panelRadius
  });
  this.drawPanelTexture(panel.x, panel.y, panel.width, panel.height, metrics.panelRadius, 0.14);
  this.drawBadgePill(
    this.width / 2,
    layout.badgeY,
    result.wasNewBestWave ? this.getScaledSize(142, 128, 146) : this.getScaledSize(132, 120, 136),
    result.wasNewBestWave ? '刷新最佳波次' : (didWin ? '防守成功' : '防守失守'),
    result.wasNewBestWave ? 'iconKibble' : (didWin ? 'defenseTarget' : 'spawnDoor'),
    result.wasNewBestWave ? 'rgba(255, 184, 106, 0.22)' : (didWin ? 'rgba(123, 207, 138, 0.18)' : 'rgba(239, 123, 109, 0.16)'),
    result.wasNewBestWave ? 'rgba(84, 65, 40, 0.14)' : (didWin ? 'rgba(123, 207, 138, 0.4)' : 'rgba(239, 123, 109, 0.34)')
  );
  this.drawClampedText(didWin ? '防线守住了' : '防线失守', this.width / 2, layout.titleY, panel.width - this.getScaledSize(48, 32, 52), this.getScaledSize(28, 22, 28), this.getScaledSize(18, 16, 20), 'bold', INK, 'center', 'middle');
  this.drawClampedText(resultSummary, this.width / 2, layout.summaryY, panel.width - this.getScaledSize(48, 32, 52), this.getScaledSize(14, 12, 14), this.getScaledSize(10, 9, 11), null, SOFT_INK, 'center', 'middle');
  this.drawClampedText(didWin ? this.stage.objective + ' 已守住' : this.stage.objective + ' 被突破', this.width / 2, layout.detailY, panel.width - this.getScaledSize(48, 32, 52), this.getScaledSize(12, 10, 12), this.getScaledSize(9, 8, 10), null, SOFT_INK, 'center', 'middle');
  this.drawSectionRule(panel.x, panel.y, panel.width, layout.sectionLineY);
  this.drawMetricCard(layout.row1Left.x, layout.row1Left.y, layout.row1Left.width, layout.row1Left.height, '完成波次', String(result.clearedWave), {
    iconKey: 'spawnDoor',
    fillStyle: 'rgba(255, 184, 106, 0.16)',
    strokeStyle: 'rgba(255, 176, 92, 0.26)',
    valueColor: '#9a5e1b',
    textureAlpha: 0.06
  });
  this.drawMetricCard(layout.row1Right.x, layout.row1Right.y, layout.row1Right.width, layout.row1Right.height, '本关最佳', String(bestWave), {
    iconKey: 'iconKibble',
    fillStyle: result.wasNewBestWave ? 'rgba(255, 214, 128, 0.22)' : 'rgba(255, 248, 238, 0.98)',
    strokeStyle: result.wasNewBestWave ? 'rgba(255, 176, 92, 0.34)' : 'rgba(84, 65, 40, 0.22)',
    valueColor: result.wasNewBestWave ? '#9a5e1b' : INK,
    textureAlpha: 0.08
  });
  this.drawMetricCard(layout.row2Left.x, layout.row2Left.y, layout.row2Left.width, layout.row2Left.height, '剩余生命', String(Math.max(0, result.lives)), {
    iconKey: 'defenseTarget',
    fillStyle: 'rgba(123, 207, 138, 0.16)',
    strokeStyle: 'rgba(123, 207, 138, 0.28)',
    valueColor: '#2f7650',
    textureAlpha: 0.06
  });
  this.drawMetricCard(layout.row2Right.x, layout.row2Right.y, layout.row2Right.width, layout.row2Right.height, '用时', utils.formatTime(result.time), {
    fillStyle: 'rgba(181, 217, 236, 0.22)',
    strokeStyle: 'rgba(118, 145, 167, 0.26)',
    valueColor: '#476272',
    textureAlpha: 0.06
  });
  actionLabelY = layout.row2Left.y + layout.row2Left.height + (layout.buttons.primary.y - (layout.row2Left.y + layout.row2Left.height)) * 0.5;
  actionTray = {
    x: panel.x + this.getScaledSize(16, 12, 18),
    y: layout.buttons.primary.y - this.getScaledSize(8, 6, 10),
    width: panel.width - this.getScaledSize(32, 24, 36),
    height: layout.buttons.secondary.y + layout.buttons.secondary.height - (layout.buttons.primary.y - this.getScaledSize(8, 6, 10)) + this.getScaledSize(8, 6, 10)
  };
  this.drawClampedText('下一步', this.width / 2, actionLabelY, panel.width - this.getScaledSize(72, 56, 80), this.getScaledSize(10, 9, 10), this.getScaledSize(8, 7, 8), 'bold', SOFT_INK, 'center', 'middle');
  this.drawInsetTray(actionTray);
  this.drawPrimaryButton(this.touchRects.resultPrimaryButton, primaryLabel, { iconKey: 'iconKibble' });
  this.drawSecondaryButton(this.touchRects.resultBackButton, '返回首页', { iconKey: 'iconTowerTabby' });
};

DefenseMinigameRuntime.prototype.drawGameplayCue = function () {
  var metrics = this.getUiMetrics();
  var now = Date.now();
  var bannerOpacity;
  var hintOpacity;
  var bannerWidth;
  var bannerHeight;
  var bannerX;
  var bannerY;
  var hintWidth;
  var hintHeight;
  var hintX;
  var hintTop;
  var hintLabelWidth;
  var hintLabelHeight;
  var selectedPanel;

  if (this.bannerText && now < this.bannerUntil) {
    bannerOpacity = utils.clamp((this.bannerUntil - now) / 250, 0, 1);
    bannerWidth = Math.min(this.width - this.getScaledSize(40, 28, 44) * 2, this.getScaledSize(256, 220, 260));
    bannerHeight = this.bannerSubtext ? this.getScaledSize(64, 58, 68) : this.getScaledSize(50, 46, 54);
    bannerX = this.width / 2 - bannerWidth / 2;
    bannerY = this.stage.playTop + this.getScaledSize(18, 14, 20);
    this.ctx.save();
    this.ctx.globalAlpha = 0.92 * Math.max(0.35, bannerOpacity);
    this.drawInsetTray(
      {
        x: bannerX,
        y: bannerY,
        width: bannerWidth,
        height: bannerHeight
      },
      {
        fillStyle: 'rgba(82, 60, 38, 0.92)',
        strokeStyle: 'rgba(255,255,255,0.1)',
        radius: metrics.cardRadius,
        textureAlpha: 0.06
      }
    );
    this.drawInlinePill(
      bannerX + (bannerWidth - this.getScaledSize(66, 58, 70)) / 2,
      bannerY + this.getScaledSize(8, 6, 8),
      this.getScaledSize(66, 58, 70),
      this.getScaledSize(16, 14, 16),
      '战况提示',
      {
        fillStyle: 'rgba(255, 184, 106, 0.22)',
        strokeStyle: 'rgba(255,255,255,0.12)',
        textColor: '#fff7eb',
        textureAlpha: 0.03
      }
    );
    this.drawClampedText(this.bannerText, this.width / 2, bannerY + (this.bannerSubtext ? this.getScaledSize(36, 32, 38) : this.getScaledSize(32, 28, 34)), bannerWidth - this.getScaledSize(28, 20, 32), this.getScaledSize(15, 13, 16), this.getScaledSize(11, 10, 12), 'bold', '#fff7eb', 'center', 'middle');
    if (this.bannerSubtext) {
      this.drawClampedText(this.bannerSubtext, this.width / 2, bannerY + bannerHeight - this.getScaledSize(12, 10, 12), bannerWidth - this.getScaledSize(28, 20, 32), this.getScaledSize(11, 9, 11), this.getScaledSize(8, 7, 8), null, 'rgba(255,247,235,0.74)', 'center', 'middle');
    }
    this.ctx.restore();
  }

  if (this.hintText && now < this.hintUntil) {
    hintOpacity = utils.clamp((this.hintUntil - now) / 220, 0, 1);
    hintLabelWidth = this.getScaledSize(46, 42, 48);
    hintLabelHeight = this.getScaledSize(16, 14, 16);
    hintWidth = Math.min(
      this.width - this.getScaledSize(32, 24, 36) * 2,
      Math.max(
        this.getScaledSize(174, 154, 182),
        this.measureTextWidth(this.hintText, this.getScaledSize(11, 10, 12), 'bold') + hintLabelWidth + this.getScaledSize(34, 28, 36)
      )
    );
    hintHeight = this.getScaledSize(34, 32, 36);
    hintTop = this.height - this.stage.bottomHudHeight - this.getScaledSize(48, 42, 50);
    selectedPanel = this.state === 'playing' && this.selectedPlacedTowerId ? this.getSelectedTowerPanelRect() : null;
    if (selectedPanel) {
      hintTop = Math.min(hintTop, selectedPanel.y - hintHeight - this.getScaledSize(12, 10, 14));
    }
    hintTop = Math.max(this.stage.playTop + this.getScaledSize(12, 10, 14), hintTop);
    hintX = this.width / 2 - hintWidth / 2;
    this.ctx.save();
    this.ctx.globalAlpha = 0.9 * Math.max(0.35, hintOpacity);
    this.drawInsetTray(
      {
        x: hintX,
        y: hintTop,
        width: hintWidth,
        height: hintHeight
      },
      {
        fillStyle: 'rgba(82, 60, 38, 0.9)',
        strokeStyle: 'rgba(255,255,255,0.08)',
        radius: this.getScaledSize(16, 14, 18),
        textureAlpha: 0.05
      }
    );
    this.drawInlinePill(
      hintX + this.getScaledSize(8, 6, 8),
      hintTop + (hintHeight - hintLabelHeight) / 2,
      hintLabelWidth,
      hintLabelHeight,
      '操作',
      {
        fillStyle: 'rgba(255, 184, 106, 0.18)',
        strokeStyle: 'rgba(255,255,255,0.12)',
        textColor: '#fff7eb',
        textureAlpha: 0.03
      }
    );
    this.drawClampedText(this.hintText, hintX + hintLabelWidth + this.getScaledSize(18, 14, 18), hintTop + hintHeight / 2 + 1 * this.scale, hintWidth - hintLabelWidth - this.getScaledSize(28, 22, 30), this.getScaledSize(11, 10, 12), this.getScaledSize(9, 8, 9), 'bold', '#fff7eb', 'left', 'middle');
    this.ctx.restore();
  }
};

DefenseMinigameRuntime.prototype.drawStageUnderlay = function () {
  var bgImage = this.assets.get('livingRoomBg');
  var theme = this.stage.theme || {};
  var playHeight = this.stage.playBottom - this.stage.playTop;
  var rugX = 26 * this.scale;
  var rugY = this.stage.playTop + 18 * this.scale;
  var rugWidth = this.width - 52 * this.scale;
  var rugHeight = playHeight - 36 * this.scale;
  var i;

  utils.fillRoundRect(this.ctx, rugX, rugY, rugWidth, rugHeight, 28 * this.scale, theme.underlayFill || 'rgba(255, 242, 221, 0.58)');
  if (bgImage) {
    this.ctx.save();
    this.buildRoundRectPath(rugX, rugY, rugWidth, rugHeight, 28 * this.scale);
    this.ctx.clip();
    this.ctx.globalAlpha = this.stage.key === 'kitchen_loop' ? 0.14 : 0.2;
    this.ctx.drawImage(bgImage, rugX, rugY, rugWidth, rugHeight);
    this.ctx.restore();
  }
  utils.strokeRoundRect(this.ctx, rugX, rugY, rugWidth, rugHeight, 28 * this.scale, theme.underlayStroke || 'rgba(124, 93, 60, 0.08)', 2);

  this.ctx.save();
  this.ctx.strokeStyle = theme.gridStroke || 'rgba(154, 120, 82, 0.07)';
  this.ctx.lineWidth = 1.5 * this.scale;
  for (i = 1; i <= 5; i += 1) {
    this.ctx.beginPath();
    this.ctx.moveTo(rugX + i * rugWidth / 6, rugY + 12 * this.scale);
    this.ctx.lineTo(rugX + i * rugWidth / 6, rugY + rugHeight - 12 * this.scale);
    this.ctx.stroke();
  }
  for (i = 1; i <= 3; i += 1) {
    this.ctx.beginPath();
    this.ctx.moveTo(rugX + 12 * this.scale, rugY + i * rugHeight / 4);
    this.ctx.lineTo(rugX + rugWidth - 12 * this.scale, rugY + i * rugHeight / 4);
    this.ctx.stroke();
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawPathMarkers = function (path) {
  var theme = this.stage.theme || {};
  var i;
  var from;
  var to;
  var dx;
  var dy;
  var distance;
  var angle;
  var markerX;
  var markerY;
  var stepDistance;

  this.ctx.save();
  this.ctx.fillStyle = theme.markerTint || 'rgba(255,255,255,0.34)';
  for (i = 0; i < path.length - 1; i += 1) {
    from = path[i];
    to = path[i + 1];
    dx = to.x - from.x;
    dy = to.y - from.y;
    distance = Math.sqrt(dx * dx + dy * dy) || 1;
    angle = Math.atan2(dy, dx);
    stepDistance = Math.max(90 * this.scale, distance / 2.4);

    for (markerX = stepDistance; markerX < distance - 20 * this.scale; markerX += stepDistance) {
      markerY = markerX;
      this.ctx.save();
      this.ctx.translate(from.x + Math.cos(angle) * markerX, from.y + Math.sin(angle) * markerY);
      this.ctx.rotate(angle);
      this.ctx.beginPath();
      this.ctx.moveTo(-6 * this.scale, -7 * this.scale);
      this.ctx.lineTo(8 * this.scale, 0);
      this.ctx.lineTo(-6 * this.scale, 7 * this.scale);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawSpawnMarker = function (point) {
  var theme = this.stage.theme || {};
  var image = this.assets.get('spawnDoor');

  if (image) {
    this.drawAssetCentered(image, 36 * this.scale, point.y - 1 * this.scale, 44 * this.scale, 44 * this.scale);
    utils.fillRoundRect(this.ctx, 10 * this.scale, point.y + 16 * this.scale, 54 * this.scale, 18 * this.scale, 10 * this.scale, theme.spawnFill || 'rgba(86, 60, 35, 0.86)');
    utils.setTextStyle(this.ctx, 10 * this.scale, 'bold', '#fff7eb', 'center', 'middle');
    this.ctx.fillText('入口', 37 * this.scale, point.y + 25 * this.scale);
    return;
  }

  utils.fillRoundRect(this.ctx, 14 * this.scale, point.y - 16 * this.scale, 50 * this.scale, 30 * this.scale, 16 * this.scale, theme.spawnFill || 'rgba(86, 60, 35, 0.86)');
  utils.strokeRoundRect(this.ctx, 14 * this.scale, point.y - 16 * this.scale, 50 * this.scale, 30 * this.scale, 16 * this.scale, 'rgba(255,255,255,0.12)', 2);
  utils.setTextStyle(this.ctx, 11 * this.scale, 'bold', '#fff7eb', 'center', 'middle');
  this.ctx.fillText('入口', 39 * this.scale, point.y - 1 * this.scale);
};

DefenseMinigameRuntime.prototype.drawTarget = function (target) {
  var image = this.assets.get('defenseTarget');
  var theme = this.stage.theme || {};
  var label = target.label || '目标';
  this.ctx.save();
  this.ctx.strokeStyle = theme.targetRing || 'rgba(255, 227, 154, 0.28)';
  this.ctx.lineWidth = 10 * this.scale;
  this.ctx.beginPath();
  this.ctx.arc(target.x, target.y, target.radius + 8 * this.scale, 0, Math.PI * 2);
  this.ctx.stroke();
  if (image) {
    this.drawAssetCentered(image, target.x, target.y - 1 * this.scale, 46 * this.scale, 46 * this.scale, label === '冰箱' ? 0.92 : 1);
    if (label === '冰箱') {
      utils.fillRoundRect(this.ctx, target.x - 22 * this.scale, target.y + 9 * this.scale, 44 * this.scale, 18 * this.scale, 9 * this.scale, 'rgba(213, 238, 249, 0.94)');
      utils.strokeRoundRect(this.ctx, target.x - 22 * this.scale, target.y + 9 * this.scale, 44 * this.scale, 18 * this.scale, 9 * this.scale, 'rgba(71, 98, 114, 0.34)', 2);
      utils.setTextStyle(this.ctx, 10 * this.scale, 'bold', theme.targetInk || '#476272', 'center', 'middle');
      this.ctx.fillText(label, target.x, target.y + 18 * this.scale);
    }
    this.ctx.restore();
    return;
  }
  {
    utils.fillRoundRect(this.ctx, target.x - 20 * this.scale, target.y - 20 * this.scale, 40 * this.scale, 40 * this.scale, 12 * this.scale, theme.targetFill || '#ffe39a');
    utils.strokeRoundRect(this.ctx, target.x - 20 * this.scale, target.y - 20 * this.scale, 40 * this.scale, 40 * this.scale, 12 * this.scale, 'rgba(100, 82, 32, 0.36)', 2);
    utils.fillRoundRect(this.ctx, target.x - 16 * this.scale, target.y - 26 * this.scale, 32 * this.scale, 8 * this.scale, 6 * this.scale, theme.targetCap || '#ffd16c');
    utils.setTextStyle(this.ctx, 11 * this.scale, 'bold', theme.targetInk || '#7d5318', 'center', 'middle');
    this.ctx.fillText(label, target.x, target.y);
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawSlot = function (slot) {
  var image = this.assets.get('towerSlot');
  var towerType = this.selectedTowerKey ? this.stage.towerTypes[this.selectedTowerKey] : null;
  var nearestPathPoint = towerType ? this.getNearestPathPoint(slot.x, slot.y) : null;
  var occupied = this.towers.some(function (tower) {
    return tower.slotId === slot.id;
  });
  var selectedForBuild = !!towerType && !occupied;
  var affordable = !towerType || towerType.cost <= this.gold;
  var fillColor = SLOT_IDLE;
  var strokeColor = 'rgba(92, 72, 40, 0.22)';
  var lineWidth = 2 * this.scale;
  var buildPromptText;
  var buildPromptWidth;
  var buildPromptHeight;
  var buildPromptY;

  if (occupied) {
    fillColor = 'rgba(92, 72, 40, 0.08)';
    strokeColor = 'rgba(92, 72, 40, 0.16)';
  } else if (selectedForBuild && affordable) {
    fillColor = SLOT_ACTIVE;
    strokeColor = ACCENT;
    lineWidth = 3 * this.scale;
  } else if (selectedForBuild && !affordable) {
    fillColor = 'rgba(239, 123, 109, 0.14)';
    strokeColor = 'rgba(239, 123, 109, 0.74)';
  }

  this.ctx.save();
  if (image) {
    this.drawAssetCentered(image, slot.x, slot.y, slot.radius * 2.15, slot.radius * 2.15, occupied ? 0.34 : 0.92);
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
    this.ctx.stroke();
  } else {
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    this.ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }
  if (selectedForBuild && nearestPathPoint) {
    this.ctx.save();
    this.ctx.strokeStyle = affordable ? 'rgba(255, 176, 92, 0.42)' : 'rgba(239, 123, 109, 0.34)';
    this.ctx.setLineDash([6 * this.scale, 5 * this.scale]);
    this.ctx.lineWidth = 2 * this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(slot.x, slot.y);
    this.ctx.lineTo(nearestPathPoint.x, nearestPathPoint.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = affordable ? 'rgba(255, 176, 92, 0.78)' : 'rgba(239, 123, 109, 0.68)';
    this.ctx.beginPath();
    this.ctx.arc(nearestPathPoint.x, nearestPathPoint.y, 5 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
  if (selectedForBuild && affordable) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.28;
    this.drawTowerIcon(this.ctx, {
      x: slot.x,
      y: slot.y - 2 * this.scale,
      typeKey: towerType.key,
      radius: 11 * this.scale
    });
    this.ctx.restore();
  }
  if (!occupied) {
    this.ctx.strokeStyle = selectedForBuild ? (affordable ? 'rgba(90, 58, 32, 0.72)' : 'rgba(164, 66, 52, 0.82)') : 'rgba(92, 72, 40, 0.28)';
    this.ctx.lineWidth = 2 * this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(slot.x - 8 * this.scale, slot.y);
    this.ctx.lineTo(slot.x + 8 * this.scale, slot.y);
    this.ctx.moveTo(slot.x, slot.y - 8 * this.scale);
    this.ctx.lineTo(slot.x, slot.y + 8 * this.scale);
    this.ctx.stroke();
    if (selectedForBuild) {
      buildPromptText = affordable ? ('建造 ' + towerType.cost) : ('差 ' + Math.max(0, towerType.cost - this.gold));
      buildPromptHeight = this.getScaledSize(16, 14, 16);
      buildPromptWidth = Math.max(
        this.getScaledSize(34, 30, 36),
        this.measureTextWidth(buildPromptText, this.getScaledSize(8, 7, 8), 'bold') + this.getScaledSize(14, 12, 16)
      );
      buildPromptY = Math.min(
        slot.y + slot.radius + this.getScaledSize(6, 5, 7),
        this.stage.playBottom - buildPromptHeight - this.getScaledSize(6, 5, 8)
      );
      this.drawInlinePill(
        slot.x - buildPromptWidth / 2,
        buildPromptY,
        buildPromptWidth,
        buildPromptHeight,
        buildPromptText,
        {
          fillStyle: affordable ? 'rgba(255, 184, 106, 0.2)' : 'rgba(239, 123, 109, 0.16)',
          strokeStyle: affordable ? 'rgba(90, 58, 32, 0.16)' : 'rgba(239, 123, 109, 0.24)',
          textColor: affordable ? '#5a3a20' : '#f6d3ce',
          textureAlpha: 0.03
        }
      );
    }
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawTower = function (tower) {
  var selected = tower.id === this.selectedPlacedTowerId;
  var image = this.assets.get(this.getTowerAssetKey(tower.typeKey, false));
  var stats;

  if (selected) {
    stats = this.getTowerStats(tower);
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 176, 92, 0.08)';
    this.ctx.beginPath();
    this.ctx.arc(tower.x, tower.y, stats.range * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 176, 92, 0.42)';
    this.ctx.setLineDash([10 * this.scale, 8 * this.scale]);
    this.ctx.lineWidth = 2 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(tower.x, tower.y, stats.range * this.scale, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 176, 92, 0.95)';
    this.ctx.lineWidth = 3 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(tower.x, tower.y, 28 * this.scale, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  if (!this.drawAssetCentered(image, tower.x, tower.y - 2 * this.scale, 54 * this.scale, 54 * this.scale)) {
    this.drawTowerIcon(this.ctx, {
      x: tower.x,
      y: tower.y,
      typeKey: tower.typeKey,
      radius: 24 * this.scale
    });
  }
  utils.setTextStyle(this.ctx, 10 * this.scale, 'bold', '#fffaf2', 'center', 'middle');
  this.ctx.fillText('Lv.' + tower.level, tower.x, tower.y + 30 * this.scale);
};

DefenseMinigameRuntime.prototype.drawTowerIcon = function (ctx, spec) {
  var useIcon = spec.useIcon !== undefined ? spec.useIcon : spec.radius <= 16 * this.scale;
  var assetKey = this.getTowerAssetKey(spec.typeKey, useIcon);
  var image = this.assets.get(assetKey);
  var towerType = this.stage ? this.stage.towerTypes[spec.typeKey] : content.TOWER_TYPES[spec.typeKey];
  var radius = spec.radius;
  var earOffset = radius * 0.55;
  var earHeight = radius * 0.8;

  if (image) {
    this.drawAssetCentered(image, spec.x, spec.y, radius * 2.28, radius * 2.28);
    return;
  }

  ctx.save();
  ctx.fillStyle = towerType.tint;
  ctx.beginPath();
  ctx.arc(spec.x, spec.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(84, 65, 40, 0.32)';
  ctx.lineWidth = 2 * this.scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(spec.x - earOffset, spec.y - radius * 0.2);
  ctx.lineTo(spec.x - radius * 0.15, spec.y - earHeight);
  ctx.lineTo(spec.x + radius * 0.05, spec.y - radius * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(spec.x + earOffset, spec.y - radius * 0.2);
  ctx.lineTo(spec.x + radius * 0.15, spec.y - earHeight);
  ctx.lineTo(spec.x - radius * 0.05, spec.y - radius * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff7ec';
  ctx.beginPath();
  ctx.arc(spec.x - radius * 0.28, spec.y - radius * 0.02, radius * 0.12, 0, Math.PI * 2);
  ctx.arc(spec.x + radius * 0.28, spec.y - radius * 0.02, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(64, 48, 34, 0.75)';
  ctx.lineWidth = 1.5 * this.scale;
  ctx.beginPath();
  ctx.moveTo(spec.x - radius * 0.12, spec.y + radius * 0.18);
  ctx.lineTo(spec.x, spec.y + radius * 0.26);
  ctx.lineTo(spec.x + radius * 0.12, spec.y + radius * 0.18);
  ctx.stroke();

  if (spec.typeKey === 'tabby') {
    ctx.strokeStyle = 'rgba(108, 66, 20, 0.72)';
    ctx.beginPath();
    ctx.moveTo(spec.x - radius * 0.34, spec.y - radius * 0.34);
    ctx.lineTo(spec.x - radius * 0.1, spec.y - radius * 0.16);
    ctx.moveTo(spec.x + radius * 0.34, spec.y - radius * 0.34);
    ctx.lineTo(spec.x + radius * 0.1, spec.y - radius * 0.16);
    ctx.stroke();
  } else if (spec.typeKey === 'siamese') {
    ctx.fillStyle = 'rgba(58, 86, 112, 0.78)';
    ctx.beginPath();
    ctx.arc(spec.x, spec.y + radius * 0.02, radius * 0.36, Math.PI, 0, false);
    ctx.lineTo(spec.x + radius * 0.16, spec.y + radius * 0.22);
    ctx.lineTo(spec.x - radius * 0.16, spec.y + radius * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#eef7ff';
    ctx.beginPath();
    ctx.moveTo(spec.x + radius * 0.18, spec.y - radius * 0.2);
    ctx.lineTo(spec.x + radius * 0.5, spec.y - radius * 0.44);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(spec.x + radius * 0.52, spec.y - radius * 0.46, radius * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  } else if (spec.typeKey === 'chonky') {
    ctx.fillStyle = 'rgba(255, 244, 224, 0.82)';
    ctx.beginPath();
    ctx.arc(spec.x - radius * 0.32, spec.y + radius * 0.18, radius * 0.14, 0, Math.PI * 2);
    ctx.arc(spec.x + radius * 0.32, spec.y + radius * 0.18, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(130, 82, 42, 0.24)';
    ctx.beginPath();
    ctx.arc(spec.x, spec.y + radius * 0.42, radius * 0.34, 0, Math.PI);
    ctx.fill();
  } else if (spec.typeKey === 'boba') {
    ctx.fillStyle = 'rgba(52, 89, 75, 0.34)';
    ctx.beginPath();
    ctx.arc(spec.x - radius * 0.28, spec.y - radius * 0.28, radius * 0.18, 0, Math.PI * 2);
    ctx.arc(spec.x + radius * 0.08, spec.y - radius * 0.18, radius * 0.22, 0, Math.PI * 2);
    ctx.arc(spec.x + radius * 0.38, spec.y - radius * 0.28, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

DefenseMinigameRuntime.prototype.drawEnemy = function (enemy) {
  var image = this.assets.get(this.getEnemyAssetKey(enemy.typeKey));
  var enemyType = this.stage.enemyTypes[enemy.typeKey];
  var centerX = enemy.x + enemy.width / 2;
  var centerY = enemy.y + enemy.height / 2;
  var hpRatio = utils.clamp(enemy.health / enemy.maxHealth, 0, 1);
  var badgeText = enemy.typeKey === 'vacuum' ? '重甲' : (enemy.typeKey === 'mailman' ? '首领' : '');
  var pulse = 0.5 + Math.sin(Date.now() / 180) * 0.18;

  this.ctx.save();
  if (image) {
    this.drawAssetFit(image, enemy.x, enemy.y, enemy.width, enemy.height);
  } else {
    this.ctx.fillStyle = enemyType.tint;
    if (enemy.typeKey === 'dust') {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, enemy.width * 0.45, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(84, 65, 40, 0.22)';
      this.ctx.lineWidth = 1.5 * this.scale;
      this.ctx.beginPath();
      this.ctx.arc(centerX - 5 * this.scale, centerY - 2 * this.scale, 2 * this.scale, 0, Math.PI * 2);
      this.ctx.arc(centerX + 5 * this.scale, centerY - 2 * this.scale, 2 * this.scale, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (enemy.typeKey === 'vacuum') {
      utils.fillRoundRect(this.ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.width * 0.26, enemyType.tint);
      utils.fillRoundRect(this.ctx, enemy.x + enemy.width * 0.18, enemy.y + enemy.height * 0.2, enemy.width * 0.48, enemy.height * 0.34, 8 * this.scale, 'rgba(250, 252, 255, 0.42)');
      this.ctx.strokeStyle = 'rgba(50, 70, 108, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(enemy.x + enemy.width * 0.82, enemy.y + enemy.height * 0.52, enemy.width * 0.14, 0, Math.PI * 2);
      this.ctx.stroke();
    } else {
      utils.fillRoundRect(this.ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.typeKey === 'mailman' ? 10 * this.scale : 14 * this.scale, enemyType.tint);
      if (enemy.typeKey === 'cucumber') {
        utils.fillRoundRect(this.ctx, enemy.x + enemy.width * 0.22, enemy.y + enemy.height * 0.1, enemy.width * 0.56, enemy.height * 0.78, 999, 'rgba(183, 234, 180, 0.32)');
      } else if (enemy.typeKey === 'mailman') {
        utils.fillRoundRect(this.ctx, enemy.x + enemy.width * 0.18, enemy.y - enemy.height * 0.08, enemy.width * 0.52, enemy.height * 0.18, 999, '#ca8954');
        utils.fillRoundRect(this.ctx, enemy.x + enemy.width * 0.64, enemy.y + enemy.height * 0.22, enemy.width * 0.18, enemy.height * 0.3, 6 * this.scale, '#d66b55');
      }
    }
  }
  this.ctx.strokeStyle = 'rgba(84, 65, 40, 0.2)';
  this.ctx.lineWidth = 2 * this.scale;
  if (!image) {
    if (enemy.typeKey === 'dust') {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, enemy.width * 0.45, 0, Math.PI * 2);
      this.ctx.stroke();
    } else {
      utils.strokeRoundRect(this.ctx, enemy.x, enemy.y, enemy.width, enemy.height, 12 * this.scale, 'rgba(84, 65, 40, 0.28)', 2);
    }
  }
  if (!image) {
    this.ctx.fillStyle = 'rgba(59, 45, 32, 0.82)';
    this.ctx.beginPath();
    this.ctx.arc(centerX - 5 * this.scale, centerY - 2 * this.scale, 2 * this.scale, 0, Math.PI * 2);
    this.ctx.arc(centerX + 5 * this.scale, centerY - 2 * this.scale, 2 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  utils.fillRoundRect(this.ctx, enemy.x, enemy.y - 10 * this.scale, enemy.width, 5 * this.scale, 999, 'rgba(67, 50, 36, 0.18)');
  utils.fillRoundRect(this.ctx, enemy.x, enemy.y - 10 * this.scale, enemy.width * hpRatio, 5 * this.scale, 999, DANGER);
  if (badgeText) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.12 + pulse * 0.18;
    this.ctx.fillStyle = enemy.typeKey === 'mailman' ? 'rgba(239, 123, 109, 0.9)' : 'rgba(114, 134, 192, 0.82)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, enemy.width * (enemy.typeKey === 'mailman' ? 0.82 : 0.74), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
    utils.fillRoundRect(this.ctx, centerX - 15 * this.scale, enemy.y - 28 * this.scale, 30 * this.scale, 14 * this.scale, 8 * this.scale, enemy.typeKey === 'mailman' ? 'rgba(239, 123, 109, 0.9)' : 'rgba(114, 134, 192, 0.9)');
    utils.setTextStyle(this.ctx, 8 * this.scale, 'bold', '#fffaf2', 'center', 'middle');
    this.ctx.fillText(badgeText, centerX, enemy.y - 21 * this.scale);
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawProjectile = function (projectile) {
  var image = this.assets.get(this.getProjectileAssetKey(projectile.kind));
  this.ctx.save();
  if (image) {
    this.drawAssetCentered(image, projectile.x, projectile.y, projectile.kind === 'bone' ? 18 * this.scale : (projectile.kind === 'bun' ? 20 * this.scale : 16 * this.scale), projectile.kind === 'bun' ? 20 * this.scale : 16 * this.scale);
    this.ctx.restore();
    return;
  }
  if (projectile.kind === 'bone') {
    this.ctx.strokeStyle = '#fff4d6';
    this.ctx.lineWidth = 3 * this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(projectile.x - 7 * this.scale, projectile.y - 4 * this.scale);
    this.ctx.lineTo(projectile.x + 7 * this.scale, projectile.y + 4 * this.scale);
    this.ctx.stroke();
    this.ctx.fillStyle = '#fff4d6';
    this.ctx.beginPath();
    this.ctx.arc(projectile.x - 8 * this.scale, projectile.y - 4 * this.scale, 2 * this.scale, 0, Math.PI * 2);
    this.ctx.arc(projectile.x + 8 * this.scale, projectile.y + 4 * this.scale, 2 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
  } else if (projectile.kind === 'bun') {
    this.ctx.fillStyle = '#ef7b6d';
    this.ctx.beginPath();
    this.ctx.arc(projectile.x, projectile.y, 8 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 241, 230, 0.72)';
    this.ctx.lineWidth = 2 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(projectile.x, projectile.y, 11 * this.scale, 0, Math.PI * 2);
    this.ctx.stroke();
  } else if (projectile.kind === 'boba') {
    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(projectile.x, projectile.y, 5.5 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(126, 215, 193, 0.34)';
    this.ctx.beginPath();
    this.ctx.arc(projectile.x + 3 * this.scale, projectile.y - 3 * this.scale, 2 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
  } else {
    this.ctx.fillStyle = '#7bcf8a';
    this.ctx.beginPath();
    this.ctx.ellipse(projectile.x, projectile.y, 6.5 * this.scale, 4.5 * this.scale, 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    this.ctx.lineWidth = 1.5 * this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(projectile.x - 7 * this.scale, projectile.y);
    this.ctx.lineTo(projectile.x - 12 * this.scale, projectile.y);
    this.ctx.stroke();
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawFeedbackMark = function (mark) {
  var progress = utils.clamp(mark.age / mark.lifetime, 0, 1);
  var alpha = 1 - progress;
  var radius = mark.radius * (mark.kind === 'enemyDown' ? (0.62 + progress * 0.72) : (0.46 + progress * 0.88));

  this.ctx.save();
  this.ctx.globalAlpha = 0.8 * alpha;
  if (mark.kind === 'enemyDown') {
    this.ctx.strokeStyle = mark.tint;
    this.ctx.lineWidth = 3 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fillStyle = mark.tint;
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, 4 * this.scale + progress * 3 * this.scale, 0, Math.PI * 2);
    this.ctx.fill();
  } else if (mark.kind === 'sniperHit') {
    this.ctx.strokeStyle = mark.tint;
    this.ctx.lineWidth = 2.5 * this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(mark.x - radius, mark.y - radius);
    this.ctx.lineTo(mark.x + radius, mark.y + radius);
    this.ctx.moveTo(mark.x + radius, mark.y - radius);
    this.ctx.lineTo(mark.x - radius, mark.y + radius);
    this.ctx.stroke();
  } else if (mark.kind === 'splashHit') {
    this.ctx.strokeStyle = mark.tint;
    this.ctx.lineWidth = 3 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, radius * 0.5, 0, Math.PI * 2);
    this.ctx.stroke();
  } else if (mark.kind === 'slowHit') {
    this.ctx.strokeStyle = mark.tint;
    this.ctx.lineWidth = 2.4 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, radius * 0.9, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(mark.x - radius * 0.7, mark.y);
    this.ctx.lineTo(mark.x + radius * 0.7, mark.y);
    this.ctx.stroke();
  } else {
    this.ctx.strokeStyle = mark.tint;
    this.ctx.lineWidth = 4 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.globalAlpha = 0.28 * alpha;
    this.ctx.fillStyle = mark.tint;
    this.ctx.beginPath();
    this.ctx.arc(mark.x, mark.y, radius * 0.72, 0, Math.PI * 2);
    this.ctx.fill();
  }
  this.ctx.restore();
};

DefenseMinigameRuntime.prototype.drawBuildButton = function (rect, towerType, selected) {
  var affordable = towerType.cost <= this.gold;
  var iconImage = this.assets.get(this.getTowerAssetKey(towerType.key, true));
  var metrics = this.getUiMetrics();
  var compact = rect.width < this.getScaledSize(56, 50, 58) || rect.height < this.getScaledSize(64, 58, 66);
  var primaryColor = selected ? INK : (affordable ? '#fff7eb' : 'rgba(255,247,235,0.42)');
  var secondaryColor = selected ? SOFT_INK : (affordable ? 'rgba(255,247,235,0.72)' : 'rgba(255,247,235,0.34)');
  var iconSize;
  var costPillWidth;
  var costPillHeight = this.getScaledSize(14, 12, 14);
  var costFill;
  var costStroke;
  var costTextColor;
  var accentBarHeight = this.getScaledSize(4, 4, 5);
  var accentBarInset = this.getScaledSize(6, 5, 6);
  var accentAlpha = selected ? 1 : (affordable ? 0.34 : 0.18);

  this.drawTexturedButton(
    rect,
    metrics.cardRadius,
    selected ? 'rgba(255, 250, 242, 0.96)' : (affordable ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'),
    selected ? towerType.tint : (affordable ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'),
    selected ? 3 : 2,
    selected ? 0.12 : 0.08
  );
  this.ctx.save();
  this.ctx.globalAlpha = accentAlpha;
  utils.fillRoundRect(this.ctx, rect.x + accentBarInset, rect.y + accentBarInset, rect.width - accentBarInset * 2, accentBarHeight, this.getScaledSize(3, 3, 4), towerType.tint);
  this.ctx.restore();
  costFill = selected ? 'rgba(255, 184, 106, 0.22)' : (affordable ? 'rgba(255,255,255,0.08)' : 'rgba(239, 123, 109, 0.16)');
  costStroke = selected ? 'rgba(84, 65, 40, 0.16)' : (affordable ? 'rgba(255,255,255,0.12)' : 'rgba(239, 123, 109, 0.26)');
  costTextColor = selected ? '#5a3a20' : (affordable ? '#fff7eb' : '#f6d3ce');

  if (compact) {
    iconSize = Math.min(rect.width * 0.54, rect.height * 0.34, this.getScaledSize(24, 18, 26));
    if (!this.drawAssetCentered(iconImage, rect.x + rect.width / 2, rect.y + rect.height * 0.3, iconSize, iconSize, 0.96)) {
      this.drawTowerIcon(this.ctx, {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height * 0.3,
        typeKey: towerType.key,
        radius: iconSize * 0.42,
        useIcon: true
      });
    }
    this.drawClampedText(towerType.name, rect.x + rect.width / 2, rect.y + rect.height * 0.58, rect.width - this.getScaledSize(8, 6, 10), this.getScaledSize(10, 8, 11), this.getScaledSize(8, 7, 8), 'bold', primaryColor, 'center', 'middle');
    costPillWidth = Math.min(rect.width - this.getScaledSize(10, 8, 12), Math.max(this.getScaledSize(20, 18, 22), this.measureTextWidth(String(towerType.cost), this.getScaledSize(8, 7, 8), 'bold') + this.getScaledSize(12, 10, 14)));
    this.drawInlinePill(
      rect.x + (rect.width - costPillWidth) / 2,
      rect.y + rect.height - costPillHeight - this.getScaledSize(6, 5, 6),
      costPillWidth,
      costPillHeight,
      String(towerType.cost),
      {
        fillStyle: costFill,
        strokeStyle: costStroke,
        textColor: costTextColor,
        textureAlpha: 0.04
      }
    );
  } else {
    if (!this.drawAssetCentered(iconImage, rect.x + this.getScaledSize(24, 20, 26), rect.y + rect.height / 2, this.getScaledSize(28, 24, 28), this.getScaledSize(28, 24, 28), 0.96)) {
      this.drawTowerIcon(this.ctx, {
        x: rect.x + this.getScaledSize(24, 20, 26),
        y: rect.y + rect.height / 2,
        typeKey: towerType.key,
        radius: this.getScaledSize(14, 12, 14),
        useIcon: true
      });
    }
    this.drawClampedText(towerType.name, rect.x + this.getScaledSize(42, 36, 44), rect.y + this.getScaledSize(22, 18, 24), rect.width - this.getScaledSize(52, 46, 56), this.getScaledSize(11, 10, 12), this.getScaledSize(9, 8, 9), 'bold', primaryColor, 'left', 'middle');
    this.drawClampedText(towerType.role, rect.x + this.getScaledSize(42, 36, 44), rect.y + this.getScaledSize(42, 36, 44), rect.width - this.getScaledSize(54, 48, 58), this.getScaledSize(10, 9, 10), this.getScaledSize(8, 7, 8), null, secondaryColor, 'left', 'middle');
    costPillWidth = Math.min(rect.width - this.getScaledSize(54, 48, 58), Math.max(this.getScaledSize(26, 22, 28), this.measureTextWidth(String(towerType.cost), this.getScaledSize(8, 7, 8), 'bold') + this.getScaledSize(14, 12, 16)));
    this.drawInlinePill(
      rect.x + this.getScaledSize(42, 36, 44),
      rect.y + rect.height - costPillHeight - this.getScaledSize(8, 6, 8),
      costPillWidth,
      costPillHeight,
      String(towerType.cost),
      {
        fillStyle: costFill,
        strokeStyle: costStroke,
        textColor: selected ? '#5a3a20' : secondaryColor,
        textureAlpha: 0.04
      }
    );
  }
  if (selected) {
    utils.fillRoundRect(this.ctx, rect.x + rect.width - this.getScaledSize(compact ? 24 : 42, compact ? 20 : 34, compact ? 24 : 44), rect.y + this.getScaledSize(8, 6, 8), this.getScaledSize(compact ? 18 : 30, compact ? 16 : 26, compact ? 18 : 30), this.getScaledSize(compact ? 12 : 16, 12, 16), this.getScaledSize(8, 6, 8), 'rgba(255, 184, 106, 0.92)');
    this.drawClampedText(compact ? '选' : '已选', rect.x + rect.width - this.getScaledSize(compact ? 15 : 27, compact ? 13 : 22, compact ? 15 : 27), rect.y + this.getScaledSize(compact ? 14 : 16, 12, 16), this.getScaledSize(compact ? 16 : 24, compact ? 14 : 22, compact ? 16 : 24), this.getScaledSize(compact ? 8 : 8, 7, 8), this.getScaledSize(7, 7, 8), 'bold', '#5a3a20', 'center', 'middle');
  }
};

DefenseMinigameRuntime.prototype.drawMiniMetricCard = function (rect, label, value, options) {
  var valueColor;

  options = options || {};
  valueColor = options.valueColor || INK;

  this.drawTexturedButton(
    rect,
    this.getUiMetrics().cardRadius,
    'rgba(255, 248, 238, 0.98)',
    'rgba(84, 65, 40, 0.16)',
    2,
    0.06
  );
  this.drawClampedText(
    label,
    rect.x + rect.width / 2,
    rect.y + rect.height * 0.34,
    rect.width - this.getScaledSize(12, 10, 14),
    this.getScaledSize(9, 8, 10),
    this.getScaledSize(8, 7, 8),
    null,
    SOFT_INK,
    'center',
    'middle'
  );
  this.drawClampedText(
    value,
    rect.x + rect.width / 2,
    rect.y + rect.height * 0.72,
    rect.width - this.getScaledSize(12, 10, 14),
    this.getScaledSize(15, 13, 16),
    this.getScaledSize(11, 10, 12),
    'bold',
    valueColor,
    'center',
    'middle'
  );
};

DefenseMinigameRuntime.prototype.drawMetricCard = function (x, y, width, height, label, value, options) {
  var iconImage = null;
  var textOffset = 16 * this.scale;
  var metrics = this.getUiMetrics();
  var fillStyle;
  var strokeStyle;
  var labelColor;
  var valueColor;
  var textureAlpha;

  options = options || {};
  if (options.iconKey) {
    iconImage = this.assets.get(options.iconKey);
  }
  fillStyle = options.fillStyle || 'rgba(255, 248, 238, 0.98)';
  strokeStyle = options.strokeStyle || 'rgba(84, 65, 40, 0.22)';
  labelColor = options.labelColor || SOFT_INK;
  valueColor = options.valueColor || INK;
  textureAlpha = options.textureAlpha === undefined ? 0.08 : options.textureAlpha;

  utils.fillRoundRect(this.ctx, x, y, width, height, metrics.cardRadius, fillStyle);
  utils.strokeRoundRect(this.ctx, x, y, width, height, metrics.cardRadius, strokeStyle, 2);
  if (iconImage) {
    this.drawAssetCentered(iconImage, x + this.getScaledSize(20, 18, 22), y + height / 2, this.getScaledSize(24, 20, 24), this.getScaledSize(24, 20, 24), 0.92);
    textOffset = this.getScaledSize(36, 30, 38);
  }
  this.drawPanelTexture(x, y, width, height, metrics.cardRadius, textureAlpha);
  this.drawClampedText(label, x + textOffset, y + this.getScaledSize(20, 18, 22), width - textOffset - this.getScaledSize(12, 10, 14), metrics.metricLabelFont, metrics.detailFont, null, labelColor, 'left', 'middle');
  this.drawClampedText(value, x + textOffset, y + this.getScaledSize(42, 38, 44), width - textOffset - this.getScaledSize(12, 10, 14), metrics.metricValueFont, metrics.metricLabelFont, 'bold', valueColor, 'left', 'middle');
};

DefenseMinigameRuntime.prototype.drawPrimaryButton = function (rect, label, options) {
  var iconImage = null;
  var labelX = rect.x + rect.width / 2;
  var metrics = this.getUiMetrics();

  options = options || {};
  if (options.iconKey) {
    iconImage = this.assets.get(options.iconKey);
  }

  this.drawTexturedButton(rect, metrics.primaryButtonRadius, 'rgba(255, 184, 106, 0.98)', 'rgba(255,255,255,0.32)', 2, 0.1);
  if (iconImage) {
    this.drawAssetCentered(iconImage, rect.x + this.getScaledSize(28, 24, 30), rect.y + rect.height / 2, this.getScaledSize(24, 20, 24), this.getScaledSize(24, 20, 24), 0.9);
    labelX += this.getScaledSize(10, 8, 10);
  }
  this.drawClampedText(label, labelX, rect.y + rect.height / 2 + 1 * this.scale, rect.width - this.getScaledSize(iconImage ? 64 : 24, iconImage ? 56 : 20, iconImage ? 68 : 28), metrics.primaryButtonFont, metrics.captionFont, 'bold', '#5a3a20', 'center', 'middle');
};

DefenseMinigameRuntime.prototype.drawSecondaryButton = function (rect, label, options) {
  var iconImage = null;
  var labelX = rect.x + rect.width / 2;
  var metrics = this.getUiMetrics();

  options = options || {};
  if (options.iconKey) {
    iconImage = this.assets.get(options.iconKey);
  }

  this.drawTexturedButton(rect, metrics.secondaryButtonRadius, 'rgba(84, 65, 40, 0.12)', 'rgba(84, 65, 40, 0.22)', 2, 0.08);
  if (iconImage) {
    this.drawAssetCentered(iconImage, rect.x + this.getScaledSize(28, 24, 30), rect.y + rect.height / 2, this.getScaledSize(24, 20, 24), this.getScaledSize(24, 20, 24), 0.84);
    labelX += this.getScaledSize(10, 8, 10);
  }
  this.drawClampedText(label, labelX, rect.y + rect.height / 2 + 1 * this.scale, rect.width - this.getScaledSize(iconImage ? 64 : 24, iconImage ? 56 : 20, iconImage ? 68 : 28), metrics.secondaryButtonFont, metrics.captionFont, 'bold', INK, 'center', 'middle');
};

DefenseMinigameRuntime.prototype.drawSmallButton = function (rect, label, fillColor, enabled) {
  var metrics = this.getUiMetrics();
  utils.fillRoundRect(this.ctx, rect.x, rect.y, rect.width, rect.height, metrics.smallButtonRadius, enabled ? fillColor : 'rgba(150,150,150,0.38)');
  utils.strokeRoundRect(this.ctx, rect.x, rect.y, rect.width, rect.height, metrics.smallButtonRadius, 'rgba(255,255,255,0.22)', 2);
  this.drawClampedText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 1 * this.scale, rect.width - this.getScaledSize(8, 6, 8), metrics.smallButtonFont, metrics.detailFont, 'bold', enabled ? '#402615' : 'rgba(56,56,56,0.8)', 'center', 'middle');
};

DefenseMinigameRuntime.prototype.drawAudioToggleButton = function (rect, label, enabled) {
  var metrics = this.getUiMetrics();
  var dotRadius = this.getScaledSize(3.5, 3, 4);
  var dotX = rect.x + this.getScaledSize(12, 10, 12);
  var textCenterX = rect.x + rect.width / 2 + this.getScaledSize(4, 2, 4);
  var buttonLabel = label + (enabled ? ' 开' : ' 关');

  this.drawTexturedButton(
    rect,
    metrics.badgeRadius,
    enabled ? 'rgba(255, 184, 106, 0.24)' : 'rgba(84, 65, 40, 0.08)',
    enabled ? 'rgba(255, 176, 92, 0.36)' : 'rgba(84, 65, 40, 0.18)',
    2,
    enabled ? 0.1 : 0.05
  );

  this.ctx.save();
  this.ctx.fillStyle = enabled ? ACCENT : 'rgba(84, 65, 40, 0.34)';
  this.ctx.beginPath();
  this.ctx.arc(dotX, rect.y + rect.height / 2, dotRadius, 0, Math.PI * 2);
  this.ctx.fill();
  this.ctx.restore();

  this.drawClampedText(
    buttonLabel,
    textCenterX,
    rect.y + rect.height / 2,
    rect.width - this.getScaledSize(20, 18, 22),
    this.getScaledSize(10, 9, 10),
    this.getScaledSize(8, 7, 8),
    'bold',
    enabled ? INK : SOFT_INK,
    'center',
    'middle'
  );
};

module.exports = DefenseMinigameRuntime;
