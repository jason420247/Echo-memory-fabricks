/**
 * Brick 2 — fabrick-epistemic
 *
 * Implements the exact Belnap-Dunn Four-Valued Bilattice (TRUE, FALSE, NEITHER, BOTH),
 * ECE/Brier epistemic calibration tracking, extensible Scope Compartments with
 * mandatory deferral reason + re-date heartbeats, and the Inverse-Naming Commit
 * Journal (every state mutation pre-declares its explicit inverse rollback operator).
 */

import { canonicalJson, sha256Hex } from '../actuation/index.mjs';

export const BELNAP = Object.freeze({
  TRUE: 'TRUE', // {1}   — verified true
  FALSE: 'FALSE', // {0}   — verified false / refuted
  NEITHER: 'NEITHER', // {}    — Omega: unknown / pending fill (prevents confabulation)
  BOTH: 'BOTH' // {0,1} — Bot: conflicting evidence (quarantined without explosion)
});

const TRUTH_SUPPORT = Object.freeze({
  [BELNAP.NEITHER]: Object.freeze({ t: false, f: false }),
  [BELNAP.TRUE]: Object.freeze({ t: true, f: false }),
  [BELNAP.FALSE]: Object.freeze({ t: false, f: true }),
  [BELNAP.BOTH]: Object.freeze({ t: true, f: true })
});

function fromSupport(t, f) {
  if (t && f) return BELNAP.BOTH;
  if (t) return BELNAP.TRUE;
  if (f) return BELNAP.FALSE;
  return BELNAP.NEITHER;
}

export function assertBelnap(v) {
  if (!Object.prototype.hasOwnProperty.call(TRUTH_SUPPORT, v)) {
    throw new Error(`INVALID_BELNAP_VALUE: "${v}"`);
  }
  return v;
}

/**
 * Truth-negation (~): swaps support-for-true and support-for-false.
 * Crucially: ~NEITHER = NEITHER and ~BOTH = BOTH (non-explosive paraconsistency).
 */
export function belnapNegate(a) {
  const s = TRUTH_SUPPORT[assertBelnap(a)];
  return fromSupport(s.f, s.t);
}

/**
 * Truth-ordering meet (a AND_t b): true iff both support true; false if either supports false.
 */
export function belnapTruthMeet(a, b) {
  const sa = TRUTH_SUPPORT[assertBelnap(a)];
  const sb = TRUTH_SUPPORT[assertBelnap(b)];
  return fromSupport(sa.t && sb.t, sa.f || sb.f);
}

/**
 * Truth-ordering join (a OR_t b): true if either supports true; false iff both support false.
 */
export function belnapTruthJoin(a, b) {
  const sa = TRUTH_SUPPORT[assertBelnap(a)];
  const sb = TRUTH_SUPPORT[assertBelnap(b)];
  return fromSupport(sa.t || sb.t, sa.f && sb.f);
}

/**
 * Knowledge/Information-ordering join (a OPLUS_k b — Evidence Merge):
 * Combines independent evidence without silent overwrite.
 * Merging TRUE and FALSE produces BOTH (explicit discovered contradiction).
 */
export function belnapKnowledgeMerge(a, b) {
  const sa = TRUTH_SUPPORT[assertBelnap(a)];
  const sb = TRUTH_SUPPORT[assertBelnap(b)];
  return fromSupport(sa.t || sb.t, sa.f || sb.f);
}

/**
 * Knowledge/Information-ordering meet (a OTIMES_k b — Conservative Consensus):
 * Retains only evidence agreed upon by both sources.
 */
export function belnapKnowledgeConsensus(a, b) {
  const sa = TRUTH_SUPPORT[assertBelnap(a)];
  const sb = TRUTH_SUPPORT[assertBelnap(b)];
  return fromSupport(sa.t && sb.t, sa.f && sb.f);
}

/**
 * Non-explosion check: in classical logic, (p AND ~p) implies arbitrary q.
 * In Belnap-Dunn FDE, entailment holds iff every valuation supporting premise truth supports conclusion truth;
 * BOTH never forces an unrelated NEITHER/FALSE proposition to become TRUE.
 */
export function belnapEntails(premise, conclusion) {
  const sp = TRUTH_SUPPORT[assertBelnap(premise)];
  const sc = TRUTH_SUPPORT[assertBelnap(conclusion)];
  // FDE consequence on atomic valuations: if premise has true-support, conclusion must have true-support.
  if (sp.t && !sc.t) {
    return false;
  }
  return true;
}

