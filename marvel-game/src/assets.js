'use strict';

var IMAGE_MANIFEST = {
  ironmanPortrait: 'images/ironman_portrait.png',
  thorPortrait: 'images/thor_portrait.png',
  hulkPortrait: 'images/hulk_portrait.png',
  ironmanIdle: 'images/ironman_idle_01.png',
  ironmanIdle2: 'images/ironman_idle_02.png',
  thorIdle: 'images/thor_idle_01.png',
  thorIdle2: 'images/thor_idle_02.png',
  hulkIdle: 'images/hulk_idle_01.png',
  hulkIdle2: 'images/hulk_idle_02.png',
  ironmanRun: 'images/ironman_run_01.png',
  ironmanRun2: 'images/ironman_run_02.png',
  thorRun: 'images/thor_run_01.png',
  thorRun2: 'images/thor_run_02.png',
  hulkRun: 'images/hulk_run_01.png',
  hulkRun2: 'images/hulk_run_02.png',
  ironmanJump1: 'images/ironman_jump_01.png',
  ironmanJump2: 'images/ironman_jump_02.png',
  thorJump1: 'images/thor_jump_01.png',
  thorJump2: 'images/thor_jump_02.png',
  hulkJump1: 'images/hulk_jump_01.png',
  hulkJump2: 'images/hulk_jump_02.png',
  ironmanAttack1_1: 'images/ironman_attack_1_01.png',
  ironmanAttack1_2: 'images/ironman_attack_1_02.png',
  ironmanAttack2_1: 'images/ironman_attack_2_01.png',
  ironmanAttack2_2: 'images/ironman_attack_2_02.png',
  ironmanDie1: 'images/ironman_die_01.png',
  ironmanDie2: 'images/ironman_die_02.png',
  thorAttack1_1: 'images/thor_attack_1_01.png',
  thorAttack1_2: 'images/thor_attack_1_02.png',
  thorAttack2_1: 'images/thor_attack_2_01.png',
  thorAttack2_2: 'images/thor_attack_2_02.png',
  thorDie1: 'images/thor_die_01.png',
  thorDie2: 'images/thor_die_02.png',
  hulkAttack1_1: 'images/hulk_attack_01_01.png',
  hulkAttack1_2: 'images/hulk_attack_01_02.png',
  hulkAttack2_1: 'images/hulk_attack_02_01.png',
  hulkAttack2_2: 'images/hulk_attack_02_02.png',
  hulkDie1: 'images/hulk_die_01.png',
  hulkDie2: 'images/hulk_die_02.png',
  sentryIdle: 'images/ultron_sentry_idle_01.png',
  sentryIdle2: 'images/ultron_sentry_idle_02.png',
  sentryRun: 'images/ultron_sentry_run_01.png',
  sentryRun2: 'images/ultron_sentry_run_02.png',
  sentryAttack1_1: 'images/ultron_sentry_attack_01_01.png',
  sentryAttack1_2: 'images/ultron_sentry_attack_01_02.png',
  sentryDie1: 'images/ultron_sentry_die_01.png',
  sentryDie2: 'images/ultron_sentry_die_02.png',
  thanosIdle: 'images/thanos_idle_01.png',
  thanosIdle2: 'images/thanos_idle_02.png',
  thanosRun: 'images/thanos_run_01.png',
  thanosRun2: 'images/thanos_run_02.png',
  thanosAttack: 'images/thanos_attack_01_01.png',
  thanosAttack1_2: 'images/thanos_attack_01_02.png',
  thanosAttack2_1: 'images/thanos_attack_02_01.png',
  thanosAttack2_2: 'images/thanos_attack_02_02.png',
  thanosJump1: 'images/thanos_jump_01.png',
  thanosJump2: 'images/thanos_jump_02.png',
  thanosDie1: 'images/thanos_die_01.png',
  thanosDie2: 'images/thanos_die_02.png',
  repulsorBlast: 'images/repulsor_blast.png',
  mjolnirProjectile: 'images/mjolnir_projectile.png',
  unibeamEffect: 'images/unibeam_effect.png',
  lightningBolt: 'images/lightning_bolt.png',
  shockwave: 'images/shockwave_effect.png',
  groundShockwave: 'images/ground_shockwave.png',
  powerStone: 'images/power_stone_glow.png',
  cityTiles: 'images/city_tiles.png',
  helicarrierTiles: 'images/helicarrier_tiles.png',
  titanTiles: 'images/titan_tiles.png'
};

function createImage(canvas) {
  if (canvas && typeof canvas.createImage === 'function') {
    return canvas.createImage();
  }
  if (typeof wx !== 'undefined' && typeof wx.createImage === 'function') {
    return wx.createImage();
  }
  return null;
}

function AssetStore(canvas) {
  this.canvas = canvas;
  this.images = {};
}

AssetStore.prototype.load = function (key, path) {
  var image = createImage(this.canvas);
  if (!image) {
    return null;
  }
  image._loaded = false;
  image.onload = function () {
    image._loaded = true;
  };
  image.onerror = function () {
    image._loaded = false;
  };
  image.src = path;
  this.images[key] = image;
  return image;
};

AssetStore.prototype.preload = function () {
  var self = this;
  Object.keys(IMAGE_MANIFEST).forEach(function (key) {
    self.load(key, IMAGE_MANIFEST[key]);
  });
};

AssetStore.prototype.get = function (key) {
  var image = this.images[key];
  if (!image || !image._loaded) {
    return null;
  }
  return image;
};

AssetStore.prototype.destroy = function () {
  this.images = {};
};

function createAssetStore(canvas) {
  var store = new AssetStore(canvas);
  store.preload();
  return store;
}

module.exports = {
  IMAGE_MANIFEST: IMAGE_MANIFEST,
  createAssetStore: createAssetStore
};
