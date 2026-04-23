'use strict';

var utils = require('./utils');
var powerUpStyles = require('./powerup-style');
var DOUBLE_SHOT_DURATION = 30;
var FIREPOWER_UPGRADE_DURATION = 10;
var FIREPOWER_UPGRADE_INTERVAL = 0.18;
var SHIELD_DURATION = 10;
var INK = '#342d28';
var SOFT_INK = '#6f6459';
var PAPER_FILL = '#f7f2e8';
var PAPER_SHADE = '#e7ddce';
var PAPER_DARK = '#d6caba';
var SMUDGE = 'rgba(65, 56, 48, 0.08)';
var ENEMY_TYPES = {
  small: {
    width: 38,
    height: 32,
    score: 1000,
    health: 1,
    speedMin: 220,
    speedRange: 120,
    speedPerLevel: 12,
    scaleMin: 0.9,
    scaleRange: 0.18,
    tilt: 0.22
  },
  medium: {
    width: 58,
    height: 48,
    score: 5000,
    health: 4,
    speedMin: 170,
    speedRange: 85,
    speedPerLevel: 10,
    scaleMin: 0.92,
    scaleRange: 0.16,
    tilt: 0.12,
    canShoot: true,
    fireIntervalMin: 1.55,
    fireIntervalRange: 0.55
  },
  large: {
    width: 82,
    height: 66,
    score: 20000,
    health: 10,
    speedMin: 120,
    speedRange: 55,
    speedPerLevel: 8,
    scaleMin: 0.98,
    scaleRange: 0.12,
    tilt: 0.06,
    canShoot: true,
    fireIntervalMin: 1.1,
    fireIntervalRange: 0.4
  }
};

function fillSketchShape(ctx, buildPath, fillStyle, strokeStyle, lineWidth, jitter) {
  if (fillStyle) {
    ctx.save();
    ctx.beginPath();
    buildPath(ctx);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  utils.drawSketchStroke(ctx, buildPath, {
    strokeStyle: strokeStyle || INK,
    lineWidth: lineWidth || 1.6,
    jitter: jitter === undefined ? 0.8 : jitter
  });
}

function drawSketchCircle(ctx, x, y, radius, strokeStyle, lineWidth, jitter) {
  utils.drawSketchStroke(ctx, function (strokeCtx) {
    strokeCtx.arc(x, y, radius, 0, Math.PI * 2);
  }, {
    strokeStyle: strokeStyle || INK,
    lineWidth: lineWidth || 1.4,
    jitter: jitter === undefined ? 0.7 : jitter
  });
}

function drawPlayerPlane(ctx, width, height) {
  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(width * 0.5, 0);
    pathCtx.lineTo(width * 0.92, height * 0.8);
    pathCtx.lineTo(width * 0.62, height * 0.64);
    pathCtx.lineTo(width * 0.56, height);
    pathCtx.lineTo(width * 0.5, height * 0.82);
    pathCtx.lineTo(width * 0.44, height);
    pathCtx.lineTo(width * 0.38, height * 0.64);
    pathCtx.lineTo(width * 0.08, height * 0.8);
    pathCtx.closePath();
  }, '#f8f4ec', INK, 1.8, 0.95);

  utils.drawSketchLine(ctx, width * 0.5, height * 0.08, width * 0.5, height * 0.84, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.3,
    jitter: 0.45
  });
  utils.drawSketchLine(ctx, width * 0.5, height * 0.2, width * 0.18, height * 0.72, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.1,
    jitter: 0.4
  });
  utils.drawSketchLine(ctx, width * 0.5, height * 0.2, width * 0.82, height * 0.72, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.1,
    jitter: 0.4
  });
}

function drawSmallEnemy(ctx, width, height) {
  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(width * 0.5, 0);
    pathCtx.lineTo(width * 0.88, height * 0.68);
    pathCtx.lineTo(width * 0.62, height * 0.54);
    pathCtx.lineTo(width * 0.54, height);
    pathCtx.lineTo(width * 0.46, height);
    pathCtx.lineTo(width * 0.38, height * 0.54);
    pathCtx.lineTo(width * 0.12, height * 0.68);
    pathCtx.closePath();
  }, PAPER_SHADE, INK, 1.5, 0.8);
}

function drawMediumEnemy(ctx, width, height) {
  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(width * 0.5, 0);
    pathCtx.lineTo(width * 0.86, height * 0.3);
    pathCtx.lineTo(width, height * 0.62);
    pathCtx.lineTo(width * 0.72, height * 0.56);
    pathCtx.lineTo(width * 0.64, height);
    pathCtx.lineTo(width * 0.36, height);
    pathCtx.lineTo(width * 0.28, height * 0.56);
    pathCtx.lineTo(0, height * 0.62);
    pathCtx.lineTo(width * 0.14, height * 0.3);
    pathCtx.closePath();
  }, PAPER_DARK, INK, 1.6, 0.82);

  utils.drawSketchLine(ctx, width * 0.5, height * 0.06, width * 0.5, height * 0.86, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.1,
    jitter: 0.38
  });
  utils.drawSketchLine(ctx, width * 0.2, height * 0.28, width * 0.8, height * 0.28, {
    strokeStyle: SOFT_INK,
    lineWidth: 0.9,
    jitter: 0.32
  });
}

