export type Profile = "Douglas Alexander" | "Bruna Toth";
export type TransactionType = "income" | "expense";
export type TaskFrequency =
  | "daily"
  | "alternate"
  | "dishOdd"
  | "dishEven"
  | "balanced"
  | "monthly"
  | "couple";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  createdBy: Profile;
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

export type HouseholdData = {
  version: 1;
  transactions: Transaction[];
  categories: string[];
  budgets: Record<string, number>;
  completions: Record<string, Profile>;
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
  "Outros",
];

export const ROUTINE_TASKS: TaskDefinition[] = [
  {
    id: "baby-bath",
    title: "Banho dos bebês",
    frequency: "daily",
    owner: "Douglas Alexander",
    time: "À noite",
  },
  {
    id: "baby-after-bath",
    title: "Trocar bebês pós-banho",
    frequency: "daily",
    owner: "Bruna Toth",
    time: "À noite",
  },
  {
    id: "bath-clothes",
    title: "Separar roupas para o banho",
    frequency: "daily",
    owner: "Douglas Alexander",
  },
  {
    id: "morning-babies",
    title: "Fazer mamá e trocar para a creche",
    frequency: "daily",
    owner: "Douglas Alexander",
    time: "Manhã",
  },
  {
    id: "daycare-bags",
    title: "Preparar bolsas e roupas para a creche",
    frequency: "daily",
    owner: "Bruna Toth",
    time: "Manhã",
  },
  {
    id: "baby-dinner",
    title: "Janta dos bebês",
    frequency: "daily",
    owner: "Bruna Toth",
  },
  {
    id: "night-feed-rotation",
    title: "Dormir com os bebês / fazer mamá da noite",
    frequency: "alternate",
    owner: "rotation",
    detail: "Dias alternados · Bruna em 24/09",
    time: "À noite",
  },
  {
    id: "dishes-odd",
    title: "Escala da louça",
    frequency: "dishOdd",
    owner: "Douglas Alexander",
    detail: "Semana ímpar · segunda, quarta, sexta e domingo",
  },
  {
    id: "dishes-even",
    title: "Escala da louça",
    frequency: "dishEven",
    owner: "Bruna Toth",
    detail: "Semana par · terça, quinta, sábado e domingo",
  },
  {
    id: "clean-bathroom",
    title: "Limpeza: banheiro",
    frequency: "balanced",
    owner: "Douglas Alexander",
    detail: "Equilibrada",
  },
  {
    id: "clean-baby-room",
    title: "Limpeza: quarto dos bebês",
    frequency: "balanced",
    owner: "Bruna Toth",
    detail: "Equilibrada",
  },
  {
    id: "clean-pc-room",
    title: "Limpeza: quarto PC",
    frequency: "balanced",
    owner: "Douglas Alexander",
    detail: "Equilibrada",
  },
  {
    id: "clean-kitchen",
    title: "Limpeza: cozinha",
    frequency: "balanced",
    owner: "Bruna Toth",
    detail: "Equilibrada",
  },
  {
    id: "clean-living-room",
    title: "Limpeza: sala",
    frequency: "balanced",
    owner: "Douglas Alexander",
    detail: "Equilibrada",
  },
  {
    id: "clean-laundry",
    title: "Limpeza: lavanderia",
    frequency: "balanced",
    owner: "Bruna Toth",
    detail: "Equilibrada",
  },
  {
    id: "clean-garage",
    title: "Limpeza: garagem",
    frequency: "balanced",
    owner: "Douglas Alexander",
    detail: "Equilibrada",
  },
  {
    id: "monthly-windows",
    title: "Limpar janelas",
    frequency: "monthly",
    owner: "Douglas Alexander",
    detail: "1x por mês",
  },
  {
    id: "monthly-mold",
    title: "Limpar paredes mofadas",
    frequency: "monthly",
    owner: "Douglas Alexander",
    detail: "1x por mês",
  },
  {
    id: "monthly-baby-bedding",
    title: "Trocar roupa de cama dos bebês",
    frequency: "monthly",
    owner: "Bruna Toth",
    detail: "1x por mês ou conforme necessidade",
  },
  {
    id: "monthly-kitchen-cabinets",
    title: "Limpar armários da cozinha",
    frequency: "monthly",
    owner: "Bruna Toth",
    detail: "1x por mês",
  },
  {
    id: "monthly-wardrobe-clean",
    title: "Limpar guarda-roupa dos bebês",
    frequency: "monthly",
    owner: "Douglas Alexander",
    detail: "1x por mês · etapa de limpeza",
  },
  {
    id: "monthly-wardrobe-organize",
    title: "Organizar guarda-roupa dos bebês",
    frequency: "monthly",
    owner: "Bruna Toth",
    detail: "1x por mês · etapa de organização",
  },
  {
    id: "monthly-curtains",
    title: "Lavar cortinas",
    frequency: "monthly",
    owner: "Douglas Alexander",
    detail: "1x por mês",
  },
  {
    id: "couple-time",
    title: "Encontro / Tempo do Casal",
    frequency: "couple",
    owner: "both",
    detail: "Sábado às 20:00",
    time: "20:00",
    priority: true,
  },
];

export function createInitialData(): HouseholdData {
  return {
    version: 1,
    transactions: [],
    categories: [...DEFAULT_CATEGORIES],
    budgets: {},
    completions: {},
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

  // O documento informa Bruna em 24/09, sem ano; a referência é aplicada no ano exibido.
  const anchor = Date.UTC(date.getFullYear(), 8, 24);
  const selected = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromAnchor = Math.round((selected - anchor) / 86400000);
  const startsWithBruna = ((daysFromAnchor % 2) + 2) % 2 === 0;
  return startsWithBruna ? "Bruna Toth" : "Douglas Alexander";
}

export function getTasksForDate(date: Date): TaskDefinition[] {
  const weekday = date.getDay();
  const weekNumber = getIsoWeekNumber(date);
  const isOddWeek = weekNumber % 2 === 1;

  return ROUTINE_TASKS.filter((task) => {
    if (task.frequency === "daily" || task.frequency === "alternate") return true;
    if (task.frequency === "dishOdd") return isOddWeek && [0, 1, 3, 5].includes(weekday);
    if (task.frequency === "dishEven") return !isOddWeek && [0, 2, 4, 6].includes(weekday);
    if (task.frequency === "couple") return weekday === 6;
    return false;
  });
}

export function getTasksForRoutine(): TaskDefinition[] {
  return ROUTINE_TASKS.filter((task) =>
    ["daily", "alternate", "dishOdd", "dishEven", "balanced"].includes(
      task.frequency,
    ),
  );
}

export function getTasksForMonth(): TaskDefinition[] {
  return ROUTINE_TASKS.filter((task) => task.frequency === "monthly");
}

export function taskCompletionKey(task: TaskDefinition, date: Date): string {
  if (task.frequency === "monthly") return `${task.id}:${monthKey(date)}`;
  return `${task.id}:${localDateKey(date)}`;
}

export function safeImportedData(value: unknown): HouseholdData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<HouseholdData>;
  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.transactions) ||
    !Array.isArray(candidate.categories) ||
    !candidate.budgets ||
    typeof candidate.budgets !== "object" ||
    !candidate.completions ||
    typeof candidate.completions !== "object"
  ) {
    return null;
  }
  return candidate as HouseholdData;
}
