"use strict";

/**
 * This script manages the central logic for the OWASP Risk Assessment Calculator frontend.
 * It provides, among other things, the fallback configuration (Default, Configuration 1-3),
 * the Chart.js radar diagram, and various helper functions for reading input fields,
 * performing calculations, and updating the UI.
 *
 * The logic defined here is used when NO successful URL logic/parameter parsing takes
 * place (or when the user manually selects one of the standard configurations).
 */

import {parseUrlParameters, performAdvancedCalculation, shouldUseUrlLogic, storedVector} from "./url_logic.js";

import {config} from '../config.js';

document.addEventListener("DOMContentLoaded", calculate);

/**
 * CANVAS / CHART.JS
 * -----------------
 * Canvas element for the radar chart (including 2D context and chart instance).
 */
let riskChartElement = null;
let riskChartCtx = null;
let riskChart = null;

/**
 * COLOR SETTINGS
 * --------------
 * Order of color assignments (CRITICAL → HIGH → MEDIUM → LOW → NOTE).
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
 * THREATS ARRAY
 * -------------
 * Labels for the radar diagram (16 OWASP factors).
 */
const threats = [
    "Skills required", "Motive", "Opportunity", "Population Size",
    "Ease of Discovery", "Ease of Exploit", "Awareness", "Intrusion Detection",
    "Loss of confidentiality", "Loss of Integrity", "Loss of Availability", "Loss of Accountability",
    "Financial damage", "Reputation damage", "Non-Compliance", "Privacy violation"
];

/**
 * STANDARD RISK CONFIGURATIONS
 * ----------------------------
 * Here we define several 3×3 variants (e.g. 'Default Configuration').
 * Depending on the selection in the dropdown, LOW, MEDIUM, and HIGH are derived.
 */
export const riskConfigurations = config.riskConfigurations

/**
 * OWASP STANDARD MAPPING (3×3)
 * ----------------------------
 * This is the fixed 9-cell matrix for "LOW, MEDIUM, HIGH" × "LOW, MEDIUM, HIGH".
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
 * PARTIALS ARRAY
 * --------------
 * 16 IDs of input fields (Threat + Impact) in the HTML interface.
 */
const partials = [
    "sl", "m", "o", "s", "ed", "ee", "a", "id",
    "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
];

/**
 * CHART OPTIONS
 * -------------
 * Configuration for the radar chart (Chart.js).
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
 * On page load:
 * 1) Initialize the radar chart
 * 2) Add a dropdown listener
 * 3) Check for 'vector' in the URL
 * 4) Input fields => onChange => calculate()
 * 5) First call of calculate().
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
    if (!getUrlParameter("vector")) {
        loadVectors();
    } else {
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

    // 5) First call of calculate()
    calculate();
});

/**
 * EXTERNAL EXPORTS FOR HTML
 * -------------------------
 * So that, for example, calculate() or updateRiskLevelMapping() can also
 * be called in the browser (via the Window scope).
 */
window.calculate = calculate;
window.updateRiskLevelMapping = updateRiskLevelMapping;

/**
 * LOADVECTORS()
 * -------------
 * Loads a vector from a string like "(sl:1/m:2/...)" and writes it
 * to the 16 input fields. Then calls calculate().
 */
export function loadVectors(vector) {
    vector = vector.replace("(", "").replace(")", "");
    const values = vector.split("/");

    if (values.length !== 16) {
        swal({
            title: "Invalid Vector Format",
            text: "The provided vector format is invalid. Please ensure it is copied correctly and follows the expected format.",
            icon: "error",
            button: "OK"
        }).then((willProceed) => {
            if (willProceed) {
                const defaultVector = "?vector=(sl:1/m:1/o:0/s:2/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)";
                window.location.href = window.location.origin + window.location.pathname + defaultVector;
            }
        });
        return;
    }

    for (let i = 0; i < 16; i++) {
        document.getElementById(partials[i]).value = values[i].split(":")[1].trim();
    }

    calculate();
}

