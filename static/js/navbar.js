/**
 * navbar.js
 * Renderiza a navbar inteira via JS em todas as páginas logadas.
 * Os templates só têm o ponto de montagem: <header class="navbar" id="appNavbar" data-active="..."></header>
 *
 * Depende de apiHelper.js (fetchLoggedUser / handlerLogout), carregado antes deste arquivo.
 */

(function () {
  "use strict";

  const BASE_PATH = "/portal-manutencao";

  const ICONS = {
    brand: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    equipamentos: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    manutencao: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chevron: '<polyline points="6 9 12 15 18 9"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  };

  // única fonte dos links do sistema: adicionar uma página nova é só incluir um item aqui
  const NAV_ITEMS = [
    { key: "dashboard", label: "Dashboard", href: `${BASE_PATH}/dashboard` },
    { key: "equipamentos", label: "Equipamentos", href: `${BASE_PATH}/equipamentos` },
    { key: "manutencao", label: "Manutenções", href: `${BASE_PATH}/manutencao` },
    { key: "usuarios", label: "Usuários", href: `${BASE_PATH}/usuarios`, adminOnly: true },
  ];

  const ROLE_LABELS = {
    administrator: "Administrador",
    employee: "Funcionário",
  };

  const header = document.getElementById("appNavbar");
  if (!header) return;

  // ===================== Helpers =====================

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function icon(name, extraClass) {
    return `<svg ${extraClass ? `class="${extraClass}" ` : ""}viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  }

  // página atual: data-active do template ou, na falta dele, o caminho da URL
  function getActiveKey() {
    if (header.dataset.active) return header.dataset.active;

    const item = NAV_ITEMS.find(navItem => window.location.pathname.startsWith(navItem.href));
    return item ? item.key : "";
  }

  // "João Victor Marques de Freitas" -> "JF"
  function getInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";

    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  // ===================== Templates =====================

  function brandTemplate() {
    return `
      <a class="navbar__brand" href="${BASE_PATH}/dashboard" aria-label="Manutenção de Máquinas — ir para o Dashboard">
        <span class="navbar__brand-icon">${icon("brand")}</span>
        <span class="navbar__brand-full">Manutenção de Máquinas</span>
        <span class="navbar__brand-short">Manutenção</span>
      </a>
    `;
  }

  function toggleTemplate(disabled) {
    return `
      <button type="button" class="navbar__toggle" aria-controls="navbarPanel" aria-expanded="false" aria-label="Abrir menu de navegação" ${disabled ? "disabled" : ""}>
        ${icon("menu")}
      </button>
    `;
  }

  // estado inicial (antes do /me): mesmas dimensões do estado final para não haver salto de layout
  function skeletonTemplate() {
    return `
      ${brandTemplate()}
      <div class="navbar__links" aria-hidden="true">
        <div class="navbar__nav">
          ${NAV_ITEMS.filter(item => !item.adminOnly).map(() => `<span class="navbar__skeleton navbar__skeleton--link"></span>`).join("")}
        </div>
      </div>
      <div class="navbar__actions">
        ${toggleTemplate(true)}
        <div class="navbar__menu">
          <div class="navbar__user navbar__user--skeleton" aria-hidden="true">
            <span class="navbar__skeleton navbar__skeleton--avatar"></span>
            <span class="navbar__user-info">
              <span class="navbar__skeleton navbar__skeleton--text"></span>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function linksTemplate(user) {
    const activeKey = getActiveKey();
    const isAdmin = user && user.role === "administrator";

    return NAV_ITEMS
      .filter(item => !item.adminOnly || isAdmin)
      .map(item => {
        const isActive = item.key === activeKey;
        return `
          <a href="${item.href}" class="nav-link${isActive ? " is-active" : ""}"${isActive ? ' aria-current="page"' : ""}>
            ${icon(item.key)}
            <span>${item.label}</span>
          </a>
        `;
      })
      .join("");
  }

  function profileTemplate(user) {
    const role = ROLE_LABELS[user.role] || user.role || "";
    const secondary = user.email || user.username || "";

    return `
      <div class="navbar__profile">
        <span class="navbar__avatar navbar__avatar--lg" aria-hidden="true">${escapeHTML(getInitials(user.name))}</span>
        <div class="navbar__profile-info">
          <span class="navbar__profile-name">${escapeHTML(user.name)}</span>
          ${secondary ? `<span class="navbar__profile-email">${escapeHTML(secondary)}</span>` : ""}
          ${role ? `<span class="navbar__role-badge">${escapeHTML(role)}</span>` : ""}
        </div>
      </div>
    `;
  }

  function metaTemplate(user) {
    const rows = [
      ["Usuário", user.username],
      ["Setor", user.sector],
      ["Grupo de manutenção", user.maintenance_group],
    ].filter(([, value]) => value);

    if (rows.length === 0) return "";

    return `
      <dl class="navbar__meta">
        ${rows.map(([label, value]) => `
          <div class="navbar__meta-row">
            <dt>${label}</dt>
            <dd title="${escapeHTML(value)}">${escapeHTML(value)}</dd>
          </div>
        `).join("")}
      </dl>
    `;
  }

  function logoutButtonTemplate(role) {
    return `
      <button type="button" class="navbar__dropdown-item navbar__dropdown-item--danger" data-logout ${role ? `role="${role}"` : ""}>
        ${icon("logout")}
        <span>Sair do sistema</span>
      </button>
    `;
  }

  function navbarTemplate(user) {
    const userMenu = user ? `
      <div class="navbar__menu">
        <button type="button" class="navbar__user" id="userMenuButton" aria-haspopup="menu" aria-expanded="false" aria-controls="userMenuDropdown" aria-label="Menu do usuário ${escapeHTML(user.name)}">
          <span class="navbar__avatar" aria-hidden="true">${escapeHTML(getInitials(user.name))}</span>
          <span class="navbar__user-info">
            <span class="navbar__user-name">${escapeHTML(user.name)}</span>
            <span class="navbar__user-role">${escapeHTML(ROLE_LABELS[user.role] || user.role || "")}</span>
          </span>
          ${icon("chevron", "navbar__chevron")}
        </button>

        <div class="navbar__dropdown" id="userMenuDropdown" role="menu" aria-labelledby="userMenuButton">
          <div role="none">
            ${profileTemplate(user)}
            ${metaTemplate(user)}
          </div>
          <div class="navbar__dropdown-divider" role="separator"></div>
          ${logoutButtonTemplate("menuitem")}
        </div>
      </div>
    ` : "";

    const mobileUser = user ? `
      <div class="navbar__mobile-user">
        ${profileTemplate(user)}
        ${metaTemplate(user)}
        ${logoutButtonTemplate()}
      </div>
    ` : "";

    return `
      ${brandTemplate()}
      <div class="navbar__links" id="navbarPanel">
        <nav class="navbar__nav" aria-label="Navegação principal">
          ${linksTemplate(user)}
        </nav>
        ${mobileUser}
      </div>
      <div class="navbar__actions">
        ${toggleTemplate(false)}
        ${userMenu}
      </div>
    `;
  }

  // ===================== Comportamento =====================

  function getUserMenu() {
    return {
      button: document.getElementById("userMenuButton"),
      dropdown: document.getElementById("userMenuDropdown"),
    };
  }

  function setUserMenuOpen(isOpen, { focusFirst = false, returnFocus = false } = {}) {
    const { button, dropdown } = getUserMenu();
    if (!button || !dropdown) return;

    dropdown.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));

    if (isOpen && focusFirst) {
      const firstItem = dropdown.querySelector('[role="menuitem"]');
      if (firstItem) firstItem.focus();
    }

    if (!isOpen && returnFocus) {
      button.focus();
    }
  }

  function isUserMenuOpen() {
    const { dropdown } = getUserMenu();
    return Boolean(dropdown && dropdown.classList.contains("is-open"));
  }

  function setMobilePanelOpen(isOpen) {
    const toggle = header.querySelector(".navbar__toggle");
    const panel = document.getElementById("navbarPanel");
    if (!toggle || !panel) return;

    panel.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");
  }

  function isMobilePanelOpen() {
    const panel = document.getElementById("navbarPanel");
    return Boolean(panel && panel.classList.contains("is-open"));
  }

  async function logout() {
    header.querySelectorAll("[data-logout]").forEach(logoutButton => {
      logoutButton.disabled = true;
      logoutButton.querySelector("span").textContent = "Saindo…";
    });

    try {
      await handlerLogout();
    } catch (error) {
      header.querySelectorAll("[data-logout]").forEach(logoutButton => {
        logoutButton.disabled = false;
        logoutButton.querySelector("span").textContent = "Sair do sistema";
      });
    }
  }

  // listeners ligados uma única vez no <header> (delegação) e no document; sobrevivem às re-renderizações
  function bindEvents() {
    header.addEventListener("click", (event) => {
      if (event.target.closest("#userMenuButton")) {
        setUserMenuOpen(!isUserMenuOpen());
        return;
      }

      if (event.target.closest(".navbar__toggle")) {
        setMobilePanelOpen(!isMobilePanelOpen());
        return;
      }

      const logoutButton = event.target.closest("[data-logout]");
      if (logoutButton) {
        logout();
        return;
      }

      // navegar por um link fecha o painel mobile
      if (event.target.closest(".nav-link")) {
        setMobilePanelOpen(false);
      }
    });

    // clique fora fecha o menu do usuário e o painel mobile
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) {
        setUserMenuOpen(false);
        setMobilePanelOpen(false);
      } else if (!event.target.closest(".navbar__menu")) {
        setUserMenuOpen(false);
      }
    });

    header.addEventListener("keydown", (event) => {
      const { button, dropdown } = getUserMenu();

      // seta para baixo no botão abre o menu já focando o primeiro item
      if (event.target === button && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
        if (event.key === "ArrowDown" || !isUserMenuOpen()) {
          event.preventDefault();
          setUserMenuOpen(true, { focusFirst: true });
        }
        return;
      }

      // setas navegam entre os itens do menu (circular)
      if (dropdown && dropdown.contains(event.target) && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const items = [...dropdown.querySelectorAll('[role="menuitem"]:not(:disabled)')];
        const index = items.indexOf(document.activeElement);
        const next = event.key === "ArrowDown" ? index + 1 : index - 1;
        items[(next + items.length) % items.length]?.focus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (isUserMenuOpen()) {
        setUserMenuOpen(false, { returnFocus: true });
      }

      if (isMobilePanelOpen()) {
        setMobilePanelOpen(false);
        header.querySelector(".navbar__toggle")?.focus();
      }
    });

    // ao voltar para o layout desktop o painel mobile não deve ficar "preso" aberto
    window.matchMedia("(min-width: 769px)").addEventListener("change", (event) => {
      if (event.matches) setMobilePanelOpen(false);
    });

    // sombra na navbar quando a página rola
    const updateScrolled = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
    window.addEventListener("scroll", updateScrolled, { passive: true });
    updateScrolled();
  }

  // ===================== Inicialização =====================

  async function init() {
    header.setAttribute("aria-busy", "true");
    header.innerHTML = skeletonTemplate();
    bindEvents();

    const { user, status } = await fetchLoggedUser();

    // sessão expirada ou inválida: nenhuma página funciona sem ela, então volta para o login
    if (status === 401) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`${BASE_PATH}/login?motivo=sessao&next=${next}`);
      return;
    }

    // navbar completa de uma só vez (links já filtrados pelo perfil + usuário)
    header.innerHTML = navbarTemplate(user);
    header.removeAttribute("aria-busy");

    if (user) {
      document.dispatchEvent(new CustomEvent("navbar:user", { detail: user }));
    }
  }

  init();
})();
