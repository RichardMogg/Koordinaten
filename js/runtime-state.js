'use strict';

var FORM_RUNTIME_STATE_APP_TYPE = 'form-runtime-state';
var FORM_RUNTIME_STATE_VERSION = '0.1.0';
var FORM_RUNTIME_RECORD_PREFIX = 'prt';

function createRuntimeTimestamp() {
  return new Date().toISOString();
}

function createRuntimeRecordId(prefix) {
  return (prefix || FORM_RUNTIME_RECORD_PREFIX) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function cloneRuntimeData(dataSource) {
  return clone(dataSource || {});
}

function getRuntimeProtocolConfig(schemaSource) {
  return schemaSource && schemaSource.runtime && schemaSource.runtime.protocols
    ? schemaSource.runtime.protocols
    : { enabled: false, listSectionId: '', listFieldIds: [] };
}

function findRuntimeProtocolHeadSection(schemaSource) {
  var protocols = getRuntimeProtocolConfig(schemaSource);
  var sections = schemaSource && Array.isArray(schemaSource.sections) ? schemaSource.sections : [];
  var found = null;

  sections.some(function (section) {
    if (section.runtimeRole === 'protocolListSource' || section.id === protocols.listSectionId) {
      found = section;
      return true;
    }
    return false;
  });

  return found;
}

function createRuntimeDraft(schemaSource, dataSource) {
  return {
    data: dataSource ? cloneRuntimeData(dataSource) : createInitialFormData(schemaSource || { sections: [] }),
    updatedAt: createRuntimeTimestamp()
  };
}

function createRuntimeState(schemaSource, draftData) {
  var now = createRuntimeTimestamp();

  return {
    appType: FORM_RUNTIME_STATE_APP_TYPE,
    stateVersion: FORM_RUNTIME_STATE_VERSION,
    schemaVersion: schemaSource && schemaSource.schemaVersion ? schemaSource.schemaVersion : '',
    schemaId: schemaSource && schemaSource.id ? schemaSource.id : '',
    schemaTitle: schemaSource && schemaSource.title ? schemaSource.title : '',
    savedAt: now,
    draft: {
      data: draftData ? cloneRuntimeData(draftData) : createInitialFormData(schemaSource || { sections: [] }),
      updatedAt: now
    },
    protocols: []
  };
}

function normalizeRuntimeValidationIssues(issues) {
  return Array.isArray(issues) ? issues.map(function (issue) {
    return String(issue || '').trim();
  }).filter(Boolean) : [];
}

function getRuntimeProtocolListFields(schemaSource) {
  var protocols = getRuntimeProtocolConfig(schemaSource);
  var headSection = findRuntimeProtocolHeadSection(schemaSource);
  var selectedIds = Array.isArray(protocols.listFieldIds) ? protocols.listFieldIds : [];
  var result = [];

  if (!headSection || !Array.isArray(headSection.fields)) {
    return result;
  }

  selectedIds.forEach(function (fieldId) {
    headSection.fields.some(function (field) {
      if (field.id === fieldId) {
        result.push(field);
        return true;
      }
      return false;
    });
  });

  return result;
}

function formatRuntimeProtocolLabelValue(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) {
      if (item && typeof item === 'object') {
        return item.name || item.filename || '[Datei]';
      }
      return String(item == null ? '' : item).trim();
    }).filter(Boolean).join(', ');
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).map(function (key) {
      var item = value[key];
      if (item && typeof item === 'object') {
        return item.answer ? key + ': ' + item.answer : '';
      }
      return item ? key : '';
    }).filter(Boolean).join(', ');
  }

  return String(value == null ? '' : value).trim();
}

function buildRuntimeProtocolLabel(schemaSource, dataSource, fallbackLabel) {
  var fields = getRuntimeProtocolListFields(schemaSource);
  var data = dataSource || {};
  var parts = [];

  fields.forEach(function (field) {
    var value = formatRuntimeProtocolLabelValue(data[field.id]);
    if (value) {
      parts.push((field.label || field.id) + ': ' + value);
    }
  });

  return parts.length ? parts.join(' · ') : (fallbackLabel || 'Protokoll');
}

function createRuntimeProtocolRecord(schemaSource, dataSource, validationIssues, options) {
  var settings = options || {};
  var now = createRuntimeTimestamp();
  var issues = normalizeRuntimeValidationIssues(validationIssues);
  var fallbackLabel = settings.fallbackLabel || 'Protokoll';

  return {
    recordId: settings.recordId || createRuntimeRecordId(settings.recordIdPrefix || FORM_RUNTIME_RECORD_PREFIX),
    createdAt: settings.createdAt || now,
    updatedAt: now,
    schemaVersion: schemaSource && schemaSource.schemaVersion ? schemaSource.schemaVersion : '',
    complete: issues.length === 0,
    validationIssues: issues,
    label: buildRuntimeProtocolLabel(schemaSource, dataSource, fallbackLabel),
    data: cloneRuntimeData(dataSource),
    attachments: {}
  };
}

