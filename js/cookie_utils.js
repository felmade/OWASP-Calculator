/**
 * Sets a mapping cookie with the given custom name and value.
 * The cookie is set to expire in 100 years, effectively lasting "forever."
 *
 * @param {string} customName - The custom name for the mapping.
 * @param {string} value - The query string value to store.
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
 * @param {string} customName - The custom name for the mapping (without the prefix).
 * @returns {string|null} - The stored query string, or null if not found.
 */
export function getMappingCookie(customName) {
    const cookieName = "mapping_" + customName;
    const nameEQ = encodeURIComponent(cookieName) + "=";
    const ca = document.cookie.split(';');
    for (let c of ca) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length));
        }
    }
    return null;
}

/**
 * Deletes a mapping cookie by its custom name.
 *
 * @param {string} customName - The custom name for the mapping (without the prefix).
 */
export function deleteMappingCookie(customName) {
    const cookieName = "mapping_" + customName;
    document.cookie = `${encodeURIComponent(cookieName)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

/**
 * Lists all mapping cookies stored with the prefix "mapping_".
 *
 * @returns {Array} - An array of objects with the format { name, value } where "name" is the custom mapping name.
 */
export function listMappingCookies() {
    const cookies = document.cookie.split(';');
    const mappingCookies = [];
    cookies.forEach(cookie => {
        let [key, value] = cookie.split('=');
        key = decodeURIComponent(key.trim());
        if (key.startsWith("mapping_")) {
            const customName = key.substring("mapping_".length);
            mappingCookies.push({ name: customName, value: value ? decodeURIComponent(value.trim()) : '' });
        }
    });
    return mappingCookies;
}
