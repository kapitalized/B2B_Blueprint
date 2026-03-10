import { BRAND } from '@/lib/brand';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'External Services Setup',
  description: `Configure external services for ${BRAND.name}. Neon, Neon Auth, Vercel Blob, Drizzle, and more.`,
  robots: 'noindex, nofollow',
};

/** Manual steps you must do in external dashboards. Shown as clear cards. */
const manualSettingCards = [
  {
    id: 'vercel-dashboard',
    title: 'Vercel Dashboard',
    where: 'vercel.com → Your Project',
    steps: [
      'Storage: Link a Neon Database to this project (if not already). Use the same Neon project where you enable Neon Auth.',
      'Storage: Link Vercel Blob to this project (Create Store → Blob).',
      'Environment variables: Add DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, BLOB_READ_WRITE_TOKEN (or run vercel env pull after setting them in the Vercel UI).',
    ],
    link: 'https://vercel.com/docs/storage',
    linkLabel: 'Vercel Storage docs',
  },
  {
    id: 'neon-console',
    title: 'Neon Console',
    where: 'neon.tech → Your Project',
    steps: [
      'Create a project and database if you haven’t. Copy the connection string (with ?sslmode=require) → use as DATABASE_URL.',
      'Enable Neon Auth for this project (Integrations or Auth section). Neon creates the neon_auth schema and gives you NEON_AUTH_BASE_URL.',
      'Generate or copy NEON_AUTH_COOKIE_SECRET (e.g. openssl rand -base64 32) and set it in Vercel and .env.local.',
    ],
    link: 'https://neon.tech/docs/neon-auth/overview',
    linkLabel: 'Neon Auth docs',
  },
  {
    id: 'env-local',
    title: 'Environment variables (.env.local)',
    where: 'Project root',
    steps: [
      'Copy .env.example to .env.local.',
      'Set DATABASE_URL = Neon connection string.',
      'Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET from Neon Auth config.',
      'Set BLOB_READ_WRITE_TOKEN from Vercel → Storage → Blob.',
      'Run vercel env pull to sync with Vercel if you added them there first.',
    ],
    link: null,
    linkLabel: null,
  },
  {
    id: 'cursor-mcp',
    title: 'Cursor MCP (optional)',
    where: 'Cursor Settings → Features → MCP Servers',
    steps: [
      'Add a new MCP Server: Name Neon, Type command, Command: npx -y @neondatabase/mcp-server-neon start.',
      'Add environment variable NEON_API_KEY (from Neon Console).',
      'Cursor can then use run_sql, get_database_tables, create_branch, etc.',
    ],
    link: 'https://neon.tech/docs/guides/mcp',
    linkLabel: 'Neon MCP guide',
  },
];

