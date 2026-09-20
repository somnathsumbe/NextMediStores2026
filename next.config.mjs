/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";

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
