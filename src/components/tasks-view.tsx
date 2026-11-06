"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  HouseholdData,
  Profile,
  TaskDefinition,
  TaskTimePeriod,
  getTaskAssignee,
  getTasksForDate,
  getTasksForMonth,
  getTasksForRoutine,
  localDateKey,
  monthKey,
  taskCompletionKey,
  taskScheduleLabel,
} from "@/lib/household";
import Icon from "@/components/icon";

type Scope = "today" | "week" | "routine" | "month";
type PersonFilter = "all" | "Douglas Alexander" | "Bruna Toth";
type TasksViewProps = {
  data: HouseholdData;
  profile: Profile;
  onToggle: (key: string, profile: Profile) => void;
  onSaveTasks: (tasks: TaskDefinition[]) => void;
};

const WEEK_DAYS = [{ value: 1, label: "Seg" }, { value: 2, label: "Ter" }, { value: 3, label: "Qua" }, { value: 4, label: "Qui" }, { value: 5, label: "Sex" }, { value: 6, label: "Sáb" }, { value: 0, label: "Dom" }];
const PERIOD_LABEL: Record<TaskTimePeriod, string> = { morning: "Manhã", afternoon: "Tarde", night: "Noite", free: "Livre" };
type TaskDraft = { id?: string; title: string; detail: string; owner: TaskDefinition["owner"]; cadence: "weekly" | "monthly"; timePeriod: TaskTimePeriod; time: string; daysOfWeek: number[]; startDate: string; endDate: string; rotationStartDate: string; rotationFirstPerson: Profile; priority: boolean };

function dateToInput(value?: string) { return value ?? ""; }
function buildDraft(task?: TaskDefinition): TaskDraft {
  const period = task?.timePeriod ?? (task?.time?.toLowerCase().includes("manhã") ? "morning" : task?.time?.toLowerCase().includes("tarde") ? "afternoon" : task?.time?.toLowerCase().includes("noite") || task?.frequency === "couple" ? "night" : "free");
  return {
    id: task?.id,
    title: task?.title ?? "",
    detail: task?.detail ?? "",
    owner: task?.owner ?? "both",
    cadence: task?.frequency === "monthly" ? "monthly" : "weekly",
    timePeriod: period,
    time: task?.time && /^\d{1,2}:\d{2}$/.test(task.time) ? task.time : "",
    daysOfWeek: task?.daysOfWeek?.length ? [...task.daysOfWeek] : task?.frequency === "cleaning" ? [3, 5] : task?.frequency === "couple" ? [6] : task?.frequency === "monthly" ? [1] : [0, 1, 2, 3, 4, 5, 6],
    startDate: dateToInput(task?.startDate),
    endDate: dateToInput(task?.endDate),
    rotationStartDate: dateToInput(task?.rotationStartDate ?? task?.startDate ?? (task?.frequency === "dishAlternate" ? "2026-11-04" : task?.frequency === "alternate" ? `${new Date().getFullYear()}-09-24` : undefined)),
    rotationFirstPerson: task?.rotationFirstPerson ?? (task?.frequency === "alternate" ? "Bruna Toth" : "Douglas Alexander"),
    priority: Boolean(task?.priority),
  };
}

function taskDaysLabel(task: TaskDefinition) {
  if (task.frequency === "monthly") return "Mensal";
  const days = task.daysOfWeek?.length ? task.daysOfWeek : task.frequency === "cleaning" ? [3, 5] : task.frequency === "couple" ? [6] : [0, 1, 2, 3, 4, 5, 6];
  return days.map((day) => WEEK_DAYS.find((item) => item.value === day)?.label).filter(Boolean).join(", ");
}

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
      <button className={`task-check ${completed ? "checked" : ""}`} type="button" role="checkbox" aria-checked={completed} aria-label={`${completed ? "Desmarcar" : "Concluir"}: ${task.title}`} onClick={() => onToggle(key)}>
        <Icon name="check" size={15} strokeWidth={2.4} />
      </button>
      <div className="task-copy">
        <div className="task-title-line">
          <strong>{task.title}</strong>
          {task.priority && <span className="priority-tag"><Icon name="heart" size={13} /> Prioridade total</span>}
        </div>
        {showDetail && task.detail && <span className="task-detail">{task.detail}</span>}
        {completed && completedBy && <span className="task-completed-by">Concluída por {completedBy.by.split(" ")[0]}</span>}
      </div>
      <div className="task-meta">
        <span className={`assignee-chip ${owner === "Ambos" ? "assignee-both" : owner === "Douglas Alexander" ? "assignee-douglas" : "assignee-bruna"}`}>
          <i>{owner === "Ambos" ? "D+B" : owner === "Douglas Alexander" ? "D" : "B"}</i>
          {owner === "Ambos" ? "Ambos" : owner.split(" ")[0]}
        </span>
        {taskScheduleLabel(task) && <span className="task-time"><Icon name="clock" size={13} />{taskScheduleLabel(task)}</span>}
      </div>
    </article>
  );
}

