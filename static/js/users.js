import { initUserFormModal, openUserModal, loadUserFormOptions, roleLabel } from "./modalsUsers/userFormModal.js";
import { closeModalDeleteUser, deleteUser, openDeleteUserModal } from "./modalsUsers/deleteUser.js";
import { escapeHTML } from "./utils/maintenanceStatus.js";

const TABLE_COLUMNS = 7;

const STATUS_LABELS = { active: "Ativos", inactive: "Inativos" };

// estado único da página: resumo, filtros, chips e tabela são renderizados a partir dele
const state = {
    all: [],
    loading: true,
    error: false,
    currentUserId: null,
    filters: { name: "", role: "", status: "", sector: "" },
    sort: { key: "name", dir: "asc" },
};

const elements = {
    tbody: document.getElementById("userTbody"),
    searchField: document.getElementById("searchField"),
    searchInput: document.getElementById("searchUserInput"),
    roleSelect: document.getElementById("filterRole"),
    statusSelect: document.getElementById("filterStatus"),
    sectorSelect: document.getElementById("filterSector"),
    activeFilters: document.getElementById("activeFilters"),
    resultsLabel: document.getElementById("resultsLabel"),
    resultsCount: document.getElementById("resultsCountLabel"),
    statCards: document.querySelectorAll("[data-stat-filter]"),
    newUserButton: document.getElementById("newUserButton"),
};

// ===================== Helpers =====================

function getInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function compareText(a, b) {
    return (a || "").localeCompare(b || "", "pt-BR", { sensitivity: "base" });
}

function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort(compareText);
}

// ===================== Dados =====================

async function loadUsers() {
    state.loading = true;
    state.error = false;
    render();

    try {
        const response = await fetchWithAuth("/portal-manutencao/users");

        if (response.status === 403) {
            showRestricted();
            return;
        }

        if (!response.ok) {
            throw new Error(await response.text());
        }

        state.all = await response.json();
        populateFilterOptions();
    } catch (error) {
        state.error = true;
        console.log(error);
    } finally {
        state.loading = false;
        render();
    }
}

function populateFilterOptions() {
    const fill = (select, placeholder, values, labelFn = value => value) => {
        const previous = select.value;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        values.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = labelFn(value);
            select.appendChild(option);
        });
        select.value = values.includes(previous) ? previous : "";
    };

    fill(elements.roleSelect, "Todos os cargos", uniqueSorted(state.all.map(user => user.role)), roleLabel);
    fill(elements.sectorSelect, "Todos os setores", uniqueSorted(state.all.map(user => user.sector)));
}

// ===================== Filtro e ordenação =====================

function hasActiveFilters() {
    return Object.values(state.filters).some(Boolean);
}

function getFilteredUsers() {
    const { name, role, status, sector } = state.filters;
    const query = name.trim().toLowerCase();

    return state.all.filter(user => {
        if (query && ![user.name, user.username, user.email].some(value => (value || "").toLowerCase().includes(query))) return false;
        if (role && user.role !== role) return false;
        if (sector && user.sector !== sector) return false;
        if (status === "active" && !user.is_active) return false;
        if (status === "inactive" && user.is_active) return false;
        return true;
    });
}

function sortUsers(users) {
    const { key, dir } = state.sort;
    const direction = dir === "asc" ? 1 : -1;

    return [...users].sort((a, b) => {
        let result = 0;

        switch (key) {
            case "name": result = compareText(a.name, b.name); break;
            case "role": result = compareText(roleLabel(a.role), roleLabel(b.role)); break;
            case "sector": result = compareText(a.sector, b.sector); break;
            case "status": result = Number(b.is_active) - Number(a.is_active); break;
        }

        return result * direction || compareText(a.name, b.name);
    });
}

// ===================== Renderização =====================

function render() {
    renderStats();
    renderFilterControls();

    const filtered = sortUsers(getFilteredUsers());
    renderTable(filtered);
    renderCounts(filtered.length);
    renderSortHeaders();
}

function renderStats() {
    if (state.loading && state.all.length === 0) return;

    const counts = {
        total: state.all.length,
        active: state.all.filter(user => user.is_active).length,
        inactive: state.all.filter(user => !user.is_active).length,
        admin: state.all.filter(user => user.role === "administrator").length,
    };

    Object.entries(counts).forEach(([key, value]) => {
        document.querySelector(`[data-count="${key}"]`).textContent = value;
    });

    const { status, role } = state.filters;
    const pressed = {
        all: !status && !role,
        active: status === "active",
        inactive: status === "inactive",
        admin: role === "administrator",
    };

    elements.statCards.forEach(card => {
        card.setAttribute("aria-pressed", String(pressed[card.dataset.statFilter]));
    });
}

