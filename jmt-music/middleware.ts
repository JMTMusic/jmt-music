import { NextRequest, NextResponse } from "next/server";
import { isValidSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/control-center/session";

/**
 * Protects every Control Center / Dashboard / Studio route with a signed
 * session cookie set by /login (see app/login/actions.ts). Replaces the
 * earlier HTTP Basic Auth prompt with a real, brandable login page.
 */
export async function middleware(request: NextRequest) {
  const username = process.env.CONTROL_CENTER_USERNAME;
  const password = process.env.CONTROL_CENTER_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Control Center authentication is not configured.", {
      status: 503
    });
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await isValidSessionCookieValue(cookieValue, password);

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Control Center's project/client surface is being rebuilt (2026-09-14) — send that
  // traffic to the newer /dashboard workspace instead. Other Control Center modules
  // (beats, website, growth engine, etc.) are unaffected and still resolve normally.
  const { pathname } = request.nextUrl;
  if (pathname === "/control-center" || pathname === "/control-center/projects") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  const projectMatch = pathname.match(/^\/control-center\/projects\/([^/]+)$/);
  if (projectMatch) {
    return NextResponse.redirect(new URL(`/dashboard/${projectMatch[1]}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/control-center/:path*", "/dashboard/:path*", "/studio/:path*"]
};