function drawLargeEnemy(ctx, width, height) {
  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(width * 0.5, 0);
    pathCtx.lineTo(width * 0.8, height * 0.12);
    pathCtx.lineTo(width, height * 0.42);
    pathCtx.lineTo(width * 0.8, height * 0.48);
    pathCtx.lineTo(width * 0.72, height);
    pathCtx.lineTo(width * 0.28, height);
    pathCtx.lineTo(width * 0.2, height * 0.48);
    pathCtx.lineTo(0, height * 0.42);
    pathCtx.lineTo(width * 0.2, height * 0.12);
    pathCtx.closePath();
  }, '#d8cdbd', INK, 1.8, 0.82);

  for (var i = 0; i < 3; i += 1) {
    var engineX = width * (0.27 + i * 0.23);
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(engineX - width * 0.05, height * 0.48);
      pathCtx.lineTo(engineX + width * 0.05, height * 0.48);
      pathCtx.lineTo(engineX + width * 0.04, height * 0.76);
      pathCtx.lineTo(engineX - width * 0.04, height * 0.76);
      pathCtx.closePath();
    }, PAPER_SHADE, SOFT_INK, 1.1, 0.42);
  }

  utils.drawSketchLine(ctx, width * 0.5, height * 0.08, width * 0.5, height * 0.88, {
    strokeStyle: SOFT_INK,
    lineWidth: 1.1,
    jitter: 0.35
  });
  utils.drawSketchLine(ctx, width * 0.18, height * 0.32, width * 0.82, height * 0.32, {
    strokeStyle: SOFT_INK,
    lineWidth: 1,
    jitter: 0.3
  });
  utils.drawSketchLine(ctx, width * 0.18, height * 0.5, width * 0.82, height * 0.5, {
    strokeStyle: SOFT_INK,
    lineWidth: 1,
    jitter: 0.3
  });
}

function drawEnemyPlane(ctx, width, height, type, healthRatio) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(Math.PI);
  ctx.translate(-width / 2, -height / 2);

  if (type === 'medium') {
    drawMediumEnemy(ctx, width, height);
  } else if (type === 'large') {
    drawLargeEnemy(ctx, width, height);
  } else {
    drawSmallEnemy(ctx, width, height);
  }

  if (type !== 'small') {
    var damageLevel = 1 - healthRatio;
    if (damageLevel > 0.01) {
      utils.drawSketchLine(ctx, width * 0.26, height * 0.24, width * (0.38 + damageLevel * 0.14), height * (0.42 + damageLevel * 0.1), {
        strokeStyle: 'rgba(89, 78, 69, 0.55)',
        lineWidth: 0.9,
        jitter: 0.22
      });
      utils.drawSketchLine(ctx, width * 0.68, height * 0.36, width * 0.8, height * 0.24, {
        strokeStyle: 'rgba(89, 78, 69, 0.42)',
        lineWidth: 0.8,
        jitter: 0.2
      });
    }
  }

  ctx.restore();
}

function drawParachuteSupply(ctx, width, height, type, sway) {
  var style = powerUpStyles.getPowerUpStyle(type);
  var label = style.label || '补';
  var labelFontSize = Math.round(width * 0.145);
  var showLabel = labelFontSize >= 9 && width >= 56;
  var canopyY = height * 0.06;
  var packageTop = height * 0.48;
  var packageWidth = width * 0.42;
  var packageHeight = height * 0.28;
  var packageX = width * 0.5 - packageWidth / 2;
  var packageY = packageTop + Math.sin(sway) * height * 0.03;

  ctx.save();
  ctx.translate(width * 0.5, height * 0.18);
  ctx.rotate(Math.sin(sway) * 0.08);
  ctx.translate(-width * 0.5, -height * 0.18);

  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(width * 0.16, canopyY + height * 0.12);
    pathCtx.quadraticCurveTo(width * 0.5, canopyY - height * 0.04, width * 0.84, canopyY + height * 0.12);
    pathCtx.lineTo(width * 0.74, canopyY + height * 0.24);
    pathCtx.quadraticCurveTo(width * 0.5, canopyY + height * 0.14, width * 0.26, canopyY + height * 0.24);
    pathCtx.closePath();
  }, style.canopyFill || '#f5efe4', INK, 1.25, 0.55);

  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(width * 0.42, canopyY + height * 0.03);
    pathCtx.quadraticCurveTo(width * 0.5, canopyY - height * 0.01, width * 0.58, canopyY + height * 0.03);
    pathCtx.lineTo(width * 0.56, canopyY + height * 0.19);
    pathCtx.quadraticCurveTo(width * 0.5, canopyY + height * 0.15, width * 0.44, canopyY + height * 0.19);
    pathCtx.closePath();
  }, style.packageFill, style.accent, 1.05, 0.34);

  utils.drawSketchLine(ctx, width * 0.26, canopyY + height * 0.18, packageX + packageWidth * 0.18, packageY, {
    strokeStyle: style.accent,
    lineWidth: 0.9,
    jitter: 0.24
  });
  utils.drawSketchLine(ctx, width * 0.74, canopyY + height * 0.18, packageX + packageWidth * 0.82, packageY, {
    strokeStyle: style.accent,
    lineWidth: 0.9,
    jitter: 0.24
  });
  utils.drawSketchLine(ctx, width * 0.4, canopyY + height * 0.16, packageX + packageWidth * 0.36, packageY, {
    strokeStyle: style.accent,
    lineWidth: 0.9,
    jitter: 0.24
  });
  utils.drawSketchLine(ctx, width * 0.6, canopyY + height * 0.16, packageX + packageWidth * 0.64, packageY, {
    strokeStyle: style.accent,
    lineWidth: 0.9,
    jitter: 0.24
  });

  ctx.save();
  ctx.fillStyle = style.halo || 'rgba(122, 107, 92, 0.16)';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(
    width * 0.5,
    packageY + packageHeight * 0.52,
    packageWidth * 0.9,
    packageHeight * 0.85,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  drawSupplyPackage(ctx, packageX, packageY, packageWidth, packageHeight, style);

  utils.drawSketchLine(ctx, packageX + packageWidth * 0.1, packageY + packageHeight * 0.24, packageX + packageWidth * 0.9, packageY + packageHeight * 0.24, {
    strokeStyle: style.accent,
    lineWidth: 0.8,
    jitter: 0.2
  });

  drawSupplyIcon(ctx, packageX, packageY, packageWidth, packageHeight, style, showLabel);

  if (showLabel) {
    ctx.fillStyle = style.ink || INK;
    ctx.font = 'bold ' + labelFontSize + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width * 0.5, packageY + packageHeight * 0.74);
  }
  ctx.restore();
}

