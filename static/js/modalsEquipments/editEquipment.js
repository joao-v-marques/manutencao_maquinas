const editEquipmentModal = document.getElementById("editEquipmentModalOverlay");
const editEquipmentForm = document.getElementById("editEquipmentForm");

function formatDateToInput(dateString) {
    if (!dateString) {
        return "";
    };

    const date = new Date(dateString);

    // garante que vai ficar no formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`;
}

// carregar campos do form que são entidades na DB
export async function loadFieldsEdit() {
    // carregar o campo de Unidade
    try {
        const response = await fetchWithAuth("/portal-manutencao/locations");

        const locationJSON = await response.json();

        const selectLocation = document.getElementById("edit_location_id");

        locationJSON.forEach(location => {
            const option = document.createElement("option");

            option.value = location.id;
            option.textContent = location.description;

            selectLocation.appendChild(option);
        })
    } catch (error) {
        console.log(error);
    }

    // carregar campo de setor
    try {
        const response = await fetchWithAuth("/portal-manutencao/sectors");

        const sectorsJSON = await response.json();

        const selectSectors = document.getElementById("edit_sector_id");

        sectorsJSON.forEach(sector => {
            const option = document.createElement("option");

            option.value = sector.id;
            option.textContent = sector.description;

            selectSectors.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }

    // carregar grupo de manutenção
    try {
        const respose = await fetchWithAuth("/portal-manutencao/maintenance-groups");

        const maintenanceGroupsJSON = await respose.json();

        const selectMaintenanceGroups = document.getElementById("edit_maintenance_group_id");

        maintenanceGroupsJSON.forEach(maintenanceGroup => {
            const option = document.createElement("option");

            option.value = maintenanceGroup.id;
            option.textContent = maintenanceGroup.description;

            selectMaintenanceGroups.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }
}

function closeEditEquipmentModal() {
    editEquipmentModal.classList.remove("is-open");
}

export function openEditEquipmentModal(equipment) {
    // ID
    document.getElementById("editEquipmentId").value = equipment.id;
    
    // Identificação
    document.getElementById("edit_name_id").value = equipment.name;
    document.getElementById("edit_ip_id").value = equipment.ip;
    document.getElementById("edit_serial_number_id").value = equipment.serial_number;

    // Características
    document.getElementById("edit_type_id").value = equipment.type ?? "";
    document.getElementById("edit_brand_id").value = equipment.brand ?? "";
    document.getElementById("edit_model_id").value = equipment.model ?? "";

    // Localização
    document.getElementById("edit_location_id").value = equipment.location_id ?? "";
    document.getElementById("edit_sector_id").value = equipment.sector_id ?? "";
    document.getElementById("edit_maintenance_group_id").value = equipment.maintenance_group_id ?? "";

    // Controle
    document.getElementById("edit_acquisition_date_id").value = new Date(equipment.acquisition_date).toISOString().split("T")[0];
    document.getElementById("edit_maintenance_interval_months_id").value = equipment.maintenance_interval_months ?? "1";

    editEquipmentModal.classList.add("is-open");
}

export async function sendFormEditEquipment(onEquipmentEdited) {
    const editEquipmentForm = document.getElementById("editEquipmentForm");
    
    editEquipmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData(editEquipmentForm);
            const data = Object.fromEntries(formData.entries());
            const equipmentID = document.getElementById("editEquipmentId").value;

            // validação remover espaços no inicio e final da string
            for (let [key, value] of formData.entries()) {
                if (typeof value === "string") {
                    formData.set(key, value.trim());
                }
            }

            const response = await fetchWithAuth(`/portal-manutencao/equipments/${equipmentID}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                let errorMessage = "Houve um erro ao editar o usuário";

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

            console.log("Usuário atualizado com sucesso");
            editEquipmentForm.reset();
            closeEditEquipmentModal();

            if (typeof onEquipmentEdited === "function") {
                onEquipmentEdited();
            }
        } catch (error) {
            console.log(error)
        }
    })
}

export function closeModalEditEquipment() {
    const btnClose = document.getElementById("closeEditEquipmentModalButton");
    const btnCancel = document.getElementById("cancelEditEquipmentButton");

    btnClose.addEventListener("click", closeEditEquipmentModal);
    btnCancel.addEventListener("click", closeEditEquipmentModal);

    window.addEventListener("click", (e) => {
        if (e.target === editEquipmentModal) closeEditEquipmentModal();
    });
}
