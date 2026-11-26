/**
 * Brick 4 — fabrick-reconstruct
 *
 * Executable 6-Step Memory Reconstruction Protocol
 * ("Planned history pull sequence, filtered with a direction"):
 *   Step 1 — Temporal bracket (beforeWindow / afterWindow)
 *   Step 2 — Activity-context & degradation capture
 *   Step 3 — Scope tagging (directional filter)
 *   Step 4 — Cross-correlated trigger generation
 *   Step 5 — Honest confidence-graded fragment synthesis (never confabulates on Omega)
 *   Step 6 — Recover & file trail OR plant active Seed-RAM trap + recursive trail log
 */

import { canonicalJson, sha256Hex } from '../actuation/index.mjs';
import { BELNAP } from '../epistemic/index.mjs';

export const FRAGMENT_CONFIDENCE = Object.freeze({
  VERBATIM: 'VERBATIM',
  PARAPHRASE: 'PARAPHRASE',
  INFERENCE: 'INFERENCE'
});

export const MATCH_KIND = Object.freeze({
  THE_IDEA: 'THE_IDEA',
  AN_IDEA: 'AN_IDEA',
  UNRECOVERED_OPEN_LOOP: 'UNRECOVERED_OPEN_LOOP'
});

export class EchoReconstructionEngine {
  constructor(memoryFabric) {
    if (!memoryFabric) {
      throw new Error('RECONSTRUCT_REQUIRES_MEMORY_FABRIC');
    }
    this.fabric = memoryFabric;
    this._sessions = new Map();
  }

  /**
   * Steps 1-3: Opens a structured reconstruction bracket with activity context and directional scopes.
   */
  openBracketSession({
    sessionId,
    title,
    beforeWindow,
    afterWindow,
    activityContext = {},
    scopes = ['scope:ideas-cues'],
    openedAt = new Date().toISOString()
  }) {
    if (!sessionId || !beforeWindow || !afterWindow) {
      throw new Error(
        'BRACKET_REQUIRED_FIELDS: sessionId, beforeWindow, and afterWindow are required.'
      );
    }
    const validatedScopes = this.fabric.scopeRegistry.validateTagging(scopes);
    const session = {
      sessionId,
      title: title || `Reconstruction Bracket ${sessionId}`,
      step1Bracket: {
        beforeWindow: String(beforeWindow).trim(),
        afterWindow: String(afterWindow).trim()
      },
      step2Context: {
        placeState: activityContext.placeState || 'unspecified',
        inputs: Array.isArray(activityContext.inputs) ? [...activityContext.inputs] : [],
        mindsetModality: activityContext.mindsetModality || 'unspecified',
        degradationNotes: activityContext.degradationNotes || null
      },
      step3Scopes: validatedScopes,
      step4Triggers: null,
      step5Synthesis: null,
      step6Outcome: null,
      openedAt
    };
    this._sessions.set(sessionId, session);
    return structuredClone(session);
  }

  /**
   * Step 4: Generates directional replay cues & cross-correlated associative rhymes from MemoryFabric.
   */
  generateTriggers(sessionId, { topK = 5 } = {}) {
    const session = this._getSession(sessionId);
    const cueQuery = [
      session.step1Bracket.beforeWindow,
      session.step1Bracket.afterWindow,
      ...session.step2Context.inputs,
      session.step2Context.mindsetModality
    ]
      .filter(Boolean)
      .join(' ');

    const associativeRhymes = this.fabric.associativeSearch(cueQuery, {
      scopes: session.step3Scopes,
      topK
    });

    const triggers = {
      revisitInputs: session.step2Context.inputs.map((inp, idx) => ({
        order: idx + 1,
        action: 'RE_EXPOSE_FORMATION_INPUT',
        target: inp
      })),
      reEnterStateCue: {
        placeState: session.step2Context.placeState,
        mindsetModality: session.step2Context.mindsetModality
      },
      beforeSequenceReplay: `Replay sequence preceding loss: "${session.step1Bracket.beforeWindow}" -> observe transition toward "${session.step1Bracket.afterWindow}"`,
      crossCorrelatedRhymes: associativeRhymes
    };

    session.step4Triggers = triggers;
    return structuredClone(triggers);
  }

