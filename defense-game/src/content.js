'use strict';

var TOWER_TYPES = {
  tabby: {
    key: 'tabby',
    name: '橘猫',
    role: '速射',
    cost: 40,
    durability: 120,
    range: 96,
    fireRate: 1.75,
    damage: 12,
    projectileSpeed: 280,
    projectileType: 'bean',
    upgradeCosts: [50, 80],
    upgradeDamage: [18, 26],
    upgradeRange: [110, 124],
    upgradeDurability: [144, 168],
    repairCostRatio: 0.24,
    tint: '#ffb05c'
  },
  siamese: {
    key: 'siamese',
    name: '暹罗',
    role: '狙击',
    cost: 80,
    durability: 95,
    range: 168,
    fireRate: 0.62,
    damage: 40,
    projectileSpeed: 320,
    projectileType: 'bone',
    upgradeCosts: [90, 130],
    upgradeDamage: [58, 78],
    upgradeRange: [186, 206],
    upgradeDurability: [114, 133],
    repairCostRatio: 0.28,
    tint: '#8dc5ff'
  },
  chonky: {
    key: 'chonky',
    name: '肥橘',
    role: '溅射',
    cost: 100,
    durability: 160,
    range: 92,
    fireRate: 0.7,
    damage: 28,
    projectileSpeed: 180,
    projectileType: 'bun',
    splashRadius: 46,
    upgradeCosts: [110, 150],
    upgradeDamage: [40, 56],
    upgradeRange: [104, 116],
    upgradeDurability: [192, 224],
    repairCostRatio: 0.26,
    tint: '#ff7f7f'
  },
  boba: {
    key: 'boba',
    name: '三花',
    role: '减速',
    cost: 60,
    durability: 105,
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
    upgradeDurability: [126, 147],
    repairCostRatio: 0.24,
    tint: '#7ed7c1'
  }
};

function createStatusEffect(type, durationMs, value) {
  var effect = {
    type: type,
    durationMs: durationMs
  };

  if (value !== undefined) {
    effect.value = value;
  }

  return effect;
}

function createAttackProfile(module, options) {
  var profile = {
    module: module,
    range: options.range || 0,
    engagementRadius: options.engagementRadius || options.range || 0,
    cooldownMs: options.cooldownMs || 1800,
    windupMs: options.windupMs || 220,
    recoveryMs: options.recoveryMs || 220,
    damage: options.damage || 0,
    targetMode: options.targetMode || 'nearest',
    projectileSpeed: options.projectileSpeed || 0,
    projectileKind: options.projectileKind || '',
    splashRadius: options.splashRadius || 0,
    radius: options.radius || 0,
    volleyCount: options.volleyCount || 1,
    volleySpacingMs: options.volleySpacingMs || 0,
    initialCooldownMs: options.initialCooldownMs || 0,
    statusEffects: (options.statusEffects || []).slice(),
    cueTitle: options.cueTitle || '',
    cueDetail: options.cueDetail || ''
  };

  return profile;
}

