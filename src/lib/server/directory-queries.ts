import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { areaFacilitators, fieldFacilitators, users } from "@/db/schema";
import type { Role, StaffRole } from "@/lib/rbac/capabilities";
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
  /** Null for the staff whose payroll record carries no work address. */
  email: string | null;
  role: Role;
  region: string | null;
  directorate: string | null;
  grade: string | null;
  facility: string | null;
  isActive: boolean;
  isUnitHead: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type DirectoryGroup = "staff" | "facilitators" | "unit-heads" | "admins";

export interface DirectoryFilters {
  query: string;
  /** A role choice, so `UNIT_HEAD` means "facilitators carrying the duty". */
  role: StaffRole | null;
  status: DirectoryStatus | null;
  /** The four management lenses the Users tab is split into. */
  group?: DirectoryGroup | null;
}

export interface DirectoryPage {
  items: DirectoryRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

/**
 * The four choices are exclusive: choosing Facilitator shows the facilitators
 * who do not sign off, and Unit head shows the ones who do. Anything else makes
 * the counts on the page lie.
 */
function roleFilter(role: StaffRole | null): SQL | undefined {
  if (!role) return undefined;
  if (role === "UNIT_HEAD") return and(eq(users.role, "FACILITATOR"), eq(users.isUnitHead, true));
  if (role === "FACILITATOR") return and(eq(users.role, "FACILITATOR"), eq(users.isUnitHead, false));
  return eq(users.role, role);
}

function filters(input: DirectoryFilters): SQL | undefined {
  const term = input.query.trim();
  const pattern = `%${escapeLike(term)}%`;
  return and(
    term
      ? or(ilike(users.fullName, pattern), ilike(users.email, pattern), ilike(users.ghsStaffId, pattern))
      : undefined,
    roleFilter(input.role),
    input.status ? eq(users.isActive, input.status === "active") : undefined,
    input.group === "admins"
      ? eq(users.role, "SYSTEM_ADMIN")
      : /* Plain staff: the role with no programme duty attached. */
        input.group === "staff"
        ? eq(users.role, "LEARNER")
        : input.group === "facilitators"
        ? and(eq(users.role, "FACILITATOR"), eq(users.isUnitHead, false))
        : input.group === "unit-heads"
          ? and(eq(users.role, "FACILITATOR"), eq(users.isUnitHead, true))
          : undefined,
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
      grade: users.grade,
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
  /** Facilitators who do not sign off the review queue. */
  facilitators: number;
  /** Facilitators who do. Stored as a duty, offered as a role. */
  unitHeads: number;
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
      facilitators: sql<number>`count(*) filter (where ${users.role} = 'FACILITATOR' and not ${users.isUnitHead} and ${users.isActive})::int`,
      unitHeads: sql<number>`count(*) filter (where ${users.role} = 'FACILITATOR' and ${users.isUnitHead} and ${users.isActive})::int`,
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
      unitHeads: 0,
      admins: 0,
      neverSignedIn: 0,
      activeAdmins: 0,
    }
  );
}


/**
 * The Programme Areas and Programme Fields each person on the page already
 * holds. Legacy IDs are returned as `fieldIds` for parent areas and `areaIds`
 * for child fields.
 *
 * One query per table for the whole page rather than per row: the Users table
 * shows twelve people at a time and two queries beat twenty-four.
 */
export async function listAccessGrants(
  userIds: string[],
): Promise<Map<string, { fieldIds: string[]; areaIds: string[] }>> {
  const grants = new Map<string, { fieldIds: string[]; areaIds: string[] }>();
  for (const id of userIds) grants.set(id, { fieldIds: [], areaIds: [] });
  if (userIds.length === 0) return grants;

  const [fields, areas] = await Promise.all([
    db
      .select({ userId: fieldFacilitators.userId, fieldId: fieldFacilitators.fieldId })
      .from(fieldFacilitators)
      .where(inArray(fieldFacilitators.userId, userIds)),
    db
      .select({ userId: areaFacilitators.userId, areaId: areaFacilitators.areaId })
      .from(areaFacilitators)
      .where(inArray(areaFacilitators.userId, userIds)),
  ]);

  for (const row of fields) grants.get(row.userId)?.fieldIds.push(row.fieldId);
  for (const row of areas) grants.get(row.userId)?.areaIds.push(row.areaId);
  return grants;
}
