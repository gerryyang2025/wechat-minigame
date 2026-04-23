'use strict';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

function getWindowInfo() {
  if (wx.getWindowInfo) {
    return wx.getWindowInfo();
  }

  return wx.getSystemInfoSync();
}

function now() {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }

  return Date.now();
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

function configureCanvas(canvas, width, height, pixelRatio) {
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  var ctx = canvas.getContext('2d');

  if (ctx.setTransform) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  } else {
    ctx.scale(pixelRatio, pixelRatio);
  }

  return ctx;
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

function createImageNode(canvas) {
  if (canvas && typeof canvas.createImage === 'function') {
    return canvas.createImage();
  }

  return wx.createImage();
}

function createOffscreenCanvas(width, height) {
  if (typeof wx.createOffscreenCanvas === 'function') {
    return wx.createOffscreenCanvas({
      type: '2d',
      width: width,
      height: height
    });
  }

  if (typeof wx.createCanvas !== 'function') {
    return null;
  }

  var canvas = wx.createCanvas();
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImage(canvasOrSrc, srcOrOptions, maybeOptions) {
  var canvas = null;
  var src = canvasOrSrc;
  var options = srcOrOptions;

  if (typeof canvasOrSrc !== 'string') {
    canvas = canvasOrSrc;
    src = srcOrOptions;
    options = maybeOptions;
  }

  return new Promise(function (resolve, reject) {
    var image = createImageNode(canvas);

    image.onload = function () {
      if (options && options.sketchify) {
        resolve(sketchifyImage(image, options));
        return;
      }

      if (options && options.removeWhiteBg) {
        resolve(removeWhiteBackground(image, options.threshold || 215));
        return;
      }

      resolve(image);
    };

    image.onerror = function () {
      reject(new Error('Failed to load asset: ' + src));
    };

    image.src = src;
  });
}

function sketchifyImage(image, options) {
  var canvas = createOffscreenCanvas(image.width, image.height);
  var threshold = options && options.threshold !== undefined ? options.threshold : 228;
  var alphaBoost = options && options.alphaBoost !== undefined ? options.alphaBoost : 1;

  if (!canvas) {
    return image;
  }

  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height);

  var imageData = ctx.getImageData(0, 0, image.width, image.height);
  var data = imageData.data;

  for (var i = 0; i < data.length; i += 4) {
    var red = data[i];
    var green = data[i + 1];
    var blue = data[i + 2];
    var alpha = data[i + 3];
    var brightness = (red + green + blue) / 3;
    var darkness = 255 - brightness;
    var lineStrength = darkness / 255;
    var inkTone = Math.round(52 + brightness * 0.18);

    if (brightness >= threshold && alpha > 0) {
      data[i + 3] = 0;
      continue;
    }

    data[i] = clamp(inkTone + 10, 0, 255);
    data[i + 1] = clamp(inkTone + 6, 0, 255);
    data[i + 2] = clamp(inkTone, 0, 255);
    data[i + 3] = clamp(Math.round(alpha * (0.34 + lineStrength * 0.86) * alphaBoost), 0, 255);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function removeWhiteBackground(image, threshold) {
  var canvas = createOffscreenCanvas(image.width, image.height);

  if (!canvas) {
    return image;
  }

  var ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height);

  var imageData = ctx.getImageData(0, 0, image.width, image.height);
  var data = imageData.data;

  for (var i = 0; i < data.length; i += 4) {
    var red = data[i];
    var green = data[i + 1];
    var blue = data[i + 2];
    var isLight = red >= threshold && green >= threshold && blue >= threshold;

    if (isLight) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
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

function drawRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  buildRoundRectPath(ctx, x, y, width, height, radius);

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

function drawSketchStroke(ctx, buildPath, options) {
  var settings = options || {};
  var strokeStyle = settings.strokeStyle || '#3a342e';
  var lineWidth = settings.lineWidth || 1.5;
  var jitter = settings.jitter === undefined ? 1 : settings.jitter;
  var offsets = settings.offsets || [
    { x: 0, y: 0 },
    { x: 0.55, y: -0.32 },
    { x: -0.42, y: 0.24 }
  ];

  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineCap = settings.lineCap || 'round';
  ctx.lineJoin = settings.lineJoin || 'round';

  for (var i = 0; i < offsets.length; i += 1) {
    var offset = offsets[i];
    ctx.save();
    ctx.translate(offset.x * jitter, offset.y * jitter);
    ctx.globalAlpha = settings.alpha === undefined ? (0.94 - i * 0.16) : settings.alpha;
    ctx.lineWidth = lineWidth * (1 - i * 0.08);
    ctx.beginPath();
    buildPath(ctx);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawSketchLine(ctx, x1, y1, x2, y2, options) {
  drawSketchStroke(ctx, function (lineCtx) {
    lineCtx.moveTo(x1, y1);
    lineCtx.lineTo(x2, y2);
  }, options);
}

function drawSketchRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) {
  if (fillStyle) {
    ctx.save();
    buildRoundRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  drawSketchStroke(ctx, function (strokeCtx) {
    buildRoundRectPath(strokeCtx, x, y, width, height, radius);
  }, {
    strokeStyle: strokeStyle,
    lineWidth: lineWidth || 1.5,
    jitter: 0.9
  });
}

function createStars(width, height, count) {
  var stars = [];

  for (var i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2.4,
      speed: 20 + Math.random() * 90,
      alpha: 0.2 + Math.random() * 0.8
    });
  }

  return stars;
}

function updateStars(stars, deltaTime, height) {
  for (var i = 0; i < stars.length; i += 1) {
    var star = stars[i];
    star.y += star.speed * deltaTime;

    if (star.y > height) {
      star.y = -star.size;
    }
  }
}

module.exports = {
  clamp: clamp,
  intersects: intersects,
  pointInRect: pointInRect,
  getWindowInfo: getWindowInfo,
  now: now,
  getRequestAnimationFrame: getRequestAnimationFrame,
  configureCanvas: configureCanvas,
  createRenderer: createRenderer,
  loadImage: loadImage,
  safeGetStorage: safeGetStorage,
  safeSetStorage: safeSetStorage,
  drawRoundRect: drawRoundRect,
  drawSketchStroke: drawSketchStroke,
  drawSketchLine: drawSketchLine,
  drawSketchRoundRect: drawSketchRoundRect,
  createStars: createStars,
  updateStars: updateStars
};
