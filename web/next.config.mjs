// Static export => deployable to GitHub Pages. No server code, no middleware, no API routes.
// Pages needing an id use query params (/resource?id=...), NOT dynamic [id] folders.
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};
export default nextConfig;
