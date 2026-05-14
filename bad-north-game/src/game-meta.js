'use strict';

var GAME_TITLE = '北境孤岛';
var GAME_SLOGAN = '调度小队，守住最后的屋舍';

function buildShareTitle(snapshot) {
  if (snapshot && snapshot.state === 'victory') {
    return '我在《' + GAME_TITLE + '》守住了 ' + snapshot.wave + ' 波海袭！';
  }
  if (snapshot && snapshot.state === 'combat') {
    return '我在《' + GAME_TITLE + '》打到第 ' + snapshot.wave + ' 波了';
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
  buildShareOptions: buildShareOptions
};
