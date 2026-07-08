const modalCreatEquipment = document.getElementById("formModalOverlay");

const btnCreateEquipment = document.getElementById("formModalTitle");

// habilita o flatpickr no campo de data de aquisição, na mesma abordagem usada nos demais campos de data do sistema:
// o input real guarda o valor em aaaa-mm-dd (usado no submit) e o altInput exibe dd/mm/aaaa
let acquisitionDatePicker = null;

if (typeof flatpickr !== "undefined") {
    acquisitionDatePicker = flatpickr(document.getElementById("acquisitionDateWrap"), {
        wrap: true,
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        locale: "pt",
    });
}

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

        selectLocation.innerHTML = ``;

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

        selectSectors.innerHTML = ``;

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

        selectMaintenanceGroups.innerHTML = ``;

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

        selectEquipmentStatus.innerHTML = ``;
    
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

            // mapeamento para passar os campos para pt-BR, utilizado no required fields mas util caso precise em outro caso
            const fieldLabels = {
                name: "Nome",
                type: "Tipo",
                location: "Unidade",
                sector: "Setor",
                maintenance_group: "Grupo de Manutenção",
                maintenance_interval_months: "Intervalo de manutenções",
                status: "Status"
            }

            // VALIDAÇÃO DE REQUIRED FIELDS
            const required_fields = [
                "name",
                "type",
                "location",
                "sector",
                "maintenance_group",
                "maintenance_interval_months",
                "status"
            ];

            for (let field of required_fields) {
                const value = formData.get(field);

                if (!value || value === "") {
                    const label = fieldLabels[field] || field;
                    notyf.error(`O campo ${label} não pode estar vazio`);
                    return;
                }
            }

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

            // form.reset() só limpa o valor do input real; o flatpickr precisa ser limpo também para
            // manter o altInput e o estado interno sincronizados com o valor visível
            if (acquisitionDatePicker) {
                acquisitionDatePicker.clear();
            }

            closeModal();
            notyf.success("Equipamento cadastrado com sucesso");

            if (typeof onEquipmentCreated === "function") {
                onEquipmentCreated();
            }
        } catch (error) {
            console.log(error.message);
            notyf.error(error.message);
        }
    })
}
