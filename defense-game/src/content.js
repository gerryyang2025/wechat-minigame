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
    tint: '#6bc36a',
    sprintProgressRatio: 0.58,
    sprintDurationMs: 900,
    sprintSpeedMultiplier: 1.85,
    sprintIgnoresSlow: true
  },
  vacuum: {
    key: 'vacuum',
    name: '吸尘器',
    maxHealth: 200,
    speed: 34,
    reward: 24,
    damage: 2,
    size: 34,
    tint: '#8ca2d8',
    armor: 5,
    armorBreakRatio: 0.42,
    slowResistance: 0.45
  },
  mailman: {
    key: 'mailman',
    name: '邮差',
    maxHealth: 500,
    speed: 28,
    reward: 70,
    damage: 4,
    size: 42,
    tint: '#f5b06f',
    enrageHealthRatio: 0.52,
    enrageSpeedMultiplier: 1.28,
    enrageSlowResistance: 0.38,
    summonOnEnrage: [
      { type: 'dust', count: 1 },
      { type: 'cucumber', count: 1 }
    ]
  }
};

var STAGE_ORDER = ['living_room', 'kitchen_loop'];
var DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];
var DEFAULT_DIFFICULTY_KEY = 'normal';

var DIFFICULTY_DEFS = {
  easy: {
    key: 'easy',
    title: '轻松',
    badge: '轻松',
    summary: '更多资源 · 节奏更缓',
    goldOffset: 30,
    livesOffset: 2,
    waveDelayMultiplier: 1.12,
    spawnDelayMultiplier: 1.06,
    enemyHealthMultiplier: 0.88,
    enemySpeedMultiplier: 0.92,
    enemyRewardMultiplier: 1,
    enemyDamageOffset: 0,
    armorOffset: -1,
    slowResistanceOffset: -0.08,
    sprintSpeedBonus: -0.12,
    sprintDurationMultiplier: 0.9,
    enrageSpeedBonus: -0.08,
    summonCountOffset: 0
  },
  normal: {
    key: 'normal',
    title: '标准',
    badge: '标准',
    summary: '默认节奏 · 推荐体验',
    goldOffset: 0,
    livesOffset: 0,
    waveDelayMultiplier: 1,
    spawnDelayMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyRewardMultiplier: 1,
    enemyDamageOffset: 0,
    armorOffset: 0,
    slowResistanceOffset: 0,
    sprintSpeedBonus: 0,
    sprintDurationMultiplier: 1,
    enrageSpeedBonus: 0,
    summonCountOffset: 0
  },
  hard: {
    key: 'hard',
    title: '困难',
    badge: '困难',
    summary: '少资源 · 快节奏 · 强敌机制',
    goldOffset: -25,
    livesOffset: -2,
    waveDelayMultiplier: 0.82,
    spawnDelayMultiplier: 0.84,
    enemyHealthMultiplier: 1.22,
    enemySpeedMultiplier: 1.1,
    enemyRewardMultiplier: 1.05,
    enemyDamageOffset: 1,
    armorOffset: 1,
    slowResistanceOffset: 0.12,
    sprintSpeedBonus: 0.18,
    sprintDurationMultiplier: 1.08,
    enrageSpeedBonus: 0.12,
    summonCountOffset: 1
  }
};

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
    waves: null
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
    waves: null
  }
};

STAGE_DEFS.living_room.waves = createLivingRoomWaves();
STAGE_DEFS.kitchen_loop.waves = createKitchenLoopWaves();

function buildWave(label, spawns) {
  return {
    label: label,
    spawns: spawns
  };
}

