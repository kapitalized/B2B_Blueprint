This guide is designed for **Cursor** to act as your lead architect and developer. It explains the core logic, user journey, and how the database schema you’ve already created should be utilized during the development process.

---

# **Flow of Users for a Construction AP App**

## **1. App Purpose**

An "Agentic" Construction Management platform that transforms static PDF plans and reports into actionable data. The app uses AI to "Digest" facts from files, "Analyze" engineering requirements (volumes, areas, materials), and provide a conversational interface for project managers to query their site data.

---

## **2. User Types & Permissions**

* **In Development Phase:** 
During development, treat all users as having full access (ignore plan limits)

When moving to pre-production implement the tiered paid plans below.
* **Free User (Default):** Limited to 1 project and 5 file uploads. Basic Chat only.
* **Basic/Premium User:** Multi-project support, advanced AI Analysis (Volume/Material calculations), and Report Generation.

---

## **3. The End-to-End User Flow**

### **Phase 1: Onboarding & Project Creation**

1. **Registration:** User signs up via Neon Auth (integrated with `user_profiles`).
2. **Subscription:** User stays on "Free" or upgrades (Stripe flow).
3. **Project Start:** User creates a project (e.g., "Villa Bali") in `project_main`.
* *Input:* Name, Address, Site Type.



### **Phase 2: Data Ingestion (The "Digest")**

1. **Upload:** User uploads PDFs (Blueprints, Defect Reports) to `project_files` via Vercel Blob.
2. **AI Ingestion:** AI parses the file.
* **Action:** Extract raw dimensions, room names, and material notes.
* **Storage:** Save facts into `ai_digests`.
* **Vectorize:** Chunk text into `ai_knowledge_nodes` for RAG-based search.



### **Phase 3: The "Analysis" & Reference Library**

1. **Trigger:** During analysis the AI engine to cross-reference to the Library (if it has been implemented)
2. **Logic:** AI cross-references the `ai_digests` with a **Reference Library** (Standard building codes, material densities, or local Bali construction standards).
3. **Calculation:** AI calculates Wall Areas, Concrete Volumes, and Window Schedules.
4. **Storage:** Save calculated logic into `ai_analyses`.

### **Phase 4: Interaction (Multi-Threaded Chat)**

1. **Initiate:** User creates a thread (e.g., "Concrete Quantity Check") in `chat_threads`.
2. **Query:** User asks: "How much concrete is needed for the ground floor slabs?"
3. **Memory:** AI retrieves history from `chat_messages` and "Context" from `chat_threads`.
4. **Retrieval:** AI queries `ai_analyses` first (to find pre-calculated volumes), then `ai_knowledge_nodes` (to find text-based specs).

### **Phase 5: Output & Reporting**

1. **Report Request:** User clicks "Generate Volume Report."
2. **Generation:** AI pulls data from `ai_analyses` and formats it into Markdown/PDF.
3. **Persistence:** Saved in `report_generated` for later retrieval or download.
4. **Iteration:** User can say "Change concrete strength to 30MPa," AI updates the analysis and re-generates the report.

---

## **4. Data Input & Output Requirements**

| Feature | Input Data | AI Output / Result |
| --- | --- | --- |
| **Area Calculation** | Floorplans (PDF/Img) | Total Floor Area ($m^2$), Wall Surface Area, Window Counts. |
| **Material Suggester** | Digest data + Ref Library | Recommended materials based on site type (e.g., high-humidity materials for Bali). |
| **Quantity Takeoff** | Plans + Measurements | Concrete Volume ($m^3$), Rebar weight, Brick counts. |
| **Defect Comparison** | Defect Report + Original Plans | List of deviations where the build does not match the design. |

---

## **5. Logs & Audit Trail**

Every significant interaction must be logged in `audit_log`:

* `FILE_UPLOAD`: Who uploaded what and when.
* `AI_ANALYSIS_RUN`: Which model was used and what it cost.
* `REPORT_GEN`: When a formal document was created.

---

## **6. Instructions for Cursor (Developer Persona)**

When building components, follow these rules:

1. **Check the Schema:** Always refer to `schema.ts` to ensure IDs are correctly linked (e.g., `thread_id` to `chat_messages`).
2. **Server Actions:** Use Next.js Server Actions for file uploads and starting AI runs.
3. **Context Loading:** In Chat threads, always provide the AI with the `project_id` context so it doesn't "hallucinate" data from other projects.
4. **Citations:** When the AI provides a measurement, force it to return the `file_id` or `digest_id` as a citation in `chat_messages.citations`.

