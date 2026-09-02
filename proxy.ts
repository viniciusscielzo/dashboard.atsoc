import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_AUTH_COOKIE, verifyLocalSessionToken } from "@/lib/server/local-auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((item) => path.startsWith(item));
  const authenticated = verifyLocalSessionToken(
    request.cookies.get(LOCAL_AUTH_COOKIE)?.value,
  );

  if (!authenticated && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }
  if (authenticated && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
