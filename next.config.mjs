/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // NOTE: this hides type errors during `next build`. Keep running
    // `npx tsc --noEmit` before deploying — otherwise a real type error ships
    // silently and only shows up at runtime.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  /**
   * Dev-only. Next blocks its own /_next/* chunks from unfamiliar hosts, so
   * over the Tailscale URL the HTML rendered but no JavaScript loaded — which
   * is why pages appeared fine while every button did nothing.
   *
   * Only affects `next dev`; production builds ignore it entirely.
   */
  allowedDevOrigins: ["insanity.tail967d38.ts.net"],
}

export default nextConfig
