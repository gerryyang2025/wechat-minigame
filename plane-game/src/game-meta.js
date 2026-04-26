'use strict';

var GAME_TITLE = '纸飞机 War 2013';
var GAME_SLOGAN = '折纸飞机，击落敌机！';
var GAME_AUTHOR = 'Gerry';
var GAME_DESCRIPTION = '折纸飞机，击落敌机！本游戏是一款童年风飞行射击小游戏。手指拖动纸飞机，自动开火，躲避满天敌机，挑战最高分。与好友比拼排行，每局最多分享复活3次。即点即玩，等你来战！';
var COVER_DESCRIPTION_LINES = [
  '拖动纸飞机，自动开火。',
  '躲避敌机与弹幕，挑战最高分。',
  '每局最多可分享复活 3 次。'
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
    imageUrl: 'images/player1.png',
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
