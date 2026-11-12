export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  ipAddress: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  action?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogStats {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByEntity: Record<string, number>;
  highSeverityEvents: number;
}
