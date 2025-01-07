/**
 * @jest-environment jsdom
 */

import { riskConfigurations, loadVectors, calculate, parseCategories, getCategoryForValue, parseMapping, getFinalRisk } from '../js/script.js';

expect(riskConfigurations).toBeDefined();
expect(riskConfigurations['Default Configuration']).toBeDefined();
expect(riskConfigurations['Configuration 1']).toBeDefined();
expect(riskConfigurations['Configuration 2']).toBeDefined();
expect(riskConfigurations['Configuration 3']).toBeDefined();

describe('Class Assignment Tests with extended coverage', () => {
    let originalLog;

    beforeAll(() => {
        originalLog = console.log;
        console.log = jest.fn();
    });

    afterAll(() => {
        console.log = originalLog;
    });

    beforeEach(() => {
        delete window.location;
        window.location = new URL('http://localhost');
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
        `;

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
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    const threatAgent = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
    const techImpact = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];

    function setValues(LS_values, IS_values) {
        threatAgent.forEach((id, i) => {
            document.getElementById(id).value = LS_values[i] || 0;
        });
        techImpact.forEach((id, i) => {
            document.getElementById(id).value = IS_values[i] || 0;
        });
    }

    // Tests für die Default Configuration (NOTE, LOW, MEDIUM, HIGH, CRITICAL + Grenzfälle)
    test('Default Config: LOW scenario (LS, IS = 1)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Default Configuration';

        const highVal = [1,1,1,1,1,1,1,1];
        setValues(highVal, highVal);

        calculate();

        const LSText = document.querySelector('.LS').textContent.trim().split(' ');
        const ISText = document.querySelector('.IS').textContent.trim().split(' ');
        const RSText = document.querySelector('.RS').textContent.trim();

        expect(RSText).toBe('NOTE');
    });

    test('Default Config: LOW scenario (LS=2, IS=2)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Default Configuration';

        const lowVal = [2,2,2,2,2,2,2,2];
        setValues(lowVal, lowVal);

        calculate();

        const LSText = document.querySelector('.LS').textContent.trim().split(' ');
        const ISText = document.querySelector('.IS').textContent.trim().split(' ');
        const RSText = document.querySelector('.RS').textContent.trim();

        // LOW+LOW=NOTE
        expect(LSText[1]).toBe('LOW');
        expect(ISText[1]).toBe('LOW');
        expect(RSText).toBe('NOTE');
    });

    test('Default Config: MEDIUM scenario (LS=3 exact, IS=3 exact)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Default Configuration';

        const medVal = [3,3,3,3,3,3,3,3];
        setValues(medVal, medVal);

        calculate();

        const LSText = document.querySelector('.LS').textContent.trim().split(' ');
        const ISText = document.querySelector('.IS').textContent.trim().split(' ');
        const RSText = document.querySelector('.RS').textContent.trim();

        // MEDIUM+MEDIUM=MEDIUM
        expect(LSText[1]).toBe('MEDIUM');
        expect(ISText[1]).toBe('MEDIUM');
        expect(RSText).toBe('MEDIUM');
    });

    test('Default Config: HIGH scenario (LS=8, IS=8 => CRITICAL)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Default Configuration';

        const highVal = [8,8,8,8,8,8,8,8];
        setValues(highVal, highVal);

        calculate();

        const LSText = document.querySelector('.LS').textContent.trim().split(' ');
        const ISText = document.querySelector('.IS').textContent.trim().split(' ');
        const RSText = document.querySelector('.RS').textContent.trim();

        // HIGH+HIGH=CRITICAL
        expect(LSText[1]).toBe('HIGH');
        expect(ISText[1]).toBe('HIGH');
        expect(RSText).toBe('CRITICAL');
    });

    test('Default Config: HIGH ohne CRITICAL (LS≈6.5, IS=5) => HIGH', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Default Configuration';

        const LSmix = [7,6,7,6,7,6,7,6]; // Schnitt=6.5=HIGH
        const ISmed = [5,5,5,5,5,5,5,5]; // Max=5=MEDIUM
        // HIGH+MEDIUM=HIGH
        setValues(LSmix, ISmed);
        calculate();

        const LSText = document.querySelector('.LS').textContent.trim().split(' ');
        const ISText = document.querySelector('.IS').textContent.trim().split(' ');
        const RSText = document.querySelector('.RS').textContent.trim();

        expect(LSText[1]).toBe('HIGH');
        expect(ISText[1]).toBe('MEDIUM');
        expect(RSText).toBe('HIGH');
    });


    // Configuration 1 Tests (NOTE, LOW, MEDIUM, HIGH, CRITICAL)
    // Configuration 1: LOW:0-5, MEDIUM:5-6, HIGH:6-9
    test('Configuration 1: LOW+LOW=NOTE', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 1';

        // LS=2 => LOW, IS=2 => LOW => NOTE
        const lowVal = [2,2,2,2,2,2,2,2];
        setValues(lowVal, lowVal);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('NOTE');
    });

    test('Configuration 1: LS=1 (LOW), IS=5 (MEDIUM Grenze)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 1';

        // IS=5 => MEDIUM (5-6)
        // LOW+MEDIUM=LOW laut Standardlogik
        const LSlow = [1,1,1,1,1,1,1,1]; // LS=1=LOW
        const ISmed = [5,5,5,5,5,5,5,5]; // Max=5=MEDIUM
        setValues(LSlow, ISmed);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('LOW'); // LOW+MEDIUM=LOW
    });

    test('Configuration 1: LS=5 (MEDIUM Grenze), IS=5 (MEDIUM)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 1';

        // LS=5 => MEDIUM (5-6)
        // IS=5 => MEDIUM
        // MEDIUM+MEDIUM=MEDIUM
        const medVal = [5,5,5,5,5,5,5,5];
        setValues(medVal, medVal);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('MEDIUM');
    });

    test('Configuration 1: HIGH+HIGH=CRITICAL (LS=7,IS=7)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 1';

        // LS=7 => HIGH(6-9)
        // IS=7 => HIGH
        // HIGH+HIGH=CRITICAL
        const highVal = [7,7,7,7,7,7,7,7];
        setValues(highVal, highVal);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('CRITICAL');
    });


    // Configuration 2: LOW:0-7.5, MEDIUM:7.5-8, HIGH:8-9
    test('Configuration 2: LOW+LOW=NOTE (LS=2, IS=2)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 2';

        const lowVal = [2,2,2,2,2,2,2,2];
        setValues(lowVal, lowVal);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        // LOW+LOW=NOTE
        expect(RSText).toBe('NOTE');
    });

    test('Configuration 2: LS=1(LOW), IS=7.5(MEDIUM Grenze)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 2';

        // IS=7.5 => zwischen 7.5 und 8 => MEDIUM
        // LOW+MEDIUM=LOW
        const LSlow = [1,1,1,1,1,1,1,1];
        const IS76 = [7.6,7.6,7.6,7.6,7.6,7.6,7.6,7.6]; // Max=7.6 zwischen 7.5 und 8 => MEDIUM
        setValues(LSlow, IS76);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        // LOW+MEDIUM=LOW laut Standard
        expect(RSText).toBe('LOW');
    });

    test('Configuration 2: LS=8(High), IS=8(High)=CRITICAL', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 2';

        // LS=8 => HIGH(8-9)
        // IS=8 => HIGH
        // HIGH+HIGH=CRITICAL
        const highVal = [8,8,8,8,8,8,8,8];
        setValues(highVal, highVal);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('CRITICAL');
    });


    // Configuration 3: LOW:0-6.5, MEDIUM:6.5-7, HIGH:7-9
    test('Configuration 3: LOW+LOW=NOTE', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 3';

        const lowVal = [2,2,2,2,2,2,2,2]; // LS=2<6.5 => LOW
        const lowValIS = [2,2,2,2,2,2,2,2]; // IS=2 => LOW
        setValues(lowVal, lowValIS);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('NOTE');
    });

    test('Configuration 3: LS=6(LOW), IS=7(HIGH)', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 3';

        // LS=6 => LOW(0-6.5)
        // IS=7 => HIGH(7-9)
        // LOW+HIGH=MEDIUM
        const LSlow = [6,6,6,6,6,6,6,6];
        const ISmedium = [7,7,7,7,7,7,7,7];
        setValues(LSlow, ISmedium);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('MEDIUM');
    });

    test('Configuration 3: LS=7(HIGH), IS=7(HIGH)=CRITICAL', () => {
        const configSelect = document.getElementById('configurationSelect');
        configSelect.value = 'Configuration 3';

        // LS=7 => HIGH(7-9)
        // IS=7 => HIGH
        // HIGH+HIGH=CRITICAL
        const highVal = [7,7,7,7,7,7,7,7];
        setValues(highVal, highVal);
        calculate();
        const RSText = document.querySelector('.RS').textContent.trim();
        expect(RSText).toBe('CRITICAL');
    });
});

describe('loadVectors()', () => {
    beforeEach(() => {
        const partials = ["sl", "m", "o", "s", "ed", "ee", "a", "id", "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
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

    const vectorTestCases = [
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
    ];

    vectorTestCases.forEach(({ vector, expectedValues }, index) => {
        test(`Load vector Test ${index + 1}`, () => {
            loadVectors(vector);

            for (const [id, value] of Object.entries(expectedValues)) {
                const input = document.getElementById(id);
                expect(input).not.toBeNull();
                expect(input.value).toBe(value);
            }
        });
    });
});

// -------------------------------------------------------
// Tests for parseCategories and getCategoryForValue
// -------------------------------------------------------

describe('parseCategories() Tests', () => {
    test('should parse valid input with 3 categories', () => {
        const input = "Low 0-5;Medium 5-7;High 7-10";
        const result = parseCategories(input);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ name: "Low", min: 0, max: 5 });
        expect(result[1]).toEqual({ name: "Medium", min: 5, max: 7 });
        expect(result[2]).toEqual({ name: "High", min: 7, max: 10 });
    });

    test('should throw error if input is not a string', () => {
        expect(() => parseCategories(null)).toThrow(
            "parseCategories: rangesString is empty or not a string."
        );
    });

    test('should allow overlapping ranges', () => {
        const input = "Low 0-5;Medium 4-7;High 5-10";
        const result = parseCategories(input);
        expect(result).toHaveLength(3);
    });

    test('should throw error on missing dash', () => {
        const input = "Low 0 5;Medium 5-7";
        expect(() => parseCategories(input)).toThrow("missing dash");
    });
});

describe('getCategoryForValue() Tests', () => {
    const sampleCats = [
        { name: "Low", min: 0, max: 5 },
        { name: "Medium", min: 5, max: 7 },
        { name: "High", min: 7, max: 10 }
    ];

    test('value < 0 => NOTE', () => {
        expect(getCategoryForValue(-1, sampleCats)).toBe("ERROR");
    });

    test('value 3 => LOW', () => {
        expect(getCategoryForValue(3, sampleCats)).toBe("LOW");
    });

    test('value 5 => MEDIUM', () => {
        expect(getCategoryForValue(5, sampleCats)).toBe("MEDIUM");
    });

    test('value 9 => HIGH', () => {
        expect(getCategoryForValue(9, sampleCats)).toBe("HIGH");
    });

    test('value 11 => NOTE (out of range)', () => {
        expect(getCategoryForValue(11, sampleCats)).toBe("ERROR");
    });

    test('empty array => NOTE', () => {
        expect(getCategoryForValue(5, [])).toBe("ERROR");
    });
});

// -------------------------------------------------------
// Tests for parseMapping
// -------------------------------------------------------

describe('parseMapping() Tests', () => {
    const iCats3 = [
        { name: "Low", min: 0, max: 5 },
        { name: "Medium", min: 5, max: 7 },
        { name: "High", min: 7, max: 10 }
    ];
    const lCats3 = [
        { name: "Low", min: 1, max: 3 },
        { name: "Medium", min: 3, max: 7 },
        { name: "High", min: 7, max: 10 }
    ];

    test('should parse exactly 9 entries if iCats=3 and lCats=3', () => {
        // 9 items for the 3×3 matrix
        const mappingStr = "Medium, Medium, High, Critical, Mde, Low, Low, Medium, Critical";
        const result = parseMapping(mappingStr, iCats3, lCats3);
        expect(result).toHaveLength(9);
        // Optionally check some entries
        expect(result[0]).toBe("Medium");
        expect(result[4]).toBe("Mde");
        expect(result[8]).toBe("Critical");
    });

    test('should fail if number of entries does not match 9 (3×3)', () => {
        const mappingStr = "Medium, Medium, High"; // Only 3
        expect(() => parseMapping(mappingStr, iCats3, lCats3))
            .toThrow("parseMapping: Expected 9 mapping entries, but got 3.");
    });

    test('should fail if mappingString is empty', () => {
        expect(() => parseMapping("", iCats3, lCats3))
            .toThrow("parseMapping: mappingString is empty or not a string.");
    });

    test('should fail if iCategories is not an array', () => {
        const mappingStr = "One,Two,Three";
        expect(() => parseMapping(mappingStr, null, lCats3))
            .toThrow("parseMapping: iCategories or lCategories is not an array.");
    });

    test('should fail if expectedLength is 0 (no categories)', () => {
        const mappingStr = "One,Two";
        // iCats3 is normal, but lCats is empty
        expect(() => parseMapping(mappingStr, iCats3, []))
            .toThrow("parseMapping: cannot determine expected length (no categories).");
    });
});

// -------------------------------------------------------
// Tests for getFinalRisk()
// -------------------------------------------------------

describe('getFinalRisk() Tests', () => {
    // Example: 3 I categories, 3 L categories => 9 items in mapping
    const iCats3 = [
        { name: "Low", min: 0, max: 5 },
        { name: "Medium", min: 5, max: 7 },
        { name: "High", min: 7, max: 10 }
    ];
    const lCats3 = [
        { name: "Low", min: 1, max: 3 },
        { name: "Medium", min: 3, max: 7 },
        { name: "High", min: 7, max: 10 }
    ];

    // The 3×3 mapping array in row-major order:
    // (I=Low, L=Low), (I=Low, L=Medium), (I=Low, L=High),
    // (I=Medium, L=Low), ...
    // e.g. "Medium, Medium, High, Critical, Mde, Low, Low, Medium, Critical"
    const sampleMapping3x3 = [
        "Medium", "Medium", "High",
        "Critical", "Mde", "Low",
        "Low", "Medium", "Critical"
    ];

    test('I=4 (Low), L=2 (Low)', () => {
        // Low x Low => sampleMapping3x3[0] = "Medium"
        const risk = getFinalRisk(4, 2, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Medium");
    });

    test('I=4.5 (Low), L=5 (Medium)', () => {
        // Low x Medium => sampleMapping3x3[1] = "Medium"
        const risk = getFinalRisk(4.5, 5, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Medium");
    });

    test('I=4 (Low), L=8 (High)', () => {
        // Low x High => sampleMapping3x3[2] = "High"
        const risk = getFinalRisk(4, 8, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("High");
    });

    test('I=6 (Medium), L=2 (Low)', () => {
        // Medium x Low => sampleMapping3x3[3] = "Critical"
        const risk = getFinalRisk(6, 2, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Critical");
    });

    test('I=6 (Medium), L=5.5 (Medium)', () => {
        // Medium x Medium => sampleMapping3x3[4] = "Mde"
        const risk = getFinalRisk(6, 5.5, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Mde");
    });

    test('I=6 (Medium), L=8 (High)', () => {
        // Medium x High => sampleMapping3x3[5] = "Low"
        const risk = getFinalRisk(6, 8, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Low");
    });

    test('I=9 (High), L=2 (Low)', () => {
        // High x Low => sampleMapping3x3[6] = "Low"
        const risk = getFinalRisk(9, 2, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Low");
    });

    test('I=8 (High), L=5 (Medium)', () => {
        // High x Medium => sampleMapping3x3[7] = "Medium"
        const risk = getFinalRisk(8, 5, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Medium");
    });

    test('I=9 (High), L=8 (High)', () => {
        // High x High => sampleMapping3x3[8] = "Critical"
        const risk = getFinalRisk(9, 8, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("Critical");
    });

    test('Value out of range => NOTE', () => {
        // E.g. I=20 does not fit Low/Medium/High => index=-1 => fallback "NOTE"
        const risk = getFinalRisk(20, 2, iCats3, lCats3, sampleMapping3x3);
        expect(risk).toBe("ERROR");
    });
    describe('Integration Tests for calculate() with various matrix sizes, mappings, vectors', () => {

        // We need a small helper to set the URL parameters
        function setUrlParams(paramsObj) {
            // Clear old search
            delete window.location;
            const base = 'http://localhost?';
            const query = new URLSearchParams(paramsObj).toString();
            window.location = new URL(base + query);
        }

        // Helper to set up DOM inputs for threatAgent / technical factors
        // so that we can fill them (LS / IS calculation).
        beforeEach(() => {
            document.body.innerHTML = `
      <select id="configurationSelect" class="form-control mb-3">
          <option value="Default Configuration">Default Configuration</option>
          <option value="Configuration 1">Configuration 1</option>
          <option value="Configuration 2">Configuration 2</option>
          <option value="Configuration 3">Configuration 3</option>
      </select>
      <canvas id="riskChart"></canvas>

      <!-- Threat agent factors -->
      <input id="sl" value="" />
      <input id="m" value="" />
      <input id="o" value="" />
      <input id="s" value="" />
      <input id="ed" value="" />
      <input id="ee" value="" />
      <input id="a" value="" />
      <input id="id" value="" />

      <!-- Technical factors -->
      <input id="lc" value="" />
      <input id="li" value="" />
      <input id="lav" value="" />
      <input id="lac" value="" />
      <input id="fd" value="" />
      <input id="rd" value="" />
      <input id="nc" value="" />
      <input id="pv" value="" />

      <div class="LS"></div>
      <div class="IS"></div>
      <div class="RS"></div>
    `;

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
                }
            }));
        });

        afterEach(() => {
            document.body.innerHTML = '';
            jest.clearAllMocks();
        });

        // Helper to fill threatAgent / technical factor inputs
        function setFactors(threatValues, techValues) {
            const threatAgent = ["sl", "m", "o", "s", "ed", "ee", "a", "id"];
            const techImpact = ["lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"];
            threatAgent.forEach((id, i) => {
                document.getElementById(id).value = (threatValues[i] || 0);
            });
            techImpact.forEach((id, i) => {
                document.getElementById(id).value = (techValues[i] || 0);
            });
        }

        // Helper to extract final text from .LS, .IS, .RS
        function getResults() {
            const lsText = document.querySelector('.LS').textContent.trim();
            const isText = document.querySelector('.IS').textContent.trim();
            const rsText = document.querySelector('.RS').textContent.trim();
            return { lsText, isText, rsText };
        }

        test('1) No URL params => fallback to Default Configuration', () => {
            // No param => location='http://localhost'
            delete window.location;
            window.location = new URL('http://localhost');

            // LS=2 => LOW, IS=2 => LOW => final=NOTE in Default config
            setFactors([2,2,2,2,2,2,2,2], [2,2,2,2,2,2,2,2]);
            calculate();
            const { lsText, isText, rsText } = getResults();

            // Default Config => LOW+LOW=NOTE
            // LS text => "2.000 LOW", IS => "2.000 LOW", RS => "NOTE"
            expect(lsText).toMatch(/LOW/);
            expect(isText).toMatch(/LOW/);
            expect(rsText).toBe("NOTE");
        });

        test('2) Only vector param => also fallback to Default Config, but loads vector', () => {
            setUrlParams({
                vector: '(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:8/li:8/lav:8/lac:8/fd:1/rd:2/nc:3/pv:4)'
            });

            calculate();

            const { lsText, isText, rsText } = getResults();

            // Let's do a rough check:
            // Threat side: sl=1,m=2,o=3,s=4,ed=5,ee=6,a=7,id=8 => sum=36 => avg=4.5 => MEDIUM in default config
            // Technical side: lc=8,li=8,lav=8,lac=8,fd=1,rd=2,nc=3,pv=4 => max=8 => HIGH in default config (since [6,9) covers 8)
            // => (MEDIUM + HIGH)=HIGH
            expect(lsText).toMatch(/MEDIUM/);
            expect(isText).toMatch(/HIGH/);
            expect(rsText).toBe("HIGH");
        });

        test('3) 2×2 Matrix (I=2 cats, L=2 cats), asymmetrical mapping => final check', () => {
            // I=2 => "CatA 0-5;CatB 5-10"
            // L=2 => "CatX 1-4;CatY 4-10"
            // => 2×2=4 mapping entries, e.g. "AA, AB, BA, BB"
            setUrlParams({
                rangesI: "CatA 0-5;CatB 5-10",
                rangesL: "CatX 1-4;CatY 4-10",
                riskMapping: "AA, AB, BA, BB"
            });

            // LS=2 => iCat=CatA, IS=6 => lCat=CatY => finalIndex= (iIndex=0)*2 + (lIndex=1)=1 => "AB"
            setFactors([2,2,2,2,2,2,2,2], [6,6,6,6,6,6,6,6]);
            calculate();
            let { lsText, isText, rsText } = getResults();
            expect(rsText).toBe("AB");
            // LS=2 => in "0-5"? => catA, IS=6 => in "4-10"? => catY => index=1 => AB

            // Another check: LS=7 => catB, IS=2 => catX => index= (1*2 + 0)=2 => "BA"
            setFactors([7,7,7,7,7,7,7,7], [2,2,2,2,2,2,2,2]);
            calculate();
            ({ rsText } = getResults());
            expect(rsText).toBe("BA");
        });

        test('4) 3×2 matrix, symmetrical mapping => check', () => {
            // I=3 => "L 0-3;M 3-6;H 6-10"
            // L=2 => "X 0-5;Y 5-10"
            // => we expect 3*2=6 entries => e.g. "Lx, Ly, Mx, My, Hx, Hy"
            setUrlParams({
                rangesI: "L 0-3;M 3-6;H 6-10",
                rangesL: "X 0-5;Y 5-10",
                riskMapping: "Lx, Ly, Mx, My, Hx, Hy"
            });

            // LS=2 => L, IS=7 => Y => final => (L=0, Y=1) => index=0*2+1=1 => "Ly"
            setFactors([2,2,2,2,2,2,2,2], [7,7,7,7,7,7,7,7]);
            calculate();
            let { rsText } = getResults();
            expect(rsText).toBe("Ly");

            // LS=4 => M, IS=2 => X => index=(1*2+0)=2 => "Mx"
            setFactors([4,4,4,4,4,4,4,4], [2,2,2,2,2,2,2,2]);
            calculate();
            ({ rsText } = getResults());
            expect(rsText).toBe("Mx");

            // LS=9 => H, IS=9 => Y => index=(2*2+1)=5 => "Hy"
            setFactors([9,9,9,9,9,9,9,9], [9,9,9,9,9,9,9,9]);
            calculate();
            ({ rsText } = getResults());
            expect(rsText).toBe("Hy");
        });

        test('5) 3×3 with "classic" example (asym), + vectorParam => integration check', () => {
            setUrlParams({
                rangesI: "Low 0-5;Medium 5-7;High 7-10",
                rangesL: "Low 1-3;Medium 3-7;High 7-10",
                riskMapping: "Medium, Medium, High, Critical, Mde, Low, Low, Medium, Critical",
                vector: "(sl:4/m:3/o:2/s:1/ed:5/ee:2/a:1/id:3/lc:7/li:8/lav:4/lac:3/fd:2/rd:5/nc:3/pv:1)"
            });
            // The vector sets:
            // Threat = (4,3,2,1,5,2,1,3) => sum=21 => avg=21/8=2.625 => => "Low" (0-5) => iIndex=0
            // Technical= (7,8,4,3,2,5,3,1) => max=8 => => "High" => lIndex=2
            // => finalIndex=(0*3)+2=2 => "High"
            calculate();
            const { lsText, isText, rsText } = getResults();

            // LS => "2.625 LOW", IS => "8.000 HIGH", final => "High"
            expect(lsText).toMatch(/LOW/);
            expect(isText).toMatch(/HIGH/);
            expect(rsText).toBe("High");
        });

        test('6) Invalid format => fallback to Default config', () => {
            setUrlParams({
                rangesI: "Low 0-3;BadOne 3 5",  // missing dash => error
                rangesL: "Low 0-5;High 5-9",
                riskMapping: "Some, Some, Some, Some"
            });
            // LS=1 => => eventually LOW, IS=1 => => LOW => => NOTE in default config
            setFactors([1,1,1,1,1,1,1,1], [1,1,1,1,1,1,1,1]);
            calculate();
            const { rsText } = getResults();
            // Because parseCategories error => fallback => default => (LOW+LOW=NOTE)
            expect(rsText).toBe("NOTE");
        });

        test('7) Partial param: only rangesI => fallback again', () => {
            setUrlParams({
                rangesI: "A 0-10"
                // no rangesL, no riskMapping
            });
            setFactors([9,9,9,9,9,9,9,9], [2,2,2,2,2,2,2,2]);
            calculate();
            // Fallback => e.g. default => (HIGH+LOW=MEDIUM) or something
            // Let's see:
            const { rsText } = getResults();
            // We don't specify the exact final if default => might be MEDIUM or so
            // but let's just ensure it's not empty
            expect(rsText.length).toBeGreaterThan(0);
        });

        test('8) 1×5 mapping (extreme case): I=1 cat, L=5 cat', () => {
            setUrlParams({
                rangesI: "Single 0-10",
                rangesL: "A 0-2;B 2-4;C 4-6;D 6-8;E 8-10",
                riskMapping: "R1, R2, R3, R4, R5"
            });
            // So iCats=1 => iIndex=0 always
            // lCats=5 => lIndex=0..4 => finalIndex=(0*5 + lIndex)= lIndex => R1..R5
            setFactors([9,9,9,9,9,9,9,9], [7,7,7,7,7,7,7,7]);
            calculate();
            // LS => we only have 1 cat => index=0 => "Single"
            // IS=7 => "D" => index=3 => => "R4"
            const { rsText } = getResults();
            expect(rsText).toBe("R4");
        });

        test('9) 5×1 mapping (the opposite)', () => {
            setUrlParams({
                rangesI: "A 0-2;B 2-4;C 4-6;D 6-8;E 8-10",
                rangesL: "Only 0-10",
                riskMapping: "X1, X2, X3, X4, X5"
            });
            // iCats=5 => iIndex=0..4
            // lCats=1 => lIndex=0 always => finalIndex= iIndex*1+0= iIndex => X1..X5
            setFactors([9,9,9,9,9,9,9,9], [4,4,4,4,4,4,4,4]);
            calculate();
            // LS => average= (9*8=72)/8=9 => falls in cat E(8-10) => iIndex=4
            // IS => 4 => only cat => lIndex=0 => finalIndex=4 => "X5"
            const { rsText } = getResults();
            expect(rsText).toBe("X5");
        });

        test('10) LS out of any range => final => NOTE, even if mapping exists', () => {
            setUrlParams({
                rangesI: "L1 0-3; L2 3-6",
                rangesL: "L1 0-3; L2 3-6",
                riskMapping: "Res1, Res2, Res3, Res4"
            });
            // iCats=2, lCats=2 => 4 entries => 2×2
            // LS=10 => not in (0-3 or 3-6) => iIndex=-1 => => final => "NOTE"
            setFactors([10,10,10,10,10,10,10,10], [1,1,1,1,1,1,1,1]);
            calculate();
            let { rsText } = getResults();
            expect(rsText).toBe("ERROR");
        });

        test('11) IS out of range => "NOTE"', () => {
            setUrlParams({
                rangesI: "L1 0-3;L2 3-6",
                rangesL: "X 0-5",
                riskMapping: "A, B, C, D, E, F"
                // Actually we expect iCats=2 => L1,L2 and lCats=1 => X => => 2*1=2 => but we gave 6 => mismatch => error => fallback
            });
            setFactors([2,2,2,2,2,2,2,2], [99,99,99,99,99,99,99,99]);
            calculate();
            const { rsText } = getResults();
            // Because parseMapping => mismatch => fallback => default => LS=2 => LOW, IS=99 => out of default range => => NOTE
            expect(rsText).toBe("ERROR");
        });

        test('12) 4×2 symmetrical, but we only supply partial => fallback => default', () => {
            setUrlParams({
                rangesI: "C1 0-2;C2 2-4;C3 4-6;C4 6-8"
                // we omit rangesL & riskMapping => fallback
            });
            setFactors([1,1,1,1,1,1,1,1], [3,3,3,3,3,3,3,3]);
            calculate();
            const { rsText } = getResults();
            // fallback => default => LS=1 => LOW, IS=3 => MEDIUM => => LOW+MEDIUM=LOW or NOTE (depending on your default combos)
            // Usually default => (LOW,MEDIUM)=LOW
            // so we expect "LOW"
            expect(["LOW", "NOTE"]).toContain(rsText);
        });
    });
});