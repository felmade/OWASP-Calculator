"use strict";

// ----------------------------------------------------
// Global variables and configurations for the risk chart and calculations.
// ----------------------------------------------------

// Canvas and Chart.js variables
var riskChartElement;
var riskChartCtx;
var riskChart;

// Color configurations for different risk levels (used for the radar chart)
const colors = [
  'rgba(255, 102, 255)',    // Critical
  'rgba(255, 0, 0)',        // High
  'rgba(255, 169, 0)',      // Medium
  'rgba(255, 255, 0)',      // Low
  'rgba(144, 238, 144)'     // Note
];

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

// IDs of input fields corresponding to threat agent and technical impact factors
const partials = ["sl", "m", "o", "s", "ed", "ee", "a", "id", "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];

// Chart.js options for the radar chart
const riskChartOptions = {
  legend: {
    position: 'top',
    display: false,
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

// Default risk configurations (used if URL parameters are not provided)
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

// ----------------------------------------------------
// Helper Functions for Dynamic Classes and Combinations
// ----------------------------------------------------

/**
 * Parses the `classes` URL parameter for dynamic class intervals.
 * Returns an array of objects { name, min, max }.
 * If no parameter is found, returns default classes.
 */
function parseClassesFromUrl() {
  const classesParam = getUrlParameter('classes');
  // No classes param uses configuration from configSelect
  const configSelect = document.getElementById('configurationSelect');
  const selectedConfig = configSelect ? configSelect.value : 'Default Configuration';
  const thresholds = riskConfigurations[selectedConfig] || riskConfigurations['Default Configuration'];
  if (!classesParam) {

    return [
      { name: 'NOTE', min: -Infinity, max: thresholds.LOW[0] },
      { name: 'LOW', min: thresholds.LOW[0], max: thresholds.LOW[1] },
      { name: 'MEDIUM', min: thresholds.MEDIUM[0], max: thresholds.MEDIUM[1] },
      { name: 'HIGH', min: thresholds.HIGH[0], max: thresholds.HIGH[1] },
      { name: 'NOTE', min: thresholds.HIGH[1], max: Infinity }
    ];
  }

  const classesConfig = [];
  const classEntries = classesParam.split(';');
  classEntries.forEach(entry => {
    const [name, range] = entry.split(':');
    if (name && range) {
      const [minStr, maxStr] = range.split('-');
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (!isNaN(min) && !isNaN(max)) {
        classesConfig.push({ name: name.trim().toUpperCase(), min, max });
      }
    }
  });

  if (classesConfig.length === 0) {
    // If parsing failed, return defaults
    return [
      { name: 'NOTE', min: -Infinity, max: thresholds.LOW[0] },
      { name: 'LOW', min: thresholds.LOW[0], max: thresholds.LOW[1] },
      { name: 'MEDIUM', min: thresholds.MEDIUM[0], max: thresholds.MEDIUM[1] },
      { name: 'HIGH', min: thresholds.HIGH[0], max: thresholds.HIGH[1] },
      { name: 'NOTE', min: thresholds.HIGH[1], max: Infinity }
    ];
  }

  return classesConfig;
}

/**
 * Parses the `combination` URL parameter to load combination rules.
 * Returns a map: { "CLASS1:CLASS2": "RESULTCLASS", ... }.
 * If no parameter is provided, uses default old logic.
 */
function parseCombinationsFromUrl() {
  const combinationParam = getUrlParameter('combination');
  let combinationsMap = {};

  if (!combinationParam) {
    // Old default combinations
    combinationsMap = {
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
    return combinationsMap;
  }

  const comboEntries = combinationParam.split(';');
  comboEntries.forEach(entry => {
    const [combo, result] = entry.split('=');
    if (combo && result) {
      const [left, right] = combo.split('+');
      if (left && right) {
        combinationsMap[`${left.trim().toUpperCase()}:${right.trim().toUpperCase()}`] = result.trim().toUpperCase();
      }
    }
  });

  if (Object.keys(combinationsMap).length === 0) {
    // If nothing parsed, revert to defaults
    combinationsMap = {
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
  }

  return combinationsMap;
}

/**
 * Determines which class a given score belongs to using the classesConfig.
 */
function getClassForValue(value, classesConfig) {
  for (let cls of classesConfig) {
    if (value >= cls.min && value < cls.max) {
      return cls.name;
    }
  }
  return 'NOTE';
}



// ----------------------------------------------------
// Existing Utility Functions (unchanged)
// ----------------------------------------------------

/**
 * Retrieves a URL parameter by name.
 */
function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Pushes values from input fields into the dataset array.
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
 * Calculates the average of given factors.
 */
function calculateAverage(factors) {
  const values = getValues(factors);
  const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  return sum / factors.length;
}

/**
 * Calculates the max value among given factors.
 */
function calculateMax(factors) {
  const values = getValues(factors);
  return Math.max(...values.map(val => parseFloat(val || 0)));
}

/**
 * Retrieves values from input fields based on factor IDs.
 */
function getValues(factors) {
  return factors.map(factor => $(`#${factor}`).val());
}

/**
 * Updates the display element with the calculated scores and risk levels.
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
 * Generates a score string based on all factors and their values.
 */
function generateScore(threatAgentFactors, technicalImpactFactors) {
  const allFactors = [...threatAgentFactors, ...technicalImpactFactors];
  return allFactors
      .map(factor => `${factor.toUpperCase()}:${$(`#${factor}`).val()}`)
      .join('/');
}

/**
 * Updates the risk level display element with the calculated risk severity.
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
 * Removes CSS classes from display elements before updating them.
 */
function deleteClass() {
  $(".LS").removeClass("classNote classLow classMedium classHigh");
  $(".IS").removeClass("classNote classLow classMedium classHigh");
  $(".RS").removeClass("classNote classLow classMedium classHigh classCritical");
}

/**
 * Updates the risk chart with the provided dataset and risk severity.
 */
function updateRiskChart(dataset, RS) {
  if (!riskChart) return;

  let c = 0;
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
      break;
  }

  riskChart.data.labels = threats;
  riskChart.data.datasets[0].data = dataset;
  riskChart.data.datasets[0].pointBackgroundColor = colors[c];
  riskChart.data.datasets[0].backgroundColor = backgrounds[c];
  riskChart.data.datasets[0].borderColor = colors[c];
  riskChart.update();
}

/**
 * Retrieves the risk thresholds for the selected configuration.
 * (Only used if we still rely on old configs. This can remain for backward compatibility.)
 */
function getRiskThresholds(selectedConfigName) {
  return riskConfigurations[selectedConfigName] || riskConfigurations['Default Configuration'];
}

// ----------------------------------------------------
// Functions for URL-based risk configuration
// ----------------------------------------------------

/**
 * Loads the risk configuration from the URL parameter and adds it as "URL Configuration".
 * This is old logic, kept for backward compatibility.
 */
export function loadRiskConfigFromUrl(riskConfigStr) {
  const configEntries = riskConfigStr.split(';');
  const customConfig = {};

  configEntries.forEach(function (entry) {
    const [level, range] = entry.split(':');
    if (level && range) {
      const [minStr, maxStr] = range.split('-');
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (!isNaN(min) && !isNaN(max)) {
        customConfig[level.trim().toUpperCase()] = [min, max];
      }
    }
  });

  if (Object.keys(customConfig).length > 0) {
    riskConfigurations['URL Configuration'] = customConfig;
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
        const option = document.createElement('option');
        option.value = 'URL Configuration';
        option.text = 'URL Configuration';
        configSelect.add(option);
      }
      configSelect.value = 'URL Configuration';
    }
  }
}

// ----------------------------------------------------
// Vector loading
// ----------------------------------------------------

/**
 * Loads vectors from a URL parameter and updates input fields accordingly.
 */
export function loadVectors(vector) {
  vector = vector.replace('(', '').replace(')', '');
  var values = vector.split('/');

  if (values.length == 16) {
    for (let i = 0; i < values.length; i++) {
      let aux = values[i].split(':');
      let vectorValue = aux[1];
      $("#" + partials[i].toLowerCase()).val(vectorValue);
    }
  } else {
    swal("Error: The provided vector format is invalid. Please verify the input and ensure it is correctly formatted.");
  }

  calculate();
}

// ----------------------------------------------------
// Main Calculation Function with the new logic
// ----------------------------------------------------

export function calculate() {
  const configSelect = document.getElementById('configurationSelect');
  const selectedConfig = configSelect ? configSelect.value : 'Default Configuration';
  const threatAgentFactors = ['sl', 'm', 'o', 's', 'ed', 'ee', 'a', 'id'];
  const technicalImpactFactors = ['lc', 'li', 'lav', 'lac', 'fd', 'rd', 'nc', 'pv'];

  deleteClass();

  const LS = parseFloat(calculateAverage(threatAgentFactors).toFixed(3));
  const IS = parseFloat(calculateMax(technicalImpactFactors).toFixed(3));

  // Dynamically load classes and combinations from URL (or use defaults)
  const classesConfig = parseClassesFromUrl();
  const combinationsMap = parseCombinationsFromUrl();

  // Determine LS and IS classes based on the dynamic classesConfig
  const FLS = getClassForValue(LS, classesConfig);
  const FIS = getClassForValue(IS, classesConfig);

  updateDisplay('.LS', LS.toFixed(3), FLS);
  updateDisplay('.IS', IS.toFixed(3), FIS);

  const dataset = [];
  pushValuesToDataset(dataset, threatAgentFactors);
  pushValuesToDataset(dataset, technicalImpactFactors);

  const score = generateScore(threatAgentFactors, technicalImpactFactors);
  $('#score').text(score);
  $('#score').attr('href', `https://felmade.github.io/OWASP-Calculator/?vector=${score}`);

  // Determine the final risk severity (RS) using combinationsMap
  const combinationKey = `${FLS}:${FIS}`;
  let RS = combinationsMap[combinationKey];
  if (!RS) {
    // If not defined, fallback to a default (e.g., use the Impact class)
    RS = FIS;
  }

  updateRiskLevel('.RS', RS);
  updateRiskChart(dataset, RS);
}

// ----------------------------------------------------
// Initialization: DOMContentLoaded
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
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

  const riskConfigParam = getUrlParameter('riskConfig');
  if (riskConfigParam) {
    loadRiskConfigFromUrl(riskConfigParam);
    calculate();
  } else {
    calculate();
  }

  const configSelect = document.getElementById('configurationSelect');
  if (configSelect) {
    configSelect.addEventListener('change', () => {
      calculate();
    });
  }

  // Load vectors from URL if present
  const vectorParam = getUrlParameter('vector');
  if (vectorParam) {
    loadVectors(vectorParam);
  }

  // Add event listeners to input fields
  partials.forEach(function (factor) {
    const element = document.getElementById(factor);
    if (element) {
      element.addEventListener('change', calculate);
    }
  });
});

// ----------------------------------------------------
// End of File
// ----------------------------------------------------