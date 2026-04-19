import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Required in monorepo: tells Next.js to trace files from workspace root
  // so standalone output has server.js at root, not nested under packages/ui
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

export default nextConfig
