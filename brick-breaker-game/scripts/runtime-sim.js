'use strict';

var Runtime = require('../src/minigame-runtime');

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

function run(runtime, count, dt) {
  var i;
  for (i = 0; i < count; i += 1) {
    runtime.update(dt, runtime.elapsed + dt);
  }
}

function finishCompletionSlowMo(runtime) {
  run(runtime, 36, 0.035);
}

function clearCurrentLevel(runtime) {
  runtime.bricks.forEach(function (brick) {
    if (!brick.wall) {
      brick.hp = 0;
    }
  });
  runtime.readyToShoot = false;
  runtime.balls = [];
  runtime.pendingBalls = [];
  runtime.checkVolleyFinished();
}

function advanceToLevel(runtime, level) {
  while (runtime.level < level) {
    runtime.startNextLevel();
  }
}

function fakeGroup(count) {
  var group = {
    children: [],
    remove: function (child) {
      var index = this.children.indexOf(child);
      if (index >= 0) {
        this.children.splice(index, 1);
      }
    }
  };
  var i;
  for (i = 0; i < count; i += 1) {
    group.children.push({ id: 'child-' + i });
  }
  return group;
}

function touchEvent(x, y, timeStamp) {
  return {
    timeStamp: timeStamp,
    changedTouches: [
      {
        clientX: x,
        clientY: y
      }
    ]
  };
}

var originalWx = global.wx;
global.wx = {
  getStorageSync: function (key) {
    if (key === 'brick_breaker_save_v1') {
      return {
        legacyScore: 3200
      };
    }
    return '';
  },
  setStorageSync: function () {}
};
var storedRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
storedRuntime.init();
storedRuntime.startRun(false);
assert(storedRuntime.getLaunchBallCount() === 1 && typeof storedRuntime.score === 'undefined' && typeof storedRuntime.bestScore === 'undefined', 'Stored progression does not affect a new run: it starts with one white ball and no saved score growth');
if (originalWx === undefined) {
  delete global.wx;
} else {
  global.wx = originalWx;
}

var runtime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});

runtime.init();
assert(runtime.state === 'title', 'Runtime starts from title state');
assert(runtime.bricks.length > 0, 'Title preview builds a brick field');
assert(typeof runtime.shouldShowTopHud === 'undefined', 'Runtime no longer exposes a top HUD state gate');

runtime.startRun(false);
assert(runtime.state === 'playing', 'Start run enters playing state');
assert(runtime.readyToShoot === true, 'Run starts ready to shoot');
assert(runtime.getBreakableCount() > 0, 'Generated level contains breakable bricks');
assert(runtime.getLaunchBallCount() === 1, 'Default game starts with one white ball');
runtime.handleUiAction('help');
assert(runtime.state === 'help', 'Independent help screen opens instead of overlaying the play field legend');
runtime.handleUiAction('closeHelp');
assert(runtime.state === 'playing', 'Help screen returns to the current game state');
runtime.paddle.x = 0;
runtime.readyToShoot = true;
runtime.handleTouchStart(touchEvent(380, 720, 1000));
assert(Math.abs(runtime.paddle.x) < 0.0001, 'Touch start records drag state without snapping the paddle to the finger');
runtime.handleTouchCancel();
runtime.readyToShoot = false;
runtime.paddle.x = 0;
runtime.handleTouchStart(touchEvent(200, 720, 2000));
runtime.handleTouchMove(touchEvent(210, 720, 2032));
var slowDragDelta = runtime.paddle.x;
runtime.handleTouchCancel();
runtime.paddle.x = 0;
runtime.handleTouchStart(touchEvent(200, 720, 3000));
runtime.handleTouchMove(touchEvent(210, 720, 3008));
var fastDragDelta = runtime.paddle.x;
assert(slowDragDelta > runtime.screenDeltaToWorld(10) && fastDragDelta > slowDragDelta, 'Relative paddle drag amplifies movement and applies extra gain to faster swipes');
runtime.handleTouchCancel();
runtime.readyToShoot = true;
runtime.paddle.x = 0;
var metrics = runtime.getBoardMetrics();
assert(metrics.cols >= 23 && metrics.brickWidth < 0.24, 'Board uses many small aligned brick cells');
assert(metrics.boardWidth < metrics.viewWidth && runtime.bricks.every(function (brick) {
  return brick.x - brick.w / 2 >= metrics.boardLeft - 0.001 && brick.x + brick.w / 2 <= metrics.boardRight + 0.001;
}), 'Brick grid stays fully inside the visible board instead of clipping half cells');
var normalCount = runtime.bricks.filter(function (brick) {
  return brick.colorKey === 'green';
}).length;
var skillPowerByColor = {
  blue: 'split',
  gold: 'heavy',
  violet: 'shotgun',
  crimson: 'bomb',
  pink: 'laser'
};
var skillCount = runtime.bricks.filter(function (brick) {
  return Object.prototype.hasOwnProperty.call(skillPowerByColor, brick.colorKey);
}).length;
assert(skillCount >= normalCount * 5, 'First default level is dominated by split skill bricks instead of ordinary green bricks');
assert(skillCount >= 40 && runtime.bricks.every(function (brick) {
  return !Object.prototype.hasOwnProperty.call(skillPowerByColor, brick.colorKey) || brick.colorKey === 'blue';
}), 'Starter level focuses on many split skill bricks for the first tutorial');
function brickAt(testRuntime, row, col) {
  return testRuntime.bricks.filter(function (brick) {
    return brick.row === row && brick.col === col && brick.hp > 0;
  })[0] || null;
}

