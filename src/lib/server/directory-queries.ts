import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import type { Role } from "@/lib/rbac/capabilities";
import { escapeLike } from "@/lib/server/query-utils";

/*
 * The staff directory: the record of who may sign in and what they may do.
 * Authority comes from these rows, so this is the surface an administrator uses
 * to add a person, change a role or close an account — and every one of those
 * actions is audited in actions/users.ts.
 */

export const DIRECTORY_PAGE_SIZE = 25;

export type DirectoryStatus = "active" | "inactive";
export const DIRECTORY_ROLES: readonly Role[] = ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"];

export interface DirectoryRow {
  id: string;
  staffId: string;
  fullName: string;
  email: string;
  role: Role;
  region: string | null;
  directorate: string | null;
  cadre: string | null;
  facility: string | null;
  isActive: boolean;
  isUnitHead: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface DirectoryFilters {
  query: string;
  role: Role | null;
  status: DirectoryStatus | null;
}

export interface DirectoryPage {
  items: DirectoryRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

function filters(input: DirectoryFilters): SQL | undefined {
  const term = input.query.trim();
  const pattern = `%${escapeLike(term)}%`;
  return and(
    term
      ? or(ilike(users.fullName, pattern), ilike(users.email, pattern), ilike(users.ghsStaffId, pattern))
      : undefined,
    input.role ? eq(users.role, input.role) : undefined,
    input.status ? eq(users.isActive, input.status === "active") : undefined,
  );
}

export async function listDirectory(input: DirectoryFilters & { page?: number }): Promise<DirectoryPage> {
  const where = filters(input);

  const [countRow] = await db.select({ n: count() }).from(users).where(where);
  const total = countRow?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(input.page ?? 1)), pageCount);

  const rows = await db
    .select({
      id: users.id,
      staffId: users.ghsStaffId,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      region: users.region,
      directorate: users.directorate,
      cadre: users.cadre,
      facility: users.facility,
      isActive: users.isActive,
      isUnitHead: users.isUnitHead,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.isActive), users.fullName)
    .limit(DIRECTORY_PAGE_SIZE)
    .offset((page - 1) * DIRECTORY_PAGE_SIZE);

  return { items: rows, total, page, pageCount, pageSize: DIRECTORY_PAGE_SIZE };
}

export interface DirectorySummary {
  total: number;
  active: number;
  learners: number;
  facilitators: number;
  admins: number;
  neverSignedIn: number;
  activeAdmins: number;
}

export async function getDirectorySummary(): Promise<DirectorySummary> {
  const [row] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${users.isActive})::int`,
      learners: sql<number>`count(*) filter (where ${users.role} = 'LEARNER' and ${users.isActive})::int`,
      facilitators: sql<number>`count(*) filter (where ${users.role} = 'FACILITATOR' and ${users.isActive})::int`,
      admins: sql<number>`count(*) filter (where ${users.role} = 'SYSTEM_ADMIN' and ${users.isActive})::int`,
      neverSignedIn: sql<number>`count(*) filter (where ${users.lastLoginAt} is null and ${users.isActive})::int`,
      activeAdmins: sql<number>`count(*) filter (where ${users.role} = 'SYSTEM_ADMIN' and ${users.isActive})::int`,
    })
    .from(users);

  return (
    row ?? {
      total: 0,
      active: 0,
      learners: 0,
      facilitators: 0,
      admins: 0,
      neverSignedIn: 0,
      activeAdmins: 0,
    }
  );
}
