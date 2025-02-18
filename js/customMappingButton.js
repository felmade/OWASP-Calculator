export function initMappingMatrixGenerator() {
    // Set up the event listener for the "Generate Mapping Matrix" button within the modal
    const generateMappingMatrixBtn = document.getElementById("generateMappingMatrixBtn");
    if (!generateMappingMatrixBtn) {
        console.error("Generate Mapping Matrix button not found.");
        return;
    }

    generateMappingMatrixBtn.addEventListener("click", function () {
        // Retrieve the numeric values for the number of levels
        const likelihoodInputValue = document.getElementById("likelihoodLevelsInput").value;
        const impactInputValue = document.getElementById("impactLevelsInput").value;
        const numLikelihood = parseInt(likelihoodInputValue, 10);
        const numImpact = parseInt(impactInputValue, 10);

        if (isNaN(numLikelihood) || numLikelihood <= 0 || isNaN(numImpact) || numImpact <= 0) {
            alert("Please enter valid positive integers for both Likelihood and Impact Levels.");
            return;
        }

        const container = document.getElementById("mappingMatrixContainer");
        container.innerHTML = ""; // Clear any previous content

        // Create a table element for the mapping matrix
        const table = document.createElement("table");
        table.className = "table table-bordered";
        table.id = "mappingMatrixTable"; // assign an ID for later updates if needed

        // Create table header row with Impact header input fields
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        // The first header cell remains empty
        const emptyHeader = document.createElement("th");
        emptyHeader.innerText = "";
        headerRow.appendChild(emptyHeader);
        for (let j = 0; j < numImpact; j++) {
            const th = document.createElement("th");
            // Create an input field for the column header
            const colHeaderInput = document.createElement("input");
            colHeaderInput.type = "text";
            colHeaderInput.className = "form-control custom-col-header";
            // Default value can be "Impact X" (user can edit it, e.g., to "MEDIUM:2-4")
            colHeaderInput.value = "Impact " + (j + 1);
            th.appendChild(colHeaderInput);
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body with row header input fields and mapping cells
        const tbody = document.createElement("tbody");
        for (let i = 0; i < numLikelihood; i++) {
            const row = document.createElement("tr");

            // Create a row header cell with an input field for the Likelihood header
            const rowHeaderCell = document.createElement("th");
            const rowHeaderInput = document.createElement("input");
            rowHeaderInput.type = "text";
            rowHeaderInput.className = "form-control custom-row-header";
            // Default value "Likelihood X" (user can edit, e.g., "LOW:0-2")
            rowHeaderInput.value = "Likelihood " + (i + 1);
            rowHeaderCell.appendChild(rowHeaderInput);
            row.appendChild(rowHeaderCell);

            // Create cells for each Impact level in the row
            for (let j = 0; j < numImpact; j++) {
                const cell = document.createElement("td");

                // Text input for the mapping value (string)
                const input = document.createElement("input");
                input.type = "text";
                input.className = "form-control mapping-input";
                input.placeholder = "Enter value";
                input.dataset.row = i;
                input.dataset.col = j;
                cell.appendChild(input);

                row.appendChild(cell);
            }
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        container.appendChild(table);

        // --- Here is where you replace the existing confirm button event listener with the new validation code ---
        const confirmBtn = document.createElement("button");
        confirmBtn.className = "btn btn-success mt-2 mb-3";
        confirmBtn.innerText = "Confirm Mapping";
        confirmBtn.addEventListener("click", function () {
            const mappingValues = [];
            const rangeRegex = /^[^:]+:\d+-\d+$/; // Expected format: e.g. "LOW:0-1"
            let allValid = true;

            // Iterate through the matrix cells to retrieve the mapping input values
            for (let i = 0; i < numLikelihood; i++) {
                for (let j = 0; j < numImpact; j++) {
                    const input = document.querySelector(`input.mapping-input[data-row="${i}"][data-col="${j}"]`);
                    let value = input ? input.value.trim() : "";

                    // Check if the field is filled
                    if (!value) {
                        alert(`Mapping field at row ${i + 1}, column ${j + 1} is empty.`);
                        allValid = false;
                        break;
                    }

                    // Check if the field matches the expected format
                    if (!rangeRegex.test(value)) {
                        alert(`Mapping field at row ${i + 1}, column ${j + 1} has an invalid format. Expected format: "Text:0-1".`);
                        allValid = false;
                        break;
                    }

                    mappingValues.push(value);
                }
                if (!allValid) break;
            }

            if (!allValid) return; // Stop processing if validation failed

            // Create a comma-separated string of mapping values
            const mappingString = mappingValues.join(",");
            alert("Mapping confirmed: " + mappingString);
            // Further processing (e.g., adding to URL parameters) can be done here.
        });
        container.appendChild(confirmBtn);
    });
}