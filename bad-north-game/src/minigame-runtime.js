'use strict';

var THREE = null;
var utils = require('./utils');
var gameMeta = require('./game-meta');
var threeScope = require('./three-scope');
var AudioManager = require('./audio');

var STORAGE_BEST_WAVE = 'bad_north_best_wave_v2';
var HEIGHT_UNIT = 0.5;
var ISLAND_SCALE = 0.62;
var WORLD_BASE_Y = -0.38;
var LOWEST_TERRAIN_TOP_Y = WORLD_BASE_Y + ISLAND_SCALE * HEIGHT_UNIT;
var SEA_LEVEL_Y = -0.22;
var SEA_WAVE_A = 0.018;
var SEA_WAVE_B = 0.014;
var MIN_SEA_TERRAIN_GAP = 0.1;
var SEA_SURFACE_FOAM_Y = SEA_LEVEL_Y + 0.045;
var SEA_SURFACE_FOAM_LOCAL_Y = (SEA_SURFACE_FOAM_Y - WORLD_BASE_Y) / ISLAND_SCALE;
var DISTANT_BOAT_SPEED = 0.16;
var BOAT_WAKE_INTERVAL = 0.18;
var ACTOR_COLLISION_PADDING = 0.2;
var HOUSE_ATTACK_SIDE_MARGIN = 0.42;
var HOUSE_ATTACK_TILE_REACH = 1.08;
var ENEMY_SQUAD_NOTICE_RANGE = 1.45;
var ENEMY_ROUTE_BLOCK_NOTICE_RANGE = 2.1;
var ENEMY_SQUAD_ENGAGE_RANGE = 0.74;
var ENEMY_SQUAD_BREAK_RANGE = 1.65;
var ENEMY_DEFENDER_NOTICE_RANGE = 4.15;
var ENEMY_DEFENDER_ROUTE_RADIUS = 1.12;
var ENEMY_DEFENDER_ROUTE_LOOKAHEAD = 5.8;
var SQUAD_CONTACT_ENGAGE_RANGE = 0.78;
var ACTOR_ROUTE_BLOCK_RADIUS = 0.72;
var MELEE_ENGAGEMENT_LOCK_TIME = 1.15;
var MELEE_CONTACT_APPROACH_RATIO = 0.82;
var RANGED_AGGRO_TIME = 4.4;
var RANGED_AGGRO_BREAK_RANGE = 5.2;
var MAX_TRAVERSABLE_HEIGHT_DELTA = 1;
var CLIMB_ARC_HEIGHT = 0.16;
var HOUSE_HEALTH_VISIBLE_TIME = 2.4;
var LADDER_HOUSE_CLEARANCE = 0.26;
var LADDER_FOOTPRINT_HALF_NARROW = 0.12;
var LADDER_FOOTPRINT_HALF_WIDE = 0.27;
var LADDER_MAX_COUNT = 7;
var LADDER_MIN_SPACING = 1.55;
var ATTACK_PULSE_DECAY = 5.8;
var HIT_PULSE_DECAY = 6.6;
var ENEMY_PATH_REFRESH = 0.38;
var ENEMY_STUCK_REPATH_TIME = 0.7;
var CAMERA_MIN_ZOOM = 0.68;
var CAMERA_DEFAULT_ZOOM = 0.86;
var CAMERA_MAX_ZOOM = 1.85;
var ROTATE_VIEW_SPEED = Math.PI * 0.72;
var POSTPROCESS_RENDER_SCALE = 0.72;
var FRIEND_BLUE = 0x3f79a8;
var FRIEND_TEAL = 0x3f8b7b;
var FRIEND_SKY = 0x5f8fc2;
var MILITIA_CLOTH = 0xb6855f;
var ARCHER_GREEN = 0x3f8d50;
var RANGER_DARK = 0x252b34;
var MONK_GOLD = 0xd0ae3f;
var STAR_BLUE = 0x536fbe;
var STAR_LIGHT = 0xe7ebff;
var ENEMY_RED = 0xa74133;
var ENEMY_DARK = 0x3d2b25;
var GRASS_LOW = 0xa98748;
var GRASS_MID = 0x8d6f36;
var GRASS_HIGH = 0x6f6037;
var CLIFF = 0x746f61;
var CLIFF_SHADE = 0x57594f;
var PAPER_FOG = 0xb8ae96;
var SEA_TOP = 0x7ea4a7;
var MIST_WATER = 0x456b78;
var INK_HEX = 0x2d3029;
var PATH_LINE_HEX = 0xf6edc8;
var PATH_NODE_HEX = 0x90d1ba;
var ENEMY_ROUTE_HEX = 0xff5a3a;
var ENEMY_ROUTE_STRIP_HEX = 0xff8a3d;
var ENEMY_ROUTE_NODE_HEX = 0xffb35c;
var ENEMY_ATTACK_ROUTE_PREVIEWS_ENABLED = false;
var ENEMY_ROUTE_LIMIT = 7;
var ENEMY_PATH_PREVIEW_INTERVAL = 0.65;
var INK = '#2d3029';
var SOFT_INK = 'rgba(45,48,41,0.68)';
var SUCCESS = '#6b8d5a';
var WARNING = '#d8694c';

var TILE_MAP = [
  '00000000000',
  '00001110000',
  '00012221000',
  '00122233100',
  '01122333310',
  '11222233211',
  '11122222111',
  '01111221110',
  '00111111000',
  '00011100000',
  '00000000000'
];

var LANES = {
  west: {
    name: '西岸',
    spawn: { x: -12.95, z: 2.2 },
    shore: { x: -5.95, z: 1.4 },
    landing: { x: -4.2, z: 1.4 },
    angle: Math.PI * 0.5
  },
  east: {
    name: '东湾',
    spawn: { x: 12.95, z: 1.1 },
    shore: { x: 5.95, z: 0.8 },
    landing: { x: 4.2, z: 0.8 },
    angle: -Math.PI * 0.5
  },
  north: {
    name: '北崖',
    spawn: { x: 1.2, z: -11.95 },
    shore: { x: 0.8, z: -4.95 },
    landing: { x: 0.8, z: -3.2 },
    angle: 0
  },
  south: {
    name: '南滩',
    spawn: { x: -1.4, z: 11.95 },
    shore: { x: -0.8, z: 4.95 },
    landing: { x: -0.8, z: 3.6 },
    angle: Math.PI
  }
};

var WAVES = [
  {
    name: '斥候',
    boats: [{ lane: 'west', count: 4, type: 'raider', delay: 0.2 }]
  },
  {
    name: '双船登陆',
    boats: [
      { lane: 'west', count: 4, type: 'raider', delay: 0.1 },
      { lane: 'east', count: 4, type: 'shield', delay: 2.0 }
    ]
  },
  {
    name: '绕后',
    boats: [
      { lane: 'north', count: 5, type: 'raider', delay: 0.4 },
      { lane: 'south', count: 4, type: 'runner', delay: 2.4 }
    ]
  },
  {
    name: '破盾者',
    boats: [
      { lane: 'east', count: 5, type: 'shield', delay: 0.1 },
      { lane: 'west', count: 5, type: 'raider', delay: 1.8 },
      { lane: 'south', count: 4, type: 'runner', delay: 3.4 }
    ]
  },
  {
    name: '最后海潮',
    boats: [
      { lane: 'north', count: 6, type: 'shield', delay: 0.1 },
      { lane: 'east', count: 5, type: 'raider', delay: 1.7 },
      { lane: 'west', count: 5, type: 'raider', delay: 2.9 },
      { lane: 'south', count: 5, type: 'runner', delay: 4.0 }
    ]
  }
];

var SQUAD_DEFS = {
  militia: {
    name: '民兵',
    color: MILITIA_CLOTH,
    maxHp: 176,
    count: 7,
    range: 0.7,
    speed: 1.36,
    damage: 11,
    cooldown: 0.5,
    armor: 0.86,
    attack: 'melee',
    skill: 'none',
    skillName: '初始'
  },
  archer: {
    name: '弓箭手',
    color: ARCHER_GREEN,
    maxHp: 112,
    count: 5,
    range: 3.25,
    speed: 1.25,
    damage: 8,
    cooldown: 0.72,
    armor: 1.1,
    attack: 'arrow',
    projectile: 'arrow',
    skill: 'volley',
    skillName: '连射',
    skillCooldown: 9
  },
  ranger: {
    name: '游侠',
    color: RANGER_DARK,
    maxHp: 118,
    count: 4,
    range: 2.55,
    speed: 1.58,
    damage: 9,
    cooldown: 0.58,
    armor: 1.04,
    attack: 'throw',
    projectile: 'knife',
    skill: 'decoy',
    skillName: '伪光',
    skillCooldown: 12
  },
  monk: {
    name: '武僧',
    color: MONK_GOLD,
    maxHp: 146,
    count: 4,
    range: 0.62,
    speed: 1.42,
    damage: 15,
    cooldown: 0.54,
    armor: 0.94,
    attack: 'fist',
    skill: 'prison',
    skillName: '光狱',
    skillCooldown: 14
  },
  star: {
    name: '星使',
    color: STAR_BLUE,
    maxHp: 108,
    count: 3,
    range: 3.0,
    speed: 1.18,
    damage: 13,
    cooldown: 0.9,
    armor: 1.16,
    attack: 'star',
    projectile: 'star',
    skill: 'starburst',
    skillName: '星爆',
    skillCooldown: 16
  }
};

var SQUAD_FORMATION_OFFSETS = [
  [-0.2, -0.15], [0.2, -0.15], [0, 0.08], [-0.32, 0.18], [0.32, 0.18], [-0.1, 0.34], [0.18, 0.34]
];

function hashNumber(seed) {
  var value = Math.sin(seed * 91.37) * 10000;
  return value - Math.floor(value);
}

function createOffscreenCanvas(width, height, pixelRatio) {
  var canvas;
  if (typeof wx !== 'undefined' && wx.createCanvas) {
    canvas = wx.createCanvas();
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
  } else {
    return null;
  }
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  return canvas;
}

function clearGroup(group) {
  while (group.children.length) {
    group.remove(group.children[0]);
  }
}

function setColor(material, color) {
  if (material && material.color) {
    material.color.setHex(color);
  }
}

function isKnownOptionalExtensionWarning(args) {
  var message = args && args.length ? String(args[0]) : '';
  return message.indexOf('THREE.WebGLRenderer: EXT_blend_minmax extension not supported.') !== -1 ||
    message.indexOf('THREE.WebGLRenderer: OES_vertex_array_object extension not supported.') !== -1;
}

function createWechatSafeRenderer(options) {
  var originalWarn;
  if (typeof console === 'undefined' || typeof console.warn !== 'function') {
    return new THREE.WebGLRenderer(options);
  }
  originalWarn = console.warn;
  console.warn = function () {
    if (isKnownOptionalExtensionWarning(arguments)) {
      return;
    }
    originalWarn.apply(console, arguments);
  };
  try {
    return new THREE.WebGLRenderer(options);
  } finally {
    console.warn = originalWarn;
  }
}

function isWeChatNativeRuntime() {
  return typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
}

function makeLowPolyMaterial(params) {
  params = params || {};
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(params.color || 0xffffff) },
      uEmissive: { value: new THREE.Color(params.emissive || 0x000000) },
      uEmissiveIntensity: { value: params.emissiveIntensity || 0 },
      uOpacity: { value: params.opacity !== undefined ? params.opacity : 1 },
      uInkAmount: { value: params.inkAmount !== undefined ? params.inkAmount : 0.12 },
      uPaperBlend: { value: params.paperBlend !== undefined ? params.paperBlend : 0.1 },
      uSaturation: { value: params.saturation !== undefined ? params.saturation : 1.06 }
    },
    vertexShader: [
      'precision highp float;',
      'uniform vec3 uColor;',
      'uniform vec3 uEmissive;',
      'uniform float uEmissiveIntensity;',
      'uniform float uInkAmount;',
      'uniform float uPaperBlend;',
      'uniform float uSaturation;',
      'varying vec3 vColor;',
      'varying float vWash;',
      'varying float vInk;',
      'void main() {',
      '  vec3 n = normalize(normalMatrix * normal);',
      '  vec3 key = normalize(vec3(0.38, 0.82, 0.28));',
      '  vec3 fill = normalize(vec3(-0.6, 0.28, -0.55));',
      '  float keyLight = max(dot(n, key), 0.0);',
      '  float fillLight = max(dot(n, fill), 0.0);',
      '  float hemi = n.y * 0.5 + 0.5;',
      '  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;',
      '  float grainA = sin(worldPos.x * 2.0 + worldPos.z * 1.55 + worldPos.y * 0.65);',
      '  float grainB = sin(worldPos.x * 5.1 - worldPos.z * 2.7 + worldPos.y * 1.3);',
      '  vWash = 0.86 + grainA * 0.075 + grainB * 0.035;',
      '  float shade = 0.52 + keyLight * 0.26 + fillLight * 0.08 + hemi * 0.11;',
      '  float stepped = floor(shade * 4.0) / 4.0;',
      '  shade = mix(shade, stepped, 0.22);',
      '  vec3 paper = vec3(0.71, 0.67, 0.56);',
      '  vec3 ink = vec3(0.18, 0.19, 0.16);',
      '  vec3 base = mix(uColor * shade, paper, uPaperBlend);',
      '  float chroma = dot(base, vec3(0.299, 0.587, 0.114));',
      '  base = mix(vec3(chroma), base, uSaturation);',
      '  vInk = uInkAmount * (1.0 - hemi) + max(0.0, 0.12 - keyLight) * 0.18;',
      '  vColor = mix(base, ink, vInk) + uEmissive * uEmissiveIntensity;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform float uOpacity;',
      'varying vec3 vColor;',
      'varying float vWash;',
      'varying float vInk;',
      'void main() {',
      '  float paperGrain = sin(gl_FragCoord.x * 0.73 + gl_FragCoord.y * 0.41) * 0.018;',
      '  vec3 c = vColor * (vWash + paperGrain);',
      '  c = mix(c, vec3(0.16, 0.17, 0.14), vInk * 0.35);',
      '  c = pow(c, vec3(0.94));',
      '  gl_FragColor = vec4(c, uOpacity);',
      '}'
    ].join('\n'),
    transparent: !!params.transparent || (params.opacity !== undefined && params.opacity < 1),
    depthWrite: params.depthWrite !== undefined ? params.depthWrite : true,
    toneMapped: false
  });
}

function BadNorthRuntime(options) {
  this.canvas = options.canvas;
  THREE = options.THREE || options.three || THREE || threeScope.createScopedThreejs(this.canvas);
  this.width = options.width;
  this.height = options.height;
  this.pixelRatio = options.pixelRatio || 1;
  this.runtimeInfo = options.runtimeInfo || {};
  this.scale = utils.clamp(Math.min(this.width / 430, this.height / 932), 0.68, 1.28);
  this.bestWave = Number(utils.safeGetStorage(STORAGE_BEST_WAVE, 0)) || 0;
  this.audio = new AudioManager();

  this.state = 'title';
  this.hidden = false;
  this.running = false;
  this.lastTimestamp = 0;
  this.loopHandle = null;
  this.elapsed = 0;
  this.waveIndex = 0;
  this.kills = 0;
  this.score = 0;
  this.nextEntityId = 1;
  this.cameraQuarter = 0;
  this.targetWorldRotation = 0;
  this.targetWorldTilt = 0;
  this.rotateViewActive = false;
  this.viewPanX = 0;
  this.viewPanZ = 0;
  this.targetViewPanX = 0;
  this.targetViewPanZ = 0;
  this.cameraZoom = CAMERA_DEFAULT_ZOOM;
  this.targetCameraZoom = CAMERA_DEFAULT_ZOOM;
  this.pinchStartDistance = 0;
  this.pinchStartZoom = CAMERA_DEFAULT_ZOOM;
  this.bannerText = '';
  this.bannerUntil = 0;
  this.hintText = '';
  this.hintUntil = 0;
  this.selectedSquadId = '';
  this.draggingCommand = false;
  this.gestureMode = 'idle';
  this.touchStartX = 0;
  this.touchStartY = 0;
  this.lastTouchX = 0;
  this.lastTouchY = 0;
  this.touchMoved = false;
  this.touchStartOnUi = false;
  this.touchStartPicked = null;
  this.touchRects = {};
  this.postProcessEnabled = false;
  this.postProcessWarned = false;
  this.uiEnabled = true;
  this.uiWarned = false;
  this.enemyPathPreviewNextAt = 0;
  this.enemyPathPreviewLastState = '';

  this.tiles = [];
  this.tileLookup = {};
  this.houses = [];
  this.squads = [];
  this.enemies = [];
  this.boats = [];
  this.projectiles = [];
  this.effects = [];
  this.decoys = [];
  this.prisons = [];

  this.pickables = [];
  this.houseMeshes = {};
  this.squadMeshes = {};
  this.enemyMeshes = {};
  this.boatMeshes = {};
  this.rainGroup = null;
  this.mistGroup = null;
  this.seaWaveGroup = null;

  this.raycaster = new THREE.Raycaster();
  this.pointer = new THREE.Vector2();
  this.tmpVector = new THREE.Vector3();

  this.loop = this.loop.bind(this);

  this.patchCanvas();
  this.buildIslandData();
  this.setupThree();
  this.setupSimulation();
  this.rebuildStaticScene();
  this.rebuildActorMeshes();
  this.syncSceneObjects(true);
}

BadNorthRuntime.prototype.patchCanvas = function () {
  if (!this.canvas.addEventListener) {
    try {
      this.canvas.addEventListener = function () {};
    } catch (error) {
      // Some WeChat canvas properties are read-only; Three can still use the canvas if it already has event stubs.
    }
  }
  if (!this.canvas.removeEventListener) {
    try {
      this.canvas.removeEventListener = function () {};
    } catch (error2) {
      // Ignore read-only shim failures.
    }
  }
  if (!this.canvas.style) {
    try {
      this.canvas.style = {};
    } catch (error3) {
      // Three only writes width/height here; missing style is non-fatal when the property is sealed.
    }
  }
  if (this.canvas.style) {
    try {
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
    } catch (error4) {
      // Ignore style assignment failures on native canvases.
    }
  }
  try {
    this.canvas.clientWidth = this.width;
    this.canvas.clientHeight = this.height;
  } catch (error5) {
    // clientWidth/clientHeight are read-only in some DevTools canvas implementations.
  }
};

BadNorthRuntime.prototype.init = function () {
  this.running = true;
  this.render();
  this.requestNextFrame();
};

BadNorthRuntime.prototype.destroy = function () {
  this.running = false;
  if (typeof cancelAnimationFrame === 'function' && this.loopHandle) {
    cancelAnimationFrame(this.loopHandle);
  }
  if (typeof clearTimeout === 'function' && this.loopHandle) {
    clearTimeout(this.loopHandle);
  }
  this.loopHandle = null;
  this.audio.destroy();
  if (this.renderer && this.renderer.dispose) {
    this.renderer.dispose();
  }
};

BadNorthRuntime.prototype.requestNextFrame = function () {
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

BadNorthRuntime.prototype.loop = function (timestamp) {
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
    this.update(dt, now / 1000);
    this.render();
  }
  this.requestNextFrame();
};

BadNorthRuntime.prototype.handleShow = function () {
  this.hidden = false;
  this.lastTimestamp = Date.now();
  this.audio.resume();
};

BadNorthRuntime.prototype.handleHide = function () {
  this.hidden = true;
};

BadNorthRuntime.prototype.handleResize = function () {
  return;
};

BadNorthRuntime.prototype.getSnapshot = function () {
  return {
    state: this.state,
    wave: Math.max(this.waveIndex, this.bestWave),
    kills: this.kills,
    score: this.score
  };
};

BadNorthRuntime.prototype.setupThree = function () {
  var sizeW = Math.round(this.width * this.pixelRatio);
  var sizeH = Math.round(this.height * this.pixelRatio);
  var postW = Math.max(1, Math.round(sizeW * POSTPROCESS_RENDER_SCALE));
  var postH = Math.max(1, Math.round(sizeH * POSTPROCESS_RENDER_SCALE));

  this.renderer = createWechatSafeRenderer({
    canvas: this.canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance'
  });
  this.renderer.setPixelRatio(this.pixelRatio);
  this.renderer.setSize(this.width, this.height, false);
  this.renderer.setClearColor(PAPER_FOG, 1);
  this.renderer.autoClear = true;
  if (THREE.SRGBColorSpace) {
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  this.renderer.toneMapping = isWeChatNativeRuntime() ? (THREE.NoToneMapping || 0) : THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = 0.96;

  this.scene = new THREE.Scene();
  this.scene.fog = new THREE.Fog(PAPER_FOG, 6.5, 25);
  this.camera = new THREE.PerspectiveCamera(32, this.width / this.height, 0.1, 100);
  this.camera.position.set(10.2, 13.0, 13.0);
  this.camera.zoom = this.cameraZoom;
  if (this.camera.updateProjectionMatrix) {
    this.camera.updateProjectionMatrix();
  }
  this.camera.lookAt(0, 0.9, 0);

  this.worldGroup = new THREE.Group();
  this.worldGroup.scale.setScalar(ISLAND_SCALE);
  this.worldGroup.position.y = WORLD_BASE_Y;
  this.scene.add(this.worldGroup);
  this.terrainGroup = new THREE.Group();
  this.actorGroup = new THREE.Group();
  this.effectGroup = new THREE.Group();
  this.projectileGroup = new THREE.Group();
  this.pathGroup = new THREE.Group();
  this.enemyPathGroup = new THREE.Group();
  this.worldGroup.add(this.terrainGroup);
  this.worldGroup.add(this.actorGroup);
  this.worldGroup.add(this.enemyPathGroup);
  this.worldGroup.add(this.pathGroup);
  this.worldGroup.add(this.effectGroup);
  this.worldGroup.add(this.projectileGroup);

  this.scene.add(new THREE.HemisphereLight(0xd2c9ad, 0x5d6257, 2.25));
  this.keyLight = new THREE.DirectionalLight(0xd9c89c, 1.28);
  this.keyLight.position.set(5, 8, 3);
  this.scene.add(this.keyLight);
  this.fillLight = new THREE.DirectionalLight(0x89918a, 0.58);
  this.fillLight.position.set(-4, 5, -7);
  this.scene.add(this.fillLight);

  this.materials = this.createMaterials();
  this.createSea();
  this.createAtmosphere();
  this.gl = this.renderer.getContext();
  this.postProcessEnabled = this.shouldUsePostProcess();
  this.depthOutlineSupported = this.postProcessEnabled && this.supportsDepthTexture();

  if (this.postProcessEnabled) {
    this.renderTarget = new THREE.WebGLRenderTarget(postW, postH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false
    });
    if (this.depthOutlineSupported) {
      this.renderTarget.depthTexture = new THREE.DepthTexture(postW, postH);
      this.renderTarget.depthTexture.format = THREE.DepthFormat;
      this.renderTarget.depthTexture.type = THREE.UnsignedShortType;
    }
    this.setupPostProcess(postW, postH);
    this.verifyPostProcessTarget();
  }
  this.setupUiLayer();
};

BadNorthRuntime.prototype.shouldUsePostProcess = function () {
  // The intended art stack is low-poly geometry plus a fullscreen ink outline
  // pass. Depth textures stay disabled on WeChat, but the color-edge render
  // target is tried first and can fall back to direct rendering if unsupported.
  return true;
};

BadNorthRuntime.prototype.verifyPostProcessTarget = function () {
  var status;
  if (!this.postProcessEnabled || !this.gl || !this.renderTarget || !this.gl.checkFramebufferStatus) {
    return;
  }
  try {
    this.renderer.setRenderTarget(this.renderTarget);
    status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    this.renderer.setRenderTarget(null);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      this.disablePostProcess('framebuffer incomplete');
    }
  } catch (error) {
    this.disablePostProcess(error && error.message ? error.message : String(error));
  }
};

BadNorthRuntime.prototype.supportsDepthTexture = function () {
  // WeChat DevTools can expose WEBGL_depth_texture but fail when Three uploads
  // the depth texture internal format. Keep the outline pass on color edges so
  // the renderer starts reliably on the minigame WebGL stack.
  return false;
};

