import {
    parseDateOnly,
    formatDateToInput,
    classifyMaintenanceStatusDetailed,
    formatRelativeDays,
    escapeHTML,
    MAINTENANCE_WINDOW_DAYS,
    ONE_DAY_IN_MS,
} from "./utils/maintenanceStatus.js";
import { operationalStatusTone, OPERATIONAL_TONE_COLORS } from "./utils/equipmentStatus.js";

const BASE_PATH = "/portal-manutencao";
const MAINTENANCE_PAGE = `${BASE_PATH}/manutencao`;
const ALERT_LIST_LIMIT = 6;
const ACTIVITY_LIMIT = 6;
const TOP_EQUIPMENT_LIMIT = 5;
const DONUT_MAX_SLICES = 5;

// ===================== Paleta =====================

// categórica (identidade): slots escuros da skill de dataviz, validados contra a superfície do app (#181b1f)
// com scripts/validate_palette.js --mode dark — todos os checks passaram. Ordem fixa, nunca ciclada.
const CATEGORICAL = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
const OTHERS_COLOR = "#5b626c";
const SERIES_COLOR = CATEGORICAL[0];

// status de prazo (estado): mesmas cores da página de manutenções (maintenances.css)
const STATUS_ORDER = ["vencida_critica", "vencida", "hoje", "proxima", "emdia", "primeira"];
const STATUS_META = {
    vencida_critica: { label: "Vencidas há +30 dias", color: "#e2574c" },
    vencida: { label: "Vencidas há até 30 dias", color: "#f0837a" },
    hoje: { label: "Vencem hoje", color: "#f47920" },
    proxima: { label: "Próximos 30 dias", color: "#ffd66b" },
    emdia: { label: "Em dia", color: "#2fc486" },
    primeira: { label: "Sem registro", color: "#767e88" },
};

const TEXT = { primary: "#eef1f4", secondary: "#a6adb6", muted: "#767e88" };
const GRID_COLOR = "rgba(255, 255, 255, 0.06)";
const SURFACE = "#181b1f";

// ===================== Estado =====================

const state = {
    data: null,
    loading: true,
    months: 6,
    tableCards: new Set(),
};

const charts = {};

// ===================== Tema do Chart.js =====================

function applyChartTheme() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = TEXT.secondary;
    Chart.defaults.borderColor = GRID_COLOR;
    Chart.defaults.animation = reduceMotion ? false : { duration: 450, easing: "easeOutQuart" };
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.display = false;

    Object.assign(Chart.defaults.plugins.tooltip, {
        backgroundColor: "#0f1114",
        borderColor: "#2b2f36",
        borderWidth: 1,
        titleColor: TEXT.primary,
        bodyColor: TEXT.secondary,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { weight: "600" },
    });
}

// eixos recessivos: sem linha de borda, grid só no eixo de valor, ticks em tinta secundária
function valueAxis() {
    return {
        beginAtZero: true,
        border: { display: false },
        grid: { color: GRID_COLOR },
        ticks: { precision: 0, color: TEXT.muted, padding: 8 },
    };
}

function categoryAxis(extra = {}) {
    return {
        border: { display: false },
        grid: { display: false },
        ticks: { color: TEXT.secondary, padding: 6, ...extra },
    };
}

// ===================== Dados =====================

