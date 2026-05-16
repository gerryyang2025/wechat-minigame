'use strict';

var fs = require('fs');
var path = require('path');

var rootDir = path.resolve(__dirname, '..');
var runtimeSource = fs.readFileSync(path.join(rootDir, 'src/minigame-runtime.js'), 'utf8');
var appSource = fs.readFileSync(path.join(rootDir, 'src/minigame-app.js'), 'utf8');
var audioSource = fs.readFileSync(path.join(rootDir, 'src/audio.js'), 'utf8');
var gameMetaSource = fs.readFileSync(path.join(rootDir, 'src/game-meta.js'), 'utf8');
var threeScopeSource = fs.readFileSync(path.join(rootDir, 'src/three-scope.js'), 'utf8');
var readmeSource = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
var projectConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'project.config.json'), 'utf8'));
var gameConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'game.json'), 'utf8'));
var bgmPath = path.join(rootDir, 'assets/audio/bgm.mp3');
var bgmSize = fs.existsSync(bgmPath) ? fs.statSync(bgmPath).size : 0;
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

function contains(source, text) {
  return source.indexOf(text) !== -1;
}

var threeScope = require('../src/three-scope');
var THREE = threeScope.createScopedThreejs({
  width: 1,
  height: 1,
  getContext: function () {
    return {};
  }
});
require('../src/minigame-runtime');
require('../src/minigame-app');
require('../src/audio');

