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
chainRuntime.paddle.x = 0;
chainRuntime.triggerBomb();
assert(chainRuntime.powerups.length === 0, 'Bomb-cleared skill bricks do not spawn secondary power-up piles');

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
assert(runtime.state === 'victory', 'Completion slow motion finishes on the settlement screen');
assert(runtime.bricks.length === 0, 'Completion result clears the playfield so no new green row remains visible');
assert(runtime.xp === 0 && runtime.cannonLevel === 1 && runtime.getLaunchBallCount() === 1, 'Victory resets growth data for the next run while settlement stats stay available');
assert(bgmStoppedOnResult === true, 'Victory completion also stops background music on the settlement screen');
assert(runtime.runStats.completed === true && runtime.runStats.score === runtime.score, 'Victory settlement marks the run as completed and stores the final score');
runtime.handleUiAction('restart');
assert(runtime.state === 'playing' && runtime.level === 1 && runtime.getBreakableCount() > 0, 'Restart replays the same default map instead of advancing to another level');
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
