import { sql } from "drizzle-orm";
import {
  customType,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
  uniqueIndex,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"]);
export const materialStateEnum = pgEnum("material_state", ["DRAFT", "IN_REVIEW", "PUBLISHED", "SUPERSEDED", "ARCHIVED"]);
/** Postgres `bytea`, for deployments that keep files in the database. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const materialTypeEnum = pgEnum("material_type", ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"]);
export const materialPriorityEnum = pgEnum("material_priority", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const scanStatusEnum = pgEnum("scan_status", ["PENDING", "CLEAN", "INFECTED"]);
export const enrollmentSourceEnum = pgEnum("enrollment_source", ["SELF", "ASSIGNED"]);
/**
 * What a notice is about. The first six are the events this service actually
 * produces; the inherited prototype values after them are kept because Postgres
 * enum values cannot be dropped without rebuilding the type, and nothing writes
 * them any more.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "TRAINING_PUBLISHED",
  "TRAINING_RETURNED",
  "MATERIAL_PUBLISHED",
  "DIRECT_MESSAGE",
  "COMPLAINT_UPDATE",
  "ACCOUNT",
  "SYSTEM_MAINTENANCE",
  "MATERIAL_UPDATE",
  "COMMENT_REPLY",
  "ASSIGNMENT_DUE",
]);
export const notificationPriorityEnum = pgEnum("notification_priority", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * The employee number off the payroll — six digits, printed on the payslip. It is what every member
   * of staff knows by heart, so it is what they sign in with — the e-mail is
   * optional because more than a third of the Upper West sheet has none.
   */
  ghsStaffId: varchar("ghs_staff_id", { length: 16 }).notNull().unique(),
  email: text("email").unique(),
  /** True until somebody changes the password ICT handed them. */
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  passwordHash: text("password_hash"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("LEARNER"),
  cadre: text("cadre"),
  directorate: text("directorate"),
  region: text("region"),
  district: text("district"),
  subDistrict: text("sub_district"),
  facility: text("facility"),
  gender: text("gender"),
  isActive: boolean("is_active").notNull().default(true),
  /**
   * A unit head is a facilitator who also signs off the material filed under
   * their programme fields. It is a duty carried by an existing facilitator
   * account rather than a fourth role: every permission they need beyond a
   * facilitator's is "decide on the review queue", and keeping the role unchanged
   * means their area assignments, trainings and materials keep working.
   */
  isUnitHead: boolean("is_unit_head").notNull().default(false),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("users_region_role_idx").on(t.region, t.role),
  index("users_directorate_idx").on(t.directorate),
  index("users_district_idx").on(t.district),
  index("users_facility_idx").on(t.facility),
  index("users_email_lower_idx").on(sql`lower(${t.email})`),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("sessions_user_id_idx").on(t.userId)]);

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  summary: text("summary"),
  type: materialTypeEnum("type").notNull().default("DOCUMENT"),
  priority: materialPriorityEnum("priority").notNull().default("LOW"),
  requiresAcknowledgement: boolean("requires_acknowledgement").notNull().default(false),
  estimatedMinutes: integer("estimated_minutes"),
  programmeAreaId: uuid("programme_area_id").notNull().references(() => programmeAreas.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  currentVersionId: uuid("current_version_id"),
  state: materialStateEnum("state").notNull().default("DRAFT"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("materials_programme_area_idx").on(t.programmeAreaId),
  index("materials_visibility_idx").on(t.state, t.isPublished, t.programmeAreaId),
  unique("materials_area_title_key").on(t.programmeAreaId, t.title),
]);

export const materialVersions = pgTable("material_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  scanStatus: scanStatusEnum("scan_status").notNull().default("PENDING"),
  state: materialStateEnum("state").notNull().default("DRAFT"),
  changeNote: text("change_note"),
  uploadedById: uuid("uploaded_by_id").notNull().references(() => users.id),
  reviewedById: uuid("reviewed_by_id").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  supersededByVersionId: uuid("superseded_by_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("material_versions_material_id_idx").on(t.materialId),
  unique("material_versions_material_version_key").on(t.materialId, t.version),
]);

