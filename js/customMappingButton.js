import { getUrlParameter } from "./url_logic.js";
import { calculate } from "./script.js";
import { setMappingCookie, deleteMappingCookie, listMappingCookies } from "./cookie_utils.js";

// Ensure that the saved mappings are loaded into the HTML modal's right column on page load
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("mappingModal");
    if (modal) {
        refreshSavedMappingsList(modal);
    }
});

document.getElementById("openCustomModalBtn").addEventListener("click", function() {
    const modal = document.getElementById("mappingModal");
    if (modal) {
        refreshSavedMappingsList(modal);
    }
});

/**
 * INITMAPPINGMATRIXGENERATOR()
 * -----------------------------
 * Opens a dialog to create a dynamic mapping matrix (max 5x5) based on user input.
 * When "Confirm Mapping" is clicked, the inputs are validated, a query string is built,
 * if a mapping name is provided the mapping is saved as a cookie, the URL is updated
 * (preserving any existing vector parameter), and the advanced calculation is performed.
 */
export function initMappingMatrixGenerator() {
    const generateMappingMatrixBtn = document.getElementById("generateMappingMatrixBtn");
    if (!generateMappingMatrixBtn) {
        console.error("Generate Mapping Matrix button not found.");
        return;
    }

    generateMappingMatrixBtn.addEventListener("click", function () {

        // Retrieve numeric values for the number of levels
        const likelihoodInputValue = document.getElementById("likelihoodLevelsInput").value;
        const impactInputValue = document.getElementById("impactLevelsInput").value;
        const numLikelihood = parseInt(likelihoodInputValue, 10);
        const numImpact = parseInt(impactInputValue, 10);

        // Validate numeric inputs
        if (isNaN(numLikelihood) || numLikelihood <= 0 || isNaN(numImpact) || numImpact <= 0) {
            alert("Please enter valid positive integers for both Likelihood and Impact Levels.");
            return;
        }
        if (numLikelihood > 5 || numImpact > 5) {
            alert("Please choose at most 5 levels for Likelihood and Impact.");
            return;
        }

        // Close the existing Bootstrap modal
        $('#mappingModal').modal('hide');

        // Create and display the mapping dialog by calling createMappingDialog()
        const dialog = createMappingDialog(numLikelihood, numImpact);
        document.body.appendChild(dialog);

        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.classList.add("blurred");
        }
        // Call refreshSavedMappingsList() immediately so the saved mappings are shown when the dialog opens.
        refreshSavedMappingsList(dialog);
        dialog.addEventListener("close", () => {
            if (mainElement) {
                mainElement.classList.remove("blurred");
            }
        }, { once: true });
        dialog.showModal();

        // Add confirm button handler
        const confirmBtn = dialog.querySelector("button.btn.btn-success");
        if (!confirmBtn) {
            console.error("Confirm button not found in the dialog.");
            return;
        }
        confirmBtn.addEventListener("click", function () {
            const finalQueryString = validateDialogInputs(dialog, numLikelihood, numImpact);
            if (!finalQueryString) return;

            // Retrieve the mapping name input and save mapping as a cookie if provided
            const mappingNameInput = dialog.querySelector("input#mappingNameInput");
            const mappingName = mappingNameInput ? mappingNameInput.value.trim() : "";
            if (mappingName) {
                setMappingCookie(mappingName, finalQueryString);
            }

            updateUrlAndProcess(finalQueryString);
            dialog.close();
            document.body.removeChild(dialog);
            calculate();
        });
    });
}

/**
 * Creates and returns the mapping dialog element.
 * The dialog contains the mapping table and an optional mapping name input
 * along with "Confirm Mapping" and "Discard Changes" buttons.
 *
 * @param {number} numLikelihood - Number of likelihood levels.
 * @param {number} numImpact - Number of impact levels.
 * @returns {HTMLDialogElement} - The created dialog element.
 */
