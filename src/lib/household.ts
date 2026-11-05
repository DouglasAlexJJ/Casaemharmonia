export type Profile = "Douglas Alexander" | "Bruna Toth";
export type TransactionType = "income" | "expense";
export type TaskFrequency =
  | "daily"
  | "alternate"
  | "dishAlternate"
  | "cleaning"
  | "monthly"
  | "couple"
  | "custom";
export type TaskTimePeriod = "morning" | "afternoon" | "night" | "free";
export type CompletionRecord = { by: Profile; uid: string; completedAt: string };

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  createdBy: Profile;
  createdByUid: string;
};

export type TaskDefinition = {
  id: string;
  title: string;
  frequency: TaskFrequency;
  owner: Profile | "both" | "rotation";
  detail?: string;
  time?: string;
  timePeriod?: TaskTimePeriod;
  daysOfWeek?: number[];
  startDate?: string;
  endDate?: string;
  rotationStartDate?: string;
  rotationFirstPerson?: Profile;
  priority?: boolean;
};

export type FinancialSettings = {
  baseSalaries: Record<Profile, number>;
  reservePercent: number;
  investmentPercent: number;
  reserveBalance: number;
  reserveGoal: number;
  allowancePercentages: Record<Profile, number>;
};

export type RecurringBill = {
  id: string;
  name: string;
  category: string;
  kind: "fixed" | "variable";
  plannedAmount: number;
  dueDay?: number;
};

export type BillPayment = {
  id: string;
  billId: string;
  month: string;
  amount: number;
  paidOn: string;
  category?: string;
};

export type SharedDebt = {
  id: string;
  name: string;
  currentBalance: number;
  monthlyPayment: number;
  dueDay?: number;
  note?: string;
};

export type DebtPayment = {
  id: string;
  debtId: string;
  month: string;
  amount: number;
  paidOn: string;
};

export type MonthlyDeposit = {
  id: string;
  month: string;
  uid: string;
  profile: Profile;
  amount: number;
  receivedOn: string;
};

export type ReserveContribution = {
  id: string;
  month: string;
  amount: number;
  depositedOn: string;
  recordedAt: string;
  bankBalance: number;
  recordedBy: Profile;
  recordedByUid: string;
};

export type HouseholdData = {
  version: 2;
  transactions: Transaction[];
  categories: string[];
  budgets: Record<string, number>;
  completions: Record<string, CompletionRecord>;
  taskDefinitions: TaskDefinition[];
  financialSettings: FinancialSettings;
  bills: RecurringBill[];
  billPayments: BillPayment[];
  sharedDebts: SharedDebt[];
  debtPayments: DebtPayment[];
  deposits: MonthlyDeposit[];
  reserveContributions: ReserveContribution[];
};

export function depositDocumentId(deposit: Pick<MonthlyDeposit, "id">): string {
  return deposit.id.startsWith("deposit_") ? deposit.id : `deposit_${deposit.id}`;
}

export function uniqueMonthlyDeposits(deposits: MonthlyDeposit[]): MonthlyDeposit[] {
  const unique = new Map<string, MonthlyDeposit>();
  for (const deposit of deposits) unique.set(deposit.id || `${deposit.month}:${deposit.uid}:${deposit.receivedOn}:${deposit.amount}`, deposit);
  return [...unique.values()];
}

export type PrivateEntry = {
  id: string;
  kind: "expense" | "debt";
  title: string;
  amount?: number;
  month?: string;
  date?: string;
  category?: string;
  balance?: number;
  monthlyPayment?: number;
  dueDate?: string;
  note?: string;
  payments?: Record<string, number>;
};

export type HouseholdMember = {
  uid: string;
  profile: Profile;
  active: boolean;
};

export type MonthlyPlan = {
  month: string;
  baseSalaryTotal: number;
  actualDeposits: number;
  missingDeposits: Profile[];
  reserveContribution: number;
  investmentContribution: number;
  plannedBillsAndDebts: number;
  remaining: number;
  deficit: number;
  allowances: Record<Profile, number>;
  isProjection: boolean;
};

export const PROFILES: Profile[] = ["Douglas Alexander", "Bruna Toth"];

