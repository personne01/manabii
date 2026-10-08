import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

import type { Role } from "@/app/generated/prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  image: string | null;
};

const ROLE_RANK: Record<Role, number> = {
  STUDENT: 0,
  CONTENT_EDITOR: 1,
  ADMIN: 2,
};

export function hasRequiredRole(userRole: Role, required: Role | Role[]) {
  const requiredList = Array.isArray(required) ? required : [required];
  const userRank = ROLE_RANK[userRole];
  return requiredList.some((r) => userRank >= ROLE_RANK[r]);
}

/**
 * Ambil user terautentikasi dari DB (authoritative).
 * Jangan percaya session.user.role.
 * Return null kalau belum login / user nggak ditemukan.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) return null;

  const user = await db.user.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      image: true,
    },
  });

  if (!user) return null;

  return user;
}

/**
 * Wajib login. Redirect ke /login kalau belum login.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Wajib login + minimal role CONTENT_EDITOR atau ADMIN (bisa edit konten).
 * Redirect ke /unauthorized kalau role tidak cukup.
 */
export async function requireContentEditor(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasRequiredRole(user.role, ["CONTENT_EDITOR", "ADMIN"])) {
    redirect("/unauthorized");
  }
  return user;
}

/**
 * Hanya ADMIN.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!hasRequiredRole(user.role, "ADMIN")) {
    redirect("/unauthorized");
  }
  return user;
}
