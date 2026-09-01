/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',  // 👈 important: tells Next to generate static HTML
  basePath: ''       // 👈 custom domain knapsack.zhou-yufan.com serves from the root
}

export default nextConfig
