# Echo-Memory-Fabricks

**Zero-dependency, cross-platform (`Node.js >= 22` ESM + `Python >= 3.11 -S` stdlib-only) multi-tier cognitive memory fabric, associative VSA codec, adaptive transient kernel, and cross-substrate capsule suite.**

---

## Architectural Overview: The 8 Composable "Fabricks"

`Echo-memory-fabricks` weaves **8 independent, deterministic building bricks** into a staged memory and verification substrate with zero third-party runtime dependencies:

| Brick | Module | Core Capability & Enforced Invariants |
| :--- | :--- | :--- |
| **Brick 1** | [`src/tiers`](./src/tiers/index.mjs) | **7-Tier Memory Lifecycle & `Seed-RAM` Traps**: Enforces `FLUID_KINETIC` (`PENDING_FILL` completeness law) -> `TICK_RAM` -> `HOLD_RAM` -> `SOLID_STATE` -> `ROM` (immutable SHA-256 canon) -> `CASCADE_HOLD` (aged open-thread bands `<14d` / `14-60d` / `60d+` with mandatory oldest-thread naming), plus passive **`SEED_RAM`** resonance traps (`ECHO_CATCH`). |
| **Brick 2** | [`src/epistemic`](./src/epistemic/index.mjs) | **Belnap–Dunn Four-Valued Bilattice & Inverse-Naming Journal**: Paraconsistent `TRUE` / `FALSE` / `NEITHER` (`Omega`) / `BOTH` (`Bot`) logic, Brier/ECE calibration, directional `ScopeRegistry` (enforcing `deferralReason` + `reDateAt` on `scope:need-to-defer`), and SHA-256 Merkle `InverseCommitJournal` requiring explicit `inverseOp` declarations on every commit. |
| **Brick 3** | [`src/vsa`](./src/vsa/index.mjs) | **Packed `Base-243` Ternary & `GF(4)` VSA Lattice + Elastic CAS**: `5 trits/byte` (`Base-243`, 95.3% byte-channel efficiency) `FBRK` binary frames, `GF(2^2)` / 4-phase exact single-pair unbinding & superposed associative frames, and `L1 -> L2 -> L3` SHA-256 CAS paging with two-way Homeostatic Expansion/Contraction. |
| **Brick 4** | [`src/reconstruct`](./src/reconstruct/index.mjs) | **6-Step Echo-Reconstruction Engine**: Temporal bracketing (`[beforeWindow, afterWindow]`), activity-context & degradation capture, directional scope pull, honest `VERBATIM` / `PARAPHRASE` / `INFERENCE` fragment grading (marking gaps `NEITHER` without confabulation), automatic `SEED_RAM` trap planting, and recursive trail logging. |
| **Brick 5** | [`src/channel-echo`](./src/channel-echo/index.mjs) | **Per-Observer Dual-Window Adaptive Channel-Echo Kernel**: Causal fast/slow innovation covariance ratio $\lambda_i[n] = \operatorname{clamp}(V_{\text{fast}} / V_{\text{slow}}, 1, \lambda_{\max})$, standardized-innovation engagement gate, graded trip modulation, and **bit-identical IEEE-754 nested reduction** when dormant. |
| **Brick 6** | [`src/sheaf-crdt`](./src/sheaf-crdt/index.mjs) | **Merkle-CRDT, Cellular Sheaf Consensus & Blind Twin Membrane**: Concurrent conflicting multi-agent writes surface as `DISCOVERED_AMBIGUITY` (`BOTH`) rather than silent overwrites; Sheaf Laplacian diffusion diagnoses harmonic coboundary obstructions; `createBlindTwinProjection` strips evaluation rubrics prior to verifier subagent dispatch. |
| **Brick 7** | [`src/capsule`](./src/capsule/index.mjs) | **6-Field Signed Context Actuation Capsules**: Mints, verifies, and renders SHA-256 sealed session handoff capsules (`name`, `function`, `temporalProgression`, `startAnchor`, `closeOutState`, `deliberateFutureContextHook`). |
| **Brick 8** | [`src/actuation`](./src/actuation/index.mjs) | **Actuation Bridge, `ProvenanceChain` & Publication Sentinel**: Per-surface branch guards (`actuation/<surface>/<slug>`), actor collision rejection (blocking bare `"copilot"`), `OPERATOR | SYSTEM | COMBINED` provenance decomposition & `CreditAssertion`, Pre-Existing Background-IP Ledger (`specs/background-ip-ledger.json`), and the One-Way Downstream `Publication-Boundary Sentinel`. |

