import { NextResponse } from "next/server";
import { LOCAL_AUTH_COOKIE, localSessionCookieOptions } from "@/lib/server/local-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set(LOCAL_AUTH_COOKIE, "", {
    ...localSessionCookieOptions,
    maxAge: 0,
  });
  return response;
}
