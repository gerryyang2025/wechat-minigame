'use strict';

var scopedThree = null;
var scopedDocument = null;
var scopedWindow = null;

function getGlobalObject() {
  if (typeof GameGlobal !== 'undefined') {
    return GameGlobal;
  }
  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  return {};
}

function ensureEventTarget(target) {
  if (!target) {
    return target;
  }
  if (!target.__listeners) {
    try {
      Object.defineProperty(target, '__listeners', {
        value: {},
        configurable: true
      });
    } catch (error) {
      target.__listeners = {};
    }
  }
  if (!target.addEventListener) {
    target.addEventListener = function (type, listener) {
      if (!this.__listeners[type]) {
        this.__listeners[type] = [];
      }
      this.__listeners[type].push(listener);
    };
  }
  if (!target.removeEventListener) {
    target.removeEventListener = function (type, listener) {
      var list = this.__listeners[type];
      var index;
      if (!list) {
        return;
      }
      index = list.indexOf(listener);
      if (index !== -1) {
        list.splice(index, 1);
      }
    };
  }
  if (!target.dispatchEvent) {
    target.dispatchEvent = function (event) {
      var list = this.__listeners[event && event.type] || [];
      var i;
      for (i = 0; i < list.length; i += 1) {
        list[i].call(this, event);
      }
      return true;
    };
  }
  return target;
}

function defineCanvasGetter(canvas, name, getter) {
  try {
    Object.defineProperty(canvas, name, {
      configurable: true,
      get: getter
    });
  } catch (error) {
    try {
      canvas[name] = getter.call(canvas);
    } catch (error2) {
      // Native WeChat canvases may expose read-only DOM-like fields.
    }
  }
}

function safeInstallProperty(target, name, value, overwrite) {
  if (!target) {
    return false;
  }
  try {
    if (!overwrite && target[name] !== undefined && target[name] !== null) {
      return true;
    }
  } catch (readError) {
    // Some host objects expose throwing getters. Try defining below.
  }
  try {
    target[name] = value;
    return target[name] === value;
  } catch (assignError) {
    try {
      Object.defineProperty(target, name, {
        configurable: true,
        writable: true,
        value: value
      });
      return true;
    } catch (defineError) {
      return false;
    }
  }
}

function adaptCanvas(canvas) {
  if (!canvas) {
    return canvas;
  }
  ensureEventTarget(canvas);
  defineCanvasGetter(canvas, 'style', function () {
    return {
      width: (this.__displayWidth || this.width || 1) + 'px',
      height: (this.__displayHeight || this.height || 1) + 'px'
    };
  });
  defineCanvasGetter(canvas, 'clientWidth', function () {
    return this.__displayWidth || this.width || 1;
  });
  defineCanvasGetter(canvas, 'clientHeight', function () {
    return this.__displayHeight || this.height || 1;
  });
  return canvas;
}

function createImageForCanvas(canvas) {
  if (canvas && canvas.createImage) {
    return canvas.createImage();
  }
  if (typeof wx !== 'undefined' && wx.createImage) {
    return wx.createImage();
  }
  return ensureEventTarget({
    width: 1,
    height: 1,
    src: ''
  });
}

function createDocumentShim(canvas) {
  return ensureEventTarget({
    createElementNS: function (_, type) {
      if (type === 'canvas') {
        return canvas;
      }
      if (type === 'img' || type === 'image') {
        return createImageForCanvas(canvas);
      }
      return ensureEventTarget({});
    },
    createElement: function (type) {
      return this.createElementNS('', type);
    }
  });
}

function installPlatformShims(canvas) {
  var root = getGlobalObject();
  var documentShim = createDocumentShim(canvas);
  var windowShim = ensureEventTarget({
    AudioContext: function () {},
    webkitAudioContext: function () {},
    URL: {},
    devicePixelRatio: 1
  });
  var forceWeChatShim = typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
  var ImageShim = function () {
    return createImageForCanvas(canvas);
  };

  scopedDocument = documentShim;
  scopedWindow = windowShim;

  safeInstallProperty(root, 'document', documentShim, forceWeChatShim);
  safeInstallProperty(root, 'window', windowShim, forceWeChatShim);
  safeInstallProperty(root, 'HTMLCanvasElement', undefined, false);
  safeInstallProperty(root, 'Image', ImageShim, false);

  if (typeof globalThis !== 'undefined') {
    safeInstallProperty(globalThis, 'document', documentShim, forceWeChatShim);
    safeInstallProperty(globalThis, 'window', windowShim, forceWeChatShim);
    safeInstallProperty(globalThis, 'HTMLCanvasElement', undefined, false);
    safeInstallProperty(globalThis, 'Image', ImageShim, false);
  }
  safeInstallProperty(canvas, 'ownerDocument', documentShim, true);
}

function createScopedThreejs(canvas) {
  adaptCanvas(canvas);
  installPlatformShims(canvas);
  if (!scopedThree) {
    scopedThree = require('../libs/three');
  }
  scopedThree.__wechatScopedCanvas = canvas;
  scopedThree.__wechatScopedDocument = scopedDocument;
  scopedThree.__wechatScopedWindow = scopedWindow;
  scopedThree.__createScopedThreejs = createScopedThreejs;
  return scopedThree;
}

module.exports = {
  adaptCanvas: adaptCanvas,
  createScopedThreejs: createScopedThreejs
};
