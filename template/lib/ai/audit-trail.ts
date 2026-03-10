/**
 * Audit trail (recommendation 6): log model, prompt version, timestamp per run.
 * Persist to ai_tasks or dedicated audit table when Supabase is connected.
 */

import type { AuditTrailEntry } from './types';

const PROMPT_VERSION = '1.0';

/** Create an audit entry for a pipeline step. Call from orchestrator. */
export function createAuditEntry(params: {
  runId: string;
  taskId: string;
  model: string;
  step?: AuditTrailEntry['step'];
  orgId?: string;
  documentId?: string;
  promptVersion?: string;
}): AuditTrailEntry {
  return {
    runId: params.runId,
    taskId: params.taskId,
    model: params.model,
    promptVersion: params.promptVersion ?? PROMPT_VERSION,
    timestamp: new Date().toISOString(),
    step: params.step,
    orgId: params.orgId,
    documentId: params.documentId,
  };
}

/** In-memory log for dev; replace with Supabase insert when ready. */
const auditLog: AuditTrailEntry[] = [];

export function appendAuditEntry(entry: AuditTrailEntry): void {
  auditLog.push(entry);
}

export function getAuditLog(): AuditTrailEntry[] {
  return [...auditLog];
}

export function getAuditLogForTask(taskId: string): AuditTrailEntry[] {
  return auditLog.filter((e) => e.taskId === taskId);
}
