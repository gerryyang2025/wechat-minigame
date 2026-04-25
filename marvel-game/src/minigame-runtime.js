'use strict';

var utils = require('./utils');
var content = require('./content');
var gameMeta = require('./game-meta');
var assets = require('./assets');
var audioModule = require('./audio');

var HEROES = content.HEROES;
var TITLE_BG_TOP = '#111830';
var TITLE_BG_BOTTOM = '#25375d';
var PANEL_FILL = 'rgba(10, 15, 32, 0.84)';
var PANEL_STROKE = 'rgba(255, 255, 255, 0.18)';
var INK = '#f7f7fb';
var SOFT_INK = 'rgba(233, 237, 248, 0.76)';
var DANGER = '#ff7664';
var SUCCESS = '#6ce18c';
var WARNING = '#ffd857';
var ACCENT = '#7bc7ff';
var MAX_DT = 1 / 30;
var PROGRESS_STORAGE_KEY = 'marvel_game_campaign_progress_v1';

function MarvelMinigameRuntime(options) {
  this.canvas = options.canvas;
  this.ctx = options.ctx;
  this.width = options.width;
  this.height = options.height;
  this.pixelRatio = options.pixelRatio || 1;
  this.runtimeInfo = options.runtimeInfo || {};
  this.scale = Math.max(0.85, Math.min(this.width / 812, this.height / 375));
  this.assets = assets.createAssetStore(this.canvas);
  this.audio = new audioModule.AudioManager();
  this.progress = this.loadProgress();

  this.state = 'title';
  this.heroIndex = this.getSavedHeroIndex();
  this.archiveHeroIndex = this.heroIndex;
  this.selectedLevelIndex = this.getSavedSelectedLevelIndex();
  this.hero = null;
  this.campaign = [];
  this.levelIndex = 0;
  this.level = null;
  this.player = null;
  this.enemies = [];
  this.hazards = [];
  this.levelEvents = [];
  this.projectiles = [];
  this.effects = [];
  this.cameraX = 0;
  this.elapsedTime = 0;
  this.levelStartedAt = 0;
  this.levelResultTime = 0;
  this.transitionMessage = '';
  this.transitionLevelIndex = -1;
  this.transitionLevel = null;
  this.transitionStartedAt = 0;
  this.transitionDuration = 0;
  this.transitionHint = '';
  this.transitionReason = '';
  this.systemPaused = false;
  this.announcements = [];
  this.lastRecordUpdate = null;
  this.encounterHintsShown = {};
  this.encounterBurstsShown = {};
  this.encounterStates = {};
  this.levelStats = null;
  this.checkpoints = [];
  this.activeCheckpoint = null;
  this.checkpointContinueUsed = false;
  this.bossIntroShown = false;
  this.bossArenaLockActive = false;
  this.bossArenaLockX = 0;
  this.shakeUntil = 0;
  this.shakeIntensity = 0;
  this.shakeSeed = 0;

  this.activeMoveTouches = {};
  this.moveLeft = false;
  this.moveRight = false;
  this.moveStick = {
    touchId: null,
    active: false,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    horizontal: 0,
    vertical: 0
  };
  this.pauseRect = null;

  this.lastTimestamp = 0;
  this.loopHandle = null;
  this.running = false;

  this.touchUiState = {
    primaryDown: false
  };

  this.loop = this.loop.bind(this);
}

MarvelMinigameRuntime.prototype.init = function () {
  this.running = true;
  this.lastTimestamp = 0;
  this.render();
  this.requestNextFrame();
};

MarvelMinigameRuntime.prototype.destroy = function () {
  this.running = false;
  if (typeof cancelAnimationFrame === 'function' && this.loopHandle) {
    cancelAnimationFrame(this.loopHandle);
  }
  if (typeof clearTimeout === 'function' && this.loopHandle) {
    clearTimeout(this.loopHandle);
  }
  this.loopHandle = null;
  if (this.audio) {
    this.audio.destroy();
  }
  if (this.assets) {
    this.assets.destroy();
  }
};

MarvelMinigameRuntime.prototype.requestNextFrame = function () {
  var self = this;

  if (typeof requestAnimationFrame === 'function') {
    this.loopHandle = requestAnimationFrame(this.loop);
    return;
  }

  this.loopHandle = setTimeout(function () {
    self.loop(Date.now());
  }, 16);
};

MarvelMinigameRuntime.prototype.loop = function (timestamp) {
  if (!this.running) {
    return;
  }

  var now = Date.now();
  var dt = this.lastTimestamp ? Math.min(MAX_DT, (now - this.lastTimestamp) / 1000) : 1 / 60;
  this.lastTimestamp = now;

  this.update(dt, now);
  this.render();
  this.requestNextFrame();
};

MarvelMinigameRuntime.prototype.handleShow = function () {
  this.systemPaused = false;
  this.audio.resumeBgm();
  if (this.state === 'paused-system') {
    this.state = 'playing';
  }
};

MarvelMinigameRuntime.prototype.handleHide = function () {
  this.resetTouchState();
  this.audio.pauseBgm();
  if (this.state === 'playing') {
    this.systemPaused = true;
    this.state = 'paused-system';
  }
};

MarvelMinigameRuntime.prototype.handleResize = function (windowInfo) {
  var width = windowInfo.windowWidth || windowInfo.screenWidth || this.width;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || this.height;
  var pixelRatio = windowInfo.pixelRatio || this.pixelRatio;

  this.width = width;
  this.height = height;
  this.pixelRatio = pixelRatio;
  this.scale = Math.max(0.85, Math.min(this.width / 812, this.height / 375));
  utils.resizeRenderer({
    canvas: this.canvas,
    ctx: this.ctx,
    width: this.width,
    height: this.height,
    pixelRatio: this.pixelRatio
  }, width, height, pixelRatio);
  this.render();
};

MarvelMinigameRuntime.prototype.getSnapshot = function () {
  return {
    heroName: this.hero ? this.hero.name : gameMeta.title,
    levelName: this.level ? (this.level.chapterLabel + ' · ' + this.level.name) : gameMeta.subtitle
  };
};

MarvelMinigameRuntime.prototype.resetTouchState = function () {
  this.activeMoveTouches = {};
  this.moveLeft = false;
  this.moveRight = false;
  this.moveStick.touchId = null;
  this.moveStick.active = false;
  this.moveStick.horizontal = 0;
  this.moveStick.vertical = 0;
};

MarvelMinigameRuntime.prototype.startShake = function (intensity, duration) {
  this.shakeIntensity = Math.max(this.shakeIntensity, intensity || 0);
  this.shakeUntil = Math.max(this.shakeUntil, Date.now() + (duration || 120));
  this.shakeSeed += 1;
};

MarvelMinigameRuntime.prototype.getShakeOffset = function () {
  var now = Date.now();
  var remaining;
  var fade;
  var angle;
  var magnitude;

  if (now >= this.shakeUntil || this.shakeIntensity <= 0) {
    return { x: 0, y: 0 };
  }

  remaining = this.shakeUntil - now;
  fade = Math.max(0.22, remaining / Math.max(remaining, 220));
  angle = (now * 0.06) + this.shakeSeed;
  magnitude = this.shakeIntensity * fade * this.scale;
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle * 1.4) * magnitude * 0.72
  };
};

MarvelMinigameRuntime.prototype.pushAnnouncement = function (title, subtitle, color, duration) {
  this.announcements.push({
    title: title,
    subtitle: subtitle || '',
    color: color || ACCENT,
    duration: duration || 1.8,
    age: 0
  });
};

MarvelMinigameRuntime.prototype.getHeroPortraitKey = function (heroKey) {
  return heroKey + 'Portrait';
};

MarvelMinigameRuntime.prototype.setPose = function (entity, pose, duration) {
  if (!entity) {
    return;
  }
  entity.pose = pose || '';
  entity.poseUntil = duration ? Date.now() + duration : 0;
};

MarvelMinigameRuntime.prototype.getAnimatedImage = function (keys, fps, seed) {
  var loaded = [];
  var i;
  var image;
  var index;

  for (i = 0; i < keys.length; i += 1) {
    image = this.assets.get(keys[i]);
    if (image) {
      loaded.push(image);
    }
  }

  if (!loaded.length) {
    return null;
  }

  if (loaded.length === 1) {
    return loaded[0];
  }

  index = Math.floor((Date.now() + (seed || 0)) / (1000 / fps)) % loaded.length;
  return loaded[index];
};

MarvelMinigameRuntime.prototype.getHeroAnimatedSprite = function (heroKey, player) {
  var now = Date.now();
  var pose = player && player.poseUntil > now ? player.pose : '';

  if (player && (player.isDead || pose === 'dead')) {
    return this.getAnimatedImage([heroKey + 'Die1', heroKey + 'Die2'], 7, 150);
  }
  if (player && player.beamUntil > now) {
    pose = 'attackUltimate';
  } else if (player && player.dashUntil > now) {
    pose = 'attackSkill';
  }

  if (pose === 'attackPrimary') {
    return this.getAnimatedImage([heroKey + 'Attack1_1', heroKey + 'Attack1_2'], 12, 40);
  }
  if (pose === 'attackSkill' || pose === 'attackUltimate') {
    return this.getAnimatedImage([heroKey + 'Attack2_1', heroKey + 'Attack2_2'], 12, 90);
  }
  if (player && !player.onGround) {
    return this.getAnimatedImage([heroKey + 'Jump1', heroKey + 'Jump2'], 10, 65);
  }
  if (player && Math.abs(player.vx) > 12 * this.scale) {
    return this.getAnimatedImage([heroKey + 'Run', heroKey + 'Run2'], 10, 10);
  }
  return this.getAnimatedImage([heroKey + 'Idle', heroKey + 'Idle2'], 4, 0);
};

MarvelMinigameRuntime.prototype.getEnemyAnimatedSprite = function (enemy) {
  var now = Date.now();
  var pose = enemy.poseUntil > now ? enemy.pose : '';

  if (enemy.type === 'boss') {
    if (enemy.isDead || pose === 'dead') {
      return this.getAnimatedImage(['thanosDie1', 'thanosDie2'], 7, 170);
    }
    if (pose === 'dash') {
      return this.getAnimatedImage(['thanosJump1', 'thanosJump2'], 12, 130);
    }
    if (pose === 'nova' || pose === 'attackHeavy') {
      return this.getAnimatedImage(['thanosAttack2_1', 'thanosAttack2_2'], 10, 80);
    }
    if (pose === 'attack' || enemy.warningType === 'melee') {
      return this.getAnimatedImage(['thanosAttack', 'thanosAttack1_2'], 10, 40);
    }
    if (Math.abs(enemy.vx) > 10 * this.scale) {
      return this.getAnimatedImage(['thanosRun', 'thanosRun2'], 8, 10);
    }
    return this.getAnimatedImage(['thanosIdle', 'thanosIdle2'], 4, 0);
  }

  if (enemy.type === 'drone') {
    return null;
  }

  if (enemy.isDead || pose === 'dead') {
    return this.getAnimatedImage(['sentryDie1', 'sentryDie2'], 8, 90);
  }
  if (pose === 'attack') {
    return this.getAnimatedImage(['sentryAttack1_1', 'sentryAttack1_2'], 10, 20);
  }
  if (!enemy.onGround) {
    return this.getAnimatedImage(['sentryRun', 'sentryRun2'], 8, 15);
  }
  if (Math.abs(enemy.vx) > 10 * this.scale) {
    return this.getAnimatedImage(['sentryRun', 'sentryRun2'], 10, 10);
  }
  return this.getAnimatedImage(['sentryIdle', 'sentryIdle2'], 5, 0);
};

MarvelMinigameRuntime.prototype.getBackgroundImageKey = function (levelIndex) {
  var resolvedLevelIndex = typeof levelIndex === 'number' ? levelIndex : this.levelIndex;

  if (resolvedLevelIndex < 0) {
    return '';
  }
  if (resolvedLevelIndex === 0) {
    return 'cityTiles';
  }
  if (resolvedLevelIndex === 1) {
    return 'helicarrierTiles';
  }
  return 'titanTiles';
};

MarvelMinigameRuntime.prototype.drawImageFit = function (ctx, image, x, y, width, height, alpha) {
  var ratio;
  var drawWidth;
  var drawHeight;
  var drawX;
  var drawY;

  if (!image) {
    return false;
  }

  ratio = Math.min(width / image.width, height / image.height);
  drawWidth = image.width * ratio;
  drawHeight = image.height * ratio;
  drawX = x + (width - drawWidth) / 2;
  drawY = y + (height - drawHeight) / 2;

  ctx.save();
  if (alpha !== undefined) {
    ctx.globalAlpha = alpha;
  }
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
  return true;
};