function drawSupplyPackage(ctx, x, y, width, height, style) {
  fillSketchShape(ctx, function (pathCtx) {
    if (style.shape === 'crate') {
      var cut = width * 0.12;
      pathCtx.moveTo(x + cut, y);
      pathCtx.lineTo(x + width - cut, y);
      pathCtx.lineTo(x + width, y + height * 0.22);
      pathCtx.lineTo(x + width, y + height - cut);
      pathCtx.lineTo(x + width - cut, y + height);
      pathCtx.lineTo(x + cut, y + height);
      pathCtx.lineTo(x, y + height - cut);
      pathCtx.lineTo(x, y + height * 0.22);
      pathCtx.closePath();
      return;
    }

    if (style.shape === 'tag') {
      pathCtx.moveTo(x + width * 0.18, y);
      pathCtx.quadraticCurveTo(x + width * 0.5, y - height * 0.14, x + width * 0.82, y);
      pathCtx.lineTo(x + width, y + height * 0.2);
      pathCtx.lineTo(x + width * 0.92, y + height);
      pathCtx.lineTo(x + width * 0.08, y + height);
      pathCtx.lineTo(x, y + height * 0.2);
      pathCtx.closePath();
      return;
    }

    if (style.shape === 'note') {
      var fold = width * 0.2;
      pathCtx.moveTo(x, y);
      pathCtx.lineTo(x + width - fold, y);
      pathCtx.lineTo(x + width, y + height * 0.18);
      pathCtx.lineTo(x + width, y + height);
      pathCtx.lineTo(x, y + height);
      pathCtx.closePath();
      return;
    }

    pathCtx.moveTo(x + width * 0.18, y);
    pathCtx.quadraticCurveTo(x + width * 0.5, y - height * 0.04, x + width * 0.82, y);
    pathCtx.lineTo(x + width, y + height * 0.24);
    pathCtx.lineTo(x + width * 0.92, y + height * 0.9);
    pathCtx.quadraticCurveTo(x + width * 0.5, y + height * 1.04, x + width * 0.08, y + height * 0.9);
    pathCtx.lineTo(x, y + height * 0.24);
    pathCtx.closePath();
  }, style.packageFill || PAPER_SHADE, INK, 1.2, 0.42);
}

function drawSupplyIcon(ctx, x, y, width, height, style, showLabel) {
  var iconScale = showLabel ? 1 : 1.18;
  var centerX = x + width * 0.5;
  var centerY = y + height * (showLabel ? 0.42 : 0.48);
  var iconColor = style.ink || INK;
  var accent = style.accent || SOFT_INK;
  var scaledWidth = width * iconScale;
  var scaledHeight = height * iconScale;
  var bulletHeight = scaledHeight * 0.22;

  ctx.save();

  if (style.icon === 'double') {
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(centerX - scaledWidth * 0.14, centerY - bulletHeight * 0.55);
      pathCtx.lineTo(centerX - scaledWidth * 0.06, centerY - bulletHeight * 0.8);
      pathCtx.lineTo(centerX - scaledWidth * 0.02, centerY + bulletHeight * 0.3);
      pathCtx.lineTo(centerX - scaledWidth * 0.11, centerY + bulletHeight * 0.45);
      pathCtx.closePath();
    }, accent, iconColor, 0.95, 0.2);
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(centerX + scaledWidth * 0.02, centerY - bulletHeight * 0.55);
      pathCtx.lineTo(centerX + scaledWidth * 0.1, centerY - bulletHeight * 0.8);
      pathCtx.lineTo(centerX + scaledWidth * 0.14, centerY + bulletHeight * 0.3);
      pathCtx.lineTo(centerX + scaledWidth * 0.05, centerY + bulletHeight * 0.45);
      pathCtx.closePath();
    }, accent, iconColor, 0.95, 0.2);
  } else if (style.icon === 'firepower') {
    utils.drawSketchLine(ctx, centerX, centerY - scaledHeight * 0.18, centerX, centerY + scaledHeight * 0.12, {
      strokeStyle: iconColor,
      lineWidth: 1.2,
      jitter: 0.16
    });
    utils.drawSketchLine(ctx, centerX - scaledWidth * 0.14, centerY - scaledHeight * 0.08, centerX - scaledWidth * 0.08, centerY + scaledHeight * 0.14, {
      strokeStyle: accent,
      lineWidth: 1.15,
      jitter: 0.18
    });
    utils.drawSketchLine(ctx, centerX + scaledWidth * 0.14, centerY - scaledHeight * 0.08, centerX + scaledWidth * 0.08, centerY + scaledHeight * 0.14, {
      strokeStyle: accent,
      lineWidth: 1.15,
      jitter: 0.18
    });
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(centerX, centerY - scaledHeight * 0.2);
      pathCtx.lineTo(centerX + scaledWidth * 0.08, centerY - scaledHeight * 0.04);
      pathCtx.lineTo(centerX, centerY + scaledHeight * 0.02);
      pathCtx.lineTo(centerX - scaledWidth * 0.08, centerY - scaledHeight * 0.04);
      pathCtx.closePath();
    }, accent, iconColor, 0.85, 0.18);
  } else if (style.icon === 'shield') {
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(centerX, centerY - scaledHeight * 0.16);
      pathCtx.lineTo(centerX + scaledWidth * 0.14, centerY - scaledHeight * 0.06);
      pathCtx.lineTo(centerX + scaledWidth * 0.11, centerY + scaledHeight * 0.12);
      pathCtx.lineTo(centerX, centerY + scaledHeight * 0.2);
      pathCtx.lineTo(centerX - scaledWidth * 0.11, centerY + scaledHeight * 0.12);
      pathCtx.lineTo(centerX - scaledWidth * 0.14, centerY - scaledHeight * 0.06);
      pathCtx.closePath();
    }, style.canopyFill, iconColor, 1.05, 0.18);
    utils.drawSketchLine(ctx, centerX, centerY - scaledHeight * 0.1, centerX, centerY + scaledHeight * 0.12, {
      strokeStyle: accent,
      lineWidth: 1,
      jitter: 0.16
    });
  } else if (style.icon === 'bomb') {
    drawSketchCircle(ctx, centerX, centerY + scaledHeight * 0.02, scaledWidth * 0.12, iconColor, 1.2, 0.2);
    utils.drawSketchLine(ctx, centerX, centerY - scaledHeight * 0.08, centerX + scaledWidth * 0.05, centerY - scaledHeight * 0.16, {
      strokeStyle: iconColor,
      lineWidth: 1,
      jitter: 0.16
    });
    utils.drawSketchLine(ctx, centerX + scaledWidth * 0.05, centerY - scaledHeight * 0.16, centerX + scaledWidth * 0.12, centerY - scaledHeight * 0.12, {
      strokeStyle: accent,
      lineWidth: 0.95,
      jitter: 0.16
    });
  } else if (style.icon === 'clear') {
    utils.drawSketchLine(ctx, centerX - scaledWidth * 0.14, centerY - scaledHeight * 0.14, centerX + scaledWidth * 0.14, centerY + scaledHeight * 0.14, {
      strokeStyle: iconColor,
      lineWidth: 1.2,
      jitter: 0.18
    });
    utils.drawSketchLine(ctx, centerX + scaledWidth * 0.14, centerY - scaledHeight * 0.14, centerX - scaledWidth * 0.14, centerY + scaledHeight * 0.14, {
      strokeStyle: iconColor,
      lineWidth: 1.2,
      jitter: 0.18
    });
    utils.drawSketchLine(ctx, centerX - scaledWidth * 0.2, centerY, centerX + scaledWidth * 0.2, centerY, {
      strokeStyle: accent,
      lineWidth: 1,
      jitter: 0.14
    });
  } else if (style.icon === 'slow') {
    utils.drawSketchStroke(ctx, function (strokeCtx) {
      strokeCtx.moveTo(centerX - scaledWidth * 0.1, centerY - scaledHeight * 0.16);
      strokeCtx.lineTo(centerX + scaledWidth * 0.1, centerY - scaledHeight * 0.16);
      strokeCtx.lineTo(centerX + scaledWidth * 0.03, centerY - scaledHeight * 0.02);
      strokeCtx.lineTo(centerX + scaledWidth * 0.03, centerY + scaledHeight * 0.04);
      strokeCtx.lineTo(centerX + scaledWidth * 0.1, centerY + scaledHeight * 0.18);
      strokeCtx.lineTo(centerX - scaledWidth * 0.1, centerY + scaledHeight * 0.18);
      strokeCtx.lineTo(centerX - scaledWidth * 0.03, centerY + scaledHeight * 0.04);
      strokeCtx.lineTo(centerX - scaledWidth * 0.03, centerY - scaledHeight * 0.02);
      strokeCtx.closePath();
    }, {
      strokeStyle: iconColor,
      lineWidth: 1.05,
      jitter: 0.18
    });
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(centerX - scaledWidth * 0.05, centerY - scaledHeight * 0.1);
      pathCtx.lineTo(centerX + scaledWidth * 0.05, centerY - scaledHeight * 0.1);
      pathCtx.lineTo(centerX, centerY);
      pathCtx.closePath();
    }, accent, null, 0, 0);
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(centerX - scaledWidth * 0.05, centerY + scaledHeight * 0.12);
      pathCtx.lineTo(centerX + scaledWidth * 0.05, centerY + scaledHeight * 0.12);
      pathCtx.lineTo(centerX, centerY + scaledHeight * 0.02);
      pathCtx.closePath();
    }, accent, null, 0, 0);
  } else if (style.icon === 'score') {
    ctx.fillStyle = iconColor;
    ctx.font = 'bold ' + Math.round(scaledWidth * 0.17) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x2', centerX, centerY);
    utils.drawSketchLine(ctx, centerX - scaledWidth * 0.18, centerY + scaledHeight * 0.16, centerX + scaledWidth * 0.18, centerY + scaledHeight * 0.16, {
      strokeStyle: accent,
      lineWidth: 0.95,
      jitter: 0.16
    });
  } else {
    ctx.fillStyle = iconColor;
    ctx.font = 'bold ' + Math.round(scaledWidth * 0.16) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.label || '补', centerX, centerY);
  }

  ctx.restore();
}

