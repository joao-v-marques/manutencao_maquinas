import { openOverlay, closeOverlay, bindOverlayClose } from "../utils/modal.js";

const BASE_PATH = "/portal-manutencao";
const MIN_PASSWORD_LENGTH = 6;

export const ROLE_LABELS = {
    administrator: "Administrador",
    employee: "Funcionário",
};

export function roleLabel(role) {
    return ROLE_LABELS[role] || role || "–";
}

const modal = document.getElementById("userModal");
const form = document.getElementById("userForm");

const fields = {
    username: document.getElementById("userUsername"),
    password: document.getElementById("userPassword"),
    name: document.getElementById("userName"),
    email: document.getElementById("userEmail"),
    role: document.getElementById("userRole"),
    sector: document.getElementById("userSector"),
    group: document.getElementById("userGroup"),
    active: document.getElementById("userActive"),
};

const ui = {
    icon: document.getElementById("userModalIcon"),
    title: document.getElementById("userModalTitle"),
    subtitle: document.getElementById("userModalSubtitle"),
    passwordField: document.getElementById("userPasswordField"),
    passwordLabel: document.getElementById("userPasswordLabel"),
    passwordHint: document.getElementById("userPasswordHint"),
    passwordToggle: document.getElementById("toggleUserPassword"),
    strength: document.getElementById("passwordStrength"),
    activeField: document.getElementById("userActiveField"),
    activeLabel: document.getElementById("userActiveLabel"),
    saveButton: document.getElementById("saveUserButton"),
    saveLabel: document.getElementById("saveUserButtonLabel"),
};

const ICONS = {
    create: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
};

// modo atual do modal ("create" | "edit") e o usuário em edição
let current = { mode: "create", user: null };
let onSaved = null;
let optionsPromise = null;

// ===================== Opções dos selects (carregadas uma única vez) =====================

async function fetchJson(url) {
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
}

function fillSelect(select, items, labelFn) {
    select.innerHTML = `<option value="">Selecione…</option>` + items
        .map(item => `<option value="${item.id}"></option>`)
        .join("");

    // textContent evita interpretar HTML vindo do banco
    items.forEach((item, index) => {
        select.options[index + 1].textContent = labelFn(item);
    });
}

export function loadUserFormOptions() {
    if (!optionsPromise) {
        optionsPromise = Promise.all([
            fetchJson(`${BASE_PATH}/roles`),
            fetchJson(`${BASE_PATH}/sectors`),
            fetchJson(`${BASE_PATH}/maintenance-groups`),
        ]).then(([roles, sectors, groups]) => {
            fillSelect(fields.role, roles, role => roleLabel(role.description));
            fillSelect(fields.sector, sectors, sector => sector.description);
            fillSelect(fields.group, groups, group => group.description);
        }).catch(error => {
            optionsPromise = null;
            console.log(error);
            notyf.error("Não foi possível carregar cargos, setores e grupos.");
        });
    }

    return optionsPromise;
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
    Object.values(fields).forEach(input => {
        if (input.closest(".form-field")) setFieldError(input, "");
    });
}

function validate() {
    const isCreate = current.mode === "create";
    const username = fields.username.value.trim();
    const password = fields.password.value.trim();
    const email = fields.email.value.trim();

    const errors = [
        [fields.username, !username ? "Informe o nome de usuário." : /\s/.test(username) ? "O usuário não pode conter espaços." : ""],
        [fields.password, isCreate && !password
            ? "Informe uma senha."
            : password && password.length < MIN_PASSWORD_LENGTH ? `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` : ""],
        [fields.name, !fields.name.value.trim() ? "Informe o nome completo." : ""],
        [fields.email, email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Informe um e-mail válido." : ""],
        [fields.role, !fields.role.value ? "Selecione o cargo." : ""],
        [fields.sector, !fields.sector.value ? "Selecione o setor." : ""],
        [fields.group, !fields.group.value ? "Selecione o grupo de manutenção." : ""],
    ];

    errors.forEach(([input, message]) => setFieldError(input, message));

    const firstInvalid = errors.find(([, message]) => message);
    if (firstInvalid) {
        firstInvalid[0].focus();
        return false;
    }

    return true;
}

// ===================== Senha =====================

// força simples: comprimento + variedade de caracteres (0 = vazio, 4 = forte)
function passwordStrength(password) {
    if (!password) return 0;

    let score = password.length >= MIN_PASSWORD_LENGTH ? 1 : 0;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) || /\d/.test(password) && /[a-zA-Z]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    return Math.max(1, Math.min(score, 4));
}

const STRENGTH_LABELS = ["", "Senha fraca", "Senha razoável", "Senha boa", "Senha forte"];

function updatePasswordStrength() {
    const password = fields.password.value;
    const level = passwordStrength(password);
    const baseHint = current.mode === "edit"
        ? "Deixe em branco para manter a senha atual."
        : `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.`;

    ui.strength.dataset.level = String(level);
    ui.strength.hidden = !password;
    ui.passwordHint.textContent = password ? `${STRENGTH_LABELS[level]} · ${baseHint}` : baseHint;
}