assert(THREE.REVISION === '162', 'Three.js r162 local module loads through scoped adapter');
assert(projectConfig.compileType === 'game', 'project.config.json uses WeChat game compile type');
assert(gameConfig.deviceOrientation === 'portrait', 'game.json keeps portrait orientation');
assert(contains(appSource, 'createScopedThreejs') && contains(threeScopeSource, 'safeInstallProperty') && contains(threeScopeSource, 'createElementNS'), 'App uses WeChat scoped Three.js adapter');
assert(contains(appSource, 'onShareAppMessage') && contains(appSource, 'onShareTimeline') && contains(gameMetaSource, '方块破坏王 自定义地图，设计自己的玩法') && contains(gameMetaSource, "query: 'from=share'") && !contains(gameMetaSource, '得分') && !contains(gameMetaSource, 'level='), 'Share card uses the custom-map summary instead of score or level text');
assert(contains(runtimeSource, 'WebGLRenderer') && contains(runtimeSource, 'OrthographicCamera') && contains(runtimeSource, 'CanvasTexture'), 'Runtime renders gameplay and UI with Three.js');
assert(!contains(runtimeSource, 'shouldShowTopHud') && !contains(runtimeSource, 'drawTopHud') && !contains(runtimeSource, 'drawChip') && contains(runtimeSource, "'#fff159'") && !contains(runtimeSource, 'dangerLine'), 'Title and gameplay screens remove the old top HUD and keep the clearer comic title layout');
assert(!contains(runtimeSource, 'coins') && !contains(readmeSource, '金币'), 'Coin storage, rewards, HUD, and documentation are removed');
assert(contains(runtimeSource, "'自定义关卡'") && contains(runtimeSource, "'体验默认关卡'") && !contains(runtimeSource, "'开始闯关'"), 'Title screen makes custom levels the primary flow and avoids challenge-mode wording');
assert(contains(runtimeSource, 'fireSalvo') && contains(runtimeSource, 'aimActive') && contains(runtimeSource, 'getAimDirection') && contains(runtimeSource, 'getAimPrediction') && contains(runtimeSource, 'castAimRay') && contains(runtimeSource, 'reflectDirection'), 'Hold-drag aiming, one-bounce prediction, and release shooting are implemented');
assert(contains(runtimeSource, 'STARTING_LIVES = 3') && contains(runtimeSource, 'this.lives = STARTING_LIVES') && contains(runtimeSource, "ctx.fillText('生命 ' + this.lives") && contains(runtimeSource, 'this.finishGame(false)') && contains(runtimeSource, 'this.lives = Math.max(0, this.lives - 1)') && contains(runtimeSource, "this.setMessage('生命剩余 ' + this.lives") && contains(runtimeSource, 'this.powerups.length'), 'Runs use three lives, decrement missed volleys, wait for falling power-ups, and only settle when lives reach zero');
assert(contains(runtimeSource, 'this.ballArmy = 1') && contains(runtimeSource, 'getLaunchBallCount') && contains(runtimeSource, 'var count = this.getLaunchBallCount()'), 'Default launch starts with one white ball and uses the shared launch-count helper');
assert(contains(runtimeSource, 'resetGameProgress') && contains(runtimeSource, 'PADDLE_BASE_WIDTH') && contains(runtimeSource, 'this.cannonBaseLevel = 1') && contains(runtimeSource, 'this.xpNeed = 80') && contains(runtimeSource, 'cannonBaseLevel: 1') && contains(runtimeSource, 'xp: 0') && !contains(runtimeSource, 'save.xp'), 'New runs and result transitions reset cannon, score growth, and experience instead of restoring legacy progression');
assert(contains(runtimeSource, 'resolvePaddleCollision') && contains(runtimeSource, 'resolveBrickCollision') && contains(runtimeSource, 'checkVolleyFinished') && !contains(runtimeSource, 'shiftBricksDown') && !contains(runtimeSource, 'addTopRow') && !contains(runtimeSource, 'DANGER_Y'), 'Ball, paddle, brick collision are implemented without falling rows or a danger line');
assert(contains(runtimeSource, 'sweptCircleRect') && contains(runtimeSource, 'BALL_COLLISION_STEP') && contains(runtimeSource, 'bestHit'), 'Swept collision prevents fast balls from tunneling through bricks and wall blocks');
assert(contains(runtimeSource, 'PLAY_TOP') && contains(runtimeSource, 'getWallResponseNormal') && contains(runtimeSource, 'brick.row === 0'), 'Top wall collision uses the gray wall inner face and prevents escape through perimeter walls');
assert(contains(runtimeSource, 'MAX_RENDER_PIXEL_RATIO = 1.5') && contains(runtimeSource, 'MAX_UI_PIXEL_RATIO = 2') && contains(appSource, 'MAX_RENDER_PIXEL_RATIO = 1.5') && contains(appSource, 'devicePixelRatio: devicePixelRatio') && contains(runtimeSource, 'this.uiPixelRatio') && contains(runtimeSource, 'utils.createCanvas(this.width, this.height, this.uiPixelRatio)') && contains(runtimeSource, 'this.uiTexture.generateMipmaps = false') && contains(runtimeSource, 'isPowerOfTwo') && contains(runtimeSource, 'THREE.ClampToEdgeWrapping') && contains(runtimeSource, 'withFilteredThreeWarnings') && contains(runtimeSource, 'EXT_blend_minmax extension not supported') && contains(runtimeSource, 'OES_vertex_array_object extension not supported') && contains(runtimeSource, 'antialias: false') && contains(runtimeSource, 'this.renderer.sortObjects = false') && contains(runtimeSource, 'ACTIVE_FRAME_INTERVAL_MS') && contains(runtimeSource, 'IDLE_FRAME_INTERVAL_MS') && contains(runtimeSource, 'getTargetFrameIntervalMs') && contains(runtimeSource, 'FRAME_SKIP_TOLERANCE_MS') && contains(runtimeSource, 'getUiFrameKey') && contains(runtimeSource, 'this.uiTexture.needsUpdate = true') && contains(runtimeSource, 'frameKey === this.lastUiFrameKey'), 'Runtime caps render resolution, uses a higher-resolution UI texture for crisp text, clamps NPOT textures, filters known benign WeChat extension warnings, throttles render cadence, disables object sorting, and updates the full-screen UI texture only when its frame key changes');
assert(contains(runtimeSource, 'brickGrid') && contains(runtimeSource, 'getBrickCollisionCandidates') && contains(runtimeSource, 'this.bricksDirty') && contains(runtimeSource, 'createSharedGeometries') && contains(runtimeSource, 'createBrickMaterials') && contains(runtimeSource, 'this.geometries.eraseLine') && contains(runtimeSource, 'puffMaterial') && contains(runtimeSource, 'MAX_ACTIVE_EFFECTS') && contains(runtimeSource, 'pruneEffectQueue'), 'Runtime uses brick grid collision candidates, shared geometry/materials, dirty brick syncing, shared erase-effect resources, and capped effects for mobile performance');
assert(contains(runtimeSource, 'createPaperTexture') && contains(runtimeSource, 'createComicInkTexture') && contains(runtimeSource, 'spawnEraseEffect') && contains(runtimeSource, 'syncEraseEffect') && contains(runtimeSource, 'brick.outline'), 'Comic book hand-drawn style uses paper texture, ink hatching, thick outlines, and erasure effects');
assert(contains(runtimeSource, 'BRICK_OUTLINE_INSET') && contains(runtimeSource, 'angle = 0;') && !contains(runtimeSource, 'sketchAngle') && !contains(runtimeSource, 'sketchSeed') && !contains(runtimeSource, 'Math.sin(this.elapsed * 4 + brick'), 'Dense brick grids keep stable square cells while hand-drawn style comes from textures and effects');
assert(contains(runtimeSource, 'GREEN_BRICK_COLORS') && contains(runtimeSource, 'green: 0x4fbd73') && contains(runtimeSource, 'toneIndex') && contains(runtimeSource, 'getBrickMaterial') && contains(runtimeSource, "this.brickMaterials['green:' + i]"), 'Ordinary green bricks use softer shared hand-drawn color variants instead of one bright flat green');
assert(contains(runtimeSource, 'COLS = 25') && contains(runtimeSource, 'BOARD_WIDTH = 4.86') && contains(runtimeSource, 'getBoardMetrics'), 'Brick grid uses dense small cells aligned within the visible screen');
assert(contains(runtimeSource, 'shouldPlaceWallBrick') && contains(runtimeSource, 'planInitialSkillBricks') && contains(runtimeSource, 'getInitialSkillQuota') && contains(runtimeSource, 'BRICK_POWER_BY_COLOR'), 'Default levels prioritize ordinary bricks with sparse skill bricks and wall bricks');
assert(contains(runtimeSource, 'MAX_ACTIVE_POWERUPS = 5') && !contains(runtimeSource, 'NORMAL_POWER_DROP_CHANCE') && !contains(runtimeSource, "dropPowerup(brick.x, brick.y, '')") && !contains(runtimeSource, 'TOP_ROW_SKILL_INTERVAL'), 'Only special skill bricks drop power-ups and active drops stay capped to avoid item floods');
assert(contains(runtimeSource, 'blue: 0x1479ff') && contains(runtimeSource, 'gold: 0xffb000') && contains(runtimeSource, 'violet: 0x8a2cff') && contains(runtimeSource, 'crimson: 0xff2f2f') && contains(runtimeSource, 'pink: 0xff4fd8') && !contains(runtimeSource, 'cyan: 0x29d6ff'), 'Special brick colors use high-contrast colors distinct from ordinary green');
assert(contains(runtimeSource, 'if (brick.wall)') && contains(runtimeSource, 'ball.vx *= -1') && contains(runtimeSource, 'brick.hp = 0') && contains(runtimeSource, 'dropPowerup(brick.x, brick.y, BRICK_POWER_BY_COLOR'), 'Collision semantics keep gray walls reflective and make non-wall bricks removable with power drops');
assert(contains(runtimeSource, "blue: 'split'") && contains(runtimeSource, "gold: 'heavy'") && contains(runtimeSource, "violet: 'shotgun'") && contains(runtimeSource, "crimson: 'bomb'") && contains(runtimeSource, "pink: 'laser'") && contains(runtimeSource, "this.removePowerupAt(0)"), 'Every skill brick color has a guaranteed matching power-up drop, even when the drop queue is full');
assert(contains(runtimeSource, 'getPowerIconTexture') && contains(runtimeSource, 'drawPowerIconTexture') && contains(runtimeSource, 'drawPowerSplitIcon') && contains(runtimeSource, 'drawPowerHeavyIcon') && contains(runtimeSource, 'drawPowerShotgunIcon') && contains(runtimeSource, 'drawPowerBombIcon') && contains(runtimeSource, 'drawPowerLaserIcon') && contains(runtimeSource, 'this.geometries.power') && !contains(runtimeSource, 'OctahedronGeometry(0.14'), 'Falling power-ups use shared geometry with hand-drawn Canvas icon textures instead of generic geometric gems');
assert(contains(runtimeSource, 'this.geometries.brickPowerIcon') && contains(runtimeSource, 'BRICK_W * 1.5') && contains(runtimeSource, 'getPowerIconMaterial') && contains(runtimeSource, 'brick.powerIcon') && contains(runtimeSource, 'BRICK_POWER_BY_COLOR[brick.colorKey]') && contains(runtimeSource, 'if (powerType)') && contains(runtimeSource, 'brick.mesh = null') && contains(runtimeSource, 'brick.outline = null'), 'Special skill bricks render directly as large hand-drawn power-up sticker art without an extra colored brick wrapper');
assert(contains(runtimeSource, "this.state = 'help'") && contains(runtimeSource, 'drawHelp') && contains(runtimeSource, 'wrapHelpText') && contains(runtimeSource, 'drawHelpSectionTitle') && contains(runtimeSource, 'drawHelpSkill') && contains(runtimeSource, 'drawHelpPowerIcon') && contains(runtimeSource, 'ctx.drawImage(image') && !contains(runtimeSource, 'this.drawPowerLegend(ctx'), 'Power-up descriptions live on an independent wrapped help screen with matching icon art instead of overlapping or overflowing the play field');
assert(contains(runtimeSource, 'UI_BUTTON_HEIGHT = 42') && contains(runtimeSource, 'UI_BUTTON_RADIUS = 12') && contains(runtimeSource, 'drawButton') && contains(runtimeSource, 'Math.round(rect.x)') && contains(runtimeSource, 'fontSize || 16') && contains(runtimeSource, 'createButtonRect') && contains(runtimeSource, 'this.drawButton(ctx, rect') && contains(runtimeSource, 'drawGameplayStatusChip') && contains(runtimeSource, "'重型弹 ' + Math.ceil(this.heavyTimer)") && contains(readmeSource, '统一使用同一套漫画书按钮规格') && contains(readmeSource, '底部信息条边侧小标签'), 'Visible text buttons and gameplay status chips use consistent, crisp, non-overlapping layouts across screens');
assert(!contains(runtimeSource, "this.touchRects.upgrade") && !contains(runtimeSource, "key === 'upgrade'") && !contains(runtimeSource, "this.drawSmallButton(ctx, this.touchRects.help, '说明')") && !contains(runtimeSource, "this.drawCompactButton(ctx, button"), 'Gameplay and title UI remove manual help and cannon upgrade buttons');
assert(contains(runtimeSource, 'BALL_STUCK_TIME') && contains(runtimeSource, 'BALL_WALL_LOOP_LIMIT') && contains(runtimeSource, 'updateBallStuckState') && contains(runtimeSource, 'breakBallLoop') && !contains(runtimeSource, 'BALL_MAX_AGE') && !contains(runtimeSource, '回收卡住的弹球'), 'Ball loop watchdog redirects stuck balls without age-based or in-field removal');
assert(contains(runtimeSource, 'clearBrickMeshes') && contains(runtimeSource, 'clearBrickMesh(brick)') && contains(runtimeSource, 'this.clearBrickMesh(brick)'), 'Destroyed and regenerated bricks clear their meshes so removed cells stay empty');
assert(contains(runtimeSource, 'tryCompleteLevel') && contains(runtimeSource, 'COMPLETE_SLOWMO_DURATION') && contains(runtimeSource, 'COMPLETE_SLOWMO_SCALE') && contains(runtimeSource, 'prepareFinalBrickVisual') && contains(runtimeSource, 'syncFinalClearingBrick') && contains(runtimeSource, 'brick.finalClear') && contains(runtimeSource, 'cloneMaterialForFinalClear') && contains(runtimeSource, 'beginLevelCompleteSlowMotion') && contains(runtimeSource, "this.state = 'completing'") && contains(runtimeSource, 'finalizeLevelComplete') && contains(runtimeSource, 'drawCompletionSlowMotion') && contains(runtimeSource, 'clearPlayfieldForResult') && contains(runtimeSource, "this.state = 'victory'") && contains(runtimeSource, "this.setMessage('关卡完成'") && !contains(runtimeSource, 'startNextLevel') && !contains(runtimeSource, 'levelclear') && !contains(runtimeSource, "'下一关'"), 'Clearing all removable bricks plays a visible final-brick slow-motion disappearance before settlement without next-level progression');
assert(contains(runtimeSource, 'clearActiveEntities') && contains(runtimeSource, 'clearGroup(this.ballGroup)') && contains(runtimeSource, 'clearGroup(this.powerGroup)') && contains(runtimeSource, 'clearGroup(this.effectGroup)') && contains(runtimeSource, 'if (!power)') && contains(runtimeSource, 'this.collectPower(power.type);') && contains(runtimeSource, "if (this.state !== 'playing')"), 'Result transitions clear transient Three.js meshes and power-up loops stop after final-brick completion');
assert(contains(runtimeSource, 'ACTIVE_FRAME_INTERVAL_MS = 1000 / 60') && contains(runtimeSource, 'new THREE.CircleGeometry(BALL_RADIUS, 28)') && contains(runtimeSource, 'BALL_OUTLINE_RATIO = 1.15') && contains(runtimeSource, 'ink.position.z = BALL_OUTLINE_Z') && contains(runtimeSource, 'body.position.z = BALL_BODY_Z') && contains(runtimeSource, 'BALL_RENDER_Z'), 'Ball rendering uses a flat crisp body with a close outline and 60fps active motion to avoid moving ghost artifacts');
assert(contains(runtimeSource, 'runStats') && contains(runtimeSource, 'drawSettlementItem') && contains(runtimeSource, "'本局结算'") && contains(runtimeSource, "'击碎方块'") && contains(runtimeSource, "'获得经验'") && contains(runtimeSource, "'收集道具'") && contains(runtimeSource, "'发射次数'") && !contains(runtimeSource, "ctx.fillText('结果："), 'Result screen records and displays detailed run settlement information without overlapping redundant result text');
assert(contains(runtimeSource, 'POWER_TYPES') && contains(runtimeSource, 'splitBalls') && contains(runtimeSource, 'triggerBomb') && contains(runtimeSource, 'triggerLaser') && contains(runtimeSource, 'fireShotgun') && contains(runtimeSource, 'isPowerupCaught') && contains(runtimeSource, 'applyHeavyToActiveBalls') && contains(runtimeSource, 'suppressPowerDrop'), 'Power-up system includes split, heavy, shotgun, bomb, laser, forgiving pickup, and non-chaining skill clears');
assert(contains(runtimeSource, 'upgradeCannon') && contains(runtimeSource, 'autoUpgradeCannon') && contains(runtimeSource, 'xpNeed') && contains(runtimeSource, 'cannonLevel'), 'Automatic progression and cannon upgrades are implemented');
assert(contains(runtimeSource, 'enterEditor') && contains(runtimeSource, 'saveCustomLevel') && contains(runtimeSource, 'playCustomLevel') && contains(runtimeSource, 'editorGrid') && contains(runtimeSource, "['green', 'blue', 'gold', 'violet', 'crimson', 'pink', 'wall', 'erase']") && contains(runtimeSource, 'powerType = BRICK_POWER_BY_COLOR[tool]') && contains(runtimeSource, 'this.drawHelpPowerIcon(ctx, powerType'), 'Custom level editor and local save are implemented with matching special skill icon tools');
assert(contains(runtimeSource, 'var panelH = 196') && contains(runtimeSource, "this.drawMainButton(ctx, this.touchRects.title, '返回主页'") && contains(runtimeSource, "this.drawMainButton(ctx, this.touchRects.clearLevel, '清空'") && contains(runtimeSource, "this.drawMainButton(ctx, this.touchRects.saveLevel, '保存'") && contains(runtimeSource, "this.drawMainButton(ctx, this.touchRects.playCustom, '挑战'") && !contains(runtimeSource, "this.touchRects.title = { x: 16, y: this.getSafeTop() + 18") && contains(readmeSource, '底部控制台'), 'Custom level editor keeps every action button at the bottom using the same comic button style as the title screen');
assert(bgmSize > 0 && bgmSize < 1024 * 1024, 'Compressed background music is bundled under 1 MB');
assert(contains(audioSource, 'BGM_SRC') && contains(audioSource, 'assets/audio/bgm.mp3') && contains(audioSource, 'createInnerAudioContext') && contains(audioSource, 'playBgm') && contains(audioSource, 'stopBgm') && contains(audioSource, 'loop = true') && contains(audioSource, 'AudioManager.prototype.resume = function () {\n  var ctx = this.ensure();\n  if (ctx && ctx.resume)'), 'Background music uses a compressed local MP3 through InnerAudioContext and is not restarted by generic audio resume');
assert(contains(audioSource, 'createOscillator') && contains(audioSource, 'createBufferSource') && contains(audioSource, 'playShoot') && contains(audioSource, 'playBomb') && contains(audioSource, 'playAimStart') && contains(audioSource, 'playPaddleCatch') && contains(audioSource, 'playBrickBreak') && contains(audioSource, 'playPowerDrop') && contains(audioSource, 'playClear') && contains(runtimeSource, 'playEditorPlace'), 'Audio is synthesized with Web Audio API and covers aiming, catches, breaks, drops, editor actions, and completion');
assert(contains(readmeSource, '默认只有 1 颗白色弹球') && contains(readmeSource, '首次碰撞点') && contains(readmeSource, '只有掉出底部') && contains(readmeSource, '3` 条命') && contains(readmeSource, '生命归零') && contains(readmeSource, '关卡完成') && contains(readmeSource, '自定义关卡作为核心玩法') && !contains(readmeSource, '下一关') && !contains(readmeSource, '开始闯关'), 'README documents the one-ball default, three-life rule, aim prediction, persistent balls, and single-map custom-level flow');
assert(contains(readmeSource, '结算面板') && contains(readmeSource, '击碎方块') && contains(readmeSource, '发射次数') && contains(readmeSource, '避免重复显示结果状态'), 'README documents game-over settlement details');
assert(contains(readmeSource, '炮台 `Lv.1`') && contains(readmeSource, '自动升级炮台') && contains(readmeSource, '结算后重置') && contains(readmeSource, '本地仅保存自定义关卡'), 'README documents automatic upgrades as per-run data that resets after settlement');
assert(contains(readmeSource, '战斗界面底部不再显示额外说明按钮') && contains(readmeSource, '不再提供手动升级按钮') && !contains(readmeSource, '砖块会从上方向下推进'), 'README documents the optimized gameplay bottom layout and fixed-board rules');
assert(contains(readmeSource, '漫画书手绘风') && contains(readmeSource, '纸张纹理') && contains(readmeSource, '擦除粉尘'), 'README documents the comic hand-drawn visual style');
assert(contains(readmeSource, '粉色激光') && contains(readmeSource, '稳定掉落对应道具') && contains(readmeSource, 'Canvas 程序手绘') && contains(readmeSource, '漫画贴纸图标'), 'README documents guaranteed special-brick drops and hand-drawn falling power-up art');
assert(contains(readmeSource, '不会继续生成二次道具') && contains(readmeSource, '立即强化场上已有弹球'), 'README documents fixed power-up chaining and visible heavy-ball behavior');
assert(contains(readmeSource, '复杂技能') && contains(readmeSource, '说明文字会自动换行') && contains(readmeSource, '失败条件'), 'README documents the improved non-overflowing help layout and fuller gameplay explanations');
assert(contains(readmeSource, '背景音乐') && contains(readmeSource, '开始一局时启动') && contains(readmeSource, '进入结算时停止') && !contains(readmeSource, '/Users/') && !contains(readmeSource, '496 KB'), 'README documents background music behavior without copied file details');
assert(contains(readmeSource, '核心玩法') && contains(readmeSource, '美术设计') && contains(readmeSource, '技术设计') && contains(readmeSource, '音频设计') && contains(readmeSource, '自定义关卡'), 'README documents the main gameplay features and design plan');

if (failures.length) {
  console.log('');
  console.log('Smoke validation failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('');
console.log('Smoke validation passed.');
