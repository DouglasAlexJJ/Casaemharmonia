"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  HouseholdData,
  BillPayment,
  DebtPayment,
  MonthlyDeposit,
  Profile,
  ReserveContribution,
  Transaction,
  TransactionType,
  monthKey,
} from "@/lib/household";
import Icon from "@/components/icon";

type TransactionDraft = Omit<Transaction, "id" | "createdBy" | "createdByUid">;

type FinanceViewProps = {
  data: HouseholdData;
  profile: Profile;
  month: Date;
  onMonthChange: (date: Date) => void;
  onCreateTransaction: (draft: TransactionDraft) => void;
  uid: string;
  onSaveTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSaveDeposit: (deposit: MonthlyDeposit) => void;
  onDeleteDeposit: (id: string) => void;
  onSaveReserveContribution: (contribution: ReserveContribution) => void;
  onDeleteReserveContribution: (id: string) => void;
  onSaveBillPayment: (payment: BillPayment) => void;
  onDeleteBillPayment: (id: string) => void;
  onSaveDebtPayment: (payment: DebtPayment) => void;
  onDeleteDebtPayment: (id: string) => void;
  onSaveBudgets: (budgets: Record<string, number>, categories: string[]) => void;
};

type LedgerKind = "transaction" | "deposit" | "reserve" | "bill" | "debt";
type LedgerRow = { kind: LedgerKind; id: string; date: string; label: string; category: string; amount: number; direction: "income" | "expense"; source: Transaction | MonthlyDeposit | ReserveContribution | BillPayment | DebtPayment; editable: boolean };

const PALETTE = ["#283d67", "#d99b54", "#848b98", "#b66550", "#5c7c9c", "#aa9bb0", "#9b824f", "#c7c4b8"];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatMoney(value: number) {
  return currency.format(value);
}

function monthlyOutflows(data: HouseholdData, key: string) {
  const transactions = data.transactions
    .filter((item) => item.type === "expense" && item.date.slice(0, 7) === key)
    .reduce((sum, item) => sum + item.amount, 0);
  const bills = data.billPayments
    .filter((item) => item.month === key && data.bills.some((bill) => bill.id === item.billId))
    .reduce((sum, item) => sum + item.amount, 0);
  const debts = data.debtPayments
    .filter((item) => item.month === key && data.sharedDebts.some((debt) => debt.id === item.debtId))
    .reduce((sum, item) => sum + item.amount, 0);
  const reserve = data.reserveContributions.filter((item) => item.month === key).reduce((sum, item) => sum + item.amount, 0);
  return transactions + bills + debts + reserve;
}

function categoryOutflows(data: HouseholdData, key: string, category: string) {
  const transactions = data.transactions
    .filter((item) => item.type === "expense" && item.date.slice(0, 7) === key && item.category === category)
    .reduce((sum, item) => sum + item.amount, 0);
  const billIds = new Set(data.bills.filter((bill) => bill.category === category).map((bill) => bill.id));
  const bills = data.billPayments
    .filter((item) => item.month === key && data.bills.some((bill) => bill.id === item.billId) && (item.category === category || (!item.category && billIds.has(item.billId))))
    .reduce((sum, item) => sum + item.amount, 0);
  const debts = category === "Dívidas"
    ? data.debtPayments.filter((item) => item.month === key && data.sharedDebts.some((debt) => debt.id === item.debtId)).reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const reserve = category === "Reserva de emergência"
    ? data.reserveContributions.filter((item) => item.month === key).reduce((sum, item) => sum + item.amount, 0)
    : 0;
  return transactions + bills + debts + reserve;
}

