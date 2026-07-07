import { formatDateToInput } from "../utils/maintenanceStatus.js";

const lateModal = document.getElementById("lateEquipmentsModal");

function closeLateModal() {
    lateModal.classList.remove("is-open");
}

// recebe a lista de equipamentos já filtrada (vencidos há menos de 30 dias) e preenche a tabela do modal
export function openLateModal(equipments) {
    const tbodyLate = document.getElementById("lateEquipmentsTableBody");
    tbodyLate.innerHTML = ``;

    const lateFragment = document.createDocumentFragment();

    equipments.forEach(equipment => {
        const trEquipment = document.createElement("tr");

        const maintenance_date = formatDateToInput(equipment.maintenance_date) || "-";
        const next_maintenance_date = formatDateToInput(equipment.next_maintenance_date) || "-";
        const daysLate = Math.abs(equipment.diffInDays);

        trEquipment.innerHTML = `
            <td>${equipment.name}</td>
            <td>${equipment.sector}</td>
            <td>${maintenance_date}</td>
            <td>${next_maintenance_date}</td>
            <td>${daysLate} dias</td>
        `;

        lateFragment.appendChild(trEquipment);
    });

    tbodyLate.appendChild(lateFragment);

    lateModal.classList.add("is-open");
}

export function closeModalLateEquipments() {
    const btnClose = document.getElementById("closeLateModalButton");
    const btnCancel = document.getElementById("cancelLateModalButton");

    btnClose.addEventListener("click", closeLateModal);
    btnCancel.addEventListener("click", closeLateModal);

    window.addEventListener("click", (e) => {
        if (e.target === lateModal) closeLateModal();
    });
}
