import "server-only";
import { db } from "@/db/index";
import {
  users, categories, spaces, materials, materialVersions,
  materialProgress, enrollments, assessments, assessmentAttempts,
  certificates, comments, auditLogs, notificationReadCursors,
} from "@/db/schema";
import { eq, and, desc, asc, ilike, count, sql } from "drizzle-orm";
import { logAudit } from "@/lib/server/audit";

export interface UserDto {
  id: string;
  ghsStaffId: string;
  fullName: string;
  email: string;
  role: string;
  directorate?: string;
  region?: string;
  facility?: string;
  isActive: boolean;
}

export interface CategoryDto {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface SpaceDto {
  id: string;
  slug: string;
  title: string;
  description?: string;
  categoryId: string;
}

export interface MaterialDto {
  id: string;
  title: string;
  summary?: string;
  type: string;
  priority: string;
  cpdCreditsX10: number;
  isPublished: boolean;
  spaceId: string;
}

export interface MaterialProgressDto {
  materialId: string;
  status: string;
  watchedPercent: number;
  acknowledgedAt?: Date;
  completedAt?: Date;
}

export async function getUserByStaffId(staffId: string): Promise<UserDto | null> {
  const row = await db.select().from(users).where(eq(users.ghsStaffId, staffId)).limit(1);
  if (!row[0]) return null;
  return mapUser(row[0]);
}

export async function getUserById(id: string): Promise<UserDto | null> {
  const row = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row[0]) return null;
  return mapUser(row[0]);
}

export async function listCategories(): Promise<CategoryDto[]> {
  const rows = await db.select().from(categories).where(eq(categories.isArchived, false)).orderBy(asc(categories.name));
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? undefined,
  }));
}

export async function getSpacesByCategory(categoryId: string): Promise<SpaceDto[]> {
  const rows = await db.select().from(spaces)
    .where(and(eq(spaces.categoryId, categoryId), eq(spaces.isArchived, false)))
    .orderBy(asc(spaces.title));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description ?? undefined,
    categoryId: r.categoryId,
  }));
}

export async function listMaterials(spaceId: string): Promise<MaterialDto[]> {
  const rows = await db.select().from(materials)
    .where(and(eq(materials.spaceId, spaceId), eq(materials.isPublished, true)))
    .orderBy(asc(materials.title));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary ?? undefined,
    type: r.type,
    priority: r.priority,
    cpdCreditsX10: r.cpdCreditsX10,
    isPublished: r.isPublished,
    spaceId: r.spaceId,
  }));
}

export async function getMaterialProgress(userId: string, materialId: string): Promise<MaterialProgressDto | null> {
  const row = await db.select().from(materialProgress)
    .where(and(eq(materialProgress.userId, userId), eq(materialProgress.materialId, materialId)))
    .limit(1);
  if (!row[0]) return null;
  return {
    materialId: row[0].materialId,
    status: row[0].status,
    watchedPercent: row[0].watchedPercent,
    acknowledgedAt: row[0].acknowledgedAt ?? undefined,
    completedAt: row[0].completedAt ?? undefined,
  };
}

export async function getEnrollmentsForUser(userId: string) {
  return db.select({ spaceId: enrollments.spaceId }).from(enrollments).where(eq(enrollments.userId, userId));
}

export async function createAuditEntry(input: {
  actor: { sub: string; role: string; name: string; staffId: string };
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  return logAudit(input);
}

function mapUser(row: typeof users.$inferSelect): UserDto {
  return {
    id: row.id,
    ghsStaffId: row.ghsStaffId,
    fullName: row.fullName,
    email: row.email,
    role: row.role,
    directorate: row.directorate ?? undefined,
    region: row.region ?? undefined,
    facility: row.facility ?? undefined,
    isActive: row.isActive,
  };
}
