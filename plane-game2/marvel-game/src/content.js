'use strict';

var HEROES = [
  {
    key: 'ironman',
    name: 'Iron Man',
    title: 'Repulsor Vanguard',
    primaryStyle: '#ce3f36',
    accentStyle: '#f7d352',
    glowStyle: '#63d8ff',
    maxHealth: 90,
    moveSpeed: 430,
    jumpSpeed: 780,
    gravity: 2100,
    bodyWidth: 42,
    bodyHeight: 74,
    maxAirJumps: 1,
    attackCooldown: 0.26,
    skillCooldown: 2.8,
    ultimateCooldown: 6.5,
    basicType: 'ranged',
    description: 'Fast ranged pressure, micro-missiles, and a beam ultimate.'
  },
  {
    key: 'thor',
    name: 'Thor',
    title: 'God of Thunder',
    primaryStyle: '#4f78d8',
    accentStyle: '#f1f3f7',
    glowStyle: '#8fe6ff',
    maxHealth: 110,
    moveSpeed: 370,
    jumpSpeed: 740,
    gravity: 2150,
    bodyWidth: 44,
    bodyHeight: 78,
    maxAirJumps: 1,
    attackCooldown: 0.42,
    skillCooldown: 3.6,
    ultimateCooldown: 7,
    basicType: 'melee',
    description: 'Balanced melee, hammer throw, and a lightning-area ultimate.'
  },
  {
    key: 'hulk',
    name: 'Hulk',
    title: 'Gamma Breaker',
    primaryStyle: '#5ca546',
    accentStyle: '#e8f0da',
    glowStyle: '#b8ff7a',
    maxHealth: 150,
    moveSpeed: 320,
    jumpSpeed: 720,
    gravity: 2250,
    bodyWidth: 56,
    bodyHeight: 88,
    maxAirJumps: 0,
    attackCooldown: 0.52,
    skillCooldown: 4.2,
    ultimateCooldown: 7.5,
    basicType: 'melee',
    description: 'Heavy HP pool, crushing melee, charge, and a slam ultimate.'
  }
];

function createLevelData(width, height, scale) {
  var floorY = height - 88 * scale;
  var worldWidth = 1880 * scale;
  var groundHeight = 44 * scale;
  var gateWidth = 76 * scale;
  var gateHeight = 120 * scale;

  return {
    name: 'Stark Ruins',
    objective: 'Clear the sentries and reach extraction.',
    worldWidth: worldWidth,
    floorY: floorY,
    exit: {
      x: worldWidth - 180 * scale,
      y: floorY - gateHeight,
      width: gateWidth,
      height: gateHeight
    },
    platforms: [
      { x: -80 * scale, y: floorY, width: worldWidth + 160 * scale, height: groundHeight, type: 'ground' },
      { x: 260 * scale, y: floorY - 118 * scale, width: 180 * scale, height: 22 * scale, type: 'metal' },
      { x: 590 * scale, y: floorY - 188 * scale, width: 170 * scale, height: 22 * scale, type: 'metal' },
      { x: 930 * scale, y: floorY - 136 * scale, width: 210 * scale, height: 22 * scale, type: 'metal' },
      { x: 1290 * scale, y: floorY - 230 * scale, width: 160 * scale, height: 22 * scale, type: 'metal' }
    ],
    enemies: [
      {
        x: 470 * scale,
        y: floorY - 74 * scale,
        width: 38 * scale,
        height: 68 * scale,
        patrolMin: 360 * scale,
        patrolMax: 680 * scale,
        maxHealth: 60,
        speed: 118,
        damage: 14
      },
      {
        x: 1010 * scale,
        y: floorY - 74 * scale,
        width: 38 * scale,
        height: 68 * scale,
        patrolMin: 900 * scale,
        patrolMax: 1180 * scale,
        maxHealth: 60,
        speed: 126,
        damage: 16
      },
      {
        x: 1490 * scale,
        y: floorY - 74 * scale,
        width: 38 * scale,
        height: 68 * scale,
        patrolMin: 1380 * scale,
        patrolMax: 1700 * scale,
        maxHealth: 70,
        speed: 130,
        damage: 18
      }
    ]
  };
}

module.exports = {
  HEROES: HEROES,
  createLevelData: createLevelData
};

