"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="fatal-error"><div><small>ATSOC CONTROL</small><h1>Não foi possível abrir este módulo.</h1><p>Seus dados não foram apagados. Tente carregar novamente; se o erro continuar, informe o administrador.</p><button onClick={reset}>Tentar novamente</button></div></main>;
}
