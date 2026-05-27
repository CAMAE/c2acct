import type { Finding } from "./types";

/** Render a drift finding set into a Telegram-friendly alert message. */
export function formatAlertMessage(findings: Finding[]): string {
  const header = `🚨 PAT QA drift — ${findings.length} finding(s) on production`;
  const lines = findings.map((finding) => `• [${finding.route}] ${finding.code}: ${finding.detail}`);
  return [header, ...lines].join("\n");
}
