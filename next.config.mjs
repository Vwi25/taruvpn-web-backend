/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workaround for Next.js 14 + webpack PackFileCacheStrategy bug:
  // persistent filesystem cache references chunks (e.g. ./948.js) that get
  // invalidated when files change, causing "Cannot find module" 500 errors
  // mid-dev. Disabling persistent cache in dev fixes this at cost of
  // slightly slower hot reload (each rebuild is full vs incremental).
  // Production build cache untouched.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    // Silence "Serializing big strings (101kiB/231kiB)" infrastructure warnings
    // — informational only, not an error.
    config.infrastructureLogging = { level: 'error' }
    return config
  },
}

export default nextConfig
