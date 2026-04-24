'use strict';

var DEFAULT_STYLE = {
  label: '补',
  hudLabel: '补给',
  spawnLabel: '补给',
  pickupAccent: '#5f554d',
  ink: '#4d453e',
  canopyFill: '#f5efe4',
  packageFill: '#efe6d8',
  accent: '#7a6b5c',
  halo: 'rgba(122, 107, 92, 0.16)',
  badgeFill: 'rgba(239, 230, 216, 0.96)',
  badgeStroke: 'rgba(113, 101, 89, 0.5)',
  badgeText: '#4d453e',
  shape: 'crate',
  icon: 'generic'
};

var POWER_UP_STYLES = {
  double: {
    label: '双',
    hudLabel: '双枪',
    spawnLabel: '双枪补给',
    pickupAccent: '#8b6b3f',
    ink: '#5a4428',
    canopyFill: '#f4e6c7',
    packageFill: '#dfbc74',
    accent: '#8b6b3f',
    halo: 'rgba(184, 141, 62, 0.22)',
    badgeFill: 'rgba(238, 228, 206, 0.96)',
    badgeStroke: 'rgba(139, 107, 63, 0.5)',
    badgeText: '#5a4428',
    shape: 'crate',
    icon: 'double'
  },
  firepower: {
    label: '火',
    hudLabel: '强火',
    spawnLabel: '超级火力',
    pickupAccent: '#9a5f31',
    ink: '#5a3822',
    canopyFill: '#f5dcc4',
    packageFill: '#dd9559',
    accent: '#9a5f31',
    halo: 'rgba(194, 116, 43, 0.24)',
    badgeFill: 'rgba(242, 228, 210, 0.97)',
    badgeStroke: 'rgba(154, 95, 49, 0.5)',
    badgeText: '#5a3822',
    shape: 'crate',
    icon: 'firepower'
  },
  bomb: {
    label: '炸',
    hudLabel: '炸弹',
    spawnLabel: '炸弹空投',
    pickupAccent: '#5a473d',
    ink: '#46372f',
    canopyFill: '#ede0d5',
    packageFill: '#b89a85',
    accent: '#5a473d',
    halo: 'rgba(106, 76, 58, 0.2)',
    badgeFill: 'rgba(233, 225, 217, 0.96)',
    badgeStroke: 'rgba(90, 71, 61, 0.52)',
    badgeText: '#46372f',
    shape: 'round',
    icon: 'bomb'
  }
};

function getPowerUpStyle(type) {
  return POWER_UP_STYLES[type] || DEFAULT_STYLE;
}

module.exports = {
  POWER_UP_STYLES: POWER_UP_STYLES,
  getPowerUpStyle: getPowerUpStyle
};