export const DEFAULT_CATEGORIES = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Restaurantes",
  "Saúde",
  "Lazer",
  "Contas",
  "Dívidas",
  "Outros",
];

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  baseSalaries: { "Douglas Alexander": 0, "Bruna Toth": 0 },
  reservePercent: 0,
  investmentPercent: 0,
  reserveBalance: 0,
  reserveGoal: 0,
  allowancePercentages: { "Douglas Alexander": 50, "Bruna Toth": 50 },
};

export function normalizeFinancialSettings(value: unknown): FinancialSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_FINANCIAL_SETTINGS };
  const incoming = value as Partial<FinancialSettings>;
  const salaries = incoming.baseSalaries as Partial<Record<Profile, number>> | undefined;
  const shares = incoming.allowancePercentages as Partial<Record<Profile, number>> | undefined;
  const validShares = hasValidAllowanceSplit(incoming);
  return {
    baseSalaries: {
      "Douglas Alexander": validNonNegative(salaries?.["Douglas Alexander"]),
      "Bruna Toth": validNonNegative(salaries?.["Bruna Toth"]),
    },
    reservePercent: validPercent(incoming.reservePercent),
    investmentPercent: validPercent(incoming.investmentPercent),
    reserveBalance: validNonNegative(incoming.reserveBalance),
    reserveGoal: validNonNegative(incoming.reserveGoal),
    allowancePercentages: validShares ? {
      "Douglas Alexander": validPercent(shares?.["Douglas Alexander"]),
      "Bruna Toth": validPercent(shares?.["Bruna Toth"]),
    } : { ...DEFAULT_FINANCIAL_SETTINGS.allowancePercentages },
  };
}

export function hasValidAllowanceSplit(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const settings = value as { allowancePercentages?: Partial<Record<Profile, unknown>> };
  const shares = settings.allowancePercentages;
  const douglas = Number(shares?.["Douglas Alexander"]);
  const bruna = Number(shares?.["Bruna Toth"]);
  return Number.isFinite(douglas) && Number.isFinite(bruna)
    && douglas >= 0 && douglas <= 100
    && bruna >= 0 && bruna <= 100
    && Math.abs(douglas + bruna - 100) < 0.001;
}

