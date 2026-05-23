/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is default in Next 16 (both dev + build).
  // No webpack workaround needed — webpack chunk-orphan bugs no longer apply.
  turbopack: {},
}

export default nextConfig
