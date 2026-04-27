'use strict';

var TOWER_TYPES = {
  tabby: {
    key: 'tabby',
    name: '橘猫',
    role: '速射',
    cost: 40,
    range: 96,
    fireRate: 1.75,
    damage: 12,
    projectileSpeed: 280,
    projectileType: 'bean',
    upgradeCosts: [50, 80],
    upgradeDamage: [18, 26],
    upgradeRange: [110, 124],
    tint: '#ffb05c'
  },
  siamese: {
    key: 'siamese',
    name: '暹罗',
    role: '狙击',
    cost: 80,
    range: 168,
    fireRate: 0.62,
    damage: 40,
    projectileSpeed: 320,
    projectileType: 'bone',
    upgradeCosts: [90, 130],
    upgradeDamage: [58, 78],
    upgradeRange: [186, 206],
    tint: '#8dc5ff'
  },
  chonky: {
    key: 'chonky',
    name: '肥橘',
    role: '溅射',
    cost: 100,
    range: 92,
    fireRate: 0.7,
    damage: 28,
    projectileSpeed: 180,
    projectileType: 'bun',
    splashRadius: 46,
    upgradeCosts: [110, 150],
    upgradeDamage: [40, 56],
    upgradeRange: [104, 116],
    tint: '#ff7f7f'
  },
  boba: {
    key: 'boba',
    name: '三花',
    role: '减速',
    cost: 60,
    range: 120,
    fireRate: 1.15,
    damage: 8,
    projectileSpeed: 250,
    projectileType: 'boba',
    slowAmount: 0.5,
    slowDuration: 1800,
    upgradeCosts: [70, 100],
    upgradeDamage: [11, 15],
    upgradeRange: [132, 148],
    tint: '#7ed7c1'
  }
};

var ENEMY_TYPES = {
  dust: {
    key: 'dust',
    name: '灰团',
    maxHealth: 34,
    speed: 54,
    reward: 6,
    damage: 1,
    size: 20,
    tint: '#b4b9c6'
  },
  cucumber: {
    key: 'cucumber',
    name: '黄瓜怪',
    maxHealth: 84,
    speed: 64,
    reward: 10,
    damage: 1,
    size: 26,
    tint: '#6bc36a'
  },
  vacuum: {
    key: 'vacuum',
    name: '吸尘器',
    maxHealth: 200,
    speed: 34,
    reward: 24,
    damage: 2,
    size: 34,
    tint: '#8ca2d8'
  },
  mailman: {
    key: 'mailman',
    name: '邮差',
    maxHealth: 500,
    speed: 28,
    reward: 70,
    damage: 4,
    size: 42,
    tint: '#f5b06f'
  }
};

var STAGE_ORDER = ['living_room', 'kitchen_loop'];

