/**
 * Minimal YAML loader for Patalign agent configs.
 *
 * This deliberately implements only the block-style subset the agent configs in
 * `agents/*.yaml` use — there is no third-party YAML dependency in the manifest.
 * Every config loaded through here is re-validated by the zod schema in
 * `config.ts`, so a mis-parse surfaces as a loud validation error rather than a
 * silently-wrong config.
 *
 * Supported:
 *   - nested maps by indentation (spaces only)
 *   - scalars: quoted/unquoted strings, integers, floats, booleans, null/~
 *   - block sequences of scalars (`- value`)
 *   - block sequences of maps (`- key: value` with deeper continuation keys)
 *   - inline comments (`#` at line start or after whitespace, outside quotes)
 *   - inline flow arrays (`[a, b, c]`)
 *
 * Not supported (intentionally — none of our configs need them): anchors,
 * aliases, multi-line scalars, flow maps (`{ ... }`), tabs for indentation.
 */

export type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue };

interface Line {
  indent: number;
  text: string;
}

export function parseYaml(source: string): YamlValue {
  const lines = tokenize(source);
  if (lines.length === 0) {
    return {};
  }
  const [value] = parseNode(lines, 0);
  return value;
}

function tokenize(source: string): Line[] {
  const out: Line[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const stripped = stripComment(rawLine);
    if (stripped.trim() === "") {
      continue;
    }
    const indent = stripped.length - stripped.trimStart().length;
    out.push({ indent, text: stripped.trim() });
  }
  return out;
}

function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "#" && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(line[i - 1])) {
        return line.slice(0, i);
      }
    }
  }
  return line;
}

function parseNode(lines: Line[], start: number): [YamlValue, number] {
  if (start >= lines.length) {
    return [null, start];
  }
  if (lines[start].text.startsWith("- ") || lines[start].text === "-") {
    return parseSequence(lines, start, lines[start].indent);
  }
  return parseMap(lines, start, lines[start].indent);
}

function parseMap(lines: Line[], start: number, indent: number): [Record<string, YamlValue>, number] {
  const obj: Record<string, YamlValue> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) {
      break;
    }
    if (line.indent > indent || line.text.startsWith("- ") || line.text === "-") {
      // Misaligned or a sequence item — belongs to a parent/child, not this map.
      break;
    }
    const colon = findKeyColon(line.text);
    if (colon === -1) {
      throw new Error(`Malformed YAML map line (no key separator): "${line.text}"`);
    }
    const key = unquoteKey(line.text.slice(0, colon));
    const rest = line.text.slice(colon + 1).trim();

    if (rest === "") {
      const next = i + 1;
      if (next < lines.length && lines[next].indent > indent) {
        const [value, consumed] = parseNode(lines, next);
        obj[key] = value;
        i = consumed;
      } else {
        obj[key] = null;
        i += 1;
      }
    } else {
      obj[key] = parseScalarOrFlow(rest);
      i += 1;
    }
  }
  return [obj, i];
}

function parseSequence(lines: Line[], start: number, indent: number): [YamlValue[], number] {
  const arr: YamlValue[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.indent < indent) {
      break;
    }
    if (line.indent > indent) {
      break;
    }
    if (!line.text.startsWith("- ") && line.text !== "-") {
      break;
    }

    const itemText = line.text === "-" ? "" : line.text.slice(2).trim();
    const childIndent = indent + 2;

    if (itemText === "" || isMapPair(itemText)) {
      // Block item: a map whose first pair (if any) is inline on the `- ` line
      // and whose remaining pairs are the deeper-indented lines that follow.
      const synthetic: Line[] = [];
      if (itemText !== "") {
        synthetic.push({ indent: childIndent, text: itemText });
      }
      let j = i + 1;
      while (j < lines.length && lines[j].indent > indent) {
        synthetic.push(lines[j]);
        j += 1;
      }
      if (synthetic.length === 0) {
        arr.push(null);
      } else {
        const [value] = parseNode(synthetic, 0);
        arr.push(value);
      }
      i = j;
    } else {
      arr.push(parseScalarOrFlow(itemText));
      i += 1;
    }
  }
  return [arr, i];
}

/** A map pair is any line with a key separator at a position after the start. */
function isMapPair(text: string): boolean {
  return findKeyColon(text) > 0;
}

