"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Calculator,
  Check,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  CRM_ACTIVE_STAGES,
  CRM_ORIGINS,
  CRM_PERIODS,
  CRM_STAGE_LABELS,
  crmMetrics,
  filterCrmLeads,
  nextCrmStage,
  type CrmLead,
  type CrmPeriod,
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
  setLeads,
  openPricing,
  convertToClient,
}: {
  leads: CrmLead[];
  setLeads: (updater: CrmLead[] | ((current: CrmLead[]) => CrmLead[])) => void;
  openPricing: (lead: CrmLead) => void;
  convertToClient: (lead: CrmLead, data: ConversionData) => string;
}) {
  const [period, setPeriod] = useState<CrmPeriod>("30 dias");
  const [view, setView] = useState<"active" | "won" | "lost">("active");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<CrmLead | null>(null);
  const [decision, setDecision] = useState<CrmLead | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [conversion, setConversion] = useState<ConversionData>({
    monthlyRevenue: 0,
    activeClients: 0,
    billingDay: 10,
    contractStart: localDate(),
  });

  const metrics = useMemo(() => crmMetrics(leads, period), [leads, period]);
  const visible = useMemo(() => {
    const periodLeads = filterCrmLeads(leads, period);
    const byView = periodLeads.filter((lead) =>
      view === "active" ? CRM_ACTIVE_STAGES.includes(lead.stage) : lead.stage === view,
    );
    const term = query.trim().toLowerCase();
    return term
      ? byView.filter((lead) => `${lead.company} ${lead.contact} ${lead.phone}`.toLowerCase().includes(term))
      : byView;
  }, [leads, period, query, view]);

  const saveLead = () => {
    if (!editor?.company.trim()) return;
    const now = new Date().toISOString();
    const record: CrmLead = {
      ...editor,
      id: editor.id || `lead-${Date.now()}`,
      company: editor.company.trim(),
      owner: "Vinicius Scielzo",
      createdAt: editor.createdAt || now,
      updatedAt: now,
    };
    setLeads((current) => editor.id
      ? current.map((lead) => lead.id === editor.id ? record : lead)
      : [record, ...current]);
    setEditor(null);
  };

  const advance = (lead: CrmLead) => {
    const next = nextCrmStage(lead.stage);
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
        <button className="btn primary" onClick={() => setEditor(blankLead())}><Plus /> Novo lead</button>
      </div>

      <div className="crm-toolbar">
        <div className="segmented crm-periods">
          {CRM_PERIODS.map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}
        </div>
        <label className="crm-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lead..." /></label>
      </div>

      <div className="metrics four">
        <article className="metric"><span className="metric-icon blue"><Users /></span><div><small>Leads movimentados</small><strong>{metrics.total}</strong><em>No período selecionado</em></div></article>
        <article className="metric"><span className="metric-icon orange"><Target /></span><div><small>Pipeline ativo</small><strong>{metrics.active}</strong><em>{brl(metrics.pipelineValue)} em potencial</em></div></article>
        <article className="metric"><span className="metric-icon green"><Check /></span><div><small>Clientes ganhos</small><strong>{metrics.won}</strong><em>No período selecionado</em></div></article>
        <article className="metric"><span className="metric-icon blue"><TrendingUp /></span><div><small>Conversão</small><strong>{(metrics.conversion * 100).toFixed(1)}%</strong><em>Ganhos sobre decisões</em></div></article>
      </div>

      <div className="tabs crm-tabs">
        <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>Pipeline</button>
        <button className={view === "won" ? "active" : ""} onClick={() => setView("won")}>Ganhos</button>
        <button className={view === "lost" ? "active" : ""} onClick={() => setView("lost")}>Perdidos</button>
      </div>

      {view === "active" ? (
        <div className="crm-board">
          {CRM_ACTIVE_STAGES.map((stage) => {
            const stageLeads = visible.filter((lead) => lead.stage === stage);
            return <section className="crm-column" key={stage}>
              <header><span>{CRM_STAGE_LABELS[stage]}</span><b>{stageLeads.length}</b></header>
              <div className="crm-column-body">
                {stageLeads.map((lead) => <article className="crm-card" key={lead.id}>
                  <div className="crm-card-head"><span>{lead.origin}</span><div><button onClick={() => setEditor({ ...lead })} title="Editar"><Pencil /></button><button onClick={() => setLeads((current) => current.filter((item) => item.id !== lead.id))} title="Excluir"><Trash2 /></button></div></div>
                  <h3>{lead.company}</h3>
                  <p>{lead.contact || "Contato ainda não informado"}</p>
                  <strong>{lead.estimatedValue > 0 ? `${brl(lead.estimatedValue)}/mês` : "Valor a definir"}</strong>
                  <small><CalendarDays /> Próxima ação: {new Date(`${lead.nextActionDate}T12:00:00`).toLocaleDateString("pt-BR")}</small>
                  <div className="crm-card-actions">
                    <button onClick={() => openPricing(lead)}><Calculator /> Cotar</button>
                    <button className="advance" onClick={() => advance(lead)}>{stage === "negotiation" ? "Decidir" : "Avançar"}<ArrowUpRight /></button>
                  </div>
                </article>)}
                {!stageLeads.length && <div className="crm-column-empty">Nenhum lead</div>}
              </div>
            </section>;
          })}
        </div>
      ) : (
        <section className="panel crm-list">
          <div className="panel-title"><div><h3>{view === "won" ? "Clientes ganhos" : "Oportunidades perdidas"}</h3><p>Histórico do período selecionado</p></div></div>
          {visible.map((lead) => <article key={lead.id}>
            <div><b>{lead.company}</b><small>{lead.contact || lead.origin}</small></div>
            <span>{brl(lead.estimatedValue)}</span>
            <span>{new Date(lead.updatedAt).toLocaleDateString("pt-BR")}</span>
            <em>{view === "lost" ? lead.lossReason : "Convertido em cliente"}</em>
            <button onClick={() => setEditor({ ...lead })}><Pencil /></button>
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
          <label>Etapa<select value={editor.stage} onChange={(event) => setEditor({ ...editor, stage: event.target.value as CrmLead["stage"] })}>{CRM_ACTIVE_STAGES.map((stage) => <option key={stage} value={stage}>{CRM_STAGE_LABELS[stage]}</option>)}</select></label>
          <label>Valor mensal estimado<input type="number" min="0" value={editor.estimatedValue} onChange={(event) => setEditor({ ...editor, estimatedValue: Number(event.target.value) || 0 })} /></label>
          <label>Próxima ação<input type="date" value={editor.nextActionDate} onChange={(event) => setEditor({ ...editor, nextActionDate: event.target.value })} /></label>
        </div>
        <label>Observações<textarea value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} placeholder="Contexto da conversa e próximo passo" /></label>
        <div className="crm-owner"><Users /> Responsável automático: <b>Vinicius Scielzo</b></div>
        <div className="modal-actions"><button className="btn ghost" onClick={() => setEditor(null)}>Cancelar</button><button className="btn primary" onClick={saveLead}><Check /> Salvar lead</button></div>
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
        <section className="crm-decision loss"><h4><X /> Marcar como perdido</h4><label>Motivo da perda<textarea value={lossReason} onChange={(event) => setLossReason(event.target.value)} placeholder="Preço, momento, concorrente, sem retorno..." /></label><button className="btn ghost full" onClick={lose}>Registrar perda</button></section>
      </div></div>}
    </>
  );
}
