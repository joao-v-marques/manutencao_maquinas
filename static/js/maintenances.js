function formatDateToInput(dateString) {
    if (!dateString) {
        return "";
    };

    const date = new Date(dateString);

    // garante que vai ficar no formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0")

    return `${day}/${month}/${year}`;
}

async function populateMaintenanceTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/maintenances")

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const maintenances = await response.json();

        const tbodyMaintenances = document.getElementById("maintenanceTableBody");

        tbodyMaintenances.innerHTML = ``;

        const maintenanceFragment = document.createDocumentFragment();

        let maintenanceQtd = 0;

        maintenances.forEach(maintenance => {
            const trMaintenance = document.createElement("tr");

            maintenanceQtd++;

            const maintenance_date = formatDateToInput(maintenance.maintenance_date);
            const next_maintenance_date = formatDateToInput(maintenance.next_maintenance_date);

            trMaintenance.innerHTML = `
                <td>${maintenance.id}</td>
                <td>${maintenance_date}</td>
                <td>${next_maintenance_date}</td>
                <td>${maintenance.user}</td>
                <td>${maintenance.equipment}</td>
                <td class="table-options">
                    <button class="icon-btn icon-btn--edit edit-equipment-button" title="Visualizar Manutenção">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </td>
            `;

            const resultCount = document.getElementById("resultsCount");
            resultCount.textContent = `Total: ${maintenanceQtd} Manutenções`;

            maintenanceFragment.appendChild(trMaintenance);
        })

        tbodyMaintenances.appendChild(maintenanceFragment);
    } catch (error) {
        console.log(error)
    }
}

document.addEventListener("DOMContentLoaded", () => {
    populateMaintenanceTable();
});