const services = [
  {
    id: 'neon',
    name: 'Neon (database)',
    description: 'Base stack: serverless Postgres. Used by Drizzle, Payload, and Neon Auth (neon_auth schema).',
    signupUrl: 'https://neon.tech/signup',
    signupLabel: 'Sign up & create project',
    envVars: ['DATABASE_URL'],
    steps: [
      'Create a project at neon.tech and a database.',
      'Copy the connection string (with ?sslmode=require) into DATABASE_URL.',
      'Enable Neon Auth in the same project (see Manual settings above).',
    ],
    link: 'https://neon.tech',
    linkLabel: 'Neon',
  },
  {
    id: 'neon-auth',
    name: 'Neon Auth',
    description: 'Base stack: managed auth (Better Auth). Users and sessions live in your Neon DB (neon_auth schema).',
    signupUrl: 'https://neon.tech/docs/neon-auth/overview',
    signupLabel: 'Neon Auth docs',
    envVars: ['NEON_AUTH_BASE_URL', 'NEON_AUTH_COOKIE_SECRET'],
    steps: [
      'Enable Neon Auth in Neon Console for your project.',
      'Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (cookie secret: e.g. openssl rand -base64 32).',
      'Auth API is mounted at /api/auth/*; login/sign-out use this.',
    ],
    link: 'https://neon.tech/docs/neon-auth/overview',
    linkLabel: 'Neon Auth',
  },
  {
    id: 'vercel-blob',
    name: 'Vercel Blob (storage)',
    description: 'Base stack: file storage for uploads (e.g. AI documents).',
    signupUrl: 'https://vercel.com/signup',
    signupLabel: 'Sign up & create Blob store',
    envVars: ['BLOB_READ_WRITE_TOKEN'],
    steps: [
      'In Vercel: Project → Storage → Create Store → Blob.',
      'Copy BLOB_READ_WRITE_TOKEN into .env.local and Vercel env.',
    ],
    link: 'https://vercel.com/docs/storage/vercel-blob',
    linkLabel: 'Vercel Blob docs',
  },
  {
    id: 'drizzle',
    name: 'Drizzle ORM',
    description: 'Base stack: type-safe DB access (lib/db). Uses neon-http driver; schema in lib/db/schema.ts.',
    signupUrl: null,
    signupLabel: null,
    envVars: ['DATABASE_URL'],
    steps: [
      'No signup. Uses DATABASE_URL (same Neon DB).',
      'Run npx drizzle-kit pull to import neon_auth tables; add custom tables in lib/db/schema.ts.',
      'Run npx drizzle-kit generate and migrate to apply changes.',
    ],
    link: 'https://orm.drizzle.team/docs/overview',
    linkLabel: 'Drizzle docs',
  },
  {
    id: 'payload',
    name: 'Payload CMS',
    description: 'Admin at /admin. Uses the same Neon Postgres (DATABASE_URL / DATABASE_URI).',
    signupUrl: null,
    signupLabel: null,
    envVars: ['PAYLOAD_SECRET', 'DATABASE_URL'],
    steps: [
      'PAYLOAD_SECRET: any long random string.',
      'DATABASE_URL: same Neon connection string (or DATABASE_URI for compatibility).',
    ],
    link: null,
    linkLabel: null,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (AI)',
    description: 'AI pipeline: extraction, analysis, synthesis. Powers AI Reports and Documents.',
    signupUrl: 'https://openrouter.ai/keys',
    signupLabel: 'Sign up & get API key',
    envVars: ['OPENROUTER_API_KEY'],
    steps: [
      'Create an account at openrouter.ai; add credits.',
      'Generate an API key and set OPENROUTER_API_KEY.',
    ],
    link: 'https://openrouter.ai',
    linkLabel: 'OpenRouter',
  },
  {
    id: 'python-engine',
    name: 'Python Engine (FastAPI)',
    description: 'Optional microservice for heavy math or custom logic.',
    signupUrl: null,
    signupLabel: null,
    envVars: ['PYTHON_ENGINE_URL', 'INTERNAL_SERVICE_KEY'],
    steps: [
      'Host the FastAPI app (e.g. Railway, Render).',
      'Set PYTHON_ENGINE_URL and INTERNAL_SERVICE_KEY.',
    ],
    link: null,
    linkLabel: null,
  },
  {
    id: 'stripe',
    name: 'Stripe (Billing)',
    description: 'SaaS billing and webhooks.',
    signupUrl: 'https://dashboard.stripe.com/register',
    signupLabel: 'Sign up & get API keys',
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
    steps: [
      'Use Test Mode; get API keys and set webhook URL.',
    ],
    link: 'https://dashboard.stripe.com',
    linkLabel: 'Stripe Dashboard',
  },
  {
    id: 'brevo',
    name: 'Brevo (Contact Form)',
    description: 'Sends contact form submissions via email.',
    signupUrl: 'https://www.brevo.com/en/signup/',
    signupLabel: 'Sign up & create API key',
    envVars: ['BREVO_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL', 'CONTACT_FROM_NAME'],
    steps: [
      'Sign up at brevo.com; create API key; set CONTACT_TO_EMAIL.',
    ],
    link: 'https://www.brevo.com',
    linkLabel: 'Brevo',
  },
  {
    id: 'vercel',
    name: 'Vercel (Hosting)',
    description: 'Deploy and set all environment variables in the project.',
    signupUrl: 'https://vercel.com/signup',
    signupLabel: 'Sign up & add project',
    envVars: ['All from .env.example'],
    steps: [
      'Link GitHub repo; add env vars (or vercel env pull from CLI).',
    ],
    link: 'https://vercel.com',
    linkLabel: 'Vercel',
  },
  {
    id: 'security',
    name: 'Security',
    description: 'ENCRYPTION_KEY for sensitive data (32 chars).',
    signupUrl: null,
    signupLabel: null,
    envVars: ['ENCRYPTION_KEY'],
    steps: ['Generate a 32-character secret; never commit.'],
    link: null,
    linkLabel: null,
  },
  {
    id: 'supabase',
    name: 'Supabase (alternative stack)',
    description: 'Alternative to Neon + Neon Auth + Blob: use Supabase for DB, Auth, and Storage instead.',
    signupUrl: 'https://supabase.com/dashboard',
    signupLabel: 'Supabase Dashboard',
    envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DATABASE_URI'],
    steps: [
      'Create project; get connection string and anon key; create buckets; add redirect URLs for Auth.',
      'See docs/DATABASE_OPTIONS.md for Supabase-as-default wiring.',
    ],
    link: 'https://supabase.com/dashboard',
    linkLabel: 'Supabase',
  },
];

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">External Services Setup</h1>
      <p className="mt-2 text-muted-foreground">
        Base stack for {BRAND.name}: <strong>Neon + Neon Auth + Vercel Blob + Drizzle</strong>. Copy <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env.example</code> to <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.env.local</code> and complete the manual steps below.
      </p>

      <section className="mt-10 rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="text-lg font-semibold">Manual settings (do these first)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These steps are done in external dashboards or your repo; they cannot be automated.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-1">
          {manualSettingCards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border bg-card p-4"
            >
              <h3 className="font-medium">{card.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Where: {card.where}</p>
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm">
                {card.steps.map((step, i) => (
                  <li key={i} className="text-foreground/90">{step}</li>
                ))}
              </ol>
              {card.link && (
                <a
                  href={card.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium"
                  style={{ color: 'var(--brand-primary, #2563eb)' }}
                >
                  {card.linkLabel} →
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
        <h2 className="text-lg font-semibold">Base stack</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Framework: Next.js 15 (App Router). Database: Neon (Postgres). ORM: Drizzle. Auth: Neon Auth. Storage: Vercel Blob.
        </p>
      </section>

      <div className="mt-12 space-y-10">
        {services.map((service) => (
          <section
            key={service.id}
            className="rounded-xl border bg-card p-6"
            id={service.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-xl font-semibold">{service.name}</h2>
              {service.link && (
                <a
                  href={service.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--brand-primary, #2563eb)' }}
                >
                  {service.linkLabel} →
                </a>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
            {service.signupUrl && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <a
                  href={service.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: 'var(--brand-primary, #2563eb)' }}
                >
                  {service.signupLabel} →
                </a>
                <span className="text-muted-foreground">({service.signupUrl})</span>
              </p>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Environment variables</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {service.envVars.map((v) => (
                  <li key={v}>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{v}</code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Setup steps</h3>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
                {service.steps.map((step, i) => (
                  <li key={i} className="text-foreground/90">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        See <strong>Neon+Auth+VercelBlob+Drizzle.md</strong> and <code className="rounded bg-muted px-1 py-0.5">.env.example</code> for full reference.
      </p>
    </div>
  );
}
