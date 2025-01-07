"use strict";

// Global variables and configurations for the risk chart and calculations.

// Canvas and Chart.js variables
var riskChartElement;
var riskChartCtx;
var riskChart;

// Color configurations for different risk levels
const colors = [
  'rgba(255, 102, 255)',    // Critical
  'rgba(255, 0, 0)',        // High
  'rgba(255, 169, 0)',      // Medium
  'rgba(255, 255, 0)',      // Low
  'rgba(144, 238, 144)'     // Note
];

// Background colors for different risk levels
const backgrounds = [
  'rgba(255, 102, 255, 0.5)',  // Critical
  'rgba(255, 0, 0, 0.5)',      // High
  'rgba(255, 169, 0, 0.5)',    // Medium
  'rgba(255, 255, 0, 0.5)',    // Low
  'rgba(144, 238, 144, 0.5)'   // Note
];

// Labels for the radar chart axes
const threats = [
  "Skills required", "Motive", "Opportunity", "Population Size",
  "Ease of Discovery", "Ease of Exploit", "Awareness", "Intrusion Detection",
  "Loss of confidentiality", "Loss of Integrity", "Loss of Availability", "Loss of Accountability",
  "Financial damage", "Reputation damage", "Non-Compliance", "Privacy violation"
];

/*
  Default risk configurations for fallback usage.
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

/*
  IDs for threat agent and technical impact factors.
*/
const threatAgentFactors = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
const technicalImpactFactors = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];

/*
  Loads vectors from a string and updates input fields.
  The vector parameter is optional in your usage.
*/
export function loadVectors(vector) {
  vector = vector.replace("(", "").replace(")", "");
  const values = vector.split("/");
  if (values.length !== 16) {
    alert("Error: The provided vector format is invalid.");
    return;
  }
  // Each part is like "SL:2"
  threatAgentFactors.forEach((factor, index) => {
    const [key, val] = values[index].split(":");
    document.getElementById(factor).value = val;
  });
  technicalImpactFactors.forEach((factor, index) => {
    const [key, val] = values[index + threatAgentFactors.length].split(":");
    document.getElementById(factor).value = val;
  });
}

/*
  Calculates the average of given threat agent factors.
*/
function calculateAverage(factors) {
  let sum = 0;
  factors.forEach(id => {
    const val = parseFloat(document.getElementById(id).value || "0");
    sum += val;
  });
  return sum / factors.length;
}

/*
  Calculates the max of given technical impact factors.
*/
function calculateMax(factors) {
  let maxVal = 0;
  factors.forEach(id => {
    const val = parseFloat(document.getElementById(id).value || "0");
    if (val > maxVal) {
      maxVal = val;
    }
  });
  return maxVal;
}

/*
  Updates the display element with the calculated score and class (e.g. "2.000 LOW").
*/
function updateDisplay(selector, value, riskLevel) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = value + " " + riskLevel;
}

/*
  Updates the risk level display element with the final risk (e.g. "CRITICAL").
*/
function updateRiskLevel(selector, riskLevel) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = riskLevel;
}

/*
  Combinations map for final risk,
  combining LScategory:IScategory -> final risk.
*/
const combinationsMap = {
  "LOW:LOW": "NOTE",
  "LOW:MEDIUM": "LOW",
  "MEDIUM:MEDIUM": "MEDIUM",
  "HIGH:HIGH": "CRITICAL",
  "LOW:HIGH": "MEDIUM",
  "MEDIUM:HIGH": "HIGH",
  "HIGH:MEDIUM": "HIGH",
  "HIGH:LOW": "MEDIUM",
  "MEDIUM:LOW": "LOW",
  "NOTE:NOTE": "NOTE"
};

/**
 * calculate() - now uses either URL-based config (rangesI, rangesL, riskMapping)
 * or fallback to your existing "Default Configuration" from riskConfigurations.
 */
