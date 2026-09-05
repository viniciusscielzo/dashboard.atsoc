import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RESOURCES = new Set([
  "parameters",
  "financialEntries",
  "recurringRules",
  "teamMembers",
  "clientRecords",
  "quoteRecords",
  "scenarioRecords",
  "crmLeads",
  "crmColumns",
  "companyLogo",
  "initialBalance",
  "approvalRequests",
  "discountAudit",
]);
const MAX_BODY_BYTES = 4_000_000;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function context() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: responseError("Sessão inválida.", 401) };

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) return { error: responseError("Falha ao validar o acesso.", 500) };
  if (!membership) return { error: responseError("Usuário ainda não vinculado à empresa.", 403) };
  return { supabase, user, membership };
}

export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const { supabase, user, membership } = ctx;
  const { data, error } = await supabase
    .from("workspace_states")
    .select("data, revision, updated_at")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (error) return responseError("Não foi possível carregar os dados da empresa.", 500);
  return NextResponse.json({
    data: data?.data ?? null,
    revision: data?.revision ?? 0,
    role: membership.role,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split("@")[0],
    },
  });
}

export async function PUT(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return responseError("Conteúdo acima do limite permitido.", 413);
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const { supabase, membership } = ctx;
  if (!["owner", "admin", "partner"].includes(membership.role)) {
    return responseError("Perfil sem permissão para inicializar a empresa.", 403);
  }
  let body: { data?: Record<string, unknown> };
  try { body = JSON.parse(raw); } catch { return responseError("Conteúdo inválido.", 400); }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return responseError("Estado inicial inválido.", 400);
  }
  const cleanData = Object.fromEntries(
    Object.entries(body.data).filter(([key]) => RESOURCES.has(key)),
  );
  const { data, error } = await supabase
    .from("workspace_states")
    .upsert(
      { organization_id: membership.organization_id, data: cleanData, updated_by: ctx.user.id },
      { onConflict: "organization_id", ignoreDuplicates: true },
    )
    .select("data, revision")
    .single();
  if (error) return responseError("Não foi possível inicializar os dados.", 500);
  return NextResponse.json({ data: data.data, revision: data.revision });
}

export async function PATCH(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return responseError("Conteúdo acima do limite permitido.", 413);
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  let body: { resource?: string; value?: unknown };
  try { body = JSON.parse(raw); } catch { return responseError("Conteúdo inválido.", 400); }
  if (!body.resource || !RESOURCES.has(body.resource)) return responseError("Recurso inválido.", 400);

  const { data, error } = await ctx.supabase.rpc("update_workspace_resource", {
    target_org: ctx.membership.organization_id,
    resource_name: body.resource,
    resource_value: body.value,
  });
  if (error) return responseError("Alteração não autorizada ou não salva.", 403);
  return NextResponse.json({ revision: data });
}