function cellsFromRuntime(testRuntime) {
  var rows = testRuntime.brickGrid.length;
  var cols = testRuntime.brickGrid[0] ? testRuntime.brickGrid[0].length : 0;
  var cells = [];
  var r;
  var c;
  var brick;
  for (r = 0; r < rows; r += 1) {
    cells[r] = [];
    for (c = 0; c < cols; c += 1) {
      brick = testRuntime.brickGrid[r][c];
      cells[r][c] = brick && brick.hp > 0 ? brick.colorKey : '';
    }
  }
  return cells;
}

assert(runtime.level === 1 && runtime.getBreakableCount() < 90 && runtime.getBreakableCount() > 55, 'New first default level is an easier split tutorial stage with fewer breakable bricks');
assert(brickAt(runtime, 1, 4) && brickAt(runtime, 1, 4).colorKey === 'blue' && brickAt(runtime, 11, 11) && brickAt(runtime, 11, 11).colorKey === 'blue' && normalCount <= 10, 'Intro level introduces split bricks as the main target with only a few green reference bricks');

function assertSkillDropForColor(testRuntime, prefix, colorKey) {
  var expectedType = skillPowerByColor[colorKey];
  var brick = testRuntime.bricks.filter(function (candidate) {
    return candidate.colorKey === colorKey && candidate.hp > 0;
  })[0];
  assert(!!brick, prefix + ' has a ' + colorKey + ' skill brick');
  testRuntime.hitBrick(brick, 999, true);
  assert(testRuntime.powerups.some(function (power) {
    return power.type === expectedType && Math.abs(power.x - brick.x) < 0.001 && Math.abs(power.y - brick.y) < 0.001;
  }), prefix + ' ' + colorKey + ' brick drops matching ' + expectedType + ' power-up');
}

function assertSkillDrops(testRuntime, prefix) {
  Object.keys(skillPowerByColor).forEach(function (colorKey) {
    assertSkillDropForColor(testRuntime, prefix, colorKey);
  });
}

var tutorialSkillPlan = [
  { level: 1, colorKey: 'blue', type: 'split' },
  { level: 2, colorKey: 'gold', type: 'heavy' },
  { level: 3, colorKey: 'violet', type: 'shotgun' },
  { level: 4, colorKey: 'crimson', type: 'bomb' },
  { level: 5, colorKey: 'pink', type: 'laser' }
];

function assertTutorialLevel(testRuntime, plan) {
  var breakables = testRuntime.bricks.filter(function (brick) {
    return !brick.wall && brick.hp > 0;
  });
  var skillBricks = breakables.filter(function (brick) {
    return Object.prototype.hasOwnProperty.call(skillPowerByColor, brick.colorKey);
  });
  assert(testRuntime.level === plan.level, 'Tutorial level ' + plan.level + ' is loaded');
  assert(breakables.length >= 50 && breakables.length <= 90, 'Tutorial level ' + plan.level + ' stays quick to clear');
  assert(skillBricks.length >= 40 && skillBricks.length >= breakables.length * 0.75 && skillBricks.every(function (brick) {
    return brick.colorKey === plan.colorKey;
  }), 'Tutorial level ' + plan.level + ' uses dense ' + plan.type + ' skill bricks as the primary teaching target and no other skill type');
}

var defaultDropRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
defaultDropRuntime.init();
tutorialSkillPlan.forEach(function (plan) {
  defaultDropRuntime.startRun(false);
  defaultDropRuntime.level = plan.level;
  defaultDropRuntime.generateLevel(plan.level, false);
  assertTutorialLevel(defaultDropRuntime, plan);
  assertSkillDropForColor(defaultDropRuntime, 'Default tutorial level ' + plan.level, plan.colorKey);
});

var customDropRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
customDropRuntime.init();
customDropRuntime.resetEditorGrid();
Object.keys(skillPowerByColor).forEach(function (colorKey, index) {
  customDropRuntime.editorGrid[2][2 + index * 4] = colorKey;
});
customDropRuntime.editorGrid[4][2] = 'green';
customDropRuntime.saveCustomLevel();
customDropRuntime.playCustomLevel();
assertSkillDrops(customDropRuntime, 'Custom level');

runtime.aimPoint = { x: 1.4, y: 0.5 };
runtime.aimActive = true;
var dir = runtime.getAimDirection();
runtime.fireSalvo(dir);
assert(runtime.pendingBalls.length === 1, 'First shot launches exactly one ball');
assert(runtime.runStats.shots === 1, 'Run stats count each fired volley for settlement');
run(runtime, 12, 0.05);
assert(runtime.balls.length > 0, 'Pending balls spawn into active balls');
assert(runtime.getRunDurationSeconds() >= 0 && Number.isInteger(runtime.getRunDurationSeconds()), 'Run timer reports whole-second active duration while playing');

