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
            expect(vec).toBeNull();
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
});