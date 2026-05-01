'use strict';

var IMAGE_MANIFEST = {
  livingRoomBg: 'images/living_room_bg.png',
  titleBg: 'images/living_room_bg.png',
  towerSlot: 'images/tower_slot.png',
  defenseTarget: 'images/defense_target.png',
  spawnDoor: 'images/spawn_door.png',
  obstacleBox: 'images/obstacle_box.png',
  obstacleShoe: 'images/obstacle_shoe.png',
  catTabby: 'images/cat_tabby.png',
  catSiamese: 'images/cat_siamese.png',
  catFat: 'images/cat_fat.png',
  catCalico: 'images/cat_calico.png',
  enemyDust: 'images/enemy_dust.png',
  enemyCucumber: 'images/enemy_cucumber.png',
  enemyVacuum: 'images/enemy_vacuum.png',
  enemyMailman2: 'images/enemy_mailman2.png',
  enemyMailman3: 'images/enemy_mailman3.png',
  enemyMailman4: 'images/enemy_mailman4.png',
  enemyMailman5: 'images/enemy_mailman5.png',
  enemyPirate: 'images/enemy_pirate.png',
  enemyKnight: 'images/enemy_knight.png',
  enemySpaceman: 'images/enemy_spaceman.png',
  enemyWizard: 'images/enemy_wizard.png',
  enemyWildman: 'images/enemy_wildman.png',
  enemyWarrior: 'images/enemy_warrior.png',
  enemyNinja: 'images/enemy_ninja.png',
  enemyWildwoman: 'images/enemy_wildwoman.png',
  enemyIronman: 'images/enemy_ironman.png',
  enemyShooter: 'images/enemy_shooter.png',
  enemyMailman: 'images/enemy_mailman.png',
  projMung: 'images/proj_mung.png',
  projBone: 'images/proj_bone.png',
  projBun: 'images/proj_bun.png',
  projBoba: 'images/proj_boba.png',
  iconKibble: 'images/icon_kibble.png',
  iconTowerTabby: 'images/icon_tower_tabby.png',
  iconTowerSiamese: 'images/icon_tower_siamese.png',
  iconTowerFat: 'images/icon_tower_fat.png',
  iconTowerCalico: 'images/icon_tower_calico.png'
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