var firstBrick = runtime.findNearestBrick(0, 3);
assert(!!firstBrick, 'Can find a target brick');
var aimDx = firstBrick.x - runtime.paddle.x;
var aimDy = firstBrick.y - (runtime.paddle.y + 0.25);
var aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);
var prediction = runtime.getAimPrediction({ x: aimDx / aimLen, y: aimDy / aimLen });
assert(prediction.hit && prediction.bounce && prediction.bounce.y < prediction.hit.y + 0.2, 'Aim prediction reaches a target and draws one reflected route segment');
var oldBricks = runtime.runStats.bricks;
runtime.hitBrick(firstBrick, 999, true);
assert(runtime.runStats.bricks === oldBricks + 1, 'Destroying a brick records the destroyed-brick count');
assert(typeof runtime.score === 'undefined' && typeof runtime.runStats.score === 'undefined', 'Run stats no longer store score');
var wallTestRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
wallTestRuntime.init();
wallTestRuntime.startRun(false);
wallTestRuntime.level = 2;
wallTestRuntime.generateLevel(2, false);
var wallMetrics = wallTestRuntime.getBoardMetrics();
var wallBrick = wallTestRuntime.bricks.filter(function (brick) {
  return brick.wall && brick.row > 0 && brick.col > 0 && brick.col < wallMetrics.cols - 1 && brick.hp > 0;
})[0] || wallTestRuntime.bricks.filter(function (brick) {
  return brick.wall && brick.hp > 0;
})[0];
var wallHp = wallBrick.hp;
var testBall = { x: wallBrick.x, y: wallBrick.y, vx: 1, vy: 0, r: wallMetrics.brickWidth * 0.22, damage: 1 };
wallTestRuntime.resolveBrickCollision(testBall);
assert(wallBrick.hp === wallHp && testBall.vx < 0, 'Gray wall bricks reflect balls without being removed');
var topWall = wallTestRuntime.bricks.filter(function (brick) {
  return brick.wall && brick.row === 0 && brick.hp > 0;
})[Math.floor(wallMetrics.cols / 2)];
var topWallHp = topWall.hp;
var escapedTopBall = {
  x: topWall.x,
  y: topWall.y + topWall.h,
  vx: 0,
  vy: 6,
  r: wallMetrics.brickWidth * 0.22,
  damage: 1,
  age: 0,
  wallBounceCount: 0
};
wallTestRuntime.resolveWallCollision(escapedTopBall);
assert(escapedTopBall.y + escapedTopBall.r <= wallMetrics.playTop + 0.001 && escapedTopBall.vy < 0, 'Top wall physics clamps balls to the inside face instead of the outer board edge');
var penetratedTopBall = {
  prevX: topWall.x,
  prevY: topWall.y + topWall.h / 2 + wallMetrics.brickWidth * 0.08,
  x: topWall.x,
  y: topWall.y + wallMetrics.brickWidth * 0.22,
  vx: 0,
  vy: 6,
  r: wallMetrics.brickWidth * 0.22,
  damage: 1,
  age: 0,
  wallBounceCount: 0
};
wallTestRuntime.resolveBrickCollision(penetratedTopBall);
assert(topWall.hp === topWallHp && penetratedTopBall.y + penetratedTopBall.r <= wallMetrics.playTop + 0.004 && penetratedTopBall.vy < 0, 'Penetration correction pushes top-wall balls back into the play area');
var internalWall = wallTestRuntime.bricks.filter(function (brick) {
  return brick.wall && brick.row > 0 && brick.col > 0 && brick.col < wallMetrics.cols - 1;
})[0] || wallBrick;
var savedHp = wallTestRuntime.bricks.map(function (brick) {
  return brick.hp;
});
wallTestRuntime.bricks.forEach(function (brick) {
  if (brick !== internalWall) {
    brick.hp = 0;
  }
});
var sweptBall = {
  prevX: internalWall.x - internalWall.w / 2 - wallMetrics.brickWidth * 0.65,
  prevY: internalWall.y,
  x: internalWall.x + internalWall.w / 2 + wallMetrics.brickWidth * 0.65,
  y: internalWall.y,
  vx: 8,
  vy: 0,
  r: wallMetrics.brickWidth * 0.22,
  damage: 1,
  wallBounceCount: 0,
  stuckTimer: 0,
  age: 0
};
wallTestRuntime.resolveBrickCollision(sweptBall);
assert(internalWall.hp === savedHp[wallTestRuntime.bricks.indexOf(internalWall)] && sweptBall.vx < 0 && sweptBall.x < internalWall.x - internalWall.w / 2, 'Swept collision prevents fast balls from passing through gray wall bricks');
wallTestRuntime.bricks.forEach(function (brick, index) {
  brick.hp = savedHp[index];
});
var stuckBall = {
  id: 'stuck',
  x: 0,
  y: 0,
  vx: 5,
  vy: 0,
  r: metrics.brickWidth * 0.22,
  damage: 1,
  age: 8,
  stuckTimer: 3.3,
  stuckAnchorX: 0,
  stuckAnchorY: 0,
  wallBounceCount: 20
};
runtime.balls = [stuckBall];
runtime.updateBallStuckState(stuckBall, 0.1);
assert(runtime.balls.length === 1 && stuckBall.vy < 0 && stuckBall.stuckTimer === 0, 'Stuck ball watchdog redirects balls without removing active balls from the playfield');
var agedBall = {
  id: 'aged',
  x: 0,
  y: 0,
  vx: 1.5,
  vy: 1.5,
  r: metrics.brickWidth * 0.22,
  damage: 1,
  age: 999,
  stuckTimer: 0,
  stuckAnchorX: -2,
  stuckAnchorY: -2,
  wallBounceCount: 0
};
runtime.balls = [agedBall];
runtime.updateBalls(0.02);
assert(runtime.balls.length === 1, 'Active balls do not disappear because of age or bounce count');
runtime.balls = [];
runtime.powerups = [];
runtime.queuedPowerups = [];
var normalBrick = runtime.bricks.filter(function (brick) {
  return brick.colorKey === 'green' && brick.hp > 0;
})[0];
runtime.hitBrick(normalBrick, 1, false);
assert(normalBrick.hp <= 0 && runtime.powerups.length === 0, 'Ordinary green bricks are removed without dropping power-ups');
var skillBrick = runtime.bricks.filter(function (brick) {
  return brick.colorKey === 'blue' && brick.hp > 0;
})[0] || runtime.bricks.filter(function (brick) {
  return brick.colorKey === 'gold' && brick.hp > 0;
})[0] || runtime.bricks.filter(function (brick) {
  return brick.colorKey === 'crimson' && brick.hp > 0;
})[0];
var powerupsBefore = runtime.powerups.length;
runtime.hitBrick(skillBrick, 1, false);
assert(skillBrick.hp <= 0 && runtime.powerups.length > powerupsBefore, 'Skill bricks are removed and drop power-ups on hit');
runtime.powerups = [];
runtime.queuedPowerups = [];
runtime.balls = [{ x: 0, y: 0, vx: 0, vy: 1, r: 0.05, damage: 1 }];
for (var p = 0; p < 8; p += 1) {
  runtime.dropPowerup(0, 1 + p * 0.1, 'split');
}
assert(runtime.powerups.length === 5 && runtime.queuedPowerups.length === 3, 'Active power-up count is capped and overflow drops are queued instead of removing visible items');
assert(runtime.powerups[0].y === 1, 'Overflow power-up queue does not cull the oldest visible falling item');
runtime.removePowerupAt(0);
runtime.releaseQueuedPowerups();
assert(runtime.powerups.length === 5 && runtime.queuedPowerups.length === 2, 'Queued power-ups enter the field after an active drop is collected or leaves the board');
runtime.balls = [];
runtime.pendingBalls = [];
runtime.readyToShoot = false;
runtime.checkVolleyFinished();
assert(runtime.readyToShoot === true && runtime.powerups.length === 0 && runtime.queuedPowerups.length === 0, 'Ending a volley clears active and queued power-ups before the next shot');

