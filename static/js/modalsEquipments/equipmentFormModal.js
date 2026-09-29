import { openOverlay, closeOverlay, bindOverlayClose } from "../utils/modal.js";
import { formatIntervalMonths } from "../utils/maintenanceStatus.js";

const BASE_PATH = "/portal-manutencao";

// tipos não têm tabela no banco: lista padrão + tipos já usados em equipamentos cadastrados (setKnownTypes)
const DEFAULT_TYPES = ["PC", "Notebook", "Ar Condicionado", "Limpeza Geral", "Automotivo", "Outro"];
const INTERVAL_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const modal = document.getElementById("equipmentModal");
const form = document.getElementById("equipmentForm");

const fields = {
    name: document.getElementById("eqName"),
    ip: document.getElementById("eqIp"),
    serial: document.getElementById("eqSerial"),
    type: document.getElementById("eqType"),
    brand: document.getElementById("eqBrand"),
    model: document.getElementById("eqModel"),
    location: document.getElementById("eqLocation"),
    sector: document.getElementById("eqSector"),
    group: document.getElementById("eqGroup"),
    acquisition: document.getElementById("eqAcquisition"),
    interval: document.getElementById("eqInterval"),
    status: document.getElementById("eqStatus"),
};

const ui = {
    icon: document.getElementById("equipmentModalIcon"),
    title: document.getElementById("equipmentModalTitle"),
    subtitle: document.getElementById("equipmentModalSubtitle"),
    saveButton: document.getElementById("saveEquipmentButton"),
    saveLabel: document.getElementById("saveEquipmentButtonLabel"),
};

const ICONS = {
    create: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
};

let current = { mode: "create", equipment: null };
let onSaved = null;
let optionsPromise = null;
let knownTypes = [...DEFAULT_TYPES];
let acquisitionPicker = null;

// ===================== Opções dos selects =====================

