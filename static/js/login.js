(function () {
  "use strict";

  const BASE_PATH = "/portal-manutencao";
  const DEFAULT_DESTINATION = `${BASE_PATH}/dashboard`;
  const REMEMBER_KEY = "login:rememberedUsername";

  const ALERT_ICONS = {
    error: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  };

  // mensagens exibidas conforme o motivo de ter chegado ao login (definido por navbar.js / handlerLogout)
  const REASON_MESSAGES = {
    sessao: { type: "info", text: "Sua sessão expirou. Entre novamente para continuar." },
    saiu: { type: "success", text: "Você saiu do sistema com segurança." },
  };

  const elements = {
    card: document.getElementById("loginCard"),
    form: document.getElementById("loginForm"),
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    remember: document.getElementById("rememberUser"),
    button: document.getElementById("loginButton"),
    buttonLabel: document.querySelector("#loginButton .btn-login__label"),
    alert: document.getElementById("loginAlert"),
    alertMessage: document.getElementById("loginAlertMessage"),
    alertIcon: document.querySelector("#loginAlert .login-alert__icon"),
    capsLockWarning: document.getElementById("capsLockWarning"),
    togglePassword: document.getElementById("togglePasswordButton"),
  };

  const params = new URLSearchParams(window.location.search);

  // ===================== Destino pós-login =====================

  // só aceita caminhos internos do sistema (evita redirecionamento para sites externos via ?next=)
  function getSafeDestination(next) {
    if (!next || !next.startsWith(`${BASE_PATH}/`) || next.startsWith("//")) {
      return DEFAULT_DESTINATION;
    }

    if (next.startsWith(`${BASE_PATH}/login`)) {
      return DEFAULT_DESTINATION;
    }

    return next;
  }

  const destination = getSafeDestination(params.get("next"));

  // ===================== Armazenamento local (só o nome de usuário, nunca a senha) =====================

  function readRememberedUsername() {
    try {
      return localStorage.getItem(REMEMBER_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function saveRememberedUsername(username) {
    try {
      if (username) {
        localStorage.setItem(REMEMBER_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (error) {
      // armazenamento indisponível (modo privado, bloqueio): segue sem lembrar
    }
  }

  // ===================== Alerta =====================

  function showAlert(type, message) {
    elements.alert.className = `login-alert${type === "error" ? "" : ` login-alert--${type}`}`;
    elements.alertIcon.innerHTML = ALERT_ICONS[type] || ALERT_ICONS.error;
    elements.alertMessage.textContent = message;
    elements.alert.hidden = false;
  }

  function hideAlert() {
    elements.alert.hidden = true;
  }

  function shakeCard() {
    elements.card.classList.remove("is-shaking");
    // força reflow para reiniciar a animação quando o erro se repete
    void elements.card.offsetWidth;
    elements.card.classList.add("is-shaking");
  }

  // ===================== Validação por campo =====================

  const FIELD_MESSAGES = {
    username: "Informe seu usuário.",
    password: "Informe sua senha.",
  };

  function setFieldError(input, message) {
    const field = input.closest(".login-field");
    const error = document.getElementById(`${input.id}Error`);

    field.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", String(Boolean(message)));
    error.textContent = message || "";
  }

  function validateForm() {
    let firstInvalid = null;

    [elements.username, elements.password].forEach(input => {
      const isEmpty = !input.value.trim();
      setFieldError(input, isEmpty ? FIELD_MESSAGES[input.id] : "");

      if (isEmpty && !firstInvalid) {
        firstInvalid = input;
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }

    return true;
  }

  // ===================== Estados do botão =====================

  function setLoading(isLoading) {
    elements.button.classList.toggle("is-loading", isLoading);
    elements.button.disabled = isLoading;
    elements.username.disabled = isLoading;
    elements.password.disabled = isLoading;
    elements.buttonLabel.textContent = isLoading ? "Entrando…" : "Entrar";
  }

  function setSuccess() {
    elements.button.classList.remove("is-loading");
    elements.button.classList.add("is-success");
    elements.buttonLabel.textContent = "Tudo certo, redirecionando…";
  }

  // ===================== Comportamentos =====================

  function setupPasswordToggle() {
    elements.togglePassword.addEventListener("click", () => {
      const isVisible = elements.password.type === "text";

      elements.password.type = isVisible ? "password" : "text";
      elements.togglePassword.setAttribute("aria-pressed", String(!isVisible));
      elements.togglePassword.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
      elements.password.focus();
    });
  }

  function setupCapsLockWarning() {
    const update = (event) => {
      if (typeof event.getModifierState === "function") {
        elements.capsLockWarning.hidden = !event.getModifierState("CapsLock");
      }
    };

    elements.password.addEventListener("keydown", update);
    elements.password.addEventListener("keyup", update);
    elements.password.addEventListener("blur", () => {
      elements.capsLockWarning.hidden = true;
    });
  }

  // limpa o erro do campo assim que o usuário volta a digitar
  function setupLiveValidation() {
    [elements.username, elements.password].forEach(input => {
      input.addEventListener("input", () => {
        if (input.closest(".login-field").classList.contains("is-invalid") && input.value.trim()) {
          setFieldError(input, "");
        }
      });
    });
  }

  async function readErrorMessage(response) {
    const text = await response.text();

    try {
      return JSON.parse(text)?.message || `Erro ${response.status}: não foi possível entrar.`;
    } catch (error) {
      return `Erro ${response.status}: não foi possível entrar.`;
    }
  }

  function setupSubmit() {
    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideAlert();

      if (!validateForm()) {
        shakeCard();
        return;
      }

      const username = elements.username.value.trim();
      // mesmo tratamento da versão anterior (e do cadastro de usuários): espaços nas pontas são removidos
      const password = elements.password.value.trim();

      setLoading(true);

      try {
        const response = await fetch(`${BASE_PATH}/login`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        saveRememberedUsername(elements.remember.checked ? username : "");
        setSuccess();
        window.location.assign(destination);
      } catch (error) {
        const message = error instanceof TypeError
          ? "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
          : error.message;

        setLoading(false);
        showAlert("error", message);
        shakeCard();

        // credenciais erradas: limpa a senha e deixa pronto para redigitar
        elements.password.value = "";
        elements.password.focus();
      }
    });
  }

  // se já existe uma sessão válida, não faz sentido mostrar o formulário
  async function redirectIfAlreadyLogged() {
    try {
      const response = await fetch(`${BASE_PATH}/me`, { credentials: "same-origin" });
      const isJSON = (response.headers.get("content-type") || "").includes("application/json");

      if (response.ok && !response.redirected && isJSON) {
        window.location.replace(destination);
      }
    } catch (error) {
      // sem conexão ou sem sessão: segue na tela de login
    }
  }

  // ===================== Inicialização =====================

  function init() {
    document.getElementById("currentYear").textContent = new Date().getFullYear();

    const reason = REASON_MESSAGES[params.get("motivo")];
    if (reason) {
      showAlert(reason.type, reason.text);
    }

    const rememberedUsername = readRememberedUsername();
    if (rememberedUsername) {
      elements.username.value = rememberedUsername;
      elements.remember.checked = true;
      elements.password.focus();
    } else {
      elements.username.focus();
    }

    setupPasswordToggle();
    setupCapsLockWarning();
    setupLiveValidation();
    setupSubmit();
    redirectIfAlreadyLogged();
  }

  init();
})();
