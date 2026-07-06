import { openMaintenanceModal, closeModalMaintenanceEquipment, submitFormCreateMaintenance } from "./modalsEquipments/maintenanceEquipment.js";
import { formatDateToInput, parseDateOnly, classifyMaintenanceStatus } from "./utils/maintenanceStatus.js";

// mesma janela usada no dashboard, para manter o "próximo do vencimento" padronizado em todo o projeto (30 dias)
const MAINTENANCE_WINDOW_DAYS = 30;

// guarda a lista completa vinda da API para permitir filtrar sem novas requisições
let allEquipments = [];

function renderEquipmentsStatusTable(equipmentsToRender, today) {
    const tbodyEquipmentsStatus = document.getElementById("equipmentsStatusTableBody");

    tbodyEquipmentsStatus.innerHTML = ``;

    const equipmentsFragment = document.createDocumentFragment();

    let equipmentsQtd = 0;

    equipmentsToRender.forEach(equipment => {
        const trEquipment = document.createElement("tr");

        equipmentsQtd++;

        const maintenance_date = formatDateToInput(equipment.maintenance_date) || "-";
        const next_maintenance_date = formatDateToInput(equipment.next_maintenance_date) || "-";

        const status = classifyMaintenanceStatus(equipment.next_maintenance_date, today, MAINTENANCE_WINDOW_DAYS);

        trEquipment.innerHTML = `
            <td>${equipment.name}</td>
            <td>${equipment.sector}</td>
            <td>${maintenance_date}</td>
            <td>${next_maintenance_date}</td>
            <td>
                <span class="maintenance-status maintenance-status--${status.key}">${status.label}</span>
            </td>
            <td>
                <div class="table-options">
                    <button class="icon-btn icon-btn--create maintenance-action-button" aria-label="Lançar Manutenção ${equipment.name}" title="Lançar Manutenção">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        equipmentsFragment.appendChild(trEquipment);
    })

    tbodyEquipmentsStatus.appendChild(equipmentsFragment);

    tbodyEquipmentsStatus.querySelectorAll(".maintenance-action-button").forEach((button, index) => {
        button.addEventListener("click", () => {
            openMaintenanceModal(equipmentsToRender[index]);
        })
    })

    const resultCount = document.getElementById("resultsCount");
    resultCount.textContent = `Total: ${equipmentsQtd} Equipamentos`;
}

// preenche as opções do select de setor com os valores distintos vindos dos equipamentos carregados
function populateFilterOptions(equipments) {
    const filterSector = document.getElementById("filterMaintenanceSector");

    const sectors = [...new Set(equipments.map(equipment => equipment.sector).filter(Boolean))].sort();

    const previousSector = filterSector.value;

    filterSector.innerHTML = `<option value="">Todos os setores</option>` +
        sectors.map(sector => `<option value="${sector}">${sector}</option>`).join("");

    filterSector.value = sectors.includes(previousSector) ? previousSector : "";
}

// aplica o filtro de nome (sem diferenciar maiúsculas/minúsculas), setor, status e range de vencimento sobre a lista carregada
function applyMaintenanceFilters() {
    const today = parseDateOnly(new Date().toISOString());

    const nameQuery = document.getElementById("searchEquipmentNameInput").value.trim().toLowerCase();
    const sectorFilter = document.getElementById("filterMaintenanceSector").value;
    const statusFilter = document.getElementById("filterMaintenanceStatus").value;
    const dueDateFromValue = document.getElementById("filterDueDateFrom").value;
    const dueDateToValue = document.getElementById("filterDueDateTo").value;

    const dueDateFrom = dueDateFromValue ? parseDateOnly(dueDateFromValue) : null;
    const dueDateTo = dueDateToValue ? parseDateOnly(dueDateToValue) : null;

    const filteredEquipments = allEquipments.filter(equipment => {
        const matchesName = !nameQuery || (equipment.name || "").toLowerCase().includes(nameQuery);
        const matchesSector = !sectorFilter || equipment.sector === sectorFilter;

        const status = classifyMaintenanceStatus(equipment.next_maintenance_date, today, MAINTENANCE_WINDOW_DAYS);
        const matchesStatus = !statusFilter || status.key === statusFilter;

        const nextMaintenanceDate = parseDateOnly(equipment.next_maintenance_date);
        const matchesDueDateFrom = !dueDateFrom || (nextMaintenanceDate && nextMaintenanceDate >= dueDateFrom);
        const matchesDueDateTo = !dueDateTo || (nextMaintenanceDate && nextMaintenanceDate <= dueDateTo);

        return matchesName && matchesSector && matchesStatus && matchesDueDateFrom && matchesDueDateTo;
    });

    renderEquipmentsStatusTable(filteredEquipments, today);
}

async function populateEquipmentsStatusTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/equipments/maintenance-status");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        allEquipments = await response.json();

        const today = parseDateOnly(new Date().toISOString());

        populateFilterOptions(allEquipments);
        applyMaintenanceFilters();
        fillInfoCards(allEquipments, today);
    } catch (error) {
        console.log(error)
    }
}

// classifica os equipamentos (não registros) em 5 categorias e preenche os cards de resumo
// sempre usa a lista completa (não filtrada), pois os cards representam o panorama geral, não o resultado dos filtros
function fillInfoCards(equipments, today) {
    let lateCount = 0;
    let todayCount = 0;
    let nextCount = 0;
    let okCount = 0;
    let neverCount = 0;

    equipments.forEach(equipment => {
        const status = classifyMaintenanceStatus(equipment.next_maintenance_date, today, MAINTENANCE_WINDOW_DAYS);

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

    document.getElementById("searchEquipmentNameInput").addEventListener("input", applyMaintenanceFilters);
    document.getElementById("filterMaintenanceSector").addEventListener("change", applyMaintenanceFilters);
    document.getElementById("filterMaintenanceStatus").addEventListener("change", applyMaintenanceFilters);
    document.getElementById("filterDueDateFrom").addEventListener("change", applyMaintenanceFilters);
    document.getElementById("filterDueDateTo").addEventListener("change", applyMaintenanceFilters);
});
