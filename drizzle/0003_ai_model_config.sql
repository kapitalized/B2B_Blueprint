CREATE TABLE IF NOT EXISTS "ai_model_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"extraction_model" text NOT NULL,
	"analysis_model" text NOT NULL,
	"synthesis_model" text NOT NULL,
	"chat_model" text NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
INSERT INTO "ai_model_config" ("id", "extraction_model", "analysis_model", "synthesis_model", "chat_model")
VALUES (1, 'google/gemini-2.0-flash-001', 'deepseek/deepseek-r1', 'anthropic/claude-3.7-sonnet', 'openai/gpt-4o-mini')
ON CONFLICT ("id") DO NOTHING;
