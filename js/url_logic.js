// File: url_logic.js

/**
 * =====================================
 * ========== INTERNAL STORAGE ==========
 * =====================================
 *
 * This is where the parsed data is stored:
 * - likelihoodConfigObj, impactConfigObj, ...
 * - storedVector: { sl: number, m: number, ...} (optional)
 *   => This is updated with each calculation
 *      so that new UI inputs flow into the calculation.
 */

export let likelihoodConfigObj = {};
export let impactConfigObj = {};
export let likelihoodLevels = [];
export let impactLevels = [];
export let mappingObj = {};
export let storedVector = {};

/**
 * 16 fields allowed in the vector.
 */
const ALLOWED_VECTOR_KEYS = new Set([
    "sl", "m", "o", "s", "ed", "ee", "a", "id",
    "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
]);

/**
 * List of all UI factor IDs,
 * so that on each calculation call
 * the storedVector can be synchronized with the UI.
 */
const PARTIALS = [
    "sl","m","o","s","ed","ee","a","id",
    "lc","li","lav","lac","fd","rd","nc","pv"
];

/**
 * =====================================
 * ============= STEP 1 ================
 * =====================================
 * Check whether "URL Logic" is used.
 * => checkRequiredParameters()
 */
export function shouldUseUrlLogic() {
    return checkRequiredParameters();
}

/**
 * =====================================
 * ============= STEP 2 ================
 * =====================================
 * Parse URL parameters:
 * - likelihoodConfig
 * - impactConfig
 * - mapping
 * - vector (optional)
 *
 * If OK => fill variables, return true.
 * If Error => fallback => return false.
 */
export function parseUrlParameters() {
    try {
        const likelihoodConfigStr = getUrlParameter('likelihoodConfig');
        const impactConfigStr     = getUrlParameter('impactConfig');
        const mappingStr          = getUrlParameter('mapping');
        const vectorParam         = getUrlParameter('vector'); // optional

        // 1) parse L & I config
        likelihoodConfigObj = parseConfiguration(likelihoodConfigStr);
        impactConfigObj     = parseConfiguration(impactConfigStr);

        // 2) Create level arrays (sorted by minVal)
        likelihoodLevels = configObjToSortedLevels(likelihoodConfigObj);
        impactLevels     = configObjToSortedLevels(impactConfigObj);

        // 3) Mapping NxM
        mappingObj = parseNxMMapping(likelihoodLevels, impactLevels, mappingStr);

        // 4) Vector (optional)
        if (vectorParam) {
            storedVector = parseVector(vectorParam);
        } else {
            storedVector = {};
        }

        console.log("[URL_LOGIC] parseUrlParameters() OK", {
            likelihoodConfigObj,
            impactConfigObj,
            mappingObj,
            storedVector
        });

        return true;
    } catch (err) {
        console.error("[URL_LOGIC] parseUrlParameters() error:", err);
        if (typeof swal === 'function') {
            swal("Error", "Parsing failed. Falling back to default logic.", "error");
        }
        return false;
    }
}

/**
 * =====================================
 * ============= STEP 3 ================
 * =====================================
 * Advanced Calculation:
 * 1) syncStoredVectorFromUI()
 * 2) Calculate L & I (Scores)
 * 3) Mapping => finalRisk
 * 4) UI update (LS, IS, RS)
 */