var STAGE_DEFS = {
  living_room: {
    key: 'living_room',
    title: '客厅防线',
    objective: '守住金枪鱼罐头',
    summary: '标准双折路线',
    badge: '推荐入门',
    introHint: '点选猫塔，再点空塔位建造。',
    targetLabel: '罐头',
    theme: {
      pathColor: '#d8b185',
      pathGlow: 'rgba(255,255,255,0.65)',
      markerTint: 'rgba(255,255,255,0.34)',
      underlayFill: 'rgba(255, 242, 221, 0.58)',
      underlayStroke: 'rgba(124, 93, 60, 0.08)',
      gridStroke: 'rgba(154, 120, 82, 0.07)',
      spawnFill: 'rgba(86, 60, 35, 0.86)',
      targetRing: 'rgba(255, 227, 154, 0.28)',
      targetFill: '#ffe39a',
      targetCap: '#ffd16c',
      targetInk: '#7d5318'
    },
    startingGold: 140,
    startingLives: 10,
    waveDelayMs: 4200,
    waves: [
      {
        label: '第1波',
        spawns: [
          { type: 'dust', delay: 0 },
          { type: 'dust', delay: 520 },
          { type: 'dust', delay: 520 },
          { type: 'cucumber', delay: 820 }
        ]
      },
      {
        label: '第2波',
        spawns: [
          { type: 'dust', delay: 0 },
          { type: 'cucumber', delay: 420 },
          { type: 'dust', delay: 420 },
          { type: 'cucumber', delay: 420 },
          { type: 'cucumber', delay: 620 }
        ]
      },
      {
        label: '第3波',
        spawns: [
          { type: 'vacuum', delay: 0 },
          { type: 'dust', delay: 650 },
          { type: 'dust', delay: 360 },
          { type: 'cucumber', delay: 380 },
          { type: 'cucumber', delay: 380 }
        ]
      },
      {
        label: '第4波',
        spawns: [
          { type: 'vacuum', delay: 0 },
          { type: 'cucumber', delay: 560 },
          { type: 'cucumber', delay: 460 },
          { type: 'vacuum', delay: 860 }
        ]
      },
      {
        label: '第5波',
        spawns: [
          { type: 'mailman', delay: 0 },
          { type: 'cucumber', delay: 760 },
          { type: 'vacuum', delay: 700 },
          { type: 'cucumber', delay: 500 }
        ]
      }
    ]
  },
  kitchen_loop: {
    key: 'kitchen_loop',
    title: '厨房回旋',
    objective: '守住冰箱门',
    summary: '长折返路线 · 减速推荐',
    badge: '减速优先',
    introHint: '这条路线更长，三花减速塔更适合拖住重怪。',
    targetLabel: '冰箱',
    theme: {
      pathColor: '#b6c8d6',
      pathGlow: 'rgba(239, 249, 255, 0.6)',
      markerTint: 'rgba(232, 246, 255, 0.34)',
      underlayFill: 'rgba(235, 243, 248, 0.64)',
      underlayStroke: 'rgba(97, 121, 141, 0.1)',
      gridStroke: 'rgba(118, 145, 167, 0.09)',
      spawnFill: 'rgba(62, 82, 96, 0.9)',
      targetRing: 'rgba(172, 225, 255, 0.28)',
      targetFill: '#d5eef9',
      targetCap: '#c3e1ee',
      targetInk: '#476272'
    },
    startingGold: 160,
    startingLives: 9,
    waveDelayMs: 4000,
    towerTuning: {
      boba: {
        range: 132,
        damage: 9,
        slowAmount: 0.42,
        slowDuration: 2400,
        upgradeDamage: [13, 18],
        upgradeRange: [146, 162]
      }
    },
    waves: [
      {
        label: '第1波',
        spawns: [
          { type: 'dust', delay: 0 },
          { type: 'cucumber', delay: 520 },
          { type: 'dust', delay: 420 },
          { type: 'cucumber', delay: 560 },
          { type: 'dust', delay: 360 }
        ]
      },
      {
        label: '第2波',
        spawns: [
          { type: 'cucumber', delay: 0 },
          { type: 'dust', delay: 420 },
          { type: 'cucumber', delay: 420 },
          { type: 'cucumber', delay: 520 },
          { type: 'dust', delay: 300 },
          { type: 'cucumber', delay: 480 }
        ]
      },
      {
        label: '第3波',
        spawns: [
          { type: 'vacuum', delay: 0 },
          { type: 'cucumber', delay: 460 },
          { type: 'dust', delay: 320 },
          { type: 'cucumber', delay: 320 },
          { type: 'vacuum', delay: 920 }
        ]
      },
      {
        label: '第4波',
        spawns: [
          { type: 'vacuum', delay: 0 },
          { type: 'cucumber', delay: 460 },
          { type: 'vacuum', delay: 760 },
          { type: 'cucumber', delay: 420 },
          { type: 'cucumber', delay: 360 },
          { type: 'dust', delay: 260 }
        ]
      },
      {
        label: '第5波',
        spawns: [
          { type: 'mailman', delay: 0 },
          { type: 'vacuum', delay: 680 },
          { type: 'cucumber', delay: 420 },
          { type: 'vacuum', delay: 620 },
          { type: 'cucumber', delay: 360 },
          { type: 'cucumber', delay: 320 }
        ]
      }
    ]
  }
};

