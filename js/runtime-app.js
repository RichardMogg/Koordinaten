'use strict';

(function () {
  var CONFIG_NAME = 'FORM_RUNTIME_CONFIG';
  var STORAGE_PREFIX = 'form-runtime-state:';
  var cfg = null;
  var schema = null;
  var state = null;
  var data = null;
  var editingId = '';
  var els = {};
  var openSections = {};

  function $(id) { return document.getElementById(id); }
  function sections() { return Array.isArray(schema.sections) ? schema.sections : []; }
  function protocolMode() {
    if (!schema.runtime || typeof schema.runtime !== 'object') schema.runtime = {};
    if (!schema.runtime.protocols || typeof schema.runtime.protocols !== 'object') schema.runtime.protocols = {};
    schema.runtime.protocols.enabled = true;
    if (!Array.isArray(schema.runtime.protocols.listFieldIds)) schema.runtime.protocols.listFieldIds = [];
    if (!schema.runtime.protocols.dataSource || typeof schema.runtime.protocols.dataSource !== 'object') schema.runtime.protocols.dataSource = { mode: 'manual' };
    if (!schema.runtime.protocols.dataSource.mode) schema.runtime.protocols.dataSource.mode = 'manual';
    return schema.runtime.protocols;
  }
  function rendering() { return schema.rendering || {}; }
  function renderingField(name, fallback) { return rendering().fields && rendering().fields[name] ? rendering().fields[name] : fallback; }
  function renderingSection(name, fallback) { return rendering().section && rendering().section[name] !== undefined ? rendering().section[name] : fallback; }
  function storageKey() { return STORAGE_PREFIX + String(schema.id || schema.schemaVersion || schema.title || 'default'); }
  function setStatus(msg, type) { if (els.status) { els.status.className = 'status ' + (type || ''); els.status.textContent = msg || ''; } }
  function value(id) { return data[id] == null ? '' : data[id]; }
  function runtimeDateValue(field) { var current = String(value(field.id) || '').trim(); if (!current) { current = typeof getCurrentDateInputValue === 'function' ? getCurrentDateInputValue() : fallbackRuntimeDateValue(); data[field.id] = current; } return current; }
  function fallbackRuntimeDateValue() { var now = new Date(); var month = String(now.getMonth() + 1); var day = String(now.getDate()); return now.getFullYear() + '-' + (month.length < 2 ? '0' + month : month) + '-' + (day.length < 2 ? '0' + day : day); }
  function normalizeCoordinatesValue(raw) { return raw && typeof raw === 'object' && !Array.isArray(raw) ? { latitude: String(raw.latitude == null ? '' : raw.latitude), longitude: String(raw.longitude == null ? '' : raw.longitude) } : { latitude: '', longitude: '' }; }
  function coordinateText(value) { var number = Number(value); return isNaN(number) ? '' : number.toFixed(6); }
  function opts(field) { return Array.isArray(field.options) ? field.options : []; }
  function width(field) { var w = Number(field.width || field.widthPercent || 100); return w && !isNaN(w) ? Math.max(20, Math.min(100, Math.round(w))) : 100; }
  function required(field) { return typeof isRuleFieldRequired === 'function' ? isRuleFieldRequired(field, data) : !!field.required; }
  function visible(field) { return typeof isRuleFieldVisible === 'function' ? isRuleFieldVisible(field, data) : true; }
  function ruleSourceId(rule) { return typeof getRuleSourceId === 'function' ? getRuleSourceId(rule) : (rule && rule.sourceFieldId ? rule.sourceFieldId : ''); }
  function hasRuntimeRuleDependents(sourceFieldId) {
    if (!sourceFieldId) return false;
    return sections().some(function (section) {
      return (section.fields || []).some(function (field) {
        return ruleSourceId(field.visibleWhen) === sourceFieldId || ruleSourceId(field.requiredWhen) === sourceFieldId;
      });
    });
  }
  function afterRuntimeFieldChange(fieldId) {
    var shouldRender = hasRuntimeRuleDependents(fieldId);
    if (shouldRender && typeof resetRuleHiddenValues === 'function') resetRuleHiddenValues(schema, data);
    saveDraft();
    if (shouldRender) renderForm();
    return shouldRender;
  }
  function svgDataUrl(svgText) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svgText || '')); }

  function themeDefaults() { return schema.theme && schema.theme.defaults ? schema.theme.defaults : { colors: {}, opacity: {} }; }
  function themeColors() { return themeDefaults().colors || {}; }
  function themeOpacity() { return themeDefaults().opacity || {}; }
  function hexToRgb(hex) { var value = String(hex || '#ffffff').replace('#', ''); if (value.length === 3) value = value.split('').map(function (c) { return c + c; }).join(''); var number = parseInt(value, 16); return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 }; }
  function rgba(hex, opacityPercent) { var rgb = hexToRgb(hex); var a = Math.max(0, Math.min(100, Number(opacityPercent == null ? 100 : opacityPercent))) / 100; return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')'; }
  function setVar(name, value) { document.documentElement.style.setProperty(name, value); }

  function applyRuntimeDesign() {
    var colors = themeColors();
    var opacity = themeOpacity();
    setVar('--bg', colors.pageBackground || '#f3f6fa');
    setVar('--header-bg', colors.headerBackground || '#ffffff');
    setVar('--header-text', colors.headerText || '#003f75');
    setVar('--subtitle-text', colors.subtitleText || '#64748b');
    setVar('--brand', colors.brand || '#005ca9');
    setVar('--brand-dark', colors.brandDark || '#003f75');
    setVar('--brand-light', colors.brandLight || '#e6f1fb');
    setVar('--accent', colors.accent || '#ffd200');
    setVar('--border', colors.border || '#cbd5e1');
    setVar('--text', colors.bodyText || '#111827');
    setVar('--muted', colors.mutedText || '#64748b');
    setVar('--section-title-color', colors.sectionTitle || '#235ab3');
    setVar('--section-subtitle-color', colors.sectionSubtitle || '#2e3033');
    setVar('--field-label-color', colors.fieldLabel || '#111827');
    setVar('--field-text-color', colors.fieldText || '#111827');
    setVar('--section-bg-color', colors.sectionBackground || '#ffffff');
    setVar('--section-header-bg-color', colors.sectionHeaderClosed || '#ffffff');
    setVar('--section-header-open-bg-color', colors.sectionHeaderOpen || '#e6f1fb');
    setVar('--field-card-bg-color', colors.fieldCardBackground || '#ffffff');
    setVar('--input-bg-color', colors.inputBackground || '#ffffff');
    setVar('--input-focus-bg-color', colors.inputFocusBackground || '#ffffff');
    setVar('--option-bg-color', colors.optionBackground || '#ffffff');
    setVar('--section-bg', rgba(colors.sectionBackground || '#ffffff', opacity.section == null ? 34 : opacity.section));
    setVar('--section-header-bg', rgba(colors.sectionHeaderClosed || '#ffffff', opacity.sectionHeaderClosed == null ? 42 : opacity.sectionHeaderClosed));
    setVar('--section-header-open-bg', rgba(colors.sectionHeaderOpen || '#e6f1fb', opacity.sectionHeaderOpen == null ? 42 : opacity.sectionHeaderOpen));
    setVar('--field-card-bg', rgba(colors.fieldCardBackground || '#ffffff', opacity.fieldCard == null ? 38 : opacity.fieldCard));
    setVar('--input-bg', rgba(colors.inputBackground || '#ffffff', opacity.input == null ? 86 : opacity.input));
    setVar('--input-focus-bg', rgba(colors.inputFocusBackground || '#ffffff', opacity.inputFocus == null ? 94 : opacity.inputFocus));
    setVar('--option-bg', rgba(colors.optionBackground || '#ffffff', opacity.option == null ? 42 : opacity.option));
    setVar('--bg-overlay-a', rgba(colors.pageBackground || '#f3f6fa', opacity.backgroundOverlayTop == null ? 8 : opacity.backgroundOverlayTop));
    setVar('--bg-overlay-b', rgba(colors.pageBackground || '#f3f6fa', opacity.backgroundOverlayBottom == null ? 14 : opacity.backgroundOverlayBottom));
    setVar('--card', rgba(colors.headerBackground || '#ffffff', opacity.panel == null ? 88 : opacity.panel));
    setVar('--card-strong', rgba(colors.headerBackground || '#ffffff', opacity.panelStrong == null ? 96 : opacity.panelStrong));
    setVar('--primary-button-bg', colors.primaryButtonBackground || '#005ca9');
    setVar('--primary-button-text', colors.primaryButtonText || '#ffffff');
    setVar('--secondary-button-bg', colors.secondaryButtonBackground || '#e5e7eb');
    setVar('--secondary-button-text', colors.secondaryButtonText || '#111827');
    setVar('--danger', colors.danger || '#dc2626');
    setVar('--ok-bg', colors.okBackground || '#dcfce7');
    setVar('--ok-text', colors.okText || '#166534');
    setVar('--err-bg', colors.errorBackground || '#fee2e2');
    setVar('--err-text', colors.errorText || '#991b1b');
    setVar('--warn-bg', colors.warningBackground || '#fef3c7');
    setVar('--warn-text', colors.warningText || '#92400e');
  }

  function renderRuntimeAssets() {
    if (window.FormRuntimeAssets && typeof window.FormRuntimeAssets.render === 'function') { window.FormRuntimeAssets.render(); return; }
    var logoHost = $('runtimeLogo');
    var logo = schema.assets && schema.assets.headerLogo;
    if (logoHost && logo && logo.enabled !== false && logo.svgText) logoHost.innerHTML = '<img src="' + svgDataUrl(logo.svgText) + '" alt="' + escapeAttribute(logo.alt || 'Logo') + '">';
  }

  function rememberOpenSections() { if (!renderingSection('rememberOpenState', true) || !els.form) return; els.form.querySelectorAll('details.section[data-section-id]').forEach(function (details) { openSections[details.getAttribute('data-section-id')] = details.open; }); }
  function cache() { els = { title: $('runtimeTitle'), subtitle: $('runtimeSubtitle'), version: $('runtimeVersion'), status: $('runtimeStatus'), form: $('runtimeForm'), list: $('runtimeProtocolList'), take: $('runtimeTakeProtocolButton'), add: $('runtimeNewProtocolButton'), clear: $('runtimeClearDraftButton') }; }
  function loadState(){var stored='';try{stored=window.localStorage?window.localStorage.getItem(storageKey()):'';}catch(e){stored='';}if(stored){try{return validateRuntimeStateShape(JSON.parse(stored),schema);}catch(e2){setStatus('Gespeicherter Stand konnte nicht geladen werden.','err');}}return createRuntimeState(schema);}
  function saveState(){state.savedAt=new Date().toISOString();try{if(window.localStorage)window.localStorage.setItem(storageKey(),JSON.stringify(state));}catch(e){setStatus('Speichern im Browser fehlgeschlagen.','err');}}
  function saveDraft(){updateRuntimeDraft(state,data,schema);saveState();}
  function resetRuntimeDraft(){data=createInitialFormData(schema);state.draft=createRuntimeDraft(schema,data);editingId='';openSections={};saveState();renderForm();renderList();setStatus('Neues Protokoll vorbereitet.','ok');}
  function header(){if(els.title)els.title.textContent=schema.title||'';if(els.subtitle)els.subtitle.textContent=schema.subtitle||'';if(els.version)els.version.textContent=schema.version||schema.schemaVersion||'';}
  function input(field,type){var current=type==='date'?runtimeDateValue(field):value(field.id);return '<input type="'+type+'" data-field="'+escapeAttribute(field.id)+'" value="'+escapeAttribute(current)+'">';}
  function select(field){var current=String(value(field.id));var html='<select data-field="'+escapeAttribute(field.id)+'"><option value="">Bitte auswählen</option>';opts(field).forEach(function(option){var val=String(option);html+='<option value="'+escapeAttribute(val)+'"'+(val===current?' selected':'')+'>'+escapeHtml(val)+'</option>';});return html+'</select>';}
  function boolPills(field){var current=String(value(field.id));return '<div class="pill-options bool-pills">'+['Ja','Nein'].map(function(val){return '<label class="pill-option bool-pill"><input type="radio" name="'+escapeAttribute(field.id)+'" data-field-radio="'+escapeAttribute(field.id)+'" value="'+val+'"'+(current===val?' checked':'')+'> <span>'+val+'</span></label>';}).join('')+'</div>';}
  function checklist(field){var stored=data[field.id]&&typeof data[field.id]==='object'?data[field.id]:{};return '<div class="checklist">'+opts(field).map(function(option){var answer=stored[option]&&stored[option].answer?stored[option].answer:'';var note=stored[option]&&stored[option].note?stored[option].note:'';return '<div class="check-row"><div class="check-title">'+escapeHtml(option)+'</div><div class="pill-options">'+['Ja','Nein'].map(function(val){return '<label class="pill-option"><input type="radio" name="'+escapeAttribute(field.id+'_'+option)+'" data-checklist-radio="'+escapeAttribute(field.id)+'" data-option="'+escapeAttribute(option)+'" value="'+val+'"'+(answer===val?' checked':'')+'> '+val+'</label>';}).join('')+'</div><label class="check-note-label">Bemerkung<textarea data-checklist-note="'+escapeAttribute(field.id)+'" data-option="'+escapeAttribute(option)+'" placeholder="Optional">'+escapeHtml(note)+'</textarea></label></div>';}).join('')+'</div>';}
  function fileInput(field){var files=Array.isArray(data[field.id])?data[field.id]:[];var names=files.length?files.map(function(f){return f.name||'[Datei]';}).join(', '):'Keine Dateien ausgewählt.';return '<input type="file" multiple data-file="'+escapeAttribute(field.id)+'"><div class="file-list">'+escapeHtml(names)+'</div>';}
  function locationDate(field){var stored=data[field.id]&&typeof data[field.id]==='object'&&!Array.isArray(data[field.id])?data[field.id]:defaultValueForField(field);data[field.id]=stored;return '<div class="location-date-grid"><div class="location-date-part"><span>'+escapeHtml(field.locationLabel||'Ort')+'</span><input type="text" data-location-date="'+escapeAttribute(field.id)+'" data-location-date-part="location" value="'+escapeAttribute(stored.location||'')+'"></div><div class="location-date-part"><span>'+escapeHtml(field.dateLabel||'Datum')+'</span><input type="date" data-location-date="'+escapeAttribute(field.id)+'" data-location-date-part="date" value="'+escapeAttribute(stored.date||'')+'"></div></div>';}
  function coordinates(field){var stored=normalizeCoordinatesValue(data[field.id]);data[field.id]=stored;return '<div class="location-date-grid"><label>Latitude<input type="text" readonly data-coordinate-display="'+escapeAttribute(field.id)+'" data-coordinate-part="latitude" value="'+escapeAttribute(stored.latitude)+'"></label><label>Longitude<input type="text" readonly data-coordinate-display="'+escapeAttribute(field.id)+'" data-coordinate-part="longitude" value="'+escapeAttribute(stored.longitude)+'"></label></div><div class="button-row"><button type="button" class="btn-secondary btn-small" data-coordinate-read="'+escapeAttribute(field.id)+'">Koordinaten auslesen</button></div><div class="asset-info" data-coordinate-status="'+escapeAttribute(field.id)+'"></div>';}
  function signature(field){var signed=!!data[field.id];return '<div class="signature-box'+(signed?' signed':'')+'" data-signature="'+escapeAttribute(field.id)+'">'+(signed?'Unterschrift vorhanden – klicken zum Entfernen':'Unterschrift simulieren')+'</div>';}
  function control(field){if(field.type==='textarea')return '<textarea data-field="'+escapeAttribute(field.id)+'">'+escapeHtml(value(field.id))+'</textarea>';if(field.type==='select')return select(field);if(field.type==='bool'&&renderingField('bool','yes-no-pills')==='yes-no-pills')return boolPills(field);if(field.type==='checklist'&&renderingField('checklist','yes-no-pills-with-note')==='yes-no-pills-with-note')return checklist(field);if(field.type==='file')return fileInput(field);if(field.type==='locationDate')return locationDate(field);if(field.type==='coordinates')return coordinates(field);if(field.type==='signature'&&renderingField('signature','clickable-simulation-box')==='clickable-simulation-box')return signature(field);if(field.type==='number'||field.type==='decimal')return '<div class="input-unit">'+input(field,'number')+(field.unit?'<span class="unit">'+escapeHtml(field.unit)+'</span>':'')+'</div>';if(field.type==='date')return input(field,'date');if(field.type==='datetime')return input(field,'datetime-local');return input(field,'text');}
  function renderForm(){if(!els.form)return;rememberOpenSections();els.form.innerHTML='';sections().forEach(function(section){var details=document.createElement('details');details.className='section';details.setAttribute('data-section-id',section.id);details.open=Object.prototype.hasOwnProperty.call(openSections,section.id)?!!openSections[section.id]:!!section.openByDefault;details.addEventListener('toggle',function(){openSections[section.id]=details.open;});var body='<summary><div class="summary-main"><span><span class="summary-title">'+escapeHtml(section.title||section.id)+'</span>'+(section.subtitle?'<span class="summary-sub">'+escapeHtml(section.subtitle)+'</span>':'')+'</span><span class="summary-count">'+String((section.fields||[]).length)+' Felder</span></div></summary><div class="section-body">';(section.fields||[]).forEach(function(field){if(!visible(field))return;body+='<div class="field-card" style="--field-width:'+width(field)+'%"><label><span>'+escapeHtml(field.label||field.id)+(required(field)?' <span class="required-hint">*</span>':'')+'</span>'+control(field)+'</label></div>';});details.innerHTML=body+'</div>';els.form.appendChild(details);});bindForm();}
  function bindForm() {
    els.form.querySelectorAll('[data-field]').forEach(function (el) {
      var fieldId = el.getAttribute('data-field');
      var updateValue = function () { data[fieldId] = el.value; };
      el.addEventListener('input', function () { updateValue(); saveDraft(); });
      el.addEventListener('change', function () { updateValue(); afterRuntimeFieldChange(fieldId); });
    });

    els.form.querySelectorAll('[data-coordinate-read]').forEach(function (button) {
      button.addEventListener('click', function () {
        var fieldId = button.getAttribute('data-coordinate-read');
        var status = els.form.querySelector('[data-coordinate-status="' + fieldId + '"]');
        var latitudeInput = els.form.querySelector('[data-coordinate-display="' + fieldId + '"][data-coordinate-part="latitude"]');
        var longitudeInput = els.form.querySelector('[data-coordinate-display="' + fieldId + '"][data-coordinate-part="longitude"]');

        if (!navigator.geolocation) {
          if (status) status.textContent = 'Geolocation wird von diesem Browser nicht unterstützt.';
          return;
        }

        if (status) status.textContent = 'Koordinaten werden gelesen...';

        navigator.geolocation.getCurrentPosition(function (position) {
          var coordinatesValue = { latitude: coordinateText(position.coords.latitude), longitude: coordinateText(position.coords.longitude) };
          data[fieldId] = coordinatesValue;
          if (latitudeInput) latitudeInput.value = coordinatesValue.latitude;
          if (longitudeInput) longitudeInput.value = coordinatesValue.longitude;
          if (status) status.textContent = 'Koordinaten ermittelt.';
          afterRuntimeFieldChange(fieldId);
          renderList();
        }, function () {
          if (status) status.textContent = 'Koordinaten konnten nicht gelesen werden. Berechtigung oder Empfang prüfen.';
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      });
    });

    els.form.querySelectorAll('[data-location-date]').forEach(function (el) {
      el.addEventListener('input', function () { var fieldId = el.getAttribute('data-location-date'); var part = el.getAttribute('data-location-date-part'); if (!data[fieldId] || typeof data[fieldId] !== 'object' || Array.isArray(data[fieldId])) data[fieldId] = defaultValueForField({ type: 'locationDate' }); data[fieldId][part] = el.value; saveDraft(); });
      el.addEventListener('change', function () { var fieldId = el.getAttribute('data-location-date'); var part = el.getAttribute('data-location-date-part'); if (!data[fieldId] || typeof data[fieldId] !== 'object' || Array.isArray(data[fieldId])) data[fieldId] = defaultValueForField({ type: 'locationDate' }); data[fieldId][part] = el.value; afterRuntimeFieldChange(fieldId); });
    });

    els.form.querySelectorAll('[data-field-radio]').forEach(function (el) { el.addEventListener('change', function () { var fieldId = el.getAttribute('data-field-radio'); data[fieldId] = el.value; afterRuntimeFieldChange(fieldId); }); });
    els.form.querySelectorAll('[data-checklist-radio]').forEach(function (el) { el.addEventListener('change', function () { var fieldId = el.getAttribute('data-checklist-radio'); var option = el.getAttribute('data-option'); if (!data[fieldId] || typeof data[fieldId] !== 'object') data[fieldId] = {}; data[fieldId][option] = data[fieldId][option] || {}; data[fieldId][option].answer = el.value; afterRuntimeFieldChange(fieldId); }); });
    els.form.querySelectorAll('[data-checklist-note]').forEach(function (el) { el.addEventListener('input', function () { var fieldId = el.getAttribute('data-checklist-note'); var option = el.getAttribute('data-option'); if (!data[fieldId] || typeof data[fieldId] !== 'object') data[fieldId] = {}; data[fieldId][option] = data[fieldId][option] || {}; data[fieldId][option].note = el.value; saveDraft(); }); });
    els.form.querySelectorAll('[data-file]').forEach(function (el) { el.addEventListener('change', function () { var fieldId = el.getAttribute('data-file'); var nextFiles = Array.prototype.map.call(el.files || [], function (file) { return { name: file.name, type: file.type, size: file.size }; }); data[fieldId] = (Array.isArray(data[fieldId]) ? data[fieldId] : []).concat(nextFiles); el.value = ''; if (!afterRuntimeFieldChange(fieldId)) renderForm(); }); });
    els.form.querySelectorAll('[data-signature]').forEach(function (el) { el.addEventListener('click', function () { var fieldId = el.getAttribute('data-signature'); data[fieldId] = data[fieldId] ? '' : 'Unterschrift vorhanden'; if (!afterRuntimeFieldChange(fieldId)) renderForm(); }); });
  }
  function renderList(){if(!els.list)return;protocolMode();if(!state.protocols.length){els.list.innerHTML='<div class="status">Noch keine Protokolle gespeichert.</div>';return;}els.list.innerHTML=state.protocols.map(function(record){var issues=record.validationIssues||[];return '<div class="list-item'+(record.recordId===editingId?' active':'')+'"><div class="list-item-title">'+escapeHtml(record.label||record.recordId)+'</div><div class="list-item-sub">Status: '+(record.complete?'vollständig':'unvollständig')+' · ID: '+escapeHtml(record.recordId)+'</div>'+(issues.length?'<div class="status">Fehlt: '+escapeHtml(issues.join(' · '))+'</div>':'<div class="status ok">Vollständig.</div>')+'<div class="item-actions"><button type="button" class="btn-secondary btn-small" data-open="'+escapeAttribute(record.recordId)+'">Öffnen / bearbeiten</button>'+(protocolMode().allowDuplicate?'<button type="button" class="btn-secondary btn-small" data-copy="'+escapeAttribute(record.recordId)+'">Duplizieren</button>':'')+'<button type="button" class="btn-danger btn-small" data-delete="'+escapeAttribute(record.recordId)+'">Löschen</button></div></div>';}).join('');els.list.querySelectorAll('[data-open]').forEach(function(b){b.addEventListener('click',function(){openProtocol(b.getAttribute('data-open'));});});els.list.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){duplicateProtocol(b.getAttribute('data-copy'));});});els.list.querySelectorAll('[data-delete]').forEach(function(b){b.addEventListener('click',function(){deleteProtocol(b.getAttribute('data-delete'));});});}
  function takeProtocol(){protocolMode();var issues=validateForm(schema,data);if(issues.length)window.alert('Protokoll ist unvollständig:\n\n- '+issues.join('\n- '));if(editingId){updateRuntimeProtocolRecord(state,editingId,schema,data,issues);editingId='';setStatus('Protokoll aktualisiert.',issues.length?'':'ok');}else{addRuntimeProtocolRecord(state,createRuntimeProtocolRecord(schema,data,issues,{fallbackLabel:'Protokoll '+String(state.protocols.length+1)}));setStatus('Protokoll übernommen.',issues.length?'':'ok');}saveDraft();renderList();}
  function openProtocol(id){var record=findRuntimeProtocolRecord(state,id);if(!record)return;data=clone(record.data);editingId=record.recordId;saveDraft();renderForm();renderList();setStatus('Protokoll zur Bearbeitung geöffnet.','ok');}
  function duplicateProtocol(id){var record=findRuntimeProtocolRecord(state,id);if(!record||!protocolMode().allowDuplicate)return;addRuntimeProtocolRecord(state,createRuntimeProtocolRecord(schema,record.data,record.validationIssues,{fallbackLabel:(record.label||'Protokoll')+' Kopie'}));saveState();renderList();}
  function deleteProtocol(id){if(!window.confirm('Protokoll wirklich löschen?'))return;if(editingId===id)editingId='';deleteRuntimeProtocolRecord(state,id);saveState();renderList();}
  function bindEvents(){if(els.take)els.take.addEventListener('click',takeProtocol);if(els.add)els.add.addEventListener('click',resetRuntimeDraft);if(els.clear)els.clear.addEventListener('click',resetRuntimeDraft);}
  function init(){cfg=window[CONFIG_NAME];if(!cfg||!cfg.schema)return;schema=cfg.schema;protocolMode();cache();applyRuntimeDesign();renderRuntimeAssets();state=loadState();data=state.draft&&state.draft.data?clone(state.draft.data):createInitialFormData(schema);header();renderForm();renderList();bindEvents();setStatus('Runtime-App geladen.','ok');var runtimePrintActionsScript=document.createElement('script');runtimePrintActionsScript.src='js/runtime-print-actions.js';document.body.appendChild(runtimePrintActionsScript);}
  window.FormRuntimeApp={init:init,getConfig:function(){return cfg;},getSchema:function(){return schema;},getState:function(){return state;},getFormData:function(){return data;},renderForm:renderForm,renderProtocolList:renderList};
  document.addEventListener('DOMContentLoaded',init);
}());