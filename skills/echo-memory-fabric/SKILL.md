---
name: echo-memory-fabric
description: Manage the 7-tier staged cognitive memory lifecycle (Fluid/Kinetic, Tick-RAM, Hold-RAM, Solid-State, ROM, Cascade-Hold, and Seed-RAM traps), Belnap-Dunn 4-valued epistemic tags, inverse-named commits, and Base-243 / GF(4) VSA associative storage.
---
# Echo Memory Fabric Skill

Use this skill when storing, promoting, querying, or rolling back structured agent memories across the 7-tier `Echo-memory-fabricks` lifecycle.

## Core Rules

1. **Never Skip Promotion Stages**: Memories progress strictly through `FLUID_KINETIC` -> `TICK_RAM` -> `HOLD_RAM` -> `SOLID_STATE` -> `ROM` -> `CASCADE_HOLD` (or `HOLD_RAM` / `FLUID_KINETIC` -> `SEED_RAM` for open questions and unrecovered temporal brackets).
2. **Atomic Intake Completeness**: Any `FLUID_KINETIC` intake lacking co-referential `contextFill` stays `PENDING_FILL` (`NEITHER` / `Omega`) until context is attached.
3. **Deferral Heartbeat Law**: Tagging a memory with `scope:need-to-defer` requires both a non-empty `deferralReason` and an ISO-8601 `reDateAt` review date.
4. **Inverse-Naming Commits**: Every state promotion or homeostatic resize records an explicit `inverseOp` in the SHA-256 Merkle commit journal.

## Verification & CLI Usage

Run the deterministic Cold-Harness and VSA checks to confirm substrate readiness:

```bash
node bin/emf.mjs cold-harness
node bin/emf.mjs vsa
```

Anchor check: `emf cold-harness` and `emf vsa` must exit `0` with `COLD_PASS`.
