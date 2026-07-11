/**
 * Swap-flow tiles (Elite Insights v2, V2 Demand Signals). First-party intent from
 * the Sandbox: how many simulated stacks a vendor's products were swapped INTO
 * (pipeline) vs swapped OUT of (churn risk) this window. Renders an honest "early
 * signal" note when volume is below the confidence floor.
 */

export default function SwapFlowTiles({
  swappedIn,
  swappedOut,
  windowLabel,
  earlySignal,
}: {
  swappedIn: number;
  swappedOut: number;
  windowLabel: string;
  /** True when total volume is below the floor — label as early signal, not a trend. */
  earlySignal: boolean;
}) {
  const net = swappedIn - swappedOut;
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Tile value={swappedIn} label="swapped IN" sublabel="pipeline" tone="positive" />
        <Tile value={swappedOut} label="swapped OUT" sublabel="churn risk" tone="negative" />
        <Tile
          value={net}
          display={`${net >= 0 ? "+" : ""}${net}`}
          label="net motion"
          sublabel={windowLabel}
          tone={net >= 0 ? "positive" : "negative"}
        />
      </div>
      {earlySignal ? (
        <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
          Early signal — swap volume is still low; read direction, not magnitude, until more firms model with your
          products.
        </p>
      ) : null}
    </div>
  );
}

function Tile({
  value,
  display,
  label,
  sublabel,
  tone,
}: {
  value: number;
  display?: string;
  label: string;
  sublabel: string;
  tone: "positive" | "negative";
}) {
  const color = tone === "positive" ? "text-[var(--shell-positive)]" : "text-[var(--brand-orange)]";
  return (
    <div className="rounded-[14px] border border-[var(--shell-border)] bg-white/70 p-3 text-center">
      <div className={`text-2xl font-semibold tabular-nums ${value === 0 ? "text-[var(--shell-muted)]" : color}`}>
        {display ?? value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-[var(--shell-ink)]">{label}</div>
      <div className="text-[0.7rem] text-[var(--shell-muted)]">{sublabel}</div>
    </div>
  );
}
