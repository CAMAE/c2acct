import { promises as fs } from "node:fs";
import path from "node:path";
import { VERTICALS_DIR, loadVerticalPack } from "./loader";
import type { VerticalPack } from "./types";

/** List every installed Vertical Pack (each verticals/<id>/ with a valid pack.yaml). */
export async function listVerticalPacks(baseDir = VERTICALS_DIR): Promise<VerticalPack[]> {
  const abs = path.resolve(baseDir);
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }

  const packs: VerticalPack[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      packs.push(await loadVerticalPack(entry.name, baseDir));
    } catch {
      // Not a valid pack dir — skip.
    }
  }
  return packs.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listVerticalIds(baseDir = VERTICALS_DIR): Promise<string[]> {
  return (await listVerticalPacks(baseDir)).map((pack) => pack.id);
}
