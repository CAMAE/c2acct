# Security Addendum — **DRAFT — FOR ATTORNEY REVIEW**

> ⚠️ **DRAFT — FOR ATTORNEY REVIEW. NOT LEGAL ADVICE. NOT A BINDING AGREEMENT.**
> Engineering-authored skeleton describing the security measures the product
> actually implements today, so counsel can decide which are *contractually
> committed* vs. *described*. `[Bracketed]` items need operator/attorney input.
> Prepared 2026-07-10 (Governance Phase 3, A7). Attaches to the MSA and DPA.

## 0. Note on maturity

PAT is pre-public-launch. This addendum describes **implemented** controls and
clearly marks **planned/aspirational** ones. Do **not** represent SOC 2 / ISO
27001 certification, audit completion, or an uptime SLA — none exist yet. Where a
control is inherited from a sub-processor, that is stated.

## 1. Organizational measures

1.1 Least-privilege access; operator/review access is environment-gated and
recorded in an operator audit trail. 1.2 `[Attorney/operator: background checks,
security training cadence, named security owner.]` 1.3 Change management via
version control, code review, and a release-proof chain (canonical root, commit,
build ID, dirty-tree guard).

## 2. Application security

2.1 **Authentication** — provider-backed in production; local review credentials
gated by environment + loopback. Auth endpoints (sign-in, password change) are
rate-limited. 2.2 **Authorization** — checks live in the session/data-access
layer (not middleware-only), avoiding the middleware-bypass class of issue.
2.3 **Input handling** — server actions and routes validate input with typed
extractors / schemas; no raw client-object spread into persistence (mass-assignment
audited clean). 2.4 **Security headers** — Content-Security-Policy (currently
report-only, staged to enforce), Strict-Transport-Security, frame-ancestors deny,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy. 2.5 **Idempotency** —
billing webhooks are deduplicated by a unique event constraint with a race-safe
persist path.

## 3. Data security

3.1 **In transit** — TLS on all connections. 3.2 **At rest** — provided by the
managed database/host (Neon/Vercel); `[confirm encryption-at-rest representation]`.
3.3 **Tenant isolation** — cross-firm/peer aggregates are boundary- and
tenancy-scoped; demo/synthetic data is walled out of customer-facing pools; a
conflict-of-interest wall keeps vendor self-report out of peer aggregates.
3.4 **PII in logs** — diagnostics are sanitized (primitives only); operator-audit
emails are an intentional accountability record, not a log-drain leak.

## 4. Payments

4.1 Card entry delegated to Stripe (provider-hosted); PAT stores provider
identifiers and reconciliation status only, never raw card numbers.

## 5. Data lifecycle

5.1 Retention configured per data class (`lib/retention.ts`). 5.2 Soft-delete
window (`[30]` days) before hard purge; tested tenant **export** and **deletion**
tooling with deletion receipts. 5.3 Financial records retained `[7]` years.

## 6. Availability & resilience

6.1 Managed hosting/database with the provider's own redundancy. 6.2 **PLANNED:**
error-rate + business-anomaly alerting, tested backup-restore drill with written
RTO/RPO, incident runbooks. `[Do not commit an SLA until these exist.]`

## 7. Sub-processors

7.1 Vercel (hosting), Neon (database), Stripe (payments), Anthropic (optional AI).
Infrastructure controls inherited from Vercel/Neon. No Customer Data trains
third-party models.

## 8. Incident response

8.1 On a confirmed security incident affecting Customer Data, Processor notifies
the Controller per DPA §8 and cooperates with response and regulator notice.
8.2 `[Attorney/operator: define severity tiers, notification timelines, contacts.]`

## 9. Vulnerability management

9.1 Dependency review `[cadence]`; `[coordinated disclosure contact / policy]`.
9.2 `[Attorney/operator: pen-test cadence, patch SLAs.]`

---

### Open items for the operator of record
- [ ] Mark each control **Committed** vs. **Described**.
- [ ] Fill retention/notification windows and named owners.
- [ ] Confirm encryption-at-rest and sub-processor certification representations.
- [ ] Remove all "PLANNED" items before representing them as in place.