function triangleWave(value) {
  var cycle = value % 1;

  if (cycle < 0) {
    cycle += 1;
  }

  return cycle < 0.5
    ? cycle * 4 - 1
    : 3 - cycle * 4;
}

function Bullet(game, sprite, x, y) {
  this.game = game;
  this.sprite = sprite;
  this.scale = game.scale;
  this.width = 10 * this.scale;
  this.height = 24 * this.scale;
  this.x = x;
  this.y = y;
  this.speed = 780 * this.scale;
}

Bullet.prototype.update = function (deltaTime) {
  this.y -= this.speed * deltaTime;
};

Bullet.prototype.isOutOfBounds = function () {
  return this.y + this.height < 0;
};

Bullet.prototype.getBounds = function () {
  return {
    x: this.x + this.width * 0.15,
    y: this.y,
    width: this.width * 0.7,
    height: this.height
  };
};

Bullet.prototype.draw = function (ctx) {
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.fillStyle = SMUDGE;
  ctx.fillRect(this.width * 0.26, this.height * 0.1, this.width * 0.48, this.height * 0.8);
  fillSketchShape(ctx, function (pathCtx) {
    pathCtx.moveTo(this.width * 0.5, 0);
    pathCtx.lineTo(this.width * 0.82, this.height * 0.24);
    pathCtx.lineTo(this.width * 0.64, this.height);
    pathCtx.lineTo(this.width * 0.36, this.height);
    pathCtx.lineTo(this.width * 0.18, this.height * 0.24);
    pathCtx.closePath();
  }.bind(this), PAPER_FILL, INK, 1.1, 0.45);
  ctx.restore();
};

function EnemyBullet(game, x, y, pattern, options) {
  options = options || {};

  this.game = game;
  this.scale = game.scale;
  this.pattern = pattern || 'single';
  this.width = (this.pattern === 'heavy' ? 10 : (this.pattern === 'shard' ? 12 : 9)) * this.scale;
  this.height = (this.pattern === 'heavy' ? 18 : (this.pattern === 'shard' ? 20 : 15)) * this.scale;
  this.x = x - this.width / 2;
  this.y = y;
  this.vx = options.vx || 0;
  this.vy = options.vy || ((this.pattern === 'heavy' ? 300 : 270) * this.scale);
  this.angle = Math.atan2(this.vy, this.vx || 0) - Math.PI / 2;
  this.age = 0;
}

