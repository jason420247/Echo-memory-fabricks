---
name: echo-polyglot-push-guard
description: Run 3-language polyglot consensus (Node 22 + Python 3.12 -S + pure-std Rust 1.100), evaluate 6-Gauge Push/Pull Judgment Routing Slips, package Back-to-Self git bundle Return Composites, and execute offline bare-remote test pushes.
---
# Echo Polyglot, Return-Composite & Push-Judgment Skill

Use this skill before moving changes across substrates, grafting cloud VM builds back into an upstream host, or testing/authorizing a Git push.

## Workflow

1. **3-Way Polyglot Consensus (`Node` + `Python -S` + `Rust std`)**: Confirm that V8, CPython (`-S`), and native `rustc` (`DELEGATE-B`) produce identical `FBRK` frames, SHA-256 digests, and `ChannelEchoKernel` step traces.
2. **6-Gauge Push Judgment Slip**: Run `evaluatePushJudgment` to classify blast radius (`ALPHA` local sim vs. `BETA` branch vs. `GAMMA` trunk), verify Trinity delegation (`1 AUTHORIZE + 2 distinct DELEGATES`), check wave-lag (`>= 1`), and confirm `inverseRetreatOp` readiness.
3. **Offline Bare-Remote Test Push**: Execute `emf test-push-sim` to test server-side `pre-receive` hooks locally inside `.emf-local/remotes/` with zero network calls before touching any external remote.
4. **Back-to-Self Return Composite**: Package verified commits into `.emf-local/bundles/echo-fabricks-return.bundle` + `return-composite.json` and pass the 4-Gate Offline Quarantine Admission check.

## Verification & CLI Usage

```bash
node bin/emf.mjs polyglot
node bin/emf.mjs push-judgment
node bin/emf.mjs test-push-sim
node bin/emf.mjs return-composite
```

Anchor check: `emf polyglot`, `emf test-push-sim`, and `emf return-composite` must exit `0` with `agreed: true` and `admitted: true`.
