// File: url_logic.js

/**
 * Internal storage for the parsed parameters if successful.
 */
let storedConfiguration = {};
let storedMapping = {};
let storedVector = null;

/**
 * Step 1 (unchanged core): Checks if both 'mapping' and 'configuration' URL params exist
 * Return true => potentially new logic
 * Return false => old logic
 */
export function shouldUseNewLogic() {
    const mappingParam = getUrlParameter('mapping');
    const configParam = getUrlParameter('configuration');

    const hasMapping = !!mappingParam;
    const hasConfig = !!configParam;

    // Case 1: neither
    if (!hasMapping && !hasConfig) {
        return false;
    }

    // Case 2: only one
    if ((hasMapping && !hasConfig) || (!hasMapping && hasConfig)) {
        if (typeof swal === 'function') {
            swal(
                "Error",
                "You need both 'mapping' and 'configuration' parameters. Falling back to default.",
                "error"
            );
        } else {
            console.error("Missing either 'mapping' or 'configuration'. Falling back to default.");
        }
        return false;
    }

    // Case 3: both exist
    return true;
}

/**
 * Step 2: Parse the actual 'mapping', 'configuration' and optional 'vector' strings.
 *  - If parse fails => show swal + return false (old logic continues).
 *  - If parse succeeds => store in our local variables & return true.
 */
export function parseUrlParameters() {
    const mappingParam = getUrlParameter('mapping');
    const configParam = getUrlParameter('configuration');
    const vectorParam = getUrlParameter('vector'); // optional

    try {
        // 1) Parse configuration (MANDATORY)
        const configObj = parseConfiguration(configParam);

        // 2) Parse mapping (MANDATORY)
        const mappingObj = parseMappingKeyValue(mappingParam);

        // 3) Parse vector (OPTIONAL)
        let vectorObj = null;
        if (vectorParam) {
            vectorObj = parseVector(vectorParam);
        }

        // 4) Store them
        storedConfiguration = configObj;
        storedMapping = mappingObj;
        storedVector = vectorObj;

        console.log("[URL_LOGIC] Parsed configuration:", configObj);
        console.log("[URL_LOGIC] Parsed mapping:", mappingObj);
        console.log("[URL_LOGIC] Parsed vector:", vectorObj);

        return true;
    } catch (err) {
        console.error("[URL_LOGIC] parseUrlParameters() failed:", err);
        if (typeof swal === 'function') {
            swal("Error", "Parsing of configuration/mapping/vector failed. Falling back to default.", "error");
        }
        return false;
    }
}

/**
 * Getter for the stored configuration object
 */
export function getStoredConfiguration() {
    return storedConfiguration;
}

/**
 * Getter for the stored mapping object
 */
export function getStoredMapping() {
    return storedMapping;
}

/**
 * Getter for the stored vector object (if any)
 */
export function getStoredVector() {
    return storedVector;
}

/**
 * Example: "LOW:0-4;MEDIUM:4-7;HIGH:7-10"
 * => { LOW: [0,4], MEDIUM: [4,7], HIGH: [7,10] }
 */
function parseConfiguration(str) {
    if (!str) throw new Error("No configuration string found.");

    const parts = str.split(';');
    const result = {};

    parts.forEach(part => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const [level, range] = trimmed.split(':');
        if (!level || !range) {
            throw new Error(`Invalid config entry: ${part}`);
        }
        const [minStr, maxStr] = range.split('-');
        const minVal = parseFloat(minStr);
        const maxVal = parseFloat(maxStr);
        if (isNaN(minVal) || isNaN(maxVal)) {
            throw new Error(`Invalid numeric range in config: ${range}`);
        }
        result[level.trim().toUpperCase()] = [minVal, maxVal];
    });

    if (Object.keys(result).length === 0) {
        throw new Error("No valid config entries parsed.");
    }

    return result;
}

/**
 * Example: "LOW-LOW=NOTE;LOW-MEDIUM=LOW;MEDIUM-HIGH=HIGH;HIGH-HIGH=CRITICAL"
 * => { "LOW-LOW":"NOTE", "LOW-MEDIUM":"LOW", "MEDIUM-HIGH":"HIGH", "HIGH-HIGH":"CRITICAL" }
 */
function parseMappingKeyValue(str) {
    if (!str) throw new Error("No mapping string found.");

    const pairs = str.split(';');
    const mapObj = {};

    pairs.forEach(pair => {
        const trimmed = pair.trim();
        if (!trimmed) return;
        const [key, val] = trimmed.split('=');
        if (!key || !val) {
            throw new Error(`Invalid mapping pair: ${pair}`);
        }
        mapObj[key.trim().toUpperCase()] = val.trim().toUpperCase();
    });

    if (Object.keys(mapObj).length === 0) {
        throw new Error("No valid mapping entries parsed.");
    }

    return mapObj;
}

/**
 * Parse the vector string if present.
 * You have your own "vector" format in your original code, e.g.:
 * "(sl:1/m:2/o:3/.../pv:16)"
 * We'll do a minimal version: remove parentheses, split by '/', then split by ':'
 */
function parseVector(str) {
    // Remove leading/trailing parentheses if they exist
    const cleaned = str.replace(/^\(/, '').replace(/\)$/, '');
    const segments = cleaned.split('/');
    if (segments.length === 0) {
        throw new Error("Empty vector string");
    }

    const vectorObj = {};
    segments.forEach(seg => {
        const [key, val] = seg.split(':');
        if (!key || val === undefined) {
            throw new Error(`Invalid vector segment: ${seg}`);
        }
        vectorObj[key.trim().toLowerCase()] = parseFloat(val);
    });

    if (Object.keys(vectorObj).length === 0) {
        throw new Error("No valid vector entries parsed.");
    }
    return vectorObj;
}

/**
 * Helper to read URL params
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}