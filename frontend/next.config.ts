import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Required for HeadTTS: WASM/WebGPU workers need SharedArrayBuffer,
  // which is only available in cross-origin isolated contexts.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // credentialless allows cross-origin fetches (e.g. HuggingFace model download)
          // without requiring CORP headers on every resource
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Prevent browser from caching patched worker files across rebuilds
        source: "/headtts/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },

  webpack: (config) => {
    // Transform talkinghead module: fix webpack-incompatible dynamic imports
    // and tune viseme intensities (replaces the removed patch-package patch).
    config.module.rules.push({
      test: /talkinghead\.mjs$/,
      include: /node_modules[\\/]@met4citizen[\\/]talkinghead/,
      use: [path.resolve("./scripts/talkinghead-loader.cjs")],
      enforce: "pre",
    });

    // onnxruntime-node is server-only; exclude from client bundle
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };

    return config;
  },
};

export default nextConfig;
