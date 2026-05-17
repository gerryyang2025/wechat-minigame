'use strict';

var BGM_SRC = 'assets/audio/bgm.mp3';
var BGM_VOLUME = 0.18;

function AudioManager() {
  this.context = null;
  this.master = null;
  this.bgm = null;
  this.bgmSrc = BGM_SRC;
  this.bgmPlaying = false;
  this.bgmMuted = false;
  this.enabled = true;
  this.lastPlayed = {};
}

AudioManager.prototype.ensure = function () {
  var AudioContextCtor;
  if (this.context || !this.enabled) {
    return this.context;
  }
  try {
    if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
      this.context = wx.createWebAudioContext();
    } else {
      AudioContextCtor = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
      if (!AudioContextCtor && typeof GameGlobal !== 'undefined') {
        AudioContextCtor = GameGlobal.AudioContext || GameGlobal.webkitAudioContext || null;
      }
      if (AudioContextCtor) {
        this.context = new AudioContextCtor();
      }
    }
  } catch (error) {
    this.enabled = false;
    return null;
  }
  if (!this.context) {
    this.enabled = false;
    return null;
  }
  this.master = this.context.createGain();
  this.master.gain.value = 0.22;
  this.master.connect(this.context.destination);
  return this.context;
};

AudioManager.prototype.resume = function () {
  var ctx = this.ensure();
  if (ctx && ctx.resume) {
    try {
      ctx.resume();
    } catch (error) {
      return;
    }
  }
};

AudioManager.prototype.resolveBgmSource = function (src) {
  return src || BGM_SRC;
};

AudioManager.prototype.destroyBgm = function () {
  if (this.bgm) {
    if (this.bgm.stop) {
      try {
        this.bgm.stop();
      } catch (error) {}
    }
    if (this.bgm.destroy) {
      try {
        this.bgm.destroy();
      } catch (error) {}
    }
  }
  this.bgm = null;
  this.bgmPlaying = false;
};

AudioManager.prototype.setBgmSource = function (src) {
  var nextSrc = this.resolveBgmSource(src);
  if (nextSrc === this.bgmSrc) {
    return;
  }
  this.destroyBgm();
  this.bgmSrc = nextSrc;
};

AudioManager.prototype.createBgm = function (src) {
  var bgm;
  var self = this;
  this.setBgmSource(src);
  if (this.bgm) {
    return this.bgm;
  }
  if (typeof wx === 'undefined' || !wx.createInnerAudioContext) {
    return null;
  }
  try {
    bgm = wx.createInnerAudioContext();
    bgm.src = this.bgmSrc;
    bgm.loop = true;
    bgm.autoplay = false;
    bgm.volume = BGM_VOLUME;
    bgm.obeyMuteSwitch = true;
    if (bgm.onPlay) {
      bgm.onPlay(function () {
        self.bgmPlaying = true;
      });
    }
    if (bgm.onPause) {
      bgm.onPause(function () {
        self.bgmPlaying = false;
      });
    }
    if (bgm.onStop) {
      bgm.onStop(function () {
        self.bgmPlaying = false;
      });
    }
    if (bgm.onEnded) {
      bgm.onEnded(function () {
        self.bgmPlaying = false;
      });
    }
    if (bgm.onError) {
      bgm.onError(function () {
        self.bgmPlaying = false;
      });
    }
    this.bgm = bgm;
  } catch (error) {
    this.bgm = null;
  }
  return this.bgm;
};

AudioManager.prototype.playBgm = function (src) {
  var bgm;
  if (this.bgmMuted) {
    return;
  }
  this.setBgmSource(src);
  if (this.bgmPlaying) {
    return;
  }
  bgm = this.createBgm(this.bgmSrc);
  if (!bgm || !bgm.play) {
    return;
  }
  try {
    bgm.play();
  } catch (error) {
    this.bgmPlaying = false;
  }
};

AudioManager.prototype.pauseBgm = function () {
  if (!this.bgm || !this.bgm.pause) {
    return;
  }
  try {
    this.bgm.pause();
  } catch (error) {
    return;
  }
  this.bgmPlaying = false;
};