async function fetchJson(url) {
    const response = await fetchWithAuth(url);

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

function today() {
    return parseDateOnly(new Date().toISOString());
}

async function loadDashboard() {
    const refreshButton = document.getElementById("refreshDashboardButton");
    refreshButton.classList.add("is-loading");
    refreshButton.disabled = true;
    document.getElementById("lastUpdatedLabel").textContent = "Atualizando…";

    try {
        const [equipments, equipmentsStatus, maintenances] = await Promise.all([
            fetchJson(`${BASE_PATH}/equipments`),
            fetchJson(`${BASE_PATH}/equipments/maintenance-status`),
            fetchJson(`${BASE_PATH}/maintenances`),
        ]);

        const now = today();
        state.data = {
            equipments,
            maintenances,
            statusList: equipmentsStatus.map(equipment => ({
                ...equipment,
                _status: classifyMaintenanceStatusDetailed(equipment.next_maintenance_date, now, MAINTENANCE_WINDOW_DAYS),
            })),
        };
        state.loading = false;

        document.getElementById("dashboardError").classList.remove("is-visible");
        render();

        const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        document.getElementById("lastUpdatedLabel").textContent = `Atualizado às ${time}`;
    } catch (error) {
        console.error(error);
        document.getElementById("lastUpdatedLabel").textContent = "Falha ao atualizar";

        // sem dados anteriores: mostra o erro na página; com dados, mantém o que já estava na tela e avisa
        if (!state.data) {
            document.getElementById("dashboardError").classList.add("is-visible");
        } else if (window.notyf) {
            notyf.error("Não foi possível atualizar o dashboard.");
        }
    } finally {
        refreshButton.classList.remove("is-loading");
        refreshButton.disabled = false;
    }
}

// ===================== Helpers =====================

function countByStatus(statusList) {
    const counts = Object.fromEntries(STATUS_ORDER.map(key => [key, 0]));
    statusList.forEach(equipment => counts[equipment._status.key]++);
    return counts;
}

function groupCount(items, keyFn) {
    const counts = new Map();

    items.forEach(item => {
        const key = keyFn(item) || "Não informado";
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function plural(count, singular, pluralForm) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

function percent(part, total) {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

function maintenanceLink(params) {
    const query = new URLSearchParams(params).toString();
    return query ? `${MAINTENANCE_PAGE}?${query}` : MAINTENANCE_PAGE;
}

// últimos N meses (incluindo o atual) com a contagem de manutenções de cada um
function buildMonthBuckets(maintenances, months) {
    const now = today();
    const buckets = [];

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: capitalize(date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")) + "/" + String(date.getFullYear()).slice(-2),
            fullLabel: capitalize(date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })),
            count: 0,
        });
    }

    maintenances.forEach(maintenance => {
        const date = parseDateOnly(maintenance.maintenance_date);
        if (!date) return;

        const bucket = buckets.find(b => b.year === date.getFullYear() && b.month === date.getMonth());
        if (bucket) bucket.count++;
    });

    return buckets;
}

// ===================== Cabeçalho =====================

function renderGreeting(user) {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    const firstName = (user?.name || "").trim().split(/\s+/)[0];

    document.getElementById("greetingTitle").textContent = firstName ? `${salutation}, ${firstName}` : salutation;

    const date = capitalize(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));
    document.getElementById("greetingSubtitle").textContent = `${date} · Visão geral da manutenção dos equipamentos`;
}

// ===================== KPIs =====================

function setTile(id, { value, foot, href }) {
    const tile = document.getElementById(id);
    tile.querySelector("[data-value]").innerHTML = value;
    tile.querySelector("[data-foot]").innerHTML = foot;
    if (href) tile.href = href;
}

const ARROW_ICON = `<svg class="stat-tile__arrow" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

function sparklineSVG(values) {
    const width = 84;
    const height = 28;
    const max = Math.max(...values, 1);
    const step = width / (values.length - 1);
    const points = values.map((value, index) => [index * step, height - 3 - (value / max) * (height - 6)]);
    const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const [lastX, lastY] = points[points.length - 1];

    return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="${path}"/><circle cx="${lastX}" cy="${lastY}" r="2.5"/></svg>`;
}

