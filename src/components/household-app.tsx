"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { browserLocalPersistence, getRedirectResult, onAuthStateChanged, setPersistence, signOut, type User } from "firebase/auth";
import FinanceView from "@/components/finance-view";
import FinancePlanningView from "@/components/finance-planning-view";
import PrivateFinanceView from "@/components/private-finance-view";
import TasksView from "@/components/tasks-view";
import Icon from "@/components/icon";
import { getFirebaseServices, isFirebaseConfigured, signInWithGoogle } from "@/lib/firebase";
import {
  BillPayment,
  DebtPayment,
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
  monthKey,
  safeImportedData,
} from "@/lib/household";
import {
  deleteBill,
  deletePrivateEntry,
  deleteSharedDebt,
  importSharedBackup,
  saveBill,
  saveBillPayment,
  saveBudgets,
  saveDebtPayment,
  saveHouseholdSettings,
  saveMonthlyDeposit,
  savePrivateEntry,
  savePrivateDebtPayment,
  saveSharedDebt,
  saveTransaction,
  subscribeHouseholdData,
  subscribeMember,
  subscribePrivateEntries,
  toggleTaskCompletion,
} from "@/lib/firestore-repository";

const LEGACY_STORAGE_KEY = "casa-em-harmonia:data:v1";
type Section = "finance" | "planning" | "private" | "tasks";
type NewTransaction = Omit<Transaction, "id" | "createdBy" | "createdByUid">;

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function friendlyError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "permission-denied" || code === "firestore/permission-denied") return "O Firestore recusou a operação. Confira as regras e se este UID está cadastrado como membro ativo.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "A janela de login foi fechada antes da conclusão.";
  if (code === "auth/unauthorized-domain") return "Este domínio ainda não foi liberado em Firebase Authentication → Authorized domains.";
  if (code === "auth/popup-blocked") return "O navegador bloqueou o login. Permita a janela de autenticação ou tente novamente.";
  if (code === "auth/web-storage-unsupported" || code === "auth/operation-not-supported-in-this-environment") return "Este navegador não concluiu o armazenamento da sessão Google. Abra o site diretamente no Safari ou Chrome, fora de outro aplicativo.";
  if (code === "auth/operation-not-allowed") return "O login Google não está habilitado neste projeto Firebase.";
  if (code === "auth/network-request-failed") return "A conexão caiu durante o login Google. Verifique a internet e tente novamente.";
  return code
    ? `Não foi possível concluir agora (código Firebase: ${code}).`
    : "Não foi possível concluir agora. Verifique a configuração do Firebase e tente novamente.";
}

function monthAsDate(month: string) {
  return new Date(`${month}-01T12:00:00`);
}

function SetupScreen() {
  return <main className="access-screen"><section className="access-card setup-card"><span className="access-brand-mark"><Icon name="home" size={25} /></span><p className="eyebrow">CASA EM HARMONIA</p><h1>Falta ligar o <em>Firebase.</em></h1><p>O projeto está configurado para autenticação Google e Firestore, mas ainda não recebeu a configuração Web. Nenhum dado financeiro será guardado neste navegador enquanto isso estiver pendente.</p><div className="setup-steps"><strong>Adicione as variáveis do app Web:</strong><code>NEXT_PUBLIC_FIREBASE_API_KEY</code><code>NEXT_PUBLIC_FIREBASE_APP_ID</code><code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code><code>NEXT_PUBLIC_FIREBASE_PROJECT_ID=casaemharmonia-4df2d</code></div><p className="access-footnote">Veja <strong>docs/firebase-setup.md</strong> no repositório para copiar a configuração do Firebase Console e concluir as regras de acesso.</p></section></main>;
}

