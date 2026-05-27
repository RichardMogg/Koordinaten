'use strict';

var SIGNATURE_CANVAS_DISPLAY_HEIGHT_PX = 195;

function isSignatureValue(value) {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return value.signed === true && typeof value.dataUrl === 'string' && value.dataUrl.indexOf('data:image/') === 0;
}

function createSignatureValue(dataUrl, meta) {
  return Object.assign({
    signed: true,
    dataUrl: String(dataUrl || ''),
    signedAt: new Date().toISOString()
  }, meta || {});
}

function clearSignatureValue() {
  return '';
}

function getSignatureDataUrl(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.indexOf('data:image/') === 0 ? value : '';
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value.dataUrl || value.image || value.signatureDataUrl || '';
  }

  return '';
}

function getSignatureStatusText(value) {
  if (!value) {
    return 'Noch keine Unterschrift';
  }

  if (isSignatureValue(value)) {
    return 'Unterschrift vorhanden';
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value.status || value.name || value.signer || '';
  }

  return String(value || '').trim() || 'Noch keine Unterschrift';
}

function isSignatureMissing(value) {
  return !isSignatureValue(value);
}

function injectSignatureCanvasStyle() {
  if (document.getElementById('signatureCanvasSharedStyle')) {
    return;
  }

  var style = document.createElement('style');
  style.id = 'signatureCanvasSharedStyle';
  style.textContent = [
    '.signature-canvas-wrap{width:100%;border:2px solid var(--border);border-radius:12px;background:#fff;overflow:hidden;margin-top:8px;}',
    '.signature-canvas{display:block;width:100%;height:' + SIGNATURE_CANVAS_DISPLAY_HEIGHT_PX + 'px;background:#fff;touch-action:none;cursor:crosshair;}',
    '.signature-status{margin-top:8px;}',
    '.signature-actions{margin-top:8px;}',
    '.signature-canvas-runtime{width:100%;}'
  ].join('');
  document.head.appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSignatureCanvasStyle);
} else {
  injectSignatureCanvasStyle();
}

if (typeof validateForm === 'function') {
  var validateFormBeforeSignatureHelpers = validateForm;

  validateForm = function (schemaSource, dataSource) {
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
          missing = typeof isLocationDateMissing === 'function'
            ? isLocationDateMissing(value)
            : !value || !value.location || !value.date;
        } else if (field.type === 'signature') {
          missing = isSignatureMissing(value);
        } else {
          missing = value == null || String(value).trim() === '';
        }

        if (missing) {
          issues.push(section.title + ': ' + field.label);
        }
      });
    });

    return issues;
  };
}