BadNorthRuntime.prototype.createMaterials = function () {
  return {
    grassLow: makeLowPolyMaterial({ color: GRASS_LOW, inkAmount: 0.15, paperBlend: 0.08, saturation: 1.12 }),
    grassMid: makeLowPolyMaterial({ color: GRASS_MID, inkAmount: 0.16, paperBlend: 0.08, saturation: 1.1 }),
    grassHigh: makeLowPolyMaterial({ color: GRASS_HIGH, inkAmount: 0.17, paperBlend: 0.08, saturation: 1.08 }),
    cliff: makeLowPolyMaterial({ color: CLIFF, inkAmount: 0.22, paperBlend: 0.13, saturation: 0.92 }),
    cliffShade: makeLowPolyMaterial({ color: CLIFF_SHADE, inkAmount: 0.26, paperBlend: 0.12, saturation: 0.88 }),
    coast: makeLowPolyMaterial({ color: 0xd4d2c4, inkAmount: 0.12, paperBlend: 0.08, saturation: 0.88 }),
    house: makeLowPolyMaterial({ color: 0xb17b4f, inkAmount: 0.16, paperBlend: 0.06, saturation: 1.12 }),
    houseShade: makeLowPolyMaterial({ color: 0x775a43, inkAmount: 0.22, paperBlend: 0.08, saturation: 1.02 }),
    roof: makeLowPolyMaterial({ color: 0x684333, inkAmount: 0.19, paperBlend: 0.06, saturation: 1.12 }),
    towerStone: makeLowPolyMaterial({ color: 0x85847b, inkAmount: 0.22, paperBlend: 0.1, saturation: 0.84 }),
    towerDark: makeLowPolyMaterial({ color: 0x4d4e49, inkAmount: 0.28, paperBlend: 0.08, saturation: 0.82 }),
    wood: makeLowPolyMaterial({ color: 0x6b382c, inkAmount: 0.17, paperBlend: 0.05, saturation: 1.14 }),
    cloth: makeLowPolyMaterial({ color: MILITIA_CLOTH, inkAmount: 0.1, paperBlend: 0.035, saturation: 1.22 }),
    leather: makeLowPolyMaterial({ color: 0x8a5437, inkAmount: 0.12, paperBlend: 0.04, saturation: 1.16 }),
    clothLight: makeLowPolyMaterial({ color: 0xd9b98f, inkAmount: 0.1, paperBlend: 0.04, saturation: 1.12 }),
    clothShadow: makeLowPolyMaterial({ color: 0x6c4e38, inkAmount: 0.16, paperBlend: 0.035, saturation: 1.08 }),
    belt: makeLowPolyMaterial({ color: 0x3f2d25, inkAmount: 0.18, paperBlend: 0.035, saturation: 1.08 }),
    boot: makeLowPolyMaterial({ color: 0x2d2924, inkAmount: 0.2, paperBlend: 0.035, saturation: 0.96 }),
    wrap: makeLowPolyMaterial({ color: 0xe2d6b8, inkAmount: 0.08, paperBlend: 0.04, saturation: 1.08 }),
    archerGreen: makeLowPolyMaterial({ color: ARCHER_GREEN, inkAmount: 0.1, paperBlend: 0.035, saturation: 1.26 }),
    rangerDark: makeLowPolyMaterial({ color: RANGER_DARK, inkAmount: 0.14, paperBlend: 0.035, saturation: 1.12 }),
    monkGold: makeLowPolyMaterial({ color: MONK_GOLD, inkAmount: 0.08, paperBlend: 0.035, saturation: 1.3 }),
    goldTrim: makeLowPolyMaterial({ color: 0xf2da76, inkAmount: 0.06, paperBlend: 0.03, saturation: 1.26 }),
    starBlue: makeLowPolyMaterial({ color: STAR_BLUE, inkAmount: 0.08, paperBlend: 0.035, saturation: 1.28 }),
    starTrim: makeLowPolyMaterial({ color: 0xaebdff, inkAmount: 0.06, paperBlend: 0.03, saturation: 1.24 }),
    starLight: new THREE.MeshBasicMaterial({ color: STAR_LIGHT }),
    lightCore: new THREE.MeshBasicMaterial({ color: 0xffd36d, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }),
    windowGlow: new THREE.MeshBasicMaterial({ color: 0xffb75e, transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false }),
    enemy: makeLowPolyMaterial({ color: ENEMY_RED, inkAmount: 0.18, paperBlend: 0.025, saturation: 1.34 }),
    enemyDark: makeLowPolyMaterial({ color: ENEMY_DARK, inkAmount: 0.28, paperBlend: 0.025, saturation: 1.18 }),
    enemyHood: makeLowPolyMaterial({ color: 0x201817, inkAmount: 0.3, paperBlend: 0.02, saturation: 1.18 }),
    enemyArmor: makeLowPolyMaterial({ color: 0x4d2923, inkAmount: 0.24, paperBlend: 0.025, saturation: 1.22 }),
    enemyShield: makeLowPolyMaterial({ color: 0x171819, inkAmount: 0.32, paperBlend: 0.02, saturation: 1.04 }),
    enemyMark: new THREE.MeshBasicMaterial({ color: 0xff6a48, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false }),
    skin: makeLowPolyMaterial({ color: 0xc59a74, inkAmount: 0.1, paperBlend: 0.035, saturation: 1.16 }),
    metal: makeLowPolyMaterial({ color: 0xb5b7ac, inkAmount: 0.16, paperBlend: 0.08, saturation: 0.88 }),
    faceInk: new THREE.MeshBasicMaterial({ color: INK_HEX, transparent: true, opacity: 0.72, depthWrite: false, toneMapped: false }),
    inkDetail: new THREE.MeshBasicMaterial({ color: INK_HEX, transparent: true, opacity: 0.48, depthWrite: false, toneMapped: false }),
    quiver: makeLowPolyMaterial({ color: 0x5b3f2f, inkAmount: 0.16, paperBlend: 0.035, saturation: 1.08 }),
    fletching: makeLowPolyMaterial({ color: 0xd9e8d2, inkAmount: 0.08, paperBlend: 0.035, saturation: 1.12 }),
    tree: makeLowPolyMaterial({ color: 0x315f3c, inkAmount: 0.22, paperBlend: 0.04, saturation: 1.16 }),
    treeDark: makeLowPolyMaterial({ color: 0x23442f, inkAmount: 0.26, paperBlend: 0.04, saturation: 1.12 }),
    trunk: makeLowPolyMaterial({ color: 0x604533, inkAmount: 0.18, paperBlend: 0.04, saturation: 1.08 }),
    rock: makeLowPolyMaterial({ color: 0x686d66, inkAmount: 0.24, paperBlend: 0.1, saturation: 0.82 }),
    smoke: new THREE.MeshBasicMaterial({ color: 0x615f55, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }),
    command: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false }),
    healthBack: new THREE.MeshBasicMaterial({ color: 0x22313a, transparent: true, opacity: 0.28, depthWrite: false }),
    healthGood: new THREE.MeshBasicMaterial({ color: 0x63a96d, depthWrite: false }),
    healthBad: new THREE.MeshBasicMaterial({ color: 0xd8694c, depthWrite: false }),
    inkShell: new THREE.MeshBasicMaterial({ color: INK_HEX, side: THREE.BackSide || 1, transparent: true, opacity: 0.24, depthWrite: false, toneMapped: false }),
    inkLine: new THREE.LineBasicMaterial({ color: INK_HEX, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false }),
    ladder: makeLowPolyMaterial({ color: 0x7c5435, inkAmount: 0.18, paperBlend: 0.04, saturation: 1.16 }),
    ladderStep: makeLowPolyMaterial({ color: 0xb58b5d, inkAmount: 0.12, paperBlend: 0.04, saturation: 1.2 }),
    pathLine: new THREE.LineBasicMaterial({ color: PATH_LINE_HEX, transparent: true, opacity: 0.88, depthWrite: false, depthTest: false, toneMapped: false }),
    pathNode: new THREE.MeshBasicMaterial({ color: PATH_NODE_HEX, transparent: true, opacity: 0.74, depthWrite: false, depthTest: false, toneMapped: false }),
    pathStrip: new THREE.MeshBasicMaterial({ color: PATH_LINE_HEX, transparent: true, opacity: 0.34, depthWrite: false, depthTest: false, toneMapped: false }),
    pathDashCore: new THREE.MeshBasicMaterial({ color: PATH_LINE_HEX, transparent: true, opacity: 0.72, depthWrite: false, depthTest: false, toneMapped: false }),
    enemyPathLine: new THREE.LineBasicMaterial({ color: ENEMY_ROUTE_HEX, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, toneMapped: false }),
    enemyPathNode: new THREE.MeshBasicMaterial({ color: ENEMY_ROUTE_NODE_HEX, transparent: true, opacity: 0.82, depthWrite: false, depthTest: false, toneMapped: false }),
    enemyPathStrip: new THREE.MeshBasicMaterial({ color: ENEMY_ROUTE_STRIP_HEX, transparent: true, opacity: 0.28, depthWrite: false, depthTest: false, toneMapped: false }),
    enemyPathDashCore: new THREE.MeshBasicMaterial({ color: ENEMY_ROUTE_HEX, transparent: true, opacity: 0.96, depthWrite: false, depthTest: false, toneMapped: false }),
    rain: new THREE.LineBasicMaterial({ color: 0xc6c2ad, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }),
    mist: new THREE.MeshBasicMaterial({ color: 0xbdb9a5, side: THREE.DoubleSide || 2, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }),
    seaFoam: new THREE.LineBasicMaterial({ color: 0xe0efe7, transparent: true, opacity: 0.34, depthWrite: false, depthTest: true, toneMapped: false }),
    boatWake: new THREE.MeshBasicMaterial({ color: 0xeaf5ee, transparent: true, opacity: 0.5, depthWrite: false, depthTest: false, toneMapped: false })
  };
};

BadNorthRuntime.prototype.createSea = function () {
  var geometry = new THREE.PlaneGeometry(44, 44, 48, 48);
  var material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(SEA_TOP) },
      uBottom: { value: new THREE.Color(MIST_WATER) }
    },
    vertexShader: [
      'precision highp float;',
      'uniform float uTime;',
      'varying vec2 vUv;',
      'varying float vWave;',
      'void main() {',
      '  vUv = uv;',
      '  vec3 p = position;',
      '  float wave = sin(p.x * 0.48 + uTime * 0.38) * ' + SEA_WAVE_A.toFixed(3) + ' + sin(p.y * 0.34 - uTime * 0.28) * ' + SEA_WAVE_B.toFixed(3) + ';',
      '  p.z += wave;',
      '  vWave = wave;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform vec3 uTop;',
      'uniform vec3 uBottom;',
      'uniform float uTime;',
      'varying vec2 vUv;',
      'varying float vWave;',
      'void main() {',
      '  vec3 color = mix(uBottom, uTop, smoothstep(0.05, 0.95, vUv.y));',
      '  float wash = sin(vUv.x * 13.0 + uTime * 0.06) * sin(vUv.y * 9.0 - uTime * 0.05);',
      '  float paper = sin(gl_FragCoord.x * 0.39 + gl_FragCoord.y * 0.27) * 0.018;',
      '  float foam = smoothstep(0.05, 0.058, abs(sin((vUv.x + vUv.y) * 16.0 + uTime * 0.14)) * 0.055);',
      '  color = mix(color, vec3(0.62, 0.76, 0.77), 0.08 + wash * 0.02);',
      '  color += vec3(0.045, 0.065, 0.07) * foam + vWave * 0.24 + paper * 0.55;',
      '  gl_FragColor = vec4(pow(color, vec3(0.96)), 1.0);',
      '}'
    ].join('\n'),
    toneMapped: false
  });
  this.seaMesh = new THREE.Mesh(geometry, material);
  this.seaMesh.rotation.x = -Math.PI / 2;
  this.seaMesh.position.y = SEA_LEVEL_Y;
  this.scene.add(this.seaMesh);
  this.seaMaterial = material;
  this.createSeaWaveLines();
};

BadNorthRuntime.prototype.createSeaWaveLines = function () {
  var i;
  var layout;
  var line;
  var geometry;
  var material;
  var length;
  var waveLayouts = [
    { x: -7.8, z: -5.8, a: 0.22, l: 2.6, s: 0.36, dx: 0.54, dz: 0.12 },
    { x: -4.7, z: -6.6, a: -0.08, l: 2.1, s: 0.32, dx: 0.38, dz: -0.08 },
    { x: -1.6, z: -7.2, a: 0.14, l: 2.4, s: 0.3, dx: 0.42, dz: 0.1 },
    { x: 2.7, z: -6.9, a: -0.18, l: 2.5, s: 0.34, dx: 0.48, dz: -0.08 },
    { x: 6.5, z: -5.7, a: 0.12, l: 2.8, s: 0.31, dx: 0.5, dz: 0.14 },
    { x: -8.4, z: -1.6, a: -0.16, l: 2.2, s: 0.33, dx: 0.46, dz: -0.1 },
    { x: 8.2, z: -1.2, a: 0.18, l: 2.3, s: 0.35, dx: 0.5, dz: 0.1 },
    { x: -8.9, z: 2.4, a: 0.08, l: 2.7, s: 0.3, dx: 0.42, dz: 0.09 },
    { x: 8.9, z: 2.1, a: -0.22, l: 2.6, s: 0.36, dx: 0.52, dz: -0.12 },
    { x: -6.6, z: 5.9, a: -0.1, l: 2.5, s: 0.31, dx: 0.4, dz: 0.09 },
    { x: -2.2, z: 7.3, a: 0.16, l: 2.2, s: 0.34, dx: 0.44, dz: -0.1 },
    { x: 2.4, z: 7.1, a: -0.14, l: 2.8, s: 0.32, dx: 0.48, dz: 0.1 },
    { x: 6.8, z: 5.6, a: 0.2, l: 2.3, s: 0.35, dx: 0.46, dz: -0.08 },
    { x: -10.2, z: 6.9, a: -0.04, l: 3.0, s: 0.28, dx: 0.56, dz: 0.13 },
    { x: 10.0, z: -6.8, a: 0.04, l: 3.1, s: 0.29, dx: 0.58, dz: -0.1 },
    { x: -0.4, z: -9.7, a: 0.18, l: 2.9, s: 0.27, dx: 0.5, dz: 0.12 },
    { x: 0.8, z: 9.8, a: -0.18, l: 3.0, s: 0.27, dx: 0.48, dz: -0.11 },
    { x: -10.8, z: 0.2, a: 0.12, l: 2.4, s: 0.31, dx: 0.52, dz: 0.06 },
    { x: 10.7, z: 0.4, a: -0.12, l: 2.4, s: 0.31, dx: 0.52, dz: -0.06 }
  ];

  this.seaWaveGroup = new THREE.Group();
  for (i = 0; i < waveLayouts.length; i += 1) {
    layout = waveLayouts[i];
    length = layout.l;
    geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-length * 0.5, 0, 0),
      new THREE.Vector3(-length * 0.18, 0, 0.035),
      new THREE.Vector3(length * 0.18, 0, -0.025),
      new THREE.Vector3(length * 0.5, 0, 0)
    ]);
    material = this.materials.seaFoam.clone();
    material.opacity = 0.18 + hashNumber(i * 37 + 5) * 0.18;
    line = new THREE.Line(geometry, material);
    line.position.set(layout.x, SEA_SURFACE_FOAM_Y + 0.006 + i * 0.0002, layout.z);
    line.rotation.y = layout.a;
    line.userData = {
      baseX: layout.x,
      baseZ: layout.z,
      driftX: layout.dx,
      driftZ: layout.dz,
      speed: layout.s,
      phase: hashNumber(i * 53 + 11),
      opacity: material.opacity
    };
    this.seaWaveGroup.add(line);
  }
  this.scene.add(this.seaWaveGroup);
};

BadNorthRuntime.prototype.getMinimumSeaTerrainGap = function () {
  return LOWEST_TERRAIN_TOP_Y - (SEA_LEVEL_Y + SEA_WAVE_A + SEA_WAVE_B);
};

BadNorthRuntime.prototype.hasStableSeaTerrainGap = function () {
  return this.getMinimumSeaTerrainGap() >= MIN_SEA_TERRAIN_GAP;
};

BadNorthRuntime.prototype.createAtmosphere = function () {
  var i;
  var line;
  var geometry;
  var x;
  var y;
  var z;
  var plane;
  var mistLayout = [
    { x: -3.4, z: 3.1, sx: 4.2, sz: 1.25, a: 0.18 },
    { x: 3.2, z: 2.6, sx: 3.8, sz: 1.18, a: 0.16 },
    { x: -3.7, z: -2.4, sx: 3.2, sz: 1.05, a: 0.14 },
    { x: 3.6, z: -2.1, sx: 3.4, sz: 1.12, a: 0.15 }
  ];

  this.rainGroup = new THREE.Group();
  for (i = 0; i < 72; i += 1) {
    x = -6.5 + hashNumber(i * 19 + 3) * 13;
    y = 0.4 + hashNumber(i * 23 + 11) * 8.4;
    z = -5.8 + hashNumber(i * 31 + 7) * 13.8;
    geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.08, -0.62 - hashNumber(i * 13) * 0.36, 0.03)
    ]);
    line = new THREE.Line(geometry, this.materials.rain);
    line.position.set(x, y, z);
    line.userData = {
      speed: 1.8 + hashNumber(i * 17 + 5) * 1.4,
      startY: y
    };
    this.rainGroup.add(line);
  }
  this.scene.add(this.rainGroup);

  this.mistGroup = new THREE.Group();
  for (i = 0; i < mistLayout.length; i += 1) {
    plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.materials.mist.clone());
    plane.material.opacity = mistLayout[i].a;
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(mistLayout[i].x, -0.015, mistLayout[i].z);
    plane.scale.set(mistLayout[i].sx, mistLayout[i].sz, 1);
    this.mistGroup.add(plane);
  }
  this.worldGroup.add(this.mistGroup);
};

BadNorthRuntime.prototype.updateAtmosphere = function (dt) {
  var i;
  var line;
  this.updateSeaWaveLines(dt);
  if (!this.rainGroup) {
    return;
  }
  for (i = 0; i < this.rainGroup.children.length; i += 1) {
    line = this.rainGroup.children[i];
    line.position.y -= (line.userData.speed || 2) * dt;
    line.position.x += Math.sin(this.elapsed * 0.7 + i) * dt * 0.05;
    if (line.position.y < -0.8) {
      line.position.y = 7.6 + hashNumber(i * 29 + Math.floor(this.elapsed)) * 1.4;
    }
  }
  if (this.mistGroup) {
    this.mistGroup.position.y = Math.sin(this.elapsed * 0.35) * 0.015;
  }
};

BadNorthRuntime.prototype.updateSeaWaveLines = function () {
  var i;
  var line;
  var phase;
  var breathe;
  if (!this.seaWaveGroup) {
    return;
  }
  for (i = 0; i < this.seaWaveGroup.children.length; i += 1) {
    line = this.seaWaveGroup.children[i];
    phase = (line.userData.phase + this.elapsed * line.userData.speed) % 1;
    breathe = Math.sin(phase * Math.PI);
    line.position.x = line.userData.baseX + line.userData.driftX * phase;
    line.position.z = line.userData.baseZ + line.userData.driftZ * phase;
    line.scale.set(0.86 + phase * 0.28, 1, 1);
    if (line.material) {
      line.material.opacity = line.userData.opacity * (0.28 + breathe * 0.72);
    }
  }
};

BadNorthRuntime.prototype.addInkShell = function (mesh, scale, opacity) {
  var material;
  var shell;
  if (!mesh || !mesh.geometry || !this.materials || !this.materials.inkShell) {
    return null;
  }
  material = this.materials.inkShell.clone();
  material.opacity = opacity !== undefined ? opacity : 0.24;
  shell = new THREE.Mesh(mesh.geometry, material);
  shell.scale.setScalar(scale || 1.025);
  shell.userData = {
    isInkShell: true
  };
  mesh.add(shell);
  return shell;
};

BadNorthRuntime.prototype.addInkShells = function (root, scale, opacity) {
  var children;
  var i;
  if (!root) {
    return;
  }
  if (root.geometry && !root.userData.isInkShell) {
    this.addInkShell(root, scale, opacity);
  }
  children = root.children ? root.children.slice() : [];
  for (i = 0; i < children.length; i += 1) {
    if (!children[i].userData || !children[i].userData.isInkShell) {
      this.addInkShells(children[i], scale, opacity);
    }
  }
};

BadNorthRuntime.prototype.createInkStroke = function (x, y, z, length, angle, opacity) {
  var dx = Math.cos(angle) * length * 0.5;
  var dz = Math.sin(angle) * length * 0.5;
  var geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-dx, 0, -dz),
    new THREE.Vector3(dx, 0, dz)
  ]);
  var material = this.materials.inkLine.clone();
  var line = new THREE.Line(geometry, material);
  material.opacity = opacity !== undefined ? opacity : 0.34;
  line.position.set(x, y, z);
  this.terrainGroup.add(line);
  return line;
};

BadNorthRuntime.prototype.setupPostProcess = function (width, height) {
  this.postScene = new THREE.Scene();
  this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.postMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: this.renderTarget.texture },
      tDepth: { value: this.renderTarget.depthTexture || this.renderTarget.texture },
      uResolution: { value: new THREE.Vector2(width, height) },
      uOutline: { value: 1.0 },
      uInkStrength: { value: isWeChatNativeRuntime() ? 1.28 : 1.12 },
      uPaperStrength: { value: 0.09 },
      uUseDepth: { value: this.depthOutlineSupported ? 1.0 : 0.0 },
      uCameraNear: { value: this.camera.near },
      uCameraFar: { value: this.camera.far }
    },
    vertexShader: [
      'precision highp float;',
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = vec4(position.xy, 0.0, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform sampler2D tDiffuse;',
      'uniform sampler2D tDepth;',
      'uniform vec2 uResolution;',
      'uniform float uOutline;',
      'uniform float uInkStrength;',
      'uniform float uPaperStrength;',
      'uniform float uUseDepth;',
      'uniform float uCameraNear;',
      'uniform float uCameraFar;',
      'varying vec2 vUv;',
      'float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }',
      'float viewZFromDepth(float depth) {',
      '  float z = depth * 2.0 - 1.0;',
      '  return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));',
      '}',
      'float depthEdge(float centerDepth, vec2 uv, vec2 off) {',
      '  float centerZ = viewZFromDepth(centerDepth);',
      '  float nearZ = viewZFromDepth(texture2D(tDepth, uv + off).x);',
      '  return abs(centerZ - nearZ);',
      '}',
      'void main() {',
      '  vec2 px = 1.0 / uResolution;',
      '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
      '  float centerDepth = texture2D(tDepth, vUv).x;',
      '  float linearDepth = mix(7.0, viewZFromDepth(centerDepth), uUseDepth);',
      '  float l = luma(c);',
      '  float colorEdge = 0.0;',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv + vec2(px.x, px.y) * 1.35).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv + vec2(-px.x, px.y) * 1.35).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv + vec2(px.x, -px.y) * 1.35).rgb)));',
      '  colorEdge = max(colorEdge, abs(l - luma(texture2D(tDiffuse, vUv + vec2(-px.x, -px.y) * 1.35).rgb)));',
      '  float zEdge = 0.0;',
      '  zEdge = max(zEdge, depthEdge(centerDepth, vUv, vec2(px.x, 0.0)));',
      '  zEdge = max(zEdge, depthEdge(centerDepth, vUv, vec2(-px.x, 0.0)));',
      '  zEdge = max(zEdge, depthEdge(centerDepth, vUv, vec2(0.0, px.y)));',
      '  zEdge = max(zEdge, depthEdge(centerDepth, vUv, vec2(0.0, -px.y)));',
      '  zEdge *= uUseDepth;',
      '  float colorLine = smoothstep(0.05, 0.16, colorEdge);',
      '  float depthLine = smoothstep(0.035, 0.34, zEdge);',
      '  float nearStrength = 1.0 - smoothstep(8.0, 24.0, linearDepth);',
      '  float fogFade = 1.0 - smoothstep(14.0, 30.0, linearDepth);',
      '  float backgroundMask = mix(1.0, 1.0 - step(0.9995, centerDepth), uUseDepth);',
      '  float outline = max(colorLine * 0.78, depthLine) * nearStrength * fogFade * backgroundMask * uOutline * uInkStrength;',
      '  float paperNoise = sin(gl_FragCoord.x * 0.91 + gl_FragCoord.y * 0.37) * sin(gl_FragCoord.x * 0.23 - gl_FragCoord.y * 0.71);',
      '  float brushNoise = sin((vUv.x + vUv.y) * 42.0) * 0.5 + 0.5;',
      '  outline *= 0.82 + brushNoise * 0.28;',
      '  vec3 ink = vec3(0.18, 0.19, 0.16);',
      '  vec3 paperTint = vec3(0.71, 0.67, 0.56);',
      '  c = mix(c, ink, outline * 0.72);',
      '  c = mix(c, paperTint, uPaperStrength * (0.35 + paperNoise * 0.09));',
      '  float vignette = smoothstep(0.86, 0.18, distance(vUv, vec2(0.5)));',
      '  c = mix(vec3(0.62, 0.66, 0.61), c, vignette);',
      '  c = mix(c, vec3(0.42, 0.48, 0.48), smoothstep(0.64, 1.0, 1.0 - vUv.y) * 0.14);',
      '  c = pow(c, vec3(0.96));',
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n'),
    toneMapped: false
  });
  this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
  this.postScene.add(this.postQuad);
};

BadNorthRuntime.prototype.setupUiLayer = function () {
  this.uiCanvas = createOffscreenCanvas(this.width, this.height, this.pixelRatio);
  this.uiCtx = this.uiCanvas ? this.uiCanvas.getContext('2d') : null;
  if (this.uiCtx && this.uiCtx.setTransform) {
    this.uiCtx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }
  this.uiTexture = new THREE.CanvasTexture(this.uiCanvas);
  this.uiTexture.minFilter = THREE.LinearFilter;
  this.uiTexture.magFilter = THREE.LinearFilter;
  this.uiTexture.generateMipmaps = false;
  // WeChat's native canvas is not a browser image type. Mark the UI canvas
  // as linear so Three does not try a per-frame CPU sRGB conversion fallback.
  this.uiTexture.colorSpace = THREE.LinearSRGBColorSpace || THREE.NoColorSpace || '';
  this.uiScene = new THREE.Scene();
  this.uiCamera = new THREE.OrthographicCamera(0, this.width, this.height, 0, -10, 10);
  this.uiPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(this.width, this.height),
    new THREE.MeshBasicMaterial({
      map: this.uiTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    })
  );
  this.uiPlane.position.set(this.width / 2, this.height / 2, 0);
  this.uiScene.add(this.uiPlane);
};

BadNorthRuntime.prototype.buildIslandData = function () {
  var z;
  var x;
  var row;
  var value;
  var centerZ = Math.floor(TILE_MAP.length / 2);
  var centerX = Math.floor(TILE_MAP[0].length / 2);
  var tile;

  this.tiles = [];
  this.tileLookup = {};
  for (z = 0; z < TILE_MAP.length; z += 1) {
    row = TILE_MAP[z];
    for (x = 0; x < row.length; x += 1) {
      value = Number(row.charAt(x));
      if (!value) {
        continue;
      }
      tile = {
        x: x - centerX,
        z: z - centerZ,
        h: value,
        seed: hashNumber((x + 13) * 17 + (z + 19) * 31)
      };
      this.tiles.push(tile);
      this.tileLookup[this.getTileKey(tile.x, tile.z)] = tile;
    }
  }
};

BadNorthRuntime.prototype.rebuildStaticScene = function () {
  clearGroup(this.terrainGroup);
  this.pickables = [];
  this.createTerrainMeshes();
  this.createDecorMeshes();
  this.createLadderMeshes();
};

BadNorthRuntime.prototype.createTerrainMeshes = function () {
  var i;
  var tile;
  var height;
  var geometry;
  var material;
  var mesh;
  var sideMaterial;
  var materialArray;

  for (i = 0; i < this.tiles.length; i += 1) {
    tile = this.tiles[i];
    height = tile.h * HEIGHT_UNIT;
    geometry = new THREE.BoxGeometry(1.04, height, 1.04);
    material = tile.h >= 3 ? this.materials.grassHigh : (tile.h === 2 ? this.materials.grassMid : this.materials.grassLow);
    sideMaterial = tile.seed > 0.55 ? this.materials.cliff : this.materials.cliffShade;
    materialArray = [sideMaterial, sideMaterial, material, this.materials.cliffShade, sideMaterial, sideMaterial];
    mesh = new THREE.Mesh(geometry, materialArray);
    mesh.position.set(tile.x, height / 2, tile.z);
    mesh.userData = {
      type: 'tile',
      tile: tile
    };
    this.addInkShell(mesh, 1.014, 0.2 + tile.h * 0.018);
    this.terrainGroup.add(mesh);
    this.pickables.push(mesh);
    this.createCoastCurbs(tile);
    this.createTerrainInkMarks(tile, height);
  }
};

BadNorthRuntime.prototype.createTerrainInkMarks = function (tile, height) {
  var top = height + 0.026;
  var seed = tile.seed;
  var count = seed > 0.66 ? 2 : 1;
  var i;
  var localSeed;
  for (i = 0; i < count; i += 1) {
    localSeed = hashNumber((tile.x + 17) * (i + 3) * 23 + (tile.z + 29) * 41);
    if (localSeed < 0.26) {
      continue;
    }
    this.createInkStroke(
      tile.x - 0.28 + hashNumber(localSeed * 19 + i) * 0.56,
      top,
      tile.z - 0.28 + hashNumber(localSeed * 31 + i) * 0.56,
      0.18 + hashNumber(localSeed * 47 + i) * 0.22,
      hashNumber(localSeed * 59 + i) * Math.PI,
      0.16 + tile.h * 0.035
    );
  }
};