function createMappingDialog(numLikelihood, numImpact) {
    const dialog = document.createElement("dialog");
    dialog.style.padding = "20px";
    dialog.style.backgroundColor = "white";
    dialog.style.border = "none";
    dialog.style.borderRadius = "10px";
    dialog.style.overflow = "hidden";
    dialog.style.position = "relative";
    dialog.style.maxWidth = window.innerWidth * 0.8 + "px";
    dialog.style.maxHeight = window.innerHeight * 0.8 + "px";

    // Content wrapper
    const contentWrapper = document.createElement("div");
    contentWrapper.style.margin = "40px auto 0 auto";
    contentWrapper.style.padding = "0 20px";
    contentWrapper.style.textAlign = "center";
    dialog.appendChild(contentWrapper);

    // Mapping table
    const table = createMappingTable(numLikelihood, numImpact);
    contentWrapper.appendChild(table);

    // Optional mapping name input (to save mapping as cookie)
    const nameLabel = document.createElement("label");
    nameLabel.setAttribute("for", "mappingNameInput");
    nameLabel.innerText = "Mapping Name (optional):";
    nameLabel.style.marginTop = "10px";
    contentWrapper.appendChild(nameLabel);

    const mappingNameInput = document.createElement("input");
    mappingNameInput.type = "text";
    mappingNameInput.id = "mappingNameInput";
    mappingNameInput.className = "form-control";
    mappingNameInput.placeholder = "Enter a name to save this mapping";
    mappingNameInput.style.marginBottom = "10px";
    contentWrapper.appendChild(mappingNameInput);

    // Button Container
    const btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.justifyContent = "center";
    btnContainer.style.marginTop = "20px";
    btnContainer.style.gap = "10px";

    // Confirm Button
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-success";
    confirmBtn.innerText = "Confirm Mapping";
    confirmBtn.style.padding = "10px 20px";
    confirmBtn.style.fontSize = "16px";
    confirmBtn.style.cursor = "pointer";
    btnContainer.appendChild(confirmBtn);

    // Close (Discard) Button
    const closeBtn = document.createElement("button");
    closeBtn.className = "btn btn-danger";
    closeBtn.innerText = "Discard Changes";
    closeBtn.style.padding = "10px 20px";
    closeBtn.style.fontSize = "16px";
    closeBtn.style.cursor = "pointer";
    closeBtn.addEventListener("click", () => {
        dialog.close();
        document.body.removeChild(dialog);
    });
    btnContainer.appendChild(closeBtn);

    contentWrapper.appendChild(btnContainer);

    return dialog;
}

/**
 * Creates and returns the mapping table element.
 *
 * @param {number} numLikelihood - Number of likelihood levels.
 * @param {number} numImpact - Number of impact levels.
 * @returns {HTMLTableElement} - The created table element.
 */
