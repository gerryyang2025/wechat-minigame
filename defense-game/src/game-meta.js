'use strict';

var GAME_TITLE = '喵咪防线';
var GAME_SLOGAN = '守住金枪鱼罐头！';
var GAME_DESCRIPTION = [
  '点选猫咪塔，守住房间里的金枪鱼罐头。',
  '建造、升级、卖出塔位，挡住一波波入侵。',
  '操作简单，适合微信小游戏触屏游玩。'
];

function buildShareTitle(snapshot) {
  if (snapshot && snapshot.state === 'victory') {
    return '我在《' + GAME_TITLE + '》守住了第 ' + snapshot.wave + ' 波，快来试试！';
  }
  if (snapshot && snapshot.state === 'playing') {
    return '我在《' + GAME_TITLE + '》守到第 ' + snapshot.wave + ' 波了！';
  }
  return GAME_TITLE + '：' + GAME_SLOGAN;
}

function buildShareOptions(snapshot, source) {
  return {
    title: buildShareTitle(snapshot),
    query: 'from=' + encodeURIComponent(source || 'menu')
  };
}

module.exports = {
  GAME_TITLE: GAME_TITLE,
  GAME_SLOGAN: GAME_SLOGAN,
  GAME_DESCRIPTION: GAME_DESCRIPTION,
  buildShareOptions: buildShareOptions
};
