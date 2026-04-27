'use strict';

var font = require('./font');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}

function getWindowInfo() {
  if (wx.getWindowInfo) {
    return wx.getWindowInfo();
  }
  return wx.getSystemInfoSync();
}

function createRenderer(width, height, pixelRatio) {
  var canvas = null;
  var ctx;

  if (typeof GameGlobal !== 'undefined' && GameGlobal.canvas) {
    canvas = GameGlobal.canvas;
  }
  if (!canvas) {
    canvas = wx.createCanvas();
  }
  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.canvas = canvas;
  }

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx = canvas.getContext('2d');

  if (ctx.setTransform) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  } else {
    ctx.scale(pixelRatio, pixelRatio);
  }

  return {
    canvas: canvas,
    ctx: ctx
  };
}

function pointInRect(x, y, rect) {
  return !!rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function pointInCircle(x, y, circle) {
  var dx;
  var dy;
  if (!circle) {
    return false;
  }
  dx = x - circle.x;
  dy = y - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function distanceSquared(ax, ay, bx, by) {
  var dx = ax - bx;
  var dy = ay - by;
  return dx * dx + dy * dy;
}

function formatTime(seconds) {
  return Math.max(0, seconds).toFixed(1) + '秒';
}

function safeGetStorage(key, fallbackValue) {
  try {
    var value = wx.getStorageSync(key);
    return value === '' || value === undefined || value === null ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}

function safeSetStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    return;
  }
}

function buildRoundRectPath(ctx, x, y, width, height, radius) {
  var safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  buildRoundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth) {
  buildRoundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawPanel(ctx, x, y, width, height, options) {
  var fillStyle = options.fillStyle || 'rgba(18, 24, 40, 0.9)';
  var strokeStyle = options.strokeStyle || 'rgba(255,255,255,0.15)';
  var radius = options.radius || 20;
  var lineWidth = options.lineWidth || 2;
  fillRoundRect(ctx, x, y, width, height, radius, fillStyle);
  strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth);
}

function setTextStyle(ctx, size, weight, color, align, baseline) {
  font.applyCanvasFont(ctx, size, weight);
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
}

module.exports = {
  clamp: clamp,
  lerp: lerp,
  getWindowInfo: getWindowInfo,
  createRenderer: createRenderer,
  pointInRect: pointInRect,
  pointInCircle: pointInCircle,
  rectsIntersect: rectsIntersect,
  distanceSquared: distanceSquared,
  formatTime: formatTime,
  safeGetStorage: safeGetStorage,
  safeSetStorage: safeSetStorage,
  fillRoundRect: fillRoundRect,
  strokeRoundRect: strokeRoundRect,
  drawPanel: drawPanel,
  setTextStyle: setTextStyle
};