MarvelMinigameRuntime.prototype.drawBannerOverlay = function (ctx) {
  if (!this.announcements.length) {
    return;
  }

  var item = this.announcements[0];
  var progress = item.age / item.duration;
  var fade = progress < 0.15 ? progress / 0.15 : (progress > 0.78 ? (1 - progress) / 0.22 : 1);
  var panelWidth = 320 * this.scale;
  var panelHeight = 84 * this.scale;
  var panelX = this.width / 2 - panelWidth / 2;
  var panelY = 36 * this.scale + (1 - fade) * -28 * this.scale;

  ctx.save();
  ctx.globalAlpha = utils.clamp(fade, 0, 1);
  utils.drawPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
    fillStyle: 'rgba(8, 13, 28, 0.88)',
    strokeStyle: item.color,
    radius: 20
  });
  utils.setTextStyle(ctx, 18 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(item.title, this.width / 2, panelY + 28 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(item.subtitle, this.width / 2, panelY + 54 * this.scale);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.handleTouchStart = function (event) {
  var touches = event.changedTouches || [];
  var i;
  var point;

  for (i = 0; i < touches.length; i += 1) {
    point = utils.resolveTouchPoint(touches[i]);

    if (this.state === 'title') {
      if (utils.rectContainsPoint(this.getTitleArchiveRect(), point.x, point.y)) {
        this.archiveHeroIndex = this.heroIndex;
        this.resetTouchState();
        this.state = 'archive';
        continue;
      }

      if (utils.rectContainsPoint(this.getTitleButtonRect(), point.x, point.y)) {
        this.selectedLevelIndex = utils.clamp(this.selectedLevelIndex, 0, this.getUnlockedLevelMaxIndex());
        this.syncSelectionProgress();
        this.state = 'select';
      }
      continue;
    }

    if (this.state === 'archive') {
      if (utils.rectContainsPoint(this.getArchiveCloseRect(), point.x, point.y)) {
        this.state = 'title';
        continue;
      }

      if (this.trySelectArchiveHeroAt(point.x, point.y)) {
        continue;
      }

      continue;
    }

    if (this.state === 'select') {
      if (this.trySelectHeroAt(point.x, point.y)) {
        continue;
      }

      if (this.trySelectStageAt(point.x, point.y)) {
        continue;
      }

      if (utils.rectContainsPoint(this.getSelectStartRect(), point.x, point.y)) {
        this.selectedLevelIndex = utils.clamp(this.selectedLevelIndex, 0, this.getUnlockedLevelMaxIndex());
        this.syncSelectionProgress();
        this.beginLevelTransition(this.selectedLevelIndex, 'start');
      }
      continue;
    }

    if (this.state === 'paused' || this.state === 'paused-system') {
      this.handlePauseMenuTap(point.x, point.y);
      continue;
    }

    if (this.state === 'over' || this.state === 'victory') {
      this.handleResultMenuTap(point.x, point.y);
      continue;
    }

    if (this.state === 'playing') {
      if (utils.rectContainsPoint(this.getPauseRect(), point.x, point.y)) {
        this.state = 'paused';
        continue;
      }

      if (this.tryTriggerActionTouch(point)) {
        continue;
      }

      this.updateMoveTouch(point);
    }
  }
};

MarvelMinigameRuntime.prototype.handleTouchMove = function (event) {
  if (this.state !== 'playing') {
    return;
  }

  var touches = event.changedTouches || [];
  var i;
  for (i = 0; i < touches.length; i += 1) {
    this.updateMoveTouch(utils.resolveTouchPoint(touches[i]));
  }
  this.refreshMoveState();
};

MarvelMinigameRuntime.prototype.handleTouchEnd = function (event) {
  var touches = event.changedTouches || [];
  var i;
  var touch;

  for (i = 0; i < touches.length; i += 1) {
    touch = utils.resolveTouchPoint(touches[i]);
    delete this.activeMoveTouches[touch.id];
    if (this.moveStick.touchId === touch.id) {
      this.moveStick.touchId = null;
      this.moveStick.active = false;
      this.moveStick.horizontal = 0;
      this.moveStick.vertical = 0;
    }
  }

  this.refreshMoveState();
};

MarvelMinigameRuntime.prototype.handleTouchCancel = function (event) {
  this.handleTouchEnd(event);
};

MarvelMinigameRuntime.prototype.updateMoveTouch = function (point) {
  var zones = this.getMovementZones();
  var stick = this.moveStick;
  var dx;
  var dy;
  var distance;
  var ratio;

  if (!utils.rectContainsPoint(zones.area, point.x, point.y) && stick.touchId !== point.id) {
    return;
  }

  dx = point.x - zones.baseX;
  dy = point.y - zones.baseY;
  distance = Math.sqrt(dx * dx + dy * dy);
  ratio = distance > zones.maxDistance ? zones.maxDistance / distance : 1;

  stick.touchId = point.id;
  stick.active = true;
  stick.baseX = zones.baseX;
  stick.baseY = zones.baseY;
  stick.knobX = zones.baseX + dx * ratio;
  stick.knobY = zones.baseY + dy * ratio;
  stick.horizontal = utils.clamp((stick.knobX - zones.baseX) / zones.maxDistance, -1, 1);
  stick.vertical = utils.clamp((stick.knobY - zones.baseY) / zones.maxDistance, -1, 1);

  this.refreshMoveState();
};

MarvelMinigameRuntime.prototype.refreshMoveState = function () {
  this.moveLeft = this.moveStick.active && this.moveStick.horizontal < -0.22;
  this.moveRight = this.moveStick.active && this.moveStick.horizontal > 0.22;
};

MarvelMinigameRuntime.prototype.tryTriggerActionTouch = function (point) {
  var controls = this.getActionButtonRects();

  if (utils.rectContainsPoint(controls.jump, point.x, point.y)) {
    this.triggerJump();
    return true;
  }

  if (utils.rectContainsPoint(controls.attack, point.x, point.y)) {
    this.usePrimaryAttack();
    return true;
  }

  if (utils.rectContainsPoint(controls.skill, point.x, point.y)) {
    this.useSkill();
    return true;
  }

  if (utils.rectContainsPoint(controls.ultimate, point.x, point.y)) {
    this.useUltimate();
    return true;
  }

  return false;
};

MarvelMinigameRuntime.prototype.getTitleButtonRect = function () {
  return {
    x: this.width / 2 - 92 * this.scale,
    y: this.height * 0.7,
    width: 184 * this.scale,
    height: 50 * this.scale
  };
};

MarvelMinigameRuntime.prototype.getTitlePanelRect = function () {
  var panelWidth = Math.min(520 * this.scale, this.width - 80 * this.scale);
  return {
    x: this.width / 2 - panelWidth / 2,
    y: this.height * 0.16,
    width: panelWidth,
    height: 272 * this.scale
  };
};

MarvelMinigameRuntime.prototype.getTitleArchiveRect = function () {
  var panel = this.getTitlePanelRect();
  return {
    x: panel.x + panel.width - 122 * this.scale,
    y: panel.y + 16 * this.scale,
    width: 98 * this.scale,
    height: 34 * this.scale
  };
};

MarvelMinigameRuntime.prototype.getSelectableCampaign = function () {
  return this.campaign && this.campaign.length
    ? this.campaign
    : content.createCampaignData(this.width, this.height, this.scale);
};

MarvelMinigameRuntime.prototype.getUnlockedLevelMaxIndex = function () {
  var campaign = this.getSelectableCampaign();
  var progress = this.getCampaignProgressSummary();
  return utils.clamp(progress.clearedCount, 0, Math.max(0, campaign.length - 1));
};

MarvelMinigameRuntime.prototype.getCharacterSelectLayout = function () {
  var titleBottom = 96 * this.scale;
  var heroHeight = 150 * this.scale;
  var heroStageGap = 18 * this.scale;
  var stageHeight = 48 * this.scale;
  var stageButtonGap = 14 * this.scale;
  var buttonHeight = 40 * this.scale;
  var bottomMargin = 20 * this.scale;
  var heroY = 108 * this.scale;
  var availableHeight = this.height - titleBottom - bottomMargin;
  var neededHeight = heroHeight + heroStageGap + stageHeight + stageButtonGap + buttonHeight;
  var overflow;
  var bottomOverflow;
  var stageY;
  var buttonY;

  if (neededHeight > availableHeight) {
    overflow = neededHeight - availableHeight;
    heroHeight = Math.max(132 * this.scale, heroHeight - overflow * 0.6);
    heroStageGap = Math.max(8 * this.scale, heroStageGap - overflow * 0.12);
    stageHeight = Math.max(42 * this.scale, stageHeight - overflow * 0.15);
    stageButtonGap = Math.max(10 * this.scale, stageButtonGap - overflow * 0.08);
  }

  stageY = heroY + heroHeight + heroStageGap;
  buttonY = stageY + stageHeight + stageButtonGap;
  bottomOverflow = buttonY + buttonHeight + bottomMargin - this.height;

  if (bottomOverflow > 0) {
    heroY = Math.max(titleBottom + 6 * this.scale, heroY - bottomOverflow);
    stageY = heroY + heroHeight + heroStageGap;
    buttonY = stageY + stageHeight + stageButtonGap;
  }

  return {
    heroY: heroY,
    heroHeight: heroHeight,
    stageY: stageY,
    stageHeight: stageHeight,
    buttonY: buttonY,
    buttonHeight: buttonHeight
  };
};

MarvelMinigameRuntime.prototype.getHeroCardRects = function () {
  var layout = this.getCharacterSelectLayout();
  var gap = 10 * this.scale;
  var sidePadding = 18 * this.scale;
  var availableWidth = this.width - sidePadding * 2 - gap * (HEROES.length - 1);
  var cardWidth = Math.min(156 * this.scale, availableWidth / HEROES.length);
  var cardHeight = layout.heroHeight;
  var totalWidth = cardWidth * HEROES.length + gap * (HEROES.length - 1);
  var startX = (this.width - totalWidth) / 2;
  var y = layout.heroY;
  var rects = [];
  var i;

  for (i = 0; i < HEROES.length; i += 1) {
    rects.push({
      x: startX + i * (cardWidth + gap),
      y: y,
      width: cardWidth,
      height: cardHeight
    });
  }

  return rects;
};

MarvelMinigameRuntime.prototype.getStageChipRects = function () {
  var layout = this.getCharacterSelectLayout();
  var campaign = this.getSelectableCampaign();
  var chipWidth = 108 * this.scale;
  var chipHeight = layout.stageHeight;
  var gap = 10 * this.scale;
  var totalWidth = campaign.length * chipWidth + (campaign.length - 1) * gap;
  var startX = (this.width - totalWidth) / 2;
  var y = layout.stageY;
  var rects = [];
  var i;

  for (i = 0; i < campaign.length; i += 1) {
    rects.push({
      x: startX + i * (chipWidth + gap),
      y: y,
      width: chipWidth,
      height: chipHeight
    });
  }

  return rects;
};

MarvelMinigameRuntime.prototype.getSelectStartRect = function () {
  var layout = this.getCharacterSelectLayout();
  return {
    x: this.width / 2 - 94 * this.scale,
    y: layout.buttonY,
    width: 188 * this.scale,
    height: layout.buttonHeight
  };
};

MarvelMinigameRuntime.prototype.getHeroSelectHint = function (hero) {
  if (!hero) {
    return '';
  }

  if (hero.key === 'ironman') {
    return '远程爆发';
  }

  if (hero.key === 'thor') {
    return '均衡近战';
  }

  if (hero.key === 'hulk') {
    return '高血重装';
  }

  return '战斗专家';
};

MarvelMinigameRuntime.prototype.getArchivePanelRect = function () {
  var panelWidth = Math.min(560 * this.scale, this.width - 72 * this.scale);
  var panelHeight = Math.min(this.height - 24 * this.scale, 430 * this.scale);
  return {
    x: this.width / 2 - panelWidth / 2,
    y: this.height / 2 - panelHeight / 2,
    width: panelWidth,
    height: panelHeight
  };
};

MarvelMinigameRuntime.prototype.getArchiveCloseRect = function () {
  var panel = this.getArchivePanelRect();
  var size = 42 * this.scale;
  return {
    x: panel.x + panel.width - size - 18 * this.scale,
    y: panel.y + 18 * this.scale,
    width: size,
    height: size
  };
};

MarvelMinigameRuntime.prototype.getArchiveHeroTabRects = function () {
  var panel = this.getArchivePanelRect();
  var tabWidth = 110 * this.scale;
  var tabHeight = 36 * this.scale;
  var gap = 8 * this.scale;
  var totalWidth = tabWidth * HEROES.length + gap * (HEROES.length - 1);
  var startX = panel.x + (panel.width - totalWidth) / 2;
  var y = panel.y + 126 * this.scale;
  var rects = [];
  var i;

  for (i = 0; i < HEROES.length; i += 1) {
    rects.push({
      x: startX + i * (tabWidth + gap),
      y: y,
      width: tabWidth,
      height: tabHeight
    });
  }

  return rects;
};

MarvelMinigameRuntime.prototype.getPauseRect = function () {
  return {
    x: this.width - 76 * this.scale,
    y: 20 * this.scale,
    width: 52 * this.scale,
    height: 52 * this.scale
  };
};

MarvelMinigameRuntime.prototype.getMovementZones = function () {
  return {
    area: {
      x: 18 * this.scale,
      y: this.height - 144 * this.scale,
      width: 178 * this.scale,
      height: 124 * this.scale
    },
    baseX: 86 * this.scale,
    baseY: this.height - 76 * this.scale,
    baseRadius: 34 * this.scale,
    knobRadius: 18 * this.scale,
    maxDistance: 28 * this.scale
  };
};

MarvelMinigameRuntime.prototype.getActionButtonRects = function () {
  var right = this.width - 24 * this.scale;
  var bottom = this.height - 22 * this.scale;
  var large = 64 * this.scale;
  var medium = 56 * this.scale;
  var gap = 10 * this.scale;

  return {
    jump: {
      x: right - large,
      y: bottom - large - medium - gap,
      width: medium,
      height: medium
    },
    attack: {
      x: right - large,
      y: bottom - large,
      width: large,
      height: large
    },
    skill: {
      x: right - large - medium - gap,
      y: bottom - medium,
      width: medium,
      height: medium
    },
    ultimate: {
      x: right - large - medium - gap,
      y: bottom - large - medium - gap,
      width: medium,
      height: medium
    }
  };
};

MarvelMinigameRuntime.prototype.getPauseMenuButtons = function () {
  return {
    resume: {
      x: this.width / 2 - 118 * this.scale,
      y: this.height / 2 + 48 * this.scale,
      width: 236 * this.scale,
      height: 52 * this.scale
    },
    restart: {
      x: this.width / 2 - 118 * this.scale,
      y: this.height / 2 + 112 * this.scale,
      width: 236 * this.scale,
      height: 52 * this.scale
    },
    select: {
      x: this.width / 2 - 118 * this.scale,
      y: this.height / 2 + 176 * this.scale,
      width: 236 * this.scale,
      height: 52 * this.scale
    }
  };
};

MarvelMinigameRuntime.prototype.getResultOverlayLayout = function (victory) {
  var hasContinue = this.canContinueFromCheckpoint();
  var panelWidth = 400 * this.scale;
  var panelHeight;
  var panelY;
  var buttonWidth;
  var buttonHeight;
  var buttonX;
  var restartY;

  if (!victory) {
    panelHeight = hasContinue ? 346 * this.scale : 298 * this.scale;
    panelY = this.height / 2 - panelHeight / 2;
    buttonWidth = 220 * this.scale;
    buttonHeight = 40 * this.scale;
    buttonX = this.width / 2 - buttonWidth / 2;
    restartY = panelY + (hasContinue ? 248 : 200) * this.scale;
    return {
      panelX: this.width / 2 - panelWidth / 2,
      panelY: panelY,
      panelWidth: panelWidth,
      panelHeight: panelHeight,
      buttons: {
        continue: {
          x: buttonX,
          y: panelY + 200 * this.scale,
          width: buttonWidth,
          height: buttonHeight
        },
        restart: {
          x: buttonX,
          y: restartY,
          width: buttonWidth,
          height: buttonHeight
        },
        select: {
          x: buttonX,
          y: restartY + 48 * this.scale,
          width: buttonWidth,
          height: buttonHeight
        }
      }
    };
  }

  panelHeight = hasContinue ? 376 * this.scale : 332 * this.scale;
  panelY = this.height / 2 - panelHeight / 2;
  return {
    panelX: this.width / 2 - panelWidth / 2,
    panelY: panelY,
    panelWidth: panelWidth,
    panelHeight: panelHeight,
    buttons: {
      continue: {
        x: this.width / 2 - 118 * this.scale,
        y: this.height / 2 + 152 * this.scale,
        width: 236 * this.scale,
        height: 52 * this.scale
      },
      restart: {
        x: this.width / 2 - 118 * this.scale,
        y: this.height / 2 + (hasContinue ? 216 : 152) * this.scale,
        width: 236 * this.scale,
        height: 52 * this.scale
      },
      select: {
        x: this.width / 2 - 118 * this.scale,
        y: this.height / 2 + (hasContinue ? 280 : 216) * this.scale,
        width: 236 * this.scale,
        height: 52 * this.scale
      }
    }
  };
};

MarvelMinigameRuntime.prototype.getResultButtons = function () {
  return this.getResultOverlayLayout(this.state === 'victory').buttons;
};

MarvelMinigameRuntime.prototype.trySelectHeroAt = function (x, y) {
  var rects = this.getHeroCardRects();
  var i;
  for (i = 0; i < rects.length; i += 1) {
    if (utils.rectContainsPoint(rects[i], x, y)) {
      this.heroIndex = i;
      this.syncSelectionProgress();
      return true;
    }
  }
  return false;
};

MarvelMinigameRuntime.prototype.trySelectStageAt = function (x, y) {
  var rects = this.getStageChipRects();
  var maxIndex = this.getUnlockedLevelMaxIndex();
  var i;

  for (i = 0; i < rects.length; i += 1) {
    if (utils.rectContainsPoint(rects[i], x, y) && i <= maxIndex) {
      this.selectedLevelIndex = i;
      this.syncSelectionProgress();
      return true;
    }
  }

  return false;
};

MarvelMinigameRuntime.prototype.trySelectArchiveHeroAt = function (x, y) {
  var rects = this.getArchiveHeroTabRects();
  var i;

  for (i = 0; i < rects.length; i += 1) {
    if (utils.rectContainsPoint(rects[i], x, y)) {
      this.archiveHeroIndex = i;
      return true;
    }
  }

  return false;
};

MarvelMinigameRuntime.prototype.handlePauseMenuTap = function (x, y) {
  var buttons = this.getPauseMenuButtons();

  if (utils.rectContainsPoint(buttons.resume, x, y)) {
    this.state = 'playing';
    return;
  }

  if (utils.rectContainsPoint(buttons.restart, x, y)) {
    this.beginLevelTransition(this.levelIndex, 'restart');
    return;
  }

  if (utils.rectContainsPoint(buttons.select, x, y)) {
    this.state = 'select';
    this.selectedLevelIndex = utils.clamp(this.selectedLevelIndex, 0, this.getUnlockedLevelMaxIndex());
    this.levelIndex = 0;
    this.syncSelectionProgress();
    this.resetTouchState();
  }
};

MarvelMinigameRuntime.prototype.handleResultMenuTap = function (x, y) {
  var buttons = this.getResultButtons();

  if (this.canContinueFromCheckpoint() && utils.rectContainsPoint(buttons.continue, x, y)) {
    this.reviveFromCheckpoint();
    return;
  }

  if (utils.rectContainsPoint(buttons.restart, x, y)) {
    if (this.state === 'victory' && this.hasNextLevel()) {
      this.beginLevelTransition(this.levelIndex + 1, 'advance');
    } else if (this.state === 'victory') {
      this.beginLevelTransition(0, 'campaign-reset');
    } else {
      this.beginLevelTransition(this.levelIndex, 'restart');
    }
    return;
  }

  if (utils.rectContainsPoint(buttons.select, x, y)) {
    this.state = 'select';
    this.selectedLevelIndex = utils.clamp(this.selectedLevelIndex, 0, this.getUnlockedLevelMaxIndex());
    this.levelIndex = 0;
    this.syncSelectionProgress();
    this.resetTouchState();
  }
};

MarvelMinigameRuntime.prototype.hasNextLevel = function () {
  return this.campaign.length > 0 && this.levelIndex < this.campaign.length - 1;
};

MarvelMinigameRuntime.prototype.getAliveBoss = function () {
  var i;
  for (i = 0; i < this.enemies.length; i += 1) {
    if (this.enemies[i].type === 'boss' && !this.enemies[i].isDead) {
      return this.enemies[i];
    }
  }
  return null;
};

MarvelMinigameRuntime.prototype.beginLevelTransition = function (levelIndex, reason) {
  var campaign = content.createCampaignData(this.width, this.height, this.scale);
  var targetIndex = utils.clamp(
    typeof levelIndex === 'number' ? levelIndex : this.levelIndex,
    0,
    campaign.length - 1
  );

  this.hero = Object.assign({}, HEROES[this.heroIndex]);
  this.campaign = campaign;
  this.transitionLevelIndex = targetIndex;
  this.transitionLevel = campaign[targetIndex];
  this.transitionStartedAt = Date.now();
  this.transitionDuration = reason === 'advance' ? 1700 : 1450;
  this.transitionReason = reason || 'start';
  this.transitionHint = this.transitionLevel.objective || '准备下一任务';
  this.transitionMessage = '';
  this.lastRecordUpdate = null;
  this.levelEvents = [];
  this.encounterHintsShown = {};
  this.encounterBurstsShown = {};
  this.encounterStates = {};
  this.levelStats = null;
  this.checkpoints = [];
  this.activeCheckpoint = null;
  this.checkpointContinueUsed = false;
  this.bossIntroShown = false;
  this.bossArenaLockActive = false;
  this.bossArenaLockX = 0;
  this.resetTouchState();
  this.audio.stopBgm();
  this.state = 'transition';
};

MarvelMinigameRuntime.prototype.startLevel = function (levelIndex) {
  this.hero = Object.assign({}, HEROES[this.heroIndex]);
  this.campaign = content.createCampaignData(this.width, this.height, this.scale);
  this.levelIndex = utils.clamp(
    typeof levelIndex === 'number' ? levelIndex : this.levelIndex,
    0,
    this.campaign.length - 1
  );
  this.level = this.campaign[this.levelIndex];
  this.player = this.createPlayer(this.hero);
  this.enemies = this.level.enemies.map(this.createEnemy, this);
  this.hazards = (this.level.hazards || []).map(this.createHazard, this);
  this.checkpoints = this.createCheckpoints();
  this.levelEvents = (this.level.events || []).map(function (event) {
    return Object.assign({
      triggered: false
    }, event);
  });
  this.encounterHintsShown = {};
  this.encounterBurstsShown = {};
  this.encounterStates = this.createEncounterStates();
  this.levelStats = {
    damageTaken: 0,
    deaths: 0,
    checkpointContinues: 0,
    checkpointsActivated: 0,
    encountersCleared: 0
  };
  this.activeCheckpoint = null;
  this.checkpointContinueUsed = false;
  this.bossIntroShown = false;
  this.bossArenaLockActive = false;
  this.bossArenaLockX = 0;
  this.projectiles = [];
  this.effects = [];
  this.cameraX = 0;
  this.elapsedTime = 0;
  this.levelStartedAt = Date.now();
  this.levelResultTime = 0;
  this.transitionMessage = '';
  this.lastRecordUpdate = null;
  this.transitionLevelIndex = -1;
  this.transitionLevel = null;
  this.transitionStartedAt = 0;
  this.transitionDuration = 0;
  this.transitionHint = '';
  this.transitionReason = '';
  this.resetTouchState();
  this.pushAnnouncement(this.level.chapterLabel, this.level.name, ACCENT, 2.1);
  if (this.levelIndex === 0) {
    this.audio.playBgm('level1Bgm');
  } else if (this.levelIndex === 1) {
    this.audio.playBgm('level2Bgm');
  } else {
    this.audio.playBgm('level3Bgm');
  }
  this.state = 'playing';
};

MarvelMinigameRuntime.prototype.createPlayer = function (hero) {
  var spawn = this.level.spawnPoint || {};
  var spawnX = typeof spawn.x === 'number' ? spawn.x : 96 * this.scale;
  var bodyWidth = hero.bodyWidth * this.scale;
  var bodyHeight = hero.bodyHeight * this.scale;
  var spawnY = typeof spawn.y === 'number' ? spawn.y - bodyHeight : this.level.floorY - bodyHeight;
  return {
    x: spawnX,
    y: spawnY,
    width: bodyWidth,
    height: bodyHeight,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    maxHealth: hero.maxHealth,
    health: hero.maxHealth,
    invulnerableUntil: 0,
    hurtUntil: 0,
    attackAvailableAt: 0,
    skillAvailableAt: 0,
    ultimateAvailableAt: 0,
    maxAirJumps: hero.maxAirJumps,
    airJumpsRemaining: hero.maxAirJumps,
    dashUntil: 0,
    beamUntil: 0,
    deathStartedAt: 0,
    deathUntil: 0,
    controlLockedUntil: 0,
    lastGroundedAt: Date.now(),
    hurtSourceX: 0,
    lastFallImpactAt: 0,
    pose: '',
    poseUntil: 0,
    isDead: false,
    beamWidth: 80 * this.scale,
    beamLength: 280 * this.scale
  };
};

MarvelMinigameRuntime.prototype.createCheckpoints = function () {
  return (this.level.checkpoints || []).map(function (checkpoint, index) {
    return Object.assign({
      id: 'checkpoint-' + index,
      label: '检查点',
      activated: false
    }, checkpoint);
  });
};

MarvelMinigameRuntime.prototype.loadProgress = function () {
  var fallback = {
    heroes: {},
    lastHeroKey: HEROES[0].key,
    lastSelectedLevelIndex: 0
  };
  var raw;

  try {
    if (typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function') {
      raw = wx.getStorageSync(PROGRESS_STORAGE_KEY);
      if (raw && typeof raw === 'object') {
        return raw;
      }
    }
  } catch (err) {
    return fallback;
  }

  return fallback;
};

MarvelMinigameRuntime.prototype.getSavedHeroIndex = function () {
  var heroKey = this.progress && this.progress.lastHeroKey;
  var index = HEROES.findIndex(function (hero) {
    return hero.key === heroKey;
  });
  return index >= 0 ? index : 0;
};

MarvelMinigameRuntime.prototype.getSavedSelectedLevelIndex = function () {
  var savedIndex = this.progress && typeof this.progress.lastSelectedLevelIndex === 'number'
    ? this.progress.lastSelectedLevelIndex
    : 0;
  return utils.clamp(savedIndex, 0, 2);
};

MarvelMinigameRuntime.prototype.saveProgress = function () {
  try {
    if (typeof wx !== 'undefined' && typeof wx.setStorageSync === 'function') {
      wx.setStorageSync(PROGRESS_STORAGE_KEY, this.progress);
    }
  } catch (err) {
    return;
  }
};

MarvelMinigameRuntime.prototype.syncSelectionProgress = function () {
  if (!this.progress) {
    this.progress = {
      heroes: {},
      lastHeroKey: HEROES[0].key,
      lastSelectedLevelIndex: 0
    };
  }
  this.progress.lastHeroKey = HEROES[this.heroIndex].key;
  this.progress.lastSelectedLevelIndex = this.selectedLevelIndex;
  this.saveProgress();
};

MarvelMinigameRuntime.prototype.getRankValue = function (rank) {
  if (rank === 'S') {
    return 4;
  }
  if (rank === 'A') {
    return 3;
  }
  if (rank === 'B') {
    return 2;
  }
  if (rank === 'C') {
    return 1;
  }
  return 0;
};

MarvelMinigameRuntime.prototype.getHeroProgressSummary = function (heroKey) {
  var heroProgress = this.progress && this.progress.heroes ? this.progress.heroes[heroKey] : null;
  var levels = heroProgress && heroProgress.levels ? heroProgress.levels : {};
  var levelIds = Object.keys(levels);
  var bestRank = 'None';
  var bestRankValue = 0;
  var totalLevels = this.getSelectableCampaign().length;

  levelIds.forEach(function (levelId) {
    var value = this.getRankValue(levels[levelId].rank);
    if (value > bestRankValue) {
      bestRankValue = value;
      bestRank = levels[levelId].rank;
    }
  }, this);

  return {
    clearedCount: levelIds.length,
    totalLevels: totalLevels,
    bestRank: bestRank
  };
};

MarvelMinigameRuntime.prototype.getHeroLevelRecord = function (heroKey, levelId) {
  var heroProgress = this.progress && this.progress.heroes ? this.progress.heroes[heroKey] : null;
  var levels = heroProgress && heroProgress.levels ? heroProgress.levels : {};
  return levels[levelId] || null;
};

MarvelMinigameRuntime.prototype.getGlobalLevelRecord = function (levelId) {
  var bestRank = '--';
  var bestRankValue = 0;
  var bestTime = null;

  Object.keys((this.progress && this.progress.heroes) || {}).forEach(function (heroKey) {
    var record = this.getHeroLevelRecord(heroKey, levelId);
    var value;

    if (!record) {
      return;
    }

    value = this.getRankValue(record.rank);
    if (value > bestRankValue) {
      bestRankValue = value;
      bestRank = record.rank;
    }
    if (bestTime === null || record.bestTime < bestTime) {
      bestTime = record.bestTime;
    }
  }, this);

  return {
    rank: bestRank,
    bestTime: bestTime
  };
};

MarvelMinigameRuntime.prototype.getHeroBestRankForLevel = function (heroKey, levelId) {
  var record = this.getHeroLevelRecord(heroKey, levelId);
  return record ? record.rank : '--';
};

MarvelMinigameRuntime.prototype.getCampaignProgressSummary = function () {
  var levelMap = {};
  var bestRank = 'None';
  var bestRankValue = 0;
  var totalLevels = this.getSelectableCampaign().length;

  Object.keys((this.progress && this.progress.heroes) || {}).forEach(function (heroKey) {
    var levels = this.progress.heroes[heroKey].levels || {};
    Object.keys(levels).forEach(function (levelId) {
      var rank = levels[levelId].rank;
      var value = this.getRankValue(rank);
      levelMap[levelId] = true;
      if (value > bestRankValue) {
        bestRankValue = value;
        bestRank = rank;
      }
    }, this);
  }, this);

  return {
    clearedCount: Object.keys(levelMap).length,
    totalLevels: totalLevels,
    bestRank: bestRank
  };
};

MarvelMinigameRuntime.prototype.getOperationStatusSummary = function () {
  var campaign = this.getSelectableCampaign();
  var progress = this.getCampaignProgressSummary();
  var heroClearCount = 0;

  HEROES.forEach(function (hero) {
    var summary = this.getHeroProgressSummary(hero.key);
    if (summary.clearedCount >= summary.totalLevels) {
      heroClearCount += 1;
    }
  }, this);

  if (progress.clearedCount >= progress.totalLevels) {
    return {
      label: '全部章节已解锁',
      detail: '全局最佳 ' + progress.bestRank + ' · 英雄通关 ' + heroClearCount + '/' + HEROES.length
    };
  }

  return {
    label: '下一解锁 ' + campaign[progress.clearedCount].chapterLabel,
    detail: '当前已解锁 ' + progress.clearedCount + '/' + progress.totalLevels + ' · 英雄通关 ' + heroClearCount + '/' + HEROES.length
  };
};

MarvelMinigameRuntime.prototype.recordLevelClear = function (rank) {
  var heroKey = this.hero ? this.hero.key : '';
  var levelId = this.level ? this.level.id : '';
  var heroProgress;
  var previous;
  var previousCampaignSummary = this.getCampaignProgressSummary();
  var previousHeroSummary = this.getHeroProgressSummary(heroKey);
  var unlockedLevel = null;
  var improved = false;

  if (!heroKey || !levelId) {
    return;
  }

  if (!this.progress || !this.progress.heroes) {
    this.progress = {
      heroes: {}
    };
  }

  if (!this.progress.heroes[heroKey]) {
    this.progress.heroes[heroKey] = {
      levels: {}
    };
  }

  heroProgress = this.progress.heroes[heroKey];
  previous = heroProgress.levels[levelId];
  if (!previous || this.getRankValue(rank) > this.getRankValue(previous.rank)
    || (this.getRankValue(rank) === this.getRankValue(previous.rank) && this.elapsedTime < previous.bestTime)) {
    improved = true;
    heroProgress.levels[levelId] = {
      rank: rank,
      bestTime: this.elapsedTime,
      updatedAt: Date.now()
    };
    this.saveProgress();
  }

  if (improved) {
    this.lastRecordUpdate = {
      improved: true,
      rank: rank,
      bestTime: this.elapsedTime,
      previousRank: previous ? previous.rank : '--',
      previousBestTime: previous ? previous.bestTime : 0
    };
    this.pushAnnouncement('新纪录', this.hero.name + '在' + this.level.chapterLabel + '拿下' + rank + '评级。', SUCCESS, 1.9);
    if (this.getCampaignProgressSummary().clearedCount > previousCampaignSummary.clearedCount
      && this.getCampaignProgressSummary().clearedCount < this.getCampaignProgressSummary().totalLevels) {
      unlockedLevel = this.getSelectableCampaign()[this.getCampaignProgressSummary().clearedCount];
      this.lastRecordUpdate.unlockedLevelLabel = unlockedLevel.chapterLabel;
      this.pushAnnouncement(
        '章节解锁',
        unlockedLevel.chapterLabel + ' 已可在选人界面直接进入。',
        ACCENT,
        2
      );
    }
    if (this.getHeroProgressSummary(heroKey).clearedCount === previousHeroSummary.totalLevels
      && previousHeroSummary.clearedCount < previousHeroSummary.totalLevels) {
      this.pushAnnouncement('英雄通关', this.hero.name + ' 已完整通关整场战役。', SUCCESS, 2);
    }
  } else {
    this.lastRecordUpdate = {
      improved: false,
      rank: previous ? previous.rank : rank,
      bestTime: previous ? previous.bestTime : this.elapsedTime
    };
  }
};

MarvelMinigameRuntime.prototype.createEnemy = function (spec) {
  var variant = spec.variant || 'assault';
  var projectileCooldown = spec.projectileCooldown || 0;
  var projectileSpeed = spec.projectileSpeed || 0;
  var preferredDistance = spec.preferredDistance || 0;
  var attackRange = spec.attackRange || 86 * this.scale;
  var chaseRange = spec.chaseRange || 220 * this.scale;
  var projectileBurstCount = spec.projectileBurstCount || 0;
  var hoverAmplitude = spec.hoverAmplitude || 0;
  var hoverSpeed = spec.hoverSpeed || 0;
  var hoverPhase = spec.hoverPhase || 0;

  if (spec.type === 'drone') {
    variant = 'drone';
    projectileCooldown = projectileCooldown || 1280;
    projectileSpeed = projectileSpeed || 420 * this.scale;
    preferredDistance = preferredDistance || 220 * this.scale;
    attackRange = spec.attackRange || 52 * this.scale;
    chaseRange = spec.chaseRange || 380 * this.scale;
    projectileBurstCount = projectileBurstCount || 2;
    hoverAmplitude = hoverAmplitude || 18 * this.scale;
    hoverSpeed = hoverSpeed || 2.35;
  }

  if (spec.type !== 'boss' && spec.type !== 'drone') {
    if (variant === 'artillery') {
      projectileCooldown = projectileCooldown || 1450;
      projectileSpeed = projectileSpeed || 360 * this.scale;
      preferredDistance = preferredDistance || 178 * this.scale;
      attackRange = spec.attackRange || 74 * this.scale;
      chaseRange = spec.chaseRange || 320 * this.scale;
      projectileBurstCount = projectileBurstCount || 1;
    } else if (variant === 'brute') {
      attackRange = spec.attackRange || 102 * this.scale;
      chaseRange = spec.chaseRange || 210 * this.scale;
    } else if (variant === 'skirmisher') {
      attackRange = spec.attackRange || 78 * this.scale;
      chaseRange = spec.chaseRange || 270 * this.scale;
      preferredDistance = preferredDistance || 28 * this.scale;
    }
  }

  return {
    type: spec.type || 'sentry',
    variant: variant,
    name: spec.name || '哨兵',
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    vx: 0,
    vy: 0,
    facing: -1,
    onGround: false,
    patrolMin: spec.patrolMin,
    patrolMax: spec.patrolMax,
    maxHealth: spec.maxHealth,
    health: spec.maxHealth,
    speed: spec.speed,
    damage: spec.damage,
    attackAvailableAt: 0,
    attackCooldown: spec.attackCooldown || 1100,
    attackRange: attackRange,
    chaseRange: chaseRange,
    preferredDistance: preferredDistance,
    projectileAvailableAt: 0,
    projectileCooldown: projectileCooldown,
    projectileSpeed: projectileSpeed,
    projectileBurstCount: projectileBurstCount,
    hoverBaseY: spec.y,
    hoverAmplitude: hoverAmplitude,
    hoverSpeed: hoverSpeed,
    hoverPhase: hoverPhase,
    activateAtX: spec.activateAtX || 0,
    active: !spec.activateAtX,
    encounterId: spec.encounterId || '',
    encounterTitle: spec.encounterTitle || '',
    encounterSubtitle: spec.encounterSubtitle || '',
    specialAvailableAt: 0,
    specialCooldown: spec.specialCooldown || 2800,
    dashDistance: spec.dashDistance || 260 * this.scale,
    dashDamage: spec.dashDamage || Math.round((spec.damage || 20) * 1.2),
    novaProjectiles: spec.novaProjectiles || 6,
    phase: spec.type === 'boss' ? 1 : 0,
    warningType: '',
    warningUntil: 0,
    executeActionAt: 0,
    pose: '',
    poseUntil: 0,
    hurtUntil: 0,
    deathStartedAt: 0,
    deathUntil: 0,
    finisherLaneY: 0,
    controlLockedUntil: 0,
    invulnerableUntil: 0,
    weakenedUntil: 0,
    recoveryUntil: 0,
    hurtSourceX: 0,
    hazardLinkId: spec.hazardLinkId || '',
    comboRole: spec.comboRole || '',
    comboBoostUntil: 0,
    comboDecayUntil: 0,
    weakHitAudioAt: 0,
    heroFxAvailableAt: 0,
    isDead: false
  };
};

MarvelMinigameRuntime.prototype.createHazard = function (spec) {
  return {
    type: spec.type,
    x: spec.x,
    y: spec.y,
    width: spec.width || (spec.radius ? spec.radius * 2 : 0),
    height: spec.height || (spec.radius ? spec.radius * 2 : 0),
    radius: spec.radius || 0,
    damage: spec.damage || 12,
    cycleDuration: spec.cycleDuration || 2400,
    activeDuration: spec.activeDuration || 800,
    phaseOffset: spec.phaseOffset || 0,
    linkId: spec.linkId || '',
    suppressDuration: spec.suppressDuration || 2200,
    suppressedUntil: 0,
    wasSuppressed: false,
    activeUntil: 0,
    cooldownUntil: 0,
    active: false,
    damageAvailableAt: 0
  };
};

MarvelMinigameRuntime.prototype.updateLevelEvents = function () {
  var boss = this.getAliveBoss();
  var playerCenterX = this.player ? this.player.x + this.player.width / 2 : 0;

  this.levelEvents.forEach(function (event) {
    var shouldTrigger = false;

    if (event.triggered) {
      return;
    }

    if (typeof event.triggerX === 'number' && playerCenterX >= event.triggerX) {
      shouldTrigger = true;
    }

    if (!shouldTrigger && typeof event.triggerBossHealthBelow === 'number' && boss && boss.maxHealth > 0) {
      shouldTrigger = (boss.health / boss.maxHealth) <= event.triggerBossHealthBelow;
    }

    if (!shouldTrigger) {
      return;
    }

    event.triggered = true;
    this.pushAnnouncement(
      event.title || this.level.chapterLabel,
      event.subtitle || '',
      event.color || ACCENT,
      event.duration || 1.9
    );
  }, this);
};

MarvelMinigameRuntime.prototype.maybeAnnounceEnemyEncounter = function (enemy) {
  var player = this.player;
  var key;
  var distance;

  if (!player || !enemy || enemy.isDead || enemy.type === 'boss') {
    return;
  }

  key = enemy.type === 'drone' ? 'drone' : (enemy.variant || enemy.type);
  if (this.encounterHintsShown[key]) {
    return;
  }

  distance = Math.abs((player.x + player.width / 2) - (enemy.x + enemy.width / 2));
  if (distance > 240 * this.scale) {
    return;
  }

  this.encounterHintsShown[key] = true;

  if (key === 'artillery') {
    this.pushAnnouncement('炮击单位', '炮击哨兵会停下射击，保持移动或贴身压制。', ACCENT, 1.8);
  } else if (key === 'brute') {
    this.pushAnnouncement('重装单位', '重装哨兵伤害更高，近身压迫更强。', WARNING, 1.8);
  } else if (key === 'skirmisher') {
    this.pushAnnouncement('游击单位', '游击哨兵会反复拉扯，注意抓住空档。', SUCCESS, 1.8);
  } else if (key === 'drone') {
    this.pushAnnouncement('空中巡逻', '无人机会悬停拉扯，并从远处持续开火。', ACCENT, 1.9);
  }
};

MarvelMinigameRuntime.prototype.createEncounterStates = function () {
  var states = {};

  this.enemies.forEach(function (enemy) {
    if (!enemy.encounterId) {
      return;
    }
    if (!states[enemy.encounterId]) {
      states[enemy.encounterId] = {
        id: enemy.encounterId,
        title: enemy.encounterTitle || '敌群来袭',
        subtitle: enemy.encounterSubtitle || '',
        total: 0,
        defeated: 0,
        engaged: false,
        cleared: false
      };
    }
    states[enemy.encounterId].total += 1;
  });

  return states;
};

MarvelMinigameRuntime.prototype.completeEncounter = function (encounterId, now) {
  var state = this.encounterStates[encounterId];
  var player = this.player;
  var healAmount;

  if (!state || state.cleared) {
    return;
  }

  state.cleared = true;
  if (this.levelStats) {
    this.levelStats.encountersCleared += 1;
  }
  this.pushAnnouncement(state.title || '区域肃清', '当前敌群已清空，继续推进。', SUCCESS, 1.9);

  if (!player || player.isDead) {
    return;
  }

  healAmount = Math.min(18, player.maxHealth - player.health);
  if (healAmount <= 0) {
    return;
  }

  player.health += healAmount;
  this.pushFloatingText('+' + healAmount, player.x + player.width / 2, player.y - 26 * this.scale, SUCCESS);
  this.pushEffect(player.x + player.width / 2, player.y + player.height * 0.35, SUCCESS, 'suppressed', {
    staticY: true
  });
  this.startShake(1.4, 80);
};

MarvelMinigameRuntime.prototype.getActiveEncounterState = function () {
  var activeKey = '';

  Object.keys(this.encounterStates || {}).some(function (encounterId) {
    var state = this.encounterStates[encounterId];
    if (state && state.engaged && !state.cleared) {
      activeKey = encounterId;
      return true;
    }
    return false;
  }, this);

  return activeKey ? this.encounterStates[activeKey] : null;
};

MarvelMinigameRuntime.prototype.canContinueFromCheckpoint = function () {
  return this.state === 'over' && !!this.activeCheckpoint && !this.checkpointContinueUsed;
};

MarvelMinigameRuntime.prototype.updateCheckpoints = function (now) {
  var player = this.player;
  var playerCenterX;
  var playerCenterY;

  if (!player || player.isDead || !this.checkpoints.length) {
    return;
  }

  playerCenterX = player.x + player.width / 2;
  playerCenterY = player.y + player.height / 2;

  this.checkpoints.forEach(function (checkpoint) {
    var deltaX;
    var deltaY;
    var healAmount;

    if (checkpoint.activated) {
      return;
    }

    deltaX = Math.abs(playerCenterX - checkpoint.x);
    deltaY = Math.abs(playerCenterY - (checkpoint.y - 36 * this.scale));
    if (deltaX > 52 * this.scale || deltaY > 142 * this.scale) {
      return;
    }

    checkpoint.activated = true;
    this.activeCheckpoint = checkpoint;
    this.checkpointContinueUsed = false;
    if (this.levelStats) {
      this.levelStats.checkpointsActivated += 1;
    }
    healAmount = Math.min(player.maxHealth - player.health, Math.max(12, Math.round(player.maxHealth * 0.18)));
    if (healAmount > 0) {
      player.health += healAmount;
      this.pushFloatingText('+' + healAmount, checkpoint.x, checkpoint.y - 74 * this.scale, SUCCESS);
    }
    this.pushAnnouncement('检查点激活', checkpoint.label + ' 已成为新的回撤点。', SUCCESS, 1.8);
    this.pushEffect(checkpoint.x, checkpoint.y - 82 * this.scale, SUCCESS, 'suppressed', {
      staticY: true
    });
    this.startShake(1.6, 90);
  }, this);
};

MarvelMinigameRuntime.prototype.reviveFromCheckpoint = function () {
  var checkpoint = this.activeCheckpoint;
  var player = this.player;
  var now = Date.now();
  var resumeHealth;

  if (!checkpoint || !player) {
    return;
  }

  resumeHealth = Math.max(24, Math.round(player.maxHealth * 0.58));
  player.isDead = false;
  player.health = Math.min(player.maxHealth, resumeHealth);
  player.x = utils.clamp(checkpoint.x - player.width / 2, 0, this.level.worldWidth - player.width);
  player.y = checkpoint.y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.invulnerableUntil = now + 1600;
  player.hurtUntil = 0;
  player.controlLockedUntil = now + 200;
  player.airJumpsRemaining = player.maxAirJumps;
  player.dashUntil = 0;
  player.beamUntil = 0;
  player.deathStartedAt = 0;
  player.deathUntil = 0;
  player.lastGroundedAt = now;
  player.pose = '';
  player.poseUntil = 0;

  this.projectiles = [];
  this.effects = [];
  this.levelResultTime = 0;
  this.cameraX = utils.clamp(player.x + player.width / 2 - this.width * 0.38, 0, this.level.worldWidth - this.width);
  this.checkpointContinueUsed = true;
  if (this.levelStats) {
    this.levelStats.checkpointContinues += 1;
  }
  this.resetTouchState();
  this.state = 'playing';
  this.hazards.forEach(function (hazard) {
    var centerX = hazard.type === 'mine' ? hazard.x : hazard.x + hazard.width / 2;
    if (Math.abs(centerX - checkpoint.x) < 220 * this.scale) {
      hazard.suppressedUntil = Math.max(hazard.suppressedUntil || 0, now + 1200);
    }
  }, this);
  this.pushAnnouncement('检查点继续', '重新回到战斗，利用空档稳住局面。', ACCENT, 1.7);
  this.pushEffect(checkpoint.x, checkpoint.y - 82 * this.scale, ACCENT, 'impact', {
    staticY: true
  });
  this.startShake(2.2, 110);
};

MarvelMinigameRuntime.prototype.maybeAnnounceBossIntro = function () {
  var boss = this.getAliveBoss();
  var player = this.player;
  var playerCenterX;
  var bossCenterX;

  if (this.bossIntroShown || !boss || !player || this.state !== 'playing') {
    return;
  }

  playerCenterX = player.x + player.width / 2;
  bossCenterX = boss.x + boss.width / 2;
  if (Math.abs(playerCenterX - bossCenterX) > 420 * this.scale) {
    return;
  }

  this.bossIntroShown = true;
  this.bossArenaLockActive = true;
  this.bossArenaLockX = Math.max(0, boss.patrolMin - 34 * this.scale);
  this.pushAnnouncement('首领来袭', boss.name + ' 已守住最终战区，准备决战。', WARNING, 2.2);
  this.pushAnnouncement('战区封锁', '泰坦闸门正在关闭，守住当前战场。', DANGER, 1.7);
  this.pushEffect(this.bossArenaLockX, this.level.floorY - 92 * this.scale, WARNING, 'lightning', {
    staticY: true
  });
  this.startShake(2.8, 120);
};

MarvelMinigameRuntime.prototype.tryActivateEnemyEncounter = function (enemy, now) {
  var player = this.player;
  var playerCenterX;
  var burstKey;
  var encounterState;

  if (!player || !enemy || enemy.isDead || enemy.active || !enemy.activateAtX) {
    return;
  }

  playerCenterX = player.x + player.width / 2;
  if (playerCenterX < enemy.activateAtX) {
    return;
  }

  enemy.active = true;
  enemy.controlLockedUntil = now + 180;
  this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type === 'drone' ? ACCENT : WARNING, 'impact', {
    staticY: true
  });
  this.startShake(enemy.type === 'drone' ? 1.6 : 2.1, 80);

  if (!enemy.encounterId) {
    return;
  }

  encounterState = this.encounterStates[enemy.encounterId];
  if (encounterState && !encounterState.engaged) {
    encounterState.engaged = true;
  }

  burstKey = 'encounter:' + enemy.encounterId;
  if (this.encounterBurstsShown[burstKey]) {
    return;
  }

  this.encounterBurstsShown[burstKey] = true;
  this.pushAnnouncement(
    enemy.encounterTitle || '敌群来袭',
    enemy.encounterSubtitle || '新的敌群已进入战场。',
    enemy.type === 'drone' ? ACCENT : WARNING,
    2
  );
};

MarvelMinigameRuntime.prototype.getPlayerRect = function () {
  return this.player ? {
    x: this.player.x,
    y: this.player.y,
    width: this.player.width,
    height: this.player.height
  } : null;
};

MarvelMinigameRuntime.prototype.update = function (dt, now) {
  this.announcements = this.announcements.filter(function (item) {
    item.age += dt;
    return item.age < item.duration;
  });

  if (this.state === 'transition') {
    if (now - this.transitionStartedAt >= this.transitionDuration) {
      this.startLevel(this.transitionLevelIndex >= 0 ? this.transitionLevelIndex : 0);
    }
    return;
  }

  if (this.state !== 'playing') {
    return;
  }

  this.elapsedTime += dt;
  this.updatePlayer(dt, now);
  this.updateEnemies(dt, now);
  this.updateHazards(dt, now);
  this.updateProjectiles(dt, now);
  this.updateEffects(dt);
  this.updateCamera(dt);
  this.updateLevelEvents();
  this.updateCheckpoints(now);
  this.maybeAnnounceBossIntro();
  this.checkVictory(now);
};

MarvelMinigameRuntime.prototype.updatePlayer = function (dt, now) {
  var player = this.player;
  var hero = this.hero;
  var moveIntent = 0;
  var gravity = hero.gravity * this.scale;
  var targetSpeed = hero.moveSpeed * this.scale;
  var wasOnGround;
  var preMoveVy;

  if (!player || player.isDead) {
    return;
  }

  if (now < player.dashUntil) {
    player.vy = 0;
    player.vx = player.facing * 760 * this.scale;
  } else {
    if (now < player.controlLockedUntil) {
      player.vx = utils.lerp(player.vx, 0, Math.min(1, dt * 7));
    } else {
      if (this.moveLeft && !this.moveRight) {
        moveIntent = -1;
      } else if (this.moveRight && !this.moveLeft) {
        moveIntent = 1;
      }

      player.vx = moveIntent * targetSpeed;
      if (moveIntent !== 0) {
        player.facing = moveIntent;
      }
    }
    player.vy += gravity * dt;
  }

  wasOnGround = player.onGround;
  preMoveVy = player.vy;
  this.moveBodyWithPlatforms(player, dt);

  if (player.onGround) {
    player.airJumpsRemaining = player.maxAirJumps;
    if (!wasOnGround) {
      player.lastGroundedAt = now;
      if (preMoveVy > 440 * this.scale) {
        this.pushEffect(player.x + player.width / 2, player.y + player.height, hero.glowStyle, 'landing');
        this.startShake(hero.key === 'hulk' ? 4.8 : 2.8, 130);
      }
    }
  }

  if (now >= player.beamUntil) {
    player.beamUntil = 0;
  } else {
    this.damageEnemiesInBeam(now);
  }
};

MarvelMinigameRuntime.prototype.moveBodyWithPlatforms = function (body, dt) {
  var nextX = body.x + body.vx * dt;
  var nextY = body.y + body.vy * dt;
  var i;
  var platform;

  body.onGround = false;
  body.x = nextX;

  for (i = 0; i < this.level.platforms.length; i += 1) {
    platform = this.level.platforms[i];
    if (utils.rectsIntersect({
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height
    }, platform)) {
      if (body.vx > 0) {
        body.x = platform.x - body.width;
      } else if (body.vx < 0) {
        body.x = platform.x + platform.width;
      }
      body.vx = 0;
    }
  }

  body.y = nextY;

  for (i = 0; i < this.level.platforms.length; i += 1) {
    platform = this.level.platforms[i];
    if (utils.rectsIntersect({
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height
    }, platform)) {
      if (body.vy >= 0 && body.y + body.height - body.vy * dt <= platform.y + 2) {
        body.y = platform.y - body.height;
        body.vy = 0;
        body.onGround = true;
      } else if (body.vy < 0 && body.y - body.vy * dt >= platform.y + platform.height - 2) {
        body.y = platform.y + platform.height;
        body.vy = 0;
      }
    }
  }

  body.x = utils.clamp(body.x, 0, this.level.worldWidth - body.width);

  if (body === this.player && this.bossArenaLockActive) {
    body.x = Math.max(body.x, this.bossArenaLockX);
  }

  if (body.y > this.height + 200 * this.scale) {
    body.y = this.level.floorY - body.height;
    body.vy = 0;
    body.onGround = true;
    if (body === this.player) {
      this.applyDamageToPlayer(20, Date.now(), body.x + body.width / 2, body.y + body.height, 'fall');
    }
  }
};

MarvelMinigameRuntime.prototype.triggerJump = function () {
  var player = this.player;
  var hero = this.hero;

  if (!player || this.state !== 'playing' || player.isDead) {
    return;
  }

  if (player.onGround) {
    player.vy = -hero.jumpSpeed * this.scale;
    player.onGround = false;
    this.setPose(player, 'jump', 220);
    this.audio.playSfx('jump');
    return;
  }

  if (player.airJumpsRemaining > 0) {
    player.airJumpsRemaining -= 1;
    player.vy = -hero.jumpSpeed * this.scale * 0.92;
    this.setPose(player, 'jump', 220);
    this.audio.playSfx('jump');
  }
};

MarvelMinigameRuntime.prototype.usePrimaryAttack = function () {
  var player = this.player;
  var hero = this.hero;
  var now = Date.now();

  if (!player || this.state !== 'playing' || player.isDead || now < player.attackAvailableAt) {
    return;
  }

  player.attackAvailableAt = now + hero.attackCooldown * 1000;
  this.setPose(player, 'attackPrimary', hero.basicType === 'ranged' ? 180 : 220);

  if (hero.basicType === 'ranged') {
    this.audio.playSfx('shot');
    this.spawnPlayerProjectile({
      x: player.facing > 0 ? player.x + player.width + 8 * this.scale : player.x - 20 * this.scale,
      y: player.y + player.height * 0.42,
      vx: player.facing * 640 * this.scale,
      vy: 0,
      width: 20 * this.scale,
      height: 10 * this.scale,
      damage: 18,
      color: hero.glowStyle,
      hitEffect: 'repulsorHit',
      lifetime: 0.8
    });
    this.pushEffect(player.x + player.width / 2, player.y + 20 * this.scale, hero.glowStyle, 'blast');
    return;
  }

  this.audio.playSfx('melee');
  this.performMeleeAttack(92 * this.scale, 26, hero.primaryStyle);
};

MarvelMinigameRuntime.prototype.useSkill = function () {
  var player = this.player;
  var hero = this.hero;
  var now = Date.now();

  if (!player || this.state !== 'playing' || player.isDead || now < player.skillAvailableAt) {
    return;
  }

  player.skillAvailableAt = now + hero.skillCooldown * 1000;
  this.setPose(player, hero.key === 'ironman' ? 'attackPrimary' : 'attackSkill', 260);
  this.audio.playSfx(hero.key === 'ironman' ? 'shot' : 'melee');

  if (hero.key === 'ironman') {
    this.spawnSpreadProjectiles(3, 560 * this.scale, 28, 16, hero.glowStyle, 'repulsorHit');
    this.pushEffect(player.x + player.width / 2, player.y, hero.glowStyle, 'skill');
    this.pushEffect(
      player.x + player.width / 2 + player.facing * 172 * this.scale,
      player.y + player.height * 0.42,
      hero.glowStyle,
      'repulsorLanding',
      { staticY: true }
    );
    return;
  }

  if (hero.key === 'thor') {
    this.spawnPlayerProjectile({
      x: player.facing > 0 ? player.x + player.width + 8 * this.scale : player.x - 24 * this.scale,
      y: player.y + player.height * 0.38,
      vx: player.facing * 520 * this.scale,
      vy: -60 * this.scale,
      width: 24 * this.scale,
      height: 14 * this.scale,
      damage: 32,
      color: hero.glowStyle,
      hitEffect: 'thunderHit',
      lifetime: 1.2,
      pierce: 2
    });
    this.pushEffect(player.x + player.width / 2, player.y, hero.glowStyle, 'throw');
    this.pushEffect(
      player.x + player.width / 2 + player.facing * 164 * this.scale,
      player.y + player.height * 0.32,
      hero.glowStyle,
      'thunderLanding',
      { staticY: true }
    );
    return;
  }

  player.dashUntil = now + 280;
  player.vx = player.facing * 760 * this.scale;
  player.vy = 0;
  this.pushEffect(
    player.x + player.width / 2 + player.facing * 136 * this.scale,
    player.y + player.height * 0.74,
    hero.glowStyle,
    'gammaLanding',
    { staticY: true }
  );
  this.damageEnemiesInDash(44, hero.glowStyle);
};

MarvelMinigameRuntime.prototype.useUltimate = function () {
  var player = this.player;
  var hero = this.hero;
  var now = Date.now();

  if (!player || this.state !== 'playing' || player.isDead || now < player.ultimateAvailableAt) {
    return;
  }

  player.ultimateAvailableAt = now + hero.ultimateCooldown * 1000;
  this.setPose(player, 'attackUltimate', 420);
  this.audio.playSfx('ultimate');

  if (hero.key === 'ironman') {
    player.beamUntil = now + 550;
    this.pushEffect(player.x + player.width / 2, player.y + 10 * this.scale, hero.glowStyle, 'ultimate');
    this.pushEffect(
      player.x + player.width / 2 + player.facing * (player.beamLength - 12 * this.scale),
      player.y + player.height * 0.38,
      hero.glowStyle,
      'repulsorLanding',
      { staticY: true }
    );
    return;
  }

  if (hero.key === 'thor') {
    this.strikeLightning(hero.glowStyle);
    return;
  }

  this.performGroundSlam(hero.glowStyle);
};

MarvelMinigameRuntime.prototype.spawnSpreadProjectiles = function (count, speed, damage, spreadAngle, color, hitEffect) {
  var player = this.player;
  var middle = (count - 1) / 2;
  var i;
  var offsetIndex;
  var radians;

  for (i = 0; i < count; i += 1) {
    offsetIndex = i - middle;
    radians = offsetIndex * (spreadAngle * Math.PI / 180);
    this.spawnPlayerProjectile({
      x: player.facing > 0 ? player.x + player.width + 8 * this.scale : player.x - 20 * this.scale,
      y: player.y + player.height * 0.4,
      vx: player.facing * Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed * 0.22,
      width: 18 * this.scale,
      height: 10 * this.scale,
      damage: damage,
      color: color,
      hitEffect: hitEffect || '',
      lifetime: 0.95
    });
  }
};

MarvelMinigameRuntime.prototype.performMeleeAttack = function (range, damage, color) {
  var player = this.player;
  var hitbox = {
    x: player.facing > 0 ? player.x + player.width - 8 * this.scale : player.x - range,
    y: player.y + 8 * this.scale,
    width: range,
    height: player.height - 16 * this.scale
  };

  this.pushEffect(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height / 2, color, 'slash');

  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead && utils.rectsIntersect(hitbox, enemy)) {
      this.applyDamageToEnemy(enemy, damage, Date.now(), color, player.x + player.width / 2, player.y + player.height / 2);
      this.triggerHeroHitEffect(enemy, this.hero.key === 'thor' ? 'thunderHit' : 'gammaHit', color, Date.now());
    }
  }, this);
};

