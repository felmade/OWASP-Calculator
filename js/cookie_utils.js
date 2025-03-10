// cookie_utils.js

/**
 * Sets a mapping cookie with the given custom name and value.
 * The cookie expires in 100 years, effectively making it permanent.
 *
 * @param {string} customName - The custom name for the mapping.
 * @param {string} value - The mapping query string to store.
 */
export function setMappingCookie(customName, value) {
    const cookieName = "mapping_" + customName;
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    document.cookie = `${encodeURIComponent(cookieName)}=${encodeURIComponent(value)};expires=${farFuture.toUTCString()};path=/`;
}

/**
 * Retrieves a mapping cookie by its custom name.
 *
 * @param {string} customName - The custom name for the mapping.
 * @returns {string|null} - The stored query string or null if not found.
 */
export function getMappingCookie(customName) {
    const cookieName = "mapping_" + customName;
    const nameEQ = encodeURIComponent(cookieName) + "=";
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

/**
 * Deletes the mapping cookie with the given custom name.
 *
 * @param {string} customName - The custom name for the mapping.
 */
export function deleteMappingCookie(customName) {
    const cookieName = "mapping_" + customName;
    document.cookie = `${encodeURIComponent(cookieName)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

/**
 * Lists all mapping cookies stored with the "mapping_" prefix.
 *
 * @returns {Array} - Array of objects with keys 'name' and 'value'.
 */
export function listMappingCookies() {
    const cookies = document.cookie.split(';');
    const mappingCookies = [];
    cookies.forEach(cookie => {
        let [key, value] = cookie.split('=');
        key = decodeURIComponent(key.trim());
        if (key.startsWith("mapping_")) {
            const customName = key.substring("mapping_".length);
            mappingCookies.push({
                name: customName,
                value: value ? decodeURIComponent(value.trim()) : ''
            });
        }
    });
    return mappingCookies;
}
