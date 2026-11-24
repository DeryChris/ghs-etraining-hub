import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/index";
import { assessmentAttempts, assessments, programmeFields, materialProgress, materials, programmeAreas } from "@/db/schema";
import type { MaterialType, ProgressStatus } from "@/lib/labels";
import { audienceFor, fieldFor, liveField, liveArea, publishedMaterial } from "@/lib/server/visibility";
import type { Viewer } from "@/lib/viewer";

/*
 * "Pre/Post Test" is an index, not a runner: it lists every published practical
 * lab and assessment a viewer can reach, with their own attempt history. Sitting
 * a test is still a facilitator-led step on the material page, and the question
 * bank has no editor yet — so this page never pretends a test is ready when the
 * assessment row says it is not.
 */

/** Types that belong on this page. Both live in `materials`, under one space. */
export const ASSESSMENT_TYPES: readonly MaterialType[] = ["ASSESSMENT_LINK", "LAB"];

export interface AssessmentCard {
  materialId: string;
  title: string;
  type: MaterialType;
  areaName: string;
  areaCode: string;
  fieldName: string;
  estimatedMinutes: number | null;
  /** Assessment configuration, when a published assessment is attached. */
  assessmentId: string | null;
  passMarkPercent: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  lastAttemptAt: Date | null;
  progress: ProgressStatus;
}

interface AttemptSummary {
  attemptsUsed: number;
  bestScore: number | null;
  passed: boolean;
  lastAttemptAt: Date | null;
}

export async function listTestsAndLabs(viewer: Viewer): Promise<AssessmentCard[]> {
  const rows = await db
    .select({
      materialId: materials.id,
      title: materials.title,
      type: materials.type,
      estimatedMinutes: materials.estimatedMinutes,
      areaName: programmeAreas.name,
      areaCode: programmeAreas.code,
      fieldName: programmeFields.name,
      assessmentId: assessments.id,
      passMarkPercent: assessments.passMarkPercent,
      maxAttempts: assessments.maxAttempts,
      timeLimitMinutes: assessments.timeLimitMinutes,
      isPublished: assessments.isPublished,
      progress: materialProgress.status,
    })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .leftJoin(assessments, eq(assessments.materialId, materials.id))
    .leftJoin(
      materialProgress,
      and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, viewer.id)),
    )
    .where(
      and(
        publishedMaterial,
        liveArea,
        liveField,
        fieldFor(viewer),
        audienceFor(viewer),
        inArray(materials.type, [...ASSESSMENT_TYPES]),
      ),
    )
    .orderBy(asc(programmeFields.name), asc(materials.title));

  // Attempts are fetched once for the viewer and folded in, rather than aggregated
  // per row: a person sits a handful of tests, and this keeps the SQL portable.
  const attempts = await db
    .select({
      assessmentId: assessmentAttempts.assessmentId,
      scorePercent: assessmentAttempts.scorePercent,
      passed: assessmentAttempts.passed,
      startedAt: assessmentAttempts.startedAt,
    })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.userId, viewer.id))
    .orderBy(desc(assessmentAttempts.startedAt));

  const summary = new Map<string, AttemptSummary>();
  for (const attempt of attempts) {
    const current = summary.get(attempt.assessmentId) ?? {
      attemptsUsed: 0,
      bestScore: null,
      passed: false,
      lastAttemptAt: null,
    };
    current.attemptsUsed += 1;
    if (attempt.scorePercent !== null && (current.bestScore === null || attempt.scorePercent > current.bestScore)) {
      current.bestScore = attempt.scorePercent;
    }
    current.passed = current.passed || attempt.passed === true;
    if (!current.lastAttemptAt || attempt.startedAt > current.lastAttemptAt) current.lastAttemptAt = attempt.startedAt;
    summary.set(attempt.assessmentId, current);
  }

  return rows.map(({ isPublished, progress, ...row }) => {
    // A draft assessment is invisible here: an unpublished question bank would
    // otherwise read as a test the learner is expected to sit.
    const configured = row.assessmentId !== null && isPublished === true;
    const attempt = configured && row.assessmentId ? summary.get(row.assessmentId) : undefined;
    return {
      ...row,
      assessmentId: configured ? row.assessmentId : null,
      passMarkPercent: configured ? row.passMarkPercent : null,
      maxAttempts: configured ? row.maxAttempts : null,
      timeLimitMinutes: configured ? row.timeLimitMinutes : null,
      attemptsUsed: attempt?.attemptsUsed ?? 0,
      bestScore: attempt?.bestScore ?? null,
      passed: attempt?.passed ?? false,
      lastAttemptAt: attempt?.lastAttemptAt ?? null,
      progress: progress ?? "NOT_STARTED",
    } satisfies AssessmentCard;
  });
}