runtime.powerups = [];
runtime.queuedPowerups = [];
runtime.balls = [];
runtime.spawnBall({ x: 0, y: 1 });
var caughtHeavyBall = runtime.balls[0];
runtime.paddle.x = 0;
runtime.dropPowerup(0, runtime.paddle.y + 0.35, 'heavy');
runtime.updatePowerups(0.04);
assert(runtime.powerups.length === 0 && runtime.heavyTimer > 0, 'Falling power-up is caught by the paddle and applies its effect');
assert(caughtHeavyBall.heavy === true && caughtHeavyBall.damage > 1 && caughtHeavyBall.r > 0.047, 'Heavy power immediately strengthens active balls instead of only future shots');

var heavyWallRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
heavyWallRuntime.init();
heavyWallRuntime.startRun(false);
heavyWallRuntime.level = 2;
heavyWallRuntime.generateLevel(2, false);
var heavyMetrics = heavyWallRuntime.getBoardMetrics();
var crushWall = heavyWallRuntime.bricks.filter(function (brick) {
  return heavyWallRuntime.isBreakableWallBrick(brick) && brick.hp > 0;
})[0];
var protectedWall = heavyWallRuntime.bricks.filter(function (brick) {
  return brick.wall && brick.row === 0 && brick.hp > 0;
})[0];
heavyWallRuntime.bricks.forEach(function (brick) {
  if (brick !== crushWall && brick !== protectedWall) {
    brick.hp = 0;
  }
});
var heavyWallBall = {
  prevX: crushWall.x - crushWall.w / 2 - heavyMetrics.brickWidth * 0.65,
  prevY: crushWall.y,
  x: crushWall.x + crushWall.w / 2 + heavyMetrics.brickWidth * 0.65,
  y: crushWall.y,
  vx: 8,
  vy: 0,
  r: heavyMetrics.brickWidth * 0.22,
  damage: 2,
  heavy: true,
  wallBounceCount: 0,
  stuckTimer: 0,
  age: 0
};
heavyWallRuntime.resolveBrickCollision(heavyWallBall);
assert(crushWall.hp <= 0 && !heavyWallRuntime.brickGrid[crushWall.row][crushWall.col], 'Heavy power breaks internal gray wall bricks');
var protectedWallHp = protectedWall.hp;
heavyWallRuntime.hitBrick(protectedWall, 999, true);
assert(protectedWall.hp === protectedWallHp, 'Heavy power keeps perimeter walls indestructible so balls cannot leave the board');
heavyWallRuntime.balls = [];
heavyWallRuntime.heavyTimer = 7;
heavyWallRuntime.spawnBall({ x: 0, y: 1 });
var timedHeavyBall = heavyWallRuntime.balls[0];
var timedHeavyRadius = timedHeavyBall.r;
heavyWallRuntime.heavyTimer = 0;
heavyWallRuntime.updateHeavyBallState();
assert(timedHeavyBall.heavy === false && timedHeavyBall.r < timedHeavyRadius && timedHeavyBall.damage === 1, 'Heavy power reverts active balls after the timer ends');

var chainRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
chainRuntime.init();
chainRuntime.state = 'playing';
chainRuntime.bricks = [];
chainRuntime.powerups = [];
chainRuntime.queuedPowerups = [];
chainRuntime.addBrick(11, 21, 'blue', 1, false);
chainRuntime.addBrick(12, 21, 'gold', 1, false);
chainRuntime.addBrick(13, 21, 'violet', 1, false);
chainRuntime.addBrick(12, 23, 'green', 1, false);
chainRuntime.addBrick(12, 20, 'green', 1, false);
chainRuntime.addBrick(13, 20, 'green', 1, false);
chainRuntime.addBrick(15, 21, 'green', 1, false);
var adjacentBomb = brickAt(chainRuntime, 20, 12);
var diagonalBomb = brickAt(chainRuntime, 20, 13);
var justOutsideBomb = brickAt(chainRuntime, 21, 15);
chainRuntime.paddle.x = 0;
chainRuntime.triggerBomb();
assert(chainRuntime.powerups.length === 0, 'Bomb-cleared skill bricks do not spawn secondary power-up piles');
assert(adjacentBomb.hp <= 0, 'Bomb clears an orthogonally adjacent brick');
assert(diagonalBomb.hp > 0, 'Bomb no longer clears diagonal bricks');
assert(justOutsideBomb.hp > 0, 'Bomb range stays local and does not clear bricks several cells away');

var beforeSplit = runtime.balls.length;
runtime.splitBalls();
assert(runtime.balls.length >= beforeSplit, 'Split power increases or preserves active ball count');

runtime.heavyTimer = 0;
var powersBeforeCollect = runtime.runStats.powers;
runtime.collectPower('heavy');
assert(runtime.heavyTimer > 0, 'Heavy power enables timed stronger balls');
assert(runtime.runStats.powers === powersBeforeCollect + 1, 'Run stats count collected power-ups for settlement');

runtime.collectPower('shotgun');
assert(runtime.balls.length >= beforeSplit + 3, 'Shotgun power spawns extra balls');

runtime.triggerBomb();
assert(runtime.effects.length > 0, 'Bomb power creates a visual effect');

runtime.paddle.x = 0;
runtime.triggerLaser();
assert(runtime.message.indexOf('激光') !== -1, 'Laser power can be activated from the paddle');

runtime.startRun(false);
assert(runtime.getLaunchBallCount() === 1 && runtime.paddle.w === 1.45, 'Starting a new run resets to the one-ball initial state');
assert(runtime.lives === 3, 'Each run starts with exactly three lives');
var bgmPlayedOnStart = false;
var bgmStoppedOnResult = false;
runtime.audio.bgm = {
  play: function () {
    bgmPlayedOnStart = true;
  },
  stop: function () {
    bgmStoppedOnResult = true;
  }
};
runtime.audio.bgmPlaying = false;
runtime.startRun(false);
assert(bgmPlayedOnStart === true, 'Starting a run explicitly starts background music');
runtime.balls = [{ x: 0, y: 0, vx: 0, vy: 1, r: 0.05, damage: 1 }];
runtime.powerups = [{ x: 0, y: 0, type: 'split' }];
runtime.queuedPowerups = [{ x: 0, y: 0, type: 'heavy' }];
runtime.handleUiAction('endGame');
assert(runtime.state === 'title' && runtime.balls.length === 0 && runtime.powerups.length === 0 && runtime.queuedPowerups.length === 0, 'End-game action clears active gameplay and returns to the title screen');
assert(bgmStoppedOnResult === true, 'End-game action stops background music');
bgmStoppedOnResult = false;
runtime.audio.bgmPlaying = false;
runtime.startRun(false);

