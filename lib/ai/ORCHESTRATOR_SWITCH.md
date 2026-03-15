# Orchestrator: single-pass vs multilook

## Files

| File | Role |
|------|------|
| **orchestrator.ts** | Router: re-exports from single-pass or multilook based on env. |
| **orchestrator-single-pass.ts** | Current working pipeline (one extraction + optional validation retry). **Fallback.** |
| **orchestrator-multilook.ts** | Same as single-pass + optional second-pass review (same image + first-pass JSON → model corrects). |

## Switch behaviour

- **Default (no env):** `orchestrator.ts` uses **orchestrator-single-pass.ts**.
- **Multilook on:** Set `ENABLE_EXTRACTION_REVIEW_PASS=true` (e.g. in `.env.local`) → `orchestrator.ts` uses **orchestrator-multilook.ts**.
- **HF floorplan extraction:** Set `USE_HF_FLOORPLAN_EXTRACTION=true` and `HUGGINGFACE_HUB_TOKEN` (or `HF_TOKEN`) → for plan images, the pipeline tries the Hugging Face model first (`lib/ai/floorplan-extraction-hf.ts`); on failure or if disabled, it falls back to OpenRouter vision extraction.

## If multilook causes issues

1. Remove or set to false: `ENABLE_EXTRACTION_REVIEW_PASS` in `.env.local` (or do not set it).
2. Restart the dev server / app so the router picks single-pass again.

No file rename or code change needed; only the env flag.

## Implementation detail

- **Single-pass:** One vision extraction; if validation fails (overlaps, bounds), one retry with error feedback; then parse → analysis → synthesis.
- **Multilook:** Same as above, then when `ENABLE_EXTRACTION_REVIEW_PASS=true`: second vision call with same image + first-pass JSON; prompt asks model to add missing rooms, fix overlaps, correct names; use second response only if it passes validation and has at least as many rooms.
