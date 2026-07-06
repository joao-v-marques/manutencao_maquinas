import { openModal, closeModalCreateEquipment, createEquipment } from "./modalsEquipments/createEquipment.js";
import { openDeleteEquipmentModal, closeModalDeleteEquipment, deleteEquipment } from "./modalsEquipments/deleteEquipment.js";
import { closeModalEditEquipment, loadFieldsEdit, openEditEquipmentModal, sendFormEditEquipment } from "./modalsEquipments/editEquipment.js";
import { closeModalMaintenanceEquipment, openMaintenanceModal, submitFormCreateMaintenance } from "./modalsEquipments/maintenanceEquipment.js";
import { formatDateToInput } from "./utils/maintenanceStatus.js";

// guarda a lista completa vinda da API para permitir filtrar sem novas requisições
let allEquipments = [];

function renderEquipmentsTable(equipmentsToRender) {
    const tbodyEquipments = document.getElementById("equipmentTbody");

    tbodyEquipments.innerHTML = ``;

    const equipmentFragment = document.createDocumentFragment();

    let equipmentsQtd = 0;

    equipmentsToRender.forEach(equipment => {
        const trEquipments = document.createElement("tr");

        if (!equipment.model) {
            equipment.model = "NÃO CADASTRADO"
        }

        equipmentsQtd++;

        trEquipments.innerHTML = `
            <td>${equipment.name}</td>
            <td>${equipment.type}</td>
            <td>${equipment.brand}</td>
            <td>${equipment.model}</td>
            <td>${formatDateToInput(equipment.acquisition_date)}</td>
            <td>${equipment.sector}</td>
            <td>${equipment.status}</td>
            <td>
                <div class="table-options">
                    <button class="icon-btn icon-btn--edit edit-equipment-button" data-id="${equipment.id}" aria-label="Editar ${equipment.name}" id="btnOpenEquipment" title="Editar Equipamento">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="icon-btn icon-btn--danger delete-equipment-button" data-id="${equipment.id}" data-name="${equipment.name}" aria-label="Deletar ${equipment.name}" title="Deletar Equipamento">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M8 6V4h8v2"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/>
                            <path d="M14 11v6"/>
                        </svg>
                    </button>
                    <button class="icon-btn icon-btn--create maintenance-action-button" data-id="${equipment.id}" data-name="${equipment.name}" aria-label="Lançar Manutenção ${equipment.name}" title="Lançar Manutenção">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        equipmentFragment.appendChild(trEquipments);
    });

    const resultsCountLabel = document.getElementById("resultsCountLabel");
    resultsCountLabel.textContent = `Total: ${equipmentsQtd} equipamentos`;

    tbodyEquipments.appendChild(equipmentFragment)

    tbodyEquipments.querySelectorAll(".delete-equipment-button").forEach(button => {
        button.addEventListener("click", () => {
            openDeleteEquipmentModal({
                id: button.dataset.id,
                name: button.dataset.name
            });
        });
    });

    tbodyEquipments.querySelectorAll(".edit-equipment-button").forEach((button, index) => {
        button.addEventListener("click", () => {
            openEditEquipmentModal(equipmentsToRender[index]);
        })
    })

    tbodyEquipments.querySelectorAll(".maintenance-action-button").forEach((button, index) => {
        button.addEventListener("click", () => {
            openMaintenanceModal(equipmentsToRender[index])
        })
    })
}

// preenche as opções dos selects de filtro com os valores distintos vindos dos equipamentos carregados
function populateFilterOptions(equipments) {
    const filterSector = document.getElementById("filterSector");
    const filterStatus = document.getElementById("filterStatus");
    const filterType = document.getElementById("filterType");

    const sectors = [...new Set(equipments.map(equipment => equipment.sector).filter(Boolean))].sort();
    const statuses = [...new Set(equipments.map(equipment => equipment.status).filter(Boolean))].sort();
    const types = [...new Set(equipments.map(equipment => equipment.type).filter(Boolean))].sort();

    const previousSector = filterSector.value;
    const previousStatus = filterStatus.value;
    const previousType = filterType.value;

    filterSector.innerHTML = `<option value="">Todos os setores</option>` +
        sectors.map(sector => `<option value="${sector}">${sector}</option>`).join("");
    filterStatus.innerHTML = `<option value="">Todos os status</option>` +
        statuses.map(status => `<option value="${status}">${status}</option>`).join("");
    filterType.innerHTML = `<option value="">Todos os tipos</option>` +
        types.map(type => `<option value="${type}">${type}</option>`).join("");

    filterSector.value = sectors.includes(previousSector) ? previousSector : "";
    filterStatus.value = statuses.includes(previousStatus) ? previousStatus : "";
    filterType.value = types.includes(previousType) ? previousType : "";
}

// aplica o filtro de nome (sem diferenciar maiúsculas/minúsculas), setor, status e tipo sobre a lista carregada
function applyEquipmentsFilters() {
    const nameQuery = document.getElementById("searchNameInput").value.trim().toLowerCase();
    const sectorFilter = document.getElementById("filterSector").value;
    const statusFilter = document.getElementById("filterStatus").value;
    const typeFilter = document.getElementById("filterType").value;

    const filteredEquipments = allEquipments.filter(equipment => {
        const matchesName = !nameQuery || (equipment.name || "").toLowerCase().includes(nameQuery);
        const matchesSector = !sectorFilter || equipment.sector === sectorFilter;
        const matchesStatus = !statusFilter || equipment.status === statusFilter;
        const matchesType = !typeFilter || equipment.type === typeFilter;

        return matchesName && matchesSector && matchesStatus && matchesType;
    });

    renderEquipmentsTable(filteredEquipments);
}

async function populateEquipmentsTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/equipments");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        allEquipments = await response.json();

        populateFilterOptions(allEquipments);
        applyEquipmentsFilters();
    } catch (error) {
        console.log(error)
    }
}

// função para exportar a lista de equipamentos em um arquivo .xlsx
async function exportEquipmentsReport() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/reports/equipments");

        if (!response.ok) {
            let errorMessage = "Houve um erro ao exportar o relatório de equipamentos";

            try {
                const errorJSON = await response.json();

                if (errorJSON?.message) {
                    errorMessage = errorJSON.message;
                }
            } catch (parseError) {
                errorMessage = await response.text();
            }

            throw new Error(errorMessage);
        }

        const blob = await response.blob();

        const disposition = response.headers.get("Content-Disposition");
        let filename = "relatorio_equipamentos.xlsx";

        if (disposition) {
            const match = disposition.match(/filename="?([^"]+)"?/);

            if (match?.[1]) {
                filename = match[1];
            }
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        notyf.error(error.message);
    }
}

// event listener para carregar a página
document.addEventListener("DOMContentLoaded", function () {
    populateEquipmentsTable();

    closeModalCreateEquipment();
    createEquipment(populateEquipmentsTable);
    
    closeModalDeleteEquipment();
    deleteEquipment(populateEquipmentsTable);
    
    loadFieldsEdit();
    closeModalEditEquipment();
    sendFormEditEquipment(populateEquipmentsTable);

    closeModalMaintenanceEquipment();
    submitFormCreateMaintenance();

    document.getElementById("searchNameInput").addEventListener("input", applyEquipmentsFilters);
    document.getElementById("filterSector").addEventListener("change", applyEquipmentsFilters);
    document.getElementById("filterStatus").addEventListener("change", applyEquipmentsFilters);
    document.getElementById("filterType").addEventListener("change", applyEquipmentsFilters);
});

const btnCreateEquipment = document.getElementById("openCreateModalButton");

btnCreateEquipment.addEventListener("click", openModal);

const btnExportEquipments = document.getElementById("exportButton");

btnExportEquipments.addEventListener("click", exportEquipmentsReport);
