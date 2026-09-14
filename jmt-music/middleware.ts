
import { NextRequest, NextResponse } from "next/server";

/**
 * Protects every Control Center route with server-side HTTP Basic authentication.
 * Requests are denied when credentials have not been configured.
 */
export function middleware(request: NextRequest) {
  const username = process.env.CONTROL_CENTER_USERNAME;
  const password = process.env.CONTROL_CENTER_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Control Center authentication is not configured.", {
      status: 503
    });
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const [providedUsername, providedPassword] = atob(
        authorization.slice(6)
      ).split(":");

      if (providedUsername === username && providedPassword === password) {
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
    } catch {
      // A malformed authorization header is treated as an unauthenticated request.
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="JMT Music Control Center"' }
  });
}

export const config = {
  matcher: ["/control-center/:path*", "/dashboard/:path*", "/studio/:path*"]
};
