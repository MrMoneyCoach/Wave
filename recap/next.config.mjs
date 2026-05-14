import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The Recap web app lives in recap/ inside a larger multi-project repo
    // (Alfred at the root, plus sibling apps and recap/desktop + recap/mobile).
    // Without pinning the tracing root, Next.js infers the monorepo root and
    // walks the entire repository during "Collecting build traces", which
    // exhausts memory on Vercel's build machine and kills the build with no
    // error line. Pin tracing to this folder.
    outputFileTracingRoot: __dirname,
    serverActions: { bodySizeLimit: "200mb" },
  },
};

export default nextConfig;
