import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set project root to suppress multi-lockfile workspace warning.
    // The parent directory (C:\Users\Warri) has its own package-lock.json which
    // confuses Turbopack's automatic root detection.
    root: path.resolve(__dirname),
  },
  // Keep @react-pdf/renderer and its sub-packages out of the Next.js bundle
  // so they are loaded directly by Node.js at runtime (ESM-only packages).
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/layout",
    "@react-pdf/render",
    "@react-pdf/font",
    "@react-pdf/pdfkit",
    "@react-pdf/fns",
    "@react-pdf/primitives",
    "@react-pdf/reconciler",
    "@react-pdf/types",
  ],
  experimental: {
    // Allow file uploads up to 50 MB through Server Actions.
    // Renamed from serverActions.bodySizeLimit in Next.js 16.
    proxyClientMaxBodySize: "52mb",
  },
};

export default nextConfig;
