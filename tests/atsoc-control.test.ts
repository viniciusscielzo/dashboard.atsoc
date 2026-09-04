import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PARAMETERS,
  adjustedClientLoad,
  adjustedClientLoadAt,
  analyzeCapacity,
  calculateCommercialPricing,
  calculateDre,
  calculateTargetStructure,
  calculateScenarioImpact,
  calculateProfitStatement,
  clientCacAmortization,
  commercialReferencePrice,
  commercialRound,
  coverageHours,
  discountDecision,
  equivalentMonthlyHours,
  financialMinimumPrice,
  memberWorksOn,
  mergeAtsocParameters,
  monthlyContractDueDates,
  preserveInstallmentOnContractAdjustment,
  safeClientsPerFte,
  theoreticalClientLoad,
  validateMarginPolicy,
  validateOperationalTimeBands,
  weekSchedule,
  type ClientInput,
  type TeamMember,
} from "../lib/atsoc-control.ts";
import {
  buildReportExcelDocument,
  buildReportPdfDocument,
} from "../lib/report-export.ts";
import type { ReportDataset } from "../lib/atsoc-reports.ts";
import { buildAtsocReports } from "../lib/atsoc-reports.ts";
const p = structuredClone(DEFAULT_PARAMETERS);
test("capacidade teórica e segura", () => {
  assert.equal(theoreticalClientLoad(3000, p), 0.5);
  assert.equal(theoreticalClientLoad(6000, p), 1);
  assert.equal(safeClientsPerFte(p), 4800);
});
test("horários atravessando meia-noite", () => {
  assert.equal(coverageHours("18:00", "00:00"), 6);
  assert.equal(coverageHours("22:00", "02:00"), 4);
});
test("madrugada reduz FTE e horas equivalentes por faixa horária", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  const overnight: ClientInput = {
    id: "overnight",
    name: "Madrugada",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("00:00", "06:00", [0, 1, 2, 3, 4, 5, 6]),
  };
  assert.equal(adjustedClientLoad(overnight, q), 0.25);
  assert.equal(adjustedClientLoadAt(overnight, q, "02:00"), 0.25);
  assert.ok(
    Math.abs(equivalentMonthlyHours(overnight, q) - 6 * 7 * 4.345 * 0.25) < 0.001,
  );
});
test("cotação de madrugada fica abaixo da diurna com o mesmo escopo", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.fixedCosts = [];
  q.commissions = [];
  q.cacManual = 0;
  q.commercialFloor = 0;
  q.taxRate = 0;
  q.roundingStrategy = "none";
  const baseClient = {
    id: "period-price",
    name: "Comparação por horário",
    activeClients: 3000,
    monthlyRevenue: 0,
  };
  const daytime = calculateCommercialPricing(
    { ...baseClient, schedule: weekSchedule("06:00", "12:00", [0, 1, 2, 3, 4, 5, 6]) },
    q,
  );
  const overnight = calculateCommercialPricing(
    { ...baseClient, schedule: weekSchedule("00:00", "06:00", [0, 1, 2, 3, 4, 5, 6]) },
    q,
  );
  assert.ok(overnight.target.exactPrice < daytime.target.exactPrice);
  assert.ok(Math.abs(overnight.operationalCost / daytime.operationalCost - 0.5) < 0.001);
});
test("faixas alteram a capacidade em cada bloco de 30 minutos", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  const client: ClientInput = {
    id: "crossing",
    name: "Noturno e madrugada",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("22:00", "02:00", [0]),
  };
  const result = analyzeCapacity([client], q);
  assert.equal(result.slots.find((slot) => slot.day === 0 && slot.label === "23:30")?.requiredFte, 0.4);
  assert.equal(result.slots.find((slot) => slot.day === 1 && slot.label === "00:30")?.requiredFte, 0.25);
});
test("migração adiciona faixas sem sobrescrever parâmetros existentes", () => {
  const migrated = mergeAtsocParameters({ collaboratorMaxCost: 4100 });
  assert.equal(migrated.collaboratorMaxCost, 4100);
  assert.equal(migrated.operationalTimeBands.length, 3);
  assert.equal(validateOperationalTimeBands(migrated.operationalTimeBands).valid, true);
});
test("sobreposição em blocos de 30 minutos e contratação segura", () => {
  p.availableOperationalFte = 1;
  const clients: ClientInput[] = [
    {
      id: "a",
      name: "A",
      activeClients: 3000,
      monthlyRevenue: 1,
      schedule: weekSchedule("18:00", "00:00", [0]),
    },
    {
      id: "b",
      name: "B",
      activeClients: 3000,
      monthlyRevenue: 1,
      schedule: weekSchedule("22:00", "02:00", [0]),
    },
  ];
  const a = analyzeCapacity(clients, p);
  assert.equal(a.maxFte, 0.8);
  assert.equal(a.safeStaff, 1);
  assert.equal(a.peak.label, "22:00");
  assert.ok(
    a.slots.some(
      (s) =>
        s.day === 1 && s.label === "01:30" && s.activeClientIds.includes("b"),
    ),
  );
});
test("Grupo Silva recebe somente quando o vendedor está identificado", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.commissions = q.commissions.filter((x) => x.id === "grupo-silva");
  q.taxRate = 0;
  const semGrupo = calculateProfitStatement(
    10000,
    3000,
    0,
    1000,
    q,
    false,
    "Maria Souza",
  );
  assert.equal(semGrupo.participations, 0);
  assert.equal(semGrupo.finalProfit, 6000);
  const r = calculateProfitStatement(
    10000,
    3000,
    0,
    1000,
    q,
    false,
    "João - Grupo Silva",
  );
  assert.equal(r.profitBeforeParticipation, 6000);
  assert.equal(r.participations, 600);
  assert.equal(r.finalProfit, 5400);
});
test("CAC só é amortizado quando informado e dentro do payback", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.cacPaybackMonths = 6;
  const client: ClientInput = {
    id: "cac",
    name: "Cliente CAC",
    activeClients: 1000,
    monthlyRevenue: 5000,
    cacManual: 1800,
    contractStart: "2026-01-10",
    schedule: weekSchedule("18:00", "00:00", [0]),
  };
  assert.equal(clientCacAmortization(client, q, "2026-03-10"), 300);
  assert.equal(clientCacAmortization(client, q, "2026-07-10"), 0);
  assert.equal(
    clientCacAmortization({ ...client, cacManual: undefined }, q, "2026-03-10"),
    0,
  );
});
test("DRE real não mistura amortização gerencial de CAC", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.fixedCosts = [];
  q.commissions = [];
  q.operationalPartnersFte = 0;
  q.cacPaybackMonths = 1200;
  const client: ClientInput = {
    id: "dre-cac",
    name: "Cliente",
    activeClients: 1000,
    monthlyRevenue: 5000,
    cacManual: 1200,
    contractStart: "2026-01-01",
    schedule: weekSchedule("18:00", "00:00", [0]),
  };
  assert.equal(calculateDre([client], q, false).cacAmortized, 0);
  assert.equal(calculateDre([client], q, true).cacAmortized, 1);
});
test("arredondamento comercial 90", () => {
  assert.equal(commercialRound(2587, "commercial90"), 2590);
  assert.equal(commercialRound(2948, "commercial90"), 2990);
  assert.equal(commercialRound(2587, "commercial99"), 2599);
  assert.equal(commercialRound(7943.17, "multiple50"), 7950);
  assert.equal(commercialRound(7943.17, "multiple100"), 8000);
  assert.equal(commercialRound(7943.17, "none"), 7943.17);
});
test("desconto bloqueia abaixo do mínimo", () => {
  assert.equal(discountDecision(3000, 0.05, 2800, p).status, "seller");
  assert.equal(discountDecision(3000, 0.07, 2700, p).status, "admin");
  assert.equal(discountDecision(3000, 0.1, 2900, p).status, "blocked");
});
test("preço financeiro atinge margem alvo", () => {
  const client: ClientInput = {
    id: "x",
    name: "X",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("18:00", "00:00", [0, 1, 2, 3, 4]),
  };
  const price = financialMinimumPrice(client, p, 0.25);
  assert.ok(price > 0);
  const op = 6 * 5 * 4.345 * 0.5 * (3300 / 176);
  assert.ok(price > op);
});
test("referência comercial divide o valor mensal de cada dia por sete", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.baseFactors = [{ maxClients: null, factor: 1 }];
  const monday: ClientInput = {
    id: "monday",
    name: "Segunda",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("08:00", "00:00", [0]),
  };
  assert.ok(Math.abs(commercialReferencePrice(monday, q) - 5800 / 7) < 0.001);
});
test("referência comercial de 16h nos sete dias totaliza R$ 5.800", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.baseFactors = [{ maxClients: null, factor: 1 }];
  const fullWeek: ClientInput = {
    id: "week",
    name: "Semana",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("08:00", "00:00", [0, 1, 2, 3, 4, 5, 6]),
  };
  assert.ok(Math.abs(commercialReferencePrice(fullWeek, q) - 5800) < 0.001);
});
test("referência comercial soma horários diferentes individualmente", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.baseFactors = [{ maxClients: null, factor: 1 }];
  const mixed: ClientInput = {
    id: "mixed",
    name: "Misto",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: [...weekSchedule("08:00", "16:00", [0])].map((day) =>
      day.day === 1
        ? { ...day, enabled: true, start: "08:00", end: "00:00" }
        : day,
    ),
  };
  assert.ok(
    Math.abs(commercialReferencePrice(mixed, q) - (2800 + 5800) / 7) < 0.001,
  );
});
test("régua calcula três receitas independentes pelas margens líquidas", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.baseFactors = [{ maxClients: null, factor: 1 }];
  q.commercialFloor = 0;
  q.roundingStrategy = "none";
  const client: ClientInput = {
    id: "pricing",
    name: "Precificação",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("08:00", "00:00", [0, 1, 2, 3, 4, 5, 6]),
  };
  const result = calculateCommercialPricing(client, q);
  assert.ok(Math.abs(result.minimum.exactStatement.margin - 0.15) < 0.000001);
  assert.ok(Math.abs(result.target.exactStatement.margin - 0.25) < 0.000001);
  assert.ok(Math.abs(result.excellent.exactStatement.margin - 0.3) < 0.000001);
  assert.ok(result.minimum.exactPrice < result.target.exactPrice);
  assert.ok(result.target.exactPrice < result.excellent.exactPrice);
});
test("pós-call aplica percentual sobre o preço excelente antes de arredondar", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.commercialFloor = 0;
  q.postCallPolicy = "excellent_plus";
  q.postCallMarkup = 0.05;
  q.roundingStrategy = "commercial90";
  const client: ClientInput = {
    id: "post-call",
    name: "Pós-call",
    activeClients: 3000,
    monthlyRevenue: 0,
    schedule: weekSchedule("18:00", "00:00", [0, 1, 2, 3, 4]),
  };
  const result = calculateCommercialPricing(client, q);
  assert.ok(
    Math.abs(result.postCall.exactPrice - result.excellent.exactPrice * 1.05) <
      0.001,
  );
  assert.equal(
    result.postCall.displayPrice,
    commercialRound(result.postCall.exactPrice, q.roundingStrategy),
  );
});
test("política rejeita margens fora da ordem mínima, alvo e excelente", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  assert.equal(validateMarginPolicy(q).valid, true);
  q.targetCommercialMargin = q.minimumCommercialMargin;
  assert.equal(validateMarginPolicy(q).valid, false);
});
test("escalas operacionais calculam trabalho e folga pelo ciclo", () => {
  const base: TeamMember = {
    id: "agent",
    name: "Agente",
    role: "Atendente",
    kind: "collaborator",
    cost: 3300,
    hours: 176,
    active: true,
    operational: true,
    shiftPattern: "4x2",
    shiftStart: "08:00",
    shiftEnd: "18:00",
    cycleStart: "2026-08-01",
  };
  assert.equal(memberWorksOn(base, "2026-08-04"), true);
  assert.equal(memberWorksOn(base, "2026-08-05"), false);
  assert.equal(memberWorksOn(base, "2026-08-07"), true);
  assert.equal(
    memberWorksOn({ ...base, shiftPattern: "12x36" }, "2026-08-02"),
    false,
  );
  assert.equal(memberWorksOn({ ...base, active: false }, "2026-08-01"), false);
});
test("contratação em cenário entra como custo e nunca como receita", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.availableOperationalFte = 1;
  const result = calculateScenarioImpact(
    [],
    { kind: "new_hire", value: 3300, quantity: 2 },
    q,
  );
  assert.equal(result.revenueImpact, 0);
  assert.equal(result.staffCostImpact, 6600);
  assert.equal(result.profitImpact, -6600);
  assert.equal(result.futureStaff, 3);
});
test("aumento de preço altera receita e lucro sem criar capacidade", () => {
  const q = structuredClone(DEFAULT_PARAMETERS);
  q.taxRate = 0;
  q.commissions = [];
  q.operationalPartnersFte = 0;
  const client: ClientInput = {
    id: "client",
    name: "Cliente",
    activeClients: 3000,
    monthlyRevenue: 10000,
    schedule: weekSchedule("18:00", "00:00", [0, 1, 2, 3, 4]),
  };
  const result = calculateScenarioImpact(
    [client],
    { kind: "price_increase", value: 10 },
    q,
  );
  assert.equal(result.revenueImpact, 1000);
  assert.equal(result.profitImpact, 1000);
  assert.equal(result.futureLoad, result.currentLoad);
});
test("upgrade preserva parcelas anteriores e recebidas", () => {
  assert.deepEqual(monthlyContractDueDates("2026-08-30", 10, 3), [
    "2026-09-10",
    "2026-10-10",
    "2026-11-10",
  ]);
  assert.equal(
    preserveInstallmentOnContractAdjustment(
      "2026-09-10",
      "2026-09-15",
      "Previsto",
    ),
    true,
  );
  assert.equal(
    preserveInstallmentOnContractAdjustment(
      "2026-10-10",
      "2026-09-15",
      "Previsto",
    ),
    false,
  );
  assert.equal(
    preserveInstallmentOnContractAdjustment(
      "2026-10-10",
      "2026-09-15",
      "Recebido",
    ),
    true,
  );
});
test("exportações de relatório geram documentos PDF e Excel válidos", () => {
  const report: ReportDataset = {
    id: "test",
    title: "Fluxo de Caixa",
    description: "Teste",
    columns: ["Data", "Valor"],
    rows: [["30/08/2026", "R$ 1.000"]],
    highlights: [{ label: "Total", value: "R$ 1.000" }],
  };
  const pdf = buildReportPdfDocument(report, "2026-08");
  const excel = buildReportExcelDocument(report, "2026-08");
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.match(pdf, /xref/);
  assert.match(excel, /<table>/);
  assert.match(excel, /Fluxo de Caixa/);
});
test("relatório de fluxo respeita o mês selecionado", () => {
  const reports = buildAtsocReports({
    month: "2026-08",
    initialBalance: 100,
    entries: [
      {
        id: "august",
        date: "2026-08-30",
        description: "Mensalidade",
        party: "Cliente",
        category: "Receita",
        amount: 500,
        type: "income",
        status: "Recebido",
      },
      {
        id: "september",
        date: "2026-09-01",
        description: "Fora do período",
        party: "Cliente",
        category: "Receita",
        amount: 900,
        type: "income",
        status: "Previsto",
      },
    ],
    clients: [],
    team: [],
    parameters: structuredClone(DEFAULT_PARAMETERS),
  });
  const cashflow = reports.find((report) => report.id === "cashflow");
  assert.equal(cashflow?.rows.length, 1);
  assert.equal(cashflow?.highlights.at(-1)?.value, "R$ 600,00");
});