var ENEMY_TYPES = {
  dust: {
    key: 'dust',
    name: '灰团',
    assetKey: 'enemyDust',
    maxHealth: 34,
    speed: 54,
    reward: 6,
    damage: 1,
    size: 20,
    tint: '#b4b9c6',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 50,
      engagementRadius: 66,
      cooldownMs: 1650,
      windupMs: 180,
      recoveryMs: 220,
      damage: 4
    }),
    skillProfile: createAttackProfile('pressureAura', {
      range: 56,
      radius: 54,
      cooldownMs: 3800,
      windupMs: 260,
      recoveryMs: 320,
      damage: 1,
      statusEffects: [createStatusEffect('blinded', 700)],
      cueTitle: '灰团扬尘',
      cueDetail: '灰尘会短暂遮住猫塔视线'
    })
  },
  mailman2: {
    key: 'mailman2',
    name: '见习邮差',
    assetKey: 'enemyMailman2',
    maxHealth: 52,
    speed: 48,
    reward: 8,
    damage: 1,
    size: 22,
    tint: '#78aee6',
    attackProfile: createAttackProfile('rangedShot', {
      range: 92,
      engagementRadius: 104,
      cooldownMs: 1760,
      windupMs: 240,
      recoveryMs: 220,
      damage: 7,
      projectileSpeed: 210,
      projectileKind: 'parcel'
    }),
    skillProfile: createAttackProfile('controlCast', {
      range: 98,
      engagementRadius: 106,
      cooldownMs: 4200,
      windupMs: 300,
      recoveryMs: 260,
      damage: 9,
      projectileSpeed: 190,
      projectileKind: 'ticket',
      statusEffects: [createStatusEffect('suppressed', 900)],
      cueTitle: '误投包裹',
      cueDetail: '见习邮差会让猫塔短暂乱作一团'
    })
  },
  wildman: {
    key: 'wildman',
    name: '野人',
    assetKey: 'enemyWildman',
    maxHealth: 92,
    speed: 44,
    reward: 12,
    damage: 1,
    size: 24,
    tint: '#8a6a52',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 56,
      engagementRadius: 74,
      cooldownMs: 1720,
      windupMs: 260,
      recoveryMs: 280,
      damage: 10
    }),
    skillProfile: createAttackProfile('meleeStrike', {
      range: 58,
      engagementRadius: 76,
      cooldownMs: 4050,
      windupMs: 340,
      recoveryMs: 320,
      damage: 14,
      cueTitle: '野人重击',
      cueDetail: '野人会抡起木棒重创前排猫塔'
    })
  },
  cucumber: {
    key: 'cucumber',
    name: '黄瓜怪',
    assetKey: 'enemyCucumber',
    maxHealth: 84,
    speed: 64,
    reward: 10,
    damage: 1,
    size: 26,
    tint: '#6bc36a',
    sprintProgressRatio: 0.58,
    sprintDurationMs: 900,
    sprintSpeedMultiplier: 1.85,
    sprintIgnoresSlow: true,
    sprintCueTitle: '黄瓜怪冲刺',
    sprintCueDetail: '接近后段路线时会突然提速',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 54,
      engagementRadius: 70,
      cooldownMs: 1500,
      windupMs: 180,
      recoveryMs: 200,
      damage: 6
    }),
    skillProfile: createAttackProfile('meleeStrike', {
      range: 56,
      engagementRadius: 74,
      cooldownMs: 3300,
      windupMs: 220,
      recoveryMs: 220,
      damage: 8,
      statusEffects: [createStatusEffect('suppressed', 950)],
      cueTitle: '黄瓜拍击',
      cueDetail: '冲到脸上的黄瓜怪会打乱猫塔节奏'
    })
  },
  wildwoman: {
    key: 'wildwoman',
    name: '野性女猎',
    assetKey: 'enemyWildwoman',
    maxHealth: 78,
    speed: 60,
    reward: 11,
    damage: 1,
    size: 24,
    tint: '#c27a68',
    sprintProgressRatio: 0.56,
    sprintDurationMs: 760,
    sprintSpeedMultiplier: 1.52,
    sprintIgnoresSlow: false,
    sprintCueTitle: '野猎冲刺',
    sprintCueDetail: '女猎会在中后段突然提速',
    attackProfile: createAttackProfile('rangedShot', {
      range: 90,
      engagementRadius: 108,
      cooldownMs: 1680,
      windupMs: 240,
      recoveryMs: 220,
      damage: 7,
      projectileSpeed: 235,
      projectileKind: 'knife'
    }),
    skillProfile: createAttackProfile('controlCast', {
      range: 104,
      engagementRadius: 116,
      cooldownMs: 4300,
      windupMs: 280,
      recoveryMs: 240,
      damage: 4,
      projectileSpeed: 210,
      projectileKind: 'mark',
      targetMode: 'highestLevel',
      statusEffects: [createStatusEffect('marked', 2200)],
      cueTitle: '女猎标记',
      cueDetail: '被盯上的猫塔会更容易被后续攻击压垮'
    })
  },
  pirate: {
    key: 'pirate',
    name: '海盗',
    assetKey: 'enemyPirate',
    maxHealth: 112,
    speed: 58,
    reward: 14,
    damage: 2,
    size: 26,
    tint: '#1d3854',
    sprintProgressRatio: 0.55,
    sprintDurationMs: 820,
    sprintSpeedMultiplier: 1.6,
    sprintIgnoresSlow: false,
    cueTitle: '海盗登船',
    cueDetail: '移动更快，末段会趁乱抢线',
    sprintCueTitle: '海盗冲锋',
    sprintCueDetail: '它会趁防线间隙突然贴脸',
    attackProfile: createAttackProfile('rangedShot', {
      range: 104,
      engagementRadius: 118,
      cooldownMs: 1560,
      windupMs: 230,
      recoveryMs: 220,
      damage: 8,
      projectileSpeed: 250,
      projectileKind: 'shot'
    }),
    skillProfile: createAttackProfile('areaLob', {
      range: 112,
      engagementRadius: 120,
      cooldownMs: 4650,
      windupMs: 360,
      recoveryMs: 280,
      damage: 9,
      projectileSpeed: 176,
      projectileKind: 'bomb',
      splashRadius: 44,
      targetMode: 'clustered',
      statusEffects: [createStatusEffect('suppressed', 900)],
      cueTitle: '海盗火药弹',
      cueDetail: '海盗会朝扎堆的猫塔丢出火药包'
    })
  },
  ninja: {
    key: 'ninja',
    name: '忍者',
    assetKey: 'enemyNinja',
    maxHealth: 96,
    speed: 72,
    reward: 16,
    damage: 2,
    size: 24,
    tint: '#4f5568',
    slowResistance: 0.16,
    sprintProgressRatio: 0.48,
    sprintDurationMs: 760,
    sprintSpeedMultiplier: 2,
    sprintIgnoresSlow: true,
    cueTitle: '忍者渗透',
    cueDetail: '这类敌人极快，减速也很难完全拦住',
    sprintCueTitle: '忍者突进',
    sprintCueDetail: '它会直接切到防线后段',
    attackProfile: createAttackProfile('burstVolley', {
      range: 96,
      engagementRadius: 108,
      cooldownMs: 1680,
      windupMs: 190,
      recoveryMs: 210,
      damage: 4,
      projectileSpeed: 290,
      projectileKind: 'shuriken',
      volleyCount: 2,
      volleySpacingMs: 110
    }),
    skillProfile: createAttackProfile('controlCast', {
      range: 108,
      engagementRadius: 116,
      cooldownMs: 4200,
      windupMs: 240,
      recoveryMs: 220,
      damage: 5,
      projectileSpeed: 260,
      projectileKind: 'smoke',
      targetMode: 'highestLevel',
      statusEffects: [createStatusEffect('jammed', 860)],
      cueTitle: '忍者烟幕',
      cueDetail: '忍者会短暂封住后排核心猫塔的攻击'
    })
  },
  shooter: {
    key: 'shooter',
    name: '枪手',
    assetKey: 'enemyShooter',
    maxHealth: 126,
    speed: 52,
    reward: 18,
    damage: 3,
    size: 26,
    tint: '#4f77a3',
    slowResistance: 0.1,
    badgeLabel: '精英',
    cueTitle: '枪手逼近',
    cueDetail: '它们不算太肉，但漏过去会造成更高损伤',
    attackProfile: createAttackProfile('rangedShot', {
      range: 126,
      engagementRadius: 136,
      cooldownMs: 1420,
      windupMs: 220,
      recoveryMs: 210,
      damage: 8,
      projectileSpeed: 320,
      projectileKind: 'rifle'
    }),
    skillProfile: createAttackProfile('burstVolley', {
      range: 132,
      engagementRadius: 140,
      cooldownMs: 4300,
      windupMs: 280,
      recoveryMs: 240,
      damage: 5,
      projectileSpeed: 330,
      projectileKind: 'rifle',
      volleyCount: 3,
      volleySpacingMs: 95,
      statusEffects: [createStatusEffect('suppressed', 1150)],
      cueTitle: '压制射击',
      cueDetail: '枪手会打出一轮连射，显著拖慢猫塔节奏'
    })
  },
  vacuum: {
    key: 'vacuum',
    name: '吸尘器',
    assetKey: 'enemyVacuum',
    maxHealth: 200,
    speed: 34,
    reward: 24,
    damage: 2,
    size: 34,
    tint: '#8ca2d8',
    armor: 5,
    armorBreakRatio: 0.42,
    slowResistance: 0.45,
    cueTitle: '重甲敌人出现',
    cueDetail: '装甲会挡伤，优先集火更稳',
    armorBreakHint: '吸尘器装甲裂开了，快补火力',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 58,
      engagementRadius: 74,
      cooldownMs: 1820,
      windupMs: 280,
      recoveryMs: 300,
      damage: 12
    }),
    skillProfile: createAttackProfile('pressureAura', {
      range: 70,
      radius: 72,
      cooldownMs: 4700,
      windupMs: 320,
      recoveryMs: 320,
      damage: 6,
      statusEffects: [createStatusEffect('blinded', 1300)],
      cueTitle: '吸力脉冲',
      cueDetail: '吸尘器会释放吸力波，压低周边猫塔的射程'
    })
  },
  knight: {
    key: 'knight',
    name: '骑士',
    assetKey: 'enemyKnight',
    maxHealth: 228,
    speed: 36,
    reward: 28,
    damage: 2,
    size: 30,
    tint: '#8a96a8',
    armor: 4,
    armorBreakRatio: 0.52,
    slowResistance: 0.2,
    badgeLabel: '装甲',
    cueTitle: '骑士列阵',
    cueDetail: '它们更能扛，适合用高伤害塔优先点掉',
    armorBreakHint: '骑士的护甲被打穿了',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 60,
      engagementRadius: 78,
      cooldownMs: 1760,
      windupMs: 300,
      recoveryMs: 280,
      damage: 12
    }),
    skillProfile: createAttackProfile('meleeStrike', {
      range: 62,
      engagementRadius: 80,
      cooldownMs: 4300,
      windupMs: 340,
      recoveryMs: 320,
      damage: 16,
      statusEffects: [createStatusEffect('jammed', 900)],
      cueTitle: '骑士盾击',
      cueDetail: '骑士会冲上来用盾牌硬生生打停猫塔'
    })
  },
  warrior: {
    key: 'warrior',
    name: '战士',
    assetKey: 'enemyWarrior',
    maxHealth: 268,
    speed: 40,
    reward: 32,
    damage: 3,
    size: 32,
    tint: '#7f5c50',
    armor: 3,
    armorBreakRatio: 0.48,
    slowResistance: 0.18,
    badgeLabel: '精英',
    cueTitle: '战士压进',
    cueDetail: '这是更全面的近战精英，速度和厚度都不低',
    armorBreakHint: '战士的护具碎开了',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 64,
      engagementRadius: 82,
      cooldownMs: 1620,
      windupMs: 280,
      recoveryMs: 260,
      damage: 14
    }),
    skillProfile: createAttackProfile('meleeStrike', {
      range: 66,
      engagementRadius: 86,
      cooldownMs: 4300,
      windupMs: 330,
      recoveryMs: 320,
      damage: 12,
      splashRadius: 46,
      targetMode: 'clustered',
      cueTitle: '战士横扫',
      cueDetail: '战士会挥出横扫，顺带打到相邻猫塔'
    })
  },
  spaceman: {
    key: 'spaceman',
    name: '宇航员',
    assetKey: 'enemySpaceman',
    maxHealth: 314,
    speed: 46,
    reward: 38,
    damage: 3,
    size: 32,
    tint: '#8bc4e3',
    armor: 2,
    armorBreakRatio: 0.56,
    slowResistance: 0.32,
    sprintProgressRatio: 0.6,
    sprintDurationMs: 780,
    sprintSpeedMultiplier: 1.58,
    sprintIgnoresSlow: false,
    badgeLabel: '精英',
    cueTitle: '宇航员滑行',
    cueDetail: '抗减速还会喷射推进，别让它拖到终点线',
    sprintCueTitle: '喷射推进',
    sprintCueDetail: '宇航员启动喷射，加速贴近目标',
    armorBreakHint: '宇航员护罩碎了，快补输出',
    attackProfile: createAttackProfile('rangedShot', {
      range: 118,
      engagementRadius: 132,
      cooldownMs: 1520,
      windupMs: 240,
      recoveryMs: 220,
      damage: 9,
      projectileSpeed: 260,
      projectileKind: 'ion'
    }),
    skillProfile: createAttackProfile('controlCast', {
      range: 136,
      engagementRadius: 142,
      cooldownMs: 4500,
      windupMs: 320,
      recoveryMs: 260,
      damage: 10,
      projectileSpeed: 280,
      projectileKind: 'beam',
      statusEffects: [createStatusEffect('suppressed', 1050)],
      cueTitle: '喷射离子束',
      cueDetail: '宇航员会喷出离子束，让猫塔出手变慢'
    })
  },
  wizard: {
    key: 'wizard',
    name: '巫师',
    assetKey: 'enemyWizard',
    maxHealth: 286,
    speed: 36,
    reward: 40,
    damage: 3,
    size: 32,
    tint: '#7eb4e8',
    slowResistance: 0.18,
    enrageHealthRatio: 0.58,
    enrageSpeedMultiplier: 1.24,
    enrageSlowResistance: 0.34,
    summonOnEnrage: [
      { type: 'dust', count: 2 }
    ],
    badgeLabel: '精英',
    cueTitle: '巫师施压',
    cueDetail: '半血后会失控提速，并叫来额外杂兵',
    enrageCueTitle: '巫师失控',
    enrageCueDetail: '法力溢出后，它带着杂兵一起扑上来',
    attackProfile: createAttackProfile('controlCast', {
      range: 114,
      engagementRadius: 126,
      cooldownMs: 1760,
      windupMs: 260,
      recoveryMs: 240,
      damage: 7,
      projectileSpeed: 220,
      projectileKind: 'arcane',
      statusEffects: [createStatusEffect('blinded', 760)]
    }),
    skillProfile: createAttackProfile('areaLob', {
      range: 128,
      engagementRadius: 134,
      cooldownMs: 4680,
      windupMs: 360,
      recoveryMs: 280,
      damage: 6,
      projectileSpeed: 188,
      projectileKind: 'hex',
      splashRadius: 52,
      targetMode: 'clustered',
      statusEffects: [createStatusEffect('blinded', 1200), createStatusEffect('suppressed', 1200)],
      cueTitle: '巫术力场',
      cueDetail: '巫师会在猫塔密集区展开减程与压制结界'
    })
  },
  ironman: {
    key: 'ironman',
    name: '钢甲勇者',
    assetKey: 'enemyIronman',
    maxHealth: 368,
    speed: 38,
    reward: 44,
    damage: 3,
    size: 34,
    tint: '#5f6575',
    armor: 6,
    armorBreakRatio: 0.42,
    slowResistance: 0.36,
    badgeLabel: '重甲',
    cueTitle: '钢甲重压',
    cueDetail: '这类精英极耐打，最好提前布好集火位',
    armorBreakHint: '钢甲勇者的护甲终于裂开了',
    attackProfile: createAttackProfile('meleeStrike', {
      range: 66,
      engagementRadius: 84,
      cooldownMs: 1920,
      windupMs: 320,
      recoveryMs: 320,
      damage: 16
    }),
    skillProfile: createAttackProfile('areaLob', {
      range: 92,
      engagementRadius: 100,
      cooldownMs: 5200,
      windupMs: 380,
      recoveryMs: 320,
      damage: 18,
      projectileSpeed: 170,
      projectileKind: 'overload',
      splashRadius: 46,
      targetMode: 'clustered',
      cueTitle: '过载投射',
      cueDetail: '钢甲勇者会砸出重型冲击，对塔群造成高额耐久伤害'
    })
  },
  mailman: {
    key: 'mailman',
    name: '邮差',
    assetKey: 'enemyMailman',
    maxHealth: 560,
    speed: 29,
    reward: 86,
    damage: 4,
    size: 42,
    tint: '#f5b06f',
    enrageHealthRatio: 0.52,
    enrageSpeedMultiplier: 1.28,
    enrageSlowResistance: 0.38,
    summonOnEnrage: [
      { type: 'dust', count: 1 },
      { type: 'cucumber', count: 1 }
    ],
    isBoss: true,
    badgeLabel: '首领',
    cueTitle: '首领进入路线',
    cueDetail: '半血后会狂暴，还会召来增援',
    enrageCueTitle: '邮差狂暴',
    enrageCueDetail: '提速冲线，并叫来了增援',
    attackProfile: createAttackProfile('rangedShot', {
      range: 108,
      engagementRadius: 122,
      cooldownMs: 1580,
      windupMs: 260,
      recoveryMs: 240,
      damage: 10,
      projectileSpeed: 220,
      projectileKind: 'parcel'
    }),
    skillProfile: createAttackProfile('areaLob', {
      range: 126,
      engagementRadius: 132,
      cooldownMs: 4550,
      windupMs: 360,
      recoveryMs: 280,
      damage: 12,
      projectileSpeed: 182,
      projectileKind: 'bossBomb',
      splashRadius: 50,
      targetMode: 'clustered',
      statusEffects: [createStatusEffect('suppressed', 1100)],
      cueTitle: '包裹爆弹',
      cueDetail: '首领邮差会朝前场塔群砸出危险包裹'
    })
  },
  mailman3: {
    key: 'mailman3',
    name: '督战邮差',
    assetKey: 'enemyMailman3',
    maxHealth: 680,
    speed: 30,
    reward: 98,
    damage: 4,
    size: 44,
    tint: '#6f8fbb',
    armor: 3,
    armorBreakRatio: 0.5,
    slowResistance: 0.2,
    enrageHealthRatio: 0.56,
    enrageSpeedMultiplier: 1.24,
    enrageSlowResistance: 0.34,
    summonOnEnrage: [
      { type: 'mailman2', count: 2 },
      { type: 'pirate', count: 1 }
    ],
    isBoss: true,
    badgeLabel: '首领',
    cueTitle: '督战首领登场',
    cueDetail: '更厚更稳，半血后会号召更多快攻单位',
    armorBreakHint: '督战邮差的护具被击穿了',
    enrageCueTitle: '督战号令',
    enrageCueDetail: '督战邮差开始强推，还叫来了海盗帮手',
    attackProfile: createAttackProfile('rangedShot', {
      range: 112,
      engagementRadius: 124,
      cooldownMs: 1540,
      windupMs: 250,
      recoveryMs: 230,
      damage: 11,
      projectileSpeed: 230,
      projectileKind: 'command'
    }),
    skillProfile: createAttackProfile('controlCast', {
      range: 132,
      engagementRadius: 140,
      cooldownMs: 4380,
      windupMs: 320,
      recoveryMs: 260,
      damage: 8,
      projectileSpeed: 210,
      projectileKind: 'mark',
      targetMode: 'highestLevel',
      statusEffects: [createStatusEffect('marked', 2500)],
      cueTitle: '督战点名',
      cueDetail: '督战邮差会锁定一座高价值猫塔，集中火力突破'
    })
  },
  mailman4: {
    key: 'mailman4',
    name: '黑帽邮差',
    assetKey: 'enemyMailman4',
    maxHealth: 820,
    speed: 31,
    reward: 112,
    damage: 5,
    size: 45,
    tint: '#2f3c5a',
    armor: 5,
    armorBreakRatio: 0.46,
    slowResistance: 0.28,
    enrageHealthRatio: 0.54,
    enrageSpeedMultiplier: 1.28,
    enrageSlowResistance: 0.38,
    summonOnEnrage: [
      { type: 'knight', count: 1 },
      { type: 'ninja', count: 1 }
    ],
    isBoss: true,
    badgeLabel: '首领',
    cueTitle: '黑帽首领登场',
    cueDetail: '这名首领更硬也更狠，狂暴后会拉来重甲和快攻双线压你',
    armorBreakHint: '黑帽邮差的重甲裂开了',
    enrageCueTitle: '黑帽强攻',
    enrageCueDetail: '黑帽邮差提速推进，还带来了骑士与忍者',
    attackProfile: createAttackProfile('controlCast', {
      range: 118,
      engagementRadius: 132,
      cooldownMs: 1500,
      windupMs: 260,
      recoveryMs: 240,
      damage: 10,
      projectileSpeed: 216,
      projectileKind: 'darkParcel',
      statusEffects: [createStatusEffect('blinded', 920)]
    }),
    skillProfile: createAttackProfile('controlCast', {
      range: 138,
      engagementRadius: 144,
      cooldownMs: 4200,
      windupMs: 340,
      recoveryMs: 260,
      damage: 8,
      projectileSpeed: 198,
      projectileKind: 'hack',
      targetMode: 'highestLevel',
      splashRadius: 44,
      statusEffects: [createStatusEffect('jammed', 1450), createStatusEffect('blinded', 1100)],
      cueTitle: '黑帽断链',
      cueDetail: '黑帽邮差会让关键猫塔停火，并波及附近防线'
    })
  },
  mailman5: {
    key: 'mailman5',
    name: '终局邮差',
    assetKey: 'enemyMailman5',
    maxHealth: 980,
    speed: 32,
    reward: 128,
    damage: 6,
    size: 46,
    tint: '#274670',
    armor: 6,
    armorBreakRatio: 0.42,
    slowResistance: 0.38,
    enrageHealthRatio: 0.52,
    enrageSpeedMultiplier: 1.32,
    enrageSlowResistance: 0.42,
    summonOnEnrage: [
      { type: 'spaceman', count: 1 },
      { type: 'shooter', count: 1 },
      { type: 'ninja', count: 1 }
    ],
    isBoss: true,
    badgeLabel: '终局',
    cueTitle: '终局首领登场',
    cueDetail: '这是本局最后的压轴首领，会带着整支精英队伍一起推进',
    armorBreakHint: '终局邮差的外层装甲被轰开了',
    enrageCueTitle: '终局总攻',
    enrageCueDetail: '终局邮差开始总攻，精英援军同时冲线',
    attackProfile: createAttackProfile('rangedShot', {
      range: 126,
      engagementRadius: 138,
      cooldownMs: 1460,
      windupMs: 260,
      recoveryMs: 230,
      damage: 14,
      projectileSpeed: 240,
      projectileKind: 'cannon'
    }),
    skillProfile: createAttackProfile('areaLob', {
      range: 148,
      engagementRadius: 156,
      cooldownMs: 3680,
      windupMs: 360,
      recoveryMs: 280,
      damage: 16,
      projectileSpeed: 190,
      projectileKind: 'finalDispatch',
      splashRadius: 56,
      targetMode: 'clustered',
      statusEffects: [createStatusEffect('suppressed', 1350)],
      cueTitle: '终局派送',
      cueDetail: '终局邮差会用重型投射把后期防线彻底压满'
    })
  }
};

