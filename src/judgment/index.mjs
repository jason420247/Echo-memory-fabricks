/**
 * Brick 11 — fabrick-push-pull-judgment
 *
 * Deterministic Push & Pull Meta-Decision & Judgment Router:
 * 1. Outbound `evaluatePushJudgment`: 6-gauge routing slip enforcing Target Ring,
 *    Publication-Boundary Sentinel, Upstream Wave-Lag (>= 1), Alpha/Beta/Gamma
 *    blast-radius + perception-timing + tension escalation, Trinity Delegation
 *    (1 AUTHORIZE + 2 distinct DELEGATES), and Inverse Retreat Readiness.
 * 2. Inbound `evaluatePullJudgment`: Assimilation quarantine scanning for Indirect
 *    Prompt Injection (IPI), unpinned CI Actions, package lifecycle hooks, actor
 *    ambiguities, and Belnap-Dunn BOTH concurrent claim conflicts.
 */

import {
  ACTOR_CLASSES,
  PublicationBoundarySentinel,
  canonicalJson,
  resolveActorClass,
  sha256Hex,
  validateActuationBranch
} from '../actuation/index.mjs';
import { BELNAP } from '../epistemic/index.mjs';

export const TARGET_RINGS = Object.freeze({
  LOCAL_BARE_SIM: 'LOCAL_BARE_SIM',
  RING_1_PRIVATE: 'RING_1_PRIVATE',
  RING_2_PUBLIC_BRANCH: 'RING_2_PUBLIC_BRANCH',
  RING_2_PUBLIC_TRUNK: 'RING_2_PUBLIC_TRUNK'
});

export const PUSH_VERDICTS = Object.freeze({
  ALLOW_LOCAL_SIM: 'ALLOW_LOCAL_SIM',
  STAGE_AWAITING_OPERATOR_WORD: 'STAGE_AWAITING_OPERATOR_WORD',
  ALLOW_OPERATOR_AUTHORIZED: 'ALLOW_OPERATOR_AUTHORIZED',
  DENY_BOUNDARY_OR_TRINITY: 'DENY_BOUNDARY_OR_TRINITY'
});

/**
 * Evaluates all 6 outbound push governance gauges and emits a SHA-256 signed Push Routing Slip.
 */
export function evaluatePushJudgment({
  targetRing,
  branchName,
  upstreamWaveLag = 1,
  tensionScore = 15,
  trinity = null,
  inverseRetreatOp = null,
  gammaContext = null,
  operatorExplicitWord = false,
  repoRootDir = null,
  textPayload = null,
  evaluatedAt = new Date().toISOString()
}) {
  const reasons = [];

  if (!Object.prototype.hasOwnProperty.call(TARGET_RINGS, targetRing)) {
    throw new Error(`UNKNOWN_TARGET_RING: "${targetRing}"`);
  }

  // Gauge 1: Branch & Trunk Guard
  const branchCheck = validateActuationBranch(branchName, {
    allowOperatorTrunk:
      operatorExplicitWord && targetRing === TARGET_RINGS.RING_2_PUBLIC_TRUNK,
    actorClass: operatorExplicitWord ? ACTOR_CLASSES.OPERATOR : ACTOR_CLASSES.ANTIGRAVITY_VM
  });
  const gauge1BranchValid = branchCheck.valid;
  if (!gauge1BranchValid) {
    reasons.push(`GAUGE1_BRANCH:${branchCheck.reason}`);
  }

  // Gauge 2: Publication-Boundary Sentinel
  const sentinel = new PublicationBoundarySentinel();
  const scan = repoRootDir
    ? sentinel.scanDirectory(repoRootDir)
    : sentinel.scanText(textPayload || '');
  const isPublicRoute =
    targetRing === TARGET_RINGS.RING_2_PUBLIC_BRANCH ||
    targetRing === TARGET_RINGS.RING_2_PUBLIC_TRUNK;
  const gauge2SentinelOk = isPublicRoute ? scan.clean : true;
  if (!gauge2SentinelOk) {
    reasons.push(
      `GAUGE2_SENTINEL:${scan.violations.map((v) => v.ruleId).join(',')}`
    );
  }

  // Gauge 3: Upstream Wave-Lag Lead-Time Buffer (keep Ring 0 >= 1 wave ahead of public)
  const gauge3WaveLagOk = isPublicRoute ? upstreamWaveLag >= 1 : upstreamWaveLag >= 0;
  if (!gauge3WaveLagOk) {
    reasons.push('GAUGE3_WAVE_LAG_INSUFFICIENT_FOR_PUBLIC_EXPORT');
  }

  // Gauge 4: Blast-Radius Tier (ALPHA / BETA / GAMMA), Tension Bias & Perception-Timing
  let blastTier = 'ALPHA';
  if (targetRing === TARGET_RINGS.RING_1_PRIVATE || targetRing === TARGET_RINGS.RING_2_PUBLIC_BRANCH) {
    blastTier = 'BETA';
  } else if (targetRing === TARGET_RINGS.RING_2_PUBLIC_TRUNK) {
    blastTier = 'GAMMA';
  }

  let gauge4GammaFieldsOk = true;
  if (blastTier === 'GAMMA') {
    if (
      !gammaContext ||
      !gammaContext.valueAtRisk ||
      !gammaContext.tailLossLocality ||
      !gammaContext.perceptionTiming
    ) {
      gauge4GammaFieldsOk = false;
      reasons.push('GAUGE4_GAMMA_REQUIRES_VALUE_AT_RISK_TAIL_LOSS_AND_PERCEPTION_TIMING');
    }
  }

  // Gauge 5: Trinity Command Attestation (AUTHORIZE + DELEGATE_A + DELEGATE_B with distinct delegates)
  const gauge5TrinityOk = Boolean(
    trinity &&
      trinity.authorize &&
      trinity.delegateA &&
      trinity.delegateB &&
      trinity.delegateA !== trinity.delegateB
  );
  if (!gauge5TrinityOk) {
    reasons.push('GAUGE5_TRINITY_REQUIRES_AUTHORIZE_AND_TWO_DISTINCT_DELEGATES');
  }

  // Gauge 6: Inverse / Retreat Valve Readiness
  const gauge6RetreatOk = Boolean(inverseRetreatOp && inverseRetreatOp.name);
  if (!gauge6RetreatOk) {
    reasons.push('GAUGE6_MISSING_INVERSE_RETREAT_OP');
  }

  const allTechnicalPass =
    gauge1BranchValid &&
    gauge2SentinelOk &&
    gauge3WaveLagOk &&
    gauge4GammaFieldsOk &&
    gauge5TrinityOk &&
    gauge6RetreatOk;

  // Elevated tension (>= 25) or any remote ring requires explicit Operator Word
  const elevatedTension = tensionScore >= 25;
  const requiresOperatorWord =
    blastTier !== 'ALPHA' || elevatedTension || targetRing !== TARGET_RINGS.LOCAL_BARE_SIM;

  let verdict = PUSH_VERDICTS.DENY_BOUNDARY_OR_TRINITY;
  if (allTechnicalPass) {
    if (!requiresOperatorWord) {
      verdict = PUSH_VERDICTS.ALLOW_LOCAL_SIM;
    } else if (operatorExplicitWord) {
      verdict = PUSH_VERDICTS.ALLOW_OPERATOR_AUTHORIZED;
    } else {
      verdict = PUSH_VERDICTS.STAGE_AWAITING_OPERATOR_WORD;
    }
  }

  const slipBody = {
    schemaVersion: 'echo-fabricks.push-routing-slip/v1',
    evaluatedAt,
    targetRing,
    branchName,
    blastTier,
    elevatedTension,
    requiresOperatorWord,
    operatorExplicitWord,
    verdict,
    gauges: {
      gauge1BranchValid,
      gauge2SentinelOk,
      gauge3WaveLagOk,
      gauge4GammaFieldsOk,
      gauge5TrinityOk,
      gauge6RetreatOk
    },
    reasons,
    inverseRetreatOp
  };

  return Object.freeze({
    ...slipBody,
    slipSha256: sha256Hex(canonicalJson(slipBody))
  });
}