function formatDay(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function TransactionModal({
  categories,
  profile,
  onClose,
  onSave,
}: {
  categories: string[];
  profile: Profile;
  onClose: () => void;
  onSave: (draft: TransactionDraft) => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localDateValue());
  const [category, setCategory] = useState(categories[0] ?? "Outros");
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const finalCategory = addingCategory ? newCategory.trim() : category;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(",", "."));
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !finalCategory || !date) return;
    onSave({ type, amount: parsedAmount, date, description: description.trim(), category: finalCategory });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Novo lançamento</p>
            <h2 id="transaction-title">O que aconteceu?</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <div className="segmented-control" aria-label="Tipo de lançamento">
            <button type="button" className={type === "expense" ? "segment active expense" : "segment"} onClick={() => setType("expense")}><Icon name="arrowDown" size={16} /> Despesa</button>
            <button type="button" className={type === "income" ? "segment active income" : "segment"} onClick={() => setType("income")}><Icon name="arrowUp" size={16} /> Receita</button>
          </div>
          {type === "income" && <p className="form-note">Pagamentos recebidos são registrados em Configurações, com histórico por pessoa e competência.</p>}
          <label className="field-label">Descrição
            <input autoFocus required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: mercado da semana" />
          </label>
          <div className="form-grid two-columns">
            <label className="field-label">Valor
              <div className="money-input"><span>R$</span><input required inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div>
            </label>
            <label className="field-label">Data
              <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
          <div className="field-label">
            <div className="label-row"><span>Categoria</span><button type="button" className="text-action" onClick={() => { setAddingCategory((value) => !value); setNewCategory(""); }}>{addingCategory ? "Escolher existente" : "+ Criar categoria"}</button></div>
            {addingCategory ? <input autoFocus value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nome da nova categoria" /> : <select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
          </div>
          <div className="form-note"><span className="avatar tiny">{profile === "Douglas Alexander" ? "D" : "B"}</span> Registrado por <strong>{profile}</strong></div>
          <button className="button button-primary full-button" type="submit"><Icon name="plus" size={17} /> Salvar lançamento</button>
        </form>
      </section>
    </div>
  );
}

function BudgetModal({
  data,
  onClose,
  onSave,
}: {
  data: HouseholdData;
  onClose: () => void;
  onSave: (budgets: Record<string, number>, categories: string[]) => void;
}) {
  const [categories, setCategories] = useState(data.categories);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(data.categories.map((item) => [item, String(data.budgets[item] ?? "")])),
  );
  const [newCategory, setNewCategory] = useState("");

  function addCategory() {
    const clean = newCategory.trim();
    if (!clean || categories.some((item) => item.toLocaleLowerCase() === clean.toLocaleLowerCase())) return;
    setCategories((items) => [...items, clean]);
    setDrafts((current) => ({ ...current, [clean]: "" }));
    setNewCategory("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budgets = Object.fromEntries(
      categories
        .map((item) => [item, Number((drafts[item] ?? "").replace(",", "."))] as const)
        .filter(([, amount]) => Number.isFinite(amount) && amount > 0),
    );
    onSave(budgets, categories);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card budget-modal" role="dialog" aria-modal="true" aria-labelledby="budget-title">
        <div className="modal-heading">
          <div><p className="eyebrow">Planejamento do mês</p><h2 id="budget-title">Limites por categoria</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button>
        </div>
        <p className="modal-copy">Defina um teto mensal. Deixe em branco as categorias sem limite.</p>
        <form className="form-stack" onSubmit={submit}>
          <div className="budget-input-list">
            {categories.map((item, index) => <label className="budget-input-row" key={item}><span><i className="category-dot" style={{ background: PALETTE[index % PALETTE.length] }} />{item}</span><div className="money-input compact"><span>R$</span><input inputMode="decimal" type="number" min="0" step="0.01" value={drafts[item] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [item]: event.target.value }))} placeholder="Sem limite" /></div></label>)}
          </div>
          <div className="add-category-row"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Adicionar categoria" /><button type="button" className="button button-soft" onClick={addCategory}><Icon name="plus" size={16} /> Adicionar</button></div>
          <button className="button button-primary full-button" type="submit">Salvar limites</button>
        </form>
      </section>
    </div>
  );
}