function createLivingRoomWaves() {
  return [
    buildWave('第1波', [
      { type: 'dust', delay: 0 },
      { type: 'dust', delay: 520 },
      { type: 'dust', delay: 520 },
      { type: 'cucumber', delay: 820 }
    ]),
    buildWave('第2波', [
      { type: 'dust', delay: 0 },
      { type: 'cucumber', delay: 420 },
      { type: 'dust', delay: 420 },
      { type: 'cucumber', delay: 420 },
      { type: 'cucumber', delay: 620 }
    ]),
    buildWave('第3波', [
      { type: 'vacuum', delay: 0 },
      { type: 'dust', delay: 650 },
      { type: 'dust', delay: 360 },
      { type: 'cucumber', delay: 380 },
      { type: 'cucumber', delay: 380 }
    ]),
    buildWave('第4波', [
      { type: 'vacuum', delay: 0 },
      { type: 'cucumber', delay: 560 },
      { type: 'cucumber', delay: 460 },
      { type: 'vacuum', delay: 860 }
    ]),
    buildWave('第5波', [
      { type: 'mailman', delay: 0 },
      { type: 'cucumber', delay: 760 },
      { type: 'vacuum', delay: 700 },
      { type: 'cucumber', delay: 500 }
    ]),
    buildWave('第6波', [
      { type: 'dust', delay: 0 },
      { type: 'cucumber', delay: 260 },
      { type: 'dust', delay: 220 },
      { type: 'cucumber', delay: 280 },
      { type: 'cucumber', delay: 260 },
      { type: 'vacuum', delay: 680 },
      { type: 'dust', delay: 240 }
    ]),
    buildWave('第7波', [
      { type: 'vacuum', delay: 0 },
      { type: 'cucumber', delay: 360 },
      { type: 'vacuum', delay: 520 },
      { type: 'dust', delay: 240 },
      { type: 'cucumber', delay: 260 },
      { type: 'vacuum', delay: 620 }
    ]),
    buildWave('第8波', [
      { type: 'vacuum', delay: 0 },
      { type: 'cucumber', delay: 320 },
      { type: 'cucumber', delay: 220 },
      { type: 'vacuum', delay: 520 },
      { type: 'dust', delay: 180 },
      { type: 'cucumber', delay: 220 },
      { type: 'dust', delay: 180 },
      { type: 'cucumber', delay: 220 }
    ]),
    buildWave('第9波', [
      { type: 'mailman', delay: 0 },
      { type: 'vacuum', delay: 460 },
      { type: 'cucumber', delay: 220 },
      { type: 'vacuum', delay: 420 },
      { type: 'dust', delay: 180 },
      { type: 'cucumber', delay: 220 }
    ]),
    buildWave('第10波', [
      { type: 'mailman', delay: 0 },
      { type: 'vacuum', delay: 380 },
      { type: 'cucumber', delay: 180 },
      { type: 'vacuum', delay: 340 },
      { type: 'dust', delay: 160 },
      { type: 'cucumber', delay: 180 },
      { type: 'vacuum', delay: 340 },
      { type: 'cucumber', delay: 180 },
      { type: 'dust', delay: 150 }
    ])
  ];
}

function createKitchenLoopWaves() {
  return [
    buildWave('第1波', [
      { type: 'dust', delay: 0 },
      { type: 'cucumber', delay: 520 },
      { type: 'dust', delay: 420 },
      { type: 'cucumber', delay: 560 },
      { type: 'dust', delay: 360 }
    ]),
    buildWave('第2波', [
      { type: 'cucumber', delay: 0 },
      { type: 'dust', delay: 420 },
      { type: 'cucumber', delay: 420 },
      { type: 'cucumber', delay: 520 },
      { type: 'dust', delay: 300 },
      { type: 'cucumber', delay: 480 }
    ]),
    buildWave('第3波', [
      { type: 'vacuum', delay: 0 },
      { type: 'cucumber', delay: 460 },
      { type: 'dust', delay: 320 },
      { type: 'cucumber', delay: 320 },
      { type: 'vacuum', delay: 920 }
    ]),
    buildWave('第4波', [
      { type: 'vacuum', delay: 0 },
      { type: 'cucumber', delay: 460 },
      { type: 'vacuum', delay: 760 },
      { type: 'cucumber', delay: 420 },
      { type: 'cucumber', delay: 360 },
      { type: 'dust', delay: 260 }
    ]),
    buildWave('第5波', [
      { type: 'mailman', delay: 0 },
      { type: 'vacuum', delay: 680 },
      { type: 'cucumber', delay: 420 },
      { type: 'vacuum', delay: 620 },
      { type: 'cucumber', delay: 360 },
      { type: 'cucumber', delay: 320 }
    ]),
    buildWave('第6波', [
      { type: 'cucumber', delay: 0 },
      { type: 'dust', delay: 220 },
      { type: 'cucumber', delay: 220 },
      { type: 'vacuum', delay: 520 },
      { type: 'dust', delay: 200 },
      { type: 'cucumber', delay: 220 },
      { type: 'vacuum', delay: 540 },
      { type: 'dust', delay: 180 }
    ]),
    buildWave('第7波', [
      { type: 'vacuum', delay: 0 },
      { type: 'vacuum', delay: 460 },
      { type: 'cucumber', delay: 260 },
      { type: 'cucumber', delay: 220 },
      { type: 'dust', delay: 180 },
      { type: 'vacuum', delay: 520 }
    ]),
    buildWave('第8波', [
      { type: 'vacuum', delay: 0 },
      { type: 'cucumber', delay: 240 },
      { type: 'dust', delay: 160 },
      { type: 'cucumber', delay: 200 },
      { type: 'vacuum', delay: 420 },
      { type: 'cucumber', delay: 200 },
      { type: 'dust', delay: 150 },
      { type: 'cucumber', delay: 180 },
      { type: 'vacuum', delay: 460 }
    ]),
    buildWave('第9波', [
      { type: 'mailman', delay: 0 },
      { type: 'vacuum', delay: 420 },
      { type: 'cucumber', delay: 220 },
      { type: 'vacuum', delay: 340 },
      { type: 'dust', delay: 160 },
      { type: 'cucumber', delay: 180 },
      { type: 'vacuum', delay: 380 }
    ]),
    buildWave('第10波', [
      { type: 'mailman', delay: 0 },
      { type: 'vacuum', delay: 320 },
      { type: 'cucumber', delay: 160 },
      { type: 'vacuum', delay: 280 },
      { type: 'dust', delay: 140 },
      { type: 'cucumber', delay: 160 },
      { type: 'vacuum', delay: 320 },
      { type: 'dust', delay: 140 },
      { type: 'cucumber', delay: 160 }
    ])
  ];
}

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

