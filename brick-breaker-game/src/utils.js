'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}

function distance(ax, ay, bx, by) {
  var dx = ax - bx;
  var dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(dx, dy) {
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len <= 0.0001) {
    return { x: 0, y: -1 };
  }
  return { x: dx / len, y: dy / len };
}

function pointInRect(x, y, rect) {
  return !!rect && x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function getTouchPoint(event) {
  var touch = null;
  if (event && event.changedTouches && event.changedTouches.length) {
    touch = event.changedTouches[0];
  } else if (event && event.touches && event.touches.length) {
    touch = event.touches[0];
  }
  return {
    x: touch ? touch.clientX : 0,
    y: touch ? touch.clientY : 0
  };
}

function getWindowInfo() {
  if (typeof wx !== 'undefined' && wx.getWindowInfo) {
    return wx.getWindowInfo();
  }
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    return wx.getSystemInfoSync();
  }
  return {
    windowWidth: 430,
    windowHeight: 932,
    pixelRatio: 1
  };
}

function createRenderer(width, height, pixelRatio, mode) {
  var canvas = null;
  var ctx;
  var threeScope;

  if (mode !== 'webgl' && typeof GameGlobal !== 'undefined' && GameGlobal.canvas) {
    canvas = GameGlobal.canvas;
  }
  if (!canvas && typeof wx !== 'undefined' && wx.createCanvas) {
    canvas = wx.createCanvas();
  }
  if (!canvas && typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    if (document.body && document.body.appendChild) {
      document.body.appendChild(canvas);
    }
  }
  if (!canvas) {
    canvas = {
      width: width,
      height: height,
      getContext: function () {
        return null;
      }
    };
  }
  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.canvas = canvas;
  }

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.__displayWidth = width;
  canvas.__displayHeight = height;
  canvas.__pixelRatio = pixelRatio;

  if (mode === 'webgl') {
    threeScope = require('./three-scope');
    threeScope.adaptCanvas(canvas);
    return {
      canvas: canvas,
      ctx: null
    };
  }

  ctx = canvas.getContext('2d');
  if (ctx && ctx.setTransform) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  } else if (ctx && ctx.scale) {
    ctx.scale(pixelRatio, pixelRatio);
  }
  return {
    canvas: canvas,
    ctx: ctx
  };
}

function createCanvas(width, height, pixelRatio) {
  var canvas = null;
  var ctx;
  if (typeof wx !== 'undefined' && wx.createCanvas) {
    canvas = wx.createCanvas();
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
  } else {
    canvas = {
      width: width,
      height: height,
      getContext: function () {
        return null;
      }
    };
  }
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.__displayWidth = width;
  canvas.__displayHeight = height;
  ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (ctx && ctx.setTransform) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  } else if (ctx && ctx.scale) {
    ctx.scale(pixelRatio, pixelRatio);
  }
  return {
    canvas: canvas,
    ctx: ctx
  };
}

function safeGetStorage(key, fallbackValue) {
  try {
    if (typeof wx === 'undefined' || !wx.getStorageSync) {
      return fallbackValue;
    }
    var value = wx.getStorageSync(key);
    return value === '' || value === undefined || value === null ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}

function safeSetStorage(key, value) {
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(key, value);
    }
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
  ctx.lineWidth = lineWidth || 1;
  ctx.stroke();
}

function setTextStyle(ctx, size, weight, color, align, baseline) {
  var fontSize = Math.max(8, Math.round(size));
  ctx.font = (weight || '500') + ' ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
}

function fitText(ctx, text, maxWidth, baseSize, minSize, weight) {
  var size = baseSize;
  var label = text === undefined || text === null ? '' : String(text);
  var clipped = label;
  var ellipsis = '...';
  if (!ctx || !ctx.measureText) {
    return {
      text: label,
      size: size
    };
  }
  while (size > minSize) {
    setTextStyle(ctx, size, weight, '#000', 'left', 'alphabetic');
    if (ctx.measureText(clipped).width <= maxWidth) {
      return {
        text: clipped,
        size: size
      };
    }
    size -= 1;
  }
  setTextStyle(ctx, size, weight, '#000', 'left', 'alphabetic');
  while (clipped.length > 0 && ctx.measureText(clipped + ellipsis).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return {
    text: clipped ? clipped + ellipsis : '',
    size: size
  };
}

module.exports = {
  clamp: clamp,
  lerp: lerp,
  distance: distance,
  normalize: normalize,
  pointInRect: pointInRect,
  getTouchPoint: getTouchPoint,
  getWindowInfo: getWindowInfo,
  createRenderer: createRenderer,
  createCanvas: createCanvas,
  safeGetStorage: safeGetStorage,
  safeSetStorage: safeSetStorage,
  fillRoundRect: fillRoundRect,
  strokeRoundRect: strokeRoundRect,
  setTextStyle: setTextStyle,
  fitText: fitText
};
