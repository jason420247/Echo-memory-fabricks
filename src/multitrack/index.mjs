/**
 * Brick 12a — fabrick-multitrack & 3-Language Polyglot Triad Verifier
 *
 * Implements:
 * 1. Discrete S_3 (6-element symmetric group) parity-preserving Alpha/Beta/Gamma Phase Router.
 * 2. 3-Way Polyglot Triad Verification (`Node >=22` V8 + `Python 3.12 -S` + `Rust 1.100` pure-std).
 * 3. Dual-Track Controller:
 *    - Track A (`SPECULATIVE_GESTATION`): executes candidate mutations on an isolated state clone.
 *    - Track B (`POLYGLOT_VERIFIED_COMMIT`): verifies invariant & polyglot consensus before
 *      committing via `InverseCommitJournal`, or rolls back Track A cleanly with zero leakage.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChannelEchoKernel } from '../channel-echo/index.mjs';
import { encodeFbrkFrame, randomTernaryVector } from '../vsa/index.mjs';
import { sha256Hex } from '../actuation/index.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Discrete S_3 (6-element symmetric group on [ALPHA, BETA, GAMMA]) Phase Router.
 * Tracks group composition & permutation parity (+1 even / -1 odd) without discontinuous resets.
 */
const S3_ELEMENTS = Object.freeze({
  ID: { perm: [0, 1, 2], parity: 1 },
  ROT_POS: { perm: [1, 2, 0], parity: 1 },
  ROT_NEG: { perm: [2, 0, 1], parity: 1 },
  SWAP_AB: { perm: [1, 0, 2], parity: -1 },
  SWAP_BC: { perm: [0, 2, 1], parity: -1 },
  SWAP_AC: { perm: [2, 1, 0], parity: -1 }
});

const STRAND_NAMES = ['ALPHA', 'BETA', 'GAMMA'];

export class S3PhaseRouter {
  constructor() {
    this._currentPerm = [0, 1, 2];
    this._parity = 1;
    this._steps = 0;
  }

  applyGenerator(generatorName) {
    const g = S3_ELEMENTS[generatorName];
    if (!g) {
      throw new Error(`UNKNOWN_S3_GENERATOR: "${generatorName}"`);
    }
    this._currentPerm = g.perm.map((idx) => this._currentPerm[idx]);
    this._parity *= g.parity;
    this._steps += 1;
    return this.state();
  }

  state() {
    return {
      steps: this._steps,
      parity: this._parity,
      activeOrder: this._currentPerm.map((i) => STRAND_NAMES[i]),
      primaryStrand: STRAND_NAMES[this._currentPerm[0]]
    };
  }
}

/**
 * Compiles (if needed) the zero-crate pure-std Rust DELEGATE-B binary into `.emf-local/bin/`
 * and returns its executable path.
 */
