# Final Deferred Items

Accessed: 2026-03-16

## Deferred by choice

- Branding refresh beyond functional clarity
- Tier 2 intelligence expansion beyond the current truthful chart/gating layer
- Broader LMS features beyond the current minimal learning runtime
- Full intervention workflow depth in the admin exceptions queue

## Deferred by dependency

- DB-level closure of finalized external-review uniqueness
  - depends on deduplicating conflicting finalized rows and resolving Prisma migration `20260316160000_external_review_finalized_uniqueness`
- Mac mini host execution proof
  - depends on running the packaged scripts on a real macOS host
- Audit/export packet artifact proof
  - depends on a host session that can execute `bash` or create bundle directories via PowerShell in the repo workspace

## Recommended next

- Resolve the failed migration and rerun DB integrity checks.
- Execute Mac mini scripts and launchd assets on macOS and capture heartbeat/status artifacts.
- Generate fresh audit and verification packets from a host with the required shell permissions.
