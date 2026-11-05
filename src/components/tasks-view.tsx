"use client";

import { useMemo, useState } from "react";
import {
  HouseholdData,
  Profile,
  TaskDefinition,
  getTaskAssignee,
  getTasksForDate,
  getTasksForMonth,
  getTasksForRoutine,
  localDateKey,
  monthKey,
  taskCompletionKey,
} from "@/lib/household";
import Icon from "@/components/icon";

type Scope = "today" | "week" | "routine" | "month";
type PersonFilter = "all" | "Douglas Alexander" | "Bruna Toth";
type TasksViewProps = {
  data: HouseholdData;
  profile: Profile;
  onToggle: (key: string, profile: Profile) => void;
};

const scopeLabels: { id: Scope; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "routine", label: "Rotina" },
  { id: "month", label: "Mensais" },
];

function addDays(date: Date, days: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date) {
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

function niceDate(date: Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  return date.toLocaleDateString("pt-BR", options);
}

function weekday(date: Date, short = false) {
  return date.toLocaleDateString("pt-BR", { weekday: short ? "short" : "long" }).replace(".", "");
}

function responsibleLabel(task: TaskDefinition, date: Date) {
  const assignee = getTaskAssignee(task, date);
  return assignee === "Ambos" ? "Douglas + Bruna" : assignee.split(" ")[0];
}

function isVisibleForFilter(task: TaskDefinition, date: Date, filter: PersonFilter) {
  if (filter === "all") return true;
  const assignee = getTaskAssignee(task, date);
  return assignee === filter || assignee === "Ambos";
}

function TaskCard({
  task,
  date,
  data,
  onToggle,
  showDetail = true,
}: {
  task: TaskDefinition;
  date: Date;
  data: HouseholdData;
  onToggle: (key: string) => void;
  showDetail?: boolean;
}) {
  const key = taskCompletionKey(task, date);
  const completedBy = data.completions[key];
  const completed = Boolean(completedBy);
  const owner = getTaskAssignee(task, date);
  return (
    <article className={`task-card ${completed ? "task-completed" : ""} ${task.priority ? "task-priority" : ""}`}>
      <button className={`task-check ${completed ? "checked" : ""}`} type="button" role="checkbox" aria-checked={completed} aria-label={`${completed ? "Desmarcar" : "Concluir"}: ${task.title}`} onClick={() => onToggle(key)}><Icon name="check" size={15} strokeWidth={2.4} /></button>
      <div className="task-copy"><div className="task-title-line"><strong>{task.title}</strong>{task.priority && <span className="priority-tag"><Icon name="heart" size={13} /> Prioridade total</span>}</div>{showDetail && task.detail && <span className="task-detail">{task.detail}</span>}{completed && completedBy && <span className="task-completed-by">Concluída por {completedBy.by.split(" ")[0]}</span>}</div>
      <div className="task-meta"><span className={`assignee-chip ${owner === "Ambos" ? "assignee-both" : owner === "Douglas Alexander" ? "assignee-douglas" : "assignee-bruna"}`}><i>{owner === "Ambos" ? "D+B" : owner === "Douglas Alexander" ? "D" : "B"}</i>{owner === "Ambos" ? "Ambos" : owner.split(" ")[0]}</span>{task.time && <span className="task-time"><Icon name="clock" size={13} />{task.time}</span>}</div>
    </article>
  );
}

function OwnerFilter({ value, onChange }: { value: PersonFilter; onChange: (value: PersonFilter) => void }) {
  return <div className="owner-filter" role="group" aria-label="Filtrar por responsável"><Icon name="filter" size={16} /><button className={value === "all" ? "selected" : ""} onClick={() => onChange("all")}>Todos</button><button className={value === "Douglas Alexander" ? "selected" : ""} onClick={() => onChange("Douglas Alexander")}>Douglas</button><button className={value === "Bruna Toth" ? "selected" : ""} onClick={() => onChange("Bruna Toth")}>Bruna</button></div>;
}

export default function TasksView({ data, profile, onToggle }: TasksViewProps) {
  const [scope, setScope] = useState<Scope>("today");
  const [filter, setFilter] = useState<PersonFilter>("all");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const weekStart = startOfWeek(selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const todayTasks = getTasksForDate(selectedDate).filter((task) => isVisibleForFilter(task, selectedDate, filter));
  const routineTasks = getTasksForRoutine().filter((task) => isVisibleForFilter(task, selectedDate, filter));
  const monthlyTasks = getTasksForMonth().filter((task) => isVisibleForFilter(task, viewMonth, filter));
  const dailyDone = todayTasks.filter((task) => data.completions[taskCompletionKey(task, selectedDate)]).length;
  const monthlyDone = getTasksForMonth().filter((task) => data.completions[taskCompletionKey(task, viewMonth)]).length;

  function changeDate(delta: number) {
    setSelectedDate((current) => addDays(current, delta));
  }

  function toggleTask(task: TaskDefinition, date: Date) {
    onToggle(taskCompletionKey(task, date), profile);
  }

  const monthLabel = viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="view-content tasks-view-content">
      <div className="page-heading tasks-heading">
        <div><p className="eyebrow">A CASA, EM MOVIMENTO</p><h1>Pequenos passos, <em>juntos.</em></h1><p className="page-subtitle">Uma rotina compartilhada, sem deixar de ver quem cuida de cada parte.</p></div>
        <div className="tasks-profile-note"><span className="avatar">{profile === "Douglas Alexander" ? "D" : "B"}</span><span>Marcando como<br /><strong>{profile.split(" ")[0]}</strong></span></div>
      </div>

      <section className="tasks-overview">
        <div className="tasks-overview-copy"><span className="tasks-overview-icon"><Icon name="check" size={20} /></span><div><p className="eyebrow">UM DIA DE CADA VEZ</p><strong>{scope === "month" ? `${monthlyDone} de ${getTasksForMonth().length} tarefas mensais` : `${dailyDone} de ${todayTasks.length} tarefas de hoje`}</strong><span>{scope === "month" ? "O progresso do mês está guardado para vocês." : "Cada tarefa concluída é um cuidado a mais com a casa."}</span></div></div>
        <div className="overview-progress" aria-hidden="true"><span style={{ width: `${scope === "month" ? (getTasksForMonth().length ? (monthlyDone / getTasksForMonth().length) * 100 : 0) : (todayTasks.length ? (dailyDone / todayTasks.length) * 100 : 0)}%` }} /></div>
      </section>

      <div className="task-toolbar"><div className="task-tabs" role="tablist" aria-label="Visualização das tarefas">{scopeLabels.map((item) => <button role="tab" aria-selected={scope === item.id} className={scope === item.id ? "task-tab active" : "task-tab"} key={item.id} onClick={() => setScope(item.id)}>{item.label}</button>)}</div><OwnerFilter value={filter} onChange={setFilter} /></div>

      {scope === "today" && <section className="panel task-section"><div className="task-section-heading"><div><p className="eyebrow">PLANO DO DIA</p><h2>{niceDate(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</h2></div><div className="date-controls"><button className="icon-button" onClick={() => changeDate(-1)} aria-label="Dia anterior"><Icon name="chevronLeft" /></button><button className="today-button" onClick={() => setSelectedDate(new Date())}>Hoje</button><button className="icon-button" onClick={() => changeDate(1)} aria-label="Próximo dia"><Icon name="chevronRight" /></button></div></div>
        {todayTasks.length ? <div className="task-list">{todayTasks.map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div> : <div className="task-empty">Nenhuma tarefa prevista para este dia.</div>}
        <p className="task-footnote">A escala da louça segue o número da semana ISO. As limpezas “Equilibradas” ficam na aba Rotina, sem dia pré-definido.</p>
      </section>}

      {scope === "week" && <section className="weekly-view"><div className="task-section-heading week-heading"><div><p className="eyebrow">VISÃO DA SEMANA</p><h2>{niceDate(weekDays[0], { day: "numeric", month: "short" })} — {niceDate(weekDays[6], { day: "numeric", month: "short", year: "numeric" })}</h2></div><div className="date-controls"><button className="icon-button" onClick={() => setSelectedDate((current) => addDays(current, -7))} aria-label="Semana anterior"><Icon name="chevronLeft" /></button><button className="icon-button" onClick={() => setSelectedDate(new Date())} aria-label="Voltar para a semana atual"><Icon name="calendar" /></button><button className="icon-button" onClick={() => setSelectedDate((current) => addDays(current, 7))} aria-label="Próxima semana"><Icon name="chevronRight" /></button></div></div><div className="week-grid">{weekDays.map((date) => {
          const tasks = getTasksForDate(date).filter((task) => isVisibleForFilter(task, date, filter));
          return <article className={`week-day-card ${localDateKey(date) === localDateKey(new Date()) ? "is-today" : ""}`} key={localDateKey(date)}><div className="week-day-heading"><span>{weekday(date, true)}</span><strong>{date.getDate()}</strong></div><div className="week-day-tasks">{tasks.length ? tasks.map((task) => <button key={task.id} className={`week-task ${data.completions[taskCompletionKey(task, date)] ? "week-task-done" : ""}`} onClick={() => toggleTask(task, date)} title={`${task.title} · ${responsibleLabel(task, date)}`}><span className="week-task-check">{data.completions[taskCompletionKey(task, date)] && <Icon name="check" size={10} />}</span><span>{task.title}</span><small>{responsibleLabel(task, date)}</small></button>) : <span className="week-rest">Um respiro na rotina</span>}</div></article>;
        })}</div><p className="task-footnote">A tarefa de sábado às 20:00 aparece como compromisso prioritário. Para limpar e organizar o guarda-roupa, cada etapa é marcada pela pessoa responsável.</p></section>}

      {scope === "routine" && <section className="routine-layout"><article className="panel task-section"><div className="task-section-heading"><div><p className="eyebrow">REPETEM NO DIA A DIA</p><h2>Rotina e cuidados</h2></div><span className="routine-count">{routineTasks.length} itens</span></div><div className="routine-groups"><div className="routine-group"><h3><Icon name="clock" size={15} /> Todo dia e noites alternadas</h3><div className="task-list">{routineTasks.filter((task) => ["daily", "alternate"].includes(task.frequency)).map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div></div><div className="routine-group"><h3><Icon name="calendar" size={15} /> Escala da louça</h3><div className="dish-rules">{routineTasks.filter((task) => ["dishOdd", "dishEven"].includes(task.frequency)).map((task) => <div className="dish-rule" key={task.id}><span className="dish-rule-icon"><Icon name="layers" size={16} /></span><div><strong>{task.frequency === "dishOdd" ? "Semana ímpar" : "Semana par"}</strong><span>{task.detail?.split("·")[1]?.trim()}</span></div><span className={`assignee-chip ${task.owner === "Douglas Alexander" ? "assignee-douglas" : "assignee-bruna"}`}><i>{task.owner === "Douglas Alexander" ? "D" : "B"}</i>{task.owner.split(" ")[0]}</span></div>)}</div></div><div className="routine-group"><h3><Icon name="leaf" size={16} /> Limpezas equilibradas</h3><p className="routine-description">Sem dia fixo no documento; vocês decidem juntos quando cada cuidado entra na semana.</p><div className="task-list">{routineTasks.filter((task) => task.frequency === "balanced").map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div></div><div className="couple-callout"><span className="couple-icon"><Icon name="heart" size={18} /></span><div><strong>Encontro / Tempo do Casal</strong><span>Sábado às 20:00 · compromisso fixo · prioridade total</span></div></div></div></article><aside className="panel routine-aside"><span className="routine-aside-icon"><Icon name="heart" size={19} /></span><p className="eyebrow">COMBINADO DE VOCÊS</p><h3>O cuidado também é estar junto.</h3><p>O revezamento noturno usa a referência “Bruna em 24/09” informada no documento. Para dias alternados, a data é projetada a partir de 24/09 do ano exibido.</p><div className="aside-divider" /><span className="aside-meta"><Icon name="calendar" size={15} /> Acompanhe a divisão na semana</span></aside></section>}

      {scope === "month" && <section className="panel task-section monthly-section"><div className="task-section-heading"><div><p className="eyebrow">CUIDADOS DA CASA</p><h2>Uma vez por mês</h2></div><div className="month-navigator task-month-navigator"><button className="icon-button" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Mês anterior"><Icon name="chevronLeft" /></button><span>{monthLabel}</span><button className="icon-button" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Próximo mês"><Icon name="chevronRight" /></button></div></div><div className="month-progress-note"><span className="month-progress-icon"><Icon name="check" size={17} /></span><span>{monthlyDone} de {getTasksForMonth().length} cuidados concluídos em {viewMonth.toLocaleDateString("pt-BR", { month: "long" })}.</span></div><div className="task-list monthly-task-list">{monthlyTasks.map((task) => <TaskCard key={task.id} task={task} date={viewMonth} data={data} onToggle={() => toggleTask(task, viewMonth)} />)}</div><p className="task-footnote">A troca da roupa de cama dos bebês pode ser marcada também quando feita por necessidade. As duas etapas do guarda-roupa ficam separadas para registrar quem limpou e quem organizou.</p></section>}

      <div className="data-note"><span className="status-dot" /> As tarefas são sincronizadas pelo Firestore entre as contas autorizadas; os dados privados não entram no backup compartilhado.</div>
    </div>
  );
}
