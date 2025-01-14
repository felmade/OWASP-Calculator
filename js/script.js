"use strict";

import {
  parseUrlParameters,
  performAdvancedCalculation,
  shouldUseUrlLogic,
  // Falls du "storedVector" direkt verwenden willst:
  storedVector
} from './url_logic.js';

/**
 * Canvas-Element für das Radar-Chart
 * @type {HTMLCanvasElement|null}
 */
let riskChartElement;

/**
 * 2D-Kontext für Chart.js
 * @type {CanvasRenderingContext2D|null}
 */
let riskChartCtx;

/**
 * Instanz des Radar-Charts (Chart.js)
 * @type {Chart|null}
 */
let riskChart = null;

/**
 * Farben für verschiedene Risiko-Levels (Reihenfolge: CRITICAL, HIGH, MEDIUM, LOW, NOTE)
 * @type {string[]}
 */
const colors = [
  'rgba(255, 102, 255)',    // Critical
  'rgba(255, 0, 0)',        // High
  'rgba(255, 169, 0)',      // Medium
  'rgba(255, 255, 0)',      // Low
  'rgba(144, 238, 144)'     // Note
];

/**
 * Hintergrundfarben (0.5 alpha) für die gleichen Levels
 * @type {string[]}
 */
const backgrounds = [
  'rgba(255, 102, 255, 0.5)',  // Critical
  'rgba(255, 0, 0, 0.5)',      // High
  'rgba(255, 169, 0, 0.5)',    // Medium
  'rgba(255, 255, 0, 0.5)',    // Low
  'rgba(144, 238, 144, 0.5)'   // Note
];

/**
 * Achsen-Beschriftungen im Radar-Chart (16 Items)
 * @type {string[]}
 */
const threats = [
  "Skills required", "Motive", "Opportunity", "Population Size",
  "Ease of Discovery", "Ease of Exploit", "Awareness", "Intrusion Detection",
  "Loss of confidentiality", "Loss of Integrity", "Loss of Availability", "Loss of Accountability",
  "Financial damage", "Reputation damage", "Non-Compliance", "Privacy violation"
];

/**
 * Beispiel-Konfigurationen für die alte Logik (Fallback)
 */
export const riskConfigurations = {
  'Default Configuration': {
    LOW: [0, 3],
    MEDIUM: [3, 6],
    HIGH: [6, 9],
  },
  'Configuration 1': {
    LOW: [0, 5],
    MEDIUM: [5, 6],
    HIGH: [6, 9],
  },
  'Configuration 2': {
    LOW: [0, 7.5],
    MEDIUM: [7.5, 8],
    HIGH: [8, 9],
  },
  'Configuration 3': {
    LOW: [0, 6.5],
    MEDIUM: [6.5, 7],
    HIGH: [7, 9],
  }
};

/**
 * IDs der 16 Eingabefelder: Threat-Keys + Impact-Keys
 * @type {string[]}
 */
const partials = [
  "sl", "m", "o", "s", "ed", "ee", "a", "id",
  "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
];

/**
 * Chart.js-Options für Radar
 */
const riskChartOptions = {
  legend: {
    position: 'top',
    display: false
  },
  title: {
    display: false,
    text: 'Risk Chart'
  },
  scale: {
    ticks: {
      beginAtZero: true,
      suggestedMin: 0,
      suggestedMax: 10,
      stepSize: 1
    }
  }
};

/**
 * Initialisierung bei DOMContentLoaded:
 * - Radar-Chart erstellen
 * - Dropdown listener
 * - ggf. vector aus URL
 * - Input-Felder => onChange => calculate
 * - einmalige calculate() zum Start
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1) Chart init
  riskChartElement = document.getElementById('riskChart');
  riskChartCtx = riskChartElement ? riskChartElement.getContext('2d') : null;

  if (riskChartCtx) {
    riskChart = new Chart(riskChartCtx, {
      type: 'radar',
      data: {
        labels: threats,
        datasets: [{
          data: [],
          pointBackgroundColor: "",
          backgroundColor: "",
          borderColor: "",
          borderWidth: 2
        }]
      },
      options: riskChartOptions
    });
  }

  // 2) Dropdown => onChange => calculate
  const configSelect = document.getElementById('configurationSelect');
  if (configSelect) {
    configSelect.addEventListener('change', () => {
      calculate();
    });
  }

  // 3) vector in URL?
  if (getUrlParameter('vector')) {
    loadVectors(getUrlParameter('vector'));
  }

  // 4) Alle Felder => onChange => calculate
  partials.forEach(factor => {
    const element = document.getElementById(factor);
    if (element) {
      element.addEventListener('change', () => {
        calculate();
      });
    }
  });

  // 5) Einmal calculate()
  calculate();
});

// ===================================================
// =============== Exports für HTML ==================
// ===================================================
window.calculate = calculate;
window.updateRiskLevelMapping = updateRiskLevelMapping;

// ===================================================
// ================ loadVectors() ====================
// ===================================================

/**
 * Lädt einen Vector aus dem Parameter (z.B. "(sl:1/m:2/o:3/...)")
 * und schreibt dessen Werte in die 16 UI-Felder.
 * Anschließend wird calculate() aufgerufen.
 *
 * @param {string} vector
 */