BadNorthRuntime.prototype.createCoastCurbs = function (tile) {
  var dirs = [
    { x: 0, z: -1, px: 0, pz: -0.54, sx: 0.98, sz: 0.06 },
    { x: 1, z: 0, px: 0.54, pz: 0, sx: 0.06, sz: 0.98 },
    { x: 0, z: 1, px: 0, pz: 0.54, sx: 0.98, sz: 0.06 },
    { x: -1, z: 0, px: -0.54, pz: 0, sx: 0.06, sz: 0.98 }
  ];
  var i;
  var dir;
  var neighbor;
  var mesh;
  var top = tile.h * HEIGHT_UNIT + 0.02;
  for (i = 0; i < dirs.length; i += 1) {
    dir = dirs[i];
    neighbor = this.tileLookup[this.getTileKey(tile.x + dir.x, tile.z + dir.z)];
    if (neighbor) {
      continue;
    }
    mesh = new THREE.Mesh(new THREE.BoxGeometry(dir.sx, 0.035, dir.sz), this.materials.coast);
    mesh.position.set(tile.x + dir.px, top, tile.z + dir.pz);
    this.addInkShell(mesh, 1.035, 0.18);
    this.terrainGroup.add(mesh);
  }
};

BadNorthRuntime.prototype.createDecorMeshes = function () {
  var decor = [
    { type: 'tree', x: -3.4, z: 0.8, s: 0.86 },
    { type: 'tree', x: -2.8, z: 1.22, s: 0.72 },
    { type: 'tree', x: -2.15, z: 1.05, s: 0.64 },
    { type: 'tree', x: 0.75, z: -2.35, s: 0.7 },
    { type: 'tree', x: 1.35, z: -1.95, s: 0.58 },
    { type: 'tree', x: 2.65, z: -0.75, s: 0.62 },
    { type: 'tree', x: -4.2, z: -0.35, s: 1.08 },
    { type: 'tree', x: -4.45, z: 0.25, s: 0.94 },
    { type: 'bush', x: -1.45, z: 2.75, s: 0.8 },
    { type: 'bush', x: 2.5, z: 1.72, s: 0.75 },
    { type: 'rock', x: -4.0, z: 2.3, s: 0.72 },
    { type: 'rock', x: 3.6, z: 1.6, s: 0.62 }
  ];
  var i;
  var item;
  var mesh;
  for (i = 0; i < decor.length; i += 1) {
    item = decor[i];
    if (item.type === 'tree') {
      mesh = this.createTreeMesh(item.s);
    } else if (item.type === 'bush') {
      mesh = this.createBushMesh(item.s);
    } else {
      mesh = this.createRockMesh(item.s);
    }
    mesh.position.set(item.x, this.getHeightAt(item.x, item.z), item.z);
    this.addInkShells(mesh, 1.035, item.type === 'tree' ? 0.3 : 0.24);
    this.terrainGroup.add(mesh);
  }
};

BadNorthRuntime.prototype.createTreeMesh = function (scale) {
  var group = new THREE.Group();
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.06 * scale, 0.34 * scale, 5), this.materials.trunk);
  var crown = new THREE.Mesh(new THREE.ConeGeometry(0.25 * scale, 0.58 * scale, 6), this.materials.tree);
  var crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.2 * scale, 0.42 * scale, 6), this.materials.treeDark);
  trunk.position.y = 0.17 * scale;
  crown.position.y = 0.58 * scale;
  crown2.position.set(0.08 * scale, 0.42 * scale, -0.06 * scale);
  group.add(trunk);
  group.add(crown);
  group.add(crown2);
  return group;
};

BadNorthRuntime.prototype.createBushMesh = function (scale) {
  var group = new THREE.Group();
  var a = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 * scale, 0), this.materials.tree);
  var b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 * scale, 0), this.materials.treeDark);
  a.position.y = 0.15 * scale;
  b.position.set(0.16 * scale, 0.12 * scale, 0.02 * scale);
  group.add(a);
  group.add(b);
  return group;
};

BadNorthRuntime.prototype.createRockMesh = function (scale) {
  var mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 * scale, 0), this.materials.rock);
  mesh.scale.set(1.2, 0.55, 0.86);
  mesh.position.y = 0.12 * scale;
  return mesh;
};

BadNorthRuntime.prototype.createLadderMeshes = function () {
  var dirs = [
    { x: 1, z: 0 },
    { x: 0, z: 1 }
  ];
  var i;
  var j;
  var tile;
  var neighbor;
  var candidates = [];
  var selected = [];
  var candidate;
  this.ladderCount = 0;
  for (i = 0; i < this.tiles.length; i += 1) {
    tile = this.tiles[i];
    for (j = 0; j < dirs.length; j += 1) {
      neighbor = this.tileLookup[this.getTileKey(tile.x + dirs[j].x, tile.z + dirs[j].z)];
      if (!neighbor || Math.abs(tile.h - neighbor.h) !== 1 || !this.isLadderClearOfHouses(tile, neighbor)) {
        continue;
      }
      candidates.push({
        a: tile,
        b: neighbor,
        x: (tile.x + neighbor.x) * 0.5,
        z: (tile.z + neighbor.z) * 0.5,
        score: this.getLadderCandidateScore(tile, neighbor)
      });
    }
  }
  candidates.sort(function (a, b) {
    return b.score - a.score;
  });
  for (i = 0; i < candidates.length && selected.length < LADDER_MAX_COUNT; i += 1) {
    candidate = candidates[i];
    if (!this.isLadderCandidateSpaced(candidate, selected)) {
      continue;
    }
    selected.push(candidate);
    this.terrainGroup.add(this.createLadderMesh(candidate.a, candidate.b));
    this.ladderCount += 1;
  }
};

BadNorthRuntime.prototype.getLadderCandidateScore = function (a, b) {
  var centerX = (a.x + b.x) * 0.5;
  var centerZ = (a.z + b.z) * 0.5;
  var high = Math.max(a.h, b.h);
  var centerBias = Math.max(0, 5.8 - utils.distance(centerX, centerZ, 0, 0)) * 0.22;
  var directionBias = Math.abs(a.x - b.x) > 0 ? 0.12 : 0;
  var seed = hashNumber((a.x + 19) * 29 + (a.z + 23) * 37 + (b.x + 31) * 41 + (b.z + 43) * 47);
  return high * 0.9 + centerBias + directionBias + seed * 0.32;
};

BadNorthRuntime.prototype.isLadderCandidateSpaced = function (candidate, selected) {
  var i;
  for (i = 0; i < selected.length; i += 1) {
    if (utils.distanceSquared(candidate.x, candidate.z, selected[i].x, selected[i].z) < LADDER_MIN_SPACING * LADDER_MIN_SPACING) {
      return false;
    }
  }
  return true;
};

BadNorthRuntime.prototype.isLadderClearOfHouses = function (a, b) {
  var centerX;
  var centerZ;
  var ladderHalfW;
  var ladderHalfD;
  var i;
  var house;
  var houseHalfW;
  var houseHalfD;

  if (!a || !b || this.isHouseBlockingTile(a.x, a.z) || this.isHouseBlockingTile(b.x, b.z)) {
    return false;
  }

  centerX = (a.x + b.x) * 0.5;
  centerZ = (a.z + b.z) * 0.5;
  if (Math.abs(b.x - a.x) > 0) {
    ladderHalfW = LADDER_FOOTPRINT_HALF_NARROW;
    ladderHalfD = LADDER_FOOTPRINT_HALF_WIDE;
  } else {
    ladderHalfW = LADDER_FOOTPRINT_HALF_WIDE;
    ladderHalfD = LADDER_FOOTPRINT_HALF_NARROW;
  }

  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    houseHalfW = house.w * 0.5 + LADDER_HOUSE_CLEARANCE;
    houseHalfD = house.d * 0.5 + LADDER_HOUSE_CLEARANCE;
    if (Math.abs(centerX - house.x) <= houseHalfW + ladderHalfW && Math.abs(centerZ - house.z) <= houseHalfD + ladderHalfD) {
      return false;
    }
  }
  return true;
};

BadNorthRuntime.prototype.createLadderMesh = function (a, b) {
  var group = new THREE.Group();
  var low = a.h < b.h ? a : b;
  var high = a.h < b.h ? b : a;
  var dx = b.x - a.x;
  var dz = b.z - a.z;
  var lowY = low.h * HEIGHT_UNIT;
  var highY = high.h * HEIGHT_UNIT + 0.04;
  var height = Math.max(0.36, highY - lowY + 0.08);
  var centerY = lowY + height * 0.5;
  var centerX = (a.x + b.x) * 0.5;
  var centerZ = (a.z + b.z) * 0.5;
  var offsetX = 0;
  var offsetZ = 0;
  var railA;
  var railB;
  var rung;
  var rungCount = 4;
  var i;
  var t;
  var y;

  if (Math.abs(dx) > 0) {
    offsetX = low.x < high.x ? -0.035 : 0.035;
    railA = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.035), this.materials.ladder);
    railB = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.035), this.materials.ladder);
    railA.position.set(centerX + offsetX, centerY, centerZ - 0.17);
    railB.position.set(centerX + offsetX, centerY, centerZ + 0.17);
    group.add(railA);
    group.add(railB);
    for (i = 0; i < rungCount; i += 1) {
      t = (i + 0.5) / rungCount;
      y = lowY + 0.05 + t * (height - 0.1);
      rung = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.026, 0.38), this.materials.ladderStep);
      rung.position.set(centerX + offsetX - 0.004, y, centerZ);
      group.add(rung);
    }
  } else {
    offsetZ = low.z < high.z ? -0.035 : 0.035;
    railA = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.035), this.materials.ladder);
    railB = new THREE.Mesh(new THREE.BoxGeometry(0.035, height, 0.035), this.materials.ladder);
    railA.position.set(centerX - 0.17, centerY, centerZ + offsetZ);
    railB.position.set(centerX + 0.17, centerY, centerZ + offsetZ);
    group.add(railA);
    group.add(railB);
    for (i = 0; i < rungCount; i += 1) {
      t = (i + 0.5) / rungCount;
      y = lowY + 0.05 + t * (height - 0.1);
      rung = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.026, 0.048), this.materials.ladderStep);
      rung.position.set(centerX, y, centerZ + offsetZ - 0.004);
      group.add(rung);
    }
  }
  this.addInkShells(group, 1.035, 0.22);
  group.userData = {
    type: 'ladder',
    from: this.getTileKey(a.x, a.z),
    to: this.getTileKey(b.x, b.z)
  };
  return group;
};

BadNorthRuntime.prototype.setupSimulation = function () {
  this.houses = [
    { id: 'chapel', name: '礼拜堂', x: 0.2, z: -2.7, hp: 90, maxHp: 90, w: 0.78, d: 0.68 },
    { id: 'hall', name: '长屋', x: 1.8, z: -1.3, hp: 130, maxHp: 130, w: 0.95, d: 0.76 },
    { id: 'dock-home', name: '码头屋', x: -1.7, z: 2.1, hp: 95, maxHp: 95, w: 0.78, d: 0.72 }
  ];
  this.squads = [
    this.createSquad('militia', -0.95, 2.45),
    this.createSquad('archer', -0.25, 2.0),
    this.createSquad('ranger', 0.85, 1.55),
    this.createSquad('monk', 1.75, 0.62),
    this.createSquad('star', 2.0, -0.45)
  ];
  this.selectedSquadId = this.squads[0].id;
  this.enemies = [];
  this.boats = [];
  this.projectiles = [];
  this.effects = [];
  this.decoys = [];
  this.prisons = [];
};

BadNorthRuntime.prototype.createSquad = function (id, x, z) {
  var stats = SQUAD_DEFS[id];
  return {
    id: id,
    name: stats.name,
    x: x,
    z: z,
    targetX: x,
    targetZ: z,
    color: stats.color,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    count: stats.count,
    maxCount: stats.count,
    range: stats.range,
    speed: stats.speed,
    damage: stats.damage,
    cooldownBase: stats.cooldown,
    armor: stats.armor,
    attack: stats.attack,
    projectile: stats.projectile || '',
    skill: stats.skill,
    skillName: stats.skillName,
    skillCooldown: stats.skillCooldown || 0,
    skillTimer: 0,
    attackTimer: 0,
    commandPulse: 0,
    movePath: [],
    pathIndex: 0,
    displayY: this.getHeightAt(x, z),
    walkCycle: 0,
    climbAmount: 0,
    climbDirection: 0,
    isMoving: false,
    attackPulse: 0,
    hitPulse: 0,
    attackDirX: 0,
    attackDirZ: 1,
    engagedEnemyId: '',
    engagementTimer: 0,
    moveDirX: 0,
    moveDirZ: 1
  };
};

BadNorthRuntime.prototype.rebuildActorMeshes = function () {
  clearGroup(this.actorGroup);
  clearGroup(this.effectGroup);
  clearGroup(this.projectileGroup);
  this.houseMeshes = {};
  this.squadMeshes = {};
  this.enemyMeshes = {};
  this.boatMeshes = {};
  this.createHouseMeshes();
  this.createSquadMeshes();
};

BadNorthRuntime.prototype.createHouseMeshes = function () {
  var i;
  var house;
  var group;
  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    group = this.createHouseMesh(house);
    group.position.set(house.x, this.getHeightAt(house.x, house.z), house.z);
    this.houseMeshes[house.id] = group;
    this.actorGroup.add(group);
  }
};

BadNorthRuntime.prototype.createHouseMesh = function (house) {
  var group = new THREE.Group();
  if (house.id === 'chapel') {
    return this.createWatchtowerHouseMesh(house);
  }
  var body = new THREE.Mesh(new THREE.BoxGeometry(house.w, 0.52, house.d), [this.materials.houseShade, this.materials.houseShade, this.materials.house, this.materials.houseShade, this.materials.house, this.materials.houseShade]);
  var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(house.w, house.d) * 0.68, 0.34, 4), this.materials.roof);
  var flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5), this.materials.metal);
  var flag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.018), makeLowPolyMaterial({ color: 0xf5f0d6 }));
  var hp = this.createHealthMesh(0.56);
  body.position.y = 0.26;
  roof.position.y = 0.68;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = house.d / house.w;
  flagPole.position.set(house.w * 0.32, 1.0, -house.d * 0.18);
  flag.position.set(house.w * 0.43, 1.08, -house.d * 0.18);
  hp.position.set(0, 1.14, 0);
  group.add(body);
  group.add(roof);
  group.add(flagPole);
  group.add(flag);
  group.add(hp);
  this.addInkShell(body, 1.03, 0.28);
  this.addInkShell(roof, 1.04, 0.28);
  this.addInkShell(flagPole, 1.08, 0.22);
  this.addInkShell(flag, 1.06, 0.2);
  group.userData = {
    hpMesh: hp,
    body: body,
    roof: roof
  };
  return group;
};

BadNorthRuntime.prototype.createWatchtowerHouseMesh = function () {
  var group = new THREE.Group();
  var base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.82, 6), this.materials.towerStone);
  var cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 6), this.materials.house);
  var roof = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.26, 6), this.materials.towerDark);
  var windowA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.018), this.materials.windowGlow);
  var windowB = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.018), this.materials.windowGlow);
  var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 6), this.materials.metal);
  var hp = this.createHealthMesh(0.58);
  base.position.y = 0.41;
  cabin.position.y = 0.94;
  roof.position.y = 1.22;
  windowA.position.set(0, 0.95, 0.346);
  windowB.position.set(0.3, 0.95, -0.17);
  windowB.rotation.y = Math.PI * 0.66;
  cap.position.y = 1.38;
  hp.position.set(0, 1.54, 0);
  group.add(base);
  group.add(cabin);
  group.add(roof);
  group.add(windowA);
  group.add(windowB);
  group.add(cap);
  group.add(hp);
  this.addInkShell(base, 1.035, 0.32);
  this.addInkShell(cabin, 1.035, 0.28);
  this.addInkShell(roof, 1.045, 0.34);
  this.addInkShell(cap, 1.08, 0.24);
  group.userData = {
    hpMesh: hp,
    body: base,
    roof: roof
  };
  return group;
};

BadNorthRuntime.prototype.createSquadMeshes = function () {
  var i;
  var squad;
  var group;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    group = this.createSquadMesh(squad);
    this.squadMeshes[squad.id] = group;
    this.actorGroup.add(group);
  }
};

BadNorthRuntime.prototype.createSquadMesh = function (squad) {
  var group = new THREE.Group();
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.016, 6, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.66, depthWrite: false }));
  var flag = this.createSquadFlag(squad.color);
  var hp = this.createHealthMesh(0.48);
  var soldiers = [];
  var i;
  var soldier;
  var offset;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  flag.position.set(-0.36, 0, -0.32);
  hp.position.set(0, 0.98, 0);
  group.add(ring);
  group.add(flag);
  group.add(hp);
  for (i = 0; i < squad.maxCount; i += 1) {
    soldier = this.createSoldierMesh(squad.color, squad.id, true);
    offset = SQUAD_FORMATION_OFFSETS[i % SQUAD_FORMATION_OFFSETS.length];
    soldier.position.set(offset[0], 0, offset[1]);
    soldier.userData.seed = i;
    soldiers.push(soldier);
    group.add(soldier);
  }
  group.userData = {
    ring: ring,
    flag: flag,
    hpMesh: hp,
    soldiers: soldiers
  };
  return group;
};

BadNorthRuntime.prototype.createSquadFlag = function (color) {
  var group = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.72, 5), this.materials.metal);
  var cloth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.026), makeLowPolyMaterial({ color: color, inkAmount: 0.08, paperBlend: 0.02, saturation: 1.3 }));
  pole.position.y = 0.36;
  cloth.position.set(0.17, 0.58, 0);
  group.add(pole);
  group.add(cloth);
  return group;
};

BadNorthRuntime.prototype.createSoldierMesh = function (color, type, friendly) {
  var group = new THREE.Group();
  var bodyMaterial;
  var cloakMaterial;
  var body;
  var head;
  var cloak;
  if (!friendly) {
    return this.createEnemySoldierMesh(type);
  }
  bodyMaterial = makeLowPolyMaterial({ color: color, inkAmount: 0.1, paperBlend: 0.035, saturation: 1.24 });
  cloakMaterial = this.getClassMaterial(type);
  body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.34, 5), bodyMaterial);
  head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.105, 0), this.materials.skin);
  group.scale.setScalar(friendly ? 0.82 : 0.78);
  body.position.y = 0.25;
  head.position.y = 0.52;
  group.userData = {
    faction: 'friendly',
    silhouette: 'class-readable',
    detailLevel: 'refined-role'
  };
  group.add(body);
  group.add(head);
  this.addFriendlyAnatomy(group, type);

  if (type === 'militia') {
    this.addSword(group, 0.48);
    this.addShield(group, this.materials.wood, 0.15);
    this.addMilitiaRoleDetails(group);
  } else if (type === 'archer') {
    cloak = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 5), cloakMaterial);
    cloak.position.set(0, 0.27, -0.055);
    cloak.scale.z = 0.7;
    group.add(cloak);
    group.add(this.createBowMesh());
    this.addArcherRoleDetails(group);
  } else if (type === 'ranger') {
    cloak = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.46, 5), cloakMaterial);
    cloak.position.set(0, 0.28, -0.07);
    cloak.scale.z = 0.78;
    group.add(cloak);
    this.addDagger(group, 0.3, 0.13);
    this.addRangerRoleDetails(group);
  } else if (type === 'monk') {
    body.scale.set(1.08, 1.12, 1.08);
    var halo = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 5, 24), this.materials.lightCore);
    halo.position.y = 0.72;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), this.materials.monkGold));
    group.children[group.children.length - 1].position.set(0.13, 0.28, 0.08);
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), this.materials.monkGold));
    group.children[group.children.length - 1].position.set(-0.13, 0.28, 0.08);
    this.addMonkRoleDetails(group);
  } else if (type === 'star') {
    cloak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 6), cloakMaterial);
    cloak.position.set(0, 0.28, -0.06);
    cloak.scale.z = 0.72;
    group.add(cloak);
    this.addStaff(group);
    this.addStarDots(group);
    this.addStarRoleDetails(group);
  }
  this.addInkShells(group, friendly ? 1.055 : 1.065, friendly ? 0.22 : 0.3);
  return group;
};

BadNorthRuntime.prototype.createEnemySoldierMesh = function (type) {
  var group = new THREE.Group();
  var body = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 5), type === 'runner' ? this.materials.enemy : this.materials.enemyArmor);
  var hood = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 5), this.materials.enemyHood);
  var faceMark = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.055, 0.018), this.materials.enemyMark);
  var cloak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 5), this.materials.enemyDark);
  var leftSpike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), this.materials.enemyShield);
  var rightSpike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), this.materials.enemyShield);
  var chestMark = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, 0.018), this.materials.enemyMark);
  group.scale.set(0.78, type === 'runner' ? 0.92 : 0.98, 0.78);
  body.position.y = 0.27;
  body.rotation.y = 0.22;
  hood.position.y = 0.58;
  faceMark.position.set(0, 0.54, 0.105);
  cloak.position.set(0, 0.28, -0.07);
  cloak.scale.z = 0.72;
  leftSpike.position.set(-0.13, 0.44, 0.02);
  rightSpike.position.set(0.13, 0.44, 0.02);
  chestMark.position.set(0, 0.32, 0.105);
  group.userData = {
    faction: 'enemy',
    silhouette: 'hostile-angular',
    detailLevel: 'refined-hostile'
  };
  group.add(cloak);
  group.add(body);
  group.add(hood);
  group.add(faceMark);
  group.add(chestMark);
  group.add(leftSpike);
  group.add(rightSpike);
  this.addEnemyAnatomyDetails(group, type);
  if (type === 'shield') {
    this.addShield(group, this.materials.enemyShield, 0.19);
    this.addEnemyBackBanner(group, 0.16);
  } else if (type === 'runner') {
    this.addDagger(group, 0.28, 0.13);
    this.addDagger(group, 0.26, -0.13);
  } else {
    this.addSword(group, 0.5);
    this.addEnemyBackBanner(group, 0.2);
  }
  this.addInkShells(group, 1.082, 0.36);
  return group;
};

BadNorthRuntime.prototype.addEnemyBackBanner = function (group, xOffset) {
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.54, 5), this.materials.enemyShield);
  var cloth = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.17, 0.024), this.materials.enemy);
  pole.position.set(-xOffset, 0.44, -0.1);
  pole.rotation.z = -0.1;
  cloth.position.set(-xOffset - 0.08, 0.62, -0.1);
  cloth.rotation.y = 0.2;
  group.add(pole);
  group.add(cloth);
};

BadNorthRuntime.prototype.addDetailBox = function (group, sx, sy, sz, material, x, y, z, rx, ry, rz) {
  var mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x || 0, y || 0, z || 0);
  mesh.rotation.x = rx || 0;
  mesh.rotation.y = ry || 0;
  mesh.rotation.z = rz || 0;
  group.add(mesh);
  return mesh;
};

BadNorthRuntime.prototype.addDetailCylinder = function (group, radius, height, material, x, y, z, rx, ry, rz, segments) {
  var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments || 5), material);
  mesh.position.set(x || 0, y || 0, z || 0);
  mesh.rotation.x = rx || 0;
  mesh.rotation.y = ry || 0;
  mesh.rotation.z = rz || 0;
  group.add(mesh);
  return mesh;
};

BadNorthRuntime.prototype.addFriendlyAnatomy = function (group) {
  this.addDetailCylinder(group, 0.024, 0.28, this.materials.clothShadow, -0.12, 0.31, 0.03, 0, 0, -0.2, 5);
  this.addDetailCylinder(group, 0.024, 0.28, this.materials.clothShadow, 0.12, 0.31, 0.03, 0, 0, 0.2, 5);
  this.addDetailCylinder(group, 0.032, 0.22, this.materials.clothShadow, -0.045, 0.1, 0.018, 0.05, 0, 0.08, 5);
  this.addDetailCylinder(group, 0.032, 0.22, this.materials.clothShadow, 0.045, 0.1, 0.018, -0.05, 0, -0.08, 5);
  this.addDetailBox(group, 0.08, 0.032, 0.07, this.materials.boot, -0.055, 0.015, 0.045, 0, 0.08, 0);
  this.addDetailBox(group, 0.08, 0.032, 0.07, this.materials.boot, 0.055, 0.015, 0.045, 0, -0.08, 0);
  this.addDetailBox(group, 0.2, 0.032, 0.025, this.materials.belt, 0, 0.29, 0.105, 0, 0, 0);
  this.addDetailBox(group, 0.018, 0.17, 0.014, this.materials.inkDetail, -0.032, 0.34, 0.112, 0, 0, -0.1);
  this.addDetailBox(group, 0.018, 0.16, 0.014, this.materials.inkDetail, 0.04, 0.34, 0.112, 0, 0, 0.12);
  this.addDetailBox(group, 0.078, 0.018, 0.012, this.materials.faceInk, 0, 0.535, 0.097, 0, 0, 0);
};

BadNorthRuntime.prototype.addMilitiaRoleDetails = function (group) {
  this.addDetailBox(group, 0.19, 0.055, 0.13, this.materials.clothLight, 0, 0.18, 0.005, 0, 0, 0);
  this.addDetailBox(group, 0.16, 0.012, 0.014, this.materials.inkDetail, -0.12, 0.34, 0.13, 0, 0, 1.1);
  this.addDetailBox(group, 0.16, 0.012, 0.014, this.materials.inkDetail, -0.12, 0.28, 0.13, 0, 0, 1.1);
  this.addDetailBox(group, 0.12, 0.026, 0.018, this.materials.wrap, 0.08, 0.2, 0.1, 0, 0, 0.55);
};

BadNorthRuntime.prototype.addArcherRoleDetails = function (group) {
  var quiver = this.addDetailCylinder(group, 0.038, 0.34, this.materials.quiver, -0.14, 0.42, -0.12, 0.25, 0, 0.16, 6);
  var i;
  var arrow;
  quiver.scale.z = 0.7;
  this.addDetailBox(group, 0.2, 0.03, 0.018, this.materials.archerGreen, 0, 0.59, -0.035, 0, 0, 0);
  for (i = 0; i < 3; i += 1) {
    arrow = this.addDetailCylinder(group, 0.006, 0.22, this.materials.metal, -0.15 + i * 0.022, 0.55, -0.12, 0.25, 0, 0.16, 4);
    arrow.userData.isArrowDetail = true;
    this.addDetailBox(group, 0.026, 0.026, 0.01, this.materials.fletching, -0.17 + i * 0.022, 0.67, -0.11, 0, 0, 0.25);
  }
  this.addDetailBox(group, 0.08, 0.022, 0.018, this.materials.leather, 0.17, 0.35, 0.065, 0, 0, 0.1);
};

