import { openOverlay, closeOverlay, bindOverlayClose } from "../utils/modal.js";
import { formatDateToInput, formatRelativeDays, formatIntervalMonths, escapeHTML } from "../utils/maintenanceStatus.js";
import { operationalStatusTone } from "../utils/equipmentStatus.js";

const drawer = document.getElementById("equipmentDrawer");
const body = document.getElementById("drawerBody");

let currentEquipment = null;
let actionHandler = null;

function infoItem(label, value, { full = false, mono = false } = {}) {
    const hasValue = value !== null && value !== undefined && String(value).trim() !== "";

    return `
        <div class="${full ? "is-full" : ""}">
            <dt>${label}</dt>
            <dd class="${hasValue ? (mono ? "mono" : "") : "is-empty"}">${hasValue ? escapeHTML(value) : "Não informado"}</dd>
        </div>
    `;
}

function maintenanceBlock(equipment) {
    const status = equipment._maintenance;
    const last = formatDateToInput(equipment._lastMaintenance);
    const next = formatDateToInput(equipment._nextMaintenance);

    return `
        <dl class="drawer-maintenance">
            <div class="drawer-maintenance__status">
                <span class="maintenance-status status--${status.key}">${escapeHTML(status.label)}</span>
                <span class="drawer-maintenance__interval">Preventiva ${escapeHTML(formatIntervalMonths(equipment.maintenance_interval_months))}</span>
            </div>
            <div>
                <dt>Última manutenção</dt>
                <dd>${last || "Nunca"}</dd>
            </div>
            <div>
                <dt>Próxima manutenção</dt>
                <dd>${next || "–"}${next ? `<small>${escapeHTML(formatRelativeDays(status.diffInDays))}</small>` : ""}</dd>
            </div>
        </dl>
    `;
}

// preenche e abre o painel lateral; as ações (registrar, histórico, editar, excluir) são delegadas à página
export function openEquipmentDrawer(equipment) {
    currentEquipment = equipment;
    const tone = operationalStatusTone(equipment.status);

    document.getElementById("drawerEyebrow").textContent = [equipment.type, equipment.brand].filter(Boolean).join(" · ");
    document.getElementById("drawerTitle").textContent = equipment.name;
    document.getElementById("drawerBadges").innerHTML = `
        <span class="op-status${tone ? ` op-status--${tone}` : ""}">${escapeHTML(equipment.status || "Sem status")}</span>
        <span class="maintenance-status status--${equipment._maintenance.key}">${escapeHTML(equipment._maintenance.label)}</span>
    `;

    body.innerHTML = `
        <section class="drawer-section">
            <h3 class="drawer-section__title">Manutenção preventiva</h3>
            ${maintenanceBlock(equipment)}
        </section>

        <section class="drawer-section">
            <h3 class="drawer-section__title">Identificação</h3>
            <dl class="drawer-info">
                ${infoItem("Marca / prestador", equipment.brand)}
                ${infoItem("Modelo", equipment.model)}
                ${infoItem("IP", equipment.ip, { mono: true })}
                ${infoItem("Data de aquisição", formatDateToInput(equipment.acquisition_date))}
                ${infoItem("Número de série", equipment.serial_number, { full: true, mono: true })}
            </dl>
        </section>

        <section class="drawer-section">
            <h3 class="drawer-section__title">Localização e responsáveis</h3>
            <dl class="drawer-info">
                ${infoItem("Unidade", equipment.location)}
                ${infoItem("Setor", equipment.sector)}
                ${infoItem("Grupo de manutenção", equipment.maintenance_group, { full: true })}
                ${infoItem("Cadastrado em", formatDateToInput(equipment.created_at))}
            </dl>
        </section>
    `;

    openOverlay(drawer);
}

export function closeEquipmentDrawer() {
    closeOverlay(drawer);
}

export function initEquipmentDrawer({ onAction }) {
    actionHandler = onAction;

    bindOverlayClose(drawer, [document.getElementById("closeDrawerButton")]);

    drawer.querySelectorAll("[data-drawer-action]").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.dataset.drawerAction;

            // editar/excluir fecham o painel antes de abrir o modal; registrar/histórico abrem por cima dele
            if (action === "edit" || action === "delete") {
                closeOverlay(drawer);
            }

            if (actionHandler && currentEquipment) {
                actionHandler(action, currentEquipment);
            }
        });
    });
}