// ===================== Abrir / preencher =====================

export async function openUserModal({ mode, user = null }) {
    current = { mode, user };
    const isEdit = mode === "edit";

    form.reset();
    clearErrors();
    fields.password.type = "password";
    ui.passwordToggle.setAttribute("aria-pressed", "false");

    ui.icon.innerHTML = ICONS[mode];
    ui.title.textContent = isEdit ? "Editar usuário" : "Novo usuário";
    ui.subtitle.textContent = isEdit ? `Alterando os dados de ${user.name}` : "Preencha os dados para conceder acesso ao sistema";
    ui.saveLabel.textContent = isEdit ? "Salvar alterações" : "Cadastrar usuário";
    ui.passwordLabel.textContent = isEdit ? "Nova senha" : "Senha";
    ui.passwordField.classList.toggle("form-field--required", !isEdit);
    fields.password.placeholder = isEdit ? "Deixe em branco para manter" : "Crie uma senha de acesso";
    ui.activeField.hidden = !isEdit;

    await loadUserFormOptions();

    if (isEdit) {
        fields.username.value = user.username || "";
        fields.name.value = user.name || "";
        fields.email.value = user.email || "";
        fields.role.value = user.role_id ?? "";
        fields.sector.value = user.sector_id ?? "";
        fields.group.value = user.maintenance_group_id ?? "";
        fields.active.checked = Boolean(user.is_active);
    }

    updateActiveLabel();
    updatePasswordStrength();
    openOverlay(modal, { focus: isEdit ? fields.name : fields.username });
}

function updateActiveLabel() {
    ui.activeLabel.textContent = fields.active.checked ? "Ativo" : "Inativo";
}

// ===================== Envio =====================

async function readErrorMessage(response, fallback) {
    const text = await response.text();

    try {
        return JSON.parse(text)?.message || fallback;
    } catch (error) {
        return fallback;
    }
}

function buildPayload() {
    const isEdit = current.mode === "edit";
    const password = fields.password.value.trim();

    const payload = {
        username: fields.username.value.trim(),
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        role: fields.role.value,
        sector: fields.sector.value,
        maintenance_group: fields.group.value,
    };

    // o backend usa nomes diferentes para a senha no cadastro (password_hash) e na edição (password)
    if (isEdit) {
        payload.is_active = fields.active.checked ? "true" : "false";
        if (password) payload.password = password;
    } else {
        payload.password_hash = password;
    }

    return payload;
}

function setSaving(isSaving) {
    ui.saveButton.disabled = isSaving;
    ui.saveButton.classList.toggle("is-loading", isSaving);
}

async function submit(event) {
    event.preventDefault();

    if (!validate()) return;

    const isEdit = current.mode === "edit";
    setSaving(true);

    try {
        const response = await fetchWithAuth(isEdit ? `${BASE_PATH}/users/${current.user.id}` : `${BASE_PATH}/users`, {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPayload()),
        });

        if (!response.ok) {
            const message = await readErrorMessage(response, isEdit ? "Não foi possível salvar as alterações." : "Não foi possível cadastrar o usuário.");

            // erro de usuário duplicado aparece no próprio campo
            if (/username|usu[aá]rio já/i.test(message)) {
                setFieldError(fields.username, "Este nome de usuário já está em uso.");
                fields.username.focus();
                return;
            }

            throw new Error(message);
        }

        notyf.success(isEdit ? "Usuário atualizado com sucesso." : `Usuário ${fields.name.value.trim()} cadastrado com sucesso.`);
        closeOverlay(modal);

        if (onSaved) await onSaved();
    } catch (error) {
        notyf.error(error.message);
    } finally {
        setSaving(false);
    }
}

// ===================== Inicialização =====================

export function initUserFormModal({ onSuccess }) {
    onSaved = onSuccess;

    bindOverlayClose(modal, [
        document.getElementById("closeUserModalButton"),
        document.getElementById("cancelUserModalButton"),
    ]);

    form.addEventListener("submit", submit);

    // limpa o erro do campo assim que o usuário corrige
    Object.values(fields).forEach(input => {
        const eventName = input.tagName === "SELECT" || input.type === "checkbox" ? "change" : "input";
        input.addEventListener(eventName, () => {
            if (input.closest(".form-field")?.classList.contains("is-invalid")) setFieldError(input, "");
        });
    });

    fields.password.addEventListener("input", updatePasswordStrength);
    fields.active.addEventListener("change", updateActiveLabel);

    ui.passwordToggle.addEventListener("click", () => {
        const isVisible = fields.password.type === "text";
        fields.password.type = isVisible ? "password" : "text";
        ui.passwordToggle.setAttribute("aria-pressed", String(!isVisible));
        ui.passwordToggle.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
        fields.password.focus();
    });
}
