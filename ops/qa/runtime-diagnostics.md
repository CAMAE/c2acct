# /admin/runtime diagnostics on the preview (box 1b item 8)

Preview deployment dpl_HaP8CDkG3a9dWxjPnVj9yVSDs6yn (24829caf), read 2026-09-11 as cameron+admin: "Recent runtime diagnostics" shows ten `vendor_product · ok` — "Vendor product insight snapshot generated." (capture ~/work/preview-proof-6/admin-runtime-1440.png). The ring buffer is in-process and holds the last ten; it reflects whatever the current function instance rendered last.

The `vendor_alignment · warn` entries Cam saw came from the vendor alignment insight page (/vendor/alignment-insights/[key]) rendered during the 9/10 timing runs. Source: lib/vendorAlignmentInsightEngine.ts:668–681 —

    recordPatDiagnostic({ area: "vendor_alignment", level: sampleSize < 5 ? "warn" : "info", status: sampleSize < 5 ? "warn" : "ok",
      summary: "Vendor alignment insight bundle generated.", details: { sampleSize, submissionCount, proReportCount, capabilityAggregateCount, lowSample: sampleSize < 5 } })

Meaning: the vendor's alignment bundle was built from fewer than five firm alignment submissions in its scoped cohort (`sampleSize < 5`). The warn level is the diagnostic's own severity; `lowSample` is written only into the diagnostic payload. No page or component reads `lowSample` (grep app/ lib/: the only reader is the diagnostic writer itself), so the numbers a vendor sees are computed the same way regardless. Thin-sample handling on the vendor surfaces is separate and unchanged: the product insight snapshot's `divergence.belowFloor` / `confidenceBand` (lib/vendorProductInsightEngine.ts) gate the divergence label, and the alignment bundle reports `sampleSize` in its own copy.

Production shows `vendor_product · ok` because its last ten rendered snapshots were product pages; the difference is which pages were opened last, not a code or data difference. Verdict: informational; affects no vendor-visible number.
