'use strict';

var AUDIO_ASSETS = {
  level1Bgm: 'audio/bgm_main.mp3',
  level2Bgm: 'audio/bgm_main.mp3',
  level3Bgm: 'audio/bgm_main.mp3',
  jump: 'audio/jump_sfx.mp3',
  melee: 'audio/melee_hit_sfx.mp3',
  shot: 'audio/ranged_shot_sfx.mp3',
  damage: 'audio/damage_sfx.mp3',
  death: 'audio/death_sfx.mp3',
  explosion: 'audio/explosion_sfx.mp3',
  ultimate: 'audio/ultimate_sfx.mp3',
  bossRoar: 'audio/thanos_roar_sfx.mp3',
  bossFinisher: 'audio/boss_finisher_sfx.mp3',
  bossWeakHit: 'audio/boss_weak_hit_sfx.mp3'
};

function createContext(src, loop, volume) {
  if (typeof wx === 'undefined' || typeof wx.createInnerAudioContext !== 'function') {
    return null;
  }

  var ctx = wx.createInnerAudioContext();
  ctx.src = src;
  ctx.loop = !!loop;
  ctx.volume = volume;
  if ('obeyMuteSwitch' in ctx) {
    ctx.obeyMuteSwitch = false;
  }
  return ctx;
}

function AudioManager() {
  this.bgmKey = '';
  this.bgm = null;
  this.sfxVolume = 0.42;
  this.bgmVolume = 0.28;
}

AudioManager.prototype.playBgm = function (key) {
  var src = AUDIO_ASSETS[key];
  if (!src || this.bgmKey === key) {
    return;
  }

  this.stopBgm();
  this.bgmKey = key;
  this.bgm = createContext(src, true, this.bgmVolume);
  if (this.bgm) {
    this.bgm.play();
  }
};

AudioManager.prototype.stopBgm = function () {
  if (this.bgm) {
    try {
      this.bgm.stop();
      this.bgm.destroy();
    } catch (error) {
      // ignore runtime-specific audio cleanup issues
    }
  }
  this.bgm = null;
  this.bgmKey = '';
};

AudioManager.prototype.pauseBgm = function () {
  if (this.bgm) {
    try {
      this.bgm.pause();
    } catch (error) {
      // ignore pause issues
    }
  }
};

AudioManager.prototype.resumeBgm = function () {
  if (this.bgm) {
    try {
      this.bgm.play();
    } catch (error) {
      // ignore resume issues
    }
  }
};

AudioManager.prototype.playSfx = function (key) {
  return;
};

AudioManager.prototype.destroy = function () {
  this.stopBgm();
};

module.exports = {
  AUDIO_ASSETS: AUDIO_ASSETS,
  AudioManager: AudioManager
};
