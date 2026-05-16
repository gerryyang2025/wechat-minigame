'use strict';

var utils = require('./utils');
var AudioManager = require('./audio');

var STORAGE_SAVE = 'brick_breaker_save_v1';
var STORAGE_CUSTOM = 'brick_breaker_custom_level_v1';
var SAVE_VERSION = 2;

var WORLD_HEIGHT = 11.4;
var BOARD_WIDTH = 4.86;
var BOARD_LEFT = -BOARD_WIDTH / 2;
var BOARD_RIGHT = BOARD_WIDTH / 2;
var BOARD_TOP = 4.18;
var BOARD_BOTTOM = -4.78;
var COLS = 25;
var ROWS = 34;
var INITIAL_ROWS = 22;
var BRICK_GAP = 0.018;
var BRICK_OUTLINE_INSET = 0.002;
var BRICK_W = BOARD_WIDTH / COLS;
var BRICK_H = BRICK_W;
var PLAY_TOP = BOARD_TOP - BRICK_H;
var PADDLE_Y = -4.22;
var PADDLE_BASE_WIDTH = 1.45;
var BALL_RADIUS = 0.072;
var BALL_SPEED = 5.45;
var BALL_COLLISION_STEP = 0.08;
var BALL_STUCK_TIME = 3.2;
var BALL_STUCK_DISTANCE = 0.48;
var BALL_WALL_LOOP_LIMIT = 14;
var POWER_SPEED = 1.65;
var POWER_CATCH_PADDING_X = 0.26;
var POWER_CATCH_TOP = 0.34;
var POWER_CATCH_BOTTOM = 0.18;
var MAX_BALLS = 32;
var MAX_ACTIVE_POWERUPS = 5;
var MAX_ACTIVE_EFFECTS = 28;
var MAX_RENDER_PIXEL_RATIO = 1.5;
var MAX_UI_PIXEL_RATIO = 2;
var ACTIVE_FRAME_INTERVAL_MS = 1000 / 60;
var IDLE_FRAME_INTERVAL_MS = 1000 / 24;
var FRAME_SKIP_TOLERANCE_MS = 1.5;
var BALL_OUTLINE_RATIO = 1.15;
var BALL_OUTLINE_Z = 0;
var BALL_BODY_Z = 0.018;
var BALL_RENDER_Z = 0.34;
var UI_BUTTON_WIDTH = 188;
var UI_BUTTON_HEIGHT = 42;
var UI_BUTTON_RADIUS = 12;
var UI_BUTTON_SHADOW_X = 4;
var UI_BUTTON_SHADOW_Y = 5;
var UI_BUTTON_STROKE = 2.4;
var UI_SMALL_BUTTON_WIDTH = 118;
var STARTING_LIVES = 3;
var COMPLETE_SLOWMO_DURATION = 1.05;
var COMPLETE_SLOWMO_SCALE = 0.22;
var COMPLETE_SCORE_BONUS = 200;

var BRICK_COLORS = {
  green: 0x4fbd73,
  blue: 0x1479ff,
  gold: 0xffb000,
  violet: 0x8a2cff,
  crimson: 0xff2f2f,
  pink: 0xff4fd8,
  wall: 0xc4c0b7
};

var GREEN_BRICK_COLORS = [
  0x4fbd73,
  0x58c47a,
  0x43ae68,
  0x66c987,
  0x49b570
];

var POWER_TYPES = ['split', 'heavy', 'shotgun', 'bomb', 'laser'];
var POWER_LABELS = {
  split: '分裂',
  heavy: '重弹',
  shotgun: '霰弹',
  bomb: '炸弹',
  laser: '激光'
};

var POWER_SHORT_LABELS = {
  split: '分',
  heavy: '重',
  shotgun: '霰',
  bomb: '爆',
  laser: '光'
};

var POWER_CSS_COLORS = {
  split: '#47f281',
  heavy: '#ffb13d',
  shotgun: '#75a3ff',
  bomb: '#ff4f40',
  laser: '#6ff6ff'
};

var BRICK_POWER_BY_COLOR = {
  blue: 'split',
  gold: 'heavy',
  violet: 'shotgun',
  crimson: 'bomb',
  pink: 'laser'
};

var SKILL_BRICK_ORDER = ['blue', 'gold', 'violet', 'crimson', 'pink'];

function noop() {}

function clearGroup(group) {
  if (!group || !group.children) {
    return;
  }
  while (group.children.length) {
    group.remove(group.children[0]);
  }
}

function isPowerOfTwo(value) {
  return value > 0 && (value & (value - 1)) === 0;
}

function isFilteredThreeWarning(args) {
  var text = Array.prototype.slice.call(args).join(' ');
  return text.indexOf('EXT_blend_minmax extension not supported') >= 0 ||
    text.indexOf('OES_vertex_array_object extension not supported') >= 0;
}

function withFilteredThreeWarnings(work) {
  var originalWarn;
  if (typeof console === 'undefined' || !console.warn) {
    return work();
  }
  originalWarn = console.warn;
  console.warn = function () {
    if (isFilteredThreeWarning(arguments)) {
      return;
    }
    return originalWarn.apply(console, arguments);
  };
  try {
    return work();
  } finally {
    console.warn = originalWarn;
  }
}

function circleRect(ball, rect) {
  var closestX = utils.clamp(ball.x, rect.x - rect.w / 2, rect.x + rect.w / 2);
  var closestY = utils.clamp(ball.y, rect.y - rect.h / 2, rect.y + rect.h / 2);
  var dx = ball.x - closestX;
  var dy = ball.y - closestY;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

function getPenetrationNormal(ball, rect) {
  var dx = ball.x - rect.x;
  var dy = ball.y - rect.y;
  var overlapX = rect.w / 2 + ball.r - Math.abs(dx);
  var overlapY = rect.h / 2 + ball.r - Math.abs(dy);
  if (Math.abs(overlapX - overlapY) < 0.00001) {
    if (Math.abs(ball.vx || 0) >= Math.abs(ball.vy || 0)) {
      return { x: (ball.vx || dx) > 0 ? -1 : 1, y: 0 };
    }
    return { x: 0, y: (ball.vy || dy) > 0 ? -1 : 1 };
  }
  if (overlapX < overlapY) {
    return { x: dx < 0 || (dx === 0 && ball.vx > 0) ? -1 : 1, y: 0 };
  }
  return { x: 0, y: dy < 0 || (dy === 0 && ball.vy > 0) ? -1 : 1 };
}

function sweptCircleRect(ball, rect) {
  var prevX = ball.prevX;
  var prevY = ball.prevY;
  var dx;
  var dy;
  var xMin;
  var xMax;
  var yMin;
  var yMax;
  var txEntry;
  var txExit;
  var tyEntry;
  var tyExit;
  var tEntry;
  var tExit;
  var normal;
  if (prevX === undefined || prevY === undefined) {
    return circleRect(ball, rect) ? { x: ball.x, y: ball.y, t: 1, normal: getPenetrationNormal(ball, rect) } : null;
  }
  dx = ball.x - prevX;
  dy = ball.y - prevY;
  if (Math.abs(dx) < 0.00001 && Math.abs(dy) < 0.00001) {
    return circleRect(ball, rect) ? { x: ball.x, y: ball.y, t: 1, normal: getPenetrationNormal(ball, rect) } : null;
  }
  xMin = rect.x - rect.w / 2 - ball.r;
  xMax = rect.x + rect.w / 2 + ball.r;
  yMin = rect.y - rect.h / 2 - ball.r;
  yMax = rect.y + rect.h / 2 + ball.r;
  if (Math.abs(dx) < 0.00001) {
    if (prevX < xMin || prevX > xMax) {
      return circleRect(ball, rect) ? { x: ball.x, y: ball.y, t: 1, normal: getPenetrationNormal(ball, rect) } : null;
    }
    txEntry = -Infinity;
    txExit = Infinity;
  } else if (dx > 0) {
    txEntry = (xMin - prevX) / dx;
    txExit = (xMax - prevX) / dx;
  } else {
    txEntry = (xMax - prevX) / dx;
    txExit = (xMin - prevX) / dx;
  }
  if (Math.abs(dy) < 0.00001) {
    if (prevY < yMin || prevY > yMax) {
      return circleRect(ball, rect) ? { x: ball.x, y: ball.y, t: 1, normal: getPenetrationNormal(ball, rect) } : null;
    }
    tyEntry = -Infinity;
    tyExit = Infinity;
  } else if (dy > 0) {
    tyEntry = (yMin - prevY) / dy;
    tyExit = (yMax - prevY) / dy;
  } else {
    tyEntry = (yMax - prevY) / dy;
    tyExit = (yMin - prevY) / dy;
  }
  tEntry = Math.max(txEntry, tyEntry);
  tExit = Math.min(txExit, tyExit);
  if (tEntry > tExit || tExit < 0 || tEntry > 1) {
    return circleRect(ball, rect) ? { x: ball.x, y: ball.y, t: 1, normal: getPenetrationNormal(ball, rect) } : null;
  }
  if (tEntry < 0) {
    return { x: ball.x, y: ball.y, t: 0, normal: getPenetrationNormal(ball, rect) };
  }
  normal = txEntry > tyEntry ? { x: dx > 0 ? -1 : 1, y: 0 } : { x: 0, y: dy > 0 ? -1 : 1 };
  return {
    x: prevX + dx * tEntry,
    y: prevY + dy * tEntry,
    t: tEntry,
    normal: normal
  };
}

function BrickBreakerRuntime(options) {
  options = options || {};
  this.canvas = options.canvas || null;
  this.THREE = options.THREE || null;
  this.width = options.width || 430;
  this.height = options.height || 932;
  this.runtimeInfo = options.runtimeInfo || {};
  this.devicePixelRatio = options.devicePixelRatio || (this.runtimeInfo.windowInfo && this.runtimeInfo.windowInfo.pixelRatio) || options.pixelRatio || 1;
  this.pixelRatio = Math.min(options.pixelRatio || this.devicePixelRatio, MAX_RENDER_PIXEL_RATIO);
  this.uiPixelRatio = Math.max(this.pixelRatio, Math.min(this.devicePixelRatio, MAX_UI_PIXEL_RATIO));
  this.headless = !!options.headless;
  this.elapsed = 0;
  this.lastTime = 0;
  this.lastFrameMs = 0;
  this.running = false;
  this.frameHandle = null;

  this.audio = new AudioManager();
  this.touchRects = {};
  this.touchMode = 'idle';
  this.touchStart = null;
  this.aimPoint = null;
  this.aimActive = false;
  this.helpReturnState = 'title';
  this.message = '';
  this.messageUntil = 0;
  this.completionDelay = 0;
  this.completionDelayTotal = COMPLETE_SLOWMO_DURATION;
  this.completionBrick = null;

  this.level = 1;
  this.score = 0;
  this.bestScore = 0;
  this.lives = STARTING_LIVES;
  this.xp = 0;
  this.xpNeed = 80;
  this.cannonBaseLevel = 1;
  this.cannonLevel = 1;
  this.upgradeReady = false;
  this.currentRunCustom = false;
  this.runStats = this.createRunStats();
  this.customDesign = null;
  this.editorTool = 'green';
  this.editorGrid = [];

  this.state = 'title';
  this.bricks = [];
  this.brickGrid = [];
  this.balls = [];
  this.pendingBalls = [];
  this.powerups = [];
  this.effects = [];
  this.nextId = 1;
  this.readyToShoot = true;
  this.heavyTimer = 0;
  this.ballArmy = 1;
  this.ballDamage = 1;
  this.paddle = {
    x: 0,
    y: PADDLE_Y,
    w: PADDLE_BASE_WIDTH,
    h: 0.16
  };

  this.renderer = null;
  this.scene = null;
  this.camera = null;
  this.paperTexture = null;
  this.comicInkTexture = null;
  this.powerIconTextures = {};
  this.powerIconMaterials = {};
  this.viewWidth = WORLD_HEIGHT * this.width / this.height;
  this.worldGroup = null;
  this.brickGroup = null;
  this.ballGroup = null;
  this.powerGroup = null;
  this.effectGroup = null;
  this.paddleMesh = null;
  this.borderGroup = null;
  this.uiCanvas = null;
  this.uiCtx = null;
  this.uiTexture = null;
  this.uiScene = null;
  this.uiCamera = null;
  this.uiSprite = null;
  this.materials = {};
  this.geometries = {};
  this.brickMaterials = {};
  this.bricksDirty = true;
  this.uiDirty = true;
  this.lastUiFrameKey = '';
  this.collisionCandidates = [];
}

BrickBreakerRuntime.prototype.init = function () {
  this.loadSave();
  this.resetEditorGrid();
  if (!this.headless) {
    this.setupThree();
  }
  this.resetTitlePreview();
  if (!this.headless) {
    this.start();
  }
};

BrickBreakerRuntime.prototype.loadSave = function () {
  var custom = utils.safeGetStorage(STORAGE_CUSTOM, null);
  this.resetGameProgress();
  if (custom && typeof custom === 'object' && custom.cells) {
    this.customDesign = custom;
  }
};

BrickBreakerRuntime.prototype.resetGameProgress = function () {
  this.bestScore = 0;
  this.xp = 0;
  this.xpNeed = 80;
  this.cannonBaseLevel = 1;
  this.resetCannonForRun();
};

BrickBreakerRuntime.prototype.saveProgress = function () {
  utils.safeSetStorage(STORAGE_SAVE, {
    version: SAVE_VERSION,
    bestScore: 0,
    cannonBaseLevel: 1,
    xp: 0,
    xpNeed: 80
  });
};

BrickBreakerRuntime.prototype.resetCannonForRun = function () {
  this.cannonLevel = Math.max(1, this.cannonBaseLevel || 1);
  this.ballArmy = Math.max(1, this.cannonLevel);
  this.ballDamage = 1 + Math.floor((this.cannonLevel - 1) / 2);
  this.heavyTimer = 0;
  this.upgradeReady = this.xp >= this.xpNeed;
  if (this.paddle) {
    this.paddle.w = Math.min(2.0, PADDLE_BASE_WIDTH + (this.cannonLevel - 1) * 0.06);
  }
};

BrickBreakerRuntime.prototype.setupThree = function () {
  var self = this;
  var THREE = this.THREE;
  var board;
  var boardPanel;
  var ui;
  var light;

  this.viewWidth = WORLD_HEIGHT * this.width / this.height;
  this.renderer = withFilteredThreeWarnings(function () {
    return new THREE.WebGLRenderer({
      canvas: self.canvas,
      antialias: false,
      alpha: false
    });
  });
  this.renderer.setPixelRatio(this.pixelRatio);
  this.renderer.setSize(this.width, this.height, false);
  this.renderer.setClearColor(0xf2e4c8, 1);
  this.renderer.sortObjects = false;
  if (THREE.LinearSRGBColorSpace) {
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  }

  this.scene = new THREE.Scene();
  this.camera = new THREE.OrthographicCamera(-this.viewWidth / 2, this.viewWidth / 2, WORLD_HEIGHT / 2, -WORLD_HEIGHT / 2, 0.1, 50);
  this.camera.position.set(0, 0, 12);
  this.camera.lookAt(0, 0, 0);

  this.worldGroup = new THREE.Group();
  this.scene.add(this.worldGroup);

  this.paperTexture = this.createPaperTexture(128, 128);
  this.comicInkTexture = this.createComicInkTexture(96, 96);
  this.createSharedGeometries();

  this.materials.background = new THREE.MeshBasicMaterial({ color: 0xffffff, map: this.paperTexture });
  this.materials.panel = new THREE.MeshBasicMaterial({ color: 0x17181d });
  this.materials.rail = new THREE.MeshBasicMaterial({ color: 0x111111 });
  this.materials.paddle = new THREE.MeshBasicMaterial({ color: 0xffef5a, map: this.comicInkTexture });
  this.materials.paddleGlow = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.82 });
  this.materials.ball = new THREE.MeshBasicMaterial({ color: 0xffffff });
  this.materials.heavyBall = new THREE.MeshBasicMaterial({ color: 0xffb129, map: this.comicInkTexture });
  this.materials.power = new THREE.MeshBasicMaterial({ color: 0xffb23d });
  this.materials.ink = new THREE.MeshBasicMaterial({ color: 0x050505 });
  this.materials.edge = new THREE.LineBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.92 });
  this.materials.shadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 });
  this.createBrickMaterials();

  board = new THREE.Mesh(new THREE.PlaneGeometry(this.viewWidth, WORLD_HEIGHT), this.materials.background);
  board.position.z = -0.35;
  this.scene.add(board);

  boardPanel = new THREE.Mesh(new THREE.BoxGeometry(BOARD_WIDTH + 0.22, BOARD_TOP - BOARD_BOTTOM + 0.22, 0.08), this.materials.panel);
  boardPanel.position.set(0, (BOARD_TOP + BOARD_BOTTOM) / 2, -0.24);
  this.worldGroup.add(boardPanel);

  this.borderGroup = new THREE.Group();
  this.worldGroup.add(this.borderGroup);
  this.createBorderMesh(BOARD_LEFT - 0.09, (BOARD_TOP + BOARD_BOTTOM) / 2, 0.14, BOARD_TOP - BOARD_BOTTOM + 0.28);
  this.createBorderMesh(BOARD_RIGHT + 0.09, (BOARD_TOP + BOARD_BOTTOM) / 2, 0.14, BOARD_TOP - BOARD_BOTTOM + 0.28);
  this.createBorderMesh(0, BOARD_TOP + 0.09, BOARD_WIDTH + 0.36, 0.14);

  light = new THREE.DirectionalLight(0xffffff, 0.75);
  light.position.set(0, 0, 8);
  this.scene.add(light);
  this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  this.brickGroup = new THREE.Group();
  this.ballGroup = new THREE.Group();
  this.powerGroup = new THREE.Group();
  this.effectGroup = new THREE.Group();
  this.worldGroup.add(this.brickGroup);
  this.worldGroup.add(this.ballGroup);
  this.worldGroup.add(this.powerGroup);
  this.worldGroup.add(this.effectGroup);

  this.paddleMesh = this.createPaddleMesh();
  this.worldGroup.add(this.paddleMesh);

  ui = utils.createCanvas(this.width, this.height, this.uiPixelRatio);
  this.uiCanvas = ui.canvas;
  this.uiCtx = ui.ctx;
  this.uiTexture = new THREE.CanvasTexture(this.uiCanvas);
  if (THREE.LinearSRGBColorSpace) {
    this.uiTexture.colorSpace = THREE.LinearSRGBColorSpace;
  }
  this.uiTexture.generateMipmaps = false;
  this.uiTexture.minFilter = THREE.LinearFilter;
  this.uiTexture.magFilter = THREE.LinearFilter;
  this.uiScene = new THREE.Scene();
  this.uiCamera = new THREE.OrthographicCamera(0, this.width, this.height, 0, -10, 10);
  this.uiSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: this.uiTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  }));
  this.uiSprite.position.set(this.width / 2, this.height / 2, 0);
  this.uiSprite.scale.set(this.width, this.height, 1);
  this.uiScene.add(this.uiSprite);
};