function validNonNegative(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function validPercent(value: unknown): number {
  return Math.min(100, validNonNegative(value));
}

export function createInitialData(): HouseholdData {
  return {
    version: 2,
    transactions: [],
    categories: [...DEFAULT_CATEGORIES],
    budgets: {},
    completions: {},
    taskDefinitions: [...ROUTINE_TASKS],
    financialSettings: { ...DEFAULT_FINANCIAL_SETTINGS },
    bills: [],
    billPayments: [],
    sharedDebts: [],
    debtPayments: [],
    deposits: [],
    reserveContributions: [],
  };
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getIsoWeekNumber(date: Date): number {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getTaskAssignee(task: TaskDefinition, date: Date): Profile | "Ambos" {
  if (task.owner === "both") return "Ambos";
  if (task.owner !== "rotation") return task.owner;

  if (task.frequency === "custom" || (task.frequency === "monthly" && task.rotationStartDate)) {
    const anchorKey = task.rotationStartDate || task.startDate || localDateKey(date);
    const anchor = new Date(`${anchorKey}T12:00:00`);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    if (target < anchor) return task.rotationFirstPerson ?? "Douglas Alexander";
    if (task.frequency === "monthly") {
      const occurrences = (target.getFullYear() - anchor.getFullYear()) * 12 + target.getMonth() - anchor.getMonth() + 1;
      const first = task.rotationFirstPerson ?? "Douglas Alexander";
      return occurrences % 2 === 1 ? first : first === "Douglas Alexander" ? "Bruna Toth" : "Douglas Alexander";
    }
    const days = task.daysOfWeek?.length ? task.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    let occurrences = 0;
    for (const cursor = new Date(anchor); cursor <= target; cursor.setDate(cursor.getDate() + 1)) {
      if (days.includes(cursor.getDay())) occurrences++;
    }
    const first = task.rotationFirstPerson ?? "Douglas Alexander";
    return occurrences % 2 === 1 ? first : first === "Douglas Alexander" ? "Bruna Toth" : "Douglas Alexander";
  }

  if (task.frequency === "dishAlternate") {
    const anchor = Date.UTC(2026, 10, 4);
    const selected = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const daysFromAnchor = Math.round((selected - anchor) / 86400000);
    return ((daysFromAnchor % 2) + 2) % 2 === 0 ? "Douglas Alexander" : "Bruna Toth";
  }

  // O documento informa Bruna em 24/09, sem ano; a referência é aplicada no ano exibido.
  const anchor = Date.UTC(date.getFullYear(), 8, 24);
  const selected = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromAnchor = Math.round((selected - anchor) / 86400000);
  const startsWithBruna = ((daysFromAnchor % 2) + 2) % 2 === 0;
  return startsWithBruna ? "Bruna Toth" : "Douglas Alexander";
}

export const ROUTINE_TASKS: TaskDefinition[] = [
  { id: "baby-bath", title: "Banho dos bebês", frequency: "daily", owner: "Douglas Alexander", time: "À noite" },
  { id: "baby-after-bath", title: "Trocar bebês pós-banho", frequency: "daily", owner: "Bruna Toth", time: "À noite" },
  { id: "bath-clothes", title: "Separar roupas para o banho", frequency: "daily", owner: "Douglas Alexander" },
  { id: "morning-babies", title: "Fazer mamá e trocar para a creche", frequency: "daily", owner: "Douglas Alexander", time: "Manhã" },
  { id: "daycare-bags", title: "Preparar bolsas e roupas para a creche", frequency: "daily", owner: "Bruna Toth", time: "Manhã" },
  { id: "baby-dinner", title: "Janta dos bebês", frequency: "daily", owner: "Bruna Toth" },
  { id: "night-feed-rotation", title: "Dormir com os bebês / fazer mamá da noite", frequency: "alternate", owner: "rotation", detail: "Dias alternados · Bruna em 24/09", time: "À noite" },
  { id: "dishes-alternating", title: "Escala da louça", frequency: "dishAlternate", owner: "rotation", detail: "Alternância diária · Douglas em 04/11/2026" },
  { id: "clean-bathroom", title: "Limpeza: Banheiro", frequency: "cleaning", owner: "Douglas Alexander", detail: "Quarta e sexta-feira" },
  { id: "clean-pc-room", title: "Limpeza: Quarto PC", frequency: "cleaning", owner: "Douglas Alexander", detail: "Quarta e sexta-feira" },
  { id: "clean-living-room", title: "Limpeza: Sala", frequency: "cleaning", owner: "Douglas Alexander", detail: "Quarta e sexta-feira" },
  { id: "clean-garage", title: "Limpeza: Garagem", frequency: "cleaning", owner: "Douglas Alexander", detail: "Quarta e sexta-feira" },
  { id: "clean-baby-room", title: "Limpeza: Quarto dos bebês", frequency: "cleaning", owner: "Bruna Toth", detail: "Quarta e sexta-feira" },
  { id: "clean-kitchen", title: "Limpeza: Cozinha", frequency: "cleaning", owner: "Bruna Toth", detail: "Quarta e sexta-feira" },
  { id: "clean-laundry", title: "Limpeza: Lavanderia", frequency: "cleaning", owner: "Bruna Toth", detail: "Quarta e sexta-feira" },
  { id: "monthly-windows", title: "Limpar janelas", frequency: "monthly", owner: "Douglas Alexander", detail: "1x por mês" },
  { id: "monthly-mold", title: "Limpar paredes mofadas", frequency: "monthly", owner: "Douglas Alexander", detail: "1x por mês" },
  { id: "monthly-baby-bedding", title: "Trocar roupa de cama dos bebês", frequency: "monthly", owner: "Bruna Toth", detail: "1x por mês ou conforme necessidade" },
  { id: "monthly-kitchen-cabinets", title: "Limpar armários da cozinha", frequency: "monthly", owner: "Bruna Toth", detail: "1x por mês" },
  { id: "monthly-wardrobe-clean", title: "Limpar guarda-roupa dos bebês", frequency: "monthly", owner: "Douglas Alexander", detail: "1x por mês · etapa de limpeza" },
  { id: "monthly-wardrobe-organize", title: "Organizar guarda-roupa dos bebês", frequency: "monthly", owner: "Bruna Toth", detail: "1x por mês · etapa de organização" },
  { id: "monthly-curtains", title: "Lavar cortinas", frequency: "monthly", owner: "Douglas Alexander", detail: "1x por mês" },
  { id: "couple-time", title: "Encontro / Tempo do Casal", frequency: "couple", owner: "both", detail: "Sábado às 20:00", time: "20:00", priority: true },
];

export function taskPeriod(task: TaskDefinition): TaskTimePeriod {
  if (task.timePeriod) return task.timePeriod;
  const legacy = task.time?.toLocaleLowerCase() ?? "";
  if (legacy.includes("manhã")) return "morning";
  if (legacy.includes("tarde")) return "afternoon";
  if (legacy.includes("noite") || task.frequency === "alternate" || task.frequency === "dishAlternate") return "night";
  if (task.time && /^\d{1,2}:\d{2}$/.test(task.time)) return "night";
  return "free";
}

export function taskScheduleLabel(task: TaskDefinition): string | null {
  const period: Record<TaskTimePeriod, string> = { morning: "Manhã", afternoon: "Tarde", night: "Noite", free: "Livre" };
  const exact = task.time && /^\d{1,2}:\d{2}$/.test(task.time) ? task.time : null;
  if (task.timePeriod === "free" || taskPeriod(task) === "free") return "Livre";
  return exact ? `${period[taskPeriod(task)]} · ${exact}` : period[taskPeriod(task)];
}

function withinTaskDates(task: TaskDefinition, date: Date): boolean {
  const key = localDateKey(date);
  return (!task.startDate || key >= task.startDate) && (!task.endDate || key <= task.endDate);
}

function sortBySchedule(tasks: TaskDefinition[]): TaskDefinition[] {
  const rank: Record<TaskTimePeriod, number> = { morning: 0, afternoon: 1, night: 2, free: 3 };
  return [...tasks].sort((a, b) => rank[taskPeriod(a)] - rank[taskPeriod(b)]
    || (a.time ?? "").localeCompare(b.time ?? "")
    || a.title.localeCompare(b.title, "pt-BR"));
}

export function getTasksForDate(date: Date, definitions: TaskDefinition[] = ROUTINE_TASKS): TaskDefinition[] {
  const weekday = date.getDay();
  return sortBySchedule(definitions.filter((task) => {
    if (!withinTaskDates(task, date)) return false;
    if (task.frequency === "custom") return (task.daysOfWeek?.length ? task.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]).includes(weekday);
    if (task.frequency === "daily" || task.frequency === "alternate" || task.frequency === "dishAlternate") return true;
    if (task.frequency === "cleaning") return weekday === 3 || weekday === 5;
    if (task.frequency === "couple") return weekday === 6;
    return false;
  }));
}

export function getTasksForRoutine(definitions: TaskDefinition[] = ROUTINE_TASKS, date = new Date()): TaskDefinition[] {
  return sortBySchedule(definitions.filter((task) => withinTaskDates(task, date)
    && ["daily", "alternate", "dishAlternate", "cleaning", "custom"].includes(task.frequency)));
}

export function getTasksForMonth(date = new Date(), definitions: TaskDefinition[] = ROUTINE_TASKS): TaskDefinition[] {
  const dateKey = localDateKey(date);
  const month = dateKey.slice(0, 7);
  return sortBySchedule(definitions.filter((task) => task.frequency === "monthly"
    && (!task.startDate || task.startDate.slice(0, 7) <= month)
    && (!task.endDate || task.endDate.slice(0, 7) >= month)));
}

export function taskCompletionKey(task: TaskDefinition, date: Date): string {
  if (task.frequency === "monthly") return `${task.id}:${monthKey(date)}`;
  return `${task.id}:${localDateKey(date)}`;
}

export function calculateMonthlyPlan(data: HouseholdData, month: string): MonthlyPlan {
  const settings = normalizeFinancialSettings(data.financialSettings);
  const monthDeposits = uniqueMonthlyDeposits(data.deposits).filter((deposit) => deposit.month === month);
  const actualDeposits = monthDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  const missingDeposits = PROFILES.filter((profile) => !monthDeposits.some((deposit) => deposit.profile === profile));
  const baseSalaryTotal = PROFILES.reduce((sum, profile) => sum + settings.baseSalaries[profile], 0);
  const reserveContribution = baseSalaryTotal * settings.reservePercent / 100;
  const investmentContribution = baseSalaryTotal * settings.investmentPercent / 100;
  const billForecast = data.bills.reduce((sum, bill) => {
    const payment = data.billPayments.find((item) => item.billId === bill.id && item.month === month);
    return sum + (payment?.amount ?? bill.plannedAmount);
  }, 0);
  const debtForecast = data.sharedDebts.reduce((sum, debt) => {
    const payment = data.debtPayments.find((item) => item.debtId === debt.id && item.month === month);
    const estimatedPayment = Math.min(Math.max(0, debt.monthlyPayment || 0), Math.max(0, debt.currentBalance || 0));
    return sum + (payment?.amount ?? estimatedPayment);
  }, 0);
  const plannedBillsAndDebts = billForecast + debtForecast;
  const remaining = actualDeposits - investmentContribution - plannedBillsAndDebts;
  const available = Math.max(0, remaining);
  const allowances = {
    "Douglas Alexander": available * settings.allowancePercentages["Douglas Alexander"] / 100,
    "Bruna Toth": available * settings.allowancePercentages["Bruna Toth"] / 100,
  };
  const isProjection = missingDeposits.length > 0 || data.bills.some((bill) => !data.billPayments.some((payment) => payment.billId === bill.id && payment.month === month)) || data.sharedDebts.some((debt) => !data.debtPayments.some((payment) => payment.debtId === debt.id && payment.month === month));
  return {
    month,
    baseSalaryTotal,
    actualDeposits,
    missingDeposits,
    reserveContribution,
    investmentContribution,
    plannedBillsAndDebts,
    remaining,
    deficit: Math.max(0, -remaining),
    allowances,
    isProjection,
  };
}

export function safeImportedData(value: unknown): HouseholdData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<HouseholdData> & { version?: number };
  if (!Array.isArray(candidate.transactions) || !Array.isArray(candidate.categories) || !candidate.budgets || typeof candidate.budgets !== "object") return null;
  if (candidate.financialSettings !== undefined && !hasValidAllowanceSplit(candidate.financialSettings)) return null;
  const base = createInitialData();
  const completions = candidate.completions && typeof candidate.completions === "object" ? candidate.completions : {};
  const normalizedCompletions: Record<string, CompletionRecord> = {};
  for (const [key, item] of Object.entries(completions)) {
    if (typeof item === "string" && (item === "Douglas Alexander" || item === "Bruna Toth")) normalizedCompletions[key] = { by: item, uid: "legacy-backup", completedAt: "" };
    else if (item && typeof item === "object" && "by" in item && "uid" in item) normalizedCompletions[key] = item as CompletionRecord;
  }
  return {
    ...base,
    ...candidate,
    version: 2,
    taskDefinitions: Array.isArray(candidate.taskDefinitions) ? candidate.taskDefinitions as TaskDefinition[] : base.taskDefinitions,
    categories: candidate.categories.filter((item): item is string => typeof item === "string"),
    budgets: candidate.budgets as Record<string, number>,
    completions: normalizedCompletions,
    financialSettings: normalizeFinancialSettings(candidate.financialSettings),
    bills: Array.isArray(candidate.bills) ? candidate.bills : [],
    billPayments: Array.isArray(candidate.billPayments) ? candidate.billPayments : [],
    sharedDebts: Array.isArray(candidate.sharedDebts) ? candidate.sharedDebts : [],
    debtPayments: Array.isArray(candidate.debtPayments) ? candidate.debtPayments : [],
    deposits: uniqueMonthlyDeposits(Array.isArray(candidate.deposits) ? candidate.deposits as MonthlyDeposit[] : []),
    reserveContributions: Array.isArray(candidate.reserveContributions) ? candidate.reserveContributions as ReserveContribution[] : [],
    transactions: candidate.transactions as Transaction[],
  };
}
