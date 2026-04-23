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
    hudLabel: '双发',
    spawnLabel: '双发补给',
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
    spawnLabel: '火力补给',
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
  shield: {
    label: '盾',
    hudLabel: '护盾',
    spawnLabel: '护盾补给',
    pickupAccent: '#627989',
    ink: '#42535e',
    canopyFill: '#e3edf4',
    packageFill: '#a8c3d6',
    accent: '#627989',
    halo: 'rgba(92, 130, 161, 0.2)',
    badgeFill: 'rgba(232, 239, 242, 0.96)',
    badgeStroke: 'rgba(98, 121, 137, 0.5)',
    badgeText: '#42535e',
    shape: 'tag',
    icon: 'shield'
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
  },
  clear: {
    label: '净',
    hudLabel: '净空',
    spawnLabel: '净空补给',
    pickupAccent: '#6a685f',
    ink: '#47453f',
    canopyFill: '#efefe7',
    packageFill: '#cfcabf',
    accent: '#6a685f',
    halo: 'rgba(126, 123, 112, 0.18)',
    badgeFill: 'rgba(237, 235, 229, 0.96)',
    badgeStroke: 'rgba(106, 104, 95, 0.48)',
    badgeText: '#47453f',
    shape: 'tag',
    icon: 'clear'
  },
  slow: {
    label: '缓',
    hudLabel: '减速',
    spawnLabel: '减速补给',
    pickupAccent: '#5f7489',
    ink: '#44596b',
    canopyFill: '#dde7f0',
    packageFill: '#8fb3cd',
    accent: '#5f7489',
    halo: 'rgba(96, 141, 177, 0.22)',
    badgeFill: 'rgba(230, 236, 242, 0.96)',
    badgeStroke: 'rgba(95, 116, 137, 0.5)',
    badgeText: '#44596b',
    shape: 'note',
    icon: 'slow'
  },
  score: {
    label: '倍',
    hudLabel: '双倍',
    spawnLabel: '双倍补给',
    pickupAccent: '#8d7830',
    ink: '#5c4f22',
    canopyFill: '#f4eac6',
    packageFill: '#e0c55f',
    accent: '#8d7830',
    halo: 'rgba(192, 164, 56, 0.24)',
    badgeFill: 'rgba(241, 235, 214, 0.96)',
    badgeStroke: 'rgba(141, 120, 48, 0.5)',
    badgeText: '#5c4f22',
    shape: 'note',
    icon: 'score'
  }
};

function getPowerUpStyle(type) {
  return POWER_UP_STYLES[type] || DEFAULT_STYLE;
}

module.exports = {
  POWER_UP_STYLES: POWER_UP_STYLES,
  getPowerUpStyle: getPowerUpStyle
};
