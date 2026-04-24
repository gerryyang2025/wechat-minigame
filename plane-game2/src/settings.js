'use strict';

var STORAGE_KEY = 'plane-battle-user-settings';

var DEFAULT_SETTINGS = {
  musicEnabled: true,
  sfxEnabled: true,
  vibrationEnabled: true
};

function cloneDefaults() {
  return {
    musicEnabled: DEFAULT_SETTINGS.musicEnabled,
    sfxEnabled: DEFAULT_SETTINGS.sfxEnabled,
    vibrationEnabled: DEFAULT_SETTINGS.vibrationEnabled
  };
}

function sanitizeSettings(settings) {
  var next = cloneDefaults();
  var source = settings || {};

  next.musicEnabled = source.musicEnabled !== undefined ? !!source.musicEnabled : next.musicEnabled;
  next.sfxEnabled = source.sfxEnabled !== undefined ? !!source.sfxEnabled : next.sfxEnabled;
  next.vibrationEnabled = source.vibrationEnabled !== undefined ? !!source.vibrationEnabled : next.vibrationEnabled;

  return next;
}

function loadSettings() {
  try {
    return sanitizeSettings(wx.getStorageSync(STORAGE_KEY));
  } catch (error) {
    return cloneDefaults();
  }
}

function saveSettings(settings) {
  var sanitized = sanitizeSettings(settings);

  try {
    wx.setStorageSync(STORAGE_KEY, sanitized);
  } catch (error) {
    return sanitized;
  }

  return sanitized;
}

function updateSettings(currentSettings, patch) {
  var next = sanitizeSettings(Object.assign({}, currentSettings || cloneDefaults(), patch || {}));
  return saveSettings(next);
}

module.exports = {
  DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  loadSettings: loadSettings,
  saveSettings: saveSettings,
  updateSettings: updateSettings,
  sanitizeSettings: sanitizeSettings
};
