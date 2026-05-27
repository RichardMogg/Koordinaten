# Exportierte Formular-Webapp

Runtime-Export aus dem Formular-Baukasten.

Enthalten:
- index.html
- css/app.css
- js/form-config.js
- js/utils.js
- js/signature-utils.js
- js/version-info.js
- js/runtime-state.js
- js/runtime-app.js
- js/runtime-coordinates-field.js
- js/runtime-assets.js
- js/runtime-footer.js
- js/runtime-design.js
- js/runtime-signature-actions.js
- js/print-renderer.js
- js/pdf-renderer.js
- js/runtime-print-actions.js
- assets/*.svg soweit im Schema vorhanden
- .nojekyll

Druck/PDF:
- HTML-Druckvorschau und PDF verwenden dieselbe schema-basierte Druckansicht.
- PDF-Bibliotheken werden per CDN geladen.
- Die Schema-Konfiguration enthält lokale Pfade als Vorbereitung für spätere lokale Runtime-Bibliotheken.
- Foto-/Dateifelder werden in Druckvorschau und PDF nicht ausgegeben.
- Unvollständige Protokolle werden für Druck/PDF blockiert.

Koordinaten:
- Koordinatenfelder verwenden Browser-Geolocation nach Klick und speichern Latitude/Longitude.

Signatur:
- Signaturfelder werden als Canvas erfasst und als DataURL im Protokoll gespeichert.

Noch nicht enthalten:
- CSV
- ZIP-Export gespeicherter Runtime-Protokolle
- Foto-/Signaturdatei-Export