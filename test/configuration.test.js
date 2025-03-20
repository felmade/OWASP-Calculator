/**
 * @jest-environment jsdom
 */

import {
    riskConfigurations,
    updateRiskLevelMapping,
    loadVectors,
    calculate,
    addCustomConfigurationOption
} from '../js/script.js';

import {
    shouldUseUrlLogic,
    parseUrlParameters,
    performAdvancedCalculation,
    getStoredVector,
    getStoredConfiguration,
    getStoredMapping,
    likelihoodConfigObj,
    impactConfigObj,
    mappingObj,
    storedVector,
    VECTOR_KEYS, updateVectorDisplay, updateCompleteURL
} from '../js/url_logic.js';

import {config} from '../config.js';

import {
    createMappingDialog,
    createMappingTable,
    editMappingConfiguration, initMappingMatrixGenerator,
    mappingNameExists,
    refreshSavedMappingsList,
    updateUrlAndProcess,
    validateDialogInputs
} from '../js/customMappingButton.js'

import * as cookieUtils from "../js/cookie_utils.js";

beforeAll(() => {
    if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = function () {
            this.setAttribute('open', '');
        };
    }
});

/**
 * --------------------------------------
 * Extended Matchers for Jest.
 * Example: "toBeEmpty" to check if an object has no own keys.
 * --------------------------------------
 */