BrickBreakerRuntime.prototype.createSharedGeometries = function () {
  var THREE = this.THREE;
  var brickW = BRICK_W - BRICK_GAP;
  var brickH = BRICK_H - BRICK_GAP;
  var outlineW = BRICK_W - BRICK_OUTLINE_INSET;
  var outlineH = BRICK_H - BRICK_OUTLINE_INSET;
  this.geometries.brick = new THREE.BoxGeometry(brickW, brickH, 0.22);
  this.geometries.brickOutline = new THREE.BoxGeometry(outlineW, outlineH, 0.2);
  this.geometries.ball = new THREE.CircleGeometry(BALL_RADIUS, 28);
  this.geometries.ballInk = new THREE.CircleGeometry(BALL_RADIUS * BALL_OUTLINE_RATIO, 28);
  this.geometries.heavyBall = new THREE.CircleGeometry(BALL_RADIUS * 1.18, 28);
  this.geometries.heavyBallInk = new THREE.CircleGeometry(BALL_RADIUS * 1.18 * BALL_OUTLINE_RATIO, 28);
  this.geometries.power = new THREE.PlaneGeometry(0.46, 0.46);
  this.geometries.brickPowerIcon = new THREE.PlaneGeometry(BRICK_W * 1.5, BRICK_H * 1.5);
  this.geometries.ring = new THREE.RingGeometry(0.12, 0.18, 14);
  this.geometries.erasePuff = new THREE.CircleGeometry(1, 8);
  this.geometries.eraseLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.18, -0.02, 0.01),
    new THREE.Vector3(0.18, 0.04, 0.01),
    new THREE.Vector3(-0.11, 0.13, 0.01),
    new THREE.Vector3(0.12, -0.14, 0.01)
  ]);
};

BrickBreakerRuntime.prototype.createBrickMaterials = function () {
  var key;
  var i;
  this.brickMaterials = {};
  for (key in BRICK_COLORS) {
    if (Object.prototype.hasOwnProperty.call(BRICK_COLORS, key)) {
      this.brickMaterials[key] = new this.THREE.MeshBasicMaterial({
        color: BRICK_COLORS[key],
        map: this.comicInkTexture
      });
    }
  }
  for (i = 0; i < GREEN_BRICK_COLORS.length; i += 1) {
    this.brickMaterials['green:' + i] = new this.THREE.MeshBasicMaterial({
      color: GREEN_BRICK_COLORS[i],
      map: this.comicInkTexture
    });
  }
};

BrickBreakerRuntime.prototype.getBrickMaterial = function (brick) {
  if (brick && brick.colorKey === 'green') {
    return this.brickMaterials['green:' + (brick.toneIndex || 0)] || this.brickMaterials.green;
  }
  return this.brickMaterials[brick.colorKey] || this.brickMaterials.green;
};

BrickBreakerRuntime.prototype.createCanvasTexture = function (width, height, draw) {
  var THREE = this.THREE;
  var surface = utils.createCanvas(width, height, 1);
  var texture;
  var repeatable = isPowerOfTwo(width) && isPowerOfTwo(height);
  if (surface.ctx && draw) {
    draw(surface.ctx, width, height);
  }
  texture = new THREE.CanvasTexture(surface.canvas);
  if (THREE.LinearSRGBColorSpace) {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
  }
  texture.generateMipmaps = repeatable;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = repeatable ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeatable ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return texture;
};

BrickBreakerRuntime.prototype.createPaperTexture = function (width, height) {
  return this.createCanvasTexture(width, height, function (ctx, w, h) {
    var i;
    var x;
    var y;
    ctx.fillStyle = '#f3e5ca';
    ctx.fillRect(0, 0, w, h);
    for (i = 0; i < 260; i += 1) {
      x = (i * 37) % w;
      y = (i * 61) % h;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(70,43,20,0.10)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, 1 + (i % 2), 1);
    }
    ctx.strokeStyle = 'rgba(59,42,25,0.08)';
    ctx.lineWidth = 1;
    for (i = -h; i < w; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
  });
};

BrickBreakerRuntime.prototype.createComicInkTexture = function (width, height) {
  return this.createCanvasTexture(width, height, function (ctx, w, h) {
    var i;
    var y;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 2;
    for (i = -h; i < w; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.quadraticCurveTo(i + h * 0.5, h * 0.45 + (i % 9), i + h, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3;
    for (y = 8; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + ((y / 2) % 5) - 2);
      ctx.stroke();
    }
  });
};

BrickBreakerRuntime.prototype.createBorderMesh = function (x, y, w, h) {
  var mesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(w, h, 0.18), this.materials.rail);
  mesh.position.set(x, y, 0);
  this.borderGroup.add(mesh);
  return mesh;
};

BrickBreakerRuntime.prototype.createPaddleMesh = function () {
  var THREE = this.THREE;
  var group = new THREE.Group();
  var glow = new THREE.Mesh(new THREE.BoxGeometry(this.paddle.w + 0.25, this.paddle.h + 0.12, 0.05), this.materials.paddleGlow);
  var body = new THREE.Mesh(new THREE.BoxGeometry(this.paddle.w, this.paddle.h, 0.22), this.materials.paddle);
  glow.position.z = -0.04;
  body.position.z = 0.08;
  group.add(glow);
  group.add(body);
  group.userData = {
    body: body,
    glow: glow
  };
  return group;
};

BrickBreakerRuntime.prototype.resetTitlePreview = function () {
  this.state = 'title';
  this.completionDelay = 0;
  this.completionBrick = null;
  this.resetGameProgress();
  this.level = 1;
  this.score = 0;
  this.lives = STARTING_LIVES;
  this.currentRunCustom = false;
  this.clearActiveEntities(true);
  this.resetCannonForRun();
  this.resetRunStats(false);
  this.readyToShoot = true;
  this.generateLevel(1, false);
  this.syncScene();
};

BrickBreakerRuntime.prototype.createRunStats = function () {
  return {
    score: 0,
    bricks: 0,
    powers: 0,
    xp: 0,
    shots: 0,
    startLevel: this.cannonLevel || 1,
    endLevel: this.cannonLevel || 1,
    completed: false,
    custom: false
  };
};

BrickBreakerRuntime.prototype.resetRunStats = function (useCustom) {
  this.runStats = this.createRunStats();
  this.runStats.custom = !!useCustom;
  this.runStats.startLevel = Math.max(1, this.cannonLevel || 1);
};

BrickBreakerRuntime.prototype.startRun = function (useCustom) {
  this.state = 'playing';
  this.completionDelay = 0;
  this.completionBrick = null;
  this.resetGameProgress();
  this.level = 1;
  this.score = 0;
  this.lives = STARTING_LIVES;
  this.currentRunCustom = !!useCustom;
  this.clearActiveEntities(true);
  this.readyToShoot = true;
  this.paddle.x = 0;
  this.resetRunStats(!!useCustom);
  this.generateLevel(1, !!useCustom);
  this.setMessage(useCustom ? '挑战自定义关卡' : '默认练习关卡', 1.6);
  this.audio.playClick();
  this.audio.playBgm();
  this.syncScene();
};

BrickBreakerRuntime.prototype.generateLevel = function (level, useCustom) {
  var r;
  var c;
  var type;
  var hp;
  var cells;
  var skillPlan;
  this.clearBrickMeshes();
  this.bricks = [];
  this.resetBrickGrid();
  if (useCustom && this.customDesign && this.customDesign.cells) {
    cells = this.customDesign.cells;
    for (r = 0; r < ROWS; r += 1) {
      for (c = 0; c < COLS; c += 1) {
        type = cells[r] && cells[r][c] ? cells[r][c] : '';
        if (type) {
          hp = type === 'wall' ? 999 : Math.max(1, Math.ceil(level / 2));
          this.addBrick(c, r, type, hp, type === 'wall');
        }
      }
    }
    return;
  }

  skillPlan = this.planInitialSkillBricks(level);
  for (r = 0; r < INITIAL_ROWS; r += 1) {
    for (c = 0; c < COLS; c += 1) {
      if (this.shouldPlaceWallBrick(c, r)) {
        this.addBrick(c, r, 'wall', 999, true);
      } else if (this.shouldLeaveStarterGap(c, r, level)) {
        continue;
      } else {
        type = skillPlan[r + ':' + c] || 'green';
        hp = 1;
        this.addBrick(c, r, type, hp, false);
      }
    }
  }
};

BrickBreakerRuntime.prototype.getInitialSkillQuota = function (level) {
  return {
    blue: 1,
    gold: 1,
    violet: 1,
    crimson: 1,
    pink: 1
  };
};

BrickBreakerRuntime.prototype.planInitialSkillBricks = function (level) {
  var quota = this.getInitialSkillQuota(level);
  var plan = {};
  var i;
  var key;
  var cell;
  for (i = 0; i < SKILL_BRICK_ORDER.length; i += 1) {
    key = SKILL_BRICK_ORDER[i];
    while (quota[key] > 0) {
      cell = this.findSkillCell(level, key, quota[key], plan, true) || this.findSkillCell(level, key, quota[key], plan, false);
      if (!cell) {
        break;
      }
      plan[cell.row + ':' + cell.col] = key;
      quota[key] -= 1;
    }
  }
  return plan;
};

BrickBreakerRuntime.prototype.findSkillCell = function (level, key, salt, plan, requireSpacing) {
  var best = null;
  var bestScore = 9999;
  var r;
  var c;
  var score;
  for (r = 3; r < INITIAL_ROWS - 3; r += 1) {
    for (c = 2; c < COLS - 2; c += 1) {
      if (!this.canUseSkillCell(c, r, level, plan, requireSpacing)) {
        continue;
      }
      score = (c * 97 + r * 57 + level * 31 + salt * 43 + key.length * 19) % 997;
      if (score < bestScore) {
        bestScore = score;
        best = { col: c, row: r };
      }
    }
  }
  return best;
};

BrickBreakerRuntime.prototype.canUseSkillCell = function (col, row, level, plan, requireSpacing) {
  var id = row + ':' + col;
  var key;
  var parts;
  var otherRow;
  var otherCol;
  if (plan[id] || this.shouldPlaceWallBrick(col, row) || this.shouldLeaveStarterGap(col, row, level)) {
    return false;
  }
  if (!requireSpacing) {
    return true;
  }
  for (key in plan) {
    if (Object.prototype.hasOwnProperty.call(plan, key)) {
      parts = key.split(':');
      otherRow = parseInt(parts[0], 10);
      otherCol = parseInt(parts[1], 10);
      if (Math.abs(otherRow - row) + Math.abs(otherCol - col) < 8) {
        return false;
      }
    }
  }
  return true;
};

