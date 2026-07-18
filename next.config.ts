import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the development server to hydrate client components when the app is
  // opened from another device on the office network.
  allowedDevOrigins: ["192.168.2.50"],
};

export default nextConfig;