function cloneEnemyTypes(baseTypes) {
  var cloned = {};

  Object.keys(baseTypes).forEach(function (key) {
    cloned[key] = {
      key: baseTypes[key].key,
      name: baseTypes[key].name,
      maxHealth: baseTypes[key].maxHealth,
      speed: baseTypes[key].speed,
      reward: baseTypes[key].reward,
      damage: baseTypes[key].damage,
      size: baseTypes[key].size,
      tint: baseTypes[key].tint,
      armor: baseTypes[key].armor || 0,
      armorBreakRatio: baseTypes[key].armorBreakRatio || 0,
      slowResistance: baseTypes[key].slowResistance || 0,
      sprintProgressRatio: baseTypes[key].sprintProgressRatio || 0,
      sprintDurationMs: baseTypes[key].sprintDurationMs || 0,
      sprintSpeedMultiplier: baseTypes[key].sprintSpeedMultiplier || 1,
      sprintIgnoresSlow: !!baseTypes[key].sprintIgnoresSlow,
      enrageHealthRatio: baseTypes[key].enrageHealthRatio || 0,
      enrageSpeedMultiplier: baseTypes[key].enrageSpeedMultiplier || 1,
      enrageSlowResistance: baseTypes[key].enrageSlowResistance || 0,
      summonOnEnrage: baseTypes[key].summonOnEnrage
        ? baseTypes[key].summonOnEnrage.map(function (entry) {
          return {
            type: entry.type,
            count: entry.count
          };
        })
        : null
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

function applyDifficultyToEnemyTypes(enemyTypes, difficultyMeta) {
  Object.keys(enemyTypes).forEach(function (enemyKey) {
    var enemy = enemyTypes[enemyKey];

    enemy.maxHealth = Math.max(1, Math.round(enemy.maxHealth * difficultyMeta.enemyHealthMultiplier));
    enemy.speed = enemy.speed * difficultyMeta.enemySpeedMultiplier;
    enemy.reward = Math.max(1, Math.round(enemy.reward * difficultyMeta.enemyRewardMultiplier));
    enemy.damage = Math.max(1, enemy.damage + difficultyMeta.enemyDamageOffset);
    enemy.armor = Math.max(0, enemy.armor + difficultyMeta.armorOffset);
    enemy.slowResistance = Math.max(0, Math.min(0.85, enemy.slowResistance + difficultyMeta.slowResistanceOffset));

    if (enemy.sprintDurationMs) {
      enemy.sprintDurationMs = Math.max(280, Math.round(enemy.sprintDurationMs * difficultyMeta.sprintDurationMultiplier));
      enemy.sprintSpeedMultiplier = Math.max(1.08, enemy.sprintSpeedMultiplier + difficultyMeta.sprintSpeedBonus);
    }

    if (enemy.enrageSpeedMultiplier > 1) {
      enemy.enrageSpeedMultiplier = Math.max(1.05, enemy.enrageSpeedMultiplier + difficultyMeta.enrageSpeedBonus);
    }

    if (enemy.summonOnEnrage && difficultyMeta.summonCountOffset) {
      enemy.summonOnEnrage = enemy.summonOnEnrage.map(function (entry) {
        return {
          type: entry.type,
          count: Math.max(1, entry.count + difficultyMeta.summonCountOffset)
        };
      });
    }
  });

  return enemyTypes;
}

function applyDifficultyToWaves(waves, difficultyMeta) {
  return waves.map(function (wave, waveIndex) {
    return {
      label: wave.label,
      spawns: wave.spawns.map(function (spawn, spawnIndex) {
        if (spawnIndex === 0) {
          return {
            type: spawn.type,
            delay: spawn.delay
          };
        }

        return {
          type: spawn.type,
          delay: Math.max(
            90,
            Math.round(
              spawn.delay *
              difficultyMeta.spawnDelayMultiplier *
              (waveIndex >= 6 ? 0.95 : 1)
            )
          )
        };
      })
    };
  });
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

function getPathLength(path) {
  var total = 0;
  var i;
  var dx;
  var dy;

  for (i = 0; i < path.length - 1; i += 1) {
    dx = path[i + 1].x - path[i].x;
    dy = path[i + 1].y - path[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }

  return total;
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

function createStageData(width, height, scale, stageKey, difficultyKey, layoutOverrides) {
  var def = STAGE_DEFS[stageKey] || STAGE_DEFS.living_room;
  var difficultyMeta = DIFFICULTY_DEFS[difficultyKey] || DIFFICULTY_DEFS[DEFAULT_DIFFICULTY_KEY];
  var topHudHeight = layoutOverrides && layoutOverrides.topHudHeight !== undefined ? layoutOverrides.topHudHeight : 104 * scale;
  var bottomHudHeight = layoutOverrides && layoutOverrides.bottomHudHeight !== undefined ? layoutOverrides.bottomHudHeight : 164 * scale;
  var playTopGap = layoutOverrides && layoutOverrides.playTopGap !== undefined ? layoutOverrides.playTopGap : 18 * scale;
  var playBottomGap = layoutOverrides && layoutOverrides.playBottomGap !== undefined ? layoutOverrides.playBottomGap : 12 * scale;
  var playTop = topHudHeight + playTopGap;
  var playBottom = height - bottomHudHeight - playBottomGap;
  var layout = createStageLayout(def.key, width, playTop, playBottom);
  var path = layout.path;
  var towerTypes = applyTowerTuning(cloneTowerTypes(TOWER_TYPES), def.towerTuning);
  var enemyTypes;
  var waves;

  enemyTypes = applyDifficultyToEnemyTypes(cloneEnemyTypes(ENEMY_TYPES), difficultyMeta);
  waves = applyDifficultyToWaves(def.waves, difficultyMeta);

  return {
    key: def.key,
    title: def.title,
    objective: def.objective,
    summary: def.summary,
    badge: def.badge,
    difficultyKey: difficultyMeta.key,
    difficulty: {
      key: difficultyMeta.key,
      title: difficultyMeta.title,
      badge: difficultyMeta.badge,
      summary: difficultyMeta.summary
    },
    introHint: def.introHint,
    theme: def.theme,
    startingGold: Math.max(40, def.startingGold + difficultyMeta.goldOffset),
    startingLives: Math.max(3, def.startingLives + difficultyMeta.livesOffset),
    waveDelayMs: Math.max(1200, Math.round(def.waveDelayMs * difficultyMeta.waveDelayMultiplier)),
    topHudHeight: topHudHeight,
    bottomHudHeight: bottomHudHeight,
    playTop: playTop,
    playBottom: playBottom,
    path: path,
    pathLength: getPathLength(path),
    target: {
      x: width - 70 * scale,
      y: path[path.length - 1].y,
      radius: 24 * scale,
      label: def.targetLabel
    },
    buildSlots: layout.slots,
    towerTypes: towerTypes,
    enemyTypes: enemyTypes,
    waves: waves
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

function getDifficultyCatalog() {
  return DIFFICULTY_ORDER.map(function (difficultyKey) {
    var def = DIFFICULTY_DEFS[difficultyKey];
    return {
      key: def.key,
      title: def.title,
      badge: def.badge,
      summary: def.summary
    };
  });
}

module.exports = {
  TOWER_TYPES: TOWER_TYPES,
  ENEMY_TYPES: ENEMY_TYPES,
  STAGE_ORDER: STAGE_ORDER,
  DIFFICULTY_ORDER: DIFFICULTY_ORDER,
  DEFAULT_DIFFICULTY_KEY: DEFAULT_DIFFICULTY_KEY,
  DIFFICULTY_DEFS: DIFFICULTY_DEFS,
  getStageCatalog: getStageCatalog,
  getDifficultyCatalog: getDifficultyCatalog,
  createStageData: createStageData
};