---

## Quickstart & Deterministic Verification

Requires **Node.js >= 22** (and **Python >= 3.11** for cross-runtime `python3 -S` parity checks). Zero `npm install` packages required.

```bash
# Run full verification suite (Node tests, Python -S parity, SkillCompiler, N=5 benchmarks, Cold-Harness & Sentinel)
npm run verify:all

# Inspect live substrate status & CLI commands
node bin/emf.mjs status
node bin/emf.mjs cold-harness
node bin/emf.mjs vsa
node bin/emf.mjs reconstruct
node bin/emf.mjs channel-echo
node bin/emf.mjs capsule
node bin/emf.mjs ip-ledger
```

### Measured `LOCAL_CPU` Cohort Summary (`N = 5` Seeds `101..105`)

Full machine-verifiable results are sealed in [`specs/benchmark-dossier.json`](./specs/benchmark-dossier.json):
- **`Base-243` Packing Density**: `5.00 trits/byte` (`200` payload bytes for `1,000` balanced trits vs. `1,000` bytes uncompressed).
- **Quaternary Superposed Associative Frame Recall (`8` bound slots, `D = 1024`)**: `1.000` (`100%` exact recall across all 5 seeds).
- **Channel-Echo Median Lag-1..8 Autocorrelation Energy Reduction (`Gate W >= 0.25`)**: `0.59503` (`59.5%` reduction on transient bursts).
- **Dormant Nested Reduction**: `100%` IEEE-754 bit-identical (`Object.is(zTilde, zPrime) === true`) when unengaged.
- **Verified-Trace Skill Compiler Adversarial Gate**: `5/5` (`100%`) prompt-injection, bidi-spoofing, and pipe-exec payloads blocked.

---

## Portable Agent Skills, MCP Server & Visual Inspector

- **Portable Skills (`skills/*/SKILL.md`)**:
  - [`echo-memory-fabric`](./skills/echo-memory-fabric/SKILL.md)
  - [`echo-memory-reconstruct`](./skills/echo-memory-reconstruct/SKILL.md)
  - [`echo-capsule-handoff`](./skills/echo-capsule-handoff/SKILL.md)
  - [`echo-publication-guard`](./skills/echo-publication-guard/SKILL.md)
- **Stdio MCP Server**: Run `node mcp/server.mjs` to expose 10 deterministic JSON-RPC 2.0 MCP tools (`fabric_ingest_fluid`, `fabric_promote_tier`, `fabric_associative_search`, `fabric_reconstruct_bracket`, `fabric_channel_echo_eval`, `fabric_mint_capsule`, `fabric_provenance_record`, `fabric_audit_sentinel`, `fabric_cold_harness`, `fabric_attach_context_fill`).
- **Offline Visual Inspector**: Open [`ui/inspector.html`](./ui/inspector.html) in any browser to interactively tune the Channel-Echo kernel, inspect the 7-Tier + `Seed-RAM` automaton, and test Belnap–Dunn / `Base-243` operations.

---

## Adaptive Multi-Stage Hybrid Licensing

See [`LICENSE`](./LICENSE), [`LICENSE-APACHE-2.0`](./LICENSE-APACHE-2.0), [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md), and [`NOTICE`](./NOTICE):
- **`L1` Interoperability Specifications, Schemas & Docs** (`specs/**`, `docs/**`, `README.md`): **Apache License 2.0** (with `NOTICE` provenance attribution preservation).
- **`L2` Executable Runtime Engines, Skills, MCP & UI** (`src/**`, `python/**`, `mcp/**`, `bin/**`, `skills/**`, `ui/**`, `tests/**`): **Source-Available Non-Competing & Verification Grant**, with 100% sole copyright, commercial production licensing, consulting/contracting Pre-Existing Background-IP (`specs/background-ip-ledger.json`), and private-expense rights reserved by the Copyright Holder (`jason420247`).