/**
 * CALCULATE()
 * -----------
 * Main calculation: Checks whether URL logic => parseUrlParameters + performAdvancedCalculation
 * or whether we use our fallback configuration.
 */
export function calculate() {
    if (shouldUseUrlLogic()) {
        console.log("[INFO] We have the correct parameters -> URL-Logic is being used.");
        const parseOk = parseUrlParameters();
        if (!parseOk) {
            console.warn("[WARN] parseUrlParameters failed => fallback to default logic.");
        } else {
            // => URL logic successful
            addUrlConfigurationOption();
            const advResult = performAdvancedCalculation();
            if (advResult) {
                console.log("[INFO] Calculation done via URL logic", advResult);
                fillUIFromStoredVector();

                // Disable elements if configured
                if (config.uiSettings.disableElements) {
                    partials.forEach((factor) => {
                        const elem = document.getElementById(factor);
                        if (elem) {
                            elem.disabled = true;
                        }
                    });
                }

                const dataset = vectorToDataset(storedVector);
                updateRiskChart(dataset, advResult.finalRisk);
            }
            return;
        }
    }

    // Fallback (no URL logic)
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
    $("#score").attr("href", `${config.baseUrl}?vector=${score}`);

    const RS = getCriticality(FLS, FIS);
    updateRiskLevel(".RS", RS);

    updateRiskChart(dataset, RS);
}

/**
 * GETRISK()
 * ---------
 * Determines the risk level ('LOW','MEDIUM','HIGH', or 'NOTE')
 * from a numeric value and the chosen configuration.
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
 * Returns {LOW:[x,y], MEDIUM:[y,z], HIGH:[z,w]} depending on the selected configuration.
 */
function getRiskThresholds(selectedConfigName) {
    return riskConfigurations[selectedConfigName] || riskConfigurations["Default Configuration"];
}

/**
 * FILLUIFROMSTOREDVECTOR()
 * ------------------------
 * Writes the values from storedVector into the 16 fields (sl, m, o, ...).
 * If a key does not exist, 0 is written.
 */
function fillUIFromStoredVector() {
    partials.forEach(f => {
        const elem = document.getElementById(f);
        if (!elem) return;
        elem.value = (storedVector[f] !== undefined) ? storedVector[f] : 0;
    });
}

/**
 * VECTORTODATASET()
 * -----------------
 * Converts storedVector into a 16-element array for the radar chart.
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
 * Reads the values of the given factor IDs from the UI and pushes them into the dataset.
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
 * Calculates the average of the HTML input fields identified by factors.
 */
function calculateAverage(factors) {
    const values = getValues(factors);
    const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
    return sum / factors.length;
}

/**
 * CALCULATEMAX()
 * --------------
 * Calculates the maximum value of the HTML input fields identified by factors.
 */
function calculateMax(factors) {
    const values = getValues(factors);
    return Math.max(...values.map(val => parseFloat(val || 0)));
}

/**
 * GETVALUES()
 * -----------
 * Reads the raw values of the HTML fields (factors) and returns them as an array.
 */
function getValues(factors) {
    return factors.map(factor => $(`#${factor}`).val());
}

/**
 * UPDATEDISPLAY()
 * ---------------
 * Displays the value + level in a DOM element (e.g. ".LS")
 * and sets the appropriate CSS class (classLow, classMedium, etc.).
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
 * Generates a string like "SL:1/M:2/O:3/..." from the input values
 * of the UI fields (threatAgent + technicalImpact).
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
 * Writes the final risk to ".RS" + sets a CSS class (classLow, etc.).
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
 * Removes CSS classes in LS, IS, RS before a new update.
 */
function deleteClass() {
    $(".LS").removeClass("classNote classLow classMedium classHigh");
    $(".IS").removeClass("classNote classLow classMedium classHigh");
    $(".RS").removeClass("classNote classLow classMedium classHigh classCritical");
}

