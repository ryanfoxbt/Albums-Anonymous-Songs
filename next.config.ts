import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Admin song uploads (audio + cover image) go through a Server
      // Action; the default 1MB body limit is far too small for an MP3.
      bodySizeLimit: "25mb",
    },
  },
  async redirects() {
    return [
      {
        // The podcast platform picker is now the home page. Keep old
        // /watch links (and any external inbound links) working.
        source: "/watch",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