EnemyBullet.prototype.update = function (deltaTime) {
  this.age += deltaTime;
  this.x += this.vx * deltaTime;
  this.y += this.vy * deltaTime;
};

EnemyBullet.prototype.isOutOfBounds = function () {
  return (
    this.y > this.game.height + this.height * 2 ||
    this.x < -this.width * 2 ||
    this.x > this.game.width + this.width * 2
  );
};

EnemyBullet.prototype.getBounds = function () {
  return {
    x: this.x + this.width * 0.24,
    y: this.y + this.height * 0.12,
    width: this.width * 0.52,
    height: this.height * 0.72
  };
};

EnemyBullet.prototype.draw = function (ctx) {
  var centerX = this.x + this.width / 2;
  var centerY = this.y + this.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(this.angle);
  ctx.translate(-this.width / 2, -this.height / 2);

  if (this.pattern === 'shard') {
    utils.drawSketchLine(ctx, this.width * 0.5, this.height * 0.12, this.width * 0.5, this.height * 1.02, {
      strokeStyle: 'rgba(94, 84, 75, 0.28)',
      lineWidth: 1,
      jitter: 0.22
    });
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(this.width * 0.5, 0);
      pathCtx.lineTo(this.width * 0.88, this.height * 0.28);
      pathCtx.lineTo(this.width * 0.66, this.height);
      pathCtx.lineTo(this.width * 0.34, this.height * 0.9);
      pathCtx.lineTo(this.width * 0.12, this.height * 0.28);
      pathCtx.closePath();
    }.bind(this), '#efe6d7', INK, 1.1, 0.42);
    utils.drawSketchLine(ctx, this.width * 0.48, this.height * 0.14, this.width * 0.34, this.height * 0.74, {
      strokeStyle: SOFT_INK,
      lineWidth: 0.8,
      jitter: 0.18
    });
    utils.drawSketchLine(ctx, this.width * 0.54, this.height * 0.18, this.width * 0.66, this.height * 0.76, {
      strokeStyle: SOFT_INK,
      lineWidth: 0.8,
      jitter: 0.18
    });
  } else {
    ctx.fillStyle = 'rgba(69, 60, 52, 0.08)';
    ctx.fillRect(this.width * 0.2, this.height * 0.08, this.width * 0.6, this.height * 0.86);
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.moveTo(this.width * 0.2, 0);
      pathCtx.lineTo(this.width * 0.8, 0);
      pathCtx.lineTo(this.width * 0.64, this.height);
      pathCtx.lineTo(this.width * 0.36, this.height);
      pathCtx.closePath();
    }.bind(this), this.pattern === 'heavy' ? '#e1d4c3' : '#ece3d5', INK, 1.05, 0.38);
  }
  ctx.restore();
};

function Player(game, sprite, bulletSprite) {
  this.game = game;
  this.sprite = sprite;
  this.bulletSprite = bulletSprite;
  this.scale = game.scale;
  this.width = 52 * this.scale;
  this.height = 60 * this.scale;
  this.x = (game.width - this.width) / 2;
  this.y = game.height - game.safeBottomInset - this.height - 36 * this.scale;
  this.baseFireInterval = 0.24;
  this.fireInterval = this.baseFireInterval;
  this.fireCooldown = 0;
  this.doubleShotTime = 0;
  this.firepowerTime = 0;
  this.shieldTime = 0;
  this.shieldHits = 0;
}

Player.prototype.update = function (deltaTime) {
  var shots = 0;

  this.doubleShotTime = Math.max(0, this.doubleShotTime - deltaTime);
  this.firepowerTime = Math.max(0, this.firepowerTime - deltaTime);
  this.shieldTime = Math.max(0, this.shieldTime - deltaTime);
  this.fireInterval = this.hasFirepowerUpgrade()
    ? FIREPOWER_UPGRADE_INTERVAL
    : this.baseFireInterval;

  if (this.shieldTime === 0) {
    this.shieldHits = 0;
  }

  this.fireCooldown -= deltaTime;

  while (this.fireCooldown <= 0) {
    shots += 1;
    this.fireCooldown += this.fireInterval;
  }

  return shots;
};

Player.prototype.hasDoubleShot = function () {
  return this.doubleShotTime > 0;
};

Player.prototype.hasFirepowerUpgrade = function () {
  return this.firepowerTime > 0;
};

Player.prototype.hasShield = function () {
  return this.shieldHits > 0 && this.shieldTime > 0;
};

Player.prototype.activatePowerUp = function (type) {
  if (type === 'double') {
    this.doubleShotTime = Math.max(this.doubleShotTime, DOUBLE_SHOT_DURATION);
    return;
  }

  if (type === 'firepower') {
    this.firepowerTime = Math.max(this.firepowerTime, FIREPOWER_UPGRADE_DURATION);
    return;
  }

  if (type === 'shield') {
    this.shieldTime = Math.max(this.shieldTime, SHIELD_DURATION);
    this.shieldHits = 1;
  }
};

Player.prototype.consumeShield = function () {
  if (!this.hasShield()) {
    return false;
  }

  this.shieldHits = 0;
  this.shieldTime = 0;
  return true;
};

Player.prototype.moveTo = function (centerX, centerY) {
  var x = utils.clamp(centerX - this.width / 2, 0, this.game.width - this.width);
  var minY = this.game.safeTopInset + 88 * this.scale;
  var maxY = this.game.height - this.game.safeBottomInset - this.height - 18 * this.scale;
  var y = utils.clamp(centerY - this.height / 2, minY, maxY);

  this.x = x;
  this.y = y;
};

Player.prototype.spawnBullet = function (offsetX) {
  var bulletX = this.x + this.width / 2 - (10 * this.scale) / 2 + (offsetX || 0);
  var bulletY = this.y - 12 * this.scale;
  return new Bullet(this.game, this.bulletSprite, bulletX, bulletY);
};

