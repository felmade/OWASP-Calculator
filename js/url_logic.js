// File: url_logic.js

import {config} from "../config.js";
import {validateContinuousRange} from "./customMappingButton.js";

/* ================================
   ========== CONSTANTS ===========
   ================================ */

// Define the allowed vector keys in the desired order.
export const VECTOR_KEYS = [
    "sl", "m", "o", "s", "ed", "ee", "a", "id",
    "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
];
const ALLOWED_VECTOR_KEYS = new Set(VECTOR_KEYS);

// Default vector values.
const DEFAULT_VECTOR = {
    sl: 1, m: 1, o: 0, s: 2, ed: 0, ee: 0, a: 0, id: 0,
    lc: 0, li: 0, lav: 0, lac: 0, fd: 0, rd: 0, nc: 0, pv: 0
};

/* ================================
   ========== EVENT LISTENERS =====
   ================================ */

// Update the complete URL when the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", updateCompleteURL);
// Initialize vector update listeners on DOM load.
document.addEventListener("DOMContentLoaded", initializeVectorUpdate);

/* ================================
   ========== EXPORT VARIABLES =====
   ================================ */

// Storage for parsed configuration and calculation data.
export let likelihoodConfigObj = {};
export let impactConfigObj = {};
export let likelihoodLevels = [];
export let impactLevels = [];
export let mappingObj = {};
export let storedVector = {...DEFAULT_VECTOR};

/* ============================================
   ========== STEP 1: URL LOGIC CHECK =========
   ============================================
*/

/**
 * Checks if URL logic should be used by ensuring all required parameters are present.
 * @returns {boolean} true if required parameters exist; false otherwise.
 */
export function shouldUseUrlLogic() {
    return checkRequiredParameters();
}

/* ============================================
   ========== STEP 2: PARSE URL PARAMETERS =====
   ============================================
*/

/**
 * Parses URL parameters: likelihoodConfig, impactConfig, mapping, and vector (optional).
 * Validates that Likelihood and Impact cover the range 0-9 continuously.
 * On success, updates the exported variables and returns true.
 * On error, falls back to default configuration and returns false.
 * @returns {boolean}
 */
export function parseUrlParameters() {
    try {
        const likelihoodConfigStr = getUrlParameter("likelihoodConfig");
        const impactConfigStr = getUrlParameter("impactConfig");
        const mappingStr = getUrlParameter("mapping");
        const vectorParam = getUrlParameter("vector");

        // 1) Parse likelihood and impact configuration strings.
        likelihoodConfigObj = parseConfiguration(likelihoodConfigStr);
        impactConfigObj = parseConfiguration(impactConfigStr);

        // Validate likelihood and impact ranges explicitly
        const likelihoodRanges = Object.entries(likelihoodConfigObj).map(([label, [min, max]]) => ({label, min, max}));
        const impactRanges = Object.entries(impactConfigObj).map(([label, [min, max]]) => ({label, min, max}));

        if (!validateContinuousRange(likelihoodRanges, "Likelihood")) {
            throw new Error("Likelihood ranges do not cover 0-9 continuously.");
        }

        if (!validateContinuousRange(impactRanges, "Impact")) {
            throw new Error("Impact ranges do not cover 0-9 continuously.");
        }

        // 2) Create level arrays (sorted by minimum value).
        likelihoodLevels = configObjToSortedLevels(likelihoodConfigObj);
        impactLevels = configObjToSortedLevels(impactConfigObj);

        // 3) Parse NxM mapping.
        mappingObj = parseNxMMapping(likelihoodLevels, impactLevels, mappingStr);

        // 4) Parse optional vector parameter or use default.
        storedVector = vectorParam ? parseVector(vectorParam) : {...DEFAULT_VECTOR};

        return true;
    } catch (err) {
        console.error("[URL_LOGIC] parseUrlParameters() error:", err);
        alert("Parsing Error:\n" + err.message + "\nDefault configuration will be used.");

        const defaultVector = `?vector=(${VECTOR_KEYS
            .map((key) => `${key.toUpperCase()}:${DEFAULT_VECTOR[key]}`)
            .join("/")})`;

        window.location.href = window.location.origin + window.location.pathname + defaultVector;

        return false;
    }
}


/* ============================================
   ========== STEP 3: ADVANCED CALCULATION ======
   ============================================
*/

/**
 * Performs the advanced calculation:
 * 1) Synchronizes the stored vector with the UI.
 * 2) Calculates likelihood (L) and impact (I) scores.
 * 3) Determines the final risk via mapping.
 * 4) Updates the UI with the calculated values.
 * @returns {object|null} Object containing scores and classifications or null on failure.
 */
