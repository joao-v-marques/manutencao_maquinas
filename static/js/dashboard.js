import { parseDateOnly, classifyMaintenanceStatus } from "./utils/maintenanceStatus.js";

// no dashboard, "próximo do vencimento" segue a mesma janela anunciada nos cards/alertas (30 dias)
const DASHBOARD_MAINTENANCE_WINDOW_DAYS = 30;
const MONTHS_IN_CHART = 6;

// instâncias ativas dos gráficos, para poderem ser destruídas antes de um novo desenho (evita erro de "canvas já em uso")
const chartInstances = {};

/* ===================== helpers genéricos ===================== */

function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function fetchJson(url) {
    const response = await fetchWithAuth(url);

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

// busca em paralelo tudo que o dashboard precisa do backend
async function fetchDashboardData() {
    const [equipments, equipmentsStatus, maintenances] = await Promise.all([
        fetchJson("/portal-manutencao/equipments"),
        fetchJson("/portal-manutencao/equipments/maintenance-status"),
        fetchJson("/portal-manutencao/maintenances"),
    ]);

    return { equipments, equipmentsStatus, maintenances };
}

// agrupa uma lista contando ocorrências por chave, preservando a ordem de primeira aparição
function groupCountBy(items, keyFn) {
    const counts = new Map();

    items.forEach(item => {
        const key = keyFn(item) || "Não informado";
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
}

/* ===================== cards (KPIs) ===================== */
function computeKpis(equipments, equipmentsStatus, maintenances, today) {
    const vencidos = equipmentsStatus.filter(equipment =>
        classifyMaintenanceStatus(equipment.next_maintenance_date, today, DASHBOARD_MAINTENANCE_WINDOW_DAYS).key === "vencida"
    ).length;

    const proximos = equipmentsStatus.filter(equipment => {
        const status = classifyMaintenanceStatus(equipment.next_maintenance_date, today, DASHBOARD_MAINTENANCE_WINDOW_DAYS).key;
        return status === "hoje" || status === "proxima";
    }).length;

    const monthBuckets = buildLastSixMonthsBuckets(maintenances, today);
    const currentMonth = monthBuckets[monthBuckets.length - 1];
    const previousMonth = monthBuckets[monthBuckets.length - 2];

    return {
        totalEquipamentos: equipments.length,
        vencidos,
        proximos,
        manutencoesMes: currentMonth.count,
        manutencoesMesDelta: currentMonth.count - previousMonth.count,
    };
}

function renderKpis(kpis) {
    document.getElementById("kpiTotalEquipamentos").textContent = kpis.totalEquipamentos;
    document.getElementById("kpiVencidos").textContent = kpis.vencidos;
    document.getElementById("kpiProximos").textContent = kpis.proximos;
    document.getElementById("kpiManutencoesMes").textContent = kpis.manutencoesMes;

    document.querySelectorAll(".kpi-card__value").forEach(value => value.classList.remove("is-skeleton"));

    const trend = document.getElementById("kpiManutencoesMesTrend");
    const delta = kpis.manutencoesMesDelta;

    trend.classList.remove("kpi-card__trend--up", "kpi-card__trend--down");

    if (delta > 0) {
        trend.classList.add("kpi-card__trend--up");
        trend.textContent = `+${delta} em relação ao mês anterior`;
    } else if (delta < 0) {
        trend.classList.add("kpi-card__trend--down");
        trend.textContent = `${delta} em relação ao mês anterior`;
    } else {
        trend.textContent = "Igual ao mês anterior";
    }
}

/* ===================== alertas ===================== */

function buildAlertItemHtml(equipment, status) {
    const daysLabel = status.key === "vencida"
        ? `${Math.abs(status.diffInDays)}d atraso`
        : status.key === "hoje"
            ? "Hoje"
            : `em ${status.diffInDays}d`;

    return `
        <li class="alert-item">
            <span class="alert-item__dot"></span>
            <span class="alert-item__info">
                <span class="alert-item__name">${equipment.name}</span>
                <span class="alert-item__meta">${equipment.sector}</span>
            </span>
            <span class="alert-item__days">${daysLabel}</span>
        </li>
    `;
}

// preenche uma lista de alerta (vencidos ou próximos) e alterna entre lista e estado vazio
function renderAlertList({ listId, emptyId, countId, equipments }) {
    const listElement = document.getElementById(listId);
    const emptyElement = document.getElementById(emptyId);
    const countElement = document.getElementById(countId);

    countElement.textContent = equipments.length;

    listElement.innerHTML = equipments
        .map(({ equipment, status }) => buildAlertItemHtml(equipment, status))
        .join("");

    emptyElement.classList.toggle("is-visible", equipments.length === 0);
}

function renderAlerts(equipmentsStatus, today) {
    const classified = equipmentsStatus
        .map(equipment => ({
            equipment,
            status: classifyMaintenanceStatus(equipment.next_maintenance_date, today, DASHBOARD_MAINTENANCE_WINDOW_DAYS),
        }));

    const overdue = classified
        .filter(item => item.status.key === "vencida")
        .sort((a, b) => a.status.diffInDays - b.status.diffInDays);

    const upcoming = classified
        .filter(item => item.status.key === "hoje" || item.status.key === "proxima")
        .sort((a, b) => a.status.diffInDays - b.status.diffInDays);

    renderAlertList({ listId: "listVencidos", emptyId: "emptyVencidos", countId: "countVencidos", equipments: overdue });
    renderAlertList({ listId: "listProximos", emptyId: "emptyProximos", countId: "countProximos", equipments: upcoming });
}

/* ===================== gráficos ===================== */

// desenha (ou redesenha) um gráfico de rosca a partir de um Map label->quantidade
function renderDistributionChart({ canvasId, emptyId, chartKey, countsMap }) {
    const canvas = document.getElementById(canvasId);
    const emptyElement = document.getElementById(emptyId);

    if (chartInstances[chartKey]) {
        chartInstances[chartKey].destroy();
        delete chartInstances[chartKey];
    }

    if (countsMap.size === 0) {
        emptyElement.classList.add("is-visible");
        return;
    }

    emptyElement.classList.remove("is-visible");

    const palette = [
        getCssVar("--color-chart-1"),
        getCssVar("--color-chart-2"),
        getCssVar("--color-chart-3"),
        getCssVar("--color-chart-4"),
        getCssVar("--color-chart-5"),
    ];

    const labels = [...countsMap.keys()];
    const data = [...countsMap.values()];

    chartInstances[chartKey] = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: labels.map((_, index) => palette[index % palette.length]),
                borderColor: getCssVar("--color-surface"),
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: getCssVar("--color-text-secondary"), boxWidth: 10, padding: 12 },
                },
            },
        },
    });
}