expect.extend({
    toBeEmpty(received) {
        const pass = Object.keys(received).length === 0;
        if (pass) {
            return {
                message: () => `Expected object not to be empty, but it was empty.`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected object to be empty, but it was not.`,
                pass: false,
            };
        }
    },
});

/**
 * --------------------------------------
 * TEST SUITE: updateRiskLevelMapping()
 * --------------------------------------
 */
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

    // Various test cases for L_score, I_score => expected (L_class, I_class, RS)
    const testCases = [
        // --- Default Configuration ---
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

        // --- Configuration 1 ---
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

        // --- Configuration 2 ---
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

        // --- Configuration 3 ---
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

    // Before all tests => ensure "URL Configuration" exists
    beforeAll(() => {
        riskConfigurations['Custom Configuration'] = {
            LOW: [0, 2],
            MEDIUM: [2, 5],
            HIGH: [5, 9],
        };
    });

    // For each test case => call updateRiskLevelMapping(testMode=true, ...)
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

/**
 * --------------------------------------
 * TEST SUITE: loadVectors()
 * --------------------------------------
 */
describe('loadVectors()', () => {
    beforeEach(() => {
        // Set up DOM: 16 input fields
        const partials = [
            "sl", "m", "o", "s", "ed", "ee", "a", "id",
            "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
        ];
        partials.forEach(id => {
            const input = document.createElement('input');
            input.id = id;
            input.value = '';
            document.body.appendChild(input);
        });
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
    });

    const testCases = [
        {
            vector: '(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)',
            expectedValues: {
                sl: '1', m: '2', o: '3', s: '4', ed: '5', ee: '6',
                a: '7', id: '8', lc: '9', li: '10', lav: '11', lac: '12',
                fd: '13', rd: '14', nc: '15', pv: '16'
            },
        },
        {
            vector: '(sl:0/m:0/o:0/s:0/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)',
            expectedValues: {
                sl: '0', m: '0', o: '0', s: '0', ed: '0', ee: '0',
                a: '0', id: '0', lc: '0', li: '0', lav: '0', lac: '0',
                fd: '0', rd: '0', nc: '0', pv: '0'
            },
        },
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

    test('Invalid vector format => error => swal with redirect after confirmation', () => {
        window.swal = jest.fn(() =>
            Promise.resolve(true) // Simuliere, dass der Benutzer auf "OK" klickt
        );

        // Mock window.location
        delete window.location;
        window.location = {
            origin: 'http://example.com',
            pathname: '/path',
            href: '',
        };

        const invalidVector = 'invalid_vector_format';

        loadVectors(invalidVector);

        expect(window.swal).toHaveBeenCalledWith({
            title: "Invalid Vector Format",
            text: "The provided vector format is invalid. Please ensure it is copied correctly and follows the expected format.",
            icon: "error",
            button: "OK",
        });

        return window.swal().then(() => {
            const expectedUrl =
                window.location.origin +
                window.location.pathname +
                "?vector=(sl:1/m:1/o:0/s:2/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)";
            expect(window.location.href).toBe(expectedUrl);
        });
    });
});

/**
 * --------------------------------------
 * TEST SUITE: loadVectors() (second block)
 * --------------------------------------
 */
describe('loadVectors()', () => {
    beforeEach(() => {
        const partials = [
            "sl", "m", "o", "s", "ed", "ee", "a", "id",
            "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
        ];
        partials.forEach(id => {
            const input = document.createElement('input');
            input.id = id;
            input.value = '';
            document.body.appendChild(input);
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    const testCases = [
        {
            vector: '(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)',
            expectedValues: {
                sl: '1', m: '2', o: '3', s: '4', ed: '5', ee: '6',
                a: '7', id: '8', lc: '9', li: '10', lav: '11', lac: '12',
                fd: '13', rd: '14', nc: '15', pv: '16'
            },
        },
        {
            vector: '(sl:0/m:0/o:0/s:0/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)',
            expectedValues: {
                sl: '0', m: '0', o: '0', s: '0', ed: '0', ee: '0',
                a: '0', id: '0', lc: '0', li: '0', lav: '0', lac: '0',
                fd: '0', rd: '0', nc: '0', pv: '0'
            },
        },
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

    test('Invalid vector format => error => swal with redirect after confirmation', () => {
        window.swal = jest.fn(() =>
            Promise.resolve(true)
        );

        const invalidVector = 'invalid_vector_format';

        // Mock window.location
        delete window.location;
        window.location = {
            origin: 'http://example.com',
            pathname: '/path',
            href: '',
        };

        loadVectors(invalidVector);

        expect(window.swal).toHaveBeenCalledWith({
            title: "Invalid Vector Format",
            text: "The provided vector format is invalid. Please ensure it is copied correctly and follows the expected format.",
            icon: "error",
            button: "OK",
        });

        return window.swal().then(() => {
            const expectedUrl =
                window.location.origin +
                window.location.pathname +
                "?vector=(sl:1/m:1/o:0/s:2/ed:0/ee:0/a:0/id:0/lc:0/li:0/lav:0/lac:0/fd:0/rd:0/nc:0/pv:0)";
            expect(window.location.href).toBe(expectedUrl);
        });
    });
});

/**
 * --------------------------------------
 * TEST SUITE: shouldUseUrlLogic()
 * --------------------------------------
 */
describe('shouldUseUrlLogic()', () => {
    beforeEach(() => {
        // Mock swal
        global.swal = jest.fn(() =>
            Promise.resolve(true));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('No parameters => true => no alert', () => {
        delete window.location;
        window.location = {search: ''};
        const result = shouldUseUrlLogic();
        expect(result).toBe(false);
        expect(global.swal).not.toHaveBeenCalled();
    });

    test('All required => true => no alert', () => {
        delete window.location;
        window.location = {search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple'};
        const result = shouldUseUrlLogic();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });

    test('One param missing => false => alert', () => {
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

    test('Two params missing => false => alert', () => {
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

    test('Extra irrelevant params => no required => true => no alert', () => {
        delete window.location;
        window.location = {search: '?extraParam=123&anotherParam=456'};
        const result = shouldUseUrlLogic();
        expect(result).toBe(false);
        expect(global.swal).not.toHaveBeenCalled();
    });

    test('One required missing + optional => false => alert', () => {
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

    test('All required + optional => true => no alert', () => {
        delete window.location;
        window.location = {search: '?likelihoodConfig=high&impactConfig=medium&mapping=simple&vector=testVector'};
        const result = shouldUseUrlLogic();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });
});

/**
 * --------------------------------------
 * TEST SUITE: parseUrlParameters()
 * --------------------------------------
 */
describe('parseUrlParameters()', () => {
    // Helper function: set window.location.search
    function setLocationSearch(searchString) {
        delete window.location;
        window.location = {search: searchString};
    }

    beforeEach(() => {
        global.swal.mockClear();
    });

    // --- TEST 1 ---
    test('No parameters => fail => missing likelihoodConfig => swal => false', () => {
        global.swal = jest.fn(() =>
            Promise.resolve(true)
        );

        // Helper function: Set window.location.search
        const setLocationSearch = (searchString) => {
            delete window.location;
            window.location = {
                search: searchString,
                origin: 'http://example.com',
                pathname: '/path',
                href: '',
            };
        };

        setLocationSearch('');

        const result = parseUrlParameters();

        expect(result).toBe(false);

        expect(global.swal).toHaveBeenCalledWith({
            title: "Parsing Error",
            text: "Parsing failed. Default configuration will be used.",
            icon: "error",
            button: "OK",
        });

        return global.swal().then(() => {
            const expectedUrl =
                window.location.origin +
                window.location.pathname +
                "?vector=(SL:1/M:1/O:0/S:2/ED:0/EE:0/A:0/ID:0/LC:0/LI:0/LAV:0/LAC:0/FD:0/RD:0/NC:0/PV:0)";
            expect(window.location.href).toBe(expectedUrl);
        });
    });


    // --- TEST 2 ---
    test('Only likelihoodConfig => missing impact + mapping => fail', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9');
        const result = parseUrlParameters();
        expect(result).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 3 ---
    test('likelihood + impact, but missing mapping => fail', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9'
            + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 4 ---
    test('3×3 => need 9 mappings, only 8 => fail', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9'
            + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
            + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 5 ---
    test('Valid 2×2 matrix + vector => should succeed => returns true', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
            + '&impactConfig=MINOR:0-5;MAJOR:5-9'
            + '&mapping=Val1,Val2,Val3,Val4'
            + '&vector=(sl:1/m:2)');
        const result = parseUrlParameters();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();

        const vec = getStoredVector();
        expect(vec).not.toBeNull();
        expect(vec.sl).toBe(1);
        expect(vec.m).toBe(2);

        const configObj = getStoredConfiguration();
        expect(configObj).toHaveProperty('likelihood');
        expect(configObj).toHaveProperty('impact');

        const mapObj = getStoredMapping();
        expect(mapObj).toHaveProperty('LOW-MINOR');
        expect(mapObj).toHaveProperty('LOW-MAJOR');
        expect(mapObj).toHaveProperty('HIGH-MINOR');
        expect(mapObj).toHaveProperty('HIGH-MAJOR');
    });

    // --- TEST 6 ---
    test('3×3, no vector => should succeed => storedVector={} => true', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9'
            + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
            + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9');
        const result = parseUrlParameters();
        expect(result).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();

        const vec = getStoredVector();
    });

    // --- TEST 7 ---
    test('Invalid numeric range => fail => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-ABC;HIGH:2-9'
            + '&impactConfig=MINOR:0-4;MAJOR:4-9'
            + '&mapping=Val1,Val2,Val3,Val4');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 8 ---
    test('Empty likelihoodConfig => fail => swal', () => {
        setLocationSearch('?likelihoodConfig='
            + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
            + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 9 ---
    test('Empty impactConfig => fail => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-3;HIGH:3-9'
            + '&impactConfig='
            + '&mapping=Val1,Val2,Val3,Val4');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 10 ---
    test('Empty mapping => fail => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-3;HIGH:3-9'
            + '&impactConfig=MINOR:0-4;MAJOR:4-9'
            + '&mapping=');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 11 ---
    test('More entries than needed => fail => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
            + '&impactConfig=MINOR:0-2;MAJOR:2-9'
            + '&mapping=Val1,Val2,Val3,Val4,Val5');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 12 ---
    test('2×2, mixed case => OK => check mapObj keys', () => {
        setLocationSearch('?likelihoodConfig=LoW:0-2;hIgH:2-9'
            + '&impactConfig=mInOr:0-5;MaJoR:5-9'
            + '&mapping=someVal,AnotherVal,ThirdVal,FourthVal');
        const r = parseUrlParameters();
        expect(r).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();

        const mapObj = getStoredMapping();
        expect(mapObj['LOW-MINOR']).toBe('SOMEVAL');
        expect(mapObj['LOW-MAJOR']).toBe('ANOTHERVAL');
        expect(mapObj['HIGH-MINOR']).toBe('THIRDVAL');
        expect(mapObj['HIGH-MAJOR']).toBe('FOURTHVAL');
    });

    // --- TEST 13 ---
    test('5×3 => 15 mappings => true => no swal', () => {
        setLocationSearch('?likelihoodConfig=VERY_LOW:0-1;LOW:1-3;MEDIUM:3-5;HIGH:5-7;EXTREME:7-9'
            + '&impactConfig=NOTE:0-2;LOW:2-5;HIGH:5-9'
            + '&mapping=V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();
    });

    // --- TEST 14 ---
    test('Invalid vector => parseVector error => false => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
            + '&impactConfig=LOW:0-5;HIGH:5-9'
            + '&mapping=Val1,Val2,Val3,Val4'
            + '&vector=badformat');
        const out = parseUrlParameters();
        expect(out).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 15 ---
    test('Vector with wrong segments => fail => parseVector => Error', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
            + '&impactConfig=LOW:0-5;HIGH:5-9'
            + '&mapping=Val1,Val2,Val3,Val4'
            + '&vector=(sl1/m:2)');
        const out = parseUrlParameters();
        expect(out).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 16 ---
    test('Vector number > 9 => parseVector => Error => false => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
            + '&impactConfig=LOW:0-5;HIGH:5-9'
            + '&mapping=Val1,Val2,Val3,Val4'
            + '&vector=(sl:10/m:2)');
        const rez = parseUrlParameters();
        expect(rez).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 17 ---
    test('Vector unknown key => just warn => returns true => check sl=2', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
            + '&impactConfig=LOW:0-5;HIGH:5-9'
            + '&mapping=Val1,Val2,Val3,Val4'
            + '&vector=(SL:2/xXx:4)');
        const r = parseUrlParameters();
        expect(r).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();

        const vec = getStoredVector();
        expect(vec.sl).toBe(2);
    });

    // --- TEST 18 ---
    test('Likelihood config duplicated => fail => swal', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;LOW:2-4;HIGH:4-9'
            + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
            + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9');
        const ok = parseUrlParameters();
        expect(ok).toBe(false);
        expect(global.swal).toHaveBeenCalled();

        const cfg = getStoredConfiguration();
        expect(cfg.likelihood).toHaveProperty('LOW');
        expect(cfg.likelihood).toHaveProperty('HIGH');
    });

    // --- TEST 19 ---
    test('impactConfig with empty level => fail => parseConfiguration => Error', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5'
            + '&impactConfig=:0-2;HIGH:2-9'
            + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6');
        const out = parseUrlParameters();
        expect(out).toBe(false);
        expect(global.swal).toHaveBeenCalled();
    });

    // --- TEST 20 ---
    test('5×5 Standard => returns true => check extremes', () => {
        setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-4;HIGH:4-6;VERY_HIGH:6-8;EXTREME:8-9'
            + '&impactConfig=LOW:0-2;MEDIUM:2-4;HIGH:4-6;VERY_HIGH:6-8;EXTREME:8-9'
            + '&mapping=V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15,V16,V17,V18,V19,V20,V21,V22,V23,V24,V25');
        const outcome = parseUrlParameters();
        expect(outcome).toBe(true);
        expect(global.swal).not.toHaveBeenCalled();

        const map = getStoredMapping();
        expect(map['LOW-LOW']).toBe('V1');
        expect(map['EXTREME-EXTREME']).toBe('V25');
    });
});

/**
 * --------------------------------------
 * TEST SUITE: performAdvancedCalculation()
 * --------------------------------------
 */
describe('performAdvancedCalculation() tests', () => {
    /**
     * Before each test:
     * - Clear likelihoodConfigObj, impactConfigObj, mappingObj
     * - Clear storedVector (or = {})
     * - Rebuild JS-DOM (LS, IS, RS)
     */
    beforeEach(() => {
        // 1) Clear config objects
        for (const k in likelihoodConfigObj) delete likelihoodConfigObj[k];
        for (const k in impactConfigObj) delete impactConfigObj[k];
        for (const k in mappingObj) delete mappingObj[k];

        // 2) storedVector
        if (storedVector && typeof storedVector === 'object') {
            Object.keys(storedVector).forEach(key => delete storedVector[key]);
        } else {
            storedVector = {};
        }

        // 3) Clean up / new DOM
        document.body.innerHTML = `
        <div class="LS"></div>
        <div class="IS"></div>
        <div class="RS"></div>
      `;
    });

    // ============== TEST 1 ==============
    test('1) No config => return null => console.error', () => {
        const result = performAdvancedCalculation();
        expect(result).toBeNull();
        // One could spy on console.error here to check the error message.
    });

    // ============== TEST 2 ==============
    test('2) Config yes, no mapping => null', () => {
        likelihoodConfigObj['LOW'] = [0, 3];
        impactConfigObj['LOW'] = [0, 3];
        // mappingObj empty
        const result = performAdvancedCalculation();
        expect(result).toBeNull();
    });

    // ============== TEST 3 ==============
    test('3) Everything present, storedVector=null => L=0, I=0 => finalRisk', () => {
        likelihoodConfigObj['LOW'] = [0, 4];
        impactConfigObj['LOW'] = [0, 4];
        mappingObj['LOW-LOW'] = "TEST_RISK";

        // storedVector = null => => fallback => L=I=0
        if (storedVector && typeof storedVector === 'object') {
            // Remove all keys
            Object.keys(storedVector).forEach(k => delete storedVector[k]);
        }

        const result = performAdvancedCalculation();
        expect(result).not.toBeNull();
        expect(result.L_score).toBe(0);
        expect(result.I_score).toBe(0);
        expect(result.L_class).toBe('LOW');
        expect(result.I_class).toBe('LOW');
        expect(result.finalRisk).toBe('TEST_RISK');

        const LSElem = document.querySelector('.LS');
        expect(LSElem.textContent).toContain('0.000 LOW');
        const ISElem = document.querySelector('.IS');
        expect(ISElem.textContent).toContain('0.000 LOW');
        const RSElem = document.querySelector('.RS');
        expect(RSElem.textContent).toBe('TEST_RISK');
    });

    // ============== TEST 4 ==============
    test('4) With vector => average / max => finalRisk', () => {
        likelihoodConfigObj['LOW'] = [0, 2];
        likelihoodConfigObj['MEDIUM'] = [2, 5];
        impactConfigObj['MINOR'] = [0, 3];
        impactConfigObj['MAJOR'] = [3, 9];
        mappingObj['LOW-MINOR'] = 'SAFE';
        mappingObj['LOW-MAJOR'] = 'RISKY';
        mappingObj['MEDIUM-MINOR'] = 'WARNING';
        mappingObj['MEDIUM-MAJOR'] = 'DANGER';

        // Threat keys (8 fields) => average
        storedVector.sl = 1;
        storedVector.m = 3;
        storedVector.o = 5;
        storedVector.s = 0;
        storedVector.ed = 0;
        storedVector.ee = 0;
        storedVector.a = 0;
        storedVector.id = 0;

        // Impact keys (8 fields) => max
        storedVector.lc = 2;
        storedVector.li = 2;
        storedVector.lav = 6;
        storedVector.lac = 1;
        storedVector.fd = 2;
        storedVector.rd = 2;
        storedVector.nc = 4;
        storedVector.pv = 3;

        // => L_score=1.125 => "LOW"; I_score=6 => "MAJOR"
        // => finalRisk="LOW-MAJOR"="RISKY"
        const result = performAdvancedCalculation();
        expect(result.L_score).toBeCloseTo(1.125, 5);
        expect(result.I_score).toBe(6);
        expect(result.L_class).toBe('LOW');
        expect(result.I_class).toBe('MAJOR');
        expect(result.finalRisk).toBe('RISKY');
    });

    // ============== TEST 5 ==============
    test('5) L_score at upper edge => check range boundary (value=2 => >=2 => MEDIUM)', () => {
        likelihoodConfigObj['LOW'] = [0, 2];
        likelihoodConfigObj['MEDIUM'] = [2, 5];
        impactConfigObj['LOW'] = [0, 5];
        mappingObj['MEDIUM-LOW'] = 'OK';

        // => sl=16 => average=(16)/8=2 => "MEDIUM"
        storedVector.sl = 16;
        storedVector.m = 0;
        storedVector.o = 0;
        storedVector.s = 0;
        storedVector.ed = 0;
        storedVector.ee = 0;
        storedVector.a = 0;
        storedVector.id = 0;

        // Impact => 0 => "LOW"
        storedVector.lc = 0;
        storedVector.li = 0;
        storedVector.lav = 0;
        storedVector.lac = 0;
        storedVector.fd = 0;
        storedVector.rd = 0;
        storedVector.nc = 0;
        storedVector.pv = 0;

        const result = performAdvancedCalculation();
        expect(result).not.toBeNull();
        expect(result.L_class).toBe('MEDIUM');
        expect(result.finalRisk).toBe('OK');
    });

    // ============== TEST 6 ==============
    test('6) Impact negative => I_class="ERROR" => finalRisk="ERROR"', () => {
        likelihoodConfigObj['LOW'] = [0, 5];
        impactConfigObj['LOW'] = [0, 5];
        mappingObj['LOW-LOW'] = 'OK';

        storedVector.sl = 0;
        storedVector.m = 0;
        storedVector.o = 0;
        storedVector.s = 0;
        storedVector.ed = 0;
        storedVector.ee = 0;
        storedVector.a = 0;
        storedVector.id = 0; // => average=0 => "LOW"
        storedVector.lc = -2; // max=-2 => => "ERROR"

        const result = performAdvancedCalculation();
        expect(result).not.toBeNull();
        expect(result.L_class).toBe('LOW');
        expect(result.I_class).toBe('ERROR');
        expect(result.finalRisk).toBe('ERROR');
    });

    // ============== TEST 7 ==============
    test('7) UI update => fields exist => check .LS, .IS, .RS', () => {
        likelihoodConfigObj['LOW'] = [0, 5];
        impactConfigObj['HIGH'] = [5, 9];
        mappingObj['LOW-HIGH'] = 'TEST-RISK';

        // => Threat => sum=10 => average=10/8=1.25 => "LOW"
        storedVector.sl = 5;
        storedVector.m = 5;
        storedVector.o = 0;
        storedVector.s = 0;
        storedVector.ed = 0;
        storedVector.ee = 0;
        storedVector.a = 0;
        storedVector.id = 0;

        // => Impact => max=9 => => "HIGH"
        storedVector.lc = 9;
        storedVector.li = 0;
        storedVector.lav = 0;
        storedVector.lac = 0;
        storedVector.fd = 0;
        storedVector.rd = 0;
        storedVector.nc = 0;
        storedVector.pv = 0;

        // => finalRisk => "TEST-RISK"
        const r = performAdvancedCalculation();
        expect(document.querySelector('.LS').textContent).toContain('1.250 LOW');
        expect(document.querySelector('.IS').textContent).toContain('9.000 HIGH');
        expect(document.querySelector('.RS').textContent).toBe('TEST-RISK');
        expect(r.finalRisk).toBe('TEST-RISK');
    });

    // ============== TEST 8 ==============
    test('8) UI update => fields NOT existing => no error => normal', () => {
        // Clear DOM
        document.body.innerHTML = '';
        likelihoodConfigObj['LOW'] = [0, 9];
        impactConfigObj['LOW'] = [0, 9];
        mappingObj['LOW-LOW'] = 'OK';

        storedVector.sl = 4;
        const out = performAdvancedCalculation();
        expect(out).not.toBeNull();
        // No .LS/.IS => no crash
    });

    // ============== TEST 9 ==============
    test('9) L_class=ERROR => => finalRisk="ERROR"', () => {
        likelihoodConfigObj['LOW'] = [0, 2];
        likelihoodConfigObj['MEDIUM'] = [2, 5];
        // => L=7 => => "ERROR"
        impactConfigObj['HIGH'] = [0, 9];
        mappingObj['ERROR-HIGH'] = 'IMPOSSIBLE';

        // L=7 => average=7 => "ERROR"
        storedVector.sl = 7 * 8; // sum=56 => 56/8=7
        // I=0 => => "HIGH" => => finalRisk => "ERROR"
        // (mappingObj['ERROR-HIGH']="IMPOSSIBLE"? => but we check if "ERROR" is blocked)
        mappingObj['ERROR-HIGH'] = 'IMPOSSIBLE';

        const r = performAdvancedCalculation();
        // The code (getMappedRisk) => if L_class===ERROR => return "ERROR"
        expect(r.finalRisk).toBe('ERROR');
    });

    // ============== TEST 10 ==============
    test('10) L_class=ANY, I_class=ERROR => finalRisk="ERROR"', () => {
        likelihoodConfigObj['LOW'] = [0, 9];
        impactConfigObj['MEDIUM'] = [2, 5];
        impactConfigObj['HIGH'] = [5, 9];
        mappingObj['LOW-ERROR'] = 'WONT HAPPEN?';

        storedVector.sl = 0; // => average=0 => "LOW"
        // => Impact => max=1.5 => check [2,5),(5,9) => => none => "ERROR"
        storedVector.lc = 1.5;
        storedVector.li = 1.5;

        const rez = performAdvancedCalculation();
        expect(rez.I_class).toBe('ERROR');
        expect(rez.finalRisk).toBe('ERROR');
    });

    // ============== TEST 11 ==============
    test('11) Rounded values => average=2.500 => "2.500 MID"', () => {
        likelihoodConfigObj['MID'] = [0, 9];
        impactConfigObj['MID'] = [0, 9];
        mappingObj['MID-MID'] = 'OK';

        // sum=20, count=8 => average=2.5
        storedVector.sl = 10;
        storedVector.m = 10; // => sum=20
        storedVector.o = 0;
        storedVector.s = 0;
        storedVector.ed = 0;
        storedVector.ee = 0;
        storedVector.a = 0;
        storedVector.id = 0;

        // Impact => let's say 4 => "MID"
        storedVector.lc = 4;

        const ret = performAdvancedCalculation();
        expect(ret.L_score).toBeCloseTo(2.5, 5);
        expect(document.querySelector('.LS').textContent).toContain('2.500 MID');
    });

    // ============== TEST 12 ==============
    test('12) MaxVector => negative+positive => max=3 => => I_class=LOW, L_class=? => final=ERROR', () => {
        likelihoodConfigObj['LOW'] = [0, 5];
        impactConfigObj['LOW'] = [0, 5];
        mappingObj['LOW-LOW'] = 'OK';

        // Threat => sl=-5, m=-2 => average=? => ~ -0.875 => => "ERROR"
        storedVector.sl = -5;
        storedVector.m = -2;
        storedVector.o = 0;
        storedVector.s = 0;
        storedVector.ed = 0;
        storedVector.ee = 0;
        storedVector.a = 0;
        storedVector.id = 0;

        // Impact => lc=-5, li=3 => max=3 => => "LOW"
        storedVector.lc = -5;
        storedVector.li = 3;
        storedVector.lav = 2;
        storedVector.lac = 1;

        const r = performAdvancedCalculation();
        expect(r.I_score).toBe(3);
        expect(r.I_class).toBe('LOW');
        // L_class=ERROR => => finalRisk="ERROR"
        expect(r.finalRisk).toBe('ERROR');
    });

    // ============== TEST 13 ==============
    test('13) "Edge" => L_score=5 => => not in [0,5) => => ERROR', () => {
        likelihoodConfigObj['LOW'] = [0, 5];
        impactConfigObj['LOW'] = [0, 9];
        mappingObj['LOW-LOW'] = 'OK';

        // => average=5 => => check >=0 && <5 => false => => "ERROR"
        storedVector.sl = 5 * 8; // => 40 => 40/8=5
        // => I=0 => => "LOW"
        const out = performAdvancedCalculation();
        expect(out.L_class).toBe('ERROR');
        expect(out.finalRisk).toBe('ERROR');
    });

    // ============== TEST 14 ==============
    test('14) "Edge" => L_score = minVal => => in range ([2,5)) => "MEDIUM"', () => {
        likelihoodConfigObj['MEDIUM'] = [2, 5];
        impactConfigObj['ANY'] = [0, 9];
        mappingObj['MEDIUM-ANY'] = 'FINE';

        // sum=16 => average=2 => => in [2,5) => "MEDIUM"
        storedVector.sl = 2;
        storedVector.m = 2;
        storedVector.o = 2;
        storedVector.s = 2;
        storedVector.ed = 2;
        storedVector.ee = 2;
        storedVector.a = 2;
        storedVector.id = 2;

        const out = performAdvancedCalculation();
        expect(out.L_class).toBe('MEDIUM');
        expect(out.finalRisk).toBe('FINE');
    });

    // ============== TEST 15 ==============
    test('15) No vector => L=I=0 => finalRisk=OK => normal run', () => {
        likelihoodConfigObj['LOW'] = [0, 9];
        impactConfigObj['LOW'] = [0, 9];
        mappingObj['LOW-LOW'] = 'OK';

        // storedVector => {}
        const r = performAdvancedCalculation();
        expect(r).not.toBeNull();
        expect(r.L_score).toBe(0);
        expect(r.I_score).toBe(0);
        expect(r.finalRisk).toBe('OK');
    });

    // ============== TEST 16 ==============
    test('16) vector => all 9 => => average=9, max=9 => L_class=? => I_class=? => final=ERROR', () => {
        likelihoodConfigObj['LOW'] = [0, 9];
        impactConfigObj['LOW'] = [0, 9];
        mappingObj['LOW-LOW'] = 'LOW';

        // 8 Threat => each=9 => sum=72 => avg=9
        storedVector.sl = 9;
        storedVector.m = 9;
        storedVector.o = 9;
        storedVector.s = 9;
        storedVector.ed = 9;
        storedVector.ee = 9;
        storedVector.a = 9;
        storedVector.id = 9;

        // 8 Impact => each=9 => max=9
        storedVector.lc = 9;
        storedVector.li = 9;
        storedVector.lav = 9;
        storedVector.lac = 9;
        storedVector.fd = 9;
        storedVector.rd = 9;
        storedVector.nc = 9;
        storedVector.pv = 9;

        const r = performAdvancedCalculation();
        // => getRangeClass(9, {LOW:[0,9]}) => <9 => false => => L_class=ERROR
        // => I_class=ERROR
        // => finalRisk="ERROR"
        expect(r.L_class).toBe('LOW');
        expect(r.I_class).toBe('LOW');
        expect(r.finalRisk).toBe('LOW');
    });

    // ============== TEST 17 ==============
    test('17) mix => L=4.5 => MEDIUM => I=3 => "LOW"? => finalRisk=ML or similar', () => {
        likelihoodConfigObj['LOW'] = [0, 3];
        likelihoodConfigObj['MEDIUM'] = [3, 5];
        likelihoodConfigObj['HIGH'] = [5, 9];
        impactConfigObj['LOW'] = [0, 4];
        impactConfigObj['HIGH'] = [4, 9];
        mappingObj['MEDIUM-LOW'] = 'ML';
        mappingObj['MEDIUM-HIGH'] = 'MH';

        // L => sum=36 => => 36/8=4.5 => => "MEDIUM"
        storedVector.sl = 9; // => 9
        storedVector.m = 9;  // => +9=18
        storedVector.o = 9;  // => +9=27
        storedVector.s = 0;  // => +0=27
        storedVector.ed = 9; // => +9=36
        storedVector.ee = 0; // => +0=36
        storedVector.a = 0;
        storedVector.id = 0; // => total=36 => /8=4.5 => "MEDIUM"

        // Impact => max=3 => "LOW"
        storedVector.lc = 3;

        const ret = performAdvancedCalculation();
        expect(ret.L_class).toBe('MEDIUM');
        expect(ret.I_class).toBe('LOW');
        expect(ret.finalRisk).toBe('ML');
    });

    // ============== TEST 18 ==============
    test('18) vector => impact=8 => => "HIGH"', () => {
        likelihoodConfigObj['ANY'] = [0, 10];
        impactConfigObj['MEDIUM'] = [3, 5];
        impactConfigObj['HIGH'] = [5, 9];
        mappingObj['ANY-HIGH'] = 'CRITICAL';

        // L=0 => "ANY"
        // I=8 => => max=8 => [5,9) => "HIGH"
        storedVector.lc = 8;

        const res = performAdvancedCalculation();
        expect(res.L_class).toBe('ANY');
        expect(res.I_class).toBe('HIGH');
        expect(res.finalRisk).toBe('CRITICAL');
    });

    // ============== TEST 19 ==============
    test('19) very negative => average=-100 => L=ERROR => => final=ERROR', () => {
        likelihoodConfigObj['LOW'] = [0, 3];
        likelihoodConfigObj['MEDIUM'] = [3, 6];
        impactConfigObj['ANY'] = [0, 9];
        mappingObj['LOW-ANY'] = 'LA';
        mappingObj['MEDIUM-ANY'] = 'MA';

        // sum=-800 => average=-100 => => "ERROR"
        storedVector.sl = -100;
        storedVector.m = -100;
        storedVector.o = -100;
        storedVector.s = -100;
        storedVector.ed = -100;
        storedVector.ee = -100;
        storedVector.a = -100;
        storedVector.id = -100;

        // Impact => 0 => => "ANY"
        const ret = performAdvancedCalculation();
        expect(ret.L_class).toBe('ERROR');
        expect(ret.I_class).toBe('ANY');
        expect(ret.finalRisk).toBe('ERROR');
    });

    // ============== TEST 20 ==============
    test('20) final console.log => check returned object', () => {
        likelihoodConfigObj['LOW'] = [0, 9];
        impactConfigObj['LOW'] = [0, 9];
        mappingObj['LOW-LOW'] = 'OK';

        storedVector.sl = 1; // => average=1/8=0.125 => "LOW"
        const r = performAdvancedCalculation();
        expect(r).toEqual({
            L_score: expect.any(Number),
            I_score: expect.any(Number),
            L_class: 'LOW',
            I_class: 'LOW',
            finalRisk: 'OK'
        });
    });
});

/**
 * --------------------------------------
 * TEST SUITE: UI Config Usage
 * --------------------------------------
 */

describe('UI Config Usage', () => {
    // Assume "partials" is defined in script.js or elsewhere. If not, define it here for testing:
    const partials = [
        "sl", "m", "o", "s", "ed", "ee", "a", "id",
        "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
    ];

    beforeEach(() => {
        // 1) Prepare the DOM for each test
        document.body.innerHTML = `<select id="configurationSelect"></select>`;
        partials.forEach(id => {
            const input = document.createElement('input');
            input.id = id;
            document.body.appendChild(input);
        });
    });

    afterEach(() => {
        // 2) Clean the DOM after each test
        document.body.innerHTML = '';
        // 3) Reset config if needed (in case you modify it within a test)
        config.uiSettings.disableElements = false;
        config.uiSettings.disableDropdown = false;
    });

    test('disableElements = true => input fields get disabled after calling calculate()', () => {
        // Arrange
        config.uiSettings.disableElements = true;

        // Act
        // Simulate your "calculate()" usage which should disable the inputs
        calculate();

        // Assert
        partials.forEach(id => {
            const elem = document.getElementById(id);
            expect(elem.disabled).toBe(true);
        });
    });

    test('disableElements = false => input fields stay enabled after calling calculate()', () => {
        // Arrange
        config.uiSettings.disableElements = false;

        // Act
        calculate();

        // Assert
        partials.forEach(id => {
            const elem = document.getElementById(id);
            expect(elem.disabled).toBe(false);
        });
    });

    test('disableDropdown = true => configSelect is disabled after calling addUrlConfigurationOption()', () => {
        // Arrange
        const configSelect = document.getElementById('configurationSelect');
        expect(configSelect.disabled).toBe(false); // Initially not disabled
        config.uiSettings.disableDropdown = true;

        // Act
        addCustomConfigurationOption();

        // Assert
        expect(configSelect.disabled).toBe(true);
    });

    test('disableDropdown = false => configSelect stays enabled after calling addUrlConfigurationOption()', () => {
        // Arrange
        const configSelect = document.getElementById('configurationSelect');
        config.uiSettings.disableDropdown = false;

        // Act
        addCustomConfigurationOption();

        // Assert
        expect(configSelect.disabled).toBe(false);
    });
});

/**
 * --------------------------------------
 * TEST SUITE: updateVectorDisplay()
 * --------------------------------------
 */

describe('updateVectorDisplay()', () => {
    let scoreElement;

    beforeEach(() => {
        document.body.innerHTML = `<a id="score"></a>`;
        scoreElement = document.getElementById("score");

        VECTOR_KEYS.forEach((key, index) => {
            storedVector[key] = index % 10;  // Werte von 0 bis 9 zuweisen
        });

        config.baseUrl = "https://example.com";
    });

    test('should correctly update the vector display element', () => {
        updateVectorDisplay();

        const expectedVectorString = VECTOR_KEYS.map(
            (key, index) => `${key.toUpperCase()}:${index % 10}`
        ).join("/");

        expect(scoreElement.textContent).toBe(`(${expectedVectorString})`);
        expect(scoreElement.href).toBe(`https://example.com/?vector=${expectedVectorString}`);
    });

    test('should handle missing #score element gracefully', () => {
        document.body.innerHTML = ""; // Entfernen des Elements
        expect(() => updateVectorDisplay()).not.toThrow();
    });
});

/**
 * --------------------------------------
 * TEST SUITE: updateCompleteURL()
 * --------------------------------------
 */

describe('updateCompleteURL()', () => {
    let completeURLElement, completeURLDiv;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="completeURL">
                <a id="completeURL"></a>
            </div>
        `;

        completeURLDiv = document.querySelector(".completeURL");
        completeURLElement = document.getElementById("completeURL");

        VECTOR_KEYS.forEach((key, index) => {
            storedVector[key] = (index + 1) % 10;  // Werte von 1 bis 9
        });

        config.baseUrl = "https://example.com/";
        delete window.location;
        window.location = new URL('https://example.com/');
    });

    test('should build URL only with vector if no URL params exist', () => {
        updateCompleteURL();

        const vectorString = VECTOR_KEYS.map(key => `${key.toUpperCase()}:${storedVector[key]}`).join('/');
        const expectedURL = `${config.baseUrl}?vector=(${vectorString})`;

        expect(completeURLElement.href).toBe(expectedURL);
        expect(completeURLElement.textContent).toBe(expectedURL);
    });

    test('should build complete URL including existing parameters', () => {
        window.location.search = '?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9&impactConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9&mapping=NOTE,LOW,MEDIUM,LOW,MEDIUM,HIGH,MEDIUM,HIGH,CRITICAL';

        updateCompleteURL();

        const urlParams = new URLSearchParams(window.location.search);
        const likelihoodConfig = urlParams.get("likelihoodConfig");
        const impactConfig = urlParams.get("impactConfig");
        const mappingConfig = urlParams.get("mapping");

        const vectorString = VECTOR_KEYS.map(key => `${key.toUpperCase()}:${storedVector[key]}`).join('/');
        const expectedURL = `${config.baseUrl}?likelihoodConfig=${likelihoodConfig}&impactConfig=${impactConfig}&mapping=${mappingConfig}&vector=(${vectorString})`;

        expect(completeURLElement.href).toBe(expectedURL);
        expect(completeURLElement.textContent).toBe(expectedURL);
    });

    test('should handle missing .completeURL div or #completeURL element gracefully', () => {
        document.body.innerHTML = "";
        expect(() => updateCompleteURL()).not.toThrow();
    });
});

/**
 * -----------------------------------------------
 * TEST SUITE: validateDialogInputs()
 * -----------------------------------------------
 */

describe("validateDialogInputs()", () => {
    let dialog;

    beforeEach(() => {
        dialog = document.createElement('dialog');
        document.body.appendChild(dialog);
    });

    afterEach(() => {
        document.body.removeChild(dialog);
    });

    const createInput = (className, value, dataset = {}) => {
        const input = document.createElement("input");
        input.className = className;
        input.value = value;
        Object.keys(dataset).forEach(key => input.dataset[key] = dataset[key]);
        dialog.appendChild(input);
        return input;
    };

    const setupDialogHeaders = (likelihoodHeaders, impactHeaders) => {
        likelihoodHeaders.forEach(header => createInput('custom-row-header', header));
        impactHeaders.forEach(header => createInput('custom-col-header', header));
    };

    const setupMappingInputs = (numLikelihood, numImpact, fillValue = "MAPPED") => {
        for (let i = 0; i < numLikelihood; i++) {
            for (let j = 0; j < numImpact; j++) {
                createInput('mapping-input', fillValue, {row: i, col: j});
            }
        }
    };

    test("Valid input passes validation", () => {
        setupDialogHeaders(
            ["LOW:0-3", "MEDIUM:3-6", "HIGH:6-9"],
            ["MINOR:0-3", "MAJOR:3-6", "CRITICAL:6-9"]
        );
        setupMappingInputs(3, 3);

        const result = validateDialogInputs(dialog, 3, 3);
        expect(result).toBe("likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9&impactConfig=MINOR:0-3;MAJOR:3-6;CRITICAL:6-9&mapping=MAPPED,MAPPED,MAPPED,MAPPED,MAPPED,MAPPED,MAPPED,MAPPED,MAPPED");
    });

    test("Fails if Likelihood does not start at 0", () => {
        setupDialogHeaders(
            ["LOW:1-3", "MEDIUM:3-6", "HIGH:6-9"],
            ["MINOR:0-3", "MAJOR:3-6", "CRITICAL:6-9"]
        );
        setupMappingInputs(3, 3);

        window.alert = jest.fn();
        const result = validateDialogInputs(dialog, 3, 3);
        expect(result).toBeNull();
        expect(window.alert).toHaveBeenCalledWith("Likelihood must start at 0.");
    });

    test("Fails if Impact does not end at 9", () => {
        setupDialogHeaders(
            ["LOW:0-3", "MEDIUM:3-6", "HIGH:6-9"],
            ["MINOR:0-3", "MAJOR:3-6", "CRITICAL:6-8"]
        );
        setupMappingInputs(3, 3);

        window.alert = jest.fn();
        const result = validateDialogInputs(dialog, 3, 3);
        expect(result).toBeNull();
        expect(window.alert).toHaveBeenCalledWith("Impact must end at 9.");
    });

    test("Fails if Likelihood ranges have gaps", () => {
        setupDialogHeaders(
            ["LOW:0-2", "MEDIUM:4-6", "HIGH:6-9"],
            ["MINOR:0-3", "MAJOR:3-6", "CRITICAL:6-9"]
        );
        setupMappingInputs(3, 3);

        window.alert = jest.fn();
        const result = validateDialogInputs(dialog, 3, 3);
        expect(result).toBeNull();
        expect(window.alert).toHaveBeenCalledWith("Likelihood ranges must not have gaps. Please cover every value from 0 to 9 continuously.");
    });

    test("Fails if header format is invalid", () => {
        setupDialogHeaders(
            ["LOW0-3", "MEDIUM:3-6", "HIGH:6-9"],
            ["MINOR:0-3", "MAJOR:3-6", "CRITICAL:6-9"]
        );
        setupMappingInputs(3, 3);

        window.alert = jest.fn();
        const result = validateDialogInputs(dialog, 3, 3);
        expect(result).toBeNull();
        expect(window.alert).toHaveBeenCalledWith('Likelihood header 1 ("LOW0-3") is invalid. Use format \'Label:min-max\' (e.g., \'LOW:0-1\').');
    });

    test("Fails if any mapping input is empty", () => {
        setupDialogHeaders(
            ["LOW:0-3", "MEDIUM:3-6", "HIGH:6-9"],
            ["MINOR:0-3", "MAJOR:3-6", "CRITICAL:6-9"]
        );
        setupMappingInputs(3, 3);
        dialog.querySelector('input.mapping-input[data-row="1"][data-col="1"]').value = "";

        window.alert = jest.fn();
        const result = validateDialogInputs(dialog, 3, 3);
        expect(result).toBeNull();
        expect(window.alert).toHaveBeenCalledWith("Mapping field at row 2, column 2 is empty.");
    });
});

/**
 * -----------------------------------------------
 * TEST SUITE: updateUrlAndProcess()
 * -----------------------------------------------
 */

describe("updateUrlAndProcess()", () => {
    beforeEach(() => {
        delete window.location;
        window.location = {
            origin: "http://localhost",
            pathname: "/test",
            search: "?vector=SL:1/M:1",
        };

        window.history.replaceState = jest.fn();
    });

    test("Updates URL preserving existing vector parameter", () => {
        const queryString = "likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9&impactConfig=MINOR:0-3;MAJOR:3-6;CRITICAL:6-9&mapping=A,B,C,D,E,F,G,H,I";

        updateUrlAndProcess(queryString);

        expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "http://localhost/test?" + queryString + "&vector=SL%3A1%2FM%3A1");
    });

    test("Updates URL correctly when no vector parameter exists", () => {
        window.location.search = "";
        const queryString = "likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9&impactConfig=MINOR:0-3;MAJOR:3-6;CRITICAL:6-9&mapping=A,B,C,D,E,F,G,H,I";

        updateUrlAndProcess(queryString);

        expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "http://localhost/test?" + queryString);
    });
});

/**
 * --------------------------------------
 * TEST SUITE: initMappingMatrixGenerator()
 * --------------------------------------
 */
describe('initMappingMatrixGenerator()', () => {
    let generateBtn, likelihoodInput, impactInput, modalElement, mainElement;
    let originalAlert;

    beforeEach(() => {
        // Stub jQuery's modal function to prevent errors in jsdom.
        window.$ = jest.fn().mockImplementation(() => ({
            modal: jest.fn()
        }));

        // Set up DOM elements expected by initMappingMatrixGenerator
        document.body.innerHTML = `
            <input id="likelihoodLevelsInput" value="3">
            <input id="impactLevelsInput" value="3">
            <button id="generateMappingMatrixBtn">Generate Mapping Matrix</button>
            <div id="mappingModal"></div>
            <main></main>
        `;
        generateBtn = document.getElementById("generateMappingMatrixBtn");
        likelihoodInput = document.getElementById("likelihoodLevelsInput");
        impactInput = document.getElementById("impactLevelsInput");
        modalElement = document.getElementById("mappingModal");
        mainElement = document.querySelector("main");

        // Override alert to capture calls
        originalAlert = window.alert;
        window.alert = jest.fn();

        // Initialize the function to register event listeners
        initMappingMatrixGenerator();
    });

    afterEach(() => {
        window.alert = originalAlert;
        document.body.innerHTML = "";
    });

    test('Should trigger an alert for invalid inputs (e.g., <= 0)', () => {
        likelihoodInput.value = "0";
        impactInput.value = "0";
        generateBtn.click();
        expect(window.alert).toHaveBeenCalledWith("Please enter valid positive integers for both Likelihood and Impact Levels.");
    });

    test('Should trigger an alert for inputs greater than 5', () => {
        likelihoodInput.value = "6";
        impactInput.value = "3";
        generateBtn.click();
        expect(window.alert).toHaveBeenCalledWith("Please choose at most 5 levels for Likelihood and Impact.");
    });

    test('For valid inputs, a dialog should be created and appended to the body', () => {
        likelihoodInput.value = "3";
        impactInput.value = "3";
        // Before clicking, there should be no <dialog> element in the DOM
        expect(document.querySelector("dialog")).toBeNull();

        generateBtn.click();

        // The click should trigger the creation of a dialog
        const dialog = document.querySelector("dialog");
        expect(dialog).not.toBeNull();
        // Check if the main content has been blurred (i.e., "blurred" class added)
        expect(mainElement.classList.contains("blurred")).toBe(true);
    });
});

/**
 * --------------------------------------
 * TEST SUITE: createMappingDialog()
 * --------------------------------------
 */
describe('createMappingDialog()', () => {
    test('Should return a <dialog> element with the expected sub-elements', () => {
        const prefill = {
            mappingName: "TestMapping",
            likelihoodHeaders: ["LOW:0-2", "HIGH:2-9"],
            impactHeaders: ["MINOR:0-5", "MAJOR:5-9"],
            mappingValues: ["Val1", "Val2", "Val3", "Val4"]
        };
        const dialog = createMappingDialog(2, 2, prefill);
        expect(dialog.tagName).toBe("DIALOG");

        // Check that a table is present
        const table = dialog.querySelector("table");
        expect(table).not.toBeNull();

        // Verify that the mapping name input exists and contains the prefill value
        const mappingNameInput = dialog.querySelector("input#mappingNameInput");
        expect(mappingNameInput).not.toBeNull();
        expect(mappingNameInput.value).toBe("TestMapping");

        // Verify that two buttons are present: Confirm and Discard
        const confirmBtn = dialog.querySelector("button.btn.btn-success");
        const discardBtn = dialog.querySelector("button.btn.btn-danger");
        expect(confirmBtn).not.toBeNull();
        expect(discardBtn).not.toBeNull();
    });
});

/**
 * --------------------------------------
 * TEST SUITE: createMappingTable()
 * --------------------------------------
 */
describe('createMappingTable()', () => {
    test('Creates a table with the correct header and body structure (without prefill)', () => {
        const numLikelihood = 3;
        const numImpact = 2;
        const table = createMappingTable(numLikelihood, numImpact);
        expect(table.tagName).toBe("TABLE");

        // Check the table header (thead)
        const thead = table.querySelector("thead");
        expect(thead).not.toBeNull();
        const headerRow = thead.querySelector("tr");
        // There should be 1 empty cell + numImpact columns
        expect(headerRow.children.length).toBe(1 + numImpact);

        // Check the table body (tbody)
        const tbody = table.querySelector("tbody");
        expect(tbody).not.toBeNull();
        const rows = tbody.querySelectorAll("tr");
        expect(rows.length).toBe(numLikelihood);
        // Each row should have 1 header cell + numImpact cells
        rows.forEach(row => {
            expect(row.children.length).toBe(1 + numImpact);
        });
    });

    test('Creates a table and fills in prefill values', () => {
        const prefill = {
            likelihoodHeaders: ["LOW:0-2", "HIGH:2-9"],
            impactHeaders: ["MINOR:0-5", "MAJOR:5-9"],
            mappingValues: ["V1", "V2", "V3", "V4"]
        };
        const table = createMappingTable(2, 2, prefill);

        // Check the column header inputs
        const colHeaderInputs = table.querySelectorAll("thead input.custom-col-header");
        expect(colHeaderInputs.length).toBe(2);
        expect(colHeaderInputs[0].value).toBe("MINOR:0-5");
        expect(colHeaderInputs[1].value).toBe("MAJOR:5-9");

        // Check the row header inputs
        const rowHeaderInputs = table.querySelectorAll("tbody input.custom-row-header");
        expect(rowHeaderInputs.length).toBe(2);
        expect(rowHeaderInputs[0].value).toBe("LOW:0-2");
        expect(rowHeaderInputs[1].value).toBe("HIGH:2-9");

        // Check the mapping inputs
        const mappingInputs = table.querySelectorAll("tbody input.mapping-input");
        expect(mappingInputs.length).toBe(4);
        expect(mappingInputs[0].value).toBe("V1");
        expect(mappingInputs[1].value).toBe("V2");
        expect(mappingInputs[2].value).toBe("V3");
        expect(mappingInputs[3].value).toBe("V4");
    });
});

/**
 * --------------------------------------
 * TEST SUITE: editMappingConfiguration()
 * --------------------------------------
 */
describe('editMappingConfiguration()', () => {
    let mappingModal, mainElement;
    const sampleQueryString = "likelihoodConfig=LOW:0-3;HIGH:3-9&impactConfig=MINOR:0-5;MAJOR:5-9&mapping=Val1,Val2,Val3,Val4";

    beforeEach(() => {
        // Create a dummy mappingModal and main element
        document.body.innerHTML = `
            <div id="mappingModal" class="modal"></div>
            <main></main>
        `;
        mappingModal = document.getElementById("mappingModal");
        mainElement = document.querySelector("main");

        // Add minimal jQuery-like behavior to simulate $('#mappingModal').modal('hide') and ('show')
        window.$ = jest.fn().mockImplementation(selector => {
            return {
                modal: jest.fn()
            };
        });
    });

    afterEach(() => {
        document.body.innerHTML = "";
        jest.clearAllMocks();
    });

    test('Should create a dialog with prefilled values', () => {
        // Call editMappingConfiguration
        editMappingConfiguration("TestMapping", sampleQueryString);

        // Check if a <dialog> element has been appended to the body
        const dialog = document.querySelector("dialog");
        expect(dialog).not.toBeNull();

        // Verify that prefill values are present in the input fields
        const rowHeaderInputs = dialog.querySelectorAll("input.custom-row-header");
        expect(rowHeaderInputs.length).toBe(2);
        expect(rowHeaderInputs[0].value).toBe("LOW:0-3");
        expect(rowHeaderInputs[1].value).toBe("HIGH:3-9");

        const colHeaderInputs = dialog.querySelectorAll("input.custom-col-header");
        expect(colHeaderInputs.length).toBe(2);
        expect(colHeaderInputs[0].value).toBe("MINOR:0-5");
        expect(colHeaderInputs[1].value).toBe("MAJOR:5-9");

        // Verify that the mapping inputs are filled with values
        const mappingInputs = dialog.querySelectorAll("input.mapping-input");
        expect(mappingInputs.length).toBe(4);
        expect(mappingInputs[0].value).toBe("Val1");
        expect(mappingInputs[1].value).toBe("Val2");
        expect(mappingInputs[2].value).toBe("Val3");
        expect(mappingInputs[3].value).toBe("Val4");
    });
});

/**
 * --------------------------------------
 * TEST SUITE: mappingNameExists()
 * --------------------------------------
 */
describe('mappingNameExists()', () => {
    let getMappingCookieSpy;

    beforeEach(() => {
        // Spy on the getMappingCookie function from cookie_utils
        getMappingCookieSpy = jest.spyOn(cookieUtils, 'getMappingCookie');
    });

    afterEach(() => {
        getMappingCookieSpy.mockRestore();
    });

    test('Should return true when getMappingCookie() returns a value', () => {
        getMappingCookieSpy.mockReturnValue("dummyValue");
        expect(mappingNameExists("TestMapping")).toBe(true);
    });

    test('Should return false when getMappingCookie() returns null', () => {
        getMappingCookieSpy.mockReturnValue(null);
        expect(mappingNameExists("NonExistentMapping")).toBe(false);
    });
});

import * as customMapping from '../js/customMappingButton.js';

/**
 * --------------------------------------
 * TEST SUITE: refreshSavedMappingsList()
 * --------------------------------------
 */
describe('refreshSavedMappingsList()', () => {
    let modalElement;
    const dummyMappings = [
        {
            name: "Mapping1",
            value: "likelihoodConfig=LOW:0-3;HIGH:3-9&impactConfig=MINOR:0-5;MAJOR:5-9&mapping=Val1,Val2,Val3,Val4"
        },
        {name: "Mapping2", value: "likelihoodConfig=LOW:0-2;HIGH:2-9&impactConfig=MINOR:0-4;MAJOR:4-9&mapping=A,B,C,D"}
    ];

    beforeEach(() => {
        // Create a dummy modal container for saved mappings
        document.body.innerHTML = `
            <div id="mappingModal">
                <div id="savedMappingsContainer"></div>
            </div>
        `;
        modalElement = document.getElementById("mappingModal");

        // Spy on listMappingCookies to return dummy mappings
        jest.spyOn(cookieUtils, 'listMappingCookies').mockReturnValue(dummyMappings);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = "";
    });

    test('Should display "No Saved Mappings Yet!" when no mappings exist', () => {
        // Override listMappingCookies to return an empty array
        cookieUtils.listMappingCookies.mockReturnValue([]);
        refreshSavedMappingsList(modalElement);

        const savedMappingsContainer = modalElement.querySelector("#savedMappingsContainer");
        expect(savedMappingsContainer.textContent).toContain("No Saved Mappings Yet!");
    });

    test('Should display saved mappings when mappings exist', () => {
        refreshSavedMappingsList(modalElement);

        const savedMappingsContainer = modalElement.querySelector("#savedMappingsContainer");
        // Check if a list (<ul>) is present
        const ul = savedMappingsContainer.querySelector("ul");
        expect(ul).not.toBeNull();
        // Check that the list contains two list items (<li>)
        const listItems = ul.querySelectorAll("li");
        expect(listItems.length).toBe(2);
    });
});

/**
 * --------------------------------------
 * TEST SUITE: Mapping Functionality Integration (Load, Delete, Store)
 * --------------------------------------
 */

describe('Mapping Functionality Integration (Load, Delete, Store)', () => {
    const dummyMappingValue = "likelihoodConfig=LOW:0-3;HIGH:3-9&impactConfig=MINOR:0-5;MAJOR:5-9&mapping=Val1,Val2,Val3,Val4";
    const dummyMapping = {name: "Mapping1", value: dummyMappingValue};

    // Simulated cookie store variable
    let mappingStore;

    beforeEach(() => {
        // Initialize the simulated cookie store with the dummy mapping.
        mappingStore = [dummyMapping];

        // Set up required DOM elements.
        document.body.innerHTML = `
      <div class="completeURL"><a id="completeURL" href="#"></a></div>
      <div id="mappingModal">
          <div id="savedMappingsContainer"></div>
      </div>
      <main></main>
    `;

        // Extended jQuery stub to support modal, addClass, removeClass, and val().
        window.$ = jest.fn().mockImplementation(selector => {
            const elements = document.querySelectorAll(selector);
            return {
                modal: jest.fn(),
                addClass: jest.fn(),
                removeClass: jest.fn(),
                val: function (newVal) {
                    if (newVal === undefined) {
                        return elements.length ? elements[0].value : undefined;
                    } else {
                        elements.forEach(el => el.value = newVal);
                        return this;
                    }
                }
            };
        });

        // Stub listMappingCookies to return the current state of mappingStore.
        jest.spyOn(cookieUtils, 'listMappingCookies').mockImplementation(() => mappingStore);

        // For the Delete test, stub deleteMappingCookie to update the store.
        jest.spyOn(cookieUtils, 'deleteMappingCookie').mockImplementation((mappingName) => {
            mappingStore = mappingStore.filter(m => m.name !== mappingName);
        });

        // Stub calculate to avoid executing code that leads to "result is not defined".
        window.calculate = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = "";
    });

    test('Load: Clicking the Load button should update the completeURL element (i.e. load the mapping)', () => {
        // Arrange: Generate the saved mappings list in the modal.
        const modal = document.getElementById("mappingModal");
        refreshSavedMappingsList(modal);

        // Act: Find the Load button and simulate a click event with bubbling.
        const loadBtn = modal.querySelector("button.btn.btn-success");
        expect(loadBtn).not.toBeNull();
        loadBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        // Assert: Verify that the completeURL element has been updated with the expected query string.
        const completeUrlAnchor = document.getElementById("completeURL");
        expect(completeUrlAnchor).not.toBeNull();
        expect(completeUrlAnchor.href).toContain("likelihoodConfig=LOW:0-3");
        expect(completeUrlAnchor.href).toContain("mapping=Val1,Val2,Val3,Val4");
    });

    test('Delete: Clicking the Delete button should remove the mapping from the saved mappings list', () => {
        // Arrange: Generate the saved mappings list in the modal.
        const modal = document.getElementById("mappingModal");
        refreshSavedMappingsList(modal);

        // Override window.confirm to always return true.
        window.confirm = jest.fn(() => true);

        // Act: Find the Delete button and simulate a click event.
        const deleteBtn = modal.querySelector("button.btn.btn-secondary");
        expect(deleteBtn).not.toBeNull();
        deleteBtn.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        // Rebuild the saved mappings list after deletion.
        refreshSavedMappingsList(modal);

        // Assert: Verify that the saved mappings container no longer contains "Mapping1".
        const savedMappingsContainer = document.getElementById("savedMappingsContainer");
        expect(savedMappingsContainer.textContent).not.toContain("Mapping1");

        // Optionally, check that the cookie store is now empty.
        expect(mappingStore.length).toBe(0);
    });

    test('Store: Confirming a mapping should set the cookie', () => {
        // Arrange: Open the mapping dialog.
        const dialog = customMapping.createMappingDialog(2, 2);
        document.body.appendChild(dialog);

        // Simulate user input: set mapping name and mapping inputs.
        const mappingNameInput = dialog.querySelector("input#mappingNameInput");
        mappingNameInput.value = "NewMapping";

        const mappingInputs = dialog.querySelectorAll("input.mapping-input");
        expect(mappingInputs.length).toBeGreaterThanOrEqual(4);
        mappingInputs[0].value = "Val1";
        mappingInputs[1].value = "Val2";
        mappingInputs[2].value = "Val3";
        mappingInputs[3].value = "Val4";

        // Stub validateDialogInputs to return a valid query string.
        jest.spyOn(customMapping, 'validateDialogInputs').mockReturnValue(
            "likelihoodConfig=LOW:0-9&impactConfig=MINOR:0-9&mapping=VAL"
        );

        // Act: Simulate click on the Confirm button.
        const confirmBtn = dialog.querySelector("button.btn.btn-success");
        expect(confirmBtn).not.toBeNull();
        confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Assert: Check that the cookie is set.
        const storedCookie = cookieUtils.getMappingCookie("NewMapping");
        expect(storedCookie).toBe("likelihoodConfig=LOW:0-9&impactConfig=MINOR:0-9&mapping=VAL");

        // Cleanup: Remove the dialog if it still exists.
        if (document.body.contains(dialog)) {
            dialog.close();
            document.body.removeChild(dialog);
        }
    });
});