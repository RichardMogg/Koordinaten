'use strict';

(function () {
  var LOGO_BOX_HEIGHT = 104;

  function getSchema() {
    return window.FORM_RUNTIME_CONFIG && window.FORM_RUNTIME_CONFIG.schema ? window.FORM_RUNTIME_CONFIG.schema : null;
  }

  function svgDataUrl(svgText) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svgText || ''));
  }

  function ensureLayout(asset, defaults) {
    var layout = asset && asset.layout && typeof asset.layout === 'object' ? asset.layout : {};

    return {
      scalePercent: clampNumber(layout.scalePercent, 5, 800, defaults.scalePercent),
      positionXPercent: clampNumber(layout.positionXPercent, -300, 300, defaults.positionXPercent),
      positionYPercent: clampNumber(layout.positionYPercent, -300, 300, defaults.positionYPercent)
    };
  }

  function clampNumber(value, min, max, fallback) {
    var number = Number(value);

    if (isNaN(number)) {
      number = fallback;
    }

    return Math.max(min, Math.min(max, number));
  }

  function renderRuntimeLogo(schema) {
    var host = document.getElementById('runtimeLogo');
    var asset = schema && schema.assets ? schema.assets.headerLogo : null;

    if (!host) {
      return;
    }

    host.innerHTML = '';

    if (!asset || asset.enabled === false || !asset.svgText) {
      return;
    }

    var layout = ensureLayout(asset, {
      scalePercent: 100,
      positionXPercent: 50,
      positionYPercent: 50
    });
    var img = document.createElement('img');

    host.style.display = 'block';
    host.style.position = 'relative';
    host.style.width = '100%';
    host.style.height = LOGO_BOX_HEIGHT + 'px';
    host.style.minHeight = LOGO_BOX_HEIGHT + 'px';
    host.style.marginBottom = '1px';
    host.style.overflow = 'hidden';

    img.src = svgDataUrl(asset.svgText);
    img.alt = asset.alt || 'Logo';
    img.style.position = 'absolute';
    img.style.left = layout.positionXPercent + '%';
    img.style.top = layout.positionYPercent + '%';
    img.style.height = Math.round(LOGO_BOX_HEIGHT * layout.scalePercent / 100) + 'px';
    img.style.width = 'auto';
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.transform = 'translate(-50%, -50%)';

    host.appendChild(img);
  }

  function renderRuntimeBackground(schema) {
    var asset = schema && schema.assets ? schema.assets.backgroundGraphic : null;
    var pageBg = document.querySelector('.page-bg');
    var oldImages = document.querySelectorAll('.runtime-background-image');

    document.body.classList.remove('has-runtime-bg');
    document.body.style.removeProperty('--runtime-bg-image');

    oldImages.forEach(function (oldImage) {
      oldImage.remove();
    });

    if (!pageBg || !asset || asset.enabled === false || !asset.svgText) {
      return;
    }

    var layout = ensureLayout(asset, {
      scalePercent: 100,
      positionXPercent: 50,
      positionYPercent: 50
    });
    var img = document.createElement('img');

    pageBg.style.position = 'fixed';
    pageBg.style.inset = '0';
    pageBg.style.overflow = 'hidden';
    pageBg.style.zIndex = '-2';
    pageBg.style.pointerEvents = 'none';

    img.className = 'runtime-background-image';
    img.src = svgDataUrl(asset.svgText);
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.style.position = 'absolute';
    img.style.left = layout.positionXPercent + '%';
    img.style.top = layout.positionYPercent + '%';
    img.style.width = layout.scalePercent + '%';
    img.style.height = 'auto';
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = '0';
    img.style.pointerEvents = 'none';
    img.style.userSelect = 'none';

    pageBg.appendChild(img);
  }

  function renderRuntimeAssets() {
    var schema = getSchema();

    if (!schema) {
      return;
    }

    renderRuntimeLogo(schema);
    renderRuntimeBackground(schema);
  }

  document.addEventListener('DOMContentLoaded', renderRuntimeAssets);
  window.FormRuntimeAssets = {
    render: renderRuntimeAssets
  };
})();
