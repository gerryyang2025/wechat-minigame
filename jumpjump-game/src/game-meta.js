'use strict';

var GAME_TITLE = '跳一跳';
var GAME_SLOGAN = '长按蓄力，瞄准中心，连跳冲高分。';
var GAME_AUTHOR = 'Gerry';
var GAME_DESCRIPTION = '基于原 Scratch 版《跳一跳》重构的微信小游戏。长按蓄力、松手起跳，命中平台中心可触发连击加分，连续闯关还会切换背景。';
var HELP_LINES = [
  '按住屏幕蓄力，松手起跳。',
  '蓄力越久跳得越远，瞄准线可辅助判断。',
  '落到下一个方格即可继续，偏离方格会失败。',
  '成功落台后会生成新方格，方格样式会变化。'
];

function buildShareTitle(snapshot) {
  if (snapshot && snapshot.state === 'over' && snapshot.score > 0) {
    return '我在《' + GAME_TITLE + '》拿到了 ' + snapshot.score + ' 分，来挑战我吧。';
  }

  if (snapshot && snapshot.state === 'playing' && snapshot.score > 0) {
    return '我在《' + GAME_TITLE + '》已经跳到 ' + snapshot.landings + ' 次，当前得分 ' + snapshot.score;
  }

  return GAME_TITLE + '：' + GAME_SLOGAN;
}

function buildShareQuery(source) {
  return 'from=' + encodeURIComponent(source || 'menu');
}

function buildShareOptions(snapshot, source) {
  return {
    title: buildShareTitle(snapshot),
    imageUrl: 'images/title.png',
    query: buildShareQuery(source)
  };
}

module.exports = {
  GAME_TITLE: GAME_TITLE,
  GAME_SLOGAN: GAME_SLOGAN,
  GAME_AUTHOR: GAME_AUTHOR,
  GAME_DESCRIPTION: GAME_DESCRIPTION,
  HELP_LINES: HELP_LINES,
  buildShareOptions: buildShareOptions
};
