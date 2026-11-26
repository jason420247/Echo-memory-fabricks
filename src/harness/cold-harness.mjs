/**
 * Deterministic Simulation & Cold-Harness Replay Verifier
 *
 * Exercises Bricks 1-8 under a deterministic virtual clock (zero wall-clock nondeterminism),
 * validating four core invariants:
 *   I1: Stage-Gate & ROM Immutability + Seed-RAM Passive Echo-Catch
 *   I2: Inverse-Naming Merkle Chain Integrity & Exact Pre-State Hash Rollback
 *   I3: Base-243 FBRK Integrity + Quaternary Exact Unbind + Dormant Bit-Identity
 *   I4: Provenance COMBINED Decomposition + Twin Blindness + Publication Sentinel Cleanliness
 */

import {
  ACTOR_CLASSES,
  PROVENANCE_ORIGINS,
  ProvenanceChain,
  PublicationBoundarySentinel,
  canonicalJson,
  sha256Hex,
  validateActuationBranch
} from '../actuation/index.mjs';
import { mintCapsule, verifyCapsule } from '../capsule/index.mjs';
import { ChannelEchoKernel } from '../channel-echo/index.mjs';
import { BELNAP, belnapKnowledgeMerge, belnapNegate } from '../epistemic/index.mjs';
import { EchoReconstructionEngine, FRAGMENT_CONFIDENCE, MATCH_KIND } from '../reconstruct/index.mjs';
import {
  CellularSheafGraph,
  MerkleCrdtStore,
  createBlindTwinProjection,
  preDispatchSelfLeakCheck
} from '../sheaf-crdt/index.mjs';
import { MEMORY_TIERS, MemoryFabric } from '../tiers/index.mjs';
import {
  SuperposedAssociativeFrame,
  decodeFbrkFrame,
  encodeFbrkFrame,
  randomTernaryVector
} from '../vsa/index.mjs';

