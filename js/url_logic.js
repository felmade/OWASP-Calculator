// File: url_logic.js

/**
 * INTERNAL STORAGE
 * Hier legen wir die geparsten Daten ab:
 * - likelihoodConfigObj: { LEVEL: [min,max], ...}
 * - impactConfigObj: { LEVEL: [min,max], ...}
 * - likelihoodLevels: [ "LOW", "MEDIUM", ...] (sortiert nach minVal)
 * - impactLevels: [ "NOTE", "LOW", ...] (sortiert nach minVal)
 * - mappingObj: { "LOW-LOW": "MEDIUM", "LOW-HIGH":"CRITICAL", ... }
 * - storedVector: { sl: number, m: number, ...} (optional)
 */
export let likelihoodConfigObj = {};
export let impactConfigObj = {};
export let likelihoodLevels = [];
export let impactLevels = [];
export let mappingObj = {};
export let storedVector = {};

/**
 * 16 Felder, die im Vector vorkommen dürfen.
 * Alles andere ignorieren/Fehler - je nach Wunsch.
 */
const ALLOWED_VECTOR_KEYS = new Set([
    "sl", "m", "o", "s", "ed", "ee", "a", "id",
    "lc", "li", "lav", "lac", "fd", "rd", "nc", "pv"
]);

/**
 * STEP 1:
 * Wir entscheiden, ob wir die neue Logik nutzen.
 */
export function shouldUseUrlLogic() {
    return checkRequiredParameters();
}

/**
 * STEP 2:
 * Parse URL-Parameter für:
 * - likelihoodConfig (z. B. "LOW:0-2;MEDIUM:2-4;HIGH:4-6")
 * - impactConfig (z. B. "NOTE:0-3;LOW:3-6;HIGH:6-9")
 * - mapping (z. B. "Val1, Val2, ... ValN*M")
 * - vector (optional)
 *
 * Falls etwas fehlschlägt => swal/error => return false
 * Sonst => in interne Variablen ablegen => return true
 */
