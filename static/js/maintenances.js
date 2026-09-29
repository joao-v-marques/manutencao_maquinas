import { openMaintenanceModal, closeModalMaintenanceEquipment, submitFormCreateMaintenance } from "./modalsEquipments/maintenanceEquipment.js";
import { openMaintenanceHistoryModal, closeModalMaintenanceHistory } from "./modalsEquipments/maintenanceHistoryModal.js";
import {
    formatDateToInput,
    parseDateOnly,
    classifyMaintenanceStatusDetailed,
    formatRelativeDays,
    formatIntervalMonths,
    escapeHTML,
    MAINTENANCE_WINDOW_DAYS,
} from "./utils/maintenanceStatus.js";

// ordem de gravidade: usada na ordenação por status, nos cards e na barra de distribuição
const STATUS_ORDER = ["vencida_critica", "vencida", "hoje", "proxima", "emdia", "primeira"];

const STATUS_LABELS = {
    vencida_critica: "Vencidas há +30 dias",
    vencida: "Vencidas há até 30 dias",
    hoje: "Vencem hoje",
    proxima: "Próximos 30 dias",
    emdia: "Em dia",
    primeira: "Sem registro",
};

const TABLE_COLUMNS = 6;

// estado único da página: a tabela, os cards e os chips são sempre renderizados a partir dele
const state = {
    all: [],
    loading: true,
    error: false,
    filters: { name: "", sector: "", status: "", from: null, to: null },
    sort: { key: "status", dir: "asc" },
    page: 1,
    pageSize: 25,
};

let fromPicker = null;
let toPicker = null;

const elements = {
    tbody: document.getElementById("equipmentsStatusTableBody"),
    searchField: document.getElementById("searchField"),
    searchInput: document.getElementById("searchEquipmentNameInput"),
    sectorSelect: document.getElementById("filterMaintenanceSector"),
    statusSelect: document.getElementById("filterMaintenanceStatus"),
    activeFilters: document.getElementById("activeFilters"),
    resultsLabel: document.getElementById("resultsLabel"),
    resultsCount: document.getElementById("resultsCount"),
    pageSizeSelect: document.getElementById("pageSizeSelect"),
    prevPageButton: document.getElementById("prevPageButton"),
    nextPageButton: document.getElementById("nextPageButton"),
    pageLabel: document.getElementById("pageLabel"),
    refreshButton: document.getElementById("refreshButton"),
    lastUpdatedLabel: document.getElementById("lastUpdatedLabel"),
    healthBar: document.getElementById("healthBar"),
    healthLegend: document.getElementById("healthLegend"),
    healthScore: document.getElementById("healthScore"),
    statusCards: document.querySelectorAll(".status-card[data-status-filter]"),
};

// ===================== Dados =====================

// pré-calcula status e datas de cada equipamento uma única vez, evitando reprocessar a cada filtro/ordenação
function enrichEquipments(equipments) {
    const today = parseDateOnly(new Date().toISOString());

    return equipments.map(equipment => ({
        ...equipment,
        _status: classifyMaintenanceStatusDetailed(equipment.next_maintenance_date, today, MAINTENANCE_WINDOW_DAYS),
        _last: parseDateOnly(equipment.maintenance_date),
        _next: parseDateOnly(equipment.next_maintenance_date),
    }));
}