function OwnerFilter({ value, onChange }: { value: PersonFilter; onChange: (value: PersonFilter) => void }) {
  return (
    <div className="owner-filter" role="group" aria-label="Filtrar por responsável">
      <Icon name="filter" size={16} />
      <button className={value === "all" ? "selected" : ""} onClick={() => onChange("all")}>Todos</button>
      <button className={value === "Douglas Alexander" ? "selected" : ""} onClick={() => onChange("Douglas Alexander")}>Douglas</button>
      <button className={value === "Bruna Toth" ? "selected" : ""} onClick={() => onChange("Bruna Toth")}>Bruna</button>
    </div>
  );
}

export default function TasksView({ data, profile, onToggle, onSaveTasks }: TasksViewProps) {
  const [scope, setScope] = useState<Scope>("today");
  const [filter, setFilter] = useState<PersonFilter>("all");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [manageTasks, setManageTasks] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() => buildDraft());
  const weekStart = startOfWeek(selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const todayTasks = getTasksForDate(selectedDate, data.taskDefinitions).filter((task) => isVisibleForFilter(task, selectedDate, filter));
  const routineTasks = getTasksForRoutine(data.taskDefinitions, selectedDate).filter((task) => isVisibleForFilter(task, selectedDate, filter));
  const monthlyTasks = getTasksForMonth(viewMonth, data.taskDefinitions).filter((task) => isVisibleForFilter(task, viewMonth, filter));
  const dailyDone = todayTasks.filter((task) => data.completions[taskCompletionKey(task, selectedDate)]).length;
  const monthlyDone = monthlyTasks.filter((task) => data.completions[taskCompletionKey(task, viewMonth)]).length;

  function changeDate(delta: number) {
    setSelectedDate((current) => addDays(current, delta));
  }

  function toggleTask(task: TaskDefinition, date: Date) {
    onToggle(taskCompletionKey(task, date), profile);
  }

  function startNewTask() {
    setTaskDraft(buildDraft());
    setTaskEditorOpen(true);
    setManageTasks(false);
  }

  function editTask(task: TaskDefinition) {
    setTaskDraft(buildDraft(task));
    setTaskEditorOpen(true);
    setManageTasks(false);
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskDraft.title.trim() || (taskDraft.cadence === "weekly" && taskDraft.daysOfWeek.length === 0)) return;
    if (taskDraft.endDate && taskDraft.startDate && taskDraft.endDate < taskDraft.startDate) return;
    const task: TaskDefinition = {
      id: taskDraft.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `task-${Date.now()}`),
      title: taskDraft.title.trim(),
      frequency: taskDraft.cadence === "monthly" ? "monthly" : "custom",
      owner: taskDraft.owner,
      detail: taskDraft.detail.trim() || undefined,
      timePeriod: taskDraft.timePeriod,
      time: taskDraft.time || undefined,
      daysOfWeek: [...taskDraft.daysOfWeek],
      startDate: taskDraft.startDate || undefined,
      endDate: taskDraft.endDate || undefined,
      rotationStartDate: taskDraft.owner === "rotation" ? (taskDraft.rotationStartDate || taskDraft.startDate || localDateKey(new Date())) : undefined,
      rotationFirstPerson: taskDraft.owner === "rotation" ? taskDraft.rotationFirstPerson : undefined,
      priority: taskDraft.priority,
    };
    onSaveTasks(taskDraft.id
      ? data.taskDefinitions.map((item) => item.id === task.id ? task : item)
      : [...data.taskDefinitions, task]);
    setTaskEditorOpen(false);
  }

  function deleteTask(task: TaskDefinition) {
    if (!window.confirm(`Excluir a tarefa “${task.title}” da rotina compartilhada?`)) return;
    onSaveTasks(data.taskDefinitions.filter((item) => item.id !== task.id));
  }

  const monthLabel = viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="view-content tasks-view-content">
      <div className="page-heading tasks-heading">
        <div>
          <p className="eyebrow">A CASA, EM MOVIMENTO</p>
          <h1>Pequenos passos, <em>juntos.</em></h1>
          <p className="page-subtitle">Uma rotina compartilhada, sem deixar de ver quem cuida de cada parte.</p>
        </div>
        <div className="tasks-profile-note">
          <span className="avatar">{profile === "Douglas Alexander" ? "D" : "B"}</span>
          <span>Marcando como<br /><strong>{profile.split(" ")[0]}</strong></span>
        </div>
      </div>

      <section className="tasks-overview">
        <div className="tasks-overview-copy">
          <span className="tasks-overview-icon"><Icon name="check" size={20} /></span>
          <div>
            <p className="eyebrow">UM DIA DE CADA VEZ</p>
            <strong>{scope === "month" ? `${monthlyDone} de ${monthlyTasks.length} tarefas mensais` : `${dailyDone} de ${todayTasks.length} tarefas de hoje`}</strong>
            <span>{scope === "month" ? "O progresso do mês está guardado para vocês." : "Cada tarefa concluída é um cuidado a mais com a casa."}</span>
          </div>
        </div>
        <div className="overview-progress" aria-hidden="true">
          <span style={{ width: `${scope === "month" ? (monthlyTasks.length ? (monthlyDone / monthlyTasks.length) * 100 : 0) : (todayTasks.length ? (dailyDone / todayTasks.length) * 100 : 0)}%` }} />
        </div>
      </section>

      <div className="task-toolbar">
        <div className="task-tabs" role="tablist" aria-label="Visualização das tarefas">
          {scopeLabels.map((item) => <button role="tab" aria-selected={scope === item.id} className={scope === item.id ? "task-tab active" : "task-tab"} key={item.id} onClick={() => setScope(item.id)}>{item.label}</button>)}
        </div>
        <OwnerFilter value={filter} onChange={setFilter} />
        <div className="task-management-actions"><button className="button button-soft" onClick={() => setManageTasks(true)}><Icon name="target" size={15} /> Gerenciar tarefas</button><button className="button button-primary" onClick={startNewTask}><Icon name="plus" size={15} /> Nova tarefa</button></div>
      </div>

      {scope === "today" && (
        <section className="panel task-section">
          <div className="task-section-heading">
            <div><p className="eyebrow">PLANO DO DIA</p><h2>{niceDate(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</h2></div>
            <div className="date-controls">
              <button className="icon-button" onClick={() => changeDate(-1)} aria-label="Dia anterior"><Icon name="chevronLeft" /></button>
              <button className="today-button" onClick={() => setSelectedDate(new Date())}>Hoje</button>
              <button className="icon-button" onClick={() => changeDate(1)} aria-label="Próximo dia"><Icon name="chevronRight" /></button>
            </div>
          </div>
          {todayTasks.length ? <div className="task-list">{todayTasks.map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div> : <div className="task-empty">Nenhuma tarefa prevista para este dia.</div>}
          <p className="task-footnote">A louça alterna diariamente: Douglas em 04/11/2026 e Bruna em 05/11/2026. As sete limpezas aparecem para marcar às quartas e sextas.</p>
        </section>
      )}

      {scope === "week" && (
        <section className="weekly-view">
          <div className="task-section-heading week-heading">
            <div><p className="eyebrow">VISÃO DA SEMANA</p><h2>{niceDate(weekDays[0], { day: "numeric", month: "short" })} — {niceDate(weekDays[6], { day: "numeric", month: "short", year: "numeric" })}</h2></div>
            <div className="date-controls">
              <button className="icon-button" onClick={() => setSelectedDate((current) => addDays(current, -7))} aria-label="Semana anterior"><Icon name="chevronLeft" /></button>
              <button className="icon-button" onClick={() => setSelectedDate(new Date())} aria-label="Voltar para a semana atual"><Icon name="calendar" /></button>
              <button className="icon-button" onClick={() => setSelectedDate((current) => addDays(current, 7))} aria-label="Próxima semana"><Icon name="chevronRight" /></button>
            </div>
          </div>
          <div className="week-grid">
            {weekDays.map((date) => {
              const tasks = getTasksForDate(date, data.taskDefinitions).filter((task) => isVisibleForFilter(task, date, filter));
              return (
                <article className={`week-day-card ${localDateKey(date) === localDateKey(new Date()) ? "is-today" : ""}`} key={localDateKey(date)}>
                  <div className="week-day-heading"><span>{weekday(date, true)}</span><strong>{date.getDate()}</strong></div>
                  <div className="week-day-tasks">
                    {tasks.length ? tasks.map((task) => <button key={task.id} className={`week-task ${data.completions[taskCompletionKey(task, date)] ? "week-task-done" : ""}`} onClick={() => toggleTask(task, date)} title={`${task.title} · ${responsibleLabel(task, date)} · ${taskScheduleLabel(task)}`}><span className="week-task-check">{data.completions[taskCompletionKey(task, date)] && <Icon name="check" size={10} />}</span><span>{task.title}</span><small>{responsibleLabel(task, date)} · {taskScheduleLabel(task)}</small></button>) : <span className="week-rest">Um respiro na rotina</span>}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="task-footnote">A louça alterna a cada dia desde 04/11/2026. Limpezas marcáveis aparecem às quartas e sextas; o compromisso de sábado às 20:00 segue prioritário.</p>
        </section>
      )}

      {scope === "routine" && (
        <section className="routine-layout">
          <article className="panel task-section">
            <div className="task-section-heading">
              <div><p className="eyebrow">REPETEM NO DIA A DIA</p><h2>Rotina e cuidados</h2></div>
              <span className="routine-count">{routineTasks.length} itens</span>
            </div>
            <div className="routine-groups">
              <div className="routine-group">
                <h3><Icon name="clock" size={15} /> Todo dia e noites alternadas</h3>
                <div className="task-list">{routineTasks.filter((task) => ["daily", "alternate"].includes(task.frequency)).map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div>
              </div>
              <div className="routine-group">
                <h3><Icon name="calendar" size={15} /> Escala da louça · alternância diária</h3>
                <p className="routine-description">Douglas em 04/11/2026, Bruna em 05/11/2026; depois, alterna uma pessoa por dia.</p>
                <div className="task-list">{routineTasks.filter((task) => task.frequency === "dishAlternate").map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div>
              </div>
              <div className="routine-group">
                <h3><Icon name="calendar" size={15} /> Limpezas programadas</h3>
                <p className="routine-description">A tarefa para marcar aparece na visão do dia e da semana às quartas e sextas.</p>
                <div className="dish-rules">
                  {routineTasks.filter((task) => task.frequency === "cleaning").map((task) => {
                    const owner = getTaskAssignee(task, selectedDate);
                    const isDouglas = owner === "Douglas Alexander";
                    return (
                      <div className="dish-rule" key={task.id}>
                        <span className="dish-rule-icon"><Icon name="calendar" size={16} /></span>
                        <div><strong>{task.title}</strong><span>Quarta e sexta-feira</span></div>
                        <span className={`assignee-chip ${isDouglas ? "assignee-douglas" : "assignee-bruna"}`}><i>{isDouglas ? "D" : "B"}</i>{isDouglas ? "Douglas" : "Bruna"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {routineTasks.some((task) => task.frequency === "custom") && <div className="routine-group">
                <h3><Icon name="calendar" size={15} /> Tarefas definidas por vocês</h3>
                <p className="routine-description">As tarefas aparecem nos dias selecionados e dentro do período definido.</p>
                <div className="task-list">{routineTasks.filter((task) => task.frequency === "custom").map((task) => <TaskCard key={task.id} task={task} date={selectedDate} data={data} onToggle={() => toggleTask(task, selectedDate)} />)}</div>
              </div>}
              <div className="couple-callout">
                <span className="couple-icon"><Icon name="heart" size={18} /></span>
                <div><strong>Encontro / Tempo do Casal</strong><span>Sábado às 20:00 · compromisso fixo · prioridade total</span></div>
              </div>
            </div>
          </article>
          <aside className="panel routine-aside">
            <span className="routine-aside-icon"><Icon name="heart" size={19} /></span>
            <p className="eyebrow">COMBINADO DE VOCÊS</p>
            <h3>O cuidado também é estar junto.</h3>
            <p>O revezamento noturno permanece usando a referência “Bruna em 24/09” informada no documento. A escala da louça agora alterna a cada dia a partir de 04/11/2026.</p>
            <div className="aside-divider" />
            <span className="aside-meta"><Icon name="calendar" size={15} /> Acompanhe a divisão na semana</span>
          </aside>
        </section>
      )}

      {scope === "month" && (
        <section className="panel task-section monthly-section">
          <div className="task-section-heading">
            <div><p className="eyebrow">CUIDADOS DA CASA</p><h2>Uma vez por mês</h2></div>
            <div className="month-navigator task-month-navigator">
              <button className="icon-button" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Mês anterior"><Icon name="chevronLeft" /></button>
              <span>{monthLabel}</span>
              <button className="icon-button" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Próximo mês"><Icon name="chevronRight" /></button>
            </div>
          </div>
          <div className="month-progress-note"><span className="month-progress-icon"><Icon name="check" size={17} /></span><span>{monthlyDone} de {monthlyTasks.length} cuidados concluídos em {viewMonth.toLocaleDateString("pt-BR", { month: "long" })}.</span></div>
          <div className="task-list monthly-task-list">{monthlyTasks.map((task) => <TaskCard key={task.id} task={task} date={viewMonth} data={data} onToggle={() => toggleTask(task, viewMonth)} />)}</div>
          <p className="task-footnote">A troca da roupa de cama dos bebês pode ser marcada também quando feita por necessidade. As duas etapas do guarda-roupa ficam separadas para registrar quem limpou e quem organizou.</p>
        </section>
      )}

      <div className="data-note"><span className="status-dot" /> As tarefas são sincronizadas pelo Firestore entre as contas autorizadas; os dados privados não entram no backup compartilhado.</div>
      {manageTasks && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setManageTasks(false)}>
        <section className="modal-card task-manager-modal" role="dialog" aria-modal="true" aria-labelledby="task-manager-title">
          <div className="modal-heading"><div><p className="eyebrow">ROTINA DA CASA</p><h2 id="task-manager-title">Gerenciar tarefas</h2></div><button className="icon-button" type="button" onClick={() => setManageTasks(false)} aria-label="Fechar"><Icon name="close" /></button></div>
          <div className="task-manager-list">{data.taskDefinitions.map((task) => <article className="task-manager-row" key={task.id}><div><strong>{task.title}</strong><span>{taskDaysLabel(task)} · {taskScheduleLabel(task)} · {task.owner === "both" ? "Ambos" : task.owner === "rotation" ? `Alternância (começa ${task.rotationFirstPerson?.split(" ")[0] ?? "conforme escala"})` : task.owner.split(" ")[0]}</span>{task.detail && <small>{task.detail}</small>}<small>Início: {task.startDate || "imediato"} · Término: {task.endDate || "sem término"}</small></div><div className="task-manager-actions"><button className="text-action" onClick={() => editTask(task)}>Editar</button><button className="text-action danger-action" onClick={() => deleteTask(task)}>Excluir</button></div></article>)}</div>
          <button className="button button-primary full-button" onClick={startNewTask}><Icon name="plus" size={15} /> Adicionar tarefa</button>
        </section>
      </div>}
      {taskEditorOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTaskEditorOpen(false)}>
        <section className="modal-card task-editor-modal" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
          <div className="modal-heading"><div><p className="eyebrow">TAREFA COMPARTILHADA</p><h2 id="task-editor-title">{taskDraft.id ? "Editar tarefa" : "Nova tarefa"}</h2></div><button className="icon-button" type="button" onClick={() => setTaskEditorOpen(false)} aria-label="Fechar"><Icon name="close" /></button></div>
          <form className="form-stack" onSubmit={submitTask}>
            <label className="field-label">Nome da tarefa<input autoFocus required maxLength={90} value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder="Ex.: Preparar mochila da creche" /></label>
            <label className="field-label">Observações<textarea maxLength={500} rows={3} value={taskDraft.detail} onChange={(event) => setTaskDraft({ ...taskDraft, detail: event.target.value })} placeholder="Orientações, detalhes ou lembretes (opcional)" /></label>
            <div className="task-editor-grid">
              <label className="field-label">Responsável<select value={taskDraft.owner} onChange={(event) => setTaskDraft({ ...taskDraft, owner: event.target.value as TaskDefinition["owner"] })}><option value="Douglas Alexander">Douglas</option><option value="Bruna Toth">Bruna</option><option value="both">Ambos</option><option value="rotation">Alternância entre Douglas e Bruna</option></select></label>
              <label className="field-label">Repetição<select value={taskDraft.cadence} onChange={(event) => setTaskDraft({ ...taskDraft, cadence: event.target.value as TaskDraft["cadence"] })}><option value="weekly">Semanal, nos dias escolhidos</option><option value="monthly">Mensal</option></select></label>
              <label className="field-label">Período do dia<select value={taskDraft.timePeriod} onChange={(event) => setTaskDraft({ ...taskDraft, timePeriod: event.target.value as TaskTimePeriod })}>{Object.entries(PERIOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="field-label">Horário (opcional)<input type="time" value={taskDraft.time} onChange={(event) => setTaskDraft({ ...taskDraft, time: event.target.value })} disabled={taskDraft.timePeriod === "free"} /></label>
            </div>
            {taskDraft.cadence === "weekly" && <fieldset className="task-days-field"><legend>Dias da semana</legend><div className="task-day-options">{WEEK_DAYS.map((day) => <label key={day.value}><input type="checkbox" checked={taskDraft.daysOfWeek.includes(day.value)} onChange={(event) => setTaskDraft({ ...taskDraft, daysOfWeek: event.target.checked ? [...taskDraft.daysOfWeek, day.value] : taskDraft.daysOfWeek.filter((value) => value !== day.value) })} /><span>{day.label}</span></label>)}</div><div className="task-day-shortcuts"><button type="button" className="text-action" onClick={() => setTaskDraft({ ...taskDraft, daysOfWeek: WEEK_DAYS.map((day) => day.value) })}>Todos os dias</button><button type="button" className="text-action" onClick={() => setTaskDraft({ ...taskDraft, daysOfWeek: [] })}>Limpar seleção</button></div></fieldset>}
            <div className="task-editor-grid">
              <label className="field-label">Data de início (opcional)<input type="date" value={taskDraft.startDate} onChange={(event) => setTaskDraft({ ...taskDraft, startDate: event.target.value })} /></label>
              <label className="field-label">Data de término (opcional)<input type="date" value={taskDraft.endDate} min={taskDraft.startDate || undefined} onChange={(event) => setTaskDraft({ ...taskDraft, endDate: event.target.value })} /></label>
            </div>
            <p className="task-form-help">Sem data de término, a tarefa se repete sem prazo final. Deixe a data de início vazia para começar imediatamente.</p>
            {taskDraft.owner === "rotation" && <div className="task-editor-grid"><label className="field-label">Alternância começa em<input required type="date" value={taskDraft.rotationStartDate} onChange={(event) => setTaskDraft({ ...taskDraft, rotationStartDate: event.target.value })} /></label><label className="field-label">Quem começa?<select value={taskDraft.rotationFirstPerson} onChange={(event) => setTaskDraft({ ...taskDraft, rotationFirstPerson: event.target.value as Profile })}><option value="Douglas Alexander">Douglas</option><option value="Bruna Toth">Bruna</option></select></label></div>}
            <label className="task-priority-option"><input type="checkbox" checked={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.checked })} /><span>Marcar como prioridade</span></label>
            <div className="editor-actions"><button className="button button-primary" type="submit">Salvar tarefa</button><button className="button button-soft" type="button" onClick={() => setTaskEditorOpen(false)}>Cancelar</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
