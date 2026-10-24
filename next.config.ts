import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
