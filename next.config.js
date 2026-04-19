/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      /** Legacy URLs and `/favicon.ico` → canonical logo asset. */
      { source: "/favicon.ico", destination: "/intermun-emblem.png" },
      { source: "/icon.png", destination: "/intermun-emblem.png" },
      { source: "/apple-icon.png", destination: "/intermun-emblem.png" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' https://docs.google.com https://drive.google.com https://*.google.com https://accounts.google.com https://*.gstatic.com;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