Player.prototype.spawnBullets = function () {
  if (this.hasFirepowerUpgrade()) {
    return [
      this.spawnBullet(-18 * this.scale),
      this.spawnBullet(0),
      this.spawnBullet(18 * this.scale)
    ];
  }

  if (!this.hasDoubleShot()) {
    return [this.spawnBullet(0)];
  }

  return [
    this.spawnBullet(-12 * this.scale),
    this.spawnBullet(12 * this.scale)
  ];
};

Player.prototype.getBounds = function () {
  return {
    x: this.x + this.width * 0.22,
    y: this.y + this.height * 0.14,
    width: this.width * 0.56,
    height: this.height * 0.58
  };
};

Player.prototype.containsPoint = function (x, y) {
  return (
    x >= this.x &&
    x <= this.x + this.width &&
    y >= this.y &&
    y <= this.y + this.height
  );
};

Player.prototype.draw = function (ctx) {
  ctx.save();
  ctx.translate(this.x, this.y);

  if (this.hasFirepowerUpgrade()) {
    utils.drawSketchLine(ctx, this.width * 0.14, this.height * 0.9, this.width * 0.02, this.height + 14 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.42)',
      lineWidth: 1.15,
      jitter: 0.32
    });
    utils.drawSketchLine(ctx, this.width * 0.3, this.height * 0.94, this.width * 0.2, this.height + 18 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.56)',
      lineWidth: 1.25,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, this.width * 0.5, this.height * 0.98, this.width * 0.5, this.height + 22 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.62)',
      lineWidth: 1.35,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, this.width * 0.7, this.height * 0.94, this.width * 0.8, this.height + 18 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.56)',
      lineWidth: 1.25,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, this.width * 0.86, this.height * 0.9, this.width * 0.98, this.height + 14 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.42)',
      lineWidth: 1.15,
      jitter: 0.32
    });
  } else if (this.hasDoubleShot()) {
    utils.drawSketchLine(ctx, this.width * 0.26, this.height * 0.94, this.width * 0.14, this.height + 12 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.5)',
      lineWidth: 1.2,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, this.width * 0.5, this.height * 0.98, this.width * 0.5, this.height + 16 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.5)',
      lineWidth: 1.2,
      jitter: 0.35
    });
    utils.drawSketchLine(ctx, this.width * 0.74, this.height * 0.94, this.width * 0.86, this.height + 12 * this.scale, {
      strokeStyle: 'rgba(79, 69, 60, 0.5)',
      lineWidth: 1.2,
      jitter: 0.35
    });
  }

  ctx.save();
  ctx.fillStyle = SMUDGE;
  ctx.beginPath();
  ctx.ellipse(
    this.width * 0.5,
    this.height * 0.88,
    this.width * 0.34,
    this.height * 0.12,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  drawPlayerPlane(ctx, this.width, this.height);

  if (this.hasShield()) {
    drawSketchCircle(ctx, this.width * 0.5, this.height * 0.48, this.width * 0.58, 'rgba(63, 54, 47, 0.76)', 1.5, 0.85);
    drawSketchCircle(ctx, this.width * 0.5, this.height * 0.48, this.width * 0.68, 'rgba(94, 84, 75, 0.42)', 1.1, 0.65);
  }

  ctx.restore();
};

function Enemy(game, sprite, level, type, options) {
  var config = ENEMY_TYPES[type] || ENEMY_TYPES.small;
  options = options || {};

  this.game = game;
  this.sprite = sprite;
  this.type = type || 'small';
  this.config = config;
  this.scale = game.scale * (config.scaleMin + Math.random() * config.scaleRange);
  this.width = config.width * this.scale;
  this.height = config.height * this.scale;
  this.x = Math.random() * (game.width - this.width);
  this.y = -this.height - Math.random() * (game.height * 0.22);
  this.speed = (config.speedMin + level * config.speedPerLevel + Math.random() * config.speedRange) * game.height / 667;
  this.maxHealth = config.health;
  this.health = config.health;
  this.score = config.score;
  this.baseTilt = (-config.tilt + Math.random() * config.tilt * 2);
  this.tilt = this.baseTilt;
  this.fireCooldown = config.canShoot
    ? config.fireIntervalMin + Math.random() * config.fireIntervalRange
    : 0;
  this.spawnX = this.x;
  this.elapsed = 0;
  this.flightPattern = options.flightPattern || 'straight';
  this.flightAmplitude = options.flightAmplitude === undefined
    ? this.width * (this.type === 'large' ? 0.46 : 0.58)
    : options.flightAmplitude;
  this.flightFrequency = options.flightFrequency || (this.type === 'large' ? 0.9 : 1.4);
  this.flightSeed = options.flightSeed === undefined ? Math.random() : options.flightSeed;
  this.horizontalDrift = options.horizontalDrift || 0;
  this.driftCurve = options.driftCurve || 2.4;
  this.hoverThreshold = options.hoverThreshold || (game.height * 0.32);
  this.volleyStyle = options.volleyStyle || (this.type === 'large' ? 'fan' : 'default');
  this.currentPhase = this.getAttackPhase();
  this.phaseChanged = false;
}

Enemy.prototype.update = function (deltaTime) {
  var previousX = this.x;
  var targetX = this.spawnX;
  var horizontalMotion = 0;
  var verticalScale = 1;

  this.elapsed += deltaTime;

  if (this.flightPattern === 'hover' && this.y < this.hoverThreshold) {
    verticalScale = 0.58;
  }

  this.y += this.speed * verticalScale * deltaTime;

  if (this.flightPattern === 'sine') {
    targetX += Math.sin(this.elapsed * this.flightFrequency * Math.PI * 2 + this.flightSeed * Math.PI * 2) * this.flightAmplitude;
  } else if (this.flightPattern === 'zigzag') {
    targetX += triangleWave(this.elapsed * this.flightFrequency + this.flightSeed) * this.flightAmplitude;
  } else if (this.flightPattern === 'swoop') {
    var settle = 1 - Math.exp(-this.elapsed * this.driftCurve);
    var wobble = Math.sin(this.elapsed * this.flightFrequency * Math.PI * 2 + this.flightSeed * Math.PI * 2)
      * this.flightAmplitude
      * Math.max(0.16, 1 - this.elapsed * 0.24);
    targetX += this.horizontalDrift * settle + wobble;
  } else if (this.flightPattern === 'arc') {
    var arcProgress = Math.min(1, this.elapsed * this.driftCurve * 0.75);
    targetX += Math.sin(arcProgress * Math.PI * 0.5) * this.horizontalDrift;
    targetX += Math.sin(this.elapsed * this.flightFrequency * Math.PI * 2 + this.flightSeed * Math.PI * 2) * this.flightAmplitude * 0.32;
  } else if (this.flightPattern === 'hover') {
    targetX += Math.sin(this.elapsed * this.flightFrequency * Math.PI * 2 + this.flightSeed * Math.PI * 2) * this.flightAmplitude;
  }

  this.x = utils.clamp(targetX, 0, this.game.width - this.width);
  horizontalMotion = this.x - previousX;
  this.tilt = utils.clamp(this.baseTilt + horizontalMotion / Math.max(12, this.width * 0.38), -0.45, 0.45);
};

