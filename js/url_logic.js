// File: url_logic.js

/**
 * Step 1:
 * Checks if both 'mapping' and 'configuration' URL params exist.
 * - If none => return false (the old logic continues)
 * - If only one => show error swal + return false (old logic continues)
 * - If both => return true (we'll do new logic in upcoming steps)
 */

/**
 * We assume 'swal' (SweetAlert) is globally available,
 * just like in your original script. If not, adapt accordingly.
 */

export function shouldUseNewLogic() {
    const mappingParam = getUrlParameter('mapping');
    const configParam = getUrlParameter('configuration');

    const hasMapping = !!mappingParam;
    const hasConfig = !!configParam;

    // Case 1: neither
    if (!hasMapping && !hasConfig) {
        // No advanced logic => old logic
        return false;
    }

    // Case 2: only one of them
    if ((hasMapping && !hasConfig) || (!hasMapping && hasConfig)) {
        // Show an error via swal, fallback to old logic
        if (typeof swal === 'function') {
            swal("Error", "You need both 'mapping' and 'configuration' parameters. Falling back to default.", "error");
        } else {
            console.error("Missing 'swal' or 'mapping/configuration' param in URL. Falling back to default config.");
        }
        return false;
    }

    // Case 3: both are present
    return true;
}

/**
 * Re-implementing a small helper to read URL params.
 * In your final code, you can unify or reuse your existing getUrlParameter logic.
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