/**
 * Index of the `key:` colon, or -1.
 *
 * QUOTE-AWARE (previously it was not). The old implementation took
 * `text.indexOf(": ")` — the first colon-space ANYWHERE in the line, including
 * one inside a quoted key or a quoted value. That silently produced garbage
 * rather than failing:
 *
 *     '"a: b": v'   parsed as  { '"a': 'b": v' }     (key split mid-quote)
 *     'msg:"a: b"'  parsed as  { 'msg:"a': 'b"' }    (value split mid-quote)
 *
 * Because every agent config is re-validated by zod afterwards, a mangled key
 * surfaces as a confusing "unrecognized key" error far from its cause — or, for
 * an optional field, as a value that silently goes missing.
 *
 * The separator is now the first colon that is OUTSIDE quotes and followed by
 * whitespace or end-of-line, which is the YAML rule. `msg:"a: b"` (no space
 * after the colon) is correctly not a mapping at all.
 */
function findKeyColon(text: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === ":" && !inSingle && !inDouble) {
      const next = text[i + 1];
      if (next === undefined || /\s/.test(next)) {
        return i;
      }
    }
  }
  return -1;
}

/** Strip one layer of matching quotes from a map key. */
function unquoteKey(raw: string): string {
  const key = raw.trim();
  if (key.length >= 2) {
    const first = key[0];
    const last = key[key.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return key.slice(1, -1);
    }
  }
  return key;
}

function parseScalarOrFlow(raw: string): YamlValue {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner === "") {
      return [];
    }
    return inner.split(",").map((part) => parseScalar(part.trim()));
  }
  return parseScalar(raw);
}

function parseScalar(raw: string): YamlValue {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~" || value === "") return null;
  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  if (/^-?\d*\.\d+$/.test(value)) {
    return Number.parseFloat(value);
  }
  return value;
}

/**
 * Emit the block-style YAML subset this module parses.
 *
 * Exists because `AgentDefinition.configYaml` was being written with
 * `JSON.stringify` — a column named for one format holding another. Anything
 * reading it back as YAML (an operator in /admin, a future config differ, this
 * module's own parser) got a surprise, and the mismatch was invisible until
 * something tried. `stringifyYaml(parseYaml(x))` round-trips, which is the
 * property the storage boundary actually needs.
 */
export function stringifyYaml(value: YamlValue): string {
  const lines: string[] = [];
  emitNode(value, 0, lines);
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function emitNode(value: YamlValue, indent: number, out: string[]): void {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      // An empty sequence has no block form in this subset; use flow.
      out.push(`${pad}[]`);
      return;
    }
    for (const item of value) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const entries = Object.entries(item);
        if (entries.length === 0) {
          out.push(`${pad}- {}`);
          continue;
        }
        // First pair inline on the dash, the rest indented beneath it.
        const [firstKey, firstValue] = entries[0];
        emitPair(firstKey, firstValue, indent + 2, out, `${pad}- `);
        for (const [key, entry] of entries.slice(1)) {
          emitPair(key, entry, indent + 2, out);
        }
      } else {
        out.push(`${pad}- ${formatScalar(item)}`);
      }
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      emitPair(key, entry, indent, out);
    }
    return;
  }

  out.push(`${pad}${formatScalar(value)}`);
}

function emitPair(
  key: string,
  value: YamlValue,
  indent: number,
  out: string[],
  prefixOverride?: string
): void {
  const prefix = prefixOverride ?? " ".repeat(indent);
  const label = `${formatKey(key)}:`;

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push(`${prefix}${label} []`);
      return;
    }
    out.push(`${prefix}${label}`);
    // Sequences sit at the parent's own indent (the parser reads `- ` items at
    // indent > parent, and parseSequence anchors on the dash's own column).
    emitNode(value, indent + 2, out);
    return;
  }

  if (value !== null && typeof value === "object") {
    if (Object.keys(value).length === 0) {
      out.push(`${prefix}${label} {}`);
      return;
    }
    out.push(`${prefix}${label}`);
    emitNode(value, indent + 2, out);
    return;
  }

  out.push(`${prefix}${label} ${formatScalar(value)}`);
}

function formatKey(key: string): string {
  // Quote a key that would otherwise confuse the separator scan.
  return /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(key) ? key : JSON.stringify(key);
}

/** Quote whenever an unquoted form would parse back as something else. */
function formatScalar(value: YamlValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);

  const text = String(value);
  const needsQuotes =
    text === "" ||
    text !== text.trim() ||
    /^(true|false|null|~)$/.test(text) ||
    /^-?\d+$/.test(text) ||
    /^-?\d*\.\d+$/.test(text) ||
    /^[-[\]{}"'#&*!|>%@`]/.test(text) ||
    text.includes(": ") ||
    text.endsWith(":") ||
    text.includes(" #") ||
    text.includes("\n");
  return needsQuotes ? JSON.stringify(text) : text;
}