BrickBreakerRuntime.prototype.shouldPlaceWallBrick = function (col, row) {
  if (row === 0 || col === 0 || col === COLS - 1) {
    return true;
  }
  if ((row === 10 && col >= 7 && col <= 15) || (row === 11 && col === 7) || (row === 12 && col >= 4 && col <= 7)) {
    return true;
  }
  if (row === INITIAL_ROWS - 1 && ((col >= 2 && col <= 7) || (col >= 14 && col <= 22))) {
    return true;
  }
  return false;
};

BrickBreakerRuntime.prototype.shouldLeaveStarterGap = function (col, row, level) {
  var value = (col * 37 + row * 23 + level * 11) % 100;
  if (row > 14 && row < INITIAL_ROWS - 1 && value < 12) {
    return true;
  }
  if (row > 6 && row < 14 && col > 9 && col < 14 && value < 48) {
    return true;
  }
  return false;
};

BrickBreakerRuntime.prototype.addBrick = function (col, row, colorKey, hp, wall) {
  var brick = {
    id: 'brick-' + this.nextId,
    col: col,
    row: row,
    x: BOARD_LEFT + BRICK_W * (col + 0.5),
    y: BOARD_TOP - BRICK_H * (row + 0.5),
    w: BRICK_W - BRICK_GAP,
    h: BRICK_H - BRICK_GAP,
    colorKey: colorKey,
    hp: hp,
    maxHp: hp,
    wall: !!wall,
    mesh: null,
    outline: null,
    edge: null,
    toneIndex: colorKey === 'green' ? (col * 5 + row * 3) % GREEN_BRICK_COLORS.length : 0,
    pulse: 0
  };
  this.bricks.push(brick);
  this.setBrickGridCell(row, col, brick);
  this.bricksDirty = true;
  this.nextId += 1;
};

BrickBreakerRuntime.prototype.resetBrickGrid = function () {
  var r;
  this.brickGrid = [];
  for (r = 0; r < ROWS; r += 1) {
    this.brickGrid[r] = [];
  }
};

BrickBreakerRuntime.prototype.setBrickGridCell = function (row, col, brick) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return;
  }
  if (!this.brickGrid[row]) {
    this.brickGrid[row] = [];
  }
  this.brickGrid[row][col] = brick || null;
};

BrickBreakerRuntime.prototype.clearBrickFromGrid = function (brick) {
  if (!brick) {
    return;
  }
  if (this.brickGrid[brick.row] && this.brickGrid[brick.row][brick.col] === brick) {
    this.brickGrid[brick.row][brick.col] = null;
  }
};

BrickBreakerRuntime.prototype.clearBrickMeshes = function () {
  if (this.brickGroup) {
    clearGroup(this.brickGroup);
  }
  this.bricksDirty = true;
};

BrickBreakerRuntime.prototype.clearBrickMesh = function (brick) {
  if (!brick || !this.brickGroup) {
    return;
  }
  if (brick.mesh) {
    this.brickGroup.remove(brick.mesh);
    brick.mesh = null;
  }
  if (brick.outline) {
    this.brickGroup.remove(brick.outline);
    brick.outline = null;
  }
  if (brick.edge) {
    this.brickGroup.remove(brick.edge);
    brick.edge = null;
  }
  if (brick.powerIcon) {
    this.brickGroup.remove(brick.powerIcon);
    brick.powerIcon = null;
  }
  this.bricksDirty = true;
};

BrickBreakerRuntime.prototype.cloneMaterialForFinalClear = function (mesh) {
  if (!mesh || !mesh.material || mesh.userData && mesh.userData.finalClearMaterial) {
    return;
  }
  mesh.userData = mesh.userData || {};
  mesh.material = mesh.material.clone();
  mesh.material.transparent = true;
  mesh.material.opacity = 1;
  mesh.material.depthWrite = false;
  mesh.userData.finalClearMaterial = true;
};

BrickBreakerRuntime.prototype.prepareFinalBrickVisual = function (brick) {
  if (!brick) {
    return;
  }
  brick.finalClear = true;
  brick.finalClearSeed = (brick.col * 17 + brick.row * 31) % 11;
  brick.finalClearBaseScale = 1 + (brick.pulse || 0) * 0.08;
  this.completionBrick = brick;
  this.cloneMaterialForFinalClear(brick.mesh);
  this.cloneMaterialForFinalClear(brick.outline);
  this.cloneMaterialForFinalClear(brick.edge);
  this.cloneMaterialForFinalClear(brick.powerIcon);
  this.bricksDirty = true;
};

BrickBreakerRuntime.prototype.setFinalClearOpacity = function (mesh, opacity) {
  if (mesh && mesh.material && mesh.material.transparent) {
    mesh.material.opacity = opacity;
  }
};

BrickBreakerRuntime.prototype.syncFinalClearingBrick = function (brick) {
  var total = this.completionDelayTotal || COMPLETE_SLOWMO_DURATION;
  var progress = 1 - utils.clamp(this.completionDelay / total, 0, 1);
  var ease = progress * progress * (3 - progress * 2);
  var baseScale = brick.finalClearBaseScale || 1;
  var wobble = Math.sin((progress * 16 + (brick.finalClearSeed || 0)) * Math.PI) * (1 - progress) * 0.08;
  var shrink = Math.max(0.08, baseScale * (1 - ease * 0.82));
  var stretch = 1 + Math.sin(progress * Math.PI) * 0.16;
  var opacity = utils.clamp(1 - Math.max(0, progress - 0.18) / 0.72, 0, 1);
  var zLift = progress * 0.1;
  var angle = wobble + progress * 0.22;
  if (brick.outline) {
    brick.outline.position.set(brick.x, brick.y, brick.wall ? 0.035 + zLift : 0.055 + zLift);
    brick.outline.rotation.z = angle;
    brick.outline.scale.set(shrink * stretch, shrink * (1 - ease * 0.38), 1);
    this.setFinalClearOpacity(brick.outline, opacity * 0.78);
  }
  if (brick.mesh) {
    brick.mesh.position.set(brick.x + wobble * 0.12, brick.y + progress * 0.05, brick.wall ? 0.05 + zLift : 0.08 + zLift);
    brick.mesh.rotation.z = angle;
    brick.mesh.scale.set(shrink * stretch, shrink * (1 - ease * 0.42), Math.max(0.04, 1 - ease * 0.8));
    this.setFinalClearOpacity(brick.mesh, opacity);
  }
  if (brick.powerIcon) {
    brick.powerIcon.position.set(brick.x + wobble * 0.14, brick.y + progress * 0.06, 0.18 + zLift);
    brick.powerIcon.rotation.z = angle;
    brick.powerIcon.scale.set(shrink * stretch, shrink * (1 - ease * 0.42), 1);
    this.setFinalClearOpacity(brick.powerIcon, opacity);
  }
};

BrickBreakerRuntime.prototype.getBreakableCount = function () {
  var i;
  var count = 0;
  for (i = 0; i < this.bricks.length; i += 1) {
    if (!this.bricks[i].wall && this.bricks[i].hp > 0) {
      count += 1;
    }
  }
  return count;
};

BrickBreakerRuntime.prototype.screenToWorld = function (x, y) {
  return {
    x: (x / this.width - 0.5) * this.viewWidth,
    y: (0.5 - y / this.height) * WORLD_HEIGHT
  };
};

BrickBreakerRuntime.prototype.worldToScreen = function (x, y) {
  return {
    x: (x / this.viewWidth + 0.5) * this.width,
    y: (0.5 - y / WORLD_HEIGHT) * this.height
  };
};

BrickBreakerRuntime.prototype.getBoardMetrics = function () {
  return {
    viewWidth: this.viewWidth,
    boardWidth: BOARD_WIDTH,
    boardLeft: BOARD_LEFT,
    boardRight: BOARD_RIGHT,
    cols: COLS,
    rows: ROWS,
    initialRows: INITIAL_ROWS,
    playTop: PLAY_TOP,
    brickWidth: BRICK_W,
    brickHeight: BRICK_H,
    brickGap: BRICK_GAP
  };
};

BrickBreakerRuntime.prototype.handleTouchStart = function (event) {
  var point = utils.getTouchPoint(event);
  var key;
  this.audio.resume();
  key = this.hitTouchRect(point.x, point.y);
  if (key) {
    this.handleUiAction(key, point);
    return;
  }
  if (this.state === 'editor') {
    this.handleEditorPoint(point);
    this.touchMode = 'editor';
    return;
  }
  if (this.state !== 'playing') {
    return;
  }
  this.touchStart = point;
  this.touchMode = this.readyToShoot ? 'aim' : 'paddle';
  this.updatePaddleFromScreen(point.x);
  this.updateAimFromPoint(point);
  if (this.touchMode === 'aim') {
    this.audio.playAimStart();
  }
};

BrickBreakerRuntime.prototype.handleTouchMove = function (event) {
  var point = utils.getTouchPoint(event);
  if (this.touchMode === 'editor') {
    this.handleEditorPoint(point);
    return;
  }
  if (this.state !== 'playing') {
    return;
  }
  this.updatePaddleFromScreen(point.x);
  if (this.touchMode === 'aim' && this.readyToShoot) {
    this.updateAimFromPoint(point);
  }
};

BrickBreakerRuntime.prototype.handleTouchEnd = function () {
  if (this.touchMode === 'aim' && this.readyToShoot && this.aimActive) {
    this.fireSalvo(this.getAimDirection());
  }
  this.touchMode = 'idle';
  this.touchStart = null;
  this.aimActive = false;
};

BrickBreakerRuntime.prototype.handleTouchCancel = function () {
  this.touchMode = 'idle';
  this.touchStart = null;
  this.aimActive = false;
};

BrickBreakerRuntime.prototype.hitTouchRect = function (x, y) {
  var key;
  for (key in this.touchRects) {
    if (Object.prototype.hasOwnProperty.call(this.touchRects, key) && utils.pointInRect(x, y, this.touchRects[key])) {
      return key;
    }
  }
  return '';
};

BrickBreakerRuntime.prototype.handleUiAction = function (key) {
  var type;
  if (key === 'start') {
    this.startRun(false);
  } else if (key === 'editor') {
    this.enterEditor();
  } else if (key === 'help') {
    this.helpReturnState = this.state === 'help' ? 'title' : this.state;
    this.state = 'help';
    this.aimActive = false;
    this.audio.playClick();
  } else if (key === 'closeHelp') {
    this.state = this.helpReturnState || 'title';
    this.audio.playClick();
  } else if (key === 'restart') {
    this.startRun(this.currentRunCustom);
  } else if (key === 'title') {
    this.resetTitlePreview();
  } else if (key === 'saveLevel') {
    this.saveCustomLevel();
  } else if (key === 'playCustom') {
    this.playCustomLevel();
  } else if (key === 'clearLevel') {
    this.resetEditorGrid();
    this.editorGridToBricks();
  } else if (key.indexOf('tool:') === 0) {
    this.editorTool = key.slice(5);
    this.audio.playClick();
  } else if (key.indexOf('power:') === 0) {
    type = key.slice(6);
    this.activateStoredPower(type);
  }
};

BrickBreakerRuntime.prototype.updatePaddleFromScreen = function (screenX) {
  var world = this.screenToWorld(screenX, this.height / 2);
  this.paddle.x = utils.clamp(world.x, BOARD_LEFT + this.paddle.w / 2, BOARD_RIGHT - this.paddle.w / 2);
};

BrickBreakerRuntime.prototype.updateAimFromPoint = function (point) {
  this.aimPoint = this.screenToWorld(point.x, point.y);
  this.aimActive = true;
  if (this.touchMode === 'aim') {
    this.audio.playAimTick();
  }
};

BrickBreakerRuntime.prototype.getAimDirection = function () {
  var target = this.aimPoint || { x: this.paddle.x, y: this.paddle.y + 2 };
  var dx = target.x - this.paddle.x;
  var dy = target.y - (this.paddle.y + 0.18);
  var dir;
  if (dy < 0.28) {
    dy = Math.abs(dy) + 1.2;
    dx *= -0.85;
  }
  dir = utils.normalize(dx, dy);
  dir.y = Math.max(0.26, dir.y);
  dir = utils.normalize(dir.x, dir.y);
  return dir;
};

BrickBreakerRuntime.prototype.reflectDirection = function (dir, normal) {
  var dot = dir.x * normal.x + dir.y * normal.y;
  return utils.normalize(dir.x - 2 * dot * normal.x, dir.y - 2 * dot * normal.y);
};

BrickBreakerRuntime.prototype.castAimRay = function (start, dir, maxDistance, ignoreBrickId) {
  var end = {
    x: start.x + dir.x * maxDistance,
    y: start.y + dir.y * maxDistance
  };
  var probe = {
    prevX: start.x,
    prevY: start.y,
    x: end.x,
    y: end.y,
    r: BALL_RADIUS
  };
  var best = null;
  var i;
  var brick;
  var hit;
  var distance;
  var normal;
  var boundaryDistance;
  function consider(candidate) {
    if (candidate.distance <= 0.02 || candidate.distance > maxDistance) {
      return;
    }
    if (!best || candidate.distance < best.distance) {
      best = candidate;
    }
  }
  for (i = 0; i < this.bricks.length; i += 1) {
    brick = this.bricks[i];
    if (brick.hp <= 0 || brick.id === ignoreBrickId) {
      continue;
    }
    hit = sweptCircleRect(probe, brick);
    if (!hit) {
      continue;
    }
    distance = hit.t * maxDistance;
    normal = brick.wall ? this.getWallResponseNormal(brick, hit) : hit.normal;
    consider({
      x: hit.x,
      y: hit.y,
      normal: normal,
      distance: distance,
      brick: brick
    });
  }
  if (dir.x < -0.0001) {
    boundaryDistance = (BOARD_LEFT + BALL_RADIUS - start.x) / dir.x;
    consider({ x: start.x + dir.x * boundaryDistance, y: start.y + dir.y * boundaryDistance, normal: { x: 1, y: 0 }, distance: boundaryDistance });
  } else if (dir.x > 0.0001) {
    boundaryDistance = (BOARD_RIGHT - BALL_RADIUS - start.x) / dir.x;
    consider({ x: start.x + dir.x * boundaryDistance, y: start.y + dir.y * boundaryDistance, normal: { x: -1, y: 0 }, distance: boundaryDistance });
  }
  if (dir.y > 0.0001) {
    boundaryDistance = (PLAY_TOP - BALL_RADIUS - start.y) / dir.y;
    consider({ x: start.x + dir.x * boundaryDistance, y: start.y + dir.y * boundaryDistance, normal: { x: 0, y: -1 }, distance: boundaryDistance });
  }
  return best;
};

