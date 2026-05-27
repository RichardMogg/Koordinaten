'use strict';

(function () {
  function getSchema() {
    return window.FORM_RUNTIME_CONFIG && window.FORM_RUNTIME_CONFIG.schema ? window.FORM_RUNTIME_CONFIG.schema : null;
  }

  function footerLines(schema) {
    if (!schema || typeof ensureSchemaFooter !== 'function') {
      return [];
    }

    ensureSchemaFooter(schema);

    if (!schema.footer.enabled) {
      return [];
    }

    return (schema.footer.lines || []).map(function (line) {
      return String(line && line.text || '').trim();
    }).filter(Boolean);
  }

  function themeDefaults(schema) {
    return schema && schema.theme && schema.theme.defaults ? schema.theme.defaults : { colors: {}, opacity: {} };
  }

  function hexToRgba(hex, alpha) {
    var normalized = String(hex || '#ffffff').replace('#', '').trim();

    if (normalized.length === 3) {
      normalized = normalized.split('').map(function (char) {
        return char + char;
      }).join('');
    }

    var r = parseInt(normalized.slice(0, 2), 16);
    var g = parseInt(normalized.slice(2, 4), 16);
    var b = parseInt(normalized.slice(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      r = 255;
      g = 255;
      b = 255;
    }

    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + Number(alpha).toFixed(3) + ')';
  }

  function clampPercent(value, fallback) {
    var number = Number(value);

    if (isNaN(number)) {
      number = fallback;
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function restoreRuntimePageBackground(schema) {
    var defaults = themeDefaults(schema);
    var colors = defaults.colors || {};
    var pageBackground = colors.pageBackground || '#f3f6fa';

    document.documentElement.style.setProperty('--bg', pageBackground);

    var pageBg = document.querySelector('.page-bg');

    if (pageBg) {
      pageBg.style.background = pageBackground;
    }
  }

  function applyFooterDesign(footer, schema) {
    var defaults = themeDefaults(schema);
    var colors = defaults.colors || {};
    var opacity = defaults.opacity || {};
    var footerBackground = colors.footerBackground || '#ffffff';
    var footerText = colors.footerText || colors.mutedText || '#64748b';
    var footerBorder = colors.footerBorder || colors.border || '#cbd5e1';
    var footerOpacity = clampPercent(opacity.footer, 34) / 100;

    restoreRuntimePageBackground(schema);

    footer.style.background = hexToRgba(footerBackground, footerOpacity);
    footer.style.color = footerText;
    footer.style.borderColor = footerBorder;
  }

  function renderRuntimeFooter() {
    var schema = getSchema();
    var lines = footerLines(schema);
    var formShell = document.querySelector('.runtime-form-shell');
    var buttonRow = formShell ? formShell.querySelector('.button-row') : null;
    var footer = document.getElementById('runtimeFooter');

    if (!formShell) {
      return;
    }

    restoreRuntimePageBackground(schema);

    if (!lines.length) {
      if (footer) {
        footer.remove();
      }
      return;
    }

    if (!footer) {
      footer = document.createElement('footer');
      footer.id = 'runtimeFooter';
      footer.className = 'runtime-footer';
    }

    footer.innerHTML = lines.map(function (text) {
      return '<div class="runtime-footer-line">' + escapeHtml(text) + '</div>';
    }).join('');

    applyFooterDesign(footer, schema);

    if (buttonRow) {
      formShell.insertBefore(footer, buttonRow);
    } else {
      formShell.appendChild(footer);
    }
  }

  function loadRuntimeDesignModule() {
    if (window.FormRuntimeDesign || document.querySelector('script[data-runtime-design-module]')) {
      if (window.FormRuntimeDesign && typeof window.FormRuntimeDesign.init === 'function') {
        window.FormRuntimeDesign.init();
      }
      return;
    }

    var script = document.createElement('script');
    script.src = 'js/runtime-design.js';
    script.defer = true;
    script.dataset.runtimeDesignModule = '1';
    document.body.appendChild(script);
  }

  function initRuntimeFooter() {
    renderRuntimeFooter();
    loadRuntimeDesignModule();
  }

  document.addEventListener('DOMContentLoaded', initRuntimeFooter);
  window.FormRuntimeFooter = {
    render: renderRuntimeFooter,
    loadRuntimeDesign: loadRuntimeDesignModule
  };
})();
