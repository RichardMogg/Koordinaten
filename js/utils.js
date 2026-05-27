'use strict';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugify(value, fallback) {
  var slug = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || fallback || 'id';
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function normalizeOptions(text) {
  return String(text || '')
    .split(/\n|,/)
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);
}

function downloadText(filename, text, mimeType) {
  var blob = new Blob([text], { type: mimeType || 'text/plain' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function padDatePart(value) {
  var text = String(value);
  return text.length < 2 ? '0' + text : text;
}

function getCurrentDateInputValue() {
  var now = new Date();
  return now.getFullYear() + '-' + padDatePart(now.getMonth() + 1) + '-' + padDatePart(now.getDate());
}

function createEmptyLocationDateValue() {
  return {
    location: '',
    date: getCurrentDateInputValue()
  };
}

function isLocationDateValue(value) {
  var valid = !!value && typeof value === 'object' && !Array.isArray(value);

  if (!valid) {
    return false;
  }

  if (value.location == null) {
    value.location = '';
  }

  if (String(value.date == null ? '' : value.date).trim() === '') {
    value.date = getCurrentDateInputValue();
  }

  return true;
}

function normalizeLocationDateValue(value) {
  if (isLocationDateValue(value)) {
    return value;
  }

  return createEmptyLocationDateValue();
}

function isLocationDateMissing(value) {
  if (!isLocationDateValue(value)) {
    return true;
  }

  return String(value.location == null ? '' : value.location).trim() === '' ||
    String(value.date == null ? '' : value.date).trim() === '';
}

function defaultValueForField(field) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (field.type === 'checklist') {
    return {};
  }

  if (field.type === 'file') {
    return [];
  }

  if (field.type === 'locationDate') {
    return createEmptyLocationDateValue();
  }

  return '';
}

function createInitialFormData(schemaSource) {
  var data = {};

  schemaSource.sections.forEach(function (section) {
    (section.fields || []).forEach(function (field) {
      data[field.id] = defaultValueForField(field);
    });
  });

  return data;
}

function ensureSchemaAssets(candidate) {
  var defaultAssets = typeof DEFAULT_ASSETS !== 'undefined' ? DEFAULT_ASSETS : { headerLogo: null, backgroundGraphic: null };

  if (!candidate.assets || typeof candidate.assets !== 'object' || Array.isArray(candidate.assets)) {
    candidate.assets = clone(defaultAssets);
  }

  if (!Object.prototype.hasOwnProperty.call(candidate.assets, 'headerLogo')) {
    candidate.assets.headerLogo = null;
  }

  if (!Object.prototype.hasOwnProperty.call(candidate.assets, 'backgroundGraphic')) {
    candidate.assets.backgroundGraphic = null;
  }
}

function ensureSchemaFooter(candidate) {
  var defaultFooter = typeof DEFAULT_FOOTER !== 'undefined' ? DEFAULT_FOOTER : { enabled: false, lines: [{ text: '' }] };
  var fallback = clone(defaultFooter);
  var minLines = typeof FOOTER_MIN_LINES === 'number' ? FOOTER_MIN_LINES : 1;
  var maxLines = typeof FOOTER_MAX_LINES === 'number' ? FOOTER_MAX_LINES : 5;

  if (!candidate.footer || typeof candidate.footer !== 'object' || Array.isArray(candidate.footer)) {
    candidate.footer = fallback;
  }

  candidate.footer.enabled = candidate.footer.enabled === true;

  if (!Array.isArray(candidate.footer.lines)) {
    candidate.footer.lines = fallback.lines;
  }

  candidate.footer.lines = candidate.footer.lines
    .slice(0, maxLines)
    .map(function (line) {
      if (line && typeof line === 'object' && !Array.isArray(line)) {
        return { text: String(line.text == null ? '' : line.text) };
      }

      return { text: String(line == null ? '' : line) };
    });

  while (candidate.footer.lines.length < minLines) {
    candidate.footer.lines.push({ text: '' });
  }
}

function validateSchemaAssetEntry(asset, pathLabel) {
  if (asset == null) {
    return;
  }

  if (typeof asset !== 'object' || Array.isArray(asset)) {
    throw new Error(pathLabel + ' ist kein gültiges Asset-Objekt.');
  }

  if (asset.format !== 'svg') {
    throw new Error(pathLabel + ' muss das Format svg haben.');
  }

  if (asset.missingFile === true && (typeof asset.svgText !== 'string' || !asset.svgText.trim())) {
    return;
  }

  if (typeof asset.svgText !== 'string' || !asset.svgText.trim()) {
    throw new Error(pathLabel + ' enthält keinen SVG-Text.');
  }

  validateSvgText(asset.svgText);
}

function validateSchemaAssets(candidate) {
  ensureSchemaAssets(candidate);
  validateSchemaAssetEntry(candidate.assets.headerLogo, 'assets.headerLogo');
  validateSchemaAssetEntry(candidate.assets.backgroundGraphic, 'assets.backgroundGraphic');
}

function validateSchemaShape(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Schema ist kein Objekt.');
  }

  if (!Array.isArray(candidate.sections)) {
    throw new Error('Schema enthält keine sections-Liste.');
  }

  candidate.sections.forEach(function (section, index) {
    if (!section.id) {
      throw new Error('Abschnitt ' + (index + 1) + ' hat keine ID.');
    }

    if (!Array.isArray(section.fields)) {
      section.fields = [];
    }
  });

  if (!candidate.theme) {
    candidate.theme = {
      brand: '#005ca9',
      accent: '#ffd200',
      background: '#f3f6fa'
    };
  }

  validateSchemaAssets(candidate);
  ensureSchemaFooter(candidate);
}

function validateForm(schemaSource, dataSource) {
  var issues = [];

  schemaSource.sections.forEach(function (section) {
    (section.fields || []).forEach(function (field) {
      if (!field.required) {
        return;
      }

      var value = dataSource[field.id];
      var missing = false;

      if (field.type === 'checklist') {
        missing = !value || !Object.keys(value).some(function (key) {
          return value[key] && value[key].answer;
        });
      } else if (field.type === 'file') {
        missing = !Array.isArray(value) || value.length === 0;
      } else if (field.type === 'locationDate') {
        missing = isLocationDateMissing(value);
      } else {
        missing = value == null || String(value).trim() === '';
      }

      if (missing) {
        issues.push(section.title + ': ' + field.label);
      }
    });
  });

  return issues;
}

function clampFieldWidthPercent(value) {
  var number = Number(value);

  if (isNaN(number)) {
    return 100;
  }

  return Math.max(20, Math.min(100, Math.round(number)));
}

var SVG_ASSET_MAX_BYTES = Math.round(3.2 * 1024 * 1024);
var SVG_ASSET_MAX_LABEL = '3,2 MB';

function estimateUtf8Bytes(value) {
  return new Blob([String(value || '')]).size;
}

function createSvgAsset(kind, filename, svgText, alt) {
  var safeFilename = sanitizeSvgAssetFilename(filename, kind === 'headerLogo' ? 'header-logo.svg' : 'background.svg');
  var safeSvgText = String(svgText || '').trim();

  validateSvgText(safeSvgText);

  return {
    kind: kind,
    format: 'svg',
    filename: safeFilename,
    svgText: safeSvgText,
    alt: String(alt || ''),
    enabled: true,
    sizeBytes: estimateUtf8Bytes(safeSvgText)
  };
}

function sanitizeSvgAssetFilename(filename, fallback) {
  var base = String(filename || fallback || 'asset.svg').split(/[\\/]/).pop();
  base = base.replace(/\.svg$/i, '');
  base = slugify(base, String(fallback || 'asset').replace(/\.svg$/i, ''));
  return base + '.svg';
}

function svgTextToDataUrl(svgText) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svgText || ''));
}