export function calculate() {
  // 1) Read URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const iParam = urlParams.get('rangesI');
  const lParam = urlParams.get('rangesL');
  const mappingParam = urlParams.get('riskMapping');
  const vectorParam = urlParams.get('vector');

  // 2) Decide if we should try URL config or fallback to default
  //    Only if iParam, lParam, and mappingParam are ALL present, we use the flexible logic.
  //    Otherwise (including the case "only vector"), fallback to default.
  let useUrlConfig = false;
  if (iParam && lParam && mappingParam) {
    // We attempt to parse them
    try {
      const iCatsTest = parseCategories(iParam);  // might throw
      const lCatsTest = parseCategories(lParam);  // might throw
      const riskMapTest = parseMapping(mappingParam, iCatsTest, lCatsTest); // might throw
      // If we reach here, parsing is good => we can do URL config
      useUrlConfig = true;

      // Optionally set "URL Configuration" in the select
      const configSelect = document.getElementById('configurationSelect');
      if (configSelect) {
        let exists = false;
        for (let i = 0; i < configSelect.options.length; i++) {
          if (configSelect.options[i].value === 'URL Configuration') {
            exists = true;
            break;
          }
        }
        if (!exists) {
          const newOpt = document.createElement('option');
          newOpt.value = 'URL Configuration';
          newOpt.textContent = 'URL Configuration';
          configSelect.appendChild(newOpt);
        }
        configSelect.value = 'URL Configuration';
      }
    } catch (err) {
      console.error("Error parsing URL config:", err.message, "-- fallback to default config.");
      useUrlConfig = false;
    }
  }

  // 3) If only vector => default. If parse failed => default. If no param => default.
  let iCats, lCats, riskMap;
  if (!useUrlConfig) {
    // Fallback to the selected config or default
    const configSelect = document.getElementById('configurationSelect');
    let selectedConfigKey = 'Default Configuration';
    if (configSelect) {
      selectedConfigKey = configSelect.value || 'Default Configuration';
    }
    if (!riskConfigurations[selectedConfigKey]) {
      console.error(`No valid configuration for "${selectedConfigKey}". Using 'Default Configuration' instead.`);
      selectedConfigKey = 'Default Configuration';
    }
    const finalConf = riskConfigurations[selectedConfigKey];

    iCats = [
      { name: "LOW",    min: finalConf.LOW[0],    max: finalConf.LOW[1] },
      { name: "MEDIUM", min: finalConf.MEDIUM[0], max: finalConf.MEDIUM[1] },
      { name: "HIGH",   min: finalConf.HIGH[0],   max: finalConf.HIGH[1] },
    ];
    // Reuse for L
    lCats = [
      { name: "LOW",    min: finalConf.LOW[0],    max: finalConf.LOW[1] },
      { name: "MEDIUM", min: finalConf.MEDIUM[0], max: finalConf.MEDIUM[1] },
      { name: "HIGH",   min: finalConf.HIGH[0],   max: finalConf.HIGH[1] },
    ];

    // Basic 3×3 risk map fallback
    riskMap = [
      "NOTE", "LOW", "MEDIUM",
      "LOW", "MEDIUM", "HIGH",
      "MEDIUM", "HIGH", "CRITICAL"
    ];
  } else {
    // We do the real parse now (since we tested it above, we assume it's good)
    iCats = parseCategories(iParam);
    lCats = parseCategories(lParam);
    riskMap = parseMapping(mappingParam, iCats, lCats);
  }

  // 4) If vectorParam is present => loadVectors
  if (vectorParam) {
    loadVectors(vectorParam);
  }

  // 5) Calculate LS/IS from input fields
  const threatAgentFactors = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
  const technicalFactors = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];

  let lsSum = 0;
  threatAgentFactors.forEach(id => {
    const val = parseFloat(document.getElementById(id).value || "0");
    lsSum += val;
  });
  const lsValue = lsSum / threatAgentFactors.length;

  let isMax = 0;
  technicalFactors.forEach(id => {
    const val = parseFloat(document.getElementById(id).value || "0");
    if (val > isMax) isMax = val;
  });
  const isValue = isMax;

  // 6) Final risk
  const finalRisk = getFinalRisk(lsValue, isValue, iCats, lCats, riskMap);

  // 7) We want the .LS and .IS to appear uppercase
  //    or at least consistent with your test's expectation: /LOW/ or /MEDIUM/
  function findCatName(value, cats) {
    const idx = (function(){
      for (let i = 0; i < cats.length; i++){
        const c = cats[i];
        if (value >= c.min && value < c.max) return i;
      }
      return -1;
    })();
    if (idx === -1) return "ERROR";
    return cats[idx].name; // e.g. "LOW", "MEDIUM", "HIGH"
  }

  const lsClass = findCatName(lsValue, iCats);
  const isClass = findCatName(isValue, lCats);

  // 8) Update displays
  const lsEl = document.querySelector('.LS');
  const isEl = document.querySelector('.IS');
  const rsEl = document.querySelector('.RS');

  if (lsEl) lsEl.textContent = `${lsValue.toFixed(3)} ${lsClass.toUpperCase()}`;
  if (isEl) isEl.textContent = `${isValue.toFixed(3)} ${isClass.toUpperCase()}`;
  if (rsEl) rsEl.textContent = finalRisk.toUpperCase();

  // 9) Update .RS display
  updateRiskLevel(".RS", finalRisk);
}

/*
  DOMContentLoaded: If you want an initial calculation or event listeners
*/
document.addEventListener("DOMContentLoaded", () => {
  const riskChart = document.getElementById("riskChart");
  // If needed, you could init Chart.js here, but your tests mock it

  const configSelect = document.getElementById("configurationSelect");
  if (configSelect) {
    configSelect.addEventListener("change", () => {
      calculate();
    });
  }

  // Initial calc
  calculate();
});

