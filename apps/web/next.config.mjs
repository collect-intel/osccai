/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@aws-sdk", "bcrypt"],
  },
};

export default nextConfig;