function renderFilterControls() {
    const { name, role, status, sector } = state.filters;

    elements.searchField.classList.toggle("has-value", Boolean(name));
    elements.roleSelect.value = role;
    elements.statusSelect.value = status;
    elements.sectorSelect.value = sector;
    [elements.roleSelect, elements.statusSelect, elements.sectorSelect].forEach(select => {
        select.classList.toggle("has-value", Boolean(select.value));
    });

    const chips = [];
    if (name) chips.push({ key: "name", label: "Busca", value: `“${name.trim()}”` });
    if (role) chips.push({ key: "role", label: "Cargo", value: roleLabel(role) });
    if (status) chips.push({ key: "status", label: "Status", value: STATUS_LABELS[status] });
    if (sector) chips.push({ key: "sector", label: "Setor", value: sector });

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

const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

function userRowHTML(user) {
    const isSelf = user.id === state.currentUserId;
    const isAdmin = user.role === "administrator";
    const name = escapeHTML(user.name);

    return `
        <tr class="user-row${user.is_active ? "" : " is-inactive"}" data-id="${escapeHTML(user.id)}">
            <td class="cell-user">
                <div class="user-cell">
                    <span class="user-avatar${user.is_active ? "" : " user-avatar--inactive"}" aria-hidden="true">${escapeHTML(getInitials(user.name))}</span>
                    <span class="user-cell__info">
                        <span class="user-cell__name">${name}${isSelf ? ` <span class="badge-you">Você</span>` : ""}</span>
                        <span class="user-cell__username">@${escapeHTML(user.username)}</span>
                    </span>
                </div>
            </td>
            <td data-label="E-mail">${user.email ? escapeHTML(user.email) : `<span class="cell-muted">Não informado</span>`}</td>
            <td data-label="Cargo"><span class="role-badge${isAdmin ? " role-badge--admin" : ""}">${isAdmin ? ICON_SHIELD : ""}${escapeHTML(roleLabel(user.role))}</span></td>
            <td data-label="Setor">${user.sector ? escapeHTML(user.sector) : `<span class="cell-muted">–</span>`}</td>
            <td data-label="Grupo">${user.maintenance_group ? escapeHTML(user.maintenance_group) : `<span class="cell-muted">–</span>`}</td>
            <td data-label="Status"><span class="user-status user-status--${user.is_active ? "active" : "inactive"}">${user.is_active ? "Ativo" : "Inativo"}</span></td>
            <td class="cell-actions-mobile">
                <div class="row-actions">
                    <button type="button" class="icon-btn icon-btn--edit" data-action="edit" aria-label="Editar ${name}" title="Editar usuário">${ICON_EDIT}</button>
                    <button type="button" class="icon-btn icon-btn--danger" data-action="delete"
                        ${isSelf ? `disabled aria-label="Você não pode excluir o seu próprio usuário" title="Você não pode excluir o seu próprio usuário"` : `aria-label="Excluir ${name}" title="Excluir usuário"`}>${ICON_DELETE}</button>
                </div>
            </td>
        </tr>
    `;
}

function renderTable(users) {
    if (state.loading && state.all.length === 0) {
        elements.tbody.innerHTML = Array.from({ length: 5 }, () => `
            <tr class="is-state-row skeleton-row">
                <td><div class="user-cell"><span class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></span><span style="flex: 1;"><span class="skeleton" style="width: 60%; margin-bottom: 6px;"></span><span class="skeleton" style="width: 35%; height: 10px;"></span></span></div></td>
                <td><span class="skeleton" style="width: 80%;"></span></td>
                <td><span class="skeleton" style="width: 90px; height: 22px; border-radius: 999px;"></span></td>
                <td><span class="skeleton" style="width: 60%;"></span></td>
                <td><span class="skeleton" style="width: 60%;"></span></td>
                <td><span class="skeleton" style="width: 60px; height: 22px; border-radius: 999px;"></span></td>
                <td><span class="skeleton" style="width: 64px; height: 28px; margin-left: auto;"></span></td>
            </tr>
        `).join("");
        return;
    }

    if (state.error && state.all.length === 0) {
        renderStateRow({
            isError: true,
            icon: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
            title: "Não foi possível carregar os usuários",
            text: "Verifique sua conexão e tente novamente.",
            action: `<button type="button" class="btn btn-secondary btn-sm" data-retry>Tentar novamente</button>`,
        });
        return;
    }

    if (users.length === 0) {
        if (hasActiveFilters()) {
            renderStateRow({
                icon: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
                title: "Nenhum usuário encontrado",
                text: "Nenhum usuário corresponde aos filtros aplicados.",
                action: `<button type="button" class="btn btn-secondary btn-sm" data-clear-filters>Limpar filtros</button>`,
            });
        } else {
            renderStateRow({
                icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`,
                title: "Nenhum usuário cadastrado",
                text: "Cadastre o primeiro usuário para conceder acesso ao sistema.",
                action: `<button type="button" class="btn btn-primary btn-sm" data-new-user>Novo usuário</button>`,
            });
        }
        return;
    }

    elements.tbody.innerHTML = users.map(userRowHTML).join("");
}

function renderCounts(filteredCount) {
    const total = state.all.length;

    if (state.loading && total === 0) {
        elements.resultsLabel.textContent = "Carregando usuários…";
        elements.resultsCount.textContent = "–";
        return;
    }

    elements.resultsLabel.innerHTML = hasActiveFilters()
        ? `<strong>${filteredCount}</strong> de ${total} usuários`
        : `<strong>${total}</strong> ${total === 1 ? "usuário" : "usuários"}`;
    elements.resultsCount.textContent = `${filteredCount} ${filteredCount === 1 ? "usuário exibido" : "usuários exibidos"}`;
}

function renderSortHeaders() {
    document.querySelectorAll(".users-table .th-sort").forEach(button => {
        const isActive = button.dataset.sortKey === state.sort.key;
        button.closest("th").setAttribute("aria-sort", isActive ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none");
    });
}

// ===================== Ações =====================

function updateFilters(changes) {
    Object.assign(state.filters, changes);
    render();
}

function clearAllFilters() {
    elements.searchInput.value = "";
    updateFilters({ name: "", role: "", status: "", sector: "" });
}

function findUser(id) {
    return state.all.find(user => String(user.id) === String(id));
}

function showRestricted() {
    document.getElementById("restrictedState").hidden = false;
    document.getElementById("usersContent").hidden = true;
    elements.newUserButton.hidden = true;
}

function bindEvents() {
    // cards do resumo funcionam como atalhos de filtro (clicar de novo remove)
    elements.statCards.forEach(card => {
        card.addEventListener("click", () => {
            const key = card.dataset.statFilter;
            const { status, role } = state.filters;

            if (key === "all") updateFilters({ status: "", role: "" });
            if (key === "active") updateFilters({ status: status === "active" ? "" : "active" });
            if (key === "inactive") updateFilters({ status: status === "inactive" ? "" : "inactive" });
            if (key === "admin") updateFilters({ role: role === "administrator" ? "" : "administrator" });
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

    elements.roleSelect.addEventListener("change", () => updateFilters({ role: elements.roleSelect.value }));
    elements.statusSelect.addEventListener("change", () => updateFilters({ status: elements.statusSelect.value }));
    elements.sectorSelect.addEventListener("change", () => updateFilters({ sector: elements.sectorSelect.value }));

    document.addEventListener("click", (e) => {
        const removeButton = e.target.closest("[data-remove-filter]");
        if (removeButton) {
            const key = removeButton.dataset.removeFilter;
            if (key === "name") elements.searchInput.value = "";
            updateFilters({ [key]: "" });
            return;
        }

        if (e.target.closest("[data-clear-filters]")) clearAllFilters();
        if (e.target.closest("[data-retry]")) loadUsers();
        if (e.target.closest("[data-new-user]")) openUserModal({ mode: "create" });
    });

    document.querySelectorAll(".users-table .th-sort").forEach(button => {
        button.addEventListener("click", () => {
            const key = button.dataset.sortKey;
            state.sort = state.sort.key === key
                ? { key, dir: state.sort.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" };
            render();
        });
    });

    // ações das linhas via delegação (um listener para a tabela inteira)
    elements.tbody.addEventListener("click", (e) => {
        const button = e.target.closest("[data-action]");
        if (!button || button.disabled) return;

        const user = findUser(button.closest("tr").dataset.id);
        if (!user) return;

        if (button.dataset.action === "edit") {
            openUserModal({ mode: "edit", user });
        } else if (button.dataset.action === "delete") {
            openDeleteUserModal(user, { initials: getInitials(user.name), role: roleLabel(user.role) });
        }
    });

    elements.newUserButton.addEventListener("click", () => openUserModal({ mode: "create" }));

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

async function init() {
    bindEvents();
    initUserFormModal({ onSuccess: loadUsers });
    closeModalDeleteUser();
    deleteUser(loadUsers);

    // só administradores gerenciam usuários (o backend também bloqueia as rotas)
    const loggedUser = await getLoggedUser();
    if (!loggedUser) return;

    if (loggedUser.role !== "administrator") {
        showRestricted();
        return;
    }

    state.currentUserId = loggedUser.id;
    elements.newUserButton.disabled = false;

    loadUserFormOptions();
    loadUsers();
}

init();
