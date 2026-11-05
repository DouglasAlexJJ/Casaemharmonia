import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import {
  BillPayment,
  CompletionRecord,
  DebtPayment,
  DEFAULT_CATEGORIES,
  DEFAULT_FINANCIAL_SETTINGS,
  FinancialSettings,
  HouseholdData,
  HouseholdMember,
  MonthlyDeposit,
  PrivateEntry,
  Profile,
  RecurringBill,
  SharedDebt,
  Transaction,
  createInitialData,
  depositDocumentId,
  hasValidAllowanceSplit,
  normalizeFinancialSettings,
  uniqueMonthlyDeposits,
} from "@/lib/household";
import { getFirebaseServices } from "@/lib/firebase";

type SharedDocument = {
  id?: string;
  docId: string;
  type?: string;
  items?: unknown;
  categories?: unknown;
  budgets?: unknown;
  financialSettings?: unknown;
  [key: string]: unknown;
};

function withoutDocId<T>(documents: SharedDocument[]): T[] {
  return documents.map(({ docId: _docId, ...data }) => data as T);
}

export const HOUSEHOLD_ID = "casaemharmonia";
const SHARED_DOCS = ["households", HOUSEHOLD_ID, "shared"] as const;

function getDb(): Firestore {
  const services = getFirebaseServices();
  if (!services) throw new Error("Firebase ainda não está configurado.");
  return services.db;
}

function sharedRef(id: string) {
  return doc(getDb(), ...SHARED_DOCS, id);
}

function sharedCollection() {
  return collection(getDb(), ...SHARED_DOCS);
}

export function subscribeMember(
  uid: string,
  onMember: (member: HouseholdMember | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const memberRef = doc(getDb(), "households", HOUSEHOLD_ID, "members", uid);
  return onSnapshot(memberRef, (snapshot) => {
    if (!snapshot.exists()) {
      onMember(null);
      return;
    }
    const value = snapshot.data();
    const profile = value.profile;
    if (profile !== "Douglas Alexander" && profile !== "Bruna Toth") {
      onMember(null);
      return;
    }
    onMember({ uid, profile, active: value.active === true });
  }, (error) => onError(error));
}

export function subscribeHouseholdData(
  onData: (data: HouseholdData) => void,
  onReady: () => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const defaults = createInitialData();
  return onSnapshot(sharedCollection(), (snapshot) => {
    const docs: SharedDocument[] = snapshot.docs.map((item) => ({ ...item.data(), docId: item.id } as SharedDocument));
    const config = docs.find((item) => item.docId === "settings");
    const transactions = withoutDocId<Transaction>(docs.filter((item) => item.type === "transaction"));
    const bills = withoutDocId<RecurringBill>(docs.filter((item) => item.type === "bill"));
    const billPayments = withoutDocId<BillPayment>(docs.filter((item) => item.type === "billPayment"));
    const sharedDebts = withoutDocId<SharedDebt>(docs.filter((item) => item.type === "sharedDebt"));
    const debtPayments = withoutDocId<DebtPayment>(docs.filter((item) => item.type === "debtPayment"));
    const deposits = uniqueMonthlyDeposits(docs.filter((item) => item.type === "deposit")
      .map(({ docId, ...item }) => ({ ...item, id: docId }) as MonthlyDeposit));
    const completions: HouseholdData["completions"] = {};
    for (const item of docs.filter((docValue) => docValue.type === "taskCompletions")) {
      const items = item.items && typeof item.items === "object" ? item.items as Record<string, CompletionRecord> : {};
      Object.assign(completions, items);
    }
    const data: HouseholdData = {
      ...defaults,
      transactions,
      bills,
      billPayments,
      sharedDebts,
      debtPayments,
      deposits,
      completions,
      categories: Array.isArray(config?.categories) ? config.categories as string[] : defaults.categories,
      budgets: config?.budgets && typeof config.budgets === "object" ? config.budgets as Record<string, number> : {},
      financialSettings: normalizeFinancialSettings(config?.financialSettings),
    };
    onData(data);
    onReady();
  }, (error) => onError(error));
}

export function subscribePrivateEntries(
  uid: string,
  onEntries: (entries: PrivateEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const privateItems = collection(getDb(), "users", uid, "private");
  return onSnapshot(privateItems, (snapshot) => {
    onEntries(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as PrivateEntry)));
  }, (error) => onError(error));
}

