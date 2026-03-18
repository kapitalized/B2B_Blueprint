import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/dashboard/admin/usage', destination: '/admin/usage', permanent: true },
      { source: '/dashboard/admin/run-logs', destination: '/admin/run-logs', permanent: true },
      { source: '/dashboard/admin/ai-models', destination: '/admin/ai-models', permanent: true },
      { source: '/dashboard/ai/reports', destination: '/dashboard/ai/analyse', permanent: true },
      { source: '/project/:shortId/:slug/reports', destination: '/project/:shortId/:slug/analyse', permanent: true },
      { source: '/project/:shortId/:slug/reports/:reportShortId', destination: '/project/:shortId/:slug/analyse/:reportShortId', permanent: true },
    ];
  },
};

export default withPayload(nextConfig);