export function performAdvancedCalculation() {
    // (0) UI -> storedVector
    syncStoredVectorFromUI();

    // Check if we have config + mapping
    if (!Object.keys(likelihoodConfigObj).length || !Object.keys(impactConfigObj).length) {
        console.error("No config objects found - can't proceed.");
        return null;
    }
    if (!Object.keys(mappingObj).length) {
        console.error("No mapping found - can't proceed.");
        return null;
    }

    // 1) L_score, I_score from storedVector
    let L_score = 0;
    let I_score = 0;

    if (storedVector) {
        // Threat fields => average
        const threatKeys = ["sl","m","o","s","ed","ee","a","id"];
        L_score = averageVector(storedVector, threatKeys);

        // Impact fields => max
        const impactKeys = ["lc","li","lav","lac","fd","rd","nc","pv"];
        I_score = maxVector(storedVector, impactKeys);
    } else {
        console.warn("[performAdvancedCalculation] No vector => using 0 for L&I");
    }

    // 2) Determine L_class, I_class
    const L_class = getRangeClass(L_score, likelihoodConfigObj);
    const I_class = getRangeClass(I_score, impactConfigObj);

    // 3) Mapping => finalRisk
    const finalRisk = getMappedRisk(L_class, I_class);

    // 4) UI update (LS,IS,RS)
    const LSElem = document.querySelector('.LS');
    if (LSElem) {
        LSElem.textContent = `${L_score.toFixed(3)} ${L_class}`;
        LSElem.style.fontWeight = 'bold';
        LSElem.style.fontSize = '24px';
    }

    const ISElem = document.querySelector('.IS');
    if (ISElem) {
        ISElem.textContent = `${I_score.toFixed(3)} ${I_class}`;
        ISElem.style.fontWeight = 'bold';
        ISElem.style.fontSize = '24px';
    }

    const RSElem = document.querySelector('.RS');
    if (RSElem) {
        RSElem.textContent = finalRisk;
        RSElem.style.fontWeight = 'bold';
        RSElem.style.fontSize = '24px';
    }

    const VectorElement = document.querySelector('.vector');
    if (VectorElement) {
        VectorElement.style.visibility = 'hidden';
    }

    const result = { L_score, I_score, L_class, I_class, finalRisk };
    console.log("[performAdvancedCalculation] done:", result);
    return result;
}

/**
 * Reads the 16 input fields (#sl, #m, #o, #s, ...)
 * and updates storedVector accordingly,
 * so that any changed values are used in the calculation.
 */
function syncStoredVectorFromUI() {
    PARTIALS.forEach(key => {
        const el = document.getElementById(key);
        if (!el) return;
        const valNum = parseFloat(el.value) || 0;
        storedVector[key] = valNum;
    });
}

/* ===========================================
   ========== HELPER FUNCTIONS ===============
   ===========================================
*/

/**
 * parseConfiguration("LOW:0-2;MEDIUM:2-5;HIGH:5-9")
 * => { LOW:[0,2], MEDIUM:[2,5], HIGH:[5,9] }
 */
function parseConfiguration(str) {
    if (!str) throw new Error("No config string provided.");
    const parts = str.split(';');
    const obj = {};
    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const [levelRaw, rangeRaw] = trimmed.split(':');
        if (!levelRaw || !rangeRaw) {
            throw new Error("Invalid config part: " + part);
        }
        const [minStr, maxStr] = rangeRaw.split('-');
        const minVal = parseFloat(minStr);
        const maxVal = parseFloat(maxStr);
        if (isNaN(minVal) || isNaN(maxVal)) {
            throw new Error("Invalid numeric range in " + part);
        }
        obj[levelRaw.trim().toUpperCase()] = [minVal, maxVal];
    });
    if (!Object.keys(obj).length) {
        throw new Error("Empty config object from: " + str);
    }
    return obj;
}

/**
 * Converts e.g. { LOW:[0,2], MEDIUM:[2,4], HIGH:[4,6] }
 * into an array ["LOW","MEDIUM","HIGH"] (sorted by minVal).
 */
function configObjToSortedLevels(configObj) {
    const tempArr = [];
    for (const level in configObj) {
        const [minVal, maxVal] = configObj[level];
        tempArr.push({ level, minVal, maxVal });
    }
    // Sort by minVal
    tempArr.sort((a,b) => a.minVal - b.minVal);
    return tempArr.map(item => item.level);
}

/**
 * parseNxMMapping(likelihoodLevels, impactLevels, mappingStr)
 * => Key: "LIKELIHOOD-IMPACT"
 */
function parseNxMMapping(lLevels, iLevels, shortStr) {
    if (!shortStr) throw new Error("No mapping string provided.");

    const N = lLevels.length;
    const M = iLevels.length;
    const arr = shortStr.split(',').map(s => s.trim());
    if (arr.length !== N*M) {
        throw new Error(`Need exactly ${N*M} mapping entries, but got ${arr.length}`);
    }

    let index = 0;
    const mapObj = {};
    for (let l = 0; l < N; l++) {
        for (let i = 0; i < M; i++) {
            const key = `${lLevels[l]}-${iLevels[i]}`.toUpperCase();
            mapObj[key] = arr[index].toUpperCase();
            index++;
        }
    }
    return mapObj;
}

/**
 * parseVector("(sl:1/m:2/o:3/...)")
 * => { sl:1, m:2, o:3, ... } (only the 16 ALLOWED_VECTOR_KEYS)
 */