export function loadVectors(vector) {
  // Entferne "(" und ")"
  vector = vector.replace('(', '').replace(')', '');
  const values = vector.split('/');

  if (values.length !== 16) {
    swal("Hey!!", "The vector is not correct, make sure you have copied it correctly", "error");
    return;
  }

  // Verteile die 16 Werte auf die 16 Felder
  for (let i = 0; i < 16; i++) {
    let val = values[i].split(':')[1].trim();
    document.getElementById(partials[i]).value = val;
  }

  // Anschließend neu berechnen
  calculate();
}

// ===================================================
// ================ calculate() ======================
// ===================================================

/**
 * Hauptberechnung:
 * - Prüft, ob URL-Logik => parseUrlParameters + performAdvancedCalculation
 * - Sonst Fallback => alte Konfiguration
 */
export function calculate() {
  // 1) URL-Logik?
  if (shouldUseUrlLogic()) {
    console.log("[INFO] We have the correct parameters -> URL-Logic is being used.");
    const parseOk = parseUrlParameters();
    if (!parseOk) {
      console.warn("[WARN] parseUrlParameters failed => fallback to default logic.");
    } else {
      // => URL-Logik ok
      addUrlConfigurationOption();  // "URL Configuration" ins Dropdown
      const advResult = performAdvancedCalculation();
      // advResult = { L_score, I_score, L_class, I_class, finalRisk }

      if (advResult) {
        console.log("[INFO] Calculation done via URL logic", advResult);

        // Fülle die UI-Felder aus storedVector
        fillUIFromStoredVector();

        // Radar-Chart updaten
        const dataset = vectorToDataset(storedVector);
        updateRiskChart(dataset, advResult.finalRisk);
      }
      return;
    }
  }

  // 2) Fallback => alte Config
  const configSelect = document.getElementById('configurationSelect');
  const selectedConfig = configSelect ? configSelect.value : 'Default Configuration';

  const dataset = [];
  const threatAgentFactors = ['sl', 'm', 'o', 's', 'ed', 'ee', 'a', 'id'];
  const technicalImpactFactors = ['lc', 'li', 'lav', 'lac', 'fd', 'rd', 'nc', 'pv'];
  deleteClass();

  // Alte Summen / Max
  const LS = calculateAverage(threatAgentFactors).toFixed(3);
  const IS = calculateMax(technicalImpactFactors).toFixed(3);

  const FLS = getRisk(LS, selectedConfig);
  const FIS = getRisk(IS, selectedConfig);

  updateDisplay('.LS', LS, FLS);
  updateDisplay('.IS', IS, FIS);

  pushValuesToDataset(dataset, threatAgentFactors);
  pushValuesToDataset(dataset, technicalImpactFactors);

  const score = generateScore(threatAgentFactors, technicalImpactFactors);
  $('#score').text(score);
  $('#score').attr('href', `https://felmade.github.io/OWASP-Calculator/?vector=${score}`);

  const RS = getCriticality(FLS, FIS);
  updateRiskLevel('.RS', RS);

  updateRiskChart(dataset, RS);
}

// ===================================================
// =============== Hilfsfunktionen ===================
// ===================================================

/**
 * Ermittelt das Risk-Level ('LOW','MEDIUM','HIGH' oder 'NOTE')
 * aus einem Score und der gewählten Konfiguration
 * @param {number|string} score - z.B. 2.5
 * @param {string} selectedConfig - z.B. 'Default Configuration'
 * @returns {string} - z.B. 'LOW','MEDIUM','HIGH','NOTE'
 */
function getRisk(score, selectedConfig = 'Default Configuration') {
  // Falls score ein String ist, parse es in eine Zahl
  const numScore = parseFloat(score) || 0;

  // Hole Thresholds aus riskConfigurations
  const thresholds = getRiskThresholds(selectedConfig);

  // thresholds könnte z.B. { LOW:[0,3], MEDIUM:[3,6], HIGH:[6,9] }
  if (numScore >= thresholds.LOW[0] && numScore < thresholds.LOW[1]) return 'LOW';
  if (numScore >= thresholds.MEDIUM[0] && numScore < thresholds.MEDIUM[1]) return 'MEDIUM';
  if (numScore >= thresholds.HIGH[0] && numScore <= thresholds.HIGH[1]) return 'HIGH';

  return 'NOTE'; // Fallback
}

