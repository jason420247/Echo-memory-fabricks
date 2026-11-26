/**
 * Brick 8 — fabrick-actuation-bridge
 *
 * Provides multi-actuation-point governance, per-surface branch namespace guards,
 * disambiguated actor attribution, provenance & credit chains (OPERATOR | SYSTEM | COMBINED),
 * automated Pre-Existing Background-IP / Private-Expense SHA-256 ledgers, and the
 * one-way Downstream Publication-Boundary Sentinel.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ACTOR_CLASSES = Object.freeze({
  OPERATOR: 'OPERATOR',
  SYSTEM: 'SYSTEM',
  ANTIGRAVITY_VM: 'ANTIGRAVITY_VM',
  COPILOT_GH: 'COPILOT_GH',
  COPILOT_MS: 'COPILOT_MS',
  JULES: 'JULES',
  SIBLING_TRACK: 'SIBLING_TRACK',
  CI_VERIFIER: 'CI_VERIFIER'
});

export const PROVENANCE_ORIGINS = Object.freeze({
  OPERATOR: 'OPERATOR',
  SYSTEM: 'SYSTEM',
  COMBINED: 'COMBINED',
  UNKNOWN: 'UNKNOWN'
});

export const RELATION_KINDS = Object.freeze({
  DERIVED_FROM: 'DERIVED_FROM',
  REFINED: 'REFINED',
  COMBINED_WITH: 'COMBINED_WITH',
  CORRECTED_BY: 'CORRECTED_BY',
  SEEDED_BY: 'SEEDED_BY'
});

export const PUBLICATION_TIERS = Object.freeze({
  RELEASE: 'RELEASE',
  BOUNDED_RELEASE: 'BOUNDED_RELEASE',
  HOLD_PRIVATE: 'HOLD_PRIVATE'
});

/**
 * Canonical deterministic JSON serialization with sorted keys.
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalJson(item)).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const entries = keys
    .filter((k) => value[k] !== undefined)
    .map((k) => JSON.stringify(k) + ':' + canonicalJson(value[k]));
  return '{' + entries.join(',') + '}';
}

export function sha256Hex(input) {
  const hash = crypto.createHash('sha256');
  hash.update(typeof input === 'string' ? Buffer.from(input, 'utf8') : input);
  return hash.digest('hex');
}

/**
 * Disambiguates actor identifiers, explicitly rejecting bare/ambiguous "copilot"
 * strings rather than guessing between GitHub Copilot, Microsoft Copilot, or Jules.
 */
export function resolveActorClass(rawActor) {
  if (typeof rawActor !== 'string' || rawActor.trim().length === 0) {
    throw new Error('ACTOR_AMBIGUOUS_OR_EMPTY: Actor label must be a non-empty string.');
  }
  const normalized = rawActor.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'COPILOT' || normalized === 'COPILOT_AMBIG') {
    throw new Error(
      'ACTOR_COLLISION_COPILOT_AMBIG: Bare "copilot" is ambiguous; specify COPILOT_GH, COPILOT_MS, or JULES.'
    );
  }
  if (!Object.prototype.hasOwnProperty.call(ACTOR_CLASSES, normalized)) {
    throw new Error(`ACTOR_UNKNOWN: Unrecognized actor class "${rawActor}".`);
  }
  return ACTOR_CLASSES[normalized];
}

/**
 * Enforces per-actuation-surface branch isolation (`actuation/<surface>/<slug>`),
 * blocking direct automated pushes to protected trunk branches (`main` / `master`).
 */
export function validateActuationBranch(branchName, options = {}) {
  const { expectedSurface = null, allowOperatorTrunk = false, actorClass = null } = options;
  if (typeof branchName !== 'string' || branchName.trim().length === 0) {
    return { valid: false, reason: 'EMPTY_BRANCH_NAME' };
  }
  const trimmed = branchName.trim();
  if (trimmed === 'main' || trimmed === 'master') {
    if (allowOperatorTrunk && actorClass === ACTOR_CLASSES.OPERATOR) {
      return { valid: true, protectedTrunk: true, surface: 'operator-trunk' };
    }
    return {
      valid: false,
      reason: 'PROTECTED_TRUNK_DIRECT_WRITE_BLOCKED'
    };
  }
  const match = /^actuation\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9._/-]*)$/.exec(trimmed);
  if (!match) {
    return {
      valid: false,
      reason: 'BRANCH_MUST_MATCH_ACTUATION_NAMESPACE'
    };
  }
  const [, surface, slug] = match;
  if (expectedSurface && surface !== expectedSurface) {
    return {
      valid: false,
      reason: `SURFACE_MISMATCH: expected "${expectedSurface}", got "${surface}"`
    };
  }
  return { valid: true, protectedTrunk: false, surface, slug };
}

