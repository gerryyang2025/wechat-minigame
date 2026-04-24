'use strict';

var INK = '#342d28';
var SOFT_INK = '#6a6056';
var LIGHT_INK = '#9b8f84';
var PAPER_LIGHT = '#f8f3e8';
var PAPER_MID = '#ebe2d3';
var PAPER_DARK = '#ddd1c0';

var state = {
  width: 320,
  height: 420,
  pixelRatio: 1,
  title: '好友排行',
  scoreKey: 'plane_best_score',
  selfScore: 0,
  records: [],
  ready: false,
  errorMessage: '',
  animationTime: 0,
  lastTick: 0,
  animating: false,
  animTimer: null
};

var canvas = typeof sharedCanvas !== 'undefined' ? sharedCanvas : null;
var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

function getRenderCanvas() {
  if (ctx && ctx.canvas) {
    return ctx.canvas;
  }

  return canvas;
}

function getCanvasDimension(targetCanvas, key, fallback) {
  if (!targetCanvas) {
    return fallback;
  }

  try {
    if (typeof targetCanvas[key] === 'number' && targetCanvas[key] > 0) {
      return targetCanvas[key];
    }
  } catch (error) {
    return fallback;
  }

  return fallback;
}

function trySetCanvasDimension(targetCanvas, key, value) {
  if (!targetCanvas) {
    return false;
  }

  try {
    targetCanvas[key] = value;
    return true;
  } catch (error) {
    return false;
  }
}

function setFont(size, weight) {
  ctx.font = (weight ? weight + ' ' : '') + Math.round(size) + 'px serif';
}

function now() {
  return Date.now();
}

