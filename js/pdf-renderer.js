'use strict';

var FORM_PDF_RENDERER_LOADING = {};

function getPdfRenderingOptions(schemaSource) {
  var rendering = (schemaSource && schemaSource.rendering) || {};
  return rendering.pdf || (typeof DEFAULT_RENDERING !== 'undefined' ? DEFAULT_RENDERING.pdf : {}) || {};
}

function getPdfLibraryConfig(schemaSource, key) {
  var options = getPdfRenderingOptions(schemaSource);
  var libraries = options.libraries || {};
  return libraries[key] || {};
}

function hasPdfGlobal(globalName) {
  if (!globalName) {
    return false;
  }

  return globalName.split('.').reduce(function (owner, part) {
    return owner && owner[part];
  }, window) ? true : false;
}

function loadPdfScript(url, globalName) {
  if (!url) {
    return Promise.reject(new Error('PDF-Bibliothek hat keine Ladeadresse.'));
  }

  if (globalName && hasPdfGlobal(globalName)) {
    return Promise.resolve();
  }

  if (FORM_PDF_RENDERER_LOADING[url]) {
    return FORM_PDF_RENDERER_LOADING[url];
  }

  FORM_PDF_RENDERER_LOADING[url] = new Promise(function (resolve, reject) {
    var script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = function () {
      if (!globalName || hasPdfGlobal(globalName)) {
        resolve();
        return;
      }

      reject(new Error('PDF-Bibliothek wurde geladen, aber nicht korrekt bereitgestellt: ' + globalName));
    };
    script.onerror = function () {
      reject(new Error('PDF-Bibliothek konnte nicht geladen werden: ' + url));
    };
    document.head.appendChild(script);
  });

  return FORM_PDF_RENDERER_LOADING[url];
}

function ensurePdfDependencies(schemaSource) {
  var html2canvasConfig = getPdfLibraryConfig(schemaSource, 'html2canvas');
  var jspdfConfig = getPdfLibraryConfig(schemaSource, 'jspdf');
  var html2canvasUrl = html2canvasConfig.cdnUrl || html2canvasConfig.localPath;
  var jspdfUrl = jspdfConfig.cdnUrl || jspdfConfig.localPath;

  return Promise.all([
    loadPdfScript(html2canvasUrl, html2canvasConfig.globalName || 'html2canvas'),
    loadPdfScript(jspdfUrl, jspdfConfig.globalName || 'jspdf.jsPDF')
  ]);
}

function buildPdfFilename(record, fallback) {
  var label = record && record.label ? record.label : fallback || 'protokoll';
  return slugify(label, 'protokoll') + '.pdf';
}

function generateFormPdfBytes(schemaSource, dataSource) {
  if (!window.FormPrintRenderer || typeof window.FormPrintRenderer.buildContent !== 'function' || typeof window.FormPrintRenderer.buildCss !== 'function') {
    return Promise.reject(new Error('Print-Renderer ist für die PDF-Erzeugung nicht geladen.'));
  }

  return ensurePdfDependencies(schemaSource).then(function () {
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('PDF-Bibliotheken sind nicht verfügbar.');
    }

    var options = getPdfRenderingOptions(schemaSource);
    var pdfPage = options.page || {};
    var render = options.render || {};
    var pageWidthMm = Number(pdfPage.widthMm || 210);
    var pageHeightMm = Number(pdfPage.heightMm || 297);
    var holder = document.createElement('div');

    holder.style.position = 'fixed';
    holder.style.left = '-10000px';
    holder.style.top = '0';
    holder.style.width = pageWidthMm + 'mm';
    holder.style.background = '#ffffff';
    holder.innerHTML = '<style>' + window.FormPrintRenderer.buildCss(schemaSource) + '</style>' + window.FormPrintRenderer.buildContent(schemaSource, dataSource || {});
    document.body.appendChild(holder);

    var page = holder.querySelector('.print-page') || holder;

    return window.html2canvas(page, {
      scale: Number(render.scale || 2),
      backgroundColor: render.backgroundColor || '#ffffff',
      useCORS: render.useCORS !== false
    }).then(function (canvas) {
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF(pdfPage.orientation || 'p', pdfPage.unit || 'mm', pdfPage.format || 'a4');
      var sliceHeightPx = Math.floor(canvas.width * pageHeightMm / pageWidthMm);
      var y = 0;
      var pageIndex = 0;
      var imageType = render.imageType || 'JPEG';
      var imageQuality = Number(render.imageQuality == null ? 0.95 : render.imageQuality);

      while (y < canvas.height) {
        var currentSliceHeight = Math.min(sliceHeightPx, canvas.height - y);
        var sliceCanvas = document.createElement('canvas');
        var sliceContext = sliceCanvas.getContext('2d');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = currentSliceHeight;
        sliceContext.fillStyle = '#ffffff';
        sliceContext.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceContext.drawImage(canvas, 0, y, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);

        if (pageIndex > 0) {
          pdf.addPage();
        }

        var imageData = sliceCanvas.toDataURL('image/' + imageType.toLowerCase(), imageQuality);
        var imageHeightMm = currentSliceHeight * pageWidthMm / canvas.width;
        pdf.addImage(imageData, imageType, 0, 0, pageWidthMm, imageHeightMm);

        y += currentSliceHeight;
        pageIndex += 1;
      }

      document.body.removeChild(holder);
      return new Uint8Array(pdf.output('arraybuffer'));
    }).catch(function (error) {
      if (holder.parentNode) {
        document.body.removeChild(holder);
      }

      throw error;
    });
  });
}

function downloadFormPdf(schemaSource, dataSource, filename) {
  return generateFormPdfBytes(schemaSource, dataSource).then(function (bytes) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || 'protokoll.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return bytes;
  });
}

window.FormPdfRenderer = {
  ensureDependencies: ensurePdfDependencies,
  generateBytes: generateFormPdfBytes,
  download: downloadFormPdf,
  buildFilename: buildPdfFilename
};