MarvelMinigameRuntime.prototype.damageEnemiesInDash = function (damage, color) {
  var player = this.player;
  var hitbox = {
    x: player.facing > 0 ? player.x + player.width - 10 * this.scale : player.x - 110 * this.scale,
    y: player.y + 6 * this.scale,
    width: 110 * this.scale,
    height: player.height - 12 * this.scale
  };

  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead && utils.rectsIntersect(hitbox, enemy)) {
      this.applyDamageToEnemy(enemy, damage, Date.now(), color, player.x + player.width / 2, player.y + player.height / 2);
      this.triggerHeroHitEffect(enemy, 'gammaHit', color, Date.now());
    }
  }, this);
};

MarvelMinigameRuntime.prototype.strikeLightning = function (color) {
  var player = this.player;
  var target = null;
  var i;
  var distance = Infinity;
  var dist;
  var impactX;
  var impactY;

  for (i = 0; i < this.enemies.length; i += 1) {
    if (this.enemies[i].isDead) {
      continue;
    }
    dist = Math.abs(this.enemies[i].x - player.x);
    if (dist < distance) {
      target = this.enemies[i];
      distance = dist;
    }
  }

  impactX = target ? target.x + target.width / 2 : player.x + player.facing * 180 * this.scale;
  impactY = target ? target.y + target.height / 2 : this.level.floorY - 40 * this.scale;

  this.pushEffect(impactX, impactY, color, 'lightning');
  this.pushEffect(impactX, impactY, color, 'thunderLanding', { staticY: true });
  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead) {
      var centerX = enemy.x + enemy.width / 2;
      var centerY = enemy.y + enemy.height / 2;
      var dx = centerX - impactX;
      var dy = centerY - impactY;
      if ((dx * dx + dy * dy) <= Math.pow(210 * this.scale, 2)) {
        this.applyDamageToEnemy(enemy, 56, Date.now(), color, impactX, impactY);
        this.triggerHeroHitEffect(enemy, 'thunderHit', color, Date.now());
      }
    }
  }, this);
};

