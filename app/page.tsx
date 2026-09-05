"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Moon,
  Target,
  TrendingUp,
  UserCog,
  UserMinus,
  Users,
  Wallet,
  X,
  RotateCcw,
  Upload,
  LogOut,
} from "lucide-react";
import { useAtsocParameters } from "@/lib/use-atsoc-parameters";
import {
  AtsocParameters,
  DEFAULT_PARAMETERS,
  adjustedClientLoad,
  analyzeCapacity,
  calculateAutomaticCac,
  calculateCommercialPricing,
  calculateScenarioImpact,
  calculateTargetStructure,
  clientProfitability,
  coverageHours,
  employeeHourlyCost,
  equivalentMonthlyHours,
  monthlyCacCost,
  monthlyContractDueDates,
  mergeAtsocParameters,
  normalizedPartnerCost,
  preserveInstallmentOnContractAdjustment,
  quoteStatementAtPrice,
  safeClientsPerFte,
  simulateNewSale,
  theoreticalClientLoad,
  timeToMinutes,
  validateMarginPolicy,
  validateOperationalTimeBands,
  weeklyCoverageHours,
  weekSchedule,
  type ClientInput,
  type DaySchedule,
  memberWorksOn,
  SHIFT_CYCLES,
  type ShiftPattern,
  type TeamMember,
  type ScenarioKind,
} from "@/lib/atsoc-control";
import { buildAtsocReports, type ReportDataset } from "@/lib/atsoc-reports";
import { exportReportExcel, exportReportPdf } from "@/lib/report-export";
import { Crm } from "@/components/crm";
import {
  attachQuoteToCrmLead,
  DEFAULT_CRM_COLUMNS,
  normalizeCrmColumns,
  type CrmColumn,
  type CrmLead,
} from "@/lib/crm";
import {
  initializeWorkspace,
  loadWorkspace,
  persistWorkspaceResource,
  type WorkspacePayload,
} from "@/lib/workspace-client";

type Key =
  | "dashboard"
  | "cashflow"
  | "accounts"
  | "clients"
  | "crm"
  | "pricing"
  | "capacity"
  | "team"
  | "costs"
  | "dre"
  | "scenarios"
  | "reports"
  | "settings";
type FinancialEntry = {
  id: string;
  date: string;
  description: string;
  party: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  status: "Previsto" | "Recebido" | "Pago" | "Vencido" | "Cancelado";
  recurringRuleId?: string;
  manualOverride?: boolean;
};
type RecurringAccountRule = {
  id: string;
  description: string;
  party: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  dueDay: number;
  startDate: string;
  endDate: string;
};
type SystemAlert = {
  id: string;
  title: string;
  detail: string;
  tone: "blue" | "orange" | "red";
  target: Key;
  icon: any;
};
type ContractAdjustment = {
  id: string;
  kind: "upgrade" | "downgrade" | "reajuste";
  effectiveDate: string;
  previousRevenue: number;
  newRevenue: number;
  previousActiveClients: number;
  newActiveClients: number;
  notes?: string;
  createdAt: string;
};
type ClientRecord = ClientInput & {
  status: "active" | "inactive";
  legalName?: string;
  cnpj?: string;
  responsible?: string;
  phone?: string;
  email?: string;
  channels?: string;
  supportLevel?: string;
  contractStart?: string;
  billingDay?: number;
  seller?: string;
  inactiveAt?: string;
  followUpDate?: string;
  inactiveReason?: string;
  adjustments?: ContractAdjustment[];
};
type QuoteRecord = {
  id: string;
  crmLeadId?: string;
  client: string;
  seller: string;
  minimumPrice: number;
  targetPrice: number;
  excellentPrice: number;
  postCallPrice: number | null;
  negotiatedPrice: number;
  finalMargin: number;
  expectedProfit: number;
  closedInCall: boolean;
  date: string;
};
type ScenarioRecord = {
  id: string;
  name: string;
  kind: ScenarioKind;
  value: number;
  revenueImpact: number;
  profitImpact: number;
  futureMargin: number;
  futureLoad: number;
  createdAt: string;
  activeClients?: number;
  quantity?: number;
  selectedClientId?: string;
  currentRevenue?: number;
  futureRevenue?: number;
  currentProfit?: number;
  futureProfit?: number;
  currentMargin?: number;
  currentLoad?: number;
  currentStaff?: number;
  futureStaff?: number;
  staffCostImpact?: number;
  requiredHireCount?: number;
  startDate?: string;
  durationMonths?: number;
  notes?: string;
};

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "partner-vinicius",
    name: "Vinicius Scielzo",
    role: "Sócio — Operação e gestão",
    kind: "partner",
    cost: 5500,
    hours: 176,
    active: true,
    operational: true,
    shiftPattern: "5x2",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    cycleStart: "2026-08-31",
  },
  {
    id: "partner-carlos",
    name: "Carlos",
    role: "Sócio — Operação e gestão",
    kind: "partner",
    cost: 5500,
    hours: 176,
    active: true,
    operational: true,
    shiftPattern: "5x2",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    cycleStart: "2026-08-31",
  },
  {
    id: "partner-gabriel",
    name: "Gabriel",
    role: "Sócio — Operação e gestão",
    kind: "partner",
    cost: 5500,
    hours: 176,
    active: true,
    operational: true,
    shiftPattern: "5x2",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    cycleStart: "2026-08-31",
  },
  {
    id: "commercial-collaborator",
    name: "Colaborador comercial PJ",
    role: "Comercial / Vendas",
    kind: "collaborator",
    cost: 1800,
    hours: 176,
    active: true,
    operational: false,
    shiftPattern: "5x2",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    cycleStart: "2026-08-31",
  },
];

const INITIAL_CLIENT_RECORDS: ClientRecord[] = [
  {
    id: "like-link-telecom",
    name: "LIKE LINK TELECOM",
    legalName: "LIKE LINK TELECOM",
    activeClients: 2500,
    monthlyRevenue: 2057,
    intensityFactor: 1,
    schedule: [
      ...weekSchedule("08:00", "00:00", [0, 1, 2, 3, 4]),
    ].map((day) =>
      day.day === 5
        ? { ...day, enabled: true, start: "09:00", end: "20:00" }
        : day.day === 6
          ? { ...day, enabled: true, start: "09:00", end: "15:00" }
          : day,
    ),
    status: "active",
    contractStart: "2026-08-30",
    billingDay: 10,
    channels: "WhatsApp + Telefone",
    supportLevel: "N1 + N2",
    seller: "ATSOC",
    cacManual: 0,
  },
];
const menu: [Key, string, any][] = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["cashflow", "Fluxo de Caixa", TrendingUp],
  ["accounts", "Contas", ReceiptText],
  ["clients", "Clientes e Contratos", Building2],
  ["crm", "CRM Comercial", Target],
  ["pricing", "Cotador / Precificação", Calculator],
  ["capacity", "Operação e Capacidade", Gauge],
  ["team", "Equipe", Users],
  ["costs", "Custos e Parâmetros", SlidersHorizontal],
  ["dre", "DRE Gerencial", BarChart3],
  ["scenarios", "Cenários", Sparkles],
  ["reports", "Relatórios", FileBarChart],
  ["settings", "Configurações", Settings],
];
const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
const downloadCsv = (
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) => {
  const escape = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(";"))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
const localIsoDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const shiftIsoDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const monthlyDueDate = (year: number, month: number, billingDay: number) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    Math.min(Math.max(1, billingDay), lastDay),
  ).padStart(2, "0")}`;
};
const createClientReceivables = (
  client: ClientRecord,
  count = 12,
  fromDate?: string,
): FinancialEntry[] => {
  if (client.status !== "active" || client.monthlyRevenue <= 0) return [];
  const startIso = fromDate || client.contractStart || localIsoDate();
  const billingDay = client.billingDay || 10;
  return monthlyContractDueDates(startIso, billingDay, count).map((date) => {
    return {
      id: `contract-${client.id}-${date.slice(0, 7)}`,
      date,
      description: `Mensalidade contratual • ${client.name}`,
      party: client.name,
      category: "Receita recorrente",
      amount: client.monthlyRevenue,
      type: "income" as const,
      status: "Previsto" as const,
    };
  });
};
const createRecurringEntries = (
  rule: RecurringAccountRule,
): FinancialEntry[] => {
  if (
    !rule.description.trim() ||
    rule.amount <= 0 ||
    !rule.startDate ||
    !rule.endDate ||
    rule.endDate < rule.startDate
  )
    return [];
  const start = new Date(`${rule.startDate}T12:00:00`);
  const end = new Date(`${rule.endDate}T12:00:00`);
  const entries: FinancialEntry[] = [];
  let year = start.getFullYear();
  let month = start.getMonth();
  for (let guard = 0; guard < 120; guard += 1) {
    const date = monthlyDueDate(year, month, rule.dueDay);
    if (date > rule.endDate) break;
    if (date >= rule.startDate)
      entries.push({
        id: `fixed-${rule.id}-${date.slice(0, 7)}`,
        date,
        description: rule.description,
        party: rule.party,
        category: rule.category,
        amount: rule.amount,
        type: rule.type,
        status: "Previsto",
        recurringRuleId: rule.id,
      });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    if (new Date(year, month, 1) > end) break;
  }
  return entries;
};
const entryTone = (status: FinancialEntry["status"]) =>
  status === "Vencido"
    ? "red"
    : status === "Previsto"
      ? "blue"
      : status === "Cancelado"
        ? "orange"
        : "green";
const activeEntry = (entry: FinancialEntry) => entry.status !== "Cancelado";
const buildSystemAlerts = (
  entries: FinancialEntry[],
  p: AtsocParameters,
  initialBalance: number,
  clients: ClientInput[],
): SystemAlert[] => {
  const capacity = analyzeCapacity(clients, p);
  const overdue = entries.filter((entry) => entry.status === "Vencido");
  const upcomingReceipt = entries
    .filter((entry) => entry.type === "income" && entry.status === "Previsto")
    .sort((a, b) => b.amount - a.amount)[0];
  const balance =
    initialBalance +
    entries
      .filter(activeEntry)
      .reduce(
        (sum, entry) =>
          sum + (entry.type === "income" ? entry.amount : -entry.amount),
        0,
      );
  const alerts: SystemAlert[] = [];
  if (capacity.peak.safeUtilization >= 0.8)
    alerts.push({
      id: "capacity",
      title: `Capacidade em ${(capacity.peak.safeUtilization * 100).toFixed(0)}%`,
      detail: `Pico operacional em ${capacity.peak.label}`,
      tone: capacity.peak.safeUtilization > 1 ? "red" : "orange",
      target: "capacity",
      icon: Gauge,
    });
  if (overdue.length)
    alerts.push({
      id: "overdue",
      title: `${overdue.length} conta${overdue.length > 1 ? "s" : ""} vencida${overdue.length > 1 ? "s" : ""}`,
      detail: `${brl(overdue.reduce((sum, entry) => sum + entry.amount, 0))} aguardando regularização`,
      tone: "red",
      target: "accounts",
      icon: CreditCard,
    });
  if (capacity.safeStaff > p.availableOperationalFte)
    alerts.push({
      id: "hiring",
      title: "Nova contratação recomendada",
      detail: `Necessidade de +${capacity.safeStaff - p.availableOperationalFte} atendente(s)`,
      tone: "orange",
      target: "team",
      icon: Users,
    });
  if (upcomingReceipt && upcomingReceipt.amount >= 5000)
    alerts.push({
      id: "receipt",
      title: "Recebimento importante",
      detail: `${brl(upcomingReceipt.amount)} previsto para ${new Date(`${upcomingReceipt.date}T12:00:00`).toLocaleDateString("pt-BR")}`,
      tone: "blue",
      target: "cashflow",
      icon: ArrowUpRight,
    });
  if (balance < 0)
    alerts.push({
      id: "negative",
      title: "Caixa projetado negativo",
      detail: `Saldo projetado de ${brl(balance)}`,
      tone: "red",
      target: "cashflow",
      icon: AlertTriangle,
    });
  return alerts;
};
const Button = ({
  children,
  onClick,
  kind = "primary",
  className = "",
  ...props
}: any) => (
  <button onClick={onClick} className={`btn ${kind} ${className}`} {...props}>
    {children}
  </button>
);
const Pill = ({ children, tone = "blue" }: any) => (
  <span className={`pill ${tone}`}>{children}</span>
);
const Head = ({ title, sub, children }: any) => (
  <div className="section-head">
    <div>
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
    {children}
  </div>
);
const Metric = ({
  label,
  value,
  detail,
  tone = "blue",
  icon: I = Wallet,
}: any) => (
  <article
    className="metric"
    tabIndex={0}
    data-tooltip={`${label}: ${value}${detail ? ` • ${detail}` : ""}`}
    aria-label={`${label}: ${value}`}
  >
    <span className={`metric-icon ${tone}`}>
      <I />
    </span>
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
      <em className={tone}>{detail}</em>
    </div>
  </article>
);
const Seg = ({ items, value, set }: any) => (
  <div className="segmented">
    {items.map((x: string) => (
      <button
        key={x}
        className={value === x ? "active" : ""}
        onClick={() => set(x)}
      >
        {x}
      </button>
    ))}
  </div>
);
const PanelTitle = ({ title, sub, children }: any) => (
  <div className="panel-title">
    <div>
      <h3>{title}</h3>
      <p>{sub}</p>
    </div>
    {children}
  </div>
);

const FIELD_HELP: Record<string, string> = {
  "tipo de cenário": "Escolha qual decisão deseja simular sem alterar os dados reais.",
  "nome do cenário": "Use um nome fácil de identificar depois, como cliente, decisão e mês.",
  "receita mensal do novo cliente": "Informe o MRR estimado que entrará mensalmente com o contrato.",
  "custo mensal por contratado": "Informe o custo mensal completo de cada nova contratação.",
  "aumento sobre os contratos (%)": "Percentual aplicado ao MRR de todos os contratos ativos.",
  "base ativa do provedor": "Quantidade de clientes do provedor usada para calcular o FTE automático.",
  "quantidade de contratações": "Número de colaboradores adicionados ao cenário operacional.",
  "cliente perdido": "Selecione o contrato que será retirado da receita e da capacidade.",
  "impostos configurados": "Percentual vigente nos parâmetros; este campo é apenas informativo.",
  "início": "Data prevista para a decisão começar a produzir efeito.",
  "prazo": "Horizonte utilizado para analisar o impacto acumulado do cenário.",
  "observações": "Registre premissas, riscos e contexto para a análise futura.",
  "vendedor responsável": "Use “Nome - Grupo Silva” somente para vendas originadas pelo Grupo Silva.",
  "fator de intensidade operacional": "Ajusta a carga padrão. Mantenha 1,00 até existir histórico operacional confiável.",
  "clientes teóricos por fte": "Quantidade de clientes equivalentes que um atendente suporta teoricamente ao mesmo tempo.",
  "limite operacional seguro (%)": "Percentual máximo recomendado da capacidade teórica antes de reforçar a equipe.",
  "atendentes disponíveis": "Quantidade de FTEs operacionais disponíveis para atender simultaneamente.",
  "mrr contratado": "Receita mensal recorrente prevista no contrato.",
  "cac real do cliente": "Custo efetivamente gasto para adquirir este cliente. Deixe zero se ainda não houver valor comprovado.",
  "dia de vencimento": "Dia usado para gerar automaticamente as previsões mensais de recebimento.",
  "base ativa": "Quantidade atual de clientes do provedor atendido.",
  "margem mínima": "Menor margem autorizada sem aprovação dos sócios.",
  "margem alvo": "Margem saudável usada como principal objetivo da negociação.",
  "margem excelente": "Margem de alta rentabilidade para a ATSOC.",
  "pró-labore atual": "Valor mensal que já é efetivamente pago ao sócio. Ele também deve existir nas contas fixas para compor o resultado atual.",
  "pró-labore-alvo": "Valor mensal que o sócio precisa receber para dedicação integral à ATSOC.",
  "função atual": "Atuação que o sócio exerce hoje, incluindo operação e gestão quando aplicável.",
  "função na estrutura-alvo": "Atuação desejada depois da transição; por exemplo, somente gestão.",
};

function FieldHelpOverlay({ enabled }: { enabled: boolean }) {
  const [tip, setTip] = useState<{ text: string; left: number; top: number } | null>(null);
  useEffect(() => {
    if (!enabled) {
      setTip(null);
      return;
    }
    const labelName = (label: HTMLLabelElement) => {
      const direct = Array.from(label.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
        .filter(Boolean)
        .join(" ")
        .trim();
      return direct || label.querySelector("input, select, textarea")?.getAttribute("aria-label") || "Campo";
    };
    const show = (target: EventTarget | null) => {
      const label = (target as HTMLElement | null)?.closest?.("label") as HTMLLabelElement | null;
      if (!label) return;
      const name = labelName(label);
      const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();
      const control = label.querySelector("input, select, textarea");
      const text = FIELD_HELP[normalized] ||
        (control instanceof HTMLSelectElement
          ? `Selecione a opção correspondente a “${name}”.`
          : `Informe “${name}” conforme os dados reais da operação.`);
      const rect = label.getBoundingClientRect();
      setTip({ text, left: Math.min(window.innerWidth - 170, Math.max(170, rect.left + rect.width / 2)), top: rect.top - 8 });
    };
    const hide = () => setTip(null);
    const onMouseOver = (event: MouseEvent) => show(event.target);
    const onFocusIn = (event: FocusEvent) => show(event.target);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("mouseout", hide);
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("mouseout", hide);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [enabled]);
  if (!enabled || !tip) return null;
  return <div className="field-help-tooltip" style={{ left: tip.left, top: tip.top }}>{tip.text}</div>;
}
const Bars = ({
  values,
  color = "blue",
  labels = ["Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
  tooltips = [],
}: any) => (
  <>
    <div className="bars">
      {values.map((v: number, i: number) => (
        <i
          className={color}
          style={{ height: `${v}%` }}
          key={i}
          title={tooltips[i] || `${labels[i] || "Indicador"}: ${v.toFixed(1)}%`}
        />
      ))}
    </div>
    <div className="bar-labels">
      {labels.map((label: string) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  </>
);

function Table({
  rows,
  title = "Movimentações",
  onChange,
  onDelete,
}: {
  rows: FinancialEntry[];
  title?: string;
  onChange: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null),
    [draft, setDraft] = useState<FinancialEntry | null>(null),
    [query, setQuery] = useState("");
  const filtered = rows
    .filter((row) =>
      `${row.description} ${row.party} ${row.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className="panel table-panel">
      <PanelTitle
        title={title}
        sub={`${filtered.length} registros encontrados`}
      >
        <div className="search">
          <Search />
          <input
            placeholder="Buscar lançamentos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PanelTitle>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Cliente / Fornecedor</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr
                key={entry.id}
                className={editing === entry.id ? "editing-row" : ""}
              >
                <td>
                  {editing === entry.id && draft ? (
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) =>
                        setDraft({ ...draft, date: e.target.value })
                      }
                    />
                  ) : (
                    new Date(`${entry.date}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    )
                  )}
                </td>
                <td>
                  {editing === entry.id && draft ? (
                    <input
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                    />
                  ) : (
                    entry.description
                  )}
                </td>
                <td>
                  {editing === entry.id && draft ? (
                    <input
                      value={draft.party}
                      onChange={(e) =>
                        setDraft({ ...draft, party: e.target.value })
                      }
                    />
                  ) : (
                    entry.party
                  )}
                </td>
                <td>
                  {editing === entry.id && draft ? (
                    <input
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({ ...draft, category: e.target.value })
                      }
                    />
                  ) : (
                    entry.category
                  )}
                </td>
                <td>
                  {editing === entry.id && draft ? (
                    <>
                      <select
                        value={draft.type}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            type: e.target.value as FinancialEntry["type"],
                          })
                        }
                      >
                        <option value="income">Entrada</option>
                        <option value="expense">Saída</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.amount}
                        onChange={(e) =>
                          setDraft({ ...draft, amount: +e.target.value })
                        }
                      />
                    </>
                  ) : (
                    <b
                      className={
                        entry.type === "income" ? "positive" : "negative"
                      }
                    >
                      {entry.type === "expense" ? "− " : "+ "}
                      {brl(entry.amount)}
                    </b>
                  )}
                </td>
                <td>
                  {editing === entry.id && draft ? (
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          status: e.target.value as FinancialEntry["status"],
                        })
                      }
                    >
                      <option>Previsto</option>
                      <option>Recebido</option>
                      <option>Pago</option>
                      <option>Vencido</option>
                      <option>Cancelado</option>
                    </select>
                  ) : (
                    <Pill tone={entryTone(entry.status)}>{entry.status}</Pill>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {editing === entry.id && draft ? (
                      <>
                        <button
                          className="icon save-action"
                          title="Salvar"
                          onClick={() => {
                            onChange(draft);
                            setEditing(null);
                            setDraft(null);
                          }}
                        >
                          <Check />
                        </button>
                        <button
                          className="icon"
                          title="Cancelar"
                          onClick={() => {
                            setEditing(null);
                            setDraft(null);
                          }}
                        >
                          <X />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="icon"
                          title="Editar lançamento"
                          aria-label={`Editar ${entry.description}`}
                          onClick={() => {
                            setEditing(entry.id);
                            setDraft({ ...entry });
                          }}
                        >
                          <Pencil />
                        </button>
                        <button
                          className="icon danger"
                          title="Excluir lançamento"
                          aria-label={`Excluir ${entry.description}`}
                          onClick={() => onDelete(entry)}
                        >
                          <Trash2 />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-table">
                    <ReceiptText />
                    <b>Nenhuma movimentação cadastrada</b>
                    <span>
                      Use “Novo lançamento” ou preencha a visão diária.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dashboard({
  open,
  p,
  entries,
  initialBalance,
  navigate,
  clients,
  team,
}: {
  open: any;
  p: AtsocParameters;
  entries: FinancialEntry[];
  initialBalance: number;
  navigate: (key: Key) => void;
  clients: ClientInput[];
  team: TeamMember[];
}) {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    localIsoDate().slice(0, 7),
  );
  const todayAvailable = team.filter((member) =>
    memberWorksOn(member, localIsoDate()),
  ).length;
  const operationalParameters = {
    ...p,
    availableOperationalFte: todayAvailable,
  };
  const capacity = analyzeCapacity(clients, operationalParameters);
  const structure = calculateTargetStructure(clients, p, team);
  const dre = structure.current;
  const mrr = clients.reduce((s, c) => s + c.monthlyRevenue, 0);
  const active = entries.filter(activeEntry);
  const monthEntries = active.filter((entry) =>
    entry.date.startsWith(selectedMonth),
  );
  const incomes = monthEntries.filter((entry) => entry.type === "income");
  const expenses = monthEntries.filter((entry) => entry.type === "expense");
  const incomeTotal = incomes.reduce((sum, entry) => sum + entry.amount, 0);
  const expenseTotal = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  const cashResult = incomeTotal - expenseTotal;
  const realizedBalance =
    initialBalance +
    active
      .filter(
        (entry) =>
          entry.date <= localIsoDate() &&
          (entry.status === "Recebido" || entry.status === "Pago"),
      )
      .reduce(
        (sum, entry) =>
          sum + (entry.type === "income" ? entry.amount : -entry.amount),
        0,
      );
  const receivable = incomes
    .filter(
      (entry) => entry.status === "Previsto" || entry.status === "Vencido",
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const payable = expenses
    .filter(
      (entry) => entry.status === "Previsto" || entry.status === "Vencido",
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const alerts = buildSystemAlerts(entries, p, initialBalance, clients);
  const selectedDate = new Date(`${selectedMonth}-01T12:00:00`);
  const selectedMonthLabel = selectedDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const monthTotals = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() - 5 + offset,
      1,
    );
    const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthEntries = active.filter((entry) =>
      entry.date.startsWith(prefix),
    );
    return {
      label: date
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      income: monthEntries
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0),
      expense: monthEntries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0),
    };
  });
  const maxMonthly = Math.max(
    1,
    ...monthTotals.flatMap((item) => [item.income, item.expense]),
  );
  const monthlyResults = monthTotals.map((item) => item.income - item.expense);
  const maxResult = Math.max(
    1,
    ...monthlyResults.map((value) => Math.abs(value)),
  );
  const resultBars = monthlyResults.map((value) =>
    Math.max(3, (Math.abs(value) / maxResult) * 100),
  );
  const previousResult = monthlyResults.at(-2) || 0;
  const currentMonthlyResult = monthlyResults.at(-1) || 0;
  const resultChange = previousResult
    ? (currentMonthlyResult - previousResult) / Math.abs(previousResult)
    : 0;
  const capacityPercent = capacity.peak.safeUtilization * 100;
  return (
    <>
      <Head
        title="Visão executiva"
        sub={`Resultados consolidados • ${selectedMonthLabel}`}
      >
        <div className="row">
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {Array.from({ length: 12 }, (_, index) => {
              const date = new Date(2026, index, 1);
              const value = `2026-${String(index + 1).padStart(2, "0")}`;
              return (
                <option value={value} key={value}>
                  {date.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              );
            })}
          </select>
          <Button onClick={() => open("Novo lançamento")}>
            <Plus /> Novo lançamento
          </Button>
        </div>
      </Head>
      <div className="metrics dash">
        {[
          [
            "Saldo disponível",
            brl(realizedBalance),
            "Saldo inicial + recebidos − pagos",
            "green",
            Wallet,
          ],
          [
            "Entradas do mês",
            brl(incomeTotal),
            `${incomes.length} lançamento(s)`,
            "green",
            ArrowUpRight,
          ],
          [
            "Saídas do mês",
            brl(expenseTotal),
            `${expenses.length} lançamento(s)`,
            "red",
            ArrowDownRight,
          ],
          [
            "Resultado de caixa",
            brl(cashResult),
            incomeTotal
              ? `Margem de caixa ${((cashResult / incomeTotal) * 100).toFixed(1)}%`
              : "Sem movimentações",
            "green",
            CircleDollarSign,
          ],
          ["MRR", brl(mrr), "Receita recorrente calculada", "green", Activity],
          [
            "Resultado atual",
            brl(dre.finalProfit),
            "Receitas menos custos efetivamente cadastrados",
            "blue",
            TrendingUp,
          ],
          [
            "Estrutura-alvo",
            brl(structure.targetResult),
            `${structure.additionalOperationalStaff} contratação(ões) • pró-labore alvo ${brl(structure.targetPartnerPay)}`,
            structure.targetResult >= 0 ? "green" : "red",
            Target,
          ],
          [
            "MRR adicional necessário",
            brl(structure.additionalMrrRequired),
            `MRR sustentável ${brl(structure.requiredMrr)}`,
            structure.additionalMrrRequired > 0 ? "orange" : "green",
            CircleDollarSign,
          ],
          [
            "A receber",
            brl(receivable),
            "Previsto e vencido",
            receivable ? "orange" : "blue",
            CreditCard,
          ],
          ["A pagar", brl(payable), "Previsto e vencido", "blue", CalendarDays],
          [
            "Clientes ativos",
            String(clients.length),
            "Contratos operacionais",
            "blue",
            Building2,
          ],
          [
            "Capacidade",
            `${(capacity.peak.safeUtilization * 100).toFixed(0)}%`,
            `Pico ${capacity.peak.label}`,
            capacity.peak.safeUtilization > 1 ? "red" : "orange",
            Gauge,
          ],
          [
            "Atendentes disponíveis",
            String(todayAvailable),
            `Em escala hoje • ${safeClientsPerFte(p).toLocaleString("pt-BR")} clientes seguros/FTE`,
            "blue",
            Users,
          ],
          [
            "Necessários",
            String(capacity.safeStaff),
            capacity.safeStaff > todayAvailable
              ? "Contratação recomendada"
              : "Equipe suficiente",
            capacity.safeStaff > todayAvailable ? "red" : "green",
            UserCog,
          ],
        ].map((x: any) => (
          <Metric
            key={x[0]}
            label={x[0]}
            value={x[1]}
            detail={x[2]}
            tone={x[3]}
            icon={x[4]}
          />
        ))}
      </div>
      <div className="grid wide">
        <section className="panel">
          <PanelTitle
            title="Fluxo de caixa"
            sub="Realizado x previsto nos últimos 6 meses"
          >
            <div className="legend">
              <span>
                <i className="dot blue" />
                Realizado
              </span>
              <span>
                <i className="dot cyan" />
                Previsto
              </span>
            </div>
          </PanelTitle>
          {entries.length ? (
            <>
              <div className="cash-bars">
                {monthTotals.map((item) => (
                  <div key={item.label}>
                    <i
                      className="pred"
                      title={`${item.label}: entradas de ${brl(item.income)}`}
                      style={{
                        height: `${Math.max(2, (item.income / maxMonthly) * 100)}%`,
                      }}
                    />
                    <i
                      title={`${item.label}: saídas de ${brl(item.expense)}`}
                      style={{
                        height: `${Math.max(2, (item.expense / maxMonthly) * 100)}%`,
                      }}
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="projections">
                {[7, 30, 90].map((days) => (
                  <div key={days}>
                    <span>Próximos {days} dias</span>
                    <b>
                      {brl(
                        active
                          .filter(
                            (entry) =>
                              entry.status === "Previsto" &&
                              entry.date >= localIsoDate() &&
                              entry.date <= shiftIsoDate(localIsoDate(), days),
                          )
                          .reduce(
                            (sum, entry) =>
                              sum +
                              (entry.type === "income"
                                ? entry.amount
                                : -entry.amount),
                            0,
                          ),
                      )}
                    </b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-chart">
              <ReceiptText />
              <b>Fluxo de caixa pronto para receber seus dados</b>
              <span>
                Cadastre o saldo inicial e os lançamentos oficiais no módulo
                Fluxo de Caixa.
              </span>
              <Button kind="ghost" onClick={() => navigate("cashflow")}>
                Abrir fluxo de caixa
              </Button>
            </div>
          )}
        </section>
        <section className="panel">
          <PanelTitle
            title="Alertas prioritários"
            sub={
              alerts.length
                ? `${alerts.length} ponto(s) exigem atenção`
                : "Nenhuma pendência no momento"
            }
          >
            <Bell />
          </PanelTitle>
          <div className="alerts">
            {alerts.map((a) => {
              const I = a.icon;
              return (
                <button
                  className={a.tone}
                  key={a.id}
                  onClick={() => navigate(a.target)}
                >
                  <I />
                  <span>
                    <b>{a.title}</b>
                    <small>{a.detail}</small>
                  </span>
                  <ChevronRight />
                </button>
              );
            })}
            {!alerts.length && (
              <div className="empty-alerts">
                <ShieldCheck />
                <b>Nenhum alerta prioritário</b>
                <span>
                  Os indicadores monitorados estão dentro dos parâmetros.
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="grid three">
        <section className="panel">
          <PanelTitle title="Resultado mensal" sub="Evolução do lucro">
            <Pill tone={resultChange >= 0 ? "green" : "red"}>
              {resultChange >= 0 ? "+" : ""}
              {(resultChange * 100).toFixed(1)}%
            </Pill>
          </PanelTitle>
          <Bars
            values={resultBars}
            color={currentMonthlyResult >= 0 ? "green" : "red"}
            labels={monthTotals.map((item) => item.label)}
            tooltips={monthTotals.map(
              (item, index) =>
                `${item.label}: resultado de ${brl(monthlyResults[index])}`,
            )}
          />
        </section>
        <section className="panel ring-panel">
          <PanelTitle title="Capacidade operacional" sub="Utilização atual">
            <Pill
              tone={
                capacityPercent > 90
                  ? "red"
                  : capacityPercent >= 70
                    ? "orange"
                    : "green"
              }
            >
              {capacityPercent > 90
                ? "Crítico"
                : capacityPercent >= 70
                  ? "Atenção"
                  : "Seguro"}
            </Pill>
          </PanelTitle>
          <div className="ring">
            <b>{capacityPercent.toFixed(0)}%</b>
            <span>utilizado</span>
          </div>
          <div className="legend">
            <span>
              <i className="dot green" />
              Seguro 70%
            </span>
            <span>
              <i className="dot orange" />
              Atual {capacityPercent.toFixed(0)}%
            </span>
            <span>
              <i className="dot red" />
              Limite 90%
            </span>
          </div>
        </section>
        <section className="panel">
          <PanelTitle
            title="Clientes por receita"
            sub={`MRR total de ${brl(mrr)}`}
          />
          <div className="rank">
            {[...clients]
              .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
              .slice(0, 4)
              .map((client, i) => (
                <div key={client.id}>
                  <b>{i + 1}</b>
                  <span>
                    <strong>{client.name}</strong>
                    <small>
                      {mrr
                        ? `${((client.monthlyRevenue / mrr) * 100).toFixed(0)}% do MRR`
                        : "Sem MRR"}
                    </small>
                  </span>
                  <em>{brl(client.monthlyRevenue)}</em>
                </div>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Cash({
  open,
  accounts = false,
  entries,
  setEntries,
  initialBalance,
  setInitialBalance,
  recurringRules = [],
  setRecurringRules,
  parameters,
  updateParameters,
}: {
  open: any;
  accounts?: boolean;
  entries: FinancialEntry[];
  setEntries: (
    updater:
      | FinancialEntry[]
      | ((current: FinancialEntry[]) => FinancialEntry[]),
  ) => void;
  initialBalance: number;
  setInitialBalance: (value: number) => void;
  recurringRules?: RecurringAccountRule[];
  setRecurringRules?: (
    updater:
      | RecurringAccountRule[]
      | ((current: RecurringAccountRule[]) => RecurringAccountRule[]),
  ) => void;
  parameters?: AtsocParameters;
  updateParameters?: (next: AtsocParameters) => void;
}) {
  const [period, setPeriod] = useState(accounts ? "Todos" : "30 dias");
  const [view, setView] = useState<"overview" | "daily">("overview");
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(() => localIsoDate());
  const [customEnd, setCustomEnd] = useState(() =>
    shiftIsoDate(localIsoDate(), 30),
  );
  const [accountMonth, setAccountMonth] = useState(() =>
    localIsoDate().slice(0, 7),
  );
  const [recurringEditor, setRecurringEditor] =
    useState<RecurringAccountRule | null>(null);
  const currentDate = localIsoDate();
  const addDays = shiftIsoDate;
  const formatShortDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const items = accounts
    ? ["Todos", "A receber", "A pagar", "Vencidos"]
    : [
        "Hoje",
        "Amanhã",
        "7 dias",
        "15 dias",
        "30 dias",
        "90 dias",
        "Personalizado",
      ];
  const active = entries.filter(activeEntry);
  const accountEntries = active.filter((entry) =>
    entry.date.startsWith(accountMonth),
  );
  const range = (() => {
    if (accounts) return { start: "0000-01-01", end: "9999-12-31" };
    if (period === "Hoje") return { start: currentDate, end: currentDate };
    if (period === "Amanhã") {
      const tomorrow = addDays(currentDate, 1);
      return { start: tomorrow, end: tomorrow };
    }
    if (period === "Personalizado")
      return {
        start: customStart,
        end: customEnd < customStart ? customStart : customEnd,
      };
    const days = Number(period.split(" ")[0]) || 30;
    return { start: currentDate, end: addDays(currentDate, days - 1) };
  })();
  const periodEntries = active.filter(
    (entry) => entry.date >= range.start && entry.date <= range.end,
  );
  const incomeTotal = (accounts ? accountEntries : periodEntries)
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenseTotal = (accounts ? accountEntries : periodEntries)
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const openingBalance =
    initialBalance +
    active
      .filter((entry) => entry.date < range.start)
      .reduce(
        (sum, entry) =>
          sum + (entry.type === "income" ? entry.amount : -entry.amount),
        0,
      );
  const projectedBalance =
    initialBalance +
    active
      .filter((entry) => entry.date <= range.end)
      .reduce(
        (sum, entry) =>
          sum + (entry.type === "income" ? entry.amount : -entry.amount),
        0,
      );
  const addTransaction = () =>
    setEntries((current) => [
      {
        id: `entry-${Date.now()}`,
        date: currentDate,
        description: "Novo lançamento",
        party: "",
        category: "",
        amount: 0,
        type: "income",
        status: "Previsto",
      },
      ...current,
    ]);
  const changeTransaction = (next: FinancialEntry) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.id === next.id
          ? {
              ...next,
              manualOverride:
                Boolean(next.recurringRuleId) || next.manualOverride,
            }
          : entry,
      ),
    );
  const deleteTransaction = (entry: FinancialEntry) => {
    if (window.confirm(`Excluir o lançamento “${entry.description}”?`))
      setEntries((current) => current.filter((item) => item.id !== entry.id));
  };
  const saveRecurringRule = () => {
    if (
      !recurringEditor ||
      !setRecurringRules ||
      !recurringEditor.description.trim() ||
      recurringEditor.amount <= 0 ||
      recurringEditor.endDate < recurringEditor.startDate
    )
      return;
    if (
      recurringEditor.id.startsWith("cost-") &&
      parameters &&
      updateParameters
    ) {
      const costId = recurringEditor.id.replace(/^cost-/, "");
      updateParameters({
        ...parameters,
        fixedCosts: parameters.fixedCosts.map((cost) =>
          cost.id === costId
            ? {
                ...cost,
                name: recurringEditor.description,
                amount: recurringEditor.amount,
                dueDay: recurringEditor.dueDay,
                startDate: recurringEditor.startDate,
                endDate: recurringEditor.endDate,
              }
            : cost,
        ),
      });
      setRecurringEditor(null);
      return;
    }
    if (
      recurringEditor.type === "expense" &&
      parameters &&
      updateParameters
    ) {
      const costId = `account-${recurringEditor.id.replace(/^fixed-/, "")}`;
      const linkedCost = {
        id: costId,
        name: recurringEditor.description,
        amount: recurringEditor.amount,
        allocation: "equal" as const,
        dueDay: recurringEditor.dueDay,
        startDate: recurringEditor.startDate,
        endDate: recurringEditor.endDate,
        party: recurringEditor.party,
        category: recurringEditor.category,
      };
      updateParameters({
        ...parameters,
        fixedCosts: parameters.fixedCosts.some((cost) => cost.id === costId)
          ? parameters.fixedCosts.map((cost) =>
              cost.id === costId ? { ...cost, ...linkedCost } : cost,
            )
          : [...parameters.fixedCosts, linkedCost],
      });
      setRecurringRules((current) =>
        current.filter((rule) => rule.id !== recurringEditor.id),
      );
      setEntries((current) =>
        current.filter(
          (entry) => entry.recurringRuleId !== recurringEditor.id,
        ),
      );
      setRecurringEditor(null);
      return;
    }
    setRecurringRules((current) =>
      current.some((rule) => rule.id === recurringEditor.id)
        ? current.map((rule) =>
            rule.id === recurringEditor.id ? recurringEditor : rule,
          )
        : [...current, recurringEditor],
    );
    setEntries((current) => {
      const generated = createRecurringEntries(recurringEditor);
      const preserved = current.filter(
        (entry) =>
          entry.recurringRuleId !== recurringEditor.id ||
          entry.manualOverride ||
          entry.status === "Pago" ||
          entry.status === "Recebido",
      );
      const existingIds = new Set(preserved.map((entry) => entry.id));
      return [
        ...preserved,
        ...generated.filter((entry) => !existingIds.has(entry.id)),
      ];
    });
    setRecurringEditor(null);
  };
  const deleteRecurringRule = (rule: RecurringAccountRule) => {
    if (
      !setRecurringRules ||
      !window.confirm(
        `Excluir a conta fixa “${rule.description}” e suas previsões ainda não realizadas?`,
      )
    )
      return;
    if (rule.id.startsWith("cost-") && parameters && updateParameters) {
      const costId = rule.id.replace(/^cost-/, "");
      updateParameters({
        ...parameters,
        fixedCosts: parameters.fixedCosts.filter((cost) => cost.id !== costId),
      });
    }
    setRecurringRules((current) =>
      current.filter((item) => item.id !== rule.id),
    );
    setEntries((current) =>
      current.filter(
        (entry) =>
          entry.recurringRuleId !== rule.id ||
          entry.status === "Pago" ||
          entry.status === "Recebido",
      ),
    );
  };
  const monthlyEntries = entries.filter((entry) =>
    entry.date.startsWith(accountMonth),
  );
  const filteredEntries = accounts
    ? period === "Vencidos"
      ? monthlyEntries.filter((entry) => entry.status === "Vencido")
      : period === "A receber"
        ? monthlyEntries.filter((entry) => entry.type === "income")
        : period === "A pagar"
          ? monthlyEntries.filter((entry) => entry.type === "expense")
          : monthlyEntries
    : entries.filter(
        (entry) => entry.date >= range.start && entry.date <= range.end,
      );
  const updateDailyTotal = (
    date: string,
    type: FinancialEntry["type"],
    amount: number,
  ) => {
    const id = `daily-${date}-${type}`;
    setEntries((current) => {
      const without = current.filter((entry) => entry.id !== id);
      const existing = without
        .filter(activeEntry)
        .filter((entry) => entry.date === date && entry.type === type)
        .reduce((sum, entry) => sum + entry.amount, 0);
      const adjustment = Math.max(0, amount - existing);
      if (!adjustment || amount < 0) return without;
      return [
        ...without,
        {
          id,
          date,
          description: type === "income" ? "Entrada diária" : "Saída diária",
          party: "Lançamento pelo planejamento",
          category: type === "income" ? "Receita" : "Despesa",
          amount: adjustment,
          type,
          status: "Previsto",
        },
      ];
    });
  };
  const cashMonths = [7, 8, 9, 10, 11];
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const dayNames = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const dailyValue = (date: string, type: FinancialEntry["type"]) =>
    active
      .filter((entry) => entry.date === date && entry.type === type)
      .reduce((sum, entry) => sum + entry.amount, 0);
  const dailyDetails = (date: string, type: FinancialEntry["type"]) =>
    active.filter((entry) => entry.date === date && entry.type === type);
  const runningBalance = (date: string) =>
    initialBalance +
    active
      .filter((entry) => entry.date <= date)
      .reduce(
        (sum, entry) =>
          sum + (entry.type === "income" ? entry.amount : -entry.amount),
        0,
      );
  const chartDays: string[] = [];
  for (
    let date = range.start;
    date <= range.end && chartDays.length < 366;
    date = addDays(date, 1)
  )
    chartDays.push(date);
  const chartValues = chartDays.map((date) => runningBalance(date));
  const chartMin = Math.min(openingBalance, ...chartValues);
  const chartMax = Math.max(openingBalance, ...chartValues);
  const chartSpread = Math.max(1, chartMax - chartMin);
  const chartPoints = chartValues.map((balance, index) => ({
    date: chartDays[index],
    balance,
    x:
      chartValues.length === 1 ? 450 : (index / (chartValues.length - 1)) * 900,
    y: 165 - ((balance - chartMin) / chartSpread) * 140,
  }));
  const chartLine = chartPoints
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const chartArea = chartPoints.length ? `0,180 ${chartLine} 900,180` : "";
  const receivedIncome = accountEntries.filter(
    (entry) => entry.type === "income" && entry.status === "Recebido",
  );
  const openIncome = accountEntries.filter(
    (entry) =>
      entry.type === "income" &&
      (entry.status === "Previsto" || entry.status === "Vencido"),
  );
  const paidExpenses = accountEntries.filter(
    (entry) => entry.type === "expense" && entry.status === "Pago",
  );
  const openExpenses = accountEntries.filter(
    (entry) =>
      entry.type === "expense" &&
      (entry.status === "Previsto" || entry.status === "Vencido"),
  );
  const sumEntries = (rows: FinancialEntry[]) =>
    rows.reduce((sum, entry) => sum + entry.amount, 0);
  const currentResult = sumEntries(receivedIncome) - sumEntries(paidExpenses);
  const expectedResult = incomeTotal - expenseTotal;
  const shiftAccountMonth = (offset: number) => {
    const [year, month] = accountMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    setAccountMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  const accountMonthLabel = new Date(
    `${accountMonth}-01T12:00:00`,
  ).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const AccountCard = ({
    label,
    value,
    tone,
    icon: Icon,
    items: summaryItems,
  }: any) => (
    <article className="metric account-metric">
      <span className={`metric-icon ${tone}`}>
        <Icon />
      </span>
      <div className="account-metric-main">
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
      <div className="account-subcards">
        {summaryItems.map((item: any) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <b className={item.tone || ""}>{item.value}</b>
            <small>{item.count}</small>
          </div>
        ))}
      </div>
    </article>
  );
  return (
    <>
      <Head
        title={accounts ? "Contas e Lançamentos" : "Fluxo de Caixa"}
        sub={
          accounts
            ? "Contas a pagar e receber em um só lugar"
            : "Controle realizado e projeção financeira"
        }
      >
        <div className="row">
          {accounts && (
            <Button
              kind="ghost"
              onClick={() =>
                setRecurringEditor({
                  id: `fixed-${Date.now()}`,
                  description: "",
                  party: "",
                  category: "Despesa fixa",
                  amount: 0,
                  type: "expense",
                  dueDay: 10,
                  startDate: localIsoDate(),
                  endDate: shiftIsoDate(localIsoDate(), 365),
                })
              }
            >
              <CalendarDays /> Nova conta fixa
            </Button>
          )}
          <Button onClick={addTransaction}>
            <Plus /> Novo lançamento
          </Button>
        </div>
      </Head>
      {!accounts && (
        <div className="cash-view-tabs">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            Visão geral
          </button>
          <button
            className={view === "daily" ? "active" : ""}
            onClick={() => setView("daily")}
          >
            Planejamento diário
          </button>
        </div>
      )}
      {view === "daily" && !accounts ? (
        <section className="cash-planner panel">
          <div className="cash-planner-toolbar">
            <div>
              <h3>Planejamento diário</h3>
              <p>
                Edite entradas e saídas diretamente por dia. O saldo é
                recalculado automaticamente.
              </p>
            </div>
            <label>
              Saldo inicial{" "}
              <input
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={(event) =>
                  setInitialBalance(Number(event.target.value) || 0)
                }
              />
            </label>
          </div>
          <div className="cash-months-scroll">
            {cashMonths.map((month) => {
              const days = Array.from(
                { length: new Date(2026, month + 1, 0).getDate() },
                (_, index) => index + 1,
              );
              const prefix = `2026-${String(month + 1).padStart(2, "0")}`;
              const monthIncome = active
                .filter(
                  (entry) =>
                    entry.date.startsWith(prefix) && entry.type === "income",
                )
                .reduce((sum, entry) => sum + entry.amount, 0);
              const monthExpense = active
                .filter(
                  (entry) =>
                    entry.date.startsWith(prefix) && entry.type === "expense",
                )
                .reduce((sum, entry) => sum + entry.amount, 0);
              const finalDate = `${prefix}-${String(days.length).padStart(2, "0")}`;
              return (
                <article className="cash-month-card" key={month}>
                  <h4>
                    {monthNames[month]} <span>2026</span>
                  </h4>
                  <div className="cash-day-grid cash-day-head">
                    <span>Data</span>
                    <span>Entrada</span>
                    <span>Saída</span>
                    <span>Diário</span>
                    <span>Saldo</span>
                  </div>
                  {days.map((day) => {
                    const date = `${prefix}-${String(day).padStart(2, "0")}`;
                    const income = dailyValue(date, "income");
                    const expense = dailyValue(date, "expense");
                    const incomeDetails = dailyDetails(date, "income");
                    const expenseDetails = dailyDetails(date, "expense");
                    const daily = income - expense;
                    const balance = runningBalance(date);
                    return (
                      <div className="cash-day-grid cash-day-row" key={date}>
                        <span>
                          {day} -{" "}
                          {dayNames[new Date(2026, month, day).getDay()]}
                        </span>
                        <div className="cash-value-cell">
                          <input
                            aria-label={`Entrada de ${date}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={income || ""}
                            placeholder="0,00"
                            onChange={(event) =>
                              updateDailyTotal(
                                date,
                                "income",
                                Number(event.target.value),
                              )
                            }
                          />
                          {incomeDetails.length > 0 && (
                            <div className="cash-movement-tooltip">
                              <b>Entradas do dia</b>
                              {incomeDetails.map((entry) => (
                                <span key={entry.id}>
                                  <strong>{entry.description}</strong>
                                  <small>
                                    {entry.party || "Sem cliente/fornecedor"} ·{" "}
                                    {brl(entry.amount)}
                                  </small>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="cash-value-cell">
                          <input
                            aria-label={`Saída de ${date}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={expense || ""}
                            placeholder="0,00"
                            onChange={(event) =>
                              updateDailyTotal(
                                date,
                                "expense",
                                Number(event.target.value),
                              )
                            }
                          />
                          {expenseDetails.length > 0 && (
                            <div className="cash-movement-tooltip">
                              <b>Saídas do dia</b>
                              {expenseDetails.map((entry) => (
                                <span key={entry.id}>
                                  <strong>{entry.description}</strong>
                                  <small>
                                    {entry.party || "Sem cliente/fornecedor"} ·{" "}
                                    {brl(entry.amount)}
                                  </small>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <b
                          className={
                            daily > 0 ? "positive" : daily < 0 ? "negative" : ""
                          }
                        >
                          {brl(daily)}
                        </b>
                        <b
                          className={`cash-balance ${balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral"}`}
                        >
                          {brl(balance)}
                        </b>
                      </div>
                    );
                  })}
                  <footer>
                    <span>
                      <small>Entradas</small>
                      <b className="positive">{brl(monthIncome)}</b>
                    </span>
                    <span>
                      <small>Saídas</small>
                      <b className="negative">{brl(monthExpense)}</b>
                    </span>
                    <span>
                      <small>Resultado</small>
                      <b>{brl(monthIncome - monthExpense)}</b>
                    </span>
                    <span>
                      <small>Saldo final</small>
                      <b>{brl(runningBalance(finalDate))}</b>
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <div className="account-toolbar-left">
              <div className="period-picker">
                <Seg
                  items={items}
                  value={period}
                  set={(next: string) => {
                    setPeriod(next);
                    setCustomOpen(next === "Personalizado");
                  }}
                />
                {customOpen && !accounts && (
                  <div className="custom-period-popover">
                    <b>Período personalizado</b>
                    <div>
                      <label>
                        Data inicial
                        <input
                          type="date"
                          value={customStart}
                          onChange={(event) =>
                            setCustomStart(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Data final
                        <input
                          type="date"
                          min={customStart}
                          value={customEnd}
                          onChange={(event) => setCustomEnd(event.target.value)}
                        />
                      </label>
                    </div>
                    <button onClick={() => setCustomOpen(false)}>
                      <Check /> Aplicar período
                    </button>
                  </div>
                )}
              </div>
              {accounts && (
                <div className="account-month-nav">
                  <button
                    onClick={() => shiftAccountMonth(-1)}
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <strong>{accountMonthLabel}</strong>
                  <button
                    onClick={() => shiftAccountMonth(1)}
                    aria-label="Próximo mês"
                  >
                    <ChevronRight />
                  </button>
                </div>
              )}
            </div>
            <div className="row">
              <Button
                kind="ghost"
                onClick={() =>
                  open(
                    accounts
                      ? "Filtros de contas e lançamentos"
                      : "Filtros do fluxo de caixa",
                  )
                }
              >
                <Filter />
                Filtros
              </Button>
              <Button
                kind="ghost"
                onClick={() =>
                  downloadCsv(
                    `atsoc-${accounts ? "contas" : "fluxo-caixa"}.csv`,
                    [
                      "Data",
                      "Descrição",
                      "Cliente / fornecedor",
                      "Categoria",
                      "Tipo",
                      "Valor",
                      "Status",
                    ],
                    filteredEntries.map((entry) => [
                      entry.date,
                      entry.description,
                      entry.party,
                      entry.category,
                      entry.type === "income" ? "Entrada" : "Saída",
                      entry.amount,
                      entry.status,
                    ]),
                  )
                }
              >
                <Download />
                Exportar
              </Button>
            </div>
          </div>
          <div className={`metrics ${accounts ? "three" : "four"}`}>
            {accounts ? (
              <>
                <AccountCard
                  label="Total de entradas"
                  value={brl(incomeTotal)}
                  tone="green"
                  icon={ArrowUpRight}
                  items={[
                    {
                      label: "Em aberto",
                      value: brl(sumEntries(openIncome)),
                      count: `${openIncome.length} lançamento(s)`,
                      tone: "orange",
                    },
                    {
                      label: "Recebido",
                      value: brl(sumEntries(receivedIncome)),
                      count: `${receivedIncome.length} lançamento(s)`,
                      tone: "green",
                    },
                  ]}
                />
                <AccountCard
                  label="Total de saídas"
                  value={brl(expenseTotal)}
                  tone="red"
                  icon={ArrowDownRight}
                  items={[
                    {
                      label: "Em aberto",
                      value: brl(sumEntries(openExpenses)),
                      count: `${openExpenses.length} lançamento(s)`,
                      tone: "orange",
                    },
                    {
                      label: "Pago",
                      value: brl(sumEntries(paidExpenses)),
                      count: `${paidExpenses.length} lançamento(s)`,
                      tone: "green",
                    },
                  ]}
                />
                <AccountCard
                  label="Resultado"
                  value={brl(expectedResult)}
                  tone={expectedResult >= 0 ? "green" : "red"}
                  icon={CircleDollarSign}
                  items={[
                    {
                      label: "Resultado atual",
                      value: brl(currentResult),
                      count: "Somente realizados",
                      tone: currentResult >= 0 ? "green" : "red",
                    },
                    {
                      label: "Resultado esperado",
                      value: brl(expectedResult),
                      count: "Realizado + previsto",
                      tone: expectedResult >= 0 ? "green" : "red",
                    },
                  ]}
                />
              </>
            ) : (
              <>
                <Metric
                  label="Saldo inicial"
                  value={brl(openingBalance)}
                  detail={`Em ${formatShortDate(range.start)}`}
                />
                <Metric
                  label="Entradas"
                  value={brl(incomeTotal)}
                  detail="Realizadas e previstas"
                  tone="green"
                />
                <Metric
                  label="Saídas"
                  value={brl(expenseTotal)}
                  detail="Realizadas e previstas"
                  tone="red"
                />
                <Metric
                  label="Saldo projetado"
                  value={brl(projectedBalance)}
                  detail={`Em ${formatShortDate(range.end)}`}
                  tone={projectedBalance >= 0 ? "green" : "red"}
                />
              </>
            )}
          </div>
          {!accounts && (
            <section className="panel line-panel">
              <PanelTitle
                title="Projeção diária"
                sub={`Saldo acumulado para ${period.toLowerCase()}`}
              />
              {chartPoints.length && entries.length ? (
                <div className="cash-chart">
                  <svg viewBox="0 0 900 180" preserveAspectRatio="none">
                    <path
                      className="gridline"
                      d="M0 25H900 M0 75H900 M0 125H900 M0 175H900"
                    />
                    <polygon className="area" points={chartArea} />
                    <polyline className="line" points={chartLine} />
                    {chartPoints.map((point) => (
                      <circle
                        key={point.date}
                        className="chart-point"
                        cx={point.x}
                        cy={point.y}
                        r="4"
                      >
                        <title>
                          {formatShortDate(point.date)} · {brl(point.balance)}
                        </title>
                      </circle>
                    ))}
                  </svg>
                  <div className="chart-range-labels">
                    <span>
                      {formatShortDate(range.start)} · {brl(openingBalance)}
                    </span>
                    <span>
                      {formatShortDate(range.end)} · {brl(projectedBalance)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="empty-chart">
                  <ReceiptText />
                  <b>Nenhum dado financeiro no período</b>
                  <span>
                    Altere o período ou cadastre um lançamento para visualizar a
                    projeção.
                  </span>
                </div>
              )}
            </section>
          )}
          {accounts && (
            <section className="panel recurring-rules">
              <PanelTitle
                title="Contas fixas e recorrentes"
                sub="Geram previsões automaticamente até a data de validade"
              >
                <Button
                  kind="ghost"
                  onClick={() =>
                    setRecurringEditor({
                      id: `fixed-${Date.now()}`,
                      description: "",
                      party: "",
                      category: "Despesa fixa",
                      amount: 0,
                      type: "expense",
                      dueDay: 10,
                      startDate: localIsoDate(),
                      endDate: shiftIsoDate(localIsoDate(), 365),
                    })
                  }
                >
                  <Plus /> Cadastrar conta fixa
                </Button>
              </PanelTitle>
              <div className="recurring-rule-grid">
                {recurringRules.map((rule) => {
                  const nextEntry = createRecurringEntries(rule).find(
                    (entry) => entry.date >= localIsoDate(),
                  );
                  return (
                    <article key={rule.id}>
                      <span
                        className={`metric-icon ${rule.type === "income" ? "green" : "red"}`}
                      >
                        {rule.type === "income" ? (
                          <ArrowUpRight />
                        ) : (
                          <ArrowDownRight />
                        )}
                      </span>
                      <div>
                        <b>{rule.description}</b>
                        <small>
                          {rule.id.startsWith("cost-")
                            ? "Vinculado a Custos e Parâmetros"
                            : rule.party || "Sem fornecedor"}
                        </small>
                        <em>
                          Todo dia {rule.dueDay} • até{" "}
                          {new Date(
                            `${rule.endDate}T12:00:00`,
                          ).toLocaleDateString("pt-BR")}
                        </em>
                      </div>
                      <strong>{brl(rule.amount)}</strong>
                      <small>
                        Próxima:{" "}
                        {nextEntry
                          ? new Date(
                              `${nextEntry.date}T12:00:00`,
                            ).toLocaleDateString("pt-BR")
                          : "encerrada"}
                      </small>
                      <div className="row-actions">
                        {rule.id.startsWith("cost-") ? (
                          <>
                          <button
                            className="icon"
                            title="Editar custo fixo"
                            aria-label={`Editar ${rule.description}`}
                            onClick={() => setRecurringEditor({ ...rule })}
                          >
                            <Pencil />
                          </button>
                          <button
                            className="icon danger"
                            title="Excluir custo fixo"
                            onClick={() => deleteRecurringRule(rule)}
                          >
                            <Trash2 />
                          </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon"
                              title="Editar conta fixa"
                              onClick={() => setRecurringEditor({ ...rule })}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="icon danger"
                              title="Excluir conta fixa"
                              onClick={() => deleteRecurringRule(rule)}
                            >
                              <Trash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!recurringRules.length && (
                  <div className="empty-recurring">
                    <CalendarDays />
                    <b>Nenhuma conta fixa cadastrada</b>
                    <span>
                      Cadastre aluguel, energia, internet e outras contas
                      recorrentes uma única vez.
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
          <Table
            rows={filteredEntries}
            title={
              accounts
                ? `Movimentações • ${accountMonthLabel}`
                : "Movimentações"
            }
            onChange={changeTransaction}
            onDelete={deleteTransaction}
          />
          {recurringEditor && (
            <div
              className="modal-bg"
              onMouseDown={(event) =>
                event.currentTarget === event.target && setRecurringEditor(null)
              }
            >
              <div className="modal recurring-editor">
                <div className="modal-head">
                  <div>
                    <small>CONTAS FIXAS</small>
                    <h3>
                      {recurringRules.some(
                        (rule) => rule.id === recurringEditor.id,
                      )
                        ? "Editar recorrência"
                        : "Nova conta fixa"}
                    </h3>
                  </div>
                  <button
                    className="icon"
                    onClick={() => setRecurringEditor(null)}
                  >
                    <X />
                  </button>
                </div>
                <p className="modal-helper">
                  O sistema criará automaticamente uma previsão em cada mês. Uma
                  fatura específica poderá ser editada sem alterar os demais
                  meses.
                </p>
                <div className="form-grid">
                  <label>
                    Descrição
                    <input
                      value={recurringEditor.description}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          description: event.target.value,
                        })
                      }
                      placeholder="Ex.: Aluguel"
                    />
                  </label>
                  <label>
                    Fornecedor / origem
                    <input
                      value={recurringEditor.party}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          party: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={recurringEditor.type}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          type: event.target.value as "income" | "expense",
                        })
                      }
                    >
                      <option value="expense">Conta a pagar</option>
                      <option value="income">Conta a receber</option>
                    </select>
                  </label>
                  <label>
                    Categoria
                    <input
                      value={recurringEditor.category}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          category: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Valor padrão
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recurringEditor.amount}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          amount: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label>
                    Dia do vencimento
                    <select
                      value={recurringEditor.dueDay}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          dueDay: Number(event.target.value),
                        })
                      }
                    >
                      {Array.from({ length: 28 }, (_, index) => index + 1).map(
                        (day) => (
                          <option key={day} value={day}>
                            Dia {day}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Início da recorrência
                    <input
                      type="date"
                      value={recurringEditor.startDate}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          startDate: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Validade / data final
                    <input
                      type="date"
                      min={recurringEditor.startDate}
                      value={recurringEditor.endDate}
                      onChange={(event) =>
                        setRecurringEditor({
                          ...recurringEditor,
                          endDate: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <Button kind="ghost" onClick={() => setRecurringEditor(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveRecurringRule}>
                    <Check /> Salvar e gerar previsões
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Clients({
  p,
  clients,
  setClients,
  setEntries,
}: {
  p: AtsocParameters;
  clients: ClientRecord[];
  setClients: (
    updater: ClientRecord[] | ((current: ClientRecord[]) => ClientRecord[]),
  ) => void;
  setEntries: (
    updater:
      | FinancialEntry[]
      | ((current: FinancialEntry[]) => FinancialEntry[]),
  ) => void;
}) {
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ClientRecord | null>(null);
  const [inactivationClient, setInactivationClient] =
    useState<ClientRecord | null>(null);
  const [inactiveReason, setInactiveReason] = useState("");
  const [inactiveDetail, setInactiveDetail] = useState("");
  const [followUpDate, setFollowUpDate] = useState(() =>
    shiftIsoDate(localIsoDate(), 30),
  );
  const [adjustmentClient, setAdjustmentClient] =
    useState<ClientRecord | null>(null);
  const [adjustmentDraft, setAdjustmentDraft] = useState({
    kind: "upgrade" as ContractAdjustment["kind"],
    effectiveDate: localIsoDate(),
    newRevenue: 0,
    newActiveClients: 0,
    notes: "",
  });
  const activeClients = clients.filter((client) => client.status === "active");
  const inactiveClients = clients.filter(
    (client) => client.status === "inactive",
  );
  const rows = activeClients.map((client) => ({
    client,
    result: clientProfitability(client, activeClients, p),
  }));
  const mrr = activeClients.reduce((s, c) => s + c.monthlyRevenue, 0);
  const totalBase = activeClients.reduce((s, c) => s + c.activeClients, 0);
  const avgMargin =
    rows.reduce((s, r) => s + r.result.margin, 0) / Math.max(1, rows.length);
  const filteredActive = rows.filter(({ client }) =>
    client.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredInactive = inactiveClients.filter((client) =>
    client.name.toLowerCase().includes(query.toLowerCase()),
  );
  const syncReceivables = (client: ClientRecord) =>
    setEntries((current) => {
      const prefix = `contract-${client.id}-`;
      const preserved = current.filter(
        (entry) => !entry.id.startsWith(prefix) || entry.status === "Recebido",
      );
      const existingIds = new Set(preserved.map((entry) => entry.id));
      return [
        ...preserved,
        ...createClientReceivables(client).filter(
          (entry) => !existingIds.has(entry.id),
        ),
      ];
    });
  const saveClient = () => {
    if (!editor?.name.trim()) return;
    const normalizedEditor = {
      ...editor,
      intensityFactor: p.defaultIntensityFactor,
    };
    setClients((current) =>
      current.some((client) => client.id === normalizedEditor.id)
        ? current.map((client) =>
            client.id === normalizedEditor.id ? normalizedEditor : client,
          )
        : [...current, normalizedEditor],
    );
    syncReceivables(normalizedEditor);
    setEditor(null);
  };
  const deleteClient = (client: ClientRecord) => {
    if (
      window.confirm(
        `Excluir definitivamente o cliente “${client.name}”? Esta ação não poderá ser desfeita.`,
      )
    ) {
      setClients((current) => current.filter((item) => item.id !== client.id));
      setEntries((current) =>
        current.filter(
          (entry) =>
            !entry.id.startsWith(`contract-${client.id}-`) ||
            entry.status === "Recebido",
        ),
      );
    }
  };
  const confirmInactivation = () => {
    if (!inactivationClient) return;
    if (inactiveReason === "Outro motivo" && !inactiveDetail.trim()) return;
    const finalReason =
      inactiveReason === "Outro motivo"
        ? `Outro motivo: ${inactiveDetail.trim()}`
        : inactiveReason || "Contrato inativado";
    setClients((current) =>
      current.map((client) =>
        client.id === inactivationClient.id
          ? {
              ...client,
              status: "inactive",
              inactiveAt: localIsoDate(),
              followUpDate,
              inactiveReason: finalReason,
            }
          : client,
      ),
    );
    setEntries((current) =>
      current.map((entry) =>
        entry.id.startsWith(`contract-${inactivationClient.id}-`) &&
        entry.status === "Previsto"
          ? { ...entry, status: "Cancelado" }
          : entry,
      ),
    );
    setInactivationClient(null);
    setInactiveReason("");
    setInactiveDetail("");
    setTab("inactive");
  };
  const reactivateClient = (client: ClientRecord) => {
    const reactivated = {
      ...client,
      status: "active" as const,
      inactiveAt: undefined,
      followUpDate: undefined,
      inactiveReason: undefined,
    };
    setClients((current) =>
      current.map((item) => (item.id === client.id ? reactivated : item)),
    );
    syncReceivables(reactivated);
  };
  const openContractAdjustment = (client: ClientRecord) => {
    setAdjustmentClient(client);
    setAdjustmentDraft({
      kind: "upgrade",
      effectiveDate:
        client.contractStart && client.contractStart > localIsoDate()
          ? client.contractStart
          : localIsoDate(),
      newRevenue: client.monthlyRevenue,
      newActiveClients: client.activeClients,
      notes: "",
    });
  };
  const saveContractAdjustment = () => {
    if (
      !adjustmentClient ||
      !adjustmentDraft.effectiveDate ||
      adjustmentDraft.newRevenue < 0 ||
      adjustmentDraft.newActiveClients < 0
    )
      return;
    const adjustment: ContractAdjustment = {
      id: `adjustment-${Date.now()}`,
      kind: adjustmentDraft.kind,
      effectiveDate: adjustmentDraft.effectiveDate,
      previousRevenue: adjustmentClient.monthlyRevenue,
      newRevenue: adjustmentDraft.newRevenue,
      previousActiveClients: adjustmentClient.activeClients,
      newActiveClients: adjustmentDraft.newActiveClients,
      notes: adjustmentDraft.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const updatedClient: ClientRecord = {
      ...adjustmentClient,
      monthlyRevenue: adjustment.newRevenue,
      activeClients: adjustment.newActiveClients,
      adjustments: [...(adjustmentClient.adjustments || []), adjustment],
    };
    setClients((current) =>
      current.map((client) =>
        client.id === updatedClient.id ? updatedClient : client,
      ),
    );
    setEntries((current) => {
      const prefix = `contract-${updatedClient.id}-`;
      const preserved = current.filter(
        (entry) =>
          !entry.id.startsWith(prefix) ||
          preserveInstallmentOnContractAdjustment(
            entry.date,
            adjustment.effectiveDate,
            entry.status,
          ),
      );
      const existingIds = new Set(preserved.map((entry) => entry.id));
      const future = createClientReceivables(
        updatedClient,
        12,
        adjustment.effectiveDate,
      );
      return [
        ...preserved,
        ...future.filter((entry) => !existingIds.has(entry.id)),
      ];
    });
    setAdjustmentClient(null);
  };
  const updateEditorSchedule = (day: number, changes: Partial<DaySchedule>) =>
    editor &&
    setEditor({
      ...editor,
      schedule: editor.schedule.map((item) =>
        item.day === day ? { ...item, ...changes } : item,
      ),
    });
  return (
    <>
      <Head
        title="Clientes e Contratos"
        sub="Receita, margem e consumo operacional por contrato"
      >
        <Button
          onClick={() =>
            setEditor({
              id: `client-${Date.now()}`,
              name: "",
              activeClients: 0,
              monthlyRevenue: 0,
              intensityFactor: 1,
              schedule: weekSchedule("18:00", "00:00", [0, 1, 2, 3, 4, 5, 6]),
              status: "active",
              contractStart: localIsoDate(),
              billingDay: 10,
              channels: "WhatsApp + Telefone",
              supportLevel: "N1 + N2",
            })
          }
        >
          <Plus /> Novo cliente
        </Button>
      </Head>
      <div className="metrics four">
        <Metric
          label="Clientes ativos"
          value={String(activeClients.length)}
          detail="Carteira calculada"
          tone="green"
        />
        <Metric
          label="MRR contratado"
          value={brl(mrr)}
          detail={`Ticket médio ${brl(mrr / Math.max(1, activeClients.length))}`}
        />
        <Metric
          label="Margem média"
          value={`${(avgMargin * 100).toFixed(1)}%`}
          detail="Após impostos, CAC e rateios"
          tone="green"
        />
        <Metric
          label="Base atendida"
          value={totalBase.toLocaleString("pt-BR")}
          detail="clientes dos provedores"
        />
      </div>
      <div className="client-tabs">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          Carteira ativa <span>{activeClients.length}</span>
        </button>
        <button
          className={tab === "inactive" ? "active" : ""}
          onClick={() => setTab("inactive")}
        >
          Recuperação de contratos <span>{inactiveClients.length}</span>
        </button>
      </div>
      <section className="panel table-panel">
        <PanelTitle
          title={
            tab === "active" ? "Carteira ativa" : "Follow-up de recuperação"
          }
          sub={
            tab === "active"
              ? "Edite, inative ou exclua clientes da carteira"
              : "Contratos inativos aguardando tentativa de recuperação"
          }
        >
          <div className="search">
            <Search />
            <input
              placeholder="Buscar cliente..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </PanelTitle>
        <div className="table-wrap">
          <table>
            <thead>
              {tab === "active" ? (
                <tr>
                  <th>Cliente</th>
                  <th>Base ativa</th>
                  <th>MRR</th>
                  <th>Lucro estimado</th>
                  <th>Margem</th>
                  <th>Capacidade</th>
                  <th>Ações</th>
                </tr>
              ) : (
                <tr>
                  <th>Cliente</th>
                  <th>MRR anterior</th>
                  <th>Inativado em</th>
                  <th>Próximo follow-up</th>
                  <th>Motivo</th>
                  <th>Ações</th>
                </tr>
              )}
            </thead>
            <tbody>
              {tab === "active"
                ? filteredActive.map(({ client, result }) => (
                    <tr
                      className="clickable"
                      key={client.id}
                      onClick={() => setEditor({ ...client })}
                    >
                      <td>
                        <div className="client">
                          <span>{client.name.slice(0, 2).toUpperCase()}</span>
                          <b>{client.name}</b>
                        </div>
                      </td>
                      <td>{client.activeClients.toLocaleString("pt-BR")}</td>
                      <td>
                        <b>{brl(client.monthlyRevenue)}</b>
                      </td>
                      <td className="positive">{brl(result.finalProfit)}</td>
                      <td>
                        <Pill tone={result.margin >= 0.25 ? "green" : "orange"}>
                          {(result.margin * 100).toFixed(1)}%
                        </Pill>
                      </td>
                      <td>
                        <div className="fte-cell">
                          <b>{result.loadFte.toFixed(2)} FTE</b>
                          <small>
                            Automático • {result.equivalentHours.toFixed(0)}h
                            equivalentes
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon"
                            title="Editar cliente"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditor({ ...client });
                            }}
                          >
                            <Pencil />
                          </button>
                          <button
                            className="icon save-action"
                            title="Ajustar contrato a partir de uma data"
                            onClick={(event) => {
                              event.stopPropagation();
                              openContractAdjustment(client);
                            }}
                          >
                            <TrendingUp />
                          </button>
                          <button
                            className="icon warning"
                            title="Inativar e enviar para recuperação"
                            onClick={(event) => {
                              event.stopPropagation();
                              setInactivationClient(client);
                              setFollowUpDate(shiftIsoDate(localIsoDate(), 30));
                            }}
                          >
                            <UserMinus />
                          </button>
                          <button
                            className="icon danger"
                            title="Excluir cliente"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteClient(client);
                            }}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : filteredInactive.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="client">
                          <span>{client.name.slice(0, 2).toUpperCase()}</span>
                          <b>{client.name}</b>
                        </div>
                      </td>
                      <td>
                        <b>{brl(client.monthlyRevenue)}</b>
                      </td>
                      <td>
                        {client.inactiveAt
                          ? new Date(
                              `${client.inactiveAt}T12:00:00`,
                            ).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td>
                        <Pill
                          tone={
                            client.followUpDate &&
                            client.followUpDate <= localIsoDate()
                              ? "orange"
                              : "blue"
                          }
                        >
                          {client.followUpDate
                            ? new Date(
                                `${client.followUpDate}T12:00:00`,
                              ).toLocaleDateString("pt-BR")
                            : "Sem data"}
                        </Pill>
                      </td>
                      <td>{client.inactiveReason || "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon save-action"
                            title="Reativar contrato"
                            onClick={() => reactivateClient(client)}
                          >
                            <RotateCcw />
                          </button>
                          <button
                            className="icon"
                            title="Editar cliente"
                            onClick={() => setEditor({ ...client })}
                          >
                            <Pencil />
                          </button>
                          <button
                            className="icon danger"
                            title="Excluir definitivamente"
                            onClick={() => deleteClient(client)}
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              {((tab === "active" && !filteredActive.length) ||
                (tab === "inactive" && !filteredInactive.length)) && (
                <tr>
                  <td colSpan={tab === "active" ? 7 : 6}>
                    <div className="empty-table">
                      <Users />
                      <b>
                        {tab === "active"
                          ? "Nenhum cliente ativo"
                          : "Nenhum contrato em recuperação"}
                      </b>
                      <span>
                        {query
                          ? "Nenhum resultado para a busca."
                          : tab === "active"
                            ? "Cadastre o primeiro cliente oficial da ATSOC."
                            : "Clientes inativados aparecerão aqui para follow-up."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {editor && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setEditor(null)
          }
        >
          <div className="modal client-editor client-contract-editor">
            <div className="modal-head">
              <div>
                <small>CLIENTES E CONTRATOS</small>
                <h3>
                  {clients.some((client) => client.id === editor.id)
                    ? "Editar cliente e contrato"
                    : "Novo cliente e contrato"}
                </h3>
              </div>
              <button className="icon" onClick={() => setEditor(null)}>
                <X />
              </button>
            </div>
            <div className="client-editor-scroll">
              <h4>Dados cadastrais</h4>
              <div className="form-grid">
                <label>
                  Nome fantasia
                  <input
                    value={editor.name}
                    onChange={(event) =>
                      setEditor({ ...editor, name: event.target.value })
                    }
                    placeholder="Nome do provedor"
                  />
                </label>
                <label>
                  Razão social
                  <input
                    value={editor.legalName || ""}
                    onChange={(event) =>
                      setEditor({ ...editor, legalName: event.target.value })
                    }
                  />
                </label>
                <label>
                  CNPJ
                  <input
                    value={editor.cnpj || ""}
                    onChange={(event) =>
                      setEditor({ ...editor, cnpj: event.target.value })
                    }
                  />
                </label>
                <label>
                  Responsável
                  <input
                    value={editor.responsible || ""}
                    onChange={(event) =>
                      setEditor({ ...editor, responsible: event.target.value })
                    }
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={editor.phone || ""}
                    onChange={(event) =>
                      setEditor({ ...editor, phone: event.target.value })
                    }
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={editor.email || ""}
                    onChange={(event) =>
                      setEditor({ ...editor, email: event.target.value })
                    }
                  />
                </label>
              </div>
              <h4>Contrato e faturamento</h4>
              <div className="form-grid">
                <label>
                  Base ativa
                  <input
                    type="number"
                    min="0"
                    value={editor.activeClients}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        activeClients: Number(event.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label>
                  MRR contratado
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editor.monthlyRevenue}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        monthlyRevenue: Number(event.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label>
                  CAC real do cliente
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editor.cacManual || 0}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        cacManual: Number(event.target.value) || 0,
                      })
                    }
                  />
                  <small>
                    Opcional. Será amortizado na DRE somente durante o payback configurado.
                  </small>
                </label>
                <label>
                  Início do contrato
                  <input
                    type="date"
                    value={editor.contractStart || localIsoDate()}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        contractStart: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Dia de vencimento
                  <select
                    value={editor.billingDay || 10}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        billingDay: Number(event.target.value),
                      })
                    }
                  >
                    {Array.from({ length: 28 }, (_, index) => index + 1).map(
                      (day) => (
                        <option key={day} value={day}>
                          Dia {day}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Canais
                  <select
                    value={editor.channels || "WhatsApp + Telefone"}
                    onChange={(event) =>
                      setEditor({ ...editor, channels: event.target.value })
                    }
                  >
                    <option>WhatsApp + Telefone</option>
                    <option>WhatsApp</option>
                    <option>Telefone</option>
                    <option>Omnichannel</option>
                  </select>
                </label>
                <label>
                  Nível de suporte
                  <select
                    value={editor.supportLevel || "N1 + N2"}
                    onChange={(event) =>
                      setEditor({ ...editor, supportLevel: event.target.value })
                    }
                  >
                    <option>N1 + N2</option>
                    <option>Somente N1</option>
                    <option>N1 + N2 + N3</option>
                  </select>
                </label>
                <label>
                  Intensidade operacional automática
                  <input
                    type="text"
                    value={`${p.defaultIntensityFactor.toFixed(2)} ×`}
                    disabled
                  />
                  <small>
                    Definida nos parâmetros operacionais da ATSOC. O vendedor
                    não precisa estimar.
                  </small>
                </label>
                <label>
                  Vendedor responsável
                  <input
                    value={editor.seller || ""}
                    onChange={(event) =>
                      setEditor({ ...editor, seller: event.target.value })
                    }
                  />
                </label>
              </div>
              <h4>Cobertura contratada</h4>
              <div className="client-schedule-editor">
                {editor.schedule.map((item, index) => (
                  <div key={item.day} className={!item.enabled ? "off" : ""}>
                    <b>{days[index]}</b>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!item.enabled}
                        onChange={(event) =>
                          updateEditorSchedule(item.day, {
                            enabled: !event.target.checked,
                          })
                        }
                      />
                      Sem atendimento
                    </label>
                    <input
                      type="time"
                      value={item.start}
                      disabled={!item.enabled}
                      onChange={(event) =>
                        updateEditorSchedule(item.day, {
                          start: event.target.value,
                        })
                      }
                    />
                    <span>até</span>
                    <input
                      type="time"
                      value={item.end}
                      disabled={!item.enabled}
                      onChange={(event) =>
                        updateEditorSchedule(item.day, {
                          end: event.target.value,
                        })
                      }
                    />
                    <em>
                      {item.enabled
                        ? `${coverageHours(item.start, item.end).toFixed(1)}h`
                        : "—"}
                    </em>
                  </div>
                ))}
              </div>
              <div className="auto-capacity-summary">
                <div>
                  <span>FTE automático</span>
                  <b>
                    {adjustedClientLoad(
                      { ...editor, intensityFactor: p.defaultIntensityFactor },
                      p,
                    ).toFixed(2)}{" "}
                    FTE
                  </b>
                  <small>Base ÷ capacidade teórica × intensidade</small>
                </div>
                <div>
                  <span>Horas semanais</span>
                  <b>{weeklyCoverageHours(editor.schedule).toFixed(1)}h</b>
                  <small>Cobertura informada</small>
                </div>
                <div>
                  <span>Horas equivalentes/mês</span>
                  <b>
                    {equivalentMonthlyHours(
                      { ...editor, intensityFactor: p.defaultIntensityFactor },
                      p,
                    ).toFixed(0)}
                    h
                  </b>
                  <small>Já ponderadas pelo FTE</small>
                </div>
                <div>
                  <span>Previsões financeiras</span>
                  <b>12 mensalidades</b>
                  <small>Geradas automaticamente pelo vencimento</small>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <Button kind="ghost" onClick={() => setEditor(null)}>
                Cancelar
              </Button>
              <Button onClick={saveClient}>
                <Check /> Salvar contrato e gerar previsões
              </Button>
            </div>
          </div>
        </div>
      )}
      {adjustmentClient && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setAdjustmentClient(null)
          }
        >
          <div className="modal contract-adjustment-modal">
            <div className="modal-head">
              <div>
                <small>ALTERAÇÃO CONTRATUAL</small>
                <h3>Ajustar contrato • {adjustmentClient.name}</h3>
              </div>
              <button className="icon" onClick={() => setAdjustmentClient(null)}>
                <X />
              </button>
            </div>
            <p className="modal-helper">
              O novo valor será aplicado somente às parcelas com vencimento igual
              ou posterior à data de vigência. Parcelas anteriores e recebidas não
              serão alteradas.
            </p>
            <div className="form-grid">
              <label>
                Tipo de ajuste
                <select
                  value={adjustmentDraft.kind}
                  onChange={(event) =>
                    setAdjustmentDraft({
                      ...adjustmentDraft,
                      kind: event.target.value as ContractAdjustment["kind"],
                    })
                  }
                >
                  <option value="upgrade">Upgrade</option>
                  <option value="downgrade">Downgrade</option>
                  <option value="reajuste">Reajuste contratual</option>
                </select>
              </label>
              <label>
                Vigência do novo valor
                <input
                  type="date"
                  min={adjustmentClient.contractStart || undefined}
                  value={adjustmentDraft.effectiveDate}
                  onChange={(event) =>
                    setAdjustmentDraft({
                      ...adjustmentDraft,
                      effectiveDate: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                MRR atual
                <input value={adjustmentClient.monthlyRevenue} disabled />
              </label>
              <label>
                Novo MRR
                <input
                  type="number"
                  min="0"
                  value={adjustmentDraft.newRevenue}
                  onChange={(event) =>
                    setAdjustmentDraft({
                      ...adjustmentDraft,
                      newRevenue: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Base atual
                <input value={adjustmentClient.activeClients} disabled />
              </label>
              <label>
                Nova base ativa
                <input
                  type="number"
                  min="0"
                  value={adjustmentDraft.newActiveClients}
                  onChange={(event) =>
                    setAdjustmentDraft({
                      ...adjustmentDraft,
                      newActiveClients: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="full-field">
                Observação
                <textarea
                  value={adjustmentDraft.notes}
                  onChange={(event) =>
                    setAdjustmentDraft({
                      ...adjustmentDraft,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Ex.: inclusão de novo canal e ampliação da cobertura"
                />
              </label>
            </div>
            {!!adjustmentClient.adjustments?.length && (
              <div className="adjustment-history">
                <b>Histórico de alterações</b>
                {adjustmentClient.adjustments
                  .slice()
                  .reverse()
                  .slice(0, 4)
                  .map((adjustment) => (
                    <div key={adjustment.id}>
                      <span>
                        {adjustment.kind} •{" "}
                        {new Date(
                          `${adjustment.effectiveDate}T12:00:00`,
                        ).toLocaleDateString("pt-BR")}
                      </span>
                      <strong>
                        {brl(adjustment.previousRevenue)} →{" "}
                        {brl(adjustment.newRevenue)}
                      </strong>
                    </div>
                  ))}
              </div>
            )}
            <div className="modal-actions">
              <Button kind="ghost" onClick={() => setAdjustmentClient(null)}>
                Cancelar
              </Button>
              <Button onClick={saveContractAdjustment}>
                <Check /> Aplicar a partir da vigência
              </Button>
            </div>
          </div>
        </div>
      )}
      {inactivationClient && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setInactivationClient(null)
          }
        >
          <div className="modal client-editor">
            <div className="modal-head">
              <div>
                <small>RECUPERAÇÃO DE CONTRATO</small>
                <h3>Inativar {inactivationClient.name}</h3>
              </div>
              <button
                className="icon"
                onClick={() => setInactivationClient(null)}
              >
                <X />
              </button>
            </div>
            <p className="modal-helper">
              O cliente sairá da carteira ativa e entrará na régua de follow-up
              para tentativa de recuperação.
            </p>
            <div className="form-grid">
              <label>
                Motivo da inativação
                <select
                  value={inactiveReason}
                  onChange={(event) => setInactiveReason(event.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option>Cancelamento solicitado</option>
                  <option>Inadimplência</option>
                  <option>Insatisfação com o serviço</option>
                  <option>Encerramento das atividades</option>
                  <option>Outro motivo</option>
                </select>
              </label>
              {inactiveReason === "Outro motivo" && (
                <label className="full-field">
                  Detalhe o motivo
                  <textarea
                    autoFocus
                    value={inactiveDetail}
                    onChange={(event) => setInactiveDetail(event.target.value)}
                    placeholder="Descreva o motivo da inativação"
                  />
                  {!inactiveDetail.trim() && (
                    <small>O detalhamento é obrigatório.</small>
                  )}
                </label>
              )}
              <label>
                Data do próximo follow-up
                <input
                  type="date"
                  min={localIsoDate()}
                  value={followUpDate}
                  onChange={(event) => setFollowUpDate(event.target.value)}
                />
              </label>
            </div>
            <div className="modal-actions">
              <Button kind="ghost" onClick={() => setInactivationClient(null)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmInactivation}
                disabled={
                  !inactiveReason ||
                  (inactiveReason === "Outro motivo" && !inactiveDetail.trim())
                }
              >
                <UserMinus /> Inativar e acompanhar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const days = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
const postCallLabel = (p: AtsocParameters) => {
  if (p.postCallPolicy === "excellent_plus")
    return `Excelente + ${(p.postCallMarkup * 100).toFixed(1)}%`;
  if (p.postCallPolicy === "excellent") return "Preço excelente";
  if (p.postCallPolicy === "target") return "Preço alvo";
  return "Valor personalizado";
};
function Pricing({
  notify,
  p,
  clients,
  quotes,
  setQuotes,
  crmLeads,
  setCrmLeads,
}: {
  notify: (message: string, tone?: "success" | "error") => void;
  p: AtsocParameters;
  clients: ClientInput[];
  quotes: QuoteRecord[];
  setQuotes: (
    updater: QuoteRecord[] | ((current: QuoteRecord[]) => QuoteRecord[]),
  ) => void;
  crmLeads: CrmLead[];
  setCrmLeads: (
    updater: CrmLead[] | ((current: CrmLead[]) => CrmLead[]),
  ) => void;
}) {
  const [base, setBase] = useState(0),
    [calls, setCalls] = useState(0),
    [providerName, setProviderName] = useState(""),
    [cnpj, setCnpj] = useState(""),
    [responsible, setResponsible] = useState(""),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [channels, setChannels] = useState("WhatsApp + Telefone"),
    [supportLevel, setSupportLevel] = useState("N1 + N2"),
    [contractStart, setContractStart] = useState(() => localIsoDate()),
    [billingDay, setBillingDay] = useState(10),
    [negotiated, setNegotiated] = useState<number | null>(null),
    [discountReason, setDiscountReason] = useState(""),
    [seller, setSeller] = useState("Vinicius Scielzo"),
    [closedInCall, setClosedInCall] = useState(true),
    [usePostCall, setUsePostCall] = useState(false),
    [profile, setProfile] = useState<"seller" | "admin">("admin"),
    [quotesOpen, setQuotesOpen] = useState(false);
  const [sourceCrmLeadId, setSourceCrmLeadId] = useState("");
  const [sch, setSch] = useState(
    days.map((d, i) => ({
      d,
      start: i < 5 ? "18:00" : "08:00",
      end: i < 5 ? "00:00" : "18:00",
      off: i === 6,
    })),
  );
  useEffect(() => {
    const raw = sessionStorage.getItem("atsoc-crm-pricing-lead");
    if (!raw) return;
    try {
      const lead = JSON.parse(raw) as Partial<CrmLead>;
      setProviderName(lead.company || "");
      setResponsible(lead.contact || "");
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      setSourceCrmLeadId(lead.id || "");
    } finally {
      sessionStorage.removeItem("atsoc-crm-pricing-lead");
    }
  }, []);
  const schedule: DaySchedule[] = sch.map((d, day) => ({
    day,
    start: d.start,
    end: d.end,
    enabled: !d.off,
  }));
  const quoteClient: ClientInput = {
    id: "quote",
    name: providerName,
    activeClients: base,
    monthlyRevenue: 0,
    monthlyCalls: calls || undefined,
    intensityFactor: p.defaultIntensityFactor,
    seller,
    schedule,
  };
  const policy = calculateCommercialPricing(quoteClient, p);
  const week = weeklyCoverageHours(schedule),
    month = week * p.weeksPerMonth,
    loadFte = adjustedClientLoad(quoteClient, p),
    capacity = loadFte / (p.availableOperationalFte * p.safeUtilization),
    minimumPrice = policy.minimum.displayPrice,
    targetPrice = policy.target.displayPrice,
    excellentPrice = policy.excellent.displayPrice,
    negotiatedPrice = negotiated ?? targetPrice,
    currentStatement = quoteStatementAtPrice(quoteClient, p, negotiatedPrice),
    belowMinimum = negotiatedPrice < minimumPrice,
    discountPercent = Math.max(
      0,
      (targetPrice - negotiatedPrice) / targetPrice,
    ),
    remainingNegotiation = negotiatedPrice - minimumPrice,
    postCallPrice = policy.postCall.displayPrice,
    effectivePrice =
      !closedInCall && usePostCall && policy.postCall.enabled
        ? postCallPrice
        : negotiatedPrice;
  useEffect(() => {
    setNegotiated(targetPrice);
    setUsePostCall(false);
  }, [targetPrice]);
  const saleSimulation = simulateNewSale(
    clients,
    { ...quoteClient, monthlyRevenue: effectivePrice },
    p,
  );
  const saveProposal = (action: "save" | "generate") => {
    if (!providerName.trim()) {
      notify("Informe o nome do provedor antes de salvar", "error");
      return;
    }
    if (belowMinimum) {
      notify("Proposta bloqueada: solicite aprovação dos sócios", "error");
      return;
    }
    const finalStatement = quoteStatementAtPrice(
      quoteClient,
      p,
      effectivePrice,
    );
    const quoteId = `quote-history-${Date.now()}`;
    const audit: QuoteRecord = {
      id: quoteId,
      crmLeadId: sourceCrmLeadId || undefined,
      client: providerName,
      seller,
      minimumPrice,
      targetPrice,
      excellentPrice,
      postCallPrice: policy.postCall.enabled ? postCallPrice : null,
      negotiatedPrice: effectivePrice,
      finalMargin: finalStatement.margin,
      expectedProfit: finalStatement.finalProfit,
      closedInCall,
      date: new Date().toISOString(),
    };
    setQuotes((current) => [audit, ...current].slice(0, 100));
    const crmNow = new Date().toISOString();
    const crmMatch = crmLeads.find((lead) =>
      (sourceCrmLeadId && lead.id === sourceCrmLeadId)
      || lead.company.trim().toLowerCase() === providerName.trim().toLowerCase(),
    );
    setCrmLeads((current) => {
      const baseRecord: CrmLead = crmMatch || {
          id: `lead-quote-${Date.now()}`,
          company: providerName.trim(),
          contact: responsible,
          phone,
          email,
          origin: "Cotador",
          stage: "prospecting",
          estimatedValue: effectivePrice,
          nextActionDate: shiftIsoDate(localIsoDate(), 7),
          notes: "Criado automaticamente pelo Cotador.",
          owner: "Vinicius Scielzo",
          createdAt: crmNow,
          updatedAt: crmNow,
      };
      const crmRecord = attachQuoteToCrmLead(baseRecord, effectivePrice, crmNow);
      return crmMatch
        ? current.map((lead) => lead.id === crmMatch.id ? crmRecord : lead)
        : [crmRecord, ...current];
    });
    notify(
      action === "generate"
        ? "Proposta gerada, salva e vinculada ao CRM"
        : "Cotação salva e vinculada ao CRM",
    );
  };
  const requestApproval = async () => {
    if (!providerName.trim() || !seller.trim() || !discountReason.trim()) {
      notify("Informe cliente, vendedor e motivo para solicitar aprovação", "error");
      return;
    }
    const request = {
      client: providerName,
      seller,
      desiredPrice: negotiatedPrice,
      resultingMargin: currentStatement.margin,
      reason: discountReason,
      date: new Date().toISOString(),
      status: "pending",
    };
    try {
      const current = await loadWorkspace();
      const requests = Array.isArray(current.data?.approvalRequests)
        ? current.data.approvalRequests
        : [];
      await persistWorkspaceResource(
        "approvalRequests",
        [request, ...requests].slice(0, 100),
      );
      notify("Solicitação enviada aos sócios");
    } catch {
      notify("Não foi possível enviar a solicitação. Tente novamente.", "error");
    }
  };
  const upd = (i: number, k: string, v: any) =>
    setSch((s) => s.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  return (
    <>
      <Head
        title="Cotador / Precificação"
        sub="Transforme escopo operacional em preço seguro e rentável"
      >
        <div className="row">
          <Button kind="ghost" onClick={() => setQuotesOpen(true)}>
            <ClipboardList />
            Cotações
          </Button>
          <Button onClick={() => saveProposal("save")}>
            <Save />
            Salvar
          </Button>
        </div>
      </Head>
      <div className="pricing">
        <div className="stack">
          <section className="panel">
            <Step
              n="01"
              title="Dados do provedor"
              sub="Informações para dimensionamento inicial"
            />
            <div className="form-grid">
              <label>
                Nome do provedor
                <input
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                />
              </label>
              <label>
                Clientes ativos
                <input
                  type="number"
                  value={base}
                  onChange={(e) => setBase(+e.target.value)}
                />
              </label>
              <label>
                Média de atendimentos / mês
                <input
                  type="number"
                  value={calls}
                  onChange={(e) => setCalls(+e.target.value)}
                />
              </label>
              <label>
                Canais
                <select
                  value={channels}
                  onChange={(e) => setChannels(e.target.value)}
                >
                  <option>WhatsApp + Telefone</option>
                  <option>WhatsApp</option>
                  <option>Telefone</option>
                  <option>Omnichannel</option>
                </select>
              </label>
              <label>
                Nível de suporte
                <select
                  value={supportLevel}
                  onChange={(e) => setSupportLevel(e.target.value)}
                >
                  <option>N1 + N2</option>
                  <option>Somente N1</option>
                  <option>N1 + N2 + N3</option>
                </select>
              </label>
              <label>
                Observações
                <input placeholder="Informações adicionais..." />
              </label>
              <label>
                CNPJ
                <input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </label>
              <label>
                Responsável
                <input
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                />
              </label>
              <label>
                Telefone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Início previsto
                <input
                  type="date"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                />
              </label>
              <label>
                Dia de vencimento
                <select
                  value={billingDay}
                  onChange={(e) => setBillingDay(Number(e.target.value))}
                >
                  {Array.from({ length: 28 }, (_, index) => index + 1).map(
                    (day) => (
                      <option key={day} value={day}>
                        Dia {day}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Vendedor responsável
                <input
                  value={seller}
                  onChange={(event) => setSeller(event.target.value)}
                  placeholder="Nome do vendedor"
                />
                <small>
                  Para vendas do Grupo Silva, use: Nome - Grupo Silva.
                </small>
              </label>
            </div>
          </section>
          <section className="panel">
            <Step
              n="02"
              title="Cobertura semanal"
              sub="Configure cada dia individualmente"
            />
            <div className="quick">
              <button
                onClick={() =>
                  setSch((s) =>
                    s.map((d, i) =>
                      i > 0 && i < 5
                        ? {
                            ...d,
                            start: s[0].start,
                            end: s[0].end,
                            off: s[0].off,
                          }
                        : d,
                    ),
                  )
                }
              >
                <Copy />
                Segunda → ter–sex
              </button>
              <button
                onClick={() =>
                  setSch((s) =>
                    s.map((d) => ({
                      ...d,
                      start: s[0].start,
                      end: s[0].end,
                      off: false,
                    })),
                  )
                }
              >
                <Copy />
                Copiar para todos
              </button>
              <button
                onClick={() =>
                  setSch((s) =>
                    s.map((d, i) =>
                      i === 6
                        ? {
                            ...d,
                            start: s[5].start,
                            end: s[5].end,
                            off: s[5].off,
                          }
                        : d,
                    ),
                  )
                }
              >
                <Copy />
                Sábado → domingo
              </button>
              <button
                onClick={() =>
                  setSch((s) => s.map((d) => ({ ...d, off: true })))
                }
              >
                Limpar
              </button>
            </div>
            <div className="schedule">
              {sch.map((d, i) => (
                <div className={d.off ? "off" : ""} key={d.d}>
                  <b>{d.d}</b>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={d.off}
                      onChange={(e) => upd(i, "off", e.target.checked)}
                    />
                    Sem atendimento
                  </label>
                  <span>
                    <input
                      type="time"
                      value={d.start}
                      disabled={d.off}
                      onChange={(e) => upd(i, "start", e.target.value)}
                    />
                    <i>até</i>
                    <input
                      type="time"
                      value={d.end}
                      disabled={d.off}
                      onChange={(e) => upd(i, "end", e.target.value)}
                    />
                  </span>
                  <em>
                    {d.off
                      ? "—"
                      : `${coverageHours(d.start, d.end).toFixed(1)}h`}
                  </em>
                </div>
              ))}
            </div>
            <div className="totals">
              <div>
                <span>Horas semanais</span>
                <b>{week.toFixed(1)}h</b>
              </div>
              <div>
                <span>Horas mensais</span>
                <b>{month.toFixed(0)}h</b>
              </div>
              <div>
                <span>FTE automático</span>
                <b>{loadFte.toFixed(2)} FTE</b>
              </div>
              <div>
                <span>Capacidade consumida</span>
                <b>{(capacity * 100).toFixed(1)}%</b>
              </div>
            </div>
          </section>
        </div>
        <aside className="quote">
          <div className="quote-head">
            <span>COTAÇÃO CALCULADA</span>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as "seller" | "admin")}
              aria-label="Perfil de visualização"
            >
              <option value="seller">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <Price
            label="REFERÊNCIA COMERCIAL"
            value={brl(policy.reference)}
            sub="Referência baseada na cobertura e parâmetros comerciais cadastrados."
          />
          <TierPrice
            tone="minimum"
            badge="MÍNIMO"
            value={brl(minimumPrice)}
            margin={p.minimumCommercialMargin}
            actualMargin={policy.minimum.displayStatement.margin}
            profit={policy.minimum.displayStatement.finalProfit}
            text="Limite comercial autorizado. Não vender abaixo deste valor sem aprovação."
          />
          <TierPrice
            tone="target"
            badge="ALVO"
            value={brl(targetPrice)}
            margin={p.targetCommercialMargin}
            actualMargin={policy.target.displayStatement.margin}
            profit={policy.target.displayStatement.finalProfit}
            text="Valor recomendado para negociação e fechamento."
            recommended
          />
          <TierPrice
            tone="excellent"
            badge="EXCELENTE"
            value={brl(excellentPrice)}
            margin={p.excellentCommercialMargin}
            actualMargin={policy.excellent.displayStatement.margin}
            profit={policy.excellent.displayStatement.finalProfit}
            text="Venda com excelente rentabilidade para a ATSOC."
          />
          {profile === "admin" && (
            <div className="breakdown admin-memory">
              <div>
                <span>Horas equivalentes ajustadas</span>
                <b>{policy.equivalentHours.toFixed(1)}h</b>
              </div>
              <div>
                <span>Custo operacional</span>
                <b>{brl(policy.operationalCost)}</b>
              </div>
              <div>
                <span>Impostos e comissões</span>
                <b>
                  {brl(
                    currentStatement.taxes +
                      currentStatement.nonParticipationCommissions,
                  )}
                </b>
              </div>
              <div>
                <span>CAC + rateio de fixos</span>
                <b>
                  {brl(
                    currentStatement.cacAmortized +
                      currentStatement.fixedAllocation,
                  )}
                </b>
              </div>
              <div>
                <span>Participações</span>
                <b>{brl(currentStatement.participations)}</b>
              </div>
            </div>
          )}
          <div className="negotiation-rule">
            <div className="negotiation-head">
              <span>RÉGUA DE NEGOCIAÇÃO</span>
              <Pill tone={belowMinimum ? "red" : "blue"}>
                {belowMinimum ? "BLOQUEADO" : "AUTORIZADO"}
              </Pill>
            </div>
            <div className="call-condition">
              <small>Condição para fechamento durante a call</small>
              <b>{brl(negotiatedPrice)}</b>
              <span>
                Faixa livre: {brl(minimumPrice)} – {brl(targetPrice)}
              </span>
            </div>
            <label>
              Ajustar dentro da faixa autorizada
              <input
                type="range"
                min={minimumPrice}
                max={targetPrice}
                step="10"
                value={Math.min(
                  targetPrice,
                  Math.max(minimumPrice, negotiatedPrice),
                )}
                onChange={(e) => setNegotiated(+e.target.value)}
              />
            </label>
            <label>
              Preço negociado
              <input
                type="number"
                value={negotiatedPrice}
                onChange={(e) => setNegotiated(+e.target.value)}
              />
            </label>
            <div className="negotiation-metrics">
              <div>
                <span>Margem atual</span>
                <b>{(currentStatement.margin * 100).toFixed(1)}%</b>
              </div>
              <div>
                <span>Lucro estimado</span>
                <b>{brl(currentStatement.finalProfit)}</b>
              </div>
              <div>
                <span>Desconto sobre alvo</span>
                <b>{(discountPercent * 100).toFixed(1)}%</b>
              </div>
              <div>
                <span>Ainda disponível</span>
                <b>{brl(Math.max(0, remainingNegotiation))}</b>
              </div>
            </div>
          </div>
          {negotiatedPrice < targetPrice && (
            <label>
              Motivo do desconto
              <input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Informe o motivo da negociação"
              />
            </label>
          )}
          {belowMinimum && (
            <div className="minimum-block">
              <b>PREÇO ABAIXO DA MARGEM MÍNIMA</b>
              <p>
                Este valor deixaria a operação abaixo da margem mínima definida
                pela ATSOC.
              </p>
              <label>
                Vendedor
                <input
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                />
              </label>
              <Button kind="ghost" className="full" onClick={requestApproval}>
                <ShieldCheck />
                Solicitar aprovação dos sócios
              </Button>
            </div>
          )}
          <div className="post-call">
            <label className="post-call-check">
              <input
                type="checkbox"
                checked={!closedInCall}
                onChange={(e) => {
                  setClosedInCall(!e.target.checked);
                  setUsePostCall(false);
                }}
              />
              Cliente não fechou na call
            </label>
            {!closedInCall && (
              <>
                {policy.postCall.enabled ? (
                  <>
                    <span>VALOR PARA PROPOSTA POSTERIOR</span>
                    <b>{brl(postCallPrice)}</b>
                    <small>Baseado em: {postCallLabel(p)}</small>
                    <Button
                      kind="ghost"
                      className="full"
                      onClick={() => setUsePostCall(true)}
                    >
                      Usar valor da proposta pós-call
                    </Button>
                    {usePostCall && (
                      <Pill tone="green">Valor pós-call selecionado</Pill>
                    )}
                  </>
                ) : (
                  <small>
                    Política de preço pós-call desativada pelo administrador.
                  </small>
                )}
              </>
            )}
          </div>
          <div className="sale-impact">
            <span>IMPACTO OPERACIONAL ANTES DE SALVAR</span>
            <b>
              {saleSimulation.hireCount
                ? `Exige +${saleSimulation.hireCount} contratação`
                : "Equipe atual comporta a venda"}
            </b>
            <small>{saleSimulation.message}</small>
            <div>
              <em>Lucro incremental</em>
              <strong
                className={
                  saleSimulation.incrementalProfit >= 0
                    ? "positive"
                    : "negative"
                }
              >
                {brl(saleSimulation.incrementalProfit)}
              </strong>
            </div>
          </div>
          <Button className="full" onClick={() => saveProposal("generate")}>
            <FileBarChart />
            Gerar proposta
          </Button>
        </aside>
      </div>
      {quotesOpen && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setQuotesOpen(false)
          }
        >
          <div className="modal history-modal">
            <div className="modal-head">
              <div>
                <small>HISTÓRICO COMERCIAL</small>
                <h3>Cotações salvas</h3>
              </div>
              <button className="icon" onClick={() => setQuotesOpen(false)}>
                <X />
              </button>
            </div>
            <div className="history-list">
              {(Array.isArray(quotes) ? quotes : [])
                .filter(Boolean)
                .map((quote) => (
                  <article key={quote.id}>
                    <div>
                      <b>{quote.client || "Cliente não informado"}</b>
                      <small>
                        {quote.seller || "Vendedor não informado"} •{" "}
                        {quote.date &&
                        !Number.isNaN(new Date(quote.date).getTime())
                          ? new Date(quote.date).toLocaleString("pt-BR")
                          : "Data não informada"}
                      </small>
                    </div>
                    <span>
                      <small>Negociado</small>
                      <b>{brl(Number(quote.negotiatedPrice) || 0)}</b>
                    </span>
                    <button
                      className="history-delete"
                      title="Excluir cotação"
                      onClick={() => setQuotes((current) => current.filter((item) => item.id !== quote.id))}
                    >
                      <Trash2 />
                    </button>
                    <span>
                      <small>Margem</small>
                      <b>
                        {((Number(quote.finalMargin) || 0) * 100).toFixed(1)}%
                      </b>
                    </span>
                    <span>
                      <small>Status</small>
                      <Pill tone={quote.closedInCall ? "green" : "orange"}>
                        {quote.closedInCall ? "Fechada na call" : "Follow-up"}
                      </Pill>
                    </span>
                  </article>
                ))}
              {(!Array.isArray(quotes) || !quotes.filter(Boolean).length) && (
                <div className="empty-recurring">
                  <ClipboardList />
                  <b>Nenhuma cotação salva</b>
                  <span>
                    As próximas cotações aparecerão aqui automaticamente.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
const Step = ({ n, title, sub }: any) => (
  <div className="step">
    <span>{n}</span>
    <div>
      <h3>{title}</h3>
      <p>{sub}</p>
    </div>
  </div>
);
const Price = ({ label, value, sub, rec }: any) => (
  <div className={`price ${rec ? "recommended" : ""}`}>
    {rec && <i>RECOMENDADO</i>}
    <span>{label}</span>
    <b>{value}</b>
    <small>{sub}</small>
  </div>
);
const TierPrice = ({
  badge,
  value,
  margin,
  actualMargin,
  profit,
  text,
  tone,
  recommended = false,
}: any) => (
  <div
    className={`price tier-price ${tone} ${recommended ? "recommended" : ""}`}
  >
    {recommended && <i>RECOMENDADO PARA FECHAMENTO</i>}
    <span className="tier-badge">{badge}</span>
    <b>{value}</b>
    <div className="tier-financials">
      <span>Receita: {value}</span>
      <span>Lucro: {brl(profit)}</span>
      <strong>Margem real: {(actualMargin * 100).toFixed(1)}%</strong>
    </div>
    <small className="tier-target-margin">
      Meta configurada: {(margin * 100).toFixed(0)}%
    </small>
    <small>{text}</small>
  </div>
);

function Capacity({
  p,
  clients,
  team,
}: {
  p: AtsocParameters;
  clients: ClientInput[];
  team: TeamMember[];
}) {
  const [view, setView] = useState("Dia");
  const [selectedDate, setSelectedDate] = useState(() => localIsoDate());
  const selectedDay = (new Date(`${selectedDate}T12:00:00`).getDay() + 6) % 7;
  const today = localIsoDate();
  const tomorrow = shiftIsoDate(today, 1);
  const activeToday = team.filter((member) => memberWorksOn(member, today));
  const activeTomorrow = team.filter((member) =>
    memberWorksOn(member, tomorrow),
  );
  const offToday = team.filter(
    (member) =>
      member.active && member.operational && !memberWorksOn(member, today),
  );
  const selectedAvailable = team.filter((member) =>
    memberWorksOn(member, selectedDate),
  ).length;
  const operationalParameters = {
    ...p,
    availableOperationalFte: selectedAvailable,
  };
  const analysis = analyzeCapacity(clients, operationalParameters);
  const colors = ["#2f80ed", "#20c997", "#8c6ff7", "#f59f00", "#ec6b8f"];
  const cls = clients.flatMap((client, index) => {
    const schedule = client.schedule.find(
      (s) => s.day === selectedDay && s.enabled,
    );
    if (!schedule) return [];
    const start = timeToMinutes(schedule.start) / 60;
    return [
      {
        n: client.name,
        s: start,
        e: Math.min(24, start + coverageHours(schedule.start, schedule.end)),
        c: colors[index % colors.length],
      },
    ];
  });
  const selectedDayHourly = analysis.slots.filter(
    (s) => s.day === selectedDay && s.slot % 2 === 0,
  );
  const criticalSlots = [...analysis.slots]
    .sort((a, b) => b.safeUtilization - a.safeUtilization)
    .slice(0, 3);
  return (
    <>
      <Head
        title="Operação e Capacidade"
        sub="Cobertura simultânea e necessidade de equipe em tempo real"
      >
        <Seg items={["Dia", "Semana"]} value={view} set={setView} />
      </Head>
      <div className="metrics four">
        <Metric
          label="Capacidade utilizada"
          value={`${(analysis.peak.safeUtilization * 100).toFixed(0)}%`}
          detail={`Pico ${analysis.peak.label}`}
          tone={analysis.peak.safeUtilization > 1 ? "red" : "orange"}
        />
        <Metric
          label="Pico do dia"
          value={`${analysis.maxFte.toFixed(2)} FTE`}
          detail={`Bloco de 30 min • ${analysis.peak.label}`}
          tone={analysis.peak.safeUtilization > 1 ? "red" : "orange"}
        />
        <Metric
          label="Atendentes necessários"
          value={String(analysis.safeStaff)}
          detail={`${selectedAvailable} em escala • seguro ${(p.safeUtilization * 100).toFixed(0)}%`}
          tone={analysis.safeStaff > selectedAvailable ? "red" : "green"}
        />
        <Metric
          label="Capacidade disponível"
          value={`${Math.max(0, (1 - analysis.peak.safeUtilization) * 100).toFixed(0)}%`}
          detail={`${safeClientsPerFte(p).toLocaleString("pt-BR")} clientes seguros/FTE`}
          tone={analysis.peak.safeUtilization < 0.8 ? "green" : "orange"}
        />
      </div>
      <section className="panel operation-roster">
        <PanelTitle
          title="Equipe operacional por escala"
          sub="Disponibilidade calculada automaticamente pelas escalas cadastradas"
        />
        <div className="roster-columns">
          {[
            ["Em escala hoje", activeToday, "green"],
            ["Em escala amanhã", activeTomorrow, "blue"],
            ["Folga hoje", offToday, "orange"],
          ].map(([label, list, tone]: any) => (
            <div key={label} className={`roster-column ${tone}`}>
              <header>
                <b>{label}</b>
                <Pill tone={tone}>{list.length}</Pill>
              </header>
              {list.map((member: TeamMember) => (
                <span key={member.id}>
                  <div className="avatar">
                    {member.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <span>
                    <b>{member.name}</b>
                    <small>
                      {member.role} • {member.shiftPattern} •{" "}
                      {member.shiftStart}–{member.shiftEnd}
                    </small>
                  </span>
                </span>
              ))}
              {!list.length && <em>Ninguém nesta condição.</em>}
            </div>
          ))}
        </div>
      </section>
      <section className="panel timeline">
        <PanelTitle
          title="Cobertura por cliente"
          sub={
            view === "Dia"
              ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                  "pt-BR",
                  { weekday: "long", day: "2-digit", month: "long" },
                )
              : "Visão consolidada da semana"
          }
        >
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </PanelTitle>
        <div className="time-head">
          <span />
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
            <b key={h}>{String(h).padStart(2, "0")}:00</b>
          ))}
        </div>
        {cls.map((c) => (
          <div className="time-row" key={c.n}>
            <b>{c.n}</b>
            <div>
              <i
                style={{
                  left: `${(c.s / 24) * 100}%`,
                  width: `${((c.e - c.s) / 24) * 100}%`,
                  background: c.c,
                }}
              >
                {String(c.s).padStart(2, "0")}:00–
                {c.e === 24 ? "00:00" : `${c.e}:00`}
              </i>
            </div>
          </div>
        ))}
        <div className="heat">
          <b>Simultaneidade</b>
          <span>
            {selectedDayHourly.map((slot) => {
              const n = slot.safeUtilization;
              return (
                <i
                  key={slot.slot}
                  title={`${slot.label}: ${slot.requiredFte.toFixed(2)} FTE • ${(slot.safeUtilization * 100).toFixed(0)}% seguro`}
                  className={
                    n > 0.9
                      ? "critical"
                      : n > 0.8
                        ? "warning"
                        : n >= 0.7
                          ? "attention"
                          : "safe"
                  }
                />
              );
            })}
          </span>
        </div>
        <div className="heat-legend">
          <span>
            <i className="safe" />
            Abaixo de 70%
          </span>
          <span>
            <i className="attention" />
            70–80%
          </span>
          <span>
            <i className="warning" />
            80–90%
          </span>
          <span>
            <i className="critical" />
            Acima de 90%
          </span>
        </div>
      </section>
      <div className="grid">
        <section className="panel">
          <PanelTitle
            title="Necessidade por horário"
            sub="Atendentes disponíveis x necessários"
          />
          <Bars
            values={[0, 4, 8, 12, 16, 20].map((h) =>
              Math.min(100, selectedDayHourly[h]?.safeUtilization * 100 || 0),
            )}
            color="orange"
          />
        </section>
        <section className="panel">
          <PanelTitle
            title="Horários críticos"
            sub="Janelas acima da capacidade segura"
          />
          {criticalSlots.map((slot) => (
            <div className="critical-row" key={`${slot.day}-${slot.slot}`}>
              <Clock3 />
              <span>
                <b>
                  {days[slot.day]} • {slot.label}
                </b>
                <small>
                  {Math.ceil(slot.requiredFte / p.safeUtilization)} necessários
                  • {slot.requiredFte.toFixed(2)} FTE
                </small>
              </span>
              <Pill
                tone={
                  slot.safeUtilization > 0.9
                    ? "red"
                    : slot.safeUtilization > 0.8
                      ? "orange"
                      : "yellow"
                }
              >
                {(slot.safeUtilization * 100).toFixed(0)}%
              </Pill>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function Team({
  p,
  members,
  setMembers,
}: {
  p: AtsocParameters;
  members: TeamMember[];
  setMembers: (
    updater: TeamMember[] | ((current: TeamMember[]) => TeamMember[]),
  ) => void;
}) {
  const [draft, setDraft] = useState<TeamMember | null>(null);
  const today = localIsoDate();
  const tomorrow = shiftIsoDate(today, 1);
  const activeMembers = members.filter((member) => member.active);
  const collaborators = activeMembers.filter(
    (member) => member.kind === "collaborator",
  );
  const partners = activeMembers.filter((member) => member.kind === "partner");
  const realCost = collaborators.reduce((sum, member) => sum + member.cost, 0);
  const normalizedCost =
    realCost + partners.reduce((sum, member) => sum + member.cost, 0);
  const workingToday = members.filter((member) => memberWorksOn(member, today));
  const workingTomorrow = members.filter((member) =>
    memberWorksOn(member, tomorrow),
  );
  const saveMember = () => {
    if (!draft?.name.trim() || !draft.role.trim()) return;
    setMembers((current) =>
      current.some((member) => member.id === draft.id)
        ? current.map((member) => (member.id === draft.id ? draft : member))
        : [...current, draft],
    );
    setDraft(null);
  };
  const addMember = () =>
    setDraft({
      id: `member-${Date.now()}`,
      name: "",
      role: "Atendente N1",
      kind: "collaborator",
      cost: p.collaboratorMaxCost,
      hours: p.productiveHoursMonth,
      active: true,
      operational: true,
      shiftPattern: "5x2",
      shiftStart: "08:00",
      shiftEnd: "18:00",
      cycleStart: today,
    });
  const removeMember = (member: TeamMember) => {
    if (!window.confirm(`Excluir ${member.name} da equipe?`)) return;
    setMembers((current) => current.filter((item) => item.id !== member.id));
  };
  return (
    <>
      <Head title="Equipe" sub="Custos, produtividade e dimensionamento">
        <Button onClick={addMember}>
          <Plus />
          Adicionar pessoa
        </Button>
      </Head>
      <div className="metrics four">
        <Metric
          label="Equipe total"
          value={String(activeMembers.length)}
          detail={`${partners.length} sócios • ${collaborators.length} colaboradores`}
        />
        <Metric
          label="Custo real mensal"
          value={brl(realCost)}
          detail={`Custo hora ${brl(employeeHourlyCost(p))}`}
        />
        <Metric
          label="Custo normalizado"
          value={brl(normalizedCost)}
          detail="Inclui equivalência dos sócios"
          tone="orange"
        />
        <Metric
          label="Em escala hoje / amanhã"
          value={`${workingToday.length} / ${workingTomorrow.length}`}
          detail="Somente equipe operacional ativa"
          tone="green"
        />
      </div>
      <div className="people">
        {members.map((member) => {
          const worksToday = memberWorksOn(member, today);
          return (
            <article
              key={member.id}
              className={!member.active ? "inactive-member" : ""}
            >
              <div className="avatar">
                {member.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <span className="person">
                <b>{member.name}</b>
                <small>{member.role}</small>
              </span>
              <span className="member-data">
                <small>Custo gerencial</small>
                <b>{brl(member.cost)}</b>
              </span>
              <span className="member-data">
                <small>Escala e horário</small>
                <b>
                  {member.shiftPattern} • {member.shiftStart}–{member.shiftEnd}
                </b>
              </span>
              <span className="member-data">
                <small>Horas produtivas</small>
                <b>{member.hours}h/mês</b>
              </span>
              <Pill
                tone={member.active ? (worksToday ? "green" : "orange") : "red"}
              >
                {!member.active
                  ? "Inativo"
                  : worksToday
                    ? "Em escala hoje"
                    : "Folga hoje"}
              </Pill>
              <div className="row-actions">
                <button
                  className="icon"
                  onClick={() => setDraft({ ...member })}
                  title="Editar colaborador"
                  aria-label={`Editar ${member.name}`}
                >
                  <Pencil />
                </button>
                <button
                  className="icon danger"
                  onClick={() => removeMember(member)}
                  title="Excluir colaborador"
                  aria-label={`Excluir ${member.name}`}
                >
                  <Trash2 />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {draft && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setDraft(null)
          }
        >
          <div className="modal team-editor">
            <div className="modal-head">
              <div>
                <small>EQUIPE E ESCALAS</small>
                <h3>
                  {members.some((member) => member.id === draft.id)
                    ? "Editar pessoa"
                    : "Adicionar pessoa"}
                </h3>
              </div>
              <button className="icon" onClick={() => setDraft(null)}>
                <X />
              </button>
            </div>
            <div className="form-grid team-form">
              <label>
                Nome completo
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="Nome do colaborador"
                />
              </label>
              <label>
                Função / cargo
                <input
                  value={draft.role}
                  onChange={(event) =>
                    setDraft({ ...draft, role: event.target.value })
                  }
                  placeholder="Ex.: Atendente N1"
                />
              </label>
              <label>
                Tipo
                <select
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      kind: event.target.value as TeamMember["kind"],
                    })
                  }
                >
                  <option value="collaborator">Colaborador</option>
                  <option value="partner">Sócio</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={draft.active ? "active" : "inactive"}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      active: event.target.value === "active",
                    })
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
              <label>
                Custo mensal / equivalente
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.cost}
                  onChange={(event) =>
                    setDraft({ ...draft, cost: +event.target.value })
                  }
                />
              </label>
              <label>
                Horas produtivas mensais
                <input
                  type="number"
                  min="0"
                  value={draft.hours}
                  onChange={(event) =>
                    setDraft({ ...draft, hours: +event.target.value })
                  }
                />
              </label>
              <label>
                Atua na operação?
                <select
                  value={draft.operational ? "yes" : "no"}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      operational: event.target.value === "yes",
                    })
                  }
                >
                  <option value="yes">Sim, entra na capacidade</option>
                  <option value="no">Não, área administrativa</option>
                </select>
              </label>
              <label>
                Escala
                <select
                  value={draft.shiftPattern}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      shiftPattern: event.target.value as ShiftPattern,
                    })
                  }
                >
                  {Object.keys(SHIFT_CYCLES).map((shift) => (
                    <option key={shift}>{shift}</option>
                  ))}
                </select>
              </label>
              <label>
                Início do turno
                <input
                  type="time"
                  value={draft.shiftStart}
                  onChange={(event) =>
                    setDraft({ ...draft, shiftStart: event.target.value })
                  }
                />
              </label>
              <label>
                Fim do turno
                <input
                  type="time"
                  value={draft.shiftEnd}
                  onChange={(event) =>
                    setDraft({ ...draft, shiftEnd: event.target.value })
                  }
                />
              </label>
              <label className="full-field">
                Primeiro dia trabalhado do ciclo
                <input
                  type="date"
                  value={draft.cycleStart}
                  onChange={(event) =>
                    setDraft({ ...draft, cycleStart: event.target.value })
                  }
                />
                <small>
                  Esta data ancora automaticamente as folgas futuras da escala{" "}
                  {draft.shiftPattern}.
                </small>
              </label>
            </div>
            <div className="modal-actions">
              <Button kind="ghost" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button
                onClick={saveMember}
                disabled={!draft.name.trim() || !draft.role.trim()}
              >
                <Check /> Salvar pessoa e escala
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Costs({
  p,
  update,
}: {
  p: AtsocParameters;
  update: (next: AtsocParameters) => void;
}) {
  const tabs = [
      "Custos fixos",
      "Custos operacionais",
      "Impostos",
      "Comissões",
      "Precificação",
    ],
    [tab, setTab] = useState(tabs[0]),
    [editing, setEditing] = useState<string | null>(null),
    [draftName, setDraftName] = useState(""),
    [draftValue, setDraftValue] = useState(0),
    [draftMeta, setDraftMeta] = useState(""),
    [draftDueDay, setDraftDueDay] = useState(10),
    [draftEndDate, setDraftEndDate] = useState("");
  const [policyDraft, setPolicyDraft] = useState(() => ({
    minimumCommercialMargin: p.minimumCommercialMargin,
    targetCommercialMargin: p.targetCommercialMargin,
    excellentCommercialMargin: p.excellentCommercialMargin,
    postCallPolicyEnabled: p.postCallPolicyEnabled,
    postCallPolicy: p.postCallPolicy,
    postCallMarkup: p.postCallMarkup,
    postCallCustomPrice: p.postCallCustomPrice,
    roundingStrategy: p.roundingStrategy,
  }));
  useEffect(() => {
    setPolicyDraft({
      minimumCommercialMargin: p.minimumCommercialMargin,
      targetCommercialMargin: p.targetCommercialMargin,
      excellentCommercialMargin: p.excellentCommercialMargin,
      postCallPolicyEnabled: p.postCallPolicyEnabled,
      postCallPolicy: p.postCallPolicy,
      postCallMarkup: p.postCallMarkup,
      postCallCustomPrice: p.postCallCustomPrice,
      roundingStrategy: p.roundingStrategy,
    });
  }, [p]);
  const allocationNames: Record<string, string> = {
    equal: "Igual por cliente",
    revenue: "Proporcional à receita",
    load: "Proporcional à carga",
    none: "Não ratear",
  };
  type CostRow = {
    id: string;
    name: string;
    value: string;
    numericValue: number;
    meta: string;
    kind: "fixed" | "commission" | "parameter" | "band";
    index?: number;
    key?: keyof AtsocParameters;
    factor?: number;
    deletable?: boolean;
    dueDay?: number;
    endDate?: string;
  };
  const rows =
    tab === "Custos fixos"
      ? p.fixedCosts.map(
          (c, index): CostRow => ({
            id: `fixed-${c.id}`,
            name: c.name,
            value: brl(c.amount),
            numericValue: c.amount,
            meta: c.allocation,
            kind: "fixed",
            index,
            deletable: true,
            dueDay: c.dueDay || 10,
            endDate: c.endDate || "",
          }),
        )
      : tab === "Comissões"
        ? p.commissions.map(
            (c, index): CostRow => ({
              id: `commission-${c.id}`,
              name: c.name,
              value:
                c.kind === "percent"
                  ? `${(c.value * 100).toFixed(1)}%`
                  : brl(c.value),
              numericValue: c.kind === "percent" ? c.value * 100 : c.value,
              meta: c.base,
              kind: "commission",
              index,
              deletable: true,
            }),
          )
        : tab === "Impostos"
          ? [
              {
                id: "taxRate",
                name: "Imposto sobre faturamento",
                value: `${(p.taxRate * 100).toFixed(2)}%`,
                numericValue: p.taxRate * 100,
                meta: "Receita bruta",
                kind: "parameter",
                key: "taxRate",
                factor: 100,
              } satisfies CostRow,
            ]
          : tab === "Precificação"
            ? [
                {
                  id: "commercialFloor",
                  name: "Piso comercial",
                  value: brl(p.commercialFloor),
                  numericValue: p.commercialFloor,
                  meta: "Mínimo",
                  kind: "parameter",
                  key: "commercialFloor",
                } satisfies CostRow,
                ...p.referenceBands.map(
                  (b, index): CostRow => ({
                    id: `band-${index}`,
                    name: `Faixa ${b.fromHour}ª–${b.toHour}ª hora`,
                    value: brl(b.valuePerHourMonth),
                    numericValue: b.valuePerHourMonth,
                    meta: "Por hora/mês",
                    kind: "band",
                    index,
                  }),
                ),
              ]
            : [
                {
                  id: "collaboratorBaseCost",
                  name: "Custo base PJ",
                  value: brl(p.collaboratorBaseCost),
                  numericValue: p.collaboratorBaseCost,
                  meta: "Mensal",
                  kind: "parameter",
                  key: "collaboratorBaseCost",
                } satisfies CostRow,
                {
                  id: "collaboratorMaxCost",
                  name: "Custo máximo PJ",
                  value: brl(p.collaboratorMaxCost),
                  numericValue: p.collaboratorMaxCost,
                  meta: "Conservador",
                  kind: "parameter",
                  key: "collaboratorMaxCost",
                } satisfies CostRow,
                {
                  id: "productiveHoursMonth",
                  name: "Horas produtivas",
                  value: `${p.productiveHoursMonth}h`,
                  numericValue: p.productiveHoursMonth,
                  meta: "Mensal",
                  kind: "parameter",
                  key: "productiveHoursMonth",
                } satisfies CostRow,
                {
                  id: "weeksPerMonth",
                  name: "Semanas por mês",
                  value: String(p.weeksPerMonth),
                  numericValue: p.weeksPerMonth,
                  meta: "Média",
                  kind: "parameter",
                  key: "weeksPerMonth",
                } satisfies CostRow,
                {
                  id: "defaultIntensityFactor",
                  name: "Fator de intensidade",
                  value: p.defaultIntensityFactor.toFixed(2),
                  numericValue: p.defaultIntensityFactor,
                  meta: "Carga",
                  kind: "parameter",
                  key: "defaultIntensityFactor",
                } satisfies CostRow,
              ];
  const startEdit = (row: CostRow) => {
    setEditing(row.id);
    setDraftName(row.name);
    setDraftValue(row.numericValue);
    setDraftMeta(row.meta);
    setDraftDueDay(row.dueDay || 10);
    setDraftEndDate(row.endDate || "");
  };
  const saveRow = (row: CostRow) => {
    if (row.kind === "fixed" && row.index !== undefined) {
      update({
        ...p,
        fixedCosts: p.fixedCosts.map((cost, index) =>
          index === row.index
            ? {
                ...cost,
                name: draftName,
                amount: draftValue,
                allocation: draftMeta as any,
                dueDay: draftDueDay,
                startDate: cost.startDate || localIsoDate(),
                endDate:
                  draftEndDate ||
                  cost.endDate ||
                  shiftIsoDate(localIsoDate(), 3650),
              }
            : cost,
        ),
      });
    } else if (row.kind === "commission" && row.index !== undefined) {
      update({
        ...p,
        commissions: p.commissions.map((rule, index) =>
          index === row.index
            ? {
                ...rule,
                name: draftName,
                value: rule.kind === "percent" ? draftValue / 100 : draftValue,
                base: draftMeta as any,
              }
            : rule,
        ),
      });
    } else if (row.kind === "band" && row.index !== undefined) {
      update({
        ...p,
        referenceBands: p.referenceBands.map((band, index) =>
          index === row.index
            ? { ...band, valuePerHourMonth: draftValue }
            : band,
        ),
      });
    } else if (row.key) {
      update({ ...p, [row.key]: draftValue / (row.factor || 1) });
    }
    setEditing(null);
  };
  const removeRow = (row: CostRow) => {
    if (
      !window.confirm(
        `Excluir “${row.name}”? Esta alteração impactará os cálculos.`,
      )
    )
      return;
    if (row.kind === "fixed" && row.index !== undefined)
      update({
        ...p,
        fixedCosts: p.fixedCosts.filter((_, index) => index !== row.index),
      });
    if (row.kind === "commission" && row.index !== undefined)
      update({
        ...p,
        commissions: p.commissions.filter((_, index) => index !== row.index),
      });
  };
  const addRow = () => {
    if (tab === "Custos fixos")
      update({
        ...p,
        fixedCosts: [
          ...p.fixedCosts,
          {
            id: `fixed-${Date.now()}`,
            name: "Novo custo fixo",
            amount: 0,
            allocation: "equal",
            dueDay: 10,
            startDate: localIsoDate(),
            endDate: shiftIsoDate(localIsoDate(), 3650),
          },
        ],
      });
    if (tab === "Comissões")
      update({
        ...p,
        commissions: [
          ...p.commissions,
          {
            id: `commission-${Date.now()}`,
            name: "Nova comissão",
            kind: "percent",
            value: 0,
            base: "gross_revenue",
            recurrence: "recurring",
            active: true,
          },
        ],
      });
  };
  const candidatePolicy = { ...p, ...policyDraft } as AtsocParameters;
  const marginValidation = validateMarginPolicy(candidatePolicy);
  const saveCommercialPolicy = () => {
    if (!marginValidation.valid) {
      window.alert(marginValidation.message);
      return;
    }
    if (
      candidatePolicy.postCallPolicyEnabled &&
      ((candidatePolicy.postCallPolicy === "custom" &&
        candidatePolicy.postCallCustomPrice <= 0) ||
        (candidatePolicy.postCallPolicy === "excellent_plus" &&
          candidatePolicy.postCallMarkup < 0))
    ) {
      window.alert("Revise o valor personalizado ou o acréscimo pós-call.");
      return;
    }
    update(candidatePolicy);
  };
  return (
    <>
      <Head
        title="Custos e Parâmetros"
        sub="Premissas centrais dos cálculos financeiros"
      >
        {(tab === "Custos fixos" || tab === "Comissões") && (
          <Button onClick={addRow}>
            <Plus />
            Adicionar item
          </Button>
        )}
      </Head>
      <div className="tabs">
        {tabs.map((x) => (
          <button
            key={x}
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "Precificação" && (
        <section className="panel commercial-policy-panel">
          <PanelTitle
            title="Política Comercial e Margens"
            sub="Régua autorizada para negociação e proposta pós-call"
          >
            <Pill tone={marginValidation.valid ? "green" : "red"}>
              {marginValidation.valid ? "Política válida" : "Revisar margens"}
            </Pill>
          </PanelTitle>
          <div className="policy-margin-grid">
            <label>
              Margem mínima (%)
              <input
                type="number"
                step="0.1"
                value={policyDraft.minimumCommercialMargin * 100}
                onChange={(e) =>
                  setPolicyDraft((draft) => ({
                    ...draft,
                    minimumCommercialMargin: +e.target.value / 100,
                  }))
                }
              />
              <small>
                Menor margem permitida para venda sem aprovação dos sócios.
              </small>
            </label>
            <label>
              Margem alvo (%)
              <input
                type="number"
                step="0.1"
                value={policyDraft.targetCommercialMargin * 100}
                onChange={(e) =>
                  setPolicyDraft((draft) => ({
                    ...draft,
                    targetCommercialMargin: +e.target.value / 100,
                  }))
                }
              />
              <small>
                Margem saudável e objetivo principal das negociações.
              </small>
            </label>
            <label>
              Margem excelente (%)
              <input
                type="number"
                step="0.1"
                value={policyDraft.excellentCommercialMargin * 100}
                onChange={(e) =>
                  setPolicyDraft((draft) => ({
                    ...draft,
                    excellentCommercialMargin: +e.target.value / 100,
                  }))
                }
              />
              <small>Margem considerada excelente para a ATSOC.</small>
            </label>
          </div>
          {!marginValidation.valid && (
            <div className="policy-error">
              <AlertTriangle />
              {marginValidation.message}
            </div>
          )}
          <div className="post-policy-grid">
            <div className="setting">
              <span>
                <b>Aplicar política de preço pós-call</b>
                <small>
                  Quando desativada, nenhuma condição posterior é sugerida.
                </small>
              </span>
              <button
                className={`switch ${policyDraft.postCallPolicyEnabled ? "on" : ""}`}
                onClick={() =>
                  setPolicyDraft((draft) => ({
                    ...draft,
                    postCallPolicyEnabled: !draft.postCallPolicyEnabled,
                  }))
                }
              >
                <i />
              </button>
            </div>
            <label>
              Valor da proposta pós-call
              <select
                value={policyDraft.postCallPolicy}
                onChange={(e) =>
                  setPolicyDraft((draft) => ({
                    ...draft,
                    postCallPolicy: e.target.value as any,
                  }))
                }
              >
                <option value="excellent">Preço excelente</option>
                <option value="excellent_plus">
                  Preço excelente + percentual
                </option>
                <option value="target">Preço alvo</option>
                <option value="custom">Personalizado</option>
              </select>
            </label>
            {policyDraft.postCallPolicy === "excellent_plus" && (
              <label>
                Acréscimo pós-call (%)
                <input
                  type="number"
                  step="0.1"
                  value={policyDraft.postCallMarkup * 100}
                  onChange={(e) =>
                    setPolicyDraft((draft) => ({
                      ...draft,
                      postCallMarkup: +e.target.value / 100,
                    }))
                  }
                />
                <small>Aplicado sobre o preço excelente exato.</small>
              </label>
            )}
            {policyDraft.postCallPolicy === "custom" && (
              <label>
                Valor personalizado
                <input
                  type="number"
                  value={policyDraft.postCallCustomPrice}
                  onChange={(e) =>
                    setPolicyDraft((draft) => ({
                      ...draft,
                      postCallCustomPrice: +e.target.value,
                    }))
                  }
                />
              </label>
            )}
            <label>
              Arredondamento comercial
              <select
                value={policyDraft.roundingStrategy}
                onChange={(e) =>
                  setPolicyDraft((draft) => ({
                    ...draft,
                    roundingStrategy: e.target.value as any,
                  }))
                }
              >
                <option value="commercial90">Terminar em 90</option>
                <option value="commercial99">Terminar em 99</option>
                <option value="multiple50">Múltiplo de R$50</option>
                <option value="multiple100">Múltiplo de R$100</option>
                <option value="none">Sem arredondamento</option>
              </select>
            </label>
          </div>
          <div className="policy-save">
            <small>Obrigatório: mínima &lt; alvo &lt; excelente.</small>
            <Button onClick={saveCommercialPolicy}>
              <Save />
              Salvar política comercial
            </Button>
          </div>
        </section>
      )}
      <section className="panel table-panel">
        <PanelTitle
          title={tab}
          sub="Valores utilizados no fluxo, DRE e precificação"
        >
          <Pill>Editável</Pill>
        </PanelTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor / percentual</th>
                <th>Base / periodicidade</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={editing === r.id ? "editing-row" : ""}
                >
                  <td>
                    {editing === r.id ? (
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        aria-label="Descrição"
                      />
                    ) : (
                      <b>{r.name}</b>
                    )}
                  </td>
                  <td>
                    {editing === r.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={draftValue}
                        onChange={(e) => setDraftValue(+e.target.value)}
                        aria-label="Valor"
                      />
                    ) : (
                      r.value
                    )}
                  </td>
                  <td>
                    {editing === r.id && r.kind === "fixed" ? (
                      <div className="fixed-period-editor">
                        <select
                          value={draftMeta}
                          onChange={(e) => setDraftMeta(e.target.value)}
                        >
                          {Object.entries(allocationNames).map(
                            ([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                        <label>
                          Vence dia
                          <select
                            value={draftDueDay}
                            onChange={(e) => setDraftDueDay(+e.target.value)}
                          >
                            {Array.from(
                              { length: 28 },
                              (_, index) => index + 1,
                            ).map((day) => (
                              <option key={day}>{day}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Validade
                          <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                          />
                        </label>
                      </div>
                    ) : editing === r.id && r.kind === "commission" ? (
                      <select
                        value={draftMeta}
                        onChange={(e) => setDraftMeta(e.target.value)}
                      >
                        <option value="gross_revenue">Receita bruta</option>
                        <option value="net_revenue">Receita líquida</option>
                        <option value="contribution_margin">
                          Margem de contribuição
                        </option>
                        <option value="operating_profit">
                          Lucro operacional
                        </option>
                        <option value="profit_before_participation">
                          Lucro antes da participação
                        </option>
                      </select>
                    ) : r.kind === "fixed" ? (
                      <span className="fixed-cost-meta">
                        {allocationNames[r.meta]}
                        <small>
                          Todo dia {r.dueDay || 10} • fluxo automático
                          {r.endDate
                            ? ` até ${new Date(`${r.endDate}T12:00:00`).toLocaleDateString("pt-BR")}`
                            : ""}
                        </small>
                      </span>
                    ) : (
                      r.meta.replaceAll("_", " ")
                    )}
                  </td>
                  <td>
                    <Pill tone="green">Ativo</Pill>
                  </td>
                  <td>
                    <div className="row-actions">
                      {editing === r.id ? (
                        <>
                          <button
                            className="icon save-action"
                            onClick={() => saveRow(r)}
                            title="Salvar"
                          >
                            <Check />
                          </button>
                          <button
                            className="icon"
                            onClick={() => setEditing(null)}
                            title="Cancelar"
                          >
                            <X />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="icon"
                            onClick={() => startEdit(r)}
                            title="Editar"
                            aria-label={`Editar ${r.name}`}
                          >
                            <Pencil />
                          </button>
                          {r.deletable && (
                            <button
                              className="icon danger"
                              onClick={() => removeRow(r)}
                              title="Excluir"
                              aria-label={`Excluir ${r.name}`}
                            >
                              <Trash2 />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="callout">
        <ShieldCheck />
        <span>
          <b>Parâmetros protegidos</b>
          <p>
            Alterações salvas atualizam imediatamente cotações, margens, DRE e
            projeções. Parâmetros estruturais podem ser editados, mas não
            excluídos.
          </p>
        </span>
      </div>
    </>
  );
}

function Dre({
  p,
  clients,
  team,
}: {
  p: AtsocParameters;
  clients: ClientInput[];
  team: TeamMember[];
}) {
  const [mode, setMode] = useState("Atual");
  const structure = calculateTargetStructure(clients, p, team);
  const current = structure.current;
  const currentMargin = current.grossRevenue
    ? current.finalProfit / current.grossRevenue
    : 0;
  const currentRows: Array<[string, number]> = [
    ["Receita bruta", current.grossRevenue],
    ["(-) Impostos", -current.taxes],
    ["(-) Comissões", -current.nonParticipationCommissions],
    ["Receita líquida", current.netRevenue],
    ["(-) Despesas fixas e recorrentes cadastradas", -current.fixedAllocation],
    ["(-) Participações", -current.participations],
    ["Resultado atual", current.finalProfit],
  ];
  const targetRows: Array<[string, number]> = [
    ...currentRows.slice(0, -1),
    ["(-) Complemento para pró-labore-alvo", -structure.partnerAdjustment],
    [
      `(-) Equipe operacional adicional (${structure.additionalOperationalStaff})`,
      -structure.operationalStaffCost,
    ],
    ["Resultado da estrutura-alvo", structure.targetResult],
  ];
  const visibleRows = mode === "Atual" ? currentRows : targetRows;
  return (
    <>
      <Head title="DRE Gerencial" sub="Resultado atual e sustentabilidade da estrutura-alvo">
        <div className="row">
          <select>
            <option>Agosto 2026</option>
          </select>
          <Button kind="ghost" onClick={() => window.print()}>
            <Download />
            Exportar
          </Button>
        </div>
      </Head>
      <Seg items={["Atual", "Estrutura-alvo", "Comparativo"]} value={mode} set={setMode} />
      <div className="dre-explanation">
        <span><b>Atual</b> considera somente receitas, impostos, comissões e despesas realmente cadastradas.</span>
        <span><b>Estrutura-alvo</b> acrescenta a meta total de pró-labore e a equipe necessária para os sócios deixarem a operação.</span>
        <span><b>MRR sustentável</b> é a receita recorrente estimada para pagar essa estrutura sem prejuízo.</span>
      </div>
      <div className="metrics four top-gap">
        <Metric
          label="Receita bruta"
          value={brl(current.grossRevenue)}
          detail="Receita contratada da carteira"
          tone="green"
        />
        <Metric
          label="Resultado atual"
          value={brl(current.finalProfit)}
          detail={`Margem ${(currentMargin * 100).toFixed(1)}%`}
          tone={current.finalProfit >= 0 ? "green" : "red"}
        />
        <Metric
          label="Resultado estrutura-alvo"
          value={brl(structure.targetResult)}
          detail={`${structure.additionalOperationalStaff} contratação(ões) adicional(is)`}
          tone={structure.targetResult >= 0 ? "green" : "red"}
        />
        <Metric
          label="MRR sustentável"
          value={brl(structure.requiredMrr)}
          detail={`Faltam ${brl(structure.additionalMrrRequired)}`}
          tone={structure.additionalMrrRequired > 0 ? "orange" : "green"}
        />
      </div>
      {mode !== "Comparativo" ? <section className="panel structure-dre">
        <PanelTitle
          title={mode === "Atual" ? "DRE atual" : "DRE da estrutura-alvo"}
          sub={mode === "Atual" ? "Custos financeiros existentes" : "Meta de dedicação integral dos sócios e substituição operacional"}
        >
          <Pill tone={mode === "Atual" ? "blue" : "orange"}>{mode}</Pill>
        </PanelTitle>
        <div className="structure-dre-head">
          <span>Conta</span>
          <span>Valor</span>
          <span>% Receita</span>
        </div>
        {visibleRows.map(([label, value], index) => (
          <div className={index === visibleRows.length - 1 || [0, 3].includes(index) ? "strong" : ""} key={label}>
            <span>{label}</span>
            <b className={value < 0 ? "negative" : ""}>{brl(value)}</b>
            <em>{current.grossRevenue ? `${((value / current.grossRevenue) * 100).toFixed(1)}%` : "0,0%"}</em>
          </div>
        ))}
      </section> : <section className="panel structure-comparison">
        <PanelTitle title="Atual x estrutura-alvo" sub="A diferença mostra o investimento necessário para a transição"><Pill tone="blue">Comparativo</Pill></PanelTitle>
        <div className="comparison-row comparison-head"><span>Indicador</span><span>Atual</span><span>Estrutura-alvo</span><span>Diferença</span></div>
        {[
          ["Receita recorrente", current.grossRevenue, current.grossRevenue],
          ["Pró-labore dos sócios", structure.currentPartnerPay, structure.targetPartnerPay],
          ["Equipe operacional adicional", 0, structure.operationalStaffCost],
          ["Resultado", current.finalProfit, structure.targetResult],
        ].map(([label, actual, target]) => (
          <div className="comparison-row" key={String(label)}><span>{label}</span><b>{brl(Number(actual))}</b><b>{brl(Number(target))}</b><b className={Number(target) - Number(actual) < 0 ? "negative" : ""}>{brl(Number(target) - Number(actual))}</b></div>
        ))}
        <div className="target-summary"><b>Meta para equilíbrio</b><span>MRR atual {brl(current.grossRevenue)} + incremento {brl(structure.additionalMrrRequired)} = <strong>{brl(structure.requiredMrr)}</strong></span></div>
      </section>}
    </>
  );
}

function Scenarios({
  p,
  clients,
  records,
  setRecords,
}: {
  p: AtsocParameters;
  clients: ClientInput[];
  records: ScenarioRecord[];
  setRecords: (
    updater:
      | ScenarioRecord[]
      | ((current: ScenarioRecord[]) => ScenarioRecord[]),
  ) => void;
}) {
  const [kind, setKind] = useState<ScenarioKind>("new_client"),
    [name, setName] = useState(""),
    [value, setValue] = useState(0),
    [base, setBase] = useState(0),
    [quantity, setQuantity] = useState(1),
    [selectedClientId, setSelectedClientId] = useState(""),
    [startDate, setStartDate] = useState(() => localIsoDate()),
    [durationMonths, setDurationMonths] = useState(12),
    [notes, setNotes] = useState(""),
    [done, setDone] = useState(false),
    [savedOpen, setSavedOpen] = useState(false),
    [selectedRecord, setSelectedRecord] = useState<ScenarioRecord | null>(null),
    [editingId, setEditingId] = useState<string | null>(null);
  const impact = calculateScenarioImpact(
    clients,
    { kind, value, activeClients: base, quantity, selectedClientId },
    p,
  );
  const kindLabels: Record<ScenarioKind, string> = {
    new_client: "Novo cliente",
    new_hire: "Nova contratação",
    price_increase: "Aumento de preços",
    client_loss: "Perda de cliente",
  };
  const saveScenario = () => {
    if (!name.trim()) return;
    const record: ScenarioRecord = {
      id: editingId || `scenario-${Date.now()}`,
      name: name.trim(),
      kind,
      value,
      revenueImpact: impact.revenueImpact,
      profitImpact: impact.profitImpact,
      futureMargin: impact.futureMargin,
      futureLoad: impact.futureLoad,
      createdAt: editingId
        ? records.find((item) => item.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      activeClients: base,
      quantity,
      selectedClientId,
      currentRevenue: impact.currentRevenue,
      futureRevenue: impact.futureRevenue,
      currentProfit: impact.currentProfit,
      futureProfit: impact.futureProfit,
      currentMargin: impact.currentMargin,
      currentLoad: impact.currentLoad,
      currentStaff: impact.currentStaff,
      futureStaff: impact.futureStaff,
      staffCostImpact: impact.staffCostImpact,
      requiredHireCount: impact.requiredHireCount,
      startDate,
      durationMonths,
      notes: notes.trim(),
    };
    setRecords((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? record : item))
        : [record, ...current].slice(0, 50),
    );
    setEditingId(null);
    setDone(true);
  };
  const editScenario = (record: ScenarioRecord) => {
    setKind(record.kind);
    setName(record.name);
    setValue(record.value);
    setBase(record.activeClients || 0);
    setQuantity(record.quantity || 1);
    setSelectedClientId(record.selectedClientId || "");
    setStartDate(record.startDate || localIsoDate());
    setDurationMonths(record.durationMonths || 12);
    setNotes(record.notes || "");
    setEditingId(record.id);
    setSelectedRecord(null);
    setSavedOpen(false);
    setDone(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteScenario = (record: ScenarioRecord) => {
    if (!window.confirm(`Excluir o cenário “${record.name}”?`)) return;
    setRecords((current) => current.filter((item) => item.id !== record.id));
    if (editingId === record.id) setEditingId(null);
    setSelectedRecord(null);
  };
  return (
    <>
      <Head
        title="Cenários e Simulações"
        sub="Teste decisões sem alterar os dados reais"
      >
        <Button kind="ghost" onClick={() => setSavedOpen(true)}>
          <ClipboardList />
          Ver salvos
        </Button>
      </Head>
      <div className="scenario">
        <section className="panel">
          <Step
            n={<Sparkles />}
            title="Nova simulação"
            sub="Escolha uma decisão e ajuste as premissas"
          />
          <label>
            Tipo de cenário
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as ScenarioKind);
                setDone(false);
              }}
            >
              {Object.entries(kindLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nome do cenário
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cliente 6,5k • Setembro"
            />
          </label>
          {kind !== "client_loss" && (
            <label>
              {kind === "price_increase"
                ? "Aumento sobre os contratos (%)"
                : kind === "new_hire"
                  ? "Custo mensal por contratado"
                  : "Receita mensal do novo cliente"}
              <div className="money-input">
                <span>{kind === "price_increase" ? "%" : "R$"}</span>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(+e.target.value)}
                />
              </div>
            </label>
          )}
          <div className="form-grid">
            {kind === "new_client" && (
              <label>
                Base ativa do provedor
                <input
                  type="number"
                  value={base}
                  onChange={(e) => setBase(+e.target.value)}
                />
              </label>
            )}
            {kind === "new_hire" && (
              <label>
                Quantidade de contratações
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, +e.target.value))}
                />
              </label>
            )}
            {kind === "client_loss" && (
              <label className="full-field">
                Cliente perdido
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Selecione o cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} • {brl(client.monthlyRevenue)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Impostos configurados
              <input value={`${(p.taxRate * 100).toFixed(2)}%`} readOnly />
            </label>
            <label>
              Início
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              Prazo
              <select value={durationMonths} onChange={(event) => setDurationMonths(Number(event.target.value))}>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={24}>24 meses</option>
              </select>
            </label>
          </div>
          <label>
            Observações
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre premissas e observações da decisão..." />
          </label>
          <Button className="full" onClick={() => setDone(true)}>
            Recalcular impacto
          </Button>
          {done && (
            <div className="success">
              <Check />
              Simulação recalculada com sucesso.
            </div>
          )}
        </section>
        <div className="stack">
          <section className="panel">
            <PanelTitle
              title="Impacto projetado"
              sub="Comparação com o cenário atual"
            >
              <Pill>{durationMonths} meses</Pill>
            </PanelTitle>
            <div className="impacts">
              {[
                [
                  "Receita mensal",
                  brl(impact.currentRevenue),
                  brl(impact.futureRevenue),
                  impact.revenueImpact,
                  "money",
                ],
                [
                  "Lucro incremental",
                  brl(impact.currentProfit),
                  brl(impact.futureProfit),
                  impact.profitImpact,
                  "money",
                ],
                [
                  "Margem estimada",
                  `${(impact.currentMargin * 100).toFixed(1)}%`,
                  `${(impact.futureMargin * 100).toFixed(1)}%`,
                  (impact.futureMargin - impact.currentMargin) * 100,
                  "points",
                ],
                [
                  "Utilização segura",
                  `${(impact.currentLoad * 100).toFixed(0)}%`,
                  `${(impact.futureLoad * 100).toFixed(0)}%`,
                  (impact.futureLoad - impact.currentLoad) * 100,
                  "points",
                ],
                [
                  "Colaboradores",
                  String(impact.currentStaff),
                  String(impact.futureStaff),
                  impact.futureStaff - impact.currentStaff,
                  "count",
                ],
                [
                  "Custo da contratação",
                  brl(0),
                  brl(impact.staffCostImpact),
                  -impact.staffCostImpact,
                  "money",
                ],
              ].map((r: any) => (
                <div key={r[0]}>
                  <span>{r[0]}</span>
                  <p>
                    <del>{r[1]}</del>
                    <ChevronRight />
                    <b>{r[2]}</b>
                  </p>
                  <Pill tone={r[3] >= 0 ? "green" : "red"}>
                    {r[3] >= 0 ? "+" : ""}
                    {r[4] === "money"
                      ? brl(r[3])
                      : r[4] === "points"
                        ? `${r[3].toFixed(1)} p.p.`
                        : String(r[3])}
                  </Pill>
                </div>
              ))}
            </div>
          </section>
          <section className="panel recommend">
            <Target />
            <span>
              <small>RECOMENDAÇÃO</small>
              <h3>
                {impact.profitable
                  ? "Cenário melhora o resultado"
                  : "Cenário reduz o resultado"}
              </h3>
              <p>
                {kindLabels[kind]} gera impacto mensal de{" "}
                {brl(impact.profitImpact)} no lucro e{" "}
                {brl(impact.revenueImpact)} na receita. A contratação aparece
                somente como custo; nunca como receita.
              </p>
            </span>
          </section>
          <Button
            kind="secondary"
            onClick={saveScenario}
            disabled={
              !name.trim() || (kind === "client_loss" && !selectedClientId)
            }
          >
            <Save />
            {editingId ? "Salvar alterações" : "Salvar cenário"}
          </Button>
        </div>
      </div>
      <section className="panel recent-scenarios">
        <PanelTitle
          title="Últimos cenários"
          sub="Simulações salvas mais recentemente"
        >
          <Pill>{records.length}</Pill>
        </PanelTitle>
        <div className="scenario-history-grid">
          {records.slice(0, 5).map((record) => (
            <article key={record.id} className="clickable" onClick={() => setSelectedRecord(record)}>
              <span>
                <b>{record.name}</b>
                <small>
                  {kindLabels[record.kind]} •{" "}
                  {new Date(record.createdAt).toLocaleString("pt-BR")}
                </small>
              </span>
              <div>
                <small>Receita</small>
                <b
                  className={
                    record.revenueImpact >= 0 ? "positive" : "negative"
                  }
                >
                  {brl(record.revenueImpact)}
                </b>
              </div>
              <div>
                <small>Lucro</small>
                <b
                  className={record.profitImpact >= 0 ? "positive" : "negative"}
                >
                  {brl(record.profitImpact)}
                </b>
              </div>
              <div className="scenario-actions">
                <button className="icon" title="Visualizar cenário" onClick={(event) => { event.stopPropagation(); setSelectedRecord(record); }}><Eye /></button>
                <button className="icon" title="Editar cenário" onClick={(event) => { event.stopPropagation(); editScenario(record); }}><Pencil /></button>
                <button className="icon danger" title="Excluir cenário" onClick={(event) => { event.stopPropagation(); deleteScenario(record); }}><Trash2 /></button>
              </div>
            </article>
          ))}
          {!records.length && (
            <div className="empty-recurring">
              <Sparkles />
              <b>Nenhum cenário salvo</b>
              <span>Preencha as premissas e salve a primeira simulação.</span>
            </div>
          )}
        </div>
      </section>
      {savedOpen && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setSavedOpen(false)
          }
        >
          <div className="modal history-modal">
            <div className="modal-head">
              <div>
                <small>PLANEJAMENTO</small>
                <h3>Cenários salvos</h3>
              </div>
              <button className="icon" onClick={() => setSavedOpen(false)}>
                <X />
              </button>
            </div>
            <div className="history-list">
              {records.map((record) => (
                <article key={record.id} className="clickable" onClick={() => setSelectedRecord(record)}>
                  <div>
                    <b>{record.name}</b>
                    <small>
                      {kindLabels[record.kind]} •{" "}
                      {new Date(record.createdAt).toLocaleString("pt-BR")}
                    </small>
                  </div>
                  <span>
                    <small>Receita</small>
                    <b>{brl(record.revenueImpact)}</b>
                  </span>
                  <span>
                    <small>Lucro</small>
                    <b>{brl(record.profitImpact)}</b>
                  </span>
                  <span>
                    <small>Margem futura</small>
                    <b>{(record.futureMargin * 100).toFixed(1)}%</b>
                  </span>
                  <div className="scenario-actions">
                    <button className="icon" title="Visualizar cenário" onClick={(event) => { event.stopPropagation(); setSelectedRecord(record); }}><Eye /></button>
                    <button className="icon" title="Editar cenário" onClick={(event) => { event.stopPropagation(); editScenario(record); }}><Pencil /></button>
                    <button className="icon danger" title="Excluir cenário" onClick={(event) => { event.stopPropagation(); deleteScenario(record); }}><Trash2 /></button>
                  </div>
                </article>
              ))}
              {!records.length && (
                <div className="empty-recurring">
                  <Sparkles />
                  <b>Nenhum cenário salvo</b>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedRecord && (
        <div className="modal-bg" onMouseDown={(event) => event.currentTarget === event.target && setSelectedRecord(null)}>
          <div className="modal scenario-detail-modal">
            <div className="modal-head">
              <div><small>ANÁLISE COMPLETA DO CENÁRIO</small><h3>{selectedRecord.name}</h3><p>{kindLabels[selectedRecord.kind]} • {new Date(selectedRecord.createdAt).toLocaleString("pt-BR")}</p></div>
              <button className="icon" onClick={() => setSelectedRecord(null)}><X /></button>
            </div>
            <div className="scenario-detail-summary">
              <div><span>Receita atual</span><b>{brl(selectedRecord.currentRevenue || 0)}</b></div>
              <div><span>Receita futura</span><b>{brl(selectedRecord.futureRevenue ?? selectedRecord.revenueImpact)}</b></div>
              <div><span>Impacto na receita</span><b className={selectedRecord.revenueImpact >= 0 ? "positive" : "negative"}>{brl(selectedRecord.revenueImpact)}</b></div>
              <div><span>Lucro atual</span><b>{brl(selectedRecord.currentProfit || 0)}</b></div>
              <div><span>Lucro futuro</span><b>{brl(selectedRecord.futureProfit ?? selectedRecord.profitImpact)}</b></div>
              <div><span>Impacto no lucro</span><b className={selectedRecord.profitImpact >= 0 ? "positive" : "negative"}>{brl(selectedRecord.profitImpact)}</b></div>
              <div><span>Margem atual</span><b>{((selectedRecord.currentMargin || 0) * 100).toFixed(1)}%</b></div>
              <div><span>Margem futura</span><b>{(selectedRecord.futureMargin * 100).toFixed(1)}%</b></div>
              <div><span>Utilização atual</span><b>{((selectedRecord.currentLoad || 0) * 100).toFixed(0)}%</b></div>
              <div><span>Utilização futura</span><b>{(selectedRecord.futureLoad * 100).toFixed(0)}%</b></div>
              <div><span>Equipe atual / futura</span><b>{selectedRecord.currentStaff ?? "—"} → {selectedRecord.futureStaff ?? "—"}</b></div>
              <div><span>Custo de contratação</span><b>{brl(selectedRecord.staffCostImpact || 0)}</b></div>
            </div>
            <div className="scenario-detail-notes">
              <p><b>Início:</b> {selectedRecord.startDate ? new Date(`${selectedRecord.startDate}T12:00:00`).toLocaleDateString("pt-BR") : "Não registrado"} • <b>Prazo:</b> {selectedRecord.durationMonths || 12} meses</p>
              <p><b>Premissas:</b> {selectedRecord.notes || "Nenhuma observação registrada."}</p>
            </div>
            <div className="modal-actions">
              <Button kind="ghost" onClick={() => editScenario(selectedRecord)}><Pencil /> Editar</Button>
              <Button kind="ghost" className="danger-action" onClick={() => deleteScenario(selectedRecord)}><Trash2 /> Excluir</Button>
              <Button onClick={() => setSelectedRecord(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Reports({
  p,
  entries,
  clients,
  team,
  initialBalance,
}: {
  p: AtsocParameters;
  entries: FinancialEntry[];
  clients: ClientRecord[];
  team: TeamMember[];
  initialBalance: number;
}) {
  const [month, setMonth] = useState(() => localIsoDate().slice(0, 7));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reports = useMemo(
    () =>
      buildAtsocReports({
        month,
        initialBalance,
        entries,
        clients: clients.filter((client) => client.status === "active"),
        team,
        parameters: p,
      }),
    [month, initialBalance, entries, clients, team, p],
  );
  const selected = reports.find((report) => report.id === selectedId) || null;
  const reportIcons: Record<string, any> = {
    cashflow: TrendingUp,
    dre: BarChart3,
    profitability: Building2,
    capacity: Gauge,
    payables: ArrowDownRight,
    receivables: ArrowUpRight,
    taxes: ReceiptText,
    commissions: Users,
    staffing: UserCog,
  };
  const monthOptions = Array.from({ length: 18 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 11 + index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      value,
      label: date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    };
  });
  const exportExcel = (report: ReportDataset) =>
    exportReportExcel(report, month);
  const exportPdf = (report: ReportDataset) => exportReportPdf(report, month);
  return (
    <>
      <Head title="Relatórios" sub="Análises gerenciais prontas para decisão">
        <div className="row">
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Head>
      <div className="reports">
        {reports.map((report) => {
          const Icon = reportIcons[report.id] || FileBarChart;
          return (
          <article key={report.id}>
            <span className="report-icon">
              <Icon />
            </span>
            <div>
              <h3>{report.title}</h3>
              <p>{report.description}</p>
              <small>{report.rows.length} registro(s) no relatório</small>
            </div>
            <div className="report-actions">
              <Button
                kind="ghost"
                onClick={() => setSelectedId(report.id)}
              >
                <Eye />
                Visualizar
              </Button>
              <Button
                kind="ghost"
                onClick={() => exportExcel(report)}
                title="Exportar para Excel"
              >
                <FileSpreadsheet /> Excel
              </Button>
              <Button
                kind="ghost"
                onClick={() => exportPdf(report)}
                title="Exportar para PDF"
              >
                <FileText /> PDF
              </Button>
            </div>
          </article>
          );
        })}
      </div>
      {selected && (
        <div
          className="modal-bg"
          onMouseDown={(event) =>
            event.currentTarget === event.target && setSelectedId(null)
          }
        >
          <div className="modal report-viewer-modal">
            <div className="modal-head">
              <div>
                <small>RELATÓRIO GERENCIAL • {month}</small>
                <h3>{selected.title}</h3>
                <p>{selected.description}</p>
              </div>
              <button className="icon" onClick={() => setSelectedId(null)}>
                <X />
              </button>
            </div>
            <div className="report-highlights">
              {selected.highlights.map((highlight) => (
                <div key={highlight.label}>
                  <span>{highlight.label}</span>
                  <b>{highlight.value}</b>
                </div>
              ))}
            </div>
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr>
                    {selected.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!selected.rows.length && (
                <div className="empty-recurring">
                  <FileBarChart />
                  <b>Nenhum dado no período selecionado</b>
                  <span>O relatório será preenchido pelos dados oficiais cadastrados.</span>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <Button kind="ghost" onClick={() => exportExcel(selected)}>
                <FileSpreadsheet /> Exportar Excel
              </Button>
              <Button onClick={() => exportPdf(selected)}>
                <FileText /> Exportar PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Config({
  notify,
  p,
  update,
  reset,
  logo,
  setLogo,
}: {
  notify: (message: string, tone?: "success" | "error") => void;
  p: AtsocParameters;
  update: (p: AtsocParameters) => void;
  reset: () => void;
  logo: string;
  setLogo: (value: string) => void;
}) {
  const [preferences, setPreferences] = useState([true, true, true]);
  const [draft, setDraft] = useState<AtsocParameters>(p);
  const [logoError, setLogoError] = useState("");
  useEffect(() => setDraft(p), [p]);
  const setNumber = (key: keyof AtsocParameters, value: number) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const timeBandValidation = validateOperationalTimeBands(
    draft.operationalTimeBands || DEFAULT_PARAMETERS.operationalTimeBands,
  );
  const saveConfiguration = () => {
    if (!timeBandValidation.valid) {
      notify(timeBandValidation.message, "error");
      return;
    }
    update(draft);
    notify("Configurações salvas");
  };
  const handleLogo = (file?: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setLogoError("Use uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("O arquivo deve ter no máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result || ""));
      setLogoError("");
    };
    reader.onerror = () => setLogoError("Não foi possível ler o arquivo.");
    reader.readAsDataURL(file);
  };
  return (
    <>
      <Head
        title="Configurações"
        sub="Empresa, usuários e preferências do sistema"
      >
        <Button onClick={saveConfiguration}>
          <Save />
          Salvar alterações
        </Button>
      </Head>
      <div className="config">
        <section className="panel">
          <PanelTitle
            title="Dados da empresa"
            sub="Identificação utilizada nos relatórios"
          >
            <Building2 />
          </PanelTitle>
          <div className="logo">
            <div className="brand-mark big company-logo-preview">
              {logo ? <img src={logo} alt="Logo da ATSOC" /> : "A"}
            </div>
            <span>
              <b>Logo da ATSOC</b>
              <small>PNG, JPG ou WEBP • até 2 MB</small>
              <div className="row">
                <label className="btn ghost logo-upload-label">
                  <Upload /> Selecionar logo
                  <input
                    className="logo-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleLogo(event.target.files?.[0])}
                  />
                </label>
                {logo && (
                  <Button kind="ghost" onClick={() => setLogo("")}>
                    Remover
                  </Button>
                )}
              </div>
              {logoError && <small className="negative">{logoError}</small>}
            </span>
          </div>
          <div className="form-grid">
            <label>
              Razão social
              <input defaultValue="ATSOC Suporte e Tecnologia Ltda." />
            </label>
            <label>
              CNPJ
              <input defaultValue="00.000.000/0001-00" />
            </label>
            <label>
              Moeda
              <select>
                <option>Real brasileiro (BRL)</option>
              </select>
            </label>
            <label>
              Timezone
              <select>
                <option>América/São Paulo (GMT-3)</option>
              </select>
            </label>
          </div>
        </section>
        <section className="panel parameter-panel">
          <PanelTitle
            title="Parâmetros operacionais"
            sub="Capacidade, equipe e custos utilizados em todos os cálculos"
          >
            <Gauge />
          </PanelTitle>
          <div className="form-grid">
            <label>
              Clientes teóricos por FTE
              <input
                type="number"
                value={draft.theoreticalClientsPerFte}
                onChange={(e) =>
                  setNumber("theoreticalClientsPerFte", +e.target.value)
                }
              />
              <small>Premissa inicial: 2 provedores de 3.000 clientes</small>
            </label>
            <label>
              Limite operacional seguro (%)
              <input
                type="number"
                step="1"
                value={draft.safeUtilization * 100}
                onChange={(e) =>
                  setNumber("safeUtilization", +e.target.value / 100)
                }
              />
              <small>
                Capacidade segura atual:{" "}
                {safeClientsPerFte(draft).toLocaleString("pt-BR")} clientes/FTE
              </small>
            </label>
            <label>
              Atendentes disponíveis
              <input
                type="number"
                step="1"
                value={draft.availableOperationalFte}
                onChange={(e) =>
                  setNumber("availableOperationalFte", +e.target.value)
                }
              />
            </label>
            <label>
              Fator de intensidade operacional
              <input
                type="number"
                step="0.01"
                value={draft.defaultIntensityFactor}
                onChange={(e) =>
                  setNumber("defaultIntensityFactor", +e.target.value)
                }
              />
            </label>
            <label>
              Custo base PJ
              <input
                type="number"
                value={draft.collaboratorBaseCost}
                onChange={(e) =>
                  setNumber("collaboratorBaseCost", +e.target.value)
                }
              />
            </label>
            <label>
              Custo máximo/conservador
              <input
                type="number"
                value={draft.collaboratorMaxCost}
                onChange={(e) =>
                  setNumber("collaboratorMaxCost", +e.target.value)
                }
              />
            </label>
            <label>
              Horas produtivas mensais
              <input
                type="number"
                value={draft.productiveHoursMonth}
                onChange={(e) =>
                  setNumber("productiveHoursMonth", +e.target.value)
                }
              />
              <small>Custo hora atual: {brl(employeeHourlyCost(draft))}</small>
            </label>
            <label>
              Média de semanas por mês
              <input
                type="number"
                step="0.001"
                value={draft.weeksPerMonth}
                onChange={(e) => setNumber("weeksPerMonth", +e.target.value)}
              />
            </label>
          </div>
          <div className="time-band-config">
            <div className="time-band-title">
              <span>
                <b>Fatores de demanda por faixa horária</b>
                <small>
                  Ajustam o FTE, as horas equivalentes e o custo operacional em
                  cada bloco de 30 minutos.
                </small>
              </span>
              <Pill tone={timeBandValidation.valid ? "green" : "red"}>
                {timeBandValidation.valid ? "24h configuradas" : "Revisar faixas"}
              </Pill>
            </div>
            <div className="time-band-grid">
              {(draft.operationalTimeBands || DEFAULT_PARAMETERS.operationalTimeBands).map(
                (band, index) => (
                  <div className="time-band-card" key={band.id}>
                    <b>{band.label}</b>
                    <label>
                      Início
                      <input
                        type="time"
                        value={band.start}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            operationalTimeBands: (
                              current.operationalTimeBands ||
                              DEFAULT_PARAMETERS.operationalTimeBands
                            ).map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, start: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Fim
                      <input
                        type="time"
                        value={band.end}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            operationalTimeBands: (
                              current.operationalTimeBands ||
                              DEFAULT_PARAMETERS.operationalTimeBands
                            ).map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, end: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Fator
                      <input
                        type="number"
                        min="0.01"
                        max="3"
                        step="0.05"
                        value={band.factor}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            operationalTimeBands: (
                              current.operationalTimeBands ||
                              DEFAULT_PARAMETERS.operationalTimeBands
                            ).map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, factor: +event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </label>
                  </div>
                ),
              )}
            </div>
            {!timeBandValidation.valid && (
              <div className="policy-error">
                <AlertTriangle /> {timeBandValidation.message}
              </div>
            )}
            <small className="time-band-help">
              Valores iniciais: diurno 1,00; noturno 0,80; madrugada 0,50.
              Ajuste futuramente conforme o histórico real de chamados.
            </small>
          </div>
          <div className="setting">
            <span>
              <b>Usar custo conservador na precificação</b>
              <small>Quando desligado, utiliza o custo base PJ</small>
            </span>
            <button
              className={`switch ${draft.pricingUsesMaxCost ? "on" : ""}`}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  pricingUsesMaxCost: !d.pricingUsesMaxCost,
                }))
              }
            >
              <i />
            </button>
          </div>
        </section>
        <section className="panel parameter-panel partner-targets-panel">
          <PanelTitle
            title="Estrutura societária e meta de dedicação"
            sub="Separa o que já é pago hoje da remuneração necessária para dedicação integral"
          >
            <Users />
          </PanelTitle>
          <div className="partner-targets-head">
            <span>Sócio</span><span>Pró-labore atual</span><span>Pró-labore-alvo</span><span>Função atual</span><span>Função na estrutura-alvo</span><span>Incluir</span><span />
          </div>
          {(draft.partnerTargets || []).map((partner, index) => (
            <div className="partner-target-row" key={partner.id}>
              <label><span className="sr-only">Nome do sócio</span><input aria-label="Nome do sócio" value={partner.name} onChange={(event) => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></label>
              <label><span className="sr-only">Pró-labore atual</span><input aria-label="Pró-labore atual" type="number" min="0" value={partner.currentMonthlyPay} onChange={(event) => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.map((item, itemIndex) => itemIndex === index ? { ...item, currentMonthlyPay: +event.target.value } : item) }))} /></label>
              <label><span className="sr-only">Pró-labore-alvo</span><input aria-label="Pró-labore-alvo" type="number" min="0" value={partner.targetMonthlyPay} onChange={(event) => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.map((item, itemIndex) => itemIndex === index ? { ...item, targetMonthlyPay: +event.target.value } : item) }))} /></label>
              <label><span className="sr-only">Função atual</span><input aria-label="Função atual" value={partner.currentRole} onChange={(event) => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.map((item, itemIndex) => itemIndex === index ? { ...item, currentRole: event.target.value } : item) }))} /></label>
              <label><span className="sr-only">Função na estrutura-alvo</span><input aria-label="Função na estrutura-alvo" value={partner.targetRole} onChange={(event) => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.map((item, itemIndex) => itemIndex === index ? { ...item, targetRole: event.target.value } : item) }))} /></label>
              <button className={`switch ${partner.includeInTarget ? "on" : ""}`} title="Incluir na estrutura-alvo" onClick={() => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.map((item, itemIndex) => itemIndex === index ? { ...item, includeInTarget: !item.includeInTarget } : item) }))}><i /></button>
              <button className="icon danger" title="Excluir sócio" onClick={() => setDraft((current) => ({ ...current, partnerTargets: current.partnerTargets.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 /></button>
            </div>
          ))}
          <Button kind="ghost" onClick={() => setDraft((current) => ({ ...current, partnerTargets: [...(current.partnerTargets || []), { id: `partner-${Date.now()}`, name: "Novo sócio", currentMonthlyPay: 0, targetMonthlyPay: 5500, currentRole: "Operação e gestão", targetRole: "Gestão", includeInTarget: true }] }))}><Plus /> Adicionar sócio</Button>
          <div className="partner-target-summary">
            <span><small>Pró-labore pago hoje</small><b>{brl((draft.partnerTargets || []).filter((item) => item.includeInTarget).reduce((sum, item) => sum + item.currentMonthlyPay, 0))}</b></span>
            <span><small>Pró-labore total desejado</small><b>{brl((draft.partnerTargets || []).filter((item) => item.includeInTarget).reduce((sum, item) => sum + item.targetMonthlyPay, 0))}</b></span>
            <span><small>Complemento necessário</small><b>{brl(normalizedPartnerCost(draft))}</b></span>
          </div>
          <div className="setting">
            <span><b>Sócios deixam a operação na estrutura-alvo</b><small>Quando ativado, o sistema inclui automaticamente as contratações operacionais que faltam, sem contar equipe comercial.</small></span>
            <button className={`switch ${draft.targetPartnersLeaveOperations ? "on" : ""}`} onClick={() => setDraft((current) => ({ ...current, targetPartnersLeaveOperations: !current.targetPartnersLeaveOperations }))}><i /></button>
          </div>
          <div className="callout compact"><ShieldCheck /><span><b>Sem duplicidade</b><p>O pró-labore atual entra na DRE pelas contas fixas. Aqui é calculado somente o complemento entre o valor atual e o alvo.</p></span></div>
        </section>
        <section className="panel parameter-panel">
          <PanelTitle
            title="Parâmetros financeiros e comerciais"
            sub="Impostos, CAC, margem, piso e autonomia do vendedor"
          >
            <CircleDollarSign />
          </PanelTitle>
          <div className="form-grid">
            <label>
              Imposto sobre faturamento (%)
              <input
                type="number"
                step="0.01"
                value={draft.taxRate * 100}
                onChange={(e) => setNumber("taxRate", +e.target.value / 100)}
              />
            </label>
            <label>
              CAC manual para precificação
              <input
                type="number"
                value={draft.cacManual}
                onChange={(e) => setNumber("cacManual", +e.target.value)}
              />
            </label>
            <label>
              Custos comerciais do período
              <input
                type="number"
                value={draft.commercialCostsPeriod}
                onChange={(e) =>
                  setNumber("commercialCostsPeriod", +e.target.value)
                }
              />
              <small>
                CAC real calculado: {brl(calculateAutomaticCac(draft))}
              </small>
            </label>
            <label>
              Novos clientes no período
              <input
                type="number"
                value={draft.newClientsPeriod}
                onChange={(e) => setNumber("newClientsPeriod", +e.target.value)}
              />
            </label>
            <label>
              CAC médio histórico
              <input
                type="number"
                value={draft.cacAverage}
                onChange={(e) => setNumber("cacAverage", +e.target.value)}
              />
            </label>
            <label>
              Payback desejado (meses)
              <input
                type="number"
                value={draft.cacPaybackMonths}
                onChange={(e) => setNumber("cacPaybackMonths", +e.target.value)}
              />
              <small>Amortização mensal: {brl(monthlyCacCost(draft))}</small>
            </label>
            <label>
              Contratos ativos para rateio da cotação
              <input
                type="number"
                value={draft.activeContractsForPricingAllocation}
                onChange={(e) =>
                  setNumber(
                    "activeContractsForPricingAllocation",
                    +e.target.value,
                  )
                }
              />
            </label>
            <label>
              Piso comercial
              <input
                type="number"
                value={draft.commercialFloor}
                onChange={(e) => setNumber("commercialFloor", +e.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="panel parameter-panel reference-editor">
          <PanelTitle
            title="Tabela de referência comercial"
            sub="Faixas históricas editáveis por hora diária"
          >
            <Calculator />
          </PanelTitle>
          {draft.referenceBands.map((band, index) => (
            <div className="parameter-row" key={index}>
              <span>
                {band.fromHour}ª até {band.toHour}ª hora diária
              </span>
              <label>
                R$/hora-mês
                <input
                  type="number"
                  value={band.valuePerHourMonth}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      referenceBands: d.referenceBands.map((b, i) =>
                        i === index
                          ? { ...b, valuePerHourMonth: +e.target.value }
                          : b,
                      ),
                    }))
                  }
                />
              </label>
            </div>
          ))}
          <div className="parameter-row">
            <span>Fatores por tamanho da base</span>
            <div className="row">
              {draft.baseFactors.map((factor, index) => (
                <label key={index}>
                  {factor.label}
                  <input
                    type="number"
                    step="0.01"
                    value={factor.factor}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        baseFactors: d.baseFactors.map((f, i) =>
                          i === index ? { ...f, factor: +e.target.value } : f,
                        ),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </section>
        <section className="panel parameter-panel">
          <PanelTitle
            title="Rateio de custos fixos"
            sub="Método aplicado à rentabilidade e à precificação"
          >
            <ReceiptText />
          </PanelTitle>
          {draft.fixedCosts.map((cost, index) => (
            <div className="parameter-row" key={cost.id}>
              <input
                value={cost.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    fixedCosts: d.fixedCosts.map((c, i) =>
                      i === index ? { ...c, name: e.target.value } : c,
                    ),
                  }))
                }
              />
              <input
                type="number"
                value={cost.amount}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    fixedCosts: d.fixedCosts.map((c, i) =>
                      i === index ? { ...c, amount: +e.target.value } : c,
                    ),
                  }))
                }
              />
              <select
                value={cost.allocation}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    fixedCosts: d.fixedCosts.map((c, i) =>
                      i === index
                        ? { ...c, allocation: e.target.value as any }
                        : c,
                    ),
                  }))
                }
              >
                <option value="equal">Igual por cliente</option>
                <option value="revenue">Proporcional à receita</option>
                <option value="load">Proporcional à carga operacional</option>
                <option value="none">Não ratear para precificação</option>
              </select>
            </div>
          ))}
        </section>
        <section className="panel parameter-panel">
          <PanelTitle
            title="Motor de comissões"
            sub="Regras sequenciais sem fórmula circular"
          >
            <Users />
          </PanelTitle>
          {draft.commissions.map((rule, index) => (
            <div className="parameter-row commission-rule" key={rule.id}>
              <input
                value={rule.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index ? { ...c, name: e.target.value } : c,
                    ),
                  }))
                }
              />
              <select
                value={rule.kind}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index ? { ...c, kind: e.target.value as any } : c,
                    ),
                  }))
                }
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
              <input
                type="number"
                step="0.1"
                value={rule.kind === "percent" ? rule.value * 100 : rule.value}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index
                        ? {
                            ...c,
                            value:
                              c.kind === "percent"
                                ? +e.target.value / 100
                                : +e.target.value,
                          }
                        : c,
                    ),
                  }))
                }
              />
              <select
                value={rule.base}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index ? { ...c, base: e.target.value as any } : c,
                    ),
                  }))
                }
              >
                <option value="gross_revenue">Receita bruta</option>
                <option value="net_revenue">Receita líquida</option>
                <option value="first_month">Primeira mensalidade</option>
                <option value="recurring_revenue">
                  Mensalidade recorrente
                </option>
                <option value="contribution_margin">
                  Margem de contribuição
                </option>
                <option value="operating_profit">Lucro operacional</option>
                <option value="profit_before_participation">
                  Lucro antes da participação
                </option>
              </select>
              <select
                value={rule.recurrence}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index
                        ? { ...c, recurrence: e.target.value as any }
                        : c,
                    ),
                  }))
                }
              >
                <option value="once">Uma vez</option>
                <option value="recurring">Recorrente</option>
              </select>
              <input
                type="date"
                aria-label="Data inicial"
                value={rule.start || ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index
                        ? { ...c, start: e.target.value || undefined }
                        : c,
                    ),
                  }))
                }
              />
              <input
                type="date"
                aria-label="Data final"
                value={rule.end || ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    commissions: d.commissions.map((c, i) =>
                      i === index
                        ? { ...c, end: e.target.value || undefined }
                        : c,
                    ),
                  }))
                }
              />
              {(rule.id === "grupo-silva" || rule.name.trim().toLowerCase() === "grupo silva") && (
                <small className="commission-condition">
                  Aplicada somente quando o vendedor estiver no padrão “Nome - Grupo Silva”.
                </small>
              )}
            </div>
          ))}
          <div className="modal-actions">
            <Button
              kind="ghost"
              onClick={() => {
                reset();
                setDraft(DEFAULT_PARAMETERS);
              }}
            >
              Restaurar parâmetros iniciais
            </Button>
          </div>
        </section>
        <section className="panel">
          <PanelTitle
            title="Preferências"
            sub="Alertas e comportamento da plataforma"
          >
            <Settings />
          </PanelTitle>
          {[
            ["Alertas financeiros", "Vencimentos e caixa negativo"],
            ["Alertas operacionais", "Capacidade acima do limite"],
            [
              "Confirmação para exclusões",
              "Solicitar confirmação antes de excluir",
            ],
          ].map((r, i) => (
            <div className="setting" key={r[0]}>
              <span>
                <b>{r[0]}</b>
                <small>{r[1]}</small>
              </span>
              <button
                className={`switch ${preferences[i] ? "on" : ""}`}
                onClick={() =>
                  setPreferences((current) =>
                    current.map((value, index) =>
                      index === i ? !value : value,
                    ),
                  )
                }
              >
                <i />
              </button>
            </div>
          ))}
          <div className="setting">
            <span>
              <b>Explicações dos campos</b>
              <small>Mostrar uma dica de significado e uso ao passar o mouse sobre cada campo</small>
            </span>
            <button
              className={`switch ${draft.fieldHelpEnabled ? "on" : ""}`}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  fieldHelpEnabled: !current.fieldHelpEnabled,
                }))
              }
              aria-label="Ativar ou desativar explicações dos campos"
            >
              <i />
            </button>
          </div>
        </section>
        <section className="panel users">
          <PanelTitle
            title="Usuários e permissões"
            sub="Controle de acesso ao sistema"
          >
            <Button kind="ghost" onClick={() => open("Convidar novo usuário")}>
              <Plus />
              Convidar
            </Button>
          </PanelTitle>
          {[
            ["Vinicius Scielzo", "vinicius@atsoc.com.br", "Administrador"],
            ["Carlos Silva", "carlos@atsoc.com.br", "Sócio"],
            ["Gabriel Souza", "gabriel@atsoc.com.br", "Sócio"],
            ["Comercial ATSOC", "vendas@atsoc.com.br", "Vendedor"],
          ].map((u) => (
            <div key={u[1]}>
              <div className="avatar">{u[0].slice(0, 2).toUpperCase()}</div>
              <span>
                <b>{u[0]}</b>
                <small>{u[1]}</small>
              </span>
              <Pill tone={u[2] === "Administrador" ? "blue" : "green"}>
                {u[2]}
              </Pill>
              <button
                className="icon"
                title={`Gerenciar ${u[0]}`}
                onClick={() => open(`Gerenciar usuário • ${u[0]}`)}
              >
                <MoreHorizontal />
              </button>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function Modal({ state, close }: any) {
  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => e.currentTarget === e.target && close()}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <small>ATSOC SUPORTE</small>
            <h3>{state.title}</h3>
          </div>
          <button className="icon" onClick={close}>
            <X />
          </button>
        </div>
        {state.client ? (
          <>
            <div className="client-banner">
              <div className="avatar big">VF</div>
              <span>
                <h3>Velox Fibra Telecom</h3>
                <p>Contrato ativo desde 10/02/2026</p>
              </span>
              <Pill tone="green">Ativo</Pill>
            </div>
            <div className="metrics three">
              <Metric
                label="MRR"
                value="R$ 8.500"
                detail="Receita recorrente"
              />
              <Metric
                label="Lucro estimado"
                value="R$ 3.060"
                detail="Margem de 64%"
                tone="green"
              />
              <Metric
                label="Capacidade"
                value="28%"
                detail="1.260 atendimentos"
                tone="orange"
              />
            </div>
          </>
        ) : null}
        <div className="form-grid">
          <label>
            Descrição
            <input placeholder="Digite uma descrição" />
          </label>
          <label>
            Valor
            <div className="money-input">
              <span>R$</span>
              <input defaultValue="0,00" />
            </div>
          </label>
          <label>
            Categoria
            <select>
              <option>Receita recorrente</option>
              <option>Custos operacionais</option>
            </select>
          </label>
          <label>
            Vencimento
            <input type="date" />
          </label>
        </div>
        <label>
          Observações
          <textarea placeholder="Informações adicionais..." />
        </label>
        <div className="modal-actions">
          <Button kind="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={close}>
            <Check />
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { parameters, update: updateParametersLocal } = useAtsocParameters();
  const [page, setPage] = useState<Key>("dashboard"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<any>(null),
    [notice, setNotice] = useState<{
      message: string;
      tone: "success" | "error";
    } | null>(null),
    [theme, setTheme] = useState<"dark" | "light">("dark"),
    [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]),
    [recurringRules, setRecurringRulesState] = useState<RecurringAccountRule[]>(
      [],
    ),
    [teamMembers, setTeamMembersState] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS),
    [clientRecords, setClientRecords] = useState<ClientRecord[]>(INITIAL_CLIENT_RECORDS),
    [quoteRecords, setQuoteRecordsState] = useState<QuoteRecord[]>([]),
    [scenarioRecords, setScenarioRecordsState] = useState<ScenarioRecord[]>([]),
    [crmLeads, setCrmLeadsState] = useState<CrmLead[]>([]),
    [crmColumns, setCrmColumnsState] = useState<CrmColumn[]>(DEFAULT_CRM_COLUMNS),
    [companyLogo, setCompanyLogoState] = useState(""),
    [initialBalance, setInitialBalanceState] = useState(0),
    [searchQuery, setSearchQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [workspaceUser, setWorkspaceUser] = useState<{ name?: string; email?: string; role?: string }>({}),
    [loadError, setLoadError] = useState(""),
    [hydrated, setHydrated] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (
    message: string,
    tone: "success" | "error" = "success",
  ) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ message, tone });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 1900);
  };
  const persist = (resource: string, value: unknown) => {
    void persistWorkspaceResource(resource, value).catch(() =>
      setLoadError("Uma alteração não foi salva. Verifique a conexão e tente novamente."),
    );
  };
  const update = (next: AtsocParameters) => {
    updateParametersLocal(next);
    if (hydrated) persist("parameters", next);
  };
  const reset = () => update(DEFAULT_PARAMETERS);
  useEffect(() => {
    const saved = localStorage.getItem("atsoc-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
    const applyWorkspace = (data: WorkspacePayload) => {
      updateParametersLocal(
        mergeAtsocParameters(
          (data.parameters || {}) as Partial<AtsocParameters>,
        ),
      );
      setFinancialEntries((data.financialEntries || []) as FinancialEntry[]);
      setRecurringRulesState((data.recurringRules || []) as RecurringAccountRule[]);
      setTeamMembersState((data.teamMembers || INITIAL_TEAM_MEMBERS) as TeamMember[]);
      setClientRecords((data.clientRecords || INITIAL_CLIENT_RECORDS) as ClientRecord[]);
      setQuoteRecordsState((data.quoteRecords || []) as QuoteRecord[]);
      setScenarioRecordsState((data.scenarioRecords || []) as ScenarioRecord[]);
      setCrmLeadsState(((data.crmLeads || []) as CrmLead[]).map((lead) => ({ ...lead, tags: Array.isArray(lead.tags) ? lead.tags : [] })));
      setCrmColumnsState(normalizeCrmColumns(data.crmColumns));
      setCompanyLogoState(typeof data.companyLogo === "string" ? data.companyLogo : "");
      setInitialBalanceState(Number(data.initialBalance) || 0);
    };
    const start = async () => {
      try {
        const loaded = await loadWorkspace();
        setWorkspaceUser({ ...loaded.user, role: loaded.role });
        let data = loaded.data;
        if (!data) {
          const seed: WorkspacePayload = {
            parameters: DEFAULT_PARAMETERS,
            financialEntries: INITIAL_CLIENT_RECORDS.flatMap((client) =>
              createClientReceivables(client),
            ),
            recurringRules: [],
            teamMembers: INITIAL_TEAM_MEMBERS,
            clientRecords: INITIAL_CLIENT_RECORDS,
            quoteRecords: [],
            scenarioRecords: [],
            crmLeads: [],
            crmColumns: DEFAULT_CRM_COLUMNS,
            companyLogo: "",
            initialBalance: 0,
            approvalRequests: [],
            discountAudit: [],
          };
          data = (await initializeWorkspace(seed)).data || seed;
        }
        applyWorkspace(data);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
      } finally {
        setHydrated(true);
      }
    };
    void start();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const costRules: RecurringAccountRule[] = parameters.fixedCosts.map(
      (cost) => ({
        id: `cost-${cost.id}`,
        description: cost.name,
        party: cost.party || cost.name,
        category: cost.category || "Custo fixo",
        amount: cost.amount,
        type: "expense",
        dueDay: cost.dueDay || 10,
        startDate: cost.startDate || localIsoDate(),
        endDate: cost.endDate || shiftIsoDate(localIsoDate(), 3650),
      }),
    );
    setRecurringRulesState((current) => {
      const next = [
        ...current.filter((rule) => !rule.id.startsWith("cost-")),
        ...costRules,
      ];
      persist("recurringRules", next);
      return next;
    });
    setFinancialEntries((current) => {
      const preserved = current.filter(
        (entry) =>
          !entry.recurringRuleId?.startsWith("cost-") ||
          entry.manualOverride ||
          entry.status === "Pago",
      );
      const existingIds = new Set(preserved.map((entry) => entry.id));
      const generated = costRules.flatMap(createRecurringEntries);
      const next = [
        ...preserved,
        ...generated.filter((entry) => !existingIds.has(entry.id)),
      ];
      persist("financialEntries", next);
      return next;
    });
  }, [hydrated, parameters.fixedCosts]);
  useEffect(() => {
    if (!hydrated) return;
    const standaloneExpenses = recurringRules.filter(
      (rule) => rule.type === "expense" && !rule.id.startsWith("cost-"),
    );
    if (!standaloneExpenses.length) return;
    const links = standaloneExpenses.map((rule) => ({
      rule,
      costId: `account-${rule.id.replace(/^fixed-/, "")}`,
    }));
    const additions = links
      .filter(({ costId }) =>
        !parameters.fixedCosts.some((cost) => cost.id === costId),
      )
      .map(({ rule, costId }) => ({
        id: costId,
        name: rule.description,
        amount: rule.amount,
        allocation: "equal" as const,
        dueDay: rule.dueDay,
        startDate: rule.startDate,
        endDate: rule.endDate,
        party: rule.party,
        category: rule.category,
      }));
    if (additions.length)
      update({
        ...parameters,
        fixedCosts: [...parameters.fixedCosts, ...additions],
      });
    const idMap = new Map(
      links.map(({ rule, costId }) => [rule.id, `cost-${costId}`]),
    );
    setRecurringRulesState((current) => {
      const next = current.filter((rule) => !idMap.has(rule.id));
      persist("recurringRules", next);
      return next;
    });
    setFinancialEntries((current) => {
      const next = current.flatMap((entry) => {
        const linkedId = entry.recurringRuleId
          ? idMap.get(entry.recurringRuleId)
          : undefined;
        if (!linkedId) return [entry];
        if (
          entry.manualOverride ||
          entry.status === "Pago" ||
          entry.status === "Recebido"
        )
          return [
            {
              ...entry,
              id: `fixed-${linkedId}-${entry.date.slice(0, 7)}`,
              recurringRuleId: linkedId,
            },
          ];
        return [];
      });
      persist("financialEntries", next);
      return next;
    });
  }, [hydrated, recurringRules, parameters.fixedCosts]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const updateFinancialEntries = (
    updater:
      | FinancialEntry[]
      | ((current: FinancialEntry[]) => FinancialEntry[]),
  ) =>
    setFinancialEntries((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("financialEntries", next);
      return next;
    });
  const updateRecurringRules = (
    updater:
      | RecurringAccountRule[]
      | ((current: RecurringAccountRule[]) => RecurringAccountRule[]),
  ) =>
    setRecurringRulesState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("recurringRules", next);
      return next;
    });
  const updateInitialBalance = (value: number) => {
    setInitialBalanceState(value);
    persist("initialBalance", value);
  };
  const updateClientRecords = (
    updater: ClientRecord[] | ((current: ClientRecord[]) => ClientRecord[]),
  ) =>
    setClientRecords((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("clientRecords", next);
      return next;
    });
  const updateTeamMembers = (
    updater: TeamMember[] | ((current: TeamMember[]) => TeamMember[]),
  ) =>
    setTeamMembersState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("teamMembers", next);
      return next;
    });
  const updateQuoteRecords = (
    updater: QuoteRecord[] | ((current: QuoteRecord[]) => QuoteRecord[]),
  ) =>
    setQuoteRecordsState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("quoteRecords", next);
      return next;
    });
  const updateScenarioRecords = (
    updater:
      | ScenarioRecord[]
      | ((current: ScenarioRecord[]) => ScenarioRecord[]),
  ) =>
    setScenarioRecordsState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("scenarioRecords", next);
      return next;
    });
  const updateCrmLeads = (
    updater: CrmLead[] | ((current: CrmLead[]) => CrmLead[]),
  ) =>
    setCrmLeadsState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("crmLeads", next);
      return next;
    });
  const updateCrmColumns = (
    updater: CrmColumn[] | ((current: CrmColumn[]) => CrmColumn[]),
  ) =>
    setCrmColumnsState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      persist("crmColumns", next);
      return next;
    });
  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("atsoc-theme", next);
      return next;
    });
  const updateCompanyLogo = (value: string) => {
    setCompanyLogoState(value);
    persist("companyLogo", value);
  };
  const open = (title: string, client = false) => setModal({ title, client });
  const title = menu.find((x) => x[0] === page)![1];
  const activeClients = clientRecords.filter(
    (client) => client.status === "active",
  );
  const alerts = buildSystemAlerts(
    financialEntries,
    parameters,
    initialBalance,
    activeClients,
  );
  const searchResults = searchQuery.trim()
    ? [
        ...menu
          .filter(([, label]) =>
            label.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map(([key, label, icon]) => ({
            key,
            label,
            detail: "Módulo do sistema",
            icon,
          })),
        ...clientRecords
          .filter((client) =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((client) => ({
            key: "clients" as Key,
            label: client.name,
            detail:
              client.status === "active"
                ? "Cliente ativo"
                : "Contrato em recuperação",
            icon: Building2,
          })),
        ...crmLeads
          .filter((lead) =>
            `${lead.company} ${lead.contact}`.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((lead) => ({
            key: "crm" as Key,
            label: lead.company,
            detail: "Lead no CRM",
            icon: Target,
          })),
      ].slice(0, 7)
    : [];
  const goTo = (key: Key) => {
    setPage(key);
    setSearchOpen(false);
    setNotificationsOpen(false);
    setMobile(false);
  };
  const convertCrmLead = (
    lead: CrmLead,
    data: { monthlyRevenue: number; activeClients: number; billingDay: number; contractStart: string },
  ) => {
    const clientId = `crm-client-${Date.now()}`;
    const client: ClientRecord = {
      id: clientId,
      name: lead.company,
      legalName: lead.company,
      responsible: lead.contact,
      phone: lead.phone,
      email: lead.email,
      activeClients: data.activeClients,
      monthlyRevenue: data.monthlyRevenue,
      intensityFactor: parameters.defaultIntensityFactor,
      schedule: weekSchedule("00:00", "00:00", []),
      status: "active",
      contractStart: data.contractStart,
      billingDay: Math.min(31, Math.max(1, data.billingDay)),
      seller: "Vinicius Scielzo",
      channels: "WhatsApp + Telefone",
      supportLevel: "N1 + N2",
      cacManual: 0,
    };
    updateClientRecords((current) => [...current, client]);
    updateFinancialEntries((current) => [...current, ...createClientReceivables(client)]);
    return clientId;
  };
  const content = useMemo(
    () =>
      ({
        dashboard: (
          <Dashboard
            open={open}
            p={parameters}
            entries={financialEntries}
            initialBalance={initialBalance}
            navigate={goTo}
            clients={activeClients}
            team={teamMembers}
          />
        ),
        cashflow: (
          <Cash
            open={open}
            entries={financialEntries}
            setEntries={updateFinancialEntries}
            initialBalance={initialBalance}
            setInitialBalance={updateInitialBalance}
          />
        ),
        accounts: (
          <Cash
            open={open}
            accounts
            entries={financialEntries}
            setEntries={updateFinancialEntries}
            initialBalance={initialBalance}
            setInitialBalance={updateInitialBalance}
            recurringRules={recurringRules}
            setRecurringRules={updateRecurringRules}
            parameters={parameters}
            updateParameters={update}
          />
        ),
        clients: (
          <Clients
            p={parameters}
            clients={clientRecords}
            setClients={updateClientRecords}
            setEntries={updateFinancialEntries}
          />
        ),
        crm: (
          <Crm
            leads={crmLeads}
            columns={crmColumns}
            quotes={quoteRecords}
            setLeads={updateCrmLeads}
            setColumns={updateCrmColumns}
            openPricing={(lead) => {
              sessionStorage.setItem("atsoc-crm-pricing-lead", JSON.stringify(lead));
              goTo("pricing");
            }}
            convertToClient={convertCrmLead}
          />
        ),
        pricing: (
          <Pricing
            notify={notify}
            p={parameters}
            clients={activeClients}
            quotes={quoteRecords}
            setQuotes={updateQuoteRecords}
            crmLeads={crmLeads}
            setCrmLeads={updateCrmLeads}
          />
        ),
        capacity: (
          <Capacity p={parameters} clients={activeClients} team={teamMembers} />
        ),
        team: (
          <Team
            p={parameters}
            members={teamMembers}
            setMembers={updateTeamMembers}
          />
        ),
        costs: <Costs p={parameters} update={update} />,
        dre: <Dre p={parameters} clients={activeClients} team={teamMembers} />,
        scenarios: (
          <Scenarios
            p={parameters}
            clients={activeClients}
            records={scenarioRecords}
            setRecords={updateScenarioRecords}
          />
        ),
        reports: (
          <Reports
            p={parameters}
            entries={financialEntries}
            clients={clientRecords}
            team={teamMembers}
            initialBalance={initialBalance}
          />
        ),
        settings: (
          <Config
            notify={notify}
            p={parameters}
            update={update}
            reset={reset}
            logo={companyLogo}
            setLogo={updateCompanyLogo}
          />
        ),
      })[page],
    [
      page,
      parameters,
      financialEntries,
      initialBalance,
      clientRecords,
      recurringRules,
      teamMembers,
      quoteRecords,
      scenarioRecords,
      crmLeads,
      crmColumns,
      companyLogo,
    ],
  );
  return (
    <div className={`shell ${theme}`}>
      <FieldHelpOverlay enabled={parameters.fieldHelpEnabled !== false} />
      <aside
        className={`${collapsed ? "collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-mark">
            {companyLogo ? <img src={companyLogo} alt="Logo da ATSOC" /> : "A"}
          </div>
          <span>
            <b>ATSOC</b>
            <small>SUPORTE</small>
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>
        <nav>
          {menu.map(([k, n, I]) => (
            <button
              key={k}
              className={page === k ? "active" : ""}
              onClick={() => {
                setPage(k);
                setMobile(false);
              }}
              title={n}
            >
              <I />
              <span>{n}</span>
              {page === k && <i />}
            </button>
          ))}
        </nav>
        <footer>
          <div className="health">
            <i />
            <span>
              <b>Sistema operacional</b>
              <small>Dados locais protegidos</small>
            </span>
          </div>
          <button onClick={() => open("Perfil do usuário")}>
            <div className="avatar">
              {(workspaceUser.name || workspaceUser.email || "U").slice(0, 2).toUpperCase()}
            </div>
            <span>
              <b>{workspaceUser.name || workspaceUser.email || "Usuário ATSOC"}</b>
              <small>{workspaceUser.role || "Acesso autorizado"}</small>
            </span>
            <ChevronDown />
          </button>
          <form action="/auth/signout" method="post" className="signout-form">
            <button type="submit" title="Sair do sistema"><LogOut /><span>Sair com segurança</span></button>
          </form>
        </footer>
      </aside>
      {mobile && <div className="overlay" onClick={() => setMobile(false)} />}
      <main className={collapsed ? "collapsed" : ""}>
        <header>
          <button className="hamb" onClick={() => setMobile(!mobile)}>
            <Menu />
          </button>
          <div>
            <small>ATSOC SUPORTE</small>
            <h1>{title}</h1>
          </div>
          <div className="top">
            <div className="search global-search-wrap">
              <Search />
              <input
                ref={searchRef}
                placeholder="Buscar no sistema..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0])
                    goTo(searchResults[0].key);
                  if (event.key === "Escape") setSearchOpen(false);
                }}
              />
              <kbd>⌘ K</kbd>
              {searchOpen && searchQuery && (
                <div className="search-results">
                  {searchResults.map((result) => {
                    const I = result.icon;
                    return (
                      <button
                        key={`${result.key}-${result.label}`}
                        onClick={() => goTo(result.key)}
                      >
                        <I />
                        <span>
                          <b>{result.label}</b>
                          <small>{result.detail}</small>
                        </span>
                        <ChevronRight />
                      </button>
                    );
                  })}
                  {!searchResults.length && (
                    <div className="search-empty">
                      Nenhum resultado encontrado.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
              }
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Claro" : "Escuro"}</span>
            </button>
            <div className="notification-wrap">
              <button
                className="bell"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-expanded={notificationsOpen}
                aria-label="Abrir alertas"
              >
                <Bell />
                {alerts.length > 0 && <i>{alerts.length}</i>}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div>
                    <b>Alertas</b>
                    <small>
                      {alerts.length
                        ? `${alerts.length} ponto(s) exigem atenção`
                        : "Tudo em ordem"}
                    </small>
                  </div>
                  {alerts.map((alert) => {
                    const I = alert.icon;
                    return (
                      <button
                        key={alert.id}
                        onClick={() => goTo(alert.target)}
                        className={alert.tone}
                      >
                        <I />
                        <span>
                          <b>{alert.title}</b>
                          <small>{alert.detail}</small>
                        </span>
                        <ChevronRight />
                      </button>
                    );
                  })}
                  {!alerts.length && (
                    <div className="notification-empty">
                      <ShieldCheck />
                      <span>Nenhum alerta ativo.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="date">
              <CalendarDays />
              <span>
                {new Date(`${localIsoDate()}T12:00:00`)
                  .toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  .replace(".", "")}
              </span>
            </div>
          </div>
        </header>
        <div className="content">
          {loadError && <div className="workspace-error"><AlertTriangle />{loadError}</div>}
          {!hydrated ? <div className="workspace-loading">Carregando dados protegidos...</div> : content}
        </div>
      </main>
      {notice && (
        <div className={`action-toast ${notice.tone}`} role="status">
          {notice.tone === "success" ? <Check /> : <AlertTriangle />}
          <span>{notice.message}</span>
        </div>
      )}
      {modal && <Modal state={modal} close={() => setModal(null)} />}
    </div>
  );
}
