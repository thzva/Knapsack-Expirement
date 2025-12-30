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
  // Only use static export for production builds, not for dev server
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',                // 👈 important: tells Next to generate static HTML
    basePath: '/Knapsack-Expirement' // 👈 matches your GitHub repo name
  })
}

export default nextConfig