MarvelMinigameRuntime.prototype.performGroundSlam = function (color) {
  var player = this.player;
  this.pushEffect(player.x + player.width / 2, player.y + player.height, color, 'slam');
  this.pushEffect(player.x + player.width / 2, player.y + player.height, color, 'gammaLanding', { staticY: true });
  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead) {
      var centerX = enemy.x + enemy.width / 2;
      var centerY = enemy.y + enemy.height / 2;
      var dx = centerX - (player.x + player.width / 2);
      var dy = centerY - (player.y + player.height / 2);
      if ((dx * dx + dy * dy) <= Math.pow(240 * this.scale, 2)) {
        this.applyDamageToEnemy(enemy, 62, Date.now(), color, player.x + player.width / 2, player.y + player.height / 2);
        this.triggerHeroHitEffect(enemy, 'gammaHit', color, Date.now());
      }
    }
  }, this);
};

MarvelMinigameRuntime.prototype.spawnPlayerProjectile = function (spec) {
  this.projectiles.push({
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    vx: spec.vx,
    vy: spec.vy,
    damage: spec.damage,
    color: spec.color,
    hitEffect: spec.hitEffect || '',
    team: 'player',
    lifetime: spec.lifetime,
    age: 0,
    pierce: spec.pierce || 0,
    hits: []
  });
};

MarvelMinigameRuntime.prototype.triggerHeroHitEffect = function (enemy, effectType, color, now) {
  if (!enemy || !effectType) {
    return;
  }

  if (enemy.heroFxAvailableAt && now < enemy.heroFxAvailableAt) {
    return;
  }

  enemy.heroFxAvailableAt = now + 90;
  this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.42, color, effectType);
};

MarvelMinigameRuntime.prototype.updateEnemies = function (dt, now) {
  var player = this.player;
  var gravity = 2250 * this.scale;
  var activeHazardMap = {};

  this.hazards.forEach(function (hazard) {
    if (!hazard.linkId || !hazard.active || now < (hazard.suppressedUntil || 0)) {
      return;
    }
    activeHazardMap[hazard.linkId] = true;
  });

  this.enemies.forEach(function (enemy) {
    var comboActive = !!(enemy.hazardLinkId && activeHazardMap[enemy.hazardLinkId]);
    var baseSpeed;
    var comboMultiplier;
    var chase;
    var distX;
    var closeEnoughToAttack;
    var canProjectile;
    var holdDistance;

    if (enemy.isDead) {
      return;
    }

    if (!enemy.active) {
      this.tryActivateEnemyEncounter(enemy, now);
      if (!enemy.active) {
        return;
      }
    }

    this.maybeAnnounceEnemyEncounter(enemy);

    if (enemy.type === 'boss') {
      this.updateBossEnemy(enemy, dt, now);
      return;
    }

    if (enemy.type === 'drone') {
      var droneCenterX;
      var playerCenterX;
      var playerCenterY;
      var droneDistX;
      var droneVerticalGap;
      var desiredY;
      var holdMin;
      var holdMax;
      var moveDir;
      var canDroneProjectile;
      var closeEnoughForBodyHit;

      droneCenterX = enemy.x + enemy.width / 2;
      playerCenterX = player.x + player.width / 2;
      playerCenterY = player.y + player.height / 2;
      droneDistX = playerCenterX - droneCenterX;
      droneVerticalGap = Math.abs(playerCenterY - (enemy.y + enemy.height / 2));
      desiredY = enemy.hoverBaseY + Math.sin((now + enemy.hoverPhase) * 0.001 * enemy.hoverSpeed) * enemy.hoverAmplitude;

      if (now < enemy.controlLockedUntil) {
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        enemy.vx = utils.lerp(enemy.vx, 0, Math.min(1, dt * 4.2));
        enemy.vy = utils.lerp(enemy.vy, 0, Math.min(1, dt * 4.2));
      } else {
        enemy.facing = droneDistX >= 0 ? 1 : -1;
        holdMin = enemy.preferredDistance * 0.78;
        holdMax = enemy.preferredDistance * 1.14;
        canDroneProjectile = Math.abs(droneDistX) < enemy.chaseRange
          && droneVerticalGap < 110 * this.scale;
        closeEnoughForBodyHit = Math.abs(droneDistX) < enemy.attackRange
          && droneVerticalGap < 58 * this.scale;

        if (closeEnoughForBodyHit && now >= enemy.attackAvailableAt) {
          enemy.vx = -enemy.facing * enemy.speed * this.scale * 0.55;
          enemy.attackAvailableAt = now + enemy.attackCooldown;
          this.setPose(enemy, 'attack', 260);
          this.tryEnemyAttack(enemy, now);
        } else if (canDroneProjectile && now >= enemy.projectileAvailableAt) {
          enemy.vx = 0;
          enemy.projectileAvailableAt = now + enemy.projectileCooldown;
          this.setPose(enemy, 'attack', 320);
          this.spawnEnemyProjectile(enemy);
        } else if (Math.abs(droneDistX) < enemy.chaseRange) {
          if (Math.abs(droneDistX) < holdMin) {
            enemy.vx = -enemy.facing * enemy.speed * this.scale * 0.92;
          } else if (Math.abs(droneDistX) > holdMax) {
            enemy.vx = enemy.facing * enemy.speed * this.scale;
          } else {
            enemy.vx = enemy.facing * enemy.speed * this.scale * 0.24;
          }
        } else {
          if (enemy.x <= enemy.patrolMin) {
            enemy.facing = 1;
          } else if (enemy.x + enemy.width >= enemy.patrolMax) {
            enemy.facing = -1;
          }
          moveDir = enemy.facing || 1;
          enemy.vx = moveDir * enemy.speed * this.scale * 0.72;
        }

        enemy.x += enemy.vx * dt;
        enemy.y = utils.lerp(enemy.y, desiredY, Math.min(1, dt * 6.5));
      }

      if (enemy.x <= enemy.patrolMin) {
        enemy.x = enemy.patrolMin;
        enemy.facing = 1;
      } else if (enemy.x + enemy.width >= enemy.patrolMax) {
        enemy.x = enemy.patrolMax - enemy.width;
        enemy.facing = -1;
      }

      enemy.onGround = false;
      return;
    }

    baseSpeed = enemy.speed * this.scale;
    comboMultiplier = 1;

    if (comboActive) {
      enemy.comboBoostUntil = now + 180;
    } else if (enemy.comboBoostUntil && now < enemy.comboBoostUntil) {
      comboActive = true;
    }

    if (comboActive) {
      comboMultiplier = enemy.comboRole === 'rushdown' ? 1.26 : 1.14;
      enemy.comboDecayUntil = 0;
    } else if (enemy.comboDecayUntil && now < enemy.comboDecayUntil) {
      comboMultiplier = 0.86;
    }

    if (now < enemy.controlLockedUntil) {
      enemy.vx = utils.lerp(enemy.vx, 0, Math.min(1, dt * 8));
      enemy.vy += gravity * dt;
      this.moveBodyWithPlatforms(enemy, dt);
      return;
    }

    distX = player.x - enemy.x;
    closeEnoughToAttack = Math.abs(distX) < enemy.attackRange
      && Math.abs((player.y + player.height / 2) - (enemy.y + enemy.height / 2)) < 52 * this.scale;
    canProjectile = enemy.projectileCooldown > 0
      && Math.abs(distX) > enemy.attackRange * 0.74
      && Math.abs(distX) < enemy.chaseRange * 1.08
      && Math.abs((player.y + player.height / 2) - (enemy.y + enemy.height / 2)) < 82 * this.scale;
    chase = Math.abs(distX) < enemy.chaseRange;
    holdDistance = enemy.preferredDistance || 0;

    if (closeEnoughToAttack) {
      enemy.vx = 0;
      enemy.facing = distX >= 0 ? 1 : -1;
      if (now >= enemy.attackAvailableAt) {
        enemy.attackAvailableAt = now + enemy.attackCooldown;
        this.setPose(enemy, 'attack', 260);
        this.tryEnemyAttack(enemy, now);
      }
    } else if (canProjectile && now >= enemy.projectileAvailableAt) {
      enemy.vx = 0;
      enemy.facing = distX >= 0 ? 1 : -1;
      enemy.projectileAvailableAt = now + enemy.projectileCooldown;
      this.setPose(enemy, 'attack', 300);
      this.spawnEnemyProjectile(enemy);
    } else {
      if (chase) {
        enemy.facing = distX >= 0 ? 1 : -1;
        if (enemy.variant === 'artillery' && holdDistance > 0) {
          if (Math.abs(distX) < holdDistance * 0.72) {
            enemy.vx = -enemy.facing * baseSpeed * 0.74 * comboMultiplier;
          } else if (Math.abs(distX) > holdDistance * 1.16) {
            enemy.vx = enemy.facing * baseSpeed * 0.88 * comboMultiplier;
          } else {
            enemy.vx = 0;
          }
        } else if (enemy.variant === 'skirmisher' && Math.abs(distX) < holdDistance * 0.8) {
          enemy.vx = -enemy.facing * baseSpeed * 0.48 * comboMultiplier;
        } else {
          enemy.vx = enemy.facing * baseSpeed * comboMultiplier;
        }
      } else {
        if (enemy.x <= enemy.patrolMin) {
          enemy.facing = 1;
        } else if (enemy.x + enemy.width >= enemy.patrolMax) {
          enemy.facing = -1;
        }
        enemy.vx = enemy.facing * baseSpeed * comboMultiplier;
      }
    }

    if (!comboActive && enemy.hazardLinkId && enemy.comboBoostUntil && now >= enemy.comboBoostUntil && !enemy.comboDecayUntil) {
      enemy.comboDecayUntil = now + 540;
      this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.45, SUCCESS, 'suppressed');
    }

    enemy.vy += gravity * dt;
    this.moveBodyWithPlatforms(enemy, dt);
  }, this);
};

MarvelMinigameRuntime.prototype.updateHazards = function (dt, now) {
  var playerRect = this.getPlayerRect();

  this.hazards.forEach(function (hazard) {
    var cycleProgress;
    var wasActive = hazard.active;
    var hitRect;
    var dx;
    var dy;
    var centerX;
    var centerY;

    if (hazard.type === 'switch') {
      hitRect = {
        x: hazard.x,
        y: hazard.y,
        width: hazard.width,
        height: hazard.height
      };
      if (playerRect && utils.rectsIntersect(hitRect, playerRect) && now >= hazard.cooldownUntil) {
        hazard.activeUntil = now + hazard.activeDuration;
        hazard.cooldownUntil = now + hazard.cycleDuration;
        this.startShake(1.8, 90);
        this.pushEffect(hazard.x + hazard.width / 2, hazard.y + hazard.height / 2, SUCCESS, 'skill');
        this.pushEffect(hazard.x + hazard.width / 2, hazard.y + hazard.height / 2, SUCCESS, 'impact');
        this.audio.playSfx('ultimate');
        this.hazards.forEach(function (target) {
          if (target !== hazard && target.linkId && target.linkId === hazard.linkId) {
            target.suppressedUntil = Math.max(target.suppressedUntil || 0, now + hazard.suppressDuration);
          }
        });
      }
      hazard.active = now < hazard.activeUntil;
      return;
    }

    cycleProgress = (now + hazard.phaseOffset) % hazard.cycleDuration;
    if (now < (hazard.suppressedUntil || 0) && !hazard.wasSuppressed) {
      this.pushEffect(
        hazard.x + (hazard.width || hazard.radius * 2) / 2,
        hazard.y + (hazard.height || hazard.radius * 2) / 2,
        SUCCESS,
        'suppressed'
      );
      hazard.wasSuppressed = true;
    } else if (hazard.wasSuppressed && now >= (hazard.suppressedUntil || 0)) {
      this.pushEffect(
        hazard.x + (hazard.width || hazard.radius * 2) / 2,
        hazard.y + (hazard.height || hazard.radius * 2) / 2,
        WARNING,
        'restored'
      );
      hazard.wasSuppressed = false;
    }
    hazard.active = cycleProgress < hazard.activeDuration && now >= (hazard.suppressedUntil || 0);

    if (hazard.active && !wasActive) {
      this.pushEffect(
        hazard.x + (hazard.width || hazard.radius * 2) / 2,
        hazard.y + (hazard.height || hazard.radius * 2) / 2,
        WARNING,
        hazard.type === 'mine' ? 'blast' : 'lightning'
      );
      this.startShake(hazard.type === 'mine' ? 2.4 : 1.6, 90);
      this.audio.playSfx(hazard.type === 'mine' ? 'melee' : 'shot');
    }

    if (!hazard.active || now < hazard.damageAvailableAt || !playerRect) {
      return;
    }

    if (hazard.type === 'gate') {
      centerX = hazard.x + hazard.width / 2;
      centerY = hazard.y + hazard.height / 2;
      hitRect = {
        x: hazard.x,
        y: hazard.y,
        width: hazard.width,
        height: hazard.height
      };
      if (utils.rectsIntersect(hitRect, playerRect)) {
        hazard.damageAvailableAt = now + 650;
        this.applyDamageToPlayer(hazard.damage, now, centerX, centerY, 'hazard');
      }
      return;
    }

    centerX = hazard.x;
    centerY = hazard.y;
    dx = (playerRect.x + playerRect.width / 2) - centerX;
    dy = (playerRect.y + playerRect.height / 2) - centerY;
    if ((dx * dx + dy * dy) <= Math.pow(hazard.radius + Math.max(playerRect.width, playerRect.height) * 0.3, 2)) {
      hazard.damageAvailableAt = now + 650;
      this.applyDamageToPlayer(hazard.damage, now, centerX, centerY, 'hazard');
    }
  }, this);
};

MarvelMinigameRuntime.prototype.updateBossEnemy = function (enemy, dt, now) {
  var player = this.player;
  var gravity = 2150 * this.scale;
  var enemyCenterX = enemy.x + enemy.width / 2;
  var playerCenterX = player.x + player.width / 2;
  var distX = playerCenterX - enemyCenterX;
  var verticalGap = Math.abs((player.y + player.height / 2) - (enemy.y + enemy.height / 2));
  var shouldProjectile = Math.abs(distX) < enemy.chaseRange && verticalGap < 120 * this.scale;

  if (enemy.phase === 1 && enemy.health <= enemy.maxHealth * 0.5) {
    enemy.phase = 2;
    enemy.attackCooldown = 850;
    enemy.projectileCooldown = 1300;
    enemy.specialCooldown = Math.max(2200, enemy.specialCooldown - 400);
    enemy.speed = enemy.speed * 1.18;
    enemy.projectileSpeed = enemy.projectileSpeed * 1.15;
    enemy.attackRange = enemy.attackRange + 18 * this.scale;
    enemy.specialAvailableAt = now + 900;
    this.setPose(enemy, 'attackHeavy', 620);
    this.audio.playSfx('bossRoar');
    this.pushAnnouncement('首领二阶段', '灭霸速度更快，压迫也更强了。', WARNING, 2.2);
  }

  if (now < enemy.controlLockedUntil) {
    enemy.vx = utils.lerp(enemy.vx, 0, Math.min(1, dt * 8));
    enemy.vy += gravity * dt;
    this.moveBodyWithPlatforms(enemy, dt);
    return;
  }

  if (now < enemy.weakenedUntil) {
    enemy.vx = utils.lerp(enemy.vx, 0, Math.min(1, dt * 9));
    enemy.vy += gravity * dt;
    this.moveBodyWithPlatforms(enemy, dt);
    return;
  }

  if (now < enemy.recoveryUntil) {
    enemy.vx = utils.lerp(enemy.vx, 0, Math.min(1, dt * 9));
    enemy.vy += gravity * dt;
    this.setPose(enemy, 'hurt', 180);
    this.moveBodyWithPlatforms(enemy, dt);
    return;
  }

  enemy.facing = distX >= 0 ? 1 : -1;

  if (enemy.warningType) {
    enemy.vx = 0;
    if (now >= enemy.executeActionAt) {
      if (enemy.warningType === 'melee') {
        enemy.attackAvailableAt = now + enemy.attackCooldown;
        this.setPose(enemy, 'attack', 320);
        this.tryEnemyAttack(enemy, now);
      } else if (enemy.warningType === 'projectile') {
        enemy.projectileAvailableAt = now + enemy.projectileCooldown;
        this.setPose(enemy, 'attack', 360);
        this.spawnEnemyProjectile(enemy);
      } else if (enemy.warningType === 'dash') {
        enemy.specialAvailableAt = now + enemy.specialCooldown;
        this.setPose(enemy, 'dash', 320);
        this.executeBossDash(enemy, now);
      } else if (enemy.warningType === 'nova') {
        enemy.specialAvailableAt = now + enemy.specialCooldown + 400;
        this.setPose(enemy, 'nova', 420);
        this.executeBossNova(enemy, now);
      } else if (enemy.warningType === 'finisher') {
        this.setPose(enemy, 'attackHeavy', 520);
        this.executeBossFinisher(enemy, now);
      }
      enemy.warningType = '';
      enemy.warningUntil = 0;
      enemy.executeActionAt = 0;
    }
    enemy.vy += gravity * dt;
    this.moveBodyWithPlatforms(enemy, dt);
    return;
  }

  if (enemy.phase >= 2 && now >= enemy.specialAvailableAt && verticalGap < 128 * this.scale) {
    if (enemy.health <= enemy.maxHealth * 0.22 && Math.abs(distX) < enemy.chaseRange) {
      enemy.vx = 0;
      enemy.warningType = 'finisher';
      enemy.finisherLaneY = utils.clamp(
        this.player.y + this.player.height * 0.5,
        120 * this.scale,
        this.level.floorY - 40 * this.scale
      );
      enemy.warningUntil = now + 560;
      enemy.executeActionAt = enemy.warningUntil;
      this.setPose(enemy, 'attackHeavy', 640);
    } else if (Math.abs(distX) < 150 * this.scale) {
      enemy.vx = 0;
      enemy.warningType = 'nova';
      enemy.warningUntil = now + 420;
      enemy.executeActionAt = enemy.warningUntil;
      enemy.projectileAvailableAt = Math.max(enemy.projectileAvailableAt, enemy.executeActionAt + 320);
      this.setPose(enemy, 'nova', 520);
    } else if (Math.abs(distX) < enemy.chaseRange * 0.96) {
      enemy.vx = 0;
      enemy.warningType = 'dash';
      enemy.warningUntil = now + 300;
      enemy.executeActionAt = enemy.warningUntil;
      this.setPose(enemy, 'dash', 420);
    }
  }

  if (enemy.warningType) {
    enemy.vy += gravity * dt;
    this.moveBodyWithPlatforms(enemy, dt);
    return;
  }

  if (Math.abs(distX) < enemy.attackRange && verticalGap < 84 * this.scale) {
    enemy.vx = 0;
    if (now >= enemy.attackAvailableAt) {
      enemy.warningType = 'melee';
      enemy.warningUntil = now + (enemy.phase === 2 ? 260 : 360);
      enemy.executeActionAt = enemy.warningUntil;
      this.setPose(enemy, 'attack', enemy.phase === 2 ? 360 : 420);
    }
  } else {
    if (Math.abs(distX) > enemy.preferredDistance) {
      enemy.vx = enemy.facing * enemy.speed * this.scale;
    } else {
      enemy.vx = 0;
    }

    if (shouldProjectile && now >= enemy.projectileAvailableAt) {
      enemy.warningType = 'projectile';
      enemy.warningUntil = now + (enemy.phase === 2 ? 320 : 460);
      enemy.executeActionAt = enemy.warningUntil;
      this.setPose(enemy, 'attack', enemy.phase === 2 ? 420 : 520);
    }
  }

  enemy.vy += gravity * dt;
  this.moveBodyWithPlatforms(enemy, dt);
};

MarvelMinigameRuntime.prototype.executeBossDash = function (enemy, now) {
  var startX = enemy.x;
  var targetCenterX = this.player.x + this.player.width / 2;
  var targetX = utils.clamp(
    targetCenterX - enemy.width / 2,
    0,
    this.level.worldWidth - enemy.width
  );
  var maxOffset = enemy.dashDistance;
  var intendedOffset = utils.clamp(targetX - startX, -maxOffset, maxOffset);
  var endX = utils.clamp(startX + intendedOffset, 0, this.level.worldWidth - enemy.width);
  var dashHitbox = {
    x: Math.min(startX, endX) - 12 * this.scale,
    y: enemy.y + 10 * this.scale,
    width: Math.abs(endX - startX) + enemy.width + 24 * this.scale,
    height: enemy.height - 20 * this.scale
  };

  enemy.x = endX;
  enemy.vx = 0;
  enemy.vy = Math.min(enemy.vy, 0);
  enemy.projectileAvailableAt = Math.max(enemy.projectileAvailableAt, now + 500);
  this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.55, WARNING, 'slam');
  this.startShake(4.2, 150);

  if (utils.rectsIntersect(dashHitbox, this.getPlayerRect())) {
    this.applyDamageToPlayer(enemy.dashDamage, now, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'boss');
  }
};

MarvelMinigameRuntime.prototype.executeBossNova = function (enemy, now) {
  var centerX = enemy.x + enemy.width / 2;
  var centerY = enemy.y + enemy.height * 0.42;
  var i;
  var angle;
  var speed;
  var distanceToPlayerX;
  var distanceToPlayerY;

  for (i = 0; i < enemy.novaProjectiles; i += 1) {
    angle = (Math.PI * 2 * i) / enemy.novaProjectiles;
    speed = enemy.projectileSpeed * (i % 2 === 0 ? 0.9 : 1.05);
    this.projectiles.push({
      x: centerX - 12 * this.scale,
      y: centerY - 12 * this.scale,
      width: 24 * this.scale,
      height: 24 * this.scale,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: Math.round(enemy.damage * 0.52),
      color: '#ffb56a',
      team: 'enemy',
      lifetime: 1.65,
      age: 0,
      pierce: 0,
      hits: []
    });
  }

  distanceToPlayerX = (this.player.x + this.player.width / 2) - centerX;
  distanceToPlayerY = (this.player.y + this.player.height / 2) - centerY;
  if ((distanceToPlayerX * distanceToPlayerX + distanceToPlayerY * distanceToPlayerY) <= Math.pow(92 * this.scale, 2)) {
    this.applyDamageToPlayer(Math.round(enemy.damage * 0.7), now, centerX, centerY, 'boss');
  }

  enemy.projectileAvailableAt = Math.max(enemy.projectileAvailableAt, now + 700);
  this.pushEffect(centerX, centerY, WARNING, 'explode');
  this.pushEffect(centerX, centerY, WARNING, 'blast');
  this.startShake(4.6, 170);
};

