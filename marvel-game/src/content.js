'use strict';

var SHARED_JUMP_SPEED = 760;
var SHARED_GRAVITY = 2150;
var SHARED_MAX_AIR_JUMPS = 1;

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
    jumpSpeed: SHARED_JUMP_SPEED,
    gravity: SHARED_GRAVITY,
    bodyWidth: 42,
    bodyHeight: 74,
    maxAirJumps: SHARED_MAX_AIR_JUMPS,
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
    jumpSpeed: SHARED_JUMP_SPEED,
    gravity: SHARED_GRAVITY,
    bodyWidth: 44,
    bodyHeight: 78,
    maxAirJumps: SHARED_MAX_AIR_JUMPS,
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
    jumpSpeed: SHARED_JUMP_SPEED,
    gravity: SHARED_GRAVITY,
    bodyWidth: 56,
    bodyHeight: 88,
    maxAirJumps: SHARED_MAX_AIR_JUMPS,
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
      objective: '清空敌人，推进到天台尽头。',
      events: [
        {
          triggerX: 160 * scale,
          title: '星期五',
          subtitle: '清扫废墟，继续向天台深处推进。',
          color: '#7bc7ff',
          duration: 1.9
        },
        {
          triggerX: 1120 * scale,
          title: '清扫推进',
          subtitle: '清掉前方敌人，继续向天台深处推进。',
          color: '#6ce18c',
          duration: 1.9
        },
        {
          triggerX: 1620 * scale,
          title: '天台尽头',
          subtitle: '最后一队巡逻兵就在前方。',
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
      setPieces: [],
      checkpoints: [],
      exit: null,
      platforms: [
        { x: -80 * scale, y: floorY, width: 1880 * scale + 160 * scale, height: groundHeight, type: 'ground' },
        { x: 140 * scale, y: floorY - 110 * scale, width: 140 * scale, height: 18 * scale, type: 'metal' },
        { x: 700 * scale, y: floorY - 114 * scale, width: 150 * scale, height: 18 * scale, type: 'metal' },
        { x: 1210 * scale, y: floorY - 110 * scale, width: 150 * scale, height: 18 * scale, type: 'metal' },
        { x: 1720 * scale, y: floorY - 114 * scale, width: 140 * scale, height: 18 * scale, type: 'metal' }
      ],
      hazards: [],
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
          encounterSubtitle: '重装地面火力正在封锁前路。'
        }
      ]
    },
    {
      id: 'skybridge-pursuit',
      chapter: 2,
      chapterLabel: '第 2 关',
      name: '天桥追击',
      objective: '突破桥面封锁，拿下发射平台。',
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
          title: '中段交火',
          subtitle: '压住前方火力，继续朝发射平台推进。',
          color: '#6ce18c',
          duration: 1.9
        },
        {
          triggerX: 1720 * scale,
          title: '发射平台',
          subtitle: '穿过最后一段防线，拿下跑道。',
          color: '#ffd857',
          duration: 1.8
        }
      ],
      backgroundTop: '#1a2748',
      backgroundBottom: '#39486d',
      worldWidth: 2140 * scale,
      floorY: floorY,
      setPieces: [],
      checkpoints: [],
      exit: null,
      platforms: [
        { x: -80 * scale, y: floorY, width: 2140 * scale + 160 * scale, height: groundHeight, type: 'ground' },
        { x: 90 * scale, y: floorY - 110 * scale, width: 140 * scale, height: 18 * scale, type: 'metal' },
        { x: 635 * scale, y: floorY - 114 * scale, width: 110 * scale, height: 18 * scale, type: 'metal' },
        { x: 1040 * scale, y: floorY - 110 * scale, width: 130 * scale, height: 18 * scale, type: 'metal' },
        { x: 1515 * scale, y: floorY - 114 * scale, width: 120 * scale, height: 18 * scale, type: 'metal' },
        { x: 1930 * scale, y: floorY - 110 * scale, width: 120 * scale, height: 18 * scale, type: 'metal' }
      ],
      hazards: [],
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
          activateAtX: 700 * scale,
          encounterId: 'launch-bridge-lock',
          encounterTitle: '天桥封锁',
          encounterSubtitle: '炮击哨兵开始接管中段区域。'
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
          title: '决斗前线',
          subtitle: '清掉最后防线，准备迎战灭霸。',
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
      bossArenaStartX: 1500 * scale,
      bossArenaEndX: 2140 * scale,
      setPieces: [],
      checkpoints: [],
      exit: null,
      platforms: [
        { x: -80 * scale, y: floorY, width: 2240 * scale + 160 * scale, height: groundHeight, type: 'ground' },
        { x: 180 * scale, y: floorY - 110 * scale, width: 150 * scale, height: 18 * scale, type: 'metal' },
        { x: 860 * scale, y: floorY - 114 * scale, width: 140 * scale, height: 18 * scale, type: 'metal' }
      ],
      hazards: [],
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
          variant: 'artillery'
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
          damage: 20,
          attackRange: 126 * scale,
          attackCooldown: 1200,
          chaseRange: 420 * scale,
          projectileCooldown: 1900,
          projectileSpeed: 360 * scale,
          preferredDistance: 170 * scale,
          specialCooldown: 3200,
          dashDistance: 280 * scale,
          dashDamage: 24,
          novaProjectiles: 8
        }
      ]
    }
  ];
}

module.exports = {
  HEROES: HEROES,
  createCampaignData: createCampaignData
};
