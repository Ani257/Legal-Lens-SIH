import type { NextConfig } from "next";

const devDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", ...(devDomain ? [devDomain] : [])]
};

export default nextConfig;