async function loadEquipments() {
    state.loading = true;
    state.error = false;
    elements.refreshButton.classList.add("is-loading");
    elements.refreshButton.disabled = true;
    render();

    try {
        const response = await fetchWithAuth("/portal-manutencao/equipments/maintenance-status");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        state.all = enrichEquipments(await response.json());

        populateSectorOptions();

        const now = new Date();
        elements.lastUpdatedLabel.textContent = `Atualizado às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
        state.error = true;
        elements.lastUpdatedLabel.textContent = "Falha ao atualizar";
        console.log(error);
    } finally {
        state.loading = false;
        elements.refreshButton.classList.remove("is-loading");
        elements.refreshButton.disabled = false;
        render();
    }
}

// preenche o select de setor com os valores distintos vindos dos equipamentos carregados
function populateSectorOptions() {
    const sectors = [...new Set(state.all.map(equipment => equipment.sector).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));

    elements.sectorSelect.innerHTML = `<option value="">Todos os setores</option>` +
        sectors.map(sector => `<option value="${escapeHTML(sector)}">${escapeHTML(sector)}</option>`).join("");

    if (!sectors.includes(state.filters.sector)) {
        state.filters.sector = "";
    }
    elements.sectorSelect.value = state.filters.sector;
}

// ===================== Filtro e ordenação =====================

function hasActiveFilters() {
    const { name, sector, status, from, to } = state.filters;
    return Boolean(name || sector || status || from || to);
}

function getFilteredEquipments() {
    const { name, sector, status, from, to } = state.filters;
    const nameQuery = name.trim().toLowerCase();

    return state.all.filter(equipment => {
        if (nameQuery && !(equipment.name || "").toLowerCase().includes(nameQuery)) return false;
        if (sector && equipment.sector !== sector) return false;
        if (status && equipment._status.key !== status) return false;
        if (from && !(equipment._next && equipment._next >= from)) return false;
        if (to && !(equipment._next && equipment._next <= to)) return false;
        return true;
    });
}

function compareText(a, b) {
    return (a || "").localeCompare(b || "", "pt-BR", { sensitivity: "base" });
}

// datas vazias ficam sempre no fim, independente da direção
function compareDates(a, b, direction) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return (a - b) * direction;
}

function sortEquipments(equipments) {
    const { key, dir } = state.sort;
    const direction = dir === "asc" ? 1 : -1;

    return [...equipments].sort((a, b) => {
        let result = 0;

        switch (key) {
            case "name":
                result = compareText(a.name, b.name) * direction;
                break;
            case "sector":
                result = compareText(a.sector, b.sector) * direction || compareText(a.name, b.name);
                break;
            case "maintenance_date":
                result = compareDates(a._last, b._last, direction);
                break;
            case "next_maintenance_date":
                result = compareDates(a._next, b._next, direction);
                break;
            case "status":
                // mais grave primeiro; dentro do mesmo status, o mais atrasado/próximo primeiro
                result = (STATUS_ORDER.indexOf(a._status.key) - STATUS_ORDER.indexOf(b._status.key)) * direction
                    || compareDates(a._next, b._next, 1);
                break;
        }

        return result || compareText(a.name, b.name);
    });
}

// ===================== Renderização =====================

function render() {
    renderStatusOverview();
    renderFilterControls();

    const filtered = sortEquipments(getFilteredEquipments());
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);

    const start = (state.page - 1) * state.pageSize;
    const pageItems = filtered.slice(start, start + state.pageSize);

    renderTable(pageItems, filtered.length);
    renderPagination(filtered.length, start, pageItems.length, totalPages);
    renderSortHeaders();
}

// cards de status + barra de distribuição; sempre usam a lista completa (panorama geral, não o resultado dos filtros)
function renderStatusOverview() {
    const counts = Object.fromEntries(STATUS_ORDER.map(key => [key, 0]));
    state.all.forEach(equipment => counts[equipment._status.key]++);

    const total = state.all.length;
    const selected = state.filters.status;

    elements.statusCards.forEach(card => {
        const key = card.dataset.statusFilter;
        const valueElement = card.querySelector("[data-count]");

        if (!state.loading) {
            valueElement.textContent = counts[key];
        }

        card.classList.toggle("is-zero", !state.loading && counts[key] === 0);
        card.setAttribute("aria-pressed", String(selected === key));
        card.setAttribute("aria-label", `${STATUS_LABELS[key]}: ${state.loading ? "carregando" : counts[key]} equipamentos. ${selected === key ? "Filtro ativo, clique para remover." : "Clique para filtrar."}`);
    });

    if (state.loading && total === 0) {
        elements.healthBar.innerHTML = `<span class="skeleton" style="width: 100%; height: 100%;"></span>`;
        elements.healthLegend.innerHTML = "";
        return;
    }

    elements.healthBar.classList.toggle("has-selection", Boolean(selected));
    elements.healthBar.innerHTML = STATUS_ORDER
        .filter(key => counts[key] > 0)
        .map(key => `<span class="health__segment status--${key} ${selected === key ? "is-selected" : ""}" style="flex: 0 0 ${(counts[key] / total) * 100}%" title="${STATUS_LABELS[key]}: ${counts[key]}"></span>`)
        .join("");

    elements.healthLegend.innerHTML = STATUS_ORDER
        .filter(key => counts[key] > 0)
        .map(key => `<li class="status--${key}">${STATUS_LABELS[key]} <strong>${Math.round((counts[key] / total) * 100)}%</strong></li>`)
        .join("");

    // conformidade: entre os equipamentos que já têm manutenção registrada, quantos não estão vencidos
    const withRecord = total - counts.primeira;
    const onTime = withRecord - counts.vencida - counts.vencida_critica;
    elements.healthScore.textContent = withRecord > 0 ? `${Math.round((onTime / withRecord) * 100)}%` : "–";
}

// sincroniza os controles de filtro com o estado e desenha os chips dos filtros ativos
function renderFilterControls() {
    const { name, sector, status, from, to } = state.filters;

    elements.searchField.classList.toggle("has-value", Boolean(name));
    elements.statusSelect.value = status;
    elements.sectorSelect.value = sector;
    elements.statusSelect.classList.toggle("has-value", Boolean(status));
    elements.sectorSelect.classList.toggle("has-value", Boolean(sector));

    const chips = [];
    if (name) chips.push({ key: "name", label: "Busca", value: `“${name.trim()}”` });
    if (sector) chips.push({ key: "sector", label: "Setor", value: sector });
    if (status) chips.push({ key: "status", label: "Status", value: STATUS_LABELS[status] });
    if (from) chips.push({ key: "from", label: "Vence a partir de", value: formatLocalDate(from) });
    if (to) chips.push({ key: "to", label: "Vence até", value: formatLocalDate(to) });

    elements.activeFilters.innerHTML = chips.map(chip => `
        <span class="filter-chip">
            <span class="filter-chip__label">${chip.label}:</span> ${escapeHTML(chip.value)}
            <button type="button" data-remove-filter="${chip.key}" aria-label="Remover filtro ${chip.label}">
                <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </span>
    `).join("") + (chips.length ? `<button type="button" class="btn btn-link btn-sm" data-clear-filters>Limpar filtros</button>` : "");
}

function formatLocalDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
}

function renderSkeletonRows() {
    elements.tbody.innerHTML = Array.from({ length: 6 }, () => `
        <tr class="is-state-row skeleton-row">
            <td><span class="skeleton" style="width: 60%; margin-bottom: 6px;"></span><span class="skeleton" style="width: 35%; height: 10px;"></span></td>
            <td><span class="skeleton" style="width: 70%;"></span></td>
            <td><span class="skeleton" style="width: 60%;"></span></td>
            <td><span class="skeleton" style="width: 60%;"></span></td>
            <td><span class="skeleton" style="width: 70px; height: 22px; border-radius: 999px;"></span></td>
            <td><span class="skeleton" style="width: 110px; height: 32px; margin-left: auto;"></span></td>
        </tr>
    `).join("");
}

function renderStateRow({ icon, title, text, action = "", isError = false }) {
    elements.tbody.innerHTML = `
        <tr class="is-state-row">
            <td colspan="${TABLE_COLUMNS}">
                <div class="table-state ${isError ? "table-state--error" : ""}">
                    <span class="table-state__icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
                    </span>
                    <span class="table-state__title">${title}</span>
                    <span class="table-state__text">${text}</span>
                    ${action}
                </div>
            </td>
        </tr>
    `;
}

function renderTable(pageItems, filteredCount) {
    if (state.loading && state.all.length === 0) {
        renderSkeletonRows();
        return;
    }

    if (state.error && state.all.length === 0) {
        renderStateRow({
            isError: true,
            icon: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
            title: "Não foi possível carregar os equipamentos",
            text: "Verifique sua conexão e tente novamente.",
            action: `<button type="button" class="btn btn-secondary btn-sm" data-retry>Tentar novamente</button>`,
        });
        return;
    }

    if (filteredCount === 0) {
        if (hasActiveFilters()) {
            renderStateRow({
                icon: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
                title: "Nenhum equipamento encontrado",
                text: "Nenhum equipamento corresponde aos filtros aplicados. Ajuste ou limpe os filtros para ver mais resultados.",
                action: `<button type="button" class="btn btn-secondary btn-sm" data-clear-filters>Limpar filtros</button>`,
            });
        } else {
            renderStateRow({
                icon: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>`,
                title: "Nenhum equipamento cadastrado",
                text: "Cadastre equipamentos na página de Equipamentos para acompanhar as manutenções aqui.",
            });
        }
        return;
    }

    elements.tbody.innerHTML = pageItems.map(equipment => {
        const status = equipment._status;
        const name = escapeHTML(equipment.name);
        const lastDate = formatDateToInput(equipment.maintenance_date);
        const nextDate = formatDateToInput(equipment.next_maintenance_date);
        const interval = formatIntervalMonths(equipment.maintenance_interval_months);

        return `
            <tr class="maintenance-row status--${status.key}" data-id="${escapeHTML(equipment.id)}">
                <td class="cell-equipment">
                    <div class="equip-cell">
                        <span class="equip-cell__name">${name}</span>
                        ${interval ? `<span class="equip-cell__meta">Preventiva ${interval}</span>` : ""}
                    </div>
                </td>
                <td data-label="Setor"><span class="sector-tag">${escapeHTML(equipment.sector) || "–"}</span></td>
                <td data-label="Última manutenção">
                    ${lastDate
                        ? `<div class="date-cell"><span class="date-cell__value">${lastDate}</span></div>`
                        : `<span class="cell-empty">Nunca realizada</span>`}
                </td>
                <td data-label="Próxima manutenção">
                    ${nextDate
                        ? `<div class="date-cell"><span class="date-cell__value">${nextDate}</span><span class="date-cell__relative">${formatRelativeDays(status.diffInDays)}</span></div>`
                        : `<span class="cell-empty">–</span>`}
                </td>
                <td data-label="Status">
                    <span class="maintenance-status status--${status.key}">${status.label}</span>
                </td>
                <td class="cell-actions-mobile">
                    <div class="row-actions">
                        <button type="button" class="btn btn-primary btn-sm" data-action="register" aria-label="Registrar manutenção de ${name}">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Registrar
                        </button>
                        <button type="button" class="icon-btn icon-btn--bordered icon-btn--history" data-action="history" aria-label="Histórico de manutenções de ${name}" title="Histórico de Manutenções">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
                                <polyline points="3 3 3 8 8 8"/>
                                <polyline points="12 7 12 12 15 15"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function renderPagination(filteredCount, start, pageCount, totalPages) {
    const total = state.all.length;

    if (state.loading && total === 0) {
        elements.resultsLabel.textContent = "Carregando equipamentos…";
        elements.resultsCount.textContent = "–";
    } else {
        elements.resultsLabel.innerHTML = hasActiveFilters()
            ? `<strong>${filteredCount}</strong> de ${total} equipamentos`
            : `<strong>${total}</strong> equipamentos`;

        elements.resultsCount.textContent = filteredCount
            ? `Mostrando ${start + 1}–${start + pageCount} de ${filteredCount}`
            : "Nenhum resultado";
    }

    elements.pageLabel.textContent = `${state.page} de ${totalPages}`;
    elements.prevPageButton.disabled = state.page <= 1;
    elements.nextPageButton.disabled = state.page >= totalPages;
}

function renderSortHeaders() {
    document.querySelectorAll(".maintenance-table .th-sort").forEach(button => {
        const th = button.closest("th");
        const isActive = button.dataset.sortKey === state.sort.key;
        th.setAttribute("aria-sort", isActive ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none");
    });
}

// ===================== Ações =====================

function updateFilters(changes) {
    Object.assign(state.filters, changes);
    state.page = 1;
    render();
}

function clearAllFilters() {
    elements.searchInput.value = "";
    if (fromPicker) fromPicker.clear(false);
    if (toPicker) toPicker.clear(false);
    if (fromPicker) fromPicker.set("maxDate", null);
    if (toPicker) toPicker.set("minDate", null);

    updateFilters({ name: "", sector: "", status: "", from: null, to: null });
}

function removeFilter(key) {
    switch (key) {
        case "name":
            elements.searchInput.value = "";
            updateFilters({ name: "" });
            break;
        case "from":
            if (fromPicker) fromPicker.clear(false);
            if (toPicker) toPicker.set("minDate", null);
            updateFilters({ from: null });
            break;
        case "to":
            if (toPicker) toPicker.clear(false);
            if (fromPicker) fromPicker.set("maxDate", null);
            updateFilters({ to: null });
            break;
        default:
            updateFilters({ [key]: "" });
    }
}

function findEquipment(id) {
    return state.all.find(equipment => String(equipment.id) === String(id));
}

// inicializa o flatpickr nos campos de vencimento (exibe dd/mm/aaaa) e trava a faixa para impedir "de" > "até"
function initDueDateFilterPickers() {
    if (typeof flatpickr === "undefined") {
        return;
    }

    const pickerOptions = {
        wrap: true,
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        locale: "pt",
    };

    fromPicker = flatpickr(document.getElementById("filterDueDateFromWrap"), {
        ...pickerOptions,
        onChange: (selectedDates) => {
            toPicker.set("minDate", selectedDates[0] || null);
            updateFilters({ from: selectedDates[0] || null });
        },
    });

    toPicker = flatpickr(document.getElementById("filterDueDateToWrap"), {
        ...pickerOptions,
        onChange: (selectedDates) => {
            fromPicker.set("maxDate", selectedDates[0] || null);
            updateFilters({ to: selectedDates[0] || null });
        },
    });
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function bindEvents() {
    // cards: clicar alterna o filtro de status (clicar de novo no card ativo remove o filtro)
    elements.statusCards.forEach(card => {
        card.addEventListener("click", () => {
            const key = card.dataset.statusFilter;
            updateFilters({ status: state.filters.status === key ? "" : key });
        });
    });

    const applySearch = debounce(() => updateFilters({ name: elements.searchInput.value }), 150);
    elements.searchInput.addEventListener("input", () => {
        elements.searchField.classList.toggle("has-value", Boolean(elements.searchInput.value));
        applySearch();
    });

    document.getElementById("clearSearchButton").addEventListener("click", () => {
        elements.searchInput.value = "";
        updateFilters({ name: "" });
        elements.searchInput.focus();
    });

    elements.sectorSelect.addEventListener("change", () => updateFilters({ sector: elements.sectorSelect.value }));
    elements.statusSelect.addEventListener("change", () => updateFilters({ status: elements.statusSelect.value }));

    // chips e botões "Limpar filtros" (tanto na barra quanto no estado vazio da tabela)
    document.addEventListener("click", (e) => {
        const removeButton = e.target.closest("[data-remove-filter]");
        if (removeButton) {
            removeFilter(removeButton.dataset.removeFilter);
            return;
        }

        if (e.target.closest("[data-clear-filters]")) {
            clearAllFilters();
            return;
        }

        if (e.target.closest("[data-retry]")) {
            loadEquipments();
        }
    });

    // ordenação: clicar na mesma coluna inverte a direção
    document.querySelectorAll(".maintenance-table .th-sort").forEach(button => {
        button.addEventListener("click", () => {
            const key = button.dataset.sortKey;
            state.sort = state.sort.key === key
                ? { key, dir: state.sort.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" };
            render();
        });
    });

    elements.pageSizeSelect.addEventListener("change", () => {
        state.pageSize = Number(elements.pageSizeSelect.value);
        state.page = 1;
        render();
    });

    elements.prevPageButton.addEventListener("click", () => {
        state.page--;
        render();
    });

    elements.nextPageButton.addEventListener("click", () => {
        state.page++;
        render();
    });

    // ações das linhas via delegação: um único listener para a tabela inteira, mesmo após re-renderizar
    elements.tbody.addEventListener("click", (e) => {
        const actionButton = e.target.closest("[data-action]");
        if (!actionButton) {
            return;
        }

        const equipment = findEquipment(actionButton.closest("tr").dataset.id);
        if (!equipment) {
            return;
        }

        if (actionButton.dataset.action === "register") {
            openMaintenanceModal(equipment);
        } else if (actionButton.dataset.action === "history") {
            openMaintenanceHistoryModal(equipment);
        }
    });

    elements.refreshButton.addEventListener("click", loadEquipments);

    // atalho "/" foca a busca (quando o usuário não está digitando em outro campo nem com modal aberto)
    document.addEventListener("keydown", (e) => {
        if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const target = e.target;
        const isTyping = target.closest("input, textarea, select, [contenteditable='true']");
        if (isTyping || document.body.classList.contains("has-modal-open")) {
            return;
        }

        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
    });
}

// filtros iniciais vindos da URL (ex.: links do dashboard: ?status=vencida_critica ou ?busca=Nome)
function applyFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const search = params.get("busca");

    if (status && STATUS_ORDER.includes(status)) {
        state.filters.status = status;
    }

    if (search) {
        state.filters.name = search;
        elements.searchInput.value = search;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    elements.pageSizeSelect.value = String(state.pageSize);
    applyFiltersFromURL();

    closeModalMaintenanceEquipment();
    submitFormCreateMaintenance(loadEquipments);
    closeModalMaintenanceHistory();

    initDueDateFilterPickers();
    bindEvents();

    loadEquipments();
});
