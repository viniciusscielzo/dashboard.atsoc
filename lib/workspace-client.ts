export type WorkspacePayload = Record<string, unknown>;
const STORAGE_KEY = "atsoc-workspace-local-v1";

function readWorkspace(): WorkspacePayload | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as WorkspacePayload
      : null;
  } catch {
    return null;
  }
}

function writeWorkspace(data: WorkspacePayload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error("O navegador não conseguiu salvar os dados locais.");
  }
}

export async function loadWorkspace() {
  return {
    data: readWorkspace(),
    revision: Date.now(),
    role: "Proprietário",
    user: { id: "local-owner", email: "vinicius@atsoc.com.br", name: "Vinicius" },
  };
}

export async function initializeWorkspace(data: WorkspacePayload) {
  writeWorkspace(data);
  return { data, revision: Date.now() };
}

export async function persistWorkspaceResource(resource: string, value: unknown) {
  const data = readWorkspace() || {};
  writeWorkspace({ ...data, [resource]: value });
  return { revision: Date.now() };
}