function LoginScreen({ busy, error, onLogin }: { busy: boolean; error: string; onLogin: () => void }) {
  return <main className="access-screen"><section className="access-card login-card"><span className="access-brand-mark"><Icon name="home" size={25} /></span><p className="eyebrow">DOUGLAS & BRUNA</p><h1>Uma casa em <em>harmonia.</em></h1><p>Entre com sua conta Google para sincronizar tarefas e finanças em todos os computadores de vocês.</p><button className="button button-primary google-login-button" onClick={onLogin} disabled={busy}><span className="google-g">G</span>{busy ? "Abrindo login…" : "Entrar com Google"}</button><div className="access-security-note"><Icon name="shield" size={16} /><span>Somente os dois membros autorizados acessam os dados da casa. As dívidas pessoais ficam isoladas por conta.</span></div>{error && <p className="access-error" role="alert">{error}</p>}<p className="access-footnote">Cada pessoa entra com a própria conta Google; não há senha da aplicação.</p></section></main>;
}

function MembershipScreen({ uid, active, onCopy, onSignOut }: { uid: string; active: boolean; onCopy: () => void; onSignOut: () => void }) {
  return <main className="access-screen"><section className="access-card member-card"><span className="access-brand-mark"><Icon name="shield" size={24} /></span><p className="eyebrow">AUTORIZAÇÃO DO FIRESTORE</p><h1>{active ? "Acesso pausado." : "Só falta liberar seu perfil."}</h1><p>{active ? "O documento do seu perfil existe, mas não está marcado como membro ativo." : "Entre no Firebase Console e cadastre seu UID como membro da casa. Depois, volte a esta tela; a autorização será detectada automaticamente."}</p><div className="uid-copy-box"><code>{uid}</code><button className="button button-soft" onClick={onCopy}><Icon name="copy" size={15} /> Copiar UID</button></div><div className="member-instructions"><strong>Documento de membro</strong><code>households/casaemharmonia/members/{uid}</code><pre>{`{
  "profile": "Douglas Alexander ou Bruna Toth",
  "active": true
}`}</pre><span>Use o nome correto para a pessoa que entrou. Os detalhes estão em <strong>docs/firebase-setup.md</strong>.</span></div><button className="text-action signout-action" onClick={onSignOut}>Sair desta conta</button></section></main>;
}

