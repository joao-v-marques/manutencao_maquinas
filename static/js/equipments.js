import { initEquipmentFormModal, openEquipmentModal, loadEquipmentFormOptions, setKnownTypes } from "./modalsEquipments/equipmentFormModal.js";
import { closeModalDeleteEquipment, deleteEquipment, openDeleteEquipmentModal } from "./modalsEquipments/deleteEquipment.js";
import { initEquipmentDrawer, openEquipmentDrawer } from "./modalsEquipments/equipmentDetailsDrawer.js";
import { closeModalMaintenanceEquipment, openMaintenanceModal, submitFormCreateMaintenance } from "./modalsEquipments/maintenanceEquipment.js";
import { closeModalMaintenanceHistory, openMaintenanceHistoryModal } from "./modalsEquipments/maintenanceHistoryModal.js";
import {
    parseDateOnly,
    formatDateToInput,
    classifyMaintenanceStatusDetailed,
    formatRelativeDays,
    escapeHTML,
    MAINTENANCE_WINDOW_DAYS,
} from "./utils/maintenanceStatus.js";
import { operationalStatusTone } from "./utils/equipmentStatus.js";

const BASE_PATH = "/portal-manutencao";
const TABLE_COLUMNS = 5;

// cards do resumo filtram pela situação da manutenção preventiva
const MAINTENANCE_GROUPS = {
    ok: { label: "Manutenção em dia", keys: ["emdia", "proxima", "hoje"] },
    overdue: { label: "Manutenção vencida", keys: ["vencida", "vencida_critica"] },
    none: { label: "Sem manutenção registrada", keys: ["primeira"] },
};

const state = {
    all: [],
    loading: true,
    error: false,
    filters: { name: "", sector: "", type: "", status: "", maintenance: "" },
    sort: { key: "name", dir: "asc" },
    page: 1,
    pageSize: 25,
};

const elements = {
    tbody: document.getElementById("equipmentTbody"),
    searchField: document.getElementById("searchField"),
    searchInput: document.getElementById("searchNameInput"),
    sectorSelect: document.getElementById("filterSector"),
    typeSelect: document.getElementById("filterType"),
    statusSelect: document.getElementById("filterStatus"),
    activeFilters: document.getElementById("activeFilters"),
    resultsLabel: document.getElementById("resultsLabel"),
    resultsCount: document.getElementById("resultsCountLabel"),
    statCards: document.querySelectorAll("[data-stat-filter]"),
    pageSizeSelect: document.getElementById("pageSizeSelect"),
    prevPageButton: document.getElementById("prevPageButton"),
    nextPageButton: document.getElementById("nextPageButton"),
    pageLabel: document.getElementById("pageLabel"),
    menu: document.getElementById("rowActionMenu"),
    exportButton: document.getElementById("exportButton"),
};

// ===================== Helpers =====================

function compareText(a, b) {
    return (a || "").localeCompare(b || "", "pt-BR", { sensitivity: "base" });
}

function compareDates(a, b, direction) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return (a - b) * direction;
}

function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort(compareText);
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// ===================== Dados =====================