/**
 * Append-only Provenance & Attribution Chain enforcing part-level decomposition
 * on COMBINED origins and operator authority on CreditAssertions.
 */
export class ProvenanceChain {
  constructor() {
    this._records = new Map();
    this._assertions = new Map();
  }

  recordArtifact({
    artifactId,
    origin,
    contributions = [],
    chain = [],
    recordedAt = new Date().toISOString(),
    recordedBy = ACTOR_CLASSES.SYSTEM,
    bypassNote = null
  }) {
    if (typeof artifactId !== 'string' || artifactId.trim().length === 0) {
      throw new Error('PROVENANCE_INVALID_ARTIFACT_ID');
    }
    if (!Object.prototype.hasOwnProperty.call(PROVENANCE_ORIGINS, origin)) {
      throw new Error(`PROVENANCE_INVALID_ORIGIN: "${origin}"`);
    }
    const actor = resolveActorClass(recordedBy);

    if (origin === PROVENANCE_ORIGINS.COMBINED) {
      if (!Array.isArray(contributions) || contributions.length < 2) {
        throw new Error(
          'NEEDS_DECOMPOSITION: COMBINED provenance requires >= 2 explicit part-level contributions.'
        );
      }
      const hasOperator = contributions.some((c) => c.contributor === 'OPERATOR');
      const hasSystem = contributions.some((c) => c.contributor === 'SYSTEM');
      if (!hasOperator || !hasSystem) {
        throw new Error(
          'NEEDS_DECOMPOSITION: COMBINED provenance must decompose both OPERATOR and SYSTEM parts.'
        );
      }
    }

    for (const c of contributions) {
      if (c.contributor !== 'OPERATOR' && c.contributor !== 'SYSTEM') {
        throw new Error(`PROVENANCE_INVALID_CONTRIBUTOR: "${c.contributor}"`);
      }
      if (typeof c.part !== 'string' || c.part.trim().length === 0) {
        throw new Error('PROVENANCE_EMPTY_CONTRIBUTION_PART');
      }
      if (typeof c.confidence !== 'number' || c.confidence < 0 || c.confidence > 1) {
        throw new Error('PROVENANCE_INVALID_CONFIDENCE_RANGE');
      }
    }

    for (const link of chain) {
      if (!Object.prototype.hasOwnProperty.call(RELATION_KINDS, link.relation)) {
        throw new Error(`PROVENANCE_INVALID_RELATION: "${link.relation}"`);
      }
    }

    const record = Object.freeze({
      artifactId,
      origin,
      contributions: Object.freeze(contributions.map((c) => Object.freeze({ ...c }))),
      chain: Object.freeze(chain.map((l) => Object.freeze({ ...l }))),
      recordedAt,
      recordedBy: actor,
      ...(bypassNote ? { bypassNote } : {})
    });
    const digestSha256 = sha256Hex(canonicalJson(record));
    const sealed = Object.freeze({ ...record, digestSha256 });
    this._records.set(artifactId, sealed);
    if (!this._assertions.has(artifactId)) {
      this._assertions.set(artifactId, []);
    }
    return sealed;
  }

  /**
   * Appends an operator CreditAssertion without rewriting historical records.
   * Operator assertions take authoritative precedence while preserving any tension as data.
   */
  assertOperatorCredit({
    artifactId,
    statement,
    operatorPart = null,
    recordedAt = new Date().toISOString()
  }) {
    const base = this._records.get(artifactId);
    if (!base) {
      throw new Error(`PROVENANCE_ARTIFACT_NOT_FOUND: "${artifactId}"`);
    }
    if (typeof statement !== 'string' || statement.trim().length === 0) {
      throw new Error('CREDIT_ASSERTION_EMPTY_STATEMENT');
    }
    const conflictDetected = base.origin === PROVENANCE_ORIGINS.SYSTEM;
    const assertion = Object.freeze({
      artifactId,
      claimant: PROVENANCE_ORIGINS.OPERATOR,
      statement: statement.trim(),
      operatorPart: operatorPart || statement.trim(),
      granted: true,
      conflictLedgered: conflictDetected,
      relation: RELATION_KINDS.CORRECTED_BY,
      priorDigestSha256: base.digestSha256,
      recordedAt
    });
    const sealedAssertion = Object.freeze({
      ...assertion,
      assertionSha256: sha256Hex(canonicalJson(assertion))
    });
    this._assertions.get(artifactId).push(sealedAssertion);
    return sealedAssertion;
  }