BrickBreakerRuntime.prototype.getAimPrediction = function (dir) {
  var start = { x: this.paddle.x, y: this.paddle.y + 0.25 };
  var first = this.castAimRay(start, dir, 10.5, '');
  var bounceDir;
  var bounceStart;
  var second;
  if (!first) {
    return {
      start: start,
      hit: { x: start.x + dir.x * 5.2, y: start.y + dir.y * 5.2 },
      bounce: null
    };
  }
  bounceDir = this.reflectDirection(dir, first.normal);
  bounceStart = {
    x: first.x + bounceDir.x * 0.04,
    y: first.y + bounceDir.y * 0.04
  };
  second = this.castAimRay(bounceStart, bounceDir, 3.2, first.brick && !first.brick.wall ? first.brick.id : '');
  return {
    start: start,
    hit: { x: first.x, y: first.y },
    bounce: second ? { x: second.x, y: second.y } : { x: first.x + bounceDir.x * 2.25, y: first.y + bounceDir.y * 2.25 }
  };
};

BrickBreakerRuntime.prototype.fireSalvo = function (dir) {
  var i;
  var count = this.getLaunchBallCount();
  var spread;
  this.readyToShoot = false;
  this.pendingBalls = [];
  this.runStats.shots += 1;
  for (i = 0; i < count; i += 1) {
    spread = (i - (count - 1) / 2) * 0.006;
    this.pendingBalls.push({
      delay: i * 0.045,
      dir: utils.normalize(dir.x + spread, dir.y)
    });
  }
  this.audio.playShoot(count);
  this.setMessage('发射 ' + count + ' 弹', 0.9);
};

BrickBreakerRuntime.prototype.getLaunchBallCount = function () {
  return Math.max(1, this.ballArmy);
};

BrickBreakerRuntime.prototype.spawnBall = function (dir, source) {
  var damage = this.ballDamage + (this.heavyTimer > 0 ? 1 : 0);
  this.balls.push({
    id: 'ball-' + this.nextId,
    x: source && source.x !== undefined ? source.x : this.paddle.x,
    y: source && source.y !== undefined ? source.y : this.paddle.y + 0.28,
    vx: dir.x * BALL_SPEED,
    vy: dir.y * BALL_SPEED,
    r: BALL_RADIUS * (this.heavyTimer > 0 ? 1.18 : 1),
    damage: damage,
    heavy: this.heavyTimer > 0,
    mesh: null,
    age: 0,
    wallBounceCount: 0,
    stuckTimer: 0,
    stuckAnchorX: source && source.x !== undefined ? source.x : this.paddle.x,
    stuckAnchorY: source && source.y !== undefined ? source.y : this.paddle.y + 0.28
  });
  this.nextId += 1;
};

BrickBreakerRuntime.prototype.update = function (dt, now) {
  var safeDt = Math.min(0.035, dt || 0.016);
  this.elapsed = now || (this.elapsed + safeDt);
  if (this.state === 'playing') {
    this.heavyTimer = Math.max(0, this.heavyTimer - safeDt);
    this.updatePendingBalls(safeDt);
    if (this.state === 'playing') {
      this.updateBalls(safeDt);
    }
    if (this.state === 'playing') {
      this.updatePowerups(safeDt);
    }
    this.updateEffects(safeDt);
    if (this.state === 'playing') {
      this.checkVolleyFinished();
    }
  } else if (this.state === 'completing') {
    this.completionDelay = Math.max(0, this.completionDelay - safeDt);
    this.updateEffects(safeDt * COMPLETE_SLOWMO_SCALE);
    this.bricksDirty = true;
    if (this.completionDelay <= 0) {
      this.finalizeLevelComplete();
    }
  } else {
    this.updateEffects(safeDt);
  }
  this.syncScene();
};

BrickBreakerRuntime.prototype.updatePendingBalls = function (dt) {
  var i;
  var shot;
  for (i = this.pendingBalls.length - 1; i >= 0; i -= 1) {
    shot = this.pendingBalls[i];
    shot.delay -= dt;
    if (shot.delay <= 0) {
      this.spawnBall(shot.dir);
      this.pendingBalls.splice(i, 1);
    }
  }
};

BrickBreakerRuntime.prototype.updateBalls = function (dt) {
  var i;
  var ball;
  var steps;
  var stepDt;
  var s;
  for (i = this.balls.length - 1; i >= 0; i -= 1) {
    ball = this.balls[i];
    if (!ball) {
      continue;
    }
    ball.age += dt;
    steps = Math.max(1, Math.ceil(this.getBallSpeed(ball) * dt / BALL_COLLISION_STEP));
    stepDt = dt / steps;
    for (s = 0; s < steps; s += 1) {
      ball.prevX = ball.x;
      ball.prevY = ball.y;
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;
      this.resolveWallCollision(ball);
      this.resolvePaddleCollision(ball);
      this.resolveBrickCollision(ball);
      if (this.state !== 'playing') {
        return;
      }
      if (ball.y < BOARD_BOTTOM - 0.42) {
        break;
      }
    }
    if (this.state !== 'playing') {
      return;
    }
    if (ball.y < BOARD_BOTTOM - 0.42) {
      this.removeBallAt(i);
      continue;
    }
    this.updateBallStuckState(ball, dt);
  }
};

BrickBreakerRuntime.prototype.updateBallStuckState = function (ball, dt) {
  var moved = utils.distance(ball.x, ball.y, ball.stuckAnchorX || ball.x, ball.stuckAnchorY || ball.y);
  if (moved > BALL_STUCK_DISTANCE) {
    ball.stuckAnchorX = ball.x;
    ball.stuckAnchorY = ball.y;
    ball.stuckTimer = 0;
    return;
  }
  ball.stuckTimer = (ball.stuckTimer || 0) + dt;
  if (ball.stuckTimer > BALL_STUCK_TIME) {
    this.breakBallLoop(ball, 'stuck');
  }
};

BrickBreakerRuntime.prototype.getBallSpeed = function (ball) {
  var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  return speed > 0.01 ? speed : BALL_SPEED;
};

BrickBreakerRuntime.prototype.normalizeBallVelocity = function (ball) {
  var speed = this.getBallSpeed(ball);
  var minAxis = speed * 0.16;
  if (Math.abs(ball.vx) < minAxis) {
    ball.vx = (ball.vx < 0 ? -1 : 1) * minAxis;
  }
  if (Math.abs(ball.vy) < minAxis) {
    ball.vy = (ball.vy < 0 ? -1 : 1) * minAxis;
  }
  speed = this.getBallSpeed(ball);
  ball.vx = ball.vx / speed * BALL_SPEED;
  ball.vy = ball.vy / speed * BALL_SPEED;
};

BrickBreakerRuntime.prototype.registerBallBounce = function (ball, kind) {
  if (kind === 'wall') {
    ball.wallBounceCount = (ball.wallBounceCount || 0) + 1;
    if (ball.wallBounceCount >= BALL_WALL_LOOP_LIMIT) {
      this.breakBallLoop(ball, 'wall');
    } else {
      this.normalizeBallVelocity(ball);
    }
    return;
  }
  ball.wallBounceCount = 0;
  ball.stuckTimer = 0;
  ball.stuckAnchorX = ball.x;
  ball.stuckAnchorY = ball.y;
  this.normalizeBallVelocity(ball);
};

BrickBreakerRuntime.prototype.breakBallLoop = function (ball) {
  var speed = BALL_SPEED;
  var bias = Math.sin((ball.age || 0) * 17.7 + ball.x * 9.1) * 0.34;
  var dir = utils.normalize((this.paddle.x - ball.x) * 0.24 + bias, -1);
  ball.vx = dir.x * speed;
  ball.vy = dir.y * speed;
  ball.wallBounceCount = 0;
  ball.stuckTimer = 0;
  ball.stuckAnchorX = ball.x;
  ball.stuckAnchorY = ball.y;
  this.spawnEffect(ball.x, ball.y, 0xffffff, 0.28);
};

BrickBreakerRuntime.prototype.resolveWallCollision = function (ball) {
  if (ball.x - ball.r < BOARD_LEFT) {
    ball.x = BOARD_LEFT + ball.r;
    ball.vx = Math.abs(ball.vx);
    this.registerBallBounce(ball, 'wall');
    this.audio.playBounce();
  } else if (ball.x + ball.r > BOARD_RIGHT) {
    ball.x = BOARD_RIGHT - ball.r;
    ball.vx = -Math.abs(ball.vx);
    this.registerBallBounce(ball, 'wall');
    this.audio.playBounce();
  }
  if (ball.y + ball.r > PLAY_TOP) {
    ball.y = PLAY_TOP - ball.r;
    ball.vy = -Math.abs(ball.vy);
    this.registerBallBounce(ball, 'wall');
    this.audio.playBounce();
  }
};

BrickBreakerRuntime.prototype.resolvePaddleCollision = function (ball) {
  var rect;
  var rel;
  var angle;
  var speed;
  if (ball.vy >= 0) {
    return;
  }
  rect = {
    x: this.paddle.x,
    y: this.paddle.y,
    w: this.paddle.w,
    h: this.paddle.h + 0.1
  };
  if (!circleRect(ball, rect)) {
    return;
  }
  rel = utils.clamp((ball.x - this.paddle.x) / (this.paddle.w / 2), -1, 1);
  angle = rel * Math.PI * 0.36;
  speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.005;
  ball.y = this.paddle.y + this.paddle.h / 2 + ball.r + 0.01;
  ball.vx = Math.sin(angle) * speed;
  ball.vy = Math.cos(angle) * speed;
  this.registerBallBounce(ball, 'paddle');
  this.audio.playPaddleCatch();
};

BrickBreakerRuntime.prototype.getWallResponseNormal = function (brick, hit) {
  if (brick.row === 0) {
    return { x: 0, y: -1 };
  }
  if (brick.col === 0) {
    return { x: 1, y: 0 };
  }
  if (brick.col === COLS - 1) {
    return { x: -1, y: 0 };
  }
  return hit.normal || { x: 0, y: -1 };
};

BrickBreakerRuntime.prototype.getBrickCollisionCandidates = function (ball) {
  var candidates = this.collisionCandidates;
  var minX = Math.min(ball.prevX === undefined ? ball.x : ball.prevX, ball.x) - ball.r;
  var maxX = Math.max(ball.prevX === undefined ? ball.x : ball.prevX, ball.x) + ball.r;
  var minY = Math.min(ball.prevY === undefined ? ball.y : ball.prevY, ball.y) - ball.r;
  var maxY = Math.max(ball.prevY === undefined ? ball.y : ball.prevY, ball.y) + ball.r;
  var minCol = utils.clamp(Math.floor((minX - BOARD_LEFT) / BRICK_W) - 1, 0, COLS - 1);
  var maxCol = utils.clamp(Math.floor((maxX - BOARD_LEFT) / BRICK_W) + 1, 0, COLS - 1);
  var minRow = utils.clamp(Math.floor((BOARD_TOP - maxY) / BRICK_H) - 1, 0, ROWS - 1);
  var maxRow = utils.clamp(Math.floor((BOARD_TOP - minY) / BRICK_H) + 1, 0, ROWS - 1);
  var row;
  var col;
  var brick;
  candidates.length = 0;
  for (row = minRow; row <= maxRow; row += 1) {
    if (!this.brickGrid[row]) {
      continue;
    }
    for (col = minCol; col <= maxCol; col += 1) {
      brick = this.brickGrid[row][col];
      if (brick && brick.hp > 0) {
        candidates.push(brick);
      }
    }
  }
  return candidates;
};

BrickBreakerRuntime.prototype.resolveBrickCollision = function (ball) {
  var i;
  var brick;
  var hit;
  var bestBrick = null;
  var bestHit = null;
  var normal;
  var candidates = this.getBrickCollisionCandidates(ball);
  for (i = 0; i < candidates.length; i += 1) {
    brick = candidates[i];
    hit = sweptCircleRect(ball, brick);
    if (!hit) {
      continue;
    }
    if (!bestHit || hit.t < bestHit.t) {
      bestHit = hit;
      bestBrick = brick;
    }
  }
  if (!bestBrick) {
    return;
  }
  if (bestBrick.wall) {
    normal = this.getWallResponseNormal(bestBrick, bestHit);
    if (normal.x) {
      ball.x = bestBrick.x + normal.x * (bestBrick.w / 2 + ball.r + 0.003);
      if (bestBrick.col === 0 && normal.x > 0) {
        ball.x = BOARD_LEFT + BRICK_W + ball.r + 0.003;
      } else if (bestBrick.col === COLS - 1 && normal.x < 0) {
        ball.x = BOARD_RIGHT - BRICK_W - ball.r - 0.003;
      }
      ball.y = bestHit.y;
      ball.vx = Math.abs(ball.vx) * normal.x;
    } else if (normal.y) {
      ball.x = bestHit.x;
      ball.y = bestBrick.y + normal.y * (bestBrick.h / 2 + ball.r + 0.003);
      if (bestBrick.row === 0 && normal.y < 0) {
        ball.y = PLAY_TOP - ball.r - 0.003;
      }
      ball.vy = Math.abs(ball.vy) * normal.y;
    } else if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    this.registerBallBounce(ball, 'wall');
  } else {
    ball.x = bestHit.x;
    ball.y = bestHit.y;
    if (bestHit.normal.x) {
      ball.vx = -ball.vx;
    } else if (bestHit.normal.y) {
      ball.vy = -ball.vy;
    } else if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    this.registerBallBounce(ball, 'brick');
  }
  this.hitBrick(bestBrick, ball.damage, ball.heavy, false);
};

BrickBreakerRuntime.prototype.hitBrick = function (brick, damage, strong, suppressPowerDrop) {
  var finalBreakable;
  if (!brick || brick.hp <= 0) {
    return;
  }
  if (brick.wall) {
    brick.pulse = 1;
    this.bricksDirty = true;
    this.audio.playBrickHit(true);
    return;
  }
  finalBreakable = this.state === 'playing' && this.getBreakableCount() <= 1;
  brick.hp = 0;
  brick.pulse = 1;
  this.audio.playBrickHit(strong);
  this.spawnEraseEffect(brick.x, brick.y, BRICK_COLORS[brick.colorKey] || 0xffffff, finalBreakable ? 0.82 : 0.42);
  this.destroyBrick(brick, suppressPowerDrop, finalBreakable);
  this.tryCompleteLevel();
};

BrickBreakerRuntime.prototype.destroyBrick = function (brick, suppressPowerDrop, keepFinalVisual) {
  var scoreAward = brick.colorKey === 'crimson' ? 50 : 15;
  var xpAward = brick.colorKey === 'crimson' ? 16 : 7;
  brick.hp = 0;
  this.clearBrickFromGrid(brick);
  if (keepFinalVisual) {
    this.prepareFinalBrickVisual(brick);
  } else {
    this.clearBrickMesh(brick);
  }
  this.score += scoreAward;
  this.runStats.bricks += 1;
  this.runStats.xp += xpAward;
  this.runStats.score = this.score;
  this.audio.playBrickBreak(brick.colorKey, brick.colorKey === 'crimson');
  this.addXp(xpAward);
  if (suppressPowerDrop) {
    return;
  }
  if (BRICK_POWER_BY_COLOR[brick.colorKey]) {
    this.dropPowerup(brick.x, brick.y, BRICK_POWER_BY_COLOR[brick.colorKey]);
  }
};

