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

// Risk configurations with thresholds for different risk levels
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

// Event listeners and initialization.
// Ensures that DOM elements are loaded before accessing them.
document.addEventListener('DOMContentLoaded', () => {
  // Initialize variables that depend on DOM elements
  riskChartElement = document.getElementById('riskChart');
  riskChartCtx = riskChartElement ? riskChartElement.getContext('2d') : null;

  // Initialize the chart if the context is available
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

  // Load the risk configuration from the URL if present
  const riskConfigParam = getUrlParameter('riskConfig');
  if (riskConfigParam) {
    loadRiskConfigFromUrl(riskConfigParam);
    calculate(); // Recalculate with the new configuration
  } else {
    calculate(); // Initial calculation without URL configuration
  }

  // Add event listener for the dropdown menu
  const configSelect = document.getElementById('configurationSelect');
  if (configSelect) {
    configSelect.addEventListener('change', () => {
      calculate();
    });
  }

  // Load vectors from URL parameter if present
  if (getUrlParameter('vector')) {
    loadVectors(getUrlParameter('vector'));
  }

  // Add event listeners to input fields
  partials.forEach(function (factor) {
    const element = document.getElementById(factor);
    if (element) {
      element.addEventListener('change', calculate);
    }
  });
});

// Make functions accessible in the global scope
window.calculate = calculate;
window.updateRiskLevelMapping = updateRiskLevelMapping;

/**
 * Loads vectors from a URL parameter and updates input fields accordingly.
 * @param {string} vector - The vector string from the URL parameter.
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
    swal("Hey!!", "The vector is not correct, make sure you have copied it correctly", "error");
  }

  calculate();
}

/**
 * Calculates the risk scores and updates the display and chart accordingly.
 */
export function calculate() {
  const configSelect = document.getElementById('configurationSelect');
  const selectedConfig = configSelect ? configSelect.value : 'Default Configuration';
  const dataset = [];
  const threatAgentFactors = ['sl', 'm', 'o', 's', 'ed', 'ee', 'a', 'id'];
  const technicalImpactFactors = ['lc', 'li', 'lav', 'lac', 'fd', 'rd', 'nc', 'pv'];
  deleteClass();

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
  $('#score').attr(
      'href',
      `https://felmade.github.io/OWASP-Calculator/?vector=${score}`
  );

  const RS = getCriticality(FLS, FIS);
  updateRiskLevel('.RS', RS);

  updateRiskChart(dataset, RS);
}

/**
 * Pushes values from input fields into the dataset array.
 * @param {Array<number>} dataset - The array to hold dataset values.
 * @param {Array<string>} factors - The list of factor IDs to retrieve values from.
 */
function pushValuesToDataset(dataset, factors) {
  factors.forEach(factor => {
    const element = $(`#${factor}`);
    if (element.length === 0) {
      return;
    }
    const value = parseFloat(element.val() || 0);
    dataset.push(value);
  });
}

/**
 * Calculates the average of the given factors.
 * @param {Array<string>} factors - The list of factor IDs to calculate the average for.
 * @returns {number} - The average value.
 */
function calculateAverage(factors) {
  const values = getValues(factors);
  const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  return sum / factors.length;
}

/**
 * Calculates the maximum value among the given factors.
 * @param {Array<string>} factors - The list of factor IDs to find the maximum value for.
 * @returns {number} - The maximum value.
 */
function calculateMax(factors) {
  const values = getValues(factors);
  return Math.max(...values.map(val => parseFloat(val || 0)));
}

/**
 * Retrieves values from input fields based on factor IDs.
 * @param {Array<string>} factors - The list of factor IDs.
 * @returns {Array<number>} - The list of values corresponding to the factors.
 */
function getValues(factors) {
  return factors.map(factor => $(`#${factor}`).val());
}

/**
 * Updates the display elements with calculated scores and risk levels.
 * @param {string} selector - The CSS selector for the element to update.
 * @param {string} value - The calculated value to display.
 * @param {string} riskLevel - The risk level corresponding to the value.
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
 * Generates a score string based on the factors and their values.
 * @param {Array<string>} threatAgentFactors - The list of threat agent factor IDs.
 * @param {Array<string>} technicalImpactFactors - The list of technical impact factor IDs.
 * @returns {string} - The generated score string.
 */
