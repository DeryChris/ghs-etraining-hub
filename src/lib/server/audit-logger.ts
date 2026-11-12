import 'server-only';
import { prisma } from './prisma';

export interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata ? input.metadata : undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    // Audit logging must not break the primary operation
    console.error('[AuditLogger] Failed to write audit log:', error);
  }
}
