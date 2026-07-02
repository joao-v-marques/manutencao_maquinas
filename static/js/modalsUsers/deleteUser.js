const deleteUserModal = document.getElementById("deleteUserModalOverlay");
const deleteUserForm = document.getElementById("deleteUserForm");
const deleteUserId = document.getElementById("deleteUserId");
const deleteUserName = document.getElementById("deleteUserName");

function closeDeleteUserModal() {
    deleteUserModal.classList.remove("is-open");
}

export function openDeleteUserModal(user) {
    deleteUserId.value = user.id;
    deleteUserName.textContent = user.name;

    deleteUserModal.classList.add("is-open");
}

export function closeModalDeleteUser() {
    const btnClose = document.getElementById("closeDeleteUserModalButton");
    const btnCancel = document.getElementById("cancelDeleteUserButton");

    btnClose.addEventListener("click", closeDeleteUserModal);
    btnCancel.addEventListener("click", closeDeleteUserModal);

    window.addEventListener("click", (e) => {
        if (e.target === deleteUserModal) closeDeleteUserModal();
    });
}

export function deleteUser(onUserDeleted) {
    deleteUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const userId = deleteUserId.value;

            const response = await fetchWithAuth(`/portal-manutencao/users/${userId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            closeDeleteUserModal();

            if (typeof onUserDeleted === "function") {
                onUserDeleted();
            }
        } catch (error) {
            console.log(error);
        }
    });
}