BadNorthRuntime.prototype.addRangerRoleDetails = function (group) {
  this.addDetailBox(group, 0.16, 0.055, 0.018, this.materials.faceInk, 0, 0.49, 0.102, 0, 0, 0);
  this.addDetailBox(group, 0.18, 0.032, 0.022, this.materials.belt, 0, 0.31, 0.113, 0, 0, -0.12);
  this.addDetailBox(group, 0.055, 0.07, 0.04, this.materials.leather, -0.09, 0.25, 0.1, 0, 0, -0.18);
  this.addDetailBox(group, 0.055, 0.07, 0.04, this.materials.leather, 0.09, 0.25, 0.1, 0, 0, 0.18);
  this.addDagger(group, 0.27, -0.13);
};

BadNorthRuntime.prototype.addMonkRoleDetails = function (group) {
  var i;
  var bead;
  this.addDetailBox(group, 0.22, 0.035, 0.02, this.materials.goldTrim, 0, 0.36, 0.12, 0, 0, -0.55);
  this.addDetailBox(group, 0.18, 0.026, 0.02, this.materials.wrap, 0, 0.24, 0.12, 0, 0, 0.35);
  for (i = 0; i < 5; i += 1) {
    bead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), this.materials.goldTrim);
    bead.position.set(-0.07 + i * 0.035, 0.43 - Math.abs(i - 2) * 0.018, 0.115);
    group.add(bead);
  }
  this.addDetailBox(group, 0.075, 0.028, 0.03, this.materials.wrap, -0.14, 0.3, 0.06, 0, 0, -0.18);
  this.addDetailBox(group, 0.075, 0.028, 0.03, this.materials.wrap, 0.14, 0.3, 0.06, 0, 0, 0.18);
};

BadNorthRuntime.prototype.addStarRoleDetails = function (group) {
  var i;
  var star;
  this.addDetailBox(group, 0.2, 0.025, 0.018, this.materials.starTrim, 0, 0.58, -0.025, 0, 0, 0);
  this.addDetailBox(group, 0.08, 0.1, 0.018, this.materials.starTrim, -0.07, 0.35, 0.112, 0, 0, -0.25);
  this.addDetailBox(group, 0.08, 0.1, 0.018, this.materials.starTrim, 0.07, 0.35, 0.112, 0, 0, 0.25);
  for (i = 0; i < 4; i += 1) {
    star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 0), this.materials.starLight);
    star.position.set(-0.09 + i * 0.06, 0.25 + (i % 2) * 0.07, -0.16);
    group.add(star);
  }
};

BadNorthRuntime.prototype.addEnemyAnatomyDetails = function (group, type) {
  var i;
  var skirt;
  this.addDetailCylinder(group, 0.026, 0.3, this.materials.enemyArmor, -0.13, 0.32, 0.03, 0, 0, -0.2, 5);
  this.addDetailCylinder(group, 0.026, 0.3, this.materials.enemyArmor, 0.13, 0.32, 0.03, 0, 0, 0.2, 5);
  this.addDetailCylinder(group, 0.032, 0.24, this.materials.enemyDark, -0.048, 0.1, 0.018, 0.05, 0, 0.1, 5);
  this.addDetailCylinder(group, 0.032, 0.24, this.materials.enemyDark, 0.048, 0.1, 0.018, -0.05, 0, -0.1, 5);
  this.addDetailBox(group, 0.09, 0.032, 0.072, this.materials.enemyShield, -0.06, 0.015, 0.05, 0, 0.1, 0);
  this.addDetailBox(group, 0.09, 0.032, 0.072, this.materials.enemyShield, 0.06, 0.015, 0.05, 0, -0.1, 0);
  this.addDetailBox(group, 0.19, 0.026, 0.018, this.materials.enemyShield, 0, 0.3, 0.112, 0, 0, 0);
  this.addDetailBox(group, 0.012, 0.16, 0.012, this.materials.inkDetail, -0.035, 0.36, 0.12, 0, 0, -0.2);
  this.addDetailBox(group, 0.012, 0.16, 0.012, this.materials.inkDetail, 0.035, 0.36, 0.12, 0, 0, 0.2);
  for (i = 0; i < 3; i += 1) {
    skirt = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 4), this.materials.enemyDark);
    skirt.position.set(-0.07 + i * 0.07, 0.15, 0.035);
    skirt.rotation.z = Math.PI;
    group.add(skirt);
  }
  if (type === 'runner') {
    this.addDetailBox(group, 0.14, 0.018, 0.014, this.materials.enemyMark, 0, 0.36, 0.118, 0, 0, -0.35);
  } else if (type === 'shield') {
    this.addDetailBox(group, 0.15, 0.02, 0.014, this.materials.enemyMark, 0, 0.38, 0.118, 0, 0, 0.35);
  }
};

BadNorthRuntime.prototype.getClassMaterial = function (type) {
  if (type === 'archer') {
    return this.materials.archerGreen;
  }
  if (type === 'ranger') {
    return this.materials.rangerDark;
  }
  if (type === 'monk') {
    return this.materials.monkGold;
  }
  if (type === 'star') {
    return this.materials.starBlue;
  }
  return this.materials.cloth;
};

BadNorthRuntime.prototype.addSword = function (group, length) {
  var blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, length, 0.018), this.materials.metal);
  var hilt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), this.materials.wood);
  blade.position.set(0.16, 0.36, 0.03);
  blade.rotation.z = 0.56;
  hilt.position.set(0.09, 0.2, 0.03);
  hilt.rotation.z = 0.56;
  group.add(blade);
  group.add(hilt);
};

BadNorthRuntime.prototype.addShield = function (group, material, radius) {
  var shield = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.04, 12), material);
  var boss = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 0.32, 0), this.materials.metal);
    shield.position.set(-0.12, 0.31, 0.08);
    shield.rotation.x = Math.PI / 2;
  boss.position.set(-0.12, 0.31, 0.105);
  group.add(shield);
  group.add(boss);
};

BadNorthRuntime.prototype.createBowMesh = function () {
  var group = new THREE.Group();
  var curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, -0.24, 0),
    new THREE.Vector3(0.18, 0, 0),
    new THREE.Vector3(0, 0.24, 0)
  );
  var bow = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.012, 5, false), this.materials.wood);
  var string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.48, 4), this.materials.metal);
  bow.position.set(0.18, 0.35, 0.04);
  bow.rotation.z = 0.12;
  string.position.set(0.18, 0.35, 0.04);
  group.add(bow);
  group.add(string);
  return group;
};

BadNorthRuntime.prototype.addDagger = function (group, y, x) {
  var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 5), this.materials.wood);
  var blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), this.materials.metal);
  handle.position.set(x, y, 0.04);
  handle.rotation.z = 0.75;
  blade.position.set(x + 0.07, y + 0.08, 0.04);
  blade.rotation.z = -0.82;
  group.add(handle);
  group.add(blade);
};

BadNorthRuntime.prototype.addStaff = function (group) {
  var staff = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.72, 6), this.materials.metal);
  var orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), this.materials.starLight);
  staff.position.set(0.17, 0.36, 0.02);
  staff.rotation.z = 0.28;
  orb.position.set(0.26, 0.68, 0.02);
  group.add(staff);
  group.add(orb);
};

BadNorthRuntime.prototype.addStarDots = function (group) {
  var dots = [
    [-0.05, 0.38, -0.12],
    [0.06, 0.3, -0.13],
    [0.0, 0.22, -0.14]
  ];
  var i;
  var dot;
  for (i = 0; i < dots.length; i += 1) {
    dot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), this.materials.starLight);
    dot.position.set(dots[i][0], dots[i][1], dots[i][2]);
    group.add(dot);
  }
};

BadNorthRuntime.prototype.createEnemyMesh = function (enemy) {
  var group = this.createSoldierMesh(enemy.type === 'shield' ? 0x6f3f3d : ENEMY_RED, enemy.type, false);
  var hp = this.createHealthMesh(0.32);
  hp.position.set(0, 0.78, 0);
  group.add(hp);
  group.userData.hpMesh = hp;
  this.enemyMeshes[enemy.id] = group;
  this.actorGroup.add(group);
  return group;
};

BadNorthRuntime.prototype.createBoatMesh = function (boat) {
  var group = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.16, 0.34), this.materials.wood);
  var bow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.34, 4), this.materials.wood);
  var stern = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.26, 4), this.materials.wood);
  var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.36), this.materials.coast);
  var wakeLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.08), this.materials.boatWake.clone());
  var wakeRight = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.08), this.materials.boatWake.clone());
  var bowFoam = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.045), this.materials.boatWake.clone());
  hull.position.y = 0.06;
  bow.position.set(0.64, 0.07, 0);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  stern.position.set(-0.62, 0.07, 0);
  stern.rotation.z = Math.PI / 2;
  stern.rotation.y = Math.PI / 4;
  stripe.position.y = 0.16;
  group.add(hull);
  group.add(bow);
  group.add(stern);
  group.add(stripe);
  this.addInkShells(group, 1.045, 0.32);
  wakeLeft.position.set(-0.58, 0.022, -0.19);
  wakeRight.position.set(-0.58, 0.022, 0.19);
  bowFoam.position.set(0.68, 0.02, 0);
  wakeLeft.rotation.x = -Math.PI / 2;
  wakeRight.rotation.x = -Math.PI / 2;
  bowFoam.rotation.x = -Math.PI / 2;
  wakeLeft.rotation.z = 0.16;
  wakeRight.rotation.z = -0.16;
  bowFoam.rotation.z = 0.03;
  wakeLeft.material.opacity = 0.34;
  wakeRight.material.opacity = 0.34;
  bowFoam.material.opacity = 0.42;
  group.add(wakeLeft);
  group.add(wakeRight);
  group.add(bowFoam);
  group.userData.wakeFoam = [wakeLeft, wakeRight, bowFoam];
  this.boatMeshes[boat.id] = group;
  this.actorGroup.add(group);
  return group;
};

BadNorthRuntime.prototype.createHealthMesh = function (width) {
  var group = new THREE.Group();
  var back = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.045), this.materials.healthBack);
  var fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.045), this.materials.healthGood);
  fill.position.z = 0.004;
  group.add(back);
  group.add(fill);
  group.userData.fill = fill;
  group.userData.width = width;
  group.rotation.x = -0.62;
  return group;
};

BadNorthRuntime.prototype.resetRun = function () {
  this.state = 'planning';
  this.elapsed = 0;
  this.waveIndex = 0;
  this.kills = 0;
  this.score = 0;
  this.nextEntityId = 1;
  this.cameraQuarter = 0;
  this.targetWorldRotation = 0;
  this.targetWorldTilt = 0;
  this.rotateViewActive = false;
  this.viewPanX = 0;
  this.viewPanZ = 0;
  this.targetViewPanX = 0;
  this.targetViewPanZ = 0;
  this.targetCameraZoom = CAMERA_DEFAULT_ZOOM;
  this.setupSimulation();
  this.rebuildActorMeshes();
  this.syncSceneObjects(true);
  this.audio.startAmbient();
  this.audio.playCommand();
  this.setBanner('布防阶段', 1.4);
  this.setHint('点选小队，再点岛面移动。准备好后开战。', 2.4);
};

BadNorthRuntime.prototype.setBanner = function (text, seconds) {
  this.bannerText = text;
  this.bannerUntil = this.elapsed + (seconds || 1.6);
};

BadNorthRuntime.prototype.setHint = function (text, seconds) {
  this.hintText = text;
  this.hintUntil = this.elapsed + (seconds || 1.8);
};

BadNorthRuntime.prototype.getTileKey = function (x, z) {
  return x + ':' + z;
};

BadNorthRuntime.prototype.getTileAt = function (x, z) {
  return this.tileLookup[this.getTileKey(Math.round(x), Math.round(z))] || null;
};

BadNorthRuntime.prototype.getHeightAt = function (x, z) {
  var tile = this.getTileAt(x, z);
  return tile ? tile.h * HEIGHT_UNIT : 0;
};

BadNorthRuntime.prototype.isHouseBlockingTile = function (x, z) {
  var i;
  var house;
  var halfW;
  var halfD;
  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    halfW = house.w * 0.5 + ACTOR_COLLISION_PADDING;
    halfD = house.d * 0.5 + ACTOR_COLLISION_PADDING;
    if (Math.abs(x - house.x) <= halfW && Math.abs(z - house.z) <= halfD) {
      return true;
    }
  }
  return false;
};

BadNorthRuntime.prototype.isTileWalkable = function (tile) {
  return !!tile && !this.isHouseBlockingTile(tile.x, tile.z);
};

BadNorthRuntime.prototype.canTraverseBetweenTiles = function (fromTile, toTile) {
  if (!this.isTileWalkable(toTile)) {
    return false;
  }
  return Math.abs(toTile.h - fromTile.h) <= MAX_TRAVERSABLE_HEIGHT_DELTA;
};

BadNorthRuntime.prototype.createWalkNode = function (tile) {
  return {
    x: tile.x,
    z: tile.z,
    h: tile.h,
    key: this.getTileKey(tile.x, tile.z)
  };
};

BadNorthRuntime.prototype.getSortedWalkableTilesNear = function (x, z) {
  var candidates = [];
  var i;
  var tile;
  for (i = 0; i < this.tiles.length; i += 1) {
    tile = this.tiles[i];
    if (this.isTileWalkable(tile)) {
      candidates.push(tile);
    }
  }
  candidates.sort(function (a, b) {
    return utils.distanceSquared(a.x, a.z, x, z) - utils.distanceSquared(b.x, b.z, x, z);
  });
  return candidates;
};

BadNorthRuntime.prototype.isHouseAttackTile = function (tile, house) {
  var halfW;
  var halfD;
  var dx;
  var dz;
  var onEastWestSide;
  var onNorthSouthSide;
  if (!tile || !house || !this.isTileWalkable(tile)) {
    return false;
  }
  halfW = house.w * 0.5 + ACTOR_COLLISION_PADDING;
  halfD = house.d * 0.5 + ACTOR_COLLISION_PADDING;
  dx = Math.abs(tile.x - house.x);
  dz = Math.abs(tile.z - house.z);
  onEastWestSide = dx > halfW && dx <= halfW + HOUSE_ATTACK_TILE_REACH && dz <= halfD + HOUSE_ATTACK_SIDE_MARGIN;
  onNorthSouthSide = dz > halfD && dz <= halfD + HOUSE_ATTACK_TILE_REACH && dx <= halfW + HOUSE_ATTACK_SIDE_MARGIN;
  return onEastWestSide || onNorthSouthSide;
};

BadNorthRuntime.prototype.getHouseAttackTiles = function (house) {
  var result = [];
  var i;
  var tile;
  for (i = 0; i < this.tiles.length; i += 1) {
    tile = this.tiles[i];
    if (this.isHouseAttackTile(tile, house)) {
      result.push(tile);
    }
  }
  result.sort(function (a, b) {
    return utils.distanceSquared(a.x, a.z, house.x, house.z) - utils.distanceSquared(b.x, b.z, house.x, house.z);
  });
  return result;
};

BadNorthRuntime.prototype.getPathTravelCost = function (path) {
  var i;
  var from;
  var to;
  var cost = 0;
  if (!path || path.length < 2) {
    return 0;
  }
  for (i = 1; i < path.length; i += 1) {
    from = path[i - 1];
    to = path[i];
    cost += utils.distance(from.x, from.z, to.x, to.z) + Math.abs((to.h || 0) - (from.h || 0)) * 0.28;
  }
  return cost;
};

BadNorthRuntime.prototype.findHouseAttackRoute = function (actor, house, preferredTileKey) {
  var startTile = this.getNearestWalkableTile(actor.x, actor.z);
  var candidates;
  var i;
  var tile;
  var path;
  var cost;
  var best = null;
  var bestScore = 99999;
  var preferredTile;
  var preferredPath;
  if (!startTile || !house || house.hp <= 0) {
    return null;
  }
  if (preferredTileKey) {
    preferredTile = this.tileLookup[preferredTileKey];
    if (this.isHouseAttackTile(preferredTile, house)) {
      preferredPath = this.findWalkPath(startTile, preferredTile);
      if (preferredPath) {
        return {
          house: house,
          destination: this.createWalkNode(preferredTile),
          path: preferredPath,
          cost: this.getPathTravelCost(preferredPath),
          attackTileKey: preferredTileKey
        };
      }
    }
  }
  candidates = this.getHouseAttackTiles(house);
  for (i = 0; i < candidates.length; i += 1) {
    tile = candidates[i];
    path = this.findWalkPath(startTile, tile);
    if (!path) {
      continue;
    }
    cost = this.getPathTravelCost(path) + utils.distance(tile.x, tile.z, house.x, house.z) * 0.18;
    if (cost < bestScore) {
      bestScore = cost;
      best = {
        house: house,
        destination: this.createWalkNode(tile),
        path: path,
        cost: cost,
        attackTileKey: this.getTileKey(tile.x, tile.z)
      };
    }
  }
  return best;
};

BadNorthRuntime.prototype.findBestHouseAttackRoute = function (actor, preferredHouse, preferredTileKey) {
  var i;
  var house;
  var route;
  var score;
  var best = null;
  var bestScore = 99999;
  if (preferredHouse && preferredHouse.hp > 0) {
    route = this.findHouseAttackRoute(actor, preferredHouse, preferredTileKey);
    if (route) {
      return route;
    }
  }
  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    if (house.hp <= 0) {
      continue;
    }
    route = this.findHouseAttackRoute(actor, house, '');
    if (!route) {
      continue;
    }
    score = route.cost + utils.distance(actor.x, actor.z, house.x, house.z) * 0.08;
    if (score < bestScore) {
      bestScore = score;
      best = route;
    }
  }
  return best;
};

BadNorthRuntime.prototype.getNearestWalkableTile = function (x, z) {
  var tile = this.getTileAt(x, z);
  var candidates;
  if (this.isTileWalkable(tile)) {
    return tile;
  }
  candidates = this.getSortedWalkableTilesNear(x, z);
  return candidates.length ? candidates[0] : null;
};

BadNorthRuntime.prototype.getWalkableNeighbors = function (tile) {
  var dirs = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: 0, z: 1 },
    { x: 0, z: -1 }
  ];
  var result = [];
  var i;
  var next;
  for (i = 0; i < dirs.length; i += 1) {
    next = this.tileLookup[this.getTileKey(tile.x + dirs[i].x, tile.z + dirs[i].z)];
    if (next && this.canTraverseBetweenTiles(tile, next)) {
      result.push(next);
    }
  }
  return result;
};

BadNorthRuntime.prototype.findWalkPath = function (startTile, endTile) {
  var open;
  var records;
  var startKey;
  var endKey;
  var startRecord;
  var current;
  var bestIndex;
  var bestF;
  var i;
  var neighbors;
  var neighbor;
  var key;
  var record;
  var tentativeG;
  var heightCost;
  var path;

  if (!this.isTileWalkable(startTile) || !this.isTileWalkable(endTile)) {
    return null;
  }

  startKey = this.getTileKey(startTile.x, startTile.z);
  endKey = this.getTileKey(endTile.x, endTile.z);
  startRecord = {
    tile: startTile,
    key: startKey,
    g: 0,
    f: utils.distance(startTile.x, startTile.z, endTile.x, endTile.z),
    parent: null,
    closed: false,
    inOpen: true
  };
  open = [startRecord];
  records = {};
  records[startKey] = startRecord;

  while (open.length) {
    bestIndex = 0;
    bestF = open[0].f;
    for (i = 1; i < open.length; i += 1) {
      if (open[i].f < bestF) {
        bestF = open[i].f;
        bestIndex = i;
      }
    }
    current = open.splice(bestIndex, 1)[0];
    current.inOpen = false;
    if (current.key === endKey) {
      path = [];
      while (current) {
        path.unshift(this.createWalkNode(current.tile));
        current = current.parent;
      }
      return path;
    }
    current.closed = true;
    neighbors = this.getWalkableNeighbors(current.tile);
    for (i = 0; i < neighbors.length; i += 1) {
      neighbor = neighbors[i];
      key = this.getTileKey(neighbor.x, neighbor.z);
      record = records[key];
      if (record && record.closed) {
        continue;
      }
      heightCost = Math.abs(neighbor.h - current.tile.h) * 0.28;
      tentativeG = current.g + 1 + heightCost;
      if (!record) {
        record = {
          tile: neighbor,
          key: key,
          g: tentativeG,
          f: tentativeG + utils.distance(neighbor.x, neighbor.z, endTile.x, endTile.z),
          parent: current,
          closed: false,
          inOpen: true
        };
        records[key] = record;
        open.push(record);
      } else if (tentativeG < record.g) {
        record.g = tentativeG;
        record.f = tentativeG + utils.distance(neighbor.x, neighbor.z, endTile.x, endTile.z);
        record.parent = current;
        if (!record.inOpen) {
          record.inOpen = true;
          open.push(record);
        }
      }
    }
  }
  return null;
};

BadNorthRuntime.prototype.findReachablePathNear = function (startTile, x, z) {
  var candidates;
  var i;
  var path;
  if (!startTile) {
    return null;
  }
  candidates = this.getSortedWalkableTilesNear(x, z);
  for (i = 0; i < candidates.length; i += 1) {
    path = this.findWalkPath(startTile, candidates[i]);
    if (path) {
      return {
        tile: candidates[i],
        path: path
      };
    }
  }
  return null;
};

BadNorthRuntime.prototype.buildActorPathToTile = function (actor, tile) {
  var startTile = this.getNearestWalkableTile(actor.x, actor.z);
  var destination = tile ? (this.getTileAt(tile.x, tile.z) || tile) : null;
  var path = null;
  var fallback;

  if (!startTile || !destination) {
    return null;
  }
  if (!this.isTileWalkable(destination)) {
    destination = null;
  }
  if (destination) {
    path = this.findWalkPath(startTile, destination);
  }
  if (!path) {
    fallback = this.findReachablePathNear(startTile, tile.x, tile.z);
    if (fallback) {
      destination = fallback.tile;
      path = fallback.path;
    }
  }
  if (!path) {
    return null;
  }
  return {
    destination: destination,
    path: path
  };
};

BadNorthRuntime.prototype.buildActorPathNear = function (actor, x, z) {
  var startTile = this.getNearestWalkableTile(actor.x, actor.z);
  var fallback = this.findReachablePathNear(startTile, x, z);
  if (!fallback) {
    return null;
  }
  return {
    destination: fallback.tile,
    path: fallback.path
  };
};

BadNorthRuntime.prototype.assignActorPath = function (actor, path) {
  var i;
  var currentTile = this.getNearestWalkableTile(actor.x, actor.z);
  actor.movePath = [{
    x: actor.x,
    z: actor.z,
    h: currentTile ? currentTile.h : Math.round(this.getHeightAt(actor.x, actor.z) / HEIGHT_UNIT),
    key: 'actor-start'
  }];
  if (currentTile && utils.distance(actor.x, actor.z, currentTile.x, currentTile.z) > 0.05) {
    actor.movePath.push(this.createWalkNode(currentTile));
  }
  for (i = 1; i < path.length; i += 1) {
    actor.movePath.push(path[i]);
  }
  actor.pathIndex = actor.movePath.length > 1 ? 1 : 0;
  actor.targetX = path[path.length - 1].x;
  actor.targetZ = path[path.length - 1].z;
  actor.displayY = actor.displayY === undefined ? this.getHeightAt(actor.x, actor.z) : actor.displayY;
  actor.climbAmount = 0;
  actor.climbDirection = 0;
};

BadNorthRuntime.prototype.clearActorPath = function (actor) {
  actor.movePath = [];
  actor.pathIndex = 0;
  actor.isMoving = false;
  actor.climbAmount = 0;
  actor.climbDirection = 0;
};

BadNorthRuntime.prototype.getActorMovementHeight = function (actor, dt) {
  var targetY = this.getHeightAt(actor.x, actor.z);
  var from;
  var to;
  var fromY;
  var toY;
  var segmentLength;
  var progress;
  var smooth;
  var climb;

  actor.climbAmount = 0;
  actor.climbDirection = 0;
  if (actor.movePath && actor.pathIndex > 0 && actor.pathIndex < actor.movePath.length) {
    from = actor.movePath[actor.pathIndex - 1];
    to = actor.movePath[actor.pathIndex];
    fromY = from.h * HEIGHT_UNIT;
    toY = to.h * HEIGHT_UNIT;
    segmentLength = Math.max(0.001, utils.distance(from.x, from.z, to.x, to.z));
    progress = utils.clamp(utils.distance(from.x, from.z, actor.x, actor.z) / segmentLength, 0, 1);
    smooth = progress * progress * (3 - progress * 2);
    climb = Math.abs(toY - fromY) > 0.01 ? Math.sin(progress * Math.PI) : 0;
    targetY = utils.lerp(fromY, toY, smooth) + climb * CLIMB_ARC_HEIGHT;
    actor.climbAmount = climb;
    actor.climbDirection = toY > fromY ? 1 : (toY < fromY ? -1 : 0);
  }
  actor.displayY = utils.lerp(actor.displayY === undefined ? targetY : actor.displayY, targetY, Math.min(1, dt * 14));
  return actor.displayY;
};

BadNorthRuntime.prototype.updatePathActorMovement = function (actor, dt, speed) {
  var destination;
  var dx;
  var dz;
  var dist;
  var dir;
  var step;
  var moved = false;

  actor.isMoving = false;
  if (!actor.movePath || actor.pathIndex >= actor.movePath.length || actor.pathIndex <= 0) {
    this.getActorMovementHeight(actor, dt);
    return false;
  }

  while (actor.pathIndex < actor.movePath.length) {
    destination = actor.movePath[actor.pathIndex];
    dx = destination.x - actor.x;
    dz = destination.z - actor.z;
    dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= 0.025) {
      break;
    }
    actor.x = destination.x;
    actor.z = destination.z;
    actor.pathIndex += 1;
  }

  if (actor.pathIndex >= actor.movePath.length) {
    this.clearActorPath(actor);
    actor.displayY = this.getActorMovementHeight(actor, dt);
    return moved;
  }

  destination = actor.movePath[actor.pathIndex];
  dx = destination.x - actor.x;
  dz = destination.z - actor.z;
  dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 0.001) {
    dir = utils.normalize(dx, dz);
    step = Math.min(dist, speed * dt);
    actor.x += dir.x * step;
    actor.z += dir.z * step;
    actor.moveDirX = dir.x;
    actor.moveDirZ = dir.z;
    actor.walkCycle = (actor.walkCycle || 0) + step * 8.2;
    actor.isMoving = true;
    moved = true;
  }

  this.getActorMovementHeight(actor, dt);
  return moved;
};

