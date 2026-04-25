'use strict';

var utils = require('./utils');
var content = require('./content');
var gameMeta = require('./game-meta');

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

function MarvelMinigameRuntime(options) {
  this.canvas = options.canvas;
  this.ctx = options.ctx;
  this.width = options.width;
  this.height = options.height;
  this.pixelRatio = options.pixelRatio || 1;
  this.runtimeInfo = options.runtimeInfo || {};
  this.scale = Math.max(0.85, Math.min(this.width / 812, this.height / 375));

  this.state = 'title';
  this.heroIndex = 0;
  this.hero = null;
  this.level = null;
  this.player = null;
  this.enemies = [];
  this.projectiles = [];
  this.effects = [];
  this.cameraX = 0;
  this.elapsedTime = 0;
  this.levelStartedAt = 0;
  this.levelResultTime = 0;
  this.transitionMessage = '';
  this.systemPaused = false;

  this.activeMoveTouches = {};
  this.moveLeft = false;
  this.moveRight = false;
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

  var now = typeof timestamp === 'number' ? timestamp : Date.now();
  var dt = this.lastTimestamp ? Math.min(MAX_DT, (now - this.lastTimestamp) / 1000) : 1 / 60;
  this.lastTimestamp = now;

  this.update(dt, now);
  this.render();
  this.requestNextFrame();
};

MarvelMinigameRuntime.prototype.handleShow = function () {
  this.systemPaused = false;
  if (this.state === 'paused-system') {
    this.state = 'playing';
  }
};

MarvelMinigameRuntime.prototype.handleHide = function () {
  this.resetTouchState();
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
    levelName: this.level ? this.level.name : gameMeta.subtitle
  };
};

MarvelMinigameRuntime.prototype.resetTouchState = function () {
  this.activeMoveTouches = {};
  this.moveLeft = false;
  this.moveRight = false;
};