function renderChartPorSetor(equipments) {
    renderDistributionChart({
        canvasId: "chartPorSetor",
        emptyId: "emptyPorSetor",
        chartKey: "porSetor",
        countsMap: groupCountBy(equipments, equipment => equipment.sector),
    });
}

function renderChartPorTipo(equipments) {
    renderDistributionChart({
        canvasId: "chartPorTipo",
        emptyId: "emptyPorTipo",
        chartKey: "porTipo",
        countsMap: groupCountBy(equipments, equipment => equipment.type),
    });
}

function renderChartStatus(equipments) {
    renderDistributionChart({
        canvasId: "chartStatus",
        emptyId: "emptyStatus",
        chartKey: "status",
        countsMap: groupCountBy(equipments, equipment => equipment.status),
    });
}

// monta os últimos N meses (incluindo o atual) com a contagem de manutenções realizadas em cada um
function buildLastSixMonthsBuckets(maintenances, today) {
    const buckets = [];

    for (let i = MONTHS_IN_CHART - 1; i >= 0; i--) {
        const bucketDate = new Date(today.getFullYear(), today.getMonth() - i, 1);

        buckets.push({
            year: bucketDate.getFullYear(),
            month: bucketDate.getMonth(),
            label: capitalize(bucketDate.toLocaleDateString("pt-BR", { month: "short" })) + "/" + String(bucketDate.getFullYear()).slice(-2),
            count: 0,
        });
    }

    maintenances.forEach(maintenance => {
        const maintenanceDate = parseDateOnly(maintenance.maintenance_date);

        if (!maintenanceDate) {
            return;
        }

        const bucket = buckets.find(b => b.year === maintenanceDate.getFullYear() && b.month === maintenanceDate.getMonth());

        if (bucket) {
            bucket.count++;
        }
    });

    return buckets;
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function renderChartManutencoesPorMes(maintenances, today) {
    const canvas = document.getElementById("chartManutencoesPorMes");
    const emptyElement = document.getElementById("emptyManutencoesPorMes");

    if (chartInstances.porMes) {
        chartInstances.porMes.destroy();
        delete chartInstances.porMes;
    }

    const buckets = buildLastSixMonthsBuckets(maintenances, today);
    const hasData = buckets.some(bucket => bucket.count > 0);

    if (!hasData) {
        emptyElement.classList.add("is-visible");
        return;
    }

    emptyElement.classList.remove("is-visible");

    chartInstances.porMes = new Chart(canvas, {
        type: "bar",
        data: {
            labels: buckets.map(bucket => bucket.label),
            datasets: [{
                label: "Manutenções realizadas",
                data: buckets.map(bucket => bucket.count),
                backgroundColor: getCssVar("--color-primary"),
                borderRadius: 6,
                maxBarThickness: 36,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
            },
            scales: {
                x: {
                    ticks: { color: getCssVar("--color-text-secondary") },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: getCssVar("--color-text-secondary"), precision: 0 },
                    grid: { color: getCssVar("--color-border") },
                },
            },
        },
    });
}

/* ===================== orquestração ===================== */

function updateLastUpdatedLabel() {
    const label = document.getElementById("lastUpdatedLabel");
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    label.textContent = `Atualizado às ${time}`;
}

function setRefreshLoading(isLoading) {
    const button = document.getElementById("refreshDashboardButton");
    button.classList.toggle("is-loading", isLoading);
    button.disabled = isLoading;
}

async function loadDashboard() {
    setRefreshLoading(true);

    try {
        const { equipments, equipmentsStatus, maintenances } = await fetchDashboardData();
        const today = parseDateOnly(new Date().toISOString());

        renderKpis(computeKpis(equipments, equipmentsStatus, maintenances, today));
        renderAlerts(equipmentsStatus, today);
        renderChartManutencoesPorMes(maintenances, today);
        renderChartPorSetor(equipments);
        renderChartPorTipo(equipments);
        renderChartStatus(equipments);

        updateLastUpdatedLabel();
    } catch (error) {
        console.error(error);
        document.getElementById("lastUpdatedLabel").textContent = "Erro ao atualizar";
    } finally {
        setRefreshLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();

    document.getElementById("refreshDashboardButton").addEventListener("click", loadDashboard);
});
