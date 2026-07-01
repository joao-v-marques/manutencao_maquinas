import { openMaintenanceModal, closeModalMaintenanceEquipment, submitFormCreateMaintenance } from "./modalsEquipments/maintenanceEquipment.js";

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

// converte a data (o Flask serializa datas como "Thu, 30 Apr 2026 00:00:00 GMT", mas aceitamos ISO também)
// em um Date local sem horário, evitando problemas de timezone na comparação
function parseDateOnly(dateString) {
    if (!dateString) {
        return null;
    }

    const parsedDate = new Date(dateString);

    if (isNaN(parsedDate.getTime())) {
        return null;
    }

    // o backend serializa a data como meia-noite UTC; extrair os componentes em horário local
    // poderia "voltar" um dia em fusos negativos (ex: Brasil, UTC-3), então usamos os componentes UTC
    return new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
}

const NEXT_MAINTENANCE_WINDOW_DAYS = 15;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

// classifica um equipamento a partir da próxima manutenção; usada tanto nos cards quanto no badge da linha
function classifyMaintenanceStatus(nextMaintenanceDate, today) {
    const parsedNextDate = parseDateOnly(nextMaintenanceDate);

    if (!parsedNextDate) {
        return { key: "primeira", label: "Sem manutenção" };
    }

    const diffInDays = Math.round((parsedNextDate - today) / ONE_DAY_IN_MS);

    if (diffInDays < 0) {
        return { key: "vencida", label: "Vencida" };
    }

    if (diffInDays === 0) {
        return { key: "hoje", label: "Hoje" };
    }

    if (diffInDays <= NEXT_MAINTENANCE_WINDOW_DAYS) {
        return { key: "proxima", label: "Próxima" };
    }

    return { key: "emdia", label: "Em dia" };
}

async function populateEquipmentsStatusTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/equipments/maintenance-status");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const equipments = await response.json();

        const tbodyEquipmentsStatus = document.getElementById("equipmentsStatusTableBody");

        tbodyEquipmentsStatus.innerHTML = ``;

        const equipmentsFragment = document.createDocumentFragment();

        const today = parseDateOnly(new Date().toISOString());

        let equipmentsQtd = 0;

        equipments.forEach(equipment => {
            const trEquipment = document.createElement("tr");

            equipmentsQtd++;

            const maintenance_date = formatDateToInput(equipment.maintenance_date) || "-";
            const next_maintenance_date = formatDateToInput(equipment.next_maintenance_date) || "-";

            const status = classifyMaintenanceStatus(equipment.next_maintenance_date, today);

            trEquipment.innerHTML = `
                <td>${equipment.name}</td>
                <td>${equipment.sector}</td>
                <td>${maintenance_date}</td>
                <td>${next_maintenance_date}</td>
                <td>
                    <span class="maintenance-status maintenance-status--${status.key}">${status.label}</span>
                </td>
                <td class="table-options">
                    <button class="icon-btn icon-btn--create maintenance-action-button" aria-label="Lançar Manutenção ${equipment.name}" title="Lançar Manutenção">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    </button>
                </td>
            `;

            equipmentsFragment.appendChild(trEquipment);
        })

        tbodyEquipmentsStatus.appendChild(equipmentsFragment);

        tbodyEquipmentsStatus.querySelectorAll(".maintenance-action-button").forEach((button, index) => {
            button.addEventListener("click", () => {
                openMaintenanceModal(equipments[index]);
            })
        })

        const resultCount = document.getElementById("resultsCount");
        resultCount.textContent = `Total: ${equipmentsQtd} Equipamentos`;

        fillInfoCards(equipments, today);
    } catch (error) {
        console.log(error)
    }
}

// classifica os equipamentos (não registros) em 5 categorias e preenche os cards de resumo
function fillInfoCards(equipments, today) {
    let lateCount = 0;
    let todayCount = 0;
    let nextCount = 0;
    let okCount = 0;
    let neverCount = 0;

    equipments.forEach(equipment => {
        const status = classifyMaintenanceStatus(equipment.next_maintenance_date, today);

        switch (status.key) {
            case "vencida":
                lateCount++;
                break;
            case "hoje":
                todayCount++;
                break;
            case "proxima":
                nextCount++;
                break;
            case "emdia":
                okCount++;
                break;
            case "primeira":
                neverCount++;
                break;
        }
    });

    document.getElementById("lateCount").textContent = lateCount;
    document.getElementById("todayCount").textContent = todayCount;
    document.getElementById("nextCount").textContent = nextCount;
    document.getElementById("okCount").textContent = okCount;
    document.getElementById("neverCount").textContent = neverCount;
}

document.addEventListener("DOMContentLoaded", () => {
    populateEquipmentsStatusTable();

    closeModalMaintenanceEquipment();
    submitFormCreateMaintenance(populateEquipmentsStatusTable);
});