export function performAdvancedCalculation() {
    // (0) Synchronize UI inputs with storedVector.
    syncStoredVectorFromUI();

    // Ensure configurations and mapping exist.
    if (!Object.keys(likelihoodConfigObj).length || !Object.keys(impactConfigObj).length) {
        console.error("No config objects found - can't proceed.");
        return null;
    }
    if (!Object.keys(mappingObj).length) {
        console.error("No mapping found - can't proceed.");
        return null;
    }

    // 1) Calculate L_score and I_score.
    let L_score = 0;
    let I_score = 0;

    if (storedVector) {
        // Calculate average for threat fields.
        const threatKeys = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
        L_score = averageVector(storedVector, threatKeys);

        // Calculate maximum for impact fields.
        const impactKeys = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
        I_score = maxVector(storedVector, impactKeys);
    } else {
        console.warn("[performAdvancedCalculation] No vector available; using 0 for L & I.");
    }

    // 2) Determine classifications for likelihood and impact.
    const L_class = getRangeClass(L_score, likelihoodConfigObj);
    const I_class = getRangeClass(I_score, impactConfigObj);

    // 3) Map the classifications to final risk.
    const finalRisk = getMappedRisk(L_class, I_class);

    // 4) Update UI elements.
    const LSElem = document.querySelector(".LS");
    if (LSElem) {
        LSElem.textContent = `${L_score.toFixed(3)} ${L_class}`;
        LSElem.style.fontWeight = "bold";
        LSElem.style.fontSize = "24px";
    }

    const ISElem = document.querySelector(".IS");
    if (ISElem) {
        ISElem.textContent = `${I_score.toFixed(3)} ${I_class}`;
        ISElem.style.fontWeight = "bold";
        ISElem.style.fontSize = "24px";
    }

    const RSElem = document.querySelector(".RS");
    if (RSElem) {
        RSElem.textContent = finalRisk;
        RSElem.style.fontWeight = "bold";
        RSElem.style.fontSize = "24px";
    }

    return {L_score, I_score, L_class, I_class, finalRisk};
}

/* ============================================
   ========== UI AND VECTOR SYNC ===============
   ============================================
*/

/**
 * Reads input fields corresponding to VECTOR_KEYS and updates storedVector.
 */
function syncStoredVectorFromUI() {
    VECTOR_KEYS.forEach((key) => {
        const el = document.getElementById(key);
        if (el) {
            storedVector[key] = parseFloat(el.value) || 0;
        }
    });
}

/**
 * Initializes event listeners for all vector input fields.
 * Updates the stored vector, vector display, and complete URL on input change.
 */
export function initializeVectorUpdate() {
    VECTOR_KEYS.forEach((key) => {
        const inputElement = document.getElementById(key);
        if (inputElement) {
            inputElement.addEventListener("input", () => {
                // Update storedVector with the current input value.
                storedVector[key] = parseFloat(inputElement.value) || 0;

                // Update the vector display and complete URL.
                updateVectorDisplay();
                updateCompleteURL();
            });
        } else {
            console.warn(`[initializeVectorUpdate] Input field with ID "${key}" not found.`);
        }
    });
}

/**
 * Updates the vector display element based on the current storedVector.
 * The vector string is built using the order defined in VECTOR_KEYS.
 */
export function updateVectorDisplay() {
    const vectorElement = document.getElementById("score");
    if (vectorElement) {
        const vectorString = VECTOR_KEYS.map((key) => `${key.toUpperCase()}:${storedVector[key]}`).join("/");
        vectorElement.href = `${config.baseUrl}?vector=${vectorString}`;
        vectorElement.textContent = `(${vectorString})`;
    }
}

/**
 * Updates the complete URL element in the UI based on the current URL parameters and storedVector.
 */
export function updateCompleteURL() {
    const completeURLDiv = document.querySelector(".completeURL");
    const completeURLElement = document.getElementById("completeURL");

    if (!completeURLDiv || !completeURLElement) {
        console.error("[ERROR] Could not find .completeURL div or #completeURL element.");
        return;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const likelihoodConfig = urlParams.get("likelihoodConfig");
        const impactConfig = urlParams.get("impactConfig");
        const mappingConfig = urlParams.get("mapping");

        const vectorString = `(${VECTOR_KEYS.map((key) => `${key.toUpperCase()}:${storedVector[key]}`).join("/")})`;

        // Assemble the complete URL.
        let completeURL = config.baseUrl;
        if (!likelihoodConfig && !impactConfig && !mappingConfig) {
            // No config parameters present: use only vector.
            completeURL += `?vector=${vectorString}`;
        } else {
            completeURL += `?likelihoodConfig=${likelihoodConfig}&impactConfig=${impactConfig}&mapping=${mappingConfig}&vector=${vectorString}`;
        }

        completeURLElement.href = completeURL;
        completeURLElement.textContent = completeURL;
    } catch (error) {
        console.error("[ERROR] Exception in updateCompleteURL:", error);
    }
}