BrickBreakerRuntime.prototype.addXp = function (amount) {
  this.xp += amount;
  this.autoUpgradeCannon();
};

BrickBreakerRuntime.prototype.autoUpgradeCannon = function () {
  while (this.xp >= this.xpNeed) {
    this.upgradeCannon();
  }
  this.upgradeReady = false;
};

BrickBreakerRuntime.prototype.dropPowerup = function (x, y, forcedType) {
  var type = forcedType || POWER_TYPES[(Math.floor(Math.abs(x) * 10 + y * 7 + this.score)) % POWER_TYPES.length];
  if (this.powerups.length >= MAX_ACTIVE_POWERUPS) {
    if (!forcedType) {
      return;
    }
    this.removePowerupAt(0);
  }
  this.powerups.push({
    id: 'power-' + this.nextId,
    x: x,
    y: y,
    type: type,
    age: 0,
    mesh: null
  });
  this.nextId += 1;
  this.audio.playPowerDrop(type);
};

BrickBreakerRuntime.prototype.updatePowerups = function (dt) {
  var i;
  var power;
  for (i = this.powerups.length - 1; i >= 0; i -= 1) {
    if (this.state !== 'playing') {
      return;
    }
    power = this.powerups[i];
    if (!power) {
      continue;
    }
    power.age += dt;
    power.prevY = power.y;
    power.y -= POWER_SPEED * dt;
    if (power.y < BOARD_BOTTOM - 0.4) {
      this.removePowerupAt(i);
      continue;
    }
    if (this.isPowerupCaught(power)) {
      this.collectPower(power.type);
      if (this.state !== 'playing') {
        return;
      }
      this.removePowerupAt(i);
    }
  }
};

BrickBreakerRuntime.prototype.isPowerupCaught = function (power) {
  var withinX = Math.abs(power.x - this.paddle.x) < this.paddle.w / 2 + POWER_CATCH_PADDING_X;
  var catchTop = this.paddle.y + this.paddle.h / 2 + POWER_CATCH_TOP;
  var catchBottom = this.paddle.y - this.paddle.h / 2 - POWER_CATCH_BOTTOM;
  if (!withinX) {
    return false;
  }
  if (power.y <= catchTop && power.y >= catchBottom) {
    return true;
  }
  return power.prevY !== undefined && power.prevY > catchTop && power.y < catchTop;
};

BrickBreakerRuntime.prototype.collectPower = function (type) {
  this.runStats.powers += 1;
  this.audio.playPower(type);
  this.setMessage('获得道具：' + POWER_LABELS[type], 1.1);
  if (type === 'split' || type === 'bomb' || type === 'laser') {
    this.activateStoredPower(type);
  } else if (type === 'heavy') {
    this.heavyTimer = Math.max(this.heavyTimer, 7);
    this.applyHeavyToActiveBalls();
  } else if (type === 'shotgun') {
    this.fireShotgun();
  }
};

BrickBreakerRuntime.prototype.activateStoredPower = function (type) {
  if (this.state !== 'playing') {
    return;
  }
  if (type === 'split') {
    this.splitBalls();
  } else if (type === 'bomb') {
    this.triggerBomb();
  } else if (type === 'laser') {
    this.triggerLaser();
  }
};

BrickBreakerRuntime.prototype.applyHeavyToActiveBalls = function () {
  var i;
  var ball;
  for (i = 0; i < this.balls.length; i += 1) {
    ball = this.balls[i];
    ball.heavy = true;
    ball.r = Math.max(ball.r, BALL_RADIUS * 1.18);
    ball.damage = Math.max(ball.damage || 1, this.ballDamage + 1);
    if (ball.mesh && ball.mesh.userData && ball.mesh.userData.body && this.materials.heavyBall) {
      ball.mesh.userData.body.material = this.materials.heavyBall;
    }
  }
  if (this.balls.length) {
    this.spawnEffect(this.paddle.x, this.paddle.y + 0.45, 0xffb13d, 0.45);
  }
};

BrickBreakerRuntime.prototype.splitBalls = function () {
  var original = this.balls.slice(0, Math.min(this.balls.length, 18));
  var i;
  var ball;
  if (!original.length) {
    this.spawnBall({ x: -0.12, y: 0.99 });
    this.spawnBall({ x: 0.12, y: 0.99 });
  }
  for (i = 0; i < original.length && this.balls.length < MAX_BALLS; i += 1) {
    ball = original[i];
    this.spawnBall(utils.normalize(ball.vx * 0.94 - 0.38, Math.abs(ball.vy) + 0.25), { x: ball.x, y: ball.y });
    if (this.balls.length < MAX_BALLS) {
      this.spawnBall(utils.normalize(ball.vx * 0.94 + 0.38, Math.abs(ball.vy) + 0.25), { x: ball.x, y: ball.y });
    }
  }
  this.audio.playPower('split');
  this.setMessage('弹球分裂', 1);
};

BrickBreakerRuntime.prototype.fireShotgun = function () {
  var i;
  var dx;
  for (i = -3; i <= 3; i += 1) {
    dx = i * 0.16;
    this.spawnBall(utils.normalize(dx, 1), { x: this.paddle.x, y: this.paddle.y + 0.24 });
  }
  this.audio.playPower('shotgun');
  this.setMessage('霰弹齐射', 1);
};

BrickBreakerRuntime.prototype.triggerBomb = function () {
  var target = this.findNearestBrick(this.paddle.x, 0);
  var i;
  var brick;
  if (!target) {
    return;
  }
  for (i = 0; i < this.bricks.length; i += 1) {
    if (this.state !== 'playing') {
      break;
    }
    brick = this.bricks[i];
    if (brick.hp > 0 && !brick.wall && utils.distance(brick.x, brick.y, target.x, target.y) < 0.9) {
      this.hitBrick(brick, 4 + this.cannonLevel, true, true);
    }
  }
  if (this.state !== 'playing') {
    return;
  }
  this.spawnEffect(target.x, target.y, 0xffa133, 0.9);
  this.audio.playBomb();
  this.setMessage('炸弹清场', 1);
};

BrickBreakerRuntime.prototype.triggerLaser = function () {
  var i;
  var brick;
  var cleared = 0;
  for (i = 0; i < this.bricks.length; i += 1) {
    if (this.state !== 'playing') {
      break;
    }
    brick = this.bricks[i];
    if (brick.hp > 0 && !brick.wall && Math.abs(brick.x - this.paddle.x) < BRICK_W * 0.8) {
      this.hitBrick(brick, 999, true, true);
      cleared += 1;
    }
  }
  if (this.state !== 'playing') {
    return;
  }
  this.spawnEffect(this.paddle.x, 0.2, 0x72f7ff, 0.8);
  this.audio.playLaser();
  this.setMessage('激光贯穿 ' + cleared + ' 块', 1);
};

BrickBreakerRuntime.prototype.findNearestBrick = function (x, y) {
  var best = null;
  var bestDist = 999;
  var i;
  var brick;
  var d;
  for (i = 0; i < this.bricks.length; i += 1) {
    brick = this.bricks[i];
    if (brick.hp <= 0 || brick.wall) {
      continue;
    }
    d = utils.distance(x, y, brick.x, brick.y);
    if (d < bestDist) {
      best = brick;
      bestDist = d;
    }
  }
  return best;
};

BrickBreakerRuntime.prototype.checkVolleyFinished = function () {
  if (this.readyToShoot || this.balls.length || this.pendingBalls.length || this.powerups.length) {
    return;
  }
  if (this.tryCompleteLevel()) {
    return;
  }
  this.lives = Math.max(0, this.lives - 1);
  if (this.lives > 0) {
    this.readyToShoot = true;
    this.aimActive = false;
    this.touchMode = 'idle';
    this.setMessage('生命剩余 ' + this.lives, 1.1);
    this.audio.playReady();
    return;
  }
  this.finishGame(false);
};

BrickBreakerRuntime.prototype.tryCompleteLevel = function () {
  if (this.state === 'playing' && this.getBreakableCount() <= 0) {
    this.completeLevel();
    return true;
  }
  return false;
};

BrickBreakerRuntime.prototype.clearPlayfieldForResult = function () {
  this.completionBrick = null;
  this.bricks = [];
  this.clearActiveEntities(true);
  this.clearBrickMeshes();
};

BrickBreakerRuntime.prototype.completeLevel = function () {
  this.beginLevelCompleteSlowMotion();
};

BrickBreakerRuntime.prototype.beginLevelCompleteSlowMotion = function () {
  if (this.state !== 'playing') {
    return;
  }
  this.state = 'completing';
  this.completionDelay = COMPLETE_SLOWMO_DURATION;
  this.completionDelayTotal = COMPLETE_SLOWMO_DURATION;
  this.bricksDirty = true;
  this.readyToShoot = false;
  this.aimActive = false;
  this.clearActiveEntities(false);
  this.runStats.completed = true;
  this.runStats.score = this.score;
  this.runStats.endLevel = this.cannonLevel;
  this.setMessage('关卡完成', COMPLETE_SLOWMO_DURATION);
  this.audio.playClear();
};

BrickBreakerRuntime.prototype.finalizeLevelComplete = function () {
  this.state = 'victory';
  this.completionDelay = 0;
  this.completionBrick = null;
  this.score += COMPLETE_SCORE_BONUS;
  this.runStats.completed = true;
  this.runStats.score = this.score;
  this.runStats.endLevel = this.cannonLevel;
  this.resetGameProgress();
  this.saveProgress();
  this.readyToShoot = false;
  this.clearPlayfieldForResult();
  this.setMessage('关卡完成', 2);
  this.audio.stopBgm();
};

BrickBreakerRuntime.prototype.finishGame = function (won) {
  this.state = won ? 'victory' : 'gameover';
  this.completionDelay = 0;
  this.completionBrick = null;
  this.runStats.completed = !!won;
  this.runStats.score = this.score;
  this.runStats.endLevel = this.cannonLevel;
  this.resetGameProgress();
  this.saveProgress();
  this.clearActiveEntities(true);
  this.readyToShoot = false;
  if (!won) {
    this.lives = 0;
  }
  this.audio.stopBgm();
  this.audio.playGameOver();
  this.setMessage(won ? '全部清空' : '挑战结束', 2);
};

BrickBreakerRuntime.prototype.upgradeCannon = function () {
  if (this.xp < this.xpNeed) {
    return;
  }
  this.xp = Math.max(0, this.xp - this.xpNeed);
  this.xpNeed = Math.round(this.xpNeed * 1.28 + 18);
  this.cannonBaseLevel += 1;
  this.resetCannonForRun();
  this.upgradeReady = false;
  this.setMessage('炮台升级 Lv.' + this.cannonBaseLevel, 1.4);
  this.audio.playUpgrade();
};

BrickBreakerRuntime.prototype.removeBallAt = function (index) {
  var ball = this.balls[index];
  if (ball && ball.mesh && this.ballGroup) {
    this.ballGroup.remove(ball.mesh);
  }
  this.balls.splice(index, 1);
};

BrickBreakerRuntime.prototype.removePowerupAt = function (index) {
  var power = this.powerups[index];
  if (power && power.mesh && this.powerGroup) {
    this.powerGroup.remove(power.mesh);
  }
  this.powerups.splice(index, 1);
};

BrickBreakerRuntime.prototype.clearActiveEntities = function (clearEffects) {
  this.balls = [];
  this.pendingBalls = [];
  this.powerups = [];
  clearGroup(this.ballGroup);
  clearGroup(this.powerGroup);
  if (clearEffects) {
    this.effects = [];
    clearGroup(this.effectGroup);
  }
};

BrickBreakerRuntime.prototype.spawnEffect = function (x, y, color, life) {
  this.pruneEffectQueue();
  this.effects.push({
    id: 'effect-' + this.nextId,
    type: 'ring',
    x: x,
    y: y,
    color: color,
    life: life || 0.4,
    age: 0,
    mesh: null
  });
  this.nextId += 1;
};

BrickBreakerRuntime.prototype.spawnEraseEffect = function (x, y, color, life) {
  var i;
  var specks = [];
  for (i = 0; i < 7; i += 1) {
    specks.push({
      x: Math.cos(i * 1.7) * (0.08 + i * 0.012),
      y: Math.sin(i * 2.1) * (0.07 + i * 0.01),
      r: 0.04 + (i % 3) * 0.012
    });
  }
  this.pruneEffectQueue();
  this.effects.push({
    id: 'effect-' + this.nextId,
    type: 'erase',
    x: x,
    y: y,
    color: color,
    specks: specks,
    life: life || 0.42,
    age: 0,
    mesh: null
  });
  this.nextId += 1;
};

BrickBreakerRuntime.prototype.pruneEffectQueue = function () {
  var effect;
  while (this.effects.length >= MAX_ACTIVE_EFFECTS) {
    effect = this.effects.shift();
    if (effect && effect.mesh && this.effectGroup) {
      this.effectGroup.remove(effect.mesh);
    }
  }
};

BrickBreakerRuntime.prototype.updateEffects = function (dt) {
  var i;
  for (i = this.effects.length - 1; i >= 0; i -= 1) {
    this.effects[i].age += dt;
    if (this.effects[i].age >= this.effects[i].life) {
      if (this.effects[i].mesh && this.effectGroup) {
        this.effectGroup.remove(this.effects[i].mesh);
      }
      this.effects.splice(i, 1);
    }
  }
};

BrickBreakerRuntime.prototype.setMessage = function (text, seconds) {
  this.message = text;
  this.messageUntil = this.elapsed + (seconds || 1.2);
  this.uiDirty = true;
};

BrickBreakerRuntime.prototype.enterEditor = function () {
  this.state = 'editor';
  this.completionDelay = 0;
  this.completionBrick = null;
  this.clearActiveEntities(true);
  this.readyToShoot = false;
  if (this.customDesign && this.customDesign.cells) {
    this.editorGrid = this.cloneCells(this.customDesign.cells);
  }
  this.editorGridToBricks();
  this.setMessage('编辑关卡：选择颜色后点格子', 1.8);
  this.audio.playClick();
};

BrickBreakerRuntime.prototype.resetEditorGrid = function () {
  var r;
  var c;
  this.editorGrid = [];
  for (r = 0; r < ROWS; r += 1) {
    this.editorGrid[r] = [];
    for (c = 0; c < COLS; c += 1) {
      this.editorGrid[r][c] = '';
    }
  }
  for (c = 0; c < COLS; c += 1) {
    this.editorGrid[0][c] = 'wall';
  }
  for (r = 1; r < 8; r += 1) {
    this.editorGrid[r][0] = 'wall';
    this.editorGrid[r][COLS - 1] = 'wall';
  }
};

