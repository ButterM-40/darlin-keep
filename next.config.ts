import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this, Turbopack walks up to C:\Users\megar (which has its own
  // package-lock.json) and treats the home directory as the workspace root.
  turbopack: { root: __dirname },
  // Bundles a minimal server into .next/standalone for the Docker image.
  output: "standalone",
  // The sheet upload is a server action, and those default to a 1 MB body.
  experimental: { serverActions: { bodySizeLimit: "64mb" } },
};

export default nextConfig;