/* ============================================
   ========== HELPER FUNCTIONS ================
   ============================================
*/

/**
 * Parses a configuration string (e.g., "LOW:0-2;MEDIUM:2-5;HIGH:5-9")
 * and returns an object mapping level names to numeric ranges.
 * @param {string} str - The configuration string.
 * @returns {object}
 * @throws Will throw an error if the string is invalid.
 */
function parseConfiguration(str) {
    if (!str) throw new Error("No configuration string provided.");
    const parts = str.split(";");
    const obj = {};
    parts.forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const [levelRaw, rangeRaw] = trimmed.split(":");
        if (!levelRaw || !rangeRaw) {
            throw new Error("Invalid configuration segment: " + part);
        }
        const [minStr, maxStr] = rangeRaw.split("-");
        const minVal = parseFloat(minStr);
        const maxVal = parseFloat(maxStr);
        if (isNaN(minVal) || isNaN(maxVal)) {
            throw new Error("Invalid numeric range in segment: " + part);
        }
        obj[levelRaw.trim().toUpperCase()] = [minVal, maxVal];
    });
    if (!Object.keys(obj).length) {
        throw new Error("Empty configuration object derived from: " + str);
    }
    return obj;
}

/**
 * Converts a configuration object (e.g., {LOW:[0,2], MEDIUM:[2,4], HIGH:[4,6]})
 * into an array of levels sorted by the minimum value.
 * @param {object} configObj
 * @returns {string[]} Sorted array of level names.
 */
function configObjToSortedLevels(configObj) {
    const tempArr = [];
    for (const level in configObj) {
        const [minVal, maxVal] = configObj[level];
        tempArr.push({level, minVal, maxVal});
    }
    tempArr.sort((a, b) => a.minVal - b.minVal);
    return tempArr.map((item) => item.level);
}

/**
 * Parses an NxM mapping string into a mapping object.
 * The mapping keys are formed by "LIKELIHOOD-IMPACT" (both in uppercase).
 * @param {string[]} lLevels - Array of likelihood levels.
 * @param {string[]} iLevels - Array of impact levels.
 * @param {string} shortStr - The mapping string (comma-separated values).
 * @returns {object} Mapping object.
 * @throws Will throw an error if the mapping string does not have the correct number of entries.
 */
function parseNxMMapping(lLevels, iLevels, shortStr) {
    if (!shortStr) throw new Error("No mapping string provided.");
    const N = lLevels.length;
    const M = iLevels.length;
    const arr = shortStr.split(",").map((s) => s.trim());
    if (arr.length !== N * M) {
        throw new Error(`Expected ${N * M} mapping entries, but got ${arr.length}.`);
    }
    let index = 0;
    const mapObj = {};
    for (let l = 0; l < N; l++) {
        for (let i = 0; i < M; i++) {
            const key = `${lLevels[l]}-${iLevels[i]}`.toUpperCase();
            mapObj[key] = arr[index].toUpperCase();
            index++;
        }
    }
    return mapObj;
}

/**
 * Parses a vector string (e.g., "(sl:1/m:2/o:3/...)")
 * and returns an object containing only the allowed vector keys.
 * @param {string} str - The vector string.
 * @returns {object} Parsed vector object.
 * @throws Will throw an error if the vector string is invalid.
 */
export function parseVector(str) {
    const clean = str.replace(/^\(/, "").replace(/\)$/, "");
    const segments = clean.split("/");
    if (!segments.length) {
        throw new Error("Empty vector string.");
    }
    // Initialize result with zeros for all allowed keys.
    const vecObj = {};
    ALLOWED_VECTOR_KEYS.forEach((k) => {
        vecObj[k] = 0;
    });
    segments.forEach((seg) => {
        const [keyRaw, valRaw] = seg.split(":");
        if (!keyRaw || valRaw === undefined) {
            throw new Error("Invalid vector segment: " + seg);
        }
        const key = keyRaw.trim().toLowerCase();
        const valNum = parseFloat(valRaw.trim());
        if (isNaN(valNum)) {
            throw new Error("Non-numeric value in vector segment: " + seg);
        }
        if (valNum < 0 || valNum > 9) {
            throw new Error(`Vector value out of range (0-9) in segment: ${seg}`);
        }
        if (ALLOWED_VECTOR_KEYS.has(key)) {
            vecObj[key] = valNum;
        } else {
            console.warn(`[parseVector] Ignoring unknown key "${key}".`);
        }
    });
    return vecObj;
}

