// next.config.js
const { execSync } = require("node:child_process");

/** @type {import('next').NextConfig} */
module.exports = (() => {
  const now = new Date().toISOString();

  function safe(cmd: string): string {
    try {
      return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      return "";
    }
  }

  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    safe("git rev-parse HEAD") ||
    "dev";

  const short = sha.slice(0, 7);

  const ref =
    process.env.VERCEL_GIT_COMMIT_REF ||
    safe("git rev-parse --abbrev-ref HEAD") ||
    "";

  return {
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_COMMIT_SHA: sha,
      NEXT_PUBLIC_COMMIT_SHORT: short,
      NEXT_PUBLIC_COMMIT_REF: ref,
      NEXT_PUBLIC_BUILD_TIME: now,
    },
  };
})();