function renderKpis() {
    const { equipments, statusList, maintenances } = state.data;
    const counts = countByStatus(statusList);
    const total = statusList.length;

    // conformidade: entre os equipamentos com manutenção registrada, quantos não estão vencidos (mesma regra de /manutencao)
    const withRecord = total - counts.primeira;
    const overdue = counts.vencida + counts.vencida_critica;
    const compliance = percent(withRecord - overdue, withRecord);
    const miniBar = STATUS_ORDER
        .filter(key => counts[key] > 0)
        .map(key => `<span style="flex: ${counts[key]}; background: ${STATUS_META[key].color};" title="${STATUS_META[key].label}: ${counts[key]}"></span>`)
        .join("");

    setTile("tileCompliance", {
        value: withRecord > 0 ? `${compliance}<small>%</small>` : "–",
        foot: withRecord > 0 ? `<span class="mini-bar">${miniBar}</span>` : "Nenhuma manutenção registrada",
    });

    // vencidas: o link cai no filtro exato quando só há um tipo de atraso; senão na lista ordenada por gravidade
    const overdueHref = counts.vencida_critica && !counts.vencida
        ? maintenanceLink({ status: "vencida_critica" })
        : !counts.vencida_critica && counts.vencida
            ? maintenanceLink({ status: "vencida" })
            : MAINTENANCE_PAGE;

    setTile("tileOverdue", {
        value: String(overdue),
        foot: `<span>${counts.vencida_critica ? `<strong>${counts.vencida_critica}</strong> há mais de 30 dias` : "Nenhuma com atraso crítico"}</span>${ARROW_ICON}`,
        href: overdueHref,
    });

    const upcoming = counts.hoje + counts.proxima;
    setTile("tileUpcoming", {
        value: String(upcoming),
        foot: `<span>${counts.hoje ? `<strong>${counts.hoje}</strong> ${counts.hoje === 1 ? "vence" : "vencem"} hoje` : "Nenhuma vence hoje"}</span>${ARROW_ICON}`,
        href: maintenanceLink({ status: counts.hoje && !counts.proxima ? "hoje" : "proxima" }),
    });

    const buckets = buildMonthBuckets(maintenances, 6);
    const current = buckets[buckets.length - 1].count;
    const previous = buckets[buckets.length - 2].count;
    const delta = current - previous;
    const trendIcon = delta > 0
        ? `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const trend = delta === 0
        ? `<span class="trend" title="Mesma quantidade do mês anterior">= mês anterior</span>`
        : `<span class="trend ${delta > 0 ? "trend--up" : "trend--down"}" title="Comparado ao mês anterior">${trendIcon}${delta > 0 ? "+" : ""}${delta} vs. anterior</span>`;

    setTile("tileMonth", {
        value: String(current),
        foot: `${trend}${sparklineSVG(buckets.map(bucket => bucket.count))}`,
    });

    setTile("tileEquipments", {
        value: String(equipments.length),
        foot: `<span>${counts.primeira ? `<strong>${counts.primeira}</strong> sem manutenção registrada` : "Todos com manutenção registrada"}</span>${ARROW_ICON}`,
    });
}

// ===================== Alertas =====================

function alertItemHTML(equipment) {
    const status = equipment._status;
    const relative = formatRelativeDays(status.diffInDays);

    return `
        <li>
            <a class="alert-item" href="${maintenanceLink({ busca: equipment.name })}">
                <span class="alert-item__info">
                    <span class="alert-item__name">${escapeHTML(equipment.name)}</span>
                    <span class="alert-item__meta">${escapeHTML(equipment.sector || "")} · vence ${formatDateToInput(equipment.next_maintenance_date)}</span>
                </span>
                <span class="alert-item__side">
                    <span class="maintenance-status status--${status.key}">${escapeHTML(status.label)}</span>
                    <span class="alert-item__days">${capitalize(relative)}</span>
                </span>
            </a>
        </li>
    `;
}

function renderAlertCard({ containerId, countId, items, emptyText, viewAllHref }) {
    const container = document.getElementById(containerId);
    document.getElementById(countId).textContent = items.length;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="alert-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                ${emptyText}
            </div>
        `;
        return;
    }

    const remaining = items.length - ALERT_LIST_LIMIT;

    container.innerHTML = `
        <ul class="alert-list">${items.slice(0, ALERT_LIST_LIMIT).map(alertItemHTML).join("")}</ul>
        <div class="alert-card__foot">
            <a class="dash-link" href="${viewAllHref}">
                ${remaining > 0 ? `Ver todos (+${remaining})` : "Ver na página de manutenções"}
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
        </div>
    `;
}

