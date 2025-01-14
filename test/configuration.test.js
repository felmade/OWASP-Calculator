/**
 * @jest-environment jsdom
 */

import {
    riskConfigurations,
    updateRiskLevelMapping,
    loadVectors,
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
    storedVector
} from '../js/url_logic.js';

// Matcher hinzufügen
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
    describe('parseUrlParameters()', () => {

        // Hilfsfunktion, um window.location.search zu setzen
        function setLocationSearch(searchString) {
            delete window.location;
            window.location = {search: searchString};
        }

        beforeEach(() => {
            // Vor jedem Test swal-Mocks zurücksetzen
            global.swal.mockClear();
        });

        // --- TEST 1 ---
        test('No parameters at all => should fail (missing likelihoodConfig)', () => {
            setLocationSearch('');
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalledWith(
                "Error",
                "Parsing failed. Falling back to default logic.",
                "error"
            );
        });

        // --- TEST 2 ---
        test('Only likelihoodConfig => missing impactConfig + mapping => fail', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9');
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 3 ---
        test('likelihood + impact, but missing mapping => fail', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9');
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 4 ---
        test('likelihood + impact + mapping, but mapping hat falsche Anzahl => fail', () => {
            // Wir haben 3 Likelihood-Level (LOW, MEDIUM, HIGH) und 3 Impact-Level (NOTE, LOW, HIGH)
            // => Braucht 3*3=9 Werte, wir geben nur 8
            setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5;HIGH:5-9'
                + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
                + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8');
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 5 ---
        test('Gültige 2×2-Matrix + Vector vorhanden => should succeed => returns true', () => {
            // 2 L-Levels: "LOW:0-2;HIGH:2-9"
            // 2 I-Levels: "MINOR:0-5;MAJOR:5-9"
            // => Braucht 2*2=4 mapping-Einträge
            setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
                + '&impactConfig=MINOR:0-5;MAJOR:5-9'
                + '&mapping=Val1,Val2,Val3,Val4'
                + '&vector=(sl:1/m:2)'
            );
            const result = parseUrlParameters();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();

            // Prüfung, ob Vector gespeichert wurde
            const vec = getStoredVector();
            expect(vec).not.toBeNull();
            expect(vec.sl).toBe(1);
            expect(vec.m).toBe(2);

            // Prüfung, ob Config-Objekte existieren
            const configObj = getStoredConfiguration();
            expect(configObj).toHaveProperty('likelihood');
            expect(configObj).toHaveProperty('impact');

            // Prüfung, ob Mapping existiert
            const mapObj = getStoredMapping();
            expect(mapObj).toHaveProperty('LOW-MINOR');  // Val1
            expect(mapObj).toHaveProperty('LOW-MAJOR');  // Val2
            expect(mapObj).toHaveProperty('HIGH-MINOR'); // Val3
            expect(mapObj).toHaveProperty('HIGH-MAJOR'); // Val4
        });

        // --- TEST 6 ---
        test('Gültige 3×3-Matrix, kein Vector => should succeed => returns true', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9'
                + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
                + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9'
            );
            const result = parseUrlParameters();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();

            // Vector sollte null sein, weil kein &vector=... da
            const vec = getStoredVector();
            expect(vec).toBeEmpty();
        });

        // --- TEST 7 ---
        test('Ungültige numeric range in likelihoodConfig => fail', () => {
            // "LOW:0-ABC" => ABC wird parseFloat zu NaN => Error
            setLocationSearch('?likelihoodConfig=LOW:0-ABC;HIGH:2-9'
                + '&impactConfig=MINOR:0-4;MAJOR:4-9'
                + '&mapping=Val1,Val2,Val3,Val4'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 8 ---
        test('Leerer likelihoodConfig => fail', () => {
            setLocationSearch('?likelihoodConfig='
                + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
                + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 9 ---
        test('Leerer impactConfig => fail', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-3;HIGH:3-9'
                + '&impactConfig='
                + '&mapping=Val1,Val2,Val3,Val4'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 10 ---
        test('Leeres mapping => fail', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-3;HIGH:3-9'
                + '&impactConfig=MINOR:0-4;MAJOR:4-9'
                + '&mapping='
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 11 ---
        test('Mehr Einträge als nötig => fail (z. B. 2×2=4 gebraucht, aber 5 gegeben)', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
                + '&impactConfig=MINOR:0-2;MAJOR:2-9'
                + '&mapping=Val1,Val2,Val3,Val4,Val5'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 12 ---
        test('Gültige 2×2-Matrix, Groß-/Kleinschreibung gemischt => should succeed => returns true', () => {
            // Mix bei likelihoodConfig + impactConfig z. B. "LoW:0-2;hIgH:2-9"
            setLocationSearch('?likelihoodConfig=LoW:0-2;hIgH:2-9'
                + '&impactConfig=mInOr:0-5;MaJoR:5-9'
                + '&mapping=someVal,AnotherVal,ThirdVal,FourthVal'
            );
            const result = parseUrlParameters();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();

            // Prüfen, ob die Keys in Großbuchstaben ankommen
            const mapObj = getStoredMapping();
            expect(mapObj['LOW-MINOR']).toBe('SOMEVAL');
            expect(mapObj['LOW-MAJOR']).toBe('ANOTHERVAL');
            expect(mapObj['HIGH-MINOR']).toBe('THIRDVAL');
            expect(mapObj['HIGH-MAJOR']).toBe('FOURTHVAL');
        });

        // --- TEST 13 ---
        test('Gültige 5×3-Matrix => should succeed => returns true', () => {
            // Likelihood = 5 Level => N=5
            // Impact = 3 Level => M=3
            // => 5*3=15 mapping-Einträge
            setLocationSearch('?likelihoodConfig=VERY_LOW:0-1;LOW:1-3;MEDIUM:3-5;HIGH:5-7;EXTREME:7-9'
                + '&impactConfig=NOTE:0-2;LOW:2-5;HIGH:5-9'
                + '&mapping=V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15'
            );
            const result = parseUrlParameters();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();
        });

        // --- TEST 14 ---
        test('Invalid vector => parseVector should fail => parseUrlParameters returns false', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
                + '&impactConfig=LOW:0-5;HIGH:5-9'
                + '&mapping=Val1,Val2,Val3,Val4'
                + '&vector=badformat'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 15 ---
        test('Vector mit falschen Segmenten => parseVector => Error => false', () => {
            // Ein Segment ohne ":" z. B. "sl1"
            setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
                + '&impactConfig=LOW:0-5;HIGH:5-9'
                + '&mapping=Val1,Val2,Val3,Val4'
                + '&vector=(sl1/m:2)'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 16 ---
        test('Vector mit Zahl > 9 => parseVector sollte aber klappen, falls man den Wert capped oder Error wirft', () => {
            // Kommt drauf an, ob dein parseVector den Wert cappen oder Error werfen soll.
            // Angenommen, deine parseVector wirft bei > 9 => Error => parseUrlParameters => false
            setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
                + '&impactConfig=LOW:0-5;HIGH:5-9'
                + '&mapping=Val1,Val2,Val3,Val4'
                + '&vector=(sl:10/m:2)'
            );
            const result = parseUrlParameters();
            // Falls parseVector cappen würde, könnte das true sein.
            // Falls parseVector => Error => expect false
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 17 ---
        test('Vector mit unbekanntem Key => sollte nur warnen, aber nicht failen => returns true', () => {
            // Default parseVector wirft keinen Error bei unbekanntem Key
            // => "Ignoring unknown key" + sollte parseUrlParameters => true
            setLocationSearch('?likelihoodConfig=LOW:0-2;HIGH:2-9'
                + '&impactConfig=LOW:0-5;HIGH:5-9'
                + '&mapping=Val1,Val2,Val3,Val4'
                + '&vector=(SL:2/xXx:4)'
            );
            const result = parseUrlParameters();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();

            const vec = getStoredVector();
            // SL sollte =2 sein, xXx ignoriert => schau in console.warn
            expect(vec.sl).toBe(2);
        });

        // --- TEST 18 ---
        test('Likelihood config mit doppelten Leveln => sollte failen, kann zu Überschreibung führen', () => {
            // Bsp: "LOW:0-2;LOW:2-4" => Letzte Eintragung überschreibt "LOW" im Objekt
            setLocationSearch('?likelihoodConfig=LOW:0-2;LOW:2-4;HIGH:4-9'
                + '&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9'
                + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9'
            );
            // parseConfiguration wirft keinen Error direkt, es nimmt "LOW" als key 2x, letzter gewinnt
            const result = parseUrlParameters();
            // Möglicherweise hat man "LOW" => [2,4], "HIGH" => [4,9], und die 0-2 Range geht verloren
            // => Kein harter Fehler => true
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
            // configObj => might have { LOW:[2,4], HIGH:[4,9] }
            const config = getStoredConfiguration();
            expect(config.likelihood).toHaveProperty('LOW');
            expect(config.likelihood).toHaveProperty('HIGH');
        });

        // --- TEST 19 ---
        test('impactConfig mit leerem Level => z. B. " :0-2" => parseConfiguration => Error', () => {
            setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-5'
                + '&impactConfig=:0-2;HIGH:2-9'
                + '&mapping=Val1,Val2,Val3,Val4,Val5,Val6'
            );
            const result = parseUrlParameters();
            expect(result).toBe(false);
            expect(global.swal).toHaveBeenCalled();
        });

        // --- TEST 20 ---
        test('Alles korrekt, 5×5 Standard => should succeed => return true', () => {
            // Klassische OWASP 5×5
            setLocationSearch('?likelihoodConfig=LOW:0-2;MEDIUM:2-4;HIGH:4-6;VERY_HIGH:6-8;EXTREME:8-9'
                + '&impactConfig=LOW:0-2;MEDIUM:2-4;HIGH:4-6;VERY_HIGH:6-8;EXTREME:8-9'
                + '&mapping=V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15,V16,V17,V18,V19,V20,V21,V22,V23,V24,V25'
            );
            const result = parseUrlParameters();
            expect(result).toBe(true);
            expect(global.swal).not.toHaveBeenCalled();

            const map = getStoredMapping();
            // Stichproben
            expect(map['LOW-LOW']).toBe('V1');
            expect(map['EXTREME-EXTREME']).toBe('V25');
        });
    });

    describe('performAdvancedCalculation() tests', () => {

        // Wir legen einige Hilfsfunktionen an, um vor jedem Test
        // den "globalen Zustand" zu resetten, so dass Tests sich nicht gegenseitig beeinflussen.
        beforeEach(() => {
            // 1) Alle relevanten Objekte leeren:
            for (const k in likelihoodConfigObj) delete likelihoodConfigObj[k];
            for (const k in impactConfigObj) delete impactConfigObj[k];
            for (const k in mappingObj) delete mappingObj[k];
            // 2) storedVector leeren (auf null setzen)
            //   ACHTUNG: Falls storedVector KEINE Export-Let-Variable ist, musst du
            //            ggf. über eine setter-Funktion vorgehen.
            if (storedVector && typeof storedVector === 'object') {
                Object.keys(storedVector).forEach(k => delete storedVector[k]);
            } else {
                // storedVector ist z.B. null => also kein Objekt
                // => entweder garnichts tun oder neu zuweisen:
                storedVector = {};
            }

            // 3) Default DOM aufräumen (JS-DOM)
            document.body.innerHTML = `
            <div class="LS"></div>
            <div class="IS"></div>
            <div class="RS"></div>
        `;
        });

        // ============== TEST 1 ==============
        test('1) Keine config-Objekte => return null und console.error', () => {
            // Wir manipulieren die globalen Objekte so,
            // dass likelihoodConfigObj & impactConfigObj leer sind:
            // (Sind sie nach beforeEach ohnehin.)

            const result = performAdvancedCalculation();
            expect(result).toBeNull();
            // Normalerweise würden wir hier console.error spy-en und prüfen,
            // dass die Fehlermeldung kam. Beispiel:
            // expect(console.error).toHaveBeenCalledWith("No config objects found - can't proceed.");
        });

        // ============== TEST 2 ==============
        test('2) config-Objekte vorhanden, aber kein mapping => return null', () => {
            // Füllen wir minimal das likelihoodConfigObj + impactConfigObj
            likelihoodConfigObj['LOW'] = [0,3];
            impactConfigObj['LOW'] = [0,3];
            // mappingObj bleibt leer => => performAdvancedCalculation => null

            const result = performAdvancedCalculation();
            expect(result).toBeNull();
        });

        // ============== TEST 3 ==============
        test('3) Alles vorhanden, aber storedVector nicht vorhanden (== null) => L=0, I=0 => finalRisk', () => {
            // 1) config füllen
            likelihoodConfigObj['LOW'] = [0,4];
            impactConfigObj['LOW'] = [0,4];
            // 2) mapping => "LOW-LOW" => "TEST_RISK"
            mappingObj['LOW-LOW'] = "TEST_RISK";

            // 3) storedVector = null => averageVector und maxVector => 0
            // Falls storedVector ein Objekt ist, mach z.B.:
            //   storedVector = null;
            //   (Oder mock if needed.)

            // Rufe die Funktion auf
            const result = performAdvancedCalculation();

            expect(result).not.toBeNull();
            expect(result.L_score).toBe(0);
            expect(result.I_score).toBe(0);
            expect(result.L_class).toBe('LOW');
            expect(result.I_class).toBe('LOW');
            expect(result.finalRisk).toBe('TEST_RISK');

            // Optional DOM check
            const LSElem = document.querySelector('.LS');
            expect(LSElem.textContent).toContain('0.000 LOW');
            const ISElem = document.querySelector('.IS');
            expect(ISElem.textContent).toContain('0.000 LOW');
            const RSElem = document.querySelector('.RS');
            expect(RSElem.textContent).toBe('TEST_RISK');
        });

        // ============== TEST 4 ==============
        test('4) Mit Vector => average / max => L_score=Durchschnitt, I_score=Maximum', () => {
            // Füllen wir config + mapping:
            likelihoodConfigObj['LOW'] = [0,2];
            likelihoodConfigObj['MEDIUM'] = [2,5];
            impactConfigObj['MINOR'] = [0,3];
            impactConfigObj['MAJOR'] = [3,9];
            mappingObj['LOW-MINOR'] = 'SAFE';
            mappingObj['LOW-MAJOR'] = 'RISKY';
            mappingObj['MEDIUM-MINOR'] = 'WARNING';
            mappingObj['MEDIUM-MAJOR'] = 'DANGER';

            // Nun einen Vector füllen:
            // Threat keys = sl,m,o,s,ed,ee,a,id (8 Felder) => average
            // Impact keys = lc,li,lav,lac,fd,rd,nc,pv (8 Felder) => max
            storedVector.sl = 1;
            storedVector.m  = 3;
            storedVector.o  = 5;  // note, affects average L => (1+3+5 +0+0+0+0+0)/8 = 9/8=1.125
            storedVector.s  = 0;
            storedVector.ed = 0;
            storedVector.ee = 0;
            storedVector.a  = 0;
            storedVector.id = 0;

            storedVector.lc  = 2;
            storedVector.li  = 2;
            storedVector.lav = 6; // max so far = 6
            storedVector.lac = 1;
            storedVector.fd  = 2;
            storedVector.rd  = 2;
            storedVector.nc  = 4; // now max=6 < 4 => still 6
            storedVector.pv  = 3;

            // => L_score=1.125 => => in "LOW" range, da [0,2]
            // => I_score=6 => => in "MAJOR" range, da [3,9]
            // => finalRisk => "LOW-MAJOR" => "RISKY"

            const result = performAdvancedCalculation();
            expect(result.L_score).toBeCloseTo(1.125, 5);
            expect(result.I_score).toBe(6);
            expect(result.L_class).toBe('LOW');
            expect(result.I_class).toBe('MAJOR');
            expect(result.finalRisk).toBe('RISKY');
        });

        // ============== TEST 5 ==============
        test('5) L_score am oberen Rand => testet getRangeClass-Grenze', () => {
            likelihoodConfigObj['LOW'] = [0,2];
            likelihoodConfigObj['MEDIUM'] = [2,5];
            // Schauen wir, ob 2.0 => MEDIUM oder noch LOW?
            // Du scheinst den check zu machen: if (value >= min && value < max)
            // => bei EXACT =2 => => MEDIUM
            impactConfigObj['LOW'] = [0,5];
            mappingObj['MEDIUM-LOW'] = 'OK';

            // Vector => L_score=2.0
            storedVector.sl = 2; // alle others 0 => average= 2/8=0.25 => Warte, wir brauchen 8 Felder...
            // => pass auf, wir brauchen 8 Felder für average -> Machen wirs einfacher => Mache m=2,sl=2 => (2+2)/8=0.5 => Nicht 2.
            // => Dann machen wir => mock averageVector?

            // ODER wir rufen averageVector normal auf:
            // 8 Felder => sl=16 => 16/8=2
            storedVector.sl=16;
            storedVector.m=0;
            storedVector.o=0;
            storedVector.s=0;
            storedVector.ed=0;
            storedVector.ee=0;
            storedVector.a=0;
            storedVector.id=0;

            // Impact => egal, wir haben nur 1 Impact-Level=LOW => final "MEDIUM-LOW" => 'OK'
            storedVector.lc=0;
            storedVector.li=0;
            storedVector.lav=0;
            storedVector.lac=0;
            storedVector.fd=0;
            storedVector.rd=0;
            storedVector.nc=0;
            storedVector.pv=0;

            const result = performAdvancedCalculation();
            expect(result).not.toBeNull();
            // => L_score=2 => in [2,5) => "MEDIUM"
            expect(result.L_class).toBe('MEDIUM');
            expect(result.finalRisk).toBe('OK');
        });

        // ============== TEST 6 ==============
        test('6) Impact negativ => getRangeClass => "ERROR", mapping => "ERROR"', () => {
            // config => L =>  [0,5], I => [0,5]
            likelihoodConfigObj['LOW'] = [0,5];
            impactConfigObj['LOW'] = [0,5];
            mappingObj['LOW-LOW'] = 'OK';

            // Vector => L-Score normal, I-Score = -2 => => getRangeClass => "ERROR"
            storedVector.sl=0; storedVector.m=0; storedVector.o=0; storedVector.s=0;
            storedVector.ed=0; storedVector.ee=0; storedVector.a=0; storedVector.id=0; // => average=0
            storedVector.lc=-2; // => max= -2
            // => => I_class="ERROR", so finalRisk="ERROR"

            const result = performAdvancedCalculation();
            expect(result).not.toBeNull();
            expect(result.L_class).toBe('LOW'); // 0 => "LOW"
            expect(result.I_class).toBe('ERROR');
            expect(result.finalRisk).toBe('ERROR');
        });

// ============== TEST 7 ==============
        test('7) UI-Update => LS/IS/RS - Felder vorhanden => check innerText', () => {
            // config:
            likelihoodConfigObj['LOW'] = [0,5];
            impactConfigObj['HIGH'] = [5,9];
            mappingObj['LOW-HIGH'] = 'TEST-RISK';

            // Threat-Keys => 8 Felder
            // Wir wollen sum=10, count=8 => average=1.25 => => "LOW"
            storedVector.sl = 5;
            storedVector.m  = 5;
            storedVector.o  = 0;
            storedVector.s  = 0;
            storedVector.ed = 0;
            storedVector.ee = 0;
            storedVector.a  = 0;
            storedVector.id = 0;

            // Impact-Keys => wir setzen hier mindestens lc=9,
            // damit max=9 => => "HIGH"
            storedVector.lc  = 9;
            storedVector.li  = 0;
            storedVector.lav = 0;
            storedVector.lac = 0;
            storedVector.fd  = 0;
            storedVector.rd  = 0;
            storedVector.nc  = 0;
            storedVector.pv  = 0;

            // Jetzt sollte L_score=1.25 => "LOW", I_score=9 => "HIGH"
            // => finalRisk => "TEST-RISK"

            const result = performAdvancedCalculation();

            expect(document.querySelector('.LS').textContent).toContain('1.250 LOW');
            expect(document.querySelector('.IS').textContent).toContain('9.000 HIGH');
            expect(document.querySelector('.RS').textContent).toBe('TEST-RISK');
            expect(result.finalRisk).toBe('TEST-RISK');
        });

        // ============== TEST 8 ==============
        test('8) UI-Update => LS/IS/RS - Felder NICHT vorhanden => kein Fehler, nur warn-loses Durchlaufen', () => {
            // wir löschen die Felder aus dem DOM
            document.body.innerHTML = '';
            likelihoodConfigObj['LOW'] = [0,9];
            impactConfigObj['LOW'] = [0,9];
            mappingObj['LOW-LOW'] = 'OK';

            // Irgendein Vector
            storedVector.sl=4;
            const result = performAdvancedCalculation();
            expect(result).not.toBeNull();
            // Hier kein expect(...) auf textContent, da die Felder nicht existieren
            // => Kein Fehler
        });

        // ============== TEST 9 ==============
        test('9) L_class=ERROR => mapping => "ERROR" => check RS text', () => {
            likelihoodConfigObj['LOW'] = [0,2];
            likelihoodConfigObj['MEDIUM'] = [2,5];
            // => L_score=7 => => passt in keines => "ERROR"
            impactConfigObj['HIGH'] = [0,9];
            mappingObj['ERROR-HIGH'] = 'IMPOSSIBLE'; // du kannst so was definieren, oder gar nicht definieren

            storedVector.sl=7*8; // average =7 => => L_class="ERROR"
            // Impact => 0 => => "HIGH"? -> 0 liegt in [0,9) => "HIGH"
            // => finalRisk => getMappedRisk("ERROR","HIGH") => "IMPOSSIBLE" (wenn Key existiert)
            //  sonst "ERROR"

            mappingObj['ERROR-HIGH'] = 'IMPOSSIBLE';
            const result = performAdvancedCalculation();
            expect(result.finalRisk).toBe('ERROR');
        });

        // ============== TEST 10 ==============
        test('10) L_class=ANY, I_class=ERROR => => finalRisk="ERROR"', () => {
            likelihoodConfigObj['LOW'] = [0,9]; // => L_score=All=LOW
            impactConfigObj['MEDIUM'] = [2,5];
            impactConfigObj['HIGH']   = [5,9];
            // => 0 => passt in keines => => "ERROR" ?
            // Actually if (value >=2 && <5 => MEDIUM) but 0 <2 => fail => => "ERROR"?
            mappingObj['LOW-ERROR'] = 'WONT HAPPEN?';

            storedVector.sl=0; // => average=0 => L_class=LOW
            // Impact => negativity or something => => "ERROR"
            storedVector.lc=1.5;
            storedVector.li=1.5;
            // => max=1.5 => check [2,5),(5,9) => => passt nicht => => "ERROR"

            const result = performAdvancedCalculation();
            expect(result.I_class).toBe('ERROR');
            // getMappedRisk('LOW','ERROR') => "ERROR" wenn kein Key "LOW-ERROR" existiert oder "WONT HAPPEN?"
            // Falls du definierst => "LOW-ERROR" = "something"
            expect(result.finalRisk).toBe('ERROR');
        });

        // ============== TEST 11 ==============
        test('11) Check runde Werte => average=2.500 => toFixed(3) => "2.500"', () => {
            likelihoodConfigObj['MID'] = [0,9];
            impactConfigObj['MID'] = [0,9];
            mappingObj['MID-MID'] = 'OK';

            // average => (2+3)/8=0.625 => das ist nicht 2.5 => wir definieren Vector anders
            // Wir wollen 2.5 => => Sum=2.5 *8=20 => verteil es zb. storedVector.sl=10, m=10 => sum=20
            storedVector.sl = 10;
            storedVector.m  = 10;
            storedVector.o  = 0;
            storedVector.s  = 0;
            storedVector.ed = 0;
            storedVector.ee = 0;
            storedVector.a  = 0;
            storedVector.id = 0;
            // rest=0 => => average=20/8=2.5 => => "MID"
            storedVector.lc=4;  // => max=4 => => "MID"

            const result = performAdvancedCalculation();
            expect(result.L_score).toBeCloseTo(2.5, 5);
            expect(document.querySelector('.LS').textContent).toContain('2.500 MID');
        });

        // ============== TEST 12 ==============
        test('12) Check maxVector => negative und positive => zB (-5, 3, 2, 1) => max=3', () => {
            likelihoodConfigObj['LOW'] = [0,5];
            impactConfigObj['LOW'] = [0,5];
            mappingObj['LOW-LOW'] = 'OK';
            // L => 0 => we only fill the threat keys w zeros
            storedVector.sl=-5; storedVector.m= -2;
            // => sum= -7 => average= -7/8= -0.875 => => => getRangeClass => ERROR,
            // egal, wir checken Impact => max =>
            storedVector.lc=-5; storedVector.li=3; storedVector.lav=2; storedVector.lac=1; // => max=3
            // => 3 => "LOW"

            const result = performAdvancedCalculation();
            expect(result.I_score).toBe(3);
            // => I_class=LOW, L_class => vermutlich ERROR => finalRisk => "ERROR"
            // (es sei denn du definierst "ERROR-LOW")
            // -> Da kein "ERROR-LOW" in mapping => => "ERROR"
            expect(result.finalRisk).toBe('ERROR');
        });

        // ============== TEST 13 ==============
        test('13) "Edge" => L_score exakt = maxVal => => NICHT mehr in Range => => "ERROR"?', () => {
            // WENN dein getRangeClass checkt: if (value >= min && value < max)
            // => max=5 => value=5 => passt NICHT => => "ERROR"
            likelihoodConfigObj['LOW'] = [0,5];
            impactConfigObj['LOW'] = [0,9];
            mappingObj['LOW-LOW'] = 'OK';

            // average => 5 => => >=0 && <5 => false => => "ERROR"
            storedVector.sl=5*8; // => sum=40 => average=40/8=5
            // Impact => 0 => => => "LOW"

            const result = performAdvancedCalculation();
            expect(result.L_class).toBe('ERROR');
            expect(result.finalRisk).toBe('ERROR');
        });

        // ============== TEST 14 ==============
        test('14) "Edge" => L_score exakt = minVal => => in Range? (zB 2 => >=2 && <5 => yes)', () => {
            // range => [2,5]
            likelihoodConfigObj['MEDIUM'] = [2,5];
            impactConfigObj['ANY'] = [0,9];
            mappingObj['MEDIUM-ANY'] = 'FINE';

            // Wir wollen sum=16, count=8 => average=2
            // => verteilen wir z.B. 2 auf jedes Key:
            storedVector.sl = 2;
            storedVector.m  = 2;
            storedVector.o  = 2;
            storedVector.s  = 2;
            storedVector.ed = 2;
            storedVector.ee = 2;
            storedVector.a  = 2;
            storedVector.id = 2;
            // => sum=2*8=16, count=8 => average=2
            const result = performAdvancedCalculation();
            expect(result.L_class).toBe('MEDIUM');
            expect(result.finalRisk).toBe('FINE');
        });

        // ============== TEST 15 ==============
        test('15) Kein Vector => L=I=0 => check if no SWAL or error => normal run', () => {
            // best case config
            likelihoodConfigObj['LOW'] = [0,9];
            impactConfigObj['LOW'] = [0,9];
            mappingObj['LOW-LOW'] = 'OK';

            // storedVector => null
            const result = performAdvancedCalculation();
            expect(result).not.toBeNull();
            expect(result.L_score).toBe(0);
            expect(result.I_score).toBe(0);
            expect(result.finalRisk).toBe('OK');
        });

        // ============== TEST 16 ==============
        test('16) vector => all 9 => L => average=9, I => max=9 => check Range', () => {
            // config => [0,9] => 9 <9 => ??? => "ERROR" evtl.
            // if range = [0,9], value=9 => => NOT in [0,9) => => "ERROR"
            // => final => "ERROR-ERROR" => => "ERROR"
            likelihoodConfigObj['LOW'] = [0,9];
            impactConfigObj['LOW'] = [0,9];
            mappingObj['ERROR-ERROR'] = 'TOTALLY WRONG?';

            // 8 Threat keys => all =9 => sum=9*8=72 => average=9
            storedVector.sl=9; storedVector.m=9; storedVector.o=9; storedVector.s=9;
            storedVector.ed=9; storedVector.ee=9; storedVector.a=9; storedVector.id=9;

            // 8 Impact keys => all=9 => max=9
            storedVector.lc=9; storedVector.li=9; storedVector.lav=9; storedVector.lac=9;
            storedVector.fd=9; storedVector.rd=9; storedVector.nc=9; storedVector.pv=9;

            const result = performAdvancedCalculation();
            expect(result.L_class).toBe('LOW');
            expect(result.I_class).toBe('LOW');
            // => getMappedRisk("ERROR","ERROR") => Falls nicht definiert => => "ERROR"
            expect(result.finalRisk).toBe('ERROR');
        });

        // ============== TEST 17 ==============
        test('17) vector => gemischte Values => L= 4.5 => read config => "MEDIUM"?', () => {
            // config => MEDIUM => [3,5], => 4.5 => in => "MEDIUM"
            likelihoodConfigObj['LOW']=[0,3];
            likelihoodConfigObj['MEDIUM']=[3,5];
            likelihoodConfigObj['HIGH']=[5,9];
            impactConfigObj['LOW']=[0,4];
            impactConfigObj['HIGH']=[4,9];
            mappingObj['MEDIUM-LOW']='ML';
            mappingObj['MEDIUM-HIGH']='MH';

            // L => average => sum=36 => => 36/8=4.5 => => "MEDIUM"
            storedVector.sl=9; storedVector.m=9; // => 18
            storedVector.o=9; storedVector.s=0;  // => 27
            storedVector.ed=9; storedVector.ee=0;// => 36
            storedVector.a=0; storedVector.id=0; // => 36 total => /8=4.5
            // I => max => => let's say lc=3 => => => "LOW"
            storedVector.lc=3;

            const result = performAdvancedCalculation();
            expect(result.L_class).toBe('MEDIUM');
            expect(result.I_class).toBe('LOW');
            expect(result.finalRisk).toBe('ML');
        });

        // ============== TEST 18 ==============
        test('18) vector => impact= 8 => => "HIGH"', () => {
            // config => L => [0,10], I => [0,5], [5,9]
            likelihoodConfigObj['ANY'] = [0,10];
            impactConfigObj['MEDIUM']=[3,5];
            impactConfigObj['HIGH']=[5,9];
            mappingObj['ANY-HIGH'] = 'CRITICAL';

            // Threat => 0 => => L_score=0 => "ANY"
            // Impact => max=8 => => in [5,9) => "HIGH"
            storedVector.lc=8;
            const result = performAdvancedCalculation();
            expect(result.L_class).toBe('ANY');
            expect(result.I_class).toBe('HIGH');
            expect(result.finalRisk).toBe('CRITICAL');
        });

        // ============== TEST 19 ==============
        test('19) große negative Threat => average => -100 => => L_class=ERROR => final=ERROR', () => {
            likelihoodConfigObj['LOW']=[0,3];
            likelihoodConfigObj['MEDIUM']=[3,6];
            impactConfigObj['ANY']=[0,9];
            // => Kein "ERROR-ANY" => => => final=ERROR
            mappingObj['LOW-ANY']='LA';
            mappingObj['MEDIUM-ANY']='MA';

            // Threat => sum= -800 => average= -800/8= -100 => => "ERROR"
            storedVector.sl=-100; storedVector.m=-100; storedVector.o=-100; storedVector.s=-100;
            storedVector.ed=-100; storedVector.ee=-100; storedVector.a=-100; storedVector.id=-100;
            // Impact => 0 => => "ANY"
            const result = performAdvancedCalculation();
            expect(result.L_class).toBe('ERROR');
            expect(result.I_class).toBe('ANY');
            expect(result.finalRisk).toBe('ERROR');
        });

        // ============== TEST 20 ==============
        test('20) final console.log output => checks the returned result object', () => {
            // Wir definieren schnell L, I
            likelihoodConfigObj['LOW']=[0,9];
            impactConfigObj['LOW']=[0,9];
            mappingObj['LOW-LOW']='OK';

            storedVector.sl=1; // => average => 1/8= 0.125
            const result = performAdvancedCalculation();
            expect(result).toEqual({
                L_score: expect.any(Number),
                I_score: expect.any(Number),
                L_class: 'LOW',
                I_class: 'LOW',
                finalRisk: 'OK'
            });
        });
    });
});