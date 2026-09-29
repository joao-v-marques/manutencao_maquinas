import { openOverlay, closeOverlay, bindOverlayClose } from "../utils/modal.js";
import { escapeHTML } from "../utils/maintenanceStatus.js";

const deleteUserModal = document.getElementById("deleteUserModalOverlay");
const deleteUserForm = document.getElementById("deleteUserForm");
const deleteUserId = document.getElementById("deleteUserId");
const deleteUserSummary = document.getElementById("deleteUserSummary");
const confirmButton = document.getElementById("confirmDeleteUserButton");

let currentUserName = "";

// abre a confirmação mostrando quem será excluído (avatar, nome, @usuario e cargo)
export function openDeleteUserModal(user, { initials, role }) {
    deleteUserId.value = user.id;
    currentUserName = user.name;

    deleteUserSummary.innerHTML = `
        <span class="user-avatar user-avatar--lg" aria-hidden="true">${escapeHTML(initials)}</span>
        <div>
            <div class="delete-summary__name">${escapeHTML(user.name)}</div>
            <div class="delete-summary__meta">@${escapeHTML(user.username)} · ${escapeHTML(role)}${user.sector ? ` · ${escapeHTML(user.sector)}` : ""}</div>
        </div>
    `;

    // foco no "Cancelar": numa ação destrutiva o padrão seguro é não excluir
    openOverlay(deleteUserModal, { focus: document.getElementById("cancelDeleteUserButton") });
}

export function closeModalDeleteUser() {
    bindOverlayClose(deleteUserModal, [
        document.getElementById("closeDeleteUserModalButton"),
        document.getElementById("cancelDeleteUserButton"),
    ]);
}

async function readErrorMessage(response) {
    const text = await response.text();

    try {
        const message = JSON.parse(text)?.message || "";

        // usuário com registros vinculados (ex.: manutenções) não pode ser removido pelo banco
        if (/foreign key|violates|viola/i.test(message)) {
            return "Este usuário tem manutenções registradas e não pode ser excluído. Marque-o como inativo na edição.";
        }

        return message || "Houve um erro ao excluir o usuário.";
    } catch (error) {
        return "Houve um erro ao excluir o usuário.";
    }
}

export function deleteUser(onUserDeleted) {
    deleteUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        confirmButton.disabled = true;
        confirmButton.classList.add("is-loading");

        try {
            const response = await fetchWithAuth(`/portal-manutencao/users/${deleteUserId.value}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response));
            }

            closeOverlay(deleteUserModal);
            notyf.success(`Usuário ${currentUserName} excluído.`);

            if (typeof onUserDeleted === "function") {
                await onUserDeleted();
            }
        } catch (error) {
            notyf.error(error.message);
        } finally {
            confirmButton.disabled = false;
            confirmButton.classList.remove("is-loading");
        }
    });
}
