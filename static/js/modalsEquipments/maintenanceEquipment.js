const modalMaintenance = document.getElementById("maintenanceModal");
const maintenanceDateInput = document.getElementById("maintenanceDate");
const nextMaintenanceDateInput = document.getElementById("nextMaintenanceDate");

// habilita o flatpickr nos dois campos de data do modal, com a mesma abordagem usada nos filtros da página:
// o input real guarda o valor em aaaa-mm-dd (usado no submit) e o altInput exibe dd/mm/aaaa
let maintenanceDatePicker = null;
let nextMaintenanceDatePicker = null;

if (typeof flatpickr !== "undefined") {
    maintenanceDatePicker = flatpickr(document.getElementById("maintenanceDateWrap"), {
        wrap: true,
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        locale: "pt",
    });

    // campo calculado automaticamente: mesmo visual dos demais campos de data, mas sem seleção manual
    nextMaintenanceDatePicker = flatpickr(document.getElementById("nextMaintenanceDateWrap"), {
        wrap: true,
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        locale: "pt",
        clickOpens: false,
        allowInput: false,
    });
}

// guarda as informações do equipamento e do usuário logado enquanto o modal está aberto
let currentMaintenanceIntervalMonths = null;
let currentEquipmentId = null;
let currentEquipmentName = null;
let currentUserId = null;

// função para controlar a formatação de datas
function formatDateToInput(dateString) {
    if (!dateString) {
        return "";
    };

    const date = new Date(dateString);

    // o backend serializa a data como meia-noite UTC; usar getters locais aqui "voltaria" um dia
    // em fusos negativos (ex: Brasil, UTC-3), então extraímos os componentes em UTC
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0")

    return `${day}/${month}/${year}`;
}

// calcula a data da próxima manutenção somando o intervalo (em meses) do equipamento à data em que a manutenção foi realizada
function calculateNextMaintenanceDate(maintenanceDateValue, intervalMonths) {
    if (!maintenanceDateValue || !intervalMonths) {
        return "";
    }

    const [year, month, day] = maintenanceDateValue.split("-").map(Number);

    const nextDate = new Date(year, month - 1, day);
    nextDate.setMonth(nextDate.getMonth() + Number(intervalMonths));

    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
    const nextDay = String(nextDate.getDate()).padStart(2, "0");

    return `${nextYear}-${nextMonth}-${nextDay}`;
}

// atualiza o campo (calculado) de próxima manutenção mantendo o flatpickr sincronizado com o valor exibido,
// já que setar ".value" direto no input não atualiza o altInput nem o estado interno do flatpickr
function setNextMaintenanceDateValue(nextDateValue) {
    if (nextMaintenanceDatePicker) {
        if (nextDateValue) {
            nextMaintenanceDatePicker.setDate(nextDateValue, true);
        } else {
            nextMaintenanceDatePicker.clear();
        }
    } else {
        nextMaintenanceDateInput.value = nextDateValue;
    }
}

// sempre que a data da manutenção mudar, recalcula automaticamente a próxima manutenção
maintenanceDateInput.addEventListener("change", () => {
    setNextMaintenanceDateValue(calculateNextMaintenanceDate(maintenanceDateInput.value, currentMaintenanceIntervalMonths));
});

// função para carregar todas as manutenções cadastradas do equipamento na tabela do modal
export async function loadMaintenancesTable(equipmentId) {
    try {
        const response = await fetchWithAuth(`/portal-manutencao/maintenances/${equipmentId}`);

        if (!response.ok) {
            throw new Error("Deu erro!");
        }

        const maintenancesJSON = await response.json();

        const tbodyMaintenances = document.getElementById("maintenanceTableBody");
        tbodyMaintenances.innerHTML = ``;

        const maintenancesFragment = document.createDocumentFragment();

        maintenancesJSON.forEach(maintenance => {
            const trMaintenance = document.createElement("tr");

            trMaintenance.innerHTML = `
                <td>${maintenance.id}</td>
                <td>${formatDateToInput(maintenance.maintenance_date)}</td>
                <td>${formatDateToInput(maintenance.next_maintenance_date)}</td>
                <td>${maintenance.user}</td>
                <td>${maintenance.equipment}</td>
            `
            maintenancesFragment.appendChild(trMaintenance);
        })

        tbodyMaintenances.appendChild(maintenancesFragment);
    } catch (error) {
        console.log(error)
    }
}

// função para abir o modal de manutenção com as informações necessárias já preenchidas
export async function openMaintenanceModal(equipment) {
    const loggedUser = await getLoggedUser();

    currentMaintenanceIntervalMonths = equipment.maintenance_interval_months;
    currentEquipmentId = equipment.id;
    currentEquipmentName = equipment.name;
    currentUserId = loggedUser.id;

    // preencher o campo da descrição da maquina automaticamente
    refillHiddenMaintenanceFields();

    // reseta as datas para não manter o valor calculado do equipamento aberto anteriormente
    if (maintenanceDatePicker) {
        maintenanceDatePicker.clear();
    } else {
        maintenanceDateInput.value = "";
    }
    setNextMaintenanceDateValue("");

    await loadMaintenancesTable(equipment.id);

    modalMaintenance.classList.add("is-open");
}

// reatribui os campos ocultos/readonly do formulário após o reset, permitindo cadastrar várias manutenções sem reabrir o modal
function refillHiddenMaintenanceFields() {
    document.getElementById("maintenanceEquipmentId").value = currentEquipmentId;
    document.getElementById("formMaintenanceUserId").value = currentUserId;
    document.getElementById("equipmentName").value = currentEquipmentName;
}

// 2 funções para fechar o modal no X, cancelar e clicando fora
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

export async function submitFormCreateMaintenance(onSuccess) {
    const formCreateMaintenance = document.getElementById("maintenanceForm");

    if (!formCreateMaintenance || formCreateMaintenance.dataset.submitMaintenanceBound === "true") {
        return;
    }

    formCreateMaintenance.dataset.submitMaintenanceBound = "true";

    formCreateMaintenance.addEventListener("submit", async (e) => {
        e.preventDefault();

        // o flatpickr esconde o input real (type="hidden"), o que remove a validação nativa "required" do HTML
        if (!maintenanceDateInput.value) {
            notyf.error("Informe a data da manutenção.");
            return;
        }

        try {
            const formData = new FormData(formCreateMaintenance);
            const data = Object.fromEntries(formData.entries());

            // validação remover espaços no inicio e final da string
            for (let [key, value] of formData.entries()) {
                if (typeof value === "string") {
                    formData.set(key, value.trim());
                }
            }

            const response = await fetchWithAuth("/portal-manutencao/maintenances", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
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

            notyf.success("Manutenção cadastrada com sucesso!");
            formCreateMaintenance.reset();

            // form.reset() só limpa o valor do input real; o flatpickr precisa ser limpo também para
            // manter o altInput e o estado interno sincronizados com o valor visível
            if (maintenanceDatePicker) {
                maintenanceDatePicker.clear();
            } else {
                maintenanceDateInput.value = "";
            }
            setNextMaintenanceDateValue("");

            refillHiddenMaintenanceFields();

            await loadMaintenancesTable(currentEquipmentId);

            if (onSuccess) {
                await onSuccess();
            }
        } catch (error) {
            notyf.error(error.message);
            console.log(error);
        }
    })
}