export async function saveHouseholdSettings(
  financialSettings: FinancialSettings,
  categories?: string[],
  budgets?: Record<string, number>,
): Promise<void> {
  if (!hasValidAllowanceSplit(financialSettings)) {
    throw new Error("A divisão das mesadas deve somar exatamente 100%.");
  }
  const payload: Record<string, unknown> = {
    type: "settings",
    financialSettings: normalizeFinancialSettings(financialSettings),
  };
  if (categories) payload.categories = categories;
  if (budgets) payload.budgets = budgets;
  await setDoc(sharedRef("settings"), payload, { merge: true });
}

export async function saveBudgets(budgets: Record<string, number>, categories: string[]): Promise<void> {
  const settingsRef = sharedRef("settings");
  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(settingsRef);
    const financialSettings = normalizeFinancialSettings(snapshot.exists() ? snapshot.data().financialSettings : DEFAULT_FINANCIAL_SETTINGS);
    transaction.set(settingsRef, { type: "settings", financialSettings, budgets, categories }, { merge: true });
  });
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  const db = getDb();
  const transactionRef = sharedRef(`transaction_${transaction.id}`);
  const settingsRef = sharedRef("settings");
  await runTransaction(db, async (firestoreTransaction) => {
    const settingsSnapshot = await firestoreTransaction.get(settingsRef);
    const existingCategories = settingsSnapshot.exists() && Array.isArray(settingsSnapshot.data().categories)
      ? settingsSnapshot.data().categories as string[]
      : DEFAULT_CATEGORIES;
    const categories = [...new Set([...existingCategories, transaction.category])];
    firestoreTransaction.set(transactionRef, { ...transaction, type: "transaction" });
    const financialSettings = normalizeFinancialSettings(settingsSnapshot.exists() ? settingsSnapshot.data().financialSettings : DEFAULT_FINANCIAL_SETTINGS);
    firestoreTransaction.set(settingsRef, { type: "settings", financialSettings, categories }, { merge: true });
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(sharedRef(`transaction_${id}`));
}

export async function saveBill(bill: RecurringBill): Promise<void> {
  await setDoc(sharedRef(`bill_${bill.id}`), { ...bill, type: "bill" });
}

export async function deleteBill(id: string): Promise<void> {
  await deleteDoc(sharedRef(`bill_${id}`));
}

export async function saveBillPayment(payment: BillPayment): Promise<void> {
  await setDoc(sharedRef(`billPayment_${payment.id}`), { ...payment, type: "billPayment" });
}

export async function saveSharedDebt(debt: SharedDebt): Promise<void> {
  await setDoc(sharedRef(`sharedDebt_${debt.id}`), { ...debt, type: "sharedDebt" });
}

export async function deleteSharedDebt(id: string): Promise<void> {
  await deleteDoc(sharedRef(`sharedDebt_${id}`));
}

export async function saveDebtPayment(payment: DebtPayment): Promise<void> {
  const db = getDb();
  const paymentRef = sharedRef(`debtPayment_${payment.id}`);
  const debtRef = sharedRef(`sharedDebt_${payment.debtId}`);
  await runTransaction(db, async (transaction) => {
    const [paymentSnapshot, debtSnapshot] = await Promise.all([transaction.get(paymentRef), transaction.get(debtRef)]);
    const oldAmount = paymentSnapshot.exists() ? Number(paymentSnapshot.data().amount ?? 0) : 0;
    const balance = debtSnapshot.exists() ? Number(debtSnapshot.data().currentBalance ?? 0) : 0;
    transaction.set(paymentRef, { ...payment, type: "debtPayment" });
    if (debtSnapshot.exists()) {
      transaction.set(debtRef, { currentBalance: Math.max(0, balance + oldAmount - payment.amount) }, { merge: true });
    }
  });
}

export async function saveMonthlyDeposit(deposit: MonthlyDeposit): Promise<void> {
  await setDoc(sharedRef(depositDocumentId(deposit)), { ...deposit, type: "deposit" });
}

export async function toggleTaskCompletion(key: string, profile: Profile, uid: string): Promise<void> {
  const month = key.split(":")[1]?.slice(0, 7);
  if (!month) throw new Error("A data desta tarefa não foi reconhecida.");
  const ref = sharedRef(`task_${month}`);
  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(ref);
    const items = snapshot.exists() && snapshot.data().items && typeof snapshot.data().items === "object"
      ? { ...snapshot.data().items as Record<string, CompletionRecord> }
      : {};
    if (items[key]) delete items[key];
    else items[key] = { by: profile, uid, completedAt: new Date().toISOString() };
    transaction.set(ref, { type: "taskCompletions", month, items });
  });
}