export default function FinanceView({
  data,
  profile,
  month,
  onMonthChange,
  onCreateTransaction,
  uid,
  onSaveTransaction,
  onDeleteTransaction,
  onSaveDeposit,
  onDeleteDeposit,
  onSaveReserveContribution,
  onDeleteReserveContribution,
  onSaveBillPayment,
  onDeleteBillPayment,
  onSaveDebtPayment,
  onDeleteDebtPayment,
  onSaveBudgets,
}: FinanceViewProps) {
  const [showTransaction, setShowTransaction] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [ledgerEditing, setLedgerEditing] = useState<LedgerRow | null>(null);
  const [ledgerDraft, setLedgerDraft] = useState({ amount: "", date: "", label: "", category: "", bankBalance: "" });
  const currentMonth = monthKey(month);
  const monthTransactions = useMemo(
    () => data.transactions.filter((item) => item.date.slice(0, 7) === currentMonth),
    [data.transactions, currentMonth],
  );
  const monthDeposits = data.deposits.filter((item) => item.month === currentMonth);
  const incomeTransactions = monthTransactions.filter((item) => item.type === "income");
  const expenseTransactions = monthTransactions.filter((item) => item.type === "expense");
  const billPaymentsThisMonth = data.billPayments.filter((item) => item.month === currentMonth && data.bills.some((bill) => bill.id === item.billId));
  const debtPaymentsThisMonth = data.debtPayments.filter((item) => item.month === currentMonth && data.sharedDebts.some((debt) => debt.id === item.debtId));
  const income = incomeTransactions.reduce((sum, item) => sum + item.amount, 0) + monthDeposits.reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthlyOutflows(data, currentMonth);
  const balance = income - expenses;
  const categorySpending = data.categories.map((category, index) => ({
    category,
    color: PALETTE[index % PALETTE.length],
    amount: categoryOutflows(data, currentMonth, category),
  })).filter((item) => item.amount > 0);
  if (!data.categories.includes("Reserva de emergência")) {
    const reserveTotal = data.reserveContributions.filter((item) => item.month === currentMonth).reduce((sum, item) => sum + item.amount, 0);
    if (reserveTotal > 0) categorySpending.push({ category: "Reserva de emergência", color: PALETTE[6], amount: reserveTotal });
  }
  categorySpending.sort((a, b) => b.amount - a.amount);
  const totalCategorySpending = categorySpending.reduce((sum, item) => sum + item.amount, 0);
  let cursor = 0;
  const donutGradient = totalCategorySpending === 0
    ? "conic-gradient(#e9e8e1 0deg 360deg)"
    : `conic-gradient(${categorySpending.map((item) => {
        const start = cursor;
        cursor += (item.amount / totalCategorySpending) * 360;
        return `${item.color} ${start}deg ${cursor}deg`;
  }).join(", ")})`;
  const budgetRows = data.categories.map((category, index) => {
    const spent = categoryOutflows(data, currentMonth, category);
    return { category, spent, budget: data.budgets[category] ?? 0, color: PALETTE[index % PALETTE.length] };
  }).filter((row) => row.budget > 0).sort((a, b) => b.spent / b.budget - a.spent / a.budget);
  const overBudget = budgetRows.find((row) => row.spent > row.budget);
  const nearBudget = budgetRows.find((row) => row.spent <= row.budget && row.spent / row.budget >= 0.8);
  const ledgerRows: LedgerRow[] = [
    ...monthTransactions.map((item): LedgerRow => ({ kind: "transaction", id: item.id, date: item.date, label: item.description, category: item.category, amount: item.amount, direction: item.type, source: item, editable: true })),
    ...monthDeposits.map((item): LedgerRow => ({ kind: "deposit", id: item.id, date: item.receivedOn, label: `Pagamento recebido · ${item.profile.split(" ")[0]}`, category: "Salário recebido", amount: item.amount, direction: "income", source: item, editable: item.uid === uid })),
    ...data.reserveContributions.filter((item) => item.month === currentMonth).map((item): LedgerRow => ({ kind: "reserve", id: item.id, date: item.depositedOn, label: `Aporte para reserva · saldo no banco ${formatMoney(item.bankBalance)}`, category: "Reserva de emergência", amount: item.amount, direction: "expense", source: item, editable: item.recordedByUid === uid })),
    ...billPaymentsThisMonth.map((item): LedgerRow => ({ kind: "bill", id: item.id, date: item.paidOn, label: data.bills.find((bill) => bill.id === item.billId)?.name ?? "Pagamento de conta (cadastro removido)", category: item.category ?? "Contas", amount: item.amount, direction: "expense", source: item, editable: true })),
    ...debtPaymentsThisMonth.map((item): LedgerRow => ({ kind: "debt", id: item.id, date: item.paidOn, label: data.sharedDebts.find((debt) => debt.id === item.debtId)?.name ?? "Pagamento de dívida", category: "Dívidas", amount: item.amount, direction: "expense", source: item, editable: true })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth() - 5 + index, 1);
    const key = monthKey(date);
    const value = monthlyOutflows(data, key);
    return { label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), value, key, current: key === currentMonth };
  });
  const trendMax = Math.max(...trend.map((item) => item.value), 1);

  function shiftMonth(delta: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  function saveTransaction(draft: TransactionDraft) {
    onCreateTransaction(draft);
    setShowTransaction(false);
  }

  function beginLedgerEdit(row: LedgerRow) {
    setLedgerEditing(row);
    const bankBalance = row.kind === "reserve" ? String((row.source as ReserveContribution).bankBalance) : "";
    setLedgerDraft({ amount: String(row.amount), date: row.date, label: row.label, category: row.category, bankBalance });
  }

  function saveLedgerEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ledgerEditing) return;
    const amount = Number(ledgerDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0 || !ledgerDraft.date) return;
    const month = ledgerDraft.date.slice(0, 7);
    switch (ledgerEditing.kind) {
      case "transaction": {
        const original = ledgerEditing.source as Transaction;
        onSaveTransaction({ ...original, amount, date: ledgerDraft.date, description: ledgerDraft.label.trim(), category: ledgerDraft.category.trim() });
        break;
      }
      case "deposit": {
        const original = ledgerEditing.source as MonthlyDeposit;
        onSaveDeposit({ ...original, amount, receivedOn: ledgerDraft.date, month });
        break;
      }
      case "reserve": {
        const original = ledgerEditing.source as ReserveContribution;
        const bankBalance = Number(ledgerDraft.bankBalance);
        if (!Number.isFinite(bankBalance) || bankBalance < 0) return;
        onSaveReserveContribution({ ...original, amount, depositedOn: ledgerDraft.date, month, bankBalance, recordedAt: new Date().toISOString() });
        break;
      }
      case "bill": {
        const original = ledgerEditing.source as BillPayment;
        onSaveBillPayment({ ...original, amount, paidOn: ledgerDraft.date, month });
        break;
      }
      case "debt": {
        const original = ledgerEditing.source as DebtPayment;
        onSaveDebtPayment({ ...original, amount, paidOn: ledgerDraft.date, month });
        break;
      }
    }
    setLedgerEditing(null);
  }

  function deleteLedgerRow(row: LedgerRow) {
    const label = `Excluir “${row.label}” (${formatMoney(row.amount)})?`;
    if (!window.confirm(label)) return;
    if (row.kind === "transaction") onDeleteTransaction(row.id);
    else if (row.kind === "deposit") onDeleteDeposit(row.id);
    else if (row.kind === "reserve") onDeleteReserveContribution(row.id);
    else if (row.kind === "bill") onDeleteBillPayment(row.id);
    else onDeleteDebtPayment(row.id);
  }

  return (
    <div className="view-content">
      <div className="page-heading finance-heading">
        <div><p className="eyebrow">FINANÇAS DA CASA</p><h1>Dinheiro com mais <em>clareza.</em></h1><p className="page-subtitle">Um retrato tranquilo do que entra, sai e fica para vocês.</p></div>
        <button className="button button-primary desktop-add" onClick={() => setShowTransaction(true)}><Icon name="plus" size={17} /> Novo lançamento</button>
      </div>

      <div className="month-toolbar">
        <div className="month-navigator">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior"><Icon name="chevronLeft" /></button>
          <span>{monthNames[month.getMonth()]} <strong>{month.getFullYear()}</strong></span>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Próximo mês"><Icon name="chevronRight" /></button>
        </div>
        <span className="updated-label"><span className="status-dot" /> Seus números, no seu ritmo</span>
      </div>

      <section className="summary-grid" aria-label="Resumo mensal">
        <article className="summary-card income-card"><div className="summary-top"><span>Entradas</span><span className="summary-icon income-icon"><Icon name="arrowDown" size={16} /></span></div><strong>{formatMoney(income)}</strong><small>{monthDeposits.length} depósitos · {incomeTransactions.length} outras entradas</small></article>
        <article className="summary-card expense-card"><div className="summary-top"><span>Saídas e aportes reais</span><span className="summary-icon expense-icon"><Icon name="arrowUp" size={16} /></span></div><strong>{formatMoney(expenses)}</strong><small>{expenseTransactions.length} despesas · {billPaymentsThisMonth.length + debtPaymentsThisMonth.length} contas/parcelas · {data.reserveContributions.filter((item) => item.month === currentMonth).length} aportes</small></article>
        <article className="summary-card balance-card"><div className="summary-top"><span>Saldo do mês</span><span className="summary-icon balance-icon"><Icon name="layers" size={16} /></span></div><strong className={balance < 0 ? "negative-value" : ""}>{formatMoney(balance)}</strong><small>{balance >= 0 ? "Entradas menos saídas registradas" : "As saídas passaram das entradas"}</small></article>
      </section>

      <section className="charts-grid">
        <article className="panel chart-panel category-panel">
          <div className="panel-heading"><div><p className="eyebrow">VISÃO POR CATEGORIA</p><h2>Para onde vai o dinheiro</h2></div><span className="panel-period">Este mês</span></div>
          {categorySpending.length ? <div className="donut-layout"><div className="donut-wrap"><div className="donut-chart" style={{ background: donutGradient }}><div className="donut-center"><span>Saídas</span><strong>{formatMoney(expenses)}</strong></div></div></div><div className="legend-list">{categorySpending.slice(0, 6).map((item) => <div className="legend-item" key={item.category}><span><i className="category-dot" style={{ background: item.color }} />{item.category}</span><strong>{formatMoney(item.amount)}</strong></div>)}</div></div> : <div className="empty-chart"><div className="empty-chart-mark"><Icon name="layers" size={20} /></div><strong>Seu mês começa por aqui</strong><span>Quando houver despesas, elas aparecem organizadas por categoria.</span><button className="text-action" onClick={() => setShowTransaction(true)}>Adicionar primeiro lançamento <span aria-hidden="true">→</span></button></div>}
        </article>

        <article className="panel chart-panel trend-panel">
          <div className="panel-heading"><div><p className="eyebrow">OLHANDO PARA FRENTE</p><h2>Tendência de gastos</h2></div><span className="panel-icon"><Icon name="trend" size={18} /></span></div>
          <div className="trend-summary"><strong>{formatMoney(expenses)}</strong><span>total deste mês</span></div>
          <div className="trend-chart" role="img" aria-label="Gráfico de gastos dos últimos seis meses">
            {trend.map((item) => <div className="trend-column" key={item.key}><span className="trend-value">{item.value > 0 ? formatMoney(item.value) : ""}</span><div className="trend-track"><div className={item.current ? "trend-bar current" : "trend-bar"} style={{ height: `${Math.max(item.value > 0 ? 8 : 3, (item.value / trendMax) * 100)}%` }} /></div><span className={item.current ? "trend-label current-label" : "trend-label"}>{item.label}</span></div>)}
          </div>
        </article>
      </section>

      <section className="panel budget-panel">
        <div className="panel-heading budget-heading"><div><p className="eyebrow">SEUS COMBINADOS DO MÊS</p><h2>Orçamento por categoria</h2><p className="panel-description">Acompanhe o planejado sem perder de vista o que já foi usado.</p></div><button className="button button-soft" onClick={() => setShowBudgets(true)}><Icon name="target" size={16} /> Editar limites</button></div>
        {budgetRows.length ? <div className="budget-list">{budgetRows.map((row) => {
          const ratio = row.spent / row.budget;
          const percent = Math.round(ratio * 100);
          const remaining = Math.max(row.budget - row.spent, 0);
          const over = row.spent > row.budget;
          return <div className="budget-row" key={row.category}><div className="budget-row-top"><span><i className="category-dot" style={{ background: row.color }} />{row.category}</span><strong className={over ? "over-budget-text" : ""}>{formatMoney(row.spent)} <small>/ {formatMoney(row.budget)}</small></strong></div><div className="budget-progress"><span className={over ? "over-progress" : ""} style={{ width: `${Math.min(percent, 100)}%`, background: over ? "#b8624e" : row.color }} /></div><div className="budget-foot"><span>{over ? `Passou ${formatMoney(row.spent - row.budget)}` : `Restam ${formatMoney(remaining)}`}</span><span className={over ? "over-budget-text" : ""}>{percent}%</span></div></div>;
        })}</div> : <div className="budget-empty"><div className="budget-empty-copy"><span className="budget-empty-icon"><Icon name="target" size={18} /></span><div><strong>Nenhum limite definido ainda</strong><span>Crie um teto para as categorias que vocês querem acompanhar.</span></div></div><button className="button button-primary" onClick={() => setShowBudgets(true)}>Definir meu primeiro limite <Icon name="chevronRight" size={16} /></button></div>}
      </section>

      <section className="lower-grid">
        <article className="panel insights-panel"><div className="panel-heading"><div><p className="eyebrow">UM OLHAR ATENTO</p><h2>Insights da casa</h2></div><span className="insight-spark"><Icon name="spark" size={18} /></span></div>
          {overBudget ? <div className="insight-message warning-insight"><span className="insight-bullet">!</span><p><strong>{overBudget.category}</strong> está <strong>{Math.round(((overBudget.spent - overBudget.budget) / overBudget.budget) * 100)}% acima</strong> do limite deste mês. Talvez valha olhar os próximos gastos com calma.</p></div> : nearBudget ? <div className="insight-message"><span className="insight-bullet">↗</span><p><strong>{nearBudget.category}</strong> já usou {Math.round((nearBudget.spent / nearBudget.budget) * 100)}% do limite. Ainda restam {formatMoney(nearBudget.budget - nearBudget.spent)} para o mês.</p></div> : budgetRows.length ? <div className="insight-message"><span className="insight-bullet">✓</span><p>Por enquanto, todas as categorias estão dentro dos limites definidos. Um passo de cada vez.</p></div> : <div className="insight-message"><span className="insight-bullet">i</span><p>Definam os limites que fazem sentido para a casa. A gente avisa quando alguma categoria estiver perto ou acima do teto.</p></div>}
        </article>
      </section>
      <section className="panel activity-panel ledger-panel">
        <div className="panel-heading"><div><p className="eyebrow">EXTRATO DA COMPETÊNCIA</p><h2>Histórico de lançamentos</h2><p className="panel-description">Inclui despesas, pagamentos de contas e dívidas, valores recebidos e aportes da reserva. Edite ou exclua direto por aqui.</p></div><strong className="ledger-count">{ledgerRows.length} registros</strong></div>
        {ledgerEditing && <form className="ledger-editor" onSubmit={saveLedgerEdit}>
          <div className="ledger-editor-heading"><strong>Editar: {ledgerEditing.label}</strong><button className="text-action" type="button" onClick={() => setLedgerEditing(null)}>Cancelar</button></div>
          <label className="field-label"><span>{ledgerEditing.direction === "income" ? "Valor recebido" : "Valor lançado"}</span><div className="money-input"><span>R$</span><input required type="number" min="0.01" step="0.01" value={ledgerDraft.amount} onChange={(event) => setLedgerDraft((draft) => ({ ...draft, amount: event.target.value }))} /></div></label>
          <label className="field-label"><span>Data</span><input required type="date" value={ledgerDraft.date} onChange={(event) => setLedgerDraft((draft) => ({ ...draft, date: event.target.value }))} /></label>
          {ledgerEditing.kind === "transaction" && <><label className="field-label"><span>Descrição</span><input required value={ledgerDraft.label} onChange={(event) => setLedgerDraft((draft) => ({ ...draft, label: event.target.value }))} /></label><label className="field-label"><span>Categoria</span><select value={ledgerDraft.category} onChange={(event) => setLedgerDraft((draft) => ({ ...draft, category: event.target.value }))}>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></label></>}
          {ledgerEditing.kind === "reserve" && <label className="field-label"><span>Saldo da reserva informado pelo banco</span><div className="money-input"><span>R$</span><input required type="number" min="0" step="0.01" value={ledgerDraft.bankBalance} onChange={(event) => setLedgerDraft((draft) => ({ ...draft, bankBalance: event.target.value }))} /></div></label>}
          <button className="button button-primary" type="submit">Salvar alterações</button>
        </form>}
        {ledgerRows.length ? <div className="ledger-list">{ledgerRows.map((row) => <article className="ledger-row" key={`${row.kind}:${row.id}`}><span className={`recent-icon ${row.direction === "income" ? "recent-income" : "recent-expense"}`}><Icon name={row.direction === "income" ? "arrowDown" : "arrowUp"} size={15} /></span><div className="recent-description"><strong>{row.label}</strong><span>{row.category} · {formatDay(row.date)} · {row.kind === "transaction" ? (row.source as Transaction).createdBy.split(" ")[0] : row.kind === "deposit" ? (row.source as MonthlyDeposit).profile.split(" ")[0] : row.kind === "reserve" ? (row.source as ReserveContribution).recordedBy.split(" ")[0] : row.kind === "bill" ? "Conta" : "Dívida"}</span></div><strong className={row.direction === "income" ? "amount-income" : "amount-expense"}>{row.direction === "income" ? "+" : "−"}{formatMoney(row.amount)}</strong><div className="ledger-actions">{row.editable && <button className="text-action" onClick={() => beginLedgerEdit(row)}>Editar</button>}{row.editable && <button className="text-action danger-action" onClick={() => deleteLedgerRow(row)}>Excluir</button>}</div></article>)}</div> : <div className="activity-empty"><span className="activity-empty-icon"><Icon name="wallet" size={18} /></span><span>Não há movimentações nesta competência.<br />Pagamentos recebidos e aportes aparecem aqui quando registrados em Configurações.</span></div>}
      </section>
      <div className="data-note"><span className="status-dot" /> Os dados compartilhados sincronizam pelo Firebase. Registrem salários brutos e pagamentos recebidos em Configurações e evitem duplicar contas ou parcelas no lançamento manual; o backup exclui a área privada.</div>
      <button className="mobile-add-button" onClick={() => setShowTransaction(true)}><Icon name="plus" size={20} /> Novo lançamento</button>

      {showTransaction && <TransactionModal categories={data.categories} profile={profile} onClose={() => setShowTransaction(false)} onSave={saveTransaction} />}
      {showBudgets && <BudgetModal data={data} onClose={() => setShowBudgets(false)} onSave={(budgets, categories) => { onSaveBudgets(budgets, categories); setShowBudgets(false); }} />}
    </div>
  );
}