function findRuntimeProtocolIndex(runtimeState, recordId) {
  if (!runtimeState || !Array.isArray(runtimeState.protocols)) {
    return -1;
  }
  return runtimeState.protocols.findIndex(function (record) { return record.recordId === recordId; });
}

function findRuntimeProtocolRecord(runtimeState, recordId) {
  var index = findRuntimeProtocolIndex(runtimeState, recordId);
  return index === -1 ? null : runtimeState.protocols[index];
}

function addRuntimeProtocolRecord(runtimeState, record, options) {
  var settings = options || {};
  if (!runtimeState || !Array.isArray(runtimeState.protocols)) {
    throw new Error('Runtime-State enthält keine Protokollliste.');
  }
  if (settings.maxRecords && runtimeState.protocols.length >= settings.maxRecords) {
    throw new Error('Maximale Anzahl der Protokolle erreicht.');
  }
  runtimeState.protocols.push(record);
  runtimeState.savedAt = createRuntimeTimestamp();
  return record;
}

function updateRuntimeProtocolRecord(runtimeState, recordId, schemaSource, dataSource, validationIssues) {
  var existing = findRuntimeProtocolRecord(runtimeState, recordId);
  if (!existing) {
    throw new Error('Protokoll wurde nicht gefunden.');
  }

  var updated = createRuntimeProtocolRecord(schemaSource, dataSource, validationIssues, {
    recordId: existing.recordId,
    createdAt: existing.createdAt,
    fallbackLabel: existing.label || 'Protokoll'
  });

  Object.keys(updated).forEach(function (key) { existing[key] = updated[key]; });
  runtimeState.savedAt = createRuntimeTimestamp();
  return existing;
}

function deleteRuntimeProtocolRecord(runtimeState, recordId) {
  var index = findRuntimeProtocolIndex(runtimeState, recordId);
  if (index === -1) {
    return false;
  }
  runtimeState.protocols.splice(index, 1);
  runtimeState.savedAt = createRuntimeTimestamp();
  return true;
}

function updateRuntimeDraft(runtimeState, dataSource, schemaSource) {
  if (!runtimeState || runtimeState.appType !== FORM_RUNTIME_STATE_APP_TYPE) {
    throw new Error('Ungültiger Runtime-State.');
  }
  runtimeState.draft = createRuntimeDraft(schemaSource || { sections: [] }, dataSource);
  runtimeState.savedAt = createRuntimeTimestamp();
  return runtimeState.draft;
}

function validateRuntimeStateShape(runtimeState, schemaSource) {
  if (!runtimeState || typeof runtimeState !== 'object') {
    throw new Error('Runtime-State ist kein Objekt.');
  }
  if (runtimeState.appType !== FORM_RUNTIME_STATE_APP_TYPE) {
    throw new Error('Ungültiger Runtime-State-Typ.');
  }
  if (!Array.isArray(runtimeState.protocols)) {
    throw new Error('Runtime-State enthält keine protocols-Liste.');
  }
  if (!runtimeState.draft || typeof runtimeState.draft !== 'object') {
    runtimeState.draft = createRuntimeDraft(schemaSource || { sections: [] });
  }

  runtimeState.protocols.forEach(function (record, index) {
    if (!record.recordId) {
      throw new Error('Protokoll ' + String(index + 1) + ' enthält keine recordId.');
    }
    if (!record.data || typeof record.data !== 'object') {
      record.data = {};
    }
    record.validationIssues = normalizeRuntimeValidationIssues(record.validationIssues);
    record.complete = record.validationIssues.length === 0;
  });

  return runtimeState;
}

window.createRuntimeState = createRuntimeState;
window.createRuntimeDraft = createRuntimeDraft;
window.createRuntimeProtocolRecord = createRuntimeProtocolRecord;
window.addRuntimeProtocolRecord = addRuntimeProtocolRecord;
window.updateRuntimeProtocolRecord = updateRuntimeProtocolRecord;
window.deleteRuntimeProtocolRecord = deleteRuntimeProtocolRecord;
window.findRuntimeProtocolRecord = findRuntimeProtocolRecord;
window.buildRuntimeProtocolLabel = buildRuntimeProtocolLabel;
window.validateRuntimeStateShape = validateRuntimeStateShape;
