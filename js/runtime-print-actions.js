'use strict';

(function () {
  var printLoading = null;
  var pdfLoading = null;

  function loadScriptOnce(path, check) {
    if (check()) {
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = path;
      script.onload = function () {
        if (check()) {
          resolve();
          return;
        }

        reject(new Error(path + ' wurde geladen, ist aber nicht verfügbar.'));
      };
      script.onerror = function () {
        reject(new Error(path + ' konnte nicht geladen werden.'));
      };
      document.body.appendChild(script);
    });
  }

  function ensurePrintRenderer() {
    if (!printLoading) {
      printLoading = loadScriptOnce('js/print-renderer.js', function () {
        return !!(window.FormPrintRenderer && typeof window.FormPrintRenderer.buildHtml === 'function');
      });
    }

    return printLoading;
  }

  function ensurePdfRenderer() {
    if (!pdfLoading) {
      pdfLoading = loadScriptOnce('js/pdf-renderer.js', function () {
        return !!(window.FormPdfRenderer && typeof window.FormPdfRenderer.download === 'function');
      });
    }

    return pdfLoading;
  }

  function getRuntimeRecord(recordId) {
    var app = window.FormRuntimeApp;
    var state = app && typeof app.getState === 'function' ? app.getState() : null;
    var records = state && Array.isArray(state.protocols) ? state.protocols : [];

    return records.find(function (record) {
      return record.recordId === recordId;
    }) || null;
  }

  function requireCompleteRecord(recordId, actionLabel) {
    var app = window.FormRuntimeApp;
    var schema = app && typeof app.getSchema === 'function' ? app.getSchema() : null;
    var record = getRuntimeRecord(recordId);

    if (!schema || !record) {
      window.alert('Protokoll wurde nicht gefunden.');
      return null;
    }

    var issues = typeof validateForm === 'function' ? validateForm(schema, clone(record.data || {})) : (record.validationIssues || []);

    if (issues.length) {
      window.alert(actionLabel + ' wurde abgebrochen, weil das Protokoll unvollständig ist. Fehlende Pflichtangaben:\n\n- ' + issues.join('\n- '));
      return null;
    }

    return record;
  }

  function openRuntimePrintPreview(recordId) {
    var app = window.FormRuntimeApp;
    var schema = app && typeof app.getSchema === 'function' ? app.getSchema() : null;
    var record = requireCompleteRecord(recordId, 'Druckvorschau');

    if (!schema || !record) {
      return;
    }

    ensurePrintRenderer().then(function () {
      var printWindow = window.open('', '_blank');

      if (!printWindow) {
        window.alert('Druckvorschau konnte nicht geöffnet werden.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(window.FormPrintRenderer.buildHtml(schema, record.data || {}));
      printWindow.document.close();
    }).catch(function (error) {
      window.alert(error && error.message ? error.message : 'Druckvorschau konnte nicht erstellt werden.');
    });
  }

  function downloadRuntimePdf(recordId) {
    var app = window.FormRuntimeApp;
    var schema = app && typeof app.getSchema === 'function' ? app.getSchema() : null;
    var record = requireCompleteRecord(recordId, 'PDF');

    if (!schema || !record) {
      return;
    }

    ensurePrintRenderer().then(function () {
      return ensurePdfRenderer();
    }).then(function () {
      var filename = window.FormPdfRenderer.buildFilename(record, 'protokoll');
      return window.FormPdfRenderer.download(schema, record.data || {}, filename);
    }).catch(function (error) {
      window.alert(error && error.message ? error.message : 'PDF konnte nicht erstellt werden.');
    });
  }

  function injectRuntimePrintButtons() {
    var list = document.getElementById('runtimeProtocolList');

    if (!list) {
      return;
    }

    list.querySelectorAll('[data-open]').forEach(function (openButton) {
      var recordId = openButton.getAttribute('data-open');
      var actions = openButton.parentNode;

      if (!recordId || !actions || actions.querySelector('[data-runtime-print="' + recordId + '"]')) {
        return;
      }

      var printButton = document.createElement('button');
      printButton.type = 'button';
      printButton.className = 'btn-secondary btn-small';
      printButton.setAttribute('data-runtime-print', recordId);
      printButton.textContent = 'Druckvorschau';
      actions.insertBefore(printButton, openButton.nextSibling);

      var pdfButton = document.createElement('button');
      pdfButton.type = 'button';
      pdfButton.className = 'btn-secondary btn-small';
      pdfButton.setAttribute('data-runtime-pdf', recordId);
      pdfButton.textContent = 'PDF';
      actions.insertBefore(pdfButton, printButton.nextSibling);
    });

    list.querySelectorAll('[data-runtime-print]').forEach(function (button) {
      if (button.dataset.runtimePrintBound) {
        return;
      }

      button.dataset.runtimePrintBound = '1';
      button.addEventListener('click', function () {
        openRuntimePrintPreview(this.getAttribute('data-runtime-print'));
      });
    });

    list.querySelectorAll('[data-runtime-pdf]').forEach(function (button) {
      if (button.dataset.runtimePdfBound) {
        return;
      }

      button.dataset.runtimePdfBound = '1';
      button.addEventListener('click', function () {
        downloadRuntimePdf(this.getAttribute('data-runtime-pdf'));
      });
    });
  }

  function observeRuntimeProtocolList() {
    injectRuntimePrintButtons();

    var list = document.getElementById('runtimeProtocolList');

    if (!list || !window.MutationObserver) {
      return;
    }

    var observer = new MutationObserver(function () {
      injectRuntimePrintButtons();
    });

    observer.observe(list, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', observeRuntimeProtocolList);

  window.FormRuntimePrintActions = {
    injectButtons: injectRuntimePrintButtons,
    openPrintPreview: openRuntimePrintPreview,
    downloadPdf: downloadRuntimePdf
  };
}());
