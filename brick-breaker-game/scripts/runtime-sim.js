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
        bestScore: 3200,
        cannonLevel: 6,
        xp: 12,
        xpNeed: 80
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
assert(storedRuntime.cannonLevel === 1 && storedRuntime.getLaunchBallCount() === 1 && storedRuntime.xp === 0 && storedRuntime.xpNeed === 80 && storedRuntime.bestScore === 0, 'Stored progression does not affect a new run: it starts at Lv.1 with one white ball and empty experience');
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
assert(runtime.cannonLevel === 1, 'Default game starts with a Lv.1 cannon');
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
assert(normalCount > skillCount * 6, 'Default level is dominated by ordinary bricks with only a few skill bricks');
assert(skillCount === 5, 'Starter level includes one capped brick for each special power-up type');
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

assert(runtime.level === 1 && runtime.getBreakableCount() < 180 && runtime.getBreakableCount() > 100, 'New first default level is an easier intro stage with fewer breakable bricks');
assert(!brickAt(runtime, 5, 12) && !brickAt(runtime, 16, 12) && brickAt(runtime, 6, 5) && brickAt(runtime, 6, 5).wall && brickAt(runtime, 9, 14) && brickAt(runtime, 9, 14).wall, 'Intro level keeps wide open lanes with a few simple reflective wall shelves');
assert(runtime.getUnreachableBreakableCells(cellsFromRuntime(runtime)).length === 0, 'Intro level has no unreachable green or skill bricks');

function assertSkillDrops(testRuntime, prefix) {
  Object.keys(skillPowerByColor).forEach(function (colorKey) {
    var expectedType = skillPowerByColor[colorKey];
    var brick = testRuntime.bricks.filter(function (candidate) {
      return candidate.colorKey === colorKey && candidate.hp > 0;
    })[0];
    assert(!!brick, prefix + ' has a ' + colorKey + ' skill brick');
    testRuntime.hitBrick(brick, 999, true);
    assert(testRuntime.powerups.some(function (power) {
      return power.type === expectedType && Math.abs(power.x - brick.x) < 0.001 && Math.abs(power.y - brick.y) < 0.001;
    }), prefix + ' ' + colorKey + ' brick drops matching ' + expectedType + ' power-up');
  });
}

var defaultDropRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
defaultDropRuntime.init();
defaultDropRuntime.startRun(false);
assertSkillDrops(defaultDropRuntime, 'Default level');

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