function renderAlerts() {
    const { statusList } = state.data;
    const byUrgency = (a, b) => a._status.diffInDays - b._status.diffInDays;

    const overdue = statusList
        .filter(equipment => equipment._status.key === "vencida" || equipment._status.key === "vencida_critica")
        .sort(byUrgency);

    const upcoming = statusList
        .filter(equipment => equipment._status.key === "hoje" || equipment._status.key === "proxima")
        .sort(byUrgency);

    renderAlertCard({
        containerId: "alertOverdue",
        countId: "countOverdue",
        items: overdue,
        emptyText: "Tudo em dia! Nenhuma manutenção vencida.",
        viewAllHref: document.getElementById("tileOverdue").href,
    });

    renderAlertCard({
        containerId: "alertUpcoming",
        countId: "countUpcoming",
        items: upcoming,
        emptyText: "Nenhum vencimento nos próximos 30 dias.",
        viewAllHref: document.getElementById("tileUpcoming").href,
    });
}

// ===================== Cards de gráfico =====================

function setCardState(cardId, { empty }) {
    const card = document.getElementById(cardId);
    card.classList.remove("is-loading");
    card.classList.toggle("is-empty", empty);
    return card;
}

function renderTable(card, headers, rows) {
    card.querySelector("[data-table]").innerHTML = `
        <table class="chart-table">
            <thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead>
            <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHTML(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
    `;
}

function replaceChart(key, canvasId, config) {
    if (charts[key]) {
        charts[key].destroy();
    }

    charts[key] = new Chart(document.getElementById(canvasId), config);
}

function barDataset(data, color) {
    return {
        data,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderRadius: 4,
        borderSkipped: "start",
        maxBarThickness: 40,
        categoryPercentage: 0.7,
    };
}

function renderMonthlyChart() {
    const buckets = buildMonthBuckets(state.data.maintenances, state.months);
    const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const card = setCardState("chartMonthlyCard", { empty: total === 0 });

    document.getElementById("monthlyCaption").textContent =
        `Últimos ${state.months} meses · ${plural(total, "manutenção", "manutenções")} no período`;

    renderTable(card, ["Mês", "Manutenções"], buckets.map(bucket => [bucket.fullLabel, bucket.count]));

    replaceChart("monthly", "chartMonthly", {
        type: "bar",
        data: {
            labels: buckets.map(bucket => bucket.label),
            datasets: [barDataset(buckets.map(bucket => bucket.count), SERIES_COLOR)],
        },
        options: {
            // rótulos sempre na horizontal: com 12 meses o Chart.js pula alguns em vez de girar o texto
            scales: { x: categoryAxis({ maxRotation: 0, autoSkipPadding: 12 }), y: valueAxis() },
            plugins: {
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        title: items => buckets[items[0].dataIndex].fullLabel,
                        label: item => plural(item.parsed.y, "manutenção", "manutenções"),
                    },
                },
            },
        },
    });
}

function renderSituationChart() {
    const counts = countByStatus(state.data.statusList);
    const total = state.data.statusList.length;
    const card = setCardState("chartSituationCard", { empty: total === 0 });

    renderTable(card, ["Status", "Equipamentos", "%"], STATUS_ORDER.map(key => [STATUS_META[key].label, counts[key], `${percent(counts[key], total)}%`]));

    replaceChart("situation", "chartSituation", {
        type: "bar",
        data: {
            labels: STATUS_ORDER.map(key => STATUS_META[key].label),
            datasets: [barDataset(STATUS_ORDER.map(key => counts[key]), STATUS_ORDER.map(key => STATUS_META[key].color))],
        },
        options: {
            indexAxis: "y",
            scales: { x: valueAxis(), y: categoryAxis() },
            // clicar numa barra abre a página de manutenções já filtrada por aquele status
            onClick: (event, elements) => {
                if (elements.length) {
                    window.location.href = maintenanceLink({ status: STATUS_ORDER[elements[0].index] });
                }
            },
            onHover: (event, elements) => {
                event.native.target.style.cursor = elements.length ? "pointer" : "default";
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: item => `${plural(item.parsed.x, "equipamento", "equipamentos")} (${percent(item.parsed.x, total)}%)`,
                        footer: () => "Clique para ver a lista",
                    },
                    footerColor: TEXT.muted,
                    footerFont: { weight: "400", size: 11 },
                },
            },
        },
    });
}

