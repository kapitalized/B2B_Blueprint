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
          path: 'components/admin-payload/AdminLogo.tsx',
        },
      },
      views: {
        AppDashboard: {
          Component: 'components/admin-payload/AdminDashboardView.tsx#AdminDashboardView',
          path: '/',
          exact: true,
          meta: { title: 'App monitoring', description: 'Links to app users, projects, AI logs, and settings' },
        },
        AppUsers: {
          Component: 'components/admin-payload/AppUsersView.tsx#AppUsersView',
          path: '/app-users',
          exact: true,
          meta: { title: 'App users', description: 'Users who sign in to the app' },
        },
        AIModels: {
          Component: 'components/admin-payload/AIModelsView.tsx#AIModelsView',
          path: '/ai-models',
          exact: true,
          meta: { title: 'AI models (OpenRouter)', description: 'Pipeline and chat model config' },
        },
        RunLogs: {
          Component: 'components/admin-payload/RunLogsView.tsx#RunLogsView',
          path: '/run-logs',
          exact: true,
          meta: { title: 'Run logs', description: 'AI pipeline runs and token usage' },
        },
        Projects: {
          Component: 'components/admin-payload/ProjectsView.tsx#ProjectsView',
          path: '/projects',
          exact: true,
          meta: { title: 'Projects', description: 'App projects list' },
        },
        Chats: {
          Component: 'components/admin-payload/ChatsView.tsx#ChatsView',
          path: '/chats',
          exact: true,
          meta: { title: 'Chats', description: 'Chat threads by project' },
        },
        Files: {
          Component: 'components/admin-payload/FilesView.tsx#FilesView',
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
