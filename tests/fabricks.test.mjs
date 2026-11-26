import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  ACTOR_CLASSES,
  BELNAP,
  CellularSheafGraph,
  ChannelEchoKernel,
  EchoReconstructionEngine,
  ElasticCasVolume,
  EpistemicCalibrationTracker,
  FRAGMENT_CONFIDENCE,
  InverseCommitJournal,
  MATCH_KIND,
  MEMORY_TIERS,
  MerkleCrdtStore,
  MemoryFabric,
  PROVENANCE_ORIGINS,
  PUBLICATION_TIERS,
  ProvenanceChain,
  PublicationBoundarySentinel,
  ScopeRegistry,
  SuperposedAssociativeFrame,
  belnapEntails,
  belnapKnowledgeConsensus,
  belnapKnowledgeMerge,
  belnapNegate,
  belnapTruthJoin,
  belnapTruthMeet,
  computeLagAutocorrelationEnergy,
  createBlindTwinProjection,
  decodeFbrkFrame,
  encodeFbrkFrame,
  gf4Add,
  gf4Mul,
  mintCapsule,
  packBase243,
  preDispatchSelfLeakCheck,
  q4Bind,
  q4Similarity,
  q4Unbind,
  randomQuaternaryVector,
  randomTernaryVector,
  resolveActorClass,
  unpackBase243,
  validateActuationBranch,
  verifyCapsule
} from '../src/index.mjs';

test('Brick 2: Belnap-Dunn 4-valued bilattice truth/knowledge operations and non-explosion', () => {
  assert.equal(belnapNegate(BELNAP.TRUE), BELNAP.FALSE);
  assert.equal(belnapNegate(BELNAP.FALSE), BELNAP.TRUE);
  assert.equal(belnapNegate(BELNAP.NEITHER), BELNAP.NEITHER);
  assert.equal(belnapNegate(BELNAP.BOTH), BELNAP.BOTH);

  assert.equal(belnapTruthMeet(BELNAP.TRUE, BELNAP.NEITHER), BELNAP.NEITHER);
  assert.equal(belnapTruthMeet(BELNAP.FALSE, BELNAP.NEITHER), BELNAP.FALSE);
  assert.equal(belnapTruthJoin(BELNAP.TRUE, BELNAP.NEITHER), BELNAP.TRUE);

  // Conflicting evidence merges to BOTH rather than overwriting
  assert.equal(belnapKnowledgeMerge(BELNAP.TRUE, BELNAP.FALSE), BELNAP.BOTH);
  assert.equal(belnapKnowledgeConsensus(BELNAP.TRUE, BELNAP.BOTH), BELNAP.TRUE);

  // Paraconsistent non-explosion: BOTH does NOT entail FALSE or NEITHER
  assert.equal(belnapEntails(BELNAP.BOTH, BELNAP.FALSE), false);
  assert.equal(belnapEntails(BELNAP.BOTH, BELNAP.NEITHER), false);
  assert.equal(belnapEntails(BELNAP.BOTH, BELNAP.TRUE), true);

  const cal = new EpistemicCalibrationTracker(5);
  cal.record(0.9, true);
  cal.record(0.1, false);
  const metrics = cal.evaluate();
  assert.equal(metrics.count, 2);
  assert.ok(metrics.brierScore < 0.02);
  assert.ok(metrics.ece < 0.15);
});