async function fetchJson(url) {
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

function fillSelect(select, items, valueFn, labelFn) {
    select.innerHTML = `<option value="">Selecione…</option>`;
    items.forEach(item => {
        const option = document.createElement("option");
        option.value = valueFn(item);
        option.textContent = labelFn(item);
        select.appendChild(option);
    });
}

// unidades, setores, grupos e status vêm do banco e são carregados uma única vez
export function loadEquipmentFormOptions() {
    if (!optionsPromise) {
        optionsPromise = Promise.all([
            fetchJson(`${BASE_PATH}/locations`),
            fetchJson(`${BASE_PATH}/sectors`),
            fetchJson(`${BASE_PATH}/maintenance-groups`),
            fetchJson(`${BASE_PATH}/equipment-status`),
        ]).then(([locations, sectors, groups, statuses]) => {
            const byDescription = item => item.description;
            fillSelect(fields.location, locations, item => item.id, byDescription);
            fillSelect(fields.sector, sectors, item => item.id, byDescription);
            fillSelect(fields.group, groups, item => item.id, byDescription);
            fillSelect(fields.status, statuses, item => item.id, byDescription);
        }).catch(error => {
            optionsPromise = null;
            console.log(error);
            notyf.error("Não foi possível carregar unidades, setores, grupos e status.");
        });
    }

    return optionsPromise;
}

// inclui no select os tipos já usados em equipamentos cadastrados que não estão na lista padrão
export function setKnownTypes(types) {
    const extra = types.filter(type => type && !DEFAULT_TYPES.includes(type)).sort((a, b) => a.localeCompare(b, "pt-BR"));
    knownTypes = [...DEFAULT_TYPES.filter(type => type !== "Outro"), ...extra, "Outro"];
    fillSelect(fields.type, knownTypes, type => type, type => type);
}

// ===================== Validação por campo =====================

function setFieldError(input, message) {
    const field = input.closest(".form-field");
    const error = document.getElementById(`${input.id}Error`);

    field.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
    if (error) error.textContent = message || "";
}

function clearErrors() {
    Object.values(fields).forEach(input => setFieldError(input, ""));
}

function validate() {
    const errors = [
        [fields.name, !fields.name.value.trim() ? "Informe o nome do equipamento." : ""],
        [fields.type, !fields.type.value ? "Selecione o tipo." : ""],
        [fields.location, !fields.location.value ? "Selecione a unidade." : ""],
        [fields.sector, !fields.sector.value ? "Selecione o setor." : ""],
        [fields.group, !fields.group.value ? "Selecione o grupo de manutenção." : ""],
        [fields.interval, !fields.interval.value ? "Selecione a periodicidade." : ""],
        [fields.status, !fields.status.value ? "Selecione o status." : ""],
    ];

    errors.forEach(([input, message]) => setFieldError(input, message));

    const firstInvalid = errors.find(([, message]) => message);
    if (firstInvalid) {
        firstInvalid[0].focus();
        return false;
    }

    return true;
}

// ===================== Data de aquisição =====================

// "Thu, 30 Apr 2026 00:00:00 GMT" -> "2026-04-30" (componentes em UTC: o backend serializa meia-noite UTC)
function toInputDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function setAcquisitionDate(value) {
    if (acquisitionPicker) {
        if (value) {
            acquisitionPicker.setDate(value, true);
        } else {
            acquisitionPicker.clear();
        }
    } else {
        fields.acquisition.value = value;
    }
}

// ===================== Abrir / preencher =====================

export async function openEquipmentModal({ mode, equipment = null }) {
    current = { mode, equipment };
    const isEdit = mode === "edit";

    form.reset();
    clearErrors();
    setAcquisitionDate("");

    ui.icon.innerHTML = ICONS[mode];
    ui.title.textContent = isEdit ? "Editar equipamento" : "Novo equipamento";
    ui.subtitle.textContent = isEdit ? `Alterando os dados de ${equipment.name}` : "Preencha os dados para cadastrar";
    ui.saveLabel.textContent = isEdit ? "Salvar alterações" : "Cadastrar equipamento";

    await loadEquipmentFormOptions();

    if (isEdit) {
        // tipo que não está em nenhuma lista (valor livre antigo) entra como opção para não se perder na edição
        if (equipment.type && !knownTypes.includes(equipment.type)) {
            setKnownTypes([...knownTypes, equipment.type]);
        }

        fields.name.value = equipment.name || "";
        fields.ip.value = equipment.ip || "";
        fields.serial.value = equipment.serial_number || "";
        fields.type.value = equipment.type || "";
        fields.brand.value = equipment.brand || "";
        fields.model.value = equipment.model || "";
        fields.location.value = equipment.location_id ?? "";
        fields.sector.value = equipment.sector_id ?? "";
        fields.group.value = equipment.maintenance_group_id ?? "";
        fields.interval.value = equipment.maintenance_interval_months ?? "";
        fields.status.value = equipment.status_id ?? "";
        setAcquisitionDate(toInputDate(equipment.acquisition_date));
    }

    openOverlay(modal, { focus: fields.name });
}

// ===================== Envio =====================

function buildPayload() {
    const text = input => input.value.trim();

    return {
        name: text(fields.name),
        ip: text(fields.ip),
        serial_number: text(fields.serial),
        type: fields.type.value,
        brand: text(fields.brand),
        model: text(fields.model),
        location: fields.location.value,
        sector: fields.sector.value,
        maintenance_group: fields.group.value,
        acquisition_date: fields.acquisition.value,
        maintenance_interval_months: fields.interval.value,
        status: fields.status.value,
    };
}

async function readErrorMessage(response, fallback) {
    const text = await response.text();

    try {
        return JSON.parse(text)?.message || fallback;
    } catch (error) {
        return fallback;
    }
}

function setSaving(isSaving) {
    ui.saveButton.disabled = isSaving;
    ui.saveButton.classList.toggle("is-loading", isSaving);
}

async function submit(event) {
    event.preventDefault();

    if (!validate()) return;

    const isEdit = current.mode === "edit";
    const payload = buildPayload();
    setSaving(true);

    try {
        const response = await fetchWithAuth(isEdit ? `${BASE_PATH}/equipments/${current.equipment.id}` : `${BASE_PATH}/equipments`, {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const message = await readErrorMessage(response, isEdit ? "Não foi possível salvar as alterações." : "Não foi possível cadastrar o equipamento.");

            // número de série é único no banco: mostra o erro no próprio campo
            if (/serial/i.test(message)) {
                setFieldError(fields.serial, "Já existe um equipamento com este número de série.");
                fields.serial.focus();
                return;
            }

            throw new Error(message);
        }

        notyf.success(isEdit ? "Equipamento atualizado com sucesso." : `Equipamento ${payload.name} cadastrado com sucesso.`);
        closeOverlay(modal);

        if (onSaved) await onSaved();
    } catch (error) {
        notyf.error(error.message);
    } finally {
        setSaving(false);
    }
}

// ===================== Inicialização =====================

export function initEquipmentFormModal({ onSuccess }) {
    onSaved = onSuccess;

    fillSelect(fields.type, knownTypes, type => type, type => type);
    fillSelect(fields.interval, INTERVAL_OPTIONS, value => value, value => capitalize(formatIntervalMonths(value)));

    if (typeof flatpickr !== "undefined") {
        acquisitionPicker = flatpickr(document.getElementById("eqAcquisitionWrap"), {
            wrap: true,
            altInput: true,
            altFormat: "d/m/Y",
            dateFormat: "Y-m-d",
            locale: "pt",
            maxDate: "today",
        });
    }

    bindOverlayClose(modal, [
        document.getElementById("closeEquipmentModalButton"),
        document.getElementById("cancelEquipmentModalButton"),
    ]);

    form.addEventListener("submit", submit);

    Object.values(fields).forEach(input => {
        const eventName = input.tagName === "SELECT" ? "change" : "input";
        input.addEventListener(eventName, () => {
            if (input.closest(".form-field")?.classList.contains("is-invalid")) setFieldError(input, "");
        });
    });
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
