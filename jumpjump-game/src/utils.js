'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function easeInOutQuad(t) {
  var normalized = clamp(t, 0, 1);
  return normalized < 0.5
    ? 2 * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 2) / 2;
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

function now() {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }

  return Date.now();
}

function getWindowInfo() {
  if (wx.getWindowInfo) {
    return wx.getWindowInfo();
  }

  return wx.getSystemInfoSync();
}

function getRequestAnimationFrame() {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame;
  }

  return function (callback) {
    return setTimeout(function () {
      callback(now());
    }, 1000 / 60);
  };
}

function createRenderer(width, height, pixelRatio) {
  var canvas = null;

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

  var ctx = canvas.getContext('2d');

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

function createImageNode(canvas) {
  if (canvas && typeof canvas.createImage === 'function') {
    return canvas.createImage();
  }

  return wx.createImage();
}

function loadImage(canvas, src) {
  return new Promise(function (resolve, reject) {
    var image = createImageNode(canvas);

    image.onload = function () {
      resolve(image);
    };

    image.onerror = function () {
      reject(new Error('Failed to load image: ' + src));
    };

    image.src = src;
  });
}

function normalizeTouch(touch) {
  if (!touch) {
    return null;
  }

  return {
    identifier: getTouchIdentifier(touch),
    x: touch.clientX !== undefined
      ? touch.clientX
      : (touch.x !== undefined ? touch.x : (touch.pageX !== undefined ? touch.pageX : touch.screenX)),
    y: touch.clientY !== undefined
      ? touch.clientY
      : (touch.y !== undefined ? touch.y : (touch.pageY !== undefined ? touch.pageY : touch.screenY))
  };
}

function getTouchIdentifier(touch) {
  if (!touch) {
    return null;
  }

  return touch.identifier !== undefined ? touch.identifier : (touch.id !== undefined ? touch.id : 0);
}

function pickTouch(event, identifier) {
  var touches = [];

  if (event && event.touches && event.touches.length) {
    touches = event.touches;
  } else if (event && event.changedTouches && event.changedTouches.length) {
    touches = event.changedTouches;
  }

  if (identifier === null || identifier === undefined) {
    return normalizeTouch(touches[0] || null);
  }

  for (var i = 0; i < touches.length; i += 1) {
    if (getTouchIdentifier(touches[i]) === identifier) {
      return normalizeTouch(touches[i]);
    }
  }

  return null;
}

function pickActiveTouch(event, identifier) {
  var touches = event && event.touches && event.touches.length
    ? event.touches
    : [];

  if (identifier === null || identifier === undefined) {
    return normalizeTouch(touches[0] || null);
  }

  for (var i = 0; i < touches.length; i += 1) {
    if (getTouchIdentifier(touches[i]) === identifier) {
      return normalizeTouch(touches[i]);
    }
  }

  return null;
}

function pickChangedTouch(event, identifier) {
  var touches = event && event.changedTouches && event.changedTouches.length
    ? event.changedTouches
    : [];

  if (identifier === null || identifier === undefined) {
    return normalizeTouch(touches[0] || null);
  }

  for (var i = 0; i < touches.length; i += 1) {
    if (getTouchIdentifier(touches[i]) === identifier) {
      return normalizeTouch(touches[i]);
    }
  }

  return null;
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

function drawRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
  buildRoundRectPath(ctx, x, y, width, height, radius);

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth || 1;
    ctx.stroke();
  }
}

function drawCoverImage(ctx, image, x, y, width, height, alpha) {
  if (!image || !image.width || !image.height) {
    return;
  }

  var scale = Math.max(width / image.width, height / image.height);
  var drawWidth = image.width * scale;
  var drawHeight = image.height * scale;
  var drawX = x + (width - drawWidth) / 2;
  var drawY = y + (height - drawHeight) / 2;

  ctx.save();
  if (alpha !== undefined) {
    ctx.globalAlpha = alpha;
  }
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

module.exports = {
  clamp: clamp,
  lerp: lerp,
  easeOutCubic: easeOutCubic,
  easeInOutQuad: easeInOutQuad,
  pointInRect: pointInRect,
  now: now,
  getWindowInfo: getWindowInfo,
  getRequestAnimationFrame: getRequestAnimationFrame,
  createRenderer: createRenderer,
  safeGetStorage: safeGetStorage,
  safeSetStorage: safeSetStorage,
  loadImage: loadImage,
  pickTouch: pickTouch,
  pickActiveTouch: pickActiveTouch,
  pickChangedTouch: pickChangedTouch,
  drawRoundRect: drawRoundRect,
  drawCoverImage: drawCoverImage
};