MarvelMinigameRuntime.prototype.executeBossFinisher = function (enemy, now) {
  var laneHeight = 96 * this.scale;
  var laneCenterY = enemy.finisherLaneY || utils.clamp(
    this.player.y + this.player.height * 0.5,
    120 * this.scale,
    this.level.floorY - 40 * this.scale
  );
  var clearedProjectiles = 0;
  var laneRect = {
    x: 0,
    y: laneCenterY - laneHeight / 2,
    width: this.level.worldWidth,
    height: laneHeight
  };

  enemy.specialAvailableAt = now + enemy.specialCooldown + 1200;
  enemy.weakenedUntil = now + 1600;
  enemy.recoveryUntil = enemy.weakenedUntil + 650;
  enemy.controlLockedUntil = Math.max(enemy.controlLockedUntil, now + 520);
  enemy.projectileAvailableAt = Math.max(enemy.projectileAvailableAt, enemy.recoveryUntil + 180);
  enemy.attackAvailableAt = Math.max(enemy.attackAvailableAt, enemy.recoveryUntil + 220);
  this.projectiles = this.projectiles.filter(function (projectile) {
    if (projectile.team === 'enemy') {
      clearedProjectiles += 1;
      return false;
    }
    return true;
  });
  this.pushEffect(laneRect.width / 2, laneCenterY, WARNING, 'finisher', {
    width: laneRect.width,
    height: laneRect.height
  });
  if (clearedProjectiles > 0) {
    this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.45, SUCCESS, 'suppressed', { staticY: true });
  }
  this.pushAnnouncement('湮灭横扫', '立刻起跳或下落，避开终结光束。', DANGER, 1.8);
  this.pushAnnouncement('首领破绽', '灭霸在横扫后失衡，抓紧输出。', SUCCESS, 1.5);
  this.audio.playSfx('bossFinisher');
  this.startShake(6.5, 220);

  if (utils.rectsIntersect(laneRect, this.getPlayerRect())) {
    this.applyDamageToPlayer(Math.round(enemy.damage * 1.15), now, enemy.x + enemy.width / 2, laneCenterY, 'finisher');
  }
};

MarvelMinigameRuntime.prototype.tryEnemyAttack = function (enemy, now) {
  var hitboxWidth = enemy.type === 'boss' ? 92 * this.scale : (enemy.type === 'drone' ? 42 * this.scale : 56 * this.scale);
  var hitbox = {
    x: enemy.facing > 0 ? enemy.x + enemy.width - 4 * this.scale : enemy.x - hitboxWidth,
    y: enemy.y + (enemy.type === 'drone' ? 2 * this.scale : 8 * this.scale),
    width: hitboxWidth,
    height: enemy.height - (enemy.type === 'boss' ? 10 * this.scale : (enemy.type === 'drone' ? 6 * this.scale : 16 * this.scale))
  };

  this.pushEffect(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height / 2, enemy.type === 'boss' ? WARNING : DANGER, 'enemy');

  if (utils.rectsIntersect(hitbox, this.getPlayerRect())) {
    this.applyDamageToPlayer(enemy.damage, now, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type === 'boss' ? 'boss' : 'enemy');
  }
};

MarvelMinigameRuntime.prototype.spawnEnemyProjectile = function (enemy) {
  var player = this.player;
  var originX = enemy.facing > 0 ? enemy.x + enemy.width + 6 * this.scale : enemy.x - 18 * this.scale;
  var originY = enemy.y + enemy.height * (enemy.type === 'drone' ? 0.5 : 0.34);
  var playerCenterX = player.x + player.width / 2;
  var playerCenterY = player.y + player.height * 0.38;
  var dx = playerCenterX - originX;
  var dy = playerCenterY - originY;
  var length = Math.sqrt(dx * dx + dy * dy) || 1;
  var normalizedX = dx / length;
  var normalizedY = dy / length;
  var spreadOffsets = enemy.type === 'boss'
    ? (enemy.phase >= 2 ? [-0.22, 0, 0.22] : [-0.08, 0.08])
    : (enemy.projectileBurstCount > 1 ? [-0.1, 0.1] : [0]);
  var projectileColor = enemy.type === 'drone'
    ? '#8fe6ff'
    : (enemy.variant === 'artillery' ? ACCENT : '#ffb56a');
  var projectileSize = enemy.type === 'drone' ? 14 * this.scale : 18 * this.scale;
  var i;
  var rotation;
  var cos;
  var sin;

  for (i = 0; i < spreadOffsets.length; i += 1) {
    rotation = spreadOffsets[i];
    cos = Math.cos(rotation);
    sin = Math.sin(rotation);
    this.projectiles.push({
      x: originX,
      y: originY,
      width: projectileSize,
      height: projectileSize,
      vx: (normalizedX * cos - normalizedY * sin) * enemy.projectileSpeed,
      vy: (normalizedX * sin + normalizedY * cos) * enemy.projectileSpeed,
      damage: Math.round(enemy.damage * 0.6),
      color: projectileColor,
      team: 'enemy',
      lifetime: 1.5,
      age: 0,
      pierce: 0,
      hits: []
    });
  }

  this.pushEffect(originX, originY, projectileColor, enemy.type === 'drone'
    ? 'repulsorLanding'
    : (enemy.variant === 'artillery' ? 'thunderLanding' : 'blast'));
};

MarvelMinigameRuntime.prototype.updateProjectiles = function (dt, now) {
  this.projectiles = this.projectiles.filter(function (projectile) {
    projectile.age += dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (projectile.team === 'player') {
      var i;
      for (i = 0; i < this.enemies.length; i += 1) {
        if (!this.enemies[i].active || this.enemies[i].isDead) {
          continue;
        }

        if (projectile.hits.indexOf(this.enemies[i]) !== -1) {
          continue;
        }

        if (utils.rectsIntersect(projectile, this.enemies[i])) {
          this.applyDamageToEnemy(
            this.enemies[i],
            projectile.damage,
            now,
            projectile.color,
            projectile.x + projectile.width / 2,
            projectile.y + projectile.height / 2
          );
          this.triggerHeroHitEffect(this.enemies[i], projectile.hitEffect, projectile.color, now);
          projectile.hits.push(this.enemies[i]);
          if (projectile.pierce > 0) {
            projectile.pierce -= 1;
          } else {
            return false;
          }
        }
      }
    } else if (projectile.team === 'enemy') {
      if (utils.rectsIntersect(projectile, this.getPlayerRect())) {
        this.applyDamageToPlayer(projectile.damage, now, projectile.x + projectile.width / 2, projectile.y + projectile.height / 2, 'projectile');
        return false;
      }
    }

    if (projectile.age >= projectile.lifetime) {
      return false;
    }

    return projectile.x + projectile.width > -this.cameraX - 160 * this.scale
      && projectile.x < this.level.worldWidth + 160 * this.scale
      && projectile.y < this.height + 120 * this.scale;
  }, this);
};

MarvelMinigameRuntime.prototype.updateEffects = function (dt) {
  this.effects = this.effects.filter(function (effect) {
    effect.age += dt;
    return effect.age < effect.duration;
  });
};

MarvelMinigameRuntime.prototype.updateCamera = function (dt) {
  var targetX = utils.clamp(this.player.x + this.player.width / 2 - this.width * 0.38, 0, this.level.worldWidth - this.width);
  this.cameraX = utils.lerp(this.cameraX, targetX, Math.min(1, dt * 8));
};

MarvelMinigameRuntime.prototype.checkVictory = function (now) {
  var remaining = this.enemies.filter(function (enemy) {
    return enemy.active && !enemy.isDead;
  }).length;
  var bossAlive = !!this.getAliveBoss();
  var lockEffectX;

  if (remaining > 0) {
    this.transitionMessage = bossAlive
      ? '击败战争领主完成任务'
      : '清空哨兵后解锁撤离';
    return;
  }

  if (this.bossArenaLockActive) {
    lockEffectX = this.bossArenaLockX;
    this.bossArenaLockActive = false;
    this.pushAnnouncement('战区开放', '泰坦闸门已解除，完成最后目标。', SUCCESS, 1.7);
    this.pushEffect(lockEffectX, this.level.floorY - 92 * this.scale, SUCCESS, 'impact', {
      staticY: true
    });
    this.startShake(2.6, 120);
  }

  if (!this.level.exit) {
    this.transitionMessage = '首领已倒下';
    this.recordLevelClear(this.getLevelAssessment(true).rank);
    this.state = 'victory';
    this.levelResultTime = now;
    this.resetTouchState();
    return;
  }

  this.transitionMessage = '撤离点已开启';

  if (utils.rectsIntersect(this.getPlayerRect(), this.level.exit)) {
    this.recordLevelClear(this.getLevelAssessment(true).rank);
    this.state = 'victory';
    this.levelResultTime = now;
    this.resetTouchState();
  }
};

MarvelMinigameRuntime.prototype.getObjectiveCue = function () {
  var player = this.player;
  var boss = this.getAliveBoss();
  var now = Date.now();
  var nearestEnemy = null;
  var nearestEnemyDist = Infinity;
  var encounterEnemy = null;
  var encounterEnemyDist = Infinity;
  var preferredSwitch = null;
  var preferredSwitchDist = Infinity;
  var activeLinkedMap = {};
  var activeEncounterId = '';
  var playerCenterX;

  if (this.state !== 'playing' || !player || player.isDead) {
    return null;
  }

  playerCenterX = player.x + player.width / 2;

  this.hazards.forEach(function (hazard) {
    if (!hazard.linkId || !hazard.active || Date.now() < (hazard.suppressedUntil || 0)) {
      return;
    }
    activeLinkedMap[hazard.linkId] = true;
  });

  this.hazards.forEach(function (hazard) {
    var dist;
    if (hazard.type !== 'switch' || !hazard.linkId || !activeLinkedMap[hazard.linkId]) {
      return;
    }
    dist = Math.abs((hazard.x + hazard.width / 2) - playerCenterX);
    if (dist < preferredSwitchDist) {
      preferredSwitch = hazard;
      preferredSwitchDist = dist;
    }
  });

  if (boss) {
    var punishable = now < (boss.weakenedUntil || 0) || now < (boss.recoveryUntil || 0);
    return {
      label: punishable ? '反打' : '首领',
      targetX: boss.x + boss.width / 2,
      targetY: boss.y - 22 * this.scale,
      color: punishable ? SUCCESS : WARNING
    };
  }

  Object.keys(this.encounterStates || {}).some(function (encounterId) {
    var state = this.encounterStates[encounterId];
    if (state && state.engaged && !state.cleared) {
      activeEncounterId = encounterId;
      return true;
    }
    return false;
  }, this);

  if (preferredSwitch) {
    return {
      label: '开关',
      targetX: preferredSwitch.x + preferredSwitch.width / 2,
      targetY: preferredSwitch.y - 18 * this.scale,
      color: SUCCESS
    };
  }

  this.enemies.forEach(function (enemy) {
    var dist;
    if (!enemy.active || enemy.isDead) {
      return;
    }
    dist = Math.abs((enemy.x + enemy.width / 2) - playerCenterX);
    if (activeEncounterId && enemy.encounterId === activeEncounterId && dist < encounterEnemyDist) {
      encounterEnemy = enemy;
      encounterEnemyDist = dist;
    }
    if (dist < nearestEnemyDist) {
      nearestEnemy = enemy;
      nearestEnemyDist = dist;
    }
  });

  if (encounterEnemy) {
    return {
      label: '清场',
      targetX: encounterEnemy.x + encounterEnemy.width / 2,
      targetY: encounterEnemy.y - 18 * this.scale,
      color: WARNING
    };
  }

  if (nearestEnemy) {
    return {
      label: '目标',
      targetX: nearestEnemy.x + nearestEnemy.width / 2,
      targetY: nearestEnemy.y - 18 * this.scale,
      color: DANGER
    };
  }

  if (this.level.exit) {
    return {
      label: '撤离',
      targetX: this.level.exit.x + this.level.exit.width / 2,
      targetY: this.level.exit.y - 18 * this.scale,
      color: ACCENT
    };
  }

  return null;
};

MarvelMinigameRuntime.prototype.drawObjectiveCue = function (ctx) {
  var cue = this.getObjectiveCue();
  var screenX;
  var screenY;
  var edgeX;
  var visible;

  if (!cue) {
    return;
  }

  screenX = cue.targetX - this.cameraX;
  screenY = cue.targetY;
  visible = screenX > 42 * this.scale && screenX < this.width - 42 * this.scale;

  ctx.save();
  if (visible) {
    utils.fillRoundRect(ctx, screenX - 34 * this.scale, screenY - 24 * this.scale, 68 * this.scale, 22 * this.scale, 999, 'rgba(10, 15, 32, 0.74)');
    utils.strokeRoundRect(ctx, screenX - 34 * this.scale, screenY - 24 * this.scale, 68 * this.scale, 22 * this.scale, 999, cue.color, 2);
    utils.setTextStyle(ctx, 10 * this.scale, 'bold', cue.color, 'center', 'middle');
    ctx.fillText(cue.label, screenX, screenY - 13 * this.scale);
    ctx.strokeStyle = cue.color;
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 2 * this.scale);
    ctx.lineTo(screenX, screenY + 12 * this.scale);
    ctx.stroke();
  } else {
    edgeX = screenX <= 42 * this.scale ? 24 * this.scale : this.width - 24 * this.scale;
    utils.fillRoundRect(ctx, edgeX - 30 * this.scale, 126 * this.scale, 60 * this.scale, 20 * this.scale, 999, 'rgba(10, 15, 32, 0.74)');
    utils.setTextStyle(ctx, 10 * this.scale, 'bold', cue.color, 'center', 'middle');
    ctx.fillText(cue.label, edgeX, 136 * this.scale);
    ctx.fillStyle = cue.color;
    ctx.beginPath();
    if (screenX <= 42 * this.scale) {
      ctx.moveTo(edgeX - 16 * this.scale, 168 * this.scale);
      ctx.lineTo(edgeX + 6 * this.scale, 158 * this.scale);
      ctx.lineTo(edgeX + 6 * this.scale, 178 * this.scale);
    } else {
      ctx.moveTo(edgeX + 16 * this.scale, 168 * this.scale);
      ctx.lineTo(edgeX - 6 * this.scale, 158 * this.scale);
      ctx.lineTo(edgeX - 6 * this.scale, 178 * this.scale);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

MarvelMinigameRuntime.prototype.damageEnemiesInBeam = function (now) {
  var player = this.player;
  var beamRect = {
    x: player.facing > 0 ? player.x + player.width : player.x - player.beamLength,
    y: player.y + player.height * 0.1,
    width: player.beamLength,
    height: player.beamWidth
  };

  this.enemies.forEach(function (enemy) {
    if (enemy.active && !enemy.isDead && utils.rectsIntersect(beamRect, enemy)) {
      this.applyDamageToEnemy(
        enemy,
        8,
        now,
        this.hero.glowStyle,
        player.x + player.width / 2,
        player.y + player.height * 0.3
      );
      this.triggerHeroHitEffect(enemy, 'repulsorHit', this.hero.glowStyle, now);
    }
  }, this);
};

MarvelMinigameRuntime.prototype.applyDamageToEnemy = function (enemy, damage, now, color, sourceX, sourceY) {
  var enemyCenterX;
  var knockDirection;
  var resolvedDamage = damage;

  if (!enemy.active || enemy.isDead || now < enemy.invulnerableUntil) {
    return;
  }

  if (enemy.type === 'boss' && now < enemy.weakenedUntil) {
    resolvedDamage = Math.round(damage * 1.35);
  }

  enemy.health -= resolvedDamage;
  enemy.health = Math.max(0, enemy.health);
  enemy.invulnerableUntil = now + 160;
  enemy.hurtUntil = now + 180;
  this.setPose(enemy, enemy.health <= 0 ? 'dead' : 'hurt', enemy.health <= 0 ? 700 : 180);
  this.pushFloatingText('-' + resolvedDamage, enemy.x + enemy.width / 2, enemy.y - 8 * this.scale, color || WARNING);
  this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.42, color || WARNING, 'impact');
  enemyCenterX = enemy.x + enemy.width / 2;
  enemy.hurtSourceX = typeof sourceX === 'number' ? sourceX : enemyCenterX;

  if (enemy.type === 'boss' && now < enemy.weakenedUntil && now >= (enemy.weakHitAudioAt || 0)) {
    enemy.weakHitAudioAt = now + 110;
    this.audio.playSfx('bossWeakHit');
  }

  if (typeof sourceX === 'number') {
    knockDirection = enemyCenterX >= sourceX ? 1 : -1;
    enemy.vx = knockDirection * (enemy.type === 'boss' ? 180 : 260) * this.scale;
    enemy.vy = -220 * this.scale;
    enemy.controlLockedUntil = now + (enemy.type === 'boss' ? 120 : 180);
  }

  if (enemy.health <= 0) {
    var encounterState;
    enemy.isDead = true;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.deathStartedAt = now;
    enemy.deathUntil = now + 620;
    this.audio.playSfx('explosion');
    this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, color || SUCCESS, 'explode');
    this.startShake(enemy.type === 'boss' ? 4.5 : 2.4, enemy.type === 'boss' ? 180 : 90);

    if (enemy.encounterId) {
      encounterState = this.encounterStates[enemy.encounterId];
      if (encounterState && !encounterState.cleared) {
        encounterState.defeated += 1;
        if (encounterState.defeated >= encounterState.total) {
          this.completeEncounter(enemy.encounterId, now);
        }
      }
    }
  }
};

MarvelMinigameRuntime.prototype.applyDamageToPlayer = function (damage, now, sourceX, sourceY, reason) {
  var player = this.player;
  var playerCenterX;
  var knockDirection;
  var shakeIntensity = 3.2;
  var shakeDuration = 120;

  if (!player || player.isDead || now < player.invulnerableUntil) {
    return;
  }

  player.health -= damage;
  if (this.levelStats) {
    this.levelStats.damageTaken += damage;
  }
  player.invulnerableUntil = now + 1000;
  player.hurtUntil = now + 220;
  this.setPose(player, player.health <= 0 ? 'dead' : 'hurt', player.health <= 0 ? 900 : 220);
  this.audio.playSfx('damage');
  this.pushFloatingText('-' + damage, player.x + player.width / 2, player.y - 12 * this.scale, DANGER);
  playerCenterX = player.x + player.width / 2;
  player.hurtSourceX = typeof sourceX === 'number' ? sourceX : playerCenterX;

  if (typeof sourceX === 'number') {
    knockDirection = playerCenterX >= sourceX ? 1 : -1;
    player.vx = knockDirection * 320 * this.scale;
    player.vy = -300 * this.scale;
    player.controlLockedUntil = now + 180;
  }

  if (reason === 'hazard') {
    shakeIntensity = 2.8;
  } else if (reason === 'finisher') {
    shakeIntensity = 6.2;
    shakeDuration = 180;
    this.pushEffect(player.x + player.width / 2, player.y + player.height * 0.5, DANGER, 'finisherImpact');
    this.audio.playSfx('explosion');
  } else if (reason === 'fall') {
    shakeIntensity = 4.5;
    shakeDuration = 160;
    player.lastFallImpactAt = now;
  }
  this.startShake(shakeIntensity, shakeDuration);

  if (player.health <= 0) {
    player.health = 0;
    if (this.levelStats) {
      this.levelStats.deaths += 1;
    }
    player.isDead = true;
    player.vx = 0;
    player.vy = 0;
    player.deathStartedAt = now;
    player.deathUntil = now + 700;
    this.audio.playSfx('death');
    this.startShake(5.5, 190);
    this.state = 'over';
    this.levelResultTime = now;
    this.resetTouchState();
  }
};

MarvelMinigameRuntime.prototype.pushEffect = function (x, y, color, type, extras) {
  this.effects.push(Object.assign({
    type: type,
    x: x,
    y: y,
    color: color,
    age: 0,
    duration: type === 'ultimate'
      ? 0.55
      : (type === 'finisher'
        ? 0.42
        : (type === 'landing' || type === 'repulsorLanding' || type === 'thunderLanding' || type === 'gammaLanding'
          ? 0.42
          : 0.35))
  }, extras || {}));
};

MarvelMinigameRuntime.prototype.pushFloatingText = function (label, x, y, color) {
  this.effects.push({
    type: 'text',
    label: label,
    x: x,
    y: y,
    color: color,
    age: 0,
    duration: 0.75
  });
};

MarvelMinigameRuntime.prototype.render = function () {
  var ctx = this.ctx;
  ctx.clearRect(0, 0, this.width, this.height);

  if (this.state === 'title') {
    this.renderTitle(ctx);
    this.drawBannerOverlay(ctx);
    return;
  }

  if (this.state === 'archive') {
    this.renderArchiveOverlay(ctx);
    this.drawBannerOverlay(ctx);
    return;
  }

  if (this.state === 'select') {
    this.renderCharacterSelect(ctx);
    this.drawBannerOverlay(ctx);
    return;
  }

  if (this.state === 'transition') {
    this.renderTransitionOverlay(ctx);
    this.drawBannerOverlay(ctx);
    return;
  }

  this.renderGameplay(ctx);

  if (this.state === 'paused' || this.state === 'paused-system') {
    this.renderPauseOverlay(ctx);
    this.drawBannerOverlay(ctx);
    return;
  }

  if (this.state === 'over') {
    this.renderResultOverlay(ctx, false);
    this.drawBannerOverlay(ctx);
    return;
  }

  if (this.state === 'victory') {
    this.renderResultOverlay(ctx, true);
  }

  this.drawBannerOverlay(ctx);
};

