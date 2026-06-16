const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'images.unsplash.com', 'i.pravatar.cc', '*.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // unoptimized: true, // Vercel 图片优化已开启
  },
  generateBuildId: async () => {
    return 'build-' + Date.now() + '-v05031-refund-engine-2';
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'stellawei',
  project: 'stellawei',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
});