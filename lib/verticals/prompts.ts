import { promises as fs } from "node:fs";
import path from "node:path";
import { loadVerticalPack } from "./loader";

/** Load an agent prompt's markdown for a vertical by its manifest key. */
export async function getPromptForVertical(verticalId: string, key: string): Promise<string> {
  const pack = await loadVerticalPack(verticalId);
  const relative = pack.agent_prompts[key];
  if (!relative) {
    throw new Error(`Vertical Pack "${verticalId}" has no agent prompt "${key}".`);
  }
  return fs.readFile(path.join(pack.dir, relative), "utf8");
}