export function parseUrlParameters() {
    try {
        const likelihoodConfigStr = getUrlParameter('likelihoodConfig');
        const impactConfigStr = getUrlParameter('impactConfig');
        const mappingStr = getUrlParameter('mapping');
        const vectorParam = getUrlParameter('vector'); // optional

        // 1) parse L & I config
        likelihoodConfigObj = parseConfiguration(likelihoodConfigStr);
        impactConfigObj = parseConfiguration(impactConfigStr);

        // 2) Erzeuge arrays (z. B. ["LOW","MEDIUM","HIGH"], sortiert nach minVal)
        likelihoodLevels = configObjToSortedLevels(likelihoodConfigObj);
        impactLevels = configObjToSortedLevels(impactConfigObj);

        // 3) Mapping aufbauen (NxM)
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
 * STEP 3:
 * Unsere eigentliche Berechnungsfunktion,
 * die L & I basierend auf storedVector berechnet und
 * das finale Risiko via mappingObj bestimmt.
 */
export function performAdvancedCalculation() {
    if (!Object.keys(likelihoodConfigObj).length || !Object.keys(impactConfigObj).length) {
        console.error("No config objects found - can't proceed.");
        return null;
    }
    if (!Object.keys(mappingObj).length) {
        console.error("No mapping found - can't proceed.");
        return null;
    }

    // 1) L_score, I_score
    let L_score = 0;
    let I_score = 0;

    if (storedVector) {
        // Threat-Felder => average
        const threatKeys = ["sl","m","o","s","ed","ee","a","id"];
        L_score = averageVector(storedVector, threatKeys);

        // Impact-Felder => max
        const impactKeys = ["lc","li","lav","lac","fd","rd","nc","pv"];
        I_score = maxVector(storedVector, impactKeys);
    } else {
        console.warn("[performAdvancedCalculation] No vector => using 0 for L&I");
    }

    // 2) get L_class / I_class
    const L_class = getRangeClass(L_score, likelihoodConfigObj);
    const I_class = getRangeClass(I_score, impactConfigObj);

    // 3) mapping => finalRisk
    const finalRisk = getMappedRisk(L_class, I_class);

    // 4) UI-Update
    const LSElem = document.querySelector('.LS');
    if (LSElem) {
        LSElem.textContent = `${L_score.toFixed(3)} ${L_class}`;
    }
    const ISElem = document.querySelector('.IS');
    if (ISElem) {
        ISElem.textContent = `${I_score.toFixed(3)} ${I_class}`;
    }
    const RSElem = document.querySelector('.RS');
    if (RSElem) {
        RSElem.textContent = finalRisk;
    }

    const result = {L_score, I_score, L_class, I_class, finalRisk};
    console.log("[performAdvancedCalculation] done:", result);
    return result;
}

// ============ HELPER FUNKTIONEN ============ //

/**
 * parseConfiguration("LOW:0-2;MEDIUM:2-4;HIGH:4-6")
 * => { LOW:[0,2], MEDIUM:[2,4], HIGH:[4,6] }
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
 * Konvertiert z. B. { LOW:[0,2], MEDIUM:[2,4], HIGH:[4,6] }
 * in ein Array, sortiert nach minVal => ["LOW","MEDIUM","HIGH"].
 */
function configObjToSortedLevels(configObj) {
    const tempArr = [];
    for (const level in configObj) {
        const [minVal, maxVal] = configObj[level];
        tempArr.push({ level, minVal, maxVal });
    }
    // sort by minVal
    tempArr.sort((a,b) => a.minVal - b.minVal);
    // return array of level names in ascending order
    return tempArr.map(item => item.level);
}

/**
 * parseNxMMapping(likelihoodLevels, impactLevels, mappingStr)
 * z. B. L=5, I=3 => wir brauchen 15 Einträge in mappingStr
 * Key: "LIKELIHOOD-IMPACT"
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
 *  => { sl:1, m:2, o:3, ... }
 *  Nur unsere 16 allowed keys
 */
function parseVector(str) {
    // remove parentheses
    const clean = str.replace(/^\(/,'').replace(/\)$/,'');
    const segments = clean.split('/');
    if (!segments.length) {
        throw new Error("Empty vector string");
    }
    // init result with 0 for all allowed keys
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

        // Fehler werfen
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
 * Ermittelt, welchem Level (z. B. "LOW") der Wert entspricht,
 * indem wir in configObj[level] = [min,max] nachschauen.
 */
export function getRangeClass(value, configObj) {
    for (const level in configObj) {
        const [minVal, maxVal] = configObj[level];

        // Normalfall: [minVal, maxVal)  => >= minVal && < maxVal
        // HACK: Wenn wir GENAU 9 sind und maxVal == 9, dann
        //       wollen wir es diesem Level zuordnen.
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
 * mappingObj[L_class-I_class]
 */
export function getMappedRisk(L_class, I_class) {
    if (L_class === "ERROR" || I_class === "ERROR") {
        return "ERROR";
    }
    const key = `${L_class}-${I_class}`.toUpperCase();
    return mappingObj[key] || "ERROR";
}

function checkRequiredParameters() {
    const requiredParams = ['likelihoodConfig', 'impactConfig', 'mapping'];
    const missingParams = [];
    let foundParams = 0;

    // Überprüfen, ob die benötigten Parameter in der URL vorhanden sind
    requiredParams.forEach(param => {
        const regex = new RegExp('[\\?&]' + param + '=([^&#]*)');
        const results = regex.exec(window.location.search);
        if (!results) {
            missingParams.push(param);
        } else {
            foundParams++;
        }
    });

    // Wenn keine Parameter gefunden wurden, normale Logik ohne Warnung
    if (foundParams === 0) {
        return true;
    }

    // Wenn ein oder zwei Parameter fehlen, Warnung anzeigen
    if (missingParams.length > 0 && missingParams.length < requiredParams.length) {
        swal({
            title: "Missing Parameters",
            text: `The following parameters are missing: ${missingParams.join(', ')}. Default configuration will be used.`,
            icon: "warning",
            button: "OK"
        });
        return false;
    }

    // Alle erforderlichen Parameter sind vorhanden
    return true;
}
/**
 * Average über gegebene Keys
 */
export function averageVector(vec, keys) {
    let sum = 0, count=0;
    keys.forEach(k => {
        if (typeof vec[k] === 'number') {
            sum += vec[k];
            count++;
        }
    });
    if (!count) return 0;
    return sum/count;
}

/**
 * Max über gegebene Keys
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
 * Extrahiert URL-Prameter
 */
export function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)", "i");
    const results = regex.exec(window.location.search);
    if (!results) return null;
    if (!results[2]) return null;
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// ======================================
// GETTER-FUNKTIONEN (Exportierte Helpers)
// ======================================

/**
 * Gibt die aktuell gespeicherten Konfigurationen zurück.
 * z. B. { likelihood:{LOW:[0,2],HIGH:[2,9]}, impact:{...} }
 *
 * @returns {Object} - { likelihood: {...}, impact: {...} }
 */
export function getStoredConfiguration() {
    return {
        likelihood: likelihoodConfigObj,
        impact: impactConfigObj
    };
}

/**
 * Gibt das aktuell gespeicherte Mapping-Objekt zurück.
 * z. B. { "LOW-LOW":"VAL1", "LOW-HIGH":"VAL2", ... }
 *
 * @returns {Object} - Das Mapping-Objekt
 */
export function getStoredMapping() {
    return mappingObj;
}

/**
 * Gibt den aktuell gespeicherten Vector zurück
 *
 * @returns {Object|null} - z. B. { sl:1, m:2, ... }
 */
export function getStoredVector() {
    return storedVector;
}
