'use strict';

function AudioManager() {
  this.context = null;
  this.master = null;
  this.musicGain = null;
  this.enabled = true;
  this.started = false;
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
  this.master.gain.value = 0.24;
  this.master.connect(this.context.destination);

  this.musicGain = this.context.createGain();
  this.musicGain.gain.value = 0.0;
  this.musicGain.connect(this.master);

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

AudioManager.prototype.destroy = function () {
  if (this.musicGain) {
    try {
      this.musicGain.disconnect();
    } catch (error) {
      return;
    }
  }
  if (this.master) {
    try {
      this.master.disconnect();
    } catch (error2) {
      return;
    }
  }
};

AudioManager.prototype.getContextTime = function () {
  var ctx = this.context || this.ensure();
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

AudioManager.prototype.safeSet = function (param, value, time) {
  if (!param) {
    return;
  }
  if (param.setValueAtTime) {
    param.setValueAtTime(value, time);
  } else {
    param.value = value;
  }
};

AudioManager.prototype.safeExpRamp = function (param, value, time) {
  if (!param) {
    return;
  }
  if (param.exponentialRampToValueAtTime) {
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), time);
  } else {
    param.value = value;
  }
};

AudioManager.prototype.safeLinearRamp = function (param, value, time) {
  if (!param) {
    return;
  }
  if (param.linearRampToValueAtTime) {
    param.linearRampToValueAtTime(value, time);
  } else {
    param.value = value;
  }
};

AudioManager.prototype.safeTarget = function (param, value, time, constant) {
  if (!param) {
    return;
  }
  if (param.setTargetAtTime) {
    param.setTargetAtTime(value, time, constant);
  } else {
    param.value = value;
  }
};

AudioManager.prototype.startAmbient = function () {
  var ctx = this.ensure();
  var now;
  if (!ctx || this.started) {
    return;
  }

  this.started = true;
  now = ctx.currentTime;
  this.scheduleTone(146.83, now, 4.8, 0.018, 'sine', this.musicGain);
  this.scheduleTone(196.00, now + 1.2, 5.2, 0.014, 'triangle', this.musicGain);
  this.scheduleTone(246.94, now + 2.8, 6.4, 0.01, 'sine', this.musicGain);
  this.schedulePulse(now + 0.4, 999);
  this.safeTarget(this.musicGain.gain, 0.34, now, 1.5);
};

AudioManager.prototype.schedulePulse = function (start, duration) {
  var ctx = this.context;
  var osc;
  var gain;
  if (!ctx || !this.musicGain) {
    return;
  }
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  osc.type = 'sine';
  this.safeSet(osc.frequency, 0.18, start);
  this.safeSet(gain.gain, 0.01, start);
  this.safeTarget(gain.gain, 0.0035, start + 0.2, 4.0);
  osc.connect(gain);
  gain.connect(this.musicGain);
  osc.start(start);
  osc.stop(start + duration);
};

