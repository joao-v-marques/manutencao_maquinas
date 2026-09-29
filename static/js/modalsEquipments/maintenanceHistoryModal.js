import { openOverlay, bindOverlayClose } from "../utils/modal.js";
import { formatDateToInput, escapeHTML } from "../utils/maintenanceStatus.js";

const historyModal = document.getElementById("maintenanceHistoryModal");
const detailModal = document.getElementById("maintenanceDetailModal");
const tbodyMaintenances = document.getElementById("maintenanceTableBody");

const HISTORY_COLUMNS = 6;

// mantém as manutenções carregadas para o modal de detalhes (clique delegado usa o índice da linha)
let currentMaintenances = [];

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// abre o modal de detalhes por cima do histórico usando o objeto já carregado na tabela (sem nova requisição)
function openMaintenanceDetailModal(maintenance) {
    setText("detailMaintenanceSubtitle", `Registro #${maintenance.id}`);
    setText("detailMaintenanceEquipment", maintenance.equipment || "–");
    setText("detailMaintenanceDate", formatDateToInput(maintenance.maintenance_date) || "–");
    setText("detailNextMaintenanceDate", formatDateToInput(maintenance.next_maintenance_date) || "–");
    setText("detailMaintenanceUser", maintenance.user || "–");

    const descriptionElement = document.getElementById("detailMaintenanceDescription");
    const description = (maintenance.description || "").trim();

    descriptionElement.textContent = description || "Nenhuma descrição informada para esta manutenção.";
    descriptionElement.classList.toggle("is-empty", !description);

    openOverlay(detailModal);
}

function renderSkeletonRows() {
    tbodyMaintenances.innerHTML = Array.from({ length: 3 }, () => `
        <tr class="is-state-row">
            ${Array.from({ length: HISTORY_COLUMNS }, () => `<td><span class="skeleton" style="width: 70%;"></span></td>`).join("")}
        </tr>
    `).join("");
}

function renderStateRow({ title, text, isError = false }) {
    tbodyMaintenances.innerHTML = `
        <tr class="is-state-row">
            <td colspan="${HISTORY_COLUMNS}">
                <div class="table-state ${isError ? "table-state--error" : ""}">
                    <span class="table-state__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${isError
                                ? `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`
                                : `<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15 15"/>`}
                        </svg>
                    </span>
                    <span class="table-state__title">${title}</span>
                    <span class="table-state__text">${text}</span>
                </div>
            </td>
        </tr>
    `;
}

// preenche o resumo do topo (total, última e próxima) — as manutenções vêm ordenadas da mais recente para a mais antiga
function fillHistorySummary(maintenances) {
    const latest = maintenances[0];

    setText("historyTotalCount", maintenances.length);
    setText("historyLastDate", latest ? formatDateToInput(latest.maintenance_date) : "–");
    setText("historyNextDate", latest ? formatDateToInput(latest.next_maintenance_date) : "–");
}

// função para carregar todas as manutenções cadastradas do equipamento na tabela do modal de histórico
async function loadMaintenancesTable(equipmentId) {
    currentMaintenances = [];
    renderSkeletonRows();
    fillHistorySummary([]);
    setText("historyTotalCount", "–");

    try {
        const response = await fetchWithAuth(`/portal-manutencao/maintenances/${equipmentId}`);

        if (!response.ok) {
            throw new Error(await response.text());
        }

        currentMaintenances = await response.json();
        fillHistorySummary(currentMaintenances);

        if (currentMaintenances.length === 0) {
            renderStateRow({
                title: "Nenhuma manutenção registrada",
                text: "Quando uma manutenção for registrada para este equipamento, ela aparecerá aqui.",
            });
            return;
        }

        tbodyMaintenances.innerHTML = currentMaintenances.map((maintenance, index) => `
            <tr class="${index === 0 ? "is-latest" : ""}">
                <td class="cell-id">#${escapeHTML(maintenance.id)}</td>
                <td>
                    <span class="date-cell__value">${formatDateToInput(maintenance.maintenance_date)}</span>
                    ${index === 0 ? `<span class="badge-latest">Última</span>` : ""}
                </td>
                <td>${formatDateToInput(maintenance.next_maintenance_date)}</td>
                <td>${escapeHTML(maintenance.user)}</td>
                <td>${escapeHTML(maintenance.equipment)}</td>
                <td>
                    <div class="table-options">
                        <button type="button" class="icon-btn icon-btn--edit maintenance-detail-button" data-index="${index}" aria-label="Detalhar manutenção #${escapeHTML(maintenance.id)}" title="Detalhar Manutenção">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");
    } catch (error) {
        renderStateRow({
            title: "Não foi possível carregar o histórico",
            text: "Verifique sua conexão e tente abrir o histórico novamente.",
            isError: true,
        });
        console.log(error);
    }
}

// um único listener para todos os botões "Detalhar", mesmo após recarregar a tabela
tbodyMaintenances.addEventListener("click", (e) => {
    const button = e.target.closest(".maintenance-detail-button");

    if (button) {
        openMaintenanceDetailModal(currentMaintenances[Number(button.dataset.index)]);
    }
});

// abre o modal de histórico já com o nome do equipamento no subtítulo; a tabela carrega com o modal aberto (skeleton)
export async function openMaintenanceHistoryModal(equipment) {
    setText("maintenanceHistoryEquipmentName", [equipment.name, equipment.sector].filter(Boolean).join(" · "));

    openOverlay(historyModal);

    await loadMaintenancesTable(equipment.id);
}

// fecha os modais de histórico e de detalhes no X, no botão fechar, clicando fora e com Esc
export function closeModalMaintenanceHistory() {
    bindOverlayClose(historyModal, [
        document.getElementById("closeMaintenanceHistoryModalButton"),
        document.getElementById("cancelMaintenanceHistoryModalButton"),
    ]);

    bindOverlayClose(detailModal, [
        document.getElementById("closeMaintenanceDetailModalButton"),
        document.getElementById("cancelMaintenanceDetailModalButton"),
    ]);
}
