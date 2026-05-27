'use strict';

function getPrintRenderingOptions(schemaSource) {
  var rendering = (schemaSource && schemaSource.rendering) || {};
  return rendering.print || (typeof DEFAULT_RENDERING !== 'undefined' ? DEFAULT_RENDERING.print : {}) || {};
}

function printEscapeHtml(value) {
  if (typeof escapeHtml === 'function') {
    return escapeHtml(value == null ? '' : String(value));
  }

  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function printEscapeAttribute(value) {
  if (typeof escapeAttribute === 'function') {
    return escapeAttribute(value == null ? '' : String(value));
  }

  return printEscapeHtml(value);
}

function printClone(value) {
  if (typeof clone === 'function') {
    return clone(value);
  }

  return JSON.parse(JSON.stringify(value || {}));
}

function getPrintableFieldValue(field, dataSource) {
  var value = dataSource ? dataSource[field.id] : undefined;

  if (field.type === 'checklist') {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  if (field.type === 'file') {
    return [];
  }

  if (field.type === 'locationDate') {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : { location: '', date: '' };
  }

  if (value == null || value === '') {
    return '';
  }

  if (field.type === 'signature') {
    return value;
  }

  if (field.type === 'bool') {
    return String(value);
  }

  return String(value);
}

function getPrintableSections(schemaSource, dataSource) {
  var options = getPrintRenderingOptions(schemaSource);
  var showHiddenRuleFields = !!(options.layout && options.layout.showHiddenRuleFields);
  var includeFileFields = !!(options.layout && options.layout.includeFileFields);

  return (schemaSource.sections || []).map(function (section) {
    var fields = (section.fields || []).filter(function (field) {
      if (field.type === 'file' && !includeFileFields) {
        return false;
      }

      if (!showHiddenRuleFields && typeof isRuleFieldVisible === 'function' && !isRuleFieldVisible(field, dataSource || {})) {
        return false;
      }

      return true;
    });

    return Object.assign({}, section, { fields: fields });
  }).filter(function (section) {
    return section.fields.length > 0;
  });
}

function buildPrintAssetDataUrl(asset) {
  if (!asset || asset.format !== 'svg' || typeof asset.svgText !== 'string' || !asset.svgText.trim()) {
    return '';
  }

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(asset.svgText);
}

function getPrintLogoHtml(schemaSource) {
  var options = getPrintRenderingOptions(schemaSource);
  var header = options.header || {};
  var logo = schemaSource.assets && schemaSource.assets.headerLogo;

  if (header.showLogo === false) {
    return '';
  }

  if (logo && logo.format === 'svg' && typeof logo.svgText === 'string' && logo.svgText.trim()) {
    return logo.svgText;
  }

  return '<div class="logo-fallback">' + printEscapeHtml(schemaSource.title || 'FORMULAR') + '</div>';
}

function renderPrintHeader(schemaSource) {
  var options = getPrintRenderingOptions(schemaSource);
  var header = options.header || {};
  var html = '';

  if (header.showLogo !== false) {
    html += '<div class="print-logo">' + getPrintLogoHtml(schemaSource) + '</div>';
  }

  if (header.showTitle !== false) {
    html += '<h1>' + printEscapeHtml(schemaSource.title || 'Formular') + '</h1>';
  }

  return html;
}

function isSignatureField(field) {
  return field && field.type === 'signature';
}

function isFileField(field) {
  return field && field.type === 'file';
}

function isChecklistField(field) {
  return field && field.type === 'checklist';
}

function isTextareaField(field) {
  return field && field.type === 'textarea';
}

function isRemarkSection(section) {
  var text = String((section && (section.title || section.id)) || '').toLowerCase();
  return text.indexOf('bemerk') !== -1 || text.indexOf('hinweis') !== -1 || text.indexOf('notiz') !== -1;
}

function isSignatureSection(section) {
  var fields = (section && section.fields) || [];

  return fields.length > 0 && fields.every(function (field) {
    return isSignatureField(field);
  });
}

function getFieldLabel(field) {
  return field && (field.label || field.title || field.id) || '';
}

function getRequiredMarker(field, dataSource) {
  var required = typeof isRuleFieldRequired === 'function' ? isRuleFieldRequired(field, dataSource || {}) : !!(field && field.required);
  return required ? ' *' : '';
}

function formatLocationDateForPrint(field, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  var location = String(value.location == null ? '' : value.location).trim();
  var date = String(value.date == null ? '' : value.date).trim();
  var dateText = date;

  if (date && typeof formatDateDisplay === 'function') {
    dateText = formatDateDisplay(date);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    dateText = date.slice(8, 10) + '.' + date.slice(5, 7) + '.' + date.slice(0, 4);
  }

  return [
    (field.locationLabel || 'Ort') + ': ' + location,
    (field.dateLabel || 'Datum') + ': ' + dateText
  ].filter(function (line) {
    return line.split(':').slice(1).join(':').trim() !== '';
  }).join('\n');
}

function formatPrintValue(field, value) {
  if (value == null || value === '') {
    return '';
  }

  if (field && field.type === 'locationDate') {
    return formatLocationDateForPrint(field, value);
  }

  if (field && field.type === 'datetime' && typeof formatDateTimeDisplay === 'function') {
    return formatDateTimeDisplay(value);
  }

  if (field && field.type === 'signature') {
    return extractSignatureText(value);
  }

  return String(value);
}

function extractSignatureDataUrl(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' && value.indexOf('data:image/') === 0) {
    return value;
  }

  if (typeof value === 'object') {
    return value.dataUrl || value.image || value.signatureDataUrl || '';
  }

  return '';
}

function extractSignatureText(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.indexOf('data:image/') === 0 ? '' : value;
  }

  if (typeof value === 'object') {
    return value.name || value.techniker || value.signer || value.status || (value.signed ? 'Unterschrift vorhanden' : '');
  }

  return '';
}

