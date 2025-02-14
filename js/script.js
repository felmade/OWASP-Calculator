"use strict";
/**
 * Main logic for the OWASP Risk Assessment Calculator frontend.
 * Provides default configuration, a Chart.js radar diagram, and various helper functions
 * for reading input fields, performing calculations, and updating the UI.
 *
 * @module RiskCalculator
 */

/* ================================
   ========== IMPORTS =============
   ================================ */
import {
    parseUrlParameters,
    performAdvancedCalculation,
    shouldUseUrlLogic,
    storedVector,
    updateCompleteURL,
    getUrlParameter
} from "./url_logic.js";
import { config } from "../config.js";

/* ================================
   ========== CONSTANTS ===========
   ================================ */

// Default vector string used when no vector is provided.
const DEFAULT_VECTOR_STRING =
    "(sl:1/m:1/o:0/s:2/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)";

// Color and background definitions for risk levels.
const COLORS = [
    "rgba(255, 102, 255)", // Critical
    "rgba(255, 0, 0)",     // High
    "rgba(255, 169, 0)",   // Medium
    "rgba(255, 255, 0)",   // Low
    "rgba(144, 238, 144)"  // Note
];

const BACKGROUNDS = [
    "rgba(255, 102, 255, 0.5)", // Critical
    "rgba(255, 0, 0, 0.5)",     // High
    "rgba(255, 169, 0, 0.5)",   // Medium
    "rgba(255, 255, 0, 0.5)",   // Low
    "rgba(144, 238, 144, 0.5)"  // Note
];

// Threat descriptions for the radar chart.
const THREATS = [
    "Skills required", "Motive", "Opportunity", "Population Size",
    "Ease of Discovery", "Ease of Exploit", "Awareness", "Intrusion Detection",
    "Loss of confidentiality", "Loss of Integrity", "Loss of Availability", "Loss of Accountability",
    "Financial damage", "Reputation damage", "Non-Compliance", "Privacy violation"
];

// Risk configurations from the global config.
export const riskConfigurations = config.riskConfigurations;

// OWASP mapping fallback for risk levels.
const OWASP_MAPPING = {
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

// Define factor groups.
const THREAT_AGENT_FACTORS = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
const TECHNICAL_IMPACT_FACTORS = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
const PARTIALS = [...THREAT_AGENT_FACTORS, ...TECHNICAL_IMPACT_FACTORS];

// Chart.js options.
const RISK_CHART_OPTIONS = {
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

/* ================================
   ========== GLOBAL VARIABLES =====
   ================================ */
let riskChartElement = null;
let riskChartCtx = null;
let riskChart = null;

/* ================================
   ========== GLOBAL EXPORTS =======
   ================================ */
// Expose main functions to the global scope
window.calculate = calculate;
window.updateRiskLevelMapping = updateRiskLevelMapping;
window.showDynamicRiskModal = showDynamicRiskModal;

/* ================================
   ========== DOMContentLoaded =====
   ================================ */
document.addEventListener("DOMContentLoaded", () => {
    // Initialize the Chart.js radar chart
    riskChartElement = document.getElementById("riskChart");
    riskChartCtx = riskChartElement ? riskChartElement.getContext("2d") : null;
    if (riskChartCtx) {
        riskChart = new Chart(riskChartCtx, {
            type: "radar",
            data: {
                labels: THREATS,
                datasets: [{
                    data: [],
                    pointBackgroundColor: "",
                    backgroundColor: "",
                    borderColor: "",
                    borderWidth: 2
                }]
            },
            options: RISK_CHART_OPTIONS
        });
    }

    // Attach change listener to the configuration dropdown
    const configSelect = document.getElementById("configurationSelect");
    if (configSelect) {
        configSelect.addEventListener("change", () => {
            calculate();
        });
    }

    // Check for "vector" in URL parameters and load vector accordingly
    const vectorParam = getUrlParameter("vector");
    if (!vectorParam) {
        loadVectors();
    } else {
        loadVectors(vectorParam);
    }

    // Add change listeners to all input fields to trigger recalculation and URL update
    PARTIALS.forEach((factor) => {
        const element = document.getElementById(factor);
        if (element) {
            element.addEventListener("change", () => {
                calculate();
                updateURLInAddressBar();
            });
        }
    });

    // Perform initial calculation and update complete URL
    calculate();
    updateCompleteURL();
});

/* ================================
   ========== EXPORTED FUNCTIONS ===
   ================================ */

/**
 * Loads the vector values into the 16 input fields.
 *
 * @param {string} [vector=DEFAULT_VECTOR_STRING] - The vector string (e.g., "(sl:1/m:1/o:0/...)").
 */
export function loadVectors(vector = DEFAULT_VECTOR_STRING) {
    // Clean the vector string and split into segments
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
                const defaultVector = `?vector=${DEFAULT_VECTOR_STRING}`;
                window.location.href =
                    window.location.origin + window.location.pathname + defaultVector;
            }
        });
        return;
    }

    // Populate each input field and update the stored vector
    for (let i = 0; i < PARTIALS.length; i++) {
        const key = PARTIALS[i];
        const valueStr = values[i].split(":")[1].trim();
        const inputElement = document.getElementById(key);
        if (inputElement) {
            inputElement.value = valueStr;
        }
        storedVector[key] = parseFloat(valueStr) || 0;
    }
    calculate();
}

