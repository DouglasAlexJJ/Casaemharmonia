"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Icon from "@/components/icon";
import {
  BillPayment,
  DebtPayment,
  FinancialSettings,
  HouseholdData,
  MonthlyDeposit,
  Profile,
  RecurringBill,
  SharedDebt,
  calculateMonthlyPlan,
  localDateKey,
  monthKey,
  normalizeFinancialSettings,
} from "@/lib/household";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const newId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const monthDate = (key: string) => new Date(`${key}-01T12:00:00`);

type FinancePlanningProps = {
  data: HouseholdData;
  month: string;
  profile: Profile;
  uid: string;
  onChangeMonth: (month: string) => void;
  onSaveSettings: (settings: FinancialSettings) => void;
  onSaveDeposit: (deposit: MonthlyDeposit) => void;
  onSaveBill: (bill: RecurringBill) => void;
  onDeleteBill: (id: string) => void;
  onSaveBillPayment: (payment: BillPayment) => void;
  onSaveDebt: (debt: SharedDebt) => void;
  onDeleteDebt: (id: string) => void;
  onSaveDebtPayment: (payment: DebtPayment) => void;
  onGoPrivate: () => void;
};

type BillDraft = { id?: string; name: string; category: string; kind: "fixed" | "variable"; plannedAmount: string; dueDay: string };
type DebtDraft = { id?: string; name: string; currentBalance: string; monthlyPayment: string; dueDay: string; note: string };

const emptyBill = (category = "Moradia"): BillDraft => ({ name: "", category, kind: "fixed", plannedAmount: "", dueDay: "" });
const emptyDebt = (): DebtDraft => ({ name: "", currentBalance: "", monthlyPayment: "", dueDay: "", note: "" });

function MonthPicker({ month, onChange }: { month: string; onChange: (value: string) => void }) {
  const date = monthDate(month);
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const shift = (delta: number) => {
    const next = new Date(date.getFullYear(), date.getMonth() + delta, 1, 12);
    onChange(monthKey(next));
  };
  return <div className="month-navigator"><button className="icon-button" onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="chevronLeft" /></button><strong>{label}</strong><button className="icon-button" onClick={() => shift(1)} aria-label="Próximo mês"><Icon name="chevronRight" /></button></div>;
}

