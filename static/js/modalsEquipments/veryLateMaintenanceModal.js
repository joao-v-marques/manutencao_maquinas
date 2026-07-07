import { formatDateToInput } from "../utils/maintenanceStatus.js";

const veryLateModal = document.getElementById("veryLateEquipmentsModal");

function closeVeryLateModal() {
    veryLateModal.classList.remove("is-open");
}

// recebe a lista de equipamentos já filtrada (vencidos há mais de 30 dias) e preenche a tabela do modal
export function openVeryLateModal(equipments) {
    const tbodyVeryLate = document.getElementById("veryLateEquipmentsTableBody");
    tbodyVeryLate.innerHTML = ``;

    const veryLateFragment = document.createDocumentFragment();

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

        veryLateFragment.appendChild(trEquipment);
    });

    tbodyVeryLate.appendChild(veryLateFragment);

    veryLateModal.classList.add("is-open");
}

export function closeModalVeryLateEquipments() {
    const btnClose = document.getElementById("closeVeryLateModalButton");
    const btnCancel = document.getElementById("cancelVeryLateModalButton");

    btnClose.addEventListener("click", closeVeryLateModal);
    btnCancel.addEventListener("click", closeVeryLateModal);

    window.addEventListener("click", (e) => {
        if (e.target === veryLateModal) closeVeryLateModal();
    });
}
