import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Pages } from './collections/Pages';
import { ExternalIntegrations } from './collections/ExternalIntegrations';
import { SiteSettings } from './globals/SiteSettings';

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URI;

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Logo: {
          path: './_components/AdminLogo.tsx',
        },
      },
      providers: ['./_components/AdminNavProvider.tsx#AdminNavProvider'],
      afterNavLinks: ['./_components/AdminNavLinks.tsx#AdminNavLinks'],
      views: {
        AppDashboard: {
          Component: './_components/WithLayoutViews.tsx#AdminDashboardViewWithLayout',
          path: '/',
          exact: true,
          meta: { title: 'App monitoring', description: 'Links to app users, projects, AI logs, and settings' },
        },
        AppUsers: {
          Component: './_components/WithLayoutViews.tsx#AppUsersViewWithLayout',
          path: '/app-users',
          exact: true,
          meta: { title: 'App users', description: 'Users who sign in to the app' },
        },
        AIModels: {
          Component: './_components/WithLayoutViews.tsx#AIModelsViewWithLayout',
          path: '/ai-models',
          exact: true,
          meta: { title: 'AI models (OpenRouter)', description: 'Pipeline and chat model config' },
        },
        RunLogs: {
          Component: './_components/WithLayoutViews.tsx#RunLogsViewWithLayout',
          path: '/run-logs',
          exact: true,
          meta: { title: 'Run logs', description: 'AI pipeline runs and token usage' },
        },
        Usage: {
          Component: './_components/WithLayoutViews.tsx#UsageViewWithLayout',
          path: '/usage',
          exact: true,
          meta: { title: 'Usage & cost', description: 'AI usage and cost by model, event type, and day' },
        },
        Projects: {
          Component: './_components/WithLayoutViews.tsx#ProjectsViewWithLayout',
          path: '/projects',
          exact: true,
          meta: { title: 'Projects', description: 'App projects list' },
        },
        Chats: {
          Component: './_components/WithLayoutViews.tsx#ChatsViewWithLayout',
          path: '/chats',
          exact: true,
          meta: { title: 'Chats', description: 'Chat threads by project' },
        },
        Files: {
          Component: './_components/WithLayoutViews.tsx#FilesViewWithLayout',
          path: '/files',
          exact: true,
          meta: { title: 'Files', description: 'Project file uploads' },
        },
      },
    },
  },
  collections: [Users, Pages, ExternalIntegrations],
  globals: [SiteSettings],
  secret: process.env.PAYLOAD_SECRET || 'change-me-in-production',
  typescript: {
    outputFile: path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl || 'postgresql://localhost:5432/payload',
    },
    push: false, // use migrations so admin works without interactive Drizzle prompt
  }),
  sharp,
});
