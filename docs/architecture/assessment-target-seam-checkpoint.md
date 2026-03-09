# AssessmentTarget seam plan checkpoint

## Current company-root seam concentration
- app/api/survey/submit/route.ts
  - POST
  - converts sessionUser.companyId -> effectiveCompanyId
  - persists SurveySubmission with companyId
  - awards CompanyBadge with companyId_badgeId_moduleId

- app/api/results/route.ts
  - GET
  - reads latest SurveySubmission by companyId

- app/api/insights/unlocked/route.ts
  - GET
  - resolves unlocked insights via companyId -> earned badge lookup

- app/api/badges/earned/route.ts
  - GET
  - reads earned badges directly by companyId

## Identity-only paths (do not absorb assessment-target logic yet)
- app/api/company/select/route.ts
- app/api/company/default/route.ts
- auth.ts
- lib/companyContext.ts

## Locked direction
- keep Company as near-term org root
- keep Product first-class
- keep runtime stable on companyId today
- next seam should be an internal resolver/helper that returns companyId today but can later resolve assessment target context
- do not do full Subject rewrite
- do not move target logic into auth or cookie selection routes

## Smallest next implementation batch
1. add lib/assessmentTarget.ts
2. add a resolver that returns companyId today only
3. replace direct sessionUser.companyId usage in:
   - app/api/survey/submit/route.ts
   - app/api/results/route.ts
   - app/api/insights/unlocked/route.ts
   - app/api/badges/earned/route.ts
4. keep persisted DB shape unchanged for now
5. no schema edits in this batch
