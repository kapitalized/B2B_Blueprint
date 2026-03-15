/**
 * AI pipeline orchestrator — router.
 * Uses single-pass extraction by default. Set ENABLE_EXTRACTION_REVIEW_PASS=true to use
 * the multilook (second-pass review) implementation.
 * Fallback: lib/ai/orchestrator-single-pass.ts (current working).
 * Multilook: lib/ai/orchestrator-multilook.ts.
 */

import * as singlePass from './orchestrator-single-pass';
import * as multilook from './orchestrator-multilook';

const useMultilook = process.env.ENABLE_EXTRACTION_REVIEW_PASS === 'true';
const orchestrator = useMultilook ? multilook : singlePass;

export const TASK_STATUSES = orchestrator.TASK_STATUSES;
export type TaskStatus = orchestrator.TaskStatus;
export type OrchestratorParams = orchestrator.OrchestratorParams;
export type ExtractionResult = orchestrator.ExtractionResult;
export type AnalysisResult = orchestrator.AnalysisResult;
export type SynthesisResult = orchestrator.SynthesisResult;
export type PipelineTokenUsage = orchestrator.PipelineTokenUsage;
export type StepTraceEntry = orchestrator.StepTraceEntry;
export type PipelineResult = orchestrator.PipelineResult;
export const runPipeline = orchestrator.runPipeline;