/**
 * GETCRITICALITY()
 * ----------------
 * Returns the final overall risk based on L and I class.
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
 * Adjusts the radar chart (riskChart). Colors it based on the final risk (RS).
 */
function updateRiskChart(dataset, RS) {
    if (!riskChart) return;

    let c;
    switch (RS) {
        case "LOW":
            c = 3;
            break;
        case "MEDIUM":
            c = 2;
            break;
        case "HIGH":
            c = 1;
            break;
        case "CRITICAL":
            c = 0;
            break;
        default:
            c = 4;
            break; // NOTE
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
 * Returns the value of a URL parameter (e.g., "?vector=abc").
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
 * Adds "URL Configuration" to the dropdown, selects it, and disables only
 * the dropdown (input fields remain free).
 */
export function addUrlConfigurationOption() {
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
    // Disable the dropdown if configured
    if (config.uiSettings.disableDropdown) {
        configSelect.disabled = true;
    }
}

/**
 * UPDATERISKLEVELMAPPING()
 * ------------------------
 * Determines/updates the risk level based on scores and config.
 * Can only return in test mode, otherwise updates the UI.
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
        return {L_class, I_class, RS};
    }

    $(".RS").text(RS);
    $(".RS").attr("class", `RS class${RS.charAt(0).toUpperCase() + RS.slice(1).toLowerCase()}`);
}

/**
 * SETUPOWASPFALLBACK()
 * --------------------
 * If we are NOT in URL mode and the user selects "Configuration 2" or similar,
 * we want to populate Likelihood and Impact identically and apply the standard
 * OWASP mapping (3×3).
 */
function setupOwaspFallback(selectedConfig) {
    const ranges = riskConfigurations[selectedConfig]
        || riskConfigurations["Default Configuration"];

    const likelihoodConfigObj = ranges; // same ranges
    const impactConfigObj = ranges;     // same ranges
    const likelihoodLevels = ["LOW", "MEDIUM", "HIGH"];
    const impactLevels = ["LOW", "MEDIUM", "HIGH"];
    const mappingObj = owaspMapping;

    return {likelihoodConfigObj, impactConfigObj, likelihoodLevels, impactLevels, mappingObj};
}

/**
 * BUILDHTMLRANGES()
 * -----------------
 * Builds a small <table> with the range values (minVal..maxVal).
 */
function buildHtmlRanges(configObj, title) {
    const arr = [];
    for (const lvl in configObj) {
        const [minVal, maxVal] = configObj[lvl];
        arr.push({level: lvl, minVal, maxVal});
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
 * Builds an NxM table based on (likelihoodLevels × impactLevels)
 * and looks up in mappingObj (key=LIK-IMP).
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
 * Called when you want to open the modal ("How is Severity Risk calculated?").
 * Either displays the URL configuration (NxM) or falls back via setupOwaspFallback.
 */
window.showDynamicRiskModal = function () {
    import("./url_logic.js").then(module => {
        let likeObj = module.likelihoodConfigObj;
        let impObj = module.impactConfigObj;
        let likeLvls = module.likelihoodLevels;
        let impLvls = module.impactLevels;
        let mapObj = module.mappingObj;

        // Check whether the URL-logic values (likeObj, impObj, mapping) are actually populated:
        const noValid = !likeObj || !Object.keys(likeObj).length
            || !impObj || !Object.keys(impObj).length
            || !mapObj || !Object.keys(mapObj).length;

        // If empty => fallback => setupOwaspFallback
        if (noValid) {
            const selConf = document.getElementById("configurationSelect")?.value || "Default Configuration";
            const fb = setupOwaspFallback(selConf);
            likeObj = fb.likelihoodConfigObj;
            impObj = fb.impactConfigObj;
            likeLvls = fb.likelihoodLevels;
            impLvls = fb.impactLevels;
            mapObj = fb.mappingObj;
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