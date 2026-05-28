/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'images.unsplash.com', 'i.pravatar.cc'],
    unoptimized: true,
  },
  generateBuildId: async () => {
    return 'build-' + Date.now() + '-v05028';
  },
};

module.exports = nextConfig;