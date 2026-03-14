# Using the Floorplans for Testing folder

The **Floorplans for Testing** folder (sibling of this repo or in your workspace) contains:

| File | Use |
|------|-----|
| **PNG + JSON pairs** (e.g. `5Marla_GF_FP_001_V01.png` + `.json`) | Image for the AI; JSON = **ground truth** (room counts, areas in sqft/pixels) for comparing model output. |
| **4Bedroom House Floorplan.jpg** | Image only (no JSON). Use to test extraction without ground truth. |

---

## 1. Run the vision pipeline (UI)

1. **Create or open a project** in the app.
2. **Upload a floorplan** from the folder:
   - Go to the project → Files (or upload area).
   - Choose one of: `5Marla_GF_FP_001_V01.png`, `10Marla_GF_FP_001_V01.png`, `20Marla_GF_FP_010_V04.png`, `5Marla_GF_FP_003_V04.png`, or `4Bedroom House Floorplan.jpg`.
3. **Trigger analysis**: use “Run analysis” / “Generate report” for that file. The app will call the AI pipeline with the **vision extraction prompt** (bounding boxes, rooms/slabs/openings).
4. **Check the report** and, if you add the eval module, use “Pick winner” when comparing two models on the same plan.

This exercises the same path as production: upload → private Blob URL → pipeline with `fileUrl` → vision prompt → extraction → analysis → report.

---

## 2. Use the JSON files as ground truth

Each `.json` next to a PNG has:

- **`room_counts`** – Expected counts per room type (e.g. Bedroom: 2, Bathroom: 3).
- **`room_total_areas_sqft`** – Total area per type (e.g. Bedroom: 307.3 sqft).
- **`room_instance_areas_sqft`** – Per-instance areas (for precision checks).
- **`overall_total_counted_sqft`** – Total floor area.

**How to use for testing:**

- **Manual:** After a run, compare the report (or raw extraction) to the JSON: same room types? Similar counts? Areas within a tolerance (e.g. 5%)?
- **Later / script:** When you have eval runs, you can compare:
  - **Completeness:** Did the model find every room type in `room_counts`?
  - **Groundedness:** Did it invent rooms not in the JSON?
  - **Precision:** Are extracted areas within X% of `room_total_areas_sqft` or `overall_total_counted_sqft`?

No code changes are required to use the JSON manually; a future “eval vs ground truth” script or UI can load the matching JSON by filename (e.g. `5Marla_GF_FP_001_V01.json`) and diff against the AI output.

---

## 3. Quick reference: which file to use

- **With ground truth (for accuracy checks):** Use any **PNG** that has a matching **JSON** in the same folder.
- **Image-only test:** Use **4Bedroom House Floorplan.jpg** (no JSON; good for “does the vision prompt run?” and qualitative check).

All of these work with the current vision extraction prompt (rooms, slabs, openings, normalized bbox 0–1000). The JPEG is fine for the same pipeline; only the presence of a matching JSON distinguishes “has ground truth” vs “image-only”.