var firstBrick = runtime.findNearestBrick(0, 3);
assert(!!firstBrick, 'Can find a target brick');
var aimDx = firstBrick.x - runtime.paddle.x;
var aimDy = firstBrick.y - (runtime.paddle.y + 0.25);
var aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);
var prediction = runtime.getAimPrediction({ x: aimDx / aimLen, y: aimDy / aimLen });
assert(prediction.hit && prediction.bounce && prediction.bounce.y < prediction.hit.y + 0.2, 'Aim prediction reaches a target and draws one reflected route segment');
var oldScore = runtime.score;
runtime.hitBrick(firstBrick, 999, true);
assert(runtime.score > oldScore, 'Destroying a brick awards score');
assert(runtime.xp > 0, 'Destroying a brick awards experience');
assert(runtime.runStats.bricks === 1 && runtime.runStats.xp > 0 && runtime.runStats.score === runtime.score, 'Run stats record destroyed bricks, experience, and score');
var wallBrick = runtime.bricks.filter(function (brick) {
  return brick.wall && brick.row > 0 && brick.col > 0 && brick.col < metrics.cols - 1 && brick.hp > 0;
})[0] || runtime.bricks.filter(function (brick) {
  return brick.wall && brick.hp > 0;
})[0];
var wallHp = wallBrick.hp;
var testBall = { x: wallBrick.x, y: wallBrick.y, vx: 1, vy: 0, r: metrics.brickWidth * 0.22, damage: 1 };
runtime.resolveBrickCollision(testBall);
assert(wallBrick.hp === wallHp && testBall.vx < 0, 'Gray wall bricks reflect balls without being removed');
var topWall = runtime.bricks.filter(function (brick) {
  return brick.wall && brick.row === 0 && brick.hp > 0;
})[Math.floor(metrics.cols / 2)];
var topWallHp = topWall.hp;
var escapedTopBall = {
  x: topWall.x,
  y: topWall.y + topWall.h,
  vx: 0,
  vy: 6,
  r: metrics.brickWidth * 0.22,
  damage: 1,
  age: 0,
  wallBounceCount: 0
};
runtime.resolveWallCollision(escapedTopBall);
assert(escapedTopBall.y + escapedTopBall.r <= metrics.playTop + 0.001 && escapedTopBall.vy < 0, 'Top wall physics clamps balls to the inside face instead of the outer board edge');
var penetratedTopBall = {
  prevX: topWall.x,
  prevY: topWall.y + topWall.h / 2 + metrics.brickWidth * 0.08,
  x: topWall.x,
  y: topWall.y + metrics.brickWidth * 0.22,
  vx: 0,
  vy: 6,
  r: metrics.brickWidth * 0.22,
  damage: 1,
  age: 0,
  wallBounceCount: 0
};
runtime.resolveBrickCollision(penetratedTopBall);
assert(topWall.hp === topWallHp && penetratedTopBall.y + penetratedTopBall.r <= metrics.playTop + 0.004 && penetratedTopBall.vy < 0, 'Penetration correction pushes top-wall balls back into the play area');
var internalWall = runtime.bricks.filter(function (brick) {
  return brick.wall && brick.row > 0 && brick.col > 0 && brick.col < metrics.cols - 1;
})[0] || wallBrick;
var savedHp = runtime.bricks.map(function (brick) {
  return brick.hp;
});
runtime.bricks.forEach(function (brick) {
  if (brick !== internalWall) {
    brick.hp = 0;
  }
});
var sweptBall = {
  prevX: internalWall.x - internalWall.w / 2 - metrics.brickWidth * 0.65,
  prevY: internalWall.y,
  x: internalWall.x + internalWall.w / 2 + metrics.brickWidth * 0.65,
  y: internalWall.y,
  vx: 8,
  vy: 0,
  r: metrics.brickWidth * 0.22,
  damage: 1,
  wallBounceCount: 0,
  stuckTimer: 0,
  age: 0
};
runtime.resolveBrickCollision(sweptBall);
assert(internalWall.hp === savedHp[runtime.bricks.indexOf(internalWall)] && sweptBall.vx < 0 && sweptBall.x < internalWall.x - internalWall.w / 2, 'Swept collision prevents fast balls from passing through gray wall bricks');
runtime.bricks.forEach(function (brick, index) {
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
for (var p = 0; p < 8; p += 1) {
  runtime.dropPowerup(0, 1 + p * 0.1, 'split');
}
assert(runtime.powerups.length <= 5, 'Active power-up count is capped to prevent early item floods');

runtime.powerups = [];
runtime.balls = [];
runtime.spawnBall({ x: 0, y: 1 });
var caughtHeavyBall = runtime.balls[0];
runtime.paddle.x = 0;
runtime.dropPowerup(0, runtime.paddle.y + 0.35, 'heavy');
runtime.updatePowerups(0.04);
assert(runtime.powerups.length === 0 && runtime.heavyTimer > 0, 'Falling power-up is caught by the paddle and applies its effect');
assert(caughtHeavyBall.heavy === true && caughtHeavyBall.damage > 1 && caughtHeavyBall.r > 0.047, 'Heavy power immediately upgrades active balls instead of only future shots');

var heavyWallRuntime = new Runtime({
  headless: true,
  width: 430,
  height: 932,
  pixelRatio: 1,
  runtimeInfo: {}
});
heavyWallRuntime.init();
heavyWallRuntime.startRun(false);
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
assert(timedHeavyBall.heavy === false && timedHeavyBall.r < timedHeavyRadius && timedHeavyBall.damage === heavyWallRuntime.ballDamage, 'Heavy power reverts active balls after the timer ends');

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

runtime.xp = runtime.xpNeed - 1;
var oldLevel = runtime.cannonLevel;
var oldLaunchCount = runtime.getLaunchBallCount();
runtime.addXp(1);
assert(runtime.cannonLevel === oldLevel + 1, 'Experience threshold automatically increases cannon level');
assert(runtime.getLaunchBallCount() > oldLaunchCount, 'Automatic upgrade grows the launch ball count');
runtime.startRun(false);
assert(runtime.cannonLevel === 1 && runtime.getLaunchBallCount() === 1 && runtime.xp === 0 && runtime.xpNeed === 80, 'Starting a new run resets cannon level, ball count, and experience');
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
assert(runtime.xp === 0 && runtime.cannonLevel === 1 && runtime.getLaunchBallCount() === 1, 'Game over resets growth data for the next run');
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
assert(runtime.runStats.completed === true && runtime.runStats.score === runtime.score, 'Level-clear settlement marks the level as completed and stores the score');
runtime.handleUiAction('restart');
assert(runtime.state === 'playing' && runtime.level === 2 && runtime.getBreakableCount() > 0, 'Next-level action starts the second default level');
assert(runtime.getBreakableCount() < 280, 'Second default level keeps the previous reference maze as the mid-stage');
assert(!brickAt(runtime, 3, 10) && !brickAt(runtime, 10, 4) && !brickAt(runtime, 18, 12) && !brickAt(runtime, 19, 20), 'Second default level carves the reference-style top, left, lower, and right corridor gaps');
assert(brickAt(runtime, 5, 10) && brickAt(runtime, 5, 10).wall && brickAt(runtime, 6, 6) && brickAt(runtime, 6, 6).wall && brickAt(runtime, 16, 14) && brickAt(runtime, 16, 14).wall && brickAt(runtime, 19, 12) && brickAt(runtime, 19, 12).wall, 'Second default level uses gray walls to outline the reference maze corridor');
assert(runtime.getUnreachableBreakableCells(cellsFromRuntime(runtime)).length === 0, 'Second default level has no unreachable green or skill bricks');
runtime.bricks.forEach(function (brick) {
  if (!brick.wall) {
    brick.hp = 0;
  }
});
runtime.readyToShoot = false;
runtime.balls = [];
runtime.pendingBalls = [];
runtime.checkVolleyFinished();
assert(runtime.state === 'completing', 'Clearing the second default level also starts completion slow motion');
finishCompletionSlowMo(runtime);
assert(runtime.state === 'levelclear', 'Second default level completion opens the final next-level prompt');
runtime.handleUiAction('restart');
assert(runtime.state === 'playing' && runtime.level === 3 && runtime.getBreakableCount() > 0, 'Next-level action starts the third default fish level');
assert(runtime.getBreakableCount() < 210, 'Third default fish level is lighter than a fully filled template');
assert(!brickAt(runtime, 10, 12) && !brickAt(runtime, 8, 6) && !brickAt(runtime, 21, 12) && brickAt(runtime, 10, 13) && brickAt(runtime, 10, 13).colorKey === 'crimson', 'Third default level carves a fish-shaped body and keeps a central skill brick');
assert(brickAt(runtime, 3, 6) && brickAt(runtime, 3, 6).colorKey === 'blue', 'Third default level keeps all planned skill bricks visible instead of hiding them behind walls');
assert(brickAt(runtime, 4, 11) && brickAt(runtime, 4, 11).wall && brickAt(runtime, 8, 5) && brickAt(runtime, 8, 5).wall && brickAt(runtime, 12, 21) && brickAt(runtime, 12, 21).wall, 'Third default level uses gray walls to outline the fish body and tail');
assert(!brickAt(runtime, 20, 12) && !brickAt(runtime, 21, 12) && !brickAt(runtime, 10, 7), 'Third default level keeps the fish body and lower exit open instead of sealing all routes with walls');
assert(runtime.hasLevelTwoOpenRoute(runtime.buildGeneratedLevelCells(3)), 'Third default level has a connected open route from the fish body to the lower exit');
var rawFishLevelCells = runtime.buildGeneratedLevelCells(3);
assert(runtime.getUnreachableBreakableCells(rawFishLevelCells).length === 0, 'Configured third-level fish template stores a playable map with no dead green regions');
var repairedFishLevelCells = runtime.cloneCells(rawFishLevelCells);
runtime.ensureDefaultOpenRoutes(3, repairedFishLevelCells);
assert(runtime.getUnreachableBreakableCells(repairedFishLevelCells).length === 0, 'Third default level repair makes every breakable brick reachable from the launch area');
assert(runtime.getUnreachableBreakableCells(cellsFromRuntime(runtime)).length === 0, 'Generated third default level contains no unreachable green or skill bricks');
var sealedFishLevel = runtime.buildGeneratedLevelCells(3);
sealedFishLevel[20][12] = 'wall';
sealedFishLevel[20][13] = 'wall';
sealedFishLevel[21][11] = 'wall';
sealedFishLevel[21][12] = 'wall';
sealedFishLevel[21][13] = 'wall';
sealedFishLevel[21][14] = 'wall';
assert(!runtime.hasLevelTwoOpenRoute(sealedFishLevel), 'Sealed third-level fish cells fail the open-route check before generation repair');
runtime.defaultDesigns['3'] = {
  cells: sealedFishLevel,
  version: 6,
  updatedAt: 1
};
runtime.generateLevel(3, false);
assert(runtime.hasLevelTwoOpenRoute(runtime.cloneCells(runtime.defaultDesigns['3'].cells)) === false && !brickAt(runtime, 21, 12) && !brickAt(runtime, 20, 12), 'Generation repairs a saved third level that accidentally seals the lower route');
assert(runtime.getUnreachableBreakableCells(cellsFromRuntime(runtime)).length === 0, 'Generation repairs saved third-level defaults so no dead green regions remain');
runtime.defaultDesigns = {};
clearCurrentLevel(runtime);
assert(runtime.state === 'completing', 'Clearing the third default level also starts completion slow motion');
finishCompletionSlowMo(runtime);
assert(runtime.state === 'levelclear', 'Third default level completion continues into advanced default levels');
var previousAdvancedWork = 0;
var advancedLevel;
var advancedBreakables;
var advancedHp;
for (advancedLevel = 4; advancedLevel <= 10; advancedLevel += 1) {
  runtime.handleUiAction('restart');
  assert(runtime.state === 'playing' && runtime.level === advancedLevel, 'Next-level action starts advanced default level ' + advancedLevel);
  assert(runtime.getUnreachableBreakableCells(cellsFromRuntime(runtime)).length === 0, 'Advanced default level ' + advancedLevel + ' has no unreachable green or skill bricks');
  advancedBreakables = runtime.bricks.filter(function (brick) {
    return !brick.wall && brick.hp > 0;
  });
  advancedHp = advancedBreakables.reduce(function (maxHp, brick) {
    return Math.max(maxHp, brick.hp);
  }, 0);
  assert(advancedBreakables.length >= 140 && advancedBreakables.length <= 230, 'Advanced default level ' + advancedLevel + ' keeps a readable dense brick field');
  assert(advancedBreakables.filter(function (brick) {
    return Object.prototype.hasOwnProperty.call(skillPowerByColor, brick.colorKey);
  }).length === 5, 'Advanced default level ' + advancedLevel + ' keeps one skill brick for each power-up');
  assert(advancedBreakables.length * advancedHp > previousAdvancedWork, 'Advanced default level ' + advancedLevel + ' increases total clear pressure over the previous advanced level');
  previousAdvancedWork = advancedBreakables.length * advancedHp;
  clearCurrentLevel(runtime);
  assert(runtime.state === 'completing', 'Clearing advanced default level ' + advancedLevel + ' starts completion slow motion');
  finishCompletionSlowMo(runtime);
  assert(runtime.state === (advancedLevel < 10 ? 'levelclear' : 'victory'), 'Advanced default level ' + advancedLevel + ' reaches the expected result state');
}
assert(runtime.state === 'victory' && runtime.bricks.length === 0, 'Final default level completion reaches the victory settlement');
assert(runtime.xp === 0 && runtime.cannonLevel === 1 && runtime.getLaunchBallCount() === 1, 'Victory resets growth data for the next run while settlement stats stay available');
assert(runtime.runStats.completed === true && runtime.runStats.score === runtime.score, 'Victory settlement marks the run as completed and stores the final score');
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
originalWx = global.wx;
global.wx = {
  setStorageSync: function (key, value) {
    if (key === 'brick_breaker_exported_default_level_v1') {
      storedDefaultConfig = value;
    }
  }
};
runtime.handleUiAction('exportDefault');
assert(storedDefaultConfig && storedDefaultConfig.level === 1 && storedDefaultConfig.snippet.indexOf('id: 1') !== -1 && storedDefaultConfig.snippet.indexOf("rows: [") !== -1 && storedDefaultConfig.snippet.indexOf('#########################') !== -1, 'Default editor can export the edited level as a readable config snippet for src/default-levels.js without clipboard permissions');
if (originalWx === undefined) {
  delete global.wx;
} else {
  global.wx = originalWx;
}
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
runtime.handleUiAction('clearLevel');
assert(runtime.editorMode === 'default' && runtime.editorDefaultLevel === 2, 'Default editor can switch to level two from the bottom controls');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['2'] && runtime.defaultDesigns['2'].cells, 'Default editor saves optimized level two');
runtime.handleUiAction('clearLevel');
assert(runtime.editorMode === 'default' && runtime.editorDefaultLevel === 3, 'Default editor can switch to level three from the bottom controls');
assert(runtime.getUnreachableBreakableCells(runtime.editorGrid).length === 0, 'Default editor shows the repaired third-level fish layout without dead green regions');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['3'] && runtime.defaultDesigns['3'].cells, 'Default editor saves optimized level three');
assert(runtime.getUnreachableBreakableCells(runtime.defaultDesigns['3'].cells).length === 0, 'Saved default third level keeps every breakable brick reachable');
while (runtime.editorDefaultLevel < 10) {
  runtime.handleUiAction('clearLevel');
}
assert(runtime.editorMode === 'default' && runtime.editorDefaultLevel === 10, 'Default editor can cycle forward to the tenth default level');
assert(runtime.getUnreachableBreakableCells(runtime.editorGrid).length === 0, 'Default editor shows the repaired tenth-level layout without dead green regions');
runtime.handleUiAction('saveLevel');
assert(runtime.defaultDesigns['10'] && runtime.defaultDesigns['10'].cells, 'Default editor saves optimized level ten');
runtime.generateLevel(1, false);
assert(runtime.getBreakableCount() === afterManualBreakables, 'Saved default level one is used by the normal default campaign generator');
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
assert(runtime.runStats.completed === false && runtime.runStats.score === runtime.score, 'Game-over settlement marks the run as failed and stores the final score');
assert(runtime.getSnapshot().score === runtime.score && runtime.getSnapshot().lives === 0 && runtime.getSnapshot().runStats === runtime.runStats, 'Snapshot exposes score, current lives, and settlement stats');

if (failures.length) {
  console.log('');
  console.log('Runtime simulation failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('');
console.log('Runtime simulation passed.');