/**
 * Files kept in the database, for a deployment with no object storage.
 *
 * The deployment target is Neon plus Vercel, and Neon is a database: it has no
 * file service. Rather than leave uploads broken until somebody buys a bucket,
 * the same storage interface falls back to this table — bytes, MIME type and the
 * key the rest of the system already uses. The ceiling is Vercel's request body
 * limit (about 4.5 MB), not Postgres: a single `bytea` value may be far larger.
 * Configure S3_ENDPOINT/S3_BUCKET and the interface switches back to direct
 * browser-to-bucket uploads, which is where decks and videos belong.
 */
export const fileBlobs = pgTable("file_blobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storageKey: text("storage_key").notNull().unique(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programmeAreaId: uuid("programme_area_id").notNull().references(() => programmeAreas.id, { onDelete: "cascade" }),
  source: enrollmentSourceEnum("source").notNull().default("SELF"),
  assignedById: uuid("assigned_by_id").references(() => users.id),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
}, (t) => [unique().on(t.userId, t.programmeAreaId), index("enrollments_area_idx").on(t.programmeAreaId)]);

/**
 * Who has signed for which protocol, and against which version.
 *
 * This table used to carry a learning path — not started, in progress, completed,
 * watched percent. That is gone: this is a library, not a course, and "0 of 0
 * materials completed" told nobody anything. What remains is the only fact worth
 * keeping: a person acknowledged a version of a protocol, and when. A newer
 * version means the acknowledgement is stale, not that they have to "redo" a
 * course.
 */
export const materialProgress = pgTable("material_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  materialVersionId: uuid("material_version_id").notNull().references(() => materialVersions.id),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.materialId),
  index("material_progress_user_idx").on(t.userId, t.updatedAt),
]);

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  passMarkPercent: integer("pass_mark_percent").notNull().default(80),
  questionCount: integer("question_count").notNull().default(10),
  maxAttempts: integer("max_attempts").notNull().default(3),
  cooldownHours: integer("cooldown_hours").notNull().default(24),
  timeLimitMinutes: integer("time_limit_minutes"),
  isPublished: boolean("is_published").notNull().default(false),
});

export const assessmentItems = pgTable("assessment_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  stem: text("stem").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  isActive: boolean("is_active").notNull().default(true),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  answers: jsonb("answers").$type<Record<string, number>>(),
  scorePercent: integer("score_percent"),
  passed: boolean("passed"),
  attemptNumber: integer("attempt_number").notNull(),
  gradedById: uuid("graded_by_id").references(() => users.id),
  overrideReason: text("override_reason"),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  body: text("body").notNull(),
  isRemoved: boolean("is_removed").notNull().default(false),
  removedReason: text("removed_reason"),
  removedById: uuid("removed_by_id").references(() => users.id),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("comments_material_created_idx").on(t.materialId, t.createdAt)]);

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  isReported: boolean("is_reported").notNull().default(false),
  reportReason: text("report_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("direct_messages_sender_idx").on(t.senderId, t.createdAt),
  index("direct_messages_recipient_idx").on(t.recipientId, t.isRead, t.createdAt),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: notificationTypeEnum("type").notNull(),
  priority: notificationPriorityEnum("priority").notNull().default("MEDIUM"),
  linkUrl: text("link_url"),
  audience: text("audience").notNull().default("ALL"),
  audienceFilter: jsonb("audience_filter"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (t) => [index("notifications_published_at_idx").on(t.publishedAt), index("notifications_expires_at_idx").on(t.expiresAt)]);

export const notificationRecipients = pgTable("notification_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (t) => [
  unique().on(t.notificationId, t.userId),
  index("notification_recipients_user_unread_idx").on(t.userId, t.isRead),
]);