var STAGE_ORDER = ['living_room', 'kitchen_loop'];
var STAGE_WAVE_COUNT = 16;
var DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];
var DEFAULT_DIFFICULTY_KEY = 'normal';

var DIFFICULTY_DEFS = {
  easy: {
    key: 'easy',
    title: '轻松',
    badge: '轻松',
    summary: '更多资源 · 节奏更缓',
    goldOffset: 25,
    livesOffset: 2,
    waveDelayMultiplier: 1.08,
    spawnDelayMultiplier: 1.04,
    enemyHealthMultiplier: 0.91,
    enemySpeedMultiplier: 0.94,
    enemyRewardMultiplier: 1,
    enemyDamageOffset: 0,
    armorOffset: -1,
    slowResistanceOffset: -0.06,
    sprintSpeedBonus: -0.08,
    sprintDurationMultiplier: 0.94,
    enrageSpeedBonus: -0.06,
    summonCountOffset: 0,
    enemyAttackDamageMultiplier: 0.88,
    enemyAttackCooldownMultiplier: 1.1,
    enemyStatusDurationMultiplier: 0.85,
    enemySkillWindupMultiplier: 1.08,
    towerRepairCostMultiplier: 0.8,
    towerAutoRecoverRatio: 0.45
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
    summonCountOffset: 0,
    enemyAttackDamageMultiplier: 1,
    enemyAttackCooldownMultiplier: 1,
    enemyStatusDurationMultiplier: 1,
    enemySkillWindupMultiplier: 1,
    towerRepairCostMultiplier: 1,
    towerAutoRecoverRatio: 0.35
  },
  hard: {
    key: 'hard',
    title: '困难',
    badge: '困难',
    summary: '少资源 · 快节奏 · 敌人更强',
    goldOffset: -25,
    livesOffset: -2,
    waveDelayMultiplier: 0.9,
    spawnDelayMultiplier: 0.92,
    enemyHealthMultiplier: 1.16,
    enemySpeedMultiplier: 1.08,
    enemyRewardMultiplier: 1,
    enemyDamageOffset: 0,
    armorOffset: 1,
    slowResistanceOffset: 0.1,
    sprintSpeedBonus: 0.12,
    sprintDurationMultiplier: 1.05,
    enrageSpeedBonus: 0.1,
    summonCountOffset: 1,
    enemyAttackDamageMultiplier: 1.16,
    enemyAttackCooldownMultiplier: 0.9,
    enemyStatusDurationMultiplier: 1.15,
    enemySkillWindupMultiplier: 0.92,
    towerRepairCostMultiplier: 1.15,
    towerAutoRecoverRatio: 0.25
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
    startingGold: 150,
    startingLives: 10,
    waveDelayMs: 3000,
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
    startingGold: 170,
    startingLives: 9,
    waveDelayMs: 2800,
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

function buildRoleWave(label, typeKeys, delayPattern) {
  var pattern = Array.isArray(delayPattern) ? delayPattern : [delayPattern || 320];

  return buildWave(label, typeKeys.map(function (typeKey, index) {
    return {
      type: typeKey,
      delay: index === 0 ? 0 : pattern[(index - 1) % pattern.length]
    };
  }));
}

function estimateAttackProfilePressure(profile) {
  var statusScore = 0;
  var volleyWeight;

  if (!profile) {
    return 0;
  }

  if (profile.statusEffects && profile.statusEffects.length) {
    statusScore = profile.statusEffects.reduce(function (sum, effect) {
      return sum + Math.max(0.45, (effect.durationMs || 0) / 1000 * 0.45);
    }, 0);
  }

  volleyWeight = Math.max(1, profile.volleyCount || 1);
  return (
    (profile.damage || 0) * volleyWeight +
    statusScore +
    (profile.splashRadius || 0) / 42 +
    (profile.radius || 0) / 54
  ) / Math.max(0.6, (profile.cooldownMs || 1600) / 1000);
}

function estimateEnemyPressure(typeKey) {
  var enemy = ENEMY_TYPES[typeKey];

  if (!enemy) {
    return 0;
  }

  return (
    estimateAttackProfilePressure(enemy.attackProfile) +
    estimateAttackProfilePressure(enemy.skillProfile) * 0.72
  );
}

function applyWavePressureCurve(waves) {
  var previousTarget = 0;

  return waves.map(function (wave, index) {
    var baseScore = wave.spawns.reduce(function (sum, spawn) {
      return sum + estimateEnemyPressure(spawn.type);
    }, 0);
    var targetScore;

    if (index === 0) {
      targetScore = baseScore;
    } else {
      targetScore = Math.max(
        baseScore,
        previousTarget + Math.max(2.2, previousTarget * (index < 4 ? 0.06 : 0.072))
      );
    }
    previousTarget = targetScore;

    return {
      label: wave.label,
      spawns: wave.spawns,
      attackPressureMultiplier: baseScore > 0 ? targetScore / baseScore : 1,
      attackCadenceMultiplier: 1,
      statusPressureMultiplier: 1
    };
  });
}

function normalizeWaveLabels(waves) {
  return applyWavePressureCurve(waves.map(function (wave, index) {
    var suffixMatch = wave.label ? wave.label.match(/( · .+)$/) : null;

    return {
      label: '第' + index + '波' + (suffixMatch ? suffixMatch[1] : ''),
      spawns: wave.spawns
    };
  }));
}

function createLivingRoomWaves() {
  return normalizeWaveLabels([
    buildRoleWave('第1波', ['dust', 'mailman2', 'dust', 'cucumber'], [380, 320, 320]),
    buildRoleWave('第2波', ['dust', 'wildman', 'mailman2', 'cucumber', 'wildwoman'], [320, 280, 260, 260]),
    buildRoleWave('第3波', ['cucumber', 'pirate', 'mailman2', 'wildwoman'], [260, 260, 280]),
    buildRoleWave('第4波 · 护甲推进', ['vacuum', 'knight', 'cucumber', 'wildwoman'], [360, 260, 260]),
    buildRoleWave('第5波 · 双速压线', ['pirate', 'wildwoman', 'knight', 'mailman2', 'vacuum'], [260, 220, 240, 280]),
    buildRoleWave('第6波 · 巫师试压', ['wizard', 'wildman', 'cucumber', 'pirate', 'knight'], [300, 220, 220, 220]),
    buildRoleWave('第7波 · 钢甲前排', ['ironman', 'knight', 'pirate', 'wildwoman', 'cucumber'], [280, 220, 220, 220]),
    buildRoleWave('第8波 · 首领拦门', ['mailman', 'shooter', 'knight', 'vacuum'], [340, 220, 260]),
    buildRoleWave('第9波 · 太空混线', ['warrior', 'spaceman', 'pirate', 'pirate', 'knight'], [240, 220, 220, 240]),
    buildRoleWave('第10波 · 枪手跟进', ['wizard', 'shooter', 'knight', 'ironman', 'pirate'], [220, 200, 220, 240]),
    buildRoleWave('第11波 · 督战压场', ['mailman3', 'ninja', 'cucumber', 'knight'], [260, 180, 220]),
    buildRoleWave('第12波 · 三线逼近', ['ironman', 'warrior', 'spaceman', 'pirate', 'shooter'], [220, 200, 200, 220]),
    buildRoleWave('第13波 · 黑帽试探', ['mailman4', 'wizard', 'knight', 'ninja', 'vacuum'], [260, 200, 180, 220]),
    buildRoleWave('第14波 · 精英拉满', ['mailman3', 'warrior', 'spaceman', 'ironman', 'shooter', 'ninja'], [220, 180, 200, 180, 200]),
    buildRoleWave('第15波 · 黑帽冲门', ['mailman4', 'ninja', 'ironman', 'wizard', 'warrior', 'wildwoman'], [220, 180, 200, 200, 180]),
    buildRoleWave('第16波 · 终局邮差', ['mailman5', 'spaceman', 'ninja', 'ironman', 'shooter', 'pirate'], [240, 180, 180, 200, 180])
  ]);
}

function createKitchenLoopWaves() {
  return normalizeWaveLabels([
    buildRoleWave('第1波', ['dust', 'cucumber', 'mailman2', 'dust', 'wildwoman'], [320, 260, 320, 260]),
    buildRoleWave('第2波', ['mailman2', 'pirate', 'cucumber', 'wildman', 'dust'], [280, 220, 240, 240]),
    buildRoleWave('第3波', ['vacuum', 'cucumber', 'wildwoman', 'pirate', 'mailman2'], [320, 220, 220, 240]),
    buildRoleWave('第4波 · 忍者试探', ['pirate', 'knight', 'ninja', 'shooter', 'wildman'], [220, 200, 220, 220]),
    buildRoleWave('第5波 · 护甲双线', ['knight', 'vacuum', 'pirate', 'mailman2', 'wildwoman'], [260, 220, 220, 240]),
    buildRoleWave('第6波 · 巫师登场', ['wizard', 'spaceman', 'cucumber', 'vacuum', 'pirate'], [260, 220, 220, 240]),
    buildRoleWave('第7波 · 钢甲接力', ['ironman', 'warrior', 'knight', 'ninja', 'cucumber'], [240, 200, 180, 220]),
    buildRoleWave('第8波 · 首领堵门', ['mailman', 'shooter', 'pirate', 'vacuum', 'cucumber', 'dust'], [300, 220, 240, 220, 180]),
    buildRoleWave('第9波 · 太空混编', ['spaceman', 'spaceman', 'wizard', 'wizard', 'shooter'], [220, 180, 200, 220]),
    buildRoleWave('第10波 · 枪手跟压', ['wizard', 'shooter', 'ironman', 'spaceman', 'vacuum'], [220, 200, 220, 240]),
    buildRoleWave('第11波 · 督战压线', ['mailman3', 'ironman', 'ninja', 'cucumber', 'knight'], [260, 200, 180, 220]),
    buildRoleWave('第12波 · 三线逼近', ['mailman3', 'warrior', 'spaceman', 'shooter', 'vacuum', 'ninja'], [200, 180, 180, 220, 180]),
    buildRoleWave('第13波 · 黑帽试探', ['mailman4', 'wizard', 'ironman', 'knight', 'spaceman'], [240, 200, 180, 200]),
    buildRoleWave('第14波 · 精英奔袭', ['mailman4', 'warrior', 'spaceman', 'ninja', 'shooter', 'ironman', 'dust'], [180, 180, 180, 200, 200, 180]),
    buildRoleWave('第15波 · 黑帽冲门', ['mailman4', 'mailman3', 'ironman', 'wizard', 'ninja'], [220, 200, 180, 180]),
    buildRoleWave('第16波 · 终局邮差', ['mailman5', 'spaceman', 'shooter', 'ninja', 'ironman', 'warrior', 'pirate'], [220, 180, 180, 180, 200, 180])
  ]);
}

function createStageWaves(stageKey) {
  if (stageKey === 'kitchen_loop') {
    return createKitchenLoopWaves();
  }

  return createLivingRoomWaves();
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
      durability: baseTypes[key].durability,
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
      upgradeDurability: (baseTypes[key].upgradeDurability || []).slice(),
      repairCostRatio: baseTypes[key].repairCostRatio || 0.25,
      tint: baseTypes[key].tint
    };
  });

  return cloned;
}

