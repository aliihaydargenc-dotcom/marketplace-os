import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@neondatabase/serverless",
    "ws",
    "https-proxy-agent",
  ],
  poweredByHeader: false,
  allowedDevOrigins: ["terminal.local"],
};
export default config;
