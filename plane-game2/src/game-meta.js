'use strict';

var GAME_TITLE = '飞机大战';
var GAME_SLOGAN = '滑动战机，火力全开！';
var GAME_AUTHOR = 'Gerry';
var GAME_DESCRIPTION = '经典街机风飞行射击小游戏。手指拖动战机自动开火，躲避敌机和弹幕，拾取双枪补给与炸弹空投，冲击更高分数。每局最多可分享复活3次。';
var COVER_DESCRIPTION_LINES = [
  '经典街机风飞行射击小游戏。',
  '手指拖动战机，自动开火。',
  '闪避敌机与弹幕，击落更多目标。',
  '拾取双枪补给与炸弹空投，每局可分享复活3次。'
];

function buildShareTitle(snapshot) {
  if (snapshot && snapshot.state === 'over' && snapshot.score > 0) {
    return '我在《' + GAME_TITLE + '》拿到了 ' + snapshot.score + ' 分，快来挑战！';
  }

  if (snapshot && snapshot.state === 'running' && snapshot.score > 0) {
    return '我在《' + GAME_TITLE + '》打到第 ' + snapshot.level + ' 关，当前得分 ' + snapshot.score;
  }

  return GAME_TITLE + '：' + GAME_SLOGAN;
}

function buildShareQuery(source) {
  return 'from=' + encodeURIComponent(source || 'menu');
}

function buildShareOptions(snapshot, source) {
  return {
    title: buildShareTitle(snapshot),
    imageUrl: 'images/hero1.png',
    query: buildShareQuery(source)
  };
}

module.exports = {
  GAME_TITLE: GAME_TITLE,
  GAME_SLOGAN: GAME_SLOGAN,
  GAME_AUTHOR: GAME_AUTHOR,
  GAME_DESCRIPTION: GAME_DESCRIPTION,
  COVER_DESCRIPTION_LINES: COVER_DESCRIPTION_LINES,
  buildShareOptions: buildShareOptions
};
