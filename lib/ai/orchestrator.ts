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
export type TaskStatus = singlePass.TaskStatus;
export type OrchestratorParams = singlePass.OrchestratorParams;
export type ExtractionResult = singlePass.ExtractionResult;
export type AnalysisResult = singlePass.AnalysisResult;
export type SynthesisResult = singlePass.SynthesisResult;
export type PipelineTokenUsage = singlePass.PipelineTokenUsage;
export type StepTraceEntry = singlePass.StepTraceEntry;
export type PipelineResult = singlePass.PipelineResult;
export const runPipeline = orchestrator.runPipeline;
