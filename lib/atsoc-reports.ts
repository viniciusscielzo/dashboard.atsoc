import {
  analyzeCapacity,
  calculateDre,
  calculateTargetStructure,
  clientProfitability,
  type AtsocParameters,
  type ClientInput,
  type TeamMember,
} from "./atsoc-control";

export type ReportEntry = {
  id: string;
  date: string;
  description: string;
  party: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  status: string;
};

export type ReportDataset = {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  highlights: Array<{ label: string; value: string }>;
};

type ReportInput = {
  month: string;
  initialBalance: number;
  entries: ReportEntry[];
  clients: ClientInput[];
  team: TeamMember[];
  parameters: AtsocParameters;
};

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

const percentage = (value: number) => `${(value * 100).toFixed(1)}%`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function buildAtsocReports({
  month,
  initialBalance,
  entries,
  clients,
  team,
  parameters,
}: ReportInput): ReportDataset[] {
  const monthEntries = entries
    .filter((entry) => entry.date.startsWith(month) && entry.status !== "Cancelado")
    .sort((a, b) => a.date.localeCompare(b.date));
  const income = monthEntries.filter((entry) => entry.type === "income");
  const expenses = monthEntries.filter((entry) => entry.type === "expense");
  const incomeTotal = sum(income.map((entry) => entry.amount));
  const expenseTotal = sum(expenses.map((entry) => entry.amount));
  const realizedIncome = sum(
    income.filter((entry) => entry.status === "Recebido").map((entry) => entry.amount),
  );
  const realizedExpenses = sum(
    expenses.filter((entry) => entry.status === "Pago").map((entry) => entry.amount),
  );
  const realDre = calculateDre(clients, parameters, false);
  const targetStructure = calculateTargetStructure(clients, parameters, team);
  const capacity = analyzeCapacity(clients, parameters);
  const activeOperationalTeam = team.filter(
    (member) => member.active && member.operational,
  );
  const profitability = clients.map((client) => ({
    client,
    result: clientProfitability(client, clients, parameters),
  }));
  const taxRows = clients.map((client) => [
    client.name,
    money(client.monthlyRevenue),
    percentage(parameters.taxRate),
    money(client.monthlyRevenue * parameters.taxRate),
  ]);
  const commissionRows = profitability.flatMap(({ client, result }) =>
    result.commissionDetails.map((commission) => [
      client.name,
      commission.name,
      money(commission.amount),
      commission.name.toLowerCase().includes("particip")
        ? "Participação"
        : "Comissão",
    ]),
  );

  return [
    {
      id: "cashflow",
      title: "Fluxo de Caixa",
      description: "Entradas, saídas e saldo projetado do período",
      columns: ["Data", "Descrição", "Cliente / fornecedor", "Tipo", "Status", "Valor"],
      rows: monthEntries.map((entry) => [
        new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR"),
        entry.description,
        entry.party,
        entry.type === "income" ? "Entrada" : "Saída",
        entry.status,
        money(entry.type === "income" ? entry.amount : -entry.amount),
      ]),
      highlights: [
        { label: "Saldo inicial", value: money(initialBalance) },
        { label: "Entradas", value: money(incomeTotal) },
        { label: "Saídas", value: money(expenseTotal) },
        { label: "Saldo projetado", value: money(initialBalance + incomeTotal - expenseTotal) },
      ],
    },
    {
      id: "dre",
      title: "DRE Gerencial",
      description: "Resultado atual e sustentabilidade da estrutura-alvo",
      columns: ["Linha", "Atual", "Estrutura-alvo"],
      rows: [
        ["Receita bruta", money(realDre.grossRevenue), money(realDre.grossRevenue)],
        ["(-) Impostos", money(-realDre.taxes), money(-realDre.taxes)],
        ["(-) Comissões", money(-realDre.nonParticipationCommissions), money(-realDre.nonParticipationCommissions)],
        ["Receita líquida", money(realDre.netRevenue), money(realDre.netRevenue)],
        ["(-) Despesas fixas e recorrentes", money(-realDre.fixedAllocation), money(-realDre.fixedAllocation)],
        ["(-) Complemento de pró-labore", money(0), money(-targetStructure.partnerAdjustment)],
        ["(-) Equipe operacional adicional", money(0), money(-targetStructure.operationalStaffCost)],
        ["(-) Participações", money(-realDre.participations), money(-realDre.participations)],
        ["Resultado", money(realDre.finalProfit), money(targetStructure.targetResult)],
      ],
      highlights: [
        { label: "Receita", value: money(realDre.grossRevenue) },
        { label: "Resultado atual", value: money(realDre.finalProfit) },
        { label: "Resultado estrutura-alvo", value: money(targetStructure.targetResult) },
        { label: "MRR sustentável", value: money(targetStructure.requiredMrr) },
      ],
    },
    {
      id: "profitability",
      title: "Rentabilidade por cliente",
      description: "Receita, custos, lucro e margem por contrato",
      columns: ["Cliente", "Receita", "Custo operacional", "CAC", "Fixos", "Lucro", "Margem"],
      rows: profitability.map(({ client, result }) => [
        client.name,
        money(client.monthlyRevenue),
        money(result.operationalCost),
        money(result.cacAmortized),
        money(result.fixedAllocation),
        money(result.finalProfit),
        percentage(result.margin),
      ]),
      highlights: [
        { label: "Clientes", value: String(clients.length) },
        { label: "MRR", value: money(realDre.grossRevenue) },
        { label: "Lucro total", value: money(realDre.finalProfit) },
        { label: "Margem média", value: percentage(realDre.margin) },
      ],
    },
    {
      id: "capacity",
      title: "Capacidade operacional",
      description: "Consumo por cliente e pico simultâneo em blocos de 30 minutos",
      columns: ["Cliente", "Base ativa", "Carga FTE", "Horas equivalentes", "Participação da receita"],
      rows: profitability.map(({ client, result }) => [
        client.name,
        client.activeClients,
        result.loadFte.toFixed(2),
        result.equivalentHours.toFixed(0),
        percentage(result.revenueShare),
      ]),
      highlights: [
        { label: "Pico FTE", value: capacity.maxFte.toFixed(2) },
        { label: "Horário do pico", value: capacity.peak.label },
        { label: "Atendentes seguros", value: String(capacity.safeStaff) },
        { label: "Capacidade segura/FTE", value: capacity.safeClientsPerFte.toLocaleString("pt-BR") },
      ],
    },
    {
      id: "payables",
      title: "Contas a pagar",
      description: "Compromissos financeiros do período",
      columns: ["Vencimento", "Descrição", "Fornecedor", "Categoria", "Status", "Valor"],
      rows: expenses.map((entry) => [
        new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR"),
        entry.description,
        entry.party,
        entry.category,
        entry.status,
        money(entry.amount),
      ]),
      highlights: [
        { label: "Total", value: money(expenseTotal) },
        { label: "Pago", value: money(realizedExpenses) },
        { label: "Em aberto", value: money(expenseTotal - realizedExpenses) },
        { label: "Lançamentos", value: String(expenses.length) },
      ],
    },
    {
      id: "receivables",
      title: "Contas a receber",
      description: "Recebimentos previstos e realizados do período",
      columns: ["Vencimento", "Descrição", "Cliente", "Categoria", "Status", "Valor"],
      rows: income.map((entry) => [
        new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR"),
        entry.description,
        entry.party,
        entry.category,
        entry.status,
        money(entry.amount),
      ]),
      highlights: [
        { label: "Total", value: money(incomeTotal) },
        { label: "Recebido", value: money(realizedIncome) },
        { label: "Em aberto", value: money(incomeTotal - realizedIncome) },
        { label: "Lançamentos", value: String(income.length) },
      ],
    },
    {
      id: "taxes",
      title: "Impostos",
      description: "Base, alíquota e valores estimados por cliente",
      columns: ["Cliente", "Faturamento", "Alíquota", "Imposto estimado"],
      rows: taxRows,
      highlights: [
        { label: "Base tributável", value: money(realDre.grossRevenue) },
        { label: "Alíquota", value: percentage(parameters.taxRate) },
        { label: "Impostos estimados", value: money(realDre.taxes) },
        { label: "Clientes tributados", value: String(clients.length) },
      ],
    },
    {
      id: "commissions",
      title: "Comissões e participações",
      description: "Detalhamento calculado por regra e cliente",
      columns: ["Cliente", "Regra", "Valor", "Classificação"],
      rows: commissionRows,
      highlights: [
        { label: "Comissões", value: money(realDre.nonParticipationCommissions) },
        { label: "Participações", value: money(realDre.participations) },
        { label: "Total", value: money(realDre.nonParticipationCommissions + realDre.participations) },
        { label: "Regras ativas", value: String(parameters.commissions.length) },
      ],
    },
    {
      id: "staffing",
      title: "Necessidade de equipe",
      description: "Dimensionamento, escala e custo operacional",
      columns: ["Colaborador", "Função", "Escala", "Horas/mês", "Custo", "Status"],
      rows: team.map((member) => [
        member.name,
        member.role,
        member.shiftPattern,
        member.hours,
        money(member.cost),
        member.active ? "Ativo" : "Inativo",
      ]),
      highlights: [
        { label: "Operacionais ativos", value: String(activeOperationalTeam.length) },
        { label: "Necessários", value: String(capacity.safeStaff) },
        { label: "Déficit", value: String(Math.max(0, capacity.safeStaff - activeOperationalTeam.length)) },
        { label: "Custo mensal", value: money(sum(team.filter((member) => member.active).map((member) => member.cost))) },
      ],
    },
  ];
}
