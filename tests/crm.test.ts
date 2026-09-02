import assert from "node:assert/strict";
import test from "node:test";
import { crmMetrics, filterCrmLeads, nextCrmStage, type CrmLead } from "../lib/crm";

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
