import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Server Actions (the /sign-in "Continue with provisioned account" pilot-credentials
  // form, /admin operator actions, etc.) enforce an Origin === Host check in
  // production. Behind the Cloudflare proxy / while AUTH_URL is split between the
  // vercel.app deploy host and patalign.com, the forwarded Origin can differ from the
  // computed host, so Next silently rejects the POST and the submit button "does
  // nothing." Whitelisting every origin the app is served from lets the SA POST through
  // regardless of which host the browser used. (Phase 2.5 backlog: prod SA sign-in bug.)
  experimental: {
    serverActions: {
      allowedOrigins: [
        "pat-c2acct-live.vercel.app",
        "patalign.com",
        "www.patalign.com",
        "localhost:3000",
        "localhost:3009",
      ],
    },
  },
  // The /admin agent console + /api/agents routes read agents/*.yaml from disk at
  // runtime (lib/agents/adminConsole → loadAgentConfigs), and the Vertical Pack
  // layer reads verticals/. Next's file tracing does not follow runtime fs reads,
  // so these data dirs must be bundled into the serverless functions explicitly —
  // otherwise /admin 500s in production with ENOENT.
  outputFileTracingIncludes: {
    "/admin": ["./agents/**", "./verticals/**"],
    "/admin/agents": ["./agents/**", "./verticals/**"],
    "/admin/agents/[agentKey]": ["./agents/**", "./verticals/**"],
    "/admin/approvals": ["./agents/**", "./verticals/**"],
    "/admin/audit": ["./agents/**", "./verticals/**"],
    "/admin/runs": ["./agents/**", "./verticals/**"],
    "/api/agents": ["./agents/**", "./verticals/**"],
    "/api/agents/[agentKey]": ["./agents/**", "./verticals/**"],
  },
};

export default nextConfig;