  queryProvenance(artifactId) {
    const base = this._records.get(artifactId);
    if (!base) {
      return null;
    }
    const assertions = this._assertions.get(artifactId) || [];
    const effectiveOrigin =
      assertions.length > 0 && base.origin === PROVENANCE_ORIGINS.SYSTEM
        ? PROVENANCE_ORIGINS.OPERATOR
        : base.origin;
    const orderedCredits = [
      ...assertions.map((a) => ({
        contributor: 'OPERATOR',
        part: a.operatorPart,
        confidence: 1.0,
        source: 'CREDIT_ASSERTION'
      })),
      ...base.contributions.map((c) => ({ ...c, source: 'CREATION_RECORD' }))
    ].sort((a, b) => {
      if (a.contributor !== b.contributor) {
        return a.contributor === 'OPERATOR' ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });

    return {
      artifactId,
      originalRecord: base,
      effectiveOrigin,
      creditAssertions: [...assertions],
      orderedCredits
    };
  }

  exportAll() {
    const items = [];
    for (const artifactId of [...this._records.keys()].sort()) {
      items.push(this.queryProvenance(artifactId));
    }
    return items;
  }
}

function buildDefaultSentinelRules() {
  const winDrivePattern = new RegExp('(?:^|[\\s"\'`(])[A-Za-z]:\\\\[^\\s"\'`)]+', 'g');
  const tokenDirPattern = new RegExp('/opt/' + 'antigravity/' + 'tokens', 'i');
  const pemKeyPattern = new RegExp('-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----');
  const ghPatPattern = new RegExp('\\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\\b');
  const claimedGradePattern = new RegExp(
    '"(?:evidence_grade|evidenceGrade)"\\s*:\\s*"CLAIMED"',
    'i'
  );
  const holdPrivateMarker = new RegExp(
    '"(?:publicationTier|disclosureTier)"\\s*:\\s*"HOLD_PRIVATE"'
  );

  return [
    { id: 'HOST_WINDOWS_DRIVE_PATH', severity: 'CRITICAL', regex: winDrivePattern },
    { id: 'HOST_TOKEN_MOUNT_PATH', severity: 'CRITICAL', regex: tokenDirPattern },
    { id: 'PRIVATE_KEY_MATERIAL', severity: 'CRITICAL', regex: pemKeyPattern },
    { id: 'GITHUB_TOKEN_LITERAL', severity: 'CRITICAL', regex: ghPatPattern },
    { id: 'UNVERIFIED_CLAIMED_GRADE', severity: 'HIGH', regex: claimedGradePattern },
    { id: 'HOLD_PRIVATE_ARTIFACT_MARKER', severity: 'HIGH', regex: holdPrivateMarker }
  ];
}

/**
 * One-Way Downstream Publication-Boundary Sentinel.
 * Verifies files/content before downstream public export or commit.
 */
export class PublicationBoundarySentinel {
  constructor(options = {}) {
    this._rules = [...buildDefaultSentinelRules(), ...(options.extraRules || [])];
    this._ignoreDirs = new Set([
      '.git',
      'node_modules',
      '__pycache__',
      '.venv',
      '.emf-local',
      ...(options.ignoreDirs || [])
    ]);
  }