function validateSvgText(svgText) {
  var text = String(svgText || '').trim();

  if (!text) {
    throw new Error('SVG ist leer.');
  }

  if (estimateUtf8Bytes(text) > SVG_ASSET_MAX_BYTES) {
    throw new Error('Datei überschreitet ' + SVG_ASSET_MAX_LABEL + '.');
  }

  var parser = new DOMParser();
  var doc = parser.parseFromString(text, 'image/svg+xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('SVG konnte nicht gelesen werden.');
  }

  if (!doc.documentElement || doc.documentElement.tagName.toLowerCase() !== 'svg') {
    throw new Error('Datei enthält kein gültiges SVG-Wurzelelement.');
  }

  var forbiddenTags = [
    'scr' + 'ipt',
    'foreignObject',
    'iframe',
    'object',
    'embed',
    'a',
    'animate',
    'animateTransform',
    'animateMotion',
    'animateColor',
    'set'
  ];

  for (var tagIndex = 0; tagIndex < forbiddenTags.length; tagIndex += 1) {
    if (doc.getElementsByTagName(forbiddenTags[tagIndex]).length) {
      throw new Error('SVG enthält nicht erlaubte Elemente.');
    }
  }

  var nodes = doc.getElementsByTagName('*');

  for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    var attributes = nodes[nodeIndex].attributes || [];

    for (var attrIndex = 0; attrIndex < attributes.length; attrIndex += 1) {
      var attrName = String(attributes[attrIndex].name || '').toLowerCase();
      var attrValue = String(attributes[attrIndex].value || '').trim().toLowerCase();

      if (attrName.indexOf('on') === 0) {
        throw new Error('SVG enthält nicht erlaubte Event-Attribute.');
      }

      if (attrValue.indexOf('java' + 'script:') !== -1) {
        throw new Error('SVG enthält nicht erlaubte JS-URLs.');
      }

      if (attrValue.indexOf('data:text/ht' + 'ml') !== -1) {
        throw new Error('SVG enthält nicht erlaubte HTML-Daten-URLs.');
      }

      if ((attrName === 'href' || attrName === 'xlink:href' || attrName === 'src') && isExternalSvgUrl(attrValue)) {
        throw new Error('Externe Ressourcen sind nicht erlaubt.');
      }

      if ((attrName === 'style' || attrName === 'href' || attrName === 'xlink:href') && hasForbiddenSvgCss(attrValue)) {
        throw new Error('SVG enthält nicht erlaubte CSS- oder Ressourcenverweise.');
      }
    }
  }

  var styleNodes = doc.getElementsByTagName('style');

  for (var styleIndex = 0; styleIndex < styleNodes.length; styleIndex += 1) {
    if (hasForbiddenSvgCss(String(styleNodes[styleIndex].textContent || '').toLowerCase())) {
      throw new Error('SVG enthält nicht erlaubte CSS-Inhalte.');
    }
  }
}

function isExternalSvgUrl(value) {
  return value.indexOf('http://') === 0 || value.indexOf('https://') === 0 || value.indexOf('//') === 0;
}

function hasForbiddenSvgCss(value) {
  var css = String(value || '').toLowerCase();
  return css.indexOf('@import') !== -1 ||
    css.indexOf('animation:') !== -1 ||
    css.indexOf('transition:') !== -1 ||
    css.indexOf('url(http://') !== -1 ||
    css.indexOf('url(https://') !== -1 ||
    css.indexOf('url(//') !== -1;
}