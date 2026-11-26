---
name: echo-capsule-handoff
description: Mint, verify, and render SHA-256 signed 6-field Context Actuation & Rehydration Capsules with ProvenanceRecord attribution chains for cross-session and cross-substrate continuity.
---
# Echo Capsule Handoff Skill

Use this skill when closing out a session, handing work across ephemeral cloud VMs or bounded subagents, or verifying inbound cross-stream state capsules.

## Required 6-Field Schema (`echo-fabricks.capsule/v1`)

Every capsule must include:
- `name`: Identifier for the handoff unit.
- `function`: Concise operational purpose.
- `temporalProgression`: Wave/tick/milestone progression context.
- `startAnchor`: Verified entry hashes (`romSha256`, commit SHA, or baseline digest).
- `closeOutState`: Verified exit hashes, test verdicts, and open blind spots.
- `deliberateFutureContextHook`: Exact resume command or entry point for the next session.

## Provenance & Blind-Membrane Rules

- Attach `ProvenanceRecord` (`OPERATOR`, `SYSTEM`, or `COMBINED` with explicit part-level contributions).
- When dispatching to bounded test/verifier subagents, pass state through `createBlindTwinProjection` and run `preDispatchSelfLeakCheck` so zero rubric or answer-key fields leak.

## Verification & CLI Usage

```bash
node bin/emf.mjs capsule
```

Anchor check: `emf capsule` mints, SHA-256 verifies, and renders a signed capsule brief cleanly.
