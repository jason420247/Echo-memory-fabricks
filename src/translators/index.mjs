/**
 * Brick 9 — fabrick-translator-pipeline
 *
 * Cross-substrate sanitizing translators & Course-of-Action (COA) procedural engine:
 * 1. Sanitizing Logical Volume URI Canonicalizer (`vol://...`) stripping host drive/user paths.
 * 2. Sibling `<!-- LEDGER ... -->` Markdown <-> `Cascade-Hold` bidirectional adapter
 *    (automatically detecting missing aging-band breakdowns & unnamed stale threads).
 * 3. Legacy `.tswap` JSON <-> packed `Base-243` `.fbrk` binary page converter.
 * 4. Portable `.skill.json` <-> `echo-fabricks.skill.ir/v1` envelope translator.
 * 5. Typed Course-of-Action (COA) Procedural Packet generator across the 7 disturbance tiers.
 */

import { canonicalJson, sha256Hex } from '../actuation/index.mjs';
import { decodeFbrkFrame, encodeFbrkFrame } from '../vsa/index.mjs';

export const DISTURBANCE_TIERS = Object.freeze({
  PREEXISTENCE: 'PREEXISTENCE',
  PROCESS: 'PROCESS',
  ARCHITECTURE: 'ARCHITECTURE',
  GAUGE_ASSESSMENT: 'GAUGE_ASSESSMENT',
  PROGRESSIVE_BUILD_FLOW: 'PROGRESSIVE_BUILD_FLOW',
  IMPLEMENTATION: 'IMPLEMENTATION',
  ACTUATION_THRESHOLD: 'ACTUATION_THRESHOLD'
});

export const CONFIRMATION_MODES = Object.freeze({
  SYSTEM_CERTIFIABLE: 'SYSTEM_CERTIFIABLE',
  OPERATOR_WORD_REQUIRED: 'OPERATOR_WORD_REQUIRED'
});

const WIN_PATH_DETECT = new RegExp('^[A-Za-z]:[\\\\/]+(.*)$');
const POSIX_HOME_DETECT = new RegExp('^/(?:home|Users)/[^/]+/(.*)$');

/**
 * Converts host-rooted paths into OS-agnostic `vol://<compartment>/<relPath>` URIs
 * so cross-stream artifacts never leak host drive letters, usernames, or mount layouts.
 */
export function canonicalizeLogicalUri(rawPathOrUri, defaultVolume = 'workspace') {
  if (typeof rawPathOrUri !== 'string' || rawPathOrUri.trim().length === 0) {
    throw new Error('LOGICAL_URI_EMPTY_INPUT');
  }
  const trimmed = rawPathOrUri.trim();
  if (trimmed.startsWith('vol://')) {
    return trimmed.replace(/\\/g, '/');
  }

  let rel = trimmed;
  const winMatch = WIN_PATH_DETECT.exec(trimmed);
  const homeMatch = POSIX_HOME_DETECT.exec(trimmed);

  if (winMatch) {
    rel = winMatch[1];
  } else if (homeMatch) {
    rel = homeMatch[1];
  } else if (trimmed.startsWith('/')) {
    rel = trimmed.replace(/^\/+/, '');
  }

  const norm = rel
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg.length > 0 && seg !== '.' && seg !== '..')
    .join('/');

  const lower = norm.toLowerCase();
  let volume = defaultVolume;
  if (lower.includes('swap') || lower.includes('cache')) {
    volume = 'memory-swap';
  } else if (lower.includes('skill')) {
    volume = 'skills';
  } else if (lower.includes('dossier') || lower.includes('registry')) {
    volume = 'verifications';
  }

  return `vol://${volume}/${norm || 'root'}`;
}

/**
 * Recursively scrubs objects prior to cross-stream translation:
 * - Removes `HOLD_PRIVATE` subtrees and private annotation keys.
 * - Rewrites any host-path string values into `vol://` logical URIs.
 */
export function sanitizeCrossStreamPayload(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (WIN_PATH_DETECT.test(value) || POSIX_HOME_DETECT.test(value)) {
      return canonicalizeLogicalUri(value);
    }
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value
      .filter(
        (item) =>
          !(
            item &&
            typeof item === 'object' &&
            (item.publicationTier === 'HOLD_PRIVATE' || item.disclosureTier === 'HOLD_PRIVATE')
          )
      )
      .map((item) => sanitizeCrossStreamPayload(item));
  }

  if (value.publicationTier === 'HOLD_PRIVATE' || value.disclosureTier === 'HOLD_PRIVATE') {
    return null;
  }

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'privateNotes' || k === 'rawHostEnv') continue;
    out[k] = sanitizeCrossStreamPayload(v);
  }
  return out;
}

/**
 * Parses a sibling `<!-- LEDGER ... -->` Markdown chain header + section structure
 * into a structured Cascade-Hold translation object, diagnosing format gaps automatically.
 */
