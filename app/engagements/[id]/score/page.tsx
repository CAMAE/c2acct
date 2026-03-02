"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type ScoreInput = {
  revenueVolatility: number;
  clientResponsiveness: number;
  techStackFragmentation: number;
  scopeCreep: number;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Keep these in sync with the API logic (route.ts)
function computeRiskScore(input: ScoreInput) {
  return 0.5 * input.revenueVolatility + 0.3 * input.scopeCreep + 0.2 * input.techStackFragmentation;
}
function computeStabilityScore(input: ScoreInput) {
  return input.clientResponsiveness;
}
function computeComplexityScore(input: ScoreInput) {
  return 0.8 * input.techStackFragmentation + 0.2 * input.scopeCreep;
}
function computeDriftScore(input: ScoreInput) {
  return 0.5 * input.techStackFragmentation + 0.5 * input.scopeCreep;
}

export default function EngagementScorePage() {
  const params = useParams<{ id: string }>();
  const engagementId = (params?.id ?? "").toString();

  const [input, setInput] = useState<ScoreInput>({
    revenueVolatility: 0.2,
    clientResponsiveness: 0.8,
    techStackFragmentation: 0.4,
    scopeCreep: 0.3,
  });

  const preview = useMemo(() => {
    const normalized: ScoreInput = {
      revenueVolatility: clamp01(input.revenueVolatility),
      clientResponsiveness: clamp01(input.clientResponsiveness),
      techStackFragmentation: clamp01(input.techStackFragmentation),
      scopeCreep: clamp01(input.scopeCreep),
    };

    return {
      riskScore: clamp01(computeRiskScore(normalized)),
      stabilityScore: clamp01(computeStabilityScore(normalized)),
      complexityScore: clamp01(computeComplexityScore(normalized)),
      driftScore: clamp01(computeDriftScore(normalized)),
    };
  }, [input]);

  const [apiResponse, setApiResponse] = useState<unknown>(null);
  const [statusLine, setStatusLine] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  async function callApi(method: "GET" | "POST") {
    if (!engagementId) {
      setStatusLine("Missing engagement id in URL");
      return;
    }

    setBusy(true);
    setStatusLine("");

    try {
      const url = `/api/engagements/${engagementId}/score`;

      const res =
        method === "GET"
          ? await fetch(url, { method: "GET" })
          : await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                revenueVolatility: clamp01(input.revenueVolatility),
                clientResponsiveness: clamp01(input.clientResponsiveness),
                techStackFragmentation: clamp01(input.techStackFragmentation),
                scopeCreep: clamp01(input.scopeCreep),
              }),
            });

      let data: unknown = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { success: false, error: "Non-JSON response", raw: text };
      }

      setApiResponse(data);

      if (res.ok) {
        setStatusLine(`${method} OK (${res.status})`);
        // If GET returned a profile, hydrate sliders to DB values when available
        const p = data?.profile;
        const inp = p?.inputs ?? null;
        if (method === "GET" && inp) {
          setInput({
            revenueVolatility: clamp01(inp.revenueVolatility),
            clientResponsiveness: clamp01(inp.clientResponsiveness),
            techStackFragmentation: clamp01(inp.techStackFragmentation),
            scopeCreep: clamp01(inp.scopeCreep),
          });
        }
      } else {
        setStatusLine(`HTTP ${res.status} — ${data?.error ?? "Request failed"}`);
      }
    } catch (err: unknown) {
      setApiResponse({ success: false, error: "Request threw", detail: String(err?.message ?? err) });
      setStatusLine(`Request threw: ${String(err?.message ?? err)}`);
    } finally {
      setBusy(false);
    }
  }

  // Load from DB on first paint
  useEffect(() => {
    if (!engagementId) return;
    void callApi("GET");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  const styles: Record<string, React.CSSProperties> = {
    page: { maxWidth: 900, margin: "40px auto", padding: "0 16px" },
    titleRow: { marginBottom: 12 },
    h1: { margin: 0, fontSize: 22 },
    sub: { fontFamily: "monospace", opacity: 0.7, marginTop: 6 },

    card: {
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 14,
      padding: 16,
      background: "rgba(255,255,255,0.75)",
      backdropFilter: "blur(6px)",
    },

    metricRow: { display: "grid", gridTemplateColumns: "220px 1fr 60px", gap: 12, alignItems: "center", marginTop: 14 },
    label: { fontSize: 14, fontWeight: 600 },
    value: { fontFamily: "monospace", textAlign: "right" },

    btnRow: { display: "flex", gap: 12, marginTop: 18 },
    btn: {
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid rgba(0,0,0,0.2)",
      cursor: "pointer",
      background: "white",
      fontWeight: 600,
    },
    btnPrimary: {
      background: "black",
      color: "white",
      border: "1px solid rgba(0,0,0,0.2)",
    },

    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 },
    kpi: {
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 12,
      padding: 14,
      background: "rgba(255,255,255,0.6)",
    },
    kpiLabel: { fontSize: 13, opacity: 0.7 },
    kpiValue: { fontFamily: "monospace", fontSize: 22, marginTop: 6 },

    apiBox: {
      marginTop: 18,
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 12,
      padding: 14,
      background: "rgba(255,255,255,0.6)",
      overflow: "hidden",
    },
    pre: {
      marginTop: 10,
      padding: 12,
      borderRadius: 10,
      background: "rgba(0,0,0,0.06)",
      overflowX: "auto",
      whiteSpace: "pre",
    },

    status: { marginTop: 10, fontFamily: "monospace", opacity: 0.8 },
    error: { marginTop: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(255,0,0,0.25)", background: "rgba(255,0,0,0.06)" },
  };

  function SliderRow(props: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <div style={styles.metricRow}>
        <div style={styles.label}>{props.label}</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value))}
          disabled={busy}
          style={{ width: "100%" }}
        />
        <div style={styles.value}>{props.value.toFixed(2)}</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.titleRow}>
        <h1 style={styles.h1}>Engagement Score</h1>
        <div style={styles.sub}>{engagementId || "(no id in URL)"}</div>
      </div>

      <div style={styles.card}>
        <SliderRow
          label="Revenue Volatility"
          value={input.revenueVolatility}
          onChange={(v) => setInput((s) => ({ ...s, revenueVolatility: v }))}
        />
        <SliderRow
          label="Client Responsiveness"
          value={input.clientResponsiveness}
          onChange={(v) => setInput((s) => ({ ...s, clientResponsiveness: v }))}
        />
        <SliderRow
          label="Tech Stack Fragmentation"
          value={input.techStackFragmentation}
          onChange={(v) => setInput((s) => ({ ...s, techStackFragmentation: v }))}
        />
        <SliderRow
          label="Scope Creep"
          value={input.scopeCreep}
          onChange={(v) => setInput((s) => ({ ...s, scopeCreep: v }))}
        />

        <div style={styles.btnRow}>
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: busy ? 0.7 : 1 }}
            onClick={() => void callApi("POST")}
            disabled={busy || !engagementId}
          >
            Save score
          </button>

          <button
            type="button"
            style={{ ...styles.btn, opacity: busy ? 0.7 : 1 }}
            onClick={() => void callApi("GET")}
            disabled={busy || !engagementId}
          >
            Reload from DB
          </button>
        </div>

        <div style={styles.grid2}>
          <div style={styles.kpi}>
            <div style={styles.kpiLabel}>Preview riskScore</div>
            <div style={styles.kpiValue}>{preview.riskScore.toFixed(3)}</div>
          </div>
          <div style={styles.kpi}>
            <div style={styles.kpiLabel}>Preview stabilityScore</div>
            <div style={styles.kpiValue}>{preview.stabilityScore.toFixed(3)}</div>
          </div>
          <div style={styles.kpi}>
            <div style={styles.kpiLabel}>Preview complexityScore</div>
            <div style={styles.kpiValue}>{preview.complexityScore.toFixed(3)}</div>
          </div>
          <div style={styles.kpi}>
            <div style={styles.kpiLabel}>Preview driftScore</div>
            <div style={styles.kpiValue}>{preview.driftScore.toFixed(3)}</div>
          </div>
        </div>

        <div style={styles.apiBox}>
          <div style={{ fontWeight: 700 }}>API response</div>

          {statusLine ? <div style={styles.status}>{statusLine}</div> : null}

          <pre style={styles.pre}>{JSON.stringify(apiResponse, null, 2)}</pre>

          {apiResponse?.success === false ? (
            <div style={styles.error}>
              {apiResponse?.error ? <div style={{ fontWeight: 700 }}>{String(apiResponse.error)}</div> : null}
              {apiResponse?.detail ? <div style={{ marginTop: 6, fontFamily: "monospace" }}>{String(apiResponse.detail)}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

