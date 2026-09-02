export type CrmStage =
  | "prospecting"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CrmPeriod = "Hoje" | "7 dias" | "15 dias" | "30 dias" | "90 dias" | "Tudo";

export type CrmLead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  origin: string;
  stage: CrmStage;
  estimatedValue: number;
  nextActionDate: string;
  notes: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  lossReason?: string;
  convertedClientId?: string;
};

export type CrmQuoteSummary = {
  id: string;
  crmLeadId?: string;
  client: string;
  negotiatedPrice: number;
  finalMargin: number;
  date: string;
};

export const CRM_ACTIVE_STAGES: CrmStage[] = [
  "prospecting",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
];

export const CRM_STAGE_LABELS: Record<CrmStage, string> = {
  prospecting: "Prospecção",
  contacted: "Contato feito",
  qualified: "Qualificado",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Cliente ganho",
  lost: "Perdido",
};

export const CRM_ORIGINS = [
  "Prospecção ativa",
  "Indicação",
  "Instagram",
  "LinkedIn",
  "WhatsApp",
  "Site",
  "Evento",
  "Outro",
];

export const CRM_PERIODS: CrmPeriod[] = ["Hoje", "7 dias", "15 dias", "30 dias", "90 dias", "Tudo"];

export function nextCrmStage(stage: CrmStage): CrmStage | null {
  const index = CRM_ACTIVE_STAGES.indexOf(stage);
  if (index < 0 || index === CRM_ACTIVE_STAGES.length - 1) return null;
  return CRM_ACTIVE_STAGES[index + 1];
}

export function attachQuoteToCrmLead(lead: CrmLead, estimatedValue: number, updatedAt = new Date().toISOString()): CrmLead {
  return { ...lead, estimatedValue, updatedAt };
}

export function restartCrmFollowUp(
  lead: CrmLead,
  nextActionDate: string,
  updatedAt = new Date().toISOString(),
): CrmLead {
  return {
    ...lead,
    stage: "prospecting",
    lossReason: undefined,
    nextActionDate,
    updatedAt,
  };
}

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export function filterCrmLeads(leads: CrmLead[], period: CrmPeriod, now = new Date()) {
  if (period === "Tudo") return leads;
  const days = period === "Hoje" ? 0 : Number(period.split(" ")[0]) - 1;
  const start = startOfDay(now);
  start.setDate(start.getDate() - days);
  return leads.filter((lead) => new Date(lead.updatedAt).getTime() >= start.getTime());
}

export function crmMetrics(leads: CrmLead[], period: CrmPeriod, now = new Date()) {
  const filtered = filterCrmLeads(leads, period, now);
  const active = filtered.filter((lead) => CRM_ACTIVE_STAGES.includes(lead.stage));
  const won = filtered.filter((lead) => lead.stage === "won");
  const lost = filtered.filter((lead) => lead.stage === "lost");
  const decisions = won.length + lost.length;
  return {
    total: filtered.length,
    active: active.length,
    pipelineValue: active.reduce((sum, lead) => sum + lead.estimatedValue, 0),
    won: won.length,
    conversion: decisions ? won.length / decisions : 0,
  };
}
