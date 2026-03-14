/**
 * Admin: AI usage and cost from logs_ai_runs. Aggregates + recent rows.
 * GET ?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=100
 * Allowed: dashboard session OR Payload admin.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { db } from '@/lib/db';
import { logs_ai_runs, project_main, user_profiles } from '@/lib/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const session = await getSessionForApi();
  const payloadAdmin = await isPayloadAdmin(req);
  if (!session && !payloadAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get('from'));
  const to = parseDate(searchParams.get('to'));
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

  const dateFilter = [];
  if (from) dateFilter.push(gte(logs_ai_runs.createdAt, from));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    dateFilter.push(lte(logs_ai_runs.createdAt, end));
  }
  const where = dateFilter.length > 0 ? and(...dateFilter) : undefined;

  try {
    // Summary: total cost, total tokens, count
    const [summaryRow] = await db
      .select({
        totalCost: sql<string>`coalesce(sum(${logs_ai_runs.cost})::text, '0')`,
        totalTokens: sql<number>`coalesce(sum(${logs_ai_runs.totalTokens}), 0)`,
        totalCalls: sql<number>`count(*)::int`,
      })
      .from(logs_ai_runs)
      .where(where);

    const totalCost = Number(summaryRow?.totalCost ?? 0);
    const totalTokens = Number(summaryRow?.totalTokens ?? 0);
    const totalCalls = Number(summaryRow?.totalCalls ?? 0);

    // By model: model, cost, tokens, count
    const byModelRows = await db
      .select({
        model: logs_ai_runs.model,
        cost: sql<string>`coalesce(sum(${logs_ai_runs.cost})::text, '0')`,
        tokens: sql<number>`coalesce(sum(${logs_ai_runs.totalTokens}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(logs_ai_runs)
      .where(where)
      .groupBy(logs_ai_runs.model)
      .orderBy(desc(sql`sum(${logs_ai_runs.cost})`));

    const byModel = byModelRows.map((r) => ({
      model: r.model ?? '—',
      cost: Number(r.cost ?? 0),
      tokens: Number(r.tokens ?? 0),
      count: Number(r.count ?? 0),
    }));

    // By event type: eventType, cost, tokens, count
    const byEventRows = await db
      .select({
        eventType: logs_ai_runs.eventType,
        cost: sql<string>`coalesce(sum(${logs_ai_runs.cost})::text, '0')`,
        tokens: sql<number>`coalesce(sum(${logs_ai_runs.totalTokens}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(logs_ai_runs)
      .where(where)
      .groupBy(logs_ai_runs.eventType)
      .orderBy(desc(sql`sum(${logs_ai_runs.cost})`));

    const byEventType = byEventRows.map((r) => ({
      eventType: r.eventType,
      cost: Number(r.cost ?? 0),
      tokens: Number(r.tokens ?? 0),
      count: Number(r.count ?? 0),
    }));

    // By day: day (date string), cost, tokens, count
    const byDayRows = await db
      .select({
        day: sql<string>`date_trunc('day', ${logs_ai_runs.createdAt})::date::text`,
        cost: sql<string>`coalesce(sum(${logs_ai_runs.cost})::text, '0')`,
        tokens: sql<number>`coalesce(sum(${logs_ai_runs.totalTokens}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(logs_ai_runs)
      .where(where)
      .groupBy(sql`date_trunc('day', ${logs_ai_runs.createdAt})`)
      .orderBy(desc(sql`date_trunc('day', ${logs_ai_runs.createdAt})`))
      .limit(31);

    const byDay = byDayRows.map((r) => ({
      day: r.day,
      cost: Number(r.cost ?? 0),
      tokens: Number(r.tokens ?? 0),
      count: Number(r.count ?? 0),
    }));

    // Recent rows with project and user names
    const rows = await db
      .select({
        id: logs_ai_runs.id,
        createdAt: logs_ai_runs.createdAt,
        eventType: logs_ai_runs.eventType,
        projectId: logs_ai_runs.projectId,
        userId: logs_ai_runs.userId,
        provider: logs_ai_runs.provider,
        model: logs_ai_runs.model,
        inputTokens: logs_ai_runs.inputTokens,
        outputTokens: logs_ai_runs.outputTokens,
        totalTokens: logs_ai_runs.totalTokens,
        cost: logs_ai_runs.cost,
        latencyMs: logs_ai_runs.latencyMs,
        projectName: project_main.projectName,
        userEmail: user_profiles.email,
      })
      .from(logs_ai_runs)
      .leftJoin(project_main, eq(logs_ai_runs.projectId, project_main.id))
      .leftJoin(user_profiles, eq(logs_ai_runs.userId, user_profiles.id))
      .where(where)
      .orderBy(desc(logs_ai_runs.createdAt))
      .limit(limit);

    const usageRows = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt?.toISOString() ?? null,
      eventType: r.eventType,
      projectId: r.projectId,
      userId: r.userId,
      projectName: r.projectName ?? null,
      userEmail: r.userEmail ?? null,
      provider: r.provider,
      model: r.model ?? null,
      inputTokens: r.inputTokens ?? null,
      outputTokens: r.outputTokens ?? null,
      totalTokens: r.totalTokens ?? null,
      cost: r.cost != null ? Number(r.cost) : null,
      latencyMs: r.latencyMs ?? null,
    }));

    return NextResponse.json({
      summary: { totalCost, totalTokens, totalCalls },
      byModel,
      byEventType,
      byDay,
      rows: usageRows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('does not exist') || message.includes('relation')) {
      return NextResponse.json({
        summary: { totalCost: 0, totalTokens: 0, totalCalls: 0 },
        byModel: [],
        byEventType: [],
        byDay: [],
        rows: [],
        _message: 'Table logs_ai_runs not found. Run scripts/create-logs-tables.sql in Neon.',
      });
    }
    console.error('[admin/ai-usage]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
