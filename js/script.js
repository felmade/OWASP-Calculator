"use strict";

/**
 * Dieses Skript verwaltet die zentrale Logik für das OWASP Risk Assessment
 * Calculator-Frontend. Es stellt u.a. die Fallback-Konfiguration (Default,
 * Configuration 1-3), das Chart.js-Radar-Diagramm sowie verschiedene
 * Hilfsfunktionen zum Lesen der Eingabefelder, Berechnungen und UI-Updates bereit.
 *
 * Die hier definierte Logik wird verwendet, wenn KEIN erfolgreicher
 * URL-Logik-/Parameter-Parse stattfindet (oder wenn der User manuell
 * eine der Standard-Konfigurationen wählt).
 */

import {
  parseUrlParameters,
  performAdvancedCalculation,
  shouldUseUrlLogic,
  // Exportierte globale Variable (read-only) aus url_logic
  storedVector
} from "./url_logic.js";

/**
 * CANVAS / CHART.JS
 * -----------------
 * Canvas-Element für das Radar-Chart (inkl. 2D-Kontext und Chart-Instanz).
 */
let riskChartElement = null;
let riskChartCtx = null;
let riskChart = null;

/**
 * FARB-SETTINGS
 * -------------
 * Reihenfolge der Farbzuordnungen (CRITICAL → HIGH → MEDIUM → LOW → NOTE).
 */
const colors = [
  "rgba(255, 102, 255)",  // Critical
  "rgba(255, 0, 0)",      // High
  "rgba(255, 169, 0)",    // Medium
  "rgba(255, 255, 0)",    // Low
  "rgba(144, 238, 144)"   // Note
];

const backgrounds = [
  "rgba(255, 102, 255, 0.5)",  // Critical
  "rgba(255, 0, 0, 0.5)",      // High
  "rgba(255, 169, 0, 0.5)",    // Medium
  "rgba(255, 255, 0, 0.5)",    // Low
  "rgba(144, 238, 144, 0.5)"   // Note
];

/**
 * THREATS-ARRAY
 * -------------
 * Beschriftungen für das Radar-Diagramm (16 OWASP-Faktoren).
 */
const threats = [
  "Skills required", "Motive", "Opportunity", "Population Size",
  "Ease of Discovery", "Ease of Exploit", "Awareness", "Intrusion Detection",
  "Loss of confidentiality", "Loss of Integrity", "Loss of Availability", "Loss of Accountability",
  "Financial damage", "Reputation damage", "Non-Compliance", "Privacy violation"
];

/**
 * STANDARD-RISK-KONFIGURATIONEN
 * -----------------------------
 * Hier definieren wir mehrere 3×3-Varianten (z.B. 'Default Configuration').
 * Je nach Auswahl im Dropdown wird daraus LOW, MEDIUM und HIGH abgeleitet.
 */
export const riskConfigurations = {
  "Default Configuration": {
    LOW: [0, 3],
    MEDIUM: [3, 6],
    HIGH: [6, 9]
  },
  "Configuration 1": {
    LOW: [0, 5],
    MEDIUM: [5, 6],
    HIGH: [6, 9]
  },
  "Configuration 2": {
    LOW: [0, 7.5],
    MEDIUM: [7.5, 8],
    HIGH: [8, 9]
  },
  "Configuration 3": {
    LOW: [0, 6.5],
    MEDIUM: [6.5, 7],
    HIGH: [7, 9]
  }
};

/**
 * OWASP-STANDARD-MAPPING (3×3)
 * ----------------------------
 * Dies ist die feste 9-Felder-Matrix für "LOW,MEDIUM,HIGH" × "LOW,MEDIUM,HIGH".
 */
const owaspMapping = {
  "LOW-LOW": "NOTE",
  "LOW-MEDIUM": "LOW",
  "LOW-HIGH": "MEDIUM",
  "MEDIUM-LOW": "LOW",
  "MEDIUM-MEDIUM": "MEDIUM",
  "MEDIUM-HIGH": "HIGH",
  "HIGH-LOW": "MEDIUM",
  "HIGH-MEDIUM": "HIGH",
  "HIGH-HIGH": "CRITICAL"
};

/**
 * PARTIALS-ARRAY
 * --------------
 * 16 IDs der Eingabefelder (Threat + Impact) in der HTML-Oberfläche.
 */
