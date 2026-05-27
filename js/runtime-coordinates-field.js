'use strict';

(function () {
  function normalize(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return {
        latitude: String(value.latitude == null ? '' : value.latitude),
        longitude: String(value.longitude == null ? '' : value.longitude)
      };
    }

    return { latitude: '', longitude: '' };
  }

  function coordinateText(value) {
    var number = Number(value);
    return isNaN(number) ? '' : number.toFixed(6);
  }

  function readCoordinates(onSuccess, onError) {
    if (!navigator.geolocation) {
      onError('Geolocation wird von diesem Browser nicht unterstützt.');
      return;
    }

    navigator.geolocation.getCurrentPosition(function (position) {
      onSuccess({
        latitude: coordinateText(position.coords.latitude),
        longitude: coordinateText(position.coords.longitude)
      });
    }, function () {
      onError('Koordinaten konnten nicht gelesen werden. Berechtigung oder Empfang prüfen.');
    }, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    });
  }

  function renderCoordinatesCard(card, field, value) {
    var current = normalize(value);
    card.innerHTML =
      '<label><span>' + escapeHtml(field.label || field.id) + (field.required ? ' <span class="required-hint">*</span>' : '') + '</span></label>' +
      '<div class="location-date-grid">' +
        '<label>Latitude<input type="text" readonly data-runtime-coordinate-part="latitude" value="' + escapeAttribute(current.latitude) + '"></label>' +
        '<label>Longitude<input type="text" readonly data-runtime-coordinate-part="longitude" value="' + escapeAttribute(current.longitude) + '"></label>' +
      '</div>' +
      '<div class="button-row"><button type="button" class="btn-secondary btn-small" data-runtime-coordinate-read="true">Koordinaten auslesen</button></div>' +
      '<div class="asset-info" data-runtime-coordinate-status="true"></div>';
  }

  function enhanceRuntimeCoordinates() {
    if (!window.FormRuntimeApp || typeof window.FormRuntimeApp.getSchema !== 'function' || typeof window.FormRuntimeApp.getFormData !== 'function') {
      return;
    }

    var schema = window.FormRuntimeApp.getSchema();
    var data = window.FormRuntimeApp.getFormData();

    (schema.sections || []).forEach(function (section) {
      (section.fields || []).forEach(function (field) {
        if (!field || field.type !== 'coordinates') {
          return;
        }

        var card = document.querySelector('[data-runtime-coordinate-card="' + escapeAttribute(field.id) + '"]');

        if (!card) {
          var source = document.querySelector('[data-field="' + escapeAttribute(field.id) + '"]');
          if (source) {
            card = source.closest('.field-card');
          }
        }

        if (!card || card.dataset.coordinatesEnhanced === '1') {
          return;
        }

        card.dataset.runtimeCoordinateCard = field.id;
        card.dataset.coordinatesEnhanced = '1';
        data[field.id] = normalize(data[field.id]);
        renderCoordinatesCard(card, field, data[field.id]);

        var latitudeInput = card.querySelector('[data-runtime-coordinate-part="latitude"]');
        var longitudeInput = card.querySelector('[data-runtime-coordinate-part="longitude"]');
        var status = card.querySelector('[data-runtime-coordinate-status]');
        var button = card.querySelector('[data-runtime-coordinate-read]');

        button.addEventListener('click', function () {
          status.textContent = 'Koordinaten werden gelesen...';
          readCoordinates(function (coordinates) {
            data[field.id] = coordinates;
            latitudeInput.value = coordinates.latitude;
            longitudeInput.value = coordinates.longitude;
            status.textContent = 'Koordinaten ermittelt.';
            if (window.FormRuntimeApp && typeof window.FormRuntimeApp.renderProtocolList === 'function') {
              window.FormRuntimeApp.renderProtocolList();
            }
          }, function (message) {
            status.textContent = message;
          });
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(enhanceRuntimeCoordinates, 0);
  });

  document.addEventListener('click', function () {
    setTimeout(enhanceRuntimeCoordinates, 0);
  });

  window.RuntimeCoordinatesField = {
    enhance: enhanceRuntimeCoordinates,
    normalize: normalize,
    read: readCoordinates
  };
}());