export function parseSiblingLedgerMarkdown(markdownText) {
  const ledgerMatch = /<!--\s*LEDGER\r?\n([\s\S]*?)-->/.exec(markdownText);
  if (!ledgerMatch) {
    throw new Error('SIBLING_LEDGER_HEADER_NOT_FOUND');
  }
  const rawFields = {};
  for (const line of ledgerMatch[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    rawFields[key] = val;
  }

  const sections = [];
  for (const line of markdownText.split(/\r?\n/)) {
    const secMatch = /^##\s+(\d+)\.\s+(.+)$/.exec(line.trim());
    if (secMatch) {
      sections.push({ number: Number(secMatch[1]), title: secMatch[2].trim() });
    }
  }

  // Parse pending_calls e.g. "80 open, oldest 80 days" or "31 open, oldest 19 days (Route A FINAL)"
  const pendingStr = rawFields.pending_calls || '';
  const openCountMatch = /(\d+)\s+open/i.exec(pendingStr);
  const oldestDaysMatch = /oldest\s+(\d+)\s*d(?:ays?)?/i.exec(pendingStr);
  const oldestNameMatch = /oldest\s+\d+\s*d(?:ays?)?\s*\(([^)]+)\)/i.exec(pendingStr);
  const bandsMatch = /fresh\s*[:=]\s*(\d+).*aging\s*[:=]\s*(\d+).*stale\s*[:=]\s*(\d+)/i.exec(
    rawFields.pending_bands || pendingStr
  );

  const formatGaps = [];
  if (!bandsMatch) {
    formatGaps.push('MISSING_AGING_BAND_BREAKDOWN');
  }
  if (oldestDaysMatch && !oldestNameMatch) {
    formatGaps.push('UNNAMED_OLDEST_THREAD');
  }
  if (!rawFields.constitutional) {
    formatGaps.push('MISSING_CONSTITUTIONAL_HEADER_LINE');
  }

  return {
    linkNumber: rawFields.link ? Number(rawFields.link) : null,
    coversWindow: rawFields.covers || null,
    tierStatus: {
      alpha: rawFields.alpha_tiers || null,
      beta: rawFields.beta_tiers || null,
      gamma: rawFields.gamma_tiers || null
    },
    judgmentsCount: rawFields.judgments ? Number(rawFields.judgments) : 0,
    openThreadsSummary: {
      totalOpen: openCountMatch ? Number(openCountMatch[1]) : 0,
      oldestAgeDays: oldestDaysMatch ? Number(oldestDaysMatch[1]) : null,
      oldestThreadName: oldestNameMatch ? oldestNameMatch[1].trim() : null,
      bands: bandsMatch
        ? {
            freshLt14d: Number(bandsMatch[1]),
            aging14To60d: Number(bandsMatch[2]),
            stale60dPlus: Number(bandsMatch[3])
          }
        : null
    },
    constitutional: rawFields.constitutional || null,
    escalations: rawFields.escalations || 'none',
    sections,
    formatGaps
  };
}

/**
 * Renders a Cascade-Hold link into a complete, gap-free `<!-- LEDGER -->` Markdown header.
 */
export function renderSiblingLedgerMarkdown(cascadeLink, { judgmentsCount = 0, escalations = 'none' } = {}) {
  const ledger = cascadeLink.openThreadsLedger || { totalOpen: 0, bands: {}, oldestThread: null };
  const bands = ledger.bands || { freshLt14d: 0, aging14To60d: 0, stale60dPlus: 0 };
  const oldestClause = ledger.oldestThread
    ? `, oldest ${ledger.oldestThread.ageDays} days (${ledger.oldestThread.name})`
    : '';

  return [
    `# Remembrance chain — ${cascadeLink.coversWindow}`,
    '<!-- LEDGER',
    `link: ${cascadeLink.linkNumber}`,
    `covers: ${cascadeLink.coversWindow}`,
    'alpha_tiers: 1-3 complete',
    'beta_tiers: 4-7 complete',
    'gamma_tiers: 8-10 complete',
    `judgments: ${judgmentsCount}`,
    `pending_calls: ${ledger.totalOpen} open${oldestClause}`,
    `pending_bands: fresh=${bands.freshLt14d}, aging=${bands.aging14To60d}, stale=${bands.stale60dPlus}`,
    `constitutional: ${cascadeLink.constitutional}`,
    `escalations: ${escalations}`,
    '-->',
    ''
  ].join('\n');
}

/**
 * Converts legacy uncompressed JSON `.tswap` trit swap objects into packed Base-243 `.fbrk` frames.
 */
export function convertLegacyTswapToFbrk(tswapObject) {
  if (!tswapObject || !Array.isArray(tswapObject.trits)) {
    throw new Error('TSWAP_INVALID_TRITS_ARRAY');
  }
  const fbrkBuffer = encodeFbrkFrame(tswapObject.trits);
  const sanitizedMeta = sanitizeCrossStreamPayload(tswapObject.metadata || {});
  const jsonBytes = Buffer.byteLength(JSON.stringify(tswapObject), 'utf8');
  return {
    pageId: String(tswapObject.pageId || 'tswap-page'),
    logicalUri: tswapObject.sourcePath
      ? canonicalizeLogicalUri(tswapObject.sourcePath, 'memory-swap')
      : `vol://memory-swap/${tswapObject.pageId || 'tswap-page'}.fbrk`,
    tritLength: tswapObject.trits.length,
    fbrkBuffer,
    fbrkSha256: sha256Hex(fbrkBuffer),
    legacyJsonBytes: jsonBytes,
    fbrkBytes: fbrkBuffer.length,
    spaceSavingsRatio: Number((jsonBytes / fbrkBuffer.length).toFixed(2)),
    metadata: sanitizedMeta
  };
}

