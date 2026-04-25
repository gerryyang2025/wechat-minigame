'use strict';

function getWindowInfo() {
  if (typeof wx.getWindowInfo === 'function') {
    return wx.getWindowInfo();
  }

  if (typeof wx.getSystemInfoSync === 'function') {
    return wx.getSystemInfoSync();
  }

  return {
    windowWidth: 812,
    windowHeight: 375,
    pixelRatio: 1
  };
}

function resizeRenderer(renderer, width, height, pixelRatio) {
  if (!renderer || !renderer.canvas || !renderer.ctx) {
    return;
  }

  renderer.width = width;
  renderer.height = height;
  renderer.pixelRatio = pixelRatio;
  renderer.canvas.width = Math.round(width * pixelRatio);
  renderer.canvas.height = Math.round(height * pixelRatio);

  if (renderer.ctx.setTransform) {
    renderer.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  } else if (renderer.ctx.scale) {
    renderer.ctx.scale(pixelRatio, pixelRatio);
  }
}

function createRenderer(width, height, pixelRatio) {
  var canvas = wx.createCanvas();
  var ctx = canvas.getContext('2d');
  var renderer = {
    canvas: canvas,
    ctx: ctx,
    width: width,
    height: height,
    pixelRatio: pixelRatio
  };

  resizeRenderer(renderer, width, height, pixelRatio);
  return renderer;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

function rectContainsPoint(rect, x, y) {
  return !!rect
    && x >= rect.x
    && x <= rect.x + rect.width
    && y >= rect.y
    && y <= rect.y + rect.height;
}

function rectsIntersect(a, b) {
  return !!a && !!b
    && a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function resolveTouchPoint(touch) {
  return {
    id: touch.identifier,
    x: touch.clientX !== undefined ? touch.clientX : touch.x,
    y: touch.clientY !== undefined ? touch.clientY : touch.y
  };
}

function roundRectPath(ctx, x, y, width, height, radius) {
  var safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle, alpha) {
  ctx.save();
  if (alpha !== undefined) {
    ctx.globalAlpha = alpha;
  }
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth, alpha) {
  ctx.save();
  if (alpha !== undefined) {
    ctx.globalAlpha = alpha;
  }
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth || 1;
  ctx.stroke();
  ctx.restore();
}

function setTextStyle(ctx, size, weight, color, align, baseline) {
  ctx.font = (weight ? weight + ' ' : '') + Math.round(size) + 'px Arial';
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
}

function drawButton(ctx, rect, label, options) {
  var settings = options || {};
  fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, settings.radius || 18, settings.fillStyle || 'rgba(33, 40, 74, 0.92)');
  strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, settings.radius || 18, settings.strokeStyle || 'rgba(255, 255, 255, 0.22)', settings.lineWidth || 2);
  ctx.save();
  setTextStyle(
    ctx,
    settings.fontSize || 18,
    'bold',
    settings.textColor || '#ffffff',
    'center',
    'middle'
  );
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + (settings.textOffsetY || 0));
  ctx.restore();
}

function drawPanel(ctx, x, y, width, height, options) {
  var settings = options || {};
  fillRoundRect(ctx, x, y, width, height, settings.radius || 22, settings.fillStyle || 'rgba(13, 18, 37, 0.82)');
  strokeRoundRect(ctx, x, y, width, height, settings.radius || 22, settings.strokeStyle || 'rgba(255, 255, 255, 0.18)', settings.lineWidth || 2);
}

function wrapText(ctx, text, maxWidth) {
  if (!text) {
    return [];
  }

  var lines = [];
  var rawLines = String(text).split('\n');

  rawLines.forEach(function (rawLine) {
    var current = '';

    rawLine.split('').forEach(function (char) {
      var test = current + char;
      if (current && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    });

    if (current) {
      lines.push(current);
    } else if (!rawLine) {
      lines.push('');
    }
  });

  return lines;
}

function formatCooldown(remaining) {
  if (remaining <= 0) {
    return '';
  }

  return (remaining / 1000).toFixed(1) + '秒';
}

module.exports = {
  clamp: clamp,
  createRenderer: createRenderer,
  drawButton: drawButton,
  drawPanel: drawPanel,
  fillRoundRect: fillRoundRect,
  formatCooldown: formatCooldown,
  getWindowInfo: getWindowInfo,
  lerp: lerp,
  rectContainsPoint: rectContainsPoint,
  rectsIntersect: rectsIntersect,
  resolveTouchPoint: resolveTouchPoint,
  resizeRenderer: resizeRenderer,
  roundRectPath: roundRectPath,
  setTextStyle: setTextStyle,
  strokeRoundRect: strokeRoundRect,
  wrapText: wrapText
};