async function fetchJson(url) {
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

// junta o cadastro (/equipments) com a situação da manutenção (/equipments/maintenance-status) pelo id
async function loadEquipments() {
    state.loading = true;
    state.error = false;
    render();

    try {
        const [equipments, maintenanceStatus] = await Promise.all([
            fetchJson(`${BASE_PATH}/equipments`),
            fetchJson(`${BASE_PATH}/equipments/maintenance-status`),
        ]);

        const statusById = new Map(maintenanceStatus.map(item => [item.id, item]));
        const today = parseDateOnly(new Date().toISOString());

        state.all = equipments.map(equipment => {
            const maintenance = statusById.get(equipment.id) || {};
            return {
                ...equipment,
                // a versão antiga da página gravava o texto "NÃO CADASTRADO" no modelo ao salvar a edição; tratamos como vazio
                model: /^n[aã]o cadastrado$/i.test((equipment.model || "").trim()) ? "" : equipment.model,
                _lastMaintenance: maintenance.maintenance_date || null,
                _nextMaintenance: maintenance.next_maintenance_date || null,
                _next: parseDateOnly(maintenance.next_maintenance_date),
                _maintenance: classifyMaintenanceStatusDetailed(maintenance.next_maintenance_date, today, MAINTENANCE_WINDOW_DAYS),
            };
        });

        populateFilterOptions();
        setKnownTypes(uniqueSorted(state.all.map(equipment => equipment.type)));
    } catch (error) {
        state.error = true;
        console.log(error);
    } finally {
        state.loading = false;
        render();
    }
}

function populateFilterOptions() {
    const fill = (select, placeholder, values, key) => {
        select.innerHTML = `<option value="">${placeholder}</option>`;
        values.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        if (!values.includes(state.filters[key])) state.filters[key] = "";
        select.value = state.filters[key];
    };

    fill(elements.sectorSelect, "Todos os setores", uniqueSorted(state.all.map(e => e.sector)), "sector");
    fill(elements.typeSelect, "Todos os tipos", uniqueSorted(state.all.map(e => e.type)), "type");
    fill(elements.statusSelect, "Todos os status", uniqueSorted(state.all.map(e => e.status)), "status");
}

// ===================== Filtro e ordenação =====================

function hasActiveFilters() {
    return Object.values(state.filters).some(Boolean);
}

function getFilteredEquipments() {
    const { name, sector, type, status, maintenance } = state.filters;
    const query = name.trim().toLowerCase();

    return state.all.filter(equipment => {
        if (query && ![equipment.name, equipment.brand, equipment.model, equipment.ip, equipment.serial_number]
            .some(value => (value || "").toLowerCase().includes(query))) return false;
        if (sector && equipment.sector !== sector) return false;
        if (type && equipment.type !== type) return false;
        if (status && equipment.status !== status) return false;
        if (maintenance && !MAINTENANCE_GROUPS[maintenance].keys.includes(equipment._maintenance.key)) return false;
        return true;
    });
}

function sortEquipments(equipments) {
    const { key, dir } = state.sort;
    const direction = dir === "asc" ? 1 : -1;

    return [...equipments].sort((a, b) => {
        let result = 0;

        switch (key) {
            case "name": result = compareText(a.name, b.name) * direction; break;
            case "sector": result = compareText(a.sector, b.sector) * direction; break;
            case "status": result = compareText(a.status, b.status) * direction; break;
            case "next": result = compareDates(a._next, b._next, direction); break;
        }

        return result || compareText(a.name, b.name);
    });
}

// ===================== Renderização =====================

function render() {
    renderStats();
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

function renderStats() {
    if (state.loading && state.all.length === 0) return;

    const count = group => state.all.filter(e => MAINTENANCE_GROUPS[group].keys.includes(e._maintenance.key)).length;
    const counts = { total: state.all.length, ok: count("ok"), overdue: count("overdue"), none: count("none") };

    Object.entries(counts).forEach(([key, value]) => {
        document.querySelector(`[data-count="${key}"]`).textContent = value;
    });

    elements.statCards.forEach(card => {
        const key = card.dataset.statFilter;
        const pressed = key === "all" ? !state.filters.maintenance : state.filters.maintenance === key;
        card.setAttribute("aria-pressed", String(pressed));
    });
}

function renderFilterControls() {
    const { name, sector, type, status, maintenance } = state.filters;

    elements.searchField.classList.toggle("has-value", Boolean(name));
    elements.sectorSelect.value = sector;
    elements.typeSelect.value = type;
    elements.statusSelect.value = status;
    [elements.sectorSelect, elements.typeSelect, elements.statusSelect].forEach(select => {
        select.classList.toggle("has-value", Boolean(select.value));
    });

    const chips = [];
    if (name) chips.push({ key: "name", label: "Busca", value: `“${name.trim()}”` });
    if (maintenance) chips.push({ key: "maintenance", label: "Manutenção", value: MAINTENANCE_GROUPS[maintenance].label });
    if (sector) chips.push({ key: "sector", label: "Setor", value: sector });
    if (type) chips.push({ key: "type", label: "Tipo", value: type });
    if (status) chips.push({ key: "status", label: "Status", value: status });

    elements.activeFilters.innerHTML = chips.map(chip => `
        <span class="filter-chip">
            <span class="filter-chip__label">${chip.label}:</span> ${escapeHTML(chip.value)}
            <button type="button" data-remove-filter="${chip.key}" aria-label="Remover filtro ${chip.label}">
                <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </span>
    `).join("") + (chips.length ? `<button type="button" class="btn btn-link btn-sm" data-clear-filters>Limpar filtros</button>` : "");
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

function equipmentRowHTML(equipment) {
    const name = escapeHTML(equipment.name);
    const maintenance = equipment._maintenance;
    const tone = operationalStatusTone(equipment.status);
    const nextDate = formatDateToInput(equipment._nextMaintenance);
    const specs = [equipment.brand, equipment.model].filter(Boolean).join(" ");
    const meta = [equipment.type, specs].filter(Boolean).map(escapeHTML).join(`<span class="dot-sep">·</span>`);

    return `
        <tr class="equipment-row" data-id="${escapeHTML(equipment.id)}">
            <td class="cell-equipment">
                <div class="cell-stack">
                    <button type="button" class="equip-name-btn" data-action="details" title="Ver detalhes">${name}</button>
                    <span class="cell-stack__sub equip-cell__meta">${meta || "–"}</span>
                </div>
            </td>
            <td data-label="Setor">
                <div class="cell-stack">
                    <span class="cell-stack__main">${escapeHTML(equipment.sector || "–")}</span>
                    ${equipment.location ? `<span class="cell-stack__sub">${escapeHTML(equipment.location)}</span>` : ""}
                </div>
            </td>
            <td data-label="Status">
                <span class="op-status${tone ? ` op-status--${tone}` : ""}">${escapeHTML(equipment.status || "Sem status")}</span>
            </td>
            <td data-label="Próxima manutenção">
                <div class="next-cell status--${maintenance.key}">
                    ${nextDate
                        ? `<div class="cell-stack"><span class="cell-stack__main">${nextDate}</span><span class="date-cell__relative">${formatRelativeDays(maintenance.diffInDays)}</span></div>`
                        : ""}
                    <span class="maintenance-status status--${maintenance.key}">${escapeHTML(maintenance.label)}</span>
                </div>
            </td>
            <td class="cell-actions-mobile">
                <div class="row-actions">
                    <button type="button" class="btn btn-primary btn-sm" data-action="register" aria-label="Registrar manutenção de ${name}">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Registrar
                    </button>
                    <button type="button" class="icon-btn icon-btn--bordered" data-action="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Mais ações para ${name}" title="Mais ações">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function renderTable(pageItems, filteredCount) {
    if (state.loading && state.all.length === 0) {
        elements.tbody.innerHTML = Array.from({ length: 6 }, () => `
            <tr class="is-state-row skeleton-row">
                <td><span class="skeleton" style="width: 55%; margin-bottom: 6px;"></span><span class="skeleton" style="width: 35%; height: 10px;"></span></td>
                <td><span class="skeleton" style="width: 60%;"></span></td>
                <td><span class="skeleton" style="width: 70px; height: 22px; border-radius: 999px;"></span></td>
                <td><span class="skeleton" style="width: 50%;"></span></td>
                <td><span class="skeleton" style="width: 130px; height: 32px; margin-left: auto;"></span></td>
            </tr>
        `).join("");
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
                text: "Nenhum equipamento corresponde aos filtros aplicados.",
                action: `<button type="button" class="btn btn-secondary btn-sm" data-clear-filters>Limpar filtros</button>`,
            });
        } else {
            renderStateRow({
                icon: `<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`,
                title: "Nenhum equipamento cadastrado",
                text: "Cadastre o primeiro equipamento para começar a acompanhar as manutenções.",
                action: `<button type="button" class="btn btn-primary btn-sm" data-new-equipment>Novo equipamento</button>`,
            });
        }
        return;
    }

    elements.tbody.innerHTML = pageItems.map(equipmentRowHTML).join("");
}

function renderPagination(filteredCount, start, pageCount, totalPages) {
    const total = state.all.length;

    if (state.loading && total === 0) {
        elements.resultsLabel.textContent = "Carregando equipamentos…";
        elements.resultsCount.textContent = "–";
    } else {
        elements.resultsLabel.innerHTML = hasActiveFilters()
            ? `<strong>${filteredCount}</strong> de ${total} equipamentos`
            : `<strong>${total}</strong> ${total === 1 ? "equipamento" : "equipamentos"}`;
        elements.resultsCount.textContent = filteredCount
            ? `Mostrando ${start + 1}–${start + pageCount} de ${filteredCount}`
            : "Nenhum resultado";
    }

    elements.pageLabel.textContent = `${state.page} de ${totalPages}`;
    elements.prevPageButton.disabled = state.page <= 1;
    elements.nextPageButton.disabled = state.page >= totalPages;
}

function renderSortHeaders() {
    document.querySelectorAll(".equipment-table .th-sort").forEach(button => {
        const isActive = button.dataset.sortKey === state.sort.key;
        button.closest("th").setAttribute("aria-sort", isActive ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none");
    });
}

// ===================== Menu de ações ("⋯") =====================

let menuState = { equipment: null, trigger: null };

function openActionMenu(trigger, equipment) {
    closeActionMenu();
    menuState = { equipment, trigger };

    const menu = elements.menu;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");

    // posiciona abaixo do botão, alinhado à direita; se não couber embaixo, abre para cima
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const top = rect.bottom + 6 + menuRect.height > window.innerHeight ? rect.top - menuRect.height - 6 : rect.bottom + 6;
    const left = Math.max(8, Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 8));

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.querySelector("[role=menuitem]").focus();
}

function closeActionMenu({ returnFocus = false } = {}) {
    if (elements.menu.hidden) return;

    elements.menu.hidden = true;
    menuState.trigger?.setAttribute("aria-expanded", "false");
    if (returnFocus) menuState.trigger?.focus();
}

function handleEquipmentAction(action, equipment) {
    switch (action) {
        case "details": openEquipmentDrawer(equipment); break;
        case "register": openMaintenanceModal(equipment); break;
        case "history": openMaintenanceHistoryModal(equipment); break;
        case "edit": openEquipmentModal({ mode: "edit", equipment }); break;
        case "delete": openDeleteEquipmentModal(equipment); break;
    }
}

// ===================== Exportação =====================

async function exportEquipmentsReport() {
    const button = elements.exportButton;
    button.disabled = true;
    button.classList.add("is-loading");

    try {
        const response = await fetchWithAuth(`${BASE_PATH}/reports/equipments`);

        if (!response.ok) {
            throw new Error("Houve um erro ao exportar o relatório de equipamentos.");
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition");
        const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] || "relatorio_equipamentos.xlsx";

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        notyf.success("Relatório exportado.");
    } catch (error) {
        notyf.error(error.message);
    } finally {
        button.disabled = false;
        button.classList.remove("is-loading");
    }
}

// ===================== Eventos =====================

function updateFilters(changes) {
    Object.assign(state.filters, changes);
    state.page = 1;
    render();
}

function clearAllFilters() {
    elements.searchInput.value = "";
    updateFilters({ name: "", sector: "", type: "", status: "", maintenance: "" });
}

function findEquipment(id) {
    return state.all.find(equipment => String(equipment.id) === String(id));
}

function bindEvents() {
    elements.statCards.forEach(card => {
        card.addEventListener("click", () => {
            const key = card.dataset.statFilter;
            updateFilters({ maintenance: key === "all" || state.filters.maintenance === key ? "" : key });
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
    elements.typeSelect.addEventListener("change", () => updateFilters({ type: elements.typeSelect.value }));
    elements.statusSelect.addEventListener("change", () => updateFilters({ status: elements.statusSelect.value }));

    document.addEventListener("click", (e) => {
        const removeButton = e.target.closest("[data-remove-filter]");
        if (removeButton) {
            const key = removeButton.dataset.removeFilter;
            if (key === "name") elements.searchInput.value = "";
            updateFilters({ [key]: "" });
            return;
        }

        if (e.target.closest("[data-clear-filters]")) clearAllFilters();
        if (e.target.closest("[data-retry]")) loadEquipments();
        if (e.target.closest("[data-new-equipment]")) openEquipmentModal({ mode: "create" });

        // clique fora do menu de ações fecha o menu
        if (!elements.menu.hidden && !e.target.closest("#rowActionMenu") && !e.target.closest("[data-action=menu]")) {
            closeActionMenu();
        }
    });

    document.querySelectorAll(".equipment-table .th-sort").forEach(button => {
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
    elements.prevPageButton.addEventListener("click", () => { state.page--; render(); });
    elements.nextPageButton.addEventListener("click", () => { state.page++; render(); });

    // ações das linhas via delegação
    elements.tbody.addEventListener("click", (e) => {
        const button = e.target.closest("[data-action]");
        if (!button) return;

        const equipment = findEquipment(button.closest("tr").dataset.id);
        if (!equipment) return;

        if (button.dataset.action === "menu") {
            if (!elements.menu.hidden && menuState.trigger === button) {
                closeActionMenu();
            } else {
                openActionMenu(button, equipment);
            }
            return;
        }

        handleEquipmentAction(button.dataset.action, equipment);
    });

    elements.menu.addEventListener("click", (e) => {
        const item = e.target.closest("[data-menu-action]");
        if (!item || !menuState.equipment) return;

        const { equipment } = menuState;
        closeActionMenu();
        handleEquipmentAction(item.dataset.menuAction, equipment);
    });

    // teclado no menu: setas navegam, Esc fecha e devolve o foco ao botão "⋯"
    elements.menu.addEventListener("keydown", (e) => {
        const items = [...elements.menu.querySelectorAll("[role=menuitem]")];
        const index = items.indexOf(document.activeElement);

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = e.key === "ArrowDown" ? index + 1 : index - 1;
            items[(next + items.length) % items.length].focus();
        } else if (e.key === "Escape") {
            e.stopPropagation();
            closeActionMenu({ returnFocus: true });
        } else if (e.key === "Tab") {
            closeActionMenu();
        }
    });

    // o menu é fixo na tela: ao rolar ou redimensionar ele fecharia desalinhado do botão
    window.addEventListener("scroll", () => closeActionMenu(), { passive: true, capture: true });
    window.addEventListener("resize", () => closeActionMenu());

    document.getElementById("openCreateModalButton").addEventListener("click", () => openEquipmentModal({ mode: "create" }));
    elements.exportButton.addEventListener("click", exportEquipmentsReport);

    // atalho "/" foca a busca
    document.addEventListener("keydown", (e) => {
        if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest("input, textarea, select, [contenteditable='true']") || document.body.classList.contains("has-modal-open")) return;

        e.preventDefault();
        elements.searchInput.focus();
        elements.searchInput.select();
    });
}

// ===================== Inicialização =====================

document.addEventListener("DOMContentLoaded", () => {
    elements.pageSizeSelect.value = String(state.pageSize);

    initEquipmentFormModal({ onSuccess: loadEquipments });
    initEquipmentDrawer({ onAction: handleEquipmentAction });
    closeModalDeleteEquipment();
    deleteEquipment(loadEquipments);

    // manutenção registrada a partir desta página também atualiza a coluna de próxima manutenção
    closeModalMaintenanceEquipment();
    submitFormCreateMaintenance(loadEquipments);
    closeModalMaintenanceHistory();

    bindEvents();
    loadEquipmentFormOptions();
    loadEquipments();
});
