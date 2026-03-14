1. Set Up Cursor Project Rules 
Create or update a .cursorrules file in your project root to define how the agent should handle validation. This ensures the model always checks its own work. 

Instruction for .cursorrules:
"Before finalizing any floorplan extraction, always run validate_floorplan.py on the outputted JSON. If any errors are returned (overlaps, area mismatches, or out-of-bounds), you must analyze the discrepancy and provide a corrected version of the coordinates."
2. The Python Validation Script
Your script should check for three primary logical errors that LLMs frequently make during spatial extraction: Room Overlaps, Area Inconsistency, and Boundary Violations.
python
import json

def validate_floorplan(rooms, canvas_width, canvas_height):
    errors = []
    for i, room in enumerate(rooms):
        name, box = room.get("name"), room.get("box_2d") # [x1, y1, x2, y2]
        x1, y1, x2, y2 = box
        
        # 1. Coordinate Validity & Bounds Check
        if x1 >= x2 or y1 >= y2:
            errors.append(f"{name}: Invalid coordinates (x1 >= x2 or y1 >= y2).")
        if x1 < 0 or y2 > canvas_height:
            errors.append(f"{name}: Box {box} exceeds canvas {canvas_width}x{canvas_height}.")
        
        # 2. Area Consistency Check (Math check)
        calc_area = (x2 - x1) * (y2 - y1)
        if abs(calc_area - room.get("area", 0)) > 1.0:
            errors.append(f"{name}: Geometry implies area {calc_area}, but extraction says {room['area']}.")

        # 3. Spatial Overlap Check
        for j, other in enumerate(rooms[i+1:]):
            ox1, oy1, ox2, oy2 = other.get("box_2d")
            # Calculate intersection
            inter_area = max(0, min(x2, ox2) - max(x1, ox1)) * max(0, min(y2, oy2) - max(y1, oy1))
            if inter_area > (0.01 * calc_area): # 1% tolerance for shared walls
                errors.append(f"CRITICAL OVERLAP: {name} and {other['name']}.")
    return errors
Use code with caution.

3. The "Self-Correction" Workflow in Cursor
Use Agent Mode or Composer in Cursor to automate the loop. 


Extraction: Cursor reads the floorplan image and extracts the JSON data.
Verification: You (or the Cursor Agent) run the Python script on that JSON.
Feedback: If the script outputs errors, paste them back into the chat.
Re-run: The model interprets the specific spatial error (e.g., "Oh, the Kitchen and Living Room overlap by 5 units") and adjusts the coordinates to fit. 


4. Use "Plan Mode" for Complex Layouts 
For large floorplans, use Cursor's Plan Mode (Shift + Tab). Tell it to first "Research the image and write a textual description of room adjacencies" before it attempts to write the coordinate numbers. This creates a mental map that prevents the model from "hallucinating" room placements.

---

## Pipeline integration (implemented)

The app runs validation, optional retry, and result checks so extraction and report stay consistent:

1. **Validation** (`lib/ai/validate-floorplan.ts`): After the model returns rooms + canvas_size + box_2d, the pipeline runs `validateFloorplan(rooms, width, height)` (invalid coords, out-of-bounds, overlaps).
2. **Retry only when valid:** If validation fails, the pipeline calls the extraction model once with a correction prompt. The **retry response is used only if it passes validation**; otherwise the first response is kept.
3. **Post-parse result check:** If parsed items have generic labels ("Room", "Room 1", …) but the raw JSON has room names (e.g. "Bedroom", "Bath"), names are copied from the raw `rooms` array by index so the report and overlay show real names.
4. **Merge before synthesis:** Extraction labels and areas (by index) always overwrite generic "Room" / 0 in the items sent to synthesis when extraction has better data.
5. **Overlay fallback:** If `rawExtraction` in the DB has no boxes, the overlay API parses the extraction step’s `responsePreview` from the step trace. It supports the **rooms + box_2d + canvas_size** schema (converts pixel box_2d to 0–1000 and draws boxes), so boundary boxes can appear even when the stored extraction shape was wrong.

**Where:** `lib/ai/orchestrator.ts` (extraction, retry, merge), `lib/ai/validate-floorplan.ts`, `app/api/reports/[reportId]/overlay/route.ts` (overlay fallback).