export async function savePrivateEntry(uid: string, entry: PrivateEntry): Promise<void> {
  await setDoc(doc(getDb(), "users", uid, "private", entry.id), entry);
}

export async function savePrivateDebtPayment(uid: string, entry: PrivateEntry, month: string, amount: number): Promise<void> {
  const db = getDb();
  const ref = doc(db, "users", uid, "private", entry.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("A dívida privada não foi encontrada.");
    const current = snapshot.data() as PrivateEntry;
    const payments = { ...(current.payments || {}) };
    const previousPayment = Number(payments[month] || 0);
    payments[month] = amount;
    const balance = Math.max(0, Number(current.balance || 0) + previousPayment - amount);
    transaction.set(ref, { ...current, payments, balance });
  });
}

export async function deletePrivateEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), "users", uid, "private", id));
}

export async function importSharedBackup(data: HouseholdData, uid: string): Promise<void> {
  if (!hasValidAllowanceSplit(data.financialSettings)) {
    throw new Error("O backup precisa ter percentuais de mesada que somem 100%.");
  }
  const ownDeposits = uniqueMonthlyDeposits(data.deposits.filter((item) => item.uid === uid));
  const operations: Array<{ id: string; value: Record<string, unknown> }> = [
    { id: "settings", value: { type: "settings", categories: data.categories, budgets: data.budgets, financialSettings: normalizeFinancialSettings(data.financialSettings) } },
    ...data.transactions.map((item) => ({ id: `transaction_${item.id}`, value: { ...item, type: "transaction" } })),
    ...data.bills.map((item) => ({ id: `bill_${item.id}`, value: { ...item, type: "bill" } })),
    ...data.billPayments.map((item) => ({ id: `billPayment_${item.id}`, value: { ...item, type: "billPayment" } })),
    ...data.sharedDebts.map((item) => ({ id: `sharedDebt_${item.id}`, value: { ...item, type: "sharedDebt" } })),
    ...data.debtPayments.map((item) => ({ id: `debtPayment_${item.id}`, value: { ...item, type: "debtPayment" } })),
    ...ownDeposits.map((item) => ({ id: depositDocumentId(item), value: { ...item, type: "deposit" } })),
  ];
  const completionsByMonth = new Map<string, Record<string, CompletionRecord>>();
  for (const [key, value] of Object.entries(data.completions)) {
    const month = key.split(":")[1]?.slice(0, 7);
    if (!month) continue;
    const items = completionsByMonth.get(month) ?? {};
    items[key] = value;
    completionsByMonth.set(month, items);
  }
  for (const [month, items] of completionsByMonth) {
    operations.push({ id: `task_${month}`, value: { type: "taskCompletions", month, items } });
  }
  for (let start = 0; start < operations.length; start += 400) {
    const batch = writeBatch(getDb());
    for (const operation of operations.slice(start, start + 400)) batch.set(sharedRef(operation.id), operation.value, { merge: true });
    await batch.commit();
  }
}