function createMappingTable(numLikelihood, numImpact) {
    const rowHeaderWidth = 220;
    const colWidth = 180;
    const cellHeight = 50;
    const tableWidth = rowHeaderWidth + numImpact * colWidth;
    const tableHeight = (numLikelihood + 1) * cellHeight;
    const defaultLikelihoodLevels = ["LOW:0-2", "MEDIUM:3-4", "HIGH:5-6", "VERY HIGH:7-8", "EXTREME:9-10"];
    const defaultImpactLevels = ["MINOR:0-2", "MODERATE:3-4", "SEVERE:5-6", "CRITICAL:7-8", "DISASTROUS:9-10"];

    const table = document.createElement("table");
    table.className = "table table-bordered";
    table.style.borderCollapse = "collapse";
    table.style.margin = "0 auto";
    table.id = "mappingMatrixTable";

    // Create table header row
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const emptyHeader = document.createElement("th");
    emptyHeader.innerText = "Likelihood (Rows) \\ Impact (Columns)";
    emptyHeader.style.padding = "5px";
    emptyHeader.style.width = rowHeaderWidth + "px";
    headerRow.appendChild(emptyHeader);

    for (let j = 0; j < numImpact; j++) {
        const th = document.createElement("th");
        th.style.padding = "5px";
        const colHeaderInput = document.createElement("input");
        colHeaderInput.type = "text";
        colHeaderInput.className = "form-control custom-col-header";
        colHeaderInput.style.width = colWidth + "px";
        colHeaderInput.style.height = "40px";
        colHeaderInput.value = defaultImpactLevels[j] || ("Impact " + (j + 1));
        th.appendChild(colHeaderInput);
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body with row headers and mapping cells
    const tbody = document.createElement("tbody");
    for (let i = 0; i < numLikelihood; i++) {
        const row = document.createElement("tr");

        const rowHeaderCell = document.createElement("th");
        rowHeaderCell.style.padding = "5px";
        const rowHeaderInput = document.createElement("input");
        rowHeaderInput.type = "text";
        rowHeaderInput.className = "form-control custom-row-header";
        rowHeaderInput.style.width = rowHeaderWidth + "px";
        rowHeaderInput.style.height = "40px";
        rowHeaderInput.value = defaultLikelihoodLevels[i] || ("Likelihood " + (i + 1));
        rowHeaderCell.appendChild(rowHeaderInput);
        row.appendChild(rowHeaderCell);

        for (let j = 0; j < numImpact; j++) {
            const cell = document.createElement("td");
            cell.style.padding = "5px";
            const input = document.createElement("input");
            input.type = "text";
            input.className = "form-control mapping-input";
            input.placeholder = "Enter Mapping";
            input.style.width = colWidth + "px";
            input.style.height = "40px";
            input.dataset.row = i;
            input.dataset.col = j;
            cell.appendChild(input);
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    // Scale the table to fit within 80% of the viewport without scrollbars
    const availableWidth = window.innerWidth * 0.8;
    const availableHeight = window.innerHeight * 0.8;
    const scaleFactor = Math.min(availableWidth / tableWidth, availableHeight / tableHeight, 1);
    table.style.transform = `scale(${scaleFactor})`;
    table.style.transformOrigin = "top left";

    return table;
}

/**
 * Updates the browser's URL with the given query string (preserving any existing vector parameter),
 * then triggers the advanced calculation.
 *
 * @param {string} finalQueryString - The final query string (without leading "?").
 */
export function updateUrlAndProcess(finalQueryString) {
    const vectorParam = getUrlParameter("vector");
    const vectorQuery = vectorParam ? `&vector=${encodeURIComponent(vectorParam)}` : "";
    const newUrl = window.location.origin + window.location.pathname + "?" + finalQueryString + vectorQuery;
    window.history.replaceState(null, "", newUrl);
}

/**
 * Validates the inputs in the modal and returns the final query string if valid.
 * Ensures that Likelihood and Impact cover the range 0-9 continuously (overlaps allowed).
 *
 * @param {HTMLElement} modal - The modal element.
 * @param {number} numLikelihood - Number of likelihood levels.
 * @param {number} numImpact - Number of impact levels.
 * @returns {string|null} - Final query string (without leading "?") or null if validation fails.
 */
export function validateDialogInputs(modal, numLikelihood, numImpact) {
    const headerRegex = /^[^:]+:\d+-\d+$/;
    const mappingValues = [];

    const parseRanges = (headers) => {
        return headers.map(h => {
            const [label, range] = h.split(":");
            const [min, max] = range.split("-").map(Number);
            return { label: label.trim(), min, max };
        });
    };

    const isValidContinuousRange = (ranges, type) => {
        ranges.sort((a, b) => a.min - b.min);
        if (ranges[0].min !== 0) {
            alert(`${type} must start at 0.`);
            return false;
        }
        if (ranges[ranges.length - 1].max !== 9) {
            alert(`${type} must end at 9.`);
            return false;
        }
        for (let i = 0; i < ranges.length - 1; i++) {
            if (ranges[i].max < ranges[i + 1].min) {
                alert(`${type} ranges must not have gaps. Please cover every value from 0 to 9 continuously.`);
                return false;
            }
        }
        return true;
    };

    // Validate row headers (Likelihood)
    const rowHeaderInputs = modal.querySelectorAll("input.custom-row-header");
    const likelihoodHeaders = Array.from(rowHeaderInputs).map(input => input.value.trim());
    for (let index = 0; index < likelihoodHeaders.length; index++) {
        const val = likelihoodHeaders[index];
        if (!headerRegex.test(val)) {
            alert(`Likelihood header ${index + 1} ("${val}") is invalid. Use format 'Label:min-max' (e.g., 'LOW:0-1').`);
            return null;
        }
    }

    // Validate column headers (Impact)
    const colHeaderInputs = modal.querySelectorAll("input.custom-col-header");
    const impactHeaders = Array.from(colHeaderInputs).map(input => input.value.trim());
    for (let index = 0; index < impactHeaders.length; index++) {
        const val = impactHeaders[index];
        if (!headerRegex.test(val)) {
            alert(`Impact header ${index + 1} ("${val}") is invalid. Use format 'Label:min-max' (e.g., 'LOW:0-1').`);
            return null;
        }
    }

    // Parse and validate likelihood ranges
    const likelihoodRanges = parseRanges(likelihoodHeaders);
    if (!isValidContinuousRange(likelihoodRanges, "Likelihood")) {
        return null;
    }

    // Parse and validate impact ranges
    const impactRanges = parseRanges(impactHeaders);
    if (!isValidContinuousRange(impactRanges, "Impact")) {
        return null;
    }

    // Validate mapping inputs
    for (let i = 0; i < numLikelihood; i++) {
        for (let j = 0; j < numImpact; j++) {
            const input = modal.querySelector(`input.mapping-input[data-row="${i}"][data-col="${j}"]`);
            const value = input ? input.value.trim() : "";
            if (!value) {
                alert(`Mapping field at row ${i + 1}, column ${j + 1} is empty.`);
                return null;
            }
            mappingValues.push(value);
        }
    }

    const likelihoodConfigString = likelihoodHeaders.join(";");
    const impactConfigString = impactHeaders.join(";");
    const mappingStringFinal = mappingValues.join(",");

    return `likelihoodConfig=${likelihoodConfigString}&impactConfig=${impactConfigString}&mapping=${mappingStringFinal}`;
}

/**
 * refreshSavedMappingsList()
 * ---------------------------
 * Retrieves all saved mapping cookies using listMappingCookies() and populates the
 * container (ul element with id "savedMappingsList") in the modal.
 * If no saved mappings are found, displays "No Saved Mappings Yet!".
 *
 * @param {HTMLElement} modal - The modal element.
 */
function refreshSavedMappingsList(modal) {
    const savedMappingsContainer = modal.querySelector("#savedMappingsContainer");
    if (!savedMappingsContainer) return;
    // Clear existing content and set header
    savedMappingsContainer.innerHTML = "<h5>Saved Mappings</h5>";
    const mappings = listMappingCookies();
    console.log("Mappings found:", mappings); // Debug output
    if (mappings.length === 0) {
        const p = document.createElement("p");
        p.textContent = "No Saved Mappings Yet!";
        p.style.textAlign = "center";
        savedMappingsContainer.appendChild(p);
    } else {
        const ul = document.createElement("ul");
        ul.className = "list-unstyled";
        mappings.forEach(mapping => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "5px 0";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = mapping.name;
            li.appendChild(nameSpan);

            const actionsDiv = document.createElement("div");
            actionsDiv.style.display = "flex";
            actionsDiv.style.gap = "5px";

            // Load button: Loads the mapping, updates the URL, and triggers calculation.
            const loadBtn = document.createElement("button");
            loadBtn.className = "btn btn-success btn-sm";
            loadBtn.textContent = "Load";
            loadBtn.addEventListener("click", () => {
                updateUrlAndProcess(mapping.value);
                // Close the modal
                $('#mappingModal').modal('hide');
                calculate();
            });
            actionsDiv.appendChild(loadBtn);

            // Delete button: Deletes the mapping cookie.
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn btn-secondary btn-sm";
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete the mapping "${mapping.name}"?`)) {
                    deleteMappingCookie(mapping.name);
                    refreshSavedMappingsList(modal);
                }
            });
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(actionsDiv);
            ul.appendChild(li);
        });
        savedMappingsContainer.appendChild(ul);
    }
}