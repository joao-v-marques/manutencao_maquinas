const state = {
  equipments: [],
  rows: [],
  selectedEquipmentId: null,
};

const elements = {
  tbody: document.getElementById("maintenanceTableBody"),
  resultsCount: document.getElementById("resultsCount"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  groupFilter: document.getElementById("groupFilter"),
  refreshButton: document.getElementById("refreshButton"),
  modal: document.getElementById("maintenanceModal"),
  form: document.getElementById("maintenanceForm"),
  closeModal: document.getElementById("closeModal"),
  cancelButton: document.getElementById("cancelButton"),
  equipmentId: document.getElementById("equipmentId"),
  equipmentName: document.getElementById("equipmentName"),
  maintenanceDate: document.getElementById("maintenanceDate"),
  nextMaintenanceDate: document.getElementById("nextMaintenanceDate"),
  description: document.getElementById("description"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  counters: {
    vencida: document.getElementById("lateCount"),
    hoje: document.getElementById("todayCount"),
    proxima: document.getElementById("nextCount"),
    emdia: document.getElementById("okCount"),
  },
};

const statusLabels = {
  vencida: "Vencida",
  hoje: "Hoje",
  proxima: "Próxima",
  emdia: "Em dia",
  primeira: "Primeira MP",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseDate(value) {
  if (!value) return null;
  const dateOnly = String(value).slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInputDate(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(date);
}

function addMonths(date, months) {
  const nextDate = new Date(date);
  const originalDay = nextDate.getDate();
  nextDate.setMonth(nextDate.getMonth() + months);

  if (nextDate.getDate() !== originalDay) {
    nextDate.setDate(0);
  }

  return nextDate;
}

function daysBetween(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((end - start) / msPerDay);
}

function getMaintenanceStatus(nextDate, lastDate) {
  if (!lastDate || !nextDate) {
    return "primeira";
  }

  const today = new Date();
  const days = daysBetween(today, nextDate);

  if (days < 0) return "vencida";
  if (days === 0) return "hoje";
  if (days <= 30) return "proxima";
  return "emdia";
}

function normalizeEquipment(equipment) {
  const lastMaintenanceDate = parseDate(equipment.last_maintenance_date || equipment.acquisition_date);
  const interval = Number(equipment.maintenance_interval_months) || 0;
  const nextMaintenanceDate = lastMaintenanceDate && interval > 0
    ? addMonths(lastMaintenanceDate, interval)
    : null;

  return {
    ...equipment,
    lastMaintenanceDate,
    nextMaintenanceDate,
    maintenanceStatus: getMaintenanceStatus(nextMaintenanceDate, lastMaintenanceDate),
  };
}

function updateCounters(rows) {
  const counters = {
    vencida: 0,
    hoje: 0,
    proxima: 0,
    emdia: 0,
  };

  rows.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(counters, row.maintenanceStatus)) {
      counters[row.maintenanceStatus] += 1;
    }
  });

  Object.entries(counters).forEach(([key, value]) => {
    if (elements.counters[key]) {
      elements.counters[key].textContent = value;
    }
  });
}

function populateGroupFilter(rows) {
  const currentValue = elements.groupFilter.value;
  const groups = [...new Set(rows.map((row) => row.maintenance_group).filter(Boolean))].sort();

  elements.groupFilter.innerHTML = '<option value="">Todos os grupos</option>';
  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    elements.groupFilter.appendChild(option);
  });

  if (groups.includes(currentValue)) {
    elements.groupFilter.value = currentValue;
  }
}

function getFilteredRows() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const group = elements.groupFilter.value;

  return state.rows.filter((row) => {
    const matchesSearch = !search || [
      row.name,
      row.sector,
      row.maintenance_group,
    ].some((value) => String(value || "").toLowerCase().includes(search));

    const matchesStatus = !status || row.maintenanceStatus === status;
    const matchesGroup = !group || row.maintenance_group === group;

    return matchesSearch && matchesStatus && matchesGroup;
  });
}

