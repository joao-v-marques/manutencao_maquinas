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
