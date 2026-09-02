import { NextResponse } from "next/server";
import {
  LOCAL_AUTH_COOKIE,
  createLocalSessionToken,
  localSessionCookieOptions,
  verifyLocalCredentials,
} from "@/lib/server/local-auth";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados de acesso inválidos." }, { status: 400 });
  }

  if (!verifyLocalCredentials(body.email || "", body.password || "")) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(LOCAL_AUTH_COOKIE, createLocalSessionToken(), localSessionCookieOptions);
  return response;
}
