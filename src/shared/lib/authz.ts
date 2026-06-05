/**
 * authz.ts — Role & organization access helpers (T-05 foundation).
 *
 * The NextAuth session carries the user's org memberships and roles
 * (see features/auth/api/[...nextauth]/route.ts). These helpers read that
 * shape so route handlers and services can enforce access consistently
 * instead of re-deriving it everywhere.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/api/[...nextauth]/route";

export type Role = "OWNER" | "ADMIN" | "AGENT";

// Higher number = more privilege.
const ROLE_RANK: Record<Role, number> = {
  AGENT: 1,
  ADMIN: 2,
  OWNER: 3,
};

export interface SessionOrg {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface AppSessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  organizations: SessionOrg[];
  activeOrgId?: string | null;
}

export interface AppSession {
  user: AppSessionUser;
}

/** Read the typed application session, or null if unauthenticated. */
export async function getAppSession(): Promise<AppSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as unknown as AppSession;
}

/** Find the membership role the user holds in a given org, or null. */
export function roleInOrg(session: AppSession, orgId: string): Role | null {
  const org = session.user.organizations?.find((o) => o.id === orgId);
  return org?.role ?? null;
}

/** True when the user is a member of the org with at least `minRole`. */
export function hasOrgRole(session: AppSession, orgId: string, minRole: Role = "AGENT"): boolean {
  const role = roleInOrg(session, orgId);
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}