test('Brick 2: ScopeRegistry enforces deferralReason + reDateAt and InverseCommitJournal rolls back cleanly', () => {
  const scopes = new ScopeRegistry();
  assert.throws(() => scopes.validateTagging(['scope:need-to-defer'], {}), /DEFERRAL_REASON_REQUIRED/);
  assert.throws(
    () => scopes.validateTagging(['scope:need-to-defer'], { deferralReason: 'Waiting on benchmark' }),
    /DEFERRAL_REDATE_REQUIRED/
  );
  const valid = scopes.validateTagging(['scope:need-to-defer'], {
    deferralReason: 'Awaiting Phase 2 seed run',
    reDateAt: '2026-12-09T00:00:00.000Z'
  });
  assert.deepEqual(valid, ['scope:need-to-defer']);

  const journal = new InverseCommitJournal();
  assert.throws(
    () =>
      journal.commit({
        forwardOp: { name: 'SET_X' },
        inverseOp: null,
        preState: { x: 1 },
        postState: { x: 2 }
      }),
    /INVERSE_NAMING_RULE_VIOLATION/
  );

  journal.registerInverseHandler('SUB_DELTA', (state, params) => ({ x: state.x - params.delta }));
  const c1 = journal.commit({
    forwardOp: { name: 'ADD_DELTA', params: { delta: 5 } },
    inverseOp: { name: 'SUB_DELTA', params: { delta: 5 } },
    preState: { x: 10 },
    postState: { x: 15 }
  });
  journal.commit({
    forwardOp: { name: 'ADD_DELTA', params: { delta: 7 } },
    inverseOp: { name: 'SUB_DELTA', params: { delta: 7 } },
    preState: { x: 15 },
    postState: { x: 22 }
  });
  assert.equal(journal.verifyChain().valid, true);

  const rolled = journal.rollbackTo(c1.parentCommitSha, { x: 22 });
  assert.deepEqual(rolled.restoredState, { x: 10 });
  assert.equal(rolled.rolledBackCommits.length, 2);
});

