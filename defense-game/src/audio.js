'use strict';

var AUDIO_MANIFEST = {
  bgmMain: {
    src: 'audio/bgm_relaxed_6.mp3',
    loop: true,
    volume: 0.34
  },
  uiTap: {
    src: 'audio/ui_button.mp3',
    volume: 0.42,
    polyphony: 2,
    cooldownMs: 60
  },
  towerPlace: {
    src: 'audio/tower_place.wav',
    volume: 0.38,
    polyphony: 2,
    cooldownMs: 90
  },
  towerUpgrade: {
    src: 'audio/tower_upgrade.wav',
    volume: 0.48,
    polyphony: 1,
    cooldownMs: 120
  },
  waveStart: {
    src: 'audio/wave_start.wav',
    volume: 0.52,
    polyphony: 1,
    cooldownMs: 160
  },
  enemyDown: {
    src: 'audio/enemy_down.mp3',
    volume: 0.34,
    polyphony: 2,
    cooldownMs: 90
  },
  targetHit: {
    src: 'audio/target_hit.wav',
    volume: 0.44,
    polyphony: 1,
    cooldownMs: 180
  },
  victory: {
    src: 'audio/victory.mp3',
    volume: 0.62,
    polyphony: 1,
    cooldownMs: 300
  },
  defeat: {
    src: 'audio/defeat.mp3',
    volume: 0.6,
    polyphony: 1,
    cooldownMs: 300
  }
};

function canUseAudioApi() {
  return typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
}

function createManagedContext(definition) {
  var ctx;

  if (!canUseAudioApi()) {
    return null;
  }

  ctx = wx.createInnerAudioContext();
  ctx.src = definition.src;
  ctx.loop = !!definition.loop;
  ctx.autoplay = false;
  ctx.volume = definition.volume === undefined ? 1 : definition.volume;
  if ('obeyMuteSwitch' in ctx) {
    ctx.obeyMuteSwitch = true;
  }

  return ctx;
}

function bindContextLifecycle(ctx) {
  if (!ctx) {
    return;
  }

  function clearBusy() {
    ctx._busy = false;
  }

  if (typeof ctx.onEnded === 'function') {
    ctx.onEnded(clearBusy);
  }
  if (typeof ctx.onStop === 'function') {
    ctx.onStop(clearBusy);
  }
  if (typeof ctx.onError === 'function') {
    ctx.onError(clearBusy);
  }
}

function AudioManager(options) {
  options = options || {};
  this.enabled = canUseAudioApi();
  this.musicEnabled = options.musicEnabled !== false;
  this.sfxEnabled = options.sfxEnabled !== false;
  this.desiredBgmKey = '';
  this.currentBgmKey = '';
  this.bgmContext = null;
  this.bgmPaused = false;
  this.sfxPools = {};
  this.lastSfxAt = {};
}

AudioManager.prototype.activate = function () {
  if (!this.enabled || !this.musicEnabled || !this.desiredBgmKey) {
    return;
  }
  this.playBgm(this.desiredBgmKey);
};

AudioManager.prototype.getAudioDefinition = function (key) {
  return AUDIO_MANIFEST[key] || null;
};

AudioManager.prototype.ensureBgmContext = function (key) {
  var definition = this.getAudioDefinition(key);

  if (!this.enabled || !definition) {
    return null;
  }

  if (this.bgmContext && this.currentBgmKey === key) {
    return this.bgmContext;
  }

  this.stopBgm();
  if (this.bgmContext && typeof this.bgmContext.destroy === 'function') {
    this.bgmContext.destroy();
  }

  this.bgmContext = createManagedContext(definition);
  this.currentBgmKey = key;
  this.bgmPaused = false;
  return this.bgmContext;
};

AudioManager.prototype.playBgm = function (key) {
  var ctx;

  this.desiredBgmKey = key || 'bgmMain';
  if (!this.musicEnabled) {
    this.stopBgm();
    return;
  }
  ctx = this.ensureBgmContext(this.desiredBgmKey);
  if (!ctx) {
    return;
  }

  try {
    ctx.play();
    this.bgmPaused = false;
  } catch (error) {
    return;
  }
};

