'use strict';

var HEROES = [
  {
    key: 'ironman',
    name: '钢铁侠',
    title: '斥能先锋',
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
    hurtTilt: 0.2,
    deathTilt: 0.34,
    landingDrop: 2,
    basicType: 'ranged',
    description: '远程压制、微型飞弹、光束大招。'
  },
  {
    key: 'thor',
    name: '雷神',
    title: '雷霆之神',
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
    hurtTilt: 0.17,
    deathTilt: 0.3,
    landingDrop: 3,
    basicType: 'melee',
    description: '均衡近战、雷锤投掷、范围雷暴。'
  },
  {
    key: 'hulk',
    name: '浩克',
    title: '伽马破城者',
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
    hurtTilt: 0.12,
    deathTilt: 0.26,
    landingDrop: 4,
    basicType: 'melee',
    description: '高血量、重拳冲锋、震地大招。'
  }
];

function createCampaignData(width, height, scale) {
  var floorY = height - 88 * scale;
  var groundHeight = 44 * scale;
  var gateWidth = 76 * scale;
  var gateHeight = 120 * scale;

  return [
    {
      id: 'stark-ruins',
      chapter: 1,
      chapterLabel: '第 1 关',
      name: '斯塔克废墟',
      objective: '清空哨兵并抵达撤离点。',
      events: [
        {
          triggerX: 160 * scale,
          title: '星期五',
          subtitle: '清扫废墟，继续向撤离点推进。',
          color: '#7bc7ff',
          duration: 1.9
        },
        {
          triggerX: 1120 * scale,
          title: '阿尔法门',
          subtitle: '踩下地面开关，关闭前方屏障。',
          color: '#6ce18c',
          duration: 1.9
        },
        {
          triggerX: 1620 * scale,
          title: '撤离点',
          subtitle: '最后一队巡逻兵，守住天台出口。',
          color: '#ffd857',
          duration: 1.8
        }
      ],
      backgroundTop: '#111830',
      backgroundBottom: '#25375d',
      worldWidth: 1880 * scale,
      floorY: floorY,
      spawnPoint: {
        x: 104 * scale,
        y: floorY - 86 * scale
      },
      setPieces: [
        { type: 'spawnPad', x: 54 * scale, y: floorY - 86 * scale, width: 154 * scale, height: 34 * scale, layer: 'back' },
        { type: 'wreck', x: 180 * scale, y: floorY - 52 * scale, width: 150 * scale, height: 52 * scale, layer: 'back' },
        { type: 'reactor', x: 860 * scale, y: floorY - 84 * scale, width: 86 * scale, height: 84 * scale, layer: 'back' },
        { type: 'beacon', x: 1716 * scale, y: floorY - 148 * scale, width: 38 * scale, height: 148 * scale, layer: 'back' }
      ],
      checkpoints: [
        {
          id: 'ruins-reactor',
          label: '反应堆中继',
          x: 962 * scale,
          y: floorY
        }
      ],
      exit: {
        x: 1880 * scale - 180 * scale,
        y: floorY - gateHeight,
        width: gateWidth,
        height: gateHeight
      },
      platforms: [
        { x: -80 * scale, y: floorY, width: 1880 * scale + 160 * scale, height: groundHeight, type: 'ground' },
        { x: 52 * scale, y: floorY - 86 * scale, width: 158 * scale, height: 22 * scale, type: 'metal' },
        { x: 260 * scale, y: floorY - 118 * scale, width: 180 * scale, height: 22 * scale, type: 'metal' },
        { x: 590 * scale, y: floorY - 188 * scale, width: 170 * scale, height: 22 * scale, type: 'metal' },
        { x: 930 * scale, y: floorY - 136 * scale, width: 210 * scale, height: 22 * scale, type: 'metal' },
        { x: 1290 * scale, y: floorY - 230 * scale, width: 160 * scale, height: 22 * scale, type: 'metal' }
      ],
      hazards: [
        {
          type: 'mine',
          x: 784 * scale,
          y: floorY - 18 * scale,
          radius: 22 * scale,
          damage: 14,
          cycleDuration: 2500,
          activeDuration: 780,
          phaseOffset: 0
        },
        {
          type: 'gate',
          x: 1440 * scale,
          y: floorY - 104 * scale,
          width: 20 * scale,
          height: 104 * scale,
          damage: 16,
          cycleDuration: 3000,
          activeDuration: 950,
          phaseOffset: 700,
          linkId: 'alpha-gate'
        },
        {
          type: 'switch',
          x: 1188 * scale,
          y: floorY - 16 * scale,
          width: 42 * scale,
          height: 16 * scale,
          cycleDuration: 4200,
          activeDuration: 2500,
          suppressDuration: 2600,
          linkId: 'alpha-gate'
        }
      ],
      enemies: [
        {
          type: 'sentry',
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
          type: 'sentry',
          x: 1010 * scale,
          y: floorY - 74 * scale,
          width: 38 * scale,
          height: 68 * scale,
          patrolMin: 900 * scale,
          patrolMax: 1180 * scale,
          maxHealth: 60,
          speed: 126,
          damage: 16,
          variant: 'artillery',
          hazardLinkId: 'alpha-gate',
          comboRole: 'controller'
        },
        {
          type: 'sentry',
          x: 1490 * scale,
          y: floorY - 74 * scale,
          width: 38 * scale,
          height: 68 * scale,
          patrolMin: 1380 * scale,
          patrolMax: 1700 * scale,
          maxHealth: 70,
          speed: 130,
          damage: 18,
          variant: 'brute',
          activateAtX: 1280 * scale,
          encounterId: 'ruins-airlock',
          encounterTitle: '天台清扫',
          encounterSubtitle: '重装地面火力和空中巡逻正在封锁撤离线。'
        },
        {
          type: 'drone',
          x: 1650 * scale,
          y: floorY - 238 * scale,
          width: 36 * scale,
          height: 30 * scale,
          patrolMin: 1490 * scale,
          patrolMax: 1780 * scale,
          maxHealth: 52,
          speed: 162,
          damage: 14,
          projectileCooldown: 1380,
          projectileSpeed: 410 * scale,
          preferredDistance: 212 * scale,
          chaseRange: 360 * scale,
          hoverAmplitude: 18 * scale,
          hoverSpeed: 2.1,
          hoverPhase: 260,
          activateAtX: 1340 * scale,
          encounterId: 'ruins-airlock'
        }
      ]
    },
    {
      id: 'skybridge-pursuit',
      chapter: 2,
      chapterLabel: '第 2 关',
      name: '天桥追击',
      objective: '突破无人机防线，拿下发射平台。',
      events: [
        {
          triggerX: 180 * scale,
          title: '天桥入口',
          subtitle: '天桥已沦陷，先清掉前方拦截队。',
          color: '#7bc7ff',
          duration: 1.9
        },
        {
          triggerX: 900 * scale,
          title: '发射封锁',
          subtitle: '利用开关切断联动机关电源。',
          color: '#6ce18c',
          duration: 1.9
        },
        {
          triggerX: 1720 * scale,
          title: '发射平台',
          subtitle: '穿过最后封锁线，拿下跑道。',
          color: '#ffd857',
          duration: 1.8
        }
      ],
      backgroundTop: '#1a2748',
      backgroundBottom: '#39486d',
      worldWidth: 2140 * scale,
      floorY: floorY,
      setPieces: [
        { type: 'cannon', x: 602 * scale, y: floorY - 94 * scale, width: 158 * scale, height: 94 * scale, layer: 'back' },
        { type: 'crate', x: 1106 * scale, y: floorY - 46 * scale, width: 122 * scale, height: 46 * scale, layer: 'back' },
        { type: 'beacon', x: 1884 * scale, y: floorY - 160 * scale, width: 40 * scale, height: 160 * scale, layer: 'back' }
      ],
      checkpoints: [
        {
          id: 'launch-control',
          label: '发射控制',
          x: 1188 * scale,
          y: floorY
        }
      ],
      exit: {
        x: 2140 * scale - 180 * scale,
        y: floorY - gateHeight,
        width: gateWidth,
        height: gateHeight
      },
      platforms: [
        { x: -80 * scale, y: floorY, width: 2140 * scale + 160 * scale, height: groundHeight, type: 'ground' },
        { x: 220 * scale, y: floorY - 104 * scale, width: 160 * scale, height: 22 * scale, type: 'metal' },
        { x: 520 * scale, y: floorY - 170 * scale, width: 190 * scale, height: 22 * scale, type: 'metal' },
        { x: 870 * scale, y: floorY - 248 * scale, width: 180 * scale, height: 22 * scale, type: 'metal' },
        { x: 1220 * scale, y: floorY - 146 * scale, width: 220 * scale, height: 22 * scale, type: 'metal' },
        { x: 1590 * scale, y: floorY - 210 * scale, width: 190 * scale, height: 22 * scale, type: 'metal' }
      ],
      hazards: [
        {
          type: 'gate',
          x: 700 * scale,
          y: floorY - 124 * scale,
          width: 22 * scale,
          height: 124 * scale,
          damage: 18,
          cycleDuration: 2600,
          activeDuration: 900,
          phaseOffset: 300,
          linkId: 'launch-bridge'
        },
        {
          type: 'mine',
          x: 1090 * scale,
          y: floorY - 18 * scale,
          radius: 24 * scale,
          damage: 16,
          cycleDuration: 2200,
          activeDuration: 820,
          phaseOffset: 1200,
          linkId: 'launch-bridge'
        },
        {
          type: 'gate',
          x: 1710 * scale,
          y: floorY - 156 * scale,
          width: 22 * scale,
          height: 156 * scale,
          damage: 18,
          cycleDuration: 2800,
          activeDuration: 980,
          phaseOffset: 950
        },
        {
          type: 'switch',
          x: 964 * scale,
          y: floorY - 16 * scale,
          width: 44 * scale,
          height: 16 * scale,
          cycleDuration: 4400,
          activeDuration: 2600,
          suppressDuration: 2800,
          linkId: 'launch-bridge'
        }
      ],
      enemies: [
        {
          type: 'sentry',
          x: 420 * scale,
          y: floorY - 74 * scale,
          width: 38 * scale,
          height: 68 * scale,
          patrolMin: 300 * scale,
          patrolMax: 620 * scale,
          maxHealth: 72,
          speed: 132,
          damage: 18,
          variant: 'skirmisher'
        },
        {
          type: 'sentry',
          x: 860 * scale,
          y: floorY - 74 * scale,
          width: 38 * scale,
          height: 68 * scale,
          patrolMin: 760 * scale,
          patrolMax: 1020 * scale,
          maxHealth: 78,
          speed: 136,
          damage: 18,
          variant: 'artillery',
          hazardLinkId: 'launch-bridge',
          comboRole: 'controller',
          activateAtX: 700 * scale,
          encounterId: 'launch-bridge-lock',
          encounterTitle: '天桥封锁',
          encounterSubtitle: '先压掉联动机关，再突破炮击线。'
        },
        {
          type: 'sentry',
          x: 1330 * scale,
          y: floorY - 74 * scale,
          width: 38 * scale,
          height: 68 * scale,
          patrolMin: 1200 * scale,
          patrolMax: 1500 * scale,
          maxHealth: 84,
          speed: 142,
          damage: 20,
          variant: 'skirmisher',
          hazardLinkId: 'launch-bridge',
          comboRole: 'rushdown',
          activateAtX: 820 * scale,
          encounterId: 'launch-bridge-lock'
        },
        {
          type: 'sentry',
          x: 1760 * scale,
          y: floorY - 74 * scale,
          width: 40 * scale,
          height: 70 * scale,
          patrolMin: 1660 * scale,
          patrolMax: 1920 * scale,
          maxHealth: 92,
          speed: 146,
          damage: 22,
          variant: 'brute',
          encounterId: 'launch-pad-crossfire'
        },
        {
          type: 'drone',
          x: 690 * scale,
          y: floorY - 262 * scale,
          width: 38 * scale,
          height: 30 * scale,
          patrolMin: 560 * scale,
          patrolMax: 930 * scale,
          maxHealth: 58,
          speed: 168,
          damage: 16,
          projectileCooldown: 1260,
          projectileSpeed: 430 * scale,
          preferredDistance: 222 * scale,
          chaseRange: 390 * scale,
          hoverAmplitude: 20 * scale,
          hoverSpeed: 2.35,
          hoverPhase: 180,
          activateAtX: 520 * scale
        },
        {
          type: 'drone',
          x: 1520 * scale,
          y: floorY - 276 * scale,
          width: 38 * scale,
          height: 30 * scale,
          patrolMin: 1400 * scale,
          patrolMax: 1820 * scale,
          maxHealth: 62,
          speed: 172,
          damage: 18,
          projectileCooldown: 1220,
          projectileSpeed: 446 * scale,
          preferredDistance: 232 * scale,
          chaseRange: 410 * scale,
          hoverAmplitude: 24 * scale,
          hoverSpeed: 2.55,
          hoverPhase: 620,
          activateAtX: 1380 * scale,
          encounterId: 'launch-pad-crossfire',
          encounterTitle: '平台交叉火力',
          encounterSubtitle: '空中支援和重装哨兵正在封锁跑道。'
        }
      ]
    },
    {
      id: 'titan-hangar',
      chapter: 3,
      chapterLabel: '第 3 关',
      name: '泰坦机库',
      objective: '击败战争领主，活过终局战区。',
      events: [
        {
          triggerX: 180 * scale,
          title: '泰坦机库',
          subtitle: '先打穿哨兵阵线，再迎战战争领主。',
          color: '#7bc7ff',
          duration: 1.9
        },
        {
          triggerX: 1320 * scale,
          title: '核心开关',
          subtitle: '先关闭泰坦核心机关，再打最终决斗。',
          color: '#6ce18c',
          duration: 1.9
        },
        {
          triggerBossHealthBelow: 0.5,
          title: '阶段转换',
          subtitle: '冲锋和新星已启动，注意预警。',
          color: '#ffd857',
          duration: 1.9
        },
        {
          triggerBossHealthBelow: 0.22,
          title: '终结预警',
          subtitle: '离开标记通道，随后抓破绽反打。',
          color: '#ff7664',
          duration: 1.9
        }
      ],
      backgroundTop: '#171224',
      backgroundBottom: '#3a2447',
      worldWidth: 2240 * scale,
      floorY: floorY,
      setPieces: [
        { type: 'pillar', x: 826 * scale, y: floorY - 166 * scale, width: 54 * scale, height: 166 * scale, layer: 'back' },
        { type: 'core', x: 1448 * scale, y: floorY - 196 * scale, width: 78 * scale, height: 196 * scale, layer: 'back' },
        { type: 'throne', x: 1754 * scale, y: floorY - 88 * scale, width: 126 * scale, height: 88 * scale, layer: 'back' }
      ],
      checkpoints: [
        {
          id: 'titan-core',
          label: '泰坦核心',
          x: 1412 * scale,
          y: floorY
        }
      ],
      exit: null,
      platforms: [
        { x: -80 * scale, y: floorY, width: 2240 * scale + 160 * scale, height: groundHeight, type: 'ground' },
        { x: 340 * scale, y: floorY - 110 * scale, width: 180 * scale, height: 22 * scale, type: 'metal' },
        { x: 760 * scale, y: floorY - 198 * scale, width: 170 * scale, height: 22 * scale, type: 'metal' },
        { x: 1170 * scale, y: floorY - 120 * scale, width: 220 * scale, height: 22 * scale, type: 'metal' },
        { x: 1650 * scale, y: floorY - 180 * scale, width: 220 * scale, height: 22 * scale, type: 'metal' }
      ],
      hazards: [
        {
          type: 'mine',
          x: 500 * scale,
          y: floorY - 18 * scale,
          radius: 24 * scale,
          damage: 18,
          cycleDuration: 2400,
          activeDuration: 860,
          phaseOffset: 300
        },
        {
          type: 'gate',
          x: 1490 * scale,
          y: floorY - 144 * scale,
          width: 24 * scale,
          height: 144 * scale,
          damage: 22,
          cycleDuration: 2800,
          activeDuration: 1050,
          phaseOffset: 1050,
          linkId: 'titan-core'
        },
        {
          type: 'mine',
          x: 2010 * scale,
          y: floorY - 18 * scale,
          radius: 26 * scale,
          damage: 20,
          cycleDuration: 2100,
          activeDuration: 920,
          phaseOffset: 1500
        },
        {
          type: 'switch',
          x: 1358 * scale,
          y: floorY - 16 * scale,
          width: 46 * scale,
          height: 16 * scale,
          cycleDuration: 4200,
          activeDuration: 2200,
          suppressDuration: 2400,
          linkId: 'titan-core'
        }
      ],
      enemies: [
        {
          type: 'sentry',
          x: 600 * scale,
          y: floorY - 74 * scale,
          width: 40 * scale,
          height: 70 * scale,
          patrolMin: 520 * scale,
          patrolMax: 840 * scale,
          maxHealth: 90,
          speed: 144,
          damage: 22,
          variant: 'brute'
        },
        {
          type: 'sentry',
          x: 1160 * scale,
          y: floorY - 74 * scale,
          width: 40 * scale,
          height: 70 * scale,
          patrolMin: 1080 * scale,
          patrolMax: 1370 * scale,
          maxHealth: 100,
          speed: 148,
          damage: 22,
          variant: 'artillery',
          hazardLinkId: 'titan-core',
          comboRole: 'controller'
        },
        {
          type: 'boss',
          name: '灭霸',
          x: 1820 * scale,
          y: floorY - 124 * scale,
          width: 76 * scale,
          height: 118 * scale,
          patrolMin: 1520 * scale,
          patrolMax: 2080 * scale,
          maxHealth: 360,
          speed: 112,
          damage: 28,
          attackRange: 126 * scale,
          attackCooldown: 1200,
          chaseRange: 420 * scale,
          projectileCooldown: 1900,
          projectileSpeed: 360 * scale,
          preferredDistance: 170 * scale,
          specialCooldown: 3200,
          dashDistance: 280 * scale,
          dashDamage: 34,
          novaProjectiles: 8
        },
        {
          type: 'drone',
          x: 920 * scale,
          y: floorY - 296 * scale,
          width: 40 * scale,
          height: 32 * scale,
          patrolMin: 780 * scale,
          patrolMax: 1220 * scale,
          maxHealth: 74,
          speed: 176,
          damage: 18,
          projectileCooldown: 1180,
          projectileSpeed: 470 * scale,
          preferredDistance: 238 * scale,
          chaseRange: 430 * scale,
          hoverAmplitude: 26 * scale,
          hoverSpeed: 2.65,
          hoverPhase: 120,
          comboRole: 'controller',
          hazardLinkId: 'titan-core',
          activateAtX: 900 * scale,
          encounterId: 'titan-core-screen',
          encounterTitle: '核心防线',
          encounterSubtitle: '先关闭泰坦核心机关，再穿过无人机屏障。'
        }
      ]
    }
  ];
}

module.exports = {
  HEROES: HEROES,
  createCampaignData: createCampaignData
};