function cloneEnemyTypes(baseTypes) {
  var cloned = {};

  Object.keys(baseTypes).forEach(function (key) {
    cloned[key] = JSON.parse(JSON.stringify(baseTypes[key]));
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
    var applyAttackProfile = function (profile) {
      if (!profile) {
        return null;
      }

      profile.damage = Math.max(0, Math.round(profile.damage * difficultyMeta.enemyAttackDamageMultiplier));
      profile.cooldownMs = Math.max(520, Math.round(profile.cooldownMs * difficultyMeta.enemyAttackCooldownMultiplier));
      profile.windupMs = Math.max(120, Math.round(profile.windupMs * difficultyMeta.enemySkillWindupMultiplier));
      profile.recoveryMs = Math.max(120, Math.round(profile.recoveryMs * difficultyMeta.enemySkillWindupMultiplier));
      if (profile.initialCooldownMs) {
        profile.initialCooldownMs = Math.max(0, Math.round(profile.initialCooldownMs * difficultyMeta.enemyAttackCooldownMultiplier));
      }
      if (profile.statusEffects && profile.statusEffects.length) {
        profile.statusEffects = profile.statusEffects.map(function (effect) {
          var cloned = JSON.parse(JSON.stringify(effect));
          cloned.durationMs = Math.max(320, Math.round(cloned.durationMs * difficultyMeta.enemyStatusDurationMultiplier));
          return cloned;
        });
      }
      return profile;
    };

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

    if (enemy.attackProfile) {
      enemy.attackProfile = applyAttackProfile(enemy.attackProfile);
    }
    if (enemy.skillProfile) {
      enemy.skillProfile = applyAttackProfile(enemy.skillProfile);
    }
  });

  return enemyTypes;
}

