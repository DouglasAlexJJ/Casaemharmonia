export type Profile = "Douglas Alexander" | "Bruna Toth";
export type TransactionType = "income" | "expense";
export type TaskFrequency =
  | "daily"
  | "alternate"
  | "dishAlternate"
  | "cleaning"
  | "monthly"
  | "couple";
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

export type HouseholdData = {
  version: 2;
  transactions: Transaction[];
  categories: string[];
  budgets: Record<string, number>;
  completions: Record<string, CompletionRecord>;
  financialSettings: FinancialSettings;
  bills: RecurringBill[];
  billPayments: BillPayment[];
  sharedDebts: SharedDebt[];
  debtPayments: DebtPayment[];
  deposits: MonthlyDeposit[];
};

export function depositDocumentId(deposit: Pick<MonthlyDeposit, "month" | "profile">): string {
  const profileKey = deposit.profile === "Douglas Alexander" ? "douglas" : "bruna";
  return `deposit_${deposit.month}_${profileKey}`;
}

export function uniqueMonthlyDeposits(deposits: MonthlyDeposit[]): MonthlyDeposit[] {
  const unique = new Map<string, MonthlyDeposit>();
  for (const deposit of deposits) {
    const key = `${deposit.month}:${deposit.uid}:${deposit.profile}`;
    const previous = unique.get(key);
    const depositIsCanonical = deposit.id === depositDocumentId(deposit);
    const previousIsCanonical = previous ? previous.id === depositDocumentId(previous) : false;
    if (!previous || (depositIsCanonical && !previousIsCanonical)
      || (depositIsCanonical === previousIsCanonical && deposit.receivedOn.localeCompare(previous.receivedOn) >= 0)) {
      unique.set(key, deposit);
    }
  }
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
    financialSettings: { ...DEFAULT_FINANCIAL_SETTINGS },
    bills: [],
    billPayments: [],
    sharedDebts: [],
    debtPayments: [],
    deposits: [],
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

export function getTasksForDate(date: Date): TaskDefinition[] {
  const weekday = date.getDay();
  return ROUTINE_TASKS.filter((task) => {
    if (task.frequency === "daily" || task.frequency === "alternate" || task.frequency === "dishAlternate") return true;
    if (task.frequency === "cleaning") return weekday === 3 || weekday === 5;
    if (task.frequency === "couple") return weekday === 6;
    return false;
  });
}

export function getTasksForRoutine(): TaskDefinition[] {
  return ROUTINE_TASKS.filter((task) => ["daily", "alternate", "dishAlternate", "cleaning"].includes(task.frequency));
}

export function getTasksForMonth(): TaskDefinition[] {
  return ROUTINE_TASKS.filter((task) => task.frequency === "monthly");
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
  const reserveContribution = actualDeposits * settings.reservePercent / 100;
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
  const remaining = actualDeposits - reserveContribution - investmentContribution - plannedBillsAndDebts;
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
    categories: candidate.categories.filter((item): item is string => typeof item === "string"),
    budgets: candidate.budgets as Record<string, number>,
    completions: normalizedCompletions,
    financialSettings: normalizeFinancialSettings(candidate.financialSettings),
    bills: Array.isArray(candidate.bills) ? candidate.bills : [],
    billPayments: Array.isArray(candidate.billPayments) ? candidate.billPayments : [],
    sharedDebts: Array.isArray(candidate.sharedDebts) ? candidate.sharedDebts : [],
    debtPayments: Array.isArray(candidate.debtPayments) ? candidate.debtPayments : [],
    deposits: uniqueMonthlyDeposits(Array.isArray(candidate.deposits) ? candidate.deposits as MonthlyDeposit[] : []),
    transactions: candidate.transactions as Transaction[],
  };
}
