import path from "node:path";
import { describe, expect, it } from "vitest";
import { isToolAllowed, loadAgentConfig } from "@/lib/agents/config";

// Verifies the deny-by-default allowlist (the predicate canUseTool enforces) for
// the Cloudflare watcher's allowlist_strict posture: only dig / cloudflare.read /
// telegram.send_message are permitted; everything else is rejected.
describe("cloudflare-watcher allowlist_strict", () => {
  const configPromise = loadAgentConfig(
    path.resolve("agents/cloudflare-watcher.yaml")
  );

  it("allows the three declared dig commands", async () => {
    const config = await configPromise;
    expect(isToolAllowed(config, "shell.exec", { command: "dig +short NS patalign.com" })).toBe(true);
    expect(isToolAllowed(config, "shell.exec", { command: "dig +short A patalign.com" })).toBe(true);
    expect(isToolAllowed(config, "shell.exec", { command: "dig +short A www.patalign.com" })).toBe(true);
  });

  it("allows cloudflare.read and telegram.send_message", async () => {
    const config = await configPromise;
    expect(isToolAllowed(config, "cloudflare.read", { zone: "patalign.com" })).toBe(true);
    expect(isToolAllowed(config, "telegram.send_message", {})).toBe(true);
  });

  it("blocks any shell command outside the allowlist", async () => {
    const config = await configPromise;
    expect(isToolAllowed(config, "shell.exec", { command: "rm -rf /" })).toBe(false);
    expect(isToolAllowed(config, "shell.exec", { command: "dig +short ANY evil.example" })).toBe(false);
    expect(isToolAllowed(config, "shell.exec", { command: "curl https://evil.example" })).toBe(false);
  });

  it("blocks write/non-read actions and undeclared servers", async () => {
    const config = await configPromise;
    expect(isToolAllowed(config, "cloudflare.write", { zone: "patalign.com" })).toBe(false);
    expect(isToolAllowed(config, "cloudflare.purge_cache", {})).toBe(false);
    expect(isToolAllowed(config, "telegram.delete_message", {})).toBe(false);
    expect(isToolAllowed(config, "neon.read", { table: "User" })).toBe(false);
    expect(isToolAllowed(config, "http_fetch.get", { method: "GET", url: "https://example.com" })).toBe(false);
  });
});