function renderTopChart() {
    const counts = groupCount(state.data.maintenances, maintenance => maintenance.equipment);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_EQUIPMENT_LIMIT);
    const card = setCardState("chartTopCard", { empty: top.length === 0 });

    renderTable(card, ["Equipamento", "Manutenções"], top);

    replaceChart("top", "chartTop", {
        type: "bar",
        data: {
            labels: top.map(([name]) => name),
            datasets: [barDataset(top.map(([, count]) => count), SERIES_COLOR)],
        },
        options: {
            indexAxis: "y",
            scales: {
                x: valueAxis(),
                // nomes longos são cortados no eixo (o nome completo aparece no tooltip e na tabela)
                y: categoryAxis({ callback(value) {
                    const label = this.getLabelForValue(value);
                    return label.length > 22 ? `${label.slice(0, 21)}…` : label;
                } }),
            },
            plugins: {
                tooltip: {
                    displayColors: false,
                    callbacks: { label: item => plural(item.parsed.x, "manutenção registrada", "manutenções registradas") },
                },
            },
        },
    });
}

// até 5 fatias + "Outros"; a cor segue o nome (ordem alfabética entre as fatias exibidas), não a posição no ranking
function donutSlices(counts, colorFor) {
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const shown = sorted.slice(0, DONUT_MAX_SLICES);
    const othersTotal = sorted.slice(DONUT_MAX_SLICES).reduce((sum, [, count]) => sum + count, 0);

    const colors = colorFor(shown.map(([name]) => name));
    const slices = shown.map(([name, count]) => ({ name, count, color: colors[name] }));

    if (othersTotal > 0) {
        slices.push({ name: `Outros (${sorted.length - DONUT_MAX_SLICES})`, count: othersTotal, color: OTHERS_COLOR });
    }

    return slices;
}

function categoricalColors(names) {
    const colors = {};
    [...names].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach((name, index) => {
        colors[name] = CATEGORICAL[index % CATEGORICAL.length];
    });
    return colors;
}

// status operacional: cor semântica por palavra-chave (utils/equipmentStatus.js); o que não for reconhecido recebe cor categórica
function operationalStatusColors(names) {
    const colors = {};
    const unmatched = [];

    names.forEach(name => {
        const tone = operationalStatusTone(name);
        if (tone) {
            colors[name] = OPERATIONAL_TONE_COLORS[tone];
        } else {
            unmatched.push(name);
        }
    });

    return { ...categoricalColors(unmatched), ...colors };
}

function renderDonut({ key, cardId, canvasId, counts, colorFor, label }) {
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const card = setCardState(cardId, { empty: total === 0 });
    const slices = donutSlices(counts, colorFor);

    card.querySelector("[data-donut-total]").textContent = total;
    card.querySelector("[data-legend]").innerHTML = slices.map(slice => `
        <li>
            <span class="legend__swatch" style="background: ${slice.color};"></span>
            <span class="legend__label" title="${escapeHTML(slice.name)}">${escapeHTML(slice.name)}</span>
            <span class="legend__value">${slice.count}</span>
            <span class="legend__pct">${percent(slice.count, total)}%</span>
        </li>
    `).join("");

    renderTable(card, [label, "Equipamentos", "%"], [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => [name, count, `${percent(count, total)}%`]));

    replaceChart(key, canvasId, {
        type: "doughnut",
        data: {
            labels: slices.map(slice => slice.name),
            datasets: [{
                data: slices.map(slice => slice.count),
                backgroundColor: slices.map(slice => slice.color),
                hoverBackgroundColor: slices.map(slice => slice.color),
                borderColor: SURFACE,
                borderWidth: 2,
                hoverOffset: 4,
            }],
        },
        options: {
            cutout: "70%",
            plugins: {
                tooltip: {
                    callbacks: { label: item => ` ${item.parsed} (${percent(item.parsed, total)}%)` },
                },
            },
        },
    });
}

