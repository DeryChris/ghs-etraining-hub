-- 0018_review_requests.sql
-- Sign-off is somebody's job, and until now nothing told them a new item had
-- arrived: a facilitator filed a training, it sat at PENDING, and the unit head
-- holding that field found out by opening the register. The other notices have
-- their own types, so this one gets a name instead of borrowing "ACCOUNT".
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'REVIEW_REQUEST';
