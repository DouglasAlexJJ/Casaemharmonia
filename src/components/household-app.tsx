"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import FinanceView from "@/components/finance-view";
import TasksView from "@/components/tasks-view";
import Icon from "@/components/icon";
import {
  HouseholdData,
  Profile,
  Transaction,
  createInitialData,
  safeImportedData,
} from "@/lib/household";

const STORAGE_KEY = "casa-em-harmonia:data:v1";
const PROFILE_KEY = "casa-em-harmonia:profile:v1";
type Section = "finance" | "tasks";
type NewTransaction = Omit<Transaction, "id" | "createdBy">;

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function HouseholdApp() {
  const [section, setSection] = useState<Section>("finance");
  const [profile, setProfile] = useState<Profile>("Douglas Alexander");
  const [data, setData] = useState<HouseholdData>(createInitialData);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = safeImportedData(JSON.parse(saved));
        if (parsed) setData(parsed);
      }
      const savedProfile = window.localStorage.getItem(PROFILE_KEY);
      if (savedProfile === "Douglas Alexander" || savedProfile === "Bruna Toth") setProfile(savedProfile);
    } catch {
      setToast("Não foi possível ler os dados salvos neste navegador.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(PROFILE_KEY, profile);
  }, [profile, ready]);

  useEffect(() => {
    function syncFromAnotherTab(event: StorageEvent) {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = safeImportedData(JSON.parse(event.newValue));
          if (parsed) setData(parsed);
        } catch {
          // Um valor inválido em outra aba não substitui a cópia válida desta aba.
        }
      }
      if (event.key === PROFILE_KEY && (event.newValue === "Douglas Alexander" || event.newValue === "Bruna Toth")) {
        setProfile(event.newValue);
      }
    }
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function createTransaction(draft: NewTransaction) {
    const transaction: Transaction = { ...draft, id: makeId(), createdBy: profile };
    setData((current) => ({
      ...current,
      categories: current.categories.includes(transaction.category)
        ? current.categories
        : [...current.categories, transaction.category],
      transactions: [transaction, ...current.transactions],
    }));
    setToast("Lançamento salvo com sucesso.");
  }

  function saveBudgets(budgets: Record<string, number>, categories: string[]) {
    setData((current) => ({ ...current, budgets, categories }));
    setToast("Limites atualizados para este navegador.");
  }

  function toggleTask(key: string, by: Profile) {
    setData((current) => {
      const completions = { ...current.completions };
      if (completions[key]) delete completions[key];
      else completions[key] = by;
      return { ...current, completions };
    });
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `casa-em-harmonia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Backup baixado. Guarde o arquivo em um local seguro.");
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = safeImportedData(JSON.parse(String(reader.result)));
        if (!parsed) throw new Error("Formato inválido");
        setData(parsed);
        setToast("Backup restaurado neste navegador.");
      } catch {
        setToast("Esse arquivo não parece ser um backup válido do Casa em Harmonia.");
      } finally {
        if (fileInput.current) fileInput.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="#inicio" onClick={(event) => { event.preventDefault(); setSection("finance"); }} aria-label="Casa em Harmonia, início">
          <span className="brand-mark"><Icon name="home" size={23} strokeWidth={1.65} /></span>
          <span className="brand-name">casa em <strong>harmonia</strong><small>Douglas & Bruna</small></span>
        </a>
        <div className="sidebar-section-label">ESPAÇO DA CASA</div>
        <nav className="side-navigation" aria-label="Navegação principal">
          <button className={section === "finance" ? "nav-item active" : "nav-item"} onClick={() => setSection("finance")}><span className="nav-icon"><Icon name="wallet" size={18} /></span><span>Finanças</span>{section === "finance" && <i className="nav-active-indicator" />}</button>
          <button className={section === "tasks" ? "nav-item active" : "nav-item"} onClick={() => setSection("tasks")}><span className="nav-icon"><Icon name="check" size={19} /></span><span>Tarefas da casa</span>{section === "tasks" && <i className="nav-active-indicator" />}</button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-message"><span className="sidebar-message-icon"><Icon name="heart" size={16} /></span><p>Uma casa feita<br />de pequenos <strong>cuidados.</strong></p></div>
        <div className="household-switcher"><p className="sidebar-section-label">PERFIL ATIVO</p><label className="sidebar-profile"><span className={`avatar ${profile === "Bruna Toth" ? "avatar-bruna" : ""}`}>{profile === "Douglas Alexander" ? "D" : "B"}</span><span><strong>{profile.split(" ")[0]}</strong><small>{profile === "Douglas Alexander" ? "Douglas Alexander" : "Bruna Toth"}</small></span><select aria-label="Selecionar perfil" value={profile} onChange={(event) => setProfile(event.target.value as Profile)}><option value="Douglas Alexander">Douglas Alexander</option><option value="Bruna Toth">Bruna Toth</option></select><Icon className="profile-chevron" name="chevronRight" size={15} /></label></div>
        <div className="sidebar-footer">Feito para a rotina de vocês <span>·</span> v1.0</div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Icon name="home" size={19} /></span><span>casa em <strong>harmonia</strong></span></div>
          <div className="topbar-left"><span className="breadcrumb-home"><Icon name="home" size={14} /></span><span className="breadcrumb-separator">/</span><span>{section === "finance" ? "Finanças" : "Tarefas da casa"}</span></div>
          <div className="topbar-actions">
            <span className="local-status"><span className="status-dot" /> Salvo neste navegador</span>
            <button className="backup-button" onClick={exportBackup} title="Baixar arquivo JSON com os dados e tarefas da casa"><Icon name="download" size={16} /><span>Exportar backup</span></button>
            <button className="backup-button import-button" onClick={() => fileInput.current?.click()} title="Restaurar dados a partir de um backup JSON"><Icon name="upload" size={16} /><span>Importar</span></button>
            <input className="visually-hidden" ref={fileInput} type="file" accept="application/json,.json" onChange={importBackup} />
            <label className="top-profile-selector"><span className={`avatar tiny ${profile === "Bruna Toth" ? "avatar-bruna" : ""}`}>{profile === "Douglas Alexander" ? "D" : "B"}</span><select aria-label="Perfil que está usando a aplicação" value={profile} onChange={(event) => setProfile(event.target.value as Profile)}><option value="Douglas Alexander">Douglas Alexander</option><option value="Bruna Toth">Bruna Toth</option></select><Icon name="chevronRight" size={14} /></label>
          </div>
        </header>
        <nav className="mobile-navigation" aria-label="Navegação principal"><button className={section === "finance" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection("finance")}><Icon name="wallet" size={17} />Finanças</button><button className={section === "tasks" ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setSection("tasks")}><Icon name="check" size={18} />Tarefas</button></nav>
        {ready ? section === "finance" ? <FinanceView data={data} profile={profile} month={month} onMonthChange={setMonth} onCreateTransaction={createTransaction} onSaveBudgets={saveBudgets} /> : <TasksView data={data} profile={profile} onToggle={toggleTask} /> : <div className="loading-state"><span className="loading-mark"><Icon name="home" size={22} /></span><span>Preparando o espaço de vocês…</span></div>}
      </main>
      {toast && <div className="toast-message" role="status"><span className="toast-check"><Icon name="check" size={14} /></span>{toast}</div>}
    </div>
  );
}