function applyDifficultyToWaves(waves, difficultyMeta) {
  return waves.map(function (wave, waveIndex) {
    return {
      label: wave.label,
      attackPressureMultiplier: wave.attackPressureMultiplier,
      attackCadenceMultiplier: wave.attackCadenceMultiplier,
      statusPressureMultiplier: wave.statusPressureMultiplier,
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
  waves = applyDifficultyToWaves(createStageWaves(def.key), difficultyMeta);

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
      summary: difficultyMeta.summary,
      enemyAttackDamageMultiplier: difficultyMeta.enemyAttackDamageMultiplier,
      enemyAttackCooldownMultiplier: difficultyMeta.enemyAttackCooldownMultiplier,
      enemyStatusDurationMultiplier: difficultyMeta.enemyStatusDurationMultiplier,
      enemySkillWindupMultiplier: difficultyMeta.enemySkillWindupMultiplier,
      towerRepairCostMultiplier: difficultyMeta.towerRepairCostMultiplier,
      towerAutoRecoverRatio: difficultyMeta.towerAutoRecoverRatio
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
      waveCount: STAGE_WAVE_COUNT
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
  STAGE_WAVE_COUNT: STAGE_WAVE_COUNT,
  STAGE_ORDER: STAGE_ORDER,
  DIFFICULTY_ORDER: DIFFICULTY_ORDER,
  DEFAULT_DIFFICULTY_KEY: DEFAULT_DIFFICULTY_KEY,
  DIFFICULTY_DEFS: DIFFICULTY_DEFS,
  getStageCatalog: getStageCatalog,
  getDifficultyCatalog: getDifficultyCatalog,
  createStageData: createStageData
};