export default function HouseholdApp() {
  const [section, setSection] = useState<Section>("finance");
  const [data, setData] = useState<HouseholdData>(createInitialData);
  const [privateEntries, setPrivateEntries] = useState<PrivateEntry[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<HouseholdMember | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [toast, setToast] = useState("");
  const [legacyData, setLegacyData] = useState<HouseholdData | null>(null);
  const [legacyImportBusy, setLegacyImportBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const authUid = useRef<string | null>(null);
  const currentMonth = monthKey(month);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setAuthLoading(false);
      return;
    }
    const services = getFirebaseServices();
    if (!services) {
      setAuthLoading(false);
      setAccessError("O Firebase não pôde ser inicializado. Confira as variáveis de ambiente.");
      return;
    }
    let mounted = true;
    let stopAuth: (() => void) | undefined;
    setPersistence(services.auth, browserLocalPersistence).then(async () => {
      try {
        await getRedirectResult(services.auth);
      } catch (error) {
        if (mounted) setAccessError(friendlyError(error));
      }
      if (!mounted) return;
      stopAuth = onAuthStateChanged(services.auth, (nextUser) => {
        const nextUid = nextUser?.uid ?? null;
        if (authUid.current !== nextUid) {
          authUid.current = nextUid;
          setMember(null);
          setPrivateEntries([]);
          setData(createInitialData());
          setLegacyData(null);
          setDataLoading(false);
          setSection("finance");
        }
        setUser(nextUser);
        setAuthLoading(false);
        if (nextUser) setAccessError("");
        if (!nextUser) {
          setMember(null);
          setPrivateEntries([]);
          setData(createInitialData());
          setLegacyData(null);
        }
      }, (error) => {
        setAccessError(friendlyError(error));
        setAuthLoading(false);
      });
    }).catch((error) => {
      if (mounted) {
        setAccessError(friendlyError(error));
        setAuthLoading(false);
      }
    });
    return () => {
      mounted = false;
      stopAuth?.();
    };
  }, [configured]);

  useEffect(() => {
    if (!user) {
      setMember(null);
      setMemberLoading(false);
      return;
    }
    setMemberLoading(true);
    return subscribeMember(user.uid, (nextMember) => {
      setMember(nextMember);
      setMemberLoading(false);
      setAccessError("");
    }, (error) => {
      setAccessError(friendlyError(error));
      setMemberLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !member?.active) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    setAccessError("");
    const stopShared = subscribeHouseholdData((nextData) => setData(nextData), () => setDataLoading(false), (error) => {
      setAccessError(friendlyError(error));
      setDataLoading(false);
    });
    const stopPrivate = subscribePrivateEntries(user.uid, (entries) => setPrivateEntries(entries), (error) => {
      setAccessError(friendlyError(error));
    });
    return () => {
      stopShared();
      stopPrivate();
    };
  }, [user?.uid, member?.active]);

  useEffect(() => {
    if (!user || !member?.active) return;
    try {
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacy) return;
      const parsed = safeImportedData(JSON.parse(legacy));
      if (parsed && (parsed.transactions.length || Object.keys(parsed.budgets).length || Object.keys(parsed.completions).length)) setLegacyData(parsed);
    } catch {
      // A cópia antiga inválida não é carregada nem substitui os dados na nuvem.
    }
  }, [user?.uid, member?.active]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notifyWrite(action: Promise<void>, success: string) {
    action.then(() => setToast(success)).catch((error) => setToast(friendlyError(error)));
  }

  async function login() {
    const services = getFirebaseServices();
    if (!services) return;
    setAuthBusy(true);
    setAccessError("");
    try {
      await signInWithGoogle(services.auth);
    } catch (error) {
      setAccessError(friendlyError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    const services = getFirebaseServices();
    if (!services) return;
    setAccessError("");
    try {
      await signOut(services.auth);
      setSection("finance");
    } catch (error) {
      setToast(friendlyError(error));
    }
  }

  function createTransaction(draft: NewTransaction) {
    if (!member || !user) return;
    const transaction: Transaction = { ...draft, id: makeId(), createdBy: member.profile, createdByUid: user.uid };
    notifyWrite(saveTransaction(transaction), "Lançamento sincronizado com a casa.");
  }

  function updateBudgets(budgets: Record<string, number>, categories: string[]) {
    notifyWrite(saveBudgets(budgets, categories), "Limites sincronizados com a casa.");
  }

  function updateSettings(settings: FinancialSettings) {
    notifyWrite(saveHouseholdSettings(settings), "Planejamento atualizado para os dois perfis.");
  }

  function updateDeposit(deposit: MonthlyDeposit) {
    notifyWrite(saveMonthlyDeposit(deposit), "Depósito real registrado e sincronizado.");
  }

  function updateTask(key: string, by: Profile) {
    if (!user) return;
    notifyWrite(toggleTaskCompletion(key, by, user.uid), "Tarefa atualizada para a casa.");
  }

  function savePrivate(entry: PrivateEntry) {
    if (!user) return;
    notifyWrite(savePrivateEntry(user.uid, entry), "Registro salvo somente na sua área privada.");
  }

  function payPrivateDebt(entry: PrivateEntry, paymentMonth: string, amount: number) {
    if (!user) return;
    notifyWrite(savePrivateDebtPayment(user.uid, entry, paymentMonth, amount), "Parcela pessoal registrada.");
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tarefas-financeiro-bd-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Backup dos dados compartilhados baixado. Ele não contém dívidas privadas.");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = safeImportedData(JSON.parse(String(reader.result)));
        if (!parsed) throw new Error("Formato inválido");
        if (!window.confirm("Mesclar os registros compartilhados deste arquivo no Firestore? Os dados privados não são importados.")) return;
        notifyWrite(importSharedBackup(parsed, user.uid), "Backup compartilhado mesclado com a nuvem.");
      } catch {
        setToast("Esse arquivo não parece ser um backup compartilhado válido.");
      } finally {
        if (fileInput.current) fileInput.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  function importLegacyData() {
    if (!legacyData || !user) return;
    setLegacyImportBusy(true);
    importSharedBackup(legacyData, user.uid).then(() => {
      setLegacyData(null);
      setToast("A cópia antiga foi mesclada com os dados compartilhados da casa.");
    }).catch((error) => setToast(friendlyError(error))).finally(() => setLegacyImportBusy(false));
  }

  async function copyUid() {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setToast("UID copiado.");
    } catch {
      setToast("Não foi possível copiar automaticamente. Selecione o UID e copie manualmente.");
    }
  }

  if (!configured) return <SetupScreen />;
  if (authLoading) return <div className="loading-state"><span className="loading-mark"><Icon name="home" size={22} /></span><span>Conectando ao espaço seguro…</span></div>;
  if (!user) return <LoginScreen busy={authBusy} error={accessError} onLogin={() => void login()} />;
  if (memberLoading) return <div className="loading-state"><span className="loading-mark"><Icon name="shield" size={22} /></span><span>Verificando seu perfil…</span></div>;
  if (!member) return <MembershipScreen uid={user.uid} active={false} onCopy={() => void copyUid()} onSignOut={() => void logout()} />;
  if (!member.active) return <MembershipScreen uid={user.uid} active onCopy={() => void copyUid()} onSignOut={() => void logout()} />;
  if (dataLoading) return <div className="loading-state"><span className="loading-mark"><Icon name="home" size={22} /></span><span>Sincronizando os dados da casa…</span></div>;
  if (accessError) return <main className="access-screen"><section className="access-card"><span className="access-brand-mark"><Icon name="shield" size={24} /></span><p className="eyebrow">SINCRONIZAÇÃO PAUSADA</p><h1>Vamos conferir o <em>Firebase.</em></h1><p>{accessError}</p><button className="button button-primary full-button" onClick={() => window.location.reload()}>Tentar novamente</button><button className="text-action signout-action" onClick={() => void logout()}>Sair desta conta</button></section></main>;

  const profile = member.profile;
  const selectedMonth = currentMonth;
  const sectionLabel: Record<Section, string> = { finance: "Finanças", planning: "Planejamento", private: "Minha área privada", tasks: "Tarefas da casa" };
  const setPlanningMonth = (value: string) => setMonth(monthAsDate(value));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="#inicio" onClick={(event) => { event.preventDefault(); setSection("finance"); }} aria-label="Tarefas e Financeiro B&D, início"><span className="brand-mark"><Icon name="home" size={23} strokeWidth={1.65} /></span><span className="brand-name brand-name-product"><strong>Tarefas e Financeiro B&amp;D</strong><small>Douglas &amp; Bruna</small></span></a>
        <div className="sidebar-section-label">ESPAÇO DA CASA</div>
        <nav className="side-navigation" aria-label="Navegação principal">
          <button className={section === "finance" ? "nav-item active" : "nav-item"} onClick={() => setSection("finance")}><span className="nav-icon"><Icon name="wallet" size={18} /></span><span>Finanças</span>{section === "finance" && <i className="nav-active-indicator" />}</button>
          <button className={section === "planning" ? "nav-item active" : "nav-item"} onClick={() => setSection("planning")}><span className="nav-icon"><Icon name="target" size={18} /></span><span>Planejamento</span>{section === "planning" && <i className="nav-active-indicator" />}</button>
          <button className={section === "private" ? "nav-item active" : "nav-item"} onClick={() => setSection("private")}><span className="nav-icon"><Icon name="lock" size={17} /></span><span>Minha área privada</span>{section === "private" && <i className="nav-active-indicator" />}</button>
          <button className={section === "tasks" ? "nav-item active" : "nav-item"} onClick={() => setSection("tasks")}><span className="nav-icon"><Icon name="check" size={19} /></span><span>Tarefas da casa</span>{section === "tasks" && <i className="nav-active-indicator" />}</button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-message"><span className="sidebar-message-icon"><Icon name="heart" size={16} /></span><p>Uma casa feita<br />de pequenos <strong>cuidados.</strong></p></div>
        <div className="household-switcher"><p className="sidebar-section-label">CONTA CONECTADA</p><div className="sidebar-profile"><span className={`avatar ${profile === "Bruna Toth" ? "avatar-bruna" : ""}`}>{profile === "Douglas Alexander" ? "D" : "B"}</span><span><strong>{profile.split(" ")[0]}</strong><small>{profile}</small></span><button className="signout-mini" onClick={() => void logout()}>Sair</button></div></div>
        <div className="sidebar-footer">Apenas Douglas e Bruna <span>·</span> Firebase</div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Icon name="home" size={19} /></span><span className="mobile-brand-title">Tarefas e Financeiro <strong>B&amp;D</strong></span></div>
          <div className="topbar-left"><span className="breadcrumb-home"><Icon name="home" size={14} /></span><span className="breadcrumb-separator">/</span><span>{sectionLabel[section]}</span></div>
          <div className="topbar-actions"><span className="local-status"><span className="status-dot" /> Sincronizado na nuvem</span><button className="backup-button" onClick={exportBackup} title="Baixar backup dos dados compartilhados; a área privada é excluída"><Icon name="download" size={16} /><span>Backup compartilhado</span></button><button className="backup-button import-button" onClick={() => fileInput.current?.click()} title="Mesclar backup compartilhado no Firestore"><Icon name="upload" size={16} /><span>Importar</span></button><input className="visually-hidden" ref={fileInput} type="file" accept="application/json,.json" onChange={importBackup} /><span className="top-profile-selector"><span className={`avatar tiny ${profile === "Bruna Toth" ? "avatar-bruna" : ""}`}>{profile === "Douglas Alexander" ? "D" : "B"}</span><strong>{profile.split(" ")[0]}</strong></span></div>
        </header>
        <nav className="mobile-navigation" aria-label="Navegação principal"><button className={section === "finance" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection("finance")}><Icon name="wallet" size={17} />Finanças</button><button className={section === "planning" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection("planning")}><Icon name="target" size={17} />Plano</button><button className={section === "private" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection("private")}><Icon name="lock" size={16} />Privado</button><button className={section === "tasks" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection("tasks")}><Icon name="check" size={17} />Tarefas</button></nav>
        {legacyData && <div className="legacy-import-banner"><span><strong>Encontramos uma cópia antiga neste navegador.</strong> Ela só será enviada à nuvem se vocês escolherem importar; dados privados não entram no processo.</span><button className="button button-soft" disabled={legacyImportBusy} onClick={importLegacyData}>{legacyImportBusy ? "Importando…" : "Mesclar cópia antiga"}</button><button className="text-action" onClick={() => setLegacyData(null)}>Agora não</button></div>}
        {section === "finance" && <FinanceView data={data} profile={profile} month={month} onMonthChange={setMonth} onCreateTransaction={createTransaction} onSaveBudgets={updateBudgets} />}
        {section === "planning" && <FinancePlanningView data={data} month={selectedMonth} profile={profile} uid={user.uid} onChangeMonth={setPlanningMonth} onSaveSettings={updateSettings} onSaveDeposit={updateDeposit} onSaveBill={(bill: RecurringBill) => notifyWrite(saveBill(bill), "Conta da casa sincronizada.")} onDeleteBill={(id: string) => notifyWrite(deleteBill(id), "Conta removida.")} onSaveBillPayment={(payment: BillPayment) => notifyWrite(saveBillPayment(payment), "Pagamento da conta registrado.")} onSaveDebt={(debt: SharedDebt) => notifyWrite(saveSharedDebt(debt), "Dívida compartilhada sincronizada.")} onDeleteDebt={(id: string) => notifyWrite(deleteSharedDebt(id), "Dívida removida.")} onSaveDebtPayment={(payment: DebtPayment) => notifyWrite(saveDebtPayment(payment), "Parcela compartilhada registrada.")} onGoPrivate={() => setSection("private")} />}
        {section === "private" && <PrivateFinanceView data={data} entries={privateEntries} month={selectedMonth} profile={profile} onChangeMonth={setPlanningMonth} onSaveEntry={savePrivate} onDeleteEntry={(id: string) => user && notifyWrite(deletePrivateEntry(user.uid, id), "Registro removido da sua área privada.")} onSaveDebtPayment={payPrivateDebt} />}
        {section === "tasks" && <TasksView data={data} profile={profile} onToggle={updateTask} />}
      </main>
      {toast && <div className="toast-message" role="status"><span className="toast-check"><Icon name="check" size={14} /></span>{toast}</div>}
    </div>
  );
}
