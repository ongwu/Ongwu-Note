/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化构建性能
  typescript: {
    // 在构建时忽略类型错误（仅用于部署）
    ignoreBuildErrors: false,
  },
  eslint: {
    // 在构建时忽略 ESLint 错误
    ignoreDuringBuilds: false,
  },
  // 减少构建时间
  experimental: {
    // 启用 SWC 编译器（更快）
    swcMinify: true,
  },
  // 优化输出
  output: 'standalone',
}

module.exports = nextConfig