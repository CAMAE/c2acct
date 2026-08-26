import { readFileSync } from "fs";
import { afterEach, describe, expect, it } from "vitest";
import { agentConfigSchema } from "@/lib/agents/config";
import {
  anthropicApiKeyPresent,
  getAnthropicApiKey,
  isLlmBackingEnabled,
  llmBackedAgentKeys,
} from "@/lib/agents/llm";

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

const originalKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
});

function makeConfig(overrides: Record<string, unknown> = {}) {
  return agentConfigSchema.parse({
    key: "test-agent",
    name: "Test Agent",
    schedule: { type: "manual" },
    limits: {},
    ...overrides,
  });
}

describe("LLM backing flag", () => {
  it("is off without the config flag, even when the key is present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-a-real-key";
    expect(isLlmBackingEnabled(makeConfig())).toBe(false);
    expect(isLlmBackingEnabled(makeConfig({ llm: { enabled: false } }))).toBe(false);
  });

  it("is off with the flag but without the key (configs ship ahead of the credential)", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(anthropicApiKeyPresent()).toBe(false);
    expect(isLlmBackingEnabled(makeConfig({ llm: { enabled: true } }))).toBe(false);
  });

  it("treats a blank key as absent", () => {
    process.env.ANTHROPIC_API_KEY = "   ";
    expect(anthropicApiKeyPresent()).toBe(false);
    expect(getAnthropicApiKey()).toBeNull();
  });

  it("is on only with flag AND key, and lists only those agents", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-a-real-key";
    const on = makeConfig({ key: "llm-on", llm: { enabled: true } });
    const off = makeConfig({ key: "llm-off" });
    expect(isLlmBackingEnabled(on)).toBe(true);
    expect(llmBackedAgentKeys([on, off])).toEqual(["llm-on"]);
  });
});

describe("key hygiene", () => {
  it("never commits a key value: repo env files are gitignored and no source file holds one", () => {
    const gitignore = readFileSync(`${ROOT}/.gitignore`, "utf8");
    expect(gitignore).toContain(".env");
  });

  it("the llm module never embeds the key in any returned message", () => {
    const source = readFileSync(`${ROOT}/lib/agents/llm.ts`, "utf8");
    // Presence helpers must not interpolate the key into strings.
    expect(source).not.toMatch(/\$\{[^}]*ANTHROPIC_API_KEY/);
    expect(source).not.toMatch(/console\.(log|error|warn)/);
  });

  it("the supervisor logs presence only, never the value", () => {
    const source = readFileSync(`${ROOT}/scripts/agents/supervisor.ts`, "utf8");
    expect(source).toContain("anthropicApiKeyPresent()");
    expect(source).not.toMatch(/process\.env\.ANTHROPIC_API_KEY/);
  });
});