function getPlainValueForField(field, dataSource) {
  return formatPrintValue(field, getPrintableFieldValue(field, dataSource || {}));
}

function buildFieldLine(field, dataSource) {
  var label = getFieldLabel(field) + getRequiredMarker(field, dataSource);
  var value = getPlainValueForField(field, dataSource);
  var unit = field && field.unit ? ' ' + field.unit : '';

  return '<b>' + printEscapeHtml(label) + ':</b> ' + printEscapeHtml(value) + printEscapeHtml(unit);
}

function getTopGridSections() {
  return [];
}

function renderTopGrid(topSections, dataSource) {
  if (!topSections.length) {
    return '';
  }

  return '<div class="top-grid">' + topSections.map(function (section) {
    var lines = (section.fields || []).filter(function (field) {
      return !isFileField(field) && !isSignatureField(field) && !isChecklistField(field);
    }).map(function (field) {
      return buildFieldLine(field, dataSource);
    }).join('<br>');

    return '<div>' + lines + '</div>';
  }).join('') + '</div>';
}

function sectionTitle(title) {
  return '<div class="print-sec">' + printEscapeHtml(title) + '</div>';
}

function renderChecklistTable(field, dataSource) {
  var value = getPrintableFieldValue(field, dataSource || {});
  var html = sectionTitle(getFieldLabel(field));

  html += '<table><tr><th>Prüfpunkt</th><th>Ja</th><th>Nein</th><th>Bemerkung</th></tr>';

  (field.options || []).forEach(function (option) {
    var entry = value && value[option] ? value[option] : {};
    var answer = String(entry.answer || entry.status || '').toLowerCase();
    var note = entry.note || entry.bemerkung || '';

    html += '<tr>' +
      '<td>' + printEscapeHtml(option) + '</td>' +
      '<td>' + ((answer === 'ja' || answer === 'yes' || answer === 'true' || answer === '1') ? 'X' : '') + '</td>' +
      '<td>' + ((answer === 'nein' || answer === 'no' || answer === 'false' || answer === '0') ? 'X' : '') + '</td>' +
      '<td>' + printEscapeHtml(note) + '</td>' +
      '</tr>';
  });

  html += '</table>';

  return html;
}

function renderKeyValueTable(title, rows, showUnitColumn) {
  var withUnit = showUnitColumn !== false;
  var html = sectionTitle(title);

  html += withUnit
    ? '<table><tr><th></th><th>Wert</th><th>Einheit</th></tr>'
    : '<table><tr><th></th><th>Wert</th></tr>';

  rows.forEach(function (row) {
    html += withUnit
      ? '<tr><td>' + printEscapeHtml(row[0]) + '</td><td>' + printEscapeHtml(row[1]) + '</td><td>' + printEscapeHtml(row[2]) + '</td></tr>'
      : '<tr><td>' + printEscapeHtml(row[0]) + '</td><td>' + printEscapeHtml(row[1]) + '</td></tr>';
  });

  html += '</table>';

  return html;
}

function renderRemarkBox(section, dataSource) {
  var values = (section.fields || []).filter(function (field) {
    return !isFileField(field) && !isSignatureField(field);
  }).map(function (field) {
    var value = getPlainValueForField(field, dataSource);

    if (!value) {
      return '';
    }

    if ((section.fields || []).length === 1) {
      return value;
    }

    return getFieldLabel(field) + ': ' + value;
  }).filter(Boolean);

  return sectionTitle(section.title || 'Bemerkungen') + '<div class="box">' + printEscapeHtml(values.join('\n')) + '</div>';
}