AudioManager.prototype.stopBgm = function () {
  if (!this.bgm || !this.bgm.stop) {
    return;
  }
  try {
    this.bgm.stop();
  } catch (error) {
    return;
  }
  this.bgmPlaying = false;
};

AudioManager.prototype.destroy = function () {
  this.destroyBgm();
  if (this.master) {
    try {
      this.master.disconnect();
    } catch (error) {}
  }
  this.master = null;
};

AudioManager.prototype.now = function () {
  var ctx = this.ensure();
  return ctx ? ctx.currentTime : 0;
};

AudioManager.prototype.canPlay = function (key, interval, now) {
  var last = this.lastPlayed[key] || -999;
  if (now - last < interval) {
    return false;
  }
  this.lastPlayed[key] = now;
  return true;
};

AudioManager.prototype.setParam = function (param, value, time) {
  if (!param) {
    return;
  }
  if (param.setValueAtTime) {
    param.setValueAtTime(value, time);
  } else {
    param.value = value;
  }
};

AudioManager.prototype.exp = function (param, value, time) {
  if (!param) {
    return;
  }
  if (param.exponentialRampToValueAtTime) {
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), time);
  } else {
    param.value = value;
  }
};

AudioManager.prototype.tone = function (frequency, delay, duration, volume, type) {
  var ctx = this.ensure();
  var osc;
  var gain;
  var start;
  if (!ctx || !this.master) {
    return;
  }
  start = ctx.currentTime + (delay || 0);
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  osc.type = type || 'sine';
  this.setParam(osc.frequency, frequency, start);
  this.setParam(gain.gain, 0.0001, start);
  this.exp(gain.gain, Math.max(0.0002, volume || 0.05), start + 0.012);
  this.exp(gain.gain, 0.0001, start + (duration || 0.1));
  osc.connect(gain);
  gain.connect(this.master);
  osc.start(start);
  osc.stop(start + (duration || 0.1) + 0.03);
};

AudioManager.prototype.sweep = function (from, to, delay, duration, volume) {
  var ctx = this.ensure();
  var osc;
  var gain;
  var start;
  if (!ctx || !this.master) {
    return;
  }
  start = ctx.currentTime + (delay || 0);
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  osc.type = 'triangle';
  this.setParam(osc.frequency, from, start);
  if (osc.frequency.exponentialRampToValueAtTime) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
  }
  this.setParam(gain.gain, 0.0001, start);
  this.exp(gain.gain, volume || 0.06, start + 0.01);
  this.exp(gain.gain, 0.0001, start + duration);
  osc.connect(gain);
  gain.connect(this.master);
  osc.start(start);
  osc.stop(start + duration + 0.03);
};

AudioManager.prototype.noise = function (delay, duration, volume, cutoff) {
  var ctx = this.ensure();
  var buffer;
  var data;
  var i;
  var source;
  var gain;
  var filter;
  var start;
  if (!ctx || !this.master || !ctx.createBuffer) {
    return;
  }
  start = ctx.currentTime + (delay || 0);
  buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  data = buffer.getChannelData(0);
  for (i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  source = ctx.createBufferSource();
  gain = ctx.createGain();
  filter = ctx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = 'lowpass';
  this.setParam(filter.frequency, cutoff || 1200, start);
  this.setParam(gain.gain, volume || 0.04, start);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.master);
  source.start(start);
};

AudioManager.prototype.playClick = function () {
  this.resume();
  this.tone(520, 0, 0.055, 0.045, 'triangle');
};

AudioManager.prototype.playAimStart = function () {
  var now = this.now();
  if (!this.canPlay('aimStart', 0.18, now)) {
    return;
  }
  this.tone(360, 0, 0.05, 0.028, 'sine');
  this.tone(540, 0.045, 0.06, 0.026, 'triangle');
};

AudioManager.prototype.playAimTick = function () {
  var now = this.now();
  if (!this.canPlay('aimTick', 0.13, now)) {
    return;
  }
  this.tone(720, 0, 0.025, 0.018, 'sine');
};

AudioManager.prototype.playShoot = function (count) {
  this.resume();
  this.sweep(240, 720, 0, 0.18, 0.065);
  this.tone(880, 0.06, 0.06, Math.min(0.08, 0.03 + count * 0.003), 'square');
};