Enemy.prototype.takeHit = function (damage) {
  var previousPhase = this.getAttackPhase();
  this.health = Math.max(0, this.health - (damage || 1));
  this.currentPhase = this.getAttackPhase();
  this.phaseChanged = this.type === 'large' && this.currentPhase !== previousPhase;
  return this.health <= 0;
};

Enemy.prototype.consumePhaseChange = function () {
  var changed = this.phaseChanged;
  this.phaseChanged = false;
  return changed;
};

Enemy.prototype.getAttackPhase = function () {
  var healthRatio = this.maxHealth > 0 ? this.health / this.maxHealth : 1;

  if (this.type !== 'large') {
    return 1;
  }

  if (healthRatio <= 0.34) {
    return 3;
  }

  if (healthRatio <= 0.68) {
    return 2;
  }

  return 1;
};

Enemy.prototype.getShotOrigin = function () {
  return {
    x: this.x + this.width / 2,
    y: this.y + this.height * 0.62
  };
};

Enemy.prototype.getLargeFocusedVolley = function (centerX, shootY) {
  var player = this.game.player;
  var targetX = centerX;
  var targetY = this.game.height - 120 * this.game.scale;
  var baseVy = 294 * this.game.scale;
  var timeToTarget = 1;
  var aimedVx = 0;

  if (player) {
    targetX = player.x + player.width / 2;
    targetY = player.y + player.height * 0.32;
  }

  timeToTarget = Math.max(0.28, (targetY - shootY) / Math.max(120, baseVy));
  aimedVx = utils.clamp((targetX - centerX) / timeToTarget, -150 * this.game.scale, 150 * this.game.scale);

  return [
    { offsetX: -this.width * 0.28, vx: -210 * this.game.scale, vy: 266 * this.game.scale, pattern: 'shard' },
    { offsetX: -this.width * 0.14, vx: aimedVx - 64 * this.game.scale, vy: 282 * this.game.scale, pattern: 'shard' },
    { offsetX: 0, vx: aimedVx, vy: 300 * this.game.scale, pattern: 'heavy' },
    { offsetX: this.width * 0.14, vx: aimedVx + 64 * this.game.scale, vy: 282 * this.game.scale, pattern: 'shard' },
    { offsetX: this.width * 0.28, vx: 210 * this.game.scale, vy: 266 * this.game.scale, pattern: 'shard' }
  ];
};

Enemy.prototype.getVolleyPattern = function () {
  var origin = this.getShotOrigin();
  var phase = this.getAttackPhase();

  if (!this.config.canShoot) {
    return [];
  }

  if (this.type !== 'large') {
    return [
      {
        x: origin.x,
        y: origin.y,
        vx: 0,
        vy: 278 * this.game.scale,
        pattern: 'single'
      }
    ];
  }

  if (phase === 1) {
    return [-120, 0, 120].map(function (speed, index, list) {
      return {
        x: origin.x + (index - (list.length - 1) / 2) * this.width * 0.12,
        y: origin.y,
        vx: speed * this.game.scale,
        vy: (speed === 0 ? 304 : 260) * this.game.scale,
        pattern: speed === 0 ? 'heavy' : 'shard'
      };
    }, this);
  }

  if (phase === 2) {
    return [-190, -95, 0, 95, 190].map(function (speed, index, list) {
      return {
        x: origin.x + (index - (list.length - 1) / 2) * this.width * 0.12,
        y: origin.y,
        vx: speed * this.game.scale,
        vy: (speed === 0 ? 308 : 264) * this.game.scale,
        pattern: speed === 0 ? 'heavy' : 'shard'
      };
    }, this);
  }

  if (this.volleyStyle === 'focused') {
    return this.getLargeFocusedVolley(origin.x, origin.y).map(function (shot) {
      return {
        x: origin.x + shot.offsetX,
        y: origin.y,
        vx: shot.vx,
        vy: shot.vy,
        pattern: shot.pattern
      };
    });
  }

  return [-240, -150, -70, 0, 70, 150, 240].map(function (speed, index, list) {
    return {
      x: origin.x + (index - (list.length - 1) / 2) * this.width * 0.12,
      y: origin.y,
      vx: speed * this.game.scale,
      vy: (speed === 0 ? 312 : 258) * this.game.scale,
      pattern: speed === 0 ? 'heavy' : 'shard'
    };
  }, this);
};

Enemy.prototype.getAttackTelegraphWindow = function () {
  if (this.type === 'large') {
    return this.getAttackPhase() === 3 ? 0.52 : (this.getAttackPhase() === 2 ? 0.44 : 0.36);
  }

  if (this.type === 'medium') {
    return 0.26;
  }

  return 0;
};

Enemy.prototype.getTelegraphData = function () {
  var telegraphWindow = this.getAttackTelegraphWindow();

  if (!telegraphWindow || !this.config.canShoot) {
    return null;
  }

  if (this.fireCooldown > telegraphWindow || this.y < this.game.safeTopInset + 36 * this.game.scale) {
    return null;
  }

  return {
    progress: utils.clamp(1 - this.fireCooldown / telegraphWindow, 0, 1),
    phase: this.getAttackPhase(),
    lines: this.getVolleyPattern()
  };
};