function generateScore(threatAgentFactors, technicalImpactFactors) {
  const allFactors = [...threatAgentFactors, ...technicalImpactFactors];
  return allFactors
      .map(factor => `${factor.toUpperCase()}:${$(`#${factor}`).val()}`)
      .join('/');
}

/**
 * Updates the risk level display element with the calculated risk severity.
 * @param {string} selector - The CSS selector for the element to update.
 * @param {string} riskLevel - The calculated risk severity.
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
 * Determines the risk level based on the score and selected configuration.
 * @param {number} score - The calculated score.
 * @param {string} selectedConfig - The selected risk configuration.
 * @returns {string} - The risk level ('LOW', 'MEDIUM', 'HIGH', or 'NOTE').
 */
function getRisk(score, selectedConfig = 'Default Configuration') {
  const thresholds = getRiskThresholds(selectedConfig);

  if (score >= thresholds.LOW[0] && score < thresholds.LOW[1]) return 'LOW';
  if (score >= thresholds.MEDIUM[0] && score < thresholds.MEDIUM[1]) return 'MEDIUM';
  if (score >= thresholds.HIGH[0] && score <= thresholds.HIGH[1]) return 'HIGH';

  return 'NOTE'; // Fallback
}

/**
 * Calculates the final risk severity based on likelihood and impact levels.
 * @param {string} L - The likelihood level ('LOW', 'MEDIUM', 'HIGH', or 'NOTE').
 * @param {string} I - The impact level ('LOW', 'MEDIUM', 'HIGH', or 'NOTE').
 * @returns {string} - The final risk severity.
 */
function getCriticality(L, I) {
  // NOTE
  if (L == "LOW" && I == "LOW") return 'NOTE';

  // LOW
  if ((L == "LOW" && I == "MEDIUM") || (L == "MEDIUM" && I == "LOW")) return 'LOW';

  // MEDIUM
  if ((L == "LOW" && I == "HIGH") || (L == "MEDIUM" && I == "MEDIUM") || (L == "HIGH" && I == "LOW")) return 'MEDIUM';

  // HIGH
  if ((L == "HIGH" && I == "MEDIUM") || (L == "MEDIUM" && I == "HIGH")) return 'HIGH';

  // CRITICAL
  if (L == "HIGH" && I == "HIGH") return 'CRITICAL';

  return 'NOTE'; // Default case
}

/**
 * Removes CSS classes from display elements before updating them.
 */
function deleteClass() {
  // Remove classes from Likelihood Score
  $(".LS").removeClass("classNote classLow classMedium classHigh");

  // Remove classes from Impact Score
  $(".IS").removeClass("classNote classLow classMedium classHigh");

  // Remove classes from Risk Severity
  $(".RS").removeClass("classNote classLow classMedium classHigh classCritical");
}

/**
 * Retrieves a URL parameter by name.
 * @param {string} name - The name of the URL parameter.
 * @returns {string} - The value of the URL parameter or an empty string if not found.
 */
function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * Updates the risk chart with the provided dataset and risk severity.
 * @param {Array<number>} dataset - The data points to display on the chart.
 * @param {string} RS - The risk severity level.
 */
function updateRiskChart(dataset, RS) {
  if (!riskChart) {
    return;
  }

  var c = 0;

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
 * @param {string} selectedConfigName - The name of the selected configuration.
 * @returns {Object} - An object containing the LOW, MEDIUM, and HIGH thresholds.
 */
function getRiskThresholds(selectedConfigName) {
  return riskConfigurations[selectedConfigName] || riskConfigurations['Default Configuration'];
}

/**
 * Updates the risk level mapping based on the current scores and configuration.
 * @param {boolean} testMode - If true, the function returns the risk levels without updating the display.
 * @param {number} L_score - The likelihood score.
 * @param {number} I_score - The impact score.
 * @param {string} selectedConfig - The selected risk configuration.
 * @returns {Object|undefined} - Returns an object with risk levels if testMode is true.
 */
export function updateRiskLevelMapping(testMode = false, L_score = null, I_score = null, selectedConfig = null) {
  if (!testMode) {
    selectedConfig = document.getElementById('configurationSelect').value;
    L_score = parseFloat($(".LS").text().split(" ")[0]);
    I_score = parseFloat($(".IS").text().split(" ")[0]);
  }

  const levels = getRiskThresholds(selectedConfig);

  let L_class;
  if (L_score >= levels.LOW[0] && L_score < levels.LOW[1]) L_class = "LOW";
  else if (L_score >= levels.MEDIUM[0] && L_score < levels.MEDIUM[1]) L_class = "MEDIUM";
  else if (L_score >= levels.HIGH[0] && L_score <= levels.HIGH[1]) L_class = "HIGH";
  else L_class = "NOTE";

  let I_class;
  if (I_score >= levels.LOW[0] && I_score < levels.LOW[1]) I_class = "LOW";
  else if (I_score >= levels.MEDIUM[0] && I_score < levels.MEDIUM[1]) I_class = "MEDIUM";
  else if (I_score >= levels.HIGH[0] && I_score <= levels.HIGH[1]) I_class = "HIGH";
  else I_class = "NOTE";

  const RS = getCriticality(L_class, I_class);

  if (testMode) {
    return { L_class, I_class, RS };
  }

  $(".RS").text(RS);
  $(".RS").attr("class", `RS class${RS.charAt(0).toUpperCase() + RS.slice(1).toLowerCase()}`);
}

/**
 * Loads the risk configuration from the URL parameter and adds it as "URL Configuration".
 * @param {string} riskConfigStr - The risk configuration string from the URL parameter.
 */
export function loadRiskConfigFromUrl(riskConfigStr) {
  // Parse the risk configuration string, e.g., "LOW:0-3;MEDIUM:3-6;HIGH:6-9"
  const configEntries = riskConfigStr.split(';');
  const customConfig = {};

  configEntries.forEach(function(entry) {
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

  // If the custom configuration is valid, add it
  if (Object.keys(customConfig).length > 0) {
    riskConfigurations['URL Configuration'] = customConfig;

    // Add the new option to the dropdown menu
    const configSelect = document.getElementById('configurationSelect');
    if (configSelect) {
      // Check if "URL Configuration" already exists
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
      // Select the "URL Configuration"
      configSelect.value = 'URL Configuration';
    }
  }
}

//?riskConfig=LOW:0-4;MEDIUM:4-7;HIGH:7-9