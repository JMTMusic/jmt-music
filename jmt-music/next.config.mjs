/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  trailingSlash: true,
  async redirects() {
    return [
      // Old catalogue/track pages -> new Sound page.
      { source: "/beats", destination: "/sound", permanent: true },
      { source: "/beats/:path*", destination: "/sound", permanent: true },
      { source: "/projects/:path*", destination: "/sound", permanent: true },
      // Old contact / start-a-project entry points -> new Inquiries page.
      { source: "/contact", destination: "/inquiries", permanent: true },
      // Retired public marketing pages -> Home.
      { source: "/about", destination: "/", permanent: true },
      { source: "/services", destination: "/", permanent: true },
      { source: "/sync", destination: "/", permanent: true },
      { source: "/portfolio", destination: "/", permanent: true },
      { source: "/thank-you", destination: "/", permanent: true }
    ];
  }
};

export default nextConfig;