MarvelMinigameRuntime.prototype.renderTransitionOverlay = function (ctx) {
  var level = this.transitionLevel || this.level;
  var elapsed = Date.now() - this.transitionStartedAt;
  var progress = this.transitionDuration > 0 ? utils.clamp(elapsed / this.transitionDuration, 0, 1) : 1;
  var fade = progress < 0.2 ? progress / 0.2 : (progress > 0.82 ? (1 - progress) / 0.18 : 1);
  var panelWidth = Math.min(540 * this.scale, this.width - 88 * this.scale);
  var panelHeight = 236 * this.scale;
  var panelX = this.width / 2 - panelWidth / 2;
  var panelY = this.height / 2 - panelHeight / 2;
  var portrait = this.hero ? this.assets.get(this.getHeroPortraitKey(this.hero.key)) : null;
  var backgroundIndex = this.transitionLevelIndex >= 0 ? this.transitionLevelIndex : this.levelIndex;
  var barWidth = panelWidth - 72 * this.scale;

  this.drawBackdrop(ctx, level, backgroundIndex);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.globalAlpha = utils.clamp(fade, 0, 1);

  utils.drawPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
    fillStyle: 'rgba(8, 13, 28, 0.9)',
    strokeStyle: this.hero ? this.hero.glowStyle : ACCENT,
    radius: 26
  });

  utils.setTextStyle(ctx, 14 * this.scale, 'bold', ACCENT, 'center', 'middle');
  ctx.fillText(this.transitionReason === 'advance' ? '章节切换' : '任务部署', this.width / 2, panelY + 30 * this.scale);
  utils.setTextStyle(ctx, 30 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(level.chapterLabel, this.width / 2, panelY + 74 * this.scale);
  utils.setTextStyle(ctx, 18 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(level.name, this.width / 2, panelY + 104 * this.scale);
  utils.setTextStyle(ctx, 13 * this.scale, null, '#d8deef', 'center', 'middle');
  ctx.fillText(level.objective || this.transitionHint, this.width / 2, panelY + 132 * this.scale);

  if (portrait) {
    this.drawImageFit(ctx, portrait, panelX + 26 * this.scale, panelY + 28 * this.scale, 82 * this.scale, 82 * this.scale, 0.92);
  }

  utils.fillRoundRect(ctx, panelX + 36 * this.scale, panelY + panelHeight - 40 * this.scale, barWidth, 12 * this.scale, 999, 'rgba(255,255,255,0.14)');
  utils.fillRoundRect(ctx, panelX + 36 * this.scale, panelY + panelHeight - 40 * this.scale, barWidth * progress, 12 * this.scale, 999, this.hero ? this.hero.glowStyle : ACCENT);
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(progress < 0.96 ? '正在部署…' : '任务就绪', this.width / 2, panelY + panelHeight - 18 * this.scale);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderTitle = function (ctx) {
  var panel = this.getTitlePanelRect();
  var buttonRect = this.getTitleButtonRect();
  var archiveRect = this.getTitleArchiveRect();
  var progress = this.getCampaignProgressSummary();
  var operationStatus = this.getOperationStatusSummary();
  var lastHero = HEROES[this.heroIndex];
  var selectedCampaign = this.getSelectableCampaign();
  var selectedLevel = selectedCampaign[this.selectedLevelIndex];

  this.drawBackdrop(ctx);
  utils.drawPanel(ctx, panel.x, panel.y, panel.width, panel.height);

  ctx.save();
  utils.setTextStyle(ctx, 26 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(gameMeta.title, this.width / 2, this.height * 0.28);
  utils.setTextStyle(ctx, 14 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText('触控英雄横版动作闯关', this.width / 2, this.height * 0.34);
  utils.setTextStyle(ctx, 16 * this.scale, null, '#d8deef', 'center', 'middle');
  ctx.fillText('选择英雄，移动、跳跃、战斗，闯过三章战役。', this.width / 2, this.height * 0.42);
  utils.setTextStyle(ctx, 13 * this.scale, 'bold', ACCENT, 'center', 'middle');
  ctx.fillText(
    '战役进度 ' + progress.clearedCount + '/' + progress.totalLevels + ' · 全局最佳 ' + progress.bestRank,
    this.width / 2,
    this.height * 0.49
  );
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(
    '上次选择 ' + lastHero.name + ' · ' + selectedLevel.chapterLabel,
    this.width / 2,
    this.height * 0.54
  );
  utils.setTextStyle(ctx, 12 * this.scale, 'bold', WARNING, 'center', 'middle');
  ctx.fillText(operationStatus.label, this.width / 2, this.height * 0.59);
  utils.setTextStyle(ctx, 11 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(operationStatus.detail, this.width / 2, this.height * 0.63);
  utils.drawButton(ctx, archiveRect, '战役档案', {
    fillStyle: 'rgba(255,255,255,0.08)',
    strokeStyle: 'rgba(255,255,255,0.18)',
    fontSize: 12 * this.scale,
    radius: 999
  });
  utils.drawButton(ctx, buttonRect, '开始任务', {
    fillStyle: 'rgba(200, 57, 61, 0.92)',
    strokeStyle: 'rgba(255, 244, 228, 0.26)',
    fontSize: 20 * this.scale
  });
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderArchiveOverlay = function (ctx) {
  var panel = this.getArchivePanelRect();
  var closeRect = this.getArchiveCloseRect();
  var tabRects = this.getArchiveHeroTabRects();
  var campaign = this.getSelectableCampaign();
  var globalProgress = this.getCampaignProgressSummary();
  var hero = HEROES[this.archiveHeroIndex];
  var heroSummary = this.getHeroProgressSummary(hero.key);
  var globalHeroClearCount = 0;
  var summaryY = panel.y + 74 * this.scale;
  var summaryGap = 10 * this.scale;
  var summaryHeight = 44 * this.scale;
  var summaryWidth = (panel.width - 48 * this.scale - summaryGap * 2) / 3;
  var rowY = tabRects[0].y + tabRects[0].height + 12 * this.scale;
  var rowGap = 8 * this.scale;
  var rowHeight = Math.min(
    58 * this.scale,
    (panel.y + panel.height - 18 * this.scale - rowY - rowGap * (campaign.length - 1)) / campaign.length
  );
  var i;

  HEROES.forEach(function (entry) {
    var summary = this.getHeroProgressSummary(entry.key);
    if (summary.clearedCount >= summary.totalLevels) {
      globalHeroClearCount += 1;
    }
  }, this);

  this.drawBackdrop(ctx);
  utils.drawPanel(ctx, panel.x, panel.y, panel.width, panel.height, {
    fillStyle: 'rgba(8, 13, 28, 0.94)',
    strokeStyle: 'rgba(255,255,255,0.16)',
    radius: 24
  });

  ctx.save();
  utils.setTextStyle(ctx, 26 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText('战役档案', this.width / 2, panel.y + 40 * this.scale);
  utils.setTextStyle(ctx, 11 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText('查看各英雄章节评级与最佳时间。', this.width / 2, panel.y + 62 * this.scale);

  this.drawSummaryChip(ctx, panel.x + 24 * this.scale, summaryY, summaryWidth, summaryHeight, '全局进度', globalProgress.clearedCount + '/' + globalProgress.totalLevels);
  this.drawSummaryChip(ctx, panel.x + 24 * this.scale + summaryWidth + summaryGap, summaryY, summaryWidth, summaryHeight, hero.name + '进度', heroSummary.clearedCount + '/' + heroSummary.totalLevels);
  this.drawSummaryChip(ctx, panel.x + 24 * this.scale + (summaryWidth + summaryGap) * 2, summaryY, summaryWidth, summaryHeight, '英雄通关', globalHeroClearCount + '/' + HEROES.length);

  for (i = 0; i < HEROES.length; i += 1) {
    utils.drawButton(ctx, tabRects[i], HEROES[i].name, {
      fillStyle: i === this.archiveHeroIndex ? 'rgba(59, 117, 255, 0.88)' : 'rgba(255,255,255,0.08)',
      strokeStyle: i === this.archiveHeroIndex ? HEROES[i].glowStyle : 'rgba(255,255,255,0.12)',
      fontSize: 12 * this.scale,
      radius: 999
    });
  }

  for (i = 0; i < campaign.length; i += 1) {
    this.drawArchiveStageRow(ctx, hero, campaign[i], {
      x: panel.x + 24 * this.scale,
      y: rowY + i * (rowHeight + rowGap),
      width: panel.width - 48 * this.scale,
      height: rowHeight
    }, i <= this.getUnlockedLevelMaxIndex());
  }

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(closeRect.x + closeRect.width / 2, closeRect.y + closeRect.height / 2, closeRect.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(closeRect.x + closeRect.width / 2, closeRect.y + closeRect.height / 2, closeRect.width / 2, 0, Math.PI * 2);
  ctx.stroke();
  utils.setTextStyle(ctx, 24 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText('×', closeRect.x + closeRect.width / 2, closeRect.y + closeRect.height / 2 + 1 * this.scale);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawArchiveStageRow = function (ctx, hero, level, rect, unlocked) {
  var record = this.getHeroLevelRecord(hero.key, level.id);
  var globalRecord = this.getGlobalLevelRecord(level.id);
  var stateLabel = !unlocked
    ? '未解锁'
    : (record ? (record.rank + ' · ' + record.bestTime.toFixed(1) + '秒') : '未挑战');
  var detailLabel = globalRecord.rank !== '--' && globalRecord.bestTime !== null
    ? ('全局 ' + globalRecord.rank + ' · ' + globalRecord.bestTime.toFixed(1) + '秒')
    : '全局暂无记录';
  var topLineY = rect.y + rect.height * 0.3;
  var bottomLineY = rect.y + rect.height * 0.72;
  var chapterSize = Math.min(12 * this.scale, rect.height * 0.22);
  var titleSize = Math.min(15 * this.scale, rect.height * 0.28);
  var stateSize = Math.min(13 * this.scale, rect.height * 0.22);
  var detailSize = Math.min(10.5 * this.scale, rect.height * 0.18);

  utils.drawPanel(ctx, rect.x, rect.y, rect.width, rect.height, {
    fillStyle: unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
    strokeStyle: unlocked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
    radius: 18
  });

  ctx.save();
  utils.setTextStyle(ctx, chapterSize, 'bold', unlocked ? ACCENT : SOFT_INK, 'left', 'middle');
  ctx.fillText(level.chapterLabel, rect.x + 16 * this.scale, topLineY);
  utils.setTextStyle(ctx, titleSize, 'bold', unlocked ? INK : SOFT_INK, 'left', 'middle');
  ctx.fillText(level.name, rect.x + 16 * this.scale, bottomLineY);
  utils.setTextStyle(ctx, stateSize, 'bold', unlocked ? hero.glowStyle : SOFT_INK, 'right', 'middle');
  ctx.fillText(stateLabel, rect.x + rect.width - 16 * this.scale, topLineY);
  utils.setTextStyle(ctx, detailSize, null, SOFT_INK, 'right', 'middle');
  ctx.fillText(unlocked ? detailLabel : '完成前序章节后解锁', rect.x + rect.width - 16 * this.scale, bottomLineY);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderCharacterSelect = function (ctx) {
  var rects = this.getHeroCardRects();
  var stageRects = this.getStageChipRects();
  var campaign = this.getSelectableCampaign();
  var unlockedMax = this.getUnlockedLevelMaxIndex();
  var startRect = this.getSelectStartRect();
  var i;

  this.drawBackdrop(ctx);

  ctx.save();
  utils.setTextStyle(ctx, 24 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText('选择英雄', this.width / 2, 58 * this.scale);
  utils.setTextStyle(ctx, 13 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText('选择英雄与已解锁章节，然后立即出发。', this.width / 2, 84 * this.scale);

  for (i = 0; i < HEROES.length; i += 1) {
    this.drawHeroCard(ctx, HEROES[i], rects[i], i === this.heroIndex);
  }

  for (i = 0; i < campaign.length; i += 1) {
    this.drawStageChip(ctx, campaign[i], stageRects[i], i === this.selectedLevelIndex, i <= unlockedMax);
  }

  utils.drawButton(ctx, startRect, '开始 ' + campaign[this.selectedLevelIndex].chapterLabel, {
    fillStyle: 'rgba(62, 116, 255, 0.9)',
    strokeStyle: 'rgba(255, 255, 255, 0.18)',
    fontSize: 16 * this.scale
  });
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderGameplay = function (ctx) {
  var shake = this.getShakeOffset();
  this.drawBackdrop(ctx);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  this.drawWorld(ctx);
  this.drawObjectiveCue(ctx);
  ctx.restore();
  this.drawHud(ctx);

  if (this.state === 'playing') {
    this.drawControls(ctx);
  }
};

MarvelMinigameRuntime.prototype.drawBackdrop = function (ctx, level, levelIndex) {
  var topColor = TITLE_BG_TOP;
  var bottomColor = TITLE_BG_BOTTOM;
  var activeLevel = level || this.level;

  if (activeLevel && this.state !== 'title' && this.state !== 'select') {
    topColor = activeLevel.backgroundTop || topColor;
    bottomColor = activeLevel.backgroundBottom || bottomColor;
  }

  var gradient = ctx.createLinearGradient(0, 0, 0, this.height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, this.width, this.height);

  var backgroundImage = this.assets.get(this.getBackgroundImageKey(levelIndex));
  if (backgroundImage) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(backgroundImage, 0, 0, this.width, this.height);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(this.width * 0.78, this.height * 0.18, 120 * this.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(this.width * 0.2, this.height * 0.82, 140 * this.scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(8, 11, 21, 0.38)';
  ctx.fillRect(0, this.height * 0.56, this.width, this.height * 0.44);
  ctx.fillStyle = 'rgba(19, 25, 43, 0.7)';
  var x = 0;
  while (x < this.width + 80) {
    ctx.fillRect(x, this.height * 0.45 + ((x / 90) % 2) * 22 * this.scale, 52 * this.scale, this.height * 0.3);
    x += 74 * this.scale;
  }
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawHeroCard = function (ctx, hero, rect, selected) {
  var iconY = rect.y + 48 * this.scale;
  var portrait = this.assets.get(this.getHeroPortraitKey(hero.key));
  var progress = this.getHeroProgressSummary(hero.key);
  var hint = this.getHeroSelectHint(hero);
  utils.drawPanel(ctx, rect.x, rect.y, rect.width, rect.height, {
    fillStyle: selected ? 'rgba(14, 22, 48, 0.94)' : 'rgba(10, 15, 32, 0.78)',
    strokeStyle: selected ? hero.glowStyle : PANEL_STROKE,
    radius: 22
  });
  if (!this.drawImageFit(ctx, portrait, rect.x + rect.width / 2 - 38 * this.scale, rect.y + 10 * this.scale, 76 * this.scale, 76 * this.scale, 0.96)) {
    this.drawHeroIcon(ctx, hero, rect.x + rect.width / 2, iconY, 1.15);
  }

  ctx.save();
  utils.setTextStyle(ctx, 15 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(hero.name, rect.x + rect.width / 2, rect.y + 96 * this.scale);
  utils.setTextStyle(ctx, 10 * this.scale, null, hero.glowStyle, 'center', 'middle');
  ctx.fillText(hero.title, rect.x + rect.width / 2, rect.y + 114 * this.scale);
  utils.fillRoundRect(
    ctx,
    rect.x + 14 * this.scale,
    rect.y + rect.height - 28 * this.scale,
    rect.width - 28 * this.scale,
    18 * this.scale,
    999,
    'rgba(255,255,255,0.06)'
  );
  utils.setTextStyle(ctx, 10 * this.scale, 'bold', hero.glowStyle, 'center', 'middle');
  ctx.fillText(hint, rect.x + rect.width / 2, rect.y + rect.height - 19 * this.scale);
  if (progress.clearedCount >= progress.totalLevels) {
    utils.fillRoundRect(ctx, rect.x + rect.width - 64 * this.scale, rect.y + 12 * this.scale, 44 * this.scale, 18 * this.scale, 999, 'rgba(108, 225, 140, 0.18)');
    utils.setTextStyle(ctx, 10 * this.scale, 'bold', SUCCESS, 'center', 'middle');
    ctx.fillText('通关', rect.x + rect.width - 42 * this.scale, rect.y + 21 * this.scale);
  }
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawStageChip = function (ctx, level, rect, selected, unlocked) {
  var record = this.getHeroLevelRecord(HEROES[this.heroIndex].key, level.id);
  var fillStyle = selected ? 'rgba(14, 22, 48, 0.94)' : 'rgba(10, 15, 32, 0.72)';
  var strokeStyle = unlocked ? (selected ? ACCENT : 'rgba(255,255,255,0.14)') : 'rgba(255,255,255,0.08)';
  var topLineY = rect.y + 14 * this.scale;
  var bottomLineY = rect.y + rect.height - 14 * this.scale;
  var stateLabel = '未开';

  utils.drawPanel(ctx, rect.x, rect.y, rect.width, rect.height, {
    fillStyle: unlocked ? fillStyle : 'rgba(10, 15, 32, 0.42)',
    strokeStyle: strokeStyle,
    radius: 16
  });

  if (unlocked) {
    stateLabel = record ? record.rank : '未战';
  }

  ctx.save();
  utils.setTextStyle(ctx, 10 * this.scale, 'bold', unlocked ? ACCENT : SOFT_INK, 'left', 'middle');
  ctx.fillText(level.chapterLabel, rect.x + 12 * this.scale, topLineY);
  utils.setTextStyle(ctx, 10 * this.scale, null, unlocked ? INK : SOFT_INK, 'left', 'middle');
  ctx.fillText(level.name, rect.x + 12 * this.scale, bottomLineY);
  utils.setTextStyle(ctx, 10 * this.scale, 'bold', unlocked ? ACCENT : SOFT_INK, 'right', 'middle');
  ctx.fillText(stateLabel, rect.x + rect.width - 12 * this.scale, rect.y + rect.height / 2);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawSetPiece = function (ctx, piece) {
  var x = piece.x;
  var y = piece.y;
  var width = piece.width;
  var height = piece.height;
  var centerX = x + width / 2;

  ctx.save();
  ctx.globalAlpha = piece.layer === 'front' ? 0.96 : 0.72;

  if (piece.type === 'wreck') {
    utils.fillRoundRect(ctx, x, y + height * 0.34, width, height * 0.66, 16 * this.scale, 'rgba(92, 99, 118, 0.72)');
    utils.strokeRoundRect(ctx, x, y + height * 0.34, width, height * 0.66, 16 * this.scale, 'rgba(247,247,251,0.14)', 2);
    ctx.strokeStyle = DANGER;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.12, y + height * 0.72);
    ctx.lineTo(x + width * 0.34, y + height * 0.2);
    ctx.lineTo(x + width * 0.54, y + height * 0.74);
    ctx.lineTo(x + width * 0.8, y + height * 0.32);
    ctx.stroke();
  } else if (piece.type === 'reactor') {
    utils.fillRoundRect(ctx, x + width * 0.18, y + height * 0.32, width * 0.64, height * 0.68, 18 * this.scale, 'rgba(24, 33, 63, 0.8)');
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(centerX, y + height * 0.46, width * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    this.drawImageFit(ctx, this.assets.get('powerStone'), centerX - width * 0.18, y + height * 0.28, width * 0.36, width * 0.36, 0.88);
  } else if (piece.type === 'beacon') {
    utils.fillRoundRect(ctx, centerX - width * 0.18, y + height * 0.24, width * 0.36, height * 0.76, 12 * this.scale, 'rgba(88, 96, 120, 0.72)');
    utils.fillRoundRect(ctx, centerX - width * 0.34, y + height * 0.06, width * 0.68, height * 0.18, 999, 'rgba(123, 199, 255, 0.22)');
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(centerX, y + height * 0.16, width * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (piece.type === 'spawnPad') {
    utils.fillRoundRect(ctx, x, y + height * 0.26, width, height * 0.74, 16 * this.scale, 'rgba(75, 86, 122, 0.72)');
    utils.strokeRoundRect(ctx, x, y + height * 0.26, width, height * 0.74, 16 * this.scale, 'rgba(255,255,255,0.14)', 2);
    utils.fillRoundRect(ctx, x + width * 0.08, y + height * 0.06, width * 0.84, height * 0.22, 999, 'rgba(123, 199, 255, 0.22)');
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.18, y + height * 0.48);
    ctx.lineTo(x + width * 0.82, y + height * 0.48);
    ctx.stroke();
    utils.setTextStyle(ctx, 10 * this.scale, 'bold', ACCENT, 'center', 'middle');
    ctx.fillText('投放', centerX, y - 10 * this.scale);
  } else if (piece.type === 'cannon') {
    utils.fillRoundRect(ctx, x, y + height * 0.42, width, height * 0.58, 14 * this.scale, 'rgba(94, 106, 136, 0.76)');
    utils.fillRoundRect(ctx, x + width * 0.34, y + height * 0.08, width * 0.44, height * 0.36, 14 * this.scale, 'rgba(132, 150, 182, 0.74)');
    this.drawImageFit(ctx, this.assets.get('repulsorBlast'), x + width * 0.58, y + height * 0.02, width * 0.22, width * 0.22, 0.72);
  } else if (piece.type === 'crate') {
    utils.fillRoundRect(ctx, x, y, width, height, 12 * this.scale, 'rgba(88, 98, 126, 0.68)');
    utils.strokeRoundRect(ctx, x, y, width, height, 12 * this.scale, 'rgba(255,255,255,0.12)', 2);
    ctx.strokeStyle = SOFT_INK;
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.18, y + height * 0.22);
    ctx.lineTo(x + width * 0.82, y + height * 0.78);
    ctx.moveTo(x + width * 0.82, y + height * 0.22);
    ctx.lineTo(x + width * 0.18, y + height * 0.78);
    ctx.stroke();
  } else if (piece.type === 'pillar') {
    utils.fillRoundRect(ctx, x, y, width, height, 12 * this.scale, 'rgba(96, 88, 114, 0.72)');
    utils.strokeRoundRect(ctx, x, y, width, height, 12 * this.scale, 'rgba(255,255,255,0.12)', 2);
    utils.fillRoundRect(ctx, x - width * 0.18, y + height * 0.84, width * 1.36, height * 0.16, 14 * this.scale, 'rgba(66, 58, 83, 0.82)');
  } else if (piece.type === 'core') {
    utils.fillRoundRect(ctx, x + width * 0.22, y, width * 0.56, height, 18 * this.scale, 'rgba(54, 42, 79, 0.82)');
    this.drawImageFit(ctx, this.assets.get('powerStone'), x + width * 0.16, y + height * 0.18, width * 0.68, width * 0.68, 0.92);
    ctx.strokeStyle = WARNING;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(centerX, y + height * 0.34, width * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (piece.type === 'throne') {
    utils.fillRoundRect(ctx, x, y + height * 0.36, width, height * 0.64, 18 * this.scale, 'rgba(92, 66, 120, 0.76)');
    utils.fillRoundRect(ctx, x + width * 0.26, y, width * 0.48, height * 0.52, 18 * this.scale, 'rgba(120, 84, 158, 0.78)');
    utils.fillRoundRect(ctx, x + width * 0.12, y + height * 0.7, width * 0.76, height * 0.12, 12 * this.scale, 'rgba(212, 163, 76, 0.86)');
  }

  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawHeroIcon = function (ctx, hero, x, y, scaleFactor) {
  var size = 42 * this.scale * (scaleFactor || 1);

  ctx.save();
  ctx.translate(x, y);
  utils.fillRoundRect(ctx, -size * 0.38, -size * 0.04, size * 0.76, size * 0.72, size * 0.18, hero.primaryStyle);
  utils.fillRoundRect(ctx, -size * 0.22, -size * 0.62, size * 0.44, size * 0.42, size * 0.22, hero.accentStyle);
  utils.fillRoundRect(ctx, -size * 0.1, -size * 0.04, size * 0.2, size * 0.2, size * 0.08, hero.glowStyle);

  if (hero.key === 'thor') {
    ctx.fillStyle = '#d74545';
    ctx.fillRect(-size * 0.48, -size * 0.08, size * 0.14, size * 0.82);
    ctx.fillStyle = hero.glowStyle;
    ctx.fillRect(size * 0.26, -size * 0.02, size * 0.22, size * 0.1);
  } else if (hero.key === 'hulk') {
    ctx.fillStyle = '#4b2f86';
    ctx.fillRect(-size * 0.38, size * 0.44, size * 0.76, size * 0.18);
  } else {
    ctx.fillStyle = '#f7d352';
    ctx.fillRect(size * 0.18, -size * 0.08, size * 0.24, size * 0.1);
  }

  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawWorld = function (ctx) {
  var cameraX = this.cameraX;
  var i;
  var platform;
  var exit = this.level.exit;
  var exitLocked = this.enemies.some(function (enemy) {
    return enemy.active && !enemy.isDead;
  }) || this.bossArenaLockActive;

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (i = 0; i < this.level.platforms.length; i += 1) {
    platform = this.level.platforms[i];
    ctx.fillStyle = platform.type === 'ground' ? '#4e556a' : '#667089';
    utils.fillRoundRect(ctx, platform.x, platform.y, platform.width, platform.height, 8 * this.scale, ctx.fillStyle);
    utils.strokeRoundRect(ctx, platform.x, platform.y, platform.width, platform.height, 8 * this.scale, 'rgba(255,255,255,0.12)', 2);
  }

  (this.level.setPieces || []).forEach(function (piece) {
    if (piece.layer !== 'front') {
      this.drawSetPiece(ctx, piece);
    }
  }, this);

  this.hazards.forEach(function (hazard) {
    this.drawHazard(ctx, hazard);
  }, this);

  this.checkpoints.forEach(function (checkpoint) {
    this.drawCheckpoint(ctx, checkpoint);
  }, this);

  if (exit) {
    this.drawExtractionExit(ctx, exit, !exitLocked);
  }

  if (this.bossArenaLockActive) {
    this.drawBossArenaLock(ctx);
  }

  this.enemies.forEach(function (enemy) {
    if (!enemy.active && !enemy.isDead) {
      return;
    }
    if (enemy.warningType) {
      this.drawEnemyTelegraph(ctx, enemy);
    }
    if (!enemy.isDead || (enemy.deathUntil && Date.now() < enemy.deathUntil)) {
      this.drawEnemy(ctx, enemy);
    }
  }, this);

  (this.level.setPieces || []).forEach(function (piece) {
    if (piece.layer === 'front') {
      this.drawSetPiece(ctx, piece);
    }
  }, this);

  this.projectiles.forEach(function (projectile) {
    this.drawProjectile(ctx, projectile);
  }, this);

  this.drawPlayer(ctx, this.player);

  this.effects.forEach(function (effect) {
    this.drawEffect(ctx, effect);
  }, this);

  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawCheckpoint = function (ctx, checkpoint) {
  var now = Date.now();
  var pulse = 0.5 + 0.5 * Math.sin(now * 0.006 + checkpoint.x * 0.01);
  var beamHeight = checkpoint.activated ? 132 * this.scale : 118 * this.scale;
  var beamWidth = checkpoint.activated ? 34 * this.scale : 28 * this.scale;
  var beamColor = checkpoint.activated ? SUCCESS : ACCENT;

  ctx.save();
  ctx.globalAlpha = checkpoint.activated ? 0.3 + pulse * 0.2 : 0.18 + pulse * 0.12;
  ctx.fillStyle = beamColor;
  utils.fillRoundRect(
    ctx,
    checkpoint.x - beamWidth / 2,
    checkpoint.y - beamHeight,
    beamWidth,
    beamHeight,
    999,
    beamColor
  );
  ctx.globalAlpha = 1;
  utils.fillRoundRect(
    ctx,
    checkpoint.x - 22 * this.scale,
    checkpoint.y - 18 * this.scale,
    44 * this.scale,
    18 * this.scale,
    999,
    checkpoint.activated ? 'rgba(108, 225, 140, 0.48)' : 'rgba(123, 199, 255, 0.24)'
  );
  utils.strokeRoundRect(
    ctx,
    checkpoint.x - 22 * this.scale,
    checkpoint.y - 18 * this.scale,
    44 * this.scale,
    18 * this.scale,
    999,
    beamColor,
    2
  );
  utils.setTextStyle(ctx, 10 * this.scale, 'bold', beamColor, 'center', 'middle');
  ctx.fillText(checkpoint.activated ? '存档' : '点位', checkpoint.x, checkpoint.y - beamHeight - 10 * this.scale);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawExtractionExit = function (ctx, exit, unlocked) {
  var now = Date.now();
  var pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
  var beamAlpha = unlocked ? 0.18 + pulse * 0.18 : 0;

  ctx.save();
  ctx.fillStyle = unlocked ? 'rgba(108, 225, 140, 0.3)' : 'rgba(120, 140, 160, 0.35)';
  utils.fillRoundRect(ctx, exit.x, exit.y, exit.width, exit.height, 16 * this.scale, ctx.fillStyle);
  utils.strokeRoundRect(
    ctx,
    exit.x,
    exit.y,
    exit.width,
    exit.height,
    16 * this.scale,
    unlocked ? SUCCESS : 'rgba(255,255,255,0.18)',
    unlocked ? 2.6 : 2
  );

  if (unlocked) {
    ctx.globalAlpha = beamAlpha;
    ctx.fillStyle = SUCCESS;
    utils.fillRoundRect(
      ctx,
      exit.x + exit.width / 2 - 20 * this.scale,
      exit.y - 132 * this.scale,
      40 * this.scale,
      132 * this.scale,
      999,
      SUCCESS
    );
    ctx.globalAlpha = 0.24 + pulse * 0.18;
    ctx.strokeStyle = SUCCESS;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(exit.x + exit.width / 2, exit.y + exit.height * 0.48, 28 * this.scale + pulse * 10 * this.scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawBossArenaLock = function (ctx) {
  var now = Date.now();
  var pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
  var beamHeight = 178 * this.scale;
  var x = this.bossArenaLockX;

  ctx.save();
  ctx.globalAlpha = 0.22 + pulse * 0.16;
  ctx.fillStyle = DANGER;
  utils.fillRoundRect(
    ctx,
    x - 12 * this.scale,
    this.level.floorY - beamHeight,
    24 * this.scale,
    beamHeight,
    999,
    DANGER
  );
  ctx.globalAlpha = 1;
  ctx.strokeStyle = WARNING;
  ctx.lineWidth = 3 * this.scale;
  ctx.beginPath();
  ctx.moveTo(x, this.level.floorY - beamHeight);
  ctx.lineTo(x, this.level.floorY);
  ctx.stroke();
  this.drawImageFit(ctx, this.assets.get('lightningBolt'), x - 26 * this.scale, this.level.floorY - beamHeight - 12 * this.scale, 52 * this.scale, beamHeight + 20 * this.scale, 0.72);
  utils.fillRoundRect(ctx, x - 26 * this.scale, this.level.floorY - 16 * this.scale, 52 * this.scale, 16 * this.scale, 999, 'rgba(255, 118, 100, 0.28)');
  utils.setTextStyle(ctx, 10 * this.scale, 'bold', WARNING, 'center', 'middle');
  ctx.fillText('封锁', x, this.level.floorY - beamHeight - 10 * this.scale);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawEnemyTelegraph = function (ctx, enemy) {
  var player = this.player;
  var centerX = enemy.x + enemy.width / 2;
  var centerY = enemy.y + enemy.height / 2;
  var dashDirection = enemy.facing >= 0 ? 1 : -1;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = enemy.warningType === 'projectile' ? WARNING : DANGER;
  ctx.lineWidth = 3 * this.scale;

  if (enemy.warningType === 'projectile') {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.stroke();
  } else if (enemy.warningType === 'dash') {
    utils.strokeRoundRect(
      ctx,
      dashDirection > 0 ? centerX - 12 * this.scale : centerX - enemy.dashDistance,
      centerY - enemy.height * 0.2,
      enemy.dashDistance + 12 * this.scale,
      enemy.height * 0.4,
      16 * this.scale,
      WARNING,
      3 * this.scale
    );
  } else if (enemy.warningType === 'nova') {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 92 * this.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 44 * this.scale, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.warningType === 'finisher') {
    var finisherY = enemy.finisherLaneY || (this.player.y + this.player.height * 0.5);
    utils.fillRoundRect(
      ctx,
      0,
      finisherY - 48 * this.scale,
      this.level.worldWidth,
      96 * this.scale,
      20 * this.scale,
      'rgba(255, 118, 100, 0.16)'
    );
    utils.strokeRoundRect(
      ctx,
      0,
      finisherY - 48 * this.scale,
      this.level.worldWidth,
      96 * this.scale,
      20 * this.scale,
      WARNING,
      4 * this.scale
    );
  } else {
    ctx.beginPath();
    ctx.arc(centerX, centerY, enemy.attackRange * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawHazard = function (ctx, hazard) {
  var centerX = hazard.type === 'mine' ? hazard.x : hazard.x + hazard.width / 2;
  var centerY = hazard.type === 'mine' ? hazard.y : hazard.y + hazard.height / 2;
  var switchActive = false;
  var suppressed = Date.now() < (hazard.suppressedUntil || 0);

  ctx.save();
  ctx.globalAlpha = hazard.active ? 0.95 : 0.42;

  if (hazard.type === 'switch') {
    switchActive = hazard.active || Date.now() < hazard.activeUntil;
    var padX = hazard.x - 6 * this.scale;
    var padY = hazard.y - 4 * this.scale;
    var padWidth = hazard.width + 12 * this.scale;
    var padHeight = hazard.height + 8 * this.scale;
    var consoleWidth = hazard.width * 0.72;
    var consoleHeight = 18 * this.scale;
    var consoleX = hazard.x + (hazard.width - consoleWidth) / 2;
    var consoleY = hazard.y - consoleHeight - 2 * this.scale;
    var buttonRadius = 6 * this.scale;
    var lightRadius = 3.5 * this.scale;
    var accentColor = switchActive ? SUCCESS : ACCENT;
    var holoX = consoleX + consoleWidth * 0.72;
    var holoBaseY = consoleY - 2 * this.scale;
    var holoTopY = consoleY - 18 * this.scale;

    utils.fillRoundRect(ctx, padX, padY, padWidth, padHeight, 10 * this.scale, 'rgba(14, 18, 30, 0.68)');
    utils.strokeRoundRect(ctx, padX, padY, padWidth, padHeight, 10 * this.scale, 'rgba(255,255,255,0.1)', 1.5);
    utils.fillRoundRect(ctx, consoleX, consoleY, consoleWidth, consoleHeight, 9 * this.scale, 'rgba(28, 34, 52, 0.94)');
    utils.strokeRoundRect(ctx, consoleX, consoleY, consoleWidth, consoleHeight, 9 * this.scale, 'rgba(255,255,255,0.16)', 1.5);
    utils.fillRoundRect(
      ctx,
      consoleX + 4 * this.scale,
      consoleY + 4 * this.scale,
      consoleWidth - 8 * this.scale,
      consoleHeight - 8 * this.scale,
      7 * this.scale,
      switchActive ? 'rgba(108, 225, 140, 0.12)' : 'rgba(123, 199, 255, 0.08)'
    );
    ctx.beginPath();
    ctx.fillStyle = switchActive ? 'rgba(108, 225, 140, 0.92)' : 'rgba(255,255,255,0.78)';
    ctx.arc(consoleX + consoleWidth * 0.34, consoleY + consoleHeight * 0.54, buttonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.lineWidth = 2 * this.scale;
    ctx.strokeStyle = 'rgba(8, 12, 24, 0.45)';
    ctx.arc(consoleX + consoleWidth * 0.34, consoleY + consoleHeight * 0.54, buttonRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = accentColor;
    ctx.arc(consoleX + consoleWidth * 0.72, consoleY + consoleHeight * 0.54, lightRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.lineWidth = 1.5 * this.scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.arc(consoleX + consoleWidth * 0.72, consoleY + consoleHeight * 0.54, lightRadius + 2 * this.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2 * this.scale;
    ctx.moveTo(consoleX + consoleWidth * 0.12, hazard.y + hazard.height * 0.6);
    ctx.lineTo(consoleX + consoleWidth * 0.88, hazard.y + hazard.height * 0.6);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = switchActive ? 0.32 : 0.22;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(holoX - 7 * this.scale, holoBaseY);
    ctx.lineTo(holoX + 7 * this.scale, holoBaseY);
    ctx.lineTo(holoX + 3 * this.scale, holoTopY);
    ctx.lineTo(holoX - 3 * this.scale, holoTopY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.lineWidth = 1.5 * this.scale;
    ctx.strokeStyle = accentColor;
    ctx.arc(holoX, holoTopY - 7 * this.scale, 5 * this.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(holoX, holoTopY - 14 * this.scale);
    ctx.lineTo(holoX, holoTopY - 2 * this.scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(holoX - 4 * this.scale, holoTopY - 8 * this.scale);
    ctx.lineTo(holoX + 4 * this.scale, holoTopY - 8 * this.scale);
    ctx.stroke();
  } else if (hazard.type === 'gate') {
    utils.fillRoundRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, 12 * this.scale, hazard.active ? 'rgba(123, 199, 255, 0.46)' : 'rgba(123, 199, 255, 0.16)');
    utils.strokeRoundRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, 12 * this.scale, hazard.active ? ACCENT : 'rgba(123, 199, 255, 0.45)', 2.5);
    if (hazard.active) {
      this.drawImageFit(ctx, this.assets.get('lightningBolt'), hazard.x - 14 * this.scale, hazard.y - 8 * this.scale, hazard.width + 28 * this.scale, hazard.height + 16 * this.scale, 0.55);
    }
  } else {
    if (hazard.active) {
      this.drawImageFit(ctx, this.assets.get('powerStone'), centerX - hazard.radius * 1.1, centerY - hazard.radius * 1.1, hazard.radius * 2.2, hazard.radius * 2.2, 0.92);
      ctx.strokeStyle = WARNING;
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, hazard.radius * 1.35, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      utils.fillRoundRect(ctx, centerX - hazard.radius * 0.72, centerY - hazard.radius * 0.72, hazard.radius * 1.44, hazard.radius * 1.44, hazard.radius, 'rgba(255, 216, 87, 0.2)');
      utils.strokeRoundRect(ctx, centerX - hazard.radius * 0.72, centerY - hazard.radius * 0.72, hazard.radius * 1.44, hazard.radius * 1.44, hazard.radius, 'rgba(255, 216, 87, 0.45)', 2);
    }
  }

  if (suppressed && hazard.type !== 'switch') {
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = SUCCESS;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.moveTo(centerX - 16 * this.scale, centerY);
    ctx.lineTo(centerX + 16 * this.scale, centerY);
    ctx.stroke();
  }

  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawProjectile = function (ctx, projectile) {
  var image = null;
  if (projectile.team === 'player') {
    if (this.hero.key === 'ironman') {
      image = this.assets.get('repulsorBlast');
    } else if (this.hero.key === 'thor') {
      image = this.assets.get('mjolnirProjectile');
    } else if (this.hero.key === 'hulk') {
      image = this.assets.get('groundShockwave');
    }
  } else if (projectile.team === 'enemy') {
    image = this.assets.get('powerStone');
  }

  if (!this.drawImageFit(ctx, image, projectile.x, projectile.y, projectile.width, projectile.height, projectile.team === 'enemy' ? 0.92 : 1)) {
    ctx.fillStyle = projectile.color;
    utils.fillRoundRect(ctx, projectile.x, projectile.y, projectile.width, projectile.height, projectile.height / 2, projectile.color);
  }
};

MarvelMinigameRuntime.prototype.drawPlayer = function (ctx, player) {
  if (!player) {
    return;
  }

  var hero = this.hero;
  var now = Date.now();
  var flashing = Date.now() < player.invulnerableUntil && Math.floor(Date.now() / 100) % 2 === 0;
  var hurt = now < (player.hurtUntil || 0);
  var centerX = player.x + player.width / 2;
  var pose = player.poseUntil > now ? player.pose : '';
  var deathProgress = player.deathStartedAt ? utils.clamp((now - player.deathStartedAt) / Math.max(1, (player.deathUntil - player.deathStartedAt) || 700), 0, 1) : 0;
  var hurtDirection = player.hurtSourceX && centerX >= player.hurtSourceX ? 1 : -1;
  var hurtTilt = hero.hurtTilt || 0.18;
  var deathTilt = hero.deathTilt || 0.3;
  var landingDrop = hero.landingDrop || 3;
  var sprite = this.getHeroAnimatedSprite(hero.key, player);
  var drewSprite = false;

  ctx.save();
  if (flashing) {
    ctx.globalAlpha = 0.45;
  }
  ctx.translate(centerX, player.y);
  if (player.isDead || pose === 'dead') {
    ctx.translate(0, player.height * 0.8);
    ctx.rotate(hurtDirection * Math.min(Math.PI * deathTilt, deathProgress * Math.PI * deathTilt));
    ctx.translate(0, -player.height * 0.8 + deathProgress * 12 * this.scale);
  } else if (pose === 'hurt') {
    ctx.translate(0, player.height * 0.54);
    ctx.rotate(-hurtDirection * hurtTilt);
    ctx.translate(0, -player.height * 0.54);
  } else if (!player.onGround && now - (player.lastGroundedAt || 0) < 140) {
    ctx.translate(0, -landingDrop * this.scale);
  }
  ctx.scale(player.facing, 1);

  if (sprite) {
    drewSprite = this.drawImageFit(ctx, sprite, -player.width * 0.84, -8 * this.scale, player.width * 1.68, player.height * 1.22, 1);
  }

  if (!drewSprite) {
    ctx.fillStyle = hero.primaryStyle;
    utils.fillRoundRect(ctx, -player.width / 2, 18 * this.scale, player.width, player.height - 18 * this.scale, 14 * this.scale, hero.primaryStyle);
    ctx.fillStyle = hero.accentStyle;
    ctx.fillRect(-player.width * 0.18, 30 * this.scale, player.width * 0.36, 20 * this.scale);
    ctx.fillStyle = hero.glowStyle;
    utils.fillRoundRect(ctx, -8 * this.scale, 28 * this.scale, 16 * this.scale, 16 * this.scale, 999, hero.glowStyle);
    ctx.fillStyle = '#f5d0b4';
    utils.fillRoundRect(ctx, -12 * this.scale, 0, 24 * this.scale, 24 * this.scale, 12 * this.scale, '#f5d0b4');
  }

  if (hurt) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255, 118, 100, 0.28)';
    ctx.fillRect(-player.width, -14 * this.scale, player.width * 2, player.height * 1.4);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (player.beamUntil > Date.now()) {
    var beamX = player.facing > 0 ? player.width / 2 : -player.beamLength;
    if (!this.drawImageFit(ctx, this.assets.get('unibeamEffect'), beamX, 10 * this.scale, player.beamLength, player.beamWidth + 24 * this.scale, 0.82)) {
      ctx.fillStyle = 'rgba(123, 219, 255, 0.68)';
      ctx.fillRect(beamX, 22 * this.scale, player.beamLength, player.beamWidth);
    }
  }

  ctx.restore();

  if (this.transitionMessage && this.state === 'playing') {
    ctx.save();
    utils.setTextStyle(ctx, 13 * this.scale, null, SOFT_INK, 'center', 'middle');
    ctx.fillText(this.transitionMessage, this.width / 2, this.height - 136 * this.scale);
    ctx.restore();
  }
};

MarvelMinigameRuntime.prototype.drawEnemy = function (ctx, enemy) {
  var centerX = enemy.x + enemy.width / 2;
  var now = Date.now();
  var hurt = now < (enemy.hurtUntil || 0);
  var pose = enemy.poseUntil > now ? enemy.pose : '';
  var sprite = this.getEnemyAnimatedSprite(enemy);
  var drewSprite = false;
  var deathProgress = enemy.deathStartedAt ? utils.clamp((now - enemy.deathStartedAt) / Math.max(1, (enemy.deathUntil - enemy.deathStartedAt) || 620), 0, 1) : 0;
  var weakened = enemy.type === 'boss' && now < (enemy.weakenedUntil || 0);

  ctx.save();
  ctx.translate(centerX, enemy.y);
  if (enemy.isDead || pose === 'dead') {
    ctx.translate(0, enemy.height * 0.76);
    ctx.rotate(enemy.facing * Math.min(Math.PI * 0.38, deathProgress * Math.PI * 0.38));
    ctx.translate(0, -enemy.height * 0.76 + deathProgress * 10 * this.scale);
  } else if (pose === 'hurt') {
    ctx.translate(0, enemy.height * 0.54);
    ctx.rotate(-enemy.facing * 0.14);
    ctx.translate(0, -enemy.height * 0.54);
  }
  ctx.scale(enemy.facing, 1);
  if (sprite) {
    drewSprite = this.drawImageFit(
      ctx,
      sprite,
      -enemy.width * (enemy.type === 'boss' ? 0.86 : 0.78),
      enemy.type === 'boss' ? -12 * this.scale : -6 * this.scale,
      enemy.width * (enemy.type === 'boss' ? 1.72 : 1.56),
      enemy.height * (enemy.type === 'boss' ? 1.24 : 1.16),
      1
    );
  }
  if (!drewSprite) {
    if (enemy.type === 'boss') {
      utils.fillRoundRect(ctx, -enemy.width / 2, 18 * this.scale, enemy.width, enemy.height - 18 * this.scale, 14 * this.scale, '#7051a3');
      utils.fillRoundRect(ctx, -16 * this.scale, 0, 32 * this.scale, 28 * this.scale, 12 * this.scale, '#ccb8a0');
      utils.fillRoundRect(ctx, -enemy.width * 0.3, enemy.height - 30 * this.scale, enemy.width * 0.6, 16 * this.scale, 8 * this.scale, '#d4a34c');
      utils.fillRoundRect(ctx, 10 * this.scale, 10 * this.scale, 12 * this.scale, 8 * this.scale, 4 * this.scale, '#ffb56a');
    } else if (enemy.type === 'drone') {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(0, enemy.height * 0.32, enemy.width * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      utils.fillRoundRect(ctx, -enemy.width * 0.38, enemy.height * 0.2, enemy.width * 0.76, enemy.height * 0.32, 999, 'rgba(123, 199, 255, 0.28)');
      utils.fillRoundRect(ctx, -enemy.width * 0.54, enemy.height * 0.26, enemy.width * 0.24, enemy.height * 0.18, 999, 'rgba(247,247,251,0.82)');
      utils.fillRoundRect(ctx, enemy.width * 0.3, enemy.height * 0.26, enemy.width * 0.24, enemy.height * 0.18, 999, 'rgba(247,247,251,0.82)');
      utils.fillRoundRect(ctx, -enemy.width * 0.1, enemy.height * 0.12, enemy.width * 0.2, enemy.height * 0.18, 999, '#ff7664');
      this.drawImageFit(ctx, this.assets.get('powerStone'), -enemy.width * 0.18, enemy.height * 0.14, enemy.width * 0.36, enemy.width * 0.36, 0.78);
    } else {
      utils.fillRoundRect(ctx, -enemy.width / 2, 14 * this.scale, enemy.width, enemy.height - 14 * this.scale, 10 * this.scale, '#a4adb9');
      utils.fillRoundRect(ctx, -10 * this.scale, 0, 20 * this.scale, 20 * this.scale, 10 * this.scale, '#d6dbe2');
      utils.fillRoundRect(ctx, 4 * this.scale, 6 * this.scale, 8 * this.scale, 6 * this.scale, 3 * this.scale, '#ff6767');
    }
  }
  if (hurt) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255, 118, 100, 0.24)';
    ctx.fillRect(-enemy.width, -18 * this.scale, enemy.width * 2, enemy.height * 1.5);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  if (!enemy.isDead) {
    var hpWidth = enemy.width;
    var hpRatio = utils.clamp(enemy.health / enemy.maxHealth, 0, 1);
    var variantLabel = enemy.type === 'drone'
      ? '空巡'
      : (enemy.variant === 'artillery' ? '炮击' : (enemy.variant === 'brute' ? '重装' : (enemy.variant === 'skirmisher' ? '游击' : '')));
    var variantColor = enemy.type === 'drone'
      ? ACCENT
      : (enemy.variant === 'artillery' ? ACCENT : (enemy.variant === 'brute' ? WARNING : (enemy.variant === 'skirmisher' ? SUCCESS : SOFT_INK)));
    var labelWidth = enemy.type === 'drone'
      ? Math.max(56 * this.scale, enemy.width * 0.96)
      : Math.max(44 * this.scale, enemy.width * 0.82);
    utils.fillRoundRect(ctx, enemy.x, enemy.y - 10 * this.scale, hpWidth, 6 * this.scale, 999, 'rgba(255,255,255,0.16)');
    utils.fillRoundRect(ctx, enemy.x, enemy.y - 10 * this.scale, hpWidth * hpRatio, 6 * this.scale, 999, enemy.type === 'boss' ? WARNING : DANGER);
    if (variantLabel && enemy.type !== 'boss') {
      utils.fillRoundRect(ctx, enemy.x, enemy.y - 28 * this.scale, labelWidth, 14 * this.scale, 999, 'rgba(10, 15, 32, 0.74)');
      utils.strokeRoundRect(ctx, enemy.x, enemy.y - 28 * this.scale, labelWidth, 14 * this.scale, 999, variantColor, 1.5);
      utils.setTextStyle(ctx, 8 * this.scale, 'bold', variantColor, 'center', 'middle');
      ctx.fillText(variantLabel, enemy.x + labelWidth / 2, enemy.y - 21 * this.scale);
    }
  }

  if (weakened) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = SUCCESS;
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(centerX, enemy.y + enemy.height * 0.46, enemy.width * 0.72 + Math.sin(now / 120) * 4 * this.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

MarvelMinigameRuntime.prototype.drawEffect = function (ctx, effect) {
  var progress = effect.age / effect.duration;
  var cameraX = this.cameraX;
  var x = effect.x - cameraX;
  var y = effect.staticY ? effect.y : effect.y - effect.age * 26 * this.scale;

  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.strokeStyle = effect.color;
  ctx.fillStyle = effect.color;

  if (effect.type === 'text') {
    utils.setTextStyle(ctx, 14 * this.scale, 'bold', effect.color, 'center', 'middle');
    ctx.fillText(effect.label, x, y);
  } else if (effect.type === 'suppressed' || effect.type === 'restored') {
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(x, y, 14 * this.scale + 16 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
    utils.setTextStyle(ctx, 10 * this.scale, 'bold', effect.color, 'center', 'middle');
    ctx.fillText(effect.type === 'suppressed' ? '关' : '开', x, y);
  } else if (effect.type === 'impact') {
    ctx.lineWidth = 4 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x - 18 * this.scale, y);
    ctx.lineTo(x + 18 * this.scale, y);
    ctx.moveTo(x, y - 18 * this.scale);
    ctx.lineTo(x, y + 18 * this.scale);
    ctx.moveTo(x - 12 * this.scale, y - 12 * this.scale);
    ctx.lineTo(x + 12 * this.scale, y + 12 * this.scale);
    ctx.moveTo(x + 12 * this.scale, y - 12 * this.scale);
    ctx.lineTo(x - 12 * this.scale, y + 12 * this.scale);
    ctx.stroke();
  } else if (effect.type === 'repulsorHit') {
    if (!this.drawImageFit(ctx, this.assets.get('repulsorBlast'), x - 24 * this.scale, y - 20 * this.scale, 48 * this.scale, 40 * this.scale, 0.9)) {
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 12 * this.scale + 14 * this.scale * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x - 18 * this.scale, y);
    ctx.lineTo(x + 18 * this.scale, y);
    ctx.stroke();
  } else if (effect.type === 'repulsorLanding') {
    if (!this.drawImageFit(ctx, this.assets.get('unibeamEffect'), x - 72 * this.scale, y - 24 * this.scale, 144 * this.scale, 48 * this.scale, 0.72)) {
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 20 * this.scale + 24 * this.scale * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.arc(x, y, 14 * this.scale + 18 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 18 * this.scale);
    ctx.lineTo(x, y + 18 * this.scale);
    ctx.moveTo(x - 18 * this.scale, y);
    ctx.lineTo(x + 18 * this.scale, y);
    ctx.stroke();
  } else if (effect.type === 'thunderHit') {
    if (!this.drawImageFit(ctx, this.assets.get('lightningBolt'), x - 22 * this.scale, y - 46 * this.scale, 44 * this.scale, 74 * this.scale, 0.88)) {
      ctx.lineWidth = 4 * this.scale;
      ctx.beginPath();
      ctx.moveTo(x, y - 34 * this.scale);
      ctx.lineTo(x - 10 * this.scale, y - 8 * this.scale);
      ctx.lineTo(x + 4 * this.scale, y + 4 * this.scale);
      ctx.lineTo(x - 4 * this.scale, y + 26 * this.scale);
      ctx.stroke();
    }
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(x, y + 8 * this.scale, 14 * this.scale + 18 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === 'thunderLanding') {
    if (!this.drawImageFit(ctx, this.assets.get('lightningBolt'), x - 24 * this.scale, y - 76 * this.scale, 48 * this.scale, 112 * this.scale, 0.8)) {
      ctx.lineWidth = 4 * this.scale;
      ctx.beginPath();
      ctx.moveTo(x, y - 56 * this.scale);
      ctx.lineTo(x - 14 * this.scale, y - 12 * this.scale);
      ctx.lineTo(x + 6 * this.scale, y + 6 * this.scale);
      ctx.lineTo(x - 4 * this.scale, y + 28 * this.scale);
      ctx.stroke();
    }
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(x, y + 10 * this.scale, 18 * this.scale + 22 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 10 * this.scale, 7 * this.scale + 12 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === 'gammaHit') {
    if (!this.drawImageFit(ctx, this.assets.get('groundShockwave'), x - 48 * this.scale, y - 26 * this.scale, 96 * this.scale, 52 * this.scale, 0.82)) {
      ctx.lineWidth = 4 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 18 * this.scale + 20 * this.scale * progress, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 20 * this.scale, y + 2 * this.scale);
    ctx.lineTo(x - 8 * this.scale, y - 14 * this.scale);
    ctx.lineTo(x + 4 * this.scale, y + 2 * this.scale);
    ctx.lineTo(x + 18 * this.scale, y - 12 * this.scale);
    ctx.stroke();
  } else if (effect.type === 'gammaLanding') {
    if (!this.drawImageFit(ctx, this.assets.get('groundShockwave'), x - 70 * this.scale, y - 34 * this.scale, 140 * this.scale, 68 * this.scale, 0.86)) {
      ctx.lineWidth = 4 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 22 * this.scale + 28 * this.scale * progress, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 28 * this.scale, y + 2 * this.scale);
    ctx.lineTo(x - 14 * this.scale, y - 18 * this.scale);
    ctx.lineTo(x - 2 * this.scale, y + 2 * this.scale);
    ctx.lineTo(x + 12 * this.scale, y - 14 * this.scale);
    ctx.lineTo(x + 26 * this.scale, y + 4 * this.scale);
    ctx.stroke();
  } else if (effect.type === 'slash') {
    ctx.lineWidth = 5 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x - 22 * this.scale, y + 14 * this.scale);
    ctx.lineTo(x - 4 * this.scale, y - 12 * this.scale);
    ctx.lineTo(x + 24 * this.scale, y - 20 * this.scale);
    ctx.stroke();
  } else if (effect.type === 'blast' || effect.type === 'skill' || effect.type === 'throw' || effect.type === 'enemy') {
    if (!this.drawImageFit(ctx, this.assets.get('powerStone'), x - 16 * this.scale, y - 16 * this.scale, 32 * this.scale, 32 * this.scale, 0.72)) {
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 12 * this.scale + 18 * this.scale * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (effect.type === 'explode' || effect.type === 'slam') {
    if (!this.drawImageFit(ctx, this.assets.get(effect.type === 'slam' ? 'groundShockwave' : 'shockwave'), x - 54 * this.scale, y - 54 * this.scale, 108 * this.scale, 108 * this.scale, 0.84)) {
      ctx.lineWidth = 4 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 18 * this.scale + 36 * this.scale * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (effect.type === 'landing') {
    if (!this.drawImageFit(ctx, this.assets.get('groundShockwave'), x - 44 * this.scale, y - 30 * this.scale, 88 * this.scale, 56 * this.scale, 0.7)) {
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 16 * this.scale + 20 * this.scale * progress, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  } else if (effect.type === 'ultimate') {
    ctx.fillRect(x - 120 * this.scale, y - 10 * this.scale, 240 * this.scale, 20 * this.scale);
  } else if (effect.type === 'finisher') {
    if (!this.drawImageFit(
      ctx,
      this.assets.get('unibeamEffect'),
      x - effect.width / 2,
      y - effect.height / 2,
      effect.width,
      effect.height,
      0.92
    )) {
      utils.fillRoundRect(ctx, x - effect.width / 2, y - effect.height / 2, effect.width, effect.height, 24 * this.scale, 'rgba(255, 118, 100, 0.52)');
    }
  } else if (effect.type === 'finisherImpact') {
    if (!this.drawImageFit(ctx, this.assets.get('shockwave'), x - 72 * this.scale, y - 72 * this.scale, 144 * this.scale, 144 * this.scale, 0.92)) {
      ctx.lineWidth = 6 * this.scale;
      ctx.beginPath();
      ctx.arc(x, y, 26 * this.scale + 42 * this.scale * progress, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = (1 - progress) * 0.26;
    ctx.fillStyle = 'rgba(255, 118, 100, 0.72)';
    ctx.fillRect(x - 120 * this.scale, y - 90 * this.scale, 240 * this.scale, 180 * this.scale);
  } else if (effect.type === 'lightning') {
    if (!this.drawImageFit(ctx, this.assets.get('lightningBolt'), x - 28 * this.scale, y - 124 * this.scale, 56 * this.scale, 178 * this.scale, 0.92)) {
      ctx.lineWidth = 5 * this.scale;
      ctx.beginPath();
      ctx.moveTo(x, y - 120 * this.scale);
      ctx.lineTo(x - 18 * this.scale, y - 36 * this.scale);
      ctx.lineTo(x + 8 * this.scale, y - 12 * this.scale);
      ctx.lineTo(x - 6 * this.scale, y + 54 * this.scale);
      ctx.stroke();
    }
  }
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawHud = function (ctx) {
  var player = this.player;
  var hero = this.hero;
  var boss = this.getAliveBoss();
  var activeEncounter = this.getActiveEncounterState();
  var hpRatio = player ? utils.clamp(player.health / player.maxHealth, 0, 1) : 0;
  var barWidth = 220 * this.scale;
  var topY = 20 * this.scale;

  ctx.save();
  utils.drawPanel(ctx, 20 * this.scale, topY, 280 * this.scale, 72 * this.scale, {
    fillStyle: 'rgba(7, 11, 24, 0.68)',
    strokeStyle: 'rgba(255, 255, 255, 0.12)',
    radius: 18
  });

  utils.setTextStyle(ctx, 16 * this.scale, 'bold', INK, 'left', 'middle');
  ctx.fillText(hero.name, 36 * this.scale, topY + 22 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'left', 'middle');
  ctx.fillText(this.level.chapterLabel + ' · ' + this.level.name, 36 * this.scale, topY + 42 * this.scale);

  utils.fillRoundRect(ctx, 36 * this.scale, topY + 52 * this.scale, barWidth, 10 * this.scale, 999, 'rgba(255,255,255,0.14)');
  utils.fillRoundRect(ctx, 36 * this.scale, topY + 52 * this.scale, barWidth * hpRatio, 10 * this.scale, 999, hpRatio > 0.35 ? SUCCESS : DANGER);

  utils.setTextStyle(ctx, 14 * this.scale, 'bold', INK, 'right', 'middle');
  ctx.fillText(Math.round(player.health) + '/' + player.maxHealth, 286 * this.scale, topY + 22 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'right', 'middle');
  ctx.fillText(this.elapsedTime.toFixed(1) + '秒', 286 * this.scale, topY + 42 * this.scale);

  if (boss) {
    var bossRatio = utils.clamp(boss.health / boss.maxHealth, 0, 1);
    var bossBarWidth = 240 * this.scale;
    var bossX = this.width / 2 - bossBarWidth / 2;
    var bossRecovering = Date.now() < (boss.recoveryUntil || 0);
    utils.setTextStyle(ctx, 14 * this.scale, 'bold', WARNING, 'center', 'middle');
    ctx.fillText(boss.name, this.width / 2, topY + 18 * this.scale);
    utils.fillRoundRect(ctx, bossX, topY + 28 * this.scale, bossBarWidth, 10 * this.scale, 999, 'rgba(255,255,255,0.14)');
    utils.fillRoundRect(ctx, bossX, topY + 28 * this.scale, bossBarWidth * bossRatio, 10 * this.scale, 999, WARNING);
    utils.setTextStyle(ctx, 11 * this.scale, null, SOFT_INK, 'center', 'middle');
    ctx.fillText(Math.round(boss.health) + '/' + boss.maxHealth, this.width / 2, topY + 46 * this.scale);
    if (Date.now() < (boss.weakenedUntil || 0)) {
      utils.setTextStyle(ctx, 11 * this.scale, 'bold', SUCCESS, 'center', 'middle');
      ctx.fillText('破防', this.width / 2, topY + 62 * this.scale);
    } else if (bossRecovering) {
      utils.setTextStyle(ctx, 11 * this.scale, 'bold', SUCCESS, 'center', 'middle');
      ctx.fillText('失衡', this.width / 2, topY + 62 * this.scale);
    }
  }

  if (player && Date.now() - (player.lastFallImpactAt || 0) < 240) {
    utils.setTextStyle(ctx, 11 * this.scale, 'bold', WARNING, 'left', 'middle');
    ctx.fillText('重摔', 36 * this.scale, topY + 72 * this.scale);
  }

  if (activeEncounter) {
    var remainingEnemies = Math.max(0, activeEncounter.total - activeEncounter.defeated);
    var chipX = 320 * this.scale;
    var chipY = topY + 14 * this.scale;
    var chipWidth = 170 * this.scale;
    utils.fillRoundRect(ctx, chipX, chipY, chipWidth, 46 * this.scale, 16 * this.scale, 'rgba(7, 11, 24, 0.72)');
    utils.strokeRoundRect(ctx, chipX, chipY, chipWidth, 46 * this.scale, 16 * this.scale, WARNING, 1.5);
    utils.setTextStyle(ctx, 10 * this.scale, 'bold', WARNING, 'left', 'middle');
    ctx.fillText('遭遇', chipX + 12 * this.scale, chipY + 14 * this.scale);
    utils.setTextStyle(ctx, 12 * this.scale, 'bold', INK, 'left', 'middle');
    ctx.fillText(activeEncounter.title, chipX + 12 * this.scale, chipY + 31 * this.scale);
    utils.setTextStyle(ctx, 18 * this.scale, 'bold', WARNING, 'right', 'middle');
    ctx.fillText(String(remainingEnemies), chipX + chipWidth - 14 * this.scale, chipY + 24 * this.scale);
  }

  this.pauseRect = this.getPauseRect();
  utils.drawButton(ctx, this.pauseRect, 'II', {
    fillStyle: 'rgba(10, 15, 32, 0.88)',
    strokeStyle: 'rgba(255,255,255,0.18)',
    fontSize: 18 * this.scale
  });
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawControls = function (ctx) {
  var moveZones = this.getMovementZones();
  var buttons = this.getActionButtonRects();
  var player = this.player;
  var now = Date.now();
  var stick = this.moveStick;
  var knobX = stick.active ? stick.knobX : moveZones.baseX;
  var knobY = stick.active ? stick.knobY : moveZones.baseY;

  ctx.save();
  ctx.globalAlpha = 0.5;
  utils.fillRoundRect(
    ctx,
    moveZones.area.x,
    moveZones.area.y,
    moveZones.area.width,
    moveZones.area.height,
    28 * this.scale,
    'rgba(10, 15, 32, 0.24)'
  );
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.fillStyle = 'rgba(10, 15, 32, 0.54)';
  ctx.arc(moveZones.baseX, moveZones.baseY, moveZones.baseRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = 2.5 * this.scale;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.arc(moveZones.baseX, moveZones.baseY, moveZones.baseRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = stick.active ? 'rgba(123, 199, 255, 0.86)' : 'rgba(255,255,255,0.78)';
  ctx.arc(knobX, knobY, moveZones.knobRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = 2 * this.scale;
  ctx.strokeStyle = 'rgba(8, 12, 24, 0.45)';
  ctx.arc(knobX, knobY, moveZones.knobRadius, 0, Math.PI * 2);
  ctx.stroke();

  this.drawActionButton(ctx, buttons.jump, '跳', ACCENT, 0);
  this.drawActionButton(ctx, buttons.attack, '攻', WARNING, Math.max(0, player.attackAvailableAt - now));
  this.drawActionButton(ctx, buttons.skill, '技', this.hero.glowStyle, Math.max(0, player.skillAvailableAt - now));
  this.drawActionButton(ctx, buttons.ultimate, '绝', DANGER, Math.max(0, player.ultimateAvailableAt - now));
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawActionButton = function (ctx, rect, label, color, cooldownRemaining) {
  var alpha = cooldownRemaining > 0 ? 0.42 : 0.88;
  var centerX = rect.x + rect.width / 2;
  var centerY = rect.y + rect.height / 2;
  var radius = rect.width / 2;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(centerX, centerY, radius + 8 * this.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 255, 255, ' + (cooldownRemaining > 0 ? 0.08 : 0.12) + ')';
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = 2 * this.scale;
  ctx.strokeStyle = 'rgba(255,255,255,0.26)';
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 1.5 * this.scale;
  ctx.strokeStyle = color;
  ctx.arc(centerX, centerY, radius - 6 * this.scale, Math.PI * 0.95, Math.PI * 1.85);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(centerX, centerY - radius * 0.32, radius * 0.76, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  utils.setTextStyle(ctx, 18 * this.scale, 'bold', '#ffffff', 'center', 'middle');
  ctx.fillText(label, centerX, centerY - 2 * this.scale);
  if (cooldownRemaining > 0) {
    utils.setTextStyle(ctx, 10 * this.scale, null, 'rgba(255,255,255,0.92)', 'center', 'middle');
    ctx.fillText(utils.formatCooldown(cooldownRemaining), centerX, centerY + 14 * this.scale);
  }
};

MarvelMinigameRuntime.prototype.renderPauseOverlay = function (ctx) {
  var buttons = this.getPauseMenuButtons();
  var title = this.state === 'paused-system' ? '系统暂停' : '游戏暂停';
  var hint = this.state === 'paused-system' ? '返回后继续任务' : '恢复后继续战斗';

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.fillRect(0, 0, this.width, this.height);
  utils.drawPanel(ctx, this.width / 2 - 180 * this.scale, this.height / 2 - 150 * this.scale, 360 * this.scale, 300 * this.scale);
  utils.setTextStyle(ctx, 28 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(title, this.width / 2, this.height / 2 - 104 * this.scale);
  utils.setTextStyle(ctx, 14 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(hint, this.width / 2, this.height / 2 - 76 * this.scale);

  utils.drawButton(ctx, buttons.resume, '继续游戏', {
    fillStyle: 'rgba(59, 117, 255, 0.9)',
    fontSize: 18 * this.scale
  });
  utils.drawButton(ctx, buttons.restart, '重新开始', {
    fillStyle: 'rgba(200, 57, 61, 0.88)',
    fontSize: 18 * this.scale
  });
  utils.drawButton(ctx, buttons.select, '返回选人', {
    fillStyle: 'rgba(255, 255, 255, 0.1)',
    fontSize: 18 * this.scale
  });
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderResultOverlay = function (ctx, victory) {
  var layout = this.getResultOverlayLayout(victory);
  var buttons = this.getResultButtons();
  var hasContinue = this.canContinueFromCheckpoint();
  var assessment = this.getLevelAssessment(victory);
  var stats = this.levelStats || {};
  var recordUpdate = this.lastRecordUpdate;
  var panelX = layout.panelX;
  var panelHeight = layout.panelHeight;
  var panelY = layout.panelY;
  var panelWidth = layout.panelWidth;
  var hasNext = victory && this.hasNextLevel();
  var nextLevel = hasNext ? this.campaign[this.levelIndex + 1] : null;
  var title = victory ? (hasNext ? '关卡完成' : '战役完成') : '任务失败';
  var statusLabel = victory ? (hasNext ? '下一关' : '战役状态') : '未完成目标';
  var statusValue = victory ? (hasNext ? nextLevel.chapterLabel : '已通关') : '重试';
  var restartLabel = victory ? (hasNext ? '进入下一关' : '再次出击') : '重新开始';
  var checkpointLabel = this.activeCheckpoint ? this.activeCheckpoint.label : '未激活';
  var compactChipWidth = 110 * this.scale;
  var compactChipHeight = 58 * this.scale;
  var compactChipGap = 10 * this.scale;
  var compactChipX = panelX + (panelWidth - compactChipWidth * 3 - compactChipGap * 2) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.fillRect(0, 0, this.width, this.height);
  utils.drawPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
    fillStyle: 'rgba(8, 13, 28, 0.92)',
    strokeStyle: victory ? 'rgba(108, 225, 140, 0.28)' : 'rgba(255, 118, 100, 0.26)',
    radius: 24
  });
  utils.setTextStyle(ctx, 30 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(title, this.width / 2, panelY + 52 * this.scale);
  utils.fillRoundRect(ctx, panelX + panelWidth - 88 * this.scale, panelY + 26 * this.scale, 56 * this.scale, 28 * this.scale, 999, 'rgba(255,255,255,0.08)');
  utils.strokeRoundRect(ctx, panelX + panelWidth - 88 * this.scale, panelY + 26 * this.scale, 56 * this.scale, 28 * this.scale, 999, assessment.color, 2);
  utils.setTextStyle(ctx, 16 * this.scale, 'bold', assessment.color, 'center', 'middle');
  ctx.fillText(assessment.rank, panelX + panelWidth - 60 * this.scale, panelY + 40 * this.scale);
  utils.setTextStyle(ctx, 14 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(this.hero.name + ' · ' + this.level.chapterLabel + ' · ' + this.level.name, this.width / 2, panelY + 84 * this.scale);
  ctx.fillText('生存时间 ' + this.elapsedTime.toFixed(1) + ' 秒', this.width / 2, panelY + 108 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, '#d8deef', 'center', 'middle');
  ctx.fillText(assessment.summary, this.width / 2, panelY + 128 * this.scale);

  if (!victory) {
    this.drawSummaryChip(ctx, compactChipX, panelY + 144 * this.scale, compactChipWidth, compactChipHeight, '剩余生命', Math.max(0, Math.round(this.player.health)));
    this.drawSummaryChip(ctx, compactChipX + compactChipWidth + compactChipGap, panelY + 144 * this.scale, compactChipWidth, compactChipHeight, '行动评级', assessment.rank);
    this.drawSummaryChip(
      ctx,
      compactChipX + (compactChipWidth + compactChipGap) * 2,
      panelY + 144 * this.scale,
      compactChipWidth,
      compactChipHeight,
      hasContinue ? '检查点' : '承伤',
      hasContinue ? checkpointLabel : Math.round(stats.damageTaken || 0)
    );

    if (hasContinue) {
      utils.drawButton(ctx, buttons.continue, '检查点继续', {
        fillStyle: 'rgba(59, 117, 255, 0.92)',
        fontSize: 17 * this.scale
      });
    }

    utils.drawButton(ctx, buttons.restart, restartLabel, {
      fillStyle: 'rgba(200, 57, 61, 0.9)',
      fontSize: 17 * this.scale
    });
    utils.drawButton(ctx, buttons.select, '返回选人', {
      fillStyle: 'rgba(255,255,255,0.1)',
      fontSize: 17 * this.scale
    });
    ctx.restore();
    return;
  }

  if (victory && recordUpdate) {
    utils.setTextStyle(ctx, 11 * this.scale, 'bold', recordUpdate.improved ? SUCCESS : ACCENT, 'center', 'middle');
    ctx.fillText(
      recordUpdate.improved
        ? ('新纪录 ' + recordUpdate.rank + ' · ' + recordUpdate.bestTime.toFixed(1) + '秒'
          + (recordUpdate.unlockedLevelLabel ? (' · 解锁 ' + recordUpdate.unlockedLevelLabel) : ''))
        : ('个人最佳 ' + recordUpdate.rank + ' · ' + recordUpdate.bestTime.toFixed(1) + '秒'),
      this.width / 2,
      panelY + 146 * this.scale
    );
  }

  this.drawSummaryChip(ctx, panelX + 28 * this.scale, panelY + 164 * this.scale, 160 * this.scale, 72 * this.scale, '剩余生命', Math.max(0, Math.round(this.player.health)));
  this.drawSummaryChip(ctx, panelX + 212 * this.scale, panelY + 164 * this.scale, 160 * this.scale, 72 * this.scale, statusLabel, statusValue);
  this.drawSummaryChip(ctx, panelX + 28 * this.scale, panelY + 248 * this.scale, 160 * this.scale, 72 * this.scale, '行动评级', assessment.rank);
  this.drawSummaryChip(
    ctx,
    panelX + 212 * this.scale,
    panelY + 248 * this.scale,
    160 * this.scale,
    72 * this.scale,
    hasContinue ? '检查点' : '承受伤害',
    hasContinue ? checkpointLabel : Math.round(stats.damageTaken || 0)
  );

  if (hasContinue) {
    utils.drawButton(ctx, buttons.continue, '检查点继续', {
      fillStyle: 'rgba(59, 117, 255, 0.92)',
      fontSize: 18 * this.scale
    });
  }

  utils.drawButton(ctx, buttons.restart, restartLabel, {
    fillStyle: victory ? 'rgba(59, 117, 255, 0.9)' : 'rgba(200, 57, 61, 0.9)',
    fontSize: 18 * this.scale
  });
  utils.drawButton(ctx, buttons.select, '返回选人', {
    fillStyle: 'rgba(255,255,255,0.1)',
    fontSize: 18 * this.scale
  });
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawSummaryChip = function (ctx, x, y, width, height, label, value) {
  utils.drawPanel(ctx, x, y, width, height, {
    fillStyle: 'rgba(255,255,255,0.04)',
    strokeStyle: 'rgba(255,255,255,0.12)',
    radius: 18
  });
  utils.setTextStyle(ctx, Math.min(12 * this.scale, height * 0.28), null, SOFT_INK, 'left', 'middle');
  ctx.fillText(label, x + 14 * this.scale, y + Math.min(18 * this.scale, height * 0.34));
  utils.setTextStyle(ctx, Math.min(22 * this.scale, height * 0.42), 'bold', INK, 'left', 'middle');
  ctx.fillText(String(value), x + 14 * this.scale, y + height - Math.min(16 * this.scale, height * 0.3));
};

MarvelMinigameRuntime.prototype.getLevelAssessment = function (victory) {
  var stats = this.levelStats || {};
  var healthRatio = this.player && this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
  var score = 0;
  var rank = 'C';
  var color = DANGER;
  var summary = '';

  if (!victory) {
    if (this.canContinueFromCheckpoint()) {
      return {
        rank: '再战',
        color: ACCENT,
        summary: '检查点已经激活，抓住短暂空档重新稳住局面。'
      };
    }
    return {
      rank: '倒下',
      color: DANGER,
      summary: '任务在撤离前失败了，下次尽量走更稳、更少换血。'
    };
  }

  if (healthRatio >= 0.82) {
    score += 3;
  } else if (healthRatio >= 0.58) {
    score += 2;
  } else if (healthRatio >= 0.3) {
    score += 1;
  }

  if (this.elapsedTime <= 70) {
    score += 2;
  } else if (this.elapsedTime <= 105) {
    score += 1;
  }

  if ((stats.checkpointContinues || 0) === 0) {
    score += 2;
  } else if ((stats.checkpointContinues || 0) === 1) {
    score += 1;
  }

  if ((stats.damageTaken || 0) <= (this.player ? this.player.maxHealth * 0.6 : 60)) {
    score += 1;
  }

  if (score >= 7) {
    rank = 'S';
    color = SUCCESS;
  } else if (score >= 5) {
    rank = 'A';
    color = ACCENT;
  } else if (score >= 3) {
    rank = 'B';
    color = WARNING;
  }

  if ((stats.checkpointContinues || 0) > 0) {
    summary = '中途借助检查点追回局势，下次少重置就能拿到更高评级。';
  } else if (healthRatio < 0.36) {
    summary = '任务虽然完成，但代价偏高，下次撤离前尽量多留血量。';
  } else if (this.elapsedTime > 105) {
    summary = '推进比较稳，再压快清场节奏就能把评级继续往上提。';
  } else {
    summary = '本次推进很强，路线、压制和节奏都控制得很好。';
  }

  return {
    rank: rank,
    color: color,
    summary: summary
  };
};

module.exports = MarvelMinigameRuntime;
