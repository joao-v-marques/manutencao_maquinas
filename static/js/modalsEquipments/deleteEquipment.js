import { openOverlay, closeOverlay, bindOverlayClose } from "../utils/modal.js";
import { escapeHTML } from "../utils/maintenanceStatus.js";

const deleteEquipmentModal = document.getElementById("deleteEquipmentModalOverlay");
const deleteEquipmentForm = document.getElementById("deleteEquipmentForm");
const deleteEquipmentId = document.getElementById("deleteEquipmentId");
const deleteEquipmentSummary = document.getElementById("deleteEquipmentSummary");
const confirmButton = document.getElementById("confirmDeleteEquipmentButton");

let currentEquipmentName = "";

// abre a confirmação mostrando qual equipamento será excluído
export function openDeleteEquipmentModal(equipment) {
    deleteEquipmentId.value = equipment.id;
    currentEquipmentName = equipment.name;

    const meta = [equipment.type, equipment.sector, equipment.location].filter(Boolean).map(escapeHTML).join(" · ");

    deleteEquipmentSummary.innerHTML = `
        <span class="delete-summary__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </span>
        <div>
            <div class="delete-summary__name">${escapeHTML(equipment.name)}</div>
            <div class="delete-summary__meta">${meta}</div>
        </div>
    `;

    // foco no "Cancelar": numa ação destrutiva o padrão seguro é não excluir
    openOverlay(deleteEquipmentModal, { focus: document.getElementById("cancelDeleteEquipmentButton") });
}

export function closeModalDeleteEquipment() {
    bindOverlayClose(deleteEquipmentModal, [
        document.getElementById("closeDeleteEquipmentModalButton"),
        document.getElementById("cancelDeleteEquipmentButton"),
    ]);
}

async function readErrorMessage(response) {
    const text = await response.text();

    try {
        return JSON.parse(text)?.message || "Houve um erro ao excluir o equipamento.";
    } catch (error) {
        return "Houve um erro ao excluir o equipamento.";
    }
}

export function deleteEquipment(onEquipmentDeleted) {
    deleteEquipmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        confirmButton.disabled = true;
        confirmButton.classList.add("is-loading");

        try {
            const response = await fetchWithAuth(`/portal-manutencao/equipments/${deleteEquipmentId.value}`, {
                method: "DELETE"
            });

            // o backend já responde com a mensagem clara quando há manutenções vinculadas
            if (!response.ok) {
                throw new Error(await readErrorMessage(response));
            }

            closeOverlay(deleteEquipmentModal);
            notyf.success(`Equipamento ${currentEquipmentName} excluído.`);

            if (typeof onEquipmentDeleted === "function") {
                await onEquipmentDeleted();
            }
        } catch (error) {
            notyf.error(error.message);
        } finally {
            confirmButton.disabled = false;
            confirmButton.classList.remove("is-loading");
        }
    });
}
