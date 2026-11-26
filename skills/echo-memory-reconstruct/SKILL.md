---
name: echo-memory-reconstruct
description: Recover lost, partial, or degraded ideas using the 6-step Temporal-Bracket Memory Reconstruction Protocol, directional scope filtering, confidence-graded fragments, and passive Seed-RAM resonance traps.
---
# Echo Memory Reconstruction Skill

Use this skill when an idea, architectural insight, or session thread was lost or captured in a degraded/incomplete form and needs context-driven recovery without confabulation.

## 6-Step Reconstruction Workflow

1. **Temporal Bracket**: Capture `beforeWindow` (10-30 min prior inputs/tasks) and `afterWindow` (immediate subsequent actions/interruptions) instead of guessing the missing idea directly.
2. **Activity-Context Capture**: Record `placeState`, `inputs`, `mindsetModality`, and `degradationNotes`.
3. **Directional Scope Tagging**: Filter against compartments (`scope:solution`, `scope:ideas-cues`, `scope:architecture`, `scope:security`, etc.).
4. **Cross-Correlated Trigger Pull**: Query `MemoryFabric` for associative VSA rhymes and ordered input-replay triggers.
5. **Honest Fragment Grading**: Label recovered pieces strictly as `VERBATIM`, `PARAPHRASE`, or `INFERENCE`. Leave missing gaps explicitly marked `NEITHER` (`Omega`) — never fabricate content.
6. **Close or Plant Seed-RAM Trap**: Unrecovered brackets are automatically planted into `SEED_RAM` to passively catch future intakes (`ECHO_CATCH`).

## Verification & CLI Usage

```bash
node bin/emf.mjs reconstruct
```

Anchor check: `emf reconstruct` executes a worked temporal-bracket + `SEED_RAM` catch demonstration and exits `0`.
