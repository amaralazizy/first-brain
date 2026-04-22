import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@first-brain/db', '@first-brain/config', '@first-brain/validation'],
};

export default nextConfig;
