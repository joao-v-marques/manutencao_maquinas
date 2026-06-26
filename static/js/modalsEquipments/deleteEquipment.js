const deleteEquipmentModal = document.getElementById("deleteEquipmentModalOverlay");
const deleteEquipmentForm = document.getElementById("deleteEquipmentForm");
const deleteEquipmentId = document.getElementById("deleteEquipmentId");
const deleteEquipmentName = document.getElementById("deleteEquipmentName");

function closeDeleteEquipmentModal() {
    deleteEquipmentModal.classList.remove("is-open");
}

export function openDeleteEquipmentModal(equipment) {
    deleteEquipmentId.value = equipment.id;
    deleteEquipmentName.textContent = equipment.name;

    deleteEquipmentModal.classList.add("is-open");
}

export function closeModalDeleteEquipment() {
    const btnClose = document.getElementById("closeDeleteEquipmentModalButton");
    const btnCancel = document.getElementById("cancelDeleteEquipmentButton");

    btnClose.addEventListener("click", closeDeleteEquipmentModal);
    btnCancel.addEventListener("click", closeDeleteEquipmentModal);

    window.addEventListener("click", (e) => {
        if (e.target === deleteEquipmentModal) closeDeleteEquipmentModal();
    });
}

export function deleteEquipment(onEquipmentDeleted) {
    deleteEquipmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const equipmentId = deleteEquipmentId.value;

            const response = await fetchWithAuth(`/portal-manutencao/equipments/${equipmentId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            closeDeleteEquipmentModal();

            if (typeof onEquipmentDeleted === "function") {
                onEquipmentDeleted();
            }
        } catch (error) {
            console.log(error);
        }
    });
}