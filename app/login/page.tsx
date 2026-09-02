"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("vinicius@atsoc.com.br");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) setMessage(result.error || "E-mail ou senha inválidos.");
      else window.location.assign("/");
    } catch {
      setMessage("Não foi possível entrar. Tente novamente.");
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
          <h2>Entrar no sistema</h2>
          <p>Use seu e-mail corporativo e sua senha.</p>
          <label>E-mail<div><Mail /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></label>
          <label>Senha<div><LockKeyhole /><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar ou ocultar senha">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
          {message && <div className="auth-message error">{message}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? "Aguarde..." : "Entrar"}</button>
        </form>
      </section>
    </main>
  );
}
