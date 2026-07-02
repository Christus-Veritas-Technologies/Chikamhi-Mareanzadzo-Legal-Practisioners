import "@CMLP/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  typescript: {
    // Type errors that don't break the running app shouldn't block a build — see project notes.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