/**
 * Calibration Tracker computing Brier Score and Expected Calibration Error (ECE).
 */
export class EpistemicCalibrationTracker {
  constructor(numBins = 10) {
    this._numBins = numBins;
    this._samples = [];
  }

  record(predictedProbability, actualOutcomeBool) {
    if (
      typeof predictedProbability !== 'number' ||
      predictedProbability < 0 ||
      predictedProbability > 1
    ) {
      throw new Error('CALIBRATION_PROBABILITY_OUT_OF_RANGE');
    }
    this._samples.push({
      p: predictedProbability,
      y: actualOutcomeBool ? 1 : 0
    });
  }

  evaluate() {
    const n = this._samples.length;
    if (n === 0) {
      return { count: 0, brierScore: 0, ece: 0 };
    }
    let brierSum = 0;
    const bins = Array.from({ length: this._numBins }, () => ({ count: 0, pSum: 0, ySum: 0 }));
    for (const { p, y } of this._samples) {
      brierSum += (p - y) * (p - y);
      const idx = Math.min(this._numBins - 1, Math.floor(p * this._numBins));
      bins[idx].count += 1;
      bins[idx].pSum += p;
      bins[idx].ySum += y;
    }
    let ece = 0;
    for (const bin of bins) {
      if (bin.count > 0) {
        const avgConf = bin.pSum / bin.count;
        const avgAcc = bin.ySum / bin.count;
        ece += (bin.count / n) * Math.abs(avgConf - avgAcc);
      }
    }
    return {
      count: n,
      brierScore: Number((brierSum / n).toFixed(6)),
      ece: Number(ece.toFixed(6))
    };
  }
}

export const DEFAULT_SCOPES = Object.freeze([
  'scope:business-org',
  'scope:solution',
  'scope:need-to-do',
  'scope:need-to-defer',
  'scope:security',
  'scope:crypto',
  'scope:ip-protection',
  'scope:audio-intake',
  'scope:ideas-cues',
  'scope:architecture'
]);

/**
 * Directional Memory Scope Registry enforcing the re-date & reason law on deferred items.
 */
export class ScopeRegistry {
  constructor(initialScopes = DEFAULT_SCOPES) {
    this._scopes = new Set(initialScopes);
  }

  registerScope(scopeTag) {
    if (typeof scopeTag !== 'string' || !/^scope:[a-z0-9][a-z0-9-]*$/.test(scopeTag)) {
      throw new Error(`INVALID_SCOPE_FORMAT: "${scopeTag}" (expected "scope:<kebab-name>")`);
    }
    this._scopes.add(scopeTag);
    return scopeTag;
  }

  listScopes() {
    return [...this._scopes].sort();
  }

  validateTagging(scopes, metadata = {}) {
    if (!Array.isArray(scopes) || scopes.length === 0) {
      throw new Error('SCOPE_TAGS_REQUIRED: Provide at least one directional scope tag.');
    }
    const normalized = [];
    for (const s of scopes) {
      if (!this._scopes.has(s)) {
        throw new Error(`UNKNOWN_SCOPE_TAG: "${s}"`);
      }
      if (!normalized.includes(s)) {
        normalized.push(s);
      }
    }
    if (normalized.includes('scope:need-to-defer')) {
      const reason = metadata.deferralReason;
      const reDateAt = metadata.reDateAt;
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        throw new Error(
          'DEFERRAL_REASON_REQUIRED: scope:need-to-defer requires a non-empty deferralReason.'
        );
      }
      if (typeof reDateAt !== 'string' || Number.isNaN(Date.parse(reDateAt))) {
        throw new Error(
          'DEFERRAL_REDATE_REQUIRED: scope:need-to-defer requires a valid ISO-8601 reDateAt heartbeat.'
        );
      }
    }
    return normalized;
  }
}

/**
 * Inverse-Naming Commit Journal (QuFrame C1 discipline).
 * Every state commit pre-declares its inverse operator and links into a SHA-256 Merkle chain,
 * guaranteeing exact single-step or multi-step rollback.
 */
export class InverseCommitJournal {
  constructor() {
    this._genesisSha = sha256Hex('echo-memory-fabricks:genesis-0000');
    this._entries = [];
    this._inverseHandlers = new Map();
  }