AudioManager.prototype.pauseBgm = function () {
  if (!this.bgmContext) {
    return;
  }

  try {
    if (typeof this.bgmContext.pause === 'function') {
      this.bgmContext.pause();
      this.bgmPaused = true;
      return;
    }
    this.bgmContext.stop();
    this.bgmPaused = true;
  } catch (error) {
    return;
  }
};

AudioManager.prototype.resumeBgm = function () {
  if (!this.desiredBgmKey) {
    this.desiredBgmKey = 'bgmMain';
  }
  if (!this.musicEnabled) {
    return;
  }
  this.playBgm(this.desiredBgmKey);
};

AudioManager.prototype.stopBgm = function () {
  if (!this.bgmContext) {
    return;
  }

  try {
    this.bgmContext.stop();
  } catch (error) {
    return;
  }
};

AudioManager.prototype.createSfxContext = function (key) {
  var definition = this.getAudioDefinition(key);
  var ctx;

  if (!definition) {
    return null;
  }

  ctx = createManagedContext(definition);
  if (!ctx) {
    return null;
  }

  ctx._busy = false;
  bindContextLifecycle(ctx);
  return ctx;
};

AudioManager.prototype.getReusableSfxContext = function (key) {
  var definition = this.getAudioDefinition(key);
  var limit;
  var pool;
  var i;
  var ctx;

  if (!definition) {
    return null;
  }

  pool = this.sfxPools[key] || [];
  limit = definition.polyphony || 1;

  for (i = 0; i < pool.length; i += 1) {
    if (!pool[i]._busy) {
      return pool[i];
    }
  }

  if (pool.length < limit) {
    ctx = this.createSfxContext(key);
    if (!ctx) {
      return null;
    }
    pool.push(ctx);
    this.sfxPools[key] = pool;
    return ctx;
  }

  return pool[0];
};

AudioManager.prototype.playSfx = function (key) {
  var definition = this.getAudioDefinition(key);
  var now = Date.now();
  var ctx;

  if (!this.enabled || !this.sfxEnabled || !definition || definition.loop) {
    return;
  }

  if (definition.cooldownMs && this.lastSfxAt[key] && now - this.lastSfxAt[key] < definition.cooldownMs) {
    return;
  }

  this.lastSfxAt[key] = now;
  ctx = this.getReusableSfxContext(key);
  if (!ctx) {
    return;
  }

  ctx._busy = true;
  try {
    if (typeof ctx.stop === 'function') {
      ctx.stop();
    }
  } catch (stopError) {
    ctx._busy = true;
  }

  try {
    if (typeof ctx.seek === 'function') {
      ctx.seek(0);
    }
  } catch (seekError) {
    ctx._busy = true;
  }

  try {
    ctx.play();
  } catch (playError) {
    ctx._busy = false;
  }
};

AudioManager.prototype.setMusicEnabled = function (enabled) {
  this.musicEnabled = !!enabled;
  if (!this.musicEnabled) {
    this.stopBgm();
    return;
  }
  this.resumeBgm();
};

AudioManager.prototype.setSfxEnabled = function (enabled) {
  var self = this;

  this.sfxEnabled = !!enabled;
  if (this.sfxEnabled) {
    return;
  }

  Object.keys(this.sfxPools).forEach(function (key) {
    self.sfxPools[key].forEach(function (ctx) {
      try {
        if (ctx && typeof ctx.stop === 'function') {
          ctx.stop();
        }
      } catch (error) {
        return;
      }
    });
  });
};

AudioManager.prototype.isMusicEnabled = function () {
  return this.musicEnabled;
};

AudioManager.prototype.isSfxEnabled = function () {
  return this.sfxEnabled;
};

AudioManager.prototype.destroy = function () {
  var self = this;

  if (this.bgmContext && typeof this.bgmContext.destroy === 'function') {
    this.bgmContext.destroy();
  }
  this.bgmContext = null;
  this.currentBgmKey = '';
  this.desiredBgmKey = '';

  Object.keys(this.sfxPools).forEach(function (key) {
    self.sfxPools[key].forEach(function (ctx) {
      if (ctx && typeof ctx.destroy === 'function') {
        ctx.destroy();
      }
    });
  });

  this.sfxPools = {};
  this.lastSfxAt = {};
};

module.exports = {
  AUDIO_MANIFEST: AUDIO_MANIFEST,
  AudioManager: AudioManager
};
