# Echo-Memory-Fabricks

**Zero-dependency, polyglot (`Node.js >= 22` ESM + `Python >= 3.11 -S` stdlib-only + `Rust 1.100` `std`-only) multi-tier cognitive memory fabric, associative VSA codec, adaptive transient kernel, cross-substrate translator, and governed actuation suite.**

---

## Architectural Overview: The 12 Composable "Fabricks"

`Echo-memory-fabricks` (`v0.2.0`) weaves **12 independent, deterministic building bricks** into a staged memory, cross-substrate translation, and polyglot verification substrate with zero third-party runtime dependencies:

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
| **Brick 9** | [`src/translators`](./src/translators/index.mjs) | **Sanitizing Cross-Substrate Translators & COA Procedurals**: Converts host paths to `vol://` logical URIs, bridges sibling `<!-- LEDGER -->` Markdown headers <-> `Cascade-Hold` (auto-detecting missing aging bands & unnamed stale threads), converts `.tswap` <-> `.fbrk`, and generates Course-of-Action (`COA`) decision packets across the 7 disturbance tiers. |
| **Brick 10** | [`src/composites`](./src/composites/index.mjs) | **Self-Publishing Distiller & Back-to-Self Return Composite**: Audits zero-dependency decoupling and packages verified Git branches into portable `.bundle` + `return-composite.json` archives with a 4-Gate Offline Quarantine Admission Verifier (`0` lifecycle hooks, `0` dynamic-eval taint, `git bundle verify`, `COLD_PASS`). |
| **Brick 11** | [`src/judgment`](./src/judgment/index.mjs) | **Push / Pull Meta-Decision & Judgment Router**: 6-Gauge Outbound `PushRoutingSlip` (`TargetRing`, `Sentinel`, `WaveLag >= 1`, `Alpha/Beta/Gamma` + `PerceptionTiming`, `Trinity`, `InverseRetreatOp`) and Inbound Pull IPI / Supply-Chain / `BELNAP.BOTH` Quarantine Gate. |
| **Brick 12** | [`src/multitrack`](./src/multitrack/index.mjs), [`src/coarchitect`](./src/coarchitect/index.mjs) & [`rust/echo_fabricks_rs`](./rust/echo_fabricks_rs/src/main.rs) | **Polyglot Triad, Dual-Track Controller & Co-Architect Registry**: 3-runtime bit-for-bit parity (`Node 22` V8 + `Python 3.12 -S` + pure-`std` `Rust 1.100` `DELEGATE-B` with native FIPS 180-4 SHA-256 & `SteeringGate`), $S_3$ Phase Router, Speculative/Verified Dual-Track execution, and Trinity SPOF role gauging. |

---

## Quickstart & Deterministic Polyglot Verification

Requires **Node.js >= 22**, **Python >= 3.11** (`-S` stdlib-only), and **Rust (`rustc`)** for 3-language polyglot consensus. Zero external npm, PyPI, or Cargo crates required.

```bash
# Run full verification battery (13 test suites, Python -S, Rust std 3-way parity, 5 skills, N=5 benchmarks, Cold-Harness & Sentinel)
npm run verify:all

# CLI control-plane commands
node bin/emf.mjs status
node bin/emf.mjs polyglot
node bin/emf.mjs translate
node bin/emf.mjs coa
node bin/emf.mjs push-judgment
node bin/emf.mjs test-push-sim
node bin/emf.mjs return-composite
node bin/emf.mjs ip-ledger
```

### Measured `LOCAL_CPU` Cohort & Polyglot Consensus Summary

Full machine-verifiable results are sealed in [`specs/benchmark-dossier.json`](./specs/benchmark-dossier.json):
- **3-Runtime Polyglot Consensus**: `100%` bit-for-bit agreement across `Node 22` (V8), `Python 3.12 -S` (CPython), and `Rust 1.100` (`rustc` pure-`std`) on `Mulberry32`, `Base-243` `FBRK` wire frames, `SHA-256`, and `ChannelEchoKernel` step traces.
- **`Base-243` Packing Density**: `5.00 trits/byte` (`200` payload bytes for `1,000` balanced trits).
- **Quaternary Superposed Associative Frame Recall (`8` bound slots, `D = 1024`)**: `1.000` (`100%` exact recall across all 5 seeds).
- **Channel-Echo Median Lag-1..8 Autocorrelation Energy Reduction (`Gate W >= 0.25`)**: `0.59503` (`59.5%` reduction on transient bursts) + `100%` IEEE-754 bit-identical dormancy.
- **Local Bare-Remote Pre-Receive Push Simulation**: Adversarial leak push `100%` rejected by server-side `pre-receive` Sentinel hook; clean `actuation/*` push verified & accepted with `0` GitHub `origin` network writes.

---

## Portable Agent Skills (5), MCP Server (14 Tools) & Offline Inspector

- **Portable Skills (`skills/*/SKILL.md`)**:
  - [`echo-memory-fabric`](./skills/echo-memory-fabric/SKILL.md)
  - [`echo-memory-reconstruct`](./skills/echo-memory-reconstruct/SKILL.md)
  - [`echo-capsule-handoff`](./skills/echo-capsule-handoff/SKILL.md)
  - [`echo-publication-guard`](./skills/echo-publication-guard/SKILL.md)
  - [`echo-polyglot-push-guard`](./skills/echo-polyglot-push-guard/SKILL.md)
- **Stdio MCP Server (`v0.2.0`)**: Run `node mcp/server.mjs` to expose 14 deterministic JSON-RPC 2.0 stdio tools across Bricks 1–12.
- **Offline Visual Inspector**: Open [`ui/inspector.html`](./ui/inspector.html) in any browser.

---

## Adaptive Multi-Stage Hybrid Licensing

See [`LICENSE`](./LICENSE), [`LICENSE-APACHE-2.0`](./LICENSE-APACHE-2.0), [`COMMERCIAL-LICENSE.md`](./COMMERCIAL-LICENSE.md), and [`NOTICE`](./NOTICE):
- **`L1` Interoperability Specifications, Schemas & Docs** (`specs/**`, `docs/**`, `README.md`): **Apache License 2.0** (with `NOTICE` provenance attribution preservation).
- **`L2` Executable Runtime Engines (`Node`, `Python`, `Rust`), Skills, MCP & UI** (`src/**`, `python/**`, `rust/**`, `mcp/**`, `bin/**`, `skills/**`, `ui/**`, `tests/**`): **Source-Available Non-Competing & Verification Grant**, with 100% sole copyright, commercial production licensing, consulting/contracting Pre-Existing Background-IP (`specs/background-ip-ledger.json`), and private-expense rights reserved by the Copyright Holder (`jason420247`).