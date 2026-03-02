## Future Pivot (B2B2C): Individual Users + Credits
Goal: allow individual Users to access AAE (mobile + desktop), take assessments, earn/account credits, receive insights.
This must coexist with Firms/Vendors and share the same Measurement -> Capability -> Activation pipeline.

### Hard Requirements
- Lock into master plan: support individual "users" as first-class participants (not only Company).
- Design future-proof schema patterns.
- Avoid hardcoding “company-only” logic throughout routes, scoring, gating, unlock evaluation, badges.
- Keep entity abstraction in mind everywhere (IDs, URLs, policies, joins).

### Recommended Core Pattern
Introduce an "Actor" (or "Subject") abstraction as the scoring target:
- Actor: { id, type: COMPANY | USER, companyId? }
- All submissions/scores/badges/credits attach to actorId (NOT companyId directly).
- Company remains for B2B accounts; User can optionally belong to Company via membership.

### Schema Targets (Prisma)
- User (auth identity)
- Company (org)
- CompanyMember (userId, companyId, role, status)
- Actor (id, type, userId?, companyId?) + unique constraints for (type,userId) and (type,companyId)

Refactor tables to attach to actorId:
- SurveySubmission: actorId + moduleId + answers + measurement fields
- CompanyCapabilityScore -> CapabilityScore (actorId, nodeId, scoreVersion, computedAt)
- CompanyBadge -> BadgeAward (actorId, badgeId, awardedAt, sourceModuleId?)
- CreditsLedger (actorId, amount, reason, refType/refId, createdAt)
- Any gating/unlock eval takes actorId (or actorType+id) rather than companyId

### Code Implications
- /api/* accepts actorId (or resolves from session: default actor = company actor if logged in via company; else user actor)
- /outputs and unlock evaluator operate on actorId
- Keep "companyId" support temporarily via adapter: resolve companyId -> actorId

### Migration Strategy (Later)
Phase 1: Add Actor + new tables while keeping existing companyId-based tables.
Phase 2: Dual-write (companyId and actorId) in submit route.
Phase 3: Backfill old rows to Actor + cut read paths over.
Phase 4: Remove company-only paths.

### Mobile App Readiness
Use a stable API surface:
- /api/actors/me
- /api/modules/progress?actorId=
- /api/insights/unlocked?actorId=
- /api/survey/submit (actorId inferred from session)
