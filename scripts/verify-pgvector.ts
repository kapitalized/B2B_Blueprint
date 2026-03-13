/**
 * Verify pgvector extension and embedding columns. Run: npx tsx scripts/verify-pgvector.ts
 */
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;
if (!connectionString) {
  console.error('DATABASE_URL or DATABASE_URI not set');
  process.exit(1);
}

const sql = neon(connectionString);

async function verify() {
  console.log('Checking pgvector setup...\n');

  const ext = await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`;
  if (ext.length === 0) {
    console.log('❌ pgvector extension: NOT FOUND');
  } else {
    console.log('✅ pgvector extension:', ext[0].extname, 'version', ext[0].extversion);
  }

  const cols = await sql`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('ai_knowledge_nodes', 'ref_knowledge_nodes')
      AND column_name = 'embedding'
  `;
  if (cols.length === 0) {
    console.log('❌ embedding columns: NONE FOUND');
  } else {
    for (const c of cols) {
      console.log('✅', c.table_name + '.' + c.column_name, '(', c.udt_name || c.data_type, ')');
    }
  }

  if (ext.length > 0 && cols.length >= 2) {
    console.log('\n✅ pgvector setup OK');
  } else {
    console.log('\n⚠️ Setup incomplete');
    process.exit(1);
  }
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
