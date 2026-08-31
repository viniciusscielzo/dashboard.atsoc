export type WorkspacePayload = Record<string, unknown>;

async function parseResponse(response: Response) {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    data?: WorkspacePayload | null;
    role?: string;
    user?: { id: string; email?: string; name?: string };
  };
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("Sessão expirada.");
  }
  if (!response.ok) throw new Error(body.error || "Não foi possível acessar os dados.");
  return body;
}

export async function loadWorkspace() {
  return parseResponse(
    await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" }),
  );
}

export async function initializeWorkspace(data: WorkspacePayload) {
  return parseResponse(
    await fetch("/api/workspace", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    }),
  );
}

export async function persistWorkspaceResource(resource: string, value: unknown) {
  return parseResponse(
    await fetch("/api/workspace", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, value }),
    }),
  );
}