export const notificationReadCursors = pgTable("notification_read_cursors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.notificationId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  // RESTRICT, never SET NULL: the chain hash covers actorId, so nulling it after
  // a deletion would make verifyAuditChain() report false tampering. Staff are
  // deactivated (is_active = false), never deleted.
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  prevHash: text("prev_hash"),
  hash: text("hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_created_at_idx").on(t.createdAt),
  index("audit_logs_user_created_idx").on(t.userId, t.createdAt),
]);

export const messageReports = pgTable("message_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => directMessages.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewAssignments = pgTable("review_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialVersionId: uuid("material_version_id").notNull().references(() => materialVersions.id),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  decision: text("decision"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimitWindows = pgTable("rate_limit_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (t) => [index("rate_limit_windows_reset_idx").on(t.resetAt)]);

/* ── Geography (reference data) ─────────────────────────────────────────────
 * The Upper West Region is the pilot: personnel, trainings and facilities are
 * named by region → district → sub-district → facility. Reference rows are
 * maintained here rather than typed per session, so a district is spelled one
 * way and the charts can group by it. GHS supplies the authoritative list;
 * docs/decisions/0011 records what is seeded and where it came from.
 */

export const districtKindEnum = pgEnum("district_kind", ["METROPOLITAN", "MUNICIPAL", "DISTRICT"]);

export const regions = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: text("name").notNull().unique(),
});

export const districts = pgTable("districts", {
  id: uuid("id").primaryKey().defaultRandom(),
  regionId: uuid("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: districtKindEnum("kind").notNull().default("DISTRICT"),
  capital: text("capital"),
}, (t) => [uniqueIndex("districts_region_name_idx").on(t.regionId, t.name)]);

export const subDistricts = pgTable("sub_districts", {
  id: uuid("id").primaryKey().defaultRandom(),
  districtId: uuid("district_id").notNull().references(() => districts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [uniqueIndex("sub_districts_district_name_idx").on(t.districtId, t.name)]);

export const facilityTypeEnum = pgEnum("facility_type", [
  "REGIONAL_HOSPITAL",
  "MUNICIPAL_HOSPITAL",
  "DISTRICT_HOSPITAL",
  "POLYCLINIC",
  "HEALTH_CENTRE",
  /** A CHPS compound: where most of the region's staff actually work. */
  "CHPS_COMPOUND",
  "CLINIC",
  "DIRECTORATE",
  /** Regional stores, workshop, port health, RCH — units that are not clinical sites. */
  "SERVICE_UNIT",
  "OTHER",
]);
export const facilityOwnershipEnum = pgEnum("facility_ownership", ["GHS", "CHAG", "PRIVATE", "OTHER"]);

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  districtId: uuid("district_id").notNull().references(() => districts.id, { onDelete: "cascade" }),
  subDistrictId: uuid("sub_district_id").references(() => subDistricts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: facilityTypeEnum("type").notNull().default("HEALTH_CENTRE"),
  ownership: facilityOwnershipEnum("ownership").notNull().default("GHS"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("facilities_district_name_idx").on(t.districtId, t.name)]);

/* ── Programme taxonomy (fields → areas) ────────────────────────────────────
 * The vocabulary a training plan is written in: "Administration and Support
 * Services" is a field, "Biomedical Equipment" an area inside it. GHS supplied
 * the list (src/db/data/programme-taxonomy.ts) and administrators maintain it
 * at /programme-fields.
 *
 * This is the only taxonomy in the product (ADR-0014). A field holds areas; an
 * area holds the materials that teach it, the facilitators who author and review
 * them, and the trainings that were planned or run under it. The directorates
 * and programmeAreas this replaced are gone: they were a second vocabulary for the same
 * question, and a material filed under one and a training under the other could
 * never be counted together.
 */

export const programmeFields = pgTable("programme_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 24 }).notNull().unique(),
  name: text("name").notNull().unique(),
  description: text("description"),
  /** Sensitive programmes are staff-only, whatever their audience columns say. */
  isRestricted: boolean("is_restricted").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const programmeAreas = pgTable("programme_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  fieldId: uuid("field_id").notNull().references(() => programmeFields.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 24 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** Cohort targeting: null means "for everyone"; see visibility.ts. */
  audienceRegion: text("audience_region"),
  audienceDirectorate: text("audience_directorate"),
  audienceCadre: text("audience_cadre"),
  sortOrder: integer("sort_order").notNull().default(0),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("programme_areas_field_name_idx").on(t.fieldId, t.name),
  index("programme_areas_field_idx").on(t.fieldId),
]);

/**
 * Who may author and review in an area. Replaces category_facilitators: the old
 * table granted a facilitator a whole directorate, which is no longer the unit
 * content is filed under.
 */
export const areaFacilitators = pgTable("area_facilitators", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaId: uuid("area_id").notNull().references(() => programmeAreas.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("area_facilitators_unique_idx").on(t.areaId, t.userId),
  index("area_facilitators_user_idx").on(t.userId),
]);

/* ── Trainings (physical table: training_sessions) ───────────────────────────
 * The registry behind the Trainings tab. A row is either a training that ran
 * (status COMPLETED, attendance and notes filled in) or one that is planned
 * (PLANNED), which is what makes the same table serve both the calendar and
 * the record.
 *
 * A training is classified by programme field and the area inside it — nothing
 * else. `organisedOn` is the start date, `endsOn` the last day, and `year` the
 * plan year the register is reported by.
 */

export const trainingStatusEnum = pgEnum("training_status", ["PLANNED", "COMPLETED", "CANCELLED"]);

/**
 * Whether the rest of GHS may see this training yet. Separate from
 * `training_status`, which answers whether the event happened.
 */
export const trainingReviewStateEnum = pgEnum("training_review_state", ["PENDING", "PUBLISHED", "REJECTED"]);

export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  year: integer("year").notNull().default(sql`extract(year from current_date)::int`),
  programmeFieldId: uuid("programme_field_id").references(() => programmeFields.id, { onDelete: "set null" }),
  programmeAreaId: uuid("programme_area_id").references(() => programmeAreas.id, { onDelete: "set null" }),
  targetGroup: text("target_group"),
  organisedOn: date("organised_on").notNull(),
  endsOn: date("ends_on"),
  durationText: text("duration_text"),
  status: trainingStatusEnum("status").notNull().default("COMPLETED"),
  venue: text("venue"),
  regionId: uuid("region_id").references(() => regions.id, { onDelete: "set null" }),
  districtId: uuid("district_id").references(() => districts.id, { onDelete: "set null" }),
  subDistrictId: uuid("sub_district_id").references(() => subDistricts.id, { onDelete: "set null" }),
  facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "set null" }),
  facilitatorName: text("facilitator_name"),
  facilitatorId: uuid("facilitator_id").references(() => users.id, { onDelete: "set null" }),
  attendeeCount: integer("attendee_count"),
  notes: text("notes"),
  /** Optional picture the facilitator uploads for the training page. */
  imageStorageKey: text("image_storage_key"),
  /** Facilitator-created rows start PENDING; an administrator's row is live. */
  reviewState: trainingReviewStateEnum("review_state").notNull().default("PUBLISHED"),
  reviewedById: uuid("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  /** Why it was rejected — shown to the facilitator who submitted it. */
  reviewNote: text("review_note"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("training_sessions_organised_idx").on(t.organisedOn),
  index("training_sessions_year_idx").on(t.year, t.organisedOn),
  index("training_sessions_area_idx").on(t.programmeAreaId),
]);

/**
 * Files attached to one training: the slide deck, the attendance sheet, the
 * report. Not `materials` — those are versioned teaching objects filed under an
 * area; these belong to a single event and are deleted with it.
 */
export const trainingResources = pgTable("training_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainingId: uuid("training_id").notNull().references(() => trainingSessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  uploadedById: uuid("uploaded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("training_resources_training_idx").on(t.trainingId, t.createdAt)]);

/**
 * The conversation under a training.
 *
 * Staff who attended — or who are thinking about the next cohort — ask questions
 * here, in the open, rather than in a WhatsApp group that nobody else can read.
 * Flat on purpose: a training page holds a few dozen messages, and a thread tree
 * would cost more to read on a phone than it is worth.
 */
export const trainingComments = pgTable("training_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainingId: uuid("training_id").notNull().references(() => trainingSessions.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("training_comments_training_idx").on(t.trainingId, t.createdAt)]);

/**
 * "May work anywhere in this programme field."
 *
 * `area_facilitators` grants one area at a time; this grants the field, so a
 * facilitator appointed to Malaria keeps working as areas are added. Unit heads
 * are appointed this way.
 */
export const fieldFacilitators = pgTable("field_facilitators", {
  id: uuid("id").primaryKey().defaultRandom(),
  fieldId: uuid("field_id").notNull().references(() => programmeFields.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("field_facilitators_unique_idx").on(t.fieldId, t.userId),
  index("field_facilitators_user_idx").on(t.userId),
]);

/* ── Views ──────────────────────────────────────────────────────────────────
 * Traffic, counted honestly: one row per person, material and day, so a refresh
 * loop cannot inflate a number and a repeat visit is a visit. Downloads are
 * already in the audit trail; together they answer "is this programme being
 * used?", which is the question the insights page exists to answer.
 */

export const materialViews = pgTable("material_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedOn: date("viewed_on").notNull(),
  viewCount: integer("view_count").notNull().default(1),
  firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }).notNull().defaultNow(),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("material_views_unique_idx").on(t.materialId, t.userId, t.viewedOn),
  index("material_views_day_idx").on(t.viewedOn),
]);