BadNorthRuntime.prototype.moveActorTowardPoint = function (actor, x, z, dt, speed, stopDistance) {
  var dx = x - actor.x;
  var dz = z - actor.z;
  var dist = Math.sqrt(dx * dx + dz * dz);
  var stop = Math.max(0.2, stopDistance || 0);
  var dir;
  var step;
  var nx;
  var nz;
  var fromTile;
  var toTile;
  if (dist <= stop || dist <= 0.001) {
    actor.isMoving = false;
    this.getActorMovementHeight(actor, dt);
    return false;
  }
  dir = utils.normalize(dx, dz);
  step = Math.min(dist - stop, speed * dt);
  nx = actor.x + dir.x * step;
  nz = actor.z + dir.z * step;
  fromTile = this.getTileAt(actor.x, actor.z) || this.getNearestWalkableTile(actor.x, actor.z);
  toTile = this.getTileAt(nx, nz);
  if (!fromTile || !toTile || !this.isTileWalkable(toTile) || this.isHouseBlockingTile(nx, nz) || !this.canTraverseBetweenTiles(fromTile, toTile)) {
    return false;
  }
  this.clearActorPath(actor);
  actor.x = nx;
  actor.z = nz;
  actor.targetX = x;
  actor.targetZ = z;
  actor.moveDirX = dir.x;
  actor.moveDirZ = dir.z;
  actor.walkCycle = (actor.walkCycle || 0) + step * 8.2;
  actor.isMoving = true;
  this.getActorMovementHeight(actor, dt);
  return true;
};

BadNorthRuntime.prototype.update = function (dt, now) {
  this.elapsed = now;
  if (this.rotateViewActive) {
    this.rotateCameraView(dt);
  }
  this.worldGroup.rotation.y += (this.targetWorldRotation - this.worldGroup.rotation.y) * Math.min(1, dt * 8);
  this.worldGroup.rotation.x += (this.targetWorldTilt - this.worldGroup.rotation.x) * Math.min(1, dt * 6);
  this.viewPanX += (this.targetViewPanX - this.viewPanX) * Math.min(1, dt * 7);
  this.viewPanZ += (this.targetViewPanZ - this.viewPanZ) * Math.min(1, dt * 7);
  this.worldGroup.position.set(this.viewPanX, WORLD_BASE_Y, this.viewPanZ);
  this.cameraZoom += (this.targetCameraZoom - this.cameraZoom) * Math.min(1, dt * 8);
  if (this.camera && Math.abs((this.camera.zoom || 1) - this.cameraZoom) > 0.0005) {
    this.camera.zoom = this.cameraZoom;
    if (this.camera.updateProjectionMatrix) {
      this.camera.updateProjectionMatrix();
    }
  }
  this.updateEffects(dt);
  this.updateAtmosphere(dt);
  this.updateSkillState(dt);
  this.updateTacticalObjects(dt);
  if (this.state === 'title' || this.state === 'victory' || this.state === 'defeat') {
    this.syncSceneObjects(false);
    return;
  }
  this.updateSquadMovement(dt);
  if (this.state === 'combat') {
    this.updateBoats(dt);
    this.updateEnemies(dt);
    this.updateSquadCombat(dt);
    this.updateProjectiles(dt);
    this.cleanupCombat();
    this.checkCombatEnd();
  } else if (this.state === 'planning') {
    this.recoverSquads(dt * 2.5);
  }
  this.syncSceneObjects(false);
};

BadNorthRuntime.prototype.updateEffects = function (dt) {
  var i;
  for (i = this.effects.length - 1; i >= 0; i -= 1) {
    this.effects[i].age += dt;
    this.effects[i].life -= dt;
    if (this.effects[i].life <= 0) {
      this.effects.splice(i, 1);
    }
  }
};

BadNorthRuntime.prototype.updateSkillState = function (dt) {
  var i;
  var squad;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    squad.skillTimer = Math.max(0, squad.skillTimer - dt);
  }
};

BadNorthRuntime.prototype.updateTacticalObjects = function (dt) {
  var i;
  var decoy;
  var prison;
  for (i = this.decoys.length - 1; i >= 0; i -= 1) {
    decoy = this.decoys[i];
    decoy.life -= dt;
    decoy.age += dt;
    if (decoy.life <= 0 || decoy.hp <= 0) {
      this.decoys.splice(i, 1);
    }
  }
  for (i = this.prisons.length - 1; i >= 0; i -= 1) {
    prison = this.prisons[i];
    prison.life -= dt;
    prison.age += dt;
    if (prison.life <= 0) {
      this.prisons.splice(i, 1);
    }
  }
};

BadNorthRuntime.prototype.updateSquadMovement = function (dt) {
  var i;
  var squad;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    squad.commandPulse = Math.max(0, squad.commandPulse - dt * 2.6);
    squad.attackPulse = Math.max(0, (squad.attackPulse || 0) - dt * ATTACK_PULSE_DECAY);
    squad.hitPulse = Math.max(0, (squad.hitPulse || 0) - dt * HIT_PULSE_DECAY);
    squad.engagementTimer = Math.max(0, (squad.engagementTimer || 0) - dt);
    if (squad.engagementTimer <= 0) {
      squad.engagedEnemyId = '';
    }
    if (squad.hp <= 0) {
      continue;
    }
    this.updatePathActorMovement(squad, dt, squad.speed);
  }
};

BadNorthRuntime.prototype.startWave = function () {
  var wave = WAVES[this.waveIndex];
  var i;
  var boatDef;
  var lane;
  if (!wave || this.state !== 'planning') {
    return;
  }
  this.state = 'combat';
  this.boats = [];
  this.enemies = [];
  this.projectiles = [];
  clearGroup(this.projectileGroup);
  for (i = 0; i < wave.boats.length; i += 1) {
    boatDef = wave.boats[i];
    lane = LANES[boatDef.lane];
    this.boats.push({
      id: 'boat-' + this.nextEntityId,
      lane: boatDef.lane,
      x: lane.spawn.x,
      z: lane.spawn.z,
      fromX: lane.spawn.x,
      fromZ: lane.spawn.z,
      toX: lane.shore.x,
      toZ: lane.shore.z,
      landingX: lane.landing.x,
      landingZ: lane.landing.z,
      progress: 0,
      delay: boatDef.delay,
      count: boatDef.count,
      type: boatDef.type,
      deployed: false,
      lifeAfterLanding: 8,
      angle: lane.angle,
      wakeTimer: 0,
      farSea: true
    });
    this.nextEntityId += 1;
  }
  this.audio.playWave();
  this.enemyPathPreviewNextAt = 0;
  this.enemyPathPreviewLastState = '';
  this.setBanner('第 ' + (this.waveIndex + 1) + ' 波：' + wave.name, 1.8);
  this.setHint('观察船只登陆方向，调兵守住屋舍。', 2.4);
};

BadNorthRuntime.prototype.updateBoats = function (dt) {
  var i;
  var boat;
  var t;
  for (i = this.boats.length - 1; i >= 0; i -= 1) {
    boat = this.boats[i];
    if (boat.delay > 0) {
      boat.delay -= dt;
      continue;
    }
    if (!boat.deployed) {
      boat.progress = Math.min(1, boat.progress + dt * DISTANT_BOAT_SPEED);
      t = 1 - Math.pow(1 - boat.progress, 2);
      boat.x = utils.lerp(boat.fromX, boat.toX, t);
      boat.z = utils.lerp(boat.fromZ, boat.toZ, t);
      this.emitBoatWake(boat, dt);
      if (boat.progress >= 1) {
        boat.deployed = true;
        this.spawnEnemiesFromBoat(boat);
        this.addEffect(boat.x, boat.z, 'splash', 0.9, {
          y: SEA_SURFACE_FOAM_LOCAL_Y,
          angle: boat.angle,
          scale: 1.1
        });
        this.addEffect(boat.x, boat.z, 'landingWake', 1.25, {
          y: SEA_SURFACE_FOAM_LOCAL_Y,
          angle: boat.angle,
          scale: 1.55
        });
        this.audio.playBoatLanding();
      }
    } else {
      boat.lifeAfterLanding -= dt;
      if (boat.lifeAfterLanding <= 0) {
        this.removeBoatMesh(boat.id);
        this.boats.splice(i, 1);
      }
    }
  }
};

BadNorthRuntime.prototype.emitBoatWake = function (boat, dt) {
  var dx;
  var dz;
  var len;
  var px;
  var pz;
  var perpX;
  var perpZ;
  if (!boat || boat.deployed) {
    return;
  }
  boat.wakeTimer -= dt;
  if (boat.wakeTimer > 0) {
    return;
  }
  boat.wakeTimer = BOAT_WAKE_INTERVAL;
  dx = boat.toX - boat.fromX;
  dz = boat.toZ - boat.fromZ;
  len = Math.sqrt(dx * dx + dz * dz) || 1;
  dx /= len;
  dz /= len;
  perpX = -dz;
  perpZ = dx;
  px = boat.x - dx * (0.62 + boat.progress * 0.22);
  pz = boat.z - dz * (0.62 + boat.progress * 0.22);
  this.addEffect(px + perpX * 0.12, pz + perpZ * 0.12, 'wake', 0.78, {
    y: SEA_SURFACE_FOAM_LOCAL_Y,
    angle: boat.angle,
    scale: 0.78 + boat.progress * 0.45
  });
  this.addEffect(px - perpX * 0.12, pz - perpZ * 0.12, 'wake', 0.78, {
    y: SEA_SURFACE_FOAM_LOCAL_Y,
    angle: boat.angle,
    scale: 0.68 + boat.progress * 0.4
  });
};

BadNorthRuntime.prototype.spawnEnemiesFromBoat = function (boat) {
  var i;
  var offset;
  var stats = this.getEnemyStats(boat.type);
  var enemy;
  for (i = 0; i < boat.count; i += 1) {
    offset = (i - (boat.count - 1) / 2) * 0.22;
    enemy = {
      id: 'enemy-' + this.nextEntityId,
      type: boat.type,
      x: boat.landingX + Math.sin(i * 2.4) * 0.18 + offset * 0.35,
      z: boat.landingZ + Math.cos(i * 1.7) * 0.18 + offset,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      range: stats.range,
      damage: stats.damage,
      cooldownBase: stats.cooldown,
      attackTimer: 0,
      movePath: [],
      pathIndex: 0,
      pathTargetKey: '',
      pathRefresh: 0,
      attackHouseId: '',
      attackTileKey: '',
      stuckTime: 0,
      lastPathX: boat.landingX,
      lastPathZ: boat.landingZ,
      displayY: this.getHeightAt(boat.landingX, boat.landingZ),
      walkCycle: 0,
      climbAmount: 0,
      climbDirection: 0,
      isMoving: false,
      attackPulse: 0,
      hitPulse: 0,
      attackDirX: 0,
      attackDirZ: 1,
      engagedSquadId: '',
      engagementTimer: 0,
      rangedAggroSquadId: '',
      rangedAggroTimer: 0,
      moveDirX: 0,
      moveDirZ: 1
    };
    this.enemies.push(enemy);
    this.nextEntityId += 1;
  }
  this.audio.playEnemySpawn(boat.type);
};

BadNorthRuntime.prototype.getEnemyStats = function (type) {
  if (type === 'shield') {
    return { hp: 54, speed: 0.84, range: 0.42, damage: 12, cooldown: 0.72 };
  }
  if (type === 'runner') {
    return { hp: 30, speed: 1.28, range: 0.38, damage: 9, cooldown: 0.5 };
  }
  return { hp: 38, speed: 0.98, range: 0.4, damage: 10, cooldown: 0.62 };
};

BadNorthRuntime.prototype.updateEnemies = function (dt) {
  var i;
  var enemy;
  var target;
  var dx;
  var dz;
  var dist;
  var attackRange;
  var route;
  var targetKey;
  var moved;
  var beforeX;
  var beforeZ;
  var hasActivePath;
  var shouldRefreshPath;
  for (i = 0; i < this.enemies.length; i += 1) {
    enemy = this.enemies[i];
    if (enemy.hp <= 0) {
      continue;
    }
    enemy.attackPulse = Math.max(0, (enemy.attackPulse || 0) - dt * ATTACK_PULSE_DECAY);
    enemy.hitPulse = Math.max(0, (enemy.hitPulse || 0) - dt * HIT_PULSE_DECAY);
    enemy.engagementTimer = Math.max(0, (enemy.engagementTimer || 0) - dt);
    if (enemy.engagementTimer <= 0) {
      enemy.engagedSquadId = '';
    }
    enemy.rangedAggroTimer = Math.max(0, (enemy.rangedAggroTimer || 0) - dt);
    if (enemy.rangedAggroTimer <= 0) {
      enemy.rangedAggroSquadId = '';
    }
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    target = this.findEnemyTarget(enemy);
    if (!target) {
      continue;
    }
    if (this.isEnemyTrapped(enemy)) {
      enemy.attackTimer = Math.max(enemy.attackTimer, 0.12);
      continue;
    }
    dx = target.x - enemy.x;
    dz = target.z - enemy.z;
    dist = Math.sqrt(dx * dx + dz * dz);
    attackRange = target.kind === 'squad' ? Math.max(enemy.range, ENEMY_SQUAD_ENGAGE_RANGE) : enemy.range;
    if (dist > attackRange) {
      if (target.kind === 'squad' && target.ref && dist <= ENEMY_DEFENDER_NOTICE_RANGE) {
        moved = this.moveActorTowardPoint(enemy, target.x, target.z, dt, enemy.speed, attackRange * MELEE_CONTACT_APPROACH_RATIO);
        if (moved) {
          this.faceMeleeActors(enemy, target.ref);
          enemy.pathRefresh = Math.max(enemy.pathRefresh || 0, ENEMY_PATH_REFRESH * 0.45);
          enemy.stuckTime = 0;
          continue;
        }
      }
      enemy.pathRefresh = Math.max(0, (enemy.pathRefresh || 0) - dt);
      targetKey = target.kind + ':' + (target.ref && target.ref.id ? target.ref.id : '') + ':' + Math.round(target.x) + ':' + Math.round(target.z);
      hasActivePath = !!(enemy.movePath && enemy.pathIndex > 0 && enemy.pathIndex < enemy.movePath.length);
      shouldRefreshPath = enemy.pathTargetKey !== targetKey || !hasActivePath;
      if (target.kind !== 'house' && enemy.pathRefresh <= 0) {
        shouldRefreshPath = true;
      }
      if (shouldRefreshPath) {
        route = target.route || this.buildActorRouteToTarget(enemy, target);
        if (route) {
          this.assignActorPath(enemy, route.path);
          enemy.pathTargetKey = targetKey;
          if (target.kind === 'house') {
            enemy.attackHouseId = target.ref.id;
            enemy.attackTileKey = target.attackTileKey || route.attackTileKey || this.getTileKey(route.destination.x, route.destination.z);
          }
        }
        enemy.pathRefresh = ENEMY_PATH_REFRESH;
      }
      beforeX = enemy.x;
      beforeZ = enemy.z;
      moved = this.updatePathActorMovement(enemy, dt, enemy.speed);
      if (!moved && target.kind === 'squad' && target.ref && dist <= ENEMY_DEFENDER_NOTICE_RANGE) {
        moved = this.moveActorTowardPoint(enemy, target.x, target.z, dt, enemy.speed, attackRange * MELEE_CONTACT_APPROACH_RATIO);
        if (moved) {
          this.faceMeleeActors(enemy, target.ref);
        }
      }
      if (moved || utils.distanceSquared(beforeX, beforeZ, enemy.x, enemy.z) > 0.0004) {
        enemy.stuckTime = 0;
        enemy.lastPathX = enemy.x;
        enemy.lastPathZ = enemy.z;
      } else {
        enemy.stuckTime = (enemy.stuckTime || 0) + dt;
        if (enemy.stuckTime >= ENEMY_STUCK_REPATH_TIME) {
          enemy.pathRefresh = 0;
          enemy.pathTargetKey = '';
          enemy.attackTileKey = '';
          enemy.movePath = [];
          enemy.pathIndex = 0;
          enemy.stuckTime = 0;
        }
      }
    } else if (enemy.attackTimer <= 0) {
      this.clearActorPath(enemy);
      this.getActorMovementHeight(enemy, dt);
      enemy.stuckTime = 0;
      enemy.attackTimer = enemy.cooldownBase;
      if (target.kind === 'squad') {
        this.lockMeleeEngagement(enemy, target.ref);
        this.damageSquad(target.ref, enemy.damage);
        this.triggerMeleeBrawl(enemy, target.ref, true);
      } else if (target.kind === 'decoy') {
        this.damageDecoy(target.ref, enemy.damage);
        this.addEffect(enemy.x, enemy.z, 'hit', 0.35);
      } else {
        this.damageHouse(target.ref, enemy.damage);
        this.addEffect(enemy.x, enemy.z, 'hit', 0.35);
      }
      this.audio.playEnemyAttack(enemy.type);
    } else {
      this.clearActorPath(enemy);
      if (target.kind === 'squad' && target.ref) {
        this.lockMeleeEngagement(enemy, target.ref);
      }
      this.getActorMovementHeight(enemy, dt);
      enemy.stuckTime = 0;
    }
  }
};

BadNorthRuntime.prototype.buildActorRouteToTarget = function (actor, target) {
  if (!target) {
    return null;
  }
  if (target.kind === 'house' && target.ref) {
    return this.findHouseAttackRoute(actor, target.ref, target.attackTileKey || actor.attackTileKey || '');
  }
  return this.buildActorPathNear(actor, target.x, target.z);
};

BadNorthRuntime.prototype.distancePointToSegmentSquared = function (px, pz, ax, az, bx, bz) {
  var vx = bx - ax;
  var vz = bz - az;
  var wx = px - ax;
  var wz = pz - az;
  var lengthSq = vx * vx + vz * vz;
  var t;
  var cx;
  var cz;
  if (lengthSq <= 0.0001) {
    return utils.distanceSquared(px, pz, ax, az);
  }
  t = utils.clamp((wx * vx + wz * vz) / lengthSq, 0, 1);
  cx = ax + vx * t;
  cz = az + vz * t;
  return utils.distanceSquared(px, pz, cx, cz);
};

BadNorthRuntime.prototype.isSquadOnEnemyRoute = function (enemy, squad) {
  var maxIndex;
  var prevX;
  var prevZ;
  var node;
  var i;
  if (!enemy.movePath || enemy.pathIndex <= 0 || enemy.pathIndex >= enemy.movePath.length) {
    return false;
  }
  prevX = enemy.x;
  prevZ = enemy.z;
  maxIndex = Math.min(enemy.movePath.length, enemy.pathIndex + 4);
  for (i = enemy.pathIndex; i < maxIndex; i += 1) {
    node = enemy.movePath[i];
    if (this.distancePointToSegmentSquared(squad.x, squad.z, prevX, prevZ, node.x, node.z) <= ACTOR_ROUTE_BLOCK_RADIUS * ACTOR_ROUTE_BLOCK_RADIUS) {
      return true;
    }
    prevX = node.x;
    prevZ = node.z;
  }
  return false;
};

BadNorthRuntime.prototype.findRouteBlockingSquad = function (enemy) {
  var best = null;
  var bestDist = 999;
  var i;
  var squad;
  var d;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    if (squad.hp <= 0) {
      continue;
    }
    d = utils.distance(enemy.x, enemy.z, squad.x, squad.z);
    if (d <= ENEMY_ROUTE_BLOCK_NOTICE_RANGE && this.isSquadOnEnemyRoute(enemy, squad) && d < bestDist) {
      best = squad;
      bestDist = d;
    }
  }
  return best;
};

BadNorthRuntime.prototype.findSquadDefendingRoute = function (enemy, path) {
  var best = null;
  var bestScore = 999;
  var i;
  var j;
  var squad;
  var prevX;
  var prevZ;
  var node;
  var segmentLength;
  var traveled;
  var d;
  var score;
  if (!enemy || !path || path.length < 2) {
    return null;
  }
  prevX = enemy.x;
  prevZ = enemy.z;
  traveled = 0;
  for (j = 1; j < path.length && traveled <= ENEMY_DEFENDER_ROUTE_LOOKAHEAD; j += 1) {
    node = path[j];
    segmentLength = utils.distance(prevX, prevZ, node.x, node.z);
    for (i = 0; i < this.squads.length; i += 1) {
      squad = this.squads[i];
      if (squad.hp <= 0) {
        continue;
      }
      d = utils.distance(enemy.x, enemy.z, squad.x, squad.z);
      if (d > ENEMY_DEFENDER_NOTICE_RANGE) {
        continue;
      }
      if (this.distancePointToSegmentSquared(squad.x, squad.z, prevX, prevZ, node.x, node.z) <= ENEMY_DEFENDER_ROUTE_RADIUS * ENEMY_DEFENDER_ROUTE_RADIUS) {
        score = d + traveled * 0.12;
        if (score < bestScore) {
          bestScore = score;
          best = squad;
        }
      }
    }
    traveled += segmentLength;
    prevX = node.x;
    prevZ = node.z;
  }
  return best;
};

BadNorthRuntime.prototype.findSquadAheadOfObjective = function (enemy, x, z) {
  var vx = x - enemy.x;
  var vz = z - enemy.z;
  var length = Math.sqrt(vx * vx + vz * vz);
  var best = null;
  var bestScore = 999;
  var i;
  var squad;
  var dx;
  var dz;
  var d;
  var projection;
  var perpSq;
  var score;
  if (length <= 0.001) {
    return null;
  }
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    if (squad.hp <= 0) {
      continue;
    }
    dx = squad.x - enemy.x;
    dz = squad.z - enemy.z;
    d = Math.sqrt(dx * dx + dz * dz);
    if (d > ENEMY_DEFENDER_NOTICE_RANGE) {
      continue;
    }
    projection = (dx * vx + dz * vz) / length;
    if (projection < -0.15 || projection > Math.min(length, ENEMY_DEFENDER_ROUTE_LOOKAHEAD) + ENEMY_DEFENDER_ROUTE_RADIUS) {
      continue;
    }
    perpSq = this.distancePointToSegmentSquared(squad.x, squad.z, enemy.x, enemy.z, x, z);
    if (perpSq <= ENEMY_DEFENDER_ROUTE_RADIUS * ENEMY_DEFENDER_ROUTE_RADIUS) {
      score = d + projection * 0.08;
      if (score < bestScore) {
        bestScore = score;
        best = squad;
      }
    }
  }
  return best;
};

BadNorthRuntime.prototype.getLockedEnemySquad = function (enemy) {
  var squad;
  if (!enemy.engagedSquadId || (enemy.engagementTimer || 0) <= 0) {
    return null;
  }
  squad = this.getSquadById(enemy.engagedSquadId);
  if (!squad || squad.hp <= 0 || utils.distance(enemy.x, enemy.z, squad.x, squad.z) > ENEMY_SQUAD_BREAK_RANGE) {
    enemy.engagedSquadId = '';
    enemy.engagementTimer = 0;
    return null;
  }
  return squad;
};

BadNorthRuntime.prototype.getRangedAggroSquad = function (enemy) {
  var squad;
  if (!enemy.rangedAggroSquadId || (enemy.rangedAggroTimer || 0) <= 0) {
    return null;
  }
  squad = this.getSquadById(enemy.rangedAggroSquadId);
  if (!squad || squad.hp <= 0 || utils.distance(enemy.x, enemy.z, squad.x, squad.z) > RANGED_AGGRO_BREAK_RANGE) {
    enemy.rangedAggroSquadId = '';
    enemy.rangedAggroTimer = 0;
    return null;
  }
  return squad;
};

BadNorthRuntime.prototype.findEnemyTarget = function (enemy) {
  var nearestSquad = null;
  var nearestSquadDist = 999;
  var nearestHouse = null;
  var nearestHouseDist = 999;
  var nearestDecoy = null;
  var nearestDecoyDist = 999;
  var i;
  var d;
  var squad;
  var house;
  var decoy;
  var approach;
  var preferredTileKey;
  var routeBlocker;
  var lockedSquad = this.getLockedEnemySquad(enemy);
  var aggroSquad;
  var defenderSquad;
  if (lockedSquad) {
    return { kind: 'squad', ref: lockedSquad, x: lockedSquad.x, z: lockedSquad.z };
  }
  for (i = 0; i < this.decoys.length; i += 1) {
    decoy = this.decoys[i];
    if (decoy.hp <= 0 || decoy.life <= 0) {
      continue;
    }
    d = utils.distance(enemy.x, enemy.z, decoy.x, decoy.z);
    if (d < nearestDecoyDist) {
      nearestDecoyDist = d;
      nearestDecoy = decoy;
    }
  }
  if (nearestDecoy && nearestDecoyDist < nearestDecoy.radius) {
    return { kind: 'decoy', ref: nearestDecoy, x: nearestDecoy.x, z: nearestDecoy.z };
  }
  aggroSquad = this.getRangedAggroSquad(enemy);
  if (aggroSquad) {
    return { kind: 'squad', ref: aggroSquad, x: aggroSquad.x, z: aggroSquad.z };
  }
  routeBlocker = this.findRouteBlockingSquad(enemy);
  if (routeBlocker) {
    return { kind: 'squad', ref: routeBlocker, x: routeBlocker.x, z: routeBlocker.z };
  }
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    if (squad.hp <= 0) {
      continue;
    }
    d = utils.distance(enemy.x, enemy.z, squad.x, squad.z);
    if (d < nearestSquadDist) {
      nearestSquadDist = d;
      nearestSquad = squad;
    }
  }
  if (nearestSquad && nearestSquadDist < ENEMY_SQUAD_NOTICE_RANGE) {
    return { kind: 'squad', ref: nearestSquad, x: nearestSquad.x, z: nearestSquad.z };
  }
  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    if (house.hp <= 0) {
      continue;
    }
    d = utils.distance(enemy.x, enemy.z, house.x, house.z);
    if (d < nearestHouseDist) {
      nearestHouseDist = d;
      nearestHouse = house;
    }
  }
  if (nearestHouse) {
    preferredTileKey = enemy.attackHouseId === nearestHouse.id ? enemy.attackTileKey : '';
    approach = this.findBestHouseAttackRoute(enemy, nearestHouse, preferredTileKey);
    if (approach) {
      defenderSquad = this.findSquadDefendingRoute(enemy, approach.path) ||
        this.findSquadAheadOfObjective(enemy, approach.destination.x, approach.destination.z) ||
        this.findSquadAheadOfObjective(enemy, approach.house.x, approach.house.z);
      if (defenderSquad) {
        return { kind: 'squad', ref: defenderSquad, x: defenderSquad.x, z: defenderSquad.z };
      }
      if (enemy.id) {
        enemy.attackHouseId = approach.house.id;
        enemy.attackTileKey = approach.attackTileKey;
      }
      return {
        kind: 'house',
        ref: approach.house,
        x: approach.destination.x,
        z: approach.destination.z,
        attackTileKey: approach.attackTileKey,
        route: approach
      };
    }
  }
  return null;
};

BadNorthRuntime.prototype.isEnemyTrapped = function (enemy) {
  var i;
  var prison;
  for (i = 0; i < this.prisons.length; i += 1) {
    prison = this.prisons[i];
    if (utils.distance(enemy.x, enemy.z, prison.x, prison.z) <= prison.radius) {
      return true;
    }
  }
  return false;
};

