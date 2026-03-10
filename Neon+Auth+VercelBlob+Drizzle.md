This guide provides the exact instructions to set up the **Neon + Vercel Blob + Neon Auth** stack with **Drizzle ORM**. 

---

# **CURSOR_INSTRUCTIONS.md**

## **Stack Overview**

* **Framework:** Next.js 15 (App Router)
* **Database:** Neon (PostgreSQL)
* **ORM:** Drizzle ORM
* **Auth:** Neon Auth (Managed Better Auth)
* **Storage:** Vercel Blob
* **Agentic Power:** Neon MCP Server (for schema & branch management)

---

## **1. Infrastructure Requirements**

Before coding, ensure the following are provisioned in the **Vercel Dashboard > Storage**:

1. **Neon Database:** Linked to this project with **"Neon Auth" enabled**.
2. **Vercel Blob:** Linked to this project.
3. **Environment Variables:** Run `vercel env pull` to ensure `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `BLOB_READ_WRITE_TOKEN` are in `.env.local`.

---

## **2. Empowering Cursor (MCP Setup)**

To allow Cursor to manage the database directly:

1. Open **Cursor Settings > Features > MCP Servers**.
2. Add a new MCP Server:
* **Name:** `Neon`
* **Type:** `command`
* **Command:** `npx -y @neondatabase/mcp-server-neon start`
* **Environment Variables:** Add `NEON_API_KEY` (get from Neon Console).


3. Cursor can now use tools like `run_sql`, `get_database_tables`, and `create_branch`.

---

## **3. Implementation Standards**

### **A. Database Client (`src/db/index.ts`)**

Always use the `neon-http` driver for serverless compatibility:

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

```

### **B. Schema Architecture (`src/db/schema.ts`)**

1. **Neon Auth Tables:** Use `npx drizzle-kit pull` to import existing `neon_auth` tables.
2. **Custom Tables:** Define custom tables in the same file. Always link `userId` to `neonAuth.user.id`.

```typescript
import { pgTable, pgSchema, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const neonAuth = pgSchema("neon_auth");

// The user table managed by Neon Auth
export const users = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
});

// Example: User-uploaded files via Vercel Blob
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  blobUrl: text("blob_url").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

```

### **C. Auth Client (`src/lib/auth.ts`)**

```typescript
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
    baseURL: process.env.NEON_AUTH_BASE_URL
});

```

### **D. File Upload Logic (Vercel Blob)**

Always use **Server Actions** for uploads:

```typescript
import { put } from '@vercel/blob';

export async function uploadAction(formData: FormData) {
  const file = formData.get('file') as File;
  const blob = await put(file.name, file, { access: 'public' });
  // Save blob.url to Drizzle 'documents' table here
  return blob.url;
}

```

---

## **4. Prompting Cursor**

Use these commands to leverage this setup:

* **"Cursor, check my Neon schema and add a new table for 'Invoices'."**
* **"Implement a login page using Neon Auth and redirect to /dashboard."**
* **"Create a file upload component that saves the PDF to Vercel Blob and a reference in Neon."**
* **"Run a migration using Drizzle Kit to sync my schema.ts with the database."**

---
