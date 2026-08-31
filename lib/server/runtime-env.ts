type SupabaseServerEnv = {
  url: string;
  anonKey: string;
};

const required = (name: string, value?: string) => {
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
};

export function getSupabaseServerEnv(): SupabaseServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("Configuração do Supabase acessada fora do servidor.");
  }
  return {
    url: required("SUPABASE_URL", process.env.SUPABASE_URL).replace(/\/$/, ""),
    anonKey: required("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY),
  };
}

export function databaseConfigurationStatus() {
  return {
    supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
    supabaseAnonKeyConfigured: Boolean(process.env.SUPABASE_ANON_KEY),
    encryptionKeyConfigured: Boolean(process.env.ATSOC_ENCRYPTION_KEY),
  };
}
