import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    const firebaseAuthOrigin = "https://casaemharmonia-4df2d.firebaseapp.com";
    return {
      beforeFiles: [
        { source: "/__/auth/:path*", destination: `${firebaseAuthOrigin}/__/auth/:path*` },
        { source: "/__/firebase/:path*", destination: `${firebaseAuthOrigin}/__/firebase/:path*` },
      ],
    };
  },
};

export default nextConfig;