runtime.readyToShoot = false;
runtime.balls = [];
runtime.pendingBalls = [];
var oldBrickCount = runtime.bricks.length;
var oldRows = runtime.bricks.map(function (brick) {
  return brick.row;
});
runtime.checkVolleyFinished();
assert(runtime.readyToShoot === true && runtime.state === 'playing' && runtime.lives === 2, 'Missing a volley spends one life and returns to ready state instead of ending immediately');
assert(bgmStoppedOnResult === false, 'Background music continues while lives remain');
runtime.readyToShoot = false;
runtime.balls = [];
runtime.pendingBalls = [];
runtime.checkVolleyFinished();
assert(runtime.readyToShoot === true && runtime.state === 'playing' && runtime.lives === 1, 'Second missed volley spends the second life and keeps the map active');
runtime.readyToShoot = false;
runtime.balls = [];
runtime.pendingBalls = [];
runtime.checkVolleyFinished();
assert(runtime.readyToShoot === false && runtime.state === 'gameover' && runtime.lives === 0, 'Third missed volley ends the run when lives reach zero');
assert(runtime.getLaunchBallCount() === 1 && runtime.paddle.w === 1.45, 'Game over keeps the next run at the one-ball initial state');
assert(bgmStoppedOnResult === true, 'Game over stops background music before showing settlement');
assert(runtime.bricks.length === oldBrickCount && runtime.bricks.every(function (brick, index) {
  return brick.row === oldRows[index];
}), 'Losing a life no longer drops bricks or adds a new top row');
runtime.startRun(false);
bgmStoppedOnResult = false;
runtime.bricks.forEach(function (brick) {
  if (!brick.wall) {
    brick.hp = 0;
  }
});
runtime.readyToShoot = false;
runtime.balls = [];
runtime.pendingBalls = [];
runtime.checkVolleyFinished();
assert(runtime.state === 'completing' && runtime.message.indexOf('关卡完成') !== -1, 'Clearing all removable bricks enters a short completion slow-motion prompt');
assert(runtime.bricks.length === oldBrickCount, 'Completion slow motion keeps the playfield visible before settlement');
assert(bgmStoppedOnResult === false, 'Completion slow motion keeps background music until settlement');
finishCompletionSlowMo(runtime);
assert(runtime.state === 'levelclear', 'First default level completion opens the next-level settlement state');
assert(runtime.bricks.length === 0, 'Level transition clears the completed playfield so no new green row remains visible');
assert(bgmStoppedOnResult === true, 'Level completion stops background music before the next-level prompt');
assert(runtime.runStats.completed === true && Number.isInteger(runtime.runStats.durationSeconds), 'Level-clear settlement marks the level as completed and stores whole-second duration');
runtime.handleUiAction('restart');
assert(runtime.state === 'playing' && runtime.level === 2 && runtime.getBreakableCount() > 0, 'Next-level action starts the second default level');
assert(runtime.readyToShoot === true && runtime.getLaunchBallCount() === 1 && runtime.paddle.w === 1.45, 'Each next level starts from the initial one-ball state');
for (var tutorialIndex = 1; tutorialIndex < tutorialSkillPlan.length; tutorialIndex += 1) {
  assertTutorialLevel(runtime, tutorialSkillPlan[tutorialIndex]);
  clearCurrentLevel(runtime);
  assert(runtime.state === 'completing', 'Clearing tutorial level ' + runtime.level + ' starts completion slow motion');
  finishCompletionSlowMo(runtime);
  assert(runtime.state === 'levelclear', 'Tutorial level ' + tutorialSkillPlan[tutorialIndex].level + ' completion opens the next-level prompt');
  if (tutorialIndex < tutorialSkillPlan.length - 1) {
    runtime.handleUiAction('restart');
    assert(runtime.state === 'playing' && runtime.level === tutorialSkillPlan[tutorialIndex + 1].level, 'Next-level action starts tutorial level ' + tutorialSkillPlan[tutorialIndex + 1].level);
  }
}
var advancedLevel;
var advancedBreakables;
var advancedHp;
for (advancedLevel = 6; advancedLevel <= 10; advancedLevel += 1) {
  runtime.handleUiAction('restart');
  assert(runtime.state === 'playing' && runtime.level === advancedLevel, 'Next-level action starts advanced default level ' + advancedLevel);
  if (advancedLevel === 10) {
    assert(runtime.audio.bgmSrc === 'assets/audio/level-10-bgm.mp3', 'Advanced default level 10 switches to its dedicated background music track');
  }
  advancedBreakables = runtime.bricks.filter(function (brick) {
    return !brick.wall && brick.hp > 0;
  });
  advancedHp = advancedBreakables.reduce(function (maxHp, brick) {
    return Math.max(maxHp, brick.hp);
  }, 0);
  assert(advancedBreakables.length >= 140 && advancedBreakables.length <= 230, 'Advanced default level ' + advancedLevel + ' keeps a readable dense brick field');
  var advancedSkillTypes = Object.keys(skillPowerByColor).filter(function (colorKey) {
    return advancedBreakables.some(function (brick) {
      return brick.colorKey === colorKey;
    });
  });
  assert(advancedSkillTypes.length >= 3, 'Advanced default level ' + advancedLevel + ' keeps a mixed power-up set available');
  assert(advancedBreakables.length * advancedHp >= 400, 'Advanced default level ' + advancedLevel + ' keeps substantial clear pressure for an advanced stage');
  clearCurrentLevel(runtime);
  assert(runtime.state === 'completing', 'Clearing advanced default level ' + advancedLevel + ' starts completion slow motion');
  finishCompletionSlowMo(runtime);
  assert(runtime.state === (advancedLevel < 10 ? 'levelclear' : 'victory'), 'Advanced default level ' + advancedLevel + ' reaches the expected result state');
}
assert(runtime.state === 'victory' && runtime.bricks.length === 0, 'Final default level completion reaches the victory settlement');
assert(runtime.getLaunchBallCount() === 1 && runtime.paddle.w === 1.45, 'Victory keeps the next run at the one-ball initial state while settlement stats stay available');
assert(runtime.runStats.completed === true && Number.isInteger(runtime.runStats.durationSeconds), 'Victory settlement marks the run as completed and stores whole-second duration');
runtime.handleUiAction('restart');
assert(runtime.state === 'playing' && runtime.level === 1 && runtime.getBreakableCount() > 0, 'Restart after final victory starts the default campaign from level one');
advanceToLevel(runtime, 10);
var finalBreakables = runtime.bricks.filter(function (brick) {
  return !brick.wall && brick.hp > 0;
});
finalBreakables.slice(0, -1).forEach(function (brick) {
  brick.hp = 0;
});
runtime.hitBrick(finalBreakables[finalBreakables.length - 1], 999, true);
assert(runtime.state === 'completing' && runtime.message.indexOf('关卡完成') !== -1, 'Destroying the final removable brick starts the completion slow-motion beat');
assert(finalBreakables[finalBreakables.length - 1].finalClear === true && runtime.bricks.indexOf(finalBreakables[finalBreakables.length - 1]) !== -1, 'The final brick stays visible as a marked slow-motion clear target before settlement');
assert(runtime.balls.length === 0 && runtime.powerups.length === 0, 'Completion slow motion clears active balls and falling power-ups but keeps the board visible');
finishCompletionSlowMo(runtime);
assert(runtime.state === 'victory' && runtime.bricks.length === 0, 'Final-brick completion clears residual wall and top-row bricks after slow motion');
runtime.handleUiAction('restart');
advanceToLevel(runtime, 10);
finalBreakables = runtime.bricks.filter(function (brick) {
  return !brick.wall && brick.hp > 0;
});
finalBreakables.slice(0, -1).forEach(function (brick) {
  brick.hp = 0;
  runtime.clearBrickFromGrid(brick);
});
var finalTarget = finalBreakables[finalBreakables.length - 1];
runtime.readyToShoot = false;
runtime.pendingBalls = [];
runtime.balls = [
  { x: 0, y: -2, vx: 1, vy: 1, r: metrics.brickWidth * 0.22, damage: 1, heavy: false, age: 0, wallBounceCount: 0, stuckTimer: 0 },
  { x: finalTarget.x, y: finalTarget.y, vx: 0, vy: 0, r: metrics.brickWidth * 0.22, damage: 999, heavy: false, age: 0, wallBounceCount: 0, stuckTimer: 0 }
];
runtime.updateBalls(0.016);
assert(runtime.state === 'completing' && runtime.balls.length === 0, 'Final-brick slow motion exits the active multi-ball update loop without touching cleared balls');
assert(finalTarget.finalClear === true && runtime.bricks.indexOf(finalTarget) !== -1, 'Ball collision keeps the final cleared brick available for the slow-motion disappearance animation');
finishCompletionSlowMo(runtime);
assert(runtime.state === 'victory', 'Final-brick slow motion from ball collision reaches victory settlement');

