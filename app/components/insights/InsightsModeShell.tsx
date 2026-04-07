"use client";

import { useState, type ReactNode } from "react";

export type InsightsModeKey = "pro" | "elite" | "help";

type InsightsModeShellProps = {
  hero: ReactNode;
  proContent: ReactNode;
  eliteContent: ReactNode;
  helpContent: ReactNode;
  defaultMode?: InsightsModeKey;
};

const modeOptions: Array<{ key: InsightsModeKey; label: string }> = [
  { key: "pro", label: "Pro Insights" },
  { key: "elite", label: "Elite Insights" },
  { key: "help", label: "Help" },
];

export default function InsightsModeShell({
  hero,
  proContent,
  eliteContent,
  helpContent,
  defaultMode = "pro",
}: InsightsModeShellProps) {
  const [activeMode, setActiveMode] = useState<InsightsModeKey>(defaultMode);

  const panelContent =
    activeMode === "pro"
      ? proContent
      : activeMode === "elite"
        ? eliteContent
        : helpContent;

  return (
    <div className="space-y-8">
      {hero}

      <section className="pat-card p-4">
        <div className="flex flex-wrap gap-3">
          {modeOptions.map((mode) => {
            const isActive = mode.key === activeMode;
            return (
              <button
                key={mode.key}
                type="button"
                className={isActive ? "pat-button-primary" : "pat-button-secondary"}
                aria-pressed={isActive}
                onClick={() => setActiveMode(mode.key)}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-6" key={activeMode}>
        {panelContent}
      </section>
    </div>
  );
}
