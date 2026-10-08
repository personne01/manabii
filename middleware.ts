import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    const allowed = role === "ADMIN" || role === "CONTENT_EDITOR";

    if (path.startsWith("/admin") && !allowed) {
      const url = new URL("/unauthorized", req.url);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/admin/:path*"],
};
