-- 0014_notification_types_for_this_service.sql
-- The notice vocabulary was inherited from the CPD prototype: "certificate
-- issued", "recertification due", "space announcement". None of those events
-- exist in this service, and the events that do exist had no type at all.
-- Enum values cannot be removed without rebuilding the type, so the old ones stay
-- (harmless, unused) and the real ones are added.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'TRAINING_PUBLISHED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'TRAINING_RETURNED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'MATERIAL_PUBLISHED';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'DIRECT_MESSAGE';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'COMPLAINT_UPDATE';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'ACCOUNT';