BrickBreakerRuntime.prototype.cloneCells = function (cells) {
  var copy = [];
  var r;
  var c;
  for (r = 0; r < ROWS; r += 1) {
    copy[r] = [];
    for (c = 0; c < COLS; c += 1) {
      copy[r][c] = cells[r] && cells[r][c] ? cells[r][c] : '';
    }
  }
  return copy;
};

BrickBreakerRuntime.prototype.editorGridToBricks = function () {
  var r;
  var c;
  var type;
  this.clearBrickMeshes();
  this.bricks = [];
  this.resetBrickGrid();
  for (r = 0; r < ROWS; r += 1) {
    for (c = 0; c < COLS; c += 1) {
      type = this.editorGrid[r][c];
      if (type) {
        this.addBrick(c, r, type, type === 'wall' ? 999 : 1, type === 'wall');
      }
    }
  }
  this.syncScene();
};

BrickBreakerRuntime.prototype.handleEditorPoint = function (point) {
  var world = this.screenToWorld(point.x, point.y);
  var col = Math.floor((world.x - BOARD_LEFT) / BRICK_W);
  var row = Math.floor((BOARD_TOP - world.y) / BRICK_H);
  var nextType;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
    return;
  }
  nextType = this.editorTool === 'erase' ? '' : this.editorTool;
  if (this.editorGrid[row][col] === nextType) {
    return;
  }
  this.editorGrid[row][col] = nextType;
  this.audio.playEditorPlace(this.editorTool);
  this.editorGridToBricks();
};

BrickBreakerRuntime.prototype.saveCustomLevel = function () {
  this.customDesign = {
    cells: this.cloneCells(this.editorGrid),
    updatedAt: Date.now ? Date.now() : 0
  };
  utils.safeSetStorage(STORAGE_CUSTOM, this.customDesign);
  this.setMessage('自定义关卡已保存，可分享项目给朋友挑战', 1.8);
  this.audio.playUpgrade();
};

BrickBreakerRuntime.prototype.playCustomLevel = function () {
  this.saveCustomLevel();
  this.startRun(true);
};

BrickBreakerRuntime.prototype.syncScene = function () {
  if (this.headless || !this.THREE || !this.scene) {
    return;
  }
  if (this.bricksDirty) {
    this.syncBricks();
  }
  this.syncBalls();
  this.syncPowerups();
  this.syncEffects();
  this.syncPaddle();
};

BrickBreakerRuntime.prototype.syncBricks = function () {
  var i;
  var brick;
  var mesh;
  var outline;
  var scale;
  var angle;
  var powerType;
  var hasAnimatedBrick = false;
  this.bricksDirty = false;
  for (i = this.bricks.length - 1; i >= 0; i -= 1) {
    brick = this.bricks[i];
    if (brick.hp <= 0) {
      if (brick.finalClear && this.state === 'completing') {
        this.syncFinalClearingBrick(brick);
        hasAnimatedBrick = true;
        continue;
      }
      this.clearBrickFromGrid(brick);
      if (brick.mesh) {
        this.brickGroup.remove(brick.mesh);
        brick.mesh = null;
      }
      if (brick.outline) {
        this.brickGroup.remove(brick.outline);
        brick.outline = null;
      }
      if (brick.edge) {
        this.brickGroup.remove(brick.edge);
        brick.edge = null;
      }
      if (brick.powerIcon) {
        this.brickGroup.remove(brick.powerIcon);
        brick.powerIcon = null;
      }
      this.bricks.splice(i, 1);
      continue;
    }
    powerType = BRICK_POWER_BY_COLOR[brick.colorKey];
    if (powerType) {
      if (brick.mesh) {
        this.brickGroup.remove(brick.mesh);
        brick.mesh = null;
      }
      if (brick.outline) {
        this.brickGroup.remove(brick.outline);
        brick.outline = null;
      }
      if (!brick.powerIcon) {
        brick.powerIcon = new this.THREE.Mesh(this.geometries.brickPowerIcon, this.getPowerIconMaterial(powerType));
        this.brickGroup.add(brick.powerIcon);
      }
    } else {
      if (brick.powerIcon) {
        this.brickGroup.remove(brick.powerIcon);
        brick.powerIcon = null;
      }
      if (!brick.mesh) {
        outline = new this.THREE.Mesh(this.geometries.brickOutline, this.materials.ink);
        mesh = new this.THREE.Mesh(this.geometries.brick, this.getBrickMaterial(brick));
        brick.mesh = mesh;
        brick.outline = outline;
        this.brickGroup.add(outline);
        this.brickGroup.add(mesh);
      }
    }
    scale = 1 + (brick.pulse || 0) * 0.08;
    brick.pulse = Math.max(0, (brick.pulse || 0) - 0.12);
    if (brick.pulse > 0) {
      hasAnimatedBrick = true;
    }
    angle = 0;
    if (brick.outline) {
      brick.outline.position.set(brick.x, brick.y, brick.wall ? 0.035 : 0.055);
      brick.outline.rotation.z = angle;
      brick.outline.scale.set(scale, scale, 1);
    }
    if (brick.mesh) {
      brick.mesh.position.set(brick.x, brick.y, brick.wall ? 0.05 : 0.08);
      brick.mesh.rotation.z = angle;
      brick.mesh.scale.set(scale, scale, 1);
    }
    if (brick.powerIcon) {
      brick.powerIcon.position.set(brick.x, brick.y, 0.18);
      brick.powerIcon.rotation.z = angle;
      brick.powerIcon.scale.set(scale, scale, 1);
    }
  }
  this.bricksDirty = hasAnimatedBrick;
};

BrickBreakerRuntime.prototype.syncBalls = function () {
  var i;
  var ball;
  var group;
  var ink;
  var body;
  var scale;
  for (i = 0; i < this.balls.length; i += 1) {
    ball = this.balls[i];
    if (!ball.mesh) {
      group = new this.THREE.Group();
      ink = new this.THREE.Mesh(this.geometries.ballInk, this.materials.ink);
      body = new this.THREE.Mesh(this.geometries.ball, ball.heavy ? this.materials.heavyBall : this.materials.ball);
      ink.position.z = BALL_OUTLINE_Z;
      body.position.z = BALL_BODY_Z;
      group.add(ink);
      group.add(body);
      group.userData = { body: body, ink: ink };
      ball.mesh = group;
      this.ballGroup.add(ball.mesh);
    }
    ball.mesh.position.set(ball.x, ball.y, BALL_RENDER_Z);
    if (ball.mesh.userData && ball.mesh.userData.body) {
      ball.mesh.userData.body.material = ball.heavy ? this.materials.heavyBall : this.materials.ball;
    }
    if (ball.heavy) {
      ball.mesh.rotation.z += 0.035;
    }
    scale = ball.r / BALL_RADIUS;
    ball.mesh.scale.setScalar(scale);
  }
};

BrickBreakerRuntime.prototype.getPowerIconTexture = function (type) {
  var self = this;
  if (this.powerIconTextures[type]) {
    return this.powerIconTextures[type];
  }
  this.powerIconTextures[type] = this.createCanvasTexture(96, 96, function (ctx, w, h) {
    self.drawPowerIconTexture(ctx, type, w, h);
  });
  return this.powerIconTextures[type];
};

BrickBreakerRuntime.prototype.getPowerIconMaterial = function (type) {
  if (this.powerIconMaterials[type]) {
    return this.powerIconMaterials[type];
  }
  this.powerIconMaterials[type] = new this.THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: this.getPowerIconTexture(type),
    transparent: true,
    side: this.THREE.DoubleSide,
    depthWrite: false
  });
  return this.powerIconMaterials[type];
};

