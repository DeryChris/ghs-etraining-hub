import 'server-only';
import { UserRole } from '@prisma/client';

export type Role = UserRole;

export const ROLE_HIERARCHY: Record<Role, number> = {
  LEARNER: 1,
  FACILITATOR: 2,
  SYSTEM_ADMIN: 3,
};

export function canAccessRole(userRole: Role | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function requireRole(userRole: Role | undefined, requiredRole: Role): { allowed: boolean; reason?: string } {
  if (!userRole) {
    return { allowed: false, reason: 'Unauthenticated' };
  }
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole]) {
    return { allowed: false, reason: `Insufficient role: ${userRole} cannot access ${requiredRole} resources` };
  }
  return { allowed: true };
}

export const RBAC_CAPABILITY_MATRIX: Record<Role, Record<string, boolean>> = {
  LEARNER: {
    'system.userManagement': false,
    'system.categoryCreation': false,
    'system.categoryFacilitatorAssignment': false,
    'system.spaceCreation': false,
    'system.materialUpload': false,
    'system.threadedCommenting': true,
    'system.directMessaging': true,
    'system.auditLogInspection': false,
    'system.maintenanceBanners': false,
    'content.readProtocols': true,
    'content.claimCpdCredits': true,
  },
  FACILITATOR: {
    'system.userManagement': false,
    'system.categoryCreation': false,
    'system.categoryFacilitatorAssignment': false,
    'system.spaceCreation': true,
    'system.materialUpload': true,
    'system.threadedCommenting': true,
    'system.directMessaging': true,
    'system.auditLogInspection': false,
    'system.maintenanceBanners': false,
    'content.readProtocols': true,
    'content.claimCpdCredits': false,
    'content.evaluateSubmissions': true,
  },
  SYSTEM_ADMIN: {
    'system.userManagement': true,
    'system.categoryCreation': true,
    'system.categoryFacilitatorAssignment': true,
    'system.spaceCreation': true,
    'system.materialUpload': true,
    'system.threadedCommenting': true,
    'system.directMessaging': true,
    'system.auditLogInspection': true,
    'system.maintenanceBanners': true,
    'content.readProtocols': true,
    'content.claimCpdCredits': false,
    'content.evaluateSubmissions': true,
  },
};

export function hasCapability(userRole: Role | undefined, capability: string): boolean {
  if (!userRole) return false;
  return RBAC_CAPABILITY_MATRIX[userRole][capability] ?? false;
}
