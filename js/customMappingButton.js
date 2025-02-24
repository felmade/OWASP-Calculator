/**
 * INITMAPPINGMATRIXGENERATOR()
 * -----------------------------
 * Opens a dialog to create a dynamic mapping matrix (max 5x5) based on user input.
 * The dialog auto-scales to fit within 80% of the viewport, has rounded corners and a white background,
 * and includes a "Close (Discard Changes)" button that discards all changes.
 * When "Confirm Mapping" is clicked, the inputs are validated and a query string in the format
 * "likelihoodConfig=...&impactConfig=...&mapping=..." is produced.
 *
 * This version increases the horizontal space available in the dialog so that the table fits comfortably.
 */
export function initMappingMatrixGenerator() {
    // Set up the event listener for the "Generate Mapping Matrix" button
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

        // Validate inputs (max 5 levels each)
        if (isNaN(numLikelihood) || numLikelihood <= 0 || isNaN(numImpact) || numImpact <= 0) {
            alert("Please enter valid positive integers for both Likelihood and Impact Levels.");
            return;
        }
        if (numLikelihood > 5 || numImpact > 5) {
            alert("Please choose at most 5 levels for Likelihood and Impact.");
            return;
        }

        // Optionally hide the original input window here if needed

        // Create an external dialog
        let dialog = document.createElement("dialog");
        dialog.style.padding = "20px";
        dialog.style.backgroundColor = "white";
        dialog.style.border = "none";
        dialog.style.borderRadius = "10px";
        dialog.style.overflow = "hidden";
        dialog.style.position = "relative";
        dialog.style.maxWidth = window.innerWidth * 0.8 + "px";
        dialog.style.maxHeight = window.innerHeight * 0.8 + "px";

        // Create a close button (discard changes)
        const closeBtn = document.createElement("button");
        closeBtn.innerText = "Close (Discard Changes)";
        closeBtn.title = "Discard all changes and close";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "10px";
        closeBtn.style.right = "10px";
        closeBtn.style.backgroundColor = "#f44336";
        closeBtn.style.color = "white";
        closeBtn.style.border = "none";
        closeBtn.style.borderRadius = "5px";
        closeBtn.style.padding = "5px 10px";
        closeBtn.style.cursor = "pointer";
        closeBtn.addEventListener("click", () => {
            dialog.close();
            document.body.removeChild(dialog);
            // Optionally, re-show the original input window here if it was hidden
        });
        dialog.appendChild(closeBtn);

        // Wrapper for content with equal left/right margins
        const contentWrapper = document.createElement("div");
        contentWrapper.style.margin = "40px auto 0 auto";
        contentWrapper.style.padding = "0 20px";
        contentWrapper.style.textAlign = "center";
        dialog.appendChild(contentWrapper);

        // Define cell dimensions: row header remains 220px wide, mapping columns are 180px wide
        const rowHeaderWidth = 220;
        const colWidth = 180;
        const cellHeight = 50;
        const tableWidth = rowHeaderWidth + numImpact * colWidth;
        const tableHeight = (numLikelihood + 1) * cellHeight;

        // Default header values (using "DISASTROUS" as a synonym for "CATASTROPHIC")
        const defaultLikelihoodLevels = ["LOW:1-2", "MEDIUM:3-4", "HIGH:5-6", "VERY HIGH:7-8", "EXTREME:9-10"];
        const defaultImpactLevels = ["MINOR:1-2", "MODERATE:3-4", "SEVERE:5-6", "CRITICAL:7-8", "DISASTROUS:9-10"];

        // Create table for the mapping matrix
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
        contentWrapper.appendChild(table);

        // Scale the table to fit within 80% of the viewport without scrollbars
        const availableWidth = window.innerWidth * 0.8;
        const availableHeight = window.innerHeight * 0.8;
        const scaleFactor = Math.min(availableWidth / tableWidth, availableHeight / tableHeight, 1);
        table.style.transform = `scale(${scaleFactor})`;
        table.style.transformOrigin = "top left";
        // Increase dialog width slightly more for extra horizontal space
        dialog.style.width = tableWidth * scaleFactor + 120 + "px";

        // Container for the confirm button (centered)
        const btnContainer = document.createElement("div");
        btnContainer.style.textAlign = "center";
        btnContainer.style.marginTop = "20px";
        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn btn-success";
        confirmBtn.innerText = "Confirm Mapping";
        confirmBtn.style.padding = "10px 20px";
        confirmBtn.style.fontSize = "16px";
        confirmBtn.style.cursor = "pointer";
        btnContainer.appendChild(confirmBtn);
        contentWrapper.appendChild(btnContainer);

        document.body.appendChild(dialog);
        dialog.showModal();

        // When "Confirm Mapping" is clicked, validate inputs; if all pass, show query string and close everything.
        confirmBtn.addEventListener("click", function () {
            const mappingValues = [];
            let allValid = true;
            const headerRegex = /^[^:]+:\d+-\d+$/;

            const rowHeaderInputs = dialog.querySelectorAll("input.custom-row-header");
            for (let index = 0; index < rowHeaderInputs.length; index++) {
                const val = rowHeaderInputs[index].value.trim();
                if (!val) {
                    alert(`Row header ${index + 1} is empty.`);
                    allValid = false;
                    break;
                }
                if (!headerRegex.test(val)) {
                    alert(`The row header for row ${index + 1} ("${val}") is invalid. Use format 'Label:minValue-maxValue' (e.g., 'LOW:0-1').`);
                    allValid = false;
                    break;
                }
            }
            if (!allValid) return;

            const colHeaderInputs = dialog.querySelectorAll("input.custom-col-header");
            for (let index = 0; index < colHeaderInputs.length; index++) {
                const val = colHeaderInputs[index].value.trim();
                if (!val) {
                    alert(`Column header ${index + 1} is empty.`);
                    allValid = false;
                    break;
                }
                if (!headerRegex.test(val)) {
                    alert(`The column header for column ${index + 1} ("${val}") is invalid. Use format 'Label:minValue-maxValue' (e.g., 'LOW:0-1').`);
                    allValid = false;
                    break;
                }
            }
            if (!allValid) return;

            for (let i = 0; i < numLikelihood; i++) {
                for (let j = 0; j < numImpact; j++) {
                    const input = dialog.querySelector(`input.mapping-input[data-row="${i}"][data-col="${j}"]`);
                    let value = input ? input.value.trim() : "";
                    if (!value) {
                        alert(`Mapping field at row ${i + 1}, column ${j + 1} is empty.`);
                        allValid = false;
                        break;
                    }
                    mappingValues.push(value);
                }
                if (!allValid) break;
            }
            if (!allValid) return;

            const likelihoodLevels = [];
            const impactLevels = [];
            rowHeaderInputs.forEach(input => likelihoodLevels.push(input.value.trim()));
            colHeaderInputs.forEach(input => impactLevels.push(input.value.trim()));

            const likelihoodConfigString = likelihoodLevels.join(";");
            const impactConfigString = impactLevels.join(";");
            const mappingStringFinal = mappingValues.join(",");
            const finalQueryString = `likelihoodConfig=${likelihoodConfigString}&impactConfig=${impactConfigString}&mapping=${mappingStringFinal}`;

            alert("Final Query String:\n" + finalQueryString);
            // Close the dialog and remove it from the document
            dialog.close();
            document.body.removeChild(dialog);
        });
    });
}
