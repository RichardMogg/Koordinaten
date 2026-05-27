'use strict';

(function () {
  var STORAGE_PREFIX = 'form_runtime_design_';
  var observer = null;
  var rendering = false;
  var designOpen = false;
  var COLORS = [
    ['pageBackground','--bg','#f3f6fa'],['headerBackground','--header-bg','#ffffff'],['headerText','--header-text','#003f75'],['subtitleText','--subtitle-text','#64748b'],['brand','--brand','#005ca9'],['brandDark','--brand-dark','#003f75'],['brandLight','--brand-light','#e6f1fb'],['accent','--accent','#ffd200'],['border','--border','#cbd5e1'],['bodyText','--text','#111827'],['mutedText','--muted','#64748b'],['sectionTitle','--section-title-color','#235ab3'],['sectionSubtitle','--section-subtitle-color','#2e3033'],['fieldLabel','--field-label-color','#111827'],['fieldText','--field-text-color','#111827'],['sectionBackground','--section-bg-color','#ffffff'],['sectionHeaderClosed','--section-header-bg-color','#ffffff'],['sectionHeaderOpen','--section-header-open-bg-color','#e6f1fb'],['fieldCardBackground','--field-card-bg-color','#ffffff'],['inputBackground','--input-bg-color','#ffffff'],['inputFocusBackground','--input-focus-bg-color','#ffffff'],['optionBackground','--option-bg-color','#ffffff'],['primaryButtonBackground','--primary-button-bg','#005ca9'],['primaryButtonText','--primary-button-text','#ffffff'],['secondaryButtonBackground','--secondary-button-bg','#e5e7eb'],['secondaryButtonText','--secondary-button-text','#111827'],['danger','--danger','#dc2626'],['okBackground','--ok-bg','#dcfce7'],['okText','--ok-text','#166534'],['errorBackground','--err-bg','#fee2e2'],['errorText','--err-text','#991b1b'],['warningBackground','--warn-bg','#fef3c7'],['warningText','--warn-text','#92400e']
  ];
  var OPACITY = [
    ['section','--section-bg','sectionBackground',34],['sectionHeaderClosed','--section-header-bg','sectionHeaderClosed',42],['sectionHeaderOpen','--section-header-open-bg','sectionHeaderOpen',42],['fieldCard','--field-card-bg','fieldCardBackground',38],['input','--input-bg','inputBackground',86],['inputFocus','--input-focus-bg','inputFocusBackground',94],['option','--option-bg','optionBackground',42],['backgroundOverlayTop','--bg-overlay-a','pageBackground',8],['backgroundOverlayBottom','--bg-overlay-b','pageBackground',14],['panel','--card','headerBackground',88],['panelStrong','--card-strong','headerBackground',96]
  ];

  function schema() { return window.FORM_RUNTIME_CONFIG && window.FORM_RUNTIME_CONFIG.schema; }
  function esc(value) { return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value == null ? '' : value); }
  function attr(value) { return typeof escapeAttribute === 'function' ? escapeAttribute(value) : esc(value); }
  function clamp(value) { var n = Number(value); return isNaN(n) ? 100 : Math.max(0, Math.min(100, Math.round(n))); }
  function keyFor(source) { return STORAGE_PREFIX + (typeof slugify === 'function' ? slugify(source && (source.id || source.title), 'formular') : 'formular'); }

  function rgb(hex) {
    var h = String(hex || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return { r: isNaN(r) ? 255 : r, g: isNaN(g) ? 255 : g, b: isNaN(b) ? 255 : b };
  }

  function rgba(hex, opacity) { var c = rgb(hex); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (clamp(opacity) / 100) + ')'; }

  function ensureTheme(source) {
    var theme = source.theme = source.theme && typeof source.theme === 'object' ? source.theme : {};
    theme.defaults = theme.defaults && typeof theme.defaults === 'object' ? theme.defaults : {};
    theme.defaults.colors = theme.defaults.colors && typeof theme.defaults.colors === 'object' ? theme.defaults.colors : {};
    theme.defaults.opacity = theme.defaults.opacity && typeof theme.defaults.opacity === 'object' ? theme.defaults.opacity : {};
    COLORS.forEach(function (item) { if (!theme.defaults.colors[item[0]]) theme.defaults.colors[item[0]] = item[2]; });
    OPACITY.forEach(function (item) { theme.defaults.opacity[item[0]] = theme.defaults.opacity[item[0]] == null ? item[3] : clamp(theme.defaults.opacity[item[0]]); });
    theme.userControls = theme.userControls && typeof theme.userControls === 'object' ? theme.userControls : {};
    theme.userControls.enabled = theme.userControls.enabled !== false;
    theme.userControls.sectionTitle = theme.userControls.sectionTitle || 'Darstellung / Transparenz';
    theme.userControls.sectionSubtitle = theme.userControls.sectionSubtitle || 'Farben, Hintergrund, Abschnitte und Felder einstellen';
    theme.userControls.allowReset = theme.userControls.allowReset !== false;
    theme.userControls.persistInBrowser = theme.userControls.persistInBrowser !== false;
  }

  function merge(base, saved) {
    var out = { colors: {}, opacity: {} };
    COLORS.forEach(function (item) { out.colors[item[0]] = saved && saved.colors && saved.colors[item[0]] ? saved.colors[item[0]] : base.colors[item[0]]; });
    OPACITY.forEach(function (item) { out.opacity[item[0]] = clamp(saved && saved.opacity && saved.opacity[item[0]] != null ? saved.opacity[item[0]] : base.opacity[item[0]]); });
    return out;
  }

  function design(source) {
    var saved = null;
    ensureTheme(source);
    if (source.theme.userControls.persistInBrowser) {
      try { saved = JSON.parse(localStorage.getItem(keyFor(source)) || 'null'); } catch (error) { saved = null; }
    }
    return merge(source.theme.defaults, saved);
  }

  function save(source, next) { if (source.theme.userControls.persistInBrowser) localStorage.setItem(keyFor(source), JSON.stringify(next)); }

  function apply(source, next) {
    COLORS.forEach(function (item) { document.documentElement.style.setProperty(item[1], next.colors[item[0]]); });
    OPACITY.forEach(function (item) { document.documentElement.style.setProperty(item[1], rgba(next.colors[item[2]], next.opacity[item[0]])); });
  }

  function ensureStyles() {
    if (document.getElementById('runtimeDesignStyles')) return;
    var style = document.createElement('style');
    style.id = 'runtimeDesignStyles';
    style.textContent = '.design-controls{gap:14px}.design-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.design-control{display:grid;gap:5px;padding:9px;border:1px solid var(--border);border-radius:12px;background:var(--field-card-bg)}.design-control span{font-size:12px;font-weight:900;color:var(--field-label-color)}.design-control input[type=range]{padding-left:0;padding-right:0}@media(max-width:680px){.design-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  function addRange(source, parent, id, label, value, update) {
    var wrapper = document.createElement('label');
    wrapper.className = 'design-control';
    wrapper.innerHTML = '<span>' + esc(label) + '</span><input id="' + attr(id) + '" type="range" min="0" max="100" value="' + clamp(value) + '">';
    wrapper.querySelector('input').addEventListener('input', function () { var next = design(source); update(next, clamp(this.value)); apply(source, next); save(source, next); });
    parent.appendChild(wrapper);
  }

  function addColor(source, parent, id, label, value, update) {
    var wrapper = document.createElement('label');
    wrapper.className = 'design-control';
    wrapper.innerHTML = '<span>' + esc(label) + '</span><input id="' + attr(id) + '" type="color" value="' + attr(value) + '">';
    wrapper.querySelector('input').addEventListener('input', function () { var next = design(source); update(next, this.value); apply(source, next); save(source, next); });
    parent.appendChild(wrapper);
  }

  function section(source) {
    var current = design(source);
    var details = document.createElement('details');
    var body = document.createElement('div');
    var grid = document.createElement('div');
    details.className = 'section design-user-section';
    details.id = 'runtimeDesignSettings';
    details.open = designOpen;
    details.addEventListener('toggle', function () { designOpen = details.open; });
    details.innerHTML = '<summary><div class="summary-main"><span><span class="summary-title">' + esc(source.theme.userControls.sectionTitle) + '</span><span class="summary-sub">' + esc(source.theme.userControls.sectionSubtitle) + '</span></span><span class="summary-count">Design</span></div></summary>';
    body.className = 'section-body design-controls design-settings';
    grid.className = 'design-grid';
    addRange(source, grid, 'runtimeOpacitySection', 'Hauptabschnitte', current.opacity.section, function (d, v) { d.opacity.section = v; });
    addRange(source, grid, 'runtimeOpacityHeader', 'Abschnitt-Kopfzeilen', current.opacity.sectionHeaderClosed, function (d, v) { d.opacity.sectionHeaderClosed = v; d.opacity.sectionHeaderOpen = v; });
    addRange(source, grid, 'runtimeOpacityField', 'Feldkarten', current.opacity.fieldCard, function (d, v) { d.opacity.fieldCard = v; d.opacity.option = v; });
    addRange(source, grid, 'runtimeOpacityInput', 'Eingabefelder', current.opacity.input, function (d, v) { d.opacity.input = v; d.opacity.inputFocus = Math.min(100, v + 12); });
    addRange(source, grid, 'runtimeOpacityBgOverlay', 'Hintergrund-Schleier', current.opacity.backgroundOverlayBottom, function (d, v) { d.opacity.backgroundOverlayBottom = v; d.opacity.backgroundOverlayTop = Math.max(0, v - 4); });
    addColor(source, grid, 'runtimeColorSectionTitle', 'Schrift Haupttitel', current.colors.sectionTitle, function (d, v) { d.colors.sectionTitle = v; });
    addColor(source, grid, 'runtimeColorSectionSubtitle', 'Schrift Untertitel', current.colors.sectionSubtitle, function (d, v) { d.colors.sectionSubtitle = v; });
    addColor(source, grid, 'runtimeColorFieldLabel', 'Schrift Feldbeschriftungen', current.colors.fieldLabel, function (d, v) { d.colors.fieldLabel = v; });
    addColor(source, grid, 'runtimeColorFieldText', 'Schrift Eingabefelder', current.colors.fieldText, function (d, v) { d.colors.fieldText = v; });
    addColor(source, grid, 'runtimeColorSectionHeaderBg', 'Abschnitt-Kopf geschlossen', current.colors.sectionHeaderClosed, function (d, v) { d.colors.sectionHeaderClosed = v; });
    addColor(source, grid, 'runtimeColorSectionHeaderOpenBg', 'Abschnitt-Kopf geöffnet', current.colors.sectionHeaderOpen, function (d, v) { d.colors.sectionHeaderOpen = v; });
    body.appendChild(grid);
    if (source.theme.userControls.allowReset) {
      var reset = document.createElement('button');
      reset.type = 'button'; reset.className = 'btn-secondary'; reset.textContent = 'Darstellung zurücksetzen';
      reset.addEventListener('click', function () { localStorage.removeItem(keyFor(source)); designOpen = true; apply(source, design(source)); render(); });
      body.appendChild(reset);
    }
    details.appendChild(body);
    return details;
  }

  function render() {
    var source = schema();
    var form = document.getElementById('runtimeForm');
    var old = document.getElementById('runtimeDesignSettings');
    if (!source || !form || rendering) return;
    ensureTheme(source);
    if (old) { designOpen = old.open; old.remove(); }
    if (!source.theme.userControls.enabled) return;
    rendering = true;
    form.insertBefore(section(source), form.firstChild);
    rendering = false;
  }

  function init() {
    var source = schema();
    var form = document.getElementById('runtimeForm');
    if (!source || !form) return;
    ensureTheme(source); ensureStyles(); apply(source, design(source)); render();
    if (!observer) {
      observer = new MutationObserver(function () { if (!rendering && !document.getElementById('runtimeDesignSettings')) render(); });
      observer.observe(form, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.FormRuntimeDesign = { init: init, render: render, apply: function () { var source = schema(); if (source) apply(source, design(source)); } };
}());
