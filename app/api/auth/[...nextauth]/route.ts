import NextAuth from "next-auth/next";

import { authOptions } from "@/lib/auth";

/**
 * next-auth v4 App Router entry point.
 *
 * `next-auth/next` exposes the single-options overload that returns a handler
 * accepting Web Request/Response, which is what the catch-all route segment
 * needs. The returned function is a plain request handler, so Next.js route
 * handlers must export it under the HTTP method names rather than as `default`.
 *
 * This module also marks the whole auth surface as dynamic. next-auth reads
 * request headers and cookies on every call, and every provider and session
 * callback in `authOptions` depends on those values, so this response can never
 * be cached or statically prerendered.
 */
const handler = NextAuth(authOptions);

export const dynamic = "force-dynamic";

export { handler as GET, handler as POST };