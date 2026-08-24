import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