BadNorthRuntime.prototype.updateSquadCombat = function (dt) {
  var i;
  var squad;
  var target;
  var damage;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    if (squad.hp <= 0) {
      continue;
    }
    squad.attackTimer = Math.max(0, squad.attackTimer - dt);
    target = this.findSquadTarget(squad);
    if (!target || squad.attackTimer > 0) {
      continue;
    }
    squad.attackTimer = squad.cooldownBase;
    damage = squad.damage * this.getSquadPower(squad);
    if (squad.attack === 'arrow' || squad.attack === 'throw' || squad.attack === 'star') {
      this.spawnSquadProjectiles(squad, target, damage, squad.projectile, 0);
    } else {
      this.lockMeleeEngagement(target, squad);
      target.hp -= damage;
      this.triggerMeleeBrawl(squad, target, false);
      this.addEffect(target.x, target.z, 'hit', 0.28);
      this.audio.playAttack(squad.attack);
    }
  }
};

BadNorthRuntime.prototype.getSquadProjectileOrigin = function (squad, memberIndex) {
  var offset = SQUAD_FORMATION_OFFSETS[memberIndex % SQUAD_FORMATION_OFFSETS.length];
  var angle = Math.atan2(squad.moveDirX || 0, squad.moveDirZ || 1);
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var baseY = squad.displayY !== undefined ? squad.displayY : this.getHeightAt(squad.x, squad.z);
  return {
    x: squad.x + offset[0] * cos + offset[1] * sin,
    z: squad.z - offset[0] * sin + offset[1] * cos,
    y: baseY + 0.62 + (memberIndex % 2) * 0.018
  };
};

BadNorthRuntime.prototype.spawnSquadProjectiles = function (squad, target, totalDamage, kind, baseDelay) {
  var count = this.getSquadVisibleCount(squad);
  var i;
  var damage = totalDamage / Math.max(1, count);
  for (i = 0; i < count; i += 1) {
    this.spawnProjectile(squad, target, damage, kind, (baseDelay || 0) + i * 0.025, this.getSquadProjectileOrigin(squad, i));
  }
};

BadNorthRuntime.prototype.spawnProjectile = function (squad, target, damage, kind, delay, origin) {
  var projectileKind = kind || 'arrow';
  var projectileOrigin = origin || this.getSquadProjectileOrigin(squad, 0);
  this.projectiles.push({
    x: projectileOrigin.x,
    z: projectileOrigin.z,
    y: projectileOrigin.y,
    tx: target.x,
    tz: target.z,
    ty: this.getHeightAt(target.x, target.z) + 0.46,
    targetId: target.id,
    sourceSquadId: squad.id,
    damage: damage,
    kind: projectileKind,
    age: 0,
    delay: delay || 0,
    life: projectileKind === 'star' ? 0.62 : 0.42
  });
  this.audio.playAttack(projectileKind, delay || 0);
};

BadNorthRuntime.prototype.findSquadTarget = function (squad) {
  var best = null;
  var bestDist = 999;
  var effectiveRange = Math.max(squad.range, SQUAD_CONTACT_ENGAGE_RANGE);
  var i;
  var enemy;
  var d;
  var lockedEnemy;
  if (squad.engagedEnemyId && (squad.engagementTimer || 0) > 0) {
    lockedEnemy = this.getEnemyById(squad.engagedEnemyId);
    if (lockedEnemy && lockedEnemy.hp > 0) {
      d = utils.distance(squad.x, squad.z, lockedEnemy.x, lockedEnemy.z);
      if (d <= effectiveRange) {
        return lockedEnemy;
      }
      if (d <= ENEMY_SQUAD_BREAK_RANGE) {
        return null;
      }
    }
    squad.engagedEnemyId = '';
    squad.engagementTimer = 0;
  }
  for (i = 0; i < this.enemies.length; i += 1) {
    enemy = this.enemies[i];
    if (enemy.hp <= 0) {
      continue;
    }
    d = utils.distance(squad.x, squad.z, enemy.x, enemy.z);
    if (d <= effectiveRange && d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
};

BadNorthRuntime.prototype.updateProjectiles = function (dt) {
  var i;
  var projectile;
  var enemy;
  for (i = this.projectiles.length - 1; i >= 0; i -= 1) {
    projectile = this.projectiles[i];
    if (projectile.delay > 0) {
      projectile.delay -= dt;
      continue;
    }
    projectile.age += dt;
    if (projectile.age >= projectile.life) {
      enemy = this.getEnemyById(projectile.targetId);
      if (enemy && enemy.hp > 0) {
        enemy.hp -= projectile.damage;
        this.markEnemyRangedAggro(enemy, projectile.sourceSquadId);
        this.addEffect(enemy.x, enemy.z, 'hit', 0.35);
        this.audio.playImpact(projectile.kind);
      }
      this.projectiles.splice(i, 1);
    }
  }
};

BadNorthRuntime.prototype.markEnemyRangedAggro = function (enemy, squadId) {
  var squad;
  if (!enemy || !squadId || enemy.hp <= 0 || (enemy.engagementTimer || 0) > 0) {
    return;
  }
  squad = this.getSquadById(squadId);
  if (!squad || squad.hp <= 0) {
    return;
  }
  enemy.rangedAggroSquadId = squad.id;
  enemy.rangedAggroTimer = RANGED_AGGRO_TIME;
  enemy.pathRefresh = 0;
  enemy.pathTargetKey = '';
};

BadNorthRuntime.prototype.cleanupCombat = function () {
  var i;
  var enemy;
  for (i = this.enemies.length - 1; i >= 0; i -= 1) {
    enemy = this.enemies[i];
    if (enemy.hp <= 0) {
      this.addEffect(enemy.x, enemy.z, 'down', 0.8);
      this.audio.playEnemyDown(enemy.type);
      this.removeEnemyMesh(enemy.id);
      this.enemies.splice(i, 1);
      this.kills += 1;
      this.score += 15;
    }
  }
};

BadNorthRuntime.prototype.checkCombatEnd = function () {
  var activeBoats = false;
  var i;
  if (this.getAliveHouseCount() <= 0) {
    this.finishRun(false);
    return;
  }
  for (i = 0; i < this.boats.length; i += 1) {
    if (!this.boats[i].deployed || this.boats[i].lifeAfterLanding > 6) {
      activeBoats = true;
      break;
    }
  }
  if (this.enemies.length === 0 && !activeBoats) {
    this.completeWave();
  }
};

BadNorthRuntime.prototype.completeWave = function () {
  this.waveIndex += 1;
  this.score += this.getAliveHouseCount() * 50;
  this.bestWave = Math.max(this.bestWave, this.waveIndex);
  utils.safeSetStorage(STORAGE_BEST_WAVE, this.bestWave);
  if (this.waveIndex >= WAVES.length) {
    this.finishRun(true);
    return;
  }
  this.state = 'planning';
  this.recoverSquads(42);
  this.audio.playVictory();
  this.setBanner('守住了，第 ' + this.waveIndex + ' 波完成', 1.8);
  this.setHint('重新部署小队，下一波即将从海上靠近。', 2.2);
};

BadNorthRuntime.prototype.finishRun = function (won) {
  this.state = won ? 'victory' : 'defeat';
  this.bestWave = Math.max(this.bestWave, this.waveIndex);
  utils.safeSetStorage(STORAGE_BEST_WAVE, this.bestWave);
  if (won) {
    this.audio.playVictory();
  } else {
    this.audio.playDefeat();
  }
  this.setBanner(won ? '岛屿守住了' : '村庄失守', 2);
};

BadNorthRuntime.prototype.recoverSquads = function (amount) {
  var i;
  var squad;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    if (squad.hp <= 0 && this.state === 'planning') {
      squad.hp = Math.min(squad.maxHp * 0.35, squad.hp + amount * 0.4);
    } else {
      squad.hp = Math.min(squad.maxHp, squad.hp + amount);
    }
  }
};

BadNorthRuntime.prototype.damageSquad = function (squad, amount) {
  var oldHp;
  if (!squad || squad.hp <= 0) {
    return;
  }
  oldHp = squad.hp;
  squad.hp = Math.max(0, squad.hp - amount * squad.armor);
  squad.commandPulse = 1;
  if (oldHp > 0 && squad.hp <= 0) {
    this.audio.playSquadDown(squad.id);
  }
};

BadNorthRuntime.prototype.damageHouse = function (house, amount) {
  var oldHp;
  if (!house || house.hp <= 0) {
    return;
  }
  oldHp = house.hp;
  house.hp = Math.max(0, house.hp - amount);
  if (house.hp !== oldHp) {
    house.healthVisibleUntil = (this.elapsed || 0) + HOUSE_HEALTH_VISIBLE_TIME;
  }
  this.audio.playHouseHit(oldHp > 0 && house.hp <= 0);
  if (house.hp <= 0) {
    this.addEffect(house.x, house.z, 'smoke', 1.5);
  }
};

BadNorthRuntime.prototype.shouldShowHouseHealth = function (house) {
  return !!house && house.hp > 0 && (house.healthVisibleUntil || 0) > (this.elapsed || 0);
};

BadNorthRuntime.prototype.damageDecoy = function (decoy, amount) {
  if (!decoy || decoy.hp <= 0) {
    return;
  }
  decoy.hp = Math.max(0, decoy.hp - amount);
  this.addEffect(decoy.x, decoy.z, 'hit', 0.28);
  this.audio.playImpact('decoy');
};

BadNorthRuntime.prototype.getSquadPower = function (squad) {
  var ratio = utils.clamp(squad.hp / squad.maxHp, 0, 1);
  var active = Math.max(1, Math.ceil(squad.maxCount * ratio));
  return 0.55 + active / squad.maxCount * 0.6;
};

BadNorthRuntime.prototype.getSquadVisibleCount = function (squad) {
  if (squad.hp <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(squad.maxCount * utils.clamp(squad.hp / squad.maxHp, 0, 1)));
};

BadNorthRuntime.prototype.getAliveHouseCount = function () {
  var i;
  var count = 0;
  for (i = 0; i < this.houses.length; i += 1) {
    if (this.houses[i].hp > 0) {
      count += 1;
    }
  }
  return count;
};

BadNorthRuntime.prototype.findNearestAliveHouse = function (x, z) {
  var i;
  var house;
  var best = null;
  var bestDist = 99999;
  var dist;
  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    if (house.hp <= 0) {
      continue;
    }
    dist = utils.distanceSquared(x, z, house.x, house.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = house;
    }
  }
  return best;
};

BadNorthRuntime.prototype.getEnemyById = function (id) {
  var i;
  for (i = 0; i < this.enemies.length; i += 1) {
    if (this.enemies[i].id === id) {
      return this.enemies[i];
    }
  }
  return null;
};

BadNorthRuntime.prototype.getSquadById = function (id) {
  var i;
  for (i = 0; i < this.squads.length; i += 1) {
    if (this.squads[i].id === id) {
      return this.squads[i];
    }
  }
  return null;
};

BadNorthRuntime.prototype.addEffect = function (x, z, type, life, options) {
  options = options || {};
  this.effects.push({
    x: x,
    z: z,
    y: options.y !== undefined ? options.y : this.getHeightAt(x, z),
    type: type,
    age: 0,
    life: life || 0.5,
    maxLife: life || 0.5,
    angle: options.angle || 0,
    scale: options.scale || 1,
    hostile: !!options.hostile
  });
};

BadNorthRuntime.prototype.faceMeleeActors = function (enemy, squad) {
  var dx;
  var dz;
  var dir;
  if (!enemy || !squad) {
    return;
  }
  dx = squad.x - enemy.x;
  dz = squad.z - enemy.z;
  dir = utils.normalize(dx, dz);
  enemy.attackDirX = dir.x;
  enemy.attackDirZ = dir.z;
  squad.attackDirX = -dir.x;
  squad.attackDirZ = -dir.z;
};

BadNorthRuntime.prototype.lockMeleeEngagement = function (enemy, squad) {
  if (!enemy || !squad || enemy.hp <= 0 || squad.hp <= 0) {
    return;
  }
  enemy.engagedSquadId = squad.id;
  enemy.engagementTimer = MELEE_ENGAGEMENT_LOCK_TIME;
  enemy.rangedAggroSquadId = '';
  enemy.rangedAggroTimer = 0;
  squad.engagedEnemyId = enemy.id;
  squad.engagementTimer = MELEE_ENGAGEMENT_LOCK_TIME;
  this.faceMeleeActors(enemy, squad);
  this.clearActorPath(enemy);
  this.clearActorPath(squad);
};

BadNorthRuntime.prototype.triggerMeleeBrawl = function (attacker, target, hostile) {
  var dx;
  var dz;
  var dir;
  var x;
  var z;
  if (!attacker || !target) {
    return;
  }
  dx = target.x - attacker.x;
  dz = target.z - attacker.z;
  dir = utils.normalize(dx, dz);
  attacker.attackPulse = 1;
  attacker.attackDirX = dir.x;
  attacker.attackDirZ = dir.z;
  target.hitPulse = Math.max(target.hitPulse || 0, 0.85);
  if (target.attackPulse !== undefined) {
    target.attackPulse = Math.max(target.attackPulse || 0, 0.42);
    target.attackDirX = -dir.x;
    target.attackDirZ = -dir.z;
  }
  x = (attacker.x + target.x) * 0.5;
  z = (attacker.z + target.z) * 0.5;
  this.addEffect(x, z, 'clash', 0.34, {
    angle: Math.atan2(dir.x, dir.z),
    scale: hostile ? 1.08 : 0.95,
    hostile: hostile
  });
};

BadNorthRuntime.prototype.removeEnemyMesh = function (id) {
  var mesh = this.enemyMeshes[id];
  if (mesh) {
    this.actorGroup.remove(mesh);
    delete this.enemyMeshes[id];
  }
};

BadNorthRuntime.prototype.removeBoatMesh = function (id) {
  var mesh = this.boatMeshes[id];
  if (mesh) {
    this.actorGroup.remove(mesh);
    delete this.boatMeshes[id];
  }
};

BadNorthRuntime.prototype.syncSceneObjects = function (forcePathPreviews) {
  var i;
  var house;
  var squad;
  var enemy;
  var boat;
  var mesh;
  var y;
  var ratio;
  var visibleCount;
  var soldier;
  var t;
  var attackPulse;
  var hitPulse;

  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    mesh = this.houseMeshes[house.id];
    if (!mesh) {
      continue;
    }
    ratio = utils.clamp(house.hp / house.maxHp, 0, 1);
    mesh.userData.hpMesh.visible = ratio > 0 && this.shouldShowHouseHealth(house);
    this.updateHealthMesh(mesh.userData.hpMesh, ratio);
    mesh.userData.roof.visible = house.hp > 0;
    mesh.userData.body.material = house.hp > 0 ? mesh.userData.body.material : this.materials.cliffShade;
  }

  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    mesh = this.squadMeshes[squad.id];
    if (!mesh) {
      continue;
    }
    visibleCount = this.getSquadVisibleCount(squad);
    if (squad.hp <= 0 || visibleCount <= 0) {
      mesh.visible = false;
      mesh.userData.ring.visible = false;
      mesh.userData.flag.visible = false;
      mesh.userData.hpMesh.visible = false;
      for (t = 0; t < mesh.userData.soldiers.length; t += 1) {
        mesh.userData.soldiers[t].visible = false;
      }
      continue;
    }
    mesh.visible = true;
    mesh.userData.flag.visible = true;
    y = squad.displayY !== undefined ? squad.displayY : this.getHeightAt(squad.x, squad.z);
    mesh.position.set(squad.x, y, squad.z);
    attackPulse = squad.attackPulse || 0;
    hitPulse = squad.hitPulse || 0;
    if (attackPulse > 0.01 || hitPulse > 0.01 || (squad.engagementTimer || 0) > 0) {
      mesh.rotation.y = Math.atan2(squad.attackDirX || 0, squad.attackDirZ || 1);
    } else if (squad.isMoving) {
      mesh.rotation.y = Math.atan2(squad.moveDirX || 0, squad.moveDirZ || 1) + Math.sin((squad.walkCycle || 0) * 2.2) * 0.025;
    } else {
      mesh.rotation.y = Math.sin(this.elapsed * 1.4 + i) * 0.04;
    }
    mesh.rotation.x = (squad.climbDirection || 0) * (squad.climbAmount || 0) * -0.1 - attackPulse * 0.18 + hitPulse * 0.12;
    mesh.scale.set(1 + attackPulse * 0.045 - hitPulse * 0.025, 1 + attackPulse * 0.035, 1 + hitPulse * 0.035);
    mesh.userData.ring.visible = squad.id === this.selectedSquadId || squad.commandPulse > 0.05;
    mesh.userData.ring.scale.setScalar(1 + squad.commandPulse * 0.25);
    mesh.userData.ring.material.opacity = squad.id === this.selectedSquadId ? 0.95 : 0.52;
    for (t = 0; t < mesh.userData.soldiers.length; t += 1) {
      soldier = mesh.userData.soldiers[t];
      soldier.visible = t < visibleCount;
      soldier.position.y = squad.isMoving ? Math.sin((squad.walkCycle || 0) * 4 + t * 1.7) * 0.035 + (squad.climbAmount || 0) * 0.025 : Math.sin(this.elapsed * 6 + t) * 0.018;
      soldier.rotation.x = (squad.climbDirection || 0) * (squad.climbAmount || 0) * -0.22;
      soldier.rotation.z = Math.sin(t * 1.7 + this.elapsed * 8) * attackPulse * 0.2 - hitPulse * 0.12;
    }
    ratio = utils.clamp(squad.hp / squad.maxHp, 0, 1);
    mesh.userData.hpMesh.visible = ratio < 0.98 || squad.id === this.selectedSquadId;
    this.updateHealthMesh(mesh.userData.hpMesh, ratio);
  }

  for (i = 0; i < this.enemies.length; i += 1) {
    enemy = this.enemies[i];
    mesh = this.enemyMeshes[enemy.id] || this.createEnemyMesh(enemy);
    y = enemy.displayY !== undefined ? enemy.displayY : this.getHeightAt(enemy.x, enemy.z);
    mesh.position.set(enemy.x, y, enemy.z);
    attackPulse = enemy.attackPulse || 0;
    hitPulse = enemy.hitPulse || 0;
    if (attackPulse > 0.01 || hitPulse > 0.01 || (enemy.engagementTimer || 0) > 0) {
      mesh.rotation.y = Math.atan2(enemy.attackDirX || 0, enemy.attackDirZ || 1);
    } else if (enemy.isMoving) {
      mesh.rotation.y = Math.atan2(enemy.moveDirX || 0, enemy.moveDirZ || 1) + Math.sin((enemy.walkCycle || 0) * 2.3) * 0.04;
    } else {
      mesh.rotation.y += 0.08;
    }
    mesh.rotation.x = (enemy.climbDirection || 0) * (enemy.climbAmount || 0) * -0.12 - attackPulse * 0.24 + hitPulse * 0.18;
    mesh.scale.set(1 + attackPulse * 0.08 - hitPulse * 0.04, 1 + attackPulse * 0.06, 1 + hitPulse * 0.06);
    ratio = utils.clamp(enemy.hp / enemy.maxHp, 0, 1);
    mesh.userData.hpMesh.visible = ratio < 0.96;
    this.updateHealthMesh(mesh.userData.hpMesh, ratio);
  }

  for (i = 0; i < this.boats.length; i += 1) {
    boat = this.boats[i];
    if (boat.delay > 0) {
      continue;
    }
    mesh = this.boatMeshes[boat.id] || this.createBoatMesh(boat);
    mesh.position.set(boat.x, SEA_SURFACE_FOAM_LOCAL_Y + Math.sin(this.elapsed * 2.2 + i) * 0.025, boat.z);
    mesh.rotation.y = boat.angle;
    mesh.visible = boat.lifeAfterLanding > 0;
    if (mesh.userData.wakeFoam) {
      ratio = boat.deployed ? utils.clamp(boat.lifeAfterLanding / 8, 0, 1) * 0.45 : 1;
      for (t = 0; t < mesh.userData.wakeFoam.length; t += 1) {
        soldier = mesh.userData.wakeFoam[t];
        soldier.material.opacity = ratio * (t === 2 ? 0.42 : 0.3 + Math.sin(this.elapsed * 5 + t) * 0.05);
        soldier.scale.x = 0.9 + Math.sin(this.elapsed * 3.2 + t) * 0.08 + boat.progress * 0.18;
      }
    }
  }

  this.syncEnemyAttackPathPreviews(!!forcePathPreviews);
  this.syncPathPreview();
  this.syncProjectileMeshes();
  this.syncEffectMeshes();
};

BadNorthRuntime.prototype.updateHealthMesh = function (group, ratio) {
  if (!group || !group.userData.fill) {
    return;
  }
  ratio = utils.clamp(ratio, 0, 1);
  group.userData.fill.scale.x = ratio;
  group.userData.fill.position.x = -group.userData.width * (1 - ratio) / 2;
  group.userData.fill.material = ratio > 0.32 ? this.materials.healthGood : this.materials.healthBad;
};

BadNorthRuntime.prototype.syncEnemyAttackPathPreviews = function (force) {
  if (!ENEMY_ATTACK_ROUTE_PREVIEWS_ENABLED) {
    if (this.enemyPathGroup && this.enemyPathGroup.children.length) {
      clearGroup(this.enemyPathGroup);
    }
    this.enemyPathPreviewLastState = this.state;
    this.enemyPathPreviewNextAt = 0;
    return;
  }
  if (this.state !== 'planning' && this.state !== 'combat') {
    if (this.enemyPathGroup && this.enemyPathGroup.children.length) {
      clearGroup(this.enemyPathGroup);
    }
    this.enemyPathPreviewLastState = this.state;
    this.enemyPathPreviewNextAt = this.elapsed + ENEMY_PATH_PREVIEW_INTERVAL;
    return;
  }
  if (!force && this.enemyPathPreviewLastState === this.state && this.elapsed < this.enemyPathPreviewNextAt) {
    return;
  }
  this.enemyPathPreviewLastState = this.state;
  this.enemyPathPreviewNextAt = this.elapsed + ENEMY_PATH_PREVIEW_INTERVAL;
  clearGroup(this.enemyPathGroup);
  if (this.state === 'planning') {
    this.syncPlannedWaveAttackPaths();
  } else if (this.state === 'combat') {
    this.syncActiveEnemyAttackPaths();
  }
};

BadNorthRuntime.prototype.syncPlannedWaveAttackPaths = function () {
  var wave = WAVES[this.waveIndex];
  var drawn = {};
  var count = 0;
  var i;
  var boatDef;
  var lane;
  var house;
  var actor;
  if (!wave) {
    return;
  }
  for (i = 0; i < wave.boats.length && count < ENEMY_ROUTE_LIMIT; i += 1) {
    boatDef = wave.boats[i];
    lane = LANES[boatDef.lane];
    if (!lane) {
      continue;
    }
    house = this.findNearestAliveHouse(lane.landing.x, lane.landing.z);
    if (!house || drawn[boatDef.lane + ':' + house.id]) {
      continue;
    }
    actor = {
      x: lane.landing.x,
      z: lane.landing.z,
      displayY: this.getHeightAt(lane.landing.x, lane.landing.z)
    };
    if (this.drawEnemyAttackRoute(actor, house, count, true)) {
      drawn[boatDef.lane + ':' + house.id] = true;
      count += 1;
    }
  }
};

BadNorthRuntime.prototype.syncActiveEnemyAttackPaths = function () {
  var drawn = {};
  var count = 0;
  var i;
  var boat;
  var enemy;
  var house;
  var actor;
  var key;
  var target;

  for (i = 0; i < this.boats.length && count < ENEMY_ROUTE_LIMIT; i += 1) {
    boat = this.boats[i];
    house = this.findNearestAliveHouse(boat.landingX, boat.landingZ);
    if (!house) {
      continue;
    }
    key = 'boat:' + boat.lane + ':' + house.id;
    if (drawn[key]) {
      continue;
    }
    actor = {
      x: boat.landingX,
      z: boat.landingZ,
      displayY: this.getHeightAt(boat.landingX, boat.landingZ)
    };
    if (this.drawEnemyAttackRoute(actor, house, count, false)) {
      drawn[key] = true;
      count += 1;
    }
  }

  for (i = 0; i < this.enemies.length && count < ENEMY_ROUTE_LIMIT; i += 1) {
    enemy = this.enemies[i];
    if (enemy.hp <= 0) {
      continue;
    }
    target = this.findEnemyTarget(enemy);
    if (!target) {
      continue;
    }
    key = 'enemy:' + Math.round(enemy.x) + ':' + Math.round(enemy.z) + ':' + target.kind + ':' + (target.ref && target.ref.id ? target.ref.id : '');
    if (drawn[key]) {
      continue;
    }
    if (this.drawEnemyAttackRoute(enemy, target, count, false)) {
      drawn[key] = true;
      count += 1;
    }
  }
};

BadNorthRuntime.prototype.drawEnemyAttackRoute = function (actor, target, routeIndex, planned) {
  var route;
  var points;
  var pulse;
  if (target && target.kind === 'house') {
    route = this.findHouseAttackRoute(actor, target.ref, target.attackTileKey || actor.attackTileKey || '');
  } else if (target && target.w !== undefined && target.d !== undefined) {
    route = this.findHouseAttackRoute(actor, target, '');
  } else {
    route = this.buildActorRouteToTarget(actor, target);
  }
  if (!route || !route.path || route.path.length < 2) {
    return false;
  }
  pulse = planned ? 0.82 : 0.96;
  points = this.createRoutePreviewPoints(actor, route.path, 0, 0.11, routeIndex);
  return this.drawRoutePreview(this.enemyPathGroup, points, {
    lineMaterial: this.materials.enemyPathLine,
    stripMaterial: this.materials.enemyPathStrip,
    coreMaterial: this.materials.enemyPathDashCore,
    nodeMaterial: this.materials.enemyPathNode,
    lineOpacity: pulse,
    stripOpacity: planned ? 0.2 : 0.3,
    coreOpacity: pulse,
    nodeOpacity: 0,
    stripWidth: 0.115,
    dashLength: 0.3,
    dashGap: 0.18,
    midRadius: 0.075,
    endRadius: 0.22,
    nodeEvery: 999,
    routeIndex: routeIndex,
    routeKind: 'enemy-warning',
    nodes: false,
    chevrons: false
  });
};

BadNorthRuntime.prototype.syncPathPreview = function () {
  var squad = this.getSelectedSquad();
  var points;

  clearGroup(this.pathGroup);
  if (!squad || !squad.movePath || squad.pathIndex <= 0 || squad.pathIndex >= squad.movePath.length || squad.hp <= 0) {
    return;
  }

  points = this.createRoutePreviewPoints(squad, squad.movePath, squad.pathIndex, 0.075, 0);
  this.drawRoutePreview(this.pathGroup, points, {
    lineMaterial: this.materials.pathLine,
    stripMaterial: this.materials.pathStrip,
    nodeMaterial: this.materials.pathNode,
    lineOpacity: 0.88,
    stripOpacity: 0.62,
    nodeOpacity: 0.74,
    stripWidth: 0.085,
    dashLength: 0.28,
    dashGap: 0.18,
    midRadius: 0.11,
    endRadius: 0.16,
    nodeEvery: 1,
    routeIndex: 0,
    singleLayer: true
  });
};