function renderFieldSection(section, dataSource) {
  var html = '';

  (section.fields || []).filter(isChecklistField).forEach(function (field) {
    html += renderChecklistTable(field, dataSource);
  });

  var rows = (section.fields || []).filter(function (field) {
    return !isFileField(field) && !isSignatureField(field) && !isChecklistField(field);
  }).map(function (field) {
    return [
      getFieldLabel(field) + getRequiredMarker(field, dataSource),
      getPlainValueForField(field, dataSource),
      field.unit || ''
    ];
  });

  if (rows.length) {
    html += renderKeyValueTable(section.title || '', rows, rows.some(function (row) {
      return !!row[2];
    }));
  }

  return html;
}

function getSignatureFields(sections) {
  var fields = [];

  (sections || []).forEach(function (section) {
    (section.fields || []).forEach(function (field) {
      if (isSignatureField(field)) {
        fields.push(field);
      }
    });
  });

  return fields;
}

function renderSignatureBlock(sections, dataSource) {
  var signatureFields = getSignatureFields(sections);

  if (!signatureFields.length) {
    return '';
  }

  var html = '<div class="sign-grid">';

  signatureFields.slice(0, 2).forEach(function (field, index) {
    var value = getPrintableFieldValue(field, dataSource || {});
    var image = extractSignatureDataUrl(value);
    var text = extractSignatureText(value);
    var title = index === 0 ? 'Stempel/Signatur' : getFieldLabel(field);

    html += '<div><b>' + printEscapeHtml(title) + '</b><div class="sig">' +
      (image ? '<img src="' + printEscapeAttribute(image) + '">' : '') +
      '</div><div>' + printEscapeHtml(text) + '</div></div>';
  });

  html += '</div>';

  return html;
}

function buildFormPrintContent(schemaSource, dataSource) {
  var printableData = printClone(dataSource || {});
  var sections = getPrintableSections(schemaSource, printableData);
  var topSections = getTopGridSections(sections);
  var topIds = topSections.map(function (section) {
    return section.id;
  });
  var html = '';

  html += '<div class="print-page">';
  html += renderPrintHeader(schemaSource);
  html += renderTopGrid(topSections, printableData);

  sections.forEach(function (section) {
    if (topIds.indexOf(section.id) !== -1) {
      return;
    }

    if ((section.fields || []).some(isSignatureField)) {
      html += renderFieldSection(section, printableData);
      html += renderSignatureBlock([section], printableData);
      return;
    }

    if (isRemarkSection(section) || (section.fields || []).every(isTextareaField)) {
      html += renderRemarkBox(section, printableData);
      return;
    }

    html += renderFieldSection(section, printableData);
  });

  html += '</div>';

  return html;
}

function buildFormPrintCss() {
  return [
    'html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111}',
    '.print-page{width:210mm;min-height:297mm;margin:0 auto;padding:8mm;box-sizing:border-box;background:#fff}',
    '.print-logo{text-align:center;margin-bottom:4mm}',
    '.print-logo svg,.print-logo img{max-width:52mm;max-height:18mm}',
    '.logo-fallback{text-align:center;font-weight:900;color:#005ca9;font-size:18px}',
    'h1{text-align:center;font-size:18px;margin:0 0 4mm 0}',
    '.top-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #111;margin-bottom:5mm}',
    '.top-grid>div{padding:2.5mm;border-right:1px solid #111}',
    '.top-grid>div:last-child{border-right:0}',
    '.print-sec{font-weight:bold;background:#e6f1fb;border:1px solid #111;padding:1.5mm;margin:3mm 0 0 0}',
    '.box{border:1px solid #111;min-height:18mm;padding:2mm;white-space:pre-wrap}',
    'table{width:100%;border-collapse:collapse;margin:0 0 3mm 0}',
    'th,td{border:1px solid #111;padding:1.3mm;vertical-align:top;white-space:pre-wrap;word-break:break-word}',
    'th{background:#eee}',
    '.sign-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #111;margin-top:6mm}',
    '.sign-grid>div{min-height:24mm;padding:2mm;border-right:1px solid #111}',
    '.sign-grid>div:last-child{border-right:0}',
    '.sig{height:17.6mm;margin-top:2mm}',
    '.sig img{max-height:17.6mm;max-width:100%}',
    '.ort{text-align:center;font-size:13px}',
    '@media print{.print-page{margin:0;page-break-after:always}}'
  ].join('');
}

function buildFormPrintHtml(schemaSource, dataSource) {
  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>' +
    printEscapeHtml(schemaSource.title || 'Druckvorschau') +
    '</title><style>' + buildFormPrintCss(schemaSource) + '</style></head><body>' +
    buildFormPrintContent(schemaSource, dataSource || {}) +
    '</body></html>';
}

window.FormPrintRenderer = {
  buildHtml: buildFormPrintHtml,
  buildContent: buildFormPrintContent,
  buildCss: buildFormPrintCss,
  getPrintableSections: getPrintableSections
};