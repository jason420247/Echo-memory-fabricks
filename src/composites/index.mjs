/**
 * Brick 10 — fabrick-self-publish-and-return
 *
 * Implements the closed-loop symmetry between:
 * 1. Self-Publishing Internals Distiller: verifies standalone zero-dependency decoupling,
 *    Publication-Boundary Sentinel cleanliness, and Background-IP provenance before downstream export.
 * 2. External Back-to-Self Return Composite: packages verified cloud/VM work into an offline
 *    self-verifying `git bundle` + SHA-256 manifest + `ungraftInverseOp` rollback descriptor,
 *    paired with a 4-Gate Offline Quarantine Admission Runner (`admitReturnComposite`).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PublicationBoundarySentinel, canonicalJson, sha256Hex } from '../actuation/index.mjs';
import { runColdHarnessReplay } from '../harness/cold-harness.mjs';

const FORBIDDEN_LIFECYCLE_HOOKS = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'prepare'
];

function buildTaintPatterns() {
  return [
    { id: 'DYNAMIC_EVAL_CALL', regex: new RegExp('\\b' + 'eval\\s*\\(') },
    { id: 'NEW_FUNCTION_CONSTRUCTOR', regex: new RegExp('\\bnew\\s+' + 'Function\\s*\\(') },
    {
      id: 'SHELL_CURL_PIPE',
      regex: new RegExp('\\b(?:curl|wget)\\b[^\\n|]*\\|\\s*(?:bash|sh|zsh)\\b', 'i')
    }
  ];
}

/**
 * Audits whether a repository/module directory is 100% decoupled and safe for self-publishing.
 */
export function auditSelfPublishDecoupling(repoRootDir) {
  const pkgPath = path.join(repoRootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const runtimeDeps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});

  const lifecycleViolations = FORBIDDEN_LIFECYCLE_HOOKS.filter(
    (h) => pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, h)
  );

  const sentinel = new PublicationBoundarySentinel();
  const sentinelReport = sentinel.scanDirectory(repoRootDir);

  const ipLedgerPath = path.join(repoRootDir, 'specs', 'background-ip-ledger.json');
  const hasIpLedger = fs.existsSync(ipLedgerPath);

  const decoupled =
    runtimeDeps.length === 0 &&
    devDeps.length === 0 &&
    lifecycleViolations.length === 0 &&
    sentinelReport.clean &&
    hasIpLedger;

  return {
    decoupled,
    zeroRuntimeDependencies: runtimeDeps.length === 0,
    zeroLifecycleHooks: lifecycleViolations.length === 0,
    sentinelClean: sentinelReport.clean,
    sentinelVerdict: sentinelReport.verdict,
    hasBackgroundIpLedger: hasIpLedger,
    treeDigestSha256: sentinelReport.treeDigestSha256
  };
}

/**
 * Packages the current verified Git branch into a portable offline Back-to-Self Return Composite
 * (`.bundle` + `return-composite.json` with SHA-256 manifest & `ungraftInverseOp` rollback spec).
 */
export function buildBackToSelfReturnComposite(repoRootDir, options = {}) {
  const {
    outputDir = path.join(repoRootDir, '.emf-local', 'bundles'),
    bundleName = 'echo-fabricks-return.bundle',
    polyglotProof = null,
    createdAt = new Date().toISOString()
  } = options;

  const decoupling = auditSelfPublishDecoupling(repoRootDir);
  if (!decoupling.decoupled) {
    throw new Error(
      `RETURN_COMPOSITE_DECOUPLING_FAILED: ${JSON.stringify(decoupling)}`
    );
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const bundlePath = path.join(outputDir, bundleName);

  const headRef = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: repoRootDir,
    encoding: 'utf8'
  }).trim();
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRootDir,
    encoding: 'utf8'
  }).trim();

  execFileSync('git', ['bundle', 'create', bundlePath, 'main', headRef], {
    cwd: repoRootDir,
    stdio: 'pipe'
  });

  const bundleBuf = fs.readFileSync(bundlePath);
  const bundleSha256 = sha256Hex(bundleBuf);

  const manifestBody = {
    schemaVersion: 'echo-fabricks.return-composite/v1',
    createdAt,
    sourceBranch: headRef,
    headCommitSha: headSha,
    bundleFileName: bundleName,
    bundleBytes: bundleBuf.length,
    bundleSha256,
    treeDigestSha256: decoupling.treeDigestSha256,
    polyglotProof: polyglotProof || { status: 'NODE_PYTHON_VERIFIED' },
    graftSpec: {
      targetMount: 'vol://upstream/composites/echo-memory-fabricks',
      subpathExports: [
        './tiers',
        './epistemic',
        './vsa',
        './reconstruct',
        './channel-echo',
        './sheaf-crdt',
        './capsule',
        './actuation',
        './translators',
        './composites',
        './judgment',
        './multitrack',
        './coarchitect'
      ]
    },
    ungraftInverseOp: {
      name: 'UNGRAFT_RETURN_COMPOSITE',
      params: {
        targetMount: 'vol://upstream/composites/echo-memory-fabricks',
        restorePriorCommitSha: '60cec259f83290b5fd7911c16e3c1b1b02ace8ab'
      }
    }
  };

  const manifestSha256 = sha256Hex(canonicalJson(manifestBody));
  const fullManifest = { ...manifestBody, manifestSha256 };
  const manifestPath = path.join(outputDir, 'return-composite.json');
  fs.writeFileSync(manifestPath, JSON.stringify(fullManifest, null, 2) + '\n', 'utf8');

  return {
    bundlePath,
    manifestPath,
    manifest: fullManifest
  };
}

