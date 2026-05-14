'use strict';

var path = require('path');
var failures = [];

function ok(message) {
  console.log('OK  ', message);
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
    console.log('FAIL', message);
    return;
  }
  ok(message);
}

function distance(ax, az, bx, bz) {
  var dx = bx - ax;
  var dz = bz - az;
  return Math.sqrt(dx * dx + dz * dz);
}

function sceneHasMarker(root, marker) {
  var i;
  if (!root) {
    return false;
  }
  if (root.userData && root.userData.marker === marker) {
    return true;
  }
  if (!root.children) {
    return false;
  }
  for (i = 0; i < root.children.length; i += 1) {
    if (sceneHasMarker(root.children[i], marker)) {
      return true;
    }
  }
  return false;
}

function createCanvasContext() {
  return new Proxy({
    measureText: function (text) {
      return {
        width: String(text || '').length * 8
      };
    },
    createLinearGradient: function () {
      return {
        addColorStop: function () {}
      };
    }
  }, {
    get: function (target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return function () {};
    },
    set: function (target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
}

function createCanvas() {
  var ctx2d = createCanvasContext();
  return {
    width: 1,
    height: 1,
    style: {},
    addEventListener: function () {},
    removeEventListener: function () {},
    getContext: function (type) {
      if (type === '2d') {
        return ctx2d;
      }
      return {};
    }
  };
}

function Vector2(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

Vector2.prototype.set = function (x, y) {
  this.x = x;
  this.y = y;
  return this;
};

function Vector3(x, y, z) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
}

Vector3.prototype.set = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

Vector3.prototype.clone = function () {
  return new Vector3(this.x, this.y, this.z);
};

Vector3.prototype.copy = function (other) {
  this.x = other.x;
  this.y = other.y;
  this.z = other.z;
  return this;
};

Vector3.prototype.subVectors = function (a, b) {
  this.x = a.x - b.x;
  this.y = a.y - b.y;
  this.z = a.z - b.z;
  return this;
};

Vector3.prototype.length = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

Vector3.prototype.normalize = function () {
  var len = this.length();
  if (len > 0.00001) {
    this.x /= len;
    this.y /= len;
    this.z /= len;
  }
  return this;
};

Vector3.prototype.addScaledVector = function (other, scale) {
  this.x += other.x * scale;
  this.y += other.y * scale;
  this.z += other.z * scale;
  return this;
};

Vector3.prototype.project = function () {
  this.x = Math.max(-1, Math.min(1, this.x / 8));
  this.y = Math.max(-1, Math.min(1, this.y / 8));
  return this;
};

function Quaternion() {}

Quaternion.prototype.setFromUnitVectors = function () {
  return this;
};

Quaternion.prototype.copy = function () {
  return this;
};

function Scale() {
  this.x = 1;
  this.y = 1;
  this.z = 1;
}

Scale.prototype.set = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

Scale.prototype.setScalar = function (value) {
  this.x = value;
  this.y = value;
  this.z = value;
  return this;
};

function Object3D() {
  this.children = [];
  this.position = new Vector3();
  this.rotation = { x: 0, y: 0, z: 0 };
  this.scale = new Scale();
  this.quaternion = new Quaternion();
  this.userData = {};
  this.visible = true;
}

Object3D.prototype.add = function () {
  var i;
  for (i = 0; i < arguments.length; i += 1) {
    this.children.push(arguments[i]);
  }
};

Object3D.prototype.remove = function (child) {
  var index = this.children.indexOf(child);
  if (index !== -1) {
    this.children.splice(index, 1);
  }
};

Object3D.prototype.localToWorld = function (vector) {
  return vector;
};

function Group() {
  Object3D.call(this);
}

Group.prototype = Object.create(Object3D.prototype);
Group.prototype.constructor = Group;

function Geometry() {}

Geometry.prototype.setFromPoints = function () {
  return this;
};

Geometry.prototype.dispose = function () {};

function Material(params) {
  params = params || {};
  Object.assign(this, params);
  this.color = {
    setHex: function () {}
  };
}

Material.prototype.clone = function () {
  return new Material(this);
};

function Mesh(geometry, material) {
  Object3D.call(this);
  this.geometry = geometry || new Geometry();
  this.material = material || new Material();
}

Mesh.prototype = Object.create(Object3D.prototype);
Mesh.prototype.constructor = Mesh;

function Line(geometry, material) {
  Mesh.call(this, geometry, material);
}

Line.prototype = Object.create(Mesh.prototype);
Line.prototype.constructor = Line;

function Camera() {
  Object3D.call(this);
  this.near = 0.1;
  this.far = 80;
}

Camera.prototype = Object.create(Object3D.prototype);
Camera.prototype.constructor = Camera;
Camera.prototype.lookAt = function () {};
Camera.prototype.updateProjectionMatrix = function () {};

function WebGLRenderer() {
  this.autoClear = true;
}

WebGLRenderer.prototype.setPixelRatio = function () {};
WebGLRenderer.prototype.setSize = function () {};
WebGLRenderer.prototype.setClearColor = function () {};
WebGLRenderer.prototype.setRenderTarget = function () {};
WebGLRenderer.prototype.clear = function () {};
WebGLRenderer.prototype.render = function () {};
WebGLRenderer.prototype.dispose = function () {};
WebGLRenderer.prototype.getContext = function () {
  return {
    VERSION: 'VERSION',
    getParameter: function () {
      return 'WebGL 1.0 mock';
    },
    getExtension: function () {
      return null;
    }
  };
};

function WebGLRenderTarget() {
  this.texture = {};
}

function Color(value) {
  this.value = value;
}

function Fog(color, near, far) {
  this.color = color;
  this.near = near;
  this.far = far;
}

function Raycaster() {}
Raycaster.prototype.setFromCamera = function () {};
Raycaster.prototype.intersectObjects = function () {
  return [];
};

function QuadraticBezierCurve3() {}

function makeGeometryCtor() {
  return function () {
    Geometry.call(this);
  };
}

var geometryNames = [
  'PlaneGeometry',
  'BoxGeometry',
  'CylinderGeometry',
  'ConeGeometry',
  'DodecahedronGeometry',
  'IcosahedronGeometry',
  'TorusGeometry',
  'TubeGeometry',
  'BufferGeometry'
];
var THREE = {
  REVISION: '162',
  Vector2: Vector2,
  Vector3: Vector3,
  Quaternion: Quaternion,
  Raycaster: Raycaster,
  WebGLRenderer: WebGLRenderer,
  WebGLRenderTarget: WebGLRenderTarget,
  DepthTexture: function () {},
  DepthFormat: 'DepthFormat',
  UnsignedShortType: 'UnsignedShortType',
  RGBAFormat: 'RGBAFormat',
  LinearFilter: 'LinearFilter',
  ACESFilmicToneMapping: 'ACESFilmicToneMapping',
  NoToneMapping: 'NoToneMapping',
  SRGBColorSpace: 'SRGBColorSpace',
  LinearSRGBColorSpace: 'LinearSRGBColorSpace',
  NoColorSpace: '',
  Scene: Group,
  Group: Group,
  Mesh: Mesh,
  Line: Line,
  PerspectiveCamera: Camera,
  OrthographicCamera: Camera,
  HemisphereLight: Group,
  DirectionalLight: Group,
  Fog: Fog,
  Color: Color,
  CanvasTexture: function () {},
  MeshLambertMaterial: Material,
  MeshPhongMaterial: Material,
  MeshBasicMaterial: Material,
  ShaderMaterial: Material,
  LineBasicMaterial: Material,
  QuadraticBezierCurve3: QuadraticBezierCurve3
};

geometryNames.forEach(function (name) {
  var Ctor = makeGeometryCtor();
  Ctor.prototype = Object.create(Geometry.prototype);
  Ctor.prototype.constructor = Ctor;
  THREE[name] = Ctor;
});

global.wx = {
  createCanvas: createCanvas,
  getStorageSync: function () {
    return '';
  },
  setStorageSync: function () {}
};
global.GameGlobal = {};

var threePath = require.resolve('../libs/three');
require.cache[threePath] = {
  id: threePath,
  filename: threePath,
  loaded: true,
  exports: THREE
};

var BadNorthRuntime = require('../src/minigame-runtime');
var threeScope = require('../src/three-scope');
var documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
try {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    get: function () {
      return {
        locked: true
      };
    }
  });
  threeScope.createScopedThreejs(createCanvas());
  assert(true, 'Scoped adapter tolerates read-only global document getter');
} finally {
  if (documentDescriptor) {
    Object.defineProperty(globalThis, 'document', documentDescriptor);
  } else {
    try {
      delete globalThis.document;
    } catch (error) {
      globalThis.document = undefined;
    }
  }
}
var reboundCanvas = createCanvas();
threeScope.createScopedThreejs(reboundCanvas);
assert(globalThis.document.createElementNS('', 'canvas') === reboundCanvas, 'Scoped adapter rebinds document shim to latest canvas');
var scopedCanvas = createCanvas();
var scopedTHREE = threeScope.createScopedThreejs(scopedCanvas);
assert(scopedTHREE.__wechatScopedDocument.createElementNS('', 'canvas') === scopedCanvas, 'Scoped adapter exposes canvas-bound document without relying on globals');
var runtime = new BadNorthRuntime({
  canvas: scopedCanvas,
  THREE: scopedTHREE,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {
    windowInfo: {
      windowWidth: 430,
      windowHeight: 932,
      pixelRatio: 1
    }
  }
});
var audioEvents = [];

function recordAudio(method) {
  var original = runtime.audio[method];
  assert(typeof original === 'function', 'Audio method exists: ' + method);
  runtime.audio[method] = function (value) {
    audioEvents.push(method + (value ? ':' + value : ''));
    return original.apply(runtime.audio, arguments);
  };
}

[
  'playCommand',
  'playWave',
  'playBoatLanding',
  'playEnemySpawn',
  'playAttack',
  'playImpact',
  'playSkill',
  'playEnemyAttack',
  'playEnemyDown',
  'playHouseHit',
  'playDeny',
  'playSelect'
].forEach(recordAudio);

function runUpdates(count, dt) {
  var i;
  for (i = 0; i < count; i += 1) {
    runtime.update(dt, i * dt);
  }
}

function getSquad(id) {
  return runtime.squads.filter(function (squad) {
    return squad.id === id;
  })[0];
}

function hasAudio(prefix) {
  return audioEvents.some(function (event) {
    return event.indexOf(prefix) === 0;
  });
}

assert(runtime.state === 'title', 'Runtime constructs and starts on title state');
assert(scopedTHREE === THREE && scopedTHREE.__wechatScopedCanvas === scopedCanvas, 'Runtime uses scoped Three adapter');
assert(runtime.postProcessEnabled === true, 'WeChat-like runtime attempts color-edge outline post-processing first');
assert(runtime.depthOutlineSupported === false, 'WeChat-like runtime keeps depth texture outline disabled');
assert(runtime.uiEnabled === true, 'UI overlay starts enabled');
assert(runtime.tiles.length > 30, 'Island tile data is built');
assert(runtime.ladderCount > 0, 'Height-transition ladders are generated on the terrain');
assert(runtime.ladderCount <= 7, 'Height-transition ladders are capped to a sparse readable set');
assert(runtime.terrainGroup.children.every(function (child) {
  if (!child.userData || child.userData.type !== 'ladder') {
    return true;
  }
  return runtime.isLadderClearOfHouses(runtime.tileLookup[child.userData.from], runtime.tileLookup[child.userData.to]);
}), 'Generated ladders avoid building footprints and visual overlap');
assert(runtime.seaMesh.position.y < -0.15 && runtime.hasStableSeaTerrainGap(), 'Sea surface stays below the lowest terrain to prevent color flicker');
assert(runtime.seaWaveGroup && runtime.seaWaveGroup.children.length >= 16, 'Animated sea wave line layer is initialized above the shader water plane');
assert(runtime.houses.length === 3, 'House defense objectives are initialized');
assert(runtime.houseMeshes.chapel.userData.hpMesh.visible === false, 'Building health bars are hidden by default at full health');
runtime.damageHouse(runtime.houses[0], 5);
runtime.syncSceneObjects(true);
assert(runtime.houseMeshes.chapel.userData.hpMesh.visible === true, 'Building health bar appears after structure damage changes HP');
runtime.elapsed = runtime.houses[0].healthVisibleUntil + 0.1;
runtime.syncSceneObjects(true);
assert(runtime.houseMeshes.chapel.userData.hpMesh.visible === false, 'Building health bar hides again after the damage visibility window');
runtime.houses[0].hp = runtime.houses[0].maxHp;
runtime.houses[0].healthVisibleUntil = 0;
assert(runtime.squads.length === 5, 'Five player squads are initialized');
assert(runtime.squadMeshes.archer.userData.soldiers[0].userData.detailLevel === 'refined-role', 'Friendly role meshes include refined anatomy and class equipment details');
assert(runtime.squadMeshes.monk.userData.soldiers[0].children.length > 14, 'Friendly monk mesh has layered robe, bead, limb, and ink details');
var defeatedArcher = getSquad('archer');
var defeatedPickPoint = runtime.worldToScreen(defeatedArcher.x, defeatedArcher.displayY + 0.35, defeatedArcher.z);
runtime.damageSquad(defeatedArcher, defeatedArcher.maxHp * 2);
runtime.syncSceneObjects(true);
assert(runtime.squadMeshes.archer.visible === false && runtime.squadMeshes.archer.userData.flag.visible === false, 'Defeated player squads reclaim their world flag instead of leaving it floating');
assert(runtime.pickSquadAt(defeatedPickPoint.x, defeatedPickPoint.y) !== defeatedArcher, 'Defeated hidden squads are not selected from the island scene');
defeatedArcher.hp = defeatedArcher.maxHp;
runtime.syncSceneObjects(true);
assert(runtime.squadMeshes.archer.visible === true && runtime.squadMeshes.archer.userData.flag.visible === true, 'Recovered player squads redeploy their world flag');
assert(runtime.rainGroup && runtime.rainGroup.children.length >= 60, 'Three.js rain layer is initialized for ink-wash atmosphere');
assert(runtime.mistGroup && runtime.mistGroup.children.length >= 4, 'Three.js coastal mist planes are initialized');

runtime.render();
var panBeforeDrag = runtime.targetViewPanX;
runtime.handleTouchStart({ touches: [{ clientX: 210, clientY: 420 }] });
runtime.handleTouchMove({ touches: [{ clientX: 285, clientY: 438 }] });
runtime.handleTouchEnd();
assert(runtime.targetViewPanX !== panBeforeDrag, 'Drag gesture pans the global island camera');
assert(runtime.gestureMode === 'idle', 'Drag gesture resets after touch end');
var zoomBeforePinch = runtime.targetCameraZoom;
runtime.handleTouchStart({ touches: [{ clientX: 180, clientY: 420 }, { clientX: 260, clientY: 420 }] });
runtime.handleTouchMove({ touches: [{ clientX: 150, clientY: 420 }, { clientX: 290, clientY: 420 }] });
runtime.handleTouchEnd();
assert(runtime.targetCameraZoom > zoomBeforePinch, 'Pinch gesture zooms in for character inspection');
runtime.targetWorldRotation = 0;
runtime.cameraQuarter = 0;
runtime.touchRects.rotateView = { x: 78, y: 24, width: 40, height: 40 };
runtime.handleTouchStart({ touches: [{ clientX: 88, clientY: 34 }] });
assert(runtime.rotateViewActive === true, 'Bottom rotate-view action starts continuous one-direction rotation while held');
runtime.update(0.25, runtime.elapsed + 0.25);
assert(runtime.targetWorldRotation > 0 && runtime.targetWorldRotation < Math.PI * 0.7, 'Held rotate-view action continuously advances the island view in one direction');
runtime.handleTouchEnd();
assert(runtime.rotateViewActive === false, 'Bottom rotate-view action stops continuous rotation when released');
runtime.targetWorldRotation = Math.PI;
runtime.targetViewPanX = 1.4;
runtime.targetViewPanZ = -1.2;
runtime.targetCameraZoom = 1.6;
runtime.touchRects.resetView = { x: 24, y: 24, width: 40, height: 40 };
runtime.handleTap(34, 34);
assert(runtime.targetWorldRotation === 0 && runtime.targetViewPanX === 0 && runtime.targetViewPanZ === 0 && runtime.targetCameraZoom < 1, 'Bottom reset-view action restores direction, pan, and zoom');
runtime.resetRun();
panBeforeDrag = runtime.targetViewPanX;
runtime.handleTouchStart({ touches: [{ clientX: 210, clientY: 420 }] });
runtime.handleTouchMove({ touches: [{ clientX: 300, clientY: 430 }] });
runtime.handleTouchEnd();
assert(runtime.targetViewPanX !== panBeforeDrag, 'Drag gesture pans camera during planning instead of issuing movement');
assert(runtime.state === 'planning', 'Reset enters planning phase');
assert(runtime.selectedSquadId === 'militia', 'Militia is the initial selected squad');
runtime.syncEnemyAttackPathPreviews();
assert(runtime.enemyPathGroup.children.length === 0, 'Planning phase does not render enemy building-attack route previews');

runtime.commandSelectedSquad({ x: 0, z: 1 });
var militia = getSquad('militia');
assert(militia.movePath && militia.movePath.length > 1, 'Squad command builds a tile path instead of direct-line movement');
assert(militia.movePath.every(function (node) {
  return !runtime.isHouseBlockingTile(node.x, node.z);
}), 'Squad path avoids building-blocked tiles');
runtime.syncPathPreview();
assert(runtime.pathGroup.children.length > 0, 'Selected squad command renders a visible movement path preview');
assert(runtime.pathGroup.children.some(function (child) {
  return child.userData && child.userData.routeKind === 'friendly-command';
}), 'Friendly route preview keeps command-route styling');
assert(runtime.pathGroup.children.some(function (child) {
  return child.userData && child.userData.marker === 'route-dash' && child.userData.terrain3D === true;
}), 'Friendly route preview uses terrain-following dashed 3D segments');
assert(!sceneHasMarker(runtime.pathGroup, 'route-dash-core'), 'Friendly route preview uses a single dash layer without duplicate core lines');
assert(!runtime.pathGroup.children.some(function (child) {
  return child.userData && child.userData.marker === 'route-chevron';
}), 'Friendly route preview does not use enemy warning chevrons');
assert(typeof runtime.drawRoutePreview === 'function' && typeof runtime.createRoutePreviewPoints === 'function', 'Friendly route preview uses the shared 3D route renderer');
assert(runtime.getRouteSegmentY({ y: 0 }, { y: 1 }, 0.5, { routeIndex: 0 }) > 0.5, 'Route preview height sampling follows 3D climb interpolation across height changes');
runUpdates(30, 0.05);
assert(Math.abs(getSquad('militia').targetX - 0) < 0.001 && Math.abs(getSquad('militia').targetZ - 1) < 0.001, 'Touch command target updates selected squad');

runtime.commandSelectedSquad(runtime.getTileAt(2, 0));
militia = getSquad('militia');
assert(militia.movePath.some(function (node, index, path) {
  return index > 0 && node.h !== path[index - 1].h;
}), 'Squad path can include controlled one-level height transitions');
var sawClimb = false;
for (var climbStep = 0; climbStep < 90; climbStep += 1) {
  runtime.update(0.05, runtime.elapsed + 0.05);
  if (militia.climbAmount > 0.08 && Math.abs(militia.climbDirection) === 1) {
    sawClimb = true;
  }
}
assert(sawClimb, 'Squad movement shows climb-up or climb-down interpolation across height changes');

runtime.commandSelectedSquad(runtime.getTileAt(2, -1));
militia = getSquad('militia');
assert(runtime.isHouseBlockingTile(2, -1), 'Hall tile is registered as a building obstacle');
assert(!runtime.isHouseBlockingTile(militia.targetX, militia.targetZ), 'Commands onto a building reroute to a reachable nearby tile');
assert(militia.movePath.every(function (node) {
  return !runtime.isHouseBlockingTile(node.x, node.z);
}), 'Rerouted building command keeps the full path outside blocked tiles');

runtime.startWave();
assert(runtime.state === 'combat', 'Starting a wave enters combat phase');
assert(runtime.boats.length > 0, 'Wave creates landing boats');
assert(hasAudio('playWave'), 'Wave start triggers synthesized wave SFX');
assert(runtime.hintText.indexOf('红色路线') === -1, 'Wave start hint does not reference removed red enemy route previews');
var firstBoat = runtime.boats[0];
var boatTravelDistance = Math.sqrt(Math.pow(firstBoat.fromX - firstBoat.toX, 2) + Math.pow(firstBoat.fromZ - firstBoat.toZ, 2));
assert(boatTravelDistance > 6, 'Enemy boats begin from distant sea before reaching the island shore');
assert(!runtime.getTileAt(firstBoat.toX, firstBoat.toZ), 'Enemy boat stop point stays on the water outside the island terrain');
assert(!!runtime.getTileAt(firstBoat.landingX, firstBoat.landingZ), 'Enemy deployment point is a land tile inside the island edge');
runUpdates(12, 0.05);
assert(runtime.effects.some(function (effect) {
  return effect.type === 'wake';
}), 'Moving enemy boats emit visible wake effects while approaching');
runtime.syncEnemyAttackPathPreviews();
assert(runtime.enemyPathGroup.children.length === 0, 'Combat phase does not render active enemy attack route warnings');
runUpdates(130, 0.05);
assert(runtime.enemies.length > 0, 'Landing boats deploy enemies');
assert(!runtime.getTileAt(firstBoat.x, firstBoat.z), 'Deployed boat remains at the shoreline water edge instead of moving onto land');
assert(hasAudio('playBoatLanding'), 'Boat landing triggers synthesized shoreline SFX');
assert(hasAudio('playEnemySpawn'), 'Enemy deployment triggers synthesized spawn SFX');

var enemy = runtime.enemies[0];
var enemyMesh = runtime.enemyMeshes[enemy.id] || runtime.createEnemyMesh(enemy);
var friendlyMesh = runtime.squadMeshes.militia.userData.soldiers[0];
assert(enemyMesh.userData.faction === 'enemy' && enemyMesh.userData.silhouette === 'hostile-angular', 'Enemy mesh uses a distinct hostile silhouette marker');
assert(friendlyMesh.userData.faction === 'friendly' && friendlyMesh.userData.silhouette === 'class-readable', 'Friendly soldier mesh keeps class-readable silhouette marker');
assert(enemyMesh.userData.detailLevel === 'refined-hostile', 'Enemy mesh uses refined hostile art detail marker');
assert(enemyMesh.children.length > 18, 'Enemy mesh has layered armor, limbs, marks, and hostile equipment details');
var enemyHouseRoute = runtime.buildActorPathNear(enemy, runtime.houses[1].x, runtime.houses[1].z);
assert(enemyHouseRoute && enemyHouseRoute.path.every(function (node) {
  return !runtime.isHouseBlockingTile(node.x, node.z);
}), 'Enemy house-approach path also avoids building-blocked tiles');
var explicitHouseRoute = runtime.findHouseAttackRoute(enemy, runtime.houses[1], '');
assert(explicitHouseRoute && runtime.isHouseAttackTile(explicitHouseRoute.destination, runtime.houses[1]), 'Enemy building attack route resolves to an explicit exterior attack tile');
assert(explicitHouseRoute.path.every(function (node) {
  return !runtime.isHouseBlockingTile(node.x, node.z);
}), 'Explicit enemy building attack route stays outside building-blocked tiles');
runtime.syncEnemyAttackPathPreviews();
assert(runtime.enemyPathGroup.children.length === 0, 'Deployed enemies keep attack route previews hidden');
assert(runtime.findEnemyTarget(enemy), 'Enemy movement AI still resolves targets without visual attack route previews');
var savedEnemiesForContact = runtime.enemies.slice();
var blockerStats = runtime.getEnemyStats('raider');
var routeBlockerEnemy = {
  id: 'enemy-route-blocker',
  type: 'raider',
  x: -5,
  z: 1,
  hp: blockerStats.hp,
  maxHp: blockerStats.hp,
  speed: blockerStats.speed,
  range: blockerStats.range,
  damage: blockerStats.damage,
  cooldownBase: blockerStats.cooldown,
  attackTimer: 0,
  movePath: [],
  pathIndex: 0,
  pathTargetKey: '',
  pathRefresh: 0,
  attackHouseId: '',
  attackTileKey: '',
  stuckTime: 0,
  displayY: runtime.getHeightAt(-5, 1),
  walkCycle: 0,
  climbAmount: 0,
  climbDirection: 0,
  isMoving: false,
  moveDirX: 0,
  moveDirZ: 1
};
var routeBlockingSquad = getSquad('militia');
var routeBlockingPlan = runtime.findBestHouseAttackRoute(routeBlockerEnemy);
assert(routeBlockingPlan && routeBlockingPlan.path.length > 2, 'Route-blocking contact test can build a house attack path');
if (routeBlockingPlan && routeBlockingPlan.path.length > 2) {
  runtime.assignActorPath(routeBlockerEnemy, routeBlockingPlan.path);
  routeBlockingSquad.hp = routeBlockingSquad.maxHp;
  routeBlockingSquad.attackTimer = 0;
  routeBlockingSquad.x = -3;
  routeBlockingSquad.z = 1;
  routeBlockingSquad.displayY = runtime.getHeightAt(routeBlockingSquad.x, routeBlockingSquad.z);
  runtime.enemies = [routeBlockerEnemy];
  assert(runtime.isSquadOnEnemyRoute(routeBlockerEnemy, routeBlockingSquad), 'Player squad can be detected as intercepting an enemy movement route');
  var routeBlockingTarget = runtime.findEnemyTarget(routeBlockerEnemy);
  assert(routeBlockingTarget && routeBlockingTarget.kind === 'squad', 'Enemy target selection switches to a squad that blocks its route');
  routeBlockerEnemy.movePath = [];
  routeBlockerEnemy.pathIndex = 0;
  routeBlockerEnemy.pathTargetKey = '';
  routeBlockerEnemy.attackHouseId = '';
  routeBlockerEnemy.attackTileKey = '';
  routeBlockingTarget = runtime.findEnemyTarget(routeBlockerEnemy);
  assert(routeBlockingTarget && routeBlockingTarget.kind === 'squad', 'Enemy target selection attacks a defending squad on the planned building route even before an active path exists');
  routeBlockingSquad.x = -2.4;
  routeBlockingSquad.z = 1.25;
  routeBlockingSquad.displayY = runtime.getHeightAt(routeBlockingSquad.x, routeBlockingSquad.z);
  routeBlockingTarget = runtime.findEnemyTarget(routeBlockerEnemy);
  assert(routeBlockingTarget && routeBlockingTarget.kind === 'squad', 'Enemy target selection attacks a player squad standing ahead of the building objective instead of routing around it');
  routeBlockerEnemy.x = routeBlockingSquad.x - 1.2;
  routeBlockerEnemy.z = routeBlockingSquad.z;
  routeBlockerEnemy.displayY = runtime.getHeightAt(routeBlockerEnemy.x, routeBlockerEnemy.z);
  routeBlockerEnemy.movePath = [];
  routeBlockerEnemy.pathIndex = 0;
  routeBlockerEnemy.pathRefresh = 0;
  var closeApproachStart = distance(routeBlockerEnemy.x, routeBlockerEnemy.z, routeBlockingSquad.x, routeBlockingSquad.z);
  runtime.updateEnemies(0.1);
  assert(distance(routeBlockerEnemy.x, routeBlockerEnemy.z, routeBlockingSquad.x, routeBlockingSquad.z) < closeApproachStart, 'Enemy uses close-contact approach movement instead of jittering on a degenerate squad path');
  routeBlockerEnemy.x = routeBlockingSquad.x - 0.62;
  routeBlockerEnemy.z = routeBlockingSquad.z;
  routeBlockerEnemy.displayY = runtime.getHeightAt(routeBlockerEnemy.x, routeBlockerEnemy.z);
  routeBlockerEnemy.attackTimer = 0;
  routeBlockingSquad.attackTimer = 0;
  var routeBlockingSquadHp = routeBlockingSquad.hp;
  var routeBlockerEnemyHp = routeBlockerEnemy.hp;
  var clashEffectCount = runtime.effects.filter(function (effect) {
    return effect.type === 'clash';
  }).length;
  runtime.updateEnemies(0.05);
  runtime.updateSquadCombat(0.05);
  assert(routeBlockingSquad.hp < routeBlockingSquadHp && routeBlockerEnemy.hp < routeBlockerEnemyHp, 'Enemy and player squad mutually attack when they meet at contact range');
  assert(runtime.effects.filter(function (effect) {
    return effect.type === 'clash';
  }).length > clashEffectCount, 'Contact combat creates visible melee clash effects');
  assert(routeBlockerEnemy.attackPulse > 0 && (routeBlockingSquad.hitPulse > 0 || routeBlockingSquad.attackPulse > 0), 'Enemy and player actors receive brawl animation pulses during contact combat');
  assert(routeBlockerEnemy.engagedSquadId === routeBlockingSquad.id && routeBlockingSquad.engagedEnemyId === routeBlockerEnemy.id, 'Melee contact locks enemies and player squads to the same combat opponent');
  var lockedTarget = runtime.findEnemyTarget(routeBlockerEnemy);
  assert(lockedTarget && lockedTarget.kind === 'squad' && lockedTarget.ref === routeBlockingSquad, 'Locked melee enemies keep fighting the contacted squad instead of switching targets');
  var holdX = routeBlockerEnemy.x;
  var holdZ = routeBlockerEnemy.z;
  routeBlockerEnemy.attackTimer = 0.4;
  runtime.updateEnemies(0.1);
  assert(distance(routeBlockerEnemy.x, routeBlockerEnemy.z, holdX, holdZ) < 0.001 && routeBlockerEnemy.movePath.length === 0, 'Melee-locked enemies hold position during cooldown rather than pathing back and forth');
  runtime.syncEffectMeshes();
  assert(runtime.effectGroup.children.some(function (child) {
    return child.userData && child.userData.type === 'clash';
  }), 'Melee clash effects are converted into visible Three.js effect meshes');
  routeBlockingSquad.hp = routeBlockingSquad.maxHp;
  runtime.enemies = savedEnemiesForContact;
}
var archer = getSquad('archer');
runtime.enemies = [enemy];
enemy.x = -4;
enemy.z = 0;
enemy.hp = enemy.maxHp;
enemy.displayY = runtime.getHeightAt(enemy.x, enemy.z);
enemy.movePath = [];
enemy.pathIndex = 0;
enemy.pathTargetKey = '';
enemy.pathRefresh = 0;
enemy.engagedSquadId = '';
enemy.engagementTimer = 0;
enemy.rangedAggroSquadId = '';
enemy.rangedAggroTimer = 0;
archer.x = -2;
archer.z = 0;
archer.displayY = runtime.getHeightAt(archer.x, archer.z);
archer.hp = archer.maxHp;
archer.attackTimer = 0;
runtime.projectiles = [];
runtime.updateSquadCombat(0.05);
assert(runtime.projectiles.length === runtime.getSquadVisibleCount(archer), 'Normal archer attack creates one arrow per visible archer');
assert(runtime.projectiles.some(function (projectile) {
  return Math.abs(projectile.x - archer.x) > 0.01 || Math.abs(projectile.z - archer.z) > 0.01;
}), 'Archer arrows originate from individual soldier formation positions instead of the squad center');
assert(runtime.projectiles.every(function (projectile) {
  return projectile.sourceSquadId === archer.id;
}), 'Ranged projectiles remember which squad fired them');
runtime.updateProjectiles(0.5);
assert(enemy.rangedAggroSquadId === archer.id && enemy.rangedAggroTimer > 0, 'Enemy hit by a ranged squad aggroes toward the shooter');
var archerAggroTarget = runtime.findEnemyTarget(enemy);
assert(archerAggroTarget && archerAggroTarget.kind === 'squad' && archerAggroTarget.ref === archer, 'Ranged-hit enemy target selection switches to the shooter squad');
var enemyDistanceToArcher = distance(enemy.x, enemy.z, archer.x, archer.z);
runtime.updateEnemies(0.18);
assert(distance(enemy.x, enemy.z, archer.x, archer.z) < enemyDistanceToArcher, 'Ranged-hit enemy moves forward to seek melee contact with the shooter');
runtime.projectiles = [];
archer.attackTimer = 0;
runtime.selectedSquadId = 'archer';
runtime.activateSkill(archer);
assert(runtime.projectiles.length >= runtime.getSquadVisibleCount(archer) * 3, 'Archer volley creates three arrow waves from every visible archer');
assert(hasAudio('playSkill:volley') && hasAudio('playAttack:arrow'), 'Archer volley triggers skill and arrow SFX');

var ranger = getSquad('ranger');
ranger.x = enemy.x + 0.3;
ranger.z = enemy.z + 0.4;
runtime.activateSkill(ranger);
assert(runtime.decoys.length === 1, 'Ranger false-light creates a decoy beacon');
assert(hasAudio('playSkill:decoy'), 'Ranger false-light triggers decoy SFX');

var monk = getSquad('monk');
monk.x = enemy.x + 0.2;
monk.z = enemy.z + 0.2;
runtime.activateSkill(monk);
assert(runtime.prisons.length === 1, 'Monk light-prison creates a control field');
assert(runtime.isEnemyTrapped(enemy), 'Enemy inside light-prison is treated as trapped');
assert(hasAudio('playSkill:prison'), 'Monk light-prison triggers control SFX');

var star = getSquad('star');
star.x = enemy.x + 0.4;
star.z = enemy.z + 0.4;
var hpBefore = enemy.hp;
runtime.activateSkill(star);
assert(enemy.hp < hpBefore, 'Star envoy starburst damages enemies in area');
assert(hasAudio('playSkill:starburst'), 'Star envoy starburst triggers AOE SFX');

enemy.hp = Math.max(enemy.hp, 12);
runtime.projectiles.push({
  targetId: enemy.id,
  damage: 1,
  kind: 'arrow',
  age: 0,
  delay: 0,
  life: 0.01
});
runtime.updateProjectiles(0.05);
runtime.cleanupCombat();
runtime.syncSceneObjects();
assert(hasAudio('playImpact:arrow'), 'Projectile impact triggers synthesized impact SFX');
assert(runtime.getAliveHouseCount() > 0, 'At least one house remains alive during simulated combat');
assert(runtime.projectileGroup.children.length >= 0 && runtime.effectGroup.children.length >= 0, 'Scene sync completes for projectiles and effects');

runtime.houses.forEach(function (house) {
  house.hp = house.maxHp;
});
runtime.squads.forEach(function (squad) {
  squad.hp = 0;
});
runtime.decoys = [];
runtime.prisons = [];
var probeStats = runtime.getEnemyStats('raider');
var pathingProbe = {
  id: 'enemy-pathing-probe',
  type: 'raider',
  x: -4.2,
  z: 1.4,
  hp: probeStats.hp,
  maxHp: probeStats.hp,
  speed: probeStats.speed,
  range: probeStats.range,
  damage: probeStats.damage,
  cooldownBase: probeStats.cooldown,
  attackTimer: 0,
  movePath: [],
  pathIndex: 0,
  pathTargetKey: '',
  pathRefresh: 0,
  attackHouseId: '',
  attackTileKey: '',
  stuckTime: 0,
  displayY: runtime.getHeightAt(-4.2, 1.4),
  walkCycle: 0,
  climbAmount: 0,
  climbDirection: 0,
  isMoving: false,
  moveDirX: 0,
  moveDirZ: 1
};
var isolatedPlan = runtime.findBestHouseAttackRoute(pathingProbe);
assert(isolatedPlan && runtime.isHouseAttackTile(isolatedPlan.destination, isolatedPlan.house), 'Isolated enemy can choose a reachable exterior building attack tile');
runtime.enemies = [pathingProbe];
for (var pathingStep = 0; pathingStep < 260; pathingStep += 1) {
  runtime.updateEnemies(0.05);
  if (runtime.houses.some(function (house) {
    return house.hp < house.maxHp;
  })) {
    break;
  }
}
assert(runtime.houses.some(function (house) {
  return house.hp < house.maxHp;
}), 'Enemy pathing reaches a building exterior and damages a target house without getting stuck');

if (failures.length) {
  console.log('');
  console.log('Runtime simulation failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('');
console.log('Runtime simulation passed.');