test('Brick 3: Base-243 FBRK codec, GF(4)/Q4 exact unbind, and ElasticCasVolume homeostasis', () => {
  const trits = randomTernaryVector(317, 123456, 0.25);
  const packed = packBase243(trits);
  assert.equal(packed.length, Math.ceil(317 / 5));
  const unpacked = unpackBase243(packed, 317);
  assert.deepEqual(Array.from(unpacked), Array.from(trits));

  const frame = encodeFbrkFrame(trits);
  const decoded = decodeFbrkFrame(frame);
  assert.deepEqual(Array.from(decoded.trits), Array.from(trits));

  // Tamper check
  const tampered = Buffer.from(frame);
  tampered[tampered.length - 1] ^= 0x01;
  assert.throws(() => decodeFbrkFrame(tampered), /FBRK_SHA256_INTEGRITY_MISMATCH/);

  // GF(2^2) field properties
  assert.equal(gf4Add(2, 2), 0);
  assert.equal(gf4Mul(2, 3), 1);

  // Q4 exact single-pair unbinding
  const r = randomQuaternaryVector(512, 11);
  const f = randomQuaternaryVector(512, 22);
  const bound = q4Bind(r, f);
  assert.ok(Math.abs(q4Similarity(bound, f)) < 0.2);
  const recov = q4Unbind(bound, r);
  assert.equal(q4Similarity(recov, f), 1.0);

  // Superposed multi-slot associative frame
  const assoc = new SuperposedAssociativeFrame(1024);
  assoc.bindSlot('slot:alpha', 'concept:memory');
  assoc.bindSlot('slot:beta', 'concept:echo');
  assoc.bindSlot('slot:gamma', 'concept:fabrick');
  assert.equal(assoc.queryRole('slot:beta').symbol, 'concept:echo');

  // Elastic CAS volume + disk persistence + homeostatic contraction/expansion
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emf-cas-'));
  try {
    const journal = new InverseCommitJournal();
    const vol = new ElasticCasVolume({ maxL1Pages: 4, minL1Pages: 2, backingDir: tmpDir, journal });
    for (let i = 0; i < 6; i += 1) {
      vol.putPage(`p${i}`, randomTernaryVector(100, 1000 + i));
    }
    assert.equal(vol.stats().l1Count, 4);
    assert.equal(vol.stats().l2Count, 2);

    const shrunk = vol.regulateHomeostasis({ ramUsedRatio: 0.92 });
    assert.equal(shrunk.action, 'CONTRACT_AND_SPILL_L2');
    assert.equal(vol.maxL1Pages, 2);
    assert.equal(vol.stats().l1Count, 2);

    // Reload spilled page from L2 seamlessly
    const reloaded = vol.getPage('p0');
    assert.equal(reloaded.sourceTier, 'L2');
    assert.equal(reloaded.trits.length, 100);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Brick 1 & Brick 4: 7-Tier promotion gates, ROM immutability, Echo Reconstruction & Seed-RAM traps', () => {
  const fabric = new MemoryFabric({ vsaDim: 512 });

  // Incomplete fluid intake stays PENDING_FILL and blocks promotion
  const partial = fabric.ingestFluid({
    id: 'sketch-1',
    artifactContent: 'Unexplained geometric sketch box'
  });
  assert.equal(partial.record.intakeStatus, 'PENDING_FILL');
  assert.equal(partial.record.epistemicValue, BELNAP.NEITHER);
  assert.throws(
    () => fabric.promote('sketch-1', MEMORY_TIERS.TICK_RAM),
    /PENDING_FILL_GATE_BLOCKED/
  );

  // Illegal stage-skipping blocked
  fabric.attachContextFill('sketch-1', 'Co-referential note explaining membrane topology');
  assert.throws(() => fabric.promote('sketch-1', MEMORY_TIERS.ROM), /ILLEGAL_TIER_JUMP/);

  // Tick-RAM expiration when unpromoted
  fabric.promote('sketch-1', MEMORY_TIERS.TICK_RAM);
  const tickAdvance = fabric.advanceTick();
  assert.deepEqual(tickAdvance.expiredTickRamIds, ['sketch-1']);

  // Full path to ROM + ROM immutability enforcement
  fabric.ingestFluid({
    id: 'canon-1',
    title: 'Stage Gate Law',
    artifactContent: 'Boundaries prevent ungated writes into canon.',
    contextFill: 'Verified architecture principle.',
    scopes: ['scope:architecture']
  });
  fabric.promote('canon-1', MEMORY_TIERS.TICK_RAM);
  fabric.promote('canon-1', MEMORY_TIERS.HOLD_RAM);
  fabric.promote('canon-1', MEMORY_TIERS.SOLID_STATE);
  fabric.curateSolidState('canon-1', {
    artifactContent: 'Boundaries structurally prevent ungated writes into canon.'
  });
  fabric.promote('canon-1', MEMORY_TIERS.ROM, { adjudicationVerdict: 'CONFIRMED' });
  assert.throws(
    () => fabric.curateSolidState('canon-1', { artifactContent: 'illegal edit' }),
    /ROM_IMMUTABLE_VIOLATION/
  );

  // Reconstruction protocol + Seed-RAM trap + Cascade-Hold aging bands
  const recon = new EchoReconstructionEngine(fabric);
  recon.openBracketSession({
    sessionId: 'b-stale',
    title: 'Ancient Unresolved Kernel Thread',
    beforeWindow: 'studying bivariate bicycle parity checks',
    afterWindow: 'interrupted by phone call',
    scopes: ['scope:crypto'],
    openedAt: '2026-09-01T00:00:00.000Z'
  });
  recon.completeReconstruction('b-stale', {
    fragments: [],
    missingHoles: ['syndrome pre-check threshold'],
    matchKind: MATCH_KIND.UNRECOVERED_OPEN_LOOP,
    completedAt: '2026-09-01T00:10:00.000Z'
  });

  const cascade = fabric.buildCascadeHoldLink({
    linkNumber: 1,
    coversWindow: '2026-11-25',
    constitutionalDelta: 'Oldest thread always named in header.',
    referenceNow: '2026-11-25T18:00:00.000Z'
  });
  assert.equal(cascade.openThreadsLedger.bands.stale60dPlus, 1);
  assert.equal(cascade.openThreadsLedger.oldestThread.name, 'Ancient Unresolved Kernel Thread');
  assert.ok(cascade.openThreadsLedger.oldestThread.ageDays >= 80);

  //Recovered reconstruction case
  recon.openBracketSession({
    sessionId: 'b-rec',
    beforeWindow: 'reading bilattice truth tables',
    afterWindow: 'noted BOTH quarantine behavior',
    scopes: ['scope:architecture']
  });
  const recDone = recon.completeReconstruction('b-rec', {
    fragments: [{ text: 'Merge conflicting claims into BOTH', confidence: FRAGMENT_CONFIDENCE.PARAPHRASE }],
    missingHoles: [],
    matchKind: MATCH_KIND.THE_IDEA
  });
  assert.equal(recDone.step6Outcome.recovered, true);
});

test('Brick 5: ChannelEchoKernel dormant bit-identity, transient suppression & persistent step detection', () => {
  const kernel = new ChannelEchoKernel({ wFast: 8, wSlow: 32, lambdaMax: 4.0, gEngage: 2.0 });

  // 1. Dormant run: bit-identical nested reduction
  const nominal = [0.05, -0.12, 0.18, -0.09, 0.04, -0.15, 0.11, -0.06, 0.09, -0.03, 0.14, -0.08];
  for (const z of nominal) {
    const out = kernel.stepObserver('quiet-1', { rawZ: z });
    assert.equal(out.engaged, false);
    assert.equal(Object.is(out.zTilde, out.zPrime), true);
  }

  // 2. Transient ringing burst over sigmaPre=1.0 white background: engages whitening & reduces autocorrelation energy
  kernel.resetRun();
  const whiteSigns = [1, -1, 1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, -1, 1, -1];
  const bgPre = Array.from({ length: 32 }, (_, i) => whiteSigns[i % 16] * (0.85 + (i % 3) * 0.15));
  const burst = Array.from({ length: 12 }, (_, k) => -5.2 * Math.exp(-0.07 * k));
  const bgPost = Array.from({ length: 20 }, (_, i) => whiteSigns[(i + 5) % 16] * (0.9 + (i % 2) * 0.15));
  const ringStream = [...bgPre, ...burst, ...bgPost];
  const zPrimes = [];
  const zTildes = [];
  let anyEngaged = false;
  for (const z of ringStream) {
    const step = kernel.stepObserver('ring-obs', { rawZ: z, sigmaPre: 1.0 });
    zPrimes.push(step.zPrime);
    zTildes.push(step.zTilde);
    if (step.engaged) anyEngaged = true;
  }
  assert.equal(anyEngaged, true);
  const eBefore = computeLagAutocorrelationEnergy(zPrimes, 8);
  const eAfter = computeLagAutocorrelationEnergy(zTildes, 8);
  const reduction = (eBefore - eAfter) / eBefore;
  assert.ok(reduction >= 0.25, `Expected Gate-W reduction >= 0.25, got ${reduction}`);

  // 3. Persistent large step fault: confirms fault cleanly
  kernel.resetRun();
  let stepConfirmed = false;
  for (let i = 0; i < 32; i += 1) {
    const out = kernel.stepObserver('fault-step', { rawZ: 2.5 });
    if (out.confirmed) stepConfirmed = true;
  }
  assert.equal(stepConfirmed, true);
});

test('Brick 6, 7 & 8: Sheaf-CRDT, Blind Twin Membrane, Provenance, Capsules & Adversarial Sentinel', () => {
  // CRDT concurrent conflict -> DISCOVERED_AMBIGUITY (BOTH)
  const store1 = new MerkleCrdtStore('node-1');
  const store2 = new MerkleCrdtStore('node-2');
  store1.put('config:mode', 'strict', { epistemicValue: BELNAP.TRUE });
  store2.put('config:mode', 'relaxed', { epistemicValue: BELNAP.TRUE });
  store1.mergeRemoteNodes(store2.exportNodes());
  const resolved = store1.resolve('config:mode');
  assert.equal(resolved.status, 'DISCOVERED_AMBIGUITY');
  assert.equal(resolved.epistemicValue, BELNAP.BOTH);

  // Sheaf coboundary obstruction detection on inconsistent cycle
  const sheaf = new CellularSheafGraph();
  sheaf.setNodeStalk('a', [1.0]);
  sheaf.setNodeStalk('b', [1.0]);
  // Frustrated sign edge: a == -b cannot agree on non-zero values without decaying toward 0
  sheaf.addRestrictionEdge({ edgeId: 'frustrated', u: 'a', v: 'b', mapU: [[1]], mapV: [[-1]] });
  const initCheck = sheaf.evaluateCoboundary();
  assert.equal(initCheck.coherent, false);

  // Twin blind membrane
  const rawTask = {
    prompt: 'Evaluate module',
    rubric: 'hidden-criteria',
    sub: { trapClause: 'secret-trap', visibleData: 'hello' }
  };
  assert.equal(preDispatchSelfLeakCheck(rawTask).leakFree, false);
  const blind = createBlindTwinProjection(rawTask);
  assert.equal(preDispatchSelfLeakCheck(blind.projection).leakFree, true);
  assert.equal(blind.projection.sub.visibleData, 'hello');

  // Actor collision & branch guard
  assert.throws(() => resolveActorClass('copilot'), /ACTOR_COLLISION_COPILOT_AMBIG/);
  assert.equal(resolveActorClass('COPILOT-GH'), ACTOR_CLASSES.COPILOT_GH);
  assert.equal(validateActuationBranch('main').valid, false);
  assert.equal(validateActuationBranch('actuation/antigravity/test-1').valid, true);

  // Provenance decomposition + Operator credit precedence
  const prov = new ProvenanceChain();
  assert.throws(
    () =>
      prov.recordArtifact({
        artifactId: 'bad-comb',
        origin: PROVENANCE_ORIGINS.COMBINED,
        contributions: [{ contributor: 'SYSTEM', part: 'only one side', confidence: 1.0 }]
      }),
    /NEEDS_DECOMPOSITION/
  );
  prov.recordArtifact({
    artifactId: 'art-sys',
    origin: PROVENANCE_ORIGINS.SYSTEM,
    contributions: [{ contributor: 'SYSTEM', part: 'Initial draft', confidence: 0.8 }]
  });
  const assertion = prov.assertOperatorCredit({
    artifactId: 'art-sys',
    statement: 'Core framing originated in operator notebook'
  });
  assert.equal(assertion.granted, true);
  assert.equal(assertion.conflictLedgered, true);
  assert.equal(prov.queryProvenance('art-sys').effectiveOrigin, PROVENANCE_ORIGINS.OPERATOR);

  // Adversarial Publication-Boundary Sentinel negative controls
  const sentinel = new PublicationBoundarySentinel();
  const winLeak = sentinel.scanText('Loaded from ' + 'D' + ':\\\\Secret_Vault\\\\file.json');
  assert.equal(winLeak.clean, false);
  assert.equal(winLeak.verdict, PUBLICATION_TIERS.HOLD_PRIVATE);

  const claimedLeak = sentinel.scanText('{"metric": 0.99, "evidenceGrade": "' + 'CLAIMED"}');
  assert.equal(claimedLeak.clean, false);

  // Capsule blocks leaked path automatically on public/bounded tier
  assert.throws(
    () =>
      mintCapsule({
        name: 'leaky-cap',
        function: 'test',
        temporalProgression: {},
        startAnchor: { path: 'C' + ':\\\\Users\\\\local\\\\secret.txt' },
        closeOutState: {},
        deliberateFutureContextHook: {}
      }),
    /CAPSULE_PUBLICATION_SENTINEL_BLOCKED/
  );

  const cleanCap = mintCapsule({
    name: 'clean-cap',
    function: 'portable state handoff',
    temporalProgression: { step: 1 },
    startAnchor: { commit: 'abc123' },
    closeOutState: { coldPass: true },
    deliberateFutureContextHook: { run: 'emf status' }
  });
  assert.equal(verifyCapsule(cleanCap).verified, true);
});
