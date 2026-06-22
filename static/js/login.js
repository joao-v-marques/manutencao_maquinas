/**
 * login.js
 * Lógica da página de Login.
 *
 * NÃO faz fetch para o backend (conforme orientação do projeto).
 * O envio do formulário está isolado em autenticar(), pronto para
 * receber uma chamada real (ex: POST /api/auth/login) no futuro.
 */

(function () {
  "use strict";

  /* =========================================================
     1. TOGGLE DE VISIBILIDADE DA SENHA
     ========================================================= */

  function setupPasswordToggle() {
    const button = document.getElementById("togglePasswordButton");
    const input = document.getElementById("password");
    const iconEye = button.querySelector(".icon-eye");
    const iconEyeOff = button.querySelector(".icon-eye-off");

    button.addEventListener("click", function () {
      const estaVisivel = input.type === "text";

      input.type = estaVisivel ? "password" : "text";
      iconEye.style.display = estaVisivel ? "block" : "none";
      iconEyeOff.style.display = estaVisivel ? "none" : "block";

      button.setAttribute("aria-pressed", String(!estaVisivel));
      button.setAttribute("aria-label", estaVisivel ? "Mostrar senha" : "Ocultar senha");
    });
  }

  /* =========================================================
     2. VALIDAÇÃO DO FORMULÁRIO
     ========================================================= */

  function limparErros() {
    document.getElementById("usernameError").classList.remove("is-visible");
    document.getElementById("passwordError").classList.remove("is-visible");
    document.getElementById("username").classList.remove("has-error");
    document.getElementById("password").classList.remove("has-error");
    ocultarAlerta();
  }

  function validarFormulario() {
    let valido = true;

    const username = document.getElementById("username");
    const password = document.getElementById("password");

    if (!username.value.trim()) {
      document.getElementById("usernameError").classList.add("is-visible");
      username.classList.add("has-error");
      valido = false;
    }

    if (!password.value.trim()) {
      document.getElementById("passwordError").classList.add("is-visible");
      password.classList.add("has-error");
      valido = false;
    }

    return valido;
  }

  function mostrarAlerta(mensagem) {
    const alerta = document.getElementById("loginAlert");
    document.getElementById("loginAlertMessage").textContent = mensagem;
    alerta.classList.add("is-visible");
  }

  function ocultarAlerta() {
    document.getElementById("loginAlert").classList.remove("is-visible");
  }

  /* =========================================================
     3. SUBMIT / AUTENTICAÇÃO
     ========================================================= */

  function setLoading(estaCarregando) {
    const button = document.getElementById("loginButton");
    button.classList.toggle("is-loading", estaCarregando);
    button.disabled = estaCarregando;
  }

  // Ponto de integração: POST /api/auth/login { username, password }
  function autenticar(username, password) {
    console.log("[login] Autenticar usuário (integrar com backend):", { username });

    // Simulação temporária de chamada ao backend.
    // Substituir por uma chamada fetch real quando o backend estiver pronto, ex:
    //
    // return fetch("/api/auth/login", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ username, password }),
    // }).then((res) => {
    //   if (!res.ok) throw new Error("Usuário ou senha inválidos.");
    //   return res.json();
    // });

    return new Promise((resolve) => setTimeout(resolve, 800));
  }

  function setupSubmit() {
    const form = document.getElementById("loginForm");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      limparErros();

      if (!validarFormulario()) return;

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;

      setLoading(true);

      autenticar(username, password)
        .then(function () {
          // Integração futura: redirecionar para o dashboard após login bem-sucedido.
          // window.location.href = "/dashboard";
          console.log("[login] Login simulado com sucesso.");
        })
        .catch(function () {
          mostrarAlerta("Usuário ou senha inválidos.");
        })
        .finally(function () {
          setLoading(false);
        });
    });
  }

  /* =========================================================
     4. INICIALIZAÇÃO
     ========================================================= */

  document.addEventListener("DOMContentLoaded", function () {
    setupPasswordToggle();
    setupSubmit();
  });
})();