runtime.handleUiAction('restart');
advanceToLevel(runtime, 10);
finalBreakables = runtime.bricks.filter(function (brick) {
  return !brick.wall && brick.hp > 0;
});
finalBreakables.slice(0, -1).forEach(function (brick) {
  brick.hp = 0;
  runtime.clearBrickFromGrid(brick);
});
finalTarget = finalBreakables[finalBreakables.length - 1];
runtime.paddle.x = finalTarget.x;
runtime.readyToShoot = false;
runtime.balls = [];
runtime.pendingBalls = [];
runtime.powerups = [
  { id: 'power-stale', x: runtime.paddle.x, y: runtime.paddle.y + 0.2, prevY: runtime.paddle.y + 0.5, type: 'bomb', age: 0, mesh: null },
  { id: 'power-final', x: runtime.paddle.x, y: runtime.paddle.y + 0.2, prevY: runtime.paddle.y + 0.5, type: 'laser', age: 0, mesh: null }
];
runtime.updatePowerups(0.016);
assert(runtime.state === 'completing' && runtime.powerups.length === 0, 'Power-up collection that clears the final brick exits the drop loop safely');
finishCompletionSlowMo(runtime);
assert(runtime.state === 'victory', 'Final-brick slow motion from power-up collection reaches victory settlement');

