/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  trailingSlash: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb"
    }
  }
};

export default nextConfig;