export default function FinancePlanningView({
  data,
  month,
  profile,
  uid,
  onChangeMonth,
  onSaveSettings,
  onSaveDeposit,
  onSaveBill,
  onDeleteBill,
  onSaveBillPayment,
  onSaveDebt,
  onDeleteDebt,
  onSaveDebtPayment,
  onGoPrivate,
}: FinancePlanningProps) {
  const [settingsDraft, setSettingsDraft] = useState<FinancialSettings>(() => normalizeFinancialSettings(data.financialSettings));
  const [settingsMessage, setSettingsMessage] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDate, setDepositDate] = useState(localDateKey(new Date()));
  const [billDraft, setBillDraft] = useState<BillDraft | null>(null);
  const [debtDraft, setDebtDraft] = useState<DebtDraft | null>(null);
  const [billPayments, setBillPayments] = useState<Record<string, string>>({});
  const [billDates, setBillDates] = useState<Record<string, string>>({});
  const [debtPayments, setDebtPayments] = useState<Record<string, string>>({});
  const [debtDates, setDebtDates] = useState<Record<string, string>>({});
  const plan = useMemo(() => calculateMonthlyPlan({ ...data, financialSettings: settingsDraft }, month), [data, month, settingsDraft]);
  const ownDeposit = data.deposits.find((deposit) => deposit.month === month && deposit.profile === profile);
  const allowanceTotal = settingsDraft.allowancePercentages["Douglas Alexander"] + settingsDraft.allowancePercentages["Bruna Toth"];
  const reserveProgress = settingsDraft.reserveGoal > 0 ? Math.min(100, (settingsDraft.reserveBalance / settingsDraft.reserveGoal) * 100) : 0;

  useEffect(() => {
    setSettingsDraft(normalizeFinancialSettings(data.financialSettings));
  }, [data.financialSettings]);

  useEffect(() => {
    setDepositAmount(ownDeposit ? String(ownDeposit.amount) : "");
    setDepositDate(ownDeposit?.receivedOn || localDateKey(new Date()));
  }, [month, ownDeposit?.id, ownDeposit?.amount, ownDeposit?.receivedOn]);

  useEffect(() => {
    setBillPayments(Object.fromEntries(data.bills.map((bill) => {
      const payment = data.billPayments.find((item) => item.billId === bill.id && item.month === month);
      return [bill.id, String(payment?.amount ?? bill.plannedAmount ?? "")];
    })));
    setBillDates(Object.fromEntries(data.bills.map((bill) => {
      const payment = data.billPayments.find((item) => item.billId === bill.id && item.month === month);
      return [bill.id, payment?.paidOn || localDateKey(new Date())];
    })));
    setDebtPayments(Object.fromEntries(data.sharedDebts.map((debt) => {
      const payment = data.debtPayments.find((item) => item.debtId === debt.id && item.month === month);
      return [debt.id, String(payment?.amount ?? debt.monthlyPayment ?? "")];
    })));
    setDebtDates(Object.fromEntries(data.sharedDebts.map((debt) => {
      const payment = data.debtPayments.find((item) => item.debtId === debt.id && item.month === month);
      return [debt.id, payment?.paidOn || localDateKey(new Date())];
    })));
  }, [data.bills, data.billPayments, data.sharedDebts, data.debtPayments, month]);

  function updateSettings(update: (current: FinancialSettings) => FinancialSettings) {
    setSettingsDraft((current) => update(current));
    setSettingsMessage("");
  }

  function saveSettings() {
    if (Math.round(allowanceTotal * 100) / 100 !== 100) {
      setSettingsMessage("A soma das duas porcentagens de mesada precisa ser 100%.");
      return;
    }
    onSaveSettings(settingsDraft);
    setSettingsMessage("Configurações salvas para a casa.");
  }

  function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!billDraft || !billDraft.name.trim()) return;
    onSaveBill({
      id: billDraft.id || newId(),
      name: billDraft.name.trim(),
      category: billDraft.category,
      kind: billDraft.kind,
      plannedAmount: Math.max(0, Number(billDraft.plannedAmount) || 0),
      ...(billDraft.dueDay ? { dueDay: Math.min(31, Math.max(1, Number(billDraft.dueDay))) } : {}),
    });
    setBillDraft(null);
  }

  function submitDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debtDraft || !debtDraft.name.trim()) return;
    onSaveDebt({
      id: debtDraft.id || newId(),
      name: debtDraft.name.trim(),
      currentBalance: Math.max(0, Number(debtDraft.currentBalance) || 0),
      monthlyPayment: Math.max(0, Number(debtDraft.monthlyPayment) || 0),
      ...(debtDraft.dueDay ? { dueDay: Math.min(31, Math.max(1, Number(debtDraft.dueDay))) } : {}),
      ...(debtDraft.note.trim() ? { note: debtDraft.note.trim() } : {}),
    });
    setDebtDraft(null);
  }

  function saveOwnDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < 0 || !depositDate) return;
    onSaveDeposit({
      id: ownDeposit?.id || `${month}_${uid}`,
      month,
      uid,
      profile,
      amount,
      receivedOn: depositDate,
    });
  }

  function recordBillPayment(bill: RecurringBill) {
    const amount = Number(billPayments[bill.id]);
    const paidOn = billDates[bill.id] || localDateKey(new Date());
    if (!Number.isFinite(amount) || amount < 0) return;
    onSaveBillPayment({ id: `${bill.id}_${month}`, billId: bill.id, month, amount, paidOn, category: bill.category });
  }

  function recordDebtPayment(debt: SharedDebt) {
    const amount = Number(debtPayments[debt.id]);
    const paidOn = debtDates[debt.id] || localDateKey(new Date());
    if (!Number.isFinite(amount) || amount < 0) return;
    onSaveDebtPayment({ id: `${debt.id}_${month}`, debtId: debt.id, month, amount, paidOn });
  }

  return (
    <div className="view-content planning-view">
      <div className="page-heading planning-heading">
        <div><p className="eyebrow">PLANO DA CASA</p><h1>Dinheiro com <em>combinado.</em></h1><p className="page-subtitle">Ajustem as rendas, reservem primeiro e vejam a mesada depois das contas.</p></div>
        <div className="planning-heading-actions"><span className="blocked-card-badge"><Icon name="lock" size={14} /> Cartões bloqueados</span><button className="button button-soft" onClick={onGoPrivate}><Icon name="user" size={15} /> Minha área privada</button></div>
      </div>

      <div className="month-toolbar planning-month-toolbar"><span className="eyebrow">COMPETÊNCIA</span><MonthPicker month={month} onChange={onChangeMonth} /></div>

      <section className="planning-summary-grid" aria-label="Resumo do planejamento">
        <article className="planning-summary-card"><span>Depósitos reais</span><strong>{money(plan.actualDeposits)}</strong><small>{plan.missingDeposits.length ? `Aguardando ${plan.missingDeposits.map((name) => name.split(" ")[0]).join(" e ")}` : "Os dois valores foram registrados"}</small></article>
        <article className="planning-summary-card"><span>Reserva + investimentos</span><strong>{money(plan.reserveContribution + plan.investmentContribution)}</strong><small>Com base nos percentuais definidos</small></article>
        <article className="planning-summary-card"><span>Contas e dívidas previstas</span><strong>{money(plan.plannedBillsAndDebts)}</strong><small>Usa valor pago quando registrado</small></article>
        <article className={`planning-summary-card ${plan.deficit > 0 ? "planning-summary-alert" : ""}`}><span>{plan.deficit > 0 ? "Valor que falta" : "Restante para mesadas"}</span><strong>{money(plan.deficit > 0 ? plan.deficit : plan.remaining)}</strong><small>{plan.isProjection ? "Projeção até confirmar os registros" : "Valores reais informados no mês"}</small></article>
      </section>

      {plan.isProjection && <div className="planning-projection-note"><Icon name="spark" size={16} />
        {plan.missingDeposits.length ? "A mesada usa somente os depósitos já informados; falta registrar o outro depósito para fechar o mês." : "A mesada considera os valores previstos das contas ainda não marcadas como pagas."}
      </div>}

      <section className="allowance-cards">
        {(["Douglas Alexander", "Bruna Toth"] as Profile[]).map((person) => <article className={`allowance-card ${person === profile ? "allowance-own" : ""}`} key={person}>
          <span className={`avatar ${person === "Bruna Toth" ? "avatar-bruna" : ""}`}>{person === "Douglas Alexander" ? "D" : "B"}</span>
          <div><small>Mesada {settingsDraft.allowancePercentages[person]}%</small><strong>{money(plan.allowances[person])}</strong><span>{person === profile ? "Sua parte estimada" : "Parte estimada"}</span></div>
        </article>)}
      </section>

      <section className="planning-main-grid">
        <article className="panel planning-panel income-settings-panel">
          <div className="panel-heading"><div><p className="eyebrow">RENDA E PRIORIDADES</p><h2>Configurações do casal</h2></div><span className="panel-icon"><Icon name="wallet" size={17} /></span></div>
          <p className="panel-description">Os valores abaixo ficam na nuvem privada da casa. Altere aqui quando o salário mudar.</p>
          <div className="salary-fields">
            {(["Douglas Alexander", "Bruna Toth"] as Profile[]).map((person) => <label className="field-label" key={person}><span>Salário líquido de referência para investimentos · {person.split(" ")[0]}</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" value={settingsDraft.baseSalaries[person]} onChange={(event) => updateSettings((current) => ({ ...current, baseSalaries: { ...current.baseSalaries, [person]: Number(event.target.value) || 0 } }))} /></div></label>)}
          </div>
          <div className="setting-divider" />
          <div className="rate-setting reserve-rate-setting"><label className="field-label"><span>Reserva de emergência</span><div className="percent-input"><input type="number" min="0" max="100" step="0.5" value={settingsDraft.reservePercent} onChange={(event) => updateSettings((current) => ({ ...current, reservePercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} /><span>%</span></div></label><p className="small-privacy-note"><Icon name="info" size={13} /> Aplicada aos depósitos reais registrados no mês.</p></div>
          <div className="rate-setting investment-rate-setting"><label className="field-label"><span>Investimentos</span><div className="percent-input"><input type="number" min="0" max="100" step="0.5" value={settingsDraft.investmentPercent} onChange={(event) => updateSettings((current) => ({ ...current, investmentPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} /><span>%</span></div></label><p className="small-privacy-note"><Icon name="info" size={13} /> Calculados sempre sobre a soma das rendas de referência.</p></div>
          <div className="reserve-goal-fields"><label className="field-label"><span>Saldo atual da reserva</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" value={settingsDraft.reserveBalance} onChange={(event) => updateSettings((current) => ({ ...current, reserveBalance: Number(event.target.value) || 0 }))} /></div></label><label className="field-label"><span>Meta da reserva</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" value={settingsDraft.reserveGoal} onChange={(event) => updateSettings((current) => ({ ...current, reserveGoal: Number(event.target.value) || 0 }))} /></div></label></div>
          {settingsDraft.reserveGoal > 0 && <div className="reserve-progress"><div><span>Progresso da meta</span><strong>{Math.round(reserveProgress)}%</strong></div><div className="budget-progress"><span style={{ width: `${reserveProgress}%` }} /></div><small>Saldo atual + contribuição estimada deste mês: {money(settingsDraft.reserveBalance + plan.reserveContribution)}</small></div>}
          <div className="setting-divider" />
          <p className="setting-section-title">Divisão das mesadas</p>
          <div className="salary-fields allowance-fields">{(["Douglas Alexander", "Bruna Toth"] as Profile[]).map((person) => <label className="field-label" key={person}><span>{person.split(" ")[0]}</span><div className="percent-input"><input type="number" min="0" max="100" value={settingsDraft.allowancePercentages[person]} onChange={(event) => updateSettings((current) => ({ ...current, allowancePercentages: { ...current.allowancePercentages, [person]: Math.min(100, Math.max(0, Number(event.target.value) || 0)) } }))} /><span>%</span></div></label>)}</div>
          <p className={`allocation-validation ${allowanceTotal === 100 ? "allocation-valid" : ""}`}>{allowanceTotal === 100 ? "A divisão soma 100%." : `A divisão está em ${allowanceTotal}%; ajuste para completar 100%.`}</p>
          {settingsMessage && <p className="form-feedback">{settingsMessage}</p>}
          <button className="button button-primary full-button" onClick={saveSettings}><Icon name="check" size={15} /> Salvar planejamento</button>
        </article>

        <div className="planning-side-column">
          <article className="panel planning-panel deposit-panel">
            <div className="panel-heading"><div><p className="eyebrow">ENTRADA REAL</p><h2>O que caiu na conta</h2></div><span className="panel-icon"><Icon name="arrowDown" size={17} /></span></div>
            <p className="panel-description">Cada pessoa registra o próprio depósito. O valor real é usado no cálculo das mesadas.</p>
            {(["Douglas Alexander", "Bruna Toth"] as Profile[]).map((person) => {
              const deposit = data.deposits.find((item) => item.profile === person && item.month === month);
              const isOwn = person === profile;
              return <div className={`deposit-person-row ${isOwn ? "deposit-person-own" : ""}`} key={person}>
                <div><span className={`avatar tiny ${person === "Bruna Toth" ? "avatar-bruna" : ""}`}>{person === "Douglas Alexander" ? "D" : "B"}</span><strong>{person.split(" ")[0]}</strong></div>
                {isOwn ? <div className="deposit-entry"><div className="money-input"><span>R$</span><input aria-label={`Depósito de ${person}`} type="number" min="0" step="0.01" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} placeholder="0,00" /></div><input aria-label="Data do depósito" type="date" value={depositDate} onChange={(event) => setDepositDate(event.target.value)} /><button className="button button-soft" onClick={saveOwnDeposit}>{ownDeposit ? "Atualizar" : "Registrar"}</button></div> : <div className="deposit-readonly"><strong>{deposit ? money(deposit.amount) : "Aguardando registro"}</strong><small>{deposit ? `Recebido em ${deposit.receivedOn}` : "A outra pessoa registra no próprio perfil"}</small></div>}
              </div>;
            })}
            <p className="small-privacy-note"><Icon name="shield" size={13} /> Só a conta que registrou pode alterar cada depósito.</p>
          </article>

          <article className="panel reserve-highlight"><span className="reserve-highlight-icon"><Icon name="leaf" size={18} /></span><div><p className="eyebrow">PRIMEIRO, O FUTURO</p><strong>{money(plan.reserveContribution)} para a reserva</strong><span>Percentual dos depósitos reais informados neste mês.</span></div></article>
        </div>
      </section>

      <section className="panel planning-panel bills-panel">
        <div className="panel-heading planning-list-heading"><div><p className="eyebrow">COMPROMISSOS DA CASA</p><h2>Contas fixas e variáveis</h2><p className="panel-description">Cadastrem uma conta uma vez; registrem o valor pago em cada mês.</p></div><button className="button button-soft" onClick={() => setBillDraft(emptyBill(data.categories[0]))}><Icon name="plus" size={15} /> Nova conta</button></div>
        {billDraft && <form className="inline-editor bill-editor" onSubmit={submitBill}><label className="field-label"><span>Nome</span><input required value={billDraft.name} onChange={(event) => setBillDraft({ ...billDraft, name: event.target.value })} placeholder="Ex.: aluguel, carro, luz" /></label><label className="field-label"><span>Tipo</span><select value={billDraft.kind} onChange={(event) => setBillDraft({ ...billDraft, kind: event.target.value as BillDraft["kind"] })}><option value="fixed">Fixa</option><option value="variable">Variável</option></select></label><label className="field-label"><span>Categoria</span><select value={billDraft.category} onChange={(event) => setBillDraft({ ...billDraft, category: event.target.value })}>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label"><span>Previsão mensal</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" required value={billDraft.plannedAmount} onChange={(event) => setBillDraft({ ...billDraft, plannedAmount: event.target.value })} /></div></label><label className="field-label"><span>Vence no dia</span><input type="number" min="1" max="31" value={billDraft.dueDay} onChange={(event) => setBillDraft({ ...billDraft, dueDay: event.target.value })} placeholder="Dia" /></label><div className="editor-actions"><button className="button button-primary" type="submit">Salvar conta</button><button className="button button-soft" type="button" onClick={() => setBillDraft(null)}>Cancelar</button></div></form>}
        {data.bills.length ? <div className="bill-list">{data.bills.map((bill) => {
          const payment = data.billPayments.find((item) => item.billId === bill.id && item.month === month);
          return <article className="bill-row" key={bill.id}><div className="bill-row-main"><span className="bill-kind-icon"><Icon name={bill.kind === "fixed" ? "home" : "trend"} size={15} /></span><div><strong>{bill.name}</strong><span>{bill.kind === "fixed" ? "Fixa" : "Variável"} · {bill.category}{bill.dueDay ? ` · vence dia ${bill.dueDay}` : ""}</span></div></div><div className="bill-row-values"><strong>{money(payment?.amount ?? bill.plannedAmount)}</strong><small>{payment ? `Paga em ${payment.paidOn}` : `Prevista: ${money(bill.plannedAmount)}`}</small></div><div className="bill-payment-controls"><div className="money-input compact-money"><span>R$</span><input aria-label={`Valor pago de ${bill.name}`} type="number" min="0" step="0.01" value={billPayments[bill.id] ?? ""} onChange={(event) => setBillPayments((current) => ({ ...current, [bill.id]: event.target.value }))} /></div><input aria-label={`Data de pagamento de ${bill.name}`} type="date" value={billDates[bill.id] ?? localDateKey(new Date())} onChange={(event) => setBillDates((current) => ({ ...current, [bill.id]: event.target.value }))} /><button className={`button ${payment ? "button-soft" : "button-primary"}`} onClick={() => recordBillPayment(bill)}>{payment ? "Atualizar pago" : "Registrar paga"}</button></div><div className="bill-row-actions"><button className="text-action" onClick={() => setBillDraft({ id: bill.id, name: bill.name, category: bill.category, kind: bill.kind, plannedAmount: String(bill.plannedAmount), dueDay: bill.dueDay ? String(bill.dueDay) : "" })}>Editar</button><button className="text-action danger-action" onClick={() => { if (window.confirm(`Remover a conta “${bill.name}”?`)) onDeleteBill(bill.id); }}>Remover</button></div></article>;
        })}</div> : <div className="planning-empty"><Icon name="wallet" size={19} /><strong>Nenhuma conta cadastrada</strong><span>Adicione aluguel, carro, luz, água, internet, gasolina, faculdade e outras despesas da casa.</span></div>}
      </section>

      <section className="panel planning-panel debts-panel">
        <div className="panel-heading planning-list-heading"><div><p className="eyebrow">QUITAÇÃO COMPARTILHADA</p><h2>Dívidas da casa</h2><p className="panel-description">Registrem saldo e parcelas compartilhadas antes de dividir o restante.</p></div><button className="button button-soft" onClick={() => setDebtDraft(emptyDebt())}><Icon name="plus" size={15} /> Nova dívida</button></div>
        {debtDraft && <form className="inline-editor debt-editor" onSubmit={submitDebt}><label className="field-label"><span>Credor / descrição</span><input required value={debtDraft.name} onChange={(event) => setDebtDraft({ ...debtDraft, name: event.target.value })} placeholder="Ex.: financiamento ou outro credor" /></label><label className="field-label"><span>Saldo atual</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" required value={debtDraft.currentBalance} onChange={(event) => setDebtDraft({ ...debtDraft, currentBalance: event.target.value })} /></div></label><label className="field-label"><span>Parcela mensal prevista</span><div className="money-input"><span>R$</span><input type="number" min="0" step="0.01" required value={debtDraft.monthlyPayment} onChange={(event) => setDebtDraft({ ...debtDraft, monthlyPayment: event.target.value })} /></div></label><label className="field-label"><span>Vence no dia</span><input type="number" min="1" max="31" value={debtDraft.dueDay} onChange={(event) => setDebtDraft({ ...debtDraft, dueDay: event.target.value })} placeholder="Dia" /></label><label className="field-label"><span>Observação</span><input value={debtDraft.note} onChange={(event) => setDebtDraft({ ...debtDraft, note: event.target.value })} placeholder="Opcional" /></label><div className="editor-actions"><button className="button button-primary" type="submit">Salvar dívida</button><button className="button button-soft" type="button" onClick={() => setDebtDraft(null)}>Cancelar</button></div></form>}
        {data.sharedDebts.length ? <div className="bill-list">{data.sharedDebts.map((debt) => {
          const payment = data.debtPayments.find((item) => item.debtId === debt.id && item.month === month);
          return <article className="bill-row debt-row" key={debt.id}><div className="bill-row-main"><span className="bill-kind-icon debt-kind-icon"><Icon name="layers" size={15} /></span><div><strong>{debt.name}</strong><span>{debt.dueDay ? `Vence dia ${debt.dueDay} · ` : ""}Saldo atual cadastrado {money(debt.currentBalance)}{debt.note ? ` · ${debt.note}` : ""}</span></div></div><div className="bill-row-values"><strong>{money(payment?.amount ?? debt.monthlyPayment)}</strong><small>{payment ? `Parcela paga em ${payment.paidOn}` : `Parcela prevista: ${money(debt.monthlyPayment)}`}</small></div><div className="bill-payment-controls"><div className="money-input compact-money"><span>R$</span><input aria-label={`Parcela paga de ${debt.name}`} type="number" min="0" step="0.01" value={debtPayments[debt.id] ?? ""} onChange={(event) => setDebtPayments((current) => ({ ...current, [debt.id]: event.target.value }))} /></div><input aria-label={`Data de pagamento de ${debt.name}`} type="date" value={debtDates[debt.id] ?? localDateKey(new Date())} onChange={(event) => setDebtDates((current) => ({ ...current, [debt.id]: event.target.value }))} /><button className={`button ${payment ? "button-soft" : "button-primary"}`} onClick={() => recordDebtPayment(debt)}>{payment ? "Atualizar pago" : "Registrar parcela"}</button></div><div className="bill-row-actions"><button className="text-action" onClick={() => setDebtDraft({ id: debt.id, name: debt.name, currentBalance: String(debt.currentBalance), monthlyPayment: String(debt.monthlyPayment), dueDay: debt.dueDay ? String(debt.dueDay) : "", note: debt.note || "" })}>Editar</button><button className="text-action danger-action" onClick={() => { if (window.confirm(`Remover a dívida “${debt.name}”?`)) onDeleteDebt(debt.id); }}>Remover</button></div></article>;
        })}</div> : <div className="planning-empty"><Icon name="layers" size={19} /><strong>Nenhuma dívida compartilhada cadastrada</strong><span>Cadastre as dívidas da casa quando tiverem o saldo e a parcela mensal em mãos.</span></div>}
        <p className="small-privacy-note"><Icon name="info" size={13} /> O saldo diminui pelas parcelas registradas. Juros futuros não são calculados automaticamente; atualizem o saldo quando receberem um valor novo do credor.</p>
      </section>
    </div>
  );
}
