'use strict';

module.exports = {
  title: '漫威无限突击',
  subtitle: '触控英雄动作闯关',
  description: '选择钢铁侠、雷神或浩克。移动、跳跃、攻击并闯过三章战役。',
  buildShareOptions: function (snapshot) {
    var heroName = snapshot && snapshot.heroName ? snapshot.heroName : '英雄';
    var levelLabel = snapshot && snapshot.levelName ? snapshot.levelName : '战役任务';
    return {
      title: '和' + heroName + '一起挑战' + levelLabel,
      query: 'from=share'
    };
  }
};