/**
 * Main calculation function. If URL logic is active and valid, it uses that;
 * otherwise, it falls back to the selected configuration.
 */
export function calculate() {
    if (shouldUseUrlLogic()) {
        console.log("[INFO] URL logic in use.");
        const parseOk = parseUrlParameters();
        if (!parseOk) {
            console.warn("[WARN] parseUrlParameters failed, falling back.");
        } else {
            addUrlConfigurationOption();
            const advResult = performAdvancedCalculation();
            if (advResult) {
                console.log("[INFO] Calculation via URL logic", advResult);
                fillUIFromStoredVector();
                if (config.uiSettings.disableElements) {
                    PARTIALS.forEach((factor) => {
                        const elem = document.getElementById(factor);
                        if (elem) elem.disabled = true;
                    });
                }
                const dataset = vectorToDataset(storedVector);
                updateRiskChart(dataset, advResult.finalRisk);
            }
            return;
        }
    }

    // Fallback: Calculation based on the selected configuration
    const configSelect = document.getElementById("configurationSelect");
    const selectedConfig = configSelect ? configSelect.value : "Default Configuration";
    const dataset = [];

    deleteClass();

    const LS = calculateAverage(THREAT_AGENT_FACTORS).toFixed(3);
    const IS = calculateMax(TECHNICAL_IMPACT_FACTORS).toFixed(3);
    const FLS = getRisk(LS, selectedConfig);
    const FIS = getRisk(IS, selectedConfig);

    updateDisplay(".LS", LS, FLS);
    updateDisplay(".IS", IS, FIS);

    pushValuesToDataset(dataset, THREAT_AGENT_FACTORS);
    pushValuesToDataset(dataset, TECHNICAL_IMPACT_FACTORS);

    const score = generateScore(THREAT_AGENT_FACTORS, TECHNICAL_IMPACT_FACTORS);
    $("#score").text(score);
    $("#score").attr("href", `${config.baseUrl}?vector=${score}`);

    const RS = getCriticality(FLS, FIS);
    updateRiskLevel(".RS", RS);
    updateRiskChart(dataset, RS);
}

/**
 * Adds the "URL Configuration" option to the configuration dropdown and selects it.
 */
export function addUrlConfigurationOption() {
    const configSelect = document.getElementById("configurationSelect");
    if (!configSelect) return;
    const alreadyExists = [...configSelect.options].some(
        (opt) => opt.value === "URL Configuration"
    );
    if (!alreadyExists) {
        const option = document.createElement("option");
        option.value = "URL Configuration";
        option.text = "URL Configuration";
        configSelect.appendChild(option);
    }
    configSelect.value = "URL Configuration";
    if (config.uiSettings.disableDropdown) {
        configSelect.disabled = true;
    }
}