AudioManager.prototype.scheduleTone = function (frequency, start, duration, volume, type, destination) {
  var ctx = this.context || this.ensure();
  var osc;
  var gain;
  var filter;
  if (!ctx || !destination) {
    return;
  }
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  filter = ctx.createBiquadFilter();
  osc.type = type || 'sine';
  this.safeSet(osc.frequency, frequency, start);
  filter.type = 'lowpass';
  this.safeSet(filter.frequency, 840, start);
  this.safeSet(gain.gain, 0.0001, start);
  this.safeExpRamp(gain.gain, Math.max(0.0002, volume), start + 0.18);
  this.safeExpRamp(gain.gain, 0.0001, start + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

AudioManager.prototype.playClick = function () {
  this.playBlip(540, 0.0, 0.055, 'triangle', 0.07);
};

AudioManager.prototype.playSelect = function (kind) {
  var tones = {
    militia: 330,
    archer: 392,
    ranger: 294,
    monk: 523.25,
    star: 659.25
  };
  var base = tones[kind] || 420;
  var now = this.getContextTime();
  if (!this.canPlay('select', 0.045, now)) {
    return;
  }
  this.playBlip(base, 0.0, 0.055, 'triangle', 0.06);
  this.playBlip(base * 1.5, 0.045, 0.06, 'sine', 0.04);
};

AudioManager.prototype.playDeny = function () {
  var now = this.getContextTime();
  if (!this.canPlay('deny', 0.12, now)) {
    return;
  }
  this.playSweep(220, 130, 0.0, 0.14, 'sine', 0.055);
  this.playNoiseBurst(now + 0.02, 0.06, 0.025, 340);
};

AudioManager.prototype.playCommand = function () {
  this.playBlip(360, 0.02, 0.08, 'sine', 0.07);
  this.playBlip(540, 0.1, 0.08, 'triangle', 0.06);
  this.playNoiseBurst(this.getContextTime(), 0.045, 0.016, 720);
};

AudioManager.prototype.playSkill = function (kind) {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  this.resume();
  now = ctx.currentTime;
  if (!this.canPlay('skill-' + kind, 0.18, now)) {
    return;
  }
  if (kind === 'volley') {
    this.playBlip(659.25, 0.0, 0.08, 'triangle', 0.06);
    this.playBlip(880, 0.08, 0.1, 'triangle', 0.05);
    return;
  }
  if (kind === 'decoy') {
    this.playBlip(392, 0.0, 0.2, 'sine', 0.045);
    this.playBlip(783.99, 0.08, 0.28, 'triangle', 0.05);
    this.playBlip(1174.66, 0.24, 0.22, 'sine', 0.035);
    return;
  }
  if (kind === 'prison') {
    this.playSweep(174.61, 261.63, 0.0, 0.34, 'sine', 0.075);
    this.playBlip(523.25, 0.15, 0.22, 'triangle', 0.052);
    this.playNoiseBurst(now + 0.03, 0.18, 0.04, 260);
    return;
  }
  if (kind === 'starburst') {
    this.playSweep(392, 1567.98, 0.0, 0.32, 'sine', 0.075);
    this.playBlip(1046.5, 0.18, 0.18, 'triangle', 0.07);
    this.playNoiseBurst(now + 0.24, 0.34, 0.08, 520);
    return;
  }
  this.playBlip(523.25, 0.02, 0.1, 'triangle', 0.055);
  this.playBlip(783.99, 0.13, 0.14, 'sine', 0.05);
  this.playBlip(1046.5, 0.25, 0.16, 'triangle', 0.045);
};

AudioManager.prototype.playWave = function () {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  this.resume();
  now = ctx.currentTime;
  this.playNoiseBurst(now, 0.3, 0.12, 180);
  this.playSweep(110, 73.42, 0.05, 0.28, 'sine', 0.08);
  this.playBlip(98, 0.26, 0.24, 'sine', 0.07);
  this.playBlip(146.83, 0.43, 0.2, 'triangle', 0.06);
};

AudioManager.prototype.playBoatLanding = function () {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('boat', 0.28, now)) {
    return;
  }
  this.playNoiseBurst(now, 0.22, 0.11, 220);
  this.playSweep(132, 86, 0.02, 0.18, 'triangle', 0.075);
  this.playNoiseBurst(now + 0.16, 0.12, 0.055, 760);
};

AudioManager.prototype.playEnemySpawn = function (type) {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('spawn-' + type, 0.25, now)) {
    return;
  }
  this.playBlip(type === 'runner' ? 196 : 146.83, 0.0, 0.13, 'sawtooth', 0.045);
  this.playNoiseBurst(now + 0.05, 0.1, type === 'shield' ? 0.055 : 0.04, type === 'shield' ? 420 : 680);
};

