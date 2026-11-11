import type { NextConfig } from 'next';

// One id per deployment, baked into the client bundle and served by
// /api/version so open tabs can detect that a newer build went live.
// Empty outside Vercel, which turns the check off.
const buildId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  experimental: {
    agentUpgrade: 'security',
  },
  async redirects() {
    return [
      {
        source: '/studio',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
