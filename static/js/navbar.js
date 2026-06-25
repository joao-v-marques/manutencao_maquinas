/**
 * navbar.js
 * Comportamento padrão da navbar, reutilizado em todas as páginas.
 *
 * NÃO faz fetch para o backend (conforme orientação do projeto).
 * Os pontos de integração estão isolados nas funções abaixo —
 * basta substituir o conteúdo delas quando o backend estiver pronto.
 */

(function () {
  "use strict";

  /**
   * Retorna os dados do usuário logado.
   * Integração futura: buscar do backend / sessão (ex: GET /api/usuario/sessao).
   */
  function getUsuarioLogado() {
    return {
      nome: "Usuário",
      cargo: "Cargo não informado",
    };
  }

  function getIniciais(nomeCompleto) {
    if (!nomeCompleto) return "--";
    const partes = nomeCompleto.trim().split(/\s+/);
    const primeira = partes[0]?.[0] || "";
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
    return (primeira + ultima).toUpperCase();
  }

  async function renderUsuario() {
    const user = await getLoggedUser();

    let userRole = "Carregando...";
    
    if (user.role == "administrator") {
      userRole = "Administrador";
    } else if (user.role == "employee") {
      userRole = "Funcionário";
    }

    const nameLabel = document.getElementById("userNameLabel");
    const roleLabel = document.getElementById("userRoleLabel");

    if (nameLabel) nameLabel.textContent = user.name;
    if (roleLabel) roleLabel.textContent = userRole;
  }

  function setupUserMenu() {
    const button = document.getElementById("userMenuButton");
    const dropdown = document.getElementById("userMenuDropdown");
    if (!button || !dropdown) return;

    function closeMenu() {
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    }

    function toggleMenu() {
      const isOpen = dropdown.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    }

    button.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", function (event) {
      if (!dropdown.contains(event.target) && event.target !== button) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  // encerra a sessão do usuário
  function setupLogout() {
    const logoutButton = document.getElementById("logoutButton");
    
    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener("click", handlerLogout);
  }

  function setupMobileToggle() {
    const toggle = document.querySelector(".navbar__toggle");
    const links = document.querySelector(".navbar__links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderUsuario();
    setupUserMenu();
    setupLogout();
    setupMobileToggle();
  });
})();