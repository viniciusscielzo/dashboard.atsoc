"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return setMessage("Use pelo menos 10 caracteres.");
    if (password !== confirm) return setMessage("As senhas não coincidem.");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) setMessage("O link expirou ou não foi possível alterar a senha.");
    else window.location.assign("/");
  };
  return <main className="auth-page"><section className="auth-form-wrap standalone"><form className="auth-form" onSubmit={submit}><small>ATSOC CONTROL</small><h2>Definir nova senha</h2><p>Crie uma senha forte com pelo menos 10 caracteres.</p><label>Nova senha<div><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div></label><label>Confirmar senha<div><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div></label>{message && <div className="auth-message">{message}</div>}<button className="auth-submit">Salvar nova senha</button></form></section></main>;
}