Enemy.prototype.tryShoot = function (deltaTime) {
  var bullets = [];
  var volleyPattern = [];
  var phase = this.getAttackPhase();

  if (!this.config.canShoot) {
    return bullets;
  }

  this.fireCooldown -= deltaTime;

  if (this.fireCooldown > 0 || this.y < this.game.safeTopInset + 36 * this.game.scale) {
    return bullets;
  }

  if (this.type === 'large') {
    if (phase === 1) {
      this.fireCooldown = 1 + Math.random() * 0.18;
    } else if (phase === 2) {
      this.fireCooldown = 0.82 + Math.random() * 0.16;
    } else {
      this.fireCooldown = 0.64 + Math.random() * 0.14;
    }
    this.fireCooldown = Math.max(0.42, this.fireCooldown - Math.min(this.game.level * 0.02, 0.14));
  } else {
    this.fireCooldown = Math.max(
      0.54,
      this.config.fireIntervalMin - Math.min(this.game.level * 0.03, 0.34)
    ) + Math.random() * this.config.fireIntervalRange;
  }

  volleyPattern = this.getVolleyPattern();

  for (var i = 0; i < volleyPattern.length; i += 1) {
    bullets.push(new EnemyBullet(
      this.game,
      volleyPattern[i].x,
      volleyPattern[i].y,
      volleyPattern[i].pattern,
      {
        vx: volleyPattern[i].vx,
        vy: volleyPattern[i].vy
      }
    ));
  }

  if (this.type === 'large' && phase === 3) {
    this.volleyStyle = this.volleyStyle === 'focused' ? 'fan' : 'focused';
  }

  return bullets;
};

Enemy.prototype.isOutOfBounds = function () {
  return this.y > this.game.height + this.height;
};

Enemy.prototype.getBounds = function () {
  var paddingX = this.type === 'large' ? 0.15 : 0.12;
  var paddingY = this.type === 'large' ? 0.14 : 0.12;

  return {
    x: this.x + this.width * paddingX,
    y: this.y + this.height * paddingY,
    width: this.width * (1 - paddingX * 2),
    height: this.height * (1 - paddingY * 2)
  };
};

Enemy.prototype.draw = function (ctx) {
  var healthRatio = this.health / this.maxHealth;

  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.translate(this.width / 2, this.height / 2);
  ctx.rotate(this.tilt);
  ctx.translate(-this.width / 2, -this.height / 2);
  drawEnemyPlane(ctx, this.width, this.height, this.type, healthRatio);
  if (this.maxHealth > 1) {
    var barWidth = this.width * (this.type === 'large' ? 0.64 : 0.52);
    var barHeight = (this.type === 'large' ? 6 : 5) * this.game.scale;
    var barX = (this.width - barWidth) / 2;
    var barY = -12 * this.game.scale;

    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.rect(barX, barY, barWidth, barHeight);
    }, 'rgba(248, 244, 236, 0.72)', 'rgba(92, 81, 71, 0.45)', 0.9, 0.2);
    fillSketchShape(ctx, function (pathCtx) {
      pathCtx.rect(barX + 1.5 * this.game.scale, barY + 1.5 * this.game.scale, Math.max(0, (barWidth - 3 * this.game.scale) * healthRatio), barHeight - 3 * this.game.scale);
    }.bind(this), '#c9bbab', 'rgba(92, 81, 71, 0.18)', 0.6, 0.15);
  }
  ctx.restore();
};

function Explosion(x, y, scale) {
  this.x = x;
  this.y = y;
  this.scale = scale;
  this.age = 0;
  this.duration = 0.28;
}

Explosion.prototype.update = function (deltaTime) {
  this.age += deltaTime;
  return this.age < this.duration;
};

Explosion.prototype.draw = function (ctx) {
  var progress = this.age / this.duration;
  var radius = (8 + 22 * progress) * this.scale;
  var alpha = 1 - progress;
  var rays = 8;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (var i = 0; i < rays; i += 1) {
    var angle = (Math.PI * 2 * i) / rays;
    var innerRadius = radius * 0.35;
    var outerRadius = radius * (0.95 + (i % 2) * 0.22);
    utils.drawSketchLine(
      ctx,
      this.x + Math.cos(angle) * innerRadius,
      this.y + Math.sin(angle) * innerRadius,
      this.x + Math.cos(angle) * outerRadius,
      this.y + Math.sin(angle) * outerRadius,
      {
        strokeStyle: INK,
        lineWidth: 1.3 * this.scale,
        jitter: 0.45 * this.scale
      }
    );
  }

  drawSketchCircle(ctx, this.x, this.y, radius * 0.56, 'rgba(63, 54, 47, 0.72)', 1.2 * this.scale, 0.4 * this.scale);
  ctx.restore();
};

function PowerUp(game, type, x, y) {
  this.game = game;
  this.type = type;
  this.scale = game.scale;
  this.size = 42 * this.scale;
  this.x = x - this.size / 2;
  this.y = y - this.size * 0.44;
  this.speed = 130 * this.scale;
  this.rotation = Math.random() * Math.PI * 2;
}

PowerUp.prototype.update = function (deltaTime) {
  this.y += this.speed * deltaTime;
  this.rotation += deltaTime * 2.6;
};

PowerUp.prototype.isOutOfBounds = function () {
  return this.y > this.game.height + this.size;
};

PowerUp.prototype.getBounds = function () {
  return {
    x: this.x + this.size * 0.18,
    y: this.y + this.size * 0.14,
    width: this.size * 0.64,
    height: this.size * 0.74
  };
};

PowerUp.prototype.draw = function (ctx) {
  ctx.save();
  ctx.translate(this.x, this.y);
  drawParachuteSupply(ctx, this.size, this.size, this.type, this.rotation);
  ctx.restore();
};

module.exports = {
  Player: Player,
  Enemy: Enemy,
  Bullet: Bullet,
  EnemyBullet: EnemyBullet,
  Explosion: Explosion,
  PowerUp: PowerUp,
  ENEMY_TYPES: ENEMY_TYPES
};
