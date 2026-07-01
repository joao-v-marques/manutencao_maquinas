const modalCreatEquipment = document.getElementById("formModalOverlay");

const btnCreateEquipment = document.getElementById("formModalTitle");

function closeModal() {
    modalCreatEquipment.classList.remove("is-open");
}

// carregar campos do form que são entidades na DB
export async function loadFields() {
    // carregar o campo de Unidade
    try {
        const response = await fetchWithAuth("/portal-manutencao/locations");

        const locationJSON = await response.json();

        const selectLocation = document.getElementById("location_id");

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

        const selectSectors = document.getElementById("sector_id");

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

        const selectMaintenanceGroups = document.getElementById("maintenance_group_id");

        maintenanceGroupsJSON.forEach(maintenanceGroup => {
            const option = document.createElement("option");

            option.value = maintenanceGroup.id;
            option.textContent = maintenanceGroup.description;

            selectMaintenanceGroups.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }

    // carregar campo de status do equipamento
    try {
        const response = await fetchWithAuth("/portal-manutencao/equipment-status");

        const equipmentStatusJSON = await response.json();

        const selectEquipmentStatus = document.getElementById("status_id");
    
        equipmentStatusJSON.forEach(status => {
            const option = document.createElement("option");

            option.value = status.id;
            option.textContent = status.description

            selectEquipmentStatus.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }
}

// função para abrir o modal
export function openModal() {
    modalCreatEquipment.classList.add("is-open");
    loadFields();
}

// função para fechar o modal no X e clicando fora da tela
export function closeModalCreateEquipment() {
    const btnClose = document.getElementById("closeFormModalButton");
    const btnCancel = document.getElementById("cancelFormButton");

    btnClose.addEventListener("click", closeModal);
    btnCancel.addEventListener("click", closeModal);

    window.addEventListener("click", (e) => {
        if (e.target === modalCreatEquipment) closeModal();
    })
}

// função para lançar novo equipamento (submit do form)
export async function createEquipment(onEquipmentCreated) {
    const formCreateEquipment = document.getElementById("equipmentForm");

    formCreateEquipment.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData(formCreateEquipment);

            // validação para remover espaços no inicio e final da string
            for (let [key, value] of formData.entries()) {
                if (typeof value === "string") {
                    formData.set(key, value.trim());
                }
            }

            const data = Object.fromEntries(formData.entries());

            // FAZER VALIDAÇÃO DE REQUIRED FIELDS

            const response = await fetchWithAuth("/portal-manutencao/equipments", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                let errorMessage = "Houve um erro ao tentar cadastrar o equipamento";

                try {
                    const errorJSON = await response.json();

                    if (errorJSON?.message) {
                        errorMessage = errorJSON.message;
                    }

                    throw new Error(errorMessage);
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        // resposta não é JSON, tenta ler como texto
                        errorMessage = `Erro ${response.status}: Falha ao cadastrar equipamento`;
                    } else {
                        errorMessage = error.message;
                    }
                }

                throw new Error(errorMessage);
            }

            formCreateEquipment.reset();
            closeModal();

            if (typeof onEquipmentCreated === "function") {
                onEquipmentCreated();
            }
        } catch (error) {
            console.log(error);
        }
    })    
}
