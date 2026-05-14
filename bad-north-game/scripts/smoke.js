'use strict';

var fs = require('fs');
var path = require('path');

var rootDir = path.resolve(__dirname, '..');
var runtimePath = path.join(rootDir, 'src/minigame-runtime.js');
var audioPath = path.join(rootDir, 'src/audio.js');
var appPath = path.join(rootDir, 'src/minigame-app.js');
var readmePath = path.join(rootDir, 'README.md');
var projectConfigPath = path.join(rootDir, 'project.config.json');
var gameConfigPath = path.join(rootDir, 'game.json');
var runtimeSource = fs.readFileSync(runtimePath, 'utf8');
var audioSource = fs.readFileSync(audioPath, 'utf8');
var appSource = fs.readFileSync(appPath, 'utf8');
var threeScopeSource = fs.readFileSync(path.join(rootDir, 'src/three-scope.js'), 'utf8');
var readmeSource = fs.readFileSync(readmePath, 'utf8');
var projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
var gameConfig = JSON.parse(fs.readFileSync(gameConfigPath, 'utf8'));
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

function countMatches(source, pattern) {
  var matches = source.match(pattern);
  return matches ? matches.length : 0;
}

var threeScope = require('../src/three-scope');
var THREE = threeScope.createScopedThreejs({
  width: 1,
  height: 1,
  getContext: function () {
    return {};
  }
});
require(appPath);
require(runtimePath);
require(audioPath);

