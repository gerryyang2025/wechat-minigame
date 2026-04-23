'use strict';

function MiniGameAudio() {
  this.enabled = typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
  this.bgm = null;
  this.bgmStarted = false;
  this.bgmDesired = false;
  this.settings = {
    musicEnabled: true,
    sfxEnabled: true
  };
  this.effectPools = {};
}

MiniGameAudio.prototype.updateSettings = function (settings) {
  this.settings.musicEnabled = settings && settings.musicEnabled !== undefined
    ? !!settings.musicEnabled
    : this.settings.musicEnabled;
  this.settings.sfxEnabled = settings && settings.sfxEnabled !== undefined
    ? !!settings.sfxEnabled
    : this.settings.sfxEnabled;

  if (!this.settings.musicEnabled && this.bgm) {
    try {
      this.bgm.pause();
      this.bgmStarted = false;
    } catch (error) {
      return;
    }
  } else if (this.settings.musicEnabled && this.bgmDesired && this.bgm) {
    try {
      this.bgm.play();
      this.bgmStarted = true;
    } catch (error) {
      return;
    }
  }
};

MiniGameAudio.prototype.getAssetPath = function (path) {
  return path.charAt(0) === '/' ? path.slice(1) : path;
};

MiniGameAudio.prototype.init = function () {
  if (!this.enabled || this.bgm) {
    return;
  }

  this.bgm = this.createContext(this.getAssetPath('audio/bgm3.mp3'), {
    loop: true,
    volume: 0.32
  });

  this.effectPools.hit = this.createPool(this.getAssetPath('audio/hit.wav'), 3, 0.45, true);
  this.effectPools.levelup = this.createPool(this.getAssetPath('audio/levelup.wav'), 2, 0.42, true);
  this.effectPools.gameover = this.createPool(this.getAssetPath('audio/gameover.wav'), 1, 0.52, false);
  this.effectPools.start = this.createPool(this.getAssetPath('audio/start.wav'), 1, 0.46, false);
};

MiniGameAudio.prototype.createContext = function (src, options) {
  if (!this.enabled) {
    return null;
  }

  var context = null;
  var createOptions = options && options.useWebAudio ? { useWebAudioImplement: true } : undefined;

  try {
    context = createOptions ? wx.createInnerAudioContext(createOptions) : wx.createInnerAudioContext();
  } catch (error) {
    context = wx.createInnerAudioContext();
  }

  context.src = src;
  context.loop = !!(options && options.loop);
  context.volume = options && options.volume !== undefined ? options.volume : 1;
  context.autoplay = false;
  if (context.obeyMuteSwitch !== undefined) {
    context.obeyMuteSwitch = false;
  }

  return context;
};

MiniGameAudio.prototype.createPool = function (src, size, volume, useWebAudio) {
  var contexts = [];

  for (var i = 0; i < size; i += 1) {
    contexts.push(this.createContext(src, {
      volume: volume,
      useWebAudio: useWebAudio
    }));
  }

  return {
    cursor: 0,
    contexts: contexts
  };
};

MiniGameAudio.prototype.restartContext = function (context, stopFirst) {
  if (!context) {
    return;
  }

  try {
    if (stopFirst && context.stop) {
      context.stop();
    }
  } catch (error) {
    return;
  }

  try {
    if (context.seek) {
      context.seek(0);
    }
  } catch (error) {
    return;
  }

  try {
    context.play();
  } catch (error) {
    return;
  }
};

MiniGameAudio.prototype.playEffect = function (name) {
  if (!this.enabled || !this.settings.sfxEnabled) {
    return;
  }

  var pool = this.effectPools[name];

  if (!pool || !pool.contexts.length) {
    return;
  }

  var context = pool.contexts[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.contexts.length;
  this.restartContext(context, false);
};

MiniGameAudio.prototype.stopEffect = function (name) {
  if (!this.enabled) {
    return;
  }

  var pool = this.effectPools[name];

  if (!pool) {
    return;
  }

  for (var i = 0; i < pool.contexts.length; i += 1) {
    try {
      pool.contexts[i].stop();
    } catch (error) {
      continue;
    }
  }
};

MiniGameAudio.prototype.stopAllEffects = function () {
  if (!this.enabled) {
    return;
  }

  var names = Object.keys(this.effectPools);

  for (var i = 0; i < names.length; i += 1) {
    this.stopEffect(names[i]);
  }
};

MiniGameAudio.prototype.startBgm = function () {
  if (!this.enabled || !this.bgm) {
    return;
  }

  this.bgmDesired = true;

  if (!this.settings.musicEnabled) {
    return;
  }

  this.bgmStarted = true;
  this.restartContext(this.bgm, true);
};

MiniGameAudio.prototype.pauseBgm = function () {
  if (!this.enabled || !this.bgm || !this.bgmStarted || !this.settings.musicEnabled) {
    return;
  }

  try {
    this.bgm.pause();
  } catch (error) {
    return;
  }
};

MiniGameAudio.prototype.resumeBgm = function () {
  if (!this.enabled || !this.bgm || !this.bgmDesired || !this.settings.musicEnabled) {
    return;
  }

  try {
    this.bgmStarted = true;
    this.bgm.play();
  } catch (error) {
    return;
  }
};

MiniGameAudio.prototype.stopBgm = function () {
  if (!this.enabled || !this.bgm) {
    return;
  }

  this.bgmStarted = false;
  this.bgmDesired = false;

  try {
    this.bgm.stop();
  } catch (error) {
    return;
  }
};

MiniGameAudio.prototype.destroy = function () {
  if (!this.enabled) {
    return;
  }

  this.stopBgm();
  this.stopAllEffects();

  if (this.bgm && this.bgm.destroy) {
    this.bgm.destroy();
  }

  var names = Object.keys(this.effectPools);

  for (var i = 0; i < names.length; i += 1) {
    var pool = this.effectPools[names[i]];

    for (var j = 0; j < pool.contexts.length; j += 1) {
      if (pool.contexts[j] && pool.contexts[j].destroy) {
        pool.contexts[j].destroy();
      }
    }
  }

  this.effectPools = {};
  this.bgm = null;
  this.bgmStarted = false;
  this.bgmDesired = false;
};

module.exports = MiniGameAudio;