export function ensureRustDelegateBinary(repoRootDir = REPO_ROOT) {
  const binDir = path.join(repoRootDir, '.emf-local', 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const binPath = path.join(binDir, process.platform === 'win32' ? 'echo_fabricks_rs.exe' : 'echo_fabricks_rs');
  const srcPath = path.join(repoRootDir, 'rust', 'echo_fabricks_rs', 'src', 'main.rs');

  const needsBuild =
    !fs.existsSync(binPath) ||
    fs.statSync(srcPath).mtimeMs > fs.statSync(binPath).mtimeMs;

  if (needsBuild) {
    execFileSync('rustc', ['--edition=2021', '-O', srcPath, '-o', binPath], {
      cwd: repoRootDir,
      stdio: 'pipe'
    });
  }
  return binPath;
}

/**
 * Runs a live 3-Language Polyglot Parity check across Node.js (V8), Python (-S), and Rust (LLVM std).
 */
export function verifyThreeWayPolyglotParity(seed = 20261125, repoRootDir = REPO_ROOT) {
  const pyScript = path.join(repoRootDir, 'python', 'echo_fabricks', 'core.py');
  const rustBin = ensureRustDelegateBinary(repoRootDir);

  const pyOut = JSON.parse(
    execFileSync('python3', ['-S', pyScript, '--parity-seed', String(seed)], {
      encoding: 'utf8'
    })
  );
  const rustOut = JSON.parse(
    execFileSync(rustBin, ['--parity-seed', String(seed)], {
      encoding: 'utf8'
    })
  );

  const jsTrits = Array.from(randomTernaryVector(128, seed, 0.15));
  const jsFrame = encodeFbrkFrame(jsTrits);
  const jsFrameHex = jsFrame.toString('hex');
  const jsFrameSha = sha256Hex(jsFrame);

  const jsKernel = new ChannelEchoKernel();
  const stream = [0.1, -0.2, 0.15, -0.05, 0.12, -0.18, 0.09, -0.11, 3.4, -2.9, 2.5, -2.1];
  const jsFinal = stream.map((rawZ) => jsKernel.stepObserver('obs-parity', { rawZ })).at(-1);

  const tritsMatch =
    JSON.stringify(jsTrits) === JSON.stringify(pyOut.trits) &&
    JSON.stringify(jsTrits) === JSON.stringify(rustOut.trits);
  const fbrkHexMatch = jsFrameHex === pyOut.fbrkHex && jsFrameHex === rustOut.fbrkHex;
  const shaMatch = jsFrameSha === pyOut.fbrkSha256 && jsFrameSha === rustOut.fbrkSha256;
  const kernelMatch =
    jsFinal.engaged === pyOut.kernelFinal.engaged &&
    jsFinal.engaged === rustOut.kernelFinal.engaged &&
    Math.abs(jsFinal.lambda - pyOut.kernelFinal.lambda) < 1e-12 &&
    Math.abs(jsFinal.lambda - rustOut.kernelFinal.lambda) < 1e-12 &&
    Math.abs(jsFinal.zTilde - pyOut.kernelFinal.zTilde) < 1e-12 &&
    Math.abs(jsFinal.zTilde - rustOut.kernelFinal.zTilde) < 1e-12 &&
    Math.abs(jsFinal.dStat - pyOut.kernelFinal.dStat) < 1e-12 &&
    Math.abs(jsFinal.dStat - rustOut.kernelFinal.dStat) < 1e-12;

  const allAgreed = tritsMatch && fbrkHexMatch && shaMatch && kernelMatch;
  return {
    agreed: allAgreed,
    seed,
    runtimes: ['node_v8_esm', 'python_cpython_minus_S', 'rust_llvm_std_only'],
    sharedFbrkSha256: jsFrameSha,
    checks: {
      tritsMatch,
      fbrkHexMatch,
      shaMatch,
      kernelMatch
    }
  };
}

/**
 * Dual-Track Speculative / Polyglot-Verified Execution Controller.
 */
export class DualTrackController {
  constructor({ journal, repoRootDir = REPO_ROOT } = {}) {
    if (!journal) {
      throw new Error('DUAL_TRACK_REQUIRES_INVERSE_COMMIT_JOURNAL');
    }
    this.journal = journal;
    this.repoRootDir = repoRootDir;
    this.phaseRouter = new S3PhaseRouter();
  }

  /**
   * Executes `speculativeFn(clonedState)` on Track A (Gestation Sandbox),
   * then runs `verifierFn(candidateState)` + optional 3-language polyglot oracle on Track B.
   * Commits via InverseCommitJournal iff Track B passes; otherwise discards Track A with 0 canonical drift.
   */
  executeDualTrack({
    canonicalState,
    forwardOp,
    inverseOp,
    speculativeFn,
    verifierFn = () => ({ ok: true }),
    phaseGenerator = 'ROT_POS',
    requirePolyglotTriad = false,
    polyglotSeed = 20261125,
    timestamp = new Date().toISOString()
  }) {
    const phase = this.phaseRouter.applyGenerator(phaseGenerator);

    // Track A: Isolated gestation clone (canonicalState is never mutated in place)
    const gestationClone = structuredClone(canonicalState);
    const candidateState = speculativeFn(gestationClone);

    // Track B: Strong verified commit gate
    const customVerify = verifierFn(candidateState);
    const polyglotVerify = requirePolyglotTriad
      ? verifyThreeWayPolyglotParity(polyglotSeed, this.repoRootDir)
      : { agreed: true, skipped: true };

    if (!customVerify.ok || !polyglotVerify.agreed) {
      return {
        committed: false,
        trackOutcome: 'TRACK_A_DISCARDED_ZERO_LEAKAGE',
        phase,
        canonicalState,
        rejectionReason: !customVerify.ok
          ? customVerify.reason || 'VERIFIER_REJECTED'
          : 'POLYGLOT_TRIAD_DIVERGENCE'
      };
    }

    const commit = this.journal.commit({
      forwardOp,
      inverseOp,
      preState: canonicalState,
      postState: candidateState,
      timestamp
    });

    return {
      committed: true,
      trackOutcome: 'TRACK_B_VERIFIED_COMMIT',
      phase,
      commit,
      canonicalState: candidateState,
      polyglotVerify
    };
  }
}
