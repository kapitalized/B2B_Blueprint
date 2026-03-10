/**
 * Version / run history (recommendation 3): list past analyses per document.
 * Stub storage; replace with Supabase when connected.
 */

import type { RunHistoryItem } from './types';

const runHistory: RunHistoryItem[] = [];

export function appendRunHistory(item: RunHistoryItem): void {
  runHistory.push(item);
}

export function getRunHistory(documentId: string): RunHistoryItem[] {
  return runHistory
    .filter((r) => r.documentId === documentId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getRunHistoryForTask(taskId: string): RunHistoryItem | undefined {
  return runHistory.find((r) => r.taskId === taskId);
}