BadNorthRuntime.prototype.createRoutePreviewPoints = function (actor, path, startIndex, lift, routeIndex) {
  var points = [];
  var i;
  var node;
  var currentY = actor.displayY !== undefined ? actor.displayY : this.getHeightAt(actor.x, actor.z);
  points.push(new THREE.Vector3(actor.x, currentY + lift + routeIndex * 0.004, actor.z));
  for (i = startIndex; i < path.length; i += 1) {
    node = path[i];
    points.push(new THREE.Vector3(node.x, node.h * HEIGHT_UNIT + lift + routeIndex * 0.004, node.z));
  }
  return points;
};

BadNorthRuntime.prototype.drawRoutePreview = function (group, points, style) {
  var ring;
  var i;
  var prev;
  var nodeEvery = style.nodeEvery || 1;
  if (!group || !points || points.length < 2) {
    return false;
  }
  for (i = 1; i < points.length; i += 1) {
    prev = points[i - 1];
    this.addRouteDashes(group, prev, points[i], style, i);
    if (style.chevrons) {
      this.addRouteChevrons(group, prev, points[i], style, i);
    }
    if (style.nodes !== false && (i === points.length - 1 || i % nodeEvery === 0)) {
      ring = new THREE.Mesh(new THREE.TorusGeometry(i === points.length - 1 ? style.endRadius : style.midRadius, 0.01, 5, 28), style.nodeMaterial.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(points[i]);
      ring.material.opacity = style.nodeOpacity;
      ring.userData.routeKind = style.routeKind || 'friendly-command';
      group.add(ring);
    }
  }
  return true;
};

BadNorthRuntime.prototype.addRouteDashes = function (group, from, to, style, segmentIndex) {
  var dx = to.x - from.x;
  var dz = to.z - from.z;
  var length = Math.sqrt(dx * dx + dz * dz);
  var dashLength = style.dashLength || 0.24;
  var dashGap = style.dashGap || 0.16;
  var cursor = dashGap * 0.25;
  var index = 0;
  var end;
  var center;
  if (!group || length < 0.04) {
    return;
  }
  while (cursor < length) {
    end = Math.min(length, cursor + dashLength);
    center = (cursor + end) * 0.5;
    group.add(this.createRouteDash(from, to, center / length, Math.max(0.06, end - cursor), style, segmentIndex + index));
    cursor += dashLength + dashGap;
    index += 1;
  }
};

BadNorthRuntime.prototype.getRouteSegmentY = function (from, to, t, style) {
  var y = utils.lerp(from.y, to.y, t);
  var climb = Math.abs(to.y - from.y) > 0.025 ? Math.sin(t * Math.PI) * 0.035 : 0;
  return y + climb + (style.routeIndex || 0) * 0.002;
};

BadNorthRuntime.prototype.createRouteDash = function (from, to, t, length, style, index) {
  var dx = to.x - from.x;
  var dz = to.z - from.z;
  var x = utils.lerp(from.x, to.x, t);
  var z = utils.lerp(from.z, to.z, t);
  var y = this.getRouteSegmentY(from, to, t, style);
  var group = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(length, 0.016, style.stripWidth), style.stripMaterial.clone());
  var core;
  var pulse = 0.9 + Math.sin(this.elapsed * 5.4 + index) * 0.08;
  base.position.y = 0;
  base.rotation.y = Math.atan2(-dz, dx);
  base.material.opacity = style.stripOpacity * pulse;
  base.userData.routeKind = style.routeKind || 'friendly-command';
  base.userData.marker = 'route-dash';
  base.userData.terrain3D = true;
  group.add(base);
  if (!style.singleLayer && style.coreMaterial) {
    core = new THREE.Mesh(new THREE.BoxGeometry(length * 0.76, 0.014, style.stripWidth * 0.46), style.coreMaterial.clone());
    core.position.y = 0.014;
    core.rotation.y = base.rotation.y;
    core.material.opacity = (style.coreOpacity !== undefined ? style.coreOpacity : style.lineOpacity) * pulse;
    core.userData.routeKind = style.routeKind || 'friendly-command';
    core.userData.marker = 'route-dash-core';
    core.userData.terrain3D = true;
    group.add(core);
  }
  group.position.set(x, y - 0.014, z);
  group.userData.routeKind = style.routeKind || 'friendly-command';
  group.userData.marker = 'route-dash';
  group.userData.terrain3D = true;
  return group;
};

BadNorthRuntime.prototype.addRouteChevrons = function (group, from, to, style, segmentIndex) {
  var dx = to.x - from.x;
  var dz = to.z - from.z;
  var length = Math.sqrt(dx * dx + dz * dz);
  var count;
  var i;
  var t;
  var x;
  var z;
  var y;
  var angle;
  if (!group || !style.chevronMaterial || length < 0.28) {
    return;
  }
  count = Math.max(1, Math.floor(length / (style.chevronSpacing || 0.8)));
  angle = Math.atan2(dx, dz);
  for (i = 0; i < count; i += 1) {
    t = (i + 1) / (count + 1);
    x = utils.lerp(from.x, to.x, t);
    z = utils.lerp(from.z, to.z, t);
    y = this.getRouteSegmentY(from, to, t, style) + 0.018;
    group.add(this.createRouteChevron(x, y, z, angle, style, segmentIndex + i));
  }
};

BadNorthRuntime.prototype.createRouteChevron = function (x, y, z, angle, style, index) {
  var group = new THREE.Group();
  var left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.042), style.chevronMaterial.clone());
  var right = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.042), style.chevronMaterial.clone());
  var pulse = 1;
  left.material.opacity = (style.chevronOpacity || 0.7) * pulse;
  right.material.opacity = (style.chevronOpacity || 0.7) * pulse;
  left.position.set(-0.07, 0, -0.045);
  right.position.set(0.07, 0, -0.045);
  left.rotation.y = 0.72;
  right.rotation.y = -0.72;
  group.add(left);
  group.add(right);
  group.position.set(x, y, z);
  group.rotation.y = angle;
  group.userData.routeKind = style.routeKind || 'enemy-warning';
  group.userData.marker = 'route-chevron';
  return group;
};

BadNorthRuntime.prototype.syncProjectileMeshes = function () {
  var i;
  var projectile;
  var t;
  var start;
  var end;
  var mesh;
  clearGroup(this.projectileGroup);
  for (i = 0; i < this.projectiles.length; i += 1) {
    projectile = this.projectiles[i];
    if (projectile.delay > 0) {
      continue;
    }
    t = utils.clamp(projectile.age / projectile.life, 0, 1);
    start = new THREE.Vector3(projectile.x, projectile.y, projectile.z);
    end = new THREE.Vector3(
      utils.lerp(projectile.x, projectile.tx, t),
      utils.lerp(projectile.y, projectile.ty, t) + Math.sin(t * Math.PI) * 0.45,
      utils.lerp(projectile.z, projectile.tz, t)
    );
    mesh = this.createProjectileMesh(projectile.kind, start, end);
    this.projectileGroup.add(mesh);
  }
};

BadNorthRuntime.prototype.createProjectileMesh = function (kind, start, end) {
  var group = new THREE.Group();
  var dir = new THREE.Vector3().subVectors(end, start);
  var len = Math.max(0.08, dir.length());
  var unit = dir.clone().normalize();
  var quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
  var shaft;
  var head;
  var drawLen = Math.min(kind === 'knife' ? 0.34 : 0.5, len);

  if (kind === 'knife') {
    shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, Math.min(0.34, len), 5), this.materials.metal);
    head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 5), this.materials.metal);
  } else if (kind === 'star') {
    shaft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.095, 1), this.materials.starLight);
    shaft.material = this.materials.starLight;
    group.add(shaft);
    group.position.copy(end);
    group.scale.setScalar(0.95 + Math.sin(this.elapsed * 12) * 0.08);
    return group;
  } else {
    shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, drawLen, 5), this.materials.wood);
    head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), this.materials.metal);
  }

  if (kind === 'knife') {
    shaft.geometry.dispose();
    shaft.geometry = new THREE.CylinderGeometry(0.018, 0.018, drawLen, 5);
  }
  shaft.position.y = drawLen * 0.45;
  head.position.y = drawLen * 0.95;
  group.add(shaft);
  group.add(head);
  group.quaternion.copy(quat);
  group.position.copy(end.clone().addScaledVector(unit, -drawLen));
  return group;
};

BadNorthRuntime.prototype.syncEffectMeshes = function () {
  var i;
  var effect;
  var decoy;
  var prison;
  var mesh;
  var alpha;
  clearGroup(this.effectGroup);
  for (i = 0; i < this.effects.length; i += 1) {
    effect = this.effects[i];
    alpha = utils.clamp(effect.life / effect.maxLife, 0, 1);
    if (effect.type === 'wake' || effect.type === 'landingWake') {
      mesh = new THREE.Group();
      var wakeScale = effect.scale || 1;
      var wakeMat = this.materials.boatWake.clone();
      var wakeMat2 = this.materials.boatWake.clone();
      var wakeRing = new THREE.Mesh(
        new THREE.TorusGeometry((effect.type === 'landingWake' ? 0.22 : 0.12) + effect.age * (effect.type === 'landingWake' ? 0.95 : 0.36), 0.008, 5, 32),
        wakeMat
      );
      var wakeStripeA = new THREE.Mesh(new THREE.PlaneGeometry((0.34 + effect.age * 0.42) * wakeScale, 0.034), wakeMat2);
      var wakeStripeB = new THREE.Mesh(new THREE.PlaneGeometry((0.28 + effect.age * 0.34) * wakeScale, 0.028), this.materials.boatWake.clone());
      wakeRing.material.opacity = alpha * (effect.type === 'landingWake' ? 0.58 : 0.34);
      wakeRing.rotation.x = Math.PI / 2;
      wakeRing.scale.set(1.35 * wakeScale, 0.46, 1);
      wakeStripeA.material.opacity = alpha * 0.38;
      wakeStripeB.material.opacity = alpha * 0.26;
      wakeStripeA.rotation.x = -Math.PI / 2;
      wakeStripeB.rotation.x = -Math.PI / 2;
      wakeStripeA.rotation.z = effect.angle + 0.28;
      wakeStripeB.rotation.z = effect.angle - 0.22;
      wakeStripeA.position.set(-0.04, 0.004, 0.08);
      wakeStripeB.position.set(0.04, 0.006, -0.08);
      mesh.add(wakeRing);
      mesh.add(wakeStripeA);
      mesh.add(wakeStripeB);
      mesh.position.set(effect.x, effect.y + 0.028, effect.z);
    } else if (effect.type === 'splash') {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.22 + effect.age * 0.75, 0.012, 5, 40), this.materials.boatWake.clone());
      mesh.material.opacity = alpha * 0.72;
      mesh.rotation.x = Math.PI / 2;
      mesh.scale.set(1.24 * (effect.scale || 1), 0.64, 1);
      mesh.position.set(effect.x, effect.y + 0.035, effect.z);
    } else if (effect.type === 'command') {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.22 + effect.age * 0.6, 0.01, 5, 36), this.materials.command.clone());
      mesh.material.opacity = alpha * 0.65;
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(effect.x, effect.y + 0.035, effect.z);
    } else if (effect.type === 'clash') {
      mesh = new THREE.Group();
      var clashScale = effect.scale || 1;
      var clashColor = effect.hostile ? 0xff6a48 : 0xf6d7a8;
      var slashMatA = new THREE.MeshBasicMaterial({ color: clashColor, transparent: true, opacity: alpha * 0.82, depthWrite: false, side: THREE.DoubleSide || 2, toneMapped: false });
      var slashMatB = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: alpha * 0.46, depthWrite: false, side: THREE.DoubleSide || 2, toneMapped: false });
      var arcMat = new THREE.MeshBasicMaterial({ color: effect.hostile ? ENEMY_RED : PATH_LINE_HEX, transparent: true, opacity: alpha * 0.52, depthWrite: false, toneMapped: false });
      var slashA = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * clashScale, 0.055 * clashScale), slashMatA);
      var slashB = new THREE.Mesh(new THREE.PlaneGeometry(0.36 * clashScale, 0.042 * clashScale), slashMatB);
      var clashRing = new THREE.Mesh(new THREE.TorusGeometry(0.16 * clashScale + effect.age * 0.28, 0.012, 5, 32), arcMat);
      slashA.position.set(0, 0.44, 0);
      slashA.rotation.z = 0.55;
      slashB.position.set(0.03, 0.5, 0.02);
      slashB.rotation.z = -0.42;
      clashRing.rotation.x = Math.PI / 2;
      clashRing.position.y = 0.05;
      mesh.rotation.y = effect.angle || 0;
      mesh.add(clashRing);
      mesh.add(slashA);
      mesh.add(slashB);
      mesh.position.set(effect.x, effect.y + 0.04, effect.z);
      mesh.userData.type = 'clash';
    } else if (effect.type === 'smoke' || effect.type === 'down') {
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + effect.age * 0.18, 0), this.materials.smoke.clone());
      mesh.material.opacity = alpha * 0.28;
      mesh.position.set(effect.x, effect.y + 0.55 + effect.age * 0.28, effect.z);
    } else if (effect.type === 'starburst') {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.28 + effect.age * 2.2, 0.025, 6, 48), this.materials.starLight.clone());
      mesh.material.transparent = true;
      mesh.material.opacity = alpha * 0.62;
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(effect.x, effect.y + 0.08, effect.z);
    } else if (effect.type === 'skill') {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + effect.age * 0.1, 1), this.materials.lightCore.clone());
      mesh.material.opacity = alpha * 0.7;
      mesh.position.set(effect.x, effect.y + 0.85, effect.z);
    } else {
      mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + effect.age * 0.18, 0), new THREE.MeshBasicMaterial({ color: 0xf6d7a8, transparent: true, opacity: alpha * 0.72, depthWrite: false }));
      mesh.position.set(effect.x, effect.y + 0.38, effect.z);
    }
    this.effectGroup.add(mesh);
  }

  for (i = 0; i < this.decoys.length; i += 1) {
    decoy = this.decoys[i];
    alpha = utils.clamp(decoy.life / 7, 0, 1);
    mesh = new THREE.Group();
    var beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.78, 6), this.materials.lightCore.clone());
    var glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + Math.sin(this.elapsed * 6) * 0.02, 1), this.materials.lightCore.clone());
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.72 + Math.sin(this.elapsed * 3) * 0.05, 0.012, 6, 40), this.materials.lightCore.clone());
    beacon.material.opacity = alpha * 0.55;
    glow.material.opacity = alpha * 0.82;
    ring.material.opacity = alpha * 0.38;
    beacon.position.y = 0.39;
    glow.position.y = 0.88;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    mesh.add(beacon);
    mesh.add(glow);
    mesh.add(ring);
    mesh.position.set(decoy.x, decoy.y + 0.02, decoy.z);
    this.effectGroup.add(mesh);
  }

  for (i = 0; i < this.prisons.length; i += 1) {
    prison = this.prisons[i];
    alpha = utils.clamp(prison.life / 3.4, 0, 1);
    mesh = new THREE.Group();
    var floor = new THREE.Mesh(new THREE.TorusGeometry(prison.radius, 0.018, 6, 64), this.materials.lightCore.clone());
    var cageA = new THREE.Mesh(new THREE.TorusGeometry(prison.radius * 0.7, 0.012, 6, 48), this.materials.lightCore.clone());
    var cageB = new THREE.Mesh(new THREE.TorusGeometry(prison.radius * 0.7, 0.012, 6, 48), this.materials.lightCore.clone());
    floor.material.opacity = alpha * 0.5;
    cageA.material.opacity = alpha * 0.32;
    cageB.material.opacity = alpha * 0.32;
    floor.rotation.x = Math.PI / 2;
    cageA.rotation.x = Math.PI * 0.5;
    cageA.rotation.y = Math.PI * 0.5;
    cageB.rotation.x = Math.PI * 0.5;
    cageB.rotation.z = Math.PI * 0.5;
    cageA.position.y = 0.62;
    cageB.position.y = 0.62;
    mesh.add(floor);
    mesh.add(cageA);
    mesh.add(cageB);
    mesh.position.set(prison.x, prison.y + 0.04, prison.z);
    this.effectGroup.add(mesh);
  }
};

BadNorthRuntime.prototype.handleTouchStart = function (event) {
  var touches = this.getActiveTouches(event);
  var point = touches.length >= 2 ? this.getTouchCenter(touches) : utils.getTouchPoint(event);
  this.audio.resume();
  this.audio.startAmbient();
  this.touchStartX = point.x;
  this.touchStartY = point.y;
  this.lastTouchX = point.x;
  this.lastTouchY = point.y;
  this.touchMoved = false;
  this.gestureMode = touches.length >= 2 ? 'pinch' : 'pending';
  this.touchStartOnUi = this.pointHitsUi(point.x, point.y);
  this.touchStartPicked = null;
  if (touches.length < 2 && this.touchRects.rotateView && utils.pointInRect(point.x, point.y, this.touchRects.rotateView)) {
    this.startRotateCameraView();
    this.gestureMode = 'rotate-view';
    this.touchStartOnUi = true;
    this.touchMoved = true;
    return;
  }
  if (this.gestureMode === 'pinch') {
    this.pinchStartDistance = this.getTouchDistance(touches);
    this.pinchStartZoom = this.targetCameraZoom;
  }
};

BadNorthRuntime.prototype.handleTouchMove = function (event) {
  var touches = this.getActiveTouches(event);
  var point;
  var dx;
  var dy;
  var totalDx;
  var totalDy;
  if (this.gestureMode === 'idle' || this.touchStartOnUi) {
    return;
  }
  if (touches.length >= 2) {
    point = this.getTouchCenter(touches);
    dx = point.x - this.lastTouchX;
    dy = point.y - this.lastTouchY;
    if (this.gestureMode !== 'pinch') {
      this.gestureMode = 'pinch';
      this.pinchStartDistance = this.getTouchDistance(touches);
      this.pinchStartZoom = this.targetCameraZoom;
    }
    this.touchMoved = true;
    this.zoomCamera(this.getTouchDistance(touches));
    this.panCamera(dx, dy);
    this.lastTouchX = point.x;
    this.lastTouchY = point.y;
    return;
  }
  point = utils.getTouchPoint(event);
  dx = point.x - this.lastTouchX;
  dy = point.y - this.lastTouchY;
  totalDx = point.x - this.touchStartX;
  totalDy = point.y - this.touchStartY;
  if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 8 * this.scale) {
    this.touchMoved = true;
    if (this.gestureMode === 'pending') {
      this.gestureMode = 'pan';
    }
  }
  if (this.gestureMode === 'pan') {
    this.panCamera(dx, dy);
  }
  this.lastTouchX = point.x;
  this.lastTouchY = point.y;
};

BadNorthRuntime.prototype.handleTouchEnd = function () {
  if (this.gestureMode === 'rotate-view') {
    this.stopRotateCameraView();
    this.draggingCommand = false;
    this.gestureMode = 'idle';
    this.touchStartPicked = null;
    return;
  }
  if (!this.touchMoved && this.gestureMode !== 'idle' && this.gestureMode !== 'pinch') {
    this.handleTap(this.touchStartX, this.touchStartY);
  }
  this.draggingCommand = false;
  this.gestureMode = 'idle';
  this.touchStartPicked = null;
};

BadNorthRuntime.prototype.handleTouchCancel = function () {
  this.stopRotateCameraView();
  this.draggingCommand = false;
  this.gestureMode = 'idle';
  this.touchStartPicked = null;
};

BadNorthRuntime.prototype.getActiveTouches = function (event) {
  if (event && event.touches && event.touches.length) {
    return event.touches;
  }
  if (event && event.changedTouches && event.changedTouches.length) {
    return event.changedTouches;
  }
  return [];
};

BadNorthRuntime.prototype.getTouchCenter = function (touches) {
  var count = Math.max(1, touches.length);
  var x = 0;
  var y = 0;
  var i;
  for (i = 0; i < touches.length; i += 1) {
    x += touches[i].clientX;
    y += touches[i].clientY;
  }
  return {
    x: x / count,
    y: y / count
  };
};

BadNorthRuntime.prototype.getTouchDistance = function (touches) {
  var dx;
  var dy;
  if (!touches || touches.length < 2) {
    return this.pinchStartDistance || 1;
  }
  dx = touches[0].clientX - touches[1].clientX;
  dy = touches[0].clientY - touches[1].clientY;
  return Math.max(1, Math.sqrt(dx * dx + dy * dy));
};

BadNorthRuntime.prototype.pointHitsUi = function (x, y) {
  var id;
  for (id in this.touchRects) {
    if (this.touchRects.hasOwnProperty(id) && utils.pointInRect(x, y, this.touchRects[id])) {
      return true;
    }
  }
  return false;
};

BadNorthRuntime.prototype.panCamera = function (dx, dy) {
  var speed = 0.013 / Math.max(0.7, this.targetCameraZoom);
  var limit = utils.clamp(1.8 + (this.targetCameraZoom - 1) * 1.5, 1.35, 3.4);
  this.targetViewPanX = utils.clamp(this.targetViewPanX + dx * speed, -limit, limit);
  this.targetViewPanZ = utils.clamp(this.targetViewPanZ + dy * speed, -limit, limit);
};

