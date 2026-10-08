import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type {
  DefaultSession,
  NextAuthOptions,
  Session,
  User,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import type { Role } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Reads a required environment variable and fails by name.
 *
 * The non-null assertion is avoided deliberately: an unset variable surfaces
 * here as a message naming the missing key, instead of failing later inside the
 * OAuth exchange with an opaque provider error.
 */
function requireSecret(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * The subset of Auth.js session-callback parameters this module actually reads.
 *
 * Declared explicitly instead of reusing the overloaded `SessionCallback`
 * signature, so the callback can be unit tested by passing a plain object
 * without inventing unused `token` / `newSession` arguments.
 */
export type SessionIdentityInput = {
  session: Session;
  user: User;
};

/**
 * Copies the adapter-loaded identity onto the session.
 *
 * Runs on every session read. Because the session strategy is "database",
 * `user` is the row the adapter loaded from Postgres, so the stored role is
 * authoritative.
 *
 * This role is for presentation only. Authorization decisions must re-read the
 * user from the database rather than trust this value.
 */
export function attachIdentityToSession({
  session,
  user,
}: SessionIdentityInput): Session {
  // Fails closed rather than inventing a role. `role` is non-nullable in
  // Postgres with a `STUDENT` default, so a row reaching this callback without
  // one means the adapter did not load what it claims to have loaded. Defaulting
  // here would hand a caller a role nobody granted them and hide the fault.
  if (user.role === undefined) {
    throw new Error("Adapter returned a user without a role");
  }

  session.user.id = user.id;
  session.user.role = user.role;
  return session;
}

/**
 * NEXTAUTH_URL and NEXTAUTH_SECRET are read by next-auth itself, so they are
 * intentionally absent here. Only the provider credentials belong in config.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: requireSecret("GOOGLE_CLIENT_ID"),
      clientSecret: requireSecret("GOOGLE_CLIENT_SECRET"),
    }),
  ],

  // Sessions live in the Session table rather than in a cookie, so they can be
  // revoked server-side and audited.
  session: { strategy: "database" },

  // Redirects next-auth's default unstyled provider list to the branded route.
  pages: { signIn: "/login" },

  callbacks: {
    session: attachIdentityToSession,
  },
};

declare module "next-auth" {
  /**
   * Optional, and the reason is an asymmetry inside Auth.js v4 rather than in
   * this schema. `role` is non-nullable in Postgres with a `STUDENT` default, so
   * a stored row always carries one, but v4 reuses a single `User` type for both
   * directions of `Adapter.createUser`, whose declared parameter is
   * `Omit<AdapterUser, "id">` — precisely the object a caller must be able to
   * build *without* a role so the column default applies. Declaring it required
   * therefore makes the documented database default unrepresentable, and because
   * `Adapter.createUser` is a union of two function types, a call is checked
   * against the intersection of their parameters.
   *
   * Optional on the way in does not weaken the way out: `Session["user"].role`
   * below stays a required `Role`, and `attachIdentityToSession` narrows this
   * property and throws when it is absent rather than defaulting it.
   */
  interface User {
    role?: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}