import { closeModalEditUser, loadFieldsEdit, openEditUserModal, sendFormEditUser } from "./modalsUsers/editUser.js";
import { closeModalDeleteUser, deleteUser, openDeleteUserModal } from "./modalsUsers/deleteUser.js";

async function loadFields() {
    // carregar campo de setor
    try {
        const response = await fetchWithAuth("/portal-manutencao/sectors");

        const sectorsJSON = await response.json();

        const selectSectors = document.getElementById("sector_id");

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

        const selectMaintenanceGroups = document.getElementById("maintenance_group_id");

        maintenanceGroupsJSON.forEach(maintenanceGroup => {
            const option = document.createElement("option");

            option.value = maintenanceGroup.id;
            option.textContent = maintenanceGroup.description;

            selectMaintenanceGroups.appendChild(option);
        })
    } catch (error) {
        console.log(error)
    }

    // carregar cargos do usuário
    try {
        const response = await fetchWithAuth("/portal-manutencao/roles");

        const rolesJSON = await response.json();

        const selectRoles = document.getElementById("role_id");
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
}

async function populateUsersTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/users");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const users = await response.json();

        const tbodyUsers = document.getElementById("userTbody");
        tbodyUsers.innerHTML = ``;

        const usersFragment = document.createDocumentFragment();

        let usersCount = 0;

        users.forEach(user => {
            const trUsers = document.createElement("tr");

            usersCount++;

            let userRole = "";
            if (user.role === "administrator") {
                userRole = "Administrador";
            } else if (user.role === "employee") {
                userRole = "Funcionário";
            }

            const userStatus = user.is_active ? "Ativo" : "Inativo";

            trUsers.innerHTML = `
                <td>${user.username}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${userRole}</td>
                <td>${user.sector}</td>
                <td>${user.maintenance_group}</td>
                <td>${userStatus}</td>
                <td>
                    <div class="table-options">
                        <button class="icon-btn icon-btn--edit edit-user-button" data-id="${user.id}" aria-label="Editar ${user.name}" title="Editar Usuário">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="icon-btn icon-btn--danger delete-user-button" data-id="${user.id}" data-name="${user.name}" aria-label="Deletar ${user.name}" title="Deletar Usuário">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"/>
                                <path d="M8 6V4h8v2"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6"/>
                                <path d="M14 11v6"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;

            const resultCountLabel = document.getElementById("resultsCountLabel");
            resultCountLabel.textContent = `Total: ${usersCount} usuários`;

            usersFragment.appendChild(trUsers);
        });

        tbodyUsers.appendChild(usersFragment);

        tbodyUsers.querySelectorAll(".delete-user-button").forEach((button, index) => {
            button.addEventListener("click", () => {
                openDeleteUserModal(users[index]);
            });
        });

        tbodyUsers.querySelectorAll(".edit-user-button").forEach((button, index) => {
            button.addEventListener("click", () => {
                openEditUserModal(users[index]);
            });
        });
    } catch (error) {
        console.log(error);
    }
}

async function submitCreateUserForm() {
    const formCreateUser = document.getElementById("userForm");

    formCreateUser.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData(formCreateUser);

            // validação para remover espaços no inicio e final da string
            for (let [key, value] of formData.entries()) {
                if (typeof value === "string") {
                    formData.set(key, value.trim());
                }
            }

            const data = Object.fromEntries(formData.entries());

            const fieldLabels = {
                username: "Usuário",
                password_hash: "Senha",
                name: "Nome Completo",
                role: "Cargo",
                maintenance_group: "Grupo de Manutenção"
            }

            // VALIDAÇÃO DE REQUIRED FIELDS
            const requiredFields = [
                "username",
                "password_hash",
                "name",
                "role",
                "maintenance_group"
            ];

            
            for (let field of requiredFields) {
                const value = formData.get(field);

                if (!value || value === "") {
                    const label = fieldLabels[field] || field;
                    notyf.error(`O campo ${label} não pode estar vazio`);
                    return;
                }
            }

            const response = await fetchWithAuth("/portal-manutencao/users", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                let errorMessage = "Houve um erro ao tentar cadastrar o equipamento";

                try {
                    const errorJSON = await response.json();

                    if (errorJSON?.message) {
                        errorMessage = errorJSON.message;
                    }

                    throw new Error(errorMessage);
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        // resposta não é JSON, tenta ler como texto
                        errorMessage = `Erro ${response.status}: Falha ao cadastrar equipamento`;
                    } else {
                        errorMessage = error.message;
                    }
                }

                throw new Error(errorMessage);
            }

            notyf.success("Usuário cadastrado com sucesso")
            formCreateUser.reset();
            populateUsersTable();
        } catch (error) {
            notyf.error(error.message)
        }
    })
}

document.addEventListener("DOMContentLoaded", () => {
    loadFields();
    populateUsersTable();
    submitCreateUserForm();

    loadFieldsEdit();
    closeModalEditUser();
    sendFormEditUser(populateUsersTable);

    closeModalDeleteUser();
    deleteUser(populateUsersTable);
})