AudioManager.prototype.playBounce = function () {
  var now = this.now();
  if (!this.canPlay('bounce', 0.035, now)) {
    return;
  }
  this.tone(420, 0, 0.04, 0.035, 'sine');
};

AudioManager.prototype.playPaddleCatch = function () {
  var now = this.now();
  if (!this.canPlay('paddle', 0.045, now)) {
    return;
  }
  this.tone(520, 0, 0.045, 0.04, 'triangle');
  this.tone(780, 0.035, 0.055, 0.028, 'sine');
};

AudioManager.prototype.playBrickHit = function (strong) {
  var now = this.now();
  if (!this.canPlay('hit', 0.025, now)) {
    return;
  }
  this.tone(strong ? 210 : 330, 0, 0.055, strong ? 0.07 : 0.045, 'triangle');
  this.noise(0, strong ? 0.06 : 0.035, strong ? 0.03 : 0.015, strong ? 420 : 900);
};

AudioManager.prototype.playBrickBreak = function (colorKey, strong) {
  var base = {
    green: 610,
    blue: 760,
    gold: 480,
    violet: 690,
    crimson: 260
  }[colorKey] || 560;
  var now = this.now();
  if (!this.canPlay('break:' + colorKey, 0.03, now)) {
    return;
  }
  this.tone(base, 0, 0.045, strong ? 0.05 : 0.035, 'triangle');
  this.tone(base * 1.32, 0.035, 0.05, strong ? 0.04 : 0.026, 'sine');
};

AudioManager.prototype.playPowerDrop = function (type) {
  var base = {
    split: 820,
    heavy: 300,
    shotgun: 620,
    bomb: 220,
    laser: 980
  }[type] || 560;
  var now = this.now();
  if (!this.canPlay('powerDrop', 0.08, now)) {
    return;
  }
  this.tone(base, 0, 0.08, 0.035, 'triangle');
  this.tone(base * 0.75, 0.055, 0.07, 0.025, 'sine');
};

AudioManager.prototype.playPower = function (type) {
  var base = {
    split: 660,
    heavy: 260,
    shotgun: 520,
    bomb: 180,
    laser: 920
  }[type] || 520;
  this.tone(base, 0, 0.08, 0.06, 'triangle');
  this.tone(base * 1.5, 0.07, 0.09, 0.045, 'sine');
};

AudioManager.prototype.playReady = function () {
  var now = this.now();
  if (!this.canPlay('ready', 0.4, now)) {
    return;
  }
  this.tone(440, 0, 0.055, 0.035, 'triangle');
  this.tone(660, 0.06, 0.07, 0.035, 'sine');
};

AudioManager.prototype.playLaser = function () {
  this.sweep(880, 1320, 0, 0.16, 0.07);
};

AudioManager.prototype.playBomb = function () {
  this.noise(0, 0.22, 0.09, 260);
  this.sweep(130, 70, 0, 0.22, 0.05);
};

AudioManager.prototype.playUpgrade = function () {
  this.tone(392, 0, 0.08, 0.055, 'triangle');
  this.tone(523.25, 0.08, 0.08, 0.055, 'triangle');
  this.tone(783.99, 0.16, 0.12, 0.06, 'sine');
};

AudioManager.prototype.playClear = function () {
  this.tone(523.25, 0, 0.09, 0.055, 'triangle');
  this.tone(659.25, 0.09, 0.09, 0.055, 'triangle');
  this.tone(783.99, 0.18, 0.09, 0.055, 'triangle');
  this.tone(1046.5, 0.28, 0.18, 0.06, 'sine');
};

AudioManager.prototype.playGameOver = function () {
  this.sweep(360, 120, 0, 0.4, 0.07);
  this.noise(0.08, 0.2, 0.035, 360);
};

AudioManager.prototype.playEditorPlace = function (tool) {
  var now = this.now();
  if (!this.canPlay('editor', 0.045, now)) {
    return;
  }
  if (tool === 'erase') {
    this.sweep(420, 260, 0, 0.06, 0.035);
    return;
  }
  this.tone(tool === 'wall' ? 260 : 620, 0, 0.055, 0.035, tool === 'wall' ? 'square' : 'triangle');
};

module.exports = AudioManager;