MarvelMinigameRuntime.prototype.handleTouchStart = function (event) {
  var touches = event.changedTouches || [];
  var i;
  var point;

  for (i = 0; i < touches.length; i += 1) {
    point = utils.resolveTouchPoint(touches[i]);

    if (this.state === 'title') {
      if (utils.rectContainsPoint(this.getTitleButtonRect(), point.x, point.y)) {
        this.state = 'select';
      }
      continue;
    }

    if (this.state === 'select') {
      if (this.trySelectHeroAt(point.x, point.y)) {
        continue;
      }

      if (utils.rectContainsPoint(this.getSelectStartRect(), point.x, point.y)) {
        this.startLevel();
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
  }

  this.refreshMoveState();
};

MarvelMinigameRuntime.prototype.handleTouchCancel = function (event) {
  this.handleTouchEnd(event);
};

MarvelMinigameRuntime.prototype.updateMoveTouch = function (point) {
  var zones = this.getMovementZones();

  if (utils.rectContainsPoint(zones.left, point.x, point.y)) {
    this.activeMoveTouches[point.id] = 'left';
  } else if (utils.rectContainsPoint(zones.right, point.x, point.y)) {
    this.activeMoveTouches[point.id] = 'right';
  } else {
    delete this.activeMoveTouches[point.id];
  }

  this.refreshMoveState();
};

MarvelMinigameRuntime.prototype.refreshMoveState = function () {
  var values = Object.keys(this.activeMoveTouches).map(function (key) {
    return this.activeMoveTouches[key];
  }, this);

  this.moveLeft = values.indexOf('left') !== -1;
  this.moveRight = values.indexOf('right') !== -1;
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
    x: this.width / 2 - 110 * this.scale,
    y: this.height * 0.7,
    width: 220 * this.scale,
    height: 58 * this.scale
  };
};

MarvelMinigameRuntime.prototype.getHeroCardRects = function () {
  var cardWidth = 180 * this.scale;
  var gap = 18 * this.scale;
  var totalWidth = cardWidth * HEROES.length + gap * (HEROES.length - 1);
  var startX = (this.width - totalWidth) / 2;
  var y = this.height * 0.28;
  var rects = [];
  var i;

  for (i = 0; i < HEROES.length; i += 1) {
    rects.push({
      x: startX + i * (cardWidth + gap),
      y: y,
      width: cardWidth,
      height: 188 * this.scale
    });
  }

  return rects;
};

MarvelMinigameRuntime.prototype.getSelectStartRect = function () {
  return {
    x: this.width / 2 - 132 * this.scale,
    y: this.height - 84 * this.scale,
    width: 264 * this.scale,
    height: 54 * this.scale
  };
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
  var zoneY = this.height - 128 * this.scale;
  var zoneHeight = 108 * this.scale;
  var zoneWidth = 130 * this.scale;
  var leftX = 20 * this.scale;

  return {
    left: {
      x: leftX,
      y: zoneY,
      width: zoneWidth,
      height: zoneHeight
    },
    right: {
      x: leftX + zoneWidth + 12 * this.scale,
      y: zoneY,
      width: zoneWidth,
      height: zoneHeight
    }
  };
};

MarvelMinigameRuntime.prototype.getActionButtonRects = function () {
  var baseX = this.width - 92 * this.scale;
  var baseY = this.height - 82 * this.scale;
  return {
    jump: {
      x: baseX,
      y: baseY - 56 * this.scale,
      width: 72 * this.scale,
      height: 72 * this.scale
    },
    attack: {
      x: baseX - 86 * this.scale,
      y: baseY,
      width: 72 * this.scale,
      height: 72 * this.scale
    },
    skill: {
      x: baseX - 166 * this.scale,
      y: baseY - 18 * this.scale,
      width: 62 * this.scale,
      height: 62 * this.scale
    },
    ultimate: {
      x: baseX - 122 * this.scale,
      y: baseY - 98 * this.scale,
      width: 68 * this.scale,
      height: 68 * this.scale
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

MarvelMinigameRuntime.prototype.getResultButtons = function () {
  return {
    restart: {
      x: this.width / 2 - 118 * this.scale,
      y: this.height / 2 + 104 * this.scale,
      width: 236 * this.scale,
      height: 52 * this.scale
    },
    select: {
      x: this.width / 2 - 118 * this.scale,
      y: this.height / 2 + 168 * this.scale,
      width: 236 * this.scale,
      height: 52 * this.scale
    }
  };
};

MarvelMinigameRuntime.prototype.trySelectHeroAt = function (x, y) {
  var rects = this.getHeroCardRects();
  var i;
  for (i = 0; i < rects.length; i += 1) {
    if (utils.rectContainsPoint(rects[i], x, y)) {
      this.heroIndex = i;
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
    this.startLevel();
    return;
  }

  if (utils.rectContainsPoint(buttons.select, x, y)) {
    this.state = 'select';
    this.resetTouchState();
  }
};

MarvelMinigameRuntime.prototype.handleResultMenuTap = function (x, y) {
  var buttons = this.getResultButtons();

  if (utils.rectContainsPoint(buttons.restart, x, y)) {
    this.startLevel();
    return;
  }

  if (utils.rectContainsPoint(buttons.select, x, y)) {
    this.state = 'select';
  }
};

MarvelMinigameRuntime.prototype.startLevel = function () {
  this.hero = Object.assign({}, HEROES[this.heroIndex]);
  this.level = content.createLevelData(this.width, this.height, this.scale);
  this.player = this.createPlayer(this.hero);
  this.enemies = this.level.enemies.map(this.createEnemy, this);
  this.projectiles = [];
  this.effects = [];
  this.cameraX = 0;
  this.elapsedTime = 0;
  this.levelStartedAt = Date.now();
  this.levelResultTime = 0;
  this.transitionMessage = '';
  this.resetTouchState();
  this.state = 'playing';
};

MarvelMinigameRuntime.prototype.createPlayer = function (hero) {
  var spawnX = 96 * this.scale;
  var spawnY = this.level.floorY - hero.bodyHeight;
  return {
    x: spawnX,
    y: spawnY,
    width: hero.bodyWidth * this.scale,
    height: hero.bodyHeight * this.scale,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    maxHealth: hero.maxHealth,
    health: hero.maxHealth,
    invulnerableUntil: 0,
    attackAvailableAt: 0,
    skillAvailableAt: 0,
    ultimateAvailableAt: 0,
    maxAirJumps: hero.maxAirJumps,
    airJumpsRemaining: hero.maxAirJumps,
    dashUntil: 0,
    beamUntil: 0,
    isDead: false,
    beamWidth: 80 * this.scale,
    beamLength: 280 * this.scale
  };
};

MarvelMinigameRuntime.prototype.createEnemy = function (spec) {
  return {
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
    invulnerableUntil: 0,
    isDead: false
  };
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
  if (this.state !== 'playing') {
    return;
  }

  this.elapsedTime += dt;
  this.updatePlayer(dt, now);
  this.updateEnemies(dt, now);
  this.updateProjectiles(dt, now);
  this.updateEffects(dt);
  this.updateCamera(dt);
  this.checkVictory(now);
};

MarvelMinigameRuntime.prototype.updatePlayer = function (dt, now) {
  var player = this.player;
  var hero = this.hero;
  var moveIntent = 0;
  var gravity = hero.gravity * this.scale;
  var targetSpeed = hero.moveSpeed * this.scale;

  if (!player || player.isDead) {
    return;
  }

  if (now < player.dashUntil) {
    player.vy = 0;
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
    player.vy += gravity * dt;
  }

  this.moveBodyWithPlatforms(player, dt);

  if (player.onGround) {
    player.airJumpsRemaining = player.maxAirJumps;
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

  if (body.y > this.height + 200 * this.scale) {
    body.y = this.level.floorY - body.height;
    body.vy = 0;
    body.onGround = true;
    if (body === this.player) {
      this.applyDamageToPlayer(20, Date.now());
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
    return;
  }

  if (player.airJumpsRemaining > 0) {
    player.airJumpsRemaining -= 1;
    player.vy = -hero.jumpSpeed * this.scale * 0.92;
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

  if (hero.basicType === 'ranged') {
    this.spawnPlayerProjectile({
      x: player.facing > 0 ? player.x + player.width + 8 * this.scale : player.x - 20 * this.scale,
      y: player.y + player.height * 0.42,
      vx: player.facing * 640 * this.scale,
      vy: 0,
      width: 20 * this.scale,
      height: 10 * this.scale,
      damage: 18,
      color: hero.glowStyle,
      lifetime: 0.8
    });
    this.pushEffect(player.x + player.width / 2, player.y + 20 * this.scale, hero.glowStyle, 'blast');
    return;
  }

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

  if (hero.key === 'ironman') {
    this.spawnSpreadProjectiles(3, 560 * this.scale, 28, 16, hero.glowStyle);
    this.pushEffect(player.x + player.width / 2, player.y, hero.glowStyle, 'skill');
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
      lifetime: 1.2,
      pierce: 2
    });
    this.pushEffect(player.x + player.width / 2, player.y, hero.glowStyle, 'throw');
    return;
  }

  player.dashUntil = now + 280;
  player.vx = player.facing * 760 * this.scale;
  player.vy = 0;
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

  if (hero.key === 'ironman') {
    player.beamUntil = now + 550;
    this.pushEffect(player.x + player.width / 2, player.y + 10 * this.scale, hero.glowStyle, 'ultimate');
    return;
  }

  if (hero.key === 'thor') {
    this.strikeLightning(hero.glowStyle);
    return;
  }

  this.performGroundSlam(hero.glowStyle);
};

MarvelMinigameRuntime.prototype.spawnSpreadProjectiles = function (count, speed, damage, spreadAngle, color) {
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
      this.applyDamageToEnemy(enemy, damage, Date.now(), color);
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
      this.applyDamageToEnemy(enemy, damage, Date.now(), color);
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
  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead) {
      var centerX = enemy.x + enemy.width / 2;
      var centerY = enemy.y + enemy.height / 2;
      var dx = centerX - impactX;
      var dy = centerY - impactY;
      if ((dx * dx + dy * dy) <= Math.pow(210 * this.scale, 2)) {
        this.applyDamageToEnemy(enemy, 56, Date.now(), color);
      }
    }
  }, this);
};

MarvelMinigameRuntime.prototype.performGroundSlam = function (color) {
  var player = this.player;
  this.pushEffect(player.x + player.width / 2, player.y + player.height, color, 'slam');
  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead) {
      var centerX = enemy.x + enemy.width / 2;
      var centerY = enemy.y + enemy.height / 2;
      var dx = centerX - (player.x + player.width / 2);
      var dy = centerY - (player.y + player.height / 2);
      if ((dx * dx + dy * dy) <= Math.pow(240 * this.scale, 2)) {
        this.applyDamageToEnemy(enemy, 62, Date.now(), color);
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
    team: 'player',
    lifetime: spec.lifetime,
    age: 0,
    pierce: spec.pierce || 0,
    hits: []
  });
};

MarvelMinigameRuntime.prototype.updateEnemies = function (dt, now) {
  var player = this.player;
  var gravity = 2250 * this.scale;

  this.enemies.forEach(function (enemy) {
    if (enemy.isDead) {
      return;
    }

    var distX = player.x - enemy.x;
    var closeEnoughToAttack = Math.abs(distX) < 86 * this.scale
      && Math.abs((player.y + player.height / 2) - (enemy.y + enemy.height / 2)) < 52 * this.scale;

    if (closeEnoughToAttack) {
      enemy.vx = 0;
      enemy.facing = distX >= 0 ? 1 : -1;
      if (now >= enemy.attackAvailableAt) {
        enemy.attackAvailableAt = now + 1100;
        this.tryEnemyAttack(enemy, now);
      }
    } else {
      var chase = Math.abs(distX) < 220 * this.scale;
      if (chase) {
        enemy.facing = distX >= 0 ? 1 : -1;
        enemy.vx = enemy.facing * enemy.speed * this.scale;
      } else {
        if (enemy.x <= enemy.patrolMin) {
          enemy.facing = 1;
        } else if (enemy.x + enemy.width >= enemy.patrolMax) {
          enemy.facing = -1;
        }
        enemy.vx = enemy.facing * enemy.speed * this.scale;
      }
    }

    enemy.vy += gravity * dt;
    this.moveBodyWithPlatforms(enemy, dt);
  }, this);
};

MarvelMinigameRuntime.prototype.tryEnemyAttack = function (enemy, now) {
  var hitbox = {
    x: enemy.facing > 0 ? enemy.x + enemy.width - 4 * this.scale : enemy.x - 56 * this.scale,
    y: enemy.y + 8 * this.scale,
    width: 56 * this.scale,
    height: enemy.height - 16 * this.scale
  };

  this.pushEffect(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height / 2, DANGER, 'enemy');

  if (utils.rectsIntersect(hitbox, this.getPlayerRect())) {
    this.applyDamageToPlayer(enemy.damage, now);
  }
};

MarvelMinigameRuntime.prototype.updateProjectiles = function (dt, now) {
  this.projectiles = this.projectiles.filter(function (projectile) {
    projectile.age += dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (projectile.team === 'player') {
      var i;
      for (i = 0; i < this.enemies.length; i += 1) {
        if (this.enemies[i].isDead) {
          continue;
        }

        if (projectile.hits.indexOf(this.enemies[i]) !== -1) {
          continue;
        }

        if (utils.rectsIntersect(projectile, this.enemies[i])) {
          this.applyDamageToEnemy(this.enemies[i], projectile.damage, now, projectile.color);
          projectile.hits.push(this.enemies[i]);
          if (projectile.pierce > 0) {
            projectile.pierce -= 1;
          } else {
            return false;
          }
        }
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
    return !enemy.isDead;
  }).length;

  if (remaining > 0) {
    this.transitionMessage = 'Defeat the sentries to unlock extraction';
    return;
  }

  this.transitionMessage = 'Extraction point unlocked';

  if (utils.rectsIntersect(this.getPlayerRect(), this.level.exit)) {
    this.state = 'victory';
    this.levelResultTime = now;
    this.resetTouchState();
  }
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
    if (!enemy.isDead && utils.rectsIntersect(beamRect, enemy)) {
      this.applyDamageToEnemy(enemy, 8, now, this.hero.glowStyle);
    }
  }, this);
};

MarvelMinigameRuntime.prototype.applyDamageToEnemy = function (enemy, damage, now, color) {
  if (enemy.isDead || now < enemy.invulnerableUntil) {
    return;
  }

  enemy.health -= damage;
  enemy.invulnerableUntil = now + 160;
  this.pushFloatingText('-' + damage, enemy.x + enemy.width / 2, enemy.y - 8 * this.scale, color || WARNING);

  if (enemy.health <= 0) {
    enemy.isDead = true;
    enemy.vx = 0;
    enemy.vy = 0;
    this.pushEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, color || SUCCESS, 'explode');
  }
};

MarvelMinigameRuntime.prototype.applyDamageToPlayer = function (damage, now) {
  var player = this.player;

  if (!player || player.isDead || now < player.invulnerableUntil) {
    return;
  }

  player.health -= damage;
  player.invulnerableUntil = now + 1000;
  this.pushFloatingText('-' + damage, player.x + player.width / 2, player.y - 12 * this.scale, DANGER);

  if (player.health <= 0) {
    player.health = 0;
    player.isDead = true;
    this.state = 'over';
    this.levelResultTime = now;
    this.resetTouchState();
  }
};

MarvelMinigameRuntime.prototype.pushEffect = function (x, y, color, type) {
  this.effects.push({
    type: type,
    x: x,
    y: y,
    color: color,
    age: 0,
    duration: type === 'ultimate' ? 0.55 : 0.35
  });
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
    return;
  }

  if (this.state === 'select') {
    this.renderCharacterSelect(ctx);
    return;
  }

  this.renderGameplay(ctx);

  if (this.state === 'paused' || this.state === 'paused-system') {
    this.renderPauseOverlay(ctx);
    return;
  }

  if (this.state === 'over') {
    this.renderResultOverlay(ctx, false);
    return;
  }

  if (this.state === 'victory') {
    this.renderResultOverlay(ctx, true);
  }
};

