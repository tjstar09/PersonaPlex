import type { NextConfig } from "next";

// GitHub Pages serves project sites from a subpath (/{repo}/) and needs a
// fully static export; both are enabled only when EXPORT_BUILD=1 is set by
// the deploy workflow, so `next dev`/`next start` stay unaffected.
const isPagesExport = process.env.EXPORT_BUILD === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(isPagesExport
    ? {
        output: "export",
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
