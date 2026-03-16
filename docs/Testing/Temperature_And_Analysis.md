# Temperature by step and effect on analysis

The pipeline passes **temperature** to OpenRouter per step. When not set, the API uses its default (often 0.7–1.0).

## Values used (see also `floorplan-test-result.json` → `temperatures`)

| Step | Temperature | Rationale |
|------|-------------|-----------|
| **Plan text extraction** | **0** | Deterministic list/JSON of labels and boxes; no creativity needed. |
| **Extraction** (main + retry) | **0.2** | Low randomness so room names and coordinates stay stable and consistent with the image; reduces hallucination. |
| **Extraction review pass** (multilook) | **0.2** | Same as main extraction: corrections should follow the plan, not vary. |
| **Analysis** | **0.3** | Low randomness so value/unit/citation_id stay consistent with extraction; reduces variation in reported areas and lengths. |
| **Synthesis** | **default** (not set) | Report prose can vary; default temperature is acceptable for narrative. |

## How this affects analysis

- **Extraction (0.2)**  
  - Lower temperature makes room labels, `box_2d`, and JSON structure more consistent run-to-run and reduces spurious rooms or names.  
  - Too high (e.g. 0.8) can cause the same plan to yield different room names or boxes.

- **Analysis (0.3)**  
  - Analysis turns extraction (rooms, areas, lengths) into report items (value, unit, citation_id).  
  - Temperature **0.3** keeps numeric values and mapping to extraction IDs consistent run-to-run while allowing minor variation in wording.  
  - Lower (e.g. 0.2) would be even more deterministic; higher would risk different rounding or mis-assignment of values to rooms.

- **Synthesis (default)**  
  - Only affects the written report (markdown). Slightly higher variability is usually fine for narrative.

## Summary

- **Plan text**: 0 (fully deterministic).  
- **Extraction**: 0.2 (stable boxes and names).  
- **Analysis**: 0.3 (stable quantities and mapping).  
- **Synthesis**: default (narrative can vary).
