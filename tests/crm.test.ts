import assert from "node:assert/strict";
import test from "node:test";
import {
  attachQuoteToCrmLead,
  crmMetrics,
  filterCrmLeads,
  nextCrmStage,
  restartCrmFollowUp,
  type CrmLead,
} from "../lib/crm";

const lead = (stage: CrmLead["stage"], updatedAt: string, value = 1000): CrmLead => ({
  id: `${stage}-${updatedAt}`,
  company: "Provedor teste",
  contact: "Contato",
  phone: "",
  email: "",
  origin: "Prospecção ativa",
  stage,
  estimatedValue: value,
  nextActionDate: "2026-09-02",
  notes: "",
  owner: "Vinicius Scielzo",
  createdAt: updatedAt,
  updatedAt,
});

test("pipeline avança na ordem e para na negociação", () => {
  assert.equal(nextCrmStage("prospecting"), "contacted");
  assert.equal(nextCrmStage("proposal"), "negotiation");
  assert.equal(nextCrmStage("negotiation"), null);
});

test("cotar não é uma transição de etapa do pipeline", () => {
  const current = lead("qualified", "2026-09-02T10:00:00Z", 0);
  const quoted = attachQuoteToCrmLead(current, 7990, "2026-09-02T11:00:00Z");
  assert.equal(quoted.stage, "qualified");
  assert.equal(quoted.estimatedValue, 7990);
});

test("lead em follow-up pode voltar ao início da prospecção", () => {
  const current = { ...lead("lost", "2026-09-02T10:00:00Z"), lossReason: "Sem retorno" };
  const restarted = restartCrmFollowUp(current, "2026-09-03", "2026-09-02T12:00:00Z");
  assert.equal(restarted.stage, "prospecting");
  assert.equal(restarted.lossReason, undefined);
  assert.equal(restarted.nextActionDate, "2026-09-03");
});

test("filtro comercial respeita o período selecionado", () => {
  const now = new Date("2026-09-02T15:00:00Z");
  const leads = [lead("prospecting", "2026-09-02T10:00:00Z"), lead("won", "2026-08-01T10:00:00Z")];
  assert.equal(filterCrmLeads(leads, "Hoje", now).length, 1);
  assert.equal(filterCrmLeads(leads, "Tudo", now).length, 2);
});

test("indicadores calculam pipeline e conversão", () => {
  const now = new Date("2026-09-02T15:00:00Z");
  const leads = [
    lead("qualified", "2026-09-02T10:00:00Z", 5000),
    lead("won", "2026-09-02T11:00:00Z", 7000),
    lead("lost", "2026-09-02T12:00:00Z", 4000),
  ];
  const metrics = crmMetrics(leads, "Hoje", now);
  assert.equal(metrics.active, 1);
  assert.equal(metrics.pipelineValue, 5000);
  assert.equal(metrics.won, 1);
  assert.equal(metrics.conversion, 0.5);
});