function setCanvasSize(width, height, pixelRatio) {
  var targetCanvas = getRenderCanvas();
  var targetWidth = 0;
  var targetHeight = 0;

  if (!targetCanvas || !ctx) {
    return;
  }

  state.width = Math.max(240, width || state.width);
  state.height = Math.max(260, height || state.height);
  state.pixelRatio = Math.max(1, pixelRatio || state.pixelRatio || 1);

  targetWidth = Math.round(state.width);
  targetHeight = Math.round(state.height);

  trySetCanvasDimension(targetCanvas, 'width', targetWidth);
  trySetCanvasDimension(targetCanvas, 'height', targetHeight);

  state.width = Math.max(240, getCanvasDimension(targetCanvas, 'width', targetWidth));
  state.height = Math.max(260, getCanvasDimension(targetCanvas, 'height', targetHeight));

  if (ctx.setTransform) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

function parseScore(item, scoreKey) {
  if (!item || !Array.isArray(item.KVDataList)) {
    return 0;
  }

  for (var i = 0; i < item.KVDataList.length; i += 1) {
    if (item.KVDataList[i].key === scoreKey) {
      return Number(item.KVDataList[i].value || 0) || 0;
    }
  }

  return 0;
}

function normalizeRecords(data, scoreKey) {
  return (data || []).map(function (item) {
    return {
      nickname: item.nickname || '微信好友',
      score: parseScore(item, scoreKey)
    };
  }).filter(function (item) {
    return item.score > 0;
  }).sort(function (a, b) {
    return b.score - a.score;
  }).slice(0, 8);
}

function buildRoundRectPath(x, y, width, height, radius) {
  var safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function drawSketchStroke(buildPath, strokeStyle, lineWidth, jitter) {
  var offsets = [
    { x: 0, y: 0 },
    { x: 0.45, y: -0.26 },
    { x: -0.34, y: 0.18 }
  ];

  ctx.save();
  ctx.strokeStyle = strokeStyle || INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (var i = 0; i < offsets.length; i += 1) {
    ctx.save();
    ctx.translate(offsets[i].x * (jitter || 1), offsets[i].y * (jitter || 1));
    ctx.globalAlpha = 0.92 - i * 0.15;
    ctx.lineWidth = (lineWidth || 1.2) * (1 - i * 0.08);
    ctx.beginPath();
    buildPath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawSketchLine(x1, y1, x2, y2, strokeStyle, lineWidth, jitter) {
  drawSketchStroke(function () {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }, strokeStyle, lineWidth, jitter);
}

function drawSketchRoundRect(x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
  if (fillStyle) {
    ctx.save();
    buildRoundRectPath(x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  drawSketchStroke(function () {
    buildRoundRectPath(x, y, width, height, radius);
  }, strokeStyle, lineWidth || 1.2, 0.9);
}

function drawPaperPlane(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 250, 243, 0.74)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(28, 46);
  ctx.lineTo(14, 38);
  ctx.lineTo(10, 58);
  ctx.lineTo(0, 30);
  ctx.lineTo(-10, 58);
  ctx.lineTo(-14, 38);
  ctx.lineTo(-28, 46);
  ctx.closePath();
  ctx.fill();
  drawSketchStroke(function () {
    ctx.moveTo(0, 0);
    ctx.lineTo(28, 46);
    ctx.lineTo(14, 38);
    ctx.lineTo(10, 58);
    ctx.lineTo(0, 30);
    ctx.lineTo(-10, 58);
    ctx.lineTo(-14, 38);
    ctx.lineTo(-28, 46);
    ctx.closePath();
  }, INK, 1.5, 0.9);
  drawSketchLine(0, 4, 0, 30, SOFT_INK, 1, 0.35);
  drawSketchLine(0, 11, -18, 43, SOFT_INK, 0.9, 0.28);
  drawSketchLine(0, 11, 18, 43, SOFT_INK, 0.9, 0.28);
  ctx.restore();
}

function drawRankBadge(rank, centerX, centerY) {
  var fill = rank === 1
    ? '#efe2c5'
    : (rank === 2 ? '#e4ddd3' : (rank === 3 ? '#e7d6c8' : '#ece4d8'));
  var label = rank <= 3 ? ('TOP ' + rank) : ('#' + rank);
  var radius = rank <= 3 ? 18 : 15;
  var pulse = 1;
  var bob = 0;
  var sparkleAlpha = 0;

  if (rank <= 3) {
    pulse = 1 + Math.sin(state.animationTime * 3 + rank * 0.9) * 0.06;
    bob = Math.sin(state.animationTime * 2.2 + rank * 0.7) * 1.6;
    sparkleAlpha = 0.18 + (Math.sin(state.animationTime * 4.2 + rank) + 1) * 0.12;
  }

  ctx.save();
  ctx.translate(centerX, centerY + bob);
  ctx.scale(pulse, pulse);

  if (rank <= 3) {
    drawSketchLine(-radius - 4, radius - 1, -radius + 2, radius + 10, 'rgba(123, 111, 100, 0.34)', 1.1, 0.24);
    drawSketchLine(radius + 4, radius - 1, radius - 2, radius + 10, 'rgba(123, 111, 100, 0.34)', 1.1, 0.24);
    drawSketchLine(-radius - 8, -radius - 4, -radius - 14, -radius - 10, 'rgba(96, 84, 74, ' + sparkleAlpha + ')', 1, 0.2);
    drawSketchLine(-radius - 14, -radius - 4, -radius - 8, -radius - 10, 'rgba(96, 84, 74, ' + sparkleAlpha + ')', 1, 0.2);
    drawSketchLine(radius + 8, -radius - 4, radius + 14, -radius - 10, 'rgba(96, 84, 74, ' + sparkleAlpha + ')', 1, 0.2);
    drawSketchLine(radius + 14, -radius - 4, radius + 8, -radius - 10, 'rgba(96, 84, 74, ' + sparkleAlpha + ')', 1, 0.2);
  }

  drawSketchRoundRect(-radius, -radius, radius * 2, radius * 2, 999, fill, 'rgba(86, 75, 65, 0.34)', 1.1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  setFont(rank <= 3 ? 9 : 10, 'bold');
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function drawBackground() {
  var gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, PAPER_LIGHT);
  gradient.addColorStop(0.55, PAPER_MID);
  gradient.addColorStop(1, PAPER_DARK);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(138, 126, 114, 0.13)';
  ctx.lineWidth = 1;
  for (var y = 22; y < state.height; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }

  drawSketchLine(state.width * 0.15, 0, state.width * 0.15, state.height, 'rgba(122, 111, 101, 0.18)', 1.2, 0.45);
  ctx.restore();

  drawPaperPlane(state.width - 34, 36, 0.48);
  drawPaperPlane(30, state.height - 38, 0.36);
}

function drawStickyNote(x, y, width, height, label, value) {
  drawSketchRoundRect(x, y, width, height, 16, 'rgba(248, 243, 233, 0.96)', 'rgba(94, 84, 75, 0.35)', 1.2);
  drawSketchLine(x + 14, y + 16, x + width - 14, y + 16, 'rgba(92, 80, 70, 0.22)', 1, 0.3);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SOFT_INK;
  setFont(11, 'bold');
  ctx.fillText(label, x + 14, y + 16);
  ctx.fillStyle = INK;
  setFont(16, 'bold');
  ctx.fillText(String(value), x + 14, y + 38);
  ctx.restore();
}

function drawRow(record, index, rowX, rowY, rowWidth, rowHeight) {
  var rank = index + 1;
  var highlight = rank <= 3;
  var rowFill = highlight ? 'rgba(232, 223, 211, 0.98)' : 'rgba(246, 241, 233, 0.76)';
  var nickname = record.nickname.slice(0, 10);
  var rankLabel = '#' + rank;
  var subLabel = highlight ? ('TOP ' + rank + ' · 好友战绩') : '好友战绩';

  drawSketchRoundRect(rowX, rowY, rowWidth, rowHeight, 14, rowFill, 'rgba(99, 88, 79, 0.22)', 1);
  drawSketchLine(rowX + 56, rowY + rowHeight * 0.6, rowX + rowWidth - 84, rowY + rowHeight * 0.6, 'rgba(115, 104, 94, 0.16)', 1, 0.26);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  setFont(13, 'bold');
  ctx.fillText(rankLabel, rowX + 14, rowY + rowHeight / 2);
  ctx.fillStyle = '#4f453d';
  setFont(14, 'bold');
  ctx.fillText(nickname, rowX + 58, rowY + rowHeight / 2 - 7);
  ctx.fillStyle = LIGHT_INK;
  setFont(11, null);
  ctx.fillText(subLabel, rowX + 58, rowY + rowHeight / 2 + 10);

  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  setFont(16, 'bold');
  ctx.fillText(String(record.score), rowX + rowWidth - 16, rowY + rowHeight / 2);
  ctx.restore();
}

function renderMessage(message, subMessage) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SOFT_INK;
  setFont(15, null);
  ctx.fillText(message, state.width / 2, state.height / 2 - (subMessage ? 12 : 0));
  if (subMessage) {
    ctx.fillStyle = LIGHT_INK;
    setFont(12, null);
    ctx.fillText(subMessage, state.width / 2, state.height / 2 + 14);
  }
  ctx.restore();
}

function render() {
  var padding = 10;
  var listX = padding;
  var listY = 10;
  var listWidth = state.width - padding * 2;
  var footerHeight = 46;
  var footerY = state.height - footerHeight - 4;
  var noteWidth = Math.min(136, listWidth);
  var availableListHeight = Math.max(36, footerY - listY - 8);
  var rowGap = 6;
  var rowHeight = Math.max(28, Math.min(34, (availableListHeight - (Math.max(0, state.records.length - 1) * rowGap)) / Math.max(1, state.records.length)));

  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, state.width, state.height);
  drawStickyNote(state.width - noteWidth - padding, footerY, noteWidth, 40, '我的最高分', state.selfScore || 0);

  if (state.errorMessage) {
    renderMessage(state.errorMessage, '请稍后重新打开好友排行');
    return;
  }

  if (!state.ready) {
    renderMessage('正在获取好友战绩...', '稍等一下，正在同步好友分数');
    return;
  }

  if (!state.records.length) {
    renderMessage('暂无好友战绩数据', '可先完成一局，再重新打开排行');
    return;
  }

  for (var i = 0; i < state.records.length; i += 1) {
    drawRow(state.records[i], i, listX, listY + i * (rowHeight + rowGap), listWidth, rowHeight);
  }

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SOFT_INK;
  setFont(11, null);
  ctx.fillText('开放数据域好友分数', padding + 2, footerY + 20);
  ctx.restore();
}

function stopAnimation() {
  state.animating = false;
  state.lastTick = 0;

  if (state.animTimer) {
    clearTimeout(state.animTimer);
    state.animTimer = null;
  }
}

function tickAnimation() {
  var currentTime = now();

  if (!state.animating) {
    return;
  }

  if (state.lastTick) {
    state.animationTime += Math.min(0.05, (currentTime - state.lastTick) / 1000);
  }
  state.lastTick = currentTime;
  render();
  state.animTimer = setTimeout(tickAnimation, 1000 / 24);
}

function startAnimation() {
  if (state.animating) {
    return;
  }

  state.animating = true;
  state.lastTick = now();
  tickAnimation();
}

function loadFriendData() {
  if (!wx.getFriendCloudStorage) {
    state.ready = true;
    state.errorMessage = '当前环境不支持好友排行';
    render();
    return;
  }

  state.ready = false;
  state.errorMessage = '';
  render();

  wx.getFriendCloudStorage({
    keyList: [state.scoreKey],
    success: function (res) {
      state.records = normalizeRecords(res.data, state.scoreKey);
      state.ready = true;
      render();
    },
    fail: function () {
      state.records = [];
      state.ready = true;
      state.errorMessage = '好友战绩读取失败';
      render();
    }
  });
}

if (wx.onMessage) {
  wx.onMessage(function (message) {
    if (!message || !message.type) {
      return;
    }

    if (message.type === 'showFriendLeaderboard') {
      state.title = message.title || '好友排行';
      state.scoreKey = message.scoreKey || 'plane_best_score';
      state.selfScore = Number(message.selfScore || 0) || 0;
      setCanvasSize(message.width, message.height, message.pixelRatio);
      startAnimation();
      loadFriendData();
      return;
    }

    if (message.type === 'hideFriendLeaderboard') {
      stopAnimation();
      state.ready = false;
      state.errorMessage = '';
      state.records = [];
      render();
    }
  });
}

setCanvasSize(state.width, state.height, state.pixelRatio);
render();