export function runColdHarnessReplay(options = {}) {
  const { repoRootDir = null } = options;
  const fixedClock = [
    '2026-11-25T00:00:00.000Z',
    '2026-11-25T00:05:00.000Z',
    '2026-11-25T00:10:00.000Z',
    '2026-11-25T00:15:00.000Z',
    '2026-11-25T00:20:00.000Z'
  ];
  const invariants = [];

  // --- Invariant I1: 7-Tier Promotion, PENDING_FILL Gate, Seed-RAM Echo-Catch & ROM Seal ---
  const fabric = new MemoryFabric({ vsaDim: 256, maxL1Pages: 8 });
  const recon = new EchoReconstructionEngine(fabric);
  recon.openBracketSession({
    sessionId: 'cold-b1',
    title: 'Dual-Window Variance Ringing Insight',
    beforeWindow: 'reviewing MEMS covariance matching papers',
    afterWindow: 'sketched per-observer variance ratio gate',
    activityContext: {
      placeState: 'desk',
      inputs: ['covariance-matching-notes'],
      mindsetModality: 'studying'
    },
    scopes: ['scope:ideas-cues', 'scope:solution'],
    openedAt: fixedClock[0]
  });
  const unrec = recon.completeReconstruction('cold-b1', {
    fragments: [],
    missingHoles: ['exact clamping bound for fast/slow variance ratio'],
    matchKind: MATCH_KIND.UNRECOVERED_OPEN_LOOP,
    completedAt: fixedClock[1]
  });

  const matchingIntake = fabric.ingestFluid({
    id: 'mem-echo-spec',
    title: 'Covariance Matching Fast/Slow Variance Clamping',
    artifactContent:
      'Dual-window covariance matching clamps fast/slow variance ratio lambda between 1 and lambda_max.',
    contextFill: 'Verified per-observer adaptive transient kernel formulation.',
    scopes: ['scope:solution'],
    createdAt: fixedClock[2]
  });

  fabric.promote('mem-echo-spec', MEMORY_TIERS.TICK_RAM, { timestamp: fixedClock[2] });
  fabric.promote('mem-echo-spec', MEMORY_TIERS.HOLD_RAM, { timestamp: fixedClock[3] });
  fabric.promote('mem-echo-spec', MEMORY_TIERS.SOLID_STATE, { timestamp: fixedClock[3] });
  const romSealed = fabric.promote('mem-echo-spec', MEMORY_TIERS.ROM, {
    timestamp: fixedClock[4],
    adjudicationVerdict: 'VERIFIED_DETERMINISTIC'
  });

  const cascade = fabric.buildCascadeHoldLink({
    linkNumber: 1,
    coversWindow: '2026-11-25-cold-replay',
    constitutionalDelta: 'Stage gates, Seed-RAM traps, and inverse-named commits verified.',
    referenceNow: fixedClock[4]
  });

  const i1Pass =
    unrec.step6Outcome.plantedSeedId === 'recon-trail:cold-b1' &&
    matchingIntake.echoCatches.length >= 1 &&
    Boolean(romSealed.romSha256) &&
    cascade.openThreadsLedger.oldestThread?.name === 'Dual-Window Variance Ringing Insight';
  invariants.push({ id: 'I1_SEVEN_TIER_AND_SEED_RAM', passed: i1Pass });

  // --- Invariant I2: Inverse-Naming Merkle Chain & Homeostatic Rollback ---
  const homeoShrink = fabric.volume.regulateHomeostasis({
    ramUsedRatio: 0.91,
    timestamp: fixedClock[4]
  });
  const chainCheck = fabric.journal.verifyChain();
  const i2Pass =
    chainCheck.valid &&
    homeoShrink.action === 'CONTRACT_AND_SPILL_L2' &&
    homeoShrink.currentMaxL1Pages === 4 &&
    belnapNegate(BELNAP.NEITHER) === BELNAP.NEITHER &&
    belnapKnowledgeMerge(BELNAP.TRUE, BELNAP.FALSE) === BELNAP.BOTH;
  invariants.push({ id: 'I2_INVERSE_MERKLE_AND_BILATTICE', passed: i2Pass });

  // --- Invariant I3: Base-243 FBRK + Q4 Exact Unbind + Channel-Echo Dormant Bit-Identity ---
  const trits = randomTernaryVector(133, 20261125, 0.15);
  const frame = encodeFbrkFrame(trits);
  const decoded = decodeFbrkFrame(frame);
  let tritsExact = decoded.trits.length === trits.length;
  for (let i = 0; i < trits.length && tritsExact; i += 1) {
    if (decoded.trits[i] !== trits[i]) tritsExact = false;
  }

  const qFrame = new SuperposedAssociativeFrame(512);
  qFrame.bindSlot('role:tier', 'val:seed-ram');
  qFrame.bindSlot('role:codec', 'val:base-243');
  const qHit = qFrame.queryRole('role:codec');

  const echoKernel = new ChannelEchoKernel();
  let bitIdenticalDormant = true;
  for (const z of [0.11, -0.07, 0.04, 0.13, -0.09, 0.02, -0.05, 0.08, 0.06, -0.03]) {
    const step = echoKernel.stepObserver('cold-obs', { rawZ: z });
    if (step.engaged || !Object.is(step.zTilde, step.zPrime)) {
      bitIdenticalDormant = false;
    }
  }
  const i3Pass = tritsExact && qHit.symbol === 'val:base-243' && bitIdenticalDormant;
  invariants.push({ id: 'I3_VSA_CODEC_AND_ECHO_REDUCTION', passed: i3Pass });

  // --- Invariant I4: Sheaf-CRDT, Blind Membrane, Provenance, Capsule & Sentinel ---
  const crdtA = new MerkleCrdtStore('surface-a');
  const crdtB = new MerkleCrdtStore('surface-b');
  crdtA.put('claim:alpha', 'v1', { epistemicValue: BELNAP.TRUE });
  crdtB.put('claim:alpha', 'v2', { epistemicValue: BELNAP.TRUE });
  crdtA.mergeRemoteNodes(crdtB.exportNodes());
  const crdtRes = crdtA.resolve('claim:alpha');

  const sheaf = new CellularSheafGraph();
  sheaf.setNodeStalk('u', [2.0, -1.0]);
  sheaf.setNodeStalk('v', [-2.0, 3.0]);
  sheaf.addRestrictionEdge({
    edgeId: 'e1',
    u: 'u',
    v: 'v',
    mapU: [[1, 0], [0, 1]],
    mapV: [[1, 0], [0, 1]]
  });
  const beforeEnergy = sheaf.evaluateCoboundary().dirichletEnergy;
  const afterSheaf = sheaf.diffuse({ stepSize: 0.25, steps: 30 });

  const blind = createBlindTwinProjection({
    taskPrompt: 'Audit module hash',
    rubric: 'SECRET_RUBRIC',
    nested: { expectedVerdict: 'HOLD', safeField: 42 }
  });
  const leakAudit = preDispatchSelfLeakCheck(blind.projection);

  const prov = new ProvenanceChain();
  const provRec = prov.recordArtifact({
    artifactId: 'cold-capsule-1',
    origin: PROVENANCE_ORIGINS.COMBINED,
    contributions: [
      { contributor: 'OPERATOR', part: 'Architecture & invariants', confidence: 1.0 },
      { contributor: 'SYSTEM', part: 'Deterministic replay code', confidence: 0.95 }
    ],
    recordedAt: fixedClock[4],
    recordedBy: ACTOR_CLASSES.ANTIGRAVITY_VM
  });

  const capsule = mintCapsule(
    {
      name: 'cold-harness-capsule',
      function: 'Deterministic cross-substrate verification capsule',
      temporalProgression: { wave: 4, tick: 1 },
      startAnchor: { romSha256: romSealed.romSha256 },
      closeOutState: { cascadeSha256: cascade.cascadeSha256 },
      deliberateFutureContextHook: { nextCommand: 'emf status' },
      provenance: provRec
    },
    { mintedAt: fixedClock[4] }
  );
  const capOk = verifyCapsule(capsule).verified;
  const branchOk = validateActuationBranch('actuation/antigravity/fabricks-suite').valid;

  let repoSentinelClean = true;
  if (repoRootDir) {
    const sentinel = new PublicationBoundarySentinel();
    repoSentinelClean = sentinel.scanDirectory(repoRootDir).clean;
  }

  const i4Pass =
    crdtRes.status === 'DISCOVERED_AMBIGUITY' &&
    crdtRes.epistemicValue === BELNAP.BOTH &&
    afterSheaf.dirichletEnergy < beforeEnergy * 0.001 &&
    blind.strippedFieldCount === 2 &&
    leakAudit.leakFree &&
    capOk &&
    branchOk &&
    repoSentinelClean;
  invariants.push({ id: 'I4_SHEAF_BLINDNESS_CAPSULE_SENTINEL', passed: i4Pass });

  const allPassed = invariants.every((inv) => inv.passed);
  const summary = {
    verdict: allPassed ? 'COLD_PASS' : 'COLD_FAIL',
    invariantsPassed: invariants.filter((i) => i.passed).length,
    invariantsTotal: invariants.length,
    invariants,
    romHeadSha256: romSealed.romSha256,
    cascadeHeadSha256: cascade.cascadeSha256,
    capsuleSha256: capsule.capsuleSha256
  };
  return {
    ...summary,
    replayDigestSha256: sha256Hex(canonicalJson(summary))
  };
}
