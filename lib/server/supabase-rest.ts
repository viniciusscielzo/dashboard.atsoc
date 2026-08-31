import { getSupabaseServerEnv } from "./runtime-env";

type SupabaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  accessToken: string;
  body?: unknown;
  prefer?: string;
};

/**
 * Server-only REST boundary for Supabase.
 * The caller must pass the authenticated user's JWT so Row Level Security is
 * enforced. The service-role key is intentionally not read here.
 */
export async function supabaseRequest<T>(
  path: string,
  { method = "GET", accessToken, body, prefer }: SupabaseRequestOptions,
): Promise<T> {
  if (!accessToken) throw new Error("Sessão autenticada obrigatória.");
  if (!path.startsWith("/rest/v1/")) throw new Error("Rota Supabase inválida.");
  const { url, anonKey } = getSupabaseServerEnv();
  const response = await fetch(`${url}${path}`, {
    method,
    cache: "no-store",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") || "indisponível";
    throw new Error(`Falha segura no acesso aos dados (${response.status}; ${requestId}).`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