const partials = [
  "sl", "m", "o", "s", "ed", "ee", "a", "id",
  "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
];

/**
 * CHART-OPTIONS
 * -------------
 * Konfiguration für das Radar-Chart (Chart.js).
 */
const riskChartOptions = {
  legend: {
    position: "top",
    display: false
  },
  title: {
    display: false,
    text: "Risk Chart"
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
 * DOMCONTENTLOADED
 * ----------------
 * Bei Seitenaufruf:
 * 1) Radar-Chart initialisieren
 * 2) Dropdown-Listener
 * 3) Check auf 'vector' in URL
 * 4) Input-Felder => onChange => calculate()
 * 5) Erster Aufruf von calculate().
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1) Chart init
  riskChartElement = document.getElementById("riskChart");
  riskChartCtx = riskChartElement ? riskChartElement.getContext("2d") : null;

  if (riskChartCtx) {
    riskChart = new Chart(riskChartCtx, {
      type: "radar",
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
  const configSelect = document.getElementById("configurationSelect");
  if (configSelect) {
    configSelect.addEventListener("change", () => {
      calculate();
    });
  }

  // 3) vector in URL?
  if (getUrlParameter("vector")) {
    loadVectors(getUrlParameter("vector"));
  }

  // 4) Inputs => onChange => calculate
  partials.forEach(factor => {
    const element = document.getElementById(factor);
    if (element) {
      element.addEventListener("change", () => {
        calculate();
      });
    }
  });

  // 5) Einmal calculate
  calculate();
});

/**
 * EXTERNE EXPORTS FÜR HTML
 * ------------------------
 * Damit man z.B. calculate() oder updateRiskLevelMapping() auch im
 * Browser (via Window-Scope) aufrufen kann.
 */
window.calculate = calculate;
window.updateRiskLevelMapping = updateRiskLevelMapping;

/**
 * LOADVECTORS()
 * -------------
 * Lädt einen Vektor aus dem String wie "(sl:1/m:2/...)" und schreibt
 * ihn in die 16 Eingabefelder. Anschließend ruft es calculate() auf.
 */
export function loadVectors(vector) {
  vector = vector.replace("(", "").replace(")", "");
  const values = vector.split("/");

  if (values.length !== 16) {
    swal("Hey!!", "The vector is not correct, make sure you have copied it correctly", "error");
    return;
  }

  for (let i = 0; i < 16; i++) {
    const val = values[i].split(":")[1].trim();
    document.getElementById(partials[i]).value = val;
  }

  calculate();
}

/**
 * CALCULATE()
 * -----------
 * Hauptberechnung: Prüft, ob URL-Logik => parseUrlParameters + performAdvancedCalculation
 * oder ob wir unsere Fallback-Konfiguration verwenden.
 */
export function calculate() {
  if (shouldUseUrlLogic()) {
    console.log("[INFO] We have the correct parameters -> URL-Logic is being used.");
    const parseOk = parseUrlParameters();
    if (!parseOk) {
      console.warn("[WARN] parseUrlParameters failed => fallback to default logic.");
    } else {
      // => URL-Logik erfolgreich
      addUrlConfigurationOption();
      const advResult = performAdvancedCalculation();
      if (advResult) {
        console.log("[INFO] Calculation done via URL logic", advResult);
        fillUIFromStoredVector();

        const dataset = vectorToDataset(storedVector);
        updateRiskChart(dataset, advResult.finalRisk);
      }
      return;
    }
  }

  // Fallback (keine URL-Logik)
  const configSelect = document.getElementById("configurationSelect");
  const selectedConfig = configSelect ? configSelect.value : "Default Configuration";

  const dataset = [];
  const threatAgentFactors = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
  const technicalImpactFactors = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
  deleteClass();

  const LS = calculateAverage(threatAgentFactors).toFixed(3);
  const IS = calculateMax(technicalImpactFactors).toFixed(3);

  const FLS = getRisk(LS, selectedConfig);
  const FIS = getRisk(IS, selectedConfig);

  updateDisplay(".LS", LS, FLS);
  updateDisplay(".IS", IS, FIS);

  pushValuesToDataset(dataset, threatAgentFactors);
  pushValuesToDataset(dataset, technicalImpactFactors);

  const score = generateScore(threatAgentFactors, technicalImpactFactors);
  $("#score").text(score);
  $("#score").attr("href", `https://felmade.github.io/OWASP-Calculator/?vector=${score}`);

  const RS = getCriticality(FLS, FIS);
  updateRiskLevel(".RS", RS);

  updateRiskChart(dataset, RS);
}

/**
 * GETRISK()
 * ---------
 * Ermittelt das Risk-Level ('LOW','MEDIUM','HIGH' oder 'NOTE')
 * aus einem Zahlenwert und der gewählten Konfiguration
 */
function getRisk(score, selectedConfig = "Default Configuration") {
  const numScore = parseFloat(score) || 0;
  const thresholds = getRiskThresholds(selectedConfig);

  if (numScore >= thresholds.LOW[0] && numScore < thresholds.LOW[1]) return "LOW";
  if (numScore >= thresholds.MEDIUM[0] && numScore < thresholds.MEDIUM[1]) return "MEDIUM";
  if (numScore >= thresholds.HIGH[0] && numScore <= thresholds.HIGH[1]) return "HIGH";
  return "NOTE";
}

/**
 * GETRISKTHRESHOLDS()
 * -------------------
 * Gibt uns {LOW:[x,y], MEDIUM:[y,z], HIGH:[z,w]} je nach ausgewählter Konfiguration.
 */
function getRiskThresholds(selectedConfigName) {
  return riskConfigurations[selectedConfigName] || riskConfigurations["Default Configuration"];
}

/**
 * FILLUIFROMSTOREDVECTOR()
 * ------------------------
 * Schreibt die Werte aus storedVector in die 16 Felder (sl, m, o, ...).
 * Falls ein Key nicht existiert, wird 0 eingetragen.
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
 * VECTORTODATASET()
 * -----------------
 * Konvertiert storedVector in ein 16er-Array für das Radar-Chart.
 */
function vectorToDataset(vec) {
  const arr = [];
  partials.forEach(f => {
    arr.push(vec[f] || 0);
  });
  return arr;
}

/**
 * PUSHVALUESTODATASET()
 * ---------------------
 * Liest die Werte der gegebenen Factor-IDs aus der UI und pusht sie ins dataset.
 */
function pushValuesToDataset(dataset, factors) {
  factors.forEach(factor => {
    const element = $(`#${factor}`);
    if (!element.length) return;
    const value = parseFloat(element.val() || 0);
    dataset.push(value);
  });
}

/**
 * CALCULATEAVERAGE()
 * ------------------
 * Durchschnitt über die HTML-Eingabefelder, identifiziert via factors.
 */
function calculateAverage(factors) {
  const values = getValues(factors);
  const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  return sum / factors.length;
}

/**
 * CALCULATEMAX()
 * --------------
 * Maximalen Wert über die HTML-Eingabefelder, identifiziert via factors.
 */
function calculateMax(factors) {
  const values = getValues(factors);
  return Math.max(...values.map(val => parseFloat(val || 0)));
}

/**
 * GETVALUES()
 * -----------
 * Liest die rohen Werte der HTML-Felder (factors) und gibt sie als Array zurück.
 */
function getValues(factors) {
  return factors.map(factor => $(`#${factor}`).val());
}

/**
 * UPDATEDISPLAY()
 * ---------------
 * Zeigt Wert + Level in einem DOM-Element (z.B. ".LS") an
 * und setzt passende CSS-Klasse (classLow, classMedium etc.).
 */
function updateDisplay(selector, value, riskLevel) {
  $(selector).text(`${value} ${riskLevel}`);
  $(selector).removeClass("classNote classLow classMedium classHigh classCritical");

  switch (riskLevel) {
    case "LOW":
      $(selector).addClass("classLow");
      break;
    case "MEDIUM":
      $(selector).addClass("classMedium");
      break;
    case "HIGH":
      $(selector).addClass("classHigh");
      break;
    case "CRITICAL":
      $(selector).addClass("classCritical");
      break;
    default:
      $(selector).addClass("classNote");
      break;
  }
}

/**
 * GENERATESCORE()
 * ---------------
 * Erstellt einen String wie "SL:1/M:2/O:3/..."
 * aus den Eingabewerten der UI-Felder (threatAgent+technicalImpact).
 */
function generateScore(threatAgentFactors, technicalImpactFactors) {
  const allFactors = [...threatAgentFactors, ...technicalImpactFactors];
  return allFactors.map(factor =>
      `${factor.toUpperCase()}:${$(`#${factor}`).val()}`
  ).join("/");
}

/**
 * UPDATERISKLEVEL()
 * -----------------
 * Schreibt das finale Risiko in ".RS" + setzt CSS-Klasse (classLow etc.).
 */
function updateRiskLevel(selector, riskLevel) {
  const classes = {
    NOTE: "classNote",
    LOW: "classLow",
    MEDIUM: "classMedium",
    HIGH: "classHigh",
    CRITICAL: "classCritical"
  };
  $(selector).text(riskLevel);
  $(selector).removeClass(Object.values(classes).join(" "));
  $(selector).addClass(classes[riskLevel] || "classNote");
}

/**
 * DELETECLASS()
 * -------------
 * Bereinigt CSS-Klassen in LS, IS, RS vor einem neuen Update.
 */
function deleteClass() {
  $(".LS").removeClass("classNote classLow classMedium classHigh");
  $(".IS").removeClass("classNote classLow classMedium classHigh");
  $(".RS").removeClass("classNote classLow classMedium classHigh classCritical");
}

/**
 * GETCRITICALITY()
 * ----------------
 * Gibt den finalen Overall-Risk basierend auf L- und I-Klasse zurück.
 */
function getCriticality(L, I) {
  if (L === "LOW" && I === "LOW") return "NOTE";
  if ((L === "LOW" && I === "MEDIUM") || (L === "MEDIUM" && I === "LOW")) return "LOW";
  if ((L === "LOW" && I === "HIGH") || (L === "MEDIUM" && I === "MEDIUM") || (L === "HIGH" && I === "LOW")) return "MEDIUM";
  if ((L === "HIGH" && I === "MEDIUM") || (L === "MEDIUM" && I === "HIGH")) return "HIGH";
  if (L === "HIGH" && I === "HIGH") return "CRITICAL";
  return "NOTE";
}

/**
 * UPDATERISKCHART()
 * -----------------
 * Passt das Radar-Chart (riskChart) an. Färbt es je nach finalem Risiko (RS).
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
 * GETURLPARAMETER()
 * -----------------
 * Liefert den Wert eines URL-Parameters (z.B. "?vector=abc").
 */
function getUrlParameter(name) {
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/**
 * ADDURLCONFIGURATIONOPTION()
 * ---------------------------
 * Fügt dem Dropdown "URL Configuration" hinzu, wählt es aus und sperrt nur
 * das Dropdown (Eingabefelder bleiben frei).
 */
function addUrlConfigurationOption() {
  const configSelect = document.getElementById("configurationSelect");
  if (!configSelect) return;

  const alreadyExists = [...configSelect.options].some(opt => opt.value === "URL Configuration");
  if (!alreadyExists) {
    const option = document.createElement("option");
    option.value = "URL Configuration";
    option.text = "URL Configuration";
    configSelect.appendChild(option);
  }

  configSelect.value = "URL Configuration";
  configSelect.disabled = true; // nur das Dropdown sperren
}

/**
 * UPDATERISKLEVELMAPPING()
 * ------------------------
 * Ermittelt/aktualisiert das Risk-Level auf Basis von Scores und Config.
 * Kann im Testmodus nur returnen, sonst UI-Update.
 */
export function updateRiskLevelMapping(
    testMode = false,
    L_score = null,
    I_score = null,
    selectedConfig = null
) {
  if (!testMode) {
    selectedConfig = document.getElementById("configurationSelect").value;
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
  $(".RS").attr("class", `RS class${RS.charAt(0).toUpperCase() + RS.slice(1).toLowerCase()}`);
}

/**
 * SETUPOWASPFALLBACK()
 * --------------------
 * Falls wir NICHT im URL-Modus sind und der User "Configuration 2" o.ä. wählt,
 * wollen wir Likelihood und Impact identisch besetzen und das Standard-OWASP-
 * Mapping (3×3) anwenden.
 */
function setupOwaspFallback(selectedConfig) {
  const ranges = riskConfigurations[selectedConfig]
      || riskConfigurations["Default Configuration"];

  const likelihoodConfigObj = ranges; // identische Ranges
  const impactConfigObj = ranges;     // identische Ranges
  const likelihoodLevels = ["LOW", "MEDIUM", "HIGH"];
  const impactLevels = ["LOW", "MEDIUM", "HIGH"];
  const mappingObj = owaspMapping;

  return { likelihoodConfigObj, impactConfigObj, likelihoodLevels, impactLevels, mappingObj };
}

/**
 * BUILDHTMLRANGES()
 * -----------------
 * Baut eine kleine <table> mit den Range-Werten (minVal..maxVal).
 */
function buildHtmlRanges(configObj, title) {
  const arr = [];
  for (const lvl in configObj) {
    const [minVal, maxVal] = configObj[lvl];
    arr.push({ level: lvl, minVal, maxVal });
  }
  arr.sort((a, b) => a.minVal - b.minVal);

  let html = `<h5>${title} Ranges</h5>`;
  html += '<table class="table table-bordered table-sm">';
  html += "<thead><tr><th>Range</th><th>Level</th></tr></thead><tbody>";

  arr.forEach(item => {
    const rangeStr = (item.maxVal === 9)
        ? `${item.minVal} to ≤ ${item.maxVal}`
        : `${item.minVal} to < ${item.maxVal}`;
    html += `<tr><td>${rangeStr}</td><td>${item.level}</td></tr>`;
  });

  html += "</tbody></table>";
  return html;
}

/**
 * BUILDHTMLMAPPINGTABLE()
 * -----------------------
 * Baut eine NxM-Tabelle basierend auf (likelihoodLevels × impactLevels)
 * und lookup in mappingObj (key=LIK-IMP).
 */
function buildHtmlMappingTable(lLevels, iLevels, mapObj) {
  let html = "<h5>Likelihood × Impact => Mapping</h5>";
  html += '<table class="table table-bordered table-sm">';
  html += `<thead><tr><th>Likelihood (Rows) \\ Impact (Columns)</th>`;
  iLevels.forEach(imp => {
    html += `<th>${imp}</th>`;
  });
  html += "</tr></thead><tbody>";

  lLevels.forEach(lik => {
    html += `<tr><th>${lik}</th>`;
    iLevels.forEach(imp => {
      const key = `${lik}-${imp}`.toUpperCase();
      const val = mapObj[key] || "???";
      html += `<td>${val}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  return html;
}

/**
 * SHOWDYNAMICRISKMODAL()
 * ----------------------
 * Wird aufgerufen, wenn man das Modal öffnen möchte
 * ("How is Severity Risk calculated?"). Stellt entweder
 * URL-Konfiguration (NxM) dar oder fallback via setupOwaspFallback.
 */
window.showDynamicRiskModal = function() {
  import("./url_logic.js").then(module => {
    let likeObj   = module.likelihoodConfigObj;
    let impObj    = module.impactConfigObj;
    let likeLvls  = module.likelihoodLevels;
    let impLvls   = module.impactLevels;
    let mapObj    = module.mappingObj;

    // Prüfen, ob die URL-Logik-Werte (likeObj,impObj,mapping) überhaupt gefüllt sind:
    const noValid = !likeObj || !Object.keys(likeObj).length
        || !impObj || !Object.keys(impObj).length
        || !mapObj || !Object.keys(mapObj).length;

    // Falls leer => fallback => setupOwaspFallback
    if (noValid) {
      const selConf = document.getElementById("configurationSelect")?.value || "Default Configuration";
      const fb = setupOwaspFallback(selConf);
      likeObj  = fb.likelihoodConfigObj;
      impObj   = fb.impactConfigObj;
      likeLvls = fb.likelihoodLevels;
      impLvls  = fb.impactLevels;
      mapObj   = fb.mappingObj;
    }

    const tableL = buildHtmlRanges(likeObj, "Likelihood");
    const tableI = buildHtmlRanges(impObj, "Impact");
    const tableM = buildHtmlMappingTable(likeLvls, impLvls, mapObj);

    const finalHtml = tableL + tableI + tableM;
    const modalBody = document.getElementById("dynamicModalBody");
    if (!modalBody) return;
    modalBody.innerHTML = finalHtml;

    $("#exampleModalCenter").modal("show");
  });
};
