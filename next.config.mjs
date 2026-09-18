/** @type {import('next').NextConfig} */
const isGithubPages = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "export",
  trailingSlash: true,
  basePath: isGithubPages ? "/NextMediStores2026" : "",
  assetPrefix: isGithubPages ? "/NextMediStores2026/" : "",
  images: { unoptimized: true },
};

export default nextConfig;
