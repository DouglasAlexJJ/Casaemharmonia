"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Icon from "@/components/icon";
import { HouseholdData, PrivateEntry, Profile, calculateMonthlyPlan, localDateKey } from "@/lib/household";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const newId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type PrivateFinanceProps = {
  data: HouseholdData;
  entries: PrivateEntry[];
  month: string;
  profile: Profile;
  onChangeMonth: (month: string) => void;
  onSaveEntry: (entry: PrivateEntry) => void;
  onDeleteEntry: (id: string) => void;
  onSaveDebtPayment: (entry: PrivateEntry, month: string, amount: number) => void;
};

type EntryDraft = {
  id?: string;
  kind: "expense" | "debt";
  title: string;
  amount: string;
  month: string;
  date: string;
  category: string;
  balance: string;
  monthlyPayment: string;
  dueDate: string;
  note: string;
};

function monthTitle(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function PrivateFinanceView({ data, entries, month, profile, onChangeMonth, onSaveEntry, onDeleteEntry, onSaveDebtPayment }: PrivateFinanceProps) {
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({});
  const plan = useMemo(() => calculateMonthlyPlan(data, month), [data, month]);
  const personalExpenses = entries.filter((entry) => entry.kind === "expense" && (entry.month || entry.date?.slice(0, 7)) === month);
  const personalDebts = entries.filter((entry) => entry.kind === "debt");
  const actualExpenses = personalExpenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const expectedDebtPayments = personalDebts.reduce((sum, entry) => {
    const paid = entry.payments?.[month];
    const planned = Math.min(Math.max(0, entry.monthlyPayment || 0), Math.max(0, entry.balance || 0));
    return sum + (paid ?? planned);
  }, 0);
  const allowance = plan.allowances[profile];
  const remaining = allowance - actualExpenses - expectedDebtPayments;

  useEffect(() => {
    setPaymentDrafts(Object.fromEntries(personalDebts.map((entry) => [entry.id, String(entry.payments?.[month] ?? Math.min(entry.monthlyPayment ?? 0, entry.balance ?? 0))])));
  }, [entries, month]);

  function beginNew(kind: "expense" | "debt") {
    setDraft({ id: undefined, kind, title: "", amount: "", month, date: localDateKey(new Date()), category: "Outros", balance: "", monthlyPayment: "", dueDate: "", note: "" });
  }

  function beginEdit(entry: PrivateEntry) {
    setDraft({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      amount: String(entry.amount ?? ""),
      month: entry.month || month,
      date: entry.date || localDateKey(new Date()),
      category: entry.category || "Outros",
      balance: String(entry.balance ?? ""),
      monthlyPayment: String(entry.monthlyPayment ?? ""),
      dueDate: entry.dueDate || "",
      note: entry.note || "",
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    const existing = draft.id ? entries.find((item) => item.id === draft.id) : undefined;
    const entry: PrivateEntry = draft.kind === "expense" ? {
      id: draft.id || newId(),
      kind: "expense",
      title: draft.title.trim(),
      amount: Math.max(0, Number(draft.amount) || 0),
      month: draft.month,
      date: draft.date,
      category: draft.category,
      ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
    } : {
      id: draft.id || newId(),
      kind: "debt",
      title: draft.title.trim(),
      balance: Math.max(0, Number(draft.balance) || 0),
      monthlyPayment: Math.max(0, Number(draft.monthlyPayment) || 0),
      ...(existing?.kind === "debt" && existing.payments ? { payments: existing.payments } : {}),
      ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
      ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
    };
    onSaveEntry(entry);
    setDraft(null);
  }

  function recordPayment(entry: PrivateEntry) {
    const amount = Number(paymentDrafts[entry.id]);
    if (Number.isFinite(amount) && amount >= 0) onSaveDebtPayment(entry, month, amount);
  }

  const navMonth = (delta: number) => {
    const date = new Date(`${month}-01T12:00:00`);
    date.setMonth(date.getMonth() + delta);
    onChangeMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="view-content private-view">
      <div className="page-heading private-heading"><div><p className="eyebrow">SÓ PARA {profile === "Douglas Alexander" ? "DOUGLAS" : "BRUNA"}</p><h1>Minha parte, <em>em privado.</em></h1><p className="page-subtitle">Suas despesas e dívidas pessoais ficam separadas do orçamento compartilhado.</p></div><span className="private-lock-badge"><Icon name="shield" size={15} /> Visível somente para você</span></div>

      <section className="private-summary-grid">
        <article className="planning-summary-card"><span>Mesada estimada</span><strong>{money(allowance)}</strong><small>Calculada no planejamento da casa</small></article>
        <article className="planning-summary-card"><span>Gastos pessoais neste mês</span><strong>{money(actualExpenses)}</strong><small>Registros em {monthTitle(month)}</small></article>
        <article className={`planning-summary-card ${remaining < 0 ? "planning-summary-alert" : ""}`}><span>Após parcelas e gastos</span><strong>{money(remaining)}</strong><small>Estimativa dentro da sua mesada</small></article>
      </section>

      <div className="private-toolbar"><div className="month-navigator"><button className="icon-button" onClick={() => navMonth(-1)} aria-label="Mês anterior"><Icon name="chevronLeft" /></button><strong>{monthTitle(month)}</strong><button className="icon-button" onClick={() => navMonth(1)} aria-label="Próximo mês"><Icon name="chevronRight" /></button></div><div className="private-add-actions"><button className="button button-soft" onClick={() => beginNew("expense")}><Icon name="plus" size={15} /> Despesa individual</button><button className="button button-primary" onClick={() => beginNew("debt")}><Icon name="plus" size={15} /> Dívida individual</button></div></div>

      {draft && <form className="panel private-editor" onSubmit={submit}><div className="panel-heading"><div><p className="eyebrow">REGISTRO PRIVADO</p><h2>{draft.id ? "Editar registro" : "Novo registro pessoal"}</h2></div><button className="icon-button" type="button" onClick={() => setDraft(null)} aria-label="Fechar"><Icon name="close" /></button></div><div className="private-form-grid"><label className="field-label"><span>Tipo</span><select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as EntryDraft["kind"] })}><option value="expense">Despesa individual</option><option value="debt">Dívida individual</option></select></label><label className="field-label"><span>Descrição</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={draft.kind === "debt" ? "Ex.: empréstimo pessoal" : "Ex.: compra individual"} /></label>{draft.kind === "expense" ? <><label className="field-label"><span>Valor</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" required value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div></label><label className="field-label"><span>Categoria</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label"><span>Data</span><input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value, month: event.target.value.slice(0, 7) })} /></label></> : <><label className="field-label"><span>Saldo atual</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" required value={draft.balance} onChange={(event) => setDraft({ ...draft, balance: event.target.value })} /></div></label><label className="field-label"><span>Parcela mensal pela mesada</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" required value={draft.monthlyPayment} onChange={(event) => setDraft({ ...draft, monthlyPayment: event.target.value })} /></div></label><label className="field-label"><span>Vencimento</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label></>}<label className="field-label private-note-field"><span>Observação (opcional)</span><input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label></div><div className="editor-actions"><button className="button button-primary" type="submit">Salvar só na minha área</button><button className="button button-soft" type="button" onClick={() => setDraft(null)}>Cancelar</button></div></form>}

      <section className="panel planning-panel private-records-panel"><div className="panel-heading"><div><p className="eyebrow">CONTROLE PESSOAL</p><h2>Minhas dívidas e despesas</h2></div><span className="panel-icon private-icon"><Icon name="lock" size={16} /></span></div>
        {entries.length ? <div className="private-record-list">{entries.map((entry) => {
          const paidThisMonth = entry.kind === "debt" ? entry.payments?.[month] : undefined;
          return <article className="private-record-row" key={entry.id}><div className="private-record-copy"><span className={`private-record-kind ${entry.kind === "debt" ? "private-debt-kind" : ""}`}>{entry.kind === "debt" ? "Dívida" : "Despesa"}</span><strong>{entry.title}</strong><span>{entry.kind === "debt" ? `Saldo: ${money(entry.balance || 0)} · Parcela prevista: ${money(entry.monthlyPayment || 0)}${entry.dueDate ? ` · Vence ${entry.dueDate}` : ""}` : `${entry.category || "Outros"} · ${entry.date || entry.month || "Sem data"}`}{entry.note ? ` · ${entry.note}` : ""}</span></div><div className="private-record-values"><strong>{money(entry.kind === "debt" ? (entry.balance || 0) : (entry.amount || 0))}</strong><small>{entry.kind === "debt" ? "saldo cadastrado" : "valor registrado"}</small></div>{entry.kind === "debt" && <div className="private-payment-control"><div className="money-input compact-money"><span>R$</span><input aria-label={`Parcela paga de ${entry.title}`} type="number" min="0" step="0.01" value={paymentDrafts[entry.id] ?? ""} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [entry.id]: event.target.value }))} /></div><button className={`button ${paidThisMonth !== undefined ? "button-soft" : "button-primary"}`} onClick={() => recordPayment(entry)}>{paidThisMonth !== undefined ? "Atualizar paga" : "Registrar parcela"}</button></div>}<div className="private-row-actions"><button className="text-action" onClick={() => beginEdit(entry)}>Editar</button><button className="text-action danger-action" onClick={() => { if (window.confirm(`Remover o registro “${entry.title}”?`)) onDeleteEntry(entry.id); }}>Remover</button></div></article>;
        })}</div> : <div className="planning-empty"><Icon name="lock" size={19} /><strong>Nenhum registro pessoal ainda</strong><span>Adicione aqui suas despesas e dívidas; a outra pessoa não recebe esses detalhes.</span></div>}
      </section>
      <p className="data-note private-data-note"><span className="status-dot" /> Esses registros ficam no caminho privado da sua conta Firebase e não entram no backup compartilhado.</p>
    </div>
  );
}
