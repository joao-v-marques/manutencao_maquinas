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

async function loadUsersTable() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/users");

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const users = await response.json();

        const tbodyUsers = document.getElementById("userTbody");
        tbodyUsers.innerHTML = ``;

        const usersFragment = document.createDocumentFragment();
        let userRole = "";
        let userStatus = "";

        let usersCount = 0;

        users.forEach(user => {
            const trUsers = document.createElement("tr");

            usersCount++;

            if (user.role === "administrator") {
                userRole = "Administrador";
            } else if (user.role === "employee") {
                userRole = "Funcionário";
            }
            
            if (user.is_active) {
                userStatus = "Ativo";
            } else {
                userStatus = "Inativo";
            }

            trUsers.innerHTML = `
                <td>${user.username}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${userRole}</td>
                <td>${user.sector}</td>
                <td>${user.maintenance_group}</td>
                <td>${userStatus}</td>
                <td>
                    <button>Editar</button>
                    <button>Deletar</button>
                </td>
            `;

            const resultCountLabel = document.getElementById("resultsCountLabel");
            resultCountLabel.textContent = `Total: ${usersCount}`;

            usersFragment.appendChild(trUsers);
        });

        tbodyUsers.appendChild(usersFragment);
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

            // FAZER VALIDAÇÃO DE REQUIRED FIELDS

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

            formCreateUser.reset();
            loadUsersTable();
        } catch (error) {
            console.log(error)
        }
    })
}

document.addEventListener("DOMContentLoaded", () => {
    loadFields();
    loadUsersTable();
    submitCreateUserForm();
})