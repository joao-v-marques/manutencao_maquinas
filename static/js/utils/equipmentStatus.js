// status operacional do equipamento (cadastrado no banco, ex.: "Ativo", "Em manutenção", "Parado"):
// como os valores são livres, a cor/tom é deduzida por palavra-chave — mesma regra no dashboard e em /equipamentos

export const OPERATIONAL_TONE_COLORS = {
    good: "#2fc486",
    warning: "#f47920",
    critical: "#e2574c",
    neutral: "#767e88",
};

const TONE_RULES = [
    [/inativ|baixad|descart|desativ/, "neutral"],
    [/parad|defeit|quebr|avari/, "critical"],
    [/manut|reparo|conserto/, "warning"],
    [/ativ|opera|funcion|uso/, "good"],
];

function normalize(text) {
    return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// "good" | "warning" | "critical" | "neutral" | null (quando não reconhece o status)
export function operationalStatusTone(status) {
    const rule = TONE_RULES.find(([pattern]) => pattern.test(normalize(status)));
    return rule ? rule[1] : null;
}
