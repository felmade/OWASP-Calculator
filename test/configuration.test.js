/**
 * @jest-environment jsdom
 */

import {
    riskConfigurations,
    updateRiskLevelMapping,
    loadVectors,
    loadRiskConfigFromUrl,
    calculate
} from '../js/script.js';
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
            inputs: {L_score: 2, I_score: 2},
            expected: {L_class: 'LOW', I_class: 'LOW', RS: 'NOTE'},
        },
        {
            config: 'Default Configuration',
            inputs: {L_score: 2, I_score: 4},
            expected: {L_class: 'LOW', I_class: 'MEDIUM', RS: 'LOW'},
        },
        {
            config: 'Default Configuration',
            inputs: {L_score: 5, I_score: 5},
            expected: {L_class: 'MEDIUM', I_class: 'MEDIUM', RS: 'MEDIUM'},
        },
        {
            config: 'Default Configuration',
            inputs: {L_score: 8, I_score: 8},
            expected: {L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL'},
        },
        {
            config: 'Default Configuration',
            inputs: {L_score: 7, I_score: 5},
            expected: {L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH'},
        },

        // Configuration 1
        {
            config: 'Configuration 1',
            inputs: {L_score: 2, I_score: 2},
            expected: {L_class: 'LOW', I_class: 'LOW', RS: 'NOTE'},
        },
        {
            config: 'Configuration 1',
            inputs: {L_score: 4.5, I_score: 2},
            expected: {L_class: 'LOW', I_class: 'LOW', RS: 'NOTE'},
        },
        {
            config: 'Configuration 1',
            inputs: {L_score: 6, I_score: 6},
            expected: {L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL'},
        },
        {
            config: 'Configuration 1',
            inputs: {L_score: 7.5, I_score: 5.5},
            expected: {L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH'},
        },

        // Configuration 2
        {
            config: 'Configuration 2',
            inputs: {L_score: 2, I_score: 2},
            expected: {L_class: 'LOW', I_class: 'LOW', RS: 'NOTE'},
        },
        {
            config: 'Configuration 2',
            inputs: {L_score: 7, I_score: 7.5},
            expected: {L_class: 'LOW', I_class: 'MEDIUM', RS: 'LOW'},
        },
        {
            config: 'Configuration 2',
            inputs: {L_score: 8.5, I_score: 9},
            expected: {L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL'},
        },
        {
            config: 'Configuration 2',
            inputs: {L_score: 8.5, I_score: 7.5},
            expected: {L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH'},
        },

        // Configuration 3
        {
            config: 'Configuration 3',
            inputs: {L_score: 2, I_score: 2},
            expected: {L_class: 'LOW', I_class: 'LOW', RS: 'NOTE'},
        },
        {
            config: 'Configuration 3',
            inputs: {L_score: 6, I_score: 7.5},
            expected: {L_class: 'LOW', I_class: 'HIGH', RS: 'MEDIUM'},
        },
        {
            config: 'Configuration 3',
            inputs: {L_score: 7.5, I_score: 8.5},
            expected: {L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL'},
        },
        {
            config: 'Configuration 3',
            inputs: {L_score: 6.5, I_score: 6.5},
            expected: {L_class: 'MEDIUM', I_class: 'MEDIUM', RS: 'MEDIUM'},
        },
        {
            config: 'Configuration 3',
            inputs: {L_score: 8, I_score: 7},
            expected: {L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL'},
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

    testCases.forEach(({config, inputs, expected}, index) => {
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

    testCases.forEach(({vector, expectedValues}, index) => {
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

    testCases.forEach(({vector, expectedValues}, index) => {
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

describe('shouldUseUrlLogic()', () => {
    beforeEach(() => {
        // Mock swal to prevent actual alert pop-ups
        global.swal = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('No parameters in the URL, should return true and no alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: ''};

        const result = shouldUseUrlLogic();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });

    test('All required parameters are present, should return true and no alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple'};

        const result = shouldUseUrlLogic();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });

    test('One required parameter is missing, should return false and show alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: '?likelihoodConfig=high&impactConfig=medium'};

        const result = shouldUseUrlLogic();
        expect(result).toBe(false);
        expect(global.swal).toHaveBeenCalledWith({
            title: "Missing Parameters",
            text: "The following parameters are missing: mapping. Default configuration will be used.",
            icon: "warning",
            button: "OK"
        });
    });

    test('Two required parameters are missing, should return false and show alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: '?likelihoodConfig=high'};

        const result = shouldUseUrlLogic();
        expect(result).toBe(false);
        expect(global.swal).toHaveBeenCalledWith({
            title: "Missing Parameters",
            text: "The following parameters are missing: impactConfig, mapping. Default configuration will be used.",
            icon: "warning",
            button: "OK"
        });
    });

    test('Extra irrelevant parameters and no required parameters, should return true and no alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: '?extraParam=123&anotherParam=456'};

        const result = shouldUseUrlLogic();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });

    test('One required parameter missing and optional parameter present, should return false and show alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: '?likelihoodConfig=high&vector=testVector'};

        const result = shouldUseUrlLogic();
        expect(result).toBe(false);
        expect(global.swal).toHaveBeenCalledWith({
            title: "Missing Parameters",
            text: "The following parameters are missing: impactConfig, mapping. Default configuration will be used.",
            icon: "warning",
            button: "OK"
        });
    });

    test('All required parameters and optional parameter are present, should return true and no alert', () => {
        // Simulate URL
        delete window.location;
        window.location = {search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple&vector=testVector'};

        const result = shouldUseUrlLogic();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });
});