BadNorthRuntime.prototype.zoomCamera = function (distance) {
  var ratio;
  if (!this.pinchStartDistance) {
    this.pinchStartDistance = distance || 1;
    this.pinchStartZoom = this.targetCameraZoom;
  }
  ratio = distance / Math.max(1, this.pinchStartDistance);
  this.targetCameraZoom = utils.clamp(this.pinchStartZoom * ratio, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  this.clampCameraPan();
};

BadNorthRuntime.prototype.clampCameraPan = function () {
  var limit = utils.clamp(1.8 + (this.targetCameraZoom - 1) * 1.5, 1.35, 3.4);
  this.targetViewPanX = utils.clamp(this.targetViewPanX, -limit, limit);
  this.targetViewPanZ = utils.clamp(this.targetViewPanZ, -limit, limit);
};

BadNorthRuntime.prototype.handleTap = function (x, y) {
  var id;
  var picked;
  if (this.touchRects.start && utils.pointInRect(x, y, this.touchRects.start)) {
    this.resetRun();
    return;
  }
  if (this.touchRects.restart && utils.pointInRect(x, y, this.touchRects.restart)) {
    this.resetRun();
    return;
  }
  if (this.touchRects.resetView && utils.pointInRect(x, y, this.touchRects.resetView)) {
    this.resetCameraView();
    return;
  }
  if (this.touchRects.rotateView && utils.pointInRect(x, y, this.touchRects.rotateView)) {
    this.startRotateCameraView();
    this.rotateCameraView(0.18);
    this.stopRotateCameraView();
    return;
  }
  if (this.touchRects.wave && utils.pointInRect(x, y, this.touchRects.wave)) {
    if (this.state === 'planning') {
      this.startWave();
    }
    return;
  }
  for (id in this.touchRects) {
    if (this.touchRects.hasOwnProperty(id) && id.indexOf('squad:') === 0 && utils.pointInRect(x, y, this.touchRects[id])) {
      id = id.replace('squad:', '');
      if (id === this.selectedSquadId) {
        if (this.getSelectedSquad().skill === 'none') {
          this.setHint(this.getSelectedSquad().name + '没有主动技能', 1.2);
          this.audio.playDeny();
        } else {
          this.tryActivateSelectedSkill();
        }
        return;
      }
      this.selectedSquadId = id;
      this.audio.playSelect(id);
      this.setHint('选择了' + this.getSelectedSquad().name, 1);
      return;
    }
  }
  picked = this.pickSceneAt(x, y);
  if (picked && picked.type === 'squad') {
    this.selectedSquadId = picked.squad.id;
    this.audio.playSelect(picked.squad.id);
    this.setHint('选择了' + picked.squad.name, 1);
    return;
  }
  if (picked && picked.type === 'tile' && this.state !== 'title' && this.state !== 'victory' && this.state !== 'defeat') {
    this.commandSelectedSquad(picked.tile);
    this.draggingCommand = true;
  }
};

BadNorthRuntime.prototype.resetCameraView = function () {
  this.cameraQuarter = 0;
  this.targetWorldRotation = 0;
  this.targetWorldTilt = 0;
  this.rotateViewActive = false;
  this.targetViewPanX = 0;
  this.targetViewPanZ = 0;
  this.targetCameraZoom = CAMERA_DEFAULT_ZOOM;
  this.audio.playClick();
  this.setHint('视角已归位', 0.9);
};

BadNorthRuntime.prototype.startRotateCameraView = function () {
  this.rotateViewActive = true;
  this.targetWorldTilt = 0;
  this.audio.playClick();
  this.setHint('按住旋转视野', 0.9);
};

BadNorthRuntime.prototype.stopRotateCameraView = function () {
  this.rotateViewActive = false;
};

BadNorthRuntime.prototype.rotateCameraView = function (dt) {
  this.targetWorldRotation += Math.max(0, dt || 0) * ROTATE_VIEW_SPEED;
  this.cameraQuarter = ((Math.round(this.targetWorldRotation / (Math.PI * 0.5)) % 4) + 4) % 4;
  this.targetWorldTilt = 0;
};

BadNorthRuntime.prototype.pickSceneAt = function (x, y) {
  var tile = this.pickTileAt(x, y);
  var squad = this.pickSquadAt(x, y);
  if (squad) {
    return { type: 'squad', squad: squad };
  }
  if (tile) {
    return { type: 'tile', tile: tile };
  }
  return null;
};

BadNorthRuntime.prototype.pickTileAt = function (x, y) {
  var intersections;
  var i;
  var object;
  this.pointer.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
  this.raycaster.setFromCamera(this.pointer, this.camera);
  intersections = this.raycaster.intersectObjects(this.pickables, false);
  for (i = 0; i < intersections.length; i += 1) {
    object = intersections[i].object;
    if (object.userData && object.userData.type === 'tile') {
      return object.userData.tile;
    }
  }
  return null;
};

BadNorthRuntime.prototype.pickSquadAt = function (x, y) {
  var best = null;
  var bestDistance = 99999;
  var i;
  var squad;
  var p;
  var sx;
  var sy;
  var dx;
  var dy;
  var dist;
  for (i = 0; i < this.squads.length; i += 1) {
    squad = this.squads[i];
    if (squad.hp <= 0) {
      continue;
    }
    p = this.worldToScreen(squad.x, (squad.displayY !== undefined ? squad.displayY : this.getHeightAt(squad.x, squad.z)) + 0.35, squad.z);
    sx = p.x;
    sy = p.y;
    dx = x - sx;
    dy = y - sy;
    dist = dx * dx + dy * dy;
    if (dist < bestDistance && dist < Math.pow(34 * this.scale, 2)) {
      best = squad;
      bestDistance = dist;
    }
  }
  return best;
};

BadNorthRuntime.prototype.worldToScreen = function (x, y, z) {
  this.tmpVector.set(x, y, z);
  this.worldGroup.localToWorld(this.tmpVector);
  this.tmpVector.project(this.camera);
  return {
    x: (this.tmpVector.x * 0.5 + 0.5) * this.width,
    y: (-this.tmpVector.y * 0.5 + 0.5) * this.height
  };
};

BadNorthRuntime.prototype.commandSelectedSquad = function (tile) {
  var squad = this.getSelectedSquad();
  var route;
  if (!squad || squad.hp <= 0) {
    this.setHint('这支小队需要恢复', 1.2);
    this.audio.playDeny();
    return;
  }
  route = this.buildActorPathToTile(squad, tile);
  if (!route) {
    this.setHint('没有可走路径', 1.2);
    this.audio.playDeny();
    return;
  }
  this.assignActorPath(squad, route.path);
  squad.commandPulse = 1;
  this.audio.playCommand();
  this.addEffect(route.destination.x, route.destination.z, 'command', 0.7);
  if (route.destination.x !== tile.x || route.destination.z !== tile.z) {
    this.setHint('建筑挡路，已移动到附近空地', 1.2);
  }
};

BadNorthRuntime.prototype.tryActivateSelectedSkill = function () {
  var squad = this.getSelectedSquad();
  if (!squad || squad.hp <= 0 || squad.skill === 'none') {
    this.setHint(squad ? squad.name + '没有主动技能' : '没有可用技能', 1.2);
    this.audio.playDeny();
    return false;
  }
  if (this.state !== 'combat') {
    this.setHint(squad.skillName + '需要在战斗中使用', 1.2);
    this.audio.playDeny();
    return false;
  }
  if (squad.skillTimer > 0) {
    this.setHint(squad.skillName + '冷却中 ' + Math.ceil(squad.skillTimer) + '秒', 1.2);
    this.audio.playDeny();
    return false;
  }
  this.activateSkill(squad);
  return true;
};

BadNorthRuntime.prototype.activateSkill = function (squad) {
  var target = this.findSquadTarget(squad) || this.findNearestEnemy(squad.x, squad.z, 5.5);
  var i;
  var burstX;
  var burstZ;

  squad.skillTimer = squad.skillCooldown;
  squad.commandPulse = 1;

  if (squad.skill === 'volley') {
    if (!target) {
      this.setHint('连射需要附近有敌人', 1.2);
      squad.skillTimer = 1.2;
      this.audio.playDeny();
      return;
    }
    for (i = 0; i < 3; i += 1) {
      this.spawnSquadProjectiles(squad, target, squad.damage * 0.95, 'arrow', i * 0.12);
    }
    this.addEffect(squad.x, squad.z, 'skill', 0.7);
    this.setBanner('弓箭手：连射', 1.2);
  } else if (squad.skill === 'decoy') {
    this.decoys.push({
      id: 'decoy-' + this.nextEntityId,
      x: squad.x,
      z: squad.z,
      y: squad.displayY !== undefined ? squad.displayY : this.getHeightAt(squad.x, squad.z),
      hp: 70,
      radius: 5.2,
      age: 0,
      life: 7.0
    });
    this.nextEntityId += 1;
    this.setBanner('游侠：伪光', 1.2);
  } else if (squad.skill === 'prison') {
    this.prisons.push({
      id: 'prison-' + this.nextEntityId,
      x: target ? target.x : squad.x,
      z: target ? target.z : squad.z,
      y: target ? this.getHeightAt(target.x, target.z) : (squad.displayY !== undefined ? squad.displayY : this.getHeightAt(squad.x, squad.z)),
      radius: 1.9,
      age: 0,
      life: 3.4
    });
    this.nextEntityId += 1;
    this.setBanner('武僧：光狱', 1.2);
  } else if (squad.skill === 'starburst') {
    burstX = target ? target.x : squad.x;
    burstZ = target ? target.z : squad.z;
    this.applyAreaDamage(burstX, burstZ, 2.55, 46);
    this.addEffect(burstX, burstZ, 'starburst', 1.1);
    this.setBanner('星使：星爆', 1.2);
  }

  this.audio.playSkill(squad.skill);
};

BadNorthRuntime.prototype.findNearestEnemy = function (x, z, maxDistance) {
  var best = null;
  var bestDist = maxDistance || 999;
  var i;
  var enemy;
  var d;
  for (i = 0; i < this.enemies.length; i += 1) {
    enemy = this.enemies[i];
    if (enemy.hp <= 0) {
      continue;
    }
    d = utils.distance(x, z, enemy.x, enemy.z);
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
};

BadNorthRuntime.prototype.applyAreaDamage = function (x, z, radius, amount) {
  var i;
  var enemy;
  var d;
  for (i = 0; i < this.enemies.length; i += 1) {
    enemy = this.enemies[i];
    d = utils.distance(x, z, enemy.x, enemy.z);
    if (d <= radius) {
      enemy.hp -= amount * (1 - d / radius * 0.35);
      this.addEffect(enemy.x, enemy.z, 'hit', 0.35);
    }
  }
};

BadNorthRuntime.prototype.getSelectedSquad = function () {
  var i;
  for (i = 0; i < this.squads.length; i += 1) {
    if (this.squads[i].id === this.selectedSquadId) {
      return this.squads[i];
    }
  }
  return this.squads[0];
};

BadNorthRuntime.prototype.render = function () {
  if (this.seaMaterial) {
    this.seaMaterial.uniforms.uTime.value = this.elapsed;
  }
  if (this.postMaterial) {
    this.postMaterial.uniforms.uOutline.value = this.state === 'title' ? 0.9 : 1.15;
  }
  if (this.uiEnabled) {
    try {
      this.drawUi();
    } catch (uiError) {
      this.disableUiOverlay(uiError && uiError.message ? uiError.message : String(uiError));
    }
  }

  try {
    if (this.postProcessEnabled && this.renderTarget && this.postScene) {
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.clear(true, true, true);
      this.renderer.render(this.scene, this.camera);
    }
    this.renderUiOverlay();
  } catch (error) {
    if (this.postProcessEnabled) {
      this.disablePostProcess(error && error.message ? error.message : String(error));
      this.render();
      return;
    }
    if (this.depthOutlineSupported) {
      this.disableDepthOutline();
      this.render();
      return;
    }
    this.drawFatalError(error);
  }
};

BadNorthRuntime.prototype.renderUiOverlay = function () {
  if (!this.uiEnabled || !this.uiScene || !this.uiCamera) {
    return;
  }
  try {
    this.renderer.autoClear = false;
    if (this.uiTexture) {
      this.uiTexture.needsUpdate = true;
    }
    this.renderer.render(this.uiScene, this.uiCamera);
  } catch (error) {
    this.disableUiOverlay(error && error.message ? error.message : String(error));
  } finally {
    this.renderer.autoClear = true;
  }
};

BadNorthRuntime.prototype.disableUiOverlay = function (reason) {
  this.uiEnabled = false;
  if (!this.uiWarned && typeof console !== 'undefined' && console.warn) {
    console.warn('[bad-north-game] UI overlay disabled, continuing 3D render:', reason || 'unsupported');
    this.uiWarned = true;
  }
};

BadNorthRuntime.prototype.disablePostProcess = function (reason) {
  this.postProcessEnabled = false;
  this.disableDepthOutline();
  if (!this.postProcessWarned && typeof console !== 'undefined' && console.warn) {
    console.warn('[bad-north-game] post-process disabled, using direct renderer:', reason || 'unsupported');
    this.postProcessWarned = true;
  }
};

BadNorthRuntime.prototype.disableDepthOutline = function () {
  this.depthOutlineSupported = false;
  if (this.renderTarget) {
    this.renderTarget.depthTexture = null;
  }
  if (this.postMaterial && this.renderTarget) {
    this.postMaterial.uniforms.tDepth.value = this.renderTarget.texture;
    this.postMaterial.uniforms.uUseDepth.value = 0.0;
    this.postMaterial.needsUpdate = true;
  }
};

BadNorthRuntime.prototype.drawFatalError = function (error) {
  var ctx;
  try {
    ctx = this.canvas.getContext('2d');
  } catch (error2) {
    ctx = null;
  }
  if (!ctx) {
    return;
  }
  ctx.fillStyle = '#101820';
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('WebGL 初始化失败', 24, 48);
  ctx.font = '12px sans-serif';
  ctx.fillText(error && error.message ? error.message : String(error), 24, 76);
};

BadNorthRuntime.prototype.drawUi = function () {
  var ctx = this.uiCtx;
  if (!ctx) {
    return;
  }
  this.touchRects = {};
  ctx.clearRect(0, 0, this.width, this.height);
  this.drawTopHud(ctx);
  if (this.state !== 'title' && this.state !== 'victory' && this.state !== 'defeat') {
    this.drawHouseHealthBars(ctx);
    this.drawBottomControls(ctx);
  }
  this.drawBannerText(ctx);
  this.drawHintText(ctx);
  if (this.state === 'title') {
    this.drawTitleOverlay(ctx);
  } else if (this.state === 'victory' || this.state === 'defeat') {
    this.drawResultOverlay(ctx);
  }
};

BadNorthRuntime.prototype.drawTopHud = function (ctx) {
  var safeTop = this.getSafeTop();
  var x = 16 * this.scale;
  var y = safeTop + 12 * this.scale;
  var chipW = 74 * this.scale;
  var gap = 8 * this.scale;
  var waveValue = Math.min(this.waveIndex + 1, WAVES.length) + '/' + WAVES.length;
  this.drawTopStatChip(ctx, x, y, chipW, '波次', waveValue);
  this.drawTopStatChip(ctx, x + chipW + gap, y, chipW, '屋舍', this.getAliveHouseCount() + '/' + this.houses.length);
  this.drawTopStatChip(ctx, x + (chipW + gap) * 2, y, chipW, '击退', String(this.kills));
};

BadNorthRuntime.prototype.drawTopStatChip = function (ctx, x, y, w, label, value) {
  var h = 48 * this.scale;
  utils.fillRoundRect(ctx, x, y, w, h, 12 * this.scale, 'rgba(62,60,51,0.58)');
  utils.strokeRoundRect(ctx, x, y, w, h, 12 * this.scale, 'rgba(255,255,255,0.16)', 1);
  utils.setTextStyle(ctx, 9 * this.scale, '800', 'rgba(255,255,255,0.72)', 'center', 'middle');
  ctx.fillText(label, x + w / 2, y + 15 * this.scale);
  utils.setTextStyle(ctx, 18 * this.scale, '900', 'rgba(255,255,255,0.94)', 'center', 'middle');
  ctx.fillText(value, x + w / 2, y + 33 * this.scale);
};

BadNorthRuntime.prototype.drawHouseHealthBars = function (ctx) {
  var i;
  var house;
  var mesh;
  var ratio;
  var p;
  var w = 58 * this.scale;
  var h = 7 * this.scale;
  var x;
  var y;
  var fillColor;
  for (i = 0; i < this.houses.length; i += 1) {
    house = this.houses[i];
    if (!this.shouldShowHouseHealth(house)) {
      continue;
    }
    mesh = this.houseMeshes[house.id];
    ratio = utils.clamp(house.hp / house.maxHp, 0, 1);
    p = this.worldToScreen(house.x, this.getHouseHealthAnchorY(house, mesh), house.z);
    if (p.x < -w || p.x > this.width + w || p.y < this.getSafeTop() + 50 * this.scale || p.y > this.height) {
      continue;
    }
    x = p.x - w / 2;
    y = p.y - 13 * this.scale;
    fillColor = ratio > 0.5 ? '#41ca70' : (ratio > 0.25 ? '#d5aa47' : WARNING);

    ctx.save();
    utils.setTextStyle(ctx, 8 * this.scale, '800', 'rgba(255,255,255,0.92)', 'center', 'middle');
    ctx.shadowColor = 'rgba(30,30,24,0.45)';
    ctx.shadowBlur = 3 * this.scale;
    ctx.fillText(Math.ceil(house.hp) + '/' + house.maxHp, p.x, y - 7 * this.scale);
    ctx.shadowBlur = 0;
    utils.fillRoundRect(ctx, x, y, w, h, 2 * this.scale, 'rgba(22,25,22,0.78)');
    utils.fillRoundRect(ctx, x + 1 * this.scale, y + 1 * this.scale, (w - 2 * this.scale) * ratio, h - 2 * this.scale, 1.5 * this.scale, fillColor);
    utils.strokeRoundRect(ctx, x, y, w, h, 2 * this.scale, 'rgba(255,255,255,0.35)', 0.8 * this.scale);
    ctx.restore();
  }
};

BadNorthRuntime.prototype.getHouseHealthAnchorY = function (house, mesh) {
  var localY = 1.32;
  if (mesh && mesh.userData && mesh.userData.hpMesh) {
    localY = mesh.userData.hpMesh.position.y + 0.1;
  } else if (house && house.id === 'chapel') {
    localY = 1.64;
  }
  return this.getHeightAt(house.x, house.z) + localY;
};

BadNorthRuntime.prototype.drawBottomControls = function (ctx) {
  var safeBottom = this.getSafeBottom();
  var cardGap = 6 * this.scale;
  var margin = 10 * this.scale;
  var cardHeight = 60 * this.scale;
  var cardWidth = (this.width - margin * 2 - cardGap * (this.squads.length - 1)) / this.squads.length;
  var bottom = this.height - safeBottom - 12 * this.scale;
  var y = bottom - cardHeight;
  var i;
  var x;

  this.drawBottomActionBar(ctx, y);

  for (i = 0; i < this.squads.length; i += 1) {
    x = margin + i * (cardWidth + cardGap);
    this.touchRects['squad:' + this.squads[i].id] = { x: x, y: y, width: cardWidth, height: cardHeight };
    this.drawSquadCard(ctx, this.squads[i], this.touchRects['squad:' + this.squads[i].id]);
  }
};

BadNorthRuntime.prototype.drawBottomActionBar = function (ctx, squadY) {
  var barWidth = this.state === 'planning' ? 258 * this.scale : 248 * this.scale;
  var barHeight = 42 * this.scale;
  var barX = this.width / 2 - barWidth / 2;
  var barY = squadY - 50 * this.scale;
  var iconSize = 34 * this.scale;
  var gap = 8 * this.scale;
  var actionX;
  var actionWidth;
  var resetRect = {
    x: barX + 5 * this.scale,
    y: barY + 4 * this.scale,
    width: iconSize,
    height: iconSize
  };
  var rotateRect = {
    x: resetRect.x + resetRect.width + gap,
    y: barY + 4 * this.scale,
    width: iconSize,
    height: iconSize
  };

  utils.fillRoundRect(ctx, barX, barY, barWidth, barHeight, 18 * this.scale, 'rgba(44,58,58,0.48)');
  utils.strokeRoundRect(ctx, barX, barY, barWidth, barHeight, 18 * this.scale, 'rgba(255,255,255,0.22)', 1);

  this.touchRects.resetView = resetRect;
  this.touchRects.rotateView = rotateRect;
  this.drawIconButton(ctx, resetRect, 'reset');
  this.drawIconButton(ctx, rotateRect, 'rotate');
  actionX = rotateRect.x + rotateRect.width + gap;
  actionWidth = barX + barWidth - actionX - 6 * this.scale;

  if (this.state === 'planning') {
    this.touchRects.wave = {
      x: actionX,
      y: barY + 5 * this.scale,
      width: actionWidth,
      height: 32 * this.scale
    };
    this.drawMainButton(ctx, this.touchRects.wave, this.waveIndex === 0 ? '开战' : '下一波', SUCCESS);
  } else if (this.state === 'combat') {
    this.drawCombatStatus(ctx, actionX + actionWidth / 2, barY + barHeight / 2, actionWidth);
  }
};

BadNorthRuntime.prototype.drawSquadCard = function (ctx, squad, rect) {
  var selected = squad.id === this.selectedSquadId;
  var ratio = utils.clamp(squad.hp / squad.maxHp, 0, 1);
  var pips = squad.maxCount;
  var alive = this.getSquadVisibleCount(squad);
  var color = '#' + ('000000' + squad.color.toString(16)).slice(-6);
  var i;
  var pipX;
  var fit;
  var skillLabel;
  var skillReady = squad.skill !== 'none' && squad.skillTimer <= 0 && this.state === 'combat';

  utils.fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8 * this.scale, selected ? 'rgba(255,255,255,0.94)' : 'rgba(248,252,246,0.9)');
  utils.strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8 * this.scale, selected ? color : 'rgba(44,69,71,0.16)', selected ? 2 : 1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(rect.x + rect.width / 2, rect.y + 14 * this.scale, 9 * this.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8 * this.scale;
  ctx.beginPath();
  if (squad.id === 'archer') {
    ctx.arc(rect.x + rect.width / 2, rect.y + 14 * this.scale, 5 * this.scale, Math.PI * 0.18, Math.PI * 1.82);
  } else if (squad.id === 'ranger') {
    ctx.moveTo(rect.x + rect.width / 2 - 4 * this.scale, rect.y + 18 * this.scale);
    ctx.lineTo(rect.x + rect.width / 2 + 5 * this.scale, rect.y + 10 * this.scale);
  } else if (squad.id === 'monk') {
    ctx.arc(rect.x + rect.width / 2, rect.y + 14 * this.scale, 5 * this.scale, 0, Math.PI * 2);
  } else if (squad.id === 'star') {
    ctx.moveTo(rect.x + rect.width / 2, rect.y + 7 * this.scale);
    ctx.lineTo(rect.x + rect.width / 2 + 4 * this.scale, rect.y + 20 * this.scale);
    ctx.lineTo(rect.x + rect.width / 2 - 6 * this.scale, rect.y + 12 * this.scale);
    ctx.lineTo(rect.x + rect.width / 2 + 6 * this.scale, rect.y + 12 * this.scale);
    ctx.lineTo(rect.x + rect.width / 2 - 4 * this.scale, rect.y + 20 * this.scale);
    ctx.closePath();
  } else {
    ctx.arc(rect.x + rect.width / 2, rect.y + 14 * this.scale, 5 * this.scale, 0, Math.PI * 2);
  }
  ctx.stroke();

  fit = utils.fitText(ctx, squad.name, rect.width - 8 * this.scale, 11 * this.scale, 8 * this.scale, '800');
  utils.setTextStyle(ctx, fit.size, '800', INK, 'center', 'middle');
  ctx.fillText(fit.text, rect.x + rect.width / 2, rect.y + 31 * this.scale);

  skillLabel = squad.skill === 'none' ? '无主动' : (squad.skillTimer > 0 ? Math.ceil(squad.skillTimer) + 's' : squad.skillName);
  fit = utils.fitText(ctx, skillLabel, rect.width - 8 * this.scale, 9 * this.scale, 7 * this.scale, '700');
  utils.setTextStyle(ctx, fit.size, '700', skillReady ? color : 'rgba(34,49,58,0.48)', 'center', 'middle');
  ctx.fillText(fit.text, rect.x + rect.width / 2, rect.y + 43 * this.scale);

  utils.fillRoundRect(ctx, rect.x + 7 * this.scale, rect.y + 50 * this.scale, rect.width - 14 * this.scale, 4 * this.scale, 2 * this.scale, 'rgba(40,60,62,0.14)');
  utils.fillRoundRect(ctx, rect.x + 7 * this.scale, rect.y + 50 * this.scale, (rect.width - 14 * this.scale) * ratio, 4 * this.scale, 2 * this.scale, ratio > 0.3 ? color : WARNING);
  for (i = 0; i < pips; i += 1) {
    pipX = rect.x + 8 * this.scale + i * ((rect.width - 16 * this.scale) / Math.max(1, pips - 1));
    ctx.fillStyle = i < alive ? color : 'rgba(40,60,62,0.16)';
    ctx.beginPath();
    ctx.arc(pipX, rect.y + 57 * this.scale, 1.5 * this.scale, 0, Math.PI * 2);
    ctx.fill();
  }
};

BadNorthRuntime.prototype.drawMainButton = function (ctx, rect, label, color) {
  var fit;
  utils.fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8 * this.scale, color);
  utils.strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8 * this.scale, 'rgba(255,255,255,0.58)', 1.2 * this.scale);
  fit = utils.fitText(ctx, label, rect.width - 22 * this.scale, 15 * this.scale, 11 * this.scale, '800');
  utils.setTextStyle(ctx, fit.size, '800', '#ffffff', 'center', 'middle');
  ctx.fillText(fit.text, rect.x + rect.width / 2, rect.y + rect.height / 2);
};

BadNorthRuntime.prototype.drawIconButton = function (ctx, rect, icon) {
  utils.fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.height / 2, 'rgba(245,250,245,0.88)');
  utils.strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.height / 2, 'rgba(34,49,58,0.18)', 1);
  if (icon === 'reset') {
    this.drawResetViewIcon(ctx, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width * 0.3);
  } else if (icon === 'rotate') {
    this.drawRotateViewIcon(ctx, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width * 0.3);
  }
};

BadNorthRuntime.prototype.drawCombatStatus = function (ctx, x, y, width) {
  var w = width || 128 * this.scale;
  var h = 28 * this.scale;
  utils.fillRoundRect(ctx, x - w / 2, y - h / 2, w, h, 8 * this.scale, 'rgba(39,57,59,0.62)');
  utils.setTextStyle(ctx, 12 * this.scale, '800', '#ffffff', 'center', 'middle');
  ctx.fillText('敌兵 ' + this.enemies.length + '  船 ' + this.boats.length, x, y);
};

BadNorthRuntime.prototype.drawTitleOverlay = function (ctx) {
  var y = this.height * 0.13 + this.getSafeTop();
  var button;
  ctx.save();
  utils.setTextStyle(ctx, 34 * this.scale, '900', '#f8fbf5', 'center', 'middle');
  ctx.shadowColor = 'rgba(33,50,52,0.28)';
  ctx.shadowBlur = 8 * this.scale;
  ctx.fillText(gameMeta.GAME_TITLE, this.width / 2, y);
  ctx.shadowBlur = 0;
  utils.setTextStyle(ctx, 13 * this.scale, '800', 'rgba(248,251,245,0.92)', 'center', 'middle');
  ctx.fillText(gameMeta.GAME_SLOGAN, this.width / 2, y + 34 * this.scale);
  button = {
    x: this.width / 2 - 76 * this.scale,
    y: this.height - this.getSafeBottom() - 188 * this.scale,
    width: 152 * this.scale,
    height: 42 * this.scale
  };
  this.touchRects.start = button;
  this.drawMainButton(ctx, button, '开始防守', '#2f73b7');
  utils.setTextStyle(ctx, 11 * this.scale, '700', 'rgba(255,255,255,0.86)', 'center', 'middle');
  ctx.fillText('最佳守到第 ' + this.bestWave + ' 波', this.width / 2, button.y + 58 * this.scale);
  ctx.restore();
};

BadNorthRuntime.prototype.drawResultOverlay = function (ctx) {
  var won = this.state === 'victory';
  var w = Math.min(320 * this.scale, this.width - 44 * this.scale);
  var h = 176 * this.scale;
  var x = this.width / 2 - w / 2;
  var y = this.height * 0.19;
  var button;
  ctx.fillStyle = 'rgba(31,45,48,0.28)';
  ctx.fillRect(0, 0, this.width, this.height);
  utils.fillRoundRect(ctx, x, y, w, h, 8 * this.scale, 'rgba(250,253,247,0.95)');
  utils.strokeRoundRect(ctx, x, y, w, h, 8 * this.scale, 'rgba(50,70,70,0.14)', 1);
  utils.setTextStyle(ctx, 24 * this.scale, '900', won ? SUCCESS : WARNING, 'center', 'middle');
  ctx.fillText(won ? '岛屿守住了' : '村庄失守', this.width / 2, y + 38 * this.scale);
  utils.setTextStyle(ctx, 13 * this.scale, '800', INK, 'center', 'middle');
  ctx.fillText('击退 ' + this.kills + ' 名敌兵  得分 ' + this.score, this.width / 2, y + 74 * this.scale);
  utils.setTextStyle(ctx, 11 * this.scale, '700', SOFT_INK, 'center', 'middle');
  ctx.fillText('最佳记录：第 ' + this.bestWave + ' 波', this.width / 2, y + 98 * this.scale);
  button = { x: this.width / 2 - 66 * this.scale, y: y + 122 * this.scale, width: 132 * this.scale, height: 36 * this.scale };
  this.touchRects.restart = button;
  this.drawMainButton(ctx, button, '重新开始', won ? SUCCESS : '#2f73b7');
};

BadNorthRuntime.prototype.drawBannerText = function (ctx) {
  var alpha;
  if (!this.bannerText || this.elapsed > this.bannerUntil) {
    return;
  }
  alpha = utils.clamp((this.bannerUntil - this.elapsed) / 0.35, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  utils.setTextStyle(ctx, 18 * this.scale, '900', '#ffffff', 'center', 'middle');
  ctx.shadowColor = 'rgba(38,52,54,0.35)';
  ctx.shadowBlur = 6 * this.scale;
  ctx.fillText(this.bannerText, this.width / 2, this.getSafeTop() + 92 * this.scale);
  ctx.restore();
};

BadNorthRuntime.prototype.drawHintText = function (ctx) {
  var alpha;
  var y;
  if (!this.hintText || this.elapsed > this.hintUntil || this.state === 'title') {
    return;
  }
  alpha = utils.clamp((this.hintUntil - this.elapsed) / 0.4, 0, 1);
  y = this.height - this.getSafeBottom() - 154 * this.scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  utils.fillRoundRect(ctx, this.width / 2 - 142 * this.scale, y - 15 * this.scale, 284 * this.scale, 30 * this.scale, 8 * this.scale, 'rgba(36,54,56,0.58)');
  utils.setTextStyle(ctx, 11 * this.scale, '800', '#ffffff', 'center', 'middle');
  ctx.fillText(this.hintText, this.width / 2, y);
  ctx.restore();
};

BadNorthRuntime.prototype.drawResetViewIcon = function (ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * this.scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 1.35, y);
  ctx.lineTo(x + r * 1.35, y);
  ctx.moveTo(x, y - r * 1.35);
  ctx.lineTo(x, y + r * 1.35);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

BadNorthRuntime.prototype.drawRotateViewIcon = function (ctx, x, y, r) {
  var a0 = -Math.PI * 0.72;
  var a1 = Math.PI * 0.86;
  var ex = x + Math.cos(a1) * r;
  var ey = y + Math.sin(a1) * r;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 2 * this.scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + r * 0.78, ey - r * 0.1);
  ctx.lineTo(ex + r * 0.28, ey + r * 0.64);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55);
  ctx.lineTo(x + r * 0.38, y + r * 0.42);
  ctx.lineTo(x - r * 0.42, y + r * 0.14);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};

BadNorthRuntime.prototype.getSafeTop = function () {
  var windowInfo = this.runtimeInfo.windowInfo || {};
  var safeArea = windowInfo.safeArea || null;
  if (!safeArea) {
    return 0;
  }
  return Math.max(0, safeArea.top || 0);
};

BadNorthRuntime.prototype.getSafeBottom = function () {
  var windowInfo = this.runtimeInfo.windowInfo || {};
  var safeArea = windowInfo.safeArea || null;
  var height = windowInfo.windowHeight || windowInfo.screenHeight || this.height;
  if (!safeArea) {
    return 0;
  }
  return Math.max(0, height - ((safeArea.top || 0) + (safeArea.height || height)));
};

module.exports = BadNorthRuntime;