function createLivingRoomPath(width, playTop, playBottom) {
  var fieldHeight = playBottom - playTop;
  return [
    { x: -36, y: playTop + fieldHeight * 0.2 },
    { x: width * 0.78, y: playTop + fieldHeight * 0.2 },
    { x: width * 0.78, y: playTop + fieldHeight * 0.44 },
    { x: width * 0.22, y: playTop + fieldHeight * 0.44 },
    { x: width * 0.22, y: playTop + fieldHeight * 0.72 },
    { x: width * 0.84, y: playTop + fieldHeight * 0.72 },
    { x: width + 40, y: playTop + fieldHeight * 0.72 }
  ];
}

function createKitchenLoopPath(width, playTop, playBottom) {
  var fieldHeight = playBottom - playTop;
  return [
    { x: -36, y: playTop + fieldHeight * 0.18 },
    { x: width * 0.64, y: playTop + fieldHeight * 0.18 },
    { x: width * 0.64, y: playTop + fieldHeight * 0.34 },
    { x: width * 0.18, y: playTop + fieldHeight * 0.34 },
    { x: width * 0.18, y: playTop + fieldHeight * 0.54 },
    { x: width * 0.82, y: playTop + fieldHeight * 0.54 },
    { x: width * 0.82, y: playTop + fieldHeight * 0.76 },
    { x: width * 0.32, y: playTop + fieldHeight * 0.76 },
    { x: width + 40, y: playTop + fieldHeight * 0.76 }
  ];
}

function createLivingRoomSlots(width, playTop, playBottom) {
  var fieldHeight = playBottom - playTop;
  return [
    { x: width * 0.22, y: playTop + fieldHeight * 0.14, radius: 30 },
    { x: width * 0.44, y: playTop + fieldHeight * 0.16, radius: 30 },
    { x: width * 0.62, y: playTop + fieldHeight * 0.16, radius: 30 },
    { x: width * 0.54, y: playTop + fieldHeight * 0.33, radius: 30 },
    { x: width * 0.36, y: playTop + fieldHeight * 0.34, radius: 30 },
    { x: width * 0.84, y: playTop + fieldHeight * 0.4, radius: 30 },
    { x: width * 0.1, y: playTop + fieldHeight * 0.52, radius: 30 },
    { x: width * 0.5, y: playTop + fieldHeight * 0.58, radius: 30 },
    { x: width * 0.68, y: playTop + fieldHeight * 0.62, radius: 30 },
    { x: width * 0.88, y: playTop + fieldHeight * 0.82, radius: 30 }
  ];
}

function createKitchenLoopSlots(width, playTop, playBottom) {
  var fieldHeight = playBottom - playTop;
  return [
    { x: width * 0.14, y: playTop + fieldHeight * 0.14, radius: 30 },
    { x: width * 0.38, y: playTop + fieldHeight * 0.12, radius: 30 },
    { x: width * 0.72, y: playTop + fieldHeight * 0.16, radius: 30 },
    { x: width * 0.5, y: playTop + fieldHeight * 0.28, radius: 30 },
    { x: width * 0.12, y: playTop + fieldHeight * 0.3, radius: 30 },
    { x: width * 0.22, y: playTop + fieldHeight * 0.48, radius: 30 },
    { x: width * 0.5, y: playTop + fieldHeight * 0.46, radius: 30 },
    { x: width * 0.86, y: playTop + fieldHeight * 0.48, radius: 30 },
    { x: width * 0.74, y: playTop + fieldHeight * 0.7, radius: 30 },
    { x: width * 0.42, y: playTop + fieldHeight * 0.72, radius: 30 }
  ];
}

function cloneTowerTypes(baseTypes) {
  var cloned = {};

  Object.keys(baseTypes).forEach(function (key) {
    cloned[key] = {
      key: baseTypes[key].key,
      name: baseTypes[key].name,
      role: baseTypes[key].role,
      cost: baseTypes[key].cost,
      range: baseTypes[key].range,
      fireRate: baseTypes[key].fireRate,
      damage: baseTypes[key].damage,
      projectileSpeed: baseTypes[key].projectileSpeed,
      projectileType: baseTypes[key].projectileType,
      splashRadius: baseTypes[key].splashRadius || 0,
      slowAmount: baseTypes[key].slowAmount || 1,
      slowDuration: baseTypes[key].slowDuration || 0,
      upgradeCosts: (baseTypes[key].upgradeCosts || []).slice(),
      upgradeDamage: (baseTypes[key].upgradeDamage || []).slice(),
      upgradeRange: (baseTypes[key].upgradeRange || []).slice(),
      tint: baseTypes[key].tint
    };
  });

  return cloned;
}