MarvelMinigameRuntime.prototype.renderTitle = function (ctx) {
  var buttonRect = this.getTitleButtonRect();
  var panelWidth = Math.min(520 * this.scale, this.width - 80 * this.scale);

  this.drawBackdrop(ctx);
  utils.drawPanel(ctx, this.width / 2 - panelWidth / 2, this.height * 0.16, panelWidth, 220 * this.scale);

  ctx.save();
  utils.setTextStyle(ctx, 26 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(gameMeta.title, this.width / 2, this.height * 0.28);
  utils.setTextStyle(ctx, 14 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText('Touch-first superhero action platformer', this.width / 2, this.height * 0.34);
  utils.setTextStyle(ctx, 16 * this.scale, null, '#d8deef', 'center', 'middle');
  ctx.fillText('Choose a hero. Move, jump, fight, and clear the first battlefield.', this.width / 2, this.height * 0.42);
  utils.drawButton(ctx, buttonRect, '开始任务', {
    fillStyle: 'rgba(200, 57, 61, 0.92)',
    strokeStyle: 'rgba(255, 244, 228, 0.26)',
    fontSize: 20 * this.scale
  });
  utils.setTextStyle(ctx, 13 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText('Mobile controls are redesigned for WeChat minigame play.', this.width / 2, this.height - 36 * this.scale);
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderCharacterSelect = function (ctx) {
  var rects = this.getHeroCardRects();
  var startRect = this.getSelectStartRect();
  var i;

  this.drawBackdrop(ctx);

  ctx.save();
  utils.setTextStyle(ctx, 24 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText('选择英雄', this.width / 2, 58 * this.scale);
  utils.setTextStyle(ctx, 13 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText('Tap a hero card, then enter the first battlefield.', this.width / 2, 84 * this.scale);

  for (i = 0; i < HEROES.length; i += 1) {
    this.drawHeroCard(ctx, HEROES[i], rects[i], i === this.heroIndex);
  }

  utils.drawButton(ctx, startRect, '进入第 1 关', {
    fillStyle: 'rgba(62, 116, 255, 0.9)',
    strokeStyle: 'rgba(255, 255, 255, 0.18)',
    fontSize: 20 * this.scale
  });
  ctx.restore();
};

MarvelMinigameRuntime.prototype.renderGameplay = function (ctx) {
  this.drawBackdrop(ctx);
  this.drawWorld(ctx);
  this.drawHud(ctx);

  if (this.state === 'playing') {
    this.drawControls(ctx);
  }
};

MarvelMinigameRuntime.prototype.drawBackdrop = function (ctx) {
  var gradient = ctx.createLinearGradient(0, 0, 0, this.height);
  gradient.addColorStop(0, TITLE_BG_TOP);
  gradient.addColorStop(1, TITLE_BG_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, this.width, this.height);

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
  var iconY = rect.y + 54 * this.scale;
  utils.drawPanel(ctx, rect.x, rect.y, rect.width, rect.height, {
    fillStyle: selected ? 'rgba(14, 22, 48, 0.94)' : 'rgba(10, 15, 32, 0.78)',
    strokeStyle: selected ? hero.glowStyle : PANEL_STROKE,
    radius: 22
  });
  this.drawHeroIcon(ctx, hero, rect.x + rect.width / 2, iconY, 1.15);

  ctx.save();
  utils.setTextStyle(ctx, 18 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(hero.name, rect.x + rect.width / 2, rect.y + 104 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, hero.glowStyle, 'center', 'middle');
  ctx.fillText(hero.title, rect.x + rect.width / 2, rect.y + 126 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'center', 'top');
  var lines = utils.wrapText(ctx, hero.description, rect.width - 28 * this.scale);
  lines.slice(0, 3).forEach(function (line, index) {
    ctx.fillText(line, rect.x + rect.width / 2, rect.y + 146 * this.scale + index * 14 * this.scale);
  }, this);
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

  ctx.save();
  ctx.translate(-cameraX, 0);

  for (i = 0; i < this.level.platforms.length; i += 1) {
    platform = this.level.platforms[i];
    ctx.fillStyle = platform.type === 'ground' ? '#4e556a' : '#667089';
    utils.fillRoundRect(ctx, platform.x, platform.y, platform.width, platform.height, 8 * this.scale, ctx.fillStyle);
    utils.strokeRoundRect(ctx, platform.x, platform.y, platform.width, platform.height, 8 * this.scale, 'rgba(255,255,255,0.12)', 2);
  }

  ctx.fillStyle = this.enemies.some(function (enemy) { return !enemy.isDead; }) ? 'rgba(120, 140, 160, 0.35)' : 'rgba(108, 225, 140, 0.26)';
  utils.fillRoundRect(ctx, exit.x, exit.y, exit.width, exit.height, 16 * this.scale, ctx.fillStyle);
  utils.strokeRoundRect(ctx, exit.x, exit.y, exit.width, exit.height, 16 * this.scale, 'rgba(255,255,255,0.18)', 2);

  this.enemies.forEach(function (enemy) {
    if (!enemy.isDead) {
      this.drawEnemy(ctx, enemy);
    }
  }, this);

  this.projectiles.forEach(function (projectile) {
    ctx.fillStyle = projectile.color;
    utils.fillRoundRect(ctx, projectile.x, projectile.y, projectile.width, projectile.height, projectile.height / 2, projectile.color);
  });

  this.drawPlayer(ctx, this.player);

  this.effects.forEach(function (effect) {
    this.drawEffect(ctx, effect);
  }, this);

  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawPlayer = function (ctx, player) {
  if (!player) {
    return;
  }

  var hero = this.hero;
  var flashing = Date.now() < player.invulnerableUntil && Math.floor(Date.now() / 100) % 2 === 0;
  var centerX = player.x + player.width / 2;
  var headY = player.y + 14 * this.scale;

  ctx.save();
  if (flashing) {
    ctx.globalAlpha = 0.45;
  }
  ctx.translate(centerX, player.y);
  ctx.scale(player.facing, 1);

  ctx.fillStyle = hero.primaryStyle;
  utils.fillRoundRect(ctx, -player.width / 2, 18 * this.scale, player.width, player.height - 18 * this.scale, 14 * this.scale, hero.primaryStyle);
  ctx.fillStyle = hero.accentStyle;
  ctx.fillRect(-player.width * 0.18, 30 * this.scale, player.width * 0.36, 20 * this.scale);
  ctx.fillStyle = hero.glowStyle;
  utils.fillRoundRect(ctx, -8 * this.scale, 28 * this.scale, 16 * this.scale, 16 * this.scale, 999, hero.glowStyle);
  ctx.fillStyle = '#f5d0b4';
  utils.fillRoundRect(ctx, -12 * this.scale, 0, 24 * this.scale, 24 * this.scale, 12 * this.scale, '#f5d0b4');

  if (hero.key === 'thor') {
    ctx.fillStyle = '#d64040';
    ctx.fillRect(-player.width / 2 - 10 * this.scale, 22 * this.scale, 12 * this.scale, player.height - 26 * this.scale);
    ctx.fillStyle = hero.glowStyle;
    ctx.fillRect(player.width / 2 - 6 * this.scale, 26 * this.scale, 18 * this.scale, 8 * this.scale);
  } else if (hero.key === 'hulk') {
    ctx.fillStyle = '#472e7f';
    ctx.fillRect(-player.width / 2, player.height - 20 * this.scale, player.width, 20 * this.scale);
  } else {
    ctx.fillStyle = '#f7d352';
    ctx.fillRect(player.width / 2 - 14 * this.scale, 30 * this.scale, 18 * this.scale, 8 * this.scale);
  }

  if (player.beamUntil > Date.now()) {
    ctx.fillStyle = 'rgba(123, 219, 255, 0.68)';
    var beamX = player.facing > 0 ? player.width / 2 : -player.beamLength;
    ctx.fillRect(beamX, 22 * this.scale, player.beamLength, player.beamWidth);
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
  ctx.save();
  ctx.translate(centerX, enemy.y);
  ctx.scale(enemy.facing, 1);
  utils.fillRoundRect(ctx, -enemy.width / 2, 14 * this.scale, enemy.width, enemy.height - 14 * this.scale, 10 * this.scale, '#a4adb9');
  utils.fillRoundRect(ctx, -10 * this.scale, 0, 20 * this.scale, 20 * this.scale, 10 * this.scale, '#d6dbe2');
  utils.fillRoundRect(ctx, 4 * this.scale, 6 * this.scale, 8 * this.scale, 6 * this.scale, 3 * this.scale, '#ff6767');
  ctx.restore();

  var hpWidth = enemy.width;
  var hpRatio = utils.clamp(enemy.health / enemy.maxHealth, 0, 1);
  utils.fillRoundRect(ctx, enemy.x, enemy.y - 10 * this.scale, hpWidth, 6 * this.scale, 999, 'rgba(255,255,255,0.16)');
  utils.fillRoundRect(ctx, enemy.x, enemy.y - 10 * this.scale, hpWidth * hpRatio, 6 * this.scale, 999, DANGER);
};

MarvelMinigameRuntime.prototype.drawEffect = function (ctx, effect) {
  var progress = effect.age / effect.duration;
  var cameraX = this.cameraX;
  var x = effect.x - cameraX;
  var y = effect.y - effect.age * 26 * this.scale;

  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.strokeStyle = effect.color;
  ctx.fillStyle = effect.color;

  if (effect.type === 'text') {
    utils.setTextStyle(ctx, 14 * this.scale, 'bold', effect.color, 'center', 'middle');
    ctx.fillText(effect.label, x, y);
  } else if (effect.type === 'blast' || effect.type === 'skill' || effect.type === 'throw' || effect.type === 'enemy') {
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.arc(x, y, 12 * this.scale + 18 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === 'explode' || effect.type === 'slam') {
    ctx.lineWidth = 4 * this.scale;
    ctx.beginPath();
    ctx.arc(x, y, 18 * this.scale + 36 * this.scale * progress, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.type === 'ultimate') {
    ctx.fillRect(x - 120 * this.scale, y - 10 * this.scale, 240 * this.scale, 20 * this.scale);
  } else if (effect.type === 'lightning') {
    ctx.lineWidth = 5 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x, y - 120 * this.scale);
    ctx.lineTo(x - 18 * this.scale, y - 36 * this.scale);
    ctx.lineTo(x + 8 * this.scale, y - 12 * this.scale);
    ctx.lineTo(x - 6 * this.scale, y + 54 * this.scale);
    ctx.stroke();
  }
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawHud = function (ctx) {
  var player = this.player;
  var hero = this.hero;
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
  ctx.fillText(this.level.name, 36 * this.scale, topY + 42 * this.scale);

  utils.fillRoundRect(ctx, 36 * this.scale, topY + 52 * this.scale, barWidth, 10 * this.scale, 999, 'rgba(255,255,255,0.14)');
  utils.fillRoundRect(ctx, 36 * this.scale, topY + 52 * this.scale, barWidth * hpRatio, 10 * this.scale, 999, hpRatio > 0.35 ? SUCCESS : DANGER);

  utils.setTextStyle(ctx, 14 * this.scale, 'bold', INK, 'right', 'middle');
  ctx.fillText(Math.round(player.health) + '/' + player.maxHealth, 286 * this.scale, topY + 22 * this.scale);
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'right', 'middle');
  ctx.fillText(this.elapsedTime.toFixed(1) + 's', 286 * this.scale, topY + 42 * this.scale);

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

  ctx.save();
  utils.fillRoundRect(ctx, moveZones.left.x, moveZones.left.y, moveZones.left.width, moveZones.left.height, 18 * this.scale, 'rgba(10, 15, 32, 0.38)');
  utils.fillRoundRect(ctx, moveZones.right.x, moveZones.right.y, moveZones.right.width, moveZones.right.height, 18 * this.scale, 'rgba(10, 15, 32, 0.38)');
  utils.setTextStyle(ctx, 20 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText('←', moveZones.left.x + moveZones.left.width / 2, moveZones.left.y + moveZones.left.height / 2);
  ctx.fillText('→', moveZones.right.x + moveZones.right.width / 2, moveZones.right.y + moveZones.right.height / 2);

  this.drawActionButton(ctx, buttons.jump, '跳', ACCENT, 0);
  this.drawActionButton(ctx, buttons.attack, '攻', WARNING, Math.max(0, player.attackAvailableAt - now));
  this.drawActionButton(ctx, buttons.skill, '技', this.hero.glowStyle, Math.max(0, player.skillAvailableAt - now));
  this.drawActionButton(ctx, buttons.ultimate, '绝', DANGER, Math.max(0, player.ultimateAvailableAt - now));
  ctx.restore();
};

MarvelMinigameRuntime.prototype.drawActionButton = function (ctx, rect, label, color, cooldownRemaining) {
  var alpha = cooldownRemaining > 0 ? 0.42 : 0.92;
  utils.fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.width / 2, 'rgba(10, 15, 32, ' + alpha + ')');
  utils.strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.width / 2, color, 2.5);
  utils.setTextStyle(ctx, 18 * this.scale, 'bold', '#ffffff', 'center', 'middle');
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 - 4 * this.scale);
  if (cooldownRemaining > 0) {
    utils.setTextStyle(ctx, 10 * this.scale, null, '#ffffff', 'center', 'middle');
    ctx.fillText(utils.formatCooldown(cooldownRemaining), rect.x + rect.width / 2, rect.y + rect.height / 2 + 12 * this.scale);
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
  var buttons = this.getResultButtons();
  var panelX = this.width / 2 - 200 * this.scale;
  var panelY = this.height / 2 - 170 * this.scale;
  var panelWidth = 400 * this.scale;
  var panelHeight = 260 * this.scale;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.fillRect(0, 0, this.width, this.height);
  utils.drawPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
    fillStyle: 'rgba(8, 13, 28, 0.92)',
    strokeStyle: victory ? 'rgba(108, 225, 140, 0.28)' : 'rgba(255, 118, 100, 0.26)',
    radius: 24
  });
  utils.setTextStyle(ctx, 30 * this.scale, 'bold', INK, 'center', 'middle');
  ctx.fillText(victory ? '任务完成' : '任务失败', this.width / 2, panelY + 52 * this.scale);
  utils.setTextStyle(ctx, 14 * this.scale, null, SOFT_INK, 'center', 'middle');
  ctx.fillText(this.hero.name + ' · ' + this.level.name, this.width / 2, panelY + 84 * this.scale);
  ctx.fillText('生存时间 ' + this.elapsedTime.toFixed(1) + ' 秒', this.width / 2, panelY + 108 * this.scale);

  this.drawSummaryChip(ctx, panelX + 28 * this.scale, panelY + 132 * this.scale, 160 * this.scale, 72 * this.scale, '剩余生命', Math.max(0, Math.round(this.player.health)));
  this.drawSummaryChip(ctx, panelX + 212 * this.scale, panelY + 132 * this.scale, 160 * this.scale, 72 * this.scale, victory ? '关卡状态' : '未完成目标', victory ? '已突破' : '重试');

  utils.drawButton(ctx, buttons.restart, victory ? '再打一局' : '重新开始', {
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
  utils.setTextStyle(ctx, 12 * this.scale, null, SOFT_INK, 'left', 'middle');
  ctx.fillText(label, x + 14 * this.scale, y + 18 * this.scale);
  utils.setTextStyle(ctx, 22 * this.scale, 'bold', INK, 'left', 'middle');
  ctx.fillText(String(value), x + 14 * this.scale, y + height - 20 * this.scale);
};

module.exports = MarvelMinigameRuntime;
