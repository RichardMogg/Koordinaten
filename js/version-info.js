'use strict';

var FORM_BUILDER_VERSION_INFO = '0.3.0';
var FORM_RULE_OPERATOR_EQUALS = 'equals';

if (typeof DEFAULT_SCHEMA !== 'undefined') {
  DEFAULT_SCHEMA.schemaVersion = FORM_BUILDER_VERSION_INFO;
}

function getRuleSourceId(rule) {
  return rule && rule.sourceFieldId ? rule.sourceFieldId : '';
}

function doesRuleMatch(rule, values) {
  var sourceId = getRuleSourceId(rule);

  if (!sourceId || !rule) {
    return false;
  }

  if (rule.operator && rule.operator !== FORM_RULE_OPERATOR_EQUALS) {
    return false;
  }

  return String(values[sourceId] || '') === String(rule.value || '');
}

function isRuleFieldVisible(field, values) {
  return !field.visibleWhen || doesRuleMatch(field.visibleWhen, values);
}

function isRuleFieldRequired(field, values) {
  return !!field.required || !!(field.requiredWhen && doesRuleMatch(field.requiredWhen, values));
}

function resetRuleHiddenValue(field, values) {
  if (!field.clearWhenHidden || isRuleFieldVisible(field, values)) {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(values, field.id)) {
    return false;
  }

  values[field.id] = defaultValueForField(field);
  return true;
}

function resetRuleHiddenValues(schemaSource, values) {
  (schemaSource.sections || []).forEach(function (section) {
    (section.fields || []).forEach(function (field) {
      resetRuleHiddenValue(field, values);
    });
  });
}

function fieldHasRuleDependents(sourceFieldId) {
  return (schema.sections || []).some(function (section) {
    return (section.fields || []).some(function (field) {
      return getRuleSourceId(field.visibleWhen) === sourceFieldId || getRuleSourceId(field.requiredWhen) === sourceFieldId;
    });
  });
}

validateForm = function (schemaSource, dataSource) {
  var issues = [];

  resetRuleHiddenValues(schemaSource, dataSource);

  schemaSource.sections.forEach(function (section) {
    (section.fields || []).forEach(function (field) {
      if (!isRuleFieldVisible(field, dataSource) || !isRuleFieldRequired(field, dataSource)) {
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
      } else if (field.type === 'coordinates') {
        missing = window.CoordinatesField && typeof window.CoordinatesField.isMissing === 'function'
          ? window.CoordinatesField.isMissing(value)
          : !value || !value.latitude || !value.longitude;
      } else if (field.type === 'signature' && typeof isSignatureMissing === 'function') {
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