/**
 * Updates the risk mapping based on the current scores and selected configuration.
 *
 * @param {boolean} [testMode=false] - If true, returns risk classes instead of updating the UI.
 * @param {number|null} [L_score=null] - Likelihood score (used in test mode).
 * @param {number|null} [I_score=null] - Impact score (used in test mode).
 * @param {string|null} [selectedConfig=null] - Selected configuration (used in test mode).
 * @returns {object|undefined} If testMode is true, returns an object with L_class, I_class, and RS.
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

    const L_class = getRisk(L_score, selectedConfig);
    const I_class = getRisk(I_score, selectedConfig);
    const RS = getCriticality(L_class, I_class);

    if (testMode) {
        return { L_class, I_class, RS };
    }
    $(".RS")
        .text(RS)
        .attr("class", `RS ${getRiskCssClass(RS)}`);
}

/**
 * Displays a modal that explains how the Severity Risk is calculated.
 */
export function showDynamicRiskModal() {
    import("./url_logic.js").then((module) => {
        let likeObj = module.likelihoodConfigObj;
        let impObj = module.impactConfigObj;
        let likeLvls = module.likelihoodLevels;
        let impLvls = module.impactLevels;
        let mapObj = module.mappingObj;
        const noValid =
            !likeObj ||
            !Object.keys(likeObj).length ||
            !impObj ||
            !Object.keys(impObj).length ||
            !mapObj ||
            !Object.keys(mapObj).length;
        if (noValid) {
            const selConf =
                document.getElementById("configurationSelect")?.value ||
                "Default Configuration";
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
}

/* ================================
   ========== HELPER FUNCTIONS ======
   ================================ */

/**
 * Determines the risk level ("LOW", "MEDIUM", "HIGH", or "NOTE") based on a numeric score
 * and the selected configuration thresholds.
 *
 * @param {number|string} score - The score to evaluate.
 * @param {string} [selectedConfig="Default Configuration"] - The configuration name.
 * @returns {string} The risk level.
 */
function getRisk(score, selectedConfig = "Default Configuration") {
    const numScore = parseFloat(score) || 0;
    const thresholds = getRiskThresholds(selectedConfig);
    if (numScore >= thresholds.LOW[0] && numScore < thresholds.LOW[1]) return "LOW";
    if (numScore >= thresholds.MEDIUM[0] && numScore < thresholds.MEDIUM[1])
        return "MEDIUM";
    if (numScore >= thresholds.HIGH[0] && numScore <= thresholds.HIGH[1])
        return "HIGH";
    return "NOTE";
}

/**
 * Returns the threshold values for risk classification based on the selected configuration.
 *
 * @param {string} selectedConfigName - The configuration name.
 * @returns {object} An object containing threshold arrays for LOW, MEDIUM, and HIGH.
 */
function getRiskThresholds(selectedConfigName) {
    return riskConfigurations[selectedConfigName] ||
        riskConfigurations["Default Configuration"];
}

/**
 * Populates the UI input fields with values from the stored vector.
 */
function fillUIFromStoredVector() {
    PARTIALS.forEach((key) => {
        const elem = document.getElementById(key);
        if (elem) {
            elem.value = storedVector[key] !== undefined ? storedVector[key] : 0;
        }
    });
}

/**
 * Converts the stored vector object into an array for use with the radar chart.
 *
 * @param {object} vec - The stored vector.
 * @returns {Array<number>} Array of numeric values.
 */
function vectorToDataset(vec) {
    return PARTIALS.map((key) => vec[key] || 0);
}

/**
 * Reads values from specified input fields and appends them to the given dataset array.
 *
 * @param {Array<number>} dataset - The dataset array to be populated.
 * @param {Array<string>} factors - Array of input field IDs.
 */
function pushValuesToDataset(dataset, factors) {
    factors.forEach((factor) => {
        const element = $(`#${factor}`);
        if (element.length) {
            const value = parseFloat(element.val() || 0);
            dataset.push(value);
        }
    });
}

/**
 * Calculates the average value from the specified input fields.
 *
 * @param {Array<string>} factors - Array of input field IDs.
 * @returns {number} The average value.
 */
function calculateAverage(factors) {
    const values = getValues(factors);
    const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
    return sum / factors.length;
}

/**
 * Returns the maximum value from the specified input fields.
 *
 * @param {Array<string>} factors - Array of input field IDs.
 * @returns {number} The maximum value.
 */
function calculateMax(factors) {
    const values = getValues(factors);
    return Math.max(...values.map((val) => parseFloat(val || 0)));
}

/**
 * Retrieves the raw values from the specified input fields.
 *
 * @param {Array<string>} factors - Array of input field IDs.
 * @returns {Array<string>} Array of string values.
 */
function getValues(factors) {
    return factors.map((factor) => $(`#${factor}`).val());
}

/**
 * Updates the display element (e.g., ".LS") with the given value and risk level,
 * and applies the corresponding CSS class.
 *
 * @param {string} selector - The jQuery selector for the target element.
 * @param {string|number} value - The value to display.
 * @param {string} riskLevel - The risk level (e.g., "LOW", "MEDIUM").
 */
function updateDisplay(selector, value, riskLevel) {
    $(selector)
        .text(`${value} ${riskLevel}`)
        .removeClass("classNote classLow classMedium classHigh classCritical")
        .addClass(getRiskCssClass(riskLevel));
}

/**
 * Generates a score string (e.g., "SL:1/M:2/O:3/...") from the values of input fields.
 *
 * @param {Array<string>} threatFactors - Array of threat agent field IDs.
 * @param {Array<string>} impactFactors - Array of technical impact field IDs.
 * @returns {string} The generated score string.
 */
function generateScore(threatFactors, impactFactors) {
    const allFactors = [...threatFactors, ...impactFactors];
    return allFactors
        .map((factor) => `${factor.toUpperCase()}:${$(`#${factor}`).val()}`)
        .join("/");
}

/**
 * Updates the final risk display element (e.g., ".RS") with the risk level
 * and applies the corresponding CSS class.
 *
 * @param {string} selector - The jQuery selector for the target element.
 * @param {string} riskLevel - The final risk level.
 */
function updateRiskLevel(selector, riskLevel) {
    $(selector)
        .text(riskLevel)
        .removeClass("classNote classLow classMedium classHigh classCritical")
        .addClass(getRiskCssClass(riskLevel));
}

/**
 * Removes all risk-related CSS classes from the LS, IS, and RS elements.
 */
function deleteClass() {
    $(".LS").removeClass("classNote classLow classMedium classHigh");
    $(".IS").removeClass("classNote classLow classMedium classHigh");
    $(".RS").removeClass("classNote classLow classMedium classHigh classCritical");
}

/**
 * Determines the overall risk level (RS) based on likelihood (L) and impact (I) risk levels.
 *
 * @param {string} L - Likelihood risk level.
 * @param {string} I - Impact risk level.
 * @returns {string} The overall risk level.
 */
function getCriticality(L, I) {
    if (L === "LOW" && I === "LOW") return "NOTE";
    if ((L === "LOW" && I === "MEDIUM") || (L === "MEDIUM" && I === "LOW"))
        return "LOW";
    if (
        (L === "LOW" && I === "HIGH") ||
        (L === "MEDIUM" && I === "MEDIUM") ||
        (L === "HIGH" && I === "LOW")
    )
        return "MEDIUM";
    if ((L === "HIGH" && I === "MEDIUM") || (L === "MEDIUM" && I === "HIGH"))
        return "HIGH";
    if (L === "HIGH" && I === "HIGH") return "CRITICAL";
    return "NOTE";
}

/**
 * Updates the Chart.js radar chart with the given dataset and final risk level.
 *
 * @param {Array<number>} dataset - Data values for the chart.
 * @param {string} RS - Final risk level.
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
            c = 4; // NOTE
            break;
    }
    riskChart.data.labels = THREATS;
    riskChart.data.datasets[0].data = dataset;
    riskChart.data.datasets[0].pointBackgroundColor = COLORS[c];
    riskChart.data.datasets[0].backgroundColor = BACKGROUNDS[c];
    riskChart.data.datasets[0].borderColor = COLORS[c];
    riskChart.update();
}

/**
 * Returns the corresponding CSS class for a given risk level.
 *
 * @param {string} riskLevel - The risk level (e.g., "LOW", "MEDIUM").
 * @returns {string} The CSS class name.
 */
function getRiskCssClass(riskLevel) {
    const mapping = {
        NOTE: "classNote",
        LOW: "classLow",
        MEDIUM: "classMedium",
        HIGH: "classHigh",
        CRITICAL: "classCritical"
    };
    return mapping[riskLevel] || "classNote";
}

/**
 * Updates the browser's URL (without reloading) to reflect the current vector.
 */
function updateURLInAddressBar() {
    const vectorString =
        "(" +
        Object.keys(storedVector)
            .map((key) => `${key.toUpperCase()}:${storedVector[key]}`)
            .join("/") +
        ")";
    const urlParams = new URLSearchParams(window.location.search);
    const likelihoodConfig = urlParams.get("likelihoodConfig");
    const impactConfig = urlParams.get("impactConfig");
    const mappingConfig = urlParams.get("mapping");
    let completeURL = window.location.origin + window.location.pathname;
    let queryString = "";
    if (likelihoodConfig) {
        queryString += `likelihoodConfig=${likelihoodConfig}&`;
    }
    if (impactConfig) {
        queryString += `impactConfig=${impactConfig}&`;
    }
    if (mappingConfig) {
        queryString += `mapping=${mappingConfig}&`;
    }
    queryString += `vector=${vectorString}`;
    completeURL += `?${queryString}`;
    window.history.replaceState(null, "", completeURL);
}

/**
 * Sets up the fallback configuration for OWASP if URL parameters are not provided.
 *
 * @param {string} selectedConfig - The selected configuration name.
 * @returns {object} An object containing likelihood and impact configuration objects, levels, and mapping.
 */
function setupOwaspFallback(selectedConfig) {
    const ranges =
        riskConfigurations[selectedConfig] ||
        riskConfigurations["Default Configuration"];
    const likelihoodConfigObj = ranges;
    const impactConfigObj = ranges;
    const likelihoodLevels = ["LOW", "MEDIUM", "HIGH"];
    const impactLevels = ["LOW", "MEDIUM", "HIGH"];
    const mappingObj = OWASP_MAPPING;
    return { likelihoodConfigObj, impactConfigObj, likelihoodLevels, impactLevels, mappingObj };
}

/**
 * Constructs an HTML table displaying the range values for a given configuration.
 *
 * @param {object} configObj - The configuration object with range values.
 * @param {string} title - The title for the table.
 * @returns {string} The constructed HTML string.
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
    arr.forEach((item) => {
        const rangeStr =
            item.maxVal === 9
                ? `${item.minVal} to ≤ ${item.maxVal}`
                : `${item.minVal} to < ${item.maxVal}`;
        html += `<tr><td>${rangeStr}</td><td>${item.level}</td></tr>`;
    });
    html += "</tbody></table>";
    return html;
}

/**
 * Constructs an HTML table based on likelihood and impact levels using the provided mapping object.
 *
 * @param {Array<string>} lLevels - Array of likelihood levels.
 * @param {Array<string>} iLevels - Array of impact levels.
 * @param {object} mapObj - The mapping object (key: "LIK-IMP", value: risk level).
 * @returns {string} The constructed HTML string.
 */
function buildHtmlMappingTable(lLevels, iLevels, mapObj) {
    let html = "<h5>Likelihood × Impact => Mapping</h5>";
    html += '<table class="table table-bordered table-sm">';
    html += `<thead><tr><th>Likelihood (Rows) \\ Impact (Columns)</th>`;
    iLevels.forEach((imp) => {
        html += `<th>${imp}</th>`;
    });
    html += "</tr></thead><tbody>";
    lLevels.forEach((lik) => {
        html += `<tr><th>${lik}</th>`;
        iLevels.forEach((imp) => {
            const key = `${lik}-${imp}`.toUpperCase();
            const val = mapObj[key] || "???";
            html += `<td>${val}</td>`;
        });
        html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
}