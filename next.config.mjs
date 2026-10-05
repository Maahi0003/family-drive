/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  webpack: (config) => {
    // Disable webpack disk filesystem cache to avoid EINVAL on cloud/virtual mounted filesystems
    config.cache = false;
    return config;
  },
};

export default nextConfig;
