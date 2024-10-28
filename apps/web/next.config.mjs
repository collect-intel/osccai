/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    //https://github.com/aws/aws-sdk-js-v3/issues/5540
    serverComponentsExternalPackages: ["@aws-sdk"],
  },
};

export default nextConfig;