AudioManager.prototype.playAttack = function (kind, delay) {
  var ctx = this.ensure();
  var now;
  var offset = delay || 0;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime + offset;
  if (!this.canPlay('attack-' + kind, 0.035, now)) {
    return;
  }
  if (kind === 'arrow') {
    this.playSweep(780, 540, offset, 0.085, 'triangle', 0.035);
    this.playNoiseBurst(now + 0.01, 0.045, 0.012, 1550);
    return;
  }
  if (kind === 'knife') {
    this.playSweep(620, 330, offset, 0.075, 'sawtooth', 0.03);
    this.playNoiseBurst(now, 0.04, 0.012, 1240);
    return;
  }
  if (kind === 'star') {
    this.playBlip(987.77, offset, 0.13, 'sine', 0.04);
    this.playBlip(1480, offset + 0.055, 0.09, 'triangle', 0.032);
    return;
  }
  if (kind === 'fist') {
    this.playSweep(180, 96, offset, 0.095, 'triangle', 0.04);
    this.playNoiseBurst(now, 0.055, 0.03, 520);
    return;
  }
  this.playSweep(240, 118, offset, 0.1, 'triangle', 0.052);
  this.playNoiseBurst(now + 0.01, 0.06, 0.038, 760);
};

AudioManager.prototype.playEnemyAttack = function (type) {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('enemy-attack', 0.045, now)) {
    return;
  }
  if (type === 'shield') {
    this.playSweep(170, 110, 0.0, 0.1, 'triangle', 0.06);
    this.playNoiseBurst(now + 0.02, 0.08, 0.045, 420);
    return;
  }
  if (type === 'runner') {
    this.playSweep(430, 240, 0.0, 0.07, 'sawtooth', 0.036);
    this.playNoiseBurst(now, 0.045, 0.022, 1120);
    return;
  }
  this.playSweep(260, 150, 0.0, 0.09, 'triangle', 0.05);
  this.playNoiseBurst(now + 0.01, 0.055, 0.032, 780);
};

AudioManager.prototype.playImpact = function (kind) {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('impact-' + kind, 0.035, now)) {
    return;
  }
  if (kind === 'arrow') {
    this.playBlip(980, 0.0, 0.035, 'triangle', 0.035);
    this.playNoiseBurst(now, 0.04, 0.018, 1500);
    return;
  }
  if (kind === 'knife') {
    this.playBlip(740, 0.0, 0.045, 'square', 0.03);
    this.playNoiseBurst(now, 0.04, 0.02, 1180);
    return;
  }
  if (kind === 'star') {
    this.playBlip(1318.51, 0.0, 0.12, 'sine', 0.045);
    this.playNoiseBurst(now + 0.02, 0.08, 0.025, 900);
    return;
  }
  if (kind === 'decoy') {
    this.playBlip(880, 0.0, 0.08, 'sine', 0.04);
    this.playBlip(440, 0.055, 0.08, 'triangle', 0.035);
    return;
  }
  this.playHit();
};

AudioManager.prototype.playHit = function () {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('hit', 0.04, now)) {
    return;
  }
  this.playNoiseBurst(now, 0.055, 0.035, 980);
};

AudioManager.prototype.playHouseHit = function (destroyed) {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay(destroyed ? 'house-down' : 'house-hit', destroyed ? 0.35 : 0.12, now)) {
    return;
  }
  this.playNoiseBurst(now, destroyed ? 0.32 : 0.12, destroyed ? 0.11 : 0.05, destroyed ? 260 : 520);
  this.playSweep(destroyed ? 140 : 280, destroyed ? 74 : 160, 0.02, destroyed ? 0.24 : 0.1, 'triangle', destroyed ? 0.075 : 0.045);
};

AudioManager.prototype.playEnemyDown = function (type) {
  var ctx = this.ensure();
  var now;
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('enemy-down', 0.07, now)) {
    return;
  }
  this.playSweep(type === 'runner' ? 220 : 160, 74, 0.0, 0.13, 'sine', 0.04);
  this.playNoiseBurst(now + 0.02, 0.09, 0.028, 520);
};

