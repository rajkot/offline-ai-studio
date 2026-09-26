import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_BASE_PATH || "",
  output: process.env.NEXT_OUTPUT === "export" ? "export" : "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