/**
 * Holt Thresholds (LOW,MEDIUM,HIGH) für die gewählte Config oder
 * Default, falls sie nicht existiert.
 * @param {string} selectedConfigName
 * @returns {object} {LOW:[0,3],MEDIUM:[3,6],HIGH:[6,9]}
 */
function getRiskThresholds(selectedConfigName) {
  return riskConfigurations[selectedConfigName] || riskConfigurations['Default Configuration'];
}

/**
 * Schreibt die globalen storedVector-Werte in die 16 Eingabefelder (partials).
 * Falls ein Key nicht definiert ist, wird 0 eingetragen.
 */
function fillUIFromStoredVector() {
  partials.forEach(f => {
    const elem = document.getElementById(f);
    if (!elem) return;
    const val = (storedVector[f] !== undefined) ? storedVector[f] : 0;
    elem.value = val;
  });
}

/**
 * Konvertiert den storedVector in ein Array [sl, m, o, s, ed, ee, a, id, lc, li, lav, lac, fd, rd, nc, pv]
 * für das Radar-Chart.
 * @param {Object} vec - typischerweise storedVector
 * @returns {number[]}
 */
function vectorToDataset(vec) {
  const arr = [];
  partials.forEach(f => {
    arr.push(vec[f] || 0);
  });
  return arr;
}

/**
 * Liest die Werte aus den UI-Elementen (factors) und schreibt sie ins dataset.
 * @param {number[]} dataset
 * @param {string[]} factors
 */
function pushValuesToDataset(dataset, factors) {
  factors.forEach(factor => {
    const element = $(`#${factor}`);
    if (element.length === 0) return;
    const value = parseFloat(element.val() || 0);
    dataset.push(value);
  });
}

/**
 * Berechnet den Durchschnitt über die HTML-Eingabefelder (factors).
 * @param {string[]} factors
 * @returns {number}
 */
function calculateAverage(factors) {
  const values = getValues(factors);
  const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  return sum / factors.length;
}

/**
 * Berechnet das Maximum über die HTML-Eingabefelder (factors).
 * @param {string[]} factors
 * @returns {number}
 */
function calculateMax(factors) {
  const values = getValues(factors);
  return Math.max(...values.map(val => parseFloat(val || 0)));
}

/**
 * Gibt die Werte der HTML-Eingabefelder (factors) als Array zurück.
 * @param {string[]} factors
 * @returns {number[]}
 */
function getValues(factors) {
  return factors.map(factor => $(`#${factor}`).val());
}

/**
 * Zeigt Wert + Level in einem DOM-Element und setzt passende CSS-Klasse.
 * @param {string} selector - z.B. ".LS"
 * @param {string|number} value - z.B. "2.500"
 * @param {string} riskLevel - z.B. "LOW","MEDIUM"
 */
function updateDisplay(selector, value, riskLevel) {
  $(selector).text(`${value} ${riskLevel}`);
  $(selector).removeClass('classNote classLow classMedium classHigh classCritical');
  switch (riskLevel) {
    case 'LOW':
      $(selector).addClass('classLow');
      break;
    case 'MEDIUM':
      $(selector).addClass('classMedium');
      break;
    case 'HIGH':
      $(selector).addClass('classHigh');
      break;
    case 'CRITICAL':
      $(selector).addClass('classCritical');
      break;
    default:
      $(selector).addClass('classNote');
      break;
  }
}

/**
 * Generiert einen Score-String im Format "SL:1/M:2/..."
 * aus den beiden Factor-Gruppen (threatAgent, technicalImpact)
 * @param {string[]} threatAgentFactors
 * @param {string[]} technicalImpactFactors
 * @returns {string}
 */
