export type CrmBuiltinStage =
  | "prospecting"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CrmStage = CrmBuiltinStage | (string & {});

export type CrmColumn = {
  id: string;
  label: string;
  color: string;
  system?: boolean;
};

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
  tags?: string[];
};

export type CrmQuoteSummary = {
  id: string;
  crmLeadId?: string;
  client: string;
  negotiatedPrice: number;
  finalMargin: number;
  date: string;
};

export const CRM_ACTIVE_STAGES: CrmBuiltinStage[] = [
  "prospecting",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
];

export const DEFAULT_CRM_COLUMNS: CrmColumn[] = [
  { id: "prospecting", label: "Prospecção", color: "#4b9cff", system: true },
  { id: "contacted", label: "Contato feito", color: "#51c8e8", system: true },
  { id: "qualified", label: "Qualificado", color: "#8b72f6", system: true },
  { id: "proposal", label: "Proposta", color: "#f2cf52", system: true },
  { id: "negotiation", label: "Negociação", color: "#2bd39b", system: true },
];

export const CRM_STAGE_LABELS: Record<CrmBuiltinStage, string> = {
  prospecting: "Prospecção",
  contacted: "Contato feito",
  qualified: "Qualificado",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Cliente ganho",
  lost: "Perdido",
};

export function crmStageLabel(stage: CrmStage, columns: CrmColumn[] = DEFAULT_CRM_COLUMNS) {
  return columns.find((column) => column.id === stage)?.label
    || CRM_STAGE_LABELS[stage as CrmBuiltinStage]
    || stage;
}

export function normalizeCrmColumns(value: unknown): CrmColumn[] {
  if (!Array.isArray(value)) return DEFAULT_CRM_COLUMNS.map((column) => ({ ...column }));
  const custom = value.filter((item): item is CrmColumn => Boolean(
    item && typeof item === "object" && typeof item.id === "string"
      && typeof item.label === "string" && typeof item.color === "string",
  ));
  const merged = DEFAULT_CRM_COLUMNS.map((fallback) =>
    custom.find((column) => column.id === fallback.id) || { ...fallback },
  );
  for (const column of custom) {
    if (!merged.some((item) => item.id === column.id)) merged.push(column);
  }
  return merged;
}

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

export function nextCrmStage(stage: CrmStage, stages: CrmStage[] = CRM_ACTIVE_STAGES): CrmStage | null {
  const index = stages.indexOf(stage);
  if (index < 0 || index === stages.length - 1) return null;
  return stages[index + 1];
}

export type CrmActionStatus = "overdue" | "today" | "upcoming" | "unscheduled";

export function crmActionStatus(nextActionDate: string, now = new Date()): CrmActionStatus {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextActionDate)) return "unscheduled";
  const actionDay = saoPauloCalendarDay(new Date(`${nextActionDate}T12:00:00-03:00`));
  const today = saoPauloCalendarDay(now);
  if (actionDay < today) return "overdue";
  if (actionDay === today) return "today";
  return "upcoming";
}

export function sortCrmActions(leads: CrmLead[]) {
  return [...leads].sort((a, b) => {
    if (!a.nextActionDate) return 1;
    if (!b.nextActionDate) return -1;
    return a.nextActionDate.localeCompare(b.nextActionDate);
  });
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

const saoPauloCalendarDay = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000;
};

export function filterCrmLeads(leads: CrmLead[], period: CrmPeriod, now = new Date()) {
  if (period === "Tudo") return leads;
  const days = period === "Hoje" ? 0 : Number(period.split(" ")[0]) - 1;
  const today = saoPauloCalendarDay(now);
  return leads.filter((lead) => {
    const distance = today - saoPauloCalendarDay(new Date(lead.updatedAt));
    return distance >= 0 && distance <= days;
  });
}

export function crmMetrics(
  leads: CrmLead[],
  period: CrmPeriod,
  now = new Date(),
  activeStages: CrmStage[] = CRM_ACTIVE_STAGES,
) {
  const filtered = filterCrmLeads(leads, period, now);
  const active = filtered.filter((lead) => activeStages.includes(lead.stage));
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
