import type { NextConfig } from "next";

// Security headers (2026-07-09 governance audit B3). CSP ships REPORT-ONLY first
// so we can observe violations before enforcing (staged rollout); HSTS +
// frame-ancestors are enforced immediately. Kept in next.config so the policy
// travels with the app on any host, not just vercel.json.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts; 'unsafe-inline' stays until a nonce
  // pass is added. Report-only means this observes, does not block.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // frame-ancestors (in CSP above) is the modern control; X-Frame-Options is the
  // legacy fallback for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // B8-4: /consultant (singular) is a common mistype of the canonical
  // /consultants portal — 301 it (and any deeper path) to the plural.
  async redirects() {
    return [
      { source: "/consultant", destination: "/consultants", permanent: true },
      { source: "/consultant/:path*", destination: "/consultants/:path*", permanent: true },
      // "Sales Card" → "BattleCard" rename: keep deep links to the old route alive.
      { source: "/vendor/sales-card", destination: "/vendor/battlecard", permanent: true },
      { source: "/vendor/sales-card/:path*", destination: "/vendor/battlecard/:path*", permanent: true },
    ];
  },
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
