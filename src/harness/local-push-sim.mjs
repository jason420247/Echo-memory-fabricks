/**
 * Wave 8 — Offline Local Bare-Remote Test-Push Harness & Server-Side Pre-Receive Hook
 *
 * Simulates a full Git remote push workflow 100% inside this VM (zero network traffic,
 * leaving real GitHub `origin` completely untouched):
 *   1. Initializes `.emf-local/remotes/ring2-public-sim.git` (`git init --bare`).
 *   2. Installs an executable `hooks/pre-receive` gate enforcing branch namespaces and
 *      scanning incoming Git tree blobs through `PublicationBoundarySentinel`.
 *   3. Runs an adversarial negative-control push containing a simulated leak -> proves
 *      the bare remote `pre-receive` hook REJECTS the push cleanly.
 *   4. Evaluates the 6-Gauge `PushJudgmentRouter` (`ALLOW_LOCAL_SIM`) and pushes the
 *      verified local actuation branch -> proves clean acceptance & emits an In-VM Review Dossier.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTOR_CLASSES, canonicalJson, sha256Hex } from '../actuation/index.mjs';
import { PUSH_VERDICTS, TARGET_RINGS, evaluatePushJudgment } from '../judgment/index.mjs';
import { verifyThreeWayPolyglotParity } from '../multitrack/index.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function buildPreReceiveHookScript(sentinelModulePath) {
  return `#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { PublicationBoundarySentinel, validateActuationBranch } from ${JSON.stringify(sentinelModulePath)};

const input = fs.readFileSync(0, 'utf8').trim();
if (!input) process.exit(0);

const sentinel = new PublicationBoundarySentinel();

for (const line of input.split(/\\r?\\n/)) {
  const [oldSha, newSha, refName] = line.trim().split(/\\s+/);
  if (!refName || /^0+$/.test(newSha)) continue;

  const shortBranch = refName.replace(/^refs\\/heads\\//, '');
  const branchCheck = validateActuationBranch(shortBranch, {
    allowOperatorTrunk: process.env.EMF_OPERATOR_TRUNK_OVERRIDE === '1',
    actorClass: process.env.EMF_OPERATOR_TRUNK_OVERRIDE === '1' ? 'OPERATOR' : 'ANTIGRAVITY_VM'
  });
  if (!branchCheck.valid) {
    console.error('[PRE-RECEIVE REJECTED] Branch namespace violation:', branchCheck.reason);
    process.exit(1);
  }

  const treeLines = execFileSync('git', ['ls-tree', '-r', newSha], { encoding: 'utf8' })
    .trim()
    .split(/\\r?\\n/)
    .filter(Boolean);

  for (const entry of treeLines) {
    const tabIdx = entry.indexOf('\\t');
    const meta = entry.slice(0, tabIdx).split(/\\s+/);
    const filePath = entry.slice(tabIdx + 1);
    const blobSha = meta[2];
    const buf = execFileSync('git', ['cat-file', '-p', blobSha]);
    if (buf.includes(0)) continue;
    const scan = sentinel.scanText(buf.toString('utf8'), filePath);
    if (!scan.clean) {
      console.error(
        '[PRE-RECEIVE SENTINEL REJECTED]',
        filePath,
        scan.violations.map((v) => v.ruleId).join(',')
      );
      process.exit(1);
    }
  }
}
console.error('[PRE-RECEIVE SENTINEL PASS] Incoming tree verified RELEASE-clean.');
process.exit(0);
`;
}

export function runLocalTestPushSimulation(repoRootDir = REPO_ROOT) {
  const remotesDir = path.join(repoRootDir, '.emf-local', 'remotes');
  const bareRepoDir = path.join(remotesDir, 'ring2-public-sim.git');
  fs.rmSync(bareRepoDir, { recursive: true, force: true });
  fs.mkdirSync(bareRepoDir, { recursive: true });

  execFileSync('git', ['init', '--bare', '--initial-branch=main', bareRepoDir], {
    stdio: 'pipe'
  });

  // Seed bare remote `main` with initial baseline commit (60cec25) if present, else current main
  execFileSync('git', ['push', bareRepoDir, 'main:refs/heads/main'], {
    cwd: repoRootDir,
    env: { ...process.env, EMF_OPERATOR_TRUNK_OVERRIDE: '1' },
    stdio: 'pipe'
  });

  // Install live pre-receive hook AFTER seeding baseline main
  const sentinelModPath = path.join(repoRootDir, 'src', 'actuation', 'index.mjs');
  const hookPath = path.join(bareRepoDir, 'hooks', 'pre-receive');
  fs.writeFileSync(hookPath, buildPreReceiveHookScript(sentinelModPath), { mode: 0o755 });

  // 1. Adversarial negative-control test push from an isolated temporary clone
  const scratchClone = fs.mkdtempSync(path.join(os.tmpdir(), 'emf-push-probe-'));
  let adversarialBlocked = false;
  let adversarialHookMessage = '';
  try {
    execFileSync('git', ['clone', '--quiet', bareRepoDir, scratchClone], { stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Probe Runner'], { cwd: scratchClone });
    execFileSync('git', ['config', 'user.email', 'probe@example.invalid'], { cwd: scratchClone });
    execFileSync('git', ['checkout', '-b', 'actuation/antigravity/leak-probe'], {
      cwd: scratchClone,
      stdio: 'pipe'
    });
    const leakyPayload = JSON.stringify({
      publicationTier: 'HOLD_PRIVATE',
      leakedHostFile: 'D' + ':\\\\Private_Vault\\\\secret.json'
    });
    fs.writeFileSync(path.join(scratchClone, 'accidental-leak.json'), leakyPayload, 'utf8');
    execFileSync('git', ['add', 'accidental-leak.json'], { cwd: scratchClone });
    execFileSync('git', ['commit', '-m', 'test: adversarial leak probe'], {
      cwd: scratchClone,
      stdio: 'pipe'
    });

    const probePush = spawnSync(
      'git',
      ['push', bareRepoDir, 'actuation/antigravity/leak-probe'],
      { cwd: scratchClone, encoding: 'utf8' }
    );
    adversarialBlocked = probePush.status !== 0;
    adversarialHookMessage = (probePush.stderr || '').trim();
  } finally {
    fs.rmSync(scratchClone, { recursive: true, force: true });
  }

  // 2. Evaluate 6-Gauge Push Judgment + 3-Way Polyglot Parity before clean push
  const currentBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: repoRootDir,
    encoding: 'utf8'
  }).trim();
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRootDir,
    encoding: 'utf8'
  }).trim();
  const originMainSha = execFileSync('git', ['rev-parse', 'origin/main'], {
    cwd: repoRootDir,
    encoding: 'utf8'
  }).trim();

  const polyglot = verifyThreeWayPolyglotParity(20261125, repoRootDir);
  const pushSlip = evaluatePushJudgment({
    targetRing: TARGET_RINGS.LOCAL_BARE_SIM,
    branchName: currentBranch.startsWith('actuation/')
      ? currentBranch
      : 'actuation/antigravity/fabricks-suite',
    upstreamWaveLag: 2,
    tensionScore: 15,
    trinity: {
      authorize: ACTOR_CLASSES.OPERATOR,
      delegateA: 'ANTIGRAVITY_VM_NODE22',
      delegateB: 'RUST_STD_DELEGATE_B'
    },
    inverseRetreatOp: {
      name: 'DELETE_REMOTE_ACTUATION_REF',
      params: { remote: bareRepoDir, ref: currentBranch }
    },
    repoRootDir,
    evaluatedAt: '2026-11-25T19:15:00.000Z'
  });

  if (pushSlip.verdict !== PUSH_VERDICTS.ALLOW_LOCAL_SIM || !polyglot.agreed) {
    throw new Error(`LOCAL_TEST_PUSH_GATE_BLOCKED: ${pushSlip.verdict}`);
  }

  const targetRef = currentBranch.startsWith('actuation/')
    ? `refs/heads/${currentBranch}`
    : 'refs/heads/actuation/antigravity/fabricks-suite';

  const cleanPush = spawnSync('git', ['push', bareRepoDir, `HEAD:${targetRef}`], {
    cwd: repoRootDir,
    encoding: 'utf8'
  });
  const cleanAccepted = cleanPush.status === 0;
  const remoteVerifiedSha = cleanAccepted
    ? execFileSync('git', ['rev-parse', targetRef], {
        cwd: bareRepoDir,
        encoding: 'utf8'
      }).trim()
    : null;

  const diffStatSummary = execFileSync('git', ['diff', '--shortstat', 'main..HEAD'], {
    cwd: repoRootDir,
    encoding: 'utf8'
  }).trim();

  const dossierBody = {
    ok: adversarialBlocked && cleanAccepted && remoteVerifiedSha === headSha,
    mode: 'IN_VM_LOCAL_BARE_REMOTE_SIMULATION',
    githubOriginTouched: false,
    githubOriginMainSha: originMainSha,
    simulatedRemotePath: '.emf-local/remotes/ring2-public-sim.git',
    adversarialNegativeControl: {
      blockedByPreReceiveHook: adversarialBlocked,
      hookExcerpt: adversarialHookMessage.split('\n').slice(0, 4).join(' | ')
    },
    cleanActuationPush: {
      accepted: cleanAccepted,
      pushedRef: targetRef,
      localHeadSha: headSha,
      remoteRefSha: remoteVerifiedSha,
      diffShortStatVsMain: diffStatSummary
    },
    polyglotTriadConsensus: polyglot,
    pushRoutingSlip: pushSlip
  };

  return {
    ...dossierBody,
    reviewDossierSha256: sha256Hex(canonicalJson(dossierBody))
  };
}