test("DRE atual não inclui custo operacional teórico do contrato", () => {
  const parameters = structuredClone(DEFAULT_PARAMETERS);
  parameters.fixedCosts = [];
  parameters.taxRate = 0;
  parameters.commissions = [];
  const clients: ClientInput[] = [{
    id: "cliente",
    name: "Cliente",
    activeClients: 3000,
    monthlyRevenue: 5800,
    schedule: weekSchedule("08:00", "00:00", [0, 1, 2, 3, 4]),
  }];
  const current = calculateDre(clients, parameters, false);
  const managerial = calculateDre(clients, parameters, true);
  assert.equal(current.operationalCost, 0);
  assert.equal(current.finalProfit, 5800);
  assert.ok(managerial.operationalCost > 0);
});

test("estrutura-alvo soma complemento dos três sócios e contratação operacional", () => {
  const parameters = structuredClone(DEFAULT_PARAMETERS);
  parameters.fixedCosts = [{ id: "carlos", name: "Pró-labore Carlos", amount: 800, allocation: "equal" }];
  parameters.taxRate = 0;
  parameters.commissions = [];
  parameters.availableOperationalFte = 1;
  const clients: ClientInput[] = [{
    id: "cliente",
    name: "Cliente",
    activeClients: 2500,
    monthlyRevenue: 5800,
    schedule: weekSchedule("08:00", "00:00", [0, 1, 2, 3, 4, 5, 6]),
  }];
  const result = calculateTargetStructure(clients, parameters, []);
  assert.equal(result.current.finalProfit, 5000);
  assert.equal(result.currentPartnerPay, 800);
  assert.equal(result.targetPartnerPay, 16500);
  assert.equal(result.partnerAdjustment, 15700);
  assert.equal(result.additionalOperationalStaff, 1);
  assert.equal(result.operationalStaffCost, 3300);
  assert.equal(result.targetResult, -14000);
  assert.ok(result.requiredMrr > result.current.grossRevenue);
});
