(function () {
  "use strict";

  // TOGGLE DE VISIBILIDADE DA SENHA
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
      button.setAttribute(
        "aria-label",
        estaVisivel ? "Mostrar senha" : "Ocultar senha",
      );
    });
  }

  // ENVIO DO FORMULÁRIO E AUTENTICAÇÃO NO SISTEMA
  function setupSubmit() {
    const loginForm = document.getElementById("loginForm");
    const messageLogin = document.getElementById("messageLogin");

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setLoading(true);

      messageLogin.textContent = "";
      messageLogin.className = "";

      const formData = new FormData(loginForm);
      let data = Object.fromEntries(formData.entries());

      // validação para remover todos os espaços em branco dos campos antes de enviar para o backend
      for (let key in data) {
        if (typeof data[key] === "string") {
          data[key] = data[key].trim();
        }
      }

      try {
        const response = await fetch("/portal-manutencao/login", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          let errorMessage = "Houve um erro ao tentar fazer login";

          try {
            const errorJSON = await response.json();

            if (errorJSON?.message) {
              errorMessage = errorJSON.message;
            }

            throw new Error(errorMessage);
          } catch (error) {
            if (error instanceof SyntaxError) {
              // resposta não é JSON, tenta ler como texto
              errorMessage = `Erro ${response.status}: Falha ao fazer login`;
            } else {
              errorMessage = error.message;
            }
          }

          throw new Error(errorMessage);
        }

        const tokenData = await response.json();
        localStorage.setItem("token", tokenData.token || "");
        window.location.href = "/portal-manutencao/dashboard";
        notyf.success("Login realizado com sucesso");
      } catch (error) {
        messageLogin.textContent = error.message || error;
        messageLogin.className = "error";
      } finally {
        setLoading(false);
      }
    });
  }

  // SUBMIT / AUTENTICAÇÃO
  function setLoading(estaCarregando) {
    const button = document.getElementById("loginButton");
    button.classList.toggle("is-loading", estaCarregando);
    button.disabled = estaCarregando;
  }

  // INICIALIZAÇÃO
  document.addEventListener("DOMContentLoaded", function () {
    setupPasswordToggle();
    setupSubmit();
  });
})();