function renderTable() {
  const rows = getFilteredRows();
  elements.tbody.innerHTML = "";

  if (!rows.length) {
    elements.tbody.innerHTML = `
      <tr>
        <td class="maintenance-empty" colspan="7">Nenhum equipamento encontrado.</td>
      </tr>
    `;
  } else {
    const fragment = document.createDocumentFragment();

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const status = row.maintenanceStatus;

      tr.innerHTML = `
        <td class="cell-primary">${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.sector || "-")}</td>
        <td>${escapeHtml(row.maintenance_group || "-")}</td>
        <td>${escapeHtml(formatDate(row.lastMaintenanceDate))}</td>
        <td>${escapeHtml(formatDate(row.nextMaintenanceDate))}</td>
        <td>
          <span class="maintenance-status maintenance-status--${status}">
            ${escapeHtml(statusLabels[status])}
          </span>
        </td>
        <td class="table-options">
          <button class="icon-btn icon-btn--edit maintenance-action-button" type="button" data-id="${escapeHtml(row.id)}" aria-label="Registrar manutenção de ${escapeHtml(row.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </button>
        </td>
      `;

      fragment.appendChild(tr);
    });

    elements.tbody.appendChild(fragment);
  }

  elements.resultsCount.textContent = `${rows.length} equipamento${rows.length === 1 ? "" : "s"}`;

  elements.tbody.querySelectorAll(".maintenance-action-button").forEach((button) => {
    button.addEventListener("click", () => openMaintenanceModal(button.dataset.id));
  });
}

function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add("is-visible");

  window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2800);
}

function openMaintenanceModal(equipmentId) {
  const equipment = state.rows.find((row) => String(row.id) === String(equipmentId));
  if (!equipment) return;

  const today = new Date();
  const nextDate = addMonths(today, Number(equipment.maintenance_interval_months) || 1);

  state.selectedEquipmentId = equipment.id;
  elements.equipmentId.value = equipment.id;
  elements.equipmentName.value = equipment.name || "";
  elements.maintenanceDate.value = toInputDate(today);
  elements.nextMaintenanceDate.value = toInputDate(nextDate);
  elements.description.value = "";
  elements.modal.classList.add("is-open");
}

function closeMaintenanceModal() {
  elements.modal.classList.remove("is-open");
  elements.form.reset();
  state.selectedEquipmentId = null;
}

function handleMaintenanceSubmit(event) {
  event.preventDefault();

  const equipment = state.rows.find((row) => String(row.id) === String(state.selectedEquipmentId));
  if (!equipment) return;

  const lastMaintenanceDate = parseDate(elements.maintenanceDate.value);
  const nextMaintenanceDate = parseDate(elements.nextMaintenanceDate.value)
    || addMonths(lastMaintenanceDate, Number(equipment.maintenance_interval_months) || 1);

  equipment.lastMaintenanceDate = lastMaintenanceDate;
  equipment.nextMaintenanceDate = nextMaintenanceDate;
  equipment.maintenanceStatus = getMaintenanceStatus(nextMaintenanceDate, lastMaintenanceDate);

  updateCounters(state.rows);
  renderTable();
  closeMaintenanceModal();
  showToast("Manutenção registrada na tela.");
}

async function loadMaintenances() {
  elements.refreshButton.disabled = true;

  try {
    const response = await fetchWithAuth("/portal-manutencao/equipments");

    if (!response.ok) {
      throw new Error(await response.text());
    }

    state.equipments = await response.json();
    state.rows = state.equipments.map(normalizeEquipment);

    populateGroupFilter(state.rows);
    updateCounters(state.rows);
    renderTable();
  } catch (error) {
    console.error(error);
    elements.tbody.innerHTML = `
      <tr>
        <td class="maintenance-empty" colspan="7">Não foi possível carregar as manutenções.</td>
      </tr>
    `;
    elements.resultsCount.textContent = "0 equipamentos";
    showToast("Erro ao carregar manutenções.");
  } finally {
    elements.refreshButton.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMaintenances();

  elements.searchInput.addEventListener("input", renderTable);
  elements.statusFilter.addEventListener("change", renderTable);
  elements.groupFilter.addEventListener("change", renderTable);
  elements.refreshButton.addEventListener("click", loadMaintenances);
  elements.closeModal.addEventListener("click", closeMaintenanceModal);
  elements.cancelButton.addEventListener("click", closeMaintenanceModal);
  elements.form.addEventListener("submit", handleMaintenanceSubmit);

  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeMaintenanceModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.modal.classList.contains("is-open")) {
      closeMaintenanceModal();
    }
  });
});