runtime.enterEditor();
assert(runtime.state === 'editor', 'Editor state opens');
runtime.handleUiAction('title');
assert(runtime.state === 'title', 'Editor return-home action cancels editing and returns to the title screen');
runtime.enterEditor();
runtime.editorTool = 'crimson';
runtime.handleEditorPoint({ x: runtime.worldToScreen(0, 2).x, y: runtime.worldToScreen(0, 2).y });
assert(runtime.editorGrid.some(function (row) {
  return row.indexOf('crimson') !== -1;
}), 'Editor places colored bricks');
runtime.saveCustomLevel();
assert(runtime.customDesign && runtime.customDesign.cells, 'Editor saves custom level data');
runtime.playCustomLevel();
assert(runtime.state === 'playing' && runtime.bricks.length > 0, 'Saved custom level can be played');
runtime.handleUiAction('title');
runtime.handleUiAction('editDefault');
assert(runtime.state === 'editor' && runtime.editorMode === 'default' && runtime.editorDefaultLevel === 1, 'Default level editor opens level one in the shared editor');
var storedDefaultConfig = null;
var originalDefaultEditorGrid = runtime.cloneCells(runtime.editorGrid);
runtime.editorGrid = runtime.createEmptyCells();
runtime.editorGrid[0][0] = 'wall';
runtime.editorGrid[5][5] = 'green';
runtime.editorGrid[4][5] = 'wall';
runtime.editorGrid[6][5] = 'wall';
runtime.editorGrid[5][4] = 'wall';
runtime.editorGrid[5][6] = 'wall';
runtime.editorGridToBricks();
var exactEditorRowsBeforeExport = runtime.defaultLevelCellsToRows(runtime.editorGrid).join('\n');
originalWx = global.wx;
global.wx = {
  setStorageSync: function (key, value) {
    if (key === 'brick_breaker_exported_default_level_v1') {
      storedDefaultConfig = value;
    }
  }
};
runtime.handleUiAction('exportDefault');
assert(storedDefaultConfig && storedDefaultConfig.level === 1 && storedDefaultConfig.snippet === runtime.buildDefaultLevelConfigSnippet(1, runtime.editorGrid) && runtime.defaultLevelCellsToRows(runtime.editorGrid).join('\n') === exactEditorRowsBeforeExport, 'Default editor exports the exact visible grid without hidden route repair or rule conversion');
if (originalWx === undefined) {
  delete global.wx;
} else {
  global.wx = originalWx;
}
runtime.editorGrid = originalDefaultEditorGrid;
runtime.editorGridToBricks();
var beforeDefaultBreakables = runtime.editorGrid.reduce(function (sum, row) {
  return sum + row.filter(function (cell) {
    return cell && cell !== 'wall';
  }).length;
}, 0);
var editableCell = null;
var editorMetrics = runtime.getBoardMetrics();
var editorBoardTop = editorMetrics.playTop + editorMetrics.brickHeight;
runtime.editorGrid.some(function (row, rowIndex) {
  return row.some(function (cell, colIndex) {
    if (cell === 'green') {
      editableCell = { row: rowIndex, col: colIndex };
      return true;
    }
    return false;
  });
});
assert(!!editableCell, 'Default level editor exposes ordinary bricks for manual editing');
runtime.editorTool = 'erase';
runtime.handleEditorPoint(runtime.worldToScreen(
  editorMetrics.boardLeft + editorMetrics.brickWidth * (editableCell.col + 0.5),
  editorBoardTop - editorMetrics.brickHeight * (editableCell.row + 0.5)
));
var afterManualBreakables = runtime.editorGrid.reduce(function (sum, row) {
  return sum + row.filter(function (cell) {
    return cell && cell !== 'wall';
  }).length;
}, 0);
assert(afterManualBreakables === beforeDefaultBreakables - 1, 'Default editor supports manual removal of ordinary bricks under user control');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['1'] && runtime.defaultDesigns['1'].cells, 'Default editor saves optimized level one');
assert(runtime.defaultDesigns['1'].templateSignature === runtime.getDefaultLevelTemplateSignature(1), 'Saved default level records the source config signature');
runtime.handleUiAction('clearLevel');
assert(runtime.editorMode === 'default' && runtime.editorDefaultLevel === 2, 'Default editor can switch to level two from the bottom controls');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['2'] && runtime.defaultDesigns['2'].cells, 'Default editor saves optimized level two');
runtime.handleUiAction('clearLevel');
assert(runtime.editorMode === 'default' && runtime.editorDefaultLevel === 3, 'Default editor can switch to level three from the bottom controls');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['3'] && runtime.defaultDesigns['3'].cells, 'Default editor saves optimized level three');
while (runtime.editorDefaultLevel < 10) {
  runtime.handleUiAction('clearLevel');
}
assert(runtime.editorMode === 'default' && runtime.editorDefaultLevel === 10, 'Default editor can cycle forward to the tenth default level');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['10'] && runtime.defaultDesigns['10'].cells, 'Default editor saves optimized level ten');
runtime.generateLevel(1, false);
assert(runtime.getBreakableCount() === afterManualBreakables, 'Saved default level one is used by the normal default campaign generator');
runtime.defaultDesigns['1'].templateSignature = 'stale-config-signature';
runtime.generateLevel(1, false);
assert(runtime.getBreakableCount() === beforeDefaultBreakables, 'Editing src/default-levels.js invalidates stale saved default level cache');
runtime.defaultDesigns['1'].templateSignature = runtime.getDefaultLevelTemplateSignature(1);
runtime.generateLevel(1, false);
assert(runtime.getBreakableCount() === afterManualBreakables, 'Matching saved default level cache is still used after signature validation');
runtime.handleUiAction('playCustom');
assert(runtime.state === 'playing' && runtime.currentRunCustom === false && runtime.level === 10, 'Default editor can directly test the currently edited default level');

runtime.ballGroup = fakeGroup(2);
runtime.powerGroup = fakeGroup(3);
runtime.effectGroup = fakeGroup(1);
runtime.balls = [{ mesh: runtime.ballGroup.children[0] }];
runtime.powerups = [{ mesh: runtime.powerGroup.children[0] }];
runtime.effects = [{ mesh: runtime.effectGroup.children[0] }];
runtime.finishGame(false);
assert(runtime.state === 'gameover', 'Game over state is reachable');
assert(runtime.ballGroup.children.length === 0 && runtime.powerGroup.children.length === 0 && runtime.effectGroup.children.length === 0, 'Game-over cleanup removes lingering ball, power-up, and effect meshes');
assert(runtime.runStats.completed === false && Number.isInteger(runtime.runStats.durationSeconds), 'Game-over settlement marks the run as failed and stores whole-second duration');
assert(typeof runtime.getSnapshot().score === 'undefined' && Number.isInteger(runtime.getSnapshot().durationSeconds) && runtime.getSnapshot().lives === 0 && runtime.getSnapshot().runStats === runtime.runStats, 'Snapshot exposes duration, current lives, and settlement stats');

if (failures.length) {
  console.log('');
  console.log('Runtime simulation failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('');
console.log('Runtime simulation passed.');