/**
 * Determines the classification for a given value based on the configuration ranges.
 * For normal cases, a value is classified if it is >= min and < max.
 * Special handling: if value is exactly 9 and the range's max is 9.
 * @param {number} value - The value to classify.
 * @param {object} configObj - Configuration object mapping levels to ranges.
 * @returns {string} The level (e.g., "LOW", "MEDIUM") or "ERROR" if none match.
 */
export function getRangeClass(value, configObj) {
    for (const level in configObj) {
        const [minVal, maxVal] = configObj[level];
        if ((value >= minVal && value < maxVal) || (value === 9 && maxVal === 9)) {
            return level;
        }
    }
    return "ERROR";
}

/**
 * Retrieves the final risk mapping based on likelihood and impact classifications.
 * @param {string} L_class - Likelihood classification.
 * @param {string} I_class - Impact classification.
 * @returns {string} Mapped risk or "ERROR" if mapping is invalid.
 */
export function getMappedRisk(L_class, I_class) {
    if (L_class === "ERROR" || I_class === "ERROR") {
        return "ERROR";
    }
    const key = `${L_class}-${I_class}`.toUpperCase();
    return mappingObj[key] || "ERROR";
}

/**
 * Checks if the required URL parameters (likelihoodConfig, impactConfig, mapping)
 * are present. If some are missing, a warning is shown and a fallback to default
 * configuration is initiated.
 * @returns {boolean} true if all required parameters are present; false otherwise.
 */
export function checkRequiredParameters() {
    const requiredParams = ["likelihoodConfig", "impactConfig", "mapping"];
    const missingParams = [];
    let foundParams = 0;

    requiredParams.forEach((param) => {
        const regex = new RegExp("[\\?&]" + param + "=([^&#]*)");
        const results = regex.exec(window.location.search);
        if (!results) {
            missingParams.push(param);
        } else {
            foundParams++;
        }
    });

    // If no parameters are present, return false.
    if (foundParams === 0) {
        return false;
    }

    // If some (but not all) parameters are missing, show a warning and fallback.
    if (missingParams.length > 0 && missingParams.length < requiredParams.length) {
        alert(`The following parameters are missing: ${missingParams.join(", ")}.\nDefault configuration will be used.`);

        const defaultVector = `?vector=(${VECTOR_KEYS
            .map((key) => `${key.toUpperCase()}:${DEFAULT_VECTOR[key]}`)
            .join("/")})`;

        window.location.href = window.location.origin + window.location.pathname + defaultVector;

        return false;
    }

    return true;
}

/**
 * Calculates the average of the vector values for the specified keys.
 * @param {object} vec - The vector object.
 * @param {string[]} keys - The keys to average.
 * @returns {number} The average value.
 */
export function averageVector(vec, keys) {
    let sum = 0,
        count = 0;
    keys.forEach((k) => {
        if (typeof vec[k] === "number") {
            sum += vec[k];
            count++;
        }
    });
    return count ? sum / count : 0;
}

/**
 * Calculates the maximum value among the specified keys in the vector.
 * @param {object} vec - The vector object.
 * @param {string[]} keys - The keys to check.
 * @returns {number} The maximum value.
 */
export function maxVector(vec, keys) {
    let maxVal = Number.NEGATIVE_INFINITY;
    keys.forEach((k) => {
        const v = vec[k];
        if (typeof v === "number" && v > maxVal) {
            maxVal = v;
        }
    });
    return maxVal === Number.NEGATIVE_INFINITY ? 0 : maxVal;
}

/**
 * Extracts a parameter value from the URL query string.
 * @param {string} name - The name of the parameter.
 * @returns {string|null} The decoded parameter value or null if not found.
 */
export function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i");
    const results = regex.exec(window.location.search);
    if (!results) return null;
    if (!results[2]) return null;
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/* ============================================
   ========== EXTERNAL GETTERS ================
   ============================================
*/

/**
 * Returns the stored configuration objects.
 * @returns {object} Object with likelihood and impact configurations.
 */
export function getStoredConfiguration() {
    return {
        likelihood: likelihoodConfigObj,
        impact: impactConfigObj,
    };
}

/**
 * Returns the stored mapping object.
 * @returns {object}
 */
export function getStoredMapping() {
    return mappingObj;
}

/**
 * Returns the current stored vector.
 * @returns {object}
 */
export function getStoredVector() {
    return storedVector;
}