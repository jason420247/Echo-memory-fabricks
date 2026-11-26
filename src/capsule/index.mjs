/**
 * Brick 7 — fabrick-capsule
 *
 * Self-Rehydrating Context Actuation & Handoff Capsules.
 * Implements the 6-field signed capsule schema:
 *   name, function, temporalProgression, startAnchor, closeOutState, deliberateFutureContextHook
 * with automatic Publication-Boundary Sentinel verification on outbound public/bounded tiers.
 */

import {
  PUBLICATION_TIERS,
  PublicationBoundarySentinel,
  canonicalJson,
  sha256Hex
} from '../actuation/index.mjs';

const REQUIRED_FIELDS = [
  'name',
  'function',
  'temporalProgression',
  'startAnchor',
  'closeOutState',
  'deliberateFutureContextHook'
];

export function mintCapsule(spec, options = {}) {
  const {
    disclosureTier = PUBLICATION_TIERS.BOUNDED_RELEASE,
    sentinel = new PublicationBoundarySentinel(),
    mintedAt = new Date().toISOString()
  } = options;

  for (const field of REQUIRED_FIELDS) {
    if (spec[field] === undefined || spec[field] === null || spec[field] === '') {
      throw new Error(`CAPSULE_MISSING_REQUIRED_FIELD: "${field}"`);
    }
  }

  const body = {
    schemaVersion: 'echo-fabricks.capsule/v1',
    disclosureTier,
    mintedAt,
    name: String(spec.name),
    function: String(spec.function),
    temporalProgression: spec.temporalProgression,
    startAnchor: spec.startAnchor,
    closeOutState: spec.closeOutState,
    deliberateFutureContextHook: spec.deliberateFutureContextHook,
    ...(spec.provenance ? { provenance: spec.provenance } : {}),
    ...(spec.openBlindSpots ? { openBlindSpots: spec.openBlindSpots } : {})
  };

  if (disclosureTier !== PUBLICATION_TIERS.HOLD_PRIVATE) {
    const scan = sentinel.scanText(JSON.stringify(body, null, 2), `capsule:${body.name}`);
    if (!scan.clean) {
      throw new Error(
        `CAPSULE_PUBLICATION_SENTINEL_BLOCKED: ${scan.violations.map((v) => v.ruleId).join(', ')}`
      );
    }
  }

  const capsuleSha256 = sha256Hex(canonicalJson(body));
  return Object.freeze({
    ...body,
    capsuleSha256
  });
}

export function verifyCapsule(capsule) {
  if (!capsule || capsule.schemaVersion !== 'echo-fabricks.capsule/v1') {
    return { verified: false, reason: 'UNSUPPORTED_CAPSULE_SCHEMA' };
  }
  for (const field of REQUIRED_FIELDS) {
    if (capsule[field] === undefined || capsule[field] === null) {
      return { verified: false, reason: `MISSING_FIELD:${field}` };
    }
  }
  const { capsuleSha256, ...body } = capsule;
  const expected = sha256Hex(canonicalJson(body));
  if (expected !== capsuleSha256) {
    return {
      verified: false,
      reason: 'CAPSULE_SHA256_MISMATCH',
      expectedSha256: expected,
      actualSha256: capsuleSha256
    };
  }
  return { verified: true, capsuleSha256: expected };
}

export function renderCapsuleBriefMarkdown(capsule) {
  const check = verifyCapsule(capsule);
  if (!check.verified) {
    throw new Error(`CANNOT_RENDER_UNVERIFIED_CAPSULE: ${check.reason}`);
  }
  return [
    `# Context Actuation Rehydration Brief — ${capsule.name}`,
    '',
    `- **Schema**: \`${capsule.schemaVersion}\``,
    `- **Disclosure Tier**: \`${capsule.disclosureTier}\``,
    `- **Minted At**: \`${capsule.mintedAt}\``,
    `- **SHA-256 Seal**: \`${capsule.capsuleSha256}\``,
    '',
    '## 1. Function',
    capsule.function,
    '',
    '## 2. Start Anchor',
    '```json',
    JSON.stringify(capsule.startAnchor, null, 2),
    '```',
    '',
    '## 3. Temporal Progression',
    '```json',
    JSON.stringify(capsule.temporalProgression, null, 2),
    '```',
    '',
    '## 4. Close-Out State',
    '```json',
    JSON.stringify(capsule.closeOutState, null, 2),
    '```',
    '',
    '## 5. Deliberate Future Context Hook',
    '```json',
    JSON.stringify(capsule.deliberateFutureContextHook, null, 2),
    '```',
    ''
  ].join('\n');
}
