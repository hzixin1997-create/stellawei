/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export'，使用服务端渲染
  // output: 'export',
  // distDir: 'dist',
  images: {
    domains: ['localhost', 'images.unsplash.com', 'i.pravatar.cc'],
    unoptimized: true,
  },
};

module.exports = nextConfig;
