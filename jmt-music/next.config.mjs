/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  trailingSlash: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/portal/", destination: "/portal/index.html" }
      ]
    };
  }
};

export default nextConfig;
