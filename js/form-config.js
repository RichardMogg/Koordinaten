'use strict';

window.FORM_RUNTIME_CONFIG = {
  "exportVersion": "0.1.0",
  "generatedAt": "2026-05-27T20:54:23.281Z",
  "schema": {
    "appType": "form-builder-schema",
    "schemaVersion": "0.3.0",
    "title": "Formular-Titel",
    "subtitle": "Untertitel",
    "version": "V1.0",
    "theme": {
      "defaults": {
        "colors": {
          "pageBackground": "#f3f6fa",
          "headerBackground": "#ffffff",
          "headerText": "#003f75",
          "subtitleText": "#64748b",
          "brand": "#005ca9",
          "brandDark": "#003f75",
          "brandLight": "#e6f1fb",
          "accent": "#ffd200",
          "border": "#cbd5e1",
          "bodyText": "#111827",
          "mutedText": "#64748b",
          "sectionTitle": "#235ab3",
          "sectionSubtitle": "#2e3033",
          "fieldLabel": "#111827",
          "fieldText": "#111827",
          "sectionBackground": "#ffffff",
          "sectionHeaderClosed": "#ffffff",
          "sectionHeaderOpen": "#e6f1fb",
          "fieldCardBackground": "#ffffff",
          "inputBackground": "#ffffff",
          "inputFocusBackground": "#ffffff",
          "optionBackground": "#ffffff",
          "primaryButtonBackground": "#005ca9",
          "primaryButtonText": "#ffffff",
          "secondaryButtonBackground": "#e5e7eb",
          "secondaryButtonText": "#111827",
          "danger": "#dc2626",
          "okBackground": "#dcfce7",
          "okText": "#166534",
          "errorBackground": "#fee2e2",
          "errorText": "#991b1b",
          "warningBackground": "#fef3c7",
          "warningText": "#92400e",
          "footerBackground": "#ffffff",
          "footerText": "#64748b",
          "footerBorder": "#cbd5e1"
        },
        "opacity": {
          "section": 34,
          "sectionHeaderClosed": 42,
          "sectionHeaderOpen": 42,
          "fieldCard": 38,
          "input": 86,
          "inputFocus": 94,
          "option": 42,
          "backgroundOverlayTop": 8,
          "backgroundOverlayBottom": 14,
          "panel": 88,
          "panelStrong": 96,
          "footer": 34
        }
      },
      "userControls": {
        "enabled": true,
        "sectionTitle": "Darstellung / Transparenz",
        "sectionSubtitle": "Farben, Hintergrund, Abschnitte und Felder einstellen",
        "allowReset": true,
        "persistInBrowser": true
      }
    },
    "footer": {
      "enabled": false,
      "lines": [
        {
          "text": ""
        }
      ]
    },
    "sections": [
      {
        "id": "protocol_kopfdaten",
        "title": "1. Kopfdaten",
        "subtitle": "Kopfdaten für Protokollliste, spätere Exporte und spätere Datei-Importe",
        "openByDefault": false,
        "lockedByRuntime": true,
        "runtimeRole": "protocolListSource",
        "titleLocked": true,
        "deleteLocked": true,
        "moveLocked": true,
        "fields": [
          {
            "id": "koordinaten_mpojktuf_mmwc6",
            "label": "Koordinaten",
            "type": "coordinates",
            "required": false,
            "unit": "",
            "widthPercent": 100
          }
        ]
      }
    ],
    "runtime": {
      "protocols": {
        "enabled": true,
        "listSectionId": "protocol_kopfdaten",
        "listFieldIds": [],
        "dataSource": {
          "mode": "manual"
        },
        "maxBuilderPreviewProtocols": 2,
        "allowDuplicate": false,
        "allowIncompleteInList": true,
        "blockExportWhenIncomplete": true,
        "jsonImportMode": "ask-add-or-replace",
        "afterZipExport": "ask-clear-or-keep",
        "storage": "temporary-local-until-final-zip"
      }
    },
    "assets": {
      "headerLogo": null,
      "backgroundGraphic": null
    },
    "rendering": {
      "version": "0.2.0",
      "section": {
        "mode": "details-card",
        "rememberOpenState": true,
        "summaryLayout": "title-subtitle-count"
      },
      "fields": {
        "bool": "yes-no-pills",
        "checklist": "yes-no-pills-with-note",
        "locationDate": "location-date-pair",
        "coordinates": "coordinates-button",
        "signature": "canvas-signature",
        "file": "file-list-metadata",
        "widthMode": "percent"
      },
      "validation": {
        "showRequiredMarker": true,
        "showSummaryStatus": true
      },
      "print": {
        "version": "0.1.0",
        "enabled": true,
        "target": "new-window",
        "dataSource": "selected-test-protocol",
        "page": {
          "format": "A4",
          "orientation": "portrait",
          "widthMm": 210,
          "heightMm": 297,
          "marginMm": 8
        },
        "layout": {
          "mode": "reference-report",
          "sectionMode": "tables",
          "showEmptyFields": true,
          "showHiddenRuleFields": false,
          "includeFileFields": false,
          "includeFileMetadata": false
        },
        "header": {
          "showLogo": true,
          "showTitle": true,
          "showSubtitle": true,
          "showVersion": true,
          "logoMaxWidthMm": 52,
          "logoMaxHeightMm": 18
        },
        "background": {
          "showGraphic": true,
          "mode": "watermark",
          "opacityPercent": 8,
          "scalePercent": 100,
          "positionXPercent": 50,
          "positionYPercent": 50
        },
        "footer": {
          "showFooter": true,
          "repeatOnEachPage": true
        },
        "fieldOutput": {
          "textMode": "value-cell",
          "textareaMode": "box",
          "boolMode": "yes-no-columns",
          "selectMode": "value-cell",
          "checklistMode": "yes-no-note-table",
          "locationDateMode": "location-date-lines",
          "coordinatesMode": "coordinates-lines",
          "signatureMode": "image-or-status",
          "fileMode": "omit"
        },
        "exportRules": {
          "allowIncompleteProtocols": false,
          "onePdfPerProtocol": true,
          "includePhotos": false,
          "includeFileMetadata": false
        }
      },
      "pdf": {
        "version": "0.1.0",
        "enabled": true,
        "source": "html-print-preview",
        "engine": "html2canvas-jspdf",
        "dependencyMode": "cdn-prepared-local-later",
        "libraries": {
          "html2canvas": {
            "globalName": "html2canvas",
            "cdnUrl": "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
            "localPath": "js/vendor/html2canvas.min.js"
          },
          "jspdf": {
            "globalName": "jspdf.jsPDF",
            "cdnUrl": "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
            "localPath": "js/vendor/jspdf.umd.min.js"
          }
        },
        "page": {
          "format": "a4",
          "orientation": "p",
          "unit": "mm",
          "widthMm": 210,
          "heightMm": 297
        },
        "render": {
          "scale": 3,
          "backgroundColor": "#ffffff",
          "useCORS": true,
          "imageType": "PNG",
          "imageQuality": 1,
          "pageBreakMode": "canvas-slice"
        }
      }
    }
  },
  "manifest": {
    "exportVersion": "0.1.0",
    "generatedAt": "2026-05-27T20:54:23.281Z",
    "appType": "form-runtime-config",
    "target": "static-runtime-webapp",
    "filesPlanned": [
      "index.html",
      "css/app.css",
      "js/form-config.js",
      "js/runtime-state.js",
      "js/runtime-app.js",
      "js/runtime-coordinates-field.js",
      "js/runtime-assets.js",
      "js/runtime-footer.js",
      "assets/",
      "README.md",
      ".nojekyll"
    ],
    "currentFile": "js/form-config.js",
    "schemaTitle": "Formular-Titel",
    "schemaVersion": "0.3.0",
    "runtime": {
      "protocols": {
        "enabled": true,
        "listSectionId": "protocol_kopfdaten",
        "listFieldIds": [],
        "dataSource": {
          "mode": "manual"
        },
        "maxBuilderPreviewProtocols": 2,
        "allowDuplicate": false,
        "allowIncompleteInList": true,
        "blockExportWhenIncomplete": true,
        "jsonImportMode": "ask-add-or-replace",
        "afterZipExport": "ask-clear-or-keep",
        "storage": "temporary-local-until-final-zip"
      }
    }
  }
};
