"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Calculator,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  CRM_ORIGINS,
  CRM_PERIODS,
  crmActionStatus,
  crmMetrics,
  crmStageLabel,
  filterCrmLeads,
  nextCrmStage,
  restartCrmFollowUp,
  sortCrmActions,
  type CrmColumn,
  type CrmLead,
  type CrmPeriod,
  type CrmQuoteSummary,
} from "@/lib/crm";

type ConversionData = {
  monthlyRevenue: number;
  activeClients: number;
  billingDay: number;
  contractStart: string;
};

const localDate = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const blankLead = (): CrmLead => ({
  id: "",
  company: "",
  contact: "",
  phone: "",
  email: "",
  origin: CRM_ORIGINS[0],
  stage: "prospecting",
  estimatedValue: 0,
  nextActionDate: localDate(),
  notes: "",
  owner: "Vinicius Scielzo",
  createdAt: "",
  updatedAt: "",
});

export function Crm({
  leads,
  columns,
  quotes,
  setLeads,
  setColumns,
  openPricing,
  convertToClient,
}: {
  leads: CrmLead[];
  columns: CrmColumn[];
  quotes: CrmQuoteSummary[];
  setLeads: (updater: CrmLead[] | ((current: CrmLead[]) => CrmLead[])) => void;
  setColumns: (updater: CrmColumn[] | ((current: CrmColumn[]) => CrmColumn[])) => void;
  openPricing: (lead: CrmLead) => void;
  convertToClient: (lead: CrmLead, data: ConversionData) => string;
}) {
  const [period, setPeriod] = useState<CrmPeriod>("30 dias");
  const [actionMode, setActionMode] = useState(false);
  const [view, setView] = useState<"active" | "won" | "lost">("active");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<CrmLead | null>(null);
  const [tagText, setTagText] = useState("");
  const [decision, setDecision] = useState<CrmLead | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [conversion, setConversion] = useState<ConversionData>({
    monthlyRevenue: 0,
    activeClients: 0,
    billingDay: 10,
    contractStart: localDate(),
  });
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [columnEditor, setColumnEditor] = useState<CrmColumn | null>(null);

  const activeStages = useMemo(() => columns.map((column) => column.id), [columns]);

  const metrics = useMemo(() => crmMetrics(leads, period, new Date(), activeStages), [activeStages, leads, period]);
  const visible = useMemo(() => {
    const periodLeads = filterCrmLeads(leads, period);
    const byView = periodLeads.filter((lead) =>
      view === "active" ? activeStages.includes(lead.stage) : lead.stage === view,
    );
    const term = query.trim().toLowerCase();
    return term
      ? byView.filter((lead) => `${lead.company} ${lead.contact} ${lead.phone}`.toLowerCase().includes(term))
      : byView;
  }, [activeStages, leads, period, query, view]);
  const actionLeads = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sortCrmActions(leads.filter((lead) => activeStages.includes(lead.stage) || lead.stage === "lost"))
      .filter((lead) => !term || `${lead.company} ${lead.contact} ${lead.phone}`.toLowerCase().includes(term));
  }, [activeStages, leads, query]);
  const quotesByLead = useMemo(() => {
    const result = new Map<string, CrmQuoteSummary[]>();
    for (const lead of leads) {
      const matches = quotes
        .filter((quote) => quote.crmLeadId === lead.id || (!quote.crmLeadId && quote.client.trim().toLowerCase() === lead.company.trim().toLowerCase()))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      result.set(lead.id, matches);
    }
    return result;
  }, [leads, quotes]);

  const saveLead = () => {
    if (!editor?.company.trim()) return;
    const now = new Date().toISOString();
    const record: CrmLead = {
      ...editor,
      id: editor.id || `lead-${Date.now()}`,
      company: editor.company.trim(),
      owner: "Vinicius Scielzo",
      tags: tagText.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8),
      createdAt: editor.createdAt || now,
      updatedAt: now,
    };
    setLeads((current) => editor.id
      ? current.map((lead) => lead.id === editor.id ? record : lead)
      : [record, ...current]);
    setEditor(null);
  };

  const editLead = (lead: CrmLead) => {
    setTagText((lead.tags || []).join(", "));
    setEditor({ ...lead });
  };

  const createLead = () => {
    setTagText("");
    setEditor(blankLead());
  };

  const advance = (lead: CrmLead) => {
    const next = nextCrmStage(lead.stage, activeStages);
    if (!next) {
      setDecision(lead);
      setConversion({
        monthlyRevenue: lead.estimatedValue,
        activeClients: 0,
        billingDay: 10,
        contractStart: localDate(),
      });
      setLossReason("");
      return;
    }
    setLeads((current) => current.map((item) => item.id === lead.id
      ? { ...item, stage: next, updatedAt: new Date().toISOString() }
      : item));
  };

  const moveToStage = (leadId: string, stage: CrmLead["stage"]) => {
    if (!activeStages.includes(stage)) return;
    setLeads((current) => current.map((lead) =>
      lead.id === leadId && activeStages.includes(lead.stage) && lead.stage !== stage
        ? { ...lead, stage, updatedAt: new Date().toISOString() }
        : lead,
    ));
  };

  const saveColumn = () => {
    if (!columnEditor?.label.trim()) return;
    if (columnEditor.id) {
      setColumns((current) => current.map((column) => column.id === columnEditor.id
        ? { ...column, label: columnEditor.label.trim(), color: columnEditor.color }
        : column));
    } else {
      const id = `custom-${Date.now()}`;
      setColumns((current) => [...current, { ...columnEditor, id, label: columnEditor.label.trim(), system: false }]);
    }
    setColumnEditor(null);
  };

  const deleteColumn = (column: CrmColumn) => {
    if (column.system || leads.some((lead) => lead.stage === column.id)) return;
    setColumns((current) => current.filter((item) => item.id !== column.id));
    setColumnEditor(null);
  };

  const restartFollowUp = (lead: CrmLead) => {
    setLeads((current) => current.map((item) => item.id === lead.id
      ? restartCrmFollowUp(item, localDate())
      : item));
    setView("active");
  };

  const win = () => {
    if (!decision || conversion.monthlyRevenue <= 0) return;
    const clientId = convertToClient(decision, conversion);
    setLeads((current) => current.map((lead) => lead.id === decision.id
      ? { ...lead, stage: "won", estimatedValue: conversion.monthlyRevenue, convertedClientId: clientId, updatedAt: new Date().toISOString() }
      : lead));
    setDecision(null);
    setView("won");
  };

  const lose = () => {
    if (!decision || !lossReason.trim()) return;
    setLeads((current) => current.map((lead) => lead.id === decision.id
      ? { ...lead, stage: "lost", lossReason: lossReason.trim(), updatedAt: new Date().toISOString() }
      : lead));
    setDecision(null);
    setView("lost");
  };

  return (
    <>
      <div className="section-head">
        <div><h2>CRM Comercial</h2><p>Prospecção e fechamento em um fluxo simples</p></div>
        <div className="crm-head-actions">
          <button className="btn ghost" onClick={() => setColumnEditor({ id: "", label: "", color: "#4b9cff", system: false })}><Plus /> Nova coluna</button>
          <button className="btn primary" onClick={createLead}><Plus /> Novo lead</button>
        </div>
      </div>

      <div className="crm-toolbar">
        <div className="segmented crm-periods">
          {CRM_PERIODS.map((item) => <button key={item} className={!actionMode && period === item ? "active" : ""} onClick={() => { setPeriod(item); setActionMode(false); }}>{item}</button>)}
          <button className={actionMode ? "active crm-actions-period" : "crm-actions-period"} onClick={() => setActionMode(true)}><CalendarDays /> Próximas ações</button>
        </div>
        <label className="crm-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lead..." /></label>
      </div>

      <div className="metrics four">
        <article className="metric"><span className="metric-icon blue"><Users /></span><div><small>Leads movimentados</small><strong>{metrics.total}</strong><em>No período selecionado</em></div></article>
        <article className="metric"><span className="metric-icon orange"><Target /></span><div><small>Pipeline ativo</small><strong>{metrics.active}</strong><em>{brl(metrics.pipelineValue)} em potencial</em></div></article>
        <article className="metric"><span className="metric-icon green"><Check /></span><div><small>Clientes ganhos</small><strong>{metrics.won}</strong><em>No período selecionado</em></div></article>
        <article className="metric"><span className="metric-icon blue"><TrendingUp /></span><div><small>Conversão</small><strong>{(metrics.conversion * 100).toFixed(1)}%</strong><em>Ganhos sobre decisões</em></div></article>
      </div>

      {!actionMode && <div className="tabs crm-tabs">
        <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>Pipeline</button>
        <button className={view === "won" ? "active" : ""} onClick={() => setView("won")}>Ganhos</button>
        <button className={view === "lost" ? "active" : ""} onClick={() => setView("lost")}>Follow-up</button>
      </div>}

      {actionMode ? (
        <section className="panel crm-actions-view">
          <div className="panel-title"><div><h3>Agenda de próximas ações</h3><p>Atrasos aparecem primeiro; depois, compromissos de hoje e futuros.</p></div></div>
          {(["overdue", "today", "upcoming", "unscheduled"] as const).map((status) => {
            const items = actionLeads.filter((lead) => crmActionStatus(lead.nextActionDate) === status);
            const labels = { overdue: "Atrasadas", today: "Hoje", upcoming: "Próximas", unscheduled: "Sem data" };
            return <div className={`crm-action-group ${status}`} key={status}>
              <header><span>{status === "overdue" && <AlertTriangle />}{labels[status]}</span><b>{items.length}</b></header>
              {items.map((lead) => <article key={lead.id}>
                <div><strong>{lead.company}</strong><small>{lead.contact || "Contato não informado"}</small></div>
                <span className="crm-stage-tag" style={{ "--stage-color": columns.find((column) => column.id === lead.stage)?.color || (lead.stage === "lost" ? "#ff6577" : "#4b9cff") } as CSSProperties}>{lead.stage === "lost" ? "Follow-up" : crmStageLabel(lead.stage, columns)}</span>
                <span>{lead.nextActionDate ? new Date(`${lead.nextActionDate}T12:00:00`).toLocaleDateString("pt-BR") : "Definir data"}</span>
                <div className="crm-action-row-buttons"><button onClick={() => editLead(lead)}><Pencil /> Editar</button>{lead.stage === "lost" ? <button onClick={() => restartFollowUp(lead)}><RotateCcw /> Retomar</button> : <button onClick={() => advance(lead)}>Avançar <ArrowUpRight /></button>}</div>
              </article>)}
              {!items.length && <p className="crm-action-empty">Nenhuma ação nesta categoria.</p>}
            </div>;
          })}
        </section>
      ) : view === "active" ? (
        <div className="crm-board">
          {columns.map((column) => {
            const stage = column.id;
            const stageLeads = visible.filter((lead) => lead.stage === stage);
            return <section
              className={`crm-column${draggedLeadId ? " drag-active" : ""}`}
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedLeadId) moveToStage(draggedLeadId, stage);
                setDraggedLeadId(null);
              }}
            >
              <header style={{ borderTopColor: column.color }}><span>{column.label}</span><div className="crm-column-tools"><b>{stageLeads.length}</b>{!column.system && <button onClick={() => setColumnEditor({ ...column })} title="Editar coluna"><Pencil /></button>}</div></header>
              <div className="crm-column-body">
                {stageLeads.map((lead) => {
                  const leadQuotes = quotesByLead.get(lead.id) || [];
                  const latestQuote = leadQuotes[0];
                  return <article
                    className="crm-card"
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggedLeadId(lead.id)}
                    onDragEnd={() => setDraggedLeadId(null)}
                  >
                  <div className="crm-card-head"><span>{lead.origin}</span><div><button onClick={() => editLead(lead)} title="Editar"><Pencil /></button><button onClick={() => setLeads((current) => current.filter((item) => item.id !== lead.id))} title="Excluir"><Trash2 /></button></div></div>
                  <h3>{lead.company}</h3>
                  <p>{lead.contact || "Contato ainda não informado"}</p>
                  <strong>{lead.estimatedValue > 0 ? `${brl(lead.estimatedValue)}/mês` : "Valor a definir"}</strong>
                  {!!lead.tags?.length && <div className="crm-card-tags">{lead.tags.map((item) => <span key={item}><Tag />{item}</span>)}</div>}
                  <div className="crm-card-tags automatic">
                    {crmActionStatus(lead.nextActionDate) === "overdue" && <span className="overdue"><AlertTriangle />Ação atrasada</span>}
                    {crmActionStatus(lead.nextActionDate) === "today" && <span className="today"><CalendarDays />Ação hoje</span>}
                    {latestQuote && <span className="quoted"><Calculator />Cotado</span>}
                  </div>
                  {latestQuote && <div className="crm-quote-chip">
                    <Calculator />
                    <span><b>Última cotação: {brl(latestQuote.negotiatedPrice)}</b><small>{leadQuotes.length} cotação(ões) vinculada(s)</small></span>
                  </div>}
                  <small><CalendarDays /> Próxima ação: {lead.nextActionDate ? new Date(`${lead.nextActionDate}T12:00:00`).toLocaleDateString("pt-BR") : "Não agendada"}</small>
                  <div className="crm-card-actions">
                    <button onClick={() => openPricing(lead)}><Calculator /> Cotar</button>
                    <button className="advance" onClick={() => advance(lead)}>{stage === activeStages[activeStages.length - 1] ? "Decidir" : "Avançar"}<ArrowUpRight /></button>
                  </div>
                </article>})}
                {!stageLeads.length && <div className="crm-column-empty">Nenhum lead</div>}
              </div>
            </section>;
          })}
        </div>
      ) : (
        <section className="panel crm-list">
          <div className="panel-title"><div><h3>{view === "won" ? "Clientes ganhos" : "Follow-up de recuperação"}</h3><p>{view === "won" ? "Histórico do período selecionado" : "Nenhum lead é descartado: retome a prospecção quando for oportuno."}</p></div></div>
          {visible.map((lead) => <article key={lead.id}>
            <div><b>{lead.company}</b><small>{lead.contact || lead.origin}</small></div>
            <span>{brl(lead.estimatedValue)}</span>
            <span>{new Date(lead.updatedAt).toLocaleDateString("pt-BR")}</span>
            <em>{view === "lost" ? lead.lossReason : "Convertido em cliente"}</em>
            {view === "lost"
              ? <button className="crm-restart" title="Voltar ao início do follow-up" onClick={() => restartFollowUp(lead)}><RotateCcw /></button>
              : <button onClick={() => editLead(lead)}><Pencil /></button>}
          </article>)}
          {!visible.length && <div className="crm-list-empty">Nenhum registro neste período.</div>}
        </section>
      )}

      {editor && <div className="modal-bg"><div className="modal crm-modal">
        <div className="modal-head"><div><small>CRM COMERCIAL</small><h3>{editor.id ? "Editar lead" : "Novo lead"}</h3></div><button className="icon" onClick={() => setEditor(null)}><X /></button></div>
        <div className="form-grid">
          <label>Empresa / provedor<input value={editor.company} onChange={(event) => setEditor({ ...editor, company: event.target.value })} autoFocus /></label>
          <label>Nome do contato<input value={editor.contact} onChange={(event) => setEditor({ ...editor, contact: event.target.value })} /></label>
          <label>Telefone / WhatsApp<input value={editor.phone} onChange={(event) => setEditor({ ...editor, phone: event.target.value })} /></label>
          <label>E-mail<input type="email" value={editor.email} onChange={(event) => setEditor({ ...editor, email: event.target.value })} /></label>
          <label>Origem<select value={editor.origin} onChange={(event) => setEditor({ ...editor, origin: event.target.value })}>{CRM_ORIGINS.map((origin) => <option key={origin}>{origin}</option>)}</select></label>
          <label>Etapa atual<div className="crm-stage-readonly">{crmStageLabel(editor.stage, columns)}<small>Altere pelo botão Avançar ou arrastando o card.</small></div></label>
          <label>Valor mensal estimado<input type="number" min="0" value={editor.estimatedValue} onChange={(event) => setEditor({ ...editor, estimatedValue: Number(event.target.value) || 0 })} /></label>
          <label>Próxima ação<input type="date" value={editor.nextActionDate} onChange={(event) => setEditor({ ...editor, nextActionDate: event.target.value })} /></label>
          <label className="full-field">Tags do card<input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Ex.: prioridade, indicação, retorno" /><small>Separe as tags por vírgulas.</small></label>
        </div>
        <label>Observações<textarea value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} placeholder="Contexto da conversa e próximo passo" /></label>
        <div className="crm-owner"><Users /> Responsável automático: <b>Vinicius Scielzo</b></div>
        <div className="modal-actions"><button className="btn ghost" onClick={() => setEditor(null)}>Cancelar</button><button className="btn primary" onClick={saveLead}><Check /> Salvar lead</button></div>
      </div></div>}

      {columnEditor && <div className="modal-bg"><div className="modal crm-column-modal">
        <div className="modal-head"><div><small>PIPELINE PERSONALIZÁVEL</small><h3>{columnEditor.id ? "Editar coluna" : "Nova coluna"}</h3></div><button className="icon" onClick={() => setColumnEditor(null)}><X /></button></div>
        <label>Nome da coluna<input value={columnEditor.label} onChange={(event) => setColumnEditor({ ...columnEditor, label: event.target.value })} placeholder="Ex.: Reunião agendada" autoFocus /></label>
        <label>Cor da coluna<div className="crm-color-field"><input type="color" value={columnEditor.color} onChange={(event) => setColumnEditor({ ...columnEditor, color: event.target.value })} /><span>{columnEditor.color}</span></div></label>
        {columnEditor.id && !columnEditor.system && leads.some((lead) => lead.stage === columnEditor.id) && <p className="crm-column-warning">Para excluir esta coluna, mova primeiro os leads que estão nela.</p>}
        <div className="modal-actions">
          {columnEditor.id && !columnEditor.system && <button className="btn danger" disabled={leads.some((lead) => lead.stage === columnEditor.id)} onClick={() => deleteColumn(columnEditor)}><Trash2 /> Excluir coluna</button>}
          <button className="btn ghost" onClick={() => setColumnEditor(null)}>Cancelar</button>
          <button className="btn primary" onClick={saveColumn}><Check /> Salvar coluna</button>
        </div>
      </div></div>}

      {decision && <div className="modal-bg"><div className="modal crm-modal">
        <div className="modal-head"><div><small>DECISÃO DA NEGOCIAÇÃO</small><h3>{decision.company}</h3></div><button className="icon" onClick={() => setDecision(null)}><X /></button></div>
        <section className="crm-decision win"><h4><Building2 /> Adicionar como cliente</h4><p>Cria o cliente e as previsões mensais. Complete depois os horários em Clientes e Contratos.</p>
          <div className="form-grid">
            <label>MRR fechado<input type="number" min="1" value={conversion.monthlyRevenue} onChange={(event) => setConversion({ ...conversion, monthlyRevenue: Number(event.target.value) || 0 })} /></label>
            <label>Base ativa<input type="number" min="0" value={conversion.activeClients} onChange={(event) => setConversion({ ...conversion, activeClients: Number(event.target.value) || 0 })} /></label>
            <label>Dia de vencimento<input type="number" min="1" max="31" value={conversion.billingDay} onChange={(event) => setConversion({ ...conversion, billingDay: Number(event.target.value) || 10 })} /></label>
            <label>Início do contrato<input type="date" value={conversion.contractStart} onChange={(event) => setConversion({ ...conversion, contractStart: event.target.value })} /></label>
          </div><button className="btn primary full" onClick={win}><Check /> Fechado — adicionar cliente</button>
        </section>
        <section className="crm-decision loss"><h4><X /> Enviar para follow-up</h4><p>O lead continuará salvo e poderá voltar ao início da prospecção a qualquer momento.</p><label>Motivo do follow-up<textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="Preço, momento, concorrente, sem retorno..." /></label><button className="btn ghost full" onClick={lose}>Mover para follow-up</button></section>
      </div></div>}
    </>
  );
}
