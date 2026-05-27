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
    const key = line.text.slice(0, colon).trim();
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

/** A map pair starts with a bare key immediately followed by `:` then space/end. */
function isMapPair(text: string): boolean {
  return /^[^\s:'"][^:]*:(\s|$)/.test(text);
}

/** Index of the `key:` colon, or -1. Splits on the first `: ` or a trailing `:`. */
function findKeyColon(text: string): number {
  const spaced = text.indexOf(": ");
  if (spaced !== -1) {
    return spaced;
  }
  if (text.endsWith(":")) {
    return text.length - 1;
  }
  return -1;
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
