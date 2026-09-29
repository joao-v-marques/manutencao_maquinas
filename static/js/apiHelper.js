// pegar token atual
function getToken() {
    const token = localStorage.getItem('token');
    return token;
}

// função para fazer o fetch para o backend enviando o token de autorização
function fetchWithAuth(url, options = {}) {
    const token = getToken();

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Autorization', `Bearer ${token}`);
    }

    return fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers,
    });
}

// o usuário logado não muda enquanto a página está aberta: navbar e páginas compartilham uma única requisição ao /me
let loggedUserRequest = null;

// retorna { user, status } — o status permite à navbar distinguir sessão expirada (401) de outros erros
function fetchLoggedUser() {
    if (!loggedUserRequest) {
        loggedUserRequest = fetchWithAuth("/portal-manutencao/me")
            .then(async response => {
                // sem cookie de sessão o token_required redireciona para o login; o fetch segue o redirect e
                // recebe o HTML da página de login com status 200 — isso também é sessão inválida (tratado como 401)
                const isJSON = (response.headers.get("content-type") || "").includes("application/json");
                if (response.redirected || !isJSON) {
                    throw Object.assign(new Error("Sessão inválida ou expirada"), { status: 401 });
                }

                if (!response.ok) {
                    throw Object.assign(new Error(await response.text()), { status: response.status });
                }

                return { user: await response.json(), status: response.status };
            })
            .catch(error => {
                // falhou: libera o cache para uma próxima tentativa buscar de novo
                loggedUserRequest = null;
                console.log(error);
                return { user: null, status: error.status || 0 };
            });
    }

    return loggedUserRequest;
}

// função que retorna informações do usuário logado (ou undefined em caso de erro)
async function getLoggedUser() {
    const { user } = await fetchLoggedUser();
    return user || undefined;
}

// função para fazer logout
async function handlerLogout() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/logout", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        // limpar token do localStorage
        localStorage.removeItem("token");

        // redirecionar para a tela de login
        window.location.href = "/portal-manutencao/login?motivo=saiu";
    } catch (error) {
        console.error("Erro ao fazer logout: ", error);

        if (window.notyf) {
            notyf.error("Erro ao sair do sistema. Tente novamente.");
        } else {
            window.alert("Erro ao fazer logout. Tente novamente");
        }

        throw error;
    }
}