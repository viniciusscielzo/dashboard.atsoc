export type DaySchedule = {
  day: number;
  start: string;
  end: string;
  enabled: boolean;
};
export function monthlyContractDueDates(
  startIso: string,
  billingDay: number,
  count = 12,
) {
  const start = new Date(`${startIso}T12:00:00`);
  const safeBillingDay = Math.min(28, Math.max(1, billingDay));
  let year = start.getFullYear();
  let month = start.getMonth();
  const dueDate = (targetYear: number, targetMonth: number) => {
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(
      Math.min(safeBillingDay, lastDay),
    ).padStart(2, "0")}`;
  };
  if (dueDate(year, month) < startIso) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const target = new Date(year, month + index, 1);
    return dueDate(target.getFullYear(), target.getMonth());
  });
}
export function preserveInstallmentOnContractAdjustment(
  installmentDate: string,
  effectiveDate: string,
  status: string,
) {
  return status === "Recebido" || installmentDate < effectiveDate;
}
export type ShiftPattern = "4x2" | "6x1" | "5x2" | "12x36" | "2x2";
export type TeamScheduleMode = "cycle" | "weekly";
export type TeamDayStatus =
  | "work"
  | "day_off"
  | "absence"
  | "medical_leave"
  | "vacation";
export type TeamWeeklyShift = {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
};
export type TeamScheduleOverride = {
  id: string;
  date: string;
  status: TeamDayStatus;
  start: string;
  end: string;
  reason: string;
  medicalCertificate: boolean;
  extraShift: boolean;
};
export type TeamWeekendRotation = {
  enabled: boolean;
  anchorDate: string;
  firstWeekendDay: 0 | 6;
  saturdayStart: string;
  saturdayEnd: string;
  sundayStart: string;
  sundayEnd: string;
};
export type TeamMember = {
  id: string;
  name: string;
  role: string;
  kind: "partner" | "collaborator";
  cost: number;
  hours: number;
  active: boolean;
  operational: boolean;
  shiftPattern: ShiftPattern;
  shiftStart: string;
  shiftEnd: string;
  cycleStart: string;
  scheduleMode?: TeamScheduleMode;
  weeklySchedule?: TeamWeeklyShift[];
  scheduleOverrides?: TeamScheduleOverride[];
  weekendRotation?: TeamWeekendRotation;
};
export const SHIFT_CYCLES: Record<
  ShiftPattern,
  { work: number; cycle: number }
> = {
  "4x2": { work: 4, cycle: 6 },
  "6x1": { work: 6, cycle: 7 },
  "5x2": { work: 5, cycle: 7 },
  "12x36": { work: 1, cycle: 2 },
  "2x2": { work: 2, cycle: 4 },
};
export function defaultTeamWeeklySchedule(start = "08:00", end = "18:00") {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    start,
    end,
  }));
}
export function teamScheduleForDate(member: TeamMember, date: string) {
  const occurrence = member.scheduleOverrides?.find(
    (item) => item.date === date,
  );
  if (!member.active) {
    return {
      works: false,
      status: "inactive" as const,
      start: member.shiftStart,
      end: member.shiftEnd,
      reason: "Pessoa inativa",
      medicalCertificate: false,
      extraShift: false,
      source: "cycle" as const,
    };
  }
  if (!member.operational) {
    return {
      works: false,
      status: "non_operational" as const,
      start: member.shiftStart,
      end: member.shiftEnd,
      reason: "Não atua na operação",
      medicalCertificate: false,
      extraShift: false,
      source: "cycle" as const,
    };
  }
  if (occurrence) {
    return {
      works: occurrence.status === "work",
      status: occurrence.status,
      start: occurrence.start || member.shiftStart,
      end: occurrence.end || member.shiftEnd,
      reason: occurrence.reason,
      medicalCertificate: occurrence.medicalCertificate,
      extraShift: occurrence.extraShift,
      source: "override" as const,
    };
  }
  const targetDay = new Date(`${date}T12:00:00`).getDay();
  if (
    member.weekendRotation?.enabled &&
    member.weekendRotation.anchorDate &&
    (targetDay === 0 || targetDay === 6)
  ) {
    const anchor = new Date(`${member.weekendRotation.anchorDate}T12:00:00`);
    const target = new Date(`${date}T12:00:00`);
    const elapsedWeeks = Math.floor(
      (target.getTime() - anchor.getTime()) / (7 * 86_400_000),
    );
    const normalizedWeek = ((elapsedWeeks % 2) + 2) % 2;
    const scheduledDay =
      normalizedWeek === 0
        ? member.weekendRotation.firstWeekendDay
        : member.weekendRotation.firstWeekendDay === 6
          ? 0
          : 6;
    const works = targetDay === scheduledDay;
    return {
      works,
      status: works ? ("work" as const) : ("day_off" as const),
      start:
        targetDay === 6
          ? member.weekendRotation.saturdayStart
          : member.weekendRotation.sundayStart,
      end:
        targetDay === 6
          ? member.weekendRotation.saturdayEnd
          : member.weekendRotation.sundayEnd,
      reason: works
        ? "Revezamento quinzenal de fim de semana"
        : "Folga do revezamento de fim de semana",
      medicalCertificate: false,
      extraShift: false,
      source: "rotation" as const,
    };
  }
  if (member.scheduleMode === "weekly") {
    const shift = (member.weeklySchedule?.length
      ? member.weeklySchedule
      : defaultTeamWeeklySchedule(member.shiftStart, member.shiftEnd)
    ).find((item) => item.day === targetDay);
    return {
      works: Boolean(shift?.enabled),
      status: shift?.enabled ? ("work" as const) : ("day_off" as const),
      start: shift?.start || member.shiftStart,
      end: shift?.end || member.shiftEnd,
      reason: shift?.enabled ? "Escala semanal" : "Folga da escala semanal",
      medicalCertificate: false,
      extraShift: false,
      source: "weekly" as const,
    };
  }
  if (!member.cycleStart) {
    return {
      works: false,
      status: "day_off" as const,
      start: member.shiftStart,
      end: member.shiftEnd,
      reason: "Escala sem data inicial",
      medicalCertificate: false,
      extraShift: false,
      source: "cycle" as const,
    };
  }
  const rule = SHIFT_CYCLES[member.shiftPattern];
  const elapsed = Math.floor(
    (new Date(`${date}T12:00:00`).getTime() -
      new Date(`${member.cycleStart}T12:00:00`).getTime()) /
      86_400_000,
  );
  const cycleDay = ((elapsed % rule.cycle) + rule.cycle) % rule.cycle;
  const works = cycleDay < rule.work;
  return {
    works,
    status: works ? ("work" as const) : ("day_off" as const),
    start: member.shiftStart,
    end: member.shiftEnd,
    reason: works ? `Escala ${member.shiftPattern}` : `Folga da escala ${member.shiftPattern}`,
    medicalCertificate: false,
    extraShift: false,
    source: "cycle" as const,
  };
}
export function memberWorksOn(member: TeamMember, date: string) {
  return teamScheduleForDate(member, date).works;
}
export type ClientInput = {
  id: string;
  name: string;
  activeClients: number;
  monthlyRevenue: number;
  intensityFactor?: number;
  schedule: DaySchedule[];
  monthlyCalls?: number;
  commissionRuleIds?: string[];
  cacManual?: number;
  contractStart?: string;
  seller?: string;
};
export type AllocationMethod = "equal" | "revenue" | "load" | "none";
export type FixedCost = {
  id: string;
  name: string;
  amount: number;
  allocation: AllocationMethod;
  commercial?: boolean;
  dueDay?: number;
  startDate?: string;
  endDate?: string;
  party?: string;
  category?: string;
};
export type CommissionBase =
  | "gross_revenue"
  | "net_revenue"
  | "first_month"
  | "recurring_revenue"
  | "contribution_margin"
  | "operating_profit"
  | "profit_before_participation";
export type CommissionRule = {
  id: string;
  name: string;
  kind: "percent" | "fixed";
  value: number;
  base: CommissionBase;
  recurrence: "once" | "recurring";
  start?: string;
  end?: string;
  active: boolean;
};
export type ReferenceBand = {
  fromHour: number;
  toHour: number;
  valuePerHourMonth: number;
};
export type BaseFactor = {
  maxClients: number | null;
  factor: number;
  label: string;
};
export type OperationalTimeBand = {
  id: string;
  label: string;
  start: string;
  end: string;
  factor: number;
};
export type RoundingStrategy =
  | "commercial90"
  | "commercial99"
  | "multiple50"
  | "multiple100"
  | "none"
  | "up10"
  | "nearest10";
export type PostCallPolicy =
  | "excellent"
  | "excellent_plus"
  | "target"
  | "custom";
export type AtsocParameters = {
  theoreticalClientsPerFte: number;
  safeUtilization: number;
  availableOperationalFte: number;
  collaboratorBaseCost: number;
  collaboratorMaxCost: number;
  pricingUsesMaxCost: boolean;
  productiveHoursMonth: number;
  weeksPerMonth: number;
  defaultIntensityFactor: number;
  operationalTimeBands: OperationalTimeBand[];
  partnerEquivalentMonthlyCost: number;
  partnerProductiveHoursMonth: number;
  operationalPartnersFte: number;
  taxRate: number;
  taxBase: "revenue";
  fixedCosts: FixedCost[];
  cacManual: number;
  commercialCostsPeriod: number;
  newClientsPeriod: number;
  cacAverage: number;
  cacPaybackMonths: number;
  commissions: CommissionRule[];
  referenceBands: ReferenceBand[];
  baseFactors: BaseFactor[];
  commercialFloor: number;
  commercialAdditionalMargin: number;
  roundingStrategy: RoundingStrategy;
  sellerMaxDiscount: number;
  minimumFinancialMargin: number;
  minimumCommercialMargin: number;
  targetCommercialMargin: number;
  excellentCommercialMargin: number;
  postCallPolicyEnabled: boolean;
  postCallPolicy: PostCallPolicy;
  postCallMarkup: number;
  postCallCustomPrice: number;
  activeContractsForPricingAllocation: number;
  fieldHelpEnabled: boolean;
  partnerTargets: PartnerTarget[];
  targetPartnersLeaveOperations: boolean;
};

export type PartnerTarget = {
  id: string;
  name: string;
  currentMonthlyPay: number;
  targetMonthlyPay: number;
  currentRole: string;
  targetRole: string;
  includeInTarget: boolean;
};

export const DEFAULT_PARAMETERS: AtsocParameters = {
  theoreticalClientsPerFte: 6000,
  safeUtilization: 0.8,
  availableOperationalFte: 6,
  collaboratorBaseCost: 2500,
  collaboratorMaxCost: 3300,
  pricingUsesMaxCost: true,
  productiveHoursMonth: 176,
  weeksPerMonth: 4.345,
  defaultIntensityFactor: 1,
  operationalTimeBands: [
    { id: "day", label: "Diurno", start: "06:00", end: "18:00", factor: 1 },
    { id: "evening", label: "Noturno", start: "18:00", end: "00:00", factor: 0.8 },
    { id: "overnight", label: "Madrugada", start: "00:00", end: "06:00", factor: 0.5 },
  ],
  partnerEquivalentMonthlyCost: 5500,
  partnerProductiveHoursMonth: 176,
  operationalPartnersFte: 1,
  taxRate: 0.06,
  taxBase: "revenue",
  fixedCosts: [
    {
      id: "aluguel",
      name: "Aluguel",
      amount: 1200,
      allocation: "equal",
      dueDay: 12,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Aluguel",
      category: "Estrutura",
    },
    {
      id: "contabilidade",
      name: "Contabilidade",
      amount: 150,
      allocation: "equal",
      dueDay: 10,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Contabilidade",
      category: "Administrativo",
    },
    {
      id: "materiais-escritorio",
      name: "Materiais de escritório",
      amount: 317,
      allocation: "equal",
      dueDay: 17,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Materiais de escritório",
      category: "Administrativo",
    },
    {
      id: "internet",
      name: "Internet",
      amount: 150,
      allocation: "equal",
      dueDay: 20,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Vivo",
      category: "Estrutura",
    },
    {
      id: "energia",
      name: "Energia",
      amount: 75,
      allocation: "equal",
      dueDay: 22,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Energia",
      category: "Estrutura",
    },
    {
      id: "notebook",
      name: "Notebook",
      amount: 191,
      allocation: "equal",
      dueDay: 24,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Vitor",
      category: "Equipamentos",
    },
    {
      id: "grupo-silva-consultoria",
      name: "Operação comercial — Grupo Silva",
      amount: 1000,
      allocation: "revenue",
      commercial: true,
      dueDay: 6,
      startDate: "2026-08-30",
      endDate: "2027-02-06",
      party: "Grupo Silva",
      category: "Consultoria comercial",
    },
    {
      id: "colaborador-comercial",
      name: "Colaborador comercial PJ",
      amount: 1800,
      allocation: "revenue",
      commercial: true,
      dueDay: 21,
      startDate: "2026-08-30",
      endDate: "2027-02-28",
      party: "Colaborador comercial",
      category: "Equipe comercial",
    },
    {
      id: "prolabore-carlos",
      name: "Pró-labore Carlos",
      amount: 800,
      allocation: "equal",
      dueDay: 15,
      startDate: "2026-08-30",
      endDate: "2027-08-30",
      party: "Carlos",
      category: "Pró-labore",
    },
  ],
  cacManual: 1800,
  commercialCostsPeriod: 4500,
  newClientsPeriod: 3,
  cacAverage: 1650,
  cacPaybackMonths: 6,
  commissions: [
    {
      id: "seller",
      name: "Vendedor interno",
      kind: "percent",
      value: 0.05,
      base: "first_month",
      recurrence: "once",
      active: true,
    },
    {
      id: "grupo-silva",
      name: "Grupo Silva",
      kind: "percent",
      value: 0.1,
      base: "profit_before_participation",
      recurrence: "recurring",
      active: true,
    },
  ],
  referenceBands: [
    { fromHour: 1, toHour: 8, valuePerHourMonth: 350 },
    { fromHour: 9, toHour: 16, valuePerHourMonth: 375 },
    { fromHour: 17, toHour: 24, valuePerHourMonth: 425 },
  ],
  baseFactors: [
    { maxClients: 3000, factor: 1, label: "Até 3 mil" },
    { maxClients: 6000, factor: 1.08, label: "3 a 6 mil" },
    { maxClients: 10000, factor: 1.18, label: "6 a 10 mil" },
    { maxClients: null, factor: 1.3, label: "Acima de 10 mil" },
  ],
  commercialFloor: 1990,
  commercialAdditionalMargin: 0.08,
  roundingStrategy: "commercial90",
  sellerMaxDiscount: 0.05,
  minimumFinancialMargin: 0.25,
  minimumCommercialMargin: 0.15,
  targetCommercialMargin: 0.25,
  excellentCommercialMargin: 0.3,
  postCallPolicyEnabled: true,
  postCallPolicy: "excellent_plus",
  postCallMarkup: 0.05,
  postCallCustomPrice: 0,
  activeContractsForPricingAllocation: 5,
  fieldHelpEnabled: true,
  partnerTargets: [
    {
      id: "vinicius",
      name: "Vinicius",
      currentMonthlyPay: 0,
      targetMonthlyPay: 5500,
      currentRole: "Operação e gestão",
      targetRole: "Gestão",
      includeInTarget: true,
    },
    {
      id: "carlos",
      name: "Carlos",
      currentMonthlyPay: 800,
      targetMonthlyPay: 5500,
      currentRole: "Operação e gestão",
      targetRole: "Gestão",
      includeInTarget: true,
    },
    {
      id: "gabriel",
      name: "Gabriel",
      currentMonthlyPay: 0,
      targetMonthlyPay: 5500,
      currentRole: "Operação e gestão",
      targetRole: "Gestão",
      includeInTarget: true,
    },
  ],
  targetPartnersLeaveOperations: true,
};

export function mergeAtsocParameters(saved?: Partial<AtsocParameters> | null) {
  return {
    ...DEFAULT_PARAMETERS,
    ...(saved || {}),
    operationalTimeBands: saved?.operationalTimeBands?.length
      ? saved.operationalTimeBands
      : DEFAULT_PARAMETERS.operationalTimeBands,
  } satisfies AtsocParameters;
}

export function isGrupoSilvaSeller(seller?: string) {
  return /\s-\sgrupo silva$/i.test((seller || "").trim());
}

export const SAMPLE_CLIENTS: ClientInput[] = [
  {
    id: "velox",
    name: "Velox Fibra",
    activeClients: 8420,
    monthlyRevenue: 8500,
    intensityFactor: 1.08,
    schedule: weekSchedule("08:00", "00:00", [0, 1, 2, 3, 4]),
  },
  {
    id: "nova",
    name: "NovaLink",
    activeClients: 6850,
    monthlyRevenue: 7200,
    intensityFactor: 1,
    schedule: weekSchedule("18:00", "00:00", [0, 1, 2, 3, 4, 5, 6]),
  },
  {
    id: "conecta",
    name: "ConectaNet",
    activeClients: 5100,
    monthlyRevenue: 6500,
    intensityFactor: 1.12,
    schedule: weekSchedule("12:00", "22:00", [0, 1, 2, 3, 4, 5]),
  },
  {
    id: "webmais",
    name: "WebMais",
    activeClients: 3920,
    monthlyRevenue: 5400,
    intensityFactor: 0.95,
    schedule: weekSchedule("00:00", "08:00", [0, 1, 2, 3, 4, 5, 6]),
  },
  {
    id: "linkpro",
    name: "LinkPro",
    activeClients: 2700,
    monthlyRevenue: 4250,
    intensityFactor: 1,
    schedule: weekSchedule("14:00", "23:00", [0, 1, 2, 3, 4]),
  },
];

export function weekSchedule(
  start: string,
  end: string,
  days: number[],
): DaySchedule[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day,
    start,
    end,
    enabled: days.includes(day),
  }));
}
export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function coverageMinutes(start: string, end: string) {
  const s = timeToMinutes(start),
    e = timeToMinutes(end);
  return e > s ? e - s : e + 1440 - s;
}
export function coverageHours(start: string, end: string) {
  return coverageMinutes(start, end) / 60;
}
export function weeklyCoverageHours(schedule: DaySchedule[]) {
  return schedule.reduce(
    (sum, d) => sum + (d.enabled ? coverageHours(d.start, d.end) : 0),
    0,
  );
}
export function theoreticalClientLoad(
  activeClients: number,
  p: AtsocParameters,
) {
  return activeClients / p.theoreticalClientsPerFte;
}
function baseAdjustedClientLoad(client: ClientInput, p: AtsocParameters) {
  return theoreticalClientLoad(client.activeClients, p) *
    (client.intensityFactor ?? p.defaultIntensityFactor);
}
function minuteIsInsideBand(minute: number, start: number, end: number) {
  if (start === end) return true;
  return end > start
    ? minute >= start && minute < end
    : minute >= start || minute < end;
}
export function operationalTimeFactorAt(
  time: string | number,
  p: AtsocParameters,
) {
  const minute = typeof time === "number" ? ((time % 1440) + 1440) % 1440 : timeToMinutes(time);
  const bands = p.operationalTimeBands?.length
    ? p.operationalTimeBands
    : DEFAULT_PARAMETERS.operationalTimeBands;
  const match = bands.find((band) =>
    minuteIsInsideBand(minute, timeToMinutes(band.start), timeToMinutes(band.end)),
  );
  return Math.max(0.01, Number(match?.factor) || 1);
}
export function validateOperationalTimeBands(bands: OperationalTimeBand[]) {
  if (!bands?.length)
    return { valid: false, message: "Cadastre ao menos uma faixa horária." };
  if (bands.some((band) => !band.start || !band.end || !(Number(band.factor) > 0)))
    return { valid: false, message: "Todos os horários e fatores devem ser válidos e maiores que zero." };
  const invalidSlot = Array.from({ length: 48 }, (_, slot) => slot * 30).find((minute) =>
    bands.filter((band) =>
      minuteIsInsideBand(minute, timeToMinutes(band.start), timeToMinutes(band.end)),
    ).length !== 1,
  );
  return invalidSlot === undefined
    ? { valid: true, message: "Faixas horárias válidas" }
    : {
        valid: false,
        message: `As faixas devem cobrir as 24 horas sem lacunas ou sobreposição. Revise ${String(Math.floor(invalidSlot / 60)).padStart(2, "0")}:${invalidSlot % 60 ? "30" : "00"}.`,
      };
}
export function adjustedClientLoadAt(
  client: ClientInput,
  p: AtsocParameters,
  time: string | number,
) {
  return baseAdjustedClientLoad(client, p) * operationalTimeFactorAt(time, p);
}
export function adjustedClientLoad(client: ClientInput, p: AtsocParameters) {
  let peakFactor = 0;
  for (const day of client.schedule) {
    if (!day.enabled) continue;
    const start = timeToMinutes(day.start);
    const minutes = coverageMinutes(day.start, day.end);
    for (let offset = 0; offset < minutes; offset += 30)
      peakFactor = Math.max(peakFactor, operationalTimeFactorAt(start + offset, p));
  }
  return baseAdjustedClientLoad(client, p) * (peakFactor || 1);
}
export function safeClientsPerFte(p: AtsocParameters) {
  return p.theoreticalClientsPerFte * p.safeUtilization;
}
export function employeeHourlyCost(p: AtsocParameters) {
  return (
    (p.pricingUsesMaxCost ? p.collaboratorMaxCost : p.collaboratorBaseCost) /
    p.productiveHoursMonth
  );
}
export function partnerHourlyCost(p: AtsocParameters) {
  return p.partnerEquivalentMonthlyCost / p.partnerProductiveHoursMonth;
}
export function equivalentMonthlyHours(
  client: ClientInput,
  p: AtsocParameters,
) {
  const baseLoad = baseAdjustedClientLoad(client, p);
  const weightedWeeklyHours = client.schedule.reduce((total, day) => {
    if (!day.enabled) return total;
    const start = timeToMinutes(day.start);
    const minutes = coverageMinutes(day.start, day.end);
    let weighted = 0;
    for (let offset = 0; offset < minutes; offset += 30)
      weighted += 0.5 * operationalTimeFactorAt(start + offset, p);
    return total + weighted;
  }, 0);
  return weightedWeeklyHours * p.weeksPerMonth * baseLoad;
}
export function clientOperationalCost(client: ClientInput, p: AtsocParameters) {
  return equivalentMonthlyHours(client, p) * employeeHourlyCost(p);
}

export type CapacitySlot = {
  day: number;
  slot: number;
  label: string;
  requiredFte: number;
  availableFte: number;
  utilization: number;
  safeUtilization: number;
  activeClientIds: string[];
};
export type CapacityAnalysis = {
  slots: CapacitySlot[];
  peak: CapacitySlot;
  maxFte: number;
  theoreticalStaff: number;
  safeStaff: number;
  safeClientsPerFte: number;
};
function activeSlotsForSchedule(schedule: DaySchedule[]) {
  const set = new Set<number>();
  for (const d of schedule) {
    if (!d.enabled) continue;
    const start = timeToMinutes(d.start),
      minutes = coverageMinutes(d.start, d.end);
    for (let offset = 0; offset < minutes; offset += 30) {
      const absolute = d.day * 48 + Math.floor((start + offset) / 30);
      set.add(((absolute % (7 * 48)) + 7 * 48) % (7 * 48));
    }
  }
  return set;
}
export function analyzeCapacity(
  clients: ClientInput[],
  p: AtsocParameters,
  availableFte = p.availableOperationalFte,
): CapacityAnalysis {
  const maps = clients.map((c) => ({
    c,
    slots: activeSlotsForSchedule(c.schedule),
  }));
  const slots = Array.from({ length: 336 }, (_, index) => {
    const day = Math.floor(index / 48),
      slot = index % 48,
      active = maps.filter((m) => m.slots.has(index));
    const requiredFte = active.reduce(
      (s, m) => s + adjustedClientLoadAt(m.c, p, slot * 30),
      0,
    );
    return {
      day,
      slot,
      label: `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`,
      requiredFte,
      availableFte,
      utilization: availableFte ? requiredFte / availableFte : 0,
      safeUtilization: availableFte
        ? requiredFte / (availableFte * p.safeUtilization)
        : 0,
      activeClientIds: active.map((a) => a.c.id),
    };
  });
  const peak = slots.reduce(
    (a, b) => (b.requiredFte > a.requiredFte ? b : a),
    slots[0],
  );
  const maxFte = peak.requiredFte;
  return {
    slots,
    peak,
    maxFte,
    theoreticalStaff: Math.ceil(maxFte),
    safeStaff: Math.ceil(maxFte / p.safeUtilization),
    safeClientsPerFte: safeClientsPerFte(p),
  };
}

export function calculateAutomaticCac(p: AtsocParameters) {
  return p.newClientsPeriod > 0
    ? p.commercialCostsPeriod / p.newClientsPeriod
    : 0;
}
export function configuredPricingCac(p: AtsocParameters, manual?: number) {
  return manual ?? p.cacManual ?? calculateAutomaticCac(p);
}
export function monthlyCacCost(p: AtsocParameters, manual?: number) {
  return configuredPricingCac(p, manual) / Math.max(1, p.cacPaybackMonths);
}

export function clientCacAmortization(
  client: ClientInput,
  p: AtsocParameters,
  referenceDate = new Date().toISOString().slice(0, 10),
) {
  const cac = Number(client.cacManual) || 0;
  if (cac <= 0 || !client.contractStart || p.cacPaybackMonths <= 0) return 0;
  const start = new Date(`${client.contractStart}T12:00:00`);
  const reference = new Date(`${referenceDate}T12:00:00`);
  if (reference < start) return 0;
  const elapsedMonths =
    (reference.getFullYear() - start.getFullYear()) * 12 +
    reference.getMonth() -
    start.getMonth();
  return elapsedMonths < p.cacPaybackMonths ? cac / p.cacPaybackMonths : 0;
}

export function allocateFixedCosts(
  client: ClientInput,
  allClients: ClientInput[],
  p: AtsocParameters,
) {
  const totalRevenue = allClients.reduce((s, c) => s + c.monthlyRevenue, 0),
    totalLoad = allClients.reduce((s, c) => s + adjustedClientLoad(c, p), 0);
  return p.fixedCosts.reduce((sum, cost) => {
    if (cost.allocation === "none") return sum;
    if (cost.allocation === "equal")
      return sum + cost.amount / Math.max(1, allClients.length);
    if (cost.allocation === "revenue")
      return (
        sum + cost.amount * (client.monthlyRevenue / Math.max(1, totalRevenue))
      );
    return (
      sum +
      cost.amount *
        (adjustedClientLoad(client, p) / Math.max(0.0001, totalLoad))
    );
  }, 0);
}

export type ProfitStatement = {
  grossRevenue: number;
  taxes: number;
  nonParticipationCommissions: number;
  netRevenue: number;
  operationalCost: number;
  cacAmortized: number;
  fixedAllocation: number;
  contributionMargin: number;
  operatingProfit: number;
  profitBeforeParticipation: number;
  participations: number;
  finalProfit: number;
  margin: number;
  commissionDetails: { name: string; amount: number }[];
};
function ruleAmount(
  rule: CommissionRule,
  bases: Record<CommissionBase, number>,
) {
  const base = Math.max(0, bases[rule.base] ?? 0);
  return rule.kind === "fixed" ? rule.value : base * rule.value;
}
export function calculateProfitStatement(
  revenue: number,
  operationalCost: number,
  cacAmortized: number,
  fixedAllocation: number,
  p: AtsocParameters,
  isFirstMonth = true,
  seller?: string,
): ProfitStatement {
  const taxes = p.taxBase === "revenue" ? revenue * p.taxRate : 0;
  let commissionTotal = 0;
  const details: { name: string; amount: number }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const effective = (r: CommissionRule) =>
    r.active &&
    (!r.start || r.start <= today) &&
    (!r.end || r.end >= today) &&
    !(r.recurrence === "once" && !isFirstMonth) &&
    !(
      (r.id === "grupo-silva" || r.name.trim().toLowerCase() === "grupo silva") &&
      !isGrupoSilvaSeller(seller)
    );
  const ordinary = p.commissions.filter(
    (r) =>
      effective(r) &&
      r.base !== "profit_before_participation" &&
      !(r.base === "first_month" && !isFirstMonth),
  );
  for (const rule of ordinary) {
    const net = revenue - taxes - commissionTotal,
      contribution = net - operationalCost - cacAmortized - fixedAllocation;
    const bases: Record<CommissionBase, number> = {
      gross_revenue: revenue,
      net_revenue: net,
      first_month: isFirstMonth ? revenue : 0,
      recurring_revenue: revenue,
      contribution_margin: contribution,
      operating_profit: contribution,
      profit_before_participation: contribution,
    };
    const amount = ruleAmount(rule, bases);
    commissionTotal += amount;
    details.push({ name: rule.name, amount });
  }
  const netRevenue = revenue - taxes - commissionTotal,
    contributionMargin =
      netRevenue - operationalCost - cacAmortized - fixedAllocation,
    operatingProfit = contributionMargin,
    profitBeforeParticipation = operatingProfit;
  let participations = 0;
  for (const rule of p.commissions.filter(
    (r) => effective(r) && r.base === "profit_before_participation",
  )) {
    const amount = ruleAmount(rule, {
      gross_revenue: revenue,
      net_revenue: netRevenue,
      first_month: isFirstMonth ? revenue : 0,
      recurring_revenue: revenue,
      contribution_margin: contributionMargin,
      operating_profit: operatingProfit,
      profit_before_participation: profitBeforeParticipation,
    });
    participations += amount;
    details.push({ name: rule.name, amount });
  }
  const finalProfit = profitBeforeParticipation - participations;
  return {
    grossRevenue: revenue,
    taxes,
    nonParticipationCommissions: commissionTotal,
    netRevenue,
    operationalCost,
    cacAmortized,
    fixedAllocation,
    contributionMargin,
    operatingProfit,
    profitBeforeParticipation,
    participations,
    finalProfit,
    margin: revenue ? finalProfit / revenue : 0,
    commissionDetails: details,
  };
}

export function fixedAllocationForQuote(p: AtsocParameters) {
  return (
    p.fixedCosts
      .filter((x) => x.allocation !== "none")
      .reduce((s, x) => s + x.amount, 0) /
    Math.max(1, p.activeContractsForPricingAllocation)
  );
}
export function financialMinimumPrice(
  client: ClientInput,
  p: AtsocParameters,
  targetMargin = p.minimumFinancialMargin,
) {
  const op = clientOperationalCost(client, p),
    cac = monthlyCacCost(p, client.cacManual),
    fixed = fixedAllocationForQuote(p);
  let low = 0,
    high = 100000;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2,
      st = calculateProfitStatement(mid, op, cac, fixed, p, true, client.seller);
    if (st.margin >= targetMargin) high = mid;
    else low = mid;
  }
  return high;
}
function bandValue(hours: number, bands: ReferenceBand[]) {
  let total = 0;
  for (const band of [...bands].sort((a, b) => a.fromHour - b.fromHour)) {
    const count = Math.max(0, Math.min(hours, band.toHour) - band.fromHour + 1);
    total += count * band.valuePerHourMonth;
  }
  return total;
}
export function baseSizeFactor(activeClients: number, p: AtsocParameters) {
  return (
    p.baseFactors.find(
      (x) => x.maxClients === null || activeClients <= x.maxClients,
    )?.factor ?? 1
  );
}
export function commercialReferencePrice(
  client: ClientInput,
  p: AtsocParameters,
) {
  // Reference bands describe the monthly price of a daily coverage repeated
  // through all seven days. Each scheduled day therefore contributes 1/7 of
  // that reference, preventing the monthly value from being counted once per
  // weekday.
  const weeklyMonthlyReference = client.schedule.reduce(
    (s, d) =>
      s +
      (d.enabled
        ? bandValue(coverageHours(d.start, d.end), p.referenceBands) / 7
        : 0),
    0,
  );
  return weeklyMonthlyReference * baseSizeFactor(client.activeClients, p);
}
export function commercialRound(value: number, strategy: RoundingStrategy) {
  if (strategy === "up10") return Math.ceil(value / 10) * 10;
  if (strategy === "nearest10") return Math.round(value / 10) * 10;
  if (strategy === "commercial99")
    return Math.ceil((value + 1) / 100) * 100 - 1;
  if (strategy === "multiple50") return Math.ceil(value / 50) * 50;
  if (strategy === "multiple100") return Math.ceil(value / 100) * 100;
  if (strategy === "none") return value;
  return Math.ceil((value + 10) / 100) * 100 - 10;
}
export function validateMarginPolicy(p: AtsocParameters) {
  const valid =
    p.minimumCommercialMargin >= 0 &&
    p.minimumCommercialMargin < p.targetCommercialMargin &&
    p.targetCommercialMargin < p.excellentCommercialMargin &&
    p.excellentCommercialMargin < 1;
  return {
    valid,
    message: valid
      ? "Política de margens válida"
      : "A margem mínima deve ser menor que a margem alvo, que deve ser menor que a margem excelente.",
  };
}
export function quoteStatementAtPrice(
  client: ClientInput,
  p: AtsocParameters,
  revenue: number,
) {
  return calculateProfitStatement(
    revenue,
    clientOperationalCost(client, p),
    monthlyCacCost(p, client.cacManual),
    fixedAllocationForQuote(p),
    p,
    true,
    client.seller,
  );
}
export function calculateCommercialPricing(
  client: ClientInput,
  p: AtsocParameters,
) {
  const makeTier = (
    name: "minimum" | "target" | "excellent",
    margin: number,
  ) => {
    const exactPrice = Math.max(
        financialMinimumPrice(client, p, margin),
        p.commercialFloor,
      ),
      displayPrice = commercialRound(exactPrice, p.roundingStrategy);
    return {
      name,
      configuredMargin: margin,
      exactPrice,
      displayPrice,
      exactStatement: quoteStatementAtPrice(client, p, exactPrice),
      displayStatement: quoteStatementAtPrice(client, p, displayPrice),
    };
  };
  const minimum = makeTier("minimum", p.minimumCommercialMargin),
    target = makeTier("target", p.targetCommercialMargin),
    excellent = makeTier("excellent", p.excellentCommercialMargin);
  let postCallExact = excellent.exactPrice;
  if (p.postCallPolicy === "excellent_plus")
    postCallExact = excellent.exactPrice * (1 + p.postCallMarkup);
  if (p.postCallPolicy === "target") postCallExact = target.exactPrice;
  if (p.postCallPolicy === "custom") postCallExact = p.postCallCustomPrice;
  return {
    reference: commercialReferencePrice(client, p),
    minimum,
    target,
    excellent,
    postCall: {
      enabled: p.postCallPolicyEnabled,
      exactPrice: postCallExact,
      displayPrice: commercialRound(postCallExact, p.roundingStrategy),
      statement: quoteStatementAtPrice(client, p, postCallExact),
    },
    operationalCost: clientOperationalCost(client, p),
    equivalentHours: equivalentMonthlyHours(client, p),
  };
}
export function calculatePricing(
  client: ClientInput,
  p: AtsocParameters,
  targetMargin = p.targetCommercialMargin,
) {
  const policy = calculateCommercialPricing(client, p),
    selected =
      targetMargin === p.minimumCommercialMargin
        ? policy.minimum
        : targetMargin === p.excellentCommercialMargin
          ? policy.excellent
          : policy.target;
  return {
    financial: policy.minimum.exactPrice,
    calculatedFinancialFloor: policy.minimum.exactPrice,
    reference: policy.reference,
    pricingBase: selected.exactPrice,
    minimum: policy.minimum.displayPrice,
    recommended: policy.target.exactPrice,
    commercial: policy.target.displayPrice,
    finalSuggested: policy.target.displayPrice,
    statement: selected.displayStatement,
    operationalCost: policy.operationalCost,
    equivalentHours: policy.equivalentHours,
    policy,
  };
}
export function discountDecision(
  tablePrice: number,
  discount: number,
  minimum: number,
  p: AtsocParameters,
) {
  const finalPrice = tablePrice * (1 - discount);
  if (finalPrice < minimum)
    return {
      status: "blocked" as const,
      finalPrice,
      reason: "Preço final abaixo do preço mínimo",
    };
  if (discount <= p.sellerMaxDiscount)
    return {
      status: "seller" as const,
      finalPrice,
      reason: "Dentro da autonomia do vendedor",
    };
  return {
    status: "admin" as const,
    finalPrice,
    reason: "Exige aprovação do administrador",
  };
}
export function createDiscountAudit(
  tablePrice: number,
  discount: number,
  minimum: number,
  p: AtsocParameters,
  user: string,
  reason: string,
  date = new Date().toISOString(),
) {
  const decision = discountDecision(tablePrice, discount, minimum, p);
  return {
    tablePrice,
    discount,
    finalPrice: decision.finalPrice,
    minimumPrice: minimum,
    status: decision.status,
    user,
    date,
    reason: reason.trim() || "Não informado",
  };
}

export function clientProfitability(
  client: ClientInput,
  allClients: ClientInput[],
  p: AtsocParameters,
) {
  const op = clientOperationalCost(client, p),
    cac = clientCacAmortization(client, p),
    fixed = allocateFixedCosts(client, allClients, p),
    statement = calculateProfitStatement(
      client.monthlyRevenue,
      op,
      cac,
      fixed,
      p,
      false,
      client.seller,
    ),
    totalRevenue = allClients.reduce((s, c) => s + c.monthlyRevenue, 0);
  return {
    ...statement,
    cac: Number(client.cacManual) || 0,
    paybackMonths:
      statement.finalProfit > 0
        ? configuredPricingCac(p, client.cacManual) / statement.finalProfit
        : Infinity,
    loadFte: adjustedClientLoad(client, p),
    equivalentHours: equivalentMonthlyHours(client, p),
    revenueShare: client.monthlyRevenue / Math.max(1, totalRevenue),
  };
}
export function normalizedPartnerCost(p: AtsocParameters) {
  const partners = p.partnerTargets || [];
  if (!partners.length)
    return p.operationalPartnersFte * p.partnerEquivalentMonthlyCost;
  const current = partners
      .filter((partner) => partner.includeInTarget)
      .reduce((sum, partner) => sum + partner.currentMonthlyPay, 0),
    target = partners
      .filter((partner) => partner.includeInTarget)
      .reduce((sum, partner) => sum + partner.targetMonthlyPay, 0);
  return Math.max(0, target - current);
}
export function calculateDre(
  clients: ClientInput[],
  p: AtsocParameters,
  normalized = false,
) {
  const totalRevenue = clients.reduce((total, client) => total + client.monthlyRevenue, 0),
    totalFixedCosts = p.fixedCosts.reduce((total, cost) => total + cost.amount, 0),
    statements = clients.length ? clients.map((client) =>
      calculateProfitStatement(
        client.monthlyRevenue,
        normalized ? clientOperationalCost(client, p) : 0,
        normalized ? clientCacAmortization(client, p) : 0,
        totalFixedCosts *
          (totalRevenue > 0
            ? client.monthlyRevenue / totalRevenue
            : 1 / clients.length),
        p,
        false,
        client.seller,
      ),
    ) : [calculateProfitStatement(0, 0, 0, totalFixedCosts, p, false)],
    revenue = statements.reduce((sum, item) => sum + item.grossRevenue, 0),
    sum = (key: keyof ProfitStatement) =>
      statements.reduce((total, item) => total + Number(item[key] || 0), 0),
    base: ProfitStatement = {
      grossRevenue: revenue,
      taxes: sum("taxes"),
      nonParticipationCommissions: sum("nonParticipationCommissions"),
      netRevenue: sum("netRevenue"),
      operationalCost: sum("operationalCost"),
      cacAmortized: sum("cacAmortized"),
      fixedAllocation: sum("fixedAllocation"),
      contributionMargin: sum("contributionMargin"),
      operatingProfit: sum("operatingProfit"),
      profitBeforeParticipation: sum("profitBeforeParticipation"),
      participations: sum("participations"),
      finalProfit: sum("finalProfit"),
      margin: revenue ? sum("finalProfit") / revenue : 0,
      commissionDetails: statements.flatMap((item) => item.commissionDetails),
    },
    partnerCost = normalized ? normalizedPartnerCost(p) : 0;
  return {
    ...base,
    partnerCost,
    normalizedResult: base.finalProfit - partnerCost,
    normalizedMargin: revenue ? (base.finalProfit - partnerCost) / revenue : 0,
  };
}

export function calculateTargetStructure(
  clients: ClientInput[],
  p: AtsocParameters,
  team: TeamMember[] = [],
) {
  const current = calculateDre(clients, p, false);
  const partners = (p.partnerTargets || []).filter(
    (partner) => partner.includeInTarget,
  );
  const currentPartnerPay = partners.reduce(
    (sum, partner) => sum + partner.currentMonthlyPay,
    0,
  );
  const targetPartnerPay = partners.reduce(
    (sum, partner) => sum + partner.targetMonthlyPay,
    0,
  );
  const partnerAdjustment = Math.max(0, targetPartnerPay - currentPartnerPay);
  const capacity = analyzeCapacity(clients, p);
  const currentOperationalCollaborators = team.filter(
    (member) =>
      member.active && member.operational && member.kind === "collaborator",
  ).length;
  const requiredOperationalStaff = capacity.safeStaff;
  const additionalOperationalStaff = p.targetPartnersLeaveOperations
    ? Math.max(0, requiredOperationalStaff - currentOperationalCollaborators)
    : 0;
  const operationalStaffCost =
    additionalOperationalStaff *
    (p.pricingUsesMaxCost ? p.collaboratorMaxCost : p.collaboratorBaseCost);
  const targetResult =
    current.finalProfit - partnerAdjustment - operationalStaffCost;

  const resultAtRevenue = (targetRevenue: number) => {
    if (!clients.length)
      return targetRevenue * (1 - p.taxRate) -
        current.fixedAllocation -
        partnerAdjustment -
        operationalStaffCost;
    const currentRevenue = Math.max(1, current.grossRevenue);
    const factor = targetRevenue / currentRevenue;
    const scaledClients = clients.map((client) => ({
      ...client,
      monthlyRevenue: client.monthlyRevenue * factor,
    }));
    return (
      calculateDre(scaledClients, p, false).finalProfit -
      partnerAdjustment -
      operationalStaffCost
    );
  };
  let low = Math.max(0, current.grossRevenue),
    high = Math.max(100000, low * 10);
  for (let index = 0; index < 70; index += 1) {
    const mid = (low + high) / 2;
    if (resultAtRevenue(mid) >= 0) high = mid;
    else low = mid;
  }
  return {
    current,
    currentPartnerPay,
    targetPartnerPay,
    partnerAdjustment,
    requiredOperationalStaff,
    currentOperationalCollaborators,
    additionalOperationalStaff,
    operationalStaffCost,
    targetResult,
    requiredMrr: high,
    additionalMrrRequired: Math.max(0, high - current.grossRevenue),
  };
}

export function simulateNewSale(
  current: ClientInput[],
  proposal: ClientInput,
  p: AtsocParameters,
) {
  const before = analyzeCapacity(current, p),
    after = analyzeCapacity([...current, proposal], p),
    pricing = calculatePricing(proposal, p),
    saleRevenue =
      proposal.monthlyRevenue > 0
        ? proposal.monthlyRevenue
        : pricing.commercial,
    saleStatement = calculateProfitStatement(
      saleRevenue,
      pricing.operationalCost,
      monthlyCacCost(p, proposal.cacManual),
      fixedAllocationForQuote(p),
      p,
      true,
      proposal.seller,
    ),
    needed = after.safeStaff,
    hireCount = Math.max(0, needed - Math.ceil(p.availableOperationalFte)),
    hireCost = hireCount * p.collaboratorMaxCost,
    incrementalProfit = saleStatement.finalProfit - hireCost;
  const dayNames = [
    "segunda",
    "terça",
    "quarta",
    "quinta",
    "sexta",
    "sábado",
    "domingo",
  ];
  return {
    additionalRevenue: saleRevenue,
    estimatedMargin: saleStatement.margin,
    currentLoad: before.peak.safeUtilization,
    futureLoad: after.peak.safeUtilization,
    currentPeakFte: before.maxFte,
    futurePeakFte: after.maxFte,
    currentStaff: p.availableOperationalFte,
    neededStaff: needed,
    hireCount,
    hireCost,
    incrementalProfit,
    peakLabel: `${dayNames[after.peak.day]} ${after.peak.label}`,
    message: `Esta venda elevará a utilização segura no pico de ${(before.peak.safeUtilization * 100).toFixed(0)}% para ${(after.peak.safeUtilization * 100).toFixed(0)}% em ${dayNames[after.peak.day]} às ${after.peak.label}. ${hireCount ? `Recomenda-se contratação de +${hireCount} atendente${hireCount > 1 ? "s" : ""} PJ.` : "A equipe atual absorve a venda dentro do limite seguro."}`,
  };
}

export type ScenarioKind =
  | "new_client"
  | "new_hire"
  | "price_increase"
  | "client_loss";
export type ScenarioInput = {
  kind: ScenarioKind;
  value: number;
  quantity?: number;
  activeClients?: number;
  selectedClientId?: string;
};
export function calculateScenarioImpact(
  clients: ClientInput[],
  input: ScenarioInput,
  p: AtsocParameters,
) {
  const beforeDre = calculateDre(clients, p, true);
  const beforeCapacity = analyzeCapacity(clients, p);
  let futureClients = clients;
  let directStaffCost = 0;
  let availableStaff = p.availableOperationalFte;

  if (input.kind === "new_client") {
    futureClients = [
      ...clients,
      {
        id: "scenario-client",
        name: "Cliente simulado",
        activeClients: Math.max(0, input.activeClients || 0),
        monthlyRevenue: Math.max(0, input.value),
        intensityFactor: p.defaultIntensityFactor,
        cacManual: configuredPricingCac(p),
        contractStart: new Date().toISOString().slice(0, 10),
        schedule: weekSchedule("18:00", "00:00", [0, 1, 2, 3, 4, 5, 6]),
      },
    ];
  }
  if (input.kind === "new_hire") {
    const quantity = Math.max(1, Math.floor(input.quantity || 1));
    directStaffCost = Math.max(0, input.value) * quantity;
    availableStaff += quantity;
  }
  if (input.kind === "price_increase") {
    const rate = Math.max(-1, input.value / 100);
    futureClients = clients.map((client) => ({
      ...client,
      monthlyRevenue: client.monthlyRevenue * (1 + rate),
    }));
  }
  if (input.kind === "client_loss") {
    futureClients = clients.filter(
      (client) => client.id !== input.selectedClientId,
    );
  }

  let futureCapacity = analyzeCapacity(futureClients, p, availableStaff);
  let requiredHireCount = 0;
  if (input.kind === "new_client") {
    requiredHireCount = Math.max(
      0,
      futureCapacity.safeStaff - Math.ceil(p.availableOperationalFte),
    );
    directStaffCost = requiredHireCount * p.collaboratorMaxCost;
    availableStaff += requiredHireCount;
    futureCapacity = analyzeCapacity(futureClients, p, availableStaff);
  }
  const futureDre = calculateDre(futureClients, p, true);
  const currentRevenue = beforeDre.grossRevenue;
  const futureRevenue = futureDre.grossRevenue;
  const currentProfit = beforeDre.normalizedResult;
  const futureProfit = futureDre.normalizedResult - directStaffCost;
  const revenueImpact = futureRevenue - currentRevenue;
  const profitImpact = futureProfit - currentProfit;
  return {
    currentRevenue,
    futureRevenue,
    revenueImpact,
    currentProfit,
    futureProfit,
    profitImpact,
    currentMargin: beforeDre.normalizedMargin,
    futureMargin: futureRevenue ? futureProfit / futureRevenue : 0,
    currentLoad: beforeCapacity.peak.safeUtilization,
    futureLoad: futureCapacity.peak.safeUtilization,
    currentStaff: p.availableOperationalFte,
    futureStaff: availableStaff,
    requiredHireCount,
    staffCostImpact: directStaffCost,
    profitable: profitImpact > 0,
  };
}
