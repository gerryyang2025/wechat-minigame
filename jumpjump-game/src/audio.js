'use strict';

function MiniGameAudio(sourceMap) {
  this.sourceMap = sourceMap || {};
  this.enabled = typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function';
  this.looping = null;
  this.active = [];
}

function removeActive(active, audio) {
  var index = active.indexOf(audio);

  if (index >= 0) {
    active.splice(index, 1);
  }
}

function stopAndDestroy(audio) {
  if (!audio) {
    return;
  }

  try {
    audio.stop();
    audio.destroy();
  } catch (error) {
    // Ignore cleanup failure.
  }
}

MiniGameAudio.prototype.createContext = function (key) {
  if (!this.enabled || !this.sourceMap[key]) {
    return null;
  }

  var audio = wx.createInnerAudioContext();
  audio.src = this.sourceMap[key];
  audio.obeyMuteSwitch = false;
  audio.autoplay = false;
  return audio;
};

MiniGameAudio.prototype.play = function (key, options) {
  if (!this.enabled) {
    return null;
  }

  var settings = options || {};
  var audio = this.createContext(key);

  if (!audio) {
    return null;
  }

  audio.loop = !!settings.loop;
  audio.volume = settings.volume === undefined ? 1 : settings.volume;

  if (settings.playbackRate !== undefined) {
    try {
      audio.playbackRate = settings.playbackRate;
    } catch (error) {
      // Ignore unsupported playback-rate changes.
    }
  }

  audio._miniGameKey = key;

  if (audio.loop) {
    this.stopLoop();
    this.looping = audio;
  } else {
    this.active.push(audio);
  }

  var self = this;

  audio.onEnded(function () {
    if (audio.loop) {
      return;
    }

    removeActive(self.active, audio);

    if (typeof settings.onEnded === 'function') {
      try {
        settings.onEnded();
      } catch (error) {
        // Ignore sound callback failure.
      }
    }

    try {
      audio.destroy();
    } catch (error) {
      return;
    }
  });

  audio.onError(function () {
    removeActive(self.active, audio);

    if (self.looping === audio) {
      self.looping = null;
    }

    try {
      audio.destroy();
    } catch (error) {
      return;
    }
  });

  try {
    audio.play();
  } catch (error) {
    removeActive(this.active, audio);

    if (this.looping === audio) {
      this.looping = null;
    }

    try {
      audio.destroy();
    } catch (destroyError) {
      return null;
    }
  }

  return audio;
};

MiniGameAudio.prototype.stop = function (key) {
  if (this.looping && this.looping._miniGameKey === key) {
    this.stopLoop();
  }

  for (var i = this.active.length - 1; i >= 0; i -= 1) {
    if (this.active[i]._miniGameKey === key) {
      stopAndDestroy(this.active[i]);
      this.active.splice(i, 1);
    }
  }
};

MiniGameAudio.prototype.stopMany = function (keys) {
  for (var i = 0; i < keys.length; i += 1) {
    this.stop(keys[i]);
  }
};

MiniGameAudio.prototype.stopLoop = function () {
  if (!this.looping) {
    return;
  }

  stopAndDestroy(this.looping);

  this.looping = null;
};

MiniGameAudio.prototype.stopAll = function () {
  this.stopLoop();

  for (var i = 0; i < this.active.length; i += 1) {
    stopAndDestroy(this.active[i]);
  }

  this.active.length = 0;
};

MiniGameAudio.prototype.destroy = function () {
  this.stopAll();
};

module.exports = MiniGameAudio;