AudioManager.prototype.playSquadDown = function (kind) {
  var ctx = this.ensure();
  var now;
  var base = kind === 'star' ? 440 : (kind === 'monk' ? 392 : 330);
  if (!ctx) {
    return;
  }
  now = ctx.currentTime;
  if (!this.canPlay('squad-down', 0.4, now)) {
    return;
  }
  this.playBlip(base, 0.0, 0.18, 'triangle', 0.052);
  this.playBlip(base * 0.75, 0.16, 0.22, 'sine', 0.045);
  this.playNoiseBurst(now + 0.08, 0.18, 0.036, 420);
};

AudioManager.prototype.playVictory = function () {
  this.playBlip(392, 0.04, 0.12, 'triangle', 0.065);
  this.playBlip(493.88, 0.18, 0.12, 'triangle', 0.06);
  this.playBlip(659.25, 0.34, 0.34, 'sine', 0.07);
  this.playBlip(987.77, 0.5, 0.28, 'triangle', 0.042);
};

AudioManager.prototype.playDefeat = function () {
  this.playBlip(220, 0.12, 0.16, 'sine', 0.065);
  this.playBlip(164.81, 0.34, 0.2, 'sine', 0.06);
  this.playBlip(110, 0.62, 0.34, 'triangle', 0.065);
  this.playNoiseBurst(this.getContextTime() + 0.1, 0.46, 0.065, 230);
};

AudioManager.prototype.playBlip = function (frequency, offset, duration, type, volume) {
  var ctx = this.ensure();
  var osc;
  var gain;
  var start;
  if (!ctx || !this.master) {
    return;
  }
  this.resume();
  start = ctx.currentTime + (offset || 0);
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  osc.type = type || 'sine';
  this.safeSet(osc.frequency, frequency, start);
  this.safeExpRamp(osc.frequency, Math.max(40, frequency * 0.74), start + duration);
  this.safeSet(gain.gain, 0.0001, start);
  this.safeExpRamp(gain.gain, volume || 0.12, start + 0.012);
  this.safeExpRamp(gain.gain, 0.0001, start + duration);
  osc.connect(gain);
  gain.connect(this.master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

AudioManager.prototype.playSweep = function (fromFrequency, toFrequency, offset, duration, type, volume) {
  var ctx = this.ensure();
  var osc;
  var gain;
  var filter;
  var start;
  if (!ctx || !this.master) {
    return;
  }
  this.resume();
  start = ctx.currentTime + (offset || 0);
  osc = ctx.createOscillator();
  gain = ctx.createGain();
  filter = ctx.createBiquadFilter();
  osc.type = type || 'sine';
  filter.type = 'lowpass';
  this.safeSet(filter.frequency, 1800, start);
  this.safeSet(osc.frequency, Math.max(40, fromFrequency), start);
  this.safeExpRamp(osc.frequency, Math.max(40, toFrequency), start + duration);
  this.safeSet(gain.gain, 0.0001, start);
  this.safeExpRamp(gain.gain, volume || 0.06, start + 0.012);
  this.safeExpRamp(gain.gain, 0.0001, start + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(this.master);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

AudioManager.prototype.playNoiseBurst = function (start, duration, volume, cutoff) {
  var ctx = this.context || this.ensure();
  var buffer;
  var data;
  var i;
  var source;
  var gain;
  var filter;
  if (!ctx || !this.master || !ctx.createBuffer) {
    return;
  }
  buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  data = buffer.getChannelData(0);
  for (i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  source = ctx.createBufferSource();
  gain = ctx.createGain();
  filter = ctx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = 'bandpass';
  this.safeSet(filter.frequency, cutoff || 700, start);
  this.safeSet(filter.Q, 0.9, start);
  this.safeSet(gain.gain, volume || 0.08, start);
  this.safeExpRamp(gain.gain, 0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.master);
  source.start(start);
  source.stop(start + duration + 0.02);
};

module.exports = AudioManager;
