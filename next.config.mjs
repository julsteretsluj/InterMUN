import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Per-deployment id for the stale-tab check (`/api/version`). Must be deterministic:
 * every build worker evaluates this file, and client + route must inline the same value.
 */
const appBuildId =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
  transpilePackages: ["@splinetool/react-spline", "@splinetool/runtime"],
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

export default withNextIntl(nextConfig);
