/**
 * dashboard.js
 * Lógica da página de Dashboard.
 *
 * NÃO faz fetch para o backend (conforme orientação do projeto).
 * Todos os dados vêm de funções "getX()" que hoje retornam mocks.
 *
 * Para integrar com o backend depois, basta trocar o corpo de cada
 * função "getX()" por uma chamada fetch (ou async/await) que retorne
 * exatamente o mesmo formato de dados já usado pelos mocks abaixo.
 */

(function () {
  "use strict";

  /* =========================================================
     1. FONTES DE DADOS (mock — substituir por fetch no futuro)
     ========================================================= */

  // Ponto de integração: GET /api/dashboard/kpis
  function getKpis() {
    return {
      totalEquipamentos: 142,
      emOperacao: 108,
      emManutencao: 14,
      vencidos: 6,
      proximos30Dias: 11,
      manutencoesNoMes: 27,
      variacaoManutencoesNoMes: 12, // % em relação ao mês anterior
    };
  }

  // Ponto de integração: GET /api/dashboard/manutencoes-por-mes
  function getManutencoesPorMes() {
    return {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      valores: [18, 22, 15, 30, 24, 27],
    };
  }

  // Ponto de integração: GET /api/dashboard/equipamentos-por-setor
  function getEquipamentosPorSetor() {
    return {
      labels: ["Produção", "Manutenção", "Logística", "Qualidade", "Administrativo"],
      valores: [54, 21, 32, 18, 17],
    };
  }

  // Ponto de integração: GET /api/dashboard/equipamentos-por-tipo
  function getEquipamentosPorTipo() {
    return {
      labels: ["Máquinas CNC", "Empilhadeiras", "Compressores", "Esteiras", "Geradores"],
      valores: [38, 24, 19, 33, 28],
    };
  }

  // Ponto de integração: GET /api/dashboard/status-equipamentos
  function getStatusEquipamentos() {
    return {
      labels: ["Em operação", "Em manutenção", "Parado", "Inativo"],
      valores: [108, 14, 12, 8],
    };
  }

  // Ponto de integração: GET /api/dashboard/alertas/vencidos
  function getEquipamentosVencidos() {
    return [
      { nome: "Compressor de Ar #04", setor: "Produção", diasVencido: 12 },
      { nome: "Empilhadeira Elétrica #02", setor: "Logística", diasVencido: 7 },
      { nome: "Torno CNC #11", setor: "Produção", diasVencido: 5 },
      { nome: "Gerador Diesel #01", setor: "Administrativo", diasVencido: 3 },
      { nome: "Esteira Transportadora #06", setor: "Produção", diasVencido: 2 },
      { nome: "Fresadora #03", setor: "Produção", diasVencido: 1 },
    ];
  }

  // Ponto de integração: GET /api/dashboard/alertas/proximos
  function getEquipamentosProximos() {
    return [
      { nome: "Caldeira Industrial #01", setor: "Produção", diasRestantes: 2 },
      { nome: "Empilhadeira a Gás #05", setor: "Logística", diasRestantes: 6 },
      { nome: "Compressor de Ar #02", setor: "Produção", diasRestantes: 9 },
      { nome: "Bomba Hidráulica #08", setor: "Manutenção", diasRestantes: 14 },
      { nome: "Painel Elétrico #03", setor: "Qualidade", diasRestantes: 21 },
      { nome: "Torno Mecânico #07", setor: "Produção", diasRestantes: 27 },
    ];
  }

  /* =========================================================
     2. HELPERS
     ========================================================= */

  function formatarNumero(valor) {
    return new Intl.NumberFormat("pt-BR").format(valor);
  }

  function getCssVar(nome) {
    return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  }

  function getChartColors() {
    return [
      getCssVar("--color-chart-1"),
      getCssVar("--color-chart-2"),
      getCssVar("--color-chart-3"),
      getCssVar("--color-chart-4"),
      getCssVar("--color-chart-5"),
    ];
  }

  function getChartBaseOptions() {
    const textMuted = getCssVar("--color-text-muted");
    const border = getCssVar("--color-border");

    return {
      textMuted,
      border,
      font: {
        family: getComputedStyle(document.body).fontFamily,
        size: 12,
      },
    };
  }

  /* =========================================================
     3. RENDERIZAÇÃO DOS CARDS (KPIs)
     ========================================================= */

  function renderKpis() {
    const dados = getKpis();

    setKpiValue("kpiTotalEquipamentos", dados.totalEquipamentos);
    setKpiValue("kpiEmOperacao", dados.emOperacao);
    setKpiValue("kpiEmManutencao", dados.emManutencao);
    setKpiValue("kpiVencidos", dados.vencidos);
    setKpiValue("kpiProximos", dados.proximos30Dias);
    setKpiValue("kpiManutencoesMes", dados.manutencoesNoMes);

    const trendEl = document.getElementById("kpiManutencoesMesTrend");
    if (trendEl) {
      const variacao = dados.variacaoManutencoesNoMes;
      const positivo = variacao >= 0;
      trendEl.classList.toggle("kpi-card__trend--up", positivo);
      trendEl.classList.toggle("kpi-card__trend--down", !positivo);
      trendEl.textContent = `${positivo ? "+" : ""}${variacao}% vs. mês anterior`;
    }
  }

  function setKpiValue(elementId, valor) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = formatarNumero(valor);
    el.classList.remove("is-skeleton");
  }

  /* =========================================================
     4. RENDERIZAÇÃO DOS GRÁFICOS (Chart.js)
     ========================================================= */

  const chartInstances = {};

  function destroyChartIfExists(key) {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      delete chartInstances[key];
    }
  }

  function toggleEmptyState(canvasId, emptyId, estaVazio) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (canvas) canvas.style.display = estaVazio ? "none" : "block";
    if (empty) empty.classList.toggle("is-visible", estaVazio);
  }

  function renderManutencoesPorMes() {
    const { labels, valores } = getManutencoesPorMes();
    const estaVazio = !valores || valores.length === 0;
    toggleEmptyState("chartManutencoesPorMes", "emptyManutencoesPorMes", estaVazio);
    if (estaVazio) return;

    const ctx = document.getElementById("chartManutencoesPorMes");
    const { textMuted, border, font } = getChartBaseOptions();
    const cor = getCssVar("--color-chart-1");

    destroyChartIfExists("manutencoesPorMes");
    chartInstances.manutencoesPorMes = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Manutenções",
          data: valores,
          backgroundColor: cor,
          borderRadius: 6,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textMuted, font } },
          y: {
            beginAtZero: true,
            grid: { color: border },
            ticks: { color: textMuted, font, precision: 0 },
          },
        },
      },
    });
  }

  function renderDoughnut(canvasId, emptyId, instanceKey, labels, valores) {
    const estaVazio = !valores || valores.length === 0;
    toggleEmptyState(canvasId, emptyId, estaVazio);
    if (estaVazio) return;

    const ctx = document.getElementById(canvasId);
    const { textMuted, font } = getChartBaseOptions();
    const cores = getChartColors();

    destroyChartIfExists(instanceKey);
    chartInstances[instanceKey] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: cores,
          borderColor: getCssVar("--color-surface"),
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: textMuted, font, boxWidth: 10, boxHeight: 10, padding: 12 },
          },
        },
      },
    });
  }

  function renderPorSetor() {
    const { labels, valores } = getEquipamentosPorSetor();
    renderDoughnut("chartPorSetor", "emptyPorSetor", "porSetor", labels, valores);
  }

  function renderPorTipo() {
    const { labels, valores } = getEquipamentosPorTipo();
    renderDoughnut("chartPorTipo", "emptyPorTipo", "porTipo", labels, valores);
  }

  function renderStatus() {
    const { labels, valores } = getStatusEquipamentos();
    renderDoughnut("chartStatus", "emptyStatus", "status", labels, valores);
  }

  function renderGraficos() {
    renderManutencoesPorMes();
    renderPorSetor();
    renderPorTipo();
    renderStatus();
  }

  /* =========================================================
     5. RENDERIZAÇÃO DOS ALERTAS
     ========================================================= */

  function renderListaAlertas({ listId, emptyId, countId, itens, montarItem }) {
    const lista = document.getElementById(listId);
    const empty = document.getElementById(emptyId);
    const count = document.getElementById(countId);
    if (!lista) return;

    lista.innerHTML = "";

    if (count) count.textContent = formatarNumero(itens.length);

    const estaVazio = itens.length === 0;
    if (empty) empty.classList.toggle("is-visible", estaVazio);
    lista.style.display = estaVazio ? "none" : "block";

    itens.forEach((item) => {
      const li = document.createElement("li");
      li.className = "alert-item";
      li.innerHTML = montarItem(item);
      lista.appendChild(li);
    });
  }

  function renderAlertaVencidos() {
    const itens = getEquipamentosVencidos();
    renderListaAlertas({
      listId: "listVencidos",
      emptyId: "emptyVencidos",
      countId: "countVencidos",
      itens,
      montarItem: (item) => `
        <span class="alert-item__dot" aria-hidden="true"></span>
        <span class="alert-item__info">
          <span class="alert-item__name">${item.nome}</span>
          <span class="alert-item__meta">${item.setor}</span>
        </span>
        <span class="alert-item__days">${item.diasVencido}d vencido</span>
      `,
    });
  }

  function renderAlertaProximos() {
    const itens = getEquipamentosProximos();
    renderListaAlertas({
      listId: "listProximos",
      emptyId: "emptyProximos",
      countId: "countProximos",
      itens,
      montarItem: (item) => `
        <span class="alert-item__dot" aria-hidden="true"></span>
        <span class="alert-item__info">
          <span class="alert-item__name">${item.nome}</span>
          <span class="alert-item__meta">${item.setor}</span>
        </span>
        <span class="alert-item__days">em ${item.diasRestantes}d</span>
      `,
    });
  }

  function renderAlertas() {
    renderAlertaVencidos();
    renderAlertaProximos();
  }

  /* =========================================================
     6. ATUALIZAÇÃO GERAL / BOTÃO "ATUALIZAR"
     ========================================================= */

  function atualizarHorario() {
    const el = document.getElementById("lastUpdatedLabel");
    if (!el) return;
    const agora = new Date();
    const horario = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    el.textContent = `Atualizado às ${horario}`;
  }

  function carregarDashboard() {
    renderKpis();
    renderGraficos();
    renderAlertas();
    atualizarHorario();
  }

  function setupRefreshButton() {
    const button = document.getElementById("refreshButton");
    if (!button) return;

    button.addEventListener("click", function () {
      button.classList.add("is-loading");
      button.disabled = true;

      // Pequeno atraso simulando a busca de dados no backend.
      setTimeout(function () {
        carregarDashboard();
        button.classList.remove("is-loading");
        button.disabled = false;
      }, 500);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    carregarDashboard();
    setupRefreshButton();
  });
})();