# Doc Generation Module

Generate **Word (.docx)**, **PDF**, and **Excel (.xlsx)** from structured content. Used for reports, takeoffs, and exports. AI produces the content/structure; this module turns it into files.

## The three formats

| Format | Use case | Library |
|--------|----------|--------|
| **Docx** | Editable documents, client-facing drafts, comments | `docx` |
| **PDF** | Final/print, signed submissions, read-only | `pdf-lib` |
| **Excel** | Tables, quantities, data for further analysis | `exceljs` |

## Report vs Doc (is it the same function?)

- **Doc** = a single, relatively flat document: title + body (+ optional table). One logical “piece” of content.
- **Report** = multi-page, structured output: **title, TOC (index), multiple sections, footnotes, optional figure placeholders**. Same pipeline and same `generateDoc()` entry point; the **content shape** is different (`ReportContent` vs `SimpleDocContent`).

So: **same function** (`generateDoc()`), **different content types**. Use `kind: 'report'` when you have many sections, index, and footnotes; use `kind: 'simple'` for a single block.

## When to create a Doc vs a PDF?

- **Create a Doc (.docx)** when:
  - The user needs to **edit** the file (tweak text, add comments, merge with other docs).
  - You’re delivering a **draft** or internal document.
- **Create a PDF** when:
  - The output is **final** (submission, print, archival).
  - You want **read-only** and consistent layout across devices.
  - You don’t need editing.

Because a Doc can usually be **converted to PDF** (e.g. “Save as PDF” in Word), you can:
- Generate **Docx** by default for flexibility, and let the user export to PDF, or
- Offer **both** in the UI (“Download as Word” / “Download as PDF”) and call the same module with `format: 'docx'` or `format: 'pdf'`.

## API

**POST** `/api/projects/[projectId]/doc-generation`

- **Auth:** Session required; user must have access to the project.
- **Body:**
  - `format`: `'docx' | 'pdf' | 'xlsx'`
  - `filename`: optional, used for the download name
  - `kind`: `'report' | 'simple'`
  - `content`: either `ReportContent` or `SimpleDocContent`

**Simple doc example:**

```json
{
  "format": "pdf",
  "kind": "simple",
  "content": {
    "title": "Summary",
    "body": "First paragraph.\nSecond paragraph.",
    "table": [{ "Item": "Walls", "Qty": 10 }, { "Item": "Doors", "Qty": 4 }]
  }
}
```

**Report example:**

```json
{
  "format": "docx",
  "kind": "report",
  "content": {
    "title": "Level 1 Takeoff Report",
    "subtitle": "Project Alpha",
    "toc": [{ "title": "Summary" }, { "title": "Quantities" }],
    "sections": [
      { "title": "Summary", "body": "Overview text..." },
      { "title": "Quantities", "body": "Table below.", "table": [{ "Label": "Walls", "Value": 10, "Unit": "m" }] }
    ],
    "footnotes": { "1": "Source: drawing A-101" }
  }
}
```

Response: binary file with `Content-Disposition: attachment` and appropriate `Content-Type`.

## Library usage

- **`lib/doc-generation/`** – types, `doc.ts` (Word), `pdf.ts` (PDF), `excel.ts` (Excel), `index.ts` (`generateDoc()`).
- **`generateDoc(input, { format, filename? })`** – returns `{ buffer, contentType, suggestedFilename }`.

Storage: the API returns the file in the response; the client can upload the buffer to Vercel Blob (or your storage) if you want to persist it and link from `report_generated.blobUrl`.
