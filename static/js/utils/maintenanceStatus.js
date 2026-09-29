// funções compartilhadas de data/status de manutenção, usadas por qualquer página que precise classificar equipamentos

export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_NEXT_MAINTENANCE_WINDOW_DAYS = 15;

// formata uma data (ISO ou "Thu, 30 Apr 2026 00:00:00 GMT") para DD/MM/YYYY
export function formatDateToInput(dateString) {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);

    // o backend serializa a data como meia-noite UTC; usar getters locais aqui "voltaria" um dia
    // em fusos negativos (ex: Brasil, UTC-3), então extraímos os componentes em UTC
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${day}/${month}/${year}`;
}

// converte a data (o Flask serializa datas como "Thu, 30 Apr 2026 00:00:00 GMT", mas aceitamos ISO também)
// em um Date local sem horário, evitando problemas de timezone na comparação
export function parseDateOnly(dateString) {
    if (!dateString) {
        return null;
    }

    const parsedDate = new Date(dateString);

    if (isNaN(parsedDate.getTime())) {
        return null;
    }

    // o backend serializa a data como meia-noite UTC; extrair os componentes em horário local
    // poderia "voltar" um dia em fusos negativos (ex: Brasil, UTC-3), então usamos os componentes UTC
    return new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
}

// classifica um equipamento a partir da próxima manutenção
export function classifyMaintenanceStatus(nextMaintenanceDate, today, windowDays = DEFAULT_NEXT_MAINTENANCE_WINDOW_DAYS) {
    const parsedNextDate = parseDateOnly(nextMaintenanceDate);

    if (!parsedNextDate) {
        return { key: "primeira", label: "Sem manutenção", diffInDays: null };
    }

    const diffInDays = Math.round((parsedNextDate - today) / ONE_DAY_IN_MS);

    if (diffInDays < 0) {
        return { key: "vencida", label: "Vencida", diffInDays };
    }

    if (diffInDays === 0) {
        return { key: "hoje", label: "Hoje", diffInDays };
    }

    if (diffInDays <= windowDays) {
        return { key: "proxima", label: "Próxima", diffInDays };
    }

    return { key: "emdia", label: "Em dia", diffInDays };
}

// janela usada na página de manutenções para "próximo do vencimento" (mesma do dashboard: 30 dias)
export const MAINTENANCE_WINDOW_DAYS = 30;

// dias de atraso a partir dos quais uma manutenção vencida é considerada crítica
export const CRITICAL_OVERDUE_DAYS = 30;

// refina a classificação separando as vencidas há mais de 30 dias (críticas) das vencidas recentes;
// a chave resultante é usada como filtro, cor e rótulo em toda a página de manutenções
export function classifyMaintenanceStatusDetailed(nextMaintenanceDate, today, windowDays = DEFAULT_NEXT_MAINTENANCE_WINDOW_DAYS) {
    const status = classifyMaintenanceStatus(nextMaintenanceDate, today, windowDays);

    if (status.key === "vencida" && status.diffInDays < -CRITICAL_OVERDUE_DAYS) {
        return { ...status, key: "vencida_critica", label: "Crítica" };
    }

    return status;
}

// texto relativo ao dia de hoje: "hoje", "amanhã", "em 12 dias", "ontem", "há 45 dias"
export function formatRelativeDays(diffInDays) {
    if (diffInDays === null || diffInDays === undefined) {
        return "";
    }

    if (diffInDays === 0) return "hoje";
    if (diffInDays === 1) return "amanhã";
    if (diffInDays === -1) return "ontem";

    const absDays = Math.abs(diffInDays);
    return diffInDays > 0 ? `em ${absDays} dias` : `há ${absDays} dias`;
}

// "a cada 1 mês" / "a cada 6 meses"
export function formatIntervalMonths(months) {
    const value = Number(months);

    if (!value) {
        return "";
    }

    return value === 1 ? "a cada 1 mês" : `a cada ${value} meses`;
}

// data de hoje no formato aaaa-mm-dd (horário local), usada como valor padrão dos campos de data
export function todayInputValue(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// escapa texto vindo da API antes de interpolar em innerHTML
export function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
