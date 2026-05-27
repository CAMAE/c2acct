"use client";

import { useEffect, useRef, useState } from "react";

interface AuditEvent {
  id: string;
  agentKey: string | null;
  hookPhase: string;
  outcome: string | null;
  createdAt: string;
}

const MAX_ROWS = 100;

/**
 * Live action stream via SSE (/api/agents/[key]/stream, Neon-polled every 2s).
 * Use agentKey="_all" for the cross-agent feed. Newest rows on top.
 */
export default function LiveActionStream({ agentKey, height = 320 }: { agentKey: string; height?: number }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const source = new EventSource(`/api/agents/${agentKey}/stream`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const row = JSON.parse(event.data) as AuditEvent;
        if (seen.current.has(row.id)) return;
        seen.current.add(row.id);
        setEvents((prev) => [row, ...prev].slice(0, MAX_ROWS));
      } catch {
        // ignore keep-alive / malformed frames
      }
    };
    return () => source.close();
  }, [agentKey]);

  return (
    <div className="rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--shell-ink)]">Live action stream</div>
        <span className="inline-flex items-center gap-2 text-xs text-[var(--shell-muted)]">
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`} />
          {connected ? "live" : "connecting…"}
        </span>
      </div>
      <div className="overflow-auto font-mono text-xs leading-6" style={{ maxHeight: height }}>
        {events.length === 0 ? (
          <div className="text-[var(--shell-muted)]">Waiting for events…</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex gap-3 border-b border-[var(--shell-border)]/40 py-1">
              <span className="text-[var(--shell-muted)]">{new Date(event.createdAt).toLocaleTimeString()}</span>
              {event.agentKey ? <span className="text-[var(--shell-ink)]">{event.agentKey}</span> : null}
              <span className="text-[var(--shell-ink)]">{event.hookPhase}</span>
              {event.outcome ? <span className="text-[var(--shell-muted)]">[{event.outcome}]</span> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
