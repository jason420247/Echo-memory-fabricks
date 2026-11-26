#!/usr/bin/env node
/**
 * Echo-Memory-Fabricks — Unified CLI Control Plane (`emf` v0.2.0)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACTOR_CLASSES,
  ChannelEchoKernel,
  DISTURBANCE_TIERS,
  EchoReconstructionEngine,
  MATCH_KIND,
  MemoryFabric,
  PROVENANCE_ORIGINS,
  ProvenanceChain,
  PublicationBoundarySentinel,
  SuperposedAssociativeFrame,
  TARGET_RINGS,
  VerifiedTraceSkillCompiler,
  admitReturnComposite,
  buildBackToSelfReturnComposite,
  canonicalizeLogicalUri,
  convertLegacyTswapToFbrk,
  decodeFbrkFrame,
  encodeFbrkFrame,
  evaluatePushJudgment,
  generateBackgroundIpLedger,
  generateCoaPacket,
  mintCapsule,
  parseSiblingLedgerMarkdown,
  randomTernaryVector,
  renderCapsuleBriefMarkdown,
  runColdHarnessReplay,
  runLocalTestPushSimulation,
  verifyBackgroundIpLedger,
  verifyCapsule,
  verifyThreeWayPolyglotParity
} from '../src/index.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runCli(argv = process.argv.slice(2)) {
  const cmd = argv[0] || 'status';

  switch (cmd) {
    case 'status': {
      const sentinel = new PublicationBoundarySentinel();
      const scan = sentinel.scanDirectory(REPO_ROOT);
      const compiler = new VerifiedTraceSkillCompiler();
      const skillGraph = compiler.compileSkillsDirectory(
        path.join(REPO_ROOT, 'skills'),
        REPO_ROOT
      );
      console.log(
        JSON.stringify(
          {
            package: 'echo-memory-fabricks',
            version: '0.2.0',
            bricksCount: 12,
            polyglotRuntimes: ['Node >=22 ESM', 'Python >=3.11 (-S)', 'Rust 1.100 (std-only)'],
            compiledSkillsCount: skillGraph.compiledCount,
            publicationSentinel: {
              clean: scan.clean,
              verdict: scan.verdict,
              scannedFileCount: scan.scannedFileCount
            }
          },
          null,
          2
        )
      );
      return 0;
    }

    case 'vsa': {
      const trits = randomTernaryVector(243, 777, 0.15);
      const frame = encodeFbrkFrame(trits);
      const decoded = decodeFbrkFrame(frame);
      const qFrame = new SuperposedAssociativeFrame(1024);
      qFrame.bindSlot('tier:seven', 'Seed-RAM');
      qFrame.bindSlot('encoding:trits', 'Base-243');
      qFrame.bindSlot('logic:epistemic', 'Belnap-Dunn-FDE');
      const query = qFrame.queryRole('encoding:trits');
      console.log(
        JSON.stringify(
          {
            ok: true,
            tritLength: trits.length,
            fbrkBytes: frame.length,
            compressionVsBytePerTrit: Number((trits.length / (frame.length - 41)).toFixed(2)),
            payloadSha256: decoded.payloadSha256,
            quaternaryQuery: query
          },
          null,
          2
        )
      );
      return 0;
    }

    case 'reconstruct': {
      const fabric = new MemoryFabric({ vsaDim: 512 });
      const engine = new EchoReconstructionEngine(fabric);
      engine.openBracketSession({
        sessionId: 'demo-shower-bracket',
        title: 'Shower Memory Methodology Insight',
        beforeWindow: 'watching brief memory architecture videos before sleep',
        afterWindow: 'wrote subtle fill-in note from tired state',
        activityContext: {
          placeState: 'wind-down',
          inputs: ['memory-architecture-clips'],
          mindsetModality: 'reflective'
        },
        scopes: ['scope:ideas-cues', 'scope:solution']
      });
      const triggers = engine.generateTriggers('demo-shower-bracket');
      const unrec = engine.completeReconstruction('demo-shower-bracket', {
        fragments: [],
        missingHoles: ['directional filter trigger step'],
        matchKind: MATCH_KIND.UNRECOVERED_OPEN_LOOP
      });
      const intake = fabric.ingestFluid({
        id: 'later-note-1',
        title: 'Directional History Pull Note',
        artifactContent:
          'Memory architecture clips inspired a planned history pull sequence filtered with a scope direction.',
        contextFill: 'Co-referential fill confirming the recovery protocol.',
        scopes: ['scope:solution']
      });
      console.log(
        JSON.stringify(
          {
            ok: true,
            plantedSeedId: unrec.step6Outcome.plantedSeedId,
            triggerCue: triggers.beforeSequenceReplay,
            passiveEchoCatches: intake.echoCatches
          },
          null,
          2
        )
      );
      return 0;
    }

    case 'channel-echo': {
      const kernel = new ChannelEchoKernel();
      const ringTrace = [
        0.1, -0.15, 0.08, -0.12, 0.05, -0.09, 0.11, -0.07, -3.2, -2.8, -2.4, -1.9, -1.4, -0.9, -0.4
      ];
      const results = ringTrace.map((rawZ, i) =>
        kernel.stepObserver('obs-demo', { rawZ, tick: i + 1 })
      );
      console.log(
        JSON.stringify(
          {
            ok: true,
            engagedTicks: results.filter((r) => r.engaged).length,
            peakLambda: Math.max(...results.map((r) => r.lambda)),
            confirmedFalseAlarm: results.some((r) => r.confirmed)
          },
          null,
          2
        )
      );
      return 0;
    }

    case 'capsule': {
      const prov = new ProvenanceChain();
      const rec = prov.recordArtifact({
        artifactId: 'cli-demo-capsule',
        origin: PROVENANCE_ORIGINS.COMBINED,
        contributions: [
          { contributor: 'OPERATOR', part: '6-field handoff specification', confidence: 1.0 },
          { contributor: 'SYSTEM', part: 'CLI capsule serializer & SHA-256 verifier', confidence: 0.95 }
        ],
        recordedBy: ACTOR_CLASSES.ANTIGRAVITY_VM
      });
      const cap = mintCapsule({
        name: 'echo-fabricks-session-handoff',
        function: 'Cross-substrate verification & rehydration anchor',
        temporalProgression: { wave: 8, status: 'VERIFIED' },
        startAnchor: { branch: 'actuation/antigravity/fabricks-suite' },
        closeOutState: { coldHarness: 'COLD_PASS' },
        deliberateFutureContextHook: { command: 'emf cold-harness' },
        provenance: rec
      });
      const verified = verifyCapsule(cap);
      const briefMd = renderCapsuleBriefMarkdown(cap);
      console.log(
        JSON.stringify(
          {
            ok: verified.verified,
            capsuleSha256: cap.capsuleSha256,
            markdownPreviewLines: briefMd.split('\n').slice(0, 8)
          },
          null,
          2
        )
      );
      return verified.verified ? 0 : 1;
    }

    case 'translate': {
      const sampleMd = [
        '# Remembrance chain — 2026-11-25',
        '<!-- LEDGER',
        'link: 58',
        'covers: 2026-11-24',
        'judgments: 12',
        'pending_calls: 80 open, oldest 80 days',
        '-->',
        '## 1. Ingress',
        '## 10. Constitutional'
      ].join('\n');
      const parsed = parseSiblingLedgerMarkdown(sampleMd);
      const tswapConv = convertLegacyTswapToFbrk({
        pageId: 'swap-01',
        sourcePath: '/home/demo/MemorySwap/swap-01.tswap',
        trits: Array.from(randomTernaryVector(125, 42, 0.1))
      });
      console.log(
        JSON.stringify(
          {
            ok: true,
            canonicalUriExample: canonicalizeLogicalUri('/home/demo/skills/test/SKILL.md'),
            detectedLedgerFormatGaps: parsed.formatGaps,
            tswapToFbrkSavingsRatio: tswapConv.spaceSavingsRatio,
            tswapLogicalUri: tswapConv.logicalUri
          },
          null,
          2
        )
      );
      return 0;
    }

    case 'coa': {
      const packet = generateCoaPacket({
        packetId: 'coa-push-posture',
        whatWeKnow: ['Local bare-remote simulation passes all 6 gauges and 3-way polyglot parity'],
        whatWeDoNotKnow: ['Whether operator wants remote GitHub Draft PR now or later'],
        candidateCourses: [
          {
            id: 'KEEP_IN_VM_AND_BUNDLE',
            summary: 'Keep branch local in VM and emit offline Back-to-Self git bundle',
            blastRadius: 'ALPHA',
            inverseOp: 'DELETE_LOCAL_BUNDLE'
          },
          {
            id: 'PUSH_ACTUATION_DRAFT_PR',
            summary: 'Push actuation branch to origin and open Draft PR',
            blastRadius: 'BETA',
            inverseOp: 'CLOSE_PR_AND_DELETE_REMOTE_BRANCH'
          }
        ],
        disturbanceTier: DISTURBANCE_TIERS.GAUGE_ASSESSMENT,
        recommendedLeanId: 'KEEP_IN_VM_AND_BUNDLE',
        systemCertifiableEvidence: {
          preDefinedCriteria: 'All 6 local gauges green + 0 network writes',
          checkableEvidence: 'Cold-Harness COLD_PASS + 3-way polyglot agreed',
          independentSecondaryPass: true
        }
      });
      console.log(JSON.stringify(packet, null, 2));
      return 0;
    }

    case 'polyglot': {
      const parity = verifyThreeWayPolyglotParity(20261125, REPO_ROOT);
      console.log(JSON.stringify(parity, null, 2));
      return parity.agreed ? 0 : 1;
    }

    case 'push-judgment': {
      const localSimSlip = evaluatePushJudgment({
        targetRing: TARGET_RINGS.LOCAL_BARE_SIM,
        branchName: 'actuation/antigravity/fabricks-suite',
        upstreamWaveLag: 2,
        trinity: {
          authorize: ACTOR_CLASSES.OPERATOR,
          delegateA: 'NODE22_BUILDER',
          delegateB: 'RUST_STD_DELEGATE_B'
        },
        inverseRetreatOp: { name: 'DELETE_SIM_REF' },
        repoRootDir: REPO_ROOT
      });
      const remotePublicSlip = evaluatePushJudgment({
        targetRing: TARGET_RINGS.RING_2_PUBLIC_BRANCH,
        branchName: 'actuation/antigravity/fabricks-suite',
        upstreamWaveLag: 2,
        operatorExplicitWord: false,
        trinity: {
          authorize: ACTOR_CLASSES.OPERATOR,
          delegateA: 'NODE22_BUILDER',
          delegateB: 'RUST_STD_DELEGATE_B'
        },
        inverseRetreatOp: { name: 'DELETE_REMOTE_BRANCH' },
        repoRootDir: REPO_ROOT
      });
      console.log(
        JSON.stringify(
          {
            localBareSimVerdict: localSimSlip.verdict,
            remotePublicWithoutOperatorWordVerdict: remotePublicSlip.verdict
          },
          null,
          2
        )
      );
      return 0;
    }

    case 'return-composite': {
      const poly = verifyThreeWayPolyglotParity(20261125, REPO_ROOT);
      const built = buildBackToSelfReturnComposite(REPO_ROOT, {
        polyglotProof: poly,
        createdAt: '2026-11-25T19:20:00.000Z'
      });
      const admission = admitReturnComposite(REPO_ROOT, path.dirname(built.manifestPath));
      console.log(
        JSON.stringify(
          {
            ok: admission.admitted,
            bundleFile: path.relative(REPO_ROOT, built.bundlePath),
            bundleBytes: built.manifest.bundleBytes,
            bundleSha256: built.manifest.bundleSha256,
            admission
          },
          null,
          2
        )
      );
      return admission.admitted ? 0 : 1;
    }

    case 'test-push-sim': {
      const report = runLocalTestPushSimulation(REPO_ROOT);
      console.log(JSON.stringify(report, null, 2));
      return report.ok ? 0 : 1;
    }

    case 'compile-skills': {
      const compiler = new VerifiedTraceSkillCompiler();
      const graph = compiler.compileSkillsDirectory(path.join(REPO_ROOT, 'skills'), REPO_ROOT);
      console.log(JSON.stringify(graph, null, 2));
      return graph.compiledCount > 0 ? 0 : 1;
    }

    case 'audit-sentinel': {
      const sentinel = new PublicationBoundarySentinel();
      const report = sentinel.scanDirectory(REPO_ROOT);
      console.log(JSON.stringify(report, null, 2));
      return report.clean ? 0 : 1;
    }

    case 'ip-ledger': {
      const ledgerPath = path.join(REPO_ROOT, 'specs', 'background-ip-ledger.json');
      if (argv.includes('--write') || !fs.existsSync(ledgerPath)) {
        const ledger = generateBackgroundIpLedger(REPO_ROOT, {
          generatedAt: '2026-11-25T19:00:00.000Z'
        });
        fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
        console.log(
          JSON.stringify(
            {
              ok: true,
              action: 'WRITTEN',
              moduleCount: ledger.moduleCount,
              ledgerSha256: ledger.ledgerSha256
            },
            null,
            2
          )
        );
        return 0;
      }
      const existing = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      const check = verifyBackgroundIpLedger(REPO_ROOT, existing);
      console.log(JSON.stringify({ ok: check.verified, ...check }, null, 2));
      return check.verified ? 0 : 1;
    }

    case 'cold-harness': {
      const replay = runColdHarnessReplay({ repoRootDir: REPO_ROOT });
      console.log(JSON.stringify(replay, null, 2));
      return replay.verdict === 'COLD_PASS' ? 0 : 1;
    }

    default:
      console.error(
        `Unknown emf command "${cmd}". Available: status, vsa, reconstruct, channel-echo, capsule, translate, coa, polyglot, push-judgment, return-composite, test-push-sim, compile-skills, audit-sentinel, ip-ledger, cold-harness`
      );
      return 1;
  }
}

const code = runCli();
process.exit(code);