// ===================== Atividade recente =====================

function renderActivity() {
    const list = document.getElementById("activityList");
    const now = today();

    const recent = [...state.data.maintenances]
        .sort((a, b) => (parseDateOnly(b.maintenance_date) - parseDateOnly(a.maintenance_date)) || (b.id - a.id))
        .slice(0, ACTIVITY_LIMIT);

    if (recent.length === 0) {
        list.innerHTML = `<li class="activity__empty">Nenhuma manutenção registrada ainda.</li>`;
        return;
    }

    list.innerHTML = recent.map(maintenance => {
        const date = parseDateOnly(maintenance.maintenance_date);
        const diffInDays = date ? Math.round((date - now) / ONE_DAY_IN_MS) : null;
        const description = (maintenance.description || "").trim();

        return `
            <li class="activity__item">
                <span class="activity__avatar" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div style="min-width: 0;">
                    <div class="activity__text"><strong>${escapeHTML(maintenance.user)}</strong> registrou manutenção em <strong>${escapeHTML(maintenance.equipment)}</strong></div>
                    ${description ? `<div class="activity__desc" title="${escapeHTML(description)}">${escapeHTML(description)}</div>` : ""}
                </div>
                <div class="activity__time">
                    <span>${formatDateToInput(maintenance.maintenance_date)}</span>
                    ${capitalize(formatRelativeDays(diffInDays))}
                </div>
            </li>
        `;
    }).join("");
}

// ===================== Orquestração =====================

function render() {
    if (!state.data) return;

    renderKpis();
    renderAlerts();
    renderMonthlyChart();
    renderSituationChart();
    renderTopChart();
    renderDonut({
        key: "type",
        cardId: "chartTypeCard",
        canvasId: "chartType",
        counts: groupCount(state.data.equipments, equipment => equipment.type),
        colorFor: categoricalColors,
        label: "Tipo",
    });
    renderDonut({
        key: "status",
        cardId: "chartStatusCard",
        canvasId: "chartStatus",
        counts: groupCount(state.data.equipments, equipment => equipment.status),
        colorFor: operationalStatusColors,
        label: "Status",
    });
    renderActivity();
}

function bindEvents() {
    document.getElementById("refreshDashboardButton").addEventListener("click", loadDashboard);
    document.getElementById("retryDashboardButton").addEventListener("click", loadDashboard);

    // período do gráfico mensal (6 / 12 meses)
    document.querySelectorAll("[data-months]").forEach(button => {
        button.addEventListener("click", () => {
            state.months = Number(button.dataset.months);
            document.querySelectorAll("[data-months]").forEach(other => {
                other.setAttribute("aria-pressed", String(other === button));
            });
            if (state.data) renderMonthlyChart();
        });
    });

    // alterna gráfico <-> tabela em cada card
    document.querySelectorAll("[data-toggle-table]").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".chart-card");
            const showTable = !card.classList.contains("show-table");
            card.classList.toggle("show-table", showTable);
            button.setAttribute("aria-pressed", String(showTable));
        });
    });
}

// a saudação usa o mesmo /me da navbar (getLoggedUser é memoizado em apiHelper.js, sem nova requisição)
async function initGreeting() {
    renderGreeting(null);
    const user = await getLoggedUser();
    if (user) renderGreeting(user);
}

applyChartTheme();
bindEvents();
initGreeting();
loadDashboard();
