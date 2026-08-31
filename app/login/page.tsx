"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!configured) return;
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    if (recovery) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      setMessage(error ? "Não foi possível enviar o link." : "Link de recuperação enviado. Verifique seu e-mail.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("E-mail ou senha inválidos.");
      else window.location.assign("/");
    }
    setBusy(false);
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand"><div>A</div><span><b>ATSOC</b><small>SUPORTE</small></span></div>
        <div className="auth-copy">
          <span><ShieldCheck /> Ambiente protegido</span>
          <h1>Decisões melhores começam com números confiáveis.</h1>
          <p>Gestão financeira, precificação e capacidade operacional em um único ambiente executivo.</p>
        </div>
        <small className="auth-security">Acesso restrito aos usuários autorizados pela ATSOC.</small>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <small>ATSOC CONTROL</small>
          <h2>{recovery ? "Recuperar acesso" : "Entrar no sistema"}</h2>
          <p>{recovery ? "Enviaremos um link seguro para redefinir sua senha." : "Use seu e-mail corporativo e sua senha."}</p>
          {!configured && <div className="auth-message error">Configure as variáveis do Supabase na Vercel para liberar o acesso.</div>}
          <label>E-mail<div><Mail /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></label>
          {!recovery && <label>Senha<div><LockKeyhole /><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar ou ocultar senha">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>}
          {message && <div className="auth-message">{message}</div>}
          <button className="auth-submit" disabled={busy || !configured}>{busy ? "Aguarde..." : recovery ? "Enviar link seguro" : "Entrar"}</button>
          <button className="auth-link" type="button" onClick={() => { setRecovery((value) => !value); setMessage(""); }}>{recovery ? "Voltar para o login" : "Esqueci minha senha"}</button>
        </form>
      </section>
    </main>
  );
}