  scanText(text, virtualPath = '<memory>') {
    const violations = [];
    const lines = String(text).split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      for (const rule of this._rules) {
        const flags = rule.regex.flags.replace('g', '');
        const tester = new RegExp(rule.regex.source, flags);
        if (tester.test(line)) {
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            file: virtualPath,
            line: i + 1
          });
        }
      }
    }
    return {
      clean: violations.length === 0,
      verdict:
        violations.length === 0 ? PUBLICATION_TIERS.RELEASE : PUBLICATION_TIERS.HOLD_PRIVATE,
      violations
    };
  }

  scanDirectory(rootDir) {
    const violations = [];
    const scannedFiles = [];

    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      for (const entry of entries) {
        if (this._ignoreDirs.has(entry.name)) {
          continue;
        }
        const abs = path.join(dir, entry.name);
        const rel = path.relative(rootDir, abs).split(path.sep).join('/');
        if (entry.isDirectory()) {
          walk(abs);
        } else if (entry.isFile()) {
          const buf = fs.readFileSync(abs);
          // Skip binary files containing null bytes
          if (buf.includes(0)) {
            continue;
          }
          const content = buf.toString('utf8');
          scannedFiles.push({ path: rel, bytes: buf.length, sha256: sha256Hex(buf) });
          const res = this.scanText(content, rel);
          violations.push(...res.violations);
        }
      }
    };

    walk(rootDir);
    const treeDigestSha256 = sha256Hex(canonicalJson(scannedFiles));
    return {
      clean: violations.length === 0,
      verdict:
        violations.length === 0 ? PUBLICATION_TIERS.RELEASE : PUBLICATION_TIERS.HOLD_PRIVATE,
      scannedFileCount: scannedFiles.length,
      treeDigestSha256,
      violations
    };
  }
}

/**
 * Generates a cryptographic Pre-Existing Background-IP & Private-Expense Ledger
 * suitable for Schedule A background-IP schedules in consulting, contracting, or R&D grants.
 */
export function generateBackgroundIpLedger(rootDir, options = {}) {
  const {
    ownerHandle = 'jason420247',
    generatedAt = '2026-11-25T00:00:00.000Z',
    excludePaths = ['specs/background-ip-ledger.json']
  } = options;

  const excludeSet = new Set(excludePaths);
  const ignoreDirs = new Set(['.git', 'node_modules', '__pycache__', '.venv', '.emf-local']);
  const modules = [];

  const classifyTier = (relPath) => {
    if (
      relPath === 'README.md' ||
      relPath === 'LICENSE-APACHE-2.0' ||
      relPath.startsWith('specs/') ||
      relPath.startsWith('docs/')
    ) {
      return 'L1_OPEN_SPEC_APACHE_2_0';
    }
    return 'L2_SOURCE_AVAILABLE_BACKGROUND_IP';
  };

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      if (ignoreDirs.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      const rel = path.relative(rootDir, abs).split(path.sep).join('/');
      if (excludeSet.has(rel)) continue;
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        const buf = fs.readFileSync(abs);
        modules.push({
          path: rel,
          bytes: buf.length,
          sha256: sha256Hex(buf),
          licenseTier: classifyTier(rel)
        });
      }
    }
  };

  walk(rootDir);

  const body = {
    schemaVersion: 'echo-fabricks.background-ip-ledger/v1',
    project: 'Echo-memory-fabricks',
    copyrightHolder: ownerHandle,
    generatedAt,
    privateExpenseAttestation:
      'Conceived, architected, and reduced to practice exclusively at private expense prior to any external client, commercial, or government contract.',
    provenanceDefault: {
      origin: PROVENANCE_ORIGINS.COMBINED,
      contributions: [
        {
          contributor: 'OPERATOR',
          part: 'Multi-tier cognitive memory taxonomy, Seed-RAM trap concept, Temporal-Bracket Echo Reconstruction protocol, Channel-Echo discriminator formulation, and multi-stage licensing/ring topology directives.',
          confidence: 1.0
        },
        {
          contributor: 'SYSTEM',
          part: 'Clean-room Node ESM + Python -S software implementation, binary wire codecs, test suites, and visual inspector realization.',
          confidence: 0.95
        }
      ]
    },
    moduleCount: modules.length,
    modules
  };

  const ledgerSha256 = sha256Hex(canonicalJson(body));
  return { ...body, ledgerSha256 };
}

export function verifyBackgroundIpLedger(rootDir, ledger) {
  const recomputed = generateBackgroundIpLedger(rootDir, {
    ownerHandle: ledger.copyrightHolder,
    generatedAt: ledger.generatedAt
  });
  return {
    verified: recomputed.ledgerSha256 === ledger.ledgerSha256,
    expectedSha256: ledger.ledgerSha256,
    actualSha256: recomputed.ledgerSha256,
    moduleCount: recomputed.moduleCount
  };
}
