/**
 * Application Configuration File
 * ------------------------------
 * This configuration file contains:
 * 1. Risk configurations for different use cases (Default, Configuration 1, etc.).
 * 2. UI settings to control specific behaviors, such as disabling elements or dropdown menus.
 */

export const config = {
    // Risk configurations define thresholds for LOW, MEDIUM, and HIGH risk levels
    riskConfigurations: {
        "Default Configuration": {
            LOW: [0, 3],
            MEDIUM: [3, 6],
            HIGH: [6, 9]
        },
        "Configuration 1": {
            LOW: [0, 5],
            MEDIUM: [5, 6],
            HIGH: [6, 9]
        },
        "Configuration 2": {
            LOW: [0, 7.5],
            MEDIUM: [7.5, 8],
            HIGH: [8, 9]
        },
        "Configuration 3": {
            LOW: [0, 6.5],
            MEDIUM: [6.5, 7],
            HIGH: [7, 9]
        }
    },

    // UI settings define behavior for disabling elements and dropdowns (when URL-Logic is being used)
    uiSettings: {
        // Whether to disable input elements in the UI
        disableElements: false,

        // Whether to disable the configuration dropdown menu
        disableDropdown: true
    }
};
