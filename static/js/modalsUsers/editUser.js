const editUserModal = document.getElementById("editUserModalOverlay");

// carregar campos do form que são entidades na DB
export async function loadFieldsEdit() {
    // carregar cargos do usuário
    try {
        const response = await fetchWithAuth("/portal-manutencao/roles");

        const rolesJSON = await response.json();

        const selectRoles = document.getElementById("edit_role_id");
        let roleDescription = "";

        rolesJSON.forEach(role => {
            const option = document.createElement("option");

            if (role.description === "administrator") {
                roleDescription = "Administrador";
            } else if (role.description === "employee") {
                roleDescription = "Funcionário";
            }

            option.value = role.id;
            option.textContent = roleDescription;

            selectRoles.appendChild(option);
        })
    } catch (error) {
        console.log(error);
    }

    // carregar campo de setor
    try {
        const response = await fetchWithAuth("/portal-manutencao/sectors");

        const sectorsJSON = await response.json();

        const selectSectors = document.getElementById("edit_sector_id");

        sectorsJSON.forEach(sector => {
            const option = document.createElement("option");

            option.value = sector.id;
            option.textContent = sector.description;

            selectSectors.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }

    // carregar grupo de manutenção
    try {
        const respose = await fetchWithAuth("/portal-manutencao/maintenance-groups");

        const maintenanceGroupsJSON = await respose.json();

        const selectMaintenanceGroups = document.getElementById("edit_maintenance_group_id");

        maintenanceGroupsJSON.forEach(maintenanceGroup => {
            const option = document.createElement("option");

            option.value = maintenanceGroup.id;
            option.textContent = maintenanceGroup.description;

            selectMaintenanceGroups.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }
}

function closeEditUserModal() {
    editUserModal.classList.remove("is-open");
}

export function openEditUserModal(user) {
    // ID
    document.getElementById("editUserId").value = user.id;

    // Acesso
    document.getElementById("edit_username_id").value = user.username;
    document.getElementById("edit_password_id").value = "";

    // Identificação
    document.getElementById("edit_name_id").value = user.name;
    document.getElementById("edit_email_id").value = user.email;

    // Perfil
    document.getElementById("edit_role_id").value = user.role_id ?? "";
    document.getElementById("edit_sector_id").value = user.sector_id ?? "";
    document.getElementById("edit_maintenance_group_id").value = user.maintenance_group_id ?? "";
    document.getElementById("edit_is_active_id").value = user.is_active ? "true" : "false";

    editUserModal.classList.add("is-open");
}

export async function sendFormEditUser(onUserEdited) {
    const editUserForm = document.getElementById("editUserForm");

    editUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData(editUserForm);
            const userId = document.getElementById("editUserId").value;

            // validação remover espaços no inicio e final da string
            for (let [key, value] of formData.entries()) {
                if (typeof value === "string") {
                    formData.set(key, value.trim());
                }
            }

            const data = Object.fromEntries(formData.entries());

            // se a senha for deixada em branco, não envia o campo (mantém a senha atual)
            if (!data.password) {
                delete data.password;
            }

            const response = await fetchWithAuth(`/portal-manutencao/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                let errorMessage = "Houve um erro ao editar o usuário";

                try {
                    const errorJSON = await response.json();

                    if (errorJSON?.message) {
                        errorMessage = errorJSON.message;
                    }
                } catch (parseError) {
                    errorMessage = await response.text();
                }

                throw new Error(errorMessage);
            }

            notyf.success("Usuário atualizado com sucesso");
            editUserForm.reset();
            closeEditUserModal();

            if (typeof onUserEdited === "function") {
                onUserEdited();
            }
        } catch (error) {
            notyf.error(error);
        }
    })
}

export function closeModalEditUser() {
    const btnClose = document.getElementById("closeEditUserModalButton");
    const btnCancel = document.getElementById("cancelEditUserButton");

    btnClose.addEventListener("click", closeEditUserModal);
    btnCancel.addEventListener("click", closeEditUserModal);

    window.addEventListener("click", (e) => {
        if (e.target === editUserModal) closeEditUserModal();
    });
}
