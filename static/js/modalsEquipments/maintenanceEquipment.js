import { openOverlay, closeOverlay, bindOverlayClose } from "../utils/modal.js";
import {
    formatDateToInput,
    parseDateOnly,
    classifyMaintenanceStatusDetailed,
    formatRelativeDays,
    formatIntervalMonths,
    todayInputValue,
    escapeHTML,
    MAINTENANCE_WINDOW_DAYS,
} from "../utils/maintenanceStatus.js";

const modalMaintenance = document.getElementById("maintenanceModal");
const maintenanceDateInput = document.getElementById("maintenanceDate");
const nextMaintenanceDateInput = document.getElementById("nextMaintenanceDate");
const descriptionInput = document.getElementById("description");

// elementos opcionais: existem na página de manutenções, mas não necessariamente em outras páginas que usam este modal
const descriptionCounter = document.getElementById("descriptionCounter");
const nextMaintenanceHint = document.getElementById("nextMaintenanceHint");
const submitButton = document.getElementById("submitMaintenanceButton");

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
        // manutenção registrada é algo que já aconteceu: não faz sentido escolher uma data futura
        maxDate: "today",
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

function setMaintenanceDateValue(dateValue) {
    if (maintenanceDatePicker) {
        if (dateValue) {
            maintenanceDatePicker.setDate(dateValue, true);
        } else {
            maintenanceDatePicker.clear();
        }
    } else {
        maintenanceDateInput.value = dateValue;
    }

    updateNextMaintenanceDate();
}

// recalcula a próxima manutenção, atualiza o texto de ajuda ("data + N meses") e destaca o atalho de data selecionado
function updateNextMaintenanceDate() {
    setNextMaintenanceDateValue(calculateNextMaintenanceDate(maintenanceDateInput.value, currentMaintenanceIntervalMonths));

    if (nextMaintenanceHint) {
        const interval = Number(currentMaintenanceIntervalMonths);
        nextMaintenanceHint.innerHTML = interval
            ? `Data + <strong>${interval} ${interval === 1 ? "mês" : "meses"}</strong>`
            : "Calculada automaticamente";
    }

    document.querySelectorAll("#maintenanceModal .date-shortcut").forEach(button => {
        const isActive = maintenanceDateInput.value === todayInputValue(Number(button.dataset.dateOffset));
        button.classList.toggle("is-active", isActive);
    });
}

// sempre que a data da manutenção mudar, recalcula automaticamente a próxima manutenção
maintenanceDateInput.addEventListener("change", updateNextMaintenanceDate);

document.querySelectorAll("#maintenanceModal .date-shortcut").forEach(button => {
    button.addEventListener("click", () => {
        setMaintenanceDateValue(todayInputValue(Number(button.dataset.dateOffset)));
    });
});

function updateDescriptionCounter() {
    if (!descriptionCounter) {
        return;
    }

    const length = descriptionInput.value.trim().length;
    descriptionCounter.textContent = `${length} ${length === 1 ? "caractere" : "caracteres"}`;
}

descriptionInput.addEventListener("input", updateDescriptionCounter);

// preenche o bloco-resumo do equipamento no topo do modal (somente se o bloco existir na página)
function fillEquipmentSummary(equipment) {
    const summary = document.getElementById("maintenanceEquipmentSummary");

    if (!summary) {
        return;
    }

    const today = parseDateOnly(new Date().toISOString());
    const status = classifyMaintenanceStatusDetailed(equipment.next_maintenance_date, today, MAINTENANCE_WINDOW_DAYS);
    const relative = formatRelativeDays(status.diffInDays);
    const nextDate = formatDateToInput(equipment.next_maintenance_date);

    document.getElementById("summaryEquipmentName").textContent = equipment.name || "–";
    document.getElementById("summaryEquipmentSector").textContent = equipment.sector || "";
    document.getElementById("summaryInterval").textContent = formatIntervalMonths(equipment.maintenance_interval_months) || "–";
    document.getElementById("summaryLastMaintenance").textContent = formatDateToInput(equipment.maintenance_date) || "Nenhuma";
    document.getElementById("summaryNextMaintenance").textContent = nextDate ? `${nextDate} (${relative})` : "–";
    document.getElementById("summaryEquipmentStatus").innerHTML =
        `<span class="maintenance-status status--${status.key}">${escapeHTML(status.label)}</span>`;
}

// função para abrir o modal de manutenção com as informações necessárias já preenchidas
export async function openMaintenanceModal(equipment) {
    // getLoggedUser (apiHelper.js) reaproveita a mesma requisição ao /me feita pela navbar
    const loggedUser = await getLoggedUser();

    if (!loggedUser) {
        notyf.error("Não foi possível identificar o usuário logado. Recarregue a página.");
        return;
    }

    currentMaintenanceIntervalMonths = equipment.maintenance_interval_months;
    currentEquipmentId = equipment.id;
    currentEquipmentName = equipment.name;
    currentUserId = loggedUser.id;

    document.getElementById("maintenanceForm").reset();
    refillHiddenMaintenanceFields();
    fillEquipmentSummary(equipment);
    updateDescriptionCounter();

    // já sugere hoje como data da manutenção (caso mais comum), recalculando a próxima automaticamente
    setMaintenanceDateValue(todayInputValue());

    openOverlay(modalMaintenance, { focus: descriptionInput });
}

// reatribui os campos ocultos/readonly do formulário após o reset
function refillHiddenMaintenanceFields() {
    document.getElementById("maintenanceEquipmentId").value = currentEquipmentId;
    document.getElementById("formMaintenanceUserId").value = currentUserId;

    const equipmentNameInput = document.getElementById("equipmentName");
    if (equipmentNameInput) {
        equipmentNameInput.value = currentEquipmentName;
    }
}

// liga o fechamento do modal no X, no cancelar, clicando fora e com Esc
export function closeModalMaintenanceEquipment() {
    bindOverlayClose(modalMaintenance, [
        document.getElementById("closeModalMaintenance"),
        document.getElementById("cancelModalMaintenance"),
    ]);
}

function setSubmitting(isSubmitting) {
    if (!submitButton) {
        return;
    }

    submitButton.disabled = isSubmitting;
    submitButton.classList.toggle("is-loading", isSubmitting);
}

async function readErrorMessage(response, fallback) {
    const text = await response.text();

    try {
        return JSON.parse(text)?.message || fallback;
    } catch (parseError) {
        return text || fallback;
    }
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

        setSubmitting(true);

        try {
            // remove espaços no início e no fim de todos os campos de texto antes de enviar
            const data = {};
            for (const [key, value] of new FormData(formCreateMaintenance).entries()) {
                data[key] = typeof value === "string" ? value.trim() : value;
            }

            const response = await fetchWithAuth("/portal-manutencao/maintenances", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Houve um erro ao registrar a manutenção."));
            }

            notyf.success(`Manutenção de ${currentEquipmentName} registrada com sucesso!`);

            closeOverlay(modalMaintenance);

            if (onSuccess) {
                await onSuccess();
            }
        } catch (error) {
            notyf.error(error.message);
            console.log(error);
        } finally {
            setSubmitting(false);
        }
    })
}
