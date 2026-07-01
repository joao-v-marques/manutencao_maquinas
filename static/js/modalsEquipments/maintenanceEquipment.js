const modalMaintenance = document.getElementById("maintenanceModal");
const maintenanceDateInput = document.getElementById("maintenanceDate");
const nextMaintenanceDateInput = document.getElementById("nextMaintenanceDate");

// guarda o intervalo de manutenção (em meses) do equipamento que está com o modal aberto
let currentMaintenanceIntervalMonths = null;

// função para controlar a formatação de datas
function formatDateToInput(dateString) {
    if (!dateString) {
        return "";
    };

    const date = new Date(dateString);

    // garante que vai ficar no formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0")

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

// sempre que a data da manutenção mudar, recalcula automaticamente a próxima manutenção
maintenanceDateInput.addEventListener("change", () => {
    nextMaintenanceDateInput.value = calculateNextMaintenanceDate(maintenanceDateInput.value, currentMaintenanceIntervalMonths);
});

// função para abir o modal de manutenção com as informações necessárias já preenchidas
export async function openMaintenanceModal(equipment) {
    // preencher o campo da descrição da maquina automaticamente
    document.getElementById("equipmentId").value = equipment.id;
    document.getElementById("equipmentName").value = equipment.name;

    currentMaintenanceIntervalMonths = equipment.maintenance_interval_months;

    // reseta as datas para não manter o valor calculado do equipamento aberto anteriormente
    maintenanceDateInput.value = "";
    nextMaintenanceDateInput.value = "";

    // Carregar todas as manutenções cadastradas do equipamento
    try {
        const response = await fetchWithAuth(`/portal-manutencao/maintenances/${equipment.id}`);

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

    modalMaintenance.classList.add("is-open");
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