BrickBreakerRuntime.prototype.drawPowerIconTexture = function (ctx, type, w, h) {
  var color = POWER_CSS_COLORS[type] || '#ffffff';
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(48, 48);
  ctx.rotate(Math.sin(type.length * 7) * 0.035);
  ctx.translate(-48, -48);
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  utils.fillRoundRect(ctx, 16, 13, 64, 64, 15, 'rgba(255,252,238,0.96)');
  ctx.shadowColor = 'transparent';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 5;
  utils.strokeRoundRect(ctx, 16, 13, 64, 64, 15, '#050505', 5);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(25, 25);
  ctx.lineTo(72, 64);
  ctx.moveTo(20, 47);
  ctx.lineTo(62, 74);
  ctx.moveTo(36, 16);
  ctx.lineTo(78, 42);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 4;
  if (type === 'split') {
    this.drawPowerSplitIcon(ctx);
  } else if (type === 'heavy') {
    this.drawPowerHeavyIcon(ctx);
  } else if (type === 'shotgun') {
    this.drawPowerShotgunIcon(ctx);
  } else if (type === 'bomb') {
    this.drawPowerBombIcon(ctx);
  } else {
    this.drawPowerLaserIcon(ctx);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(70, 23, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 3;
  ctx.stroke();
  utils.setTextStyle(ctx, 16, '900', '#050505', 'center', 'middle');
  ctx.fillText(POWER_SHORT_LABELS[type] || '?', 48, 82);
  ctx.restore();
};

BrickBreakerRuntime.prototype.drawPowerSplitIcon = function (ctx) {
  var points = [{ x: 39, y: 39 }, { x: 55, y: 34 }, { x: 51, y: 54 }];
  var i;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 3;
  for (i = 0; i < points.length; i += 1) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(41, 48);
  ctx.quadraticCurveTo(48, 44, 53, 43);
  ctx.moveTo(47, 48);
  ctx.quadraticCurveTo(50, 51, 53, 54);
  ctx.stroke();
};

BrickBreakerRuntime.prototype.drawPowerHeavyIcon = function (ctx) {
  ctx.beginPath();
  ctx.arc(48, 29, 9, Math.PI, 0);
  ctx.stroke();
  utils.fillRoundRect(ctx, 33, 33, 30, 26, 7, ctx.fillStyle);
  utils.strokeRoundRect(ctx, 33, 33, 30, 26, 7, '#050505', 4);
  ctx.beginPath();
  ctx.moveTo(35, 61);
  ctx.lineTo(61, 61);
  ctx.stroke();
};

BrickBreakerRuntime.prototype.drawPowerShotgunIcon = function (ctx) {
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(31, 58);
  ctx.lineTo(49, 30);
  ctx.moveTo(48, 58);
  ctx.lineTo(49, 28);
  ctx.moveTo(65, 58);
  ctx.lineTo(49, 30);
  ctx.stroke();
  ctx.fillStyle = POWER_CSS_COLORS.shotgun;
  ctx.beginPath();
  ctx.arc(30, 60, 5, 0, Math.PI * 2);
  ctx.arc(48, 61, 5, 0, Math.PI * 2);
  ctx.arc(66, 60, 5, 0, Math.PI * 2);
  ctx.fill();
};

BrickBreakerRuntime.prototype.drawPowerBombIcon = function (ctx) {
  ctx.beginPath();
  ctx.arc(47, 48, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(57, 36);
  ctx.quadraticCurveTo(62, 25, 72, 28);
  ctx.stroke();
  ctx.fillStyle = '#fff159';
  ctx.beginPath();
  ctx.moveTo(72, 19);
  ctx.lineTo(75, 28);
  ctx.lineTo(84, 31);
  ctx.lineTo(75, 35);
  ctx.lineTo(71, 44);
  ctx.lineTo(68, 34);
  ctx.lineTo(59, 31);
  ctx.lineTo(68, 27);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

BrickBreakerRuntime.prototype.drawPowerLaserIcon = function (ctx) {
  ctx.fillStyle = POWER_CSS_COLORS.laser;
  ctx.beginPath();
  ctx.moveTo(53, 19);
  ctx.lineTo(32, 50);
  ctx.lineTo(46, 50);
  ctx.lineTo(38, 72);
  ctx.lineTo(66, 39);
  ctx.lineTo(51, 39);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 28);
  ctx.lineTo(42, 45);
  ctx.stroke();
};

BrickBreakerRuntime.prototype.syncPowerups = function () {
  var i;
  var power;
  var group;
  var body;
  for (i = 0; i < this.powerups.length; i += 1) {
    power = this.powerups[i];
    if (!power.mesh) {
      group = new this.THREE.Group();
      body = new this.THREE.Mesh(
        this.geometries.power,
        this.getPowerIconMaterial(power.type)
      );
      group.add(body);
      group.userData = { body: body };
      power.mesh = group;
      this.powerGroup.add(power.mesh);
    }
    power.mesh.position.set(power.x, power.y, 0.25);
    power.mesh.rotation.z = Math.sin(this.elapsed * 4 + power.age * 2) * 0.08;
    power.mesh.scale.setScalar(1 + Math.sin(this.elapsed * 7 + power.age) * 0.05);
  }
};

BrickBreakerRuntime.prototype.syncEffects = function () {
  var i;
  var effect;
  var ratio;
  for (i = 0; i < this.effects.length; i += 1) {
    effect = this.effects[i];
    ratio = utils.clamp(1 - effect.age / effect.life, 0, 1);
    if (effect.type === 'erase') {
      this.syncEraseEffect(effect, ratio);
      continue;
    }
    if (!effect.mesh) {
      effect.mesh = new this.THREE.Mesh(this.geometries.ring, new this.THREE.MeshBasicMaterial({ color: effect.color, transparent: true, opacity: 0.5, side: this.THREE.DoubleSide }));
      this.effectGroup.add(effect.mesh);
    }
    effect.mesh.position.set(effect.x, effect.y, 0.32);
    effect.mesh.scale.setScalar(1 + (1 - ratio) * 2.4);
    effect.mesh.material.opacity = ratio * 0.55;
  }
};

BrickBreakerRuntime.prototype.syncEraseEffect = function (effect, ratio) {
  var group;
  var i;
  var speck;
  var puff;
  var line;
  var puffMaterial;
  var lineMaterial;
  if (!effect.mesh) {
    group = new this.THREE.Group();
    puffMaterial = new this.THREE.MeshBasicMaterial({ color: 0xf3e5ca, transparent: true, opacity: 0.9, side: this.THREE.DoubleSide });
    for (i = 0; i < effect.specks.length; i += 1) {
      speck = effect.specks[i];
      puff = new this.THREE.Mesh(this.geometries.erasePuff, puffMaterial);
      puff.position.set(speck.x, speck.y, 0);
      puff.scale.setScalar(speck.r);
      group.add(puff);
    }
    lineMaterial = new this.THREE.LineBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.8 });
    line = new this.THREE.LineSegments(this.geometries.eraseLine, lineMaterial);
    group.add(line);
    group.userData = {
      puffMaterial: puffMaterial,
      lineMaterial: lineMaterial
    };
    effect.mesh = group;
    this.effectGroup.add(effect.mesh);
  }
  effect.mesh.position.set(effect.x, effect.y, 0.36);
  effect.mesh.scale.setScalar(1 + (1 - ratio) * 1.6);
  effect.mesh.rotation.z += 0.05;
  if (effect.mesh.userData && effect.mesh.userData.puffMaterial) {
    effect.mesh.userData.puffMaterial.opacity = ratio * 0.92;
  }
  if (effect.mesh.userData && effect.mesh.userData.lineMaterial) {
    effect.mesh.userData.lineMaterial.opacity = ratio * 0.8;
  }
};

BrickBreakerRuntime.prototype.syncPaddle = function () {
  if (!this.paddleMesh) {
    return;
  }
  this.paddleMesh.position.set(this.paddle.x, this.paddle.y, 0.18);
  this.paddleMesh.userData.body.scale.x = this.paddle.w / 1.45;
  this.paddleMesh.userData.glow.scale.x = (this.paddle.w + 0.25) / 1.7;
};

BrickBreakerRuntime.prototype.drawUi = function () {
  var ctx = this.uiCtx;
  var frameKey = this.getUiFrameKey();
  if (!ctx) {
    return;
  }
  if (!this.uiDirty && frameKey === this.lastUiFrameKey) {
    return;
  }
  this.lastUiFrameKey = frameKey;
  this.uiDirty = false;
  this.touchRects = {};
  ctx.clearRect(0, 0, this.width, this.height);
  this.drawGridSheen(ctx);
  this.drawAimLine(ctx);
  if (this.state === 'title') {
    this.drawTitle(ctx);
  } else if (this.state === 'playing') {
    this.drawPlayingUi(ctx);
  } else if (this.state === 'completing') {
    this.drawPlayingUi(ctx);
    this.drawCompletionSlowMotion(ctx);
  } else if (this.state === 'editor') {
    this.drawEditorUi(ctx);
  } else if (this.state === 'help') {
    this.drawHelp(ctx);
  } else if (this.state === 'gameover' || this.state === 'victory') {
    this.drawResult(ctx);
  }
  this.drawMessage(ctx);
  if (this.uiTexture) {
    this.uiTexture.needsUpdate = true;
  }
};

BrickBreakerRuntime.prototype.getUiFrameKey = function () {
  var messageTicks = this.message && this.elapsed <= this.messageUntil ? Math.ceil((this.messageUntil - this.elapsed) * 10) : 0;
  var completionTicks = this.state === 'completing' ? Math.ceil(this.completionDelay * 20) : 0;
  var aimKey = '';
  var stats = this.runStats || {};
  if (this.state === 'playing' && this.readyToShoot && this.aimActive && this.aimPoint) {
    aimKey = Math.round(this.aimPoint.x * 120) + ':' + Math.round(this.aimPoint.y * 120);
  }
  return [
    this.state,
    this.width,
    this.height,
    this.readyToShoot ? 1 : 0,
    aimKey,
    this.message || '',
    messageTicks,
    completionTicks,
    this.xp,
    this.xpNeed,
    this.lives,
    this.getLaunchBallCount(),
    Math.ceil(this.heavyTimer || 0),
    this.editorTool,
    this.score,
    stats.bricks || 0,
    stats.powers || 0,
    stats.xp || 0,
    stats.shots || 0,
    stats.endLevel || 0,
    this.upgradeReady ? 1 : 0
  ].join('|');
};

BrickBreakerRuntime.prototype.drawGridSheen = function (ctx) {
  var i;
  var x;
  var y;
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;
  for (i = -this.height; i < this.width; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.quadraticCurveTo(i + this.height * 0.45, this.height * 0.48, i + this.height, this.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#2b1d10';
  for (i = 0; i < 190; i += 1) {
    x = (i * 47) % this.width;
    y = (i * 83) % this.height;
    ctx.fillRect(x, y, 1 + (i % 2), 1);
  }
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#000000';
  for (y = this.getSafeTop() + 34; y < this.height * 0.42; y += 13) {
    for (x = this.width - 90; x < this.width - 14; x += 13) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

BrickBreakerRuntime.prototype.drawAimLine = function (ctx) {
  var dir;
  var prediction;
  var start;
  var hit;
  var bounce;
  if (this.state !== 'playing' || !this.readyToShoot || !this.aimActive) {
    return;
  }
  dir = this.getAimDirection();
  prediction = this.getAimPrediction(dir);
  start = this.worldToScreen(prediction.start.x, prediction.start.y);
  hit = this.worldToScreen(prediction.hit.x, prediction.hit.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 2;
  if (ctx.setLineDash) {
    ctx.setLineDash([8, 8]);
  }
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(hit.x, hit.y);
  ctx.stroke();
  if (prediction.bounce) {
    bounce = this.worldToScreen(prediction.bounce.x, prediction.bounce.y);
    ctx.strokeStyle = 'rgba(255,241,89,0.74)';
    ctx.lineWidth = 1.7;
    if (ctx.setLineDash) {
      ctx.setLineDash([7, 9]);
    }
    ctx.beginPath();
    ctx.moveTo(hit.x, hit.y);
    ctx.lineTo(bounce.x, bounce.y);
    ctx.stroke();
  }
  if (ctx.setLineDash) {
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(hit.x, hit.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

BrickBreakerRuntime.prototype.drawTitle = function (ctx) {
  var titleY = this.getSafeTop() + 70;
  var y = this.height * 0.62;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.78)';
  ctx.shadowBlur = 0;
  utils.setTextStyle(ctx, 35, '900', '#fff159', 'center', 'middle');
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#050505';
  if (ctx.strokeText) {
    ctx.strokeText('方块破坏王', this.width / 2, titleY);
  }
  ctx.fillText('方块破坏王', this.width / 2, titleY);
  utils.setTextStyle(ctx, 13, '900', '#ffffff', 'center', 'middle');
  ctx.shadowBlur = 6;
  if (ctx.strokeText) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#050505';
    ctx.strokeText('自定义地图，设计自己的击破路线', this.width / 2, titleY + 31);
  }
  ctx.fillText('自定义地图，设计自己的击破路线', this.width / 2, titleY + 31);
  ctx.restore();
  this.touchRects.editor = this.createButtonRect(this.width / 2, y, UI_BUTTON_WIDTH);
  this.touchRects.start = this.createButtonRect(this.width / 2, y + 52, UI_BUTTON_WIDTH);
  this.touchRects.help = this.createButtonRect(this.width / 2, y + 104, UI_BUTTON_WIDTH);
  this.drawMainButton(ctx, this.touchRects.editor, '自定义关卡', '#38bdf8');
  this.drawMainButton(ctx, this.touchRects.start, '体验默认关卡', '#374151');
  this.drawMainButton(ctx, this.touchRects.help, '玩法说明', '#1f2937');
};

BrickBreakerRuntime.prototype.drawPlayingUi = function (ctx) {
  var bottom = this.height - this.getSafeBottom() - 18;
  var panelY = bottom - 48;
  var xpRatio = utils.clamp(this.xp / this.xpNeed, 0, 1);
  utils.fillRoundRect(ctx, 20, panelY, this.width - 40, 48, 15, 'rgba(6,16,31,0.72)');
  utils.fillRoundRect(ctx, 34, panelY + 34, this.width - 68, 7, 4, 'rgba(255,255,255,0.15)');
  utils.fillRoundRect(ctx, 34, panelY + 34, (this.width - 68) * xpRatio, 7, 4, this.upgradeReady ? '#facc15' : '#60a5fa');
  utils.setTextStyle(ctx, 12, '800', 'rgba(236,246,255,0.86)', 'left', 'middle');
  ctx.fillText('经验 ' + this.xp + '/' + this.xpNeed, 34, panelY + 20);
  utils.setTextStyle(ctx, 12, '900', '#fff159', 'center', 'middle');
  ctx.fillText('生命 ' + this.lives, this.width / 2, panelY + 20);
  utils.setTextStyle(ctx, 12, '800', '#ffffff', 'right', 'middle');
  ctx.fillText('弹球 ' + this.getLaunchBallCount(), this.width - 34, panelY + 20);
  if (this.heavyTimer > 0) {
    this.drawGameplayStatusChip(ctx, '重型弹 ' + Math.ceil(this.heavyTimer) + 's', this.width - 92, panelY - 22, '#ffd166');
  }
};

BrickBreakerRuntime.prototype.drawGameplayStatusChip = function (ctx, label, centerX, centerY, color) {
  var chipW = 106;
  var chipH = 24;
  var x = Math.round(utils.clamp(centerX - chipW / 2, 24, this.width - chipW - 24));
  var y = Math.round(centerY - chipH / 2);
  utils.fillRoundRect(ctx, x + 3, y + 3, chipW, chipH, 10, 'rgba(0,0,0,0.42)');
  utils.fillRoundRect(ctx, x, y, chipW, chipH, 10, 'rgba(6,16,31,0.84)');
  utils.strokeRoundRect(ctx, x, y, chipW, chipH, 10, 'rgba(255,255,255,0.38)', 1.2);
  ctx.fillStyle = color || '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 13, y + chipH / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  utils.setTextStyle(ctx, 12, '900', '#ffffff', 'left', 'middle');
  ctx.fillText(label, x + 23, y + chipH / 2);
};

BrickBreakerRuntime.prototype.drawCompletionSlowMotion = function (ctx) {
  var total = this.completionDelayTotal || COMPLETE_SLOWMO_DURATION;
  var progress = 1 - utils.clamp(this.completionDelay / total, 0, 1);
  var centerY = this.height * 0.38;
  ctx.save();
  ctx.globalAlpha = 0.15 + progress * 0.12;
  ctx.fillStyle = '#fff7cf';
  ctx.beginPath();
  ctx.arc(this.width / 2, centerY, 88 + progress * 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(0,0,0,0.72)';
  ctx.shadowBlur = 0;
  utils.setTextStyle(ctx, 30 + progress * 3, '900', '#fff159', 'center', 'middle');
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#050505';
  if (ctx.strokeText) {
    ctx.strokeText('关卡完成', this.width / 2, centerY);
  }
  ctx.fillText('关卡完成', this.width / 2, centerY);
  utils.setTextStyle(ctx, 12, '900', '#ffffff', 'center', 'middle');
  ctx.fillText('最后一块砖已清空', this.width / 2, centerY + 34);
  ctx.restore();
};

BrickBreakerRuntime.prototype.drawPowerLegend = function (ctx, type, x, y) {
  ctx.fillStyle = POWER_CSS_COLORS[type] || '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 16, y + 16, 14, 0, Math.PI * 2);
  ctx.fill();
  utils.setTextStyle(ctx, 11, '800', 'rgba(255,255,255,0.86)', 'left', 'middle');
  ctx.fillText(POWER_LABELS[type], x + 38, y + 16);
};

BrickBreakerRuntime.prototype.drawHelp = function (ctx) {
  var panelX = 22;
  var panelY = this.getSafeTop() + 24;
  var panelW = this.width - 44;
  var panelH = this.height - this.getSafeTop() - this.getSafeBottom() - 64;
  var contentX = panelX + 22;
  var contentW = panelW - 44;
  var y = panelY + 54;
  var closeRect;
  var skillY;
  utils.fillRoundRect(ctx, panelX, panelY, panelW, panelH, 18, 'rgba(6,16,31,0.92)');
  utils.strokeRoundRect(ctx, panelX, panelY, panelW, panelH, 18, 'rgba(180,210,255,0.28)', 1.2);
  utils.setTextStyle(ctx, 23, '900', '#ffffff', 'center', 'middle');
  ctx.fillText('玩法说明', this.width / 2, panelY + 28);

  y = this.drawHelpSectionTitle(ctx, contentX, y, '目标与操作');
  y = this.drawHelpBullet(ctx, contentX, y, contentW, '#ffffff', '按住拖动瞄准，虚线会显示首次碰撞和一次反弹路线；松手发射弹球。');
  y = this.drawHelpBullet(ctx, contentX, y, contentW, '#ffffff', '默认 1 颗白球，炮台升级和道具会增加弹球数量、伤害和挡板宽度。');

  y = this.drawHelpSectionTitle(ctx, contentX, y + 4, '砖块规则');
  y = this.drawHelpBullet(ctx, contentX, y, contentW, '#dbeafe', '绿色普通砖被击中后清空；灰色墙体只反弹，不会被消除。');
  y = this.drawHelpBullet(ctx, contentX, y, contentW, '#dbeafe', '每局 3 条命：全部弹球落出底部且没有清空砖块时扣 1 条命，生命归零后进入挑战结算。');

  y = this.drawHelpSectionTitle(ctx, contentX, y + 4, '技能砖与下落道具');
  skillY = y;
  skillY = this.drawHelpSkill(ctx, contentX, skillY, contentW, 'split', '蓝色分裂', '复制场上弹球，适合扩大覆盖范围。');
  skillY = this.drawHelpSkill(ctx, contentX, skillY, contentW, 'heavy', '金色重弹', '短时间提升体积和伤害，破墙区更稳。');
  skillY = this.drawHelpSkill(ctx, contentX, skillY, contentW, 'shotgun', '紫色霰弹', '从挡板额外发射多颗弹球。');
  skillY = this.drawHelpSkill(ctx, contentX, skillY, contentW, 'bomb', '红色炸弹', '范围清理附近砖块。');
  skillY = this.drawHelpSkill(ctx, contentX, skillY, contentW, 'laser', '粉色激光', '贯穿挡板正上方一列。');
  y = skillY;

  y = this.drawHelpSectionTitle(ctx, contentX, y + 4, '成长与自定义');
  y = this.drawHelpBullet(ctx, contentX, y, contentW, '#dbeafe', '击碎砖块获得经验，经验满后自动升级炮台。');
  y = this.drawHelpBullet(ctx, contentX, y, contentW, '#dbeafe', '标题页进入自定义关卡，可放置普通砖、技能砖、墙体并保存挑战。');

  closeRect = {
    x: this.width / 2 - UI_BUTTON_WIDTH / 2,
    y: panelY + panelH - 58,
    width: UI_BUTTON_WIDTH,
    height: UI_BUTTON_HEIGHT
  };
  this.touchRects.closeHelp = closeRect;
  this.drawMainButton(ctx, closeRect, '返回游戏', '#38bdf8');
};

BrickBreakerRuntime.prototype.wrapHelpText = function (ctx, text, maxWidth, size, weight) {
  var chars = String(text).split('');
  var lines = [];
  var line = '';
  var next;
  var i;
  utils.setTextStyle(ctx, size, weight || '800', '#ffffff', 'left', 'middle');
  for (i = 0; i < chars.length; i += 1) {
    next = line + chars[i];
    if (line && (ctx.measureText ? ctx.measureText(next).width : next.length * size * 0.62) > maxWidth) {
      lines.push(line);
      line = chars[i];
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.length ? lines : [''];
};

BrickBreakerRuntime.prototype.drawHelpWrappedText = function (ctx, x, y, maxWidth, color, text, size, lineHeight, weight) {
  var lines = this.wrapHelpText(ctx, text, maxWidth, size, weight);
  var i;
  utils.setTextStyle(ctx, size, weight || '800', color, 'left', 'middle');
  for (i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  return y + lines.length * lineHeight;
};

BrickBreakerRuntime.prototype.drawHelpSectionTitle = function (ctx, x, y, title) {
  utils.fillRoundRect(ctx, x, y - 9, 92, 20, 8, 'rgba(96,165,250,0.18)');
  utils.setTextStyle(ctx, 11, '900', '#bfdbfe', 'left', 'middle');
  ctx.fillText(title, x + 10, y + 1);
  return y + 22;
};

BrickBreakerRuntime.prototype.drawHelpBullet = function (ctx, x, y, maxWidth, color, text) {
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(x + 4, y + 1, 2.8, 0, Math.PI * 2);
  ctx.fill();
  y = this.drawHelpWrappedText(ctx, x + 14, y, maxWidth - 14, color, text, 11, 17, '800');
  return y + 4;
};

BrickBreakerRuntime.prototype.drawHelpPowerIcon = function (ctx, type, x, y, size) {
  var texture = this.getPowerIconTexture(type);
  var image = texture && texture.image;
  var color = POWER_CSS_COLORS[type] || '#ffffff';
  if (image && ctx.drawImage) {
    ctx.drawImage(image, x, y, size, size);
    return;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
};

BrickBreakerRuntime.prototype.drawHelpSkill = function (ctx, x, y, maxWidth, type, label, text) {
  var iconSize = 30;
  var rowTop = y - 15;
  var textX = x + 40;
  var labelWidth = 72;
  var textWidth = Math.max(120, maxWidth - 40 - labelWidth);
  var textBottom;
  this.drawHelpPowerIcon(ctx, type, x - 3, rowTop, iconSize);
  utils.setTextStyle(ctx, 11, '900', '#f8fbff', 'left', 'middle');
  ctx.fillText(label, textX, y + 1);
  textBottom = this.drawHelpWrappedText(ctx, textX + labelWidth, y + 1, textWidth, '#dbeafe', text, 10, 15, '800');
  return Math.max(textBottom, rowTop + iconSize) + 6;
};

BrickBreakerRuntime.prototype.drawEditorUi = function (ctx) {
  var tools = ['green', 'blue', 'gold', 'violet', 'crimson', 'pink', 'wall', 'erase'];
  var labels = ['绿', '蓝', '金', '紫', '红', '粉', '墙', '擦'];
  var bottom = this.height - this.getSafeBottom() - 12;
  var panelH = 196;
  var panelY = bottom - panelH;
  var actionButtonW = Math.min(UI_BUTTON_WIDTH, (this.width - 44) / 2);
  var leftCenter = this.width / 2 - actionButtonW / 2 - 5;
  var rightCenter = this.width / 2 + actionButtonW / 2 + 5;
  var x = 8;
  var i;
  var rect;
  var tool;
  var powerType;
  var fillColor;
  utils.fillRoundRect(ctx, 10, panelY, this.width - 20, panelH - 10, 16, 'rgba(6,16,31,0.72)');
  for (i = 0; i < tools.length; i += 1) {
    tool = tools[i];
    powerType = BRICK_POWER_BY_COLOR[tool];
    rect = { x: x + i * 39, y: panelY + 18, width: 32, height: 35 };
    this.touchRects['tool:' + tool] = rect;
    fillColor = powerType ? 'rgba(255,253,245,0.14)' : tool === 'erase' ? '#253044' : '#' + ('000000' + (BRICK_COLORS[tool] || 0xffffff).toString(16)).slice(-6);
    utils.fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, 9, fillColor);
    utils.strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, 9, this.editorTool === tool ? '#ffffff' : 'rgba(255,255,255,0.18)', this.editorTool === tool ? 2 : 1);
    if (powerType) {
      this.drawHelpPowerIcon(ctx, powerType, rect.x + 1, rect.y + 2, 30);
    } else {
      utils.setTextStyle(ctx, 11, '900', tool === 'wall' ? '#111827' : '#ffffff', 'center', 'middle');
      ctx.fillText(labels[i], rect.x + rect.width / 2, rect.y + rect.height / 2);
    }
  }
  this.touchRects.title = this.createButtonRect(leftCenter, panelY + 74, actionButtonW);
  this.touchRects.clearLevel = this.createButtonRect(rightCenter, panelY + 74, actionButtonW);
  this.touchRects.saveLevel = this.createButtonRect(leftCenter, panelY + 126, actionButtonW);
  this.touchRects.playCustom = this.createButtonRect(rightCenter, panelY + 126, actionButtonW);
  this.drawMainButton(ctx, this.touchRects.title, '返回主页', '#1f2937');
  this.drawMainButton(ctx, this.touchRects.clearLevel, '清空', '#374151');
  this.drawMainButton(ctx, this.touchRects.saveLevel, '保存', '#374151');
  this.drawMainButton(ctx, this.touchRects.playCustom, '挑战', '#38bdf8');
  utils.setTextStyle(ctx, 12, '800', 'rgba(255,255,255,0.78)', 'center', 'middle');
  ctx.fillText('点击上方网格放置砖块或墙体', this.width / 2, this.getSafeTop() + 86);
};

BrickBreakerRuntime.prototype.drawSettlementItem = function (ctx, centerX, y, label, value, color) {
  utils.setTextStyle(ctx, 11, '900', 'rgba(17,24,39,0.58)', 'center', 'middle');
  ctx.fillText(label, centerX, y);
  utils.setTextStyle(ctx, 18, '900', color || '#111827', 'center', 'middle');
  ctx.fillText(String(value), centerX, y + 22);
};

BrickBreakerRuntime.prototype.drawResult = function (ctx) {
  var stats = this.runStats || this.createRunStats();
  var y = utils.clamp(this.height * 0.49, this.getSafeTop() + 236, this.height - this.getSafeBottom() - 300);
  var title = this.state === 'gameover' ? '挑战结束' : '关卡完成';
  var panelW = Math.min(this.width - 76, 300);
  var panelH = 190;
  var panelX = this.width / 2 - panelW / 2;
  var panelY = y - 50;
  var colW = panelW / 2;
  var leftColX = panelX + colW * 0.5;
  var rightColX = panelX + colW * 1.5;
  var rowY = panelY + 42;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 0;
  utils.setTextStyle(ctx, 28, '900', '#ffffff', 'center', 'middle');
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#050505';
  if (ctx.strokeText) {
    ctx.strokeText(title, this.width / 2, y - 104);
  }
  ctx.fillText(title, this.width / 2, y - 104);
  utils.fillRoundRect(ctx, panelX + 5, panelY + 6, panelW, panelH, 18, 'rgba(0,0,0,0.38)');
  utils.fillRoundRect(ctx, panelX, panelY, panelW, panelH, 18, 'rgba(255,253,245,0.96)');
  utils.strokeRoundRect(ctx, panelX, panelY, panelW, panelH, 18, '#050505', 2.8);
  utils.setTextStyle(ctx, 14, '900', '#111827', 'center', 'middle');
  ctx.fillText('本局结算', this.width / 2, panelY + 20);
  this.drawSettlementItem(ctx, leftColX, rowY, '本局得分', this.score, '#0f172a');
  this.drawSettlementItem(ctx, rightColX, rowY, '发射次数', stats.shots, '#0f172a');
  this.drawSettlementItem(ctx, leftColX, rowY + 54, '击碎方块', stats.bricks, '#16a34a');
  this.drawSettlementItem(ctx, rightColX, rowY + 54, '获得经验', '+' + stats.xp, '#2563eb');
  this.drawSettlementItem(ctx, leftColX, rowY + 108, '收集道具', stats.powers, '#d97706');
  this.drawSettlementItem(ctx, rightColX, rowY + 108, '炮台等级', 'Lv.' + (stats.endLevel || this.cannonLevel), '#7c3aed');
  ctx.restore();
  this.touchRects.restart = this.createButtonRect(this.width / 2, panelY + panelH + 18, UI_BUTTON_WIDTH);
  this.touchRects.editor = this.createButtonRect(this.width / 2, panelY + panelH + 70, UI_BUTTON_WIDTH);
  this.touchRects.title = this.createButtonRect(this.width / 2, panelY + panelH + 122, UI_BUTTON_WIDTH);
  this.drawMainButton(ctx, this.touchRects.restart, this.state === 'gameover' ? '重新开始' : '再玩一次', '#38bdf8');
  this.drawMainButton(ctx, this.touchRects.editor, '编辑关卡', '#374151');
  this.drawMainButton(ctx, this.touchRects.title, '返回标题', '#1f2937');
};

BrickBreakerRuntime.prototype.drawMessage = function (ctx) {
  var alpha;
  if (!this.message || this.elapsed > this.messageUntil) {
    return;
  }
  alpha = utils.clamp((this.messageUntil - this.elapsed) / 0.3, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  utils.setTextStyle(ctx, 16, '900', '#ffffff', 'center', 'middle');
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  ctx.fillText(this.message, this.width / 2, this.getSafeTop() + 68);
  ctx.restore();
};

BrickBreakerRuntime.prototype.createButtonRect = function (centerX, y, width) {
  return {
    x: centerX - width / 2,
    y: y,
    width: width,
    height: UI_BUTTON_HEIGHT
  };
};

BrickBreakerRuntime.prototype.drawButton = function (ctx, rect, label, color, fontSize) {
  var x = Math.round(rect.x);
  var y = Math.round(rect.y);
  var w = Math.round(rect.width);
  var h = Math.round(rect.height);
  var centerX = Math.round(x + w / 2);
  var centerY = Math.round(y + h / 2);
  utils.fillRoundRect(ctx, x + UI_BUTTON_SHADOW_X, y + UI_BUTTON_SHADOW_Y, w, h, UI_BUTTON_RADIUS, 'rgba(0,0,0,0.52)');
  utils.fillRoundRect(ctx, x, y, w, h, UI_BUTTON_RADIUS, color);
  utils.strokeRoundRect(ctx, x, y, w, h, UI_BUTTON_RADIUS, '#050505', UI_BUTTON_STROKE);
  utils.setTextStyle(ctx, fontSize || 16, '900', '#ffffff', 'center', 'middle');
  ctx.fillText(label, centerX, centerY);
};

BrickBreakerRuntime.prototype.drawMainButton = function (ctx, rect, label, color) {
  this.drawButton(ctx, rect, label, color, 16);
};

BrickBreakerRuntime.prototype.drawCompactButton = function (ctx, rect, label, color) {
  this.drawButton(ctx, rect, label, color, 13);
};

BrickBreakerRuntime.prototype.drawSmallButton = function (ctx, rect, label) {
  this.drawButton(ctx, rect, label, 'rgba(56,189,248,0.86)', 13);
};

BrickBreakerRuntime.prototype.getSafeTop = function () {
  var info = this.runtimeInfo || {};
  var menu = info.menuButtonInfo;
  if (menu && menu.top) {
    return Math.max(18, menu.top - 6);
  }
  return 18;
};

BrickBreakerRuntime.prototype.getSafeBottom = function () {
  return this.height >= 780 ? 28 : 12;
};

BrickBreakerRuntime.prototype.render = function () {
  if (this.headless || !this.renderer) {
    return;
  }
  try {
    this.drawUi();
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.render(this.uiScene, this.uiCamera);
    this.renderer.autoClear = true;
  } catch (error) {
    this.drawFatalError(error);
  }
};

BrickBreakerRuntime.prototype.getTargetFrameIntervalMs = function () {
  if (this.state === 'playing' && (this.balls.length || this.pendingBalls.length || this.powerups.length || this.effects.length || this.aimActive)) {
    return ACTIVE_FRAME_INTERVAL_MS;
  }
  if (this.state === 'completing') {
    return ACTIVE_FRAME_INTERVAL_MS;
  }
  return IDLE_FRAME_INTERVAL_MS;
};

BrickBreakerRuntime.prototype.loop = function (timestamp) {
  var nowMs = Date.now ? Date.now() : (typeof timestamp === 'number' ? timestamp : 0);
  var frameInterval = this.getTargetFrameIntervalMs();
  var now;
  var dt;
  if (this.lastFrameMs && nowMs - this.lastFrameMs < frameInterval - FRAME_SKIP_TOLERANCE_MS) {
    if (this.running) {
      this.requestNextFrame();
    }
    return;
  }
  now = nowMs / 1000;
  dt = this.lastTime ? now - this.lastTime : 0.016;
  this.lastTime = now;
  this.lastFrameMs = nowMs;
  this.update(dt, now);
  this.render();
  if (this.running) {
    this.requestNextFrame();
  }
};

BrickBreakerRuntime.prototype.requestNextFrame = function () {
  var self = this;
  if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
    this.frameHandle = wx.requestAnimationFrame(function (time) {
      self.loop(time);
    });
  } else if (typeof requestAnimationFrame !== 'undefined') {
    this.frameHandle = requestAnimationFrame(function (time) {
      self.loop(time);
    });
  } else {
    this.frameHandle = setTimeout(function () {
      self.loop(Date.now());
    }, 16);
  }
};

BrickBreakerRuntime.prototype.start = function () {
  if (this.running) {
    return;
  }
  this.running = true;
  this.lastTime = 0;
  this.lastFrameMs = 0;
  this.requestNextFrame();
};

BrickBreakerRuntime.prototype.stop = function () {
  this.running = false;
  if (this.frameHandle && typeof wx !== 'undefined' && wx.cancelAnimationFrame) {
    wx.cancelAnimationFrame(this.frameHandle);
  } else if (this.frameHandle && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(this.frameHandle);
  } else if (this.frameHandle) {
    clearTimeout(this.frameHandle);
  }
  this.frameHandle = null;
  this.lastFrameMs = 0;
};

BrickBreakerRuntime.prototype.drawFatalError = function (error) {
  var ctx;
  try {
    ctx = this.canvas.getContext('2d');
  } catch (error2) {
    ctx = null;
  }
  if (!ctx) {
    return;
  }
  ctx.fillStyle = '#06101f';
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('WebGL 渲染失败', 24, 48);
  ctx.font = '12px sans-serif';
  ctx.fillText(error && error.message ? error.message : String(error), 24, 76);
};

BrickBreakerRuntime.prototype.handleShow = function () {
  if (!this.headless) {
    this.start();
  }
};

BrickBreakerRuntime.prototype.handleHide = function () {
  this.stop();
};

BrickBreakerRuntime.prototype.handleResize = function (windowInfo) {
  this.width = windowInfo.windowWidth || this.width;
  this.height = windowInfo.windowHeight || this.height;
};

BrickBreakerRuntime.prototype.getSnapshot = function () {
  return {
    level: this.level,
    score: this.score,
    bestScore: this.bestScore,
    lives: this.lives,
    cannonLevel: this.cannonLevel,
    runStats: this.runStats
  };
};

BrickBreakerRuntime.prototype.destroy = function () {
  this.stop();
  this.audio.destroy();
  clearGroup(this.brickGroup);
  clearGroup(this.ballGroup);
  clearGroup(this.powerGroup);
  clearGroup(this.effectGroup);
};

module.exports = BrickBreakerRuntime;
