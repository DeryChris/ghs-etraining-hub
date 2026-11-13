import {
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
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"]);
export const materialStateEnum = pgEnum("material_state", ["DRAFT", "IN_REVIEW", "PUBLISHED", "SUPERSEDED", "ARCHIVED"]);
export const materialTypeEnum = pgEnum("material_type", ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"]);
export const materialPriorityEnum = pgEnum("material_priority", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const scanStatusEnum = pgEnum("scan_status", ["PENDING", "CLEAN", "INFECTED"]);
export const progressStatusEnum = pgEnum("progress_status", ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);
export const enrollmentSourceEnum = pgEnum("enrollment_source", ["SELF", "ASSIGNED"]);
export const notificationTypeEnum = pgEnum("notification_type", ["SYSTEM_MAINTENANCE", "MATERIAL_UPDATE", "SPACE_ANNOUNCEMENT", "COMMENT_REPLY", "DIRECT_MESSAGE", "ASSIGNMENT_DUE", "CERTIFICATE_ISSUED", "RECERTIFICATION_DUE"]);
export const notificationPriorityEnum = pgEnum("notification_priority", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  ghsStaffId: varchar("ghs_staff_id", { length: 16 }).notNull().unique(),
  email: text("email").notNull().unique().$default(() => ""),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("LEARNER"),
  cadre: text("cadre"),
  directorate: text("directorate"),
  region: text("region"),
  facility: text("facility"),
  isActive: boolean("is_active").notNull().default(true),
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
  index("users_facility_idx").on(t.facility),
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

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isRestricted: boolean("is_restricted").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categoryFacilitators = pgTable("category_facilitators", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: text("scope").notNull().default("ALL_SPACES"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.categoryId, t.userId)]);

export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  audienceRegion: text("audience_region"),
  audienceDirectorate: text("audience_directorate"),
  audienceCadre: text("audience_cadre"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("spaces_category_id_idx").on(t.categoryId)]);

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  summary: text("summary"),
  type: materialTypeEnum("type").notNull().default("DOCUMENT"),
  priority: materialPriorityEnum("priority").notNull().default("LOW"),
  requiresAcknowledgement: boolean("requires_acknowledgement").notNull().default(false),
  estimatedMinutes: integer("estimated_minutes"),
  cpdCreditsX10: integer("cpd_credits_x10").notNull().default(0),
  recertificationMonths: integer("recertification_months"),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  currentVersionId: uuid("current_version_id"),
  state: materialStateEnum("state").notNull().default("DRAFT"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("materials_space_id_idx").on(t.spaceId)]);

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
}, (t) => [index("material_versions_material_id_idx").on(t.materialId)]);

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  source: enrollmentSourceEnum("source").notNull().default("SELF"),
  assignedById: uuid("assigned_by_id").references(() => users.id),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
}, (t) => [unique().on(t.userId, t.spaceId)]);

export const materialProgress = pgTable("material_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  materialVersionId: uuid("material_version_id").notNull().references(() => materialVersions.id),
  status: progressStatusEnum("status").notNull().default("NOT_STARTED"),
  watchedPercent: integer("watched_percent").notNull().default(0),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.materialId)]);

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

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  materialId: uuid("material_id").notNull().references(() => materials.id, { onDelete: "cascade" }),
  materialVersionId: uuid("material_version_id").notNull().references(() => materialVersions.id),
  cpdCreditsX10: integer("cpd_credits_x10").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  verificationCount: integer("verification_count").notNull().default(0),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
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
});

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
});

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
});

export const notificationRecipients = pgTable("notification_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (t) => [unique().on(t.notificationId, t.userId)]);

export const notificationReadCursors = pgTable("notification_read_cursors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.notificationId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  prevHash: text("prev_hash"),
  hash: text("hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_logs_created_at_idx").on(t.createdAt)]);

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
});
