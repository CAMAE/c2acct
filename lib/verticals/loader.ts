import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { parseYaml } from "@/lib/agents/yaml";
import type { VerticalPack } from "./types";

export const VERTICALS_DIR = "verticals";

const packSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().optional(),
  taxonomy: z.object({
    source: z.enum(["db", "file"]).default("db"),
    filter: z.record(z.string(), z.string()).optional(),
  }),
  workflows: z.array(z.string()).default([]),
  agent_prompts: z.record(z.string(), z.string()).default({}),
  compliance: z.object({
    audit_retention_days: z.number().int().nonnegative(),
    data_residency: z.string().min(1),
  }),
  reference_signals: z.string().optional(),
  eval_set: z.string().optional(),
});

export type VerticalPackManifest = z.infer<typeof packSchema>;

/**
 * Load + validate a Vertical Pack manifest from verticals/<verticalId>/pack.yaml.
 * Throws a clean error if the pack is missing or the manifest is invalid.
 */
export async function loadVerticalPack(verticalId: string, baseDir = VERTICALS_DIR): Promise<VerticalPack> {
  const dir = path.resolve(baseDir, verticalId);
  const file = path.join(dir, "pack.yaml");

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    throw new Error(`Vertical Pack "${verticalId}" not found (expected manifest at ${file}).`);
  }

  const result = packSchema.safeParse(parseYaml(raw));
  if (!result.success) {
    throw new Error(`Invalid Vertical Pack "${verticalId}": ${result.error.message}`);
  }
  if (result.data.id !== verticalId) {
    throw new Error(
      `Vertical Pack id "${result.data.id}" does not match its directory "${verticalId}".`
    );
  }

  return { ...result.data, dir };
}
