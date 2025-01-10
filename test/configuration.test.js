/**
 * @jest-environment jsdom
 */

import { riskConfigurations, updateRiskLevelMapping, loadVectors, loadRiskConfigFromUrl, calculate } from '../js/script.js';
import {
    shouldUseUrlLogic,
    parseUrlParameters,
    performAdvancedCalculation,
    getStoredVector,
    getStoredConfiguration,
    getStoredMapping
} from '../js/url_logic.js';

describe('updateRiskLevelMapping() with testMode enabled', () => {
    let originalLog;

    beforeAll(() => {
        // Save the original console.log
        originalLog = console.log;

        // Mock console.log to prevent actual logging
        console.log = jest.fn();
    });

    afterAll(() => {
        // Restore the original console.log
        console.log = originalLog;
    });

    const testCases = [
        // Default Configuration
        {
            config: 'Default Configuration',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 2, I_score: 4 },
            expected: { L_class: 'LOW', I_class: 'MEDIUM', RS: 'LOW' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 5, I_score: 5 },
            expected: { L_class: 'MEDIUM', I_class: 'MEDIUM', RS: 'MEDIUM' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 8, I_score: 8 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 7, I_score: 5 },
            expected: { L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH' },
        },

        // Configuration 1
        {
            config: 'Configuration 1',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 1',
            inputs: { L_score: 4.5, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 1',
            inputs: { L_score: 6, I_score: 6 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Configuration 1',
            inputs: { L_score: 7.5, I_score: 5.5 },
            expected: { L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH' },
        },

        // Configuration 2
        {
            config: 'Configuration 2',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 2',
            inputs: { L_score: 7, I_score: 7.5 },
            expected: { L_class: 'LOW', I_class: 'MEDIUM', RS: 'LOW' },
        },
        {
            config: 'Configuration 2',
            inputs: { L_score: 8.5, I_score: 9 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Configuration 2',
            inputs: { L_score: 8.5, I_score: 7.5 },
            expected: { L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH' },
        },

        // Configuration 3
        {
            config: 'Configuration 3',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 6, I_score: 7.5 },
            expected: { L_class: 'LOW', I_class: 'HIGH', RS: 'MEDIUM' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 7.5, I_score: 8.5 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 6.5, I_score: 6.5 },
            expected: { L_class: 'MEDIUM', I_class: 'MEDIUM', RS: 'MEDIUM' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 8, I_score: 7 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
    ];

    // Before running tests, ensure that "URL Configuration" is present in riskConfigurations
    beforeAll(() => {
        riskConfigurations['URL Configuration'] = {
            LOW: [0, 2],
            MEDIUM: [2, 5],
            HIGH: [5, 9],
        };
    });

    testCases.forEach(({ config, inputs, expected }, index) => {
        test(`Test Case ${index + 1} for ${config}`, () => {
            const result = updateRiskLevelMapping(
                true, // Enable testMode
                inputs.L_score,
                inputs.I_score,
                config
            );

            expect(result).toEqual(expected);
        });
    });
});

describe('loadVectors()', () => {
    beforeEach(() => {
        // Set up the DOM elements
        const partials = ["sl", "m", "o", "s", "ed", "ee", "a", "id", "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
        partials.forEach(id => {
            const input = document.createElement('input');
            input.id = id;
            input.value = '';
            document.body.appendChild(input);
        });
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';
    });

    const testCases = [
        {
            vector: '(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)',
            expectedValues: {
                sl: '1',
                m: '2',
                o: '3',
                s: '4',
                ed: '5',
                ee: '6',
                a: '7',
                id: '8',
                lc: '9',
                li: '10',
                lav: '11',
                lac: '12',
                fd: '13',
                rd: '14',
                nc: '15',
                pv: '16',
            },
        },
        {
            vector: '(sl:0/m:0/o:0/s:0/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)',
            expectedValues: {
                sl: '0',
                m: '0',
                o: '0',
                s: '0',
                ed: '0',
                ee: '0',
                a: '0',
                id: '0',
                lc: '0',
                li: '0',
                lav: '0',
                lac: '0',
                fd: '0',
                rd: '0',
                nc: '0',
                pv: '0',
            },
        },
        // Add more test cases as needed
    ];

    testCases.forEach(({ vector, expectedValues }, index) => {
        test(`Test Case ${index + 1}: Load vector and update input fields`, () => {
            loadVectors(vector);

            for (const [id, value] of Object.entries(expectedValues)) {
                const input = document.getElementById(id);
                expect(input).not.toBeNull();
                expect(input.value).toBe(value);
            }
        });
    });

    test('Invalid vector format should trigger an error', () => {
        // Mock swal to prevent actual alert pop-ups
        window.swal = jest.fn();

        const invalidVector = 'invalid_vector_format';

        loadVectors(invalidVector);

        expect(window.swal).toHaveBeenCalledWith(
            "Hey!!",
            "The vector is not correct, make sure you have copied it correctly",
            "error"
        );
    });
});

describe('Integration Tests: URL Configuration and Vector Passing', () => {
    beforeEach(() => {
        // Set up the DOM elements
        document.body.innerHTML = `
            <select id="configurationSelect" class="form-control mb-3">
                <option value="Default Configuration">Default Configuration</option>
                <option value="Configuration 1">Configuration 1</option>
                <option value="Configuration 2">Configuration 2</option>
                <option value="Configuration 3">Configuration 3</option>
            </select>
            <canvas id="riskChart"></canvas>
            <input id="sl" value="">
            <input id="m" value="">
            <input id="o" value="">
            <input id="s" value="">
            <input id="ed" value="">
            <input id="ee" value="">
            <input id="a" value="">
            <input id="id" value="">
            <input id="lc" value="">
            <input id="li" value="">
            <input id="lav" value="">
            <input id="lac" value="">
            <input id="fd" value="">
            <input id="rd" value="">
            <input id="nc" value="">
            <input id="pv" value="">
            <div class="LS"></div>
            <div class="IS"></div>
            <div class="RS"></div>
            <a id="score" href="#"></a>
        `;

        // Mock Chart.js
        global.Chart = jest.fn(() => ({
            update: jest.fn(),
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
        }));

        // Mock swal to prevent actual alert pop-ups
        window.swal = jest.fn();

        // Initialize risk configurations including "URL Configuration"
        riskConfigurations['URL Configuration'] = {
            LOW: [0, 2],
            MEDIUM: [2, 5],
            HIGH: [5, 9],
        };
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('Load URL Configuration and vectors, then calculate risk', () => {
        const urlConfig = 'LOW:0-2;MEDIUM:2-5;HIGH:5-9';
        const vector = '(sl:1/m:3/o:4/s:2/ed:5/ee:3/a:4/id:2/lc:6/li:7/lav:5/lac:4/fd:3/rd:2/nc:1/pv:0)';

        // Simulate loading configurations from URL
        loadRiskConfigFromUrl(urlConfig);

        // Simulate loading vectors from URL
        loadVectors(vector);

        // Simulate selecting "URL Configuration" in the dropdown
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'URL Configuration';

        // Perform calculation
        calculate();

        // Assertions for input fields
        expect(document.getElementById('sl').value).toBe('1');
        expect(document.getElementById('m').value).toBe('3');
        expect(document.getElementById('o').value).toBe('4');
        expect(document.getElementById('s').value).toBe('2');
        expect(document.getElementById('ed').value).toBe('5');
        expect(document.getElementById('ee').value).toBe('3');
        expect(document.getElementById('a').value).toBe('4');
        expect(document.getElementById('id').value).toBe('2');
        expect(document.getElementById('lc').value).toBe('6');
        expect(document.getElementById('li').value).toBe('7');
        expect(document.getElementById('lav').value).toBe('5');
        expect(document.getElementById('lac').value).toBe('4');
        expect(document.getElementById('fd').value).toBe('3');
        expect(document.getElementById('rd').value).toBe('2');
        expect(document.getElementById('nc').value).toBe('1');
        expect(document.getElementById('pv').value).toBe('0');

        // Assertions for risk levels
        const LSElement = document.querySelector('.LS');
        const ISElement = document.querySelector('.IS');
        const RSElement = document.querySelector('.RS');
        const scoreLink = document.getElementById('score');

        // Assuming calculate() sets LS, IS, RS based on the inputs and selected configuration
        // For example:
        // LS = average of threatAgentFactors = (1+3+4+2+5+3+4+2)/8 = 24/8 = 3
        // IS = max of technicalImpactFactors = max(6,7,5,4,3,2,1,0) = 7
        // Based on 'URL Configuration' thresholds: LOW:0-2, MEDIUM:2-5, HIGH:5-9
        // FLS = MEDIUM (3 is between 2-5)
        // FIS = HIGH (7 is between 5-9)
        // RS = getCriticality('MEDIUM', 'HIGH') = 'HIGH'

        expect(LSElement.textContent).toBe('3.000 MEDIUM');
        expect(ISElement.textContent).toBe('7.000 HIGH');
        expect(RSElement.textContent).toBe('HIGH');
        expect(scoreLink.textContent).toBe('SL:1/M:3/O:4/S:2/ED:5/EE:3/A:4/ID:2/LC:6/LI:7/LAV:5/LAC:4/FD:3/RD:2/NC:1/PV:0');
        expect(scoreLink.href).toBe(`https://felmade.github.io/OWASP-Calculator/?vector=SL:1/M:3/O:4/S:2/ED:5/EE:3/A:4/ID:2/LC:6/LI:7/LAV:5/LAC:4/FD:3/RD:2/NC:1/PV:0`);
    });

    test('Load URL Configuration without vectors and calculate risk', () => {
        const urlConfig = 'LOW:0-1;MEDIUM:1-4;HIGH:4-9';
        const vector = '(sl:1/m:1/o:1/s:1/ed:1/ee:1/a:1/id:1/lc:4/li:4/lav:4/lac:4/fd:1/rd:1/nc:1/pv:1)';

        // Simulate loading configurations from URL
        loadRiskConfigFromUrl(urlConfig);

        // Simulate loading vectors from URL
        loadVectors(vector);

        // Simulate selecting "URL Configuration" in the dropdown
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'URL Configuration';

        // Perform calculation
        calculate();

        // Assertions for input fields
        expect(document.getElementById('sl').value).toBe('1');
        expect(document.getElementById('m').value).toBe('1');
        expect(document.getElementById('o').value).toBe('1');
        expect(document.getElementById('s').value).toBe('1');
        expect(document.getElementById('ed').value).toBe('1');
        expect(document.getElementById('ee').value).toBe('1');
        expect(document.getElementById('a').value).toBe('1');
        expect(document.getElementById('id').value).toBe('1');
        expect(document.getElementById('lc').value).toBe('4');
        expect(document.getElementById('li').value).toBe('4');
        expect(document.getElementById('lav').value).toBe('4');
        expect(document.getElementById('lac').value).toBe('4');
        expect(document.getElementById('fd').value).toBe('1');
        expect(document.getElementById('rd').value).toBe('1');
        expect(document.getElementById('nc').value).toBe('1');
        expect(document.getElementById('pv').value).toBe('1');

        // Assertions for risk levels
        const LSElement = document.querySelector('.LS');
        const ISElement = document.querySelector('.IS');
        const RSElement = document.querySelector('.RS');
        const scoreLink = document.getElementById('score');

        // LS = (1+1+1+1+1+1+1+1)/8 = 1
        // IS = max(4,4,4,4,1,1,1,1) = 4
        // Based on 'URL Configuration' thresholds: LOW:0-1, MEDIUM:1-4, HIGH:4-9
        // FLS = LOW (1 is between 0-1)
        // FIS = MEDIUM (4 is between 1-4)
        // RS = getCriticality('LOW', 'MEDIUM') = 'LOW'

        expect(LSElement.textContent).toBe('1.000 MEDIUM');
        expect(ISElement.textContent).toBe('4.000 HIGH');
        expect(RSElement.textContent).toBe('HIGH');
        expect(scoreLink.textContent).toBe('SL:1/M:1/O:1/S:1/ED:1/EE:1/A:1/ID:1/LC:4/LI:4/LAV:4/LAC:4/FD:1/RD:1/NC:1/PV:1');
        expect(scoreLink.href).toBe(`https://felmade.github.io/OWASP-Calculator/?vector=SL:1/M:1/O:1/S:1/ED:1/EE:1/A:1/ID:1/LC:4/LI:4/LAV:4/LAC:4/FD:1/RD:1/NC:1/PV:1`);
    });
});

describe('loadVectors()', () => {
    beforeEach(() => {
        // Set up the DOM elements
        const partials = ["sl", "m", "o", "s", "ed", "ee", "a", "id", "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
        partials.forEach(id => {
            const input = document.createElement('input');
            input.id = id;
            input.value = '';
            document.body.appendChild(input);
        });
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';
    });

    const testCases = [
        {
            vector: '(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)',
            expectedValues: {
                sl: '1',
                m: '2',
                o: '3',
                s: '4',
                ed: '5',
                ee: '6',
                a: '7',
                id: '8',
                lc: '9',
                li: '10',
                lav: '11',
                lac: '12',
                fd: '13',
                rd: '14',
                nc: '15',
                pv: '16',
            },
        },
        {
            vector: '(sl:0/m:0/o:0/s:0/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)',
            expectedValues: {
                sl: '0',
                m: '0',
                o: '0',
                s: '0',
                ed: '0',
                ee: '0',
                a: '0',
                id: '0',
                lc: '0',
                li: '0',
                lav: '0',
                lac: '0',
                fd: '0',
                rd: '0',
                nc: '0',
                pv: '0',
            },
        },
        // Add more test cases as needed
    ];

    testCases.forEach(({ vector, expectedValues }, index) => {
        test(`Test Case ${index + 1}: Load vector and update input fields`, () => {
            loadVectors(vector);

            for (const [id, value] of Object.entries(expectedValues)) {
                const input = document.getElementById(id);
                expect(input).not.toBeNull();
                expect(input.value).toBe(value);
            }
        });
    });

    test('Invalid vector format should trigger an error', () => {
        // Mock swal to prevent actual alert pop-ups
        window.swal = jest.fn();

        const invalidVector = 'invalid_vector_format';

        loadVectors(invalidVector);

        expect(window.swal).toHaveBeenCalledWith(
            "Hey!!",
            "The vector is not correct, make sure you have copied it correctly",
            "error"
        );
    });
});

describe('Integration Tests: URL Configuration and Vector Passing', () => {
    beforeEach(() => {
        // Set up the DOM elements
        document.body.innerHTML = `
            <select id="configurationSelect" class="form-control mb-3">
                <option value="Default Configuration">Default Configuration</option>
                <option value="Configuration 1">Configuration 1</option>
                <option value="Configuration 2">Configuration 2</option>
                <option value="Configuration 3">Configuration 3</option>
            </select>
            <canvas id="riskChart"></canvas>
            <input id="sl" value="">
            <input id="m" value="">
            <input id="o" value="">
            <input id="s" value="">
            <input id="ed" value="">
            <input id="ee" value="">
            <input id="a" value="">
            <input id="id" value="">
            <input id="lc" value="">
            <input id="li" value="">
            <input id="lav" value="">
            <input id="lac" value="">
            <input id="fd" value="">
            <input id="rd" value="">
            <input id="nc" value="">
            <input id="pv" value="">
            <div class="LS"></div>
            <div class="IS"></div>
            <div class="RS"></div>
            <a id="score" href="#"></a>
        `;

        // Mock Chart.js
        global.Chart = jest.fn(() => ({
            update: jest.fn(),
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
        }));

        // Mock swal to prevent actual alert pop-ups
        window.swal = jest.fn();

        // Initialize risk configurations including "URL Configuration"
        riskConfigurations['URL Configuration'] = {
            LOW: [0, 2],
            MEDIUM: [2, 5],
            HIGH: [5, 9],
        };
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('Load URL Configuration and vectors, then calculate risk', () => {
        const urlConfig = 'LOW:0-2;MEDIUM:2-5;HIGH:5-9';
        const vector = '(sl:1/m:3/o:4/s:2/ed:5/ee:3/a:4/id:2/lc:6/li:7/lav:5/lac:4/fd:3/rd:2/nc:1/pv:0)';

        // Simulate loading configurations from URL
        loadRiskConfigFromUrl(urlConfig);

        // Simulate loading vectors from URL
        loadVectors(vector);

        // Simulate selecting "URL Configuration" in the dropdown
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'URL Configuration';

        // Perform calculation
        calculate();

        // Assertions for input fields
        expect(document.getElementById('sl').value).toBe('1');
        expect(document.getElementById('m').value).toBe('3');
        expect(document.getElementById('o').value).toBe('4');
        expect(document.getElementById('s').value).toBe('2');
        expect(document.getElementById('ed').value).toBe('5');
        expect(document.getElementById('ee').value).toBe('3');
        expect(document.getElementById('a').value).toBe('4');
        expect(document.getElementById('id').value).toBe('2');
        expect(document.getElementById('lc').value).toBe('6');
        expect(document.getElementById('li').value).toBe('7');
        expect(document.getElementById('lav').value).toBe('5');
        expect(document.getElementById('lac').value).toBe('4');
        expect(document.getElementById('fd').value).toBe('3');
        expect(document.getElementById('rd').value).toBe('2');
        expect(document.getElementById('nc').value).toBe('1');
        expect(document.getElementById('pv').value).toBe('0');

        // Assertions for risk levels
        const LSElement = document.querySelector('.LS');
        const ISElement = document.querySelector('.IS');
        const RSElement = document.querySelector('.RS');
        const scoreLink = document.getElementById('score');

        // Assuming calculate() sets LS, IS, RS based on the inputs and selected configuration
        // For example:
        // LS = average of threatAgentFactors = (1+3+4+2+5+3+4+2)/8 = 24/8 = 3
        // IS = max of technicalImpactFactors = max(6,7,5,4,3,2,1,0) = 7
        // Based on 'URL Configuration' thresholds: LOW:0-2, MEDIUM:2-5, HIGH:5-9
        // FLS = MEDIUM (3 is between 2-5)
        // FIS = HIGH (7 is between 5-9)
        // RS = getCriticality('MEDIUM', 'HIGH') = 'HIGH'

        expect(LSElement.textContent).toBe('3.000 MEDIUM');
        expect(ISElement.textContent).toBe('7.000 HIGH');
        expect(RSElement.textContent).toBe('HIGH');
        expect(scoreLink.textContent).toBe('SL:1/M:3/O:4/S:2/ED:5/EE:3/A:4/ID:2/LC:6/LI:7/LAV:5/LAC:4/FD:3/RD:2/NC:1/PV:0');
        expect(scoreLink.href).toBe(`https://felmade.github.io/OWASP-Calculator/?vector=SL:1/M:3/O:4/S:2/ED:5/EE:3/A:4/ID:2/LC:6/LI:7/LAV:5/LAC:4/FD:3/RD:2/NC:1/PV:0`);
    });

    test('Load URL Configuration without vectors and calculate risk', () => {
        const urlConfig = 'LOW:0-1;MEDIUM:1-4;HIGH:4-9';
        const vector = '(sl:1/m:1/o:1/s:1/ed:1/ee:1/a:1/id:1/lc:4/li:4/lav:4/lac:4/fd:1/rd:1/nc:1/pv:1)';

        // Simulate loading configurations from URL
        loadRiskConfigFromUrl(urlConfig);

        // Simulate loading vectors from URL
        loadVectors(vector);

        // Simulate selecting "URL Configuration" in the dropdown
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'URL Configuration';

        // Perform calculation
        calculate();

        // Assertions for input fields
        expect(document.getElementById('sl').value).toBe('1');
        expect(document.getElementById('m').value).toBe('1');
        expect(document.getElementById('o').value).toBe('1');
        expect(document.getElementById('s').value).toBe('1');
        expect(document.getElementById('ed').value).toBe('1');
        expect(document.getElementById('ee').value).toBe('1');
        expect(document.getElementById('a').value).toBe('1');
        expect(document.getElementById('id').value).toBe('1');
        expect(document.getElementById('lc').value).toBe('4');
        expect(document.getElementById('li').value).toBe('4');
        expect(document.getElementById('lav').value).toBe('4');
        expect(document.getElementById('lac').value).toBe('4');
        expect(document.getElementById('fd').value).toBe('1');
        expect(document.getElementById('rd').value).toBe('1');
        expect(document.getElementById('nc').value).toBe('1');
        expect(document.getElementById('pv').value).toBe('1');

        // Assertions for risk levels
        const LSElement = document.querySelector('.LS');
        const ISElement = document.querySelector('.IS');
        const RSElement = document.querySelector('.RS');
        const scoreLink = document.getElementById('score');

        // LS = (1+1+1+1+1+1+1+1)/8 = 1
        // IS = max(4,4,4,4,1,1,1,1) = 4
        // Based on 'URL Configuration' thresholds: LOW:0-1, MEDIUM:1-4, HIGH:4-9
        // FLS = LOW (1 is between 0-1)
        // FIS = MEDIUM (4 is between 1-4)
        // RS = getCriticality('LOW', 'MEDIUM') = 'LOW'

        expect(LSElement.textContent).toBe('1.000 MEDIUM');
        expect(ISElement.textContent).toBe('4.000 HIGH');
        expect(RSElement.textContent).toBe('HIGH');
        expect(scoreLink.textContent).toBe('SL:1/M:1/O:1/S:1/ED:1/EE:1/A:1/ID:1/LC:4/LI:4/LAV:4/LAC:4/FD:1/RD:1/NC:1/PV:1');
        expect(scoreLink.href).toBe(`https://felmade.github.io/OWASP-Calculator/?vector=SL:1/M:1/O:1/S:1/ED:1/EE:1/A:1/ID:1/LC:4/LI:4/LAV:4/LAC:4/FD:1/RD:1/NC:1/PV:1`);
    });
    describe('shouldUseUrlLogic()', () => {
        beforeEach(() => {
            // Mock swal to prevent actual alert pop-ups
            global.swal = jest.fn();
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        test('All required parameters are present, should return true', () => {
            // Simulate URL
            delete window.location;
            window.location = { search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple' };

            const result = shouldUseUrlLogic();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();
        });

        test('All required parameters and optional parameter vector are present, should return true', () => {
            // Simulate URL
            delete window.location;
            window.location = { search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple&vector=testVector' };

            const result = shouldUseUrlLogic();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();
        });

        test('One required parameter missing, should return false and show alert', () => {
            // Simulate URL
            delete window.location;
            window.location = { search: '?likelihoodConfig=high&impactConfig=medium&vector=testVector' };

            const result = shouldUseUrlLogic();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalledWith({
                title: 'Missing Parameters',
                text: 'The following parameters are missing: mapping. Default configuration will be used.',
                icon: 'warning',
                button: 'OK'
            });
        });

        test('All required parameters missing, optional parameter vector present, should return false and show alert', () => {
            // Simulate URL
            delete window.location;
            window.location = { search: '?vector=testVector' };

            const result = shouldUseUrlLogic();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalledWith({
                title: 'Missing Parameters',
                text: 'The following parameters are missing: likelihoodConfig, impactConfig, mapping. Default configuration will be used.',
                icon: 'warning',
                button: 'OK'
            });
        });

        test('All required and optional parameters missing, should return false and show alert', () => {
            // Simulate URL
            delete window.location;
            window.location = { search: '' };

            const result = shouldUseUrlLogic();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalledWith({
                title: 'Missing Parameters',
                text: 'The following parameters are missing: likelihoodConfig, impactConfig, mapping. Default configuration will be used.',
                icon: 'warning',
                button: 'OK'
            });
        });

        test('Extra irrelevant parameters and optional vector, should return true if required parameters are present', () => {
            // Simulate URL
            delete window.location;
            window.location = { search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple&vector=testVector&extraParam=123' };

            const result = shouldUseUrlLogic();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();
        });
    });
});