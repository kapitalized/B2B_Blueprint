import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/dashboard/admin/usage', destination: '/admin/usage', permanent: true },
      { source: '/dashboard/admin/run-logs', destination: '/admin/run-logs', permanent: true },
      { source: '/dashboard/admin/ai-models', destination: '/admin/ai-models', permanent: true },
    ];
  },
};

export default withPayload(nextConfig);