export function convertFbrkToTswapJson(fbrkBuffer, { pageId = 'restored-page', metadata = {} } = {}) {
  const decoded = decodeFbrkFrame(fbrkBuffer);
  return {
    pageId,
    tritLength: decoded.tritLength,
    payloadSha256: decoded.payloadSha256,
    trits: Array.from(decoded.trits),
    metadata: sanitizeCrossStreamPayload(metadata)
  };
}

/**
 * Translates between `echo-fabricks.skill.ir/v1` and portable upstream `.skill.json` envelopes.
 */
export function skillIrToPortableEnvelope(skillIr) {
  if (!skillIr || skillIr.schemaVersion !== 'echo-fabricks.skill.ir/v1') {
    throw new Error('INVALID_SKILL_IR_SCHEMA');
  }
  const logicalUri = canonicalizeLogicalUri(skillIr.sourcePath, 'skills');
  const envelopeBody = {
    envelopeSchema: 'portable.skill.envelope/v1',
    skillName: skillIr.name,
    description: skillIr.description,
    logicalUri,
    verifyAnchors: [...skillIr.verifyAnchors],
    headings: skillIr.headings.map((h) => ({ ...h })),
    securityStatus: skillIr.securityStatus,
    upstreamIrSha256: skillIr.irSha256
  };
  return Object.freeze({
    ...envelopeBody,
    envelopeSha256: sha256Hex(canonicalJson(envelopeBody))
  });
}

/**
 * Course-of-Action (COA) Procedural Packet Generator.
 * Enforces explicit disturbance-tier tagging, broad-to-narrow options, inverse rollback,
 * and strict separation between system-certifiable steps vs. operator-word close-outs.
 */
export function generateCoaPacket({
  packetId,
  whatWeKnow,
  whatWeDoNotKnow,
  candidateCourses,
  disturbanceTier,
  recommendedLeanId,
  systemCertifiableEvidence = null,
  createdAt = new Date().toISOString()
}) {
  if (!packetId || !Array.isArray(whatWeKnow) || !Array.isArray(whatWeDoNotKnow)) {
    throw new Error('COA_MISSING_EPISTEMIC_SECTIONS');
  }
  if (!Object.prototype.hasOwnProperty.call(DISTURBANCE_TIERS, disturbanceTier)) {
    throw new Error(`COA_INVALID_DISTURBANCE_TIER: "${disturbanceTier}"`);
  }
  if (!Array.isArray(candidateCourses) || candidateCourses.length === 0) {
    throw new Error('COA_REQUIRES_AT_LEAST_ONE_CANDIDATE');
  }

  for (const c of candidateCourses) {
    if (!c.id || !c.summary || !c.inverseOp) {
      throw new Error('COA_CANDIDATE_REQUIRES_ID_SUMMARY_AND_INVERSE_OP');
    }
    if (!['ALPHA', 'BETA', 'GAMMA'].includes(c.blastRadius)) {
      throw new Error(`COA_INVALID_BLAST_RADIUS: "${c.blastRadius}"`);
    }
  }

  const lean = candidateCourses.find((c) => c.id === recommendedLeanId);
  if (!lean) {
    throw new Error(`COA_RECOMMENDED_LEAN_NOT_IN_CANDIDATES: "${recommendedLeanId}"`);
  }

  // System self-certification is ONLY permitted on mechanical ALPHA steps below ACTUATION_THRESHOLD
  // when pre-defined criteria + checkable evidence + secondary pass are all supplied.
  const canSystemCertify =
    disturbanceTier !== DISTURBANCE_TIERS.ACTUATION_THRESHOLD &&
    lean.blastRadius === 'ALPHA' &&
    Boolean(
      systemCertifiableEvidence &&
        systemCertifiableEvidence.preDefinedCriteria &&
        systemCertifiableEvidence.checkableEvidence &&
        systemCertifiableEvidence.independentSecondaryPass === true
    );

  const confirmationMode = canSystemCertify
    ? CONFIRMATION_MODES.SYSTEM_CERTIFIABLE
    : CONFIRMATION_MODES.OPERATOR_WORD_REQUIRED;

  const body = {
    schemaVersion: 'echo-fabricks.coa-packet/v1',
    packetId,
    whatWeKnow,
    whatWeDoNotKnow,
    candidateCourses,
    disturbanceTier,
    recommendedLeanId,
    confirmationMode,
    certificationLabel: canSystemCertify ? 'system-confirmed' : 'awaiting-operator-word',
    createdAt
  };

  return Object.freeze({
    ...body,
    packetSha256: sha256Hex(canonicalJson(body))
  });
}
