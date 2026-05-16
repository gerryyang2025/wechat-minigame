'use strict';

var SHARE_TITLE = '方块破坏王 自定义地图，设计自己的玩法';

function buildShareOptions() {
  return {
    title: SHARE_TITLE,
    query: 'from=share'
  };
}

module.exports = {
  buildShareOptions: buildShareOptions,
  SHARE_TITLE: SHARE_TITLE
};
