/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
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