// -------------------------------------------------------
// New URL-Configuration logic
// -------------------------------------------------------

// Implementation of parseCategories
/**
 * Parses a string of categories (e.g. "Low 0-5;Medium 5-7;High 7-10")
 * into an array of { name: string, min: number, max: number }.
 * Throws an Error if format is invalid.
 */
export function parseCategories(rangesString) {
  if (!rangesString || typeof rangesString !== 'string') {
    throw new Error("parseCategories: rangesString is empty or not a string.");
  }
  const segments = rangesString.split(';');
  const result = [];
  segments.forEach(seg => {
    const trimmed = seg.trim();
    if (!trimmed) {
      throw new Error("parseCategories: found an empty segment (missing category definition).");
    }
    const parts = trimmed.split(' ');
    if (parts.length < 2) {
      throw new Error(`parseCategories: segment '${seg}' is missing space between name and range.`);
    }
    const name = parts[0];
    const rangeStr = parts[1];
    const [minStr, maxStr] = rangeStr.split('-');
    if (!minStr || !maxStr) {
      throw new Error(`parseCategories: segment '${rangeStr}' is invalid (missing dash).`);
    }
    const minVal = parseFloat(minStr);
    const maxVal = parseFloat(maxStr);
    if (isNaN(minVal) || isNaN(maxVal)) {
      throw new Error(`parseCategories: invalid number in '${rangeStr}'.`);
    }
    result.push({ name, min: minVal, max: maxVal });
  });
  return result;
}

// Implementation of getCategoryForValue
/**
 * Determines the category name for a given numeric value.
 * If the value does not fit in any category, returns "NOTE".
 * categories should be an array of { name, min, max }, e.g.:
 *   [ { name: 'Low', min: 0, max: 5 }, { name: 'Medium', min: 5, max: 7 }, ... ]
 */
export function getCategoryForValue(value, categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return "ERROR";
  }
  for (const cat of categories) {
    if (value >= cat.min && value < cat.max) {
      return cat.name.toUpperCase();
    }
  }
  return "ERROR";
}

/**
 * Parses a comma-separated string of risk outcomes for an n×m matrix.
 * For instance, if iCats.length = 3 and lCats.length = 3, we expect 9 entries.
 *
 * mappingString: e.g. "Medium, Medium, High, Critical, Mde, Low, Low, Medium, Critical"
 * iCategories: array of { name, min, max } for Impact
 * lCategories: array of { name, min, max } for Likelihood
 *
 * Returns an array of strings (e.g. ["Medium", "Medium", "High", ...]).
 * Throws an Error if the length does not match iCategories.length * lCategories.length.
 */
export function parseMapping(mappingString, iCategories, lCategories) {
  if (!mappingString || typeof mappingString !== 'string') {
    throw new Error("parseMapping: mappingString is empty or not a string.");
  }
  if (!Array.isArray(iCategories) || !Array.isArray(lCategories)) {
    throw new Error("parseMapping: iCategories or lCategories is not an array.");
  }

  const expectedLength = iCategories.length * lCategories.length;
  if (expectedLength === 0) {
    // Falls iCategories oder lCategories leer sind, kann man nicht fortfahren
    throw new Error("parseMapping: cannot determine expected length (no categories).");
  }

  const parts = mappingString.split(',').map(x => x.trim());
  if (parts.length !== expectedLength) {
    throw new Error(
        `parseMapping: Expected ${expectedLength} mapping entries, but got ${parts.length}.`
    );
  }

  return parts;
}

/**
 * Computes the final risk outcome based on:
 * 1. The numeric I value (iValue)
 * 2. The numeric L value (lValue)
 * 3. The arrays of categories (iCategories, lCategories)
 * 4. The mapping array (mappingArray) that has length = iCategories.length * lCategories.length
 *
 * Returns a string (e.g. "CRITICAL", "HIGH", ...).
 */
export function getFinalRisk(iValue, lValue, iCategories, lCategories, mappingArray) {
  // Determine which category iValue falls into (0-based index)
  const iIndex = findCategoryIndex(iValue, iCategories);
  // Determine which category lValue falls into (0-based index)
  const lIndex = findCategoryIndex(lValue, lCategories);

  // Number of L categories
  const lCount = lCategories.length;

  const finalIndex = iIndex * lCount + lIndex;
  if (finalIndex < 0 || finalIndex >= mappingArray.length) {
    // This should normally never happen if everything is correct,
    // but just in case:
    return "ERROR";
  }
  return mappingArray[finalIndex];
}

/**
 * Helper function that finds the index of the category into which 'value' falls.
 * Returns 0 if it's in the first category, 1 if it's in the second, etc.
 * If none matches, returns -1.
 */
function findCategoryIndex(value, categories) {
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (value >= cat.min && value < cat.max) {
      return i;
    }
  }
  return -1; // if no category matched
}