function applyTowerTuning(towerTypes, tuning) {
  if (!tuning) {
    return towerTypes;
  }

  Object.keys(tuning).forEach(function (towerKey) {
    if (!towerTypes[towerKey]) {
      return;
    }
    Object.keys(tuning[towerKey]).forEach(function (field) {
      var value = tuning[towerKey][field];
      towerTypes[towerKey][field] = Array.isArray(value) ? value.slice() : value;
    });
  });

  return towerTypes;
}

function assignSlotIds(slots) {
  return slots.map(function (slot, index) {
    return {
      id: 'slot-' + (index + 1),
      x: slot.x,
      y: slot.y,
      radius: slot.radius
    };
  });
}

function createStageLayout(stageKey, width, playTop, playBottom) {
  if (stageKey === 'kitchen_loop') {
    return {
      path: createKitchenLoopPath(width, playTop, playBottom),
      slots: assignSlotIds(createKitchenLoopSlots(width, playTop, playBottom))
    };
  }

  return {
    path: createLivingRoomPath(width, playTop, playBottom),
    slots: assignSlotIds(createLivingRoomSlots(width, playTop, playBottom))
  };
}

function createStageData(width, height, scale, stageKey, layoutOverrides) {
  var def = STAGE_DEFS[stageKey] || STAGE_DEFS.living_room;
  var topHudHeight = layoutOverrides && layoutOverrides.topHudHeight !== undefined ? layoutOverrides.topHudHeight : 104 * scale;
  var bottomHudHeight = layoutOverrides && layoutOverrides.bottomHudHeight !== undefined ? layoutOverrides.bottomHudHeight : 164 * scale;
  var playTopGap = layoutOverrides && layoutOverrides.playTopGap !== undefined ? layoutOverrides.playTopGap : 18 * scale;
  var playBottomGap = layoutOverrides && layoutOverrides.playBottomGap !== undefined ? layoutOverrides.playBottomGap : 12 * scale;
  var playTop = topHudHeight + playTopGap;
  var playBottom = height - bottomHudHeight - playBottomGap;
  var layout = createStageLayout(def.key, width, playTop, playBottom);
  var path = layout.path;
  var towerTypes = applyTowerTuning(cloneTowerTypes(TOWER_TYPES), def.towerTuning);

  return {
    key: def.key,
    title: def.title,
    objective: def.objective,
    summary: def.summary,
    badge: def.badge,
    introHint: def.introHint,
    theme: def.theme,
    startingGold: def.startingGold,
    startingLives: def.startingLives,
    waveDelayMs: def.waveDelayMs,
    topHudHeight: topHudHeight,
    bottomHudHeight: bottomHudHeight,
    playTop: playTop,
    playBottom: playBottom,
    path: path,
    target: {
      x: width - 70 * scale,
      y: path[path.length - 1].y,
      radius: 24 * scale,
      label: def.targetLabel
    },
    buildSlots: layout.slots,
    towerTypes: towerTypes,
    enemyTypes: ENEMY_TYPES,
    waves: def.waves
  };
}

function getStageCatalog() {
  return STAGE_ORDER.map(function (stageKey) {
    var def = STAGE_DEFS[stageKey];
    return {
      key: def.key,
      title: def.title,
      objective: def.objective,
      summary: def.summary,
      badge: def.badge,
      waveCount: def.waves.length
    };
  });
}

module.exports = {
  TOWER_TYPES: TOWER_TYPES,
  ENEMY_TYPES: ENEMY_TYPES,
  STAGE_ORDER: STAGE_ORDER,
  getStageCatalog: getStageCatalog,
  createStageData: createStageData
};