assert(THREE.REVISION === '162', 'Three.js r162 local module loads through scoped adapter');
assert(!contains(runtimeSource, "require('../libs/three')") && contains(appSource, 'createScopedThreejs'), 'Runtime receives scoped THREE from the app entry');
assert(contains(threeScopeSource, 'createScopedThreejs') && contains(threeScopeSource, 'createElementNS') && contains(threeScopeSource, 'clientWidth'), 'Three scope adapter follows WeChat canvas binding pattern');
assert(contains(threeScopeSource, 'safeInstallProperty') && contains(threeScopeSource, '__wechatScopedDocument'), 'Three scope adapter avoids read-only global document failures');
assert(!contains(runtimeSource, 'three.cjs'), 'Runtime avoids obsolete three.cjs require path');
assert(projectConfig.compileType === 'game', 'project.config.json uses WeChat game compile type');
assert(gameConfig.deviceOrientation === 'portrait', 'game.json keeps portrait orientation');
assert(countMatches(runtimeSource, /lane: '/g) >= 4, 'Wave config includes multiple landing lanes');
assert(countMatches(runtimeSource, /name: '.*?'/g) >= 5, 'Runtime contains named wave and squad content');

[
  ['militia', '民兵', 'none'],
  ['archer', '弓箭手', 'volley'],
  ['ranger', '游侠', 'decoy'],
  ['monk', '武僧', 'prison'],
  ['star', '星使', 'starburst']
].forEach(function (entry) {
  assert(contains(runtimeSource, entry[0]) && contains(runtimeSource, entry[1]) && contains(runtimeSource, "skill: '" + entry[2] + "'"), 'Squad implemented: ' + entry[1] + ' / ' + entry[2]);
});

assert(contains(runtimeSource, 'QuadraticBezierCurve3') && contains(runtimeSource, 'TubeGeometry'), 'Archer bow uses curved TubeGeometry');
assert(contains(runtimeSource, "kind === 'star'") && contains(runtimeSource, "kind === 'knife'"), 'Projectile variants include star orbs, knives, and arrows');
assert(contains(runtimeSource, 'SQUAD_FORMATION_OFFSETS') && contains(runtimeSource, 'spawnSquadProjectiles') && contains(runtimeSource, 'getSquadProjectileOrigin') && contains(runtimeSource, 'totalDamage / Math.max(1, count)') && contains(runtimeSource, 'sourceSquadId') && contains(runtimeSource, 'markEnemyRangedAggro'), 'Ranged squad attacks spawn one projectile per visible member, preserve total damage, and aggro hit enemies toward the shooter');
assert(contains(runtimeSource, 'ISLAND_SCALE = 0.62') && contains(runtimeSource, 'panCamera') && contains(runtimeSource, 'zoomCamera') && contains(runtimeSource, "this.gestureMode = 'pinch'"), 'Zoomed-out global island view with pan and pinch zoom controls is implemented');
assert(!contains(runtimeSource, "this.gestureMode = 'command'"), 'Dragging no longer conflicts with movement commands');
assert(contains(runtimeSource, 'resetCameraView') && contains(runtimeSource, 'startRotateCameraView') && contains(runtimeSource, 'stopRotateCameraView') && contains(runtimeSource, 'ROTATE_VIEW_SPEED') && contains(runtimeSource, 'touchRects.resetView') && contains(runtimeSource, 'touchRects.rotateView'), 'Top-right custom direction control moved to bottom reset-view and hold-to-rotate view actions');
assert(contains(runtimeSource, 'findWalkPath') && contains(runtimeSource, 'isHouseBlockingTile') && contains(runtimeSource, 'MAX_TRAVERSABLE_HEIGHT_DELTA') && contains(runtimeSource, 'CLIMB_ARC_HEIGHT'), 'Squad and enemy movement uses building-aware pathfinding and height-climb animation');
assert(contains(runtimeSource, 'mesh.visible = false') && contains(runtimeSource, 'mesh.userData.flag.visible = false') && contains(runtimeSource, 'squad.hp <= 0'), 'Defeated player squad meshes reclaim flags instead of leaving floating banners');
assert(contains(runtimeSource, 'findHouseAttackRoute') && contains(runtimeSource, 'isHouseAttackTile') && contains(runtimeSource, 'findBestHouseAttackRoute') && contains(runtimeSource, 'ENEMY_STUCK_REPATH_TIME'), 'Enemy building attacks use explicit reachable exterior attack tiles with stuck repath recovery');
assert(contains(runtimeSource, 'findRouteBlockingSquad') && contains(runtimeSource, 'findSquadDefendingRoute') && contains(runtimeSource, 'findSquadAheadOfObjective') && contains(runtimeSource, 'ENEMY_DEFENDER_ROUTE_RADIUS') && contains(runtimeSource, 'isSquadOnEnemyRoute') && contains(runtimeSource, 'ENEMY_SQUAD_ENGAGE_RANGE') && contains(runtimeSource, 'SQUAD_CONTACT_ENGAGE_RANGE') && contains(runtimeSource, 'ACTOR_ROUTE_BLOCK_RADIUS') && contains(runtimeSource, 'getRangedAggroSquad') && contains(runtimeSource, 'RANGED_AGGRO_TIME'), 'Enemies engage player squads that defend their building route, intercept their active route, or damage them from range instead of treating them as movement blockers');
assert(contains(runtimeSource, 'createLadderMeshes') && contains(runtimeSource, 'syncPathPreview') && contains(runtimeSource, 'drawRoutePreview') && contains(runtimeSource, 'PATH_LINE_HEX'), 'Terrain ladders and shared visible movement path preview are implemented');
assert(contains(runtimeSource, 'isLadderClearOfHouses') && contains(runtimeSource, 'LADDER_HOUSE_CLEARANCE') && contains(runtimeSource, 'LADDER_FOOTPRINT_HALF_WIDE'), 'Terrain ladders avoid building footprints and visual overlap');
assert(contains(runtimeSource, 'LADDER_MAX_COUNT') && contains(runtimeSource, 'LADDER_MIN_SPACING') && contains(runtimeSource, 'getLadderCandidateScore') && contains(runtimeSource, 'isLadderCandidateSpaced'), 'Terrain ladders are sparsely selected instead of generated at every height edge');
assert(contains(runtimeSource, 'addRouteDashes') && contains(runtimeSource, 'createRouteDash') && contains(runtimeSource, 'getRouteSegmentY') && contains(runtimeSource, "marker = 'route-dash'") && contains(runtimeSource, 'terrain3D'), 'Movement route previews use 3D terrain-following dashed segments instead of continuous 2D straight lines');
assert(contains(runtimeSource, 'singleLayer: true') && contains(runtimeSource, '!style.singleLayer && style.coreMaterial'), 'Friendly movement route avoids duplicate stacked dash-core rendering');
assert(contains(runtimeSource, 'ENEMY_ATTACK_ROUTE_PREVIEWS_ENABLED = false') && contains(runtimeSource, 'syncEnemyAttackPathPreviews') && contains(runtimeSource, 'clearGroup(this.enemyPathGroup)'), 'Enemy attack route previews are disabled and cleared from the render layer');
assert(!contains(runtimeSource, '红色路线'), 'Runtime no longer shows stale red-route hint copy');
assert(contains(runtimeSource, 'createEnemySoldierMesh') && contains(runtimeSource, "silhouette: 'hostile-angular'") && contains(runtimeSource, 'enemyHood') && contains(runtimeSource, 'enemyShield') && contains(runtimeSource, 'enemyMark'), 'Enemies use distinct hostile silhouettes and black-red visual language');
assert(contains(runtimeSource, 'addFriendlyAnatomy') && contains(runtimeSource, 'addMilitiaRoleDetails') && contains(runtimeSource, 'addArcherRoleDetails') && contains(runtimeSource, 'addRangerRoleDetails') && contains(runtimeSource, 'addMonkRoleDetails') && contains(runtimeSource, 'addStarRoleDetails') && contains(runtimeSource, "detailLevel: 'refined-role'"), 'Friendly roles use refined anatomy, equipment, and role-specific art details');
assert(contains(runtimeSource, 'addEnemyAnatomyDetails') && contains(runtimeSource, "detailLevel: 'refined-hostile'") && contains(runtimeSource, 'clothLight') && contains(runtimeSource, 'inkDetail'), 'Enemy roles use refined hostile anatomy and stronger ink detail materials');
assert(contains(runtimeSource, 'vWash') && contains(runtimeSource, 'PAPER_FOG') && contains(runtimeSource, 'createAtmosphere') && contains(runtimeSource, 'addInkShell'), 'Rainy ink-wash Three.js atmosphere and mesh ink outlines are implemented');
assert(contains(runtimeSource, 'SEA_TOP') && contains(runtimeSource, '0x456b78') && contains(runtimeSource, '0xa98748') && contains(runtimeSource, '0x3f8d50') && contains(runtimeSource, 'drawTopStatChip'), 'Separated cool sea, warm terrain, and class-readable character palette is implemented');
assert(contains(runtimeSource, 'SEA_LEVEL_Y') && contains(runtimeSource, 'MIN_SEA_TERRAIN_GAP') && contains(runtimeSource, 'hasStableSeaTerrainGap'), 'Sea surface is kept below the lowest terrain to prevent color flicker');
assert(contains(runtimeSource, 'createSeaWaveLines') && contains(runtimeSource, 'seaWaveGroup') && contains(runtimeSource, 'SEA_SURFACE_FOAM_Y'), 'Sea uses visible animated Three.js wave lines above the shader water plane');
assert(contains(runtimeSource, 'DISTANT_BOAT_SPEED') && contains(runtimeSource, 'emitBoatWake') && contains(runtimeSource, 'BOAT_WAKE_INTERVAL') && contains(runtimeSource, 'landingWake'), 'Enemy boats approach from distant sea with wake trails and landing foam effects');
assert(contains(runtimeSource, 'shore:') && contains(runtimeSource, 'landingX') && contains(runtimeSource, 'landingZ'), 'Boat shore stops are separated from enemy land deployment points');
assert(contains(runtimeSource, 'makeLowPolyMaterial') && !contains(runtimeSource, 'MeshToonMaterial') && !contains(runtimeSource, 'MeshLambertMaterial') && !contains(runtimeSource, 'flatShading'), 'Low-poly materials avoid Three built-in derivative shader paths');
assert(!contains(runtimeSource, 'dFdx') && !contains(runtimeSource, 'dFdy'), 'Runtime shaders avoid derivative functions unsupported by WeChat DevTools');
assert(contains(runtimeSource, 'POSTPROCESS_RENDER_SCALE') && contains(runtimeSource, 'uInkStrength') && contains(runtimeSource, 'uPaperStrength'), 'Screen-space ink outline post-process is enabled and shader-tuned');
assert(contains(runtimeSource, 'drawHouseHealthBars') && contains(runtimeSource, 'getHouseHealthAnchorY') && contains(runtimeSource, 'Math.ceil(house.hp)') && contains(runtimeSource, 'HOUSE_HEALTH_VISIBLE_TIME') && contains(runtimeSource, 'shouldShowHouseHealth') && contains(runtimeSource, 'house.healthVisibleUntil'), 'Buildings show damage-triggered 3D and screen-space health bars');
assert(contains(runtimeSource, 'DepthTexture') && contains(runtimeSource, 'uUseDepth') && contains(runtimeSource, 'disableDepthOutline'), 'Outline post-process supports depth edges with color-edge fallback');
assert(contains(runtimeSource, 'return false;') && contains(runtimeSource, 'depth texture internal format'), 'Depth texture path is disabled for WeChat renderer stability');
assert(contains(runtimeSource, 'shouldUsePostProcess') && contains(runtimeSource, 'return true;') && contains(runtimeSource, 'disablePostProcess') && contains(runtimeSource, 'using direct renderer'), 'Renderer attempts post-processing first and falls back to direct rendering when unsupported');
assert(contains(runtimeSource, 'disableUiOverlay') && contains(runtimeSource, 'continuing 3D render'), 'UI overlay failures are non-fatal to 3D rendering');
assert(contains(runtimeSource, 'LinearSRGBColorSpace') && !contains(runtimeSource, 'this.uiTexture.colorSpace = THREE.SRGBColorSpace'), 'UI CanvasTexture avoids WeChat sRGB conversion warnings');
assert(contains(runtimeSource, 'createWebAudioContext') || contains(audioSource, 'createWebAudioContext'), 'Audio manager supports WeChat Web Audio context');
assert(contains(audioSource, 'createOscillator') && contains(audioSource, 'createBufferSource'), 'Audio effects are synthesized with oscillators and generated buffers');
[
  'playSelect',
  'playDeny',
  'playBoatLanding',
  'playEnemySpawn',
  'playAttack',
  'playEnemyAttack',
  'playImpact',
  'playHouseHit',
  'playEnemyDown',
  'playSquadDown'
].forEach(function (method) {
  assert(contains(audioSource, 'AudioManager.prototype.' + method), 'Audio manager exposes synthesized SFX: ' + method);
});
assert(contains(runtimeSource, 'playBoatLanding') && contains(runtimeSource, 'playEnemySpawn') && contains(runtimeSource, 'playAttack') && contains(runtimeSource, 'playImpact') && contains(runtimeSource, 'playHouseHit'), 'Runtime hooks landing, combat, projectile, and structure SFX into gameplay events');
assert(contains(runtimeSource, 'triggerMeleeBrawl') && contains(runtimeSource, "effect.type === 'clash'") && contains(runtimeSource, 'ATTACK_PULSE_DECAY') && contains(runtimeSource, 'HIT_PULSE_DECAY') && contains(runtimeSource, 'lockMeleeEngagement') && contains(runtimeSource, 'moveActorTowardPoint'), 'Contact combat triggers brawl effects, opponent locks, close approach movement, and attack/hit animation pulses');
assert(contains(runtimeSource, 'drawFatalError') && contains(appSource, 'drawBootError'), 'Boot and render error fallbacks are available for DevTools diagnostics');
assert(contains(readmeSource, '美术风格') && contains(readmeSource, 'Low-poly') && contains(readmeSource, '屏幕空间描边') && contains(readmeSource, '兵种颜色'), 'README documents the current art style summary');
assert(contains(readmeSource, '自动验证') && contains(readmeSource, 'Three.js/WebGL') && contains(readmeSource, 'scripts/runtime-sim.js'), 'README documents implementation and validation results');

if (failures.length) {
  console.log('');
  console.log('Smoke validation failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('');
console.log('Smoke validation passed.');
