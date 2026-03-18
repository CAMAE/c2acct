# Unlock Design

## Unlock posture

Unlocks should represent earned evidence, not decorative gamification.

## Sequence

1. Reading completion unlocks the module quiz.
2. Passing the module quiz unlocks the next module.
3. Completing all five module quizzes unlocks the final test.
4. Passing the final test unlocks the completion record and learner summary.

## Guardrails

- No module should unlock solely because a page was visited.
- No insight or badge should unlock without a recorded evidence event.
- Tier 1 unlocks may show earned progress; higher-order recognition should remain conditional on cumulative evidence.

## Evidence notes

- Every unlock event should be tied to a learner, assessment version, timestamp, and source-map version.
- Failed attempts should remain visible for support and remediation rather than being silently overwritten.
