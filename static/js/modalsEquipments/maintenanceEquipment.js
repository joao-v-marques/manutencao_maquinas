const modalMaintenance = document.getElementById("maintenanceModal");

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

// função para abir o modal de manutenção com as informações necessárias já preenchidas
export async function openMaintenanceModal(equipment) {
    // preencher o campo da descrição da maquina automaticamente
    document.getElementById("equipmentId").value = equipment.id;
    document.getElementById("equipmentName").value = equipment.name;

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

export async function submitFormCreateMaintenance() {
    
}
