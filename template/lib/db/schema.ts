/**
 * Base schema: Neon Auth (neon_auth.*) + app tables.
 * Run: npx drizzle-kit pull (imports neon_auth from DB), then npx drizzle-kit generate && npx drizzle-kit migrate.
 */

import {
  pgTable,
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

// ---- Neon Auth (managed by Neon Auth). After enabling Neon Auth, run: npx drizzle-kit pull ----
export const neonAuth = pgSchema('neon_auth');

export const users = neonAuth.table('user', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  emailVerified: text('emailVerified'),
  image: text('image'),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});

// ---- App tables ----

/** B2B organizations (tenant). orgId is used in AI run, batch, audit. */
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

/** User-uploaded files (Vercel Blob URL + metadata). AI Documents page. */
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  orgId: uuid('org_id').references(() => organizations.id),
  blobUrl: text('blob_url').notNull(),
  fileName: text('file_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

/** AI pipeline runs (replaces in-memory run history). AI Reports, review queue. */
export const aiRuns = pgTable('ai_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: text('run_id').notNull().unique(),
  taskId: text('task_id').notNull(),
  documentId: uuid('document_id').references(() => documents.id),
  orgId: uuid('org_id').references(() => organizations.id),
  status: text('status').notNull(),
  contentMd: text('content_md'),
  dataPayload: jsonb('data_payload'),
  criticalWarningsCount: integer('critical_warnings_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Audit trail per run (compliance). lib/ai/audit-trail can persist here. */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: text('run_id').notNull(),
  taskId: text('task_id').notNull(),
  step: text('step'),
  model: text('model').notNull(),
  promptVersion: text('prompt_version'),
  orgId: uuid('org_id').references(() => organizations.id),
  documentId: uuid('document_id').references(() => documents.id),
  createdAt: timestamp('created_at').defaultNow(),
});

/** Chat threads (AI Chat page). */
export const chatThreads = pgTable('chat_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull().default('New chat'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/** Chat messages (AI Chat page). */
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => chatThreads.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
