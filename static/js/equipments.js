import { openModal, closeModalCreateEquipment, createEquipment } from "./modalsEquipments/createEquipment.js";
import { openDeleteEquipmentModal, closeModalDeleteEquipment, deleteEquipment } from "./modalsEquipments/deleteEquipment.js";
import { closeModalEditEquipment, loadFieldsEdit, openEditEquipmentModal, sendFormEditEquipment } from "./modalsEquipments/editEquipment.js";
import { closeModalMaintenanceEquipment, openMaintenanceModal } from "./modalsEquipments/maintenanceEquipment.js";

async function populateEquipmentsTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/equipments");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const equipments = await response.json();

        const tbodyEquipments = document.getElementById("equipmentTbody");

        tbodyEquipments.innerHTML = ``;

        const equipmentFragment = document.createDocumentFragment();

        let equipmentsQtd = 0;

        equipments.forEach(equipment => {
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
                <td>${equipment.acquisition_date}</td>
                <td>${equipment.sector}</td>
                <td>${equipment.status}</td>
                <td class="table-options">
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
                </td>
            `;

            const resultsCountLabel = document.getElementById("resultsCountLabel");
            resultsCountLabel.textContent = `Total: ${equipmentsQtd} equipamentos`;

            equipmentFragment.appendChild(trEquipments);
        });

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
                openEditEquipmentModal(equipments[index]);
            })
        })

        tbodyEquipments.querySelectorAll(".maintenance-action-button").forEach((button, index) => {
            button.addEventListener("click", () => {
                openMaintenanceModal(equipments[index])
            })
        })
    } catch (error) {
        console.log(error)
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
});

const btnCreateEquipment = document.getElementById("openCreateModalButton");

btnCreateEquipment.addEventListener("click", openModal);
