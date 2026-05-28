import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