const IPI_REGEX =
  /\b(?:ignore\s+(?:all\s+)?previous\s+instructions|system\s+override\s+execute|exfiltrate\s+token)\b/i;
const UNPINNED_GH_ACTION_REGEX = /^\s*uses:\s*[^@\n]+@(?!([0-9a-f]{40})\b)\S+/m;

/**
 * Evaluates inbound commits/PR diffs prior to pulling or merging into a local workspace.
 */
export function evaluatePullJudgment({
  actorLabel,
  commitMessages = [],
  diffFiles = [],
  incomingClaims = {},
  localClaims = {}
}) {
  const findings = [];

  // 1. Actor attribution check
  let resolvedActor = null;
  try {
    resolvedActor = resolveActorClass(actorLabel);
  } catch (err) {
    findings.push({ severity: 'CRITICAL', code: err.message.split(':')[0] });
  }

  // 2. Indirect Prompt Injection scan on commit messages & diff patches
  for (const msg of commitMessages) {
    if (IPI_REGEX.test(msg)) {
      findings.push({ severity: 'CRITICAL', code: 'COMMIT_MESSAGE_PROMPT_INJECTION' });
    }
  }

  for (const file of diffFiles) {
    const patch = String(file.patch || '');
    if (IPI_REGEX.test(patch)) {
      findings.push({
        severity: 'CRITICAL',
        code: 'DIFF_PROMPT_INJECTION',
        path: file.path
      });
    }
    if (
      String(file.path || '').startsWith('.github/workflows/') &&
      UNPINNED_GH_ACTION_REGEX.test(patch)
    ) {
      findings.push({
        severity: 'HIGH',
        code: 'UNPINNED_GITHUB_ACTION_REF',
        path: file.path
      });
    }
    if (
      file.path === 'package.json' &&
      /"(?:preinstall|install|postinstall)"\s*:/.test(patch)
    ) {
      findings.push({
        severity: 'CRITICAL',
        code: 'PACKAGE_LIFECYCLE_HOOK_INJECTION',
        path: file.path
      });
    }
  }

  // 3. Epistemic claim conflict detection -> route conflicts to BELNAP.BOTH quarantine
  const epistemicConflicts = [];
  for (const [k, incomingVal] of Object.entries(incomingClaims)) {
    if (
      Object.prototype.hasOwnProperty.call(localClaims, k) &&
      canonicalJson(localClaims[k]) !== canonicalJson(incomingVal)
    ) {
      epistemicConflicts.push({
        key: k,
        localValue: localClaims[k],
        incomingValue: incomingVal,
        mergedEpistemic: BELNAP.BOTH
      });
    }
  }

  const hasCriticalOrHigh = findings.length > 0;
  let verdict = 'ADMIT_CLEAN_FAST_FORWARD';
  if (hasCriticalOrHigh) {
    verdict = 'BLOCK_QUARANTINE_SECURITY';
  } else if (epistemicConflicts.length > 0) {
    verdict = 'ROUTE_TO_BOTH_AMBIGUITY_BRANCH';
  }

  return {
    verdict,
    resolvedActor,
    findings,
    epistemicConflicts
  };
}
