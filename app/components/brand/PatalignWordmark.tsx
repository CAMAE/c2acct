/**
 * "PATALIGN" wordmark drawn in the typographic style of the PAT logo
 * (public/PAT.png): heavy geometric bars, small rounded corners, large 45°
 * chamfers, and stencil gaps where strokes deliberately stay detached.
 *
 * Letterforms are composed from axis-aligned bars rendered by `bar()` — a
 * rounded-rect path generator with optional per-corner 45° cuts — plus one
 * parallelogram for the N diagonal. Header experiment only (see
 * lib/brand/wordmark.ts); hero lockups keep the official PAT mark.
 */

type CornerTreatment = number | undefined; // 45° cut size; rounded radius when undefined

type BarCorners = {
  tl?: CornerTreatment;
  tr?: CornerTreatment;
  br?: CornerTreatment;
  bl?: CornerTreatment;
};

const CORNER_RADIUS = 12;

function bar(x: number, y: number, w: number, h: number, corners: BarCorners = {}): string {
  const r = CORNER_RADIUS;
  const tl = corners.tl;
  const tr = corners.tr;
  const br = corners.br;
  const bl = corners.bl;
  const parts: string[] = [];

  parts.push(`M ${x + (tl ?? r)} ${y}`);
  parts.push(`L ${x + w - (tr ?? r)} ${y}`);
  parts.push(tr !== undefined ? `L ${x + w} ${y + tr}` : `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`);
  parts.push(`L ${x + w} ${y + h - (br ?? r)}`);
  parts.push(br !== undefined ? `L ${x + w - br} ${y + h}` : `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`);
  parts.push(`L ${x + (bl ?? r)} ${y + h}`);
  parts.push(bl !== undefined ? `L ${x} ${y + h - bl}` : `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`);
  parts.push(`L ${x} ${y + (tl ?? r)}`);
  parts.push(tl !== undefined ? `Z` : `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`);

  return parts.join(" ");
}

/** 45° parallelogram band (the N diagonal), slightly inset so it reads stencil-detached. */
function diagonal(x1: number, x2: number, width: number, height: number): string {
  return `M ${x1} 0 L ${x1 + width} 0 L ${x2 + width} ${height} L ${x2} ${height} Z`;
}

const H = 200; // cap height
const W = 48; // bar weight
const CUT = 56; // signature large chamfer

type LetterSpec = { width: number; paths: string[] };

const LETTERS: LetterSpec[] = [
  // P — chamfered stem + bowl; bowl bottom stays a detached stencil piece
  {
    width: 132,
    paths: [
      bar(0, 0, W, H, { tl: CUT }),
      bar(0, 0, 132, W, { tl: CUT }),
      bar(132 - W, 0, W, 118),
      bar(62, 112, 70, 44, { bl: 28 }),
    ],
  },
  // A — arch with a long top chamfer and a detached low crossbar
  {
    width: 140,
    paths: [
      bar(0, 0, W, H, { tl: CUT }),
      bar(0, 0, 140, W, { tl: 84 }),
      bar(140 - W, 0, W, H),
      bar(0, 118, 76, 44, { bl: 28 }),
    ],
  },
  // T — split top bar with a 45° stencil slash; stem fused to the right piece
  {
    width: 140,
    paths: [
      bar(0, 0, 58, W, { br: 34 }),
      bar(74, 0, 66, W),
      bar(46, 16, W, H - 16, { tl: 34 }),
    ],
  },
  // A
  {
    width: 140,
    paths: [
      bar(0, 0, W, H, { tl: CUT }),
      bar(0, 0, 140, W, { tl: 84 }),
      bar(140 - W, 0, W, H),
      bar(0, 118, 76, 44, { bl: 28 }),
    ],
  },
  // L
  {
    width: 112,
    paths: [bar(0, 0, W, H, { tl: CUT }), bar(0, H - W, 112, W, { br: 28 })],
  },
  // I — stem with a stencil split near the top
  {
    width: W,
    paths: [bar(0, 0, W, 46, { tl: 30 }), bar(0, 62, W, H - 62)],
  },
  // G — C frame with a detached inner crossbar feeding the lower right stem
  {
    width: 150,
    paths: [
      bar(0, 0, 150, W, { tl: CUT, tr: 34 }),
      bar(0, 0, W, H, { tl: CUT }),
      bar(0, H - W, 150, W, { br: 28 }),
      bar(150 - W, 104, W, 96),
      bar(70, 104, 64, 44, { bl: 24 }),
    ],
  },
  // N — two stems bridged by the diagonal band
  {
    width: 150,
    paths: [
      bar(0, 0, W, H, { tl: CUT }),
      bar(150 - W, 0, W, H),
      diagonal(14, 150 - W - 14, 54, H),
    ],
  },
];

const LETTER_GAP = 34;

const TOTAL_WIDTH = LETTERS.reduce((sum, letter) => sum + letter.width, 0) + LETTER_GAP * (LETTERS.length - 1);

let cursor = 0;
const PLACED: Array<{ offset: number; paths: string[] }> = LETTERS.map((letter) => {
  const placed = { offset: cursor, paths: letter.paths };
  cursor += letter.width + LETTER_GAP;
  return placed;
});

export default function PatalignWordmark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${TOTAL_WIDTH} ${H}`}
      role="img"
      aria-label="Patalign logo"
      className={`shrink-0 ${className}`.trim()}
      fill="#515254"
    >
      {PLACED.map((letter, index) => (
        <g key={index} transform={`translate(${letter.offset} 0)`}>
          {letter.paths.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ))}
    </svg>
  );
}