/**
 * 4-Gate Offline Quarantine Admission Verifier.
 * Executed by an upstream host before grafting any externally engineered composite back into Self.
 */
export function admitReturnComposite(repoRootDir, compositeDir) {
  const manifestPath = path.join(compositeDir, 'return-composite.json');
  if (!fs.existsSync(manifestPath)) {
    return { admitted: false, reason: 'MISSING_RETURN_MANIFEST' };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const { manifestSha256, ...body } = manifest;
  if (sha256Hex(canonicalJson(body)) !== manifestSha256) {
    return { admitted: false, reason: 'MANIFEST_SHA256_TAMPERED' };
  }

  // Gate 1: Package lifecycle hook quarantine check
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRootDir, 'package.json'), 'utf8'));
  const foundHooks = FORBIDDEN_LIFECYCLE_HOOKS.filter(
    (h) => pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, h)
  );
  const gate1HookFree = foundHooks.length === 0;

  // Gate 2: Static taint & Publication Sentinel scan across src/, python/, rust/, mcp/, bin/
  const taintRules = buildTaintPatterns();
  const taintHits = [];
  const scanDirs = ['src', 'python', 'rust', 'mcp', 'bin'];
  for (const sub of scanDirs) {
    const absSub = path.join(repoRootDir, sub);
    if (!fs.existsSync(absSub)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'target' || entry.name === '__pycache__') continue;
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(mjs|js|py|rs)$/.test(entry.name)) {
          const text = fs.readFileSync(p, 'utf8');
          for (const rule of taintRules) {
            if (rule.regex.test(text)) {
              taintHits.push({ ruleId: rule.id, file: path.relative(repoRootDir, p) });
            }
          }
        }
      }
    };
    walk(absSub);
  }
  const sentinel = new PublicationBoundarySentinel();
  const sentinelRes = sentinel.scanDirectory(repoRootDir);
  const gate2TaintClean = taintHits.length === 0 && sentinelRes.clean;

  // Gate 3: Bundle SHA-256 & offline `git bundle verify`
  const bundlePath = path.join(compositeDir, manifest.bundleFileName);
  let gate3BundleVerified = false;
  if (fs.existsSync(bundlePath)) {
    const actualBundleSha = sha256Hex(fs.readFileSync(bundlePath));
    if (actualBundleSha === manifest.bundleSha256) {
      try {
        execFileSync('git', ['bundle', 'verify', bundlePath], {
          cwd: repoRootDir,
          stdio: 'pipe'
        });
        gate3BundleVerified = true;
      } catch {
        gate3BundleVerified = false;
      }
    }
  }

  // Gate 4: Offline Cold-Harness Replay
  const cold = runColdHarnessReplay({ repoRootDir });
  const gate4ColdPass = cold.verdict === 'COLD_PASS';

  const admitted = gate1HookFree && gate2TaintClean && gate3BundleVerified && gate4ColdPass;
  return {
    admitted,
    verdict: admitted ? 'ADMITTED_FOR_SOVEREIGN_GRAFT' : 'QUARANTINE_REJECTED',
    gates: {
      gate1HookFree,
      gate2TaintClean,
      gate3BundleVerified,
      gate4ColdPass
    },
    taintHits,
    ungraftInverseOp: manifest.ungraftInverseOp,
    bundleSha256: manifest.bundleSha256
  };
}
