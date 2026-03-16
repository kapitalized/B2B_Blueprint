/**
 * Admin: list Neon (app) database schemas and tables from information_schema. Read-only.
 */
import { NextResponse } from 'next/server';
import { getSessionForApi } from '@/lib/auth/session';
import { isPayloadAdmin } from '@/lib/auth/payload-admin';
import { sql } from '@/lib/db';

async function allowAdmin(request: Request) {
  const session = await getSessionForApi();
  if (session) return true;
  return isPayloadAdmin(request);
}

export async function GET(request: Request) {
  if (!(await allowAdmin(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tables = (await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `) as { table_schema: string; table_name: string }[];

    const columns = (await sql`
      SELECT table_schema, table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name, ordinal_position
    `) as { table_schema: string; table_name: string; column_name: string; data_type: string; is_nullable: string }[];

    const schemaList = new Map<string, { tables: { name: string; columns: { name: string; type: string; nullable: boolean }[] }[] }>();
    for (const t of tables) {
      const schemaName = t.table_schema;
      if (!schemaList.has(schemaName)) schemaList.set(schemaName, { tables: [] });
      const cols = columns.filter((c) => c.table_schema === t.table_schema && c.table_name === t.table_name);
      schemaList.get(schemaName)!.tables.push({
        name: t.table_name,
        columns: cols.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
        })),
      });
    }

    const schemas = Array.from(schemaList.entries()).map(([name, data]) => ({ name, tables: data.tables }));

    return NextResponse.json({ schemas });
  } catch (e) {
    console.error('[admin/database]', e);
    const message = e instanceof Error ? e.message : 'Failed to load schema';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