function generateScore(threatAgentFactors, technicalImpactFactors) {
  const allFactors = [...threatAgentFactors, ...technicalImpactFactors];
  return allFactors
      .map(factor => `${factor.toUpperCase()}:${$(`#${factor}`).val()}`)
      .join('/');
}

/**
 * Aktualisiert die Risiko-Level-Ausgabe (z.B. ".RS") + CSS
 * @param {string} selector - z.B. ".RS"
 * @param {string} riskLevel - "NOTE", "LOW", "MEDIUM", "HIGH", "CRITICAL"
 */
function updateRiskLevel(selector, riskLevel) {
  const classes = {
    NOTE: 'classNote',
    LOW: 'classLow',
    MEDIUM: 'classMedium',
    HIGH: 'classHigh',
    CRITICAL: 'classCritical',
  };
  $(selector).text(riskLevel);
  $(selector).removeClass(Object.values(classes).join(' '));
  $(selector).addClass(classes[riskLevel] || 'classNote');
}

/**
 * Entfernt CSS-Klassen von LS, IS, RS-Elementen (Cleanup vor neuem Update).
 */
function deleteClass() {
  $(".LS").removeClass("classNote classLow classMedium classHigh");
  $(".IS").removeClass("classNote classLow classMedium classHigh");
  $(".RS").removeClass("classNote classLow classMedium classHigh classCritical");
}

/**
 * Ermittelt finalen Risk-Level aus L und I
 * @param {string} L - z.B. "LOW"
 * @param {string} I - z.B. "HIGH"
 * @returns {string} - z.B. "CRITICAL" oder "MEDIUM"
 */
function getCriticality(L, I) {
  if (L === "LOW" && I === "LOW") return 'NOTE';
  if ((L === "LOW" && I === "MEDIUM") || (L === "MEDIUM" && I === "LOW")) return 'LOW';
  if ((L === "LOW" && I === "HIGH") || (L === "MEDIUM" && I === "MEDIUM") || (L === "HIGH" && I === "LOW")) return 'MEDIUM';
  if ((L === "HIGH" && I === "MEDIUM") || (L === "MEDIUM" && I === "HIGH")) return 'HIGH';
  if (L === "HIGH" && I === "HIGH") return 'CRITICAL';
  return 'NOTE';
}

/**
 * Aktualisiert das Radar-Chart (riskChart) mit dataset und färbt es je nach RS
 * @param {number[]} dataset
 * @param {string} RS - "LOW","MEDIUM","HIGH","CRITICAL","NOTE"
 */
function updateRiskChart(dataset, RS) {
  if (!riskChart) return;

  let c = 0;
  switch (RS) {
    case "LOW":       c = 3; break;
    case "MEDIUM":    c = 2; break;
    case "HIGH":      c = 1; break;
    case "CRITICAL":  c = 0; break;
    default:          c = 4; break; // NOTE
  }

  riskChart.data.labels = threats;
  riskChart.data.datasets[0].data = dataset;
  riskChart.data.datasets[0].pointBackgroundColor = colors[c];
  riskChart.data.datasets[0].backgroundColor = backgrounds[c];
  riskChart.data.datasets[0].borderColor = colors[c];

  riskChart.update();
}

/**
 * Liest einen URL-Parameter aus (z.B. "?vector=abc").
 * @param {string} name - Param-Name
 * @returns {string} Param-Wert oder ""
 */
function getUrlParameter(name) {
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Fügt dem Dropdown die Option "URL Configuration" hinzu (falls noch nicht vorhanden),
 * wählt sie aus und sperrt nur das Dropdown - EINGABEFELDER BLEIBEN FREI.
 */
function addUrlConfigurationOption() {
  const configSelect = document.getElementById("configurationSelect");
  if (!configSelect) return;

  // Prüfen, ob Option "URL Configuration" schon existiert
  const alreadyExists = [...configSelect.options].some(opt => opt.value === "URL Configuration");
  if (!alreadyExists) {
    const option = document.createElement("option");
    option.value = "URL Configuration";
    option.text = "URL Configuration";
    configSelect.appendChild(option);
  }

  // Wähle "URL Configuration"
  configSelect.value = "URL Configuration";

  // Sperre nur das Dropdown, damit man nicht zurückswitcht,
  // aber NICHT die Input-Felder => so bleibt es interaktiv
  configSelect.disabled = true;
}

// ===================================================
// ============ UPDATE RISK LEVEL MAPPING ===========
// ===================================================

/**
 * Aktualisiert (oder ermittelt) das Risk-Level (L_class, I_class, RS)
 * basierend auf Scores und Config.
 *
 * @param {boolean} testMode - Wenn true, wird nur ein Objekt zurückgegeben (kein UI-Update)
 * @param {number|null} L_score
 * @param {number|null} I_score
 * @param {string|null} selectedConfig
 * @returns {Object|undefined} - { L_class, I_class, RS } wenn testMode=true
 */
export function updateRiskLevelMapping(
    testMode = false,
    L_score = null,
    I_score = null,
    selectedConfig = null
) {
  if (!testMode) {
    selectedConfig = document.getElementById('configurationSelect').value;

    const L_text = $(".LS").text().split(" ")[0] || "0";
    const I_text = $(".IS").text().split(" ")[0] || "0";
    L_score = parseFloat(L_text);
    I_score = parseFloat(I_text);
  }

  const levels = getRiskThresholds(selectedConfig);

  let L_class;
  if (L_score >= levels.LOW[0] && L_score < levels.LOW[1]) {
    L_class = "LOW";
  } else if (L_score >= levels.MEDIUM[0] && L_score < levels.MEDIUM[1]) {
    L_class = "MEDIUM";
  } else if (L_score >= levels.HIGH[0] && L_score <= levels.HIGH[1]) {
    L_class = "HIGH";
  } else {
    L_class = "NOTE";
  }

  let I_class;
  if (I_score >= levels.LOW[0] && I_score < levels.LOW[1]) {
    I_class = "LOW";
  } else if (I_score >= levels.MEDIUM[0] && I_score < levels.MEDIUM[1]) {
    I_class = "MEDIUM";
  } else if (I_score >= levels.HIGH[0] && I_score <= levels.HIGH[1]) {
    I_class = "HIGH";
  } else {
    I_class = "NOTE";
  }

  const RS = getCriticality(L_class, I_class);

  if (testMode) {
    return { L_class, I_class, RS };
  }

  $(".RS").text(RS);
  $(".RS").attr(
      "class",
      `RS class${RS.charAt(0).toUpperCase() + RS.slice(1).toLowerCase()}`
  );
}

/**
 * buildHtmlRanges(configObj, title):
 *  - Baut eine <table> mit minVal,maxVal => level aus z.B. {LOW:[0,3],MEDIUM:[3,6],...}
 *  - title => z.B. "Likelihood" oder "Impact"
 */
function buildHtmlRanges(configObj, title) {
  // Sortiere das Objekt nach minVal
  const arr = [];
  for (const lvl in configObj) {
    const [minVal, maxVal] = configObj[lvl];
    arr.push({ level: lvl, minVal, maxVal });
  }
  arr.sort((a,b) => a.minVal - b.minVal);

  let html = `<h5>${title} Ranges</h5>`;
  html += '<table class="table table-bordered table-sm">';
  html += '<thead><tr><th>Range</th><th>Level</th></tr></thead>';
  html += '<tbody>';
  arr.forEach(item => {
    const rangeStr = (item.maxVal === 9)
        ? `${item.minVal} to ≤ ${item.maxVal}`
        : `${item.minVal} to < ${item.maxVal}`;
    html += `<tr>
      <td>${rangeStr}</td>
      <td>${item.level}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  return html;
}

/**
 * buildHtmlMappingTable(likelihoodLevels, impactLevels, mappingObj)
 *  - Baut NxM-Tabelle der Mappings: "likelihood-impact" => Wert
 */
function buildHtmlMappingTable(lLevels, iLevels, mapObj) {
  let html = '<h5>Likelihood × Impact => Mapping</h5>';
  html += '<table class="table table-bordered table-sm">';
  // Kopfzeile
  html += '<thead><tr><th>Likelihood \\ Impact</th>';
  iLevels.forEach(imp => {
    html += `<th>${imp}</th>`;
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  lLevels.forEach(lik => {
    html += `<tr><th>${lik}</th>`;
    iLevels.forEach(imp => {
      const key = `${lik}-${imp}`.toUpperCase();
      const val = mapObj[key] || '???';
      html += `<td>${val}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

/**
 * showDynamicRiskModal():
 *  - Baut die Ranges (Likelihood & Impact) + NxM-Mapping HTML
 *  - Fügt sie in ein Modal-Body ein
 *  - Öffnet das Modal
 */
window.showDynamicRiskModal = function() {
  import('./url_logic.js').then(module => {
    const likeObj   = module.likelihoodConfigObj;
    const impObj    = module.impactConfigObj;
    const likeLvls  = module.likelihoodLevels;
    const impLvls   = module.impactLevels;
    const mapObj    = module.mappingObj;

    console.log("DEBUG: likeObj =", likeObj, "impactObj =", impObj, "mapping =", mapObj);

    const tableL = buildHtmlRanges(likeObj, "Likelihood");
    const tableI = buildHtmlRanges(impObj,  "Impact");
    const tableM = buildHtmlMappingTable(likeLvls, impLvls, mapObj);

    const finalHtml = tableL + tableI + tableM;
    const modalBody = document.getElementById('dynamicModalBody');
    if (!modalBody) return;
    modalBody.innerHTML = finalHtml;

    $('#exampleModalCenter').modal('show');
  });
}