function parseVector(str) {
    const clean = str.replace(/^\(/,'').replace(/\)$/,'');
    const segments = clean.split('/');
    if (!segments.length) {
        throw new Error("Empty vector string");
    }
    // init result with 0 for allowed keys
    const vecObj = {};
    ALLOWED_VECTOR_KEYS.forEach(k => {
        vecObj[k] = 0;
    });

    segments.forEach(seg => {
        const [keyRaw, valRaw] = seg.split(':');
        if (!keyRaw || valRaw === undefined) {
            throw new Error("Invalid vector segment: " + seg);
        }
        const key = keyRaw.trim().toLowerCase();
        const valNum = parseFloat(valRaw.trim());
        if (isNaN(valNum)) {
            throw new Error("NaN in vector segment: " + seg);
        }
        if (valNum < 0 || valNum > 9) {
            throw new Error(`Invalid vector range (0..9) in segment: ${seg}`);
        }
        if (ALLOWED_VECTOR_KEYS.has(key)) {
            vecObj[key] = valNum;
        } else {
            console.warn(`[parseVector] ignoring unknown key "${key}"`);
        }
    });

    return vecObj;
}

/**
 * Determines the level (e.g. "LOW") by looking up
 * in configObj[level] = [min,max].
 */
export function getRangeClass(value, configObj) {
    for (const level in configObj) {
        const [minVal, maxVal] = configObj[level];

        // Normal case: [minVal, maxVal) => >= minVal && < maxVal
        // Additional hack: EXACT 9 => maxVal===9 => assign
        if (
            (value >= minVal && value < maxVal) ||
            (value === 9 && maxVal === 9)
        ) {
            return level;
        }
    }
    return "ERROR";
}

/**
 * mappingObj[L_class-I_class] => finalRisk
 */
export function getMappedRisk(L_class, I_class) {
    if (L_class === "ERROR" || I_class === "ERROR") {
        return "ERROR";
    }
    const key = `${L_class}-${I_class}`.toUpperCase();
    return mappingObj[key] || "ERROR";
}

/**
 * checkRequiredParameters():
 * => if ?likelihoodConfig=..., ?impactConfig=..., ?mapping=...
 *    all present => true
 * => otherwise => fallback => false
 */
function checkRequiredParameters() {
    const requiredParams = ['likelihoodConfig', 'impactConfig', 'mapping'];
    const missingParams = [];
    let foundParams = 0;

    requiredParams.forEach(param => {
        const regex = new RegExp('[\\?&]' + param + '=([^&#]*)');
        const results = regex.exec(window.location.search);
        if (!results) {
            missingParams.push(param);
        } else {
            foundParams++;
        }
    });

    // No parameters => fallback
    if (foundParams === 0) {
        return false;
    }

    // 1 or 2 missing => warning
    if (missingParams.length > 0 && missingParams.length < requiredParams.length) {
        swal({
            title: "Missing Parameters",
            text: `The following parameters are missing: ${missingParams.join(', ')}. Default configuration will be used.`,
            icon: "warning",
            button: "OK"
        });
        return false;
    }

    return true;
}

/**
 * Average over given keys (e.g. threatKeys) in storedVector
 */
export function averageVector(vec, keys) {
    let sum = 0, count = 0;
    keys.forEach(k => {
        if (typeof vec[k] === 'number') {
            sum += vec[k];
            count++;
        }
    });
    if (!count) return 0;
    return sum / count;
}

/**
 * Max over given keys (e.g. impactKeys) in storedVector
 */
export function maxVector(vec, keys) {
    let maxVal = Number.NEGATIVE_INFINITY;
    keys.forEach(k => {
        const v = vec[k];
        if (typeof v === 'number' && v > maxVal) {
            maxVal = v;
        }
    });
    if (maxVal === Number.NEGATIVE_INFINITY) return 0;
    return maxVal;
}

/**
 * Extract URL parameter
 */
export function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i");
    const results = regex.exec(window.location.search);
    if (!results) return null;
    if (!results[2]) return null;
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**
 * Getter functions, in case you need them externally
 */
export function getStoredConfiguration() {
    return {
        likelihood: likelihoodConfigObj,
        impact: impactConfigObj
    };
}
export function getStoredMapping() {
    return mappingObj;
}
export function getStoredVector() {
    return storedVector;
}