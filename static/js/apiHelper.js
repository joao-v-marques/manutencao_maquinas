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

// função que retorna informações do usuário logado
async function getLoggedUser() {
    try {
        const response = await fetchWithAuth("/portal-manutencao/me");
    
        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();

        return data;
    } catch (error) {
        console.log(error);
    }
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
        window.location.href = "/portal-manutencao/login";
    } catch (error) {
        console.error("Erro ao fazer logout: ", error);
        window.alert("Erro ao fazer logout. Tente novamente");
    }
}