  get headSha() {
    return this._entries.length === 0
      ? this._genesisSha
      : this._entries[this._entries.length - 1].commitSha;
  }

  get length() {
    return this._entries.length;
  }

  registerInverseHandler(inverseOpName, handlerFn) {
    if (typeof inverseOpName !== 'string' || inverseOpName.trim().length === 0) {
      throw new Error('INVERSE_HANDLER_NAME_REQUIRED');
    }
    if (typeof handlerFn !== 'function') {
      throw new Error('INVERSE_HANDLER_MUST_BE_FUNCTION');
    }
    this._inverseHandlers.set(inverseOpName, handlerFn);
  }

  commit({
    forwardOp,
    inverseOp,
    preState,
    postState,
    timestamp = new Date().toISOString()
  }) {
    if (!forwardOp || typeof forwardOp.name !== 'string' || forwardOp.name.trim().length === 0) {
      throw new Error('FORWARD_OP_NAME_REQUIRED');
    }
    if (!inverseOp || typeof inverseOp.name !== 'string' || inverseOp.name.trim().length === 0) {
      throw new Error(
        'INVERSE_NAMING_RULE_VIOLATION: Every commit must pre-declare an explicit inverseOp.name.'
      );
    }

    const preStateHash = sha256Hex(canonicalJson(preState));
    const postStateHash = sha256Hex(canonicalJson(postState));
    const parentCommitSha = this.headSha;

    const payload = {
      parentCommitSha,
      forwardOp: { name: forwardOp.name, params: forwardOp.params || {} },
      inverseOp: { name: inverseOp.name, params: inverseOp.params || {} },
      preStateHash,
      postStateHash,
      timestamp
    };
    const commitSha = sha256Hex(canonicalJson(payload));
    const entry = Object.freeze({ commitSha, ...payload });
    this._entries.push(entry);
    return entry;
  }

  verifyChain() {
    let expectedParent = this._genesisSha;
    for (let i = 0; i < this._entries.length; i += 1) {
      const e = this._entries[i];
      if (e.parentCommitSha !== expectedParent) {
        return { valid: false, brokenIndex: i, reason: 'PARENT_LINK_MISMATCH' };
      }
      const recomputed = sha256Hex(
        canonicalJson({
          parentCommitSha: e.parentCommitSha,
          forwardOp: e.forwardOp,
          inverseOp: e.inverseOp,
          preStateHash: e.preStateHash,
          postStateHash: e.postStateHash,
          timestamp: e.timestamp
        })
      );
      if (recomputed !== e.commitSha) {
        return { valid: false, brokenIndex: i, reason: 'COMMIT_HASH_MISMATCH' };
      }
      expectedParent = e.commitSha;
    }
    return { valid: true, length: this._entries.length, headSha: expectedParent };
  }

  rollbackLast(currentState) {
    if (this._entries.length === 0) {
      throw new Error('JOURNAL_EMPTY_NOTHING_TO_ROLLBACK');
    }
    const tip = this._entries[this._entries.length - 1];
    const currentHash = sha256Hex(canonicalJson(currentState));
    if (currentHash !== tip.postStateHash) {
      throw new Error('ROLLBACK_STATE_DRIFT: Current state does not match tip postStateHash.');
    }
    const handler = this._inverseHandlers.get(tip.inverseOp.name);
    if (!handler) {
      throw new Error(`MISSING_INVERSE_HANDLER: "${tip.inverseOp.name}"`);
    }
    const restored = handler(structuredClone(currentState), tip.inverseOp.params);
    const restoredHash = sha256Hex(canonicalJson(restored));
    if (restoredHash !== tip.preStateHash) {
      throw new Error(
        `INVERSE_VERIFICATION_FAILED: Inverse "${tip.inverseOp.name}" did not restore exact preStateHash.`
      );
    }
    this._entries.pop();
    return { restoredState: restored, rolledBackCommit: tip };
  }

  rollbackTo(targetCommitSha, currentState) {
    let working = structuredClone(currentState);
    const rolledBack = [];
    while (this.headSha !== targetCommitSha) {
      if (this._entries.length === 0) {
        throw new Error(`TARGET_COMMIT_NOT_FOUND: "${targetCommitSha}"`);
      }
      const step = this.rollbackLast(working);
      working = step.restoredState;
      rolledBack.push(step.rolledBackCommit);
    }
    return { restoredState: working, rolledBackCommits: rolledBack };
  }

  entries() {
    return [...this._entries];
  }
}