/* ── Complaints ────────────────────────────────────────────────────────────────
 * The Complaint Hub is how a member of staff reaches a human when the system is
 * the problem: a forgotten password, a wrong name, a course that will not open.
 * The row is the record — who asked, what happened, what was done about it and
 * who did it — so an answer is never lost in a phone call. Rows are readable by
 * administrators; the person who lodged one can read theirs back with the staff
 * ID they wrote it under.
 */

export const complaintIssueEnum = pgEnum("complaint_issue", [
  "PERSONAL_DETAILS",
  "COURSE_RELATED",
  "LOGIN_ACCESS",
  "OTHERS",
]);

export const complaintStatusEnum = pgEnum("complaint_status", ["SUBMITTED", "IN_PROGRESS", "RESOLVED"]);

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Short human-quotable reference, e.g. CMP-7F3K9Q. */
  reference: varchar("reference", { length: 16 }).notNull().unique(),
  /** The staff ID as typed. No foreign key: someone without an account still gets help. */
  staffId: varchar("staff_id", { length: 16 }),
  /** Set when the staff ID matched a directory row, so the complaint follows the person. */
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  region: text("region"),
  facility: text("facility"),
  issueType: complaintIssueEnum("issue_type").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: complaintStatusEnum("status").notNull().default("SUBMITTED"),
  /** The answer, written by the person who handled it. */
  response: text("response"),
  respondedById: uuid("responded_by_id").references(() => users.id, { onDelete: "set null" }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("complaints_staff_idx").on(sql`lower(${t.staffId})`),
  index("complaints_status_idx").on(t.status, t.createdAt),
  index("complaints_user_idx").on(t.userId),
]);

/**
 * The conversation on a complaint. A complaint is not a ticket that disappears
 * when answered: the person can write back ("I still cannot get in"), and the
 * administrator can answer again. Each message records who wrote it, so the
 * thread is a record rather than a transcript somebody summarised later.
 */
export const complaintMessages = pgTable("complaint_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  complaintId: uuid("complaint_id").notNull().references(() => complaints.id, { onDelete: "cascade" }),
  /** Null when the person wrote it from the public status page (no session). */
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  /** STAFF (the person who lodged it), DESK (an administrator handling it). */
  authorRole: varchar("author_role", { length: 16 }).notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("complaint_messages_thread_idx").on(t.complaintId, t.createdAt)]);
