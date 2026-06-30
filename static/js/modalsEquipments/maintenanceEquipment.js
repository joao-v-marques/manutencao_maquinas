const modalMaintenance = document.getElementById("maintenanceModal");

export function openMaintenanceModal() {
    modalMaintenance.classList.add("is-open");
}

function closeMaintenanceModal() {
    modalMaintenance.classList.remove("is-open");
}

export function closeModalMaintenanceEquipment() {
    const btnClose = document.getElementById("closeModalMaintenance");
    const btnCancel = document.getElementById("cancelModalMaintenance");

    btnClose.addEventListener("click", closeMaintenanceModal);
    btnCancel.addEventListener("click", closeMaintenanceModal);

    window.addEventListener("click", (e) => {
        if (e.target === modalMaintenance) closeMaintenanceModal();
    });
}
