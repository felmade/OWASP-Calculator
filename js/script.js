"use strict";

// VARIABLES -----------------------
var riskChartElement = document.getElementById('riskChart');
var riskChart = riskChartElement ? riskChartElement.getContext('2d') : null;

const colors = [
'rgba(255, 102, 255)',
'rgba(255, 0, 0)',
'rgba(255, 169, 0)',
'rgba(255, 255, 0)',
'rgba(144, 238, 144)'
];

const backgrounds = [
  'rgba(255, 102, 255, 0.5)',
  'rgba(255, 0, 0, 0.5)',
  'rgba(255, 169, 0, 0.5)',
  'rgba(255, 255, 0, 0.5)',
  'rgba(144, 238, 144, 0.5)'
];

const threats = ["Skills required", "Motive", "Opportunity", "Population Size",
"Easy of Discovery", "Ease of Exploit", "Awareness", "Intrusion Detection",
"Loss of confidentiality", "Loss of Integrity", "Loss of Availability", "Loss of Accountability",
"Financial damage", "Reputation damage", "Non-Compliance", "Privacy violation"
];

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


const partials = ["sl", "m", "o", "s", "ed", "ee", "a", "id", "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];

const riskChartOptions = {
  legend: {
    position: 'top',
    display: false,
  },
  title: {
    display: false,
    text: 'Chart.js Radar Chart'
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

// CHARTS -----------------------
if (riskChart) {
  riskChart = new Chart(riskChart, {
    type: 'radar',
    data: {
      labels: [],
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

updateRiskChart()

if(getUrlParameter('vector')){
  loadVectors(getUrlParameter('vector'))
}

// FUNCTIONS -----------------------
function loadVectors(vector) {

  vector = vector.replace('(', '').replace(')', '');
  var values = vector.split('/');

  if (values.length == 16) {
    for (let i=0; i<values.length; i++) {
        let aux = values[i].split(':');
        let vector = aux[1];
        console.log(vector)
        $("#" + partials[i].toLowerCase()).val(vector);
    }
  } else {
    swal("Hey!!", "The vector is not correct, make sure you have copied correctly", "error");
  }

  calculate()
}

function calculate() {
  deleteClass();

  const selectedConfig = document.getElementById('configurationSelect').value;

  const threatAgentFactors = ['sl', 'm', 'o', 's', 'ed', 'ee', 'a', 'id'];
  const technicalImpactFactors = ['lc', 'li', 'lav', 'lac', 'fd', 'rd', 'nc', 'pv'];

  const LS = calculateAverage(threatAgentFactors).toFixed(3);
  const IS = calculateMax(technicalImpactFactors).toFixed(3);

  const FLS = getRisk(LS, selectedConfig);
  const FIS = getRisk(IS, selectedConfig);

  updateDisplay('.LS', LS, FLS);
  updateDisplay('.IS', IS, FIS);

  const dataset = [...getValues(threatAgentFactors), ...getValues(technicalImpactFactors)];
  const score = generateScore(threatAgentFactors, technicalImpactFactors);

  $('#score').text(score);
  $('#score').attr(
      'href',
      `https://felmade.github.io/OWASP-Calculator/?vector=${score}`
  );

  const RS = getCriticaly(FLS, FIS);
  updateRiskLevel('.RS', RS);

  updateRiskChart(dataset, RS);
}


function calculateAverage(factors) {
  const values = getValues(factors);
  const sum = values.reduce((acc, val) => acc + parseFloat(val || 0), 0);
  return sum / factors.length;
}

function calculateMax(factors) {
  const values = getValues(factors);
  return Math.max(...values.map(val => parseFloat(val || 0)));
}

function getValues(factors) {
  return factors.map(factor => $(`#${factor}`).val());
}

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

function generateScore(threatAgentFactors, technicalImpactFactors) {
  const allFactors = [...threatAgentFactors, ...technicalImpactFactors];
  return allFactors
      .map(factor => `${factor.toUpperCase()}:${$(`#${factor}`).val()}`)
      .join('/');
}

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


function getRisk(score, selectedConfig = 'Default Configuration') {
  const thresholds = getRiskThresholds(selectedConfig);

  if (score >= thresholds.LOW[0] && score < thresholds.LOW[1]) return 'LOW';
  if (score >= thresholds.MEDIUM[0] && score < thresholds.MEDIUM[1]) return 'MEDIUM';
  if (score >= thresholds.HIGH[0] && score <= thresholds.HIGH[1]) return 'HIGH';

  return 'NOTE'; // Fallback
}

// Calculate final Risk Serverity
function getCriticaly(L, I){
  //NOTE
  if(L == "LOW" && I == "LOW") return 'NOTE';

  //LOW
  if(L == "LOW" && I == "MEDIUM") return 'LOW';
  if(L == "MEDIUM" && I == "LOW") return 'LOW';
  
  //MEDIUM
  if(L == "LOW" && I == "HIGH") return 'MEDIUM';
  if(L == "MEDIUM" && I == "MEDIUM") return 'MEDIUM';
  if(L == "HIGH" && I == "LOW") return 'MEDIUM';

  //HIGH
  if(L == "HIGH" && I == "MEDIUM") return 'HIGH';
  if(L == "MEDIUM" && I == "HIGH") return 'HIGH';

  //CRITICAL
  if(L == "HIGH" && I == "HIGH") return 'CRITICAL';
}

// Delete class before of calculate
function deleteClass(){
  // Delete Class Likelihood Score
  $(".LS").removeClass("classNote");
  $(".LS").removeClass("classMedium");
  $(".LS").removeClass("classHigh");

  // Delete Class Impact Score
  $(".IS").removeClass("classNote");
  $(".IS").removeClass("classMedium");
  $(".IS").removeClass("classHigh");

  // Delete Class Risk Severity
  $(".RS").removeClass("classNote");
  $(".RS").removeClass("classLow");
  $(".RS").removeClass("classMedium");
  $(".RS").removeClass("classHigh");
  $(".RS").removeClass("classCritical");
}

function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

function updateRiskChart(dataset, RS) {
  if (!riskChart) {
    console.warn('riskChart is not initialized');
    return; // Verhindert das Fortsetzen der Funktion, wenn riskChart nicht existiert
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

function getRiskThresholds(selectedConfigName) {
  return riskConfigurations[selectedConfigName] || riskConfigurations['Default Configuration'];
}

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

  let I_class;
  if (I_score >= levels.LOW[0] && I_score < levels.LOW[1]) I_class = "LOW";
  else if (I_score >= levels.MEDIUM[0] && I_score < levels.MEDIUM[1]) I_class = "MEDIUM";
  else if (I_score >= levels.HIGH[0] && I_score <= levels.HIGH[1]) I_class = "HIGH";

  console.log(`Config: ${selectedConfig}`);
  console.log(`L_score: ${L_score}, IS_score: ${I_score}`);
  console.log(`L_class: ${L_class}, I_class: ${I_class}`);

  const RS = getCriticaly(L_class, I_class);
  console.log(`Ergebnis: ${RS}`);

  if (testMode) {
    return { L_class, I_class, RS };
  }

  $(".RS").text(RS);
  $(".RS").attr("class", `RS class${RS.charAt(0).toUpperCase() + RS.slice(1).toLowerCase()}`);
  updateRiskChart([], RS);
}

const isTestEnvironment = typeof window !== 'undefined' && window.IS_TEST_ENV;

if (!isTestEnvironment) {
  document.addEventListener('DOMContentLoaded', () => {
    const configSelect = document.getElementById('configurationSelect');
    if (configSelect) {
      configSelect.addEventListener('change', () => {
        calculate();
        updateRiskLevelMapping();
      });
    }
  });
}

window.calculate = calculate;
window.updateRiskLevelMapping = updateRiskLevelMapping