  /**
   * Steps 5-6: Grades candidate fragments honestly (never fabricating content for missing holes),
   * logs the attempt trail recursively into MemoryFabric, and plants a Seed-RAM trap if unrecovered.
   */
  completeReconstruction(
    sessionId,
    {
      fragments = [],
      missingHoles = [],
      matchKind = MATCH_KIND.UNRECOVERED_OPEN_LOOP,
      completedAt = new Date().toISOString()
    } = {}
  ) {
    const session = this._getSession(sessionId);
    if (!session.step4Triggers) {
      this.generateTriggers(sessionId);
    }
    if (!Object.prototype.hasOwnProperty.call(MATCH_KIND, matchKind)) {
      throw new Error(`INVALID_MATCH_KIND: "${matchKind}"`);
    }

    const gradedFragments = fragments.map((f, idx) => {
      if (!f || typeof f.text !== 'string' || f.text.trim().length === 0) {
        throw new Error(`EMPTY_FRAGMENT_TEXT_AT_${idx}`);
      }
      if (!Object.prototype.hasOwnProperty.call(FRAGMENT_CONFIDENCE, f.confidence)) {
        throw new Error(`INVALID_FRAGMENT_CONFIDENCE: "${f.confidence}"`);
      }
      return {
        text: f.text.trim(),
        confidence: f.confidence
      };
    });

    const normalizedHoles = missingHoles.map((h) => ({
      description: String(h).trim(),
      epistemicValue: BELNAP.NEITHER // Honest Omega marker — never confabulated
    }));

    const recovered =
      gradedFragments.length > 0 && matchKind !== MATCH_KIND.UNRECOVERED_OPEN_LOOP;

    session.step5Synthesis = {
      fragments: gradedFragments,
      missingHoles: normalizedHoles,
      matchKind,
      epistemicStatus: recovered ? BELNAP.TRUE : BELNAP.NEITHER
    };

    // Recursive trail: "Writing into memory, to remember memory"
    const trailRecordId = `recon-trail:${sessionId}`;
    const artifactSummary = recovered
      ? gradedFragments.map((f) => `[${f.confidence}] ${f.text}`).join(' | ')
      : `[OPEN_BRACKET] Before: ${session.step1Bracket.beforeWindow} | After: ${session.step1Bracket.afterWindow}`;
    const contextTrail = JSON.stringify({
      bracket: session.step1Bracket,
      context: session.step2Context,
      missingHoles: normalizedHoles,
      matchKind
    });

    this.fabric.ingestFluid({
      id: trailRecordId,
      title: session.title,
      artifactContent: artifactSummary,
      contextFill: contextTrail,
      scopes: session.step3Scopes,
      createdAt: completedAt
    });

    let plantedSeed = null;
    if (recovered) {
      this.fabric.promote(trailRecordId, 'TICK_RAM', { timestamp: completedAt });
      this.fabric.promote(trailRecordId, 'HOLD_RAM', { timestamp: completedAt });
    } else {
      const cueString = [
        session.step1Bracket.beforeWindow,
        session.step1Bracket.afterWindow,
        ...session.step2Context.inputs,
        ...missingHoles
      ].join(' ');
      this.fabric.promote(trailRecordId, 'SEED_RAM', {
        timestamp: completedAt,
        seedCueText: cueString
      });
      plantedSeed = trailRecordId;
    }

    const outcome = {
      recovered,
      trailRecordId,
      plantedSeedId: plantedSeed,
      completedAt,
      sessionDigestSha256: sha256Hex(canonicalJson(session))
    };
    session.step6Outcome = outcome;
    return structuredClone(session);
  }

  getSession(sessionId) {
    const s = this._sessions.get(sessionId);
    return s ? structuredClone(s) : null;
  }

  _getSession(sessionId) {
    const s = this._sessions.get(sessionId);
    if (!s) {
      throw new Error(`RECONSTRUCTION_SESSION_NOT_FOUND: "${sessionId}"`);
    }
    return s;
  }
}
