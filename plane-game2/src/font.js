'use strict';

var FONT_PATH = 'fonts/ma-shan-zheng-ui.ttf';
var DEFAULT_FONT_FAMILY = 'serif';
var cachedFontFamily = null;
var hasTriedLoading = false;

function escapeFontFamily(fontFamily) {
  if (!fontFamily) {
    return DEFAULT_FONT_FAMILY;
  }

  if (fontFamily.indexOf('"') !== -1 || fontFamily.indexOf('\'') !== -1 || fontFamily.indexOf(',') !== -1) {
    return fontFamily;
  }

  if (/\s/.test(fontFamily)) {
    return '"' + fontFamily + '", ' + DEFAULT_FONT_FAMILY;
  }

  return fontFamily + ', ' + DEFAULT_FONT_FAMILY;
}

function setGlobalFontFamily(fontFamily) {
  if (typeof GameGlobal !== 'undefined') {
    GameGlobal.__planeGame2FontFamily = fontFamily;
  }
}

function getCachedFontFamily() {
  if (cachedFontFamily) {
    return cachedFontFamily;
  }

  if (typeof GameGlobal !== 'undefined' && GameGlobal.__planeGame2FontFamily) {
    cachedFontFamily = GameGlobal.__planeGame2FontFamily;
  }

  return cachedFontFamily;
}

function ensureLoaded() {
  if (hasTriedLoading) {
    return getCachedFontFamily() || DEFAULT_FONT_FAMILY;
  }

  hasTriedLoading = true;

  if (typeof wx !== 'undefined' && typeof wx.loadFont === 'function') {
    try {
      cachedFontFamily = wx.loadFont(FONT_PATH) || null;
    } catch (error) {
      cachedFontFamily = null;
    }
  }

  if (!cachedFontFamily) {
    cachedFontFamily = DEFAULT_FONT_FAMILY;
  }

  setGlobalFontFamily(cachedFontFamily);
  return cachedFontFamily;
}

function getFontFamily() {
  return getCachedFontFamily() || DEFAULT_FONT_FAMILY;
}

function buildCanvasFont(size, weight) {
  var fontFamily = ensureLoaded();
  return (weight ? weight + ' ' : '') + Math.round(size) + 'px ' + escapeFontFamily(fontFamily);
}

function applyCanvasFont(ctx, size, weight) {
  ctx.font = buildCanvasFont(size, weight);
  return ctx.font;
}

module.exports = {
  FONT_PATH: FONT_PATH,
  DEFAULT_FONT_FAMILY: DEFAULT_FONT_FAMILY,
  ensureLoaded: ensureLoaded,
  getFontFamily: getFontFamily,
  buildCanvasFont: buildCanvasFont,
  applyCanvasFont: applyCanvasFont
};
