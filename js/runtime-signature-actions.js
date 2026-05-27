'use strict';

(function () {
  var STORAGE_PREFIX = 'form-runtime-state:';

  function storageKey(schema) {
    return STORAGE_PREFIX + String(schema.id || schema.schemaVersion || schema.title || 'default');
  }

  function stopLegacySignatureEvent(event) {
    if (event.target && event.target.closest && event.target.closest('[data-signature-clear="true"]')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  function saveRuntimeSignatureDraft() {
    var app = window.FormRuntimeApp;
    var schema = app && typeof app.getSchema === 'function' ? app.getSchema() : null;
    var state = app && typeof app.getState === 'function' ? app.getState() : null;
    var data = app && typeof app.getFormData === 'function' ? app.getFormData() : null;

    if (!schema || !state || !data || typeof updateRuntimeDraft !== 'function') {
      return;
    }

    updateRuntimeDraft(state, data, schema);

    try {
      if (window.localStorage) {
        window.localStorage.setItem(storageKey(schema), JSON.stringify(state));
      }
    } catch (error) {
      // Der Runtime-Core zeigt Speicherfehler selbst an. Dieses Modul bleibt still.
    }
  }

  function getSignatureFieldIds() {
    var app = window.FormRuntimeApp;
    var schema = app && typeof app.getSchema === 'function' ? app.getSchema() : null;
    var ids = [];

    if (!schema || !Array.isArray(schema.sections)) {
      return ids;
    }

    schema.sections.forEach(function (section) {
      (section.fields || []).forEach(function (field) {
        if (field && field.type === 'signature' && field.id) {
          ids.push(field.id);
        }
      });
    });

    return ids;
  }

  function prepareCanvas(canvas, context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#111827';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  function drawExisting(canvas, context, value) {
    var dataUrl = typeof getSignatureDataUrl === 'function' ? getSignatureDataUrl(value) : '';

    if (!dataUrl) {
      return;
    }

    var image = new Image();
    image.onload = function () {
      prepareCanvas(canvas, context);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = dataUrl;
  }

  function installCanvas(container) {
    var fieldId = container.getAttribute('data-signature');
    var app = window.FormRuntimeApp;
    var data = app && typeof app.getFormData === 'function' ? app.getFormData() : null;

    if (!fieldId || !data || container.dataset.signatureCanvasInstalled) {
      return;
    }

    container.dataset.signatureCanvasInstalled = '1';
    container.className = 'signature-canvas-runtime';
    container.removeAttribute('data-signature');
    container.innerHTML = [
      '<div class="signature-canvas-wrap">',
      '<canvas class="signature-canvas" width="900" height="260"></canvas>',
      '</div>',
      '<div class="asset-info signature-status"></div>',
      '<div class="button-row signature-actions">',
      '<button type="button" class="btn-secondary btn-small" data-signature-clear="true">Unterschrift löschen</button>',
      '</div>'
    ].join('');

    container.addEventListener('click', stopLegacySignatureEvent, true);
    container.addEventListener('dblclick', stopLegacySignatureEvent, true);
    container.addEventListener('mousedown', function (event) { event.stopPropagation(); }, true);
    container.addEventListener('mouseup', function (event) { event.stopPropagation(); }, true);

    var canvas = container.querySelector('.signature-canvas');
    var status = container.querySelector('.signature-status');
    var clearButton = container.querySelector('[data-signature-clear]');
    var context = canvas.getContext('2d');
    var drawing = false;
    var hasDrawn = false;

    function updateStatus() {
      status.textContent = typeof getSignatureStatusText === 'function'
        ? getSignatureStatusText(data[fieldId])
        : (data[fieldId] ? 'Unterschrift vorhanden' : 'Noch keine Unterschrift');
    }

    function pointFromEvent(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function saveSignature() {
      if (!hasDrawn) {
        return;
      }

      data[fieldId] = createSignatureValue(canvas.toDataURL('image/png'));
      updateStatus();
      saveRuntimeSignatureDraft();
    }

    prepareCanvas(canvas, context);
    drawExisting(canvas, context, data[fieldId]);
    updateStatus();

    canvas.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      event.stopPropagation();
      canvas.setPointerCapture(event.pointerId);
      drawing = true;
      hasDrawn = true;
      var point = pointFromEvent(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
    });

    canvas.addEventListener('pointermove', function (event) {
      if (!drawing) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      var point = pointFromEvent(event);
      context.lineTo(point.x, point.y);
      context.stroke();
    });

    canvas.addEventListener('pointerup', function (event) {
      if (!drawing) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      drawing = false;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Pointer-Capture kann bereits gelöst sein.
      }
      saveSignature();
    });

    canvas.addEventListener('pointerleave', function (event) {
      if (!drawing) {
        return;
      }

      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      drawing = false;
      saveSignature();
    });

    clearButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      data[fieldId] = typeof clearSignatureValue === 'function' ? clearSignatureValue() : '';
      hasDrawn = false;
      prepareCanvas(canvas, context);
      updateStatus();
      saveRuntimeSignatureDraft();
    });
  }

  function replaceFallbackSignatureInputs() {
    getSignatureFieldIds().forEach(function (fieldId) {
      var selector = '[data-field="' + fieldId.replace(/"/g, '\\"') + '"]';
      var input = document.querySelector(selector);

      if (!input || input.closest('.signature-canvas-runtime')) {
        return;
      }

      var container = document.createElement('div');
      container.setAttribute('data-signature', fieldId);
      input.insertAdjacentElement('afterend', container);
      input.remove();
      installCanvas(container);
    });
  }

  function installRuntimeSignatures() {
    document.querySelectorAll('[data-signature]').forEach(installCanvas);
    replaceFallbackSignatureInputs();
  }

  function observeRuntimeForm() {
    installRuntimeSignatures();

    var form = document.getElementById('runtimeForm');
    if (!form || !window.MutationObserver) {
      return;
    }

    var observer = new MutationObserver(function () {
      installRuntimeSignatures();
    });

    observer.observe(form, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', observeRuntimeForm);

  window.FormRuntimeSignatureActions = {
    install: installRuntimeSignatures
  };
}());
