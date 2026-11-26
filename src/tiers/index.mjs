/**
 * Brick 1 — fabrick-tiers
 *
 * Implements the 7-Tier Cognitive Memory Lifecycle & Promotion Automaton:
 *   FLUID_KINETIC -> TICK_RAM -> HOLD_RAM -> SOLID_STATE -> ROM -> CASCADE_HOLD
 * plus first-class 7th tier:
 *   SEED_RAM (passive associative resonance traps for open questions & unrecovered brackets,
 *   never nagging, catching rhyming intakes automatically on arrival).
 *
 * Core Invariants:
 * - Stage boundaries are enforced structurally: Tick-RAM can never jump directly to ROM.
 * - Atomic Intake Completeness: Fluid intakes without co-referential context stay PENDING_FILL.
 * - ROM Immutability: Once sealed into ROM, records are frozen; amendments append new ROM links.
 * - Cascade-Hold Rollup: Always computes explicit fresh (<14d), aging (14-60d), and stale (60d+)
 *   open-thread band counts and preserves the oldest open thread's explicit name.
 */

import { canonicalJson, sha256Hex } from '../actuation/index.mjs';
import { BELNAP, InverseCommitJournal, ScopeRegistry } from '../epistemic/index.mjs';
import { ElasticCasVolume, encodeTextToTernary, ternaryCosineSimilarity } from '../vsa/index.mjs';

export const MEMORY_TIERS = Object.freeze({
  FLUID_KINETIC: 'FLUID_KINETIC',
  TICK_RAM: 'TICK_RAM',
  HOLD_RAM: 'HOLD_RAM',
  SOLID_STATE: 'SOLID_STATE',
  ROM: 'ROM',
  CASCADE_HOLD: 'CASCADE_HOLD',
  SEED_RAM: 'SEED_RAM'
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [MEMORY_TIERS.FLUID_KINETIC]: new Set([MEMORY_TIERS.TICK_RAM, MEMORY_TIERS.SEED_RAM]),
  [MEMORY_TIERS.TICK_RAM]: new Set([MEMORY_TIERS.HOLD_RAM]),
  [MEMORY_TIERS.HOLD_RAM]: new Set([MEMORY_TIERS.SOLID_STATE, MEMORY_TIERS.SEED_RAM]),
  [MEMORY_TIERS.SEED_RAM]: new Set([MEMORY_TIERS.HOLD_RAM]),
  [MEMORY_TIERS.SOLID_STATE]: new Set([MEMORY_TIERS.ROM]),
  [MEMORY_TIERS.ROM]: new Set([MEMORY_TIERS.CASCADE_HOLD]),
  [MEMORY_TIERS.CASCADE_HOLD]: new Set([])
});

/**
 * Passive Seed-RAM Resonance Trap Registry.
 */
export class SeedTrapRegistry {
  constructor(dim = 512, defaultCatchThreshold = 0.22) {
    this._dim = dim;
    this._defaultCatchThreshold = defaultCatchThreshold;
    this._seeds = new Map();
    this._catches = [];
  }

  plantSeed({
    seedId,
    title,
    cueText,
    scopes = ['scope:ideas-cues'],
    catchThreshold = this._defaultCatchThreshold,
    plantedAt = new Date().toISOString(),
    bracketMetadata = null
  }) {
    if (!seedId || !title || !cueText) {
      throw new Error('SEED_RAM_INVALID_INPUT: seedId, title, and cueText are required.');
    }
    const vector = encodeTextToTernary(cueText + ' ' + title, this._dim, scopes);
    const seed = {
      seedId,
      title,
      cueText,
      scopes: [...scopes],
      catchThreshold,
      plantedAt,
      status: 'ACTIVE_DORMANT',
      bracketMetadata,
      vector
    };
    this._seeds.set(seedId, seed);
    return seed;
  }

  /**
   * Passively probes active Seed-RAM traps against a newly arriving intake vector & scopes.
   * Never polls or nags; emits structured ECHO_CATCH events only when resonance crosses threshold.
   */
  probeIntake({ recordId, content, scopes = [], timestamp = new Date().toISOString() }) {
    const intakeVec = encodeTextToTernary(content, this._dim, scopes);
    const matches = [];
    for (const seed of this._seeds.values()) {
      if (seed.status !== 'ACTIVE_DORMANT') continue;
      const vsaSim = ternaryCosineSimilarity(seed.vector, intakeVec);
      const scopeOverlap = seed.scopes.some((s) => scopes.includes(s)) ? 0.06 : 0;
      const resonance = Number((vsaSim + scopeOverlap).toFixed(6));
      if (resonance >= seed.catchThreshold) {
        const catchEvent = Object.freeze({
          eventType: 'ECHO_CATCH',
          seedId: seed.seedId,
          seedTitle: seed.title,
          matchedRecordId: recordId,
          resonance,
          timestamp
        });
        this._catches.push(catchEvent);
        matches.push(catchEvent);
      }
    }
    return matches;
  }

  resolveSeed(seedId, resolutionRecordId) {
    const seed = this._seeds.get(seedId);
    if (!seed) throw new Error(`SEED_NOT_FOUND: "${seedId}"`);
    seed.status = 'CAUGHT_RESOLVED';
    seed.resolvedByRecordId = resolutionRecordId;
    return seed;
  }

  listSeeds({ activeOnly = false } = {}) {
    const all = [...this._seeds.values()].map(({ vector, ...rest }) => ({
      ...rest,
      vectorDim: vector.length
    }));
    return activeOnly ? all.filter((s) => s.status === 'ACTIVE_DORMANT') : all;
  }

  listCatches() {
    return [...this._catches];
  }
}

/**
 * Unified 7-Tier Memory Fabric Engine.
 */
export class MemoryFabric {
  constructor(options = {}) {
    this.vsaDim = options.vsaDim ?? 512;
    this.scopeRegistry = options.scopeRegistry || new ScopeRegistry();
    this.journal = options.journal || new InverseCommitJournal();
    this.volume =
      options.volume ||
      new ElasticCasVolume({
        maxL1Pages: options.maxL1Pages ?? 32,
        backingDir: options.backingDir || null,
        journal: this.journal
      });
    this.seedTraps = new SeedTrapRegistry(this.vsaDim, options.seedCatchThreshold ?? 0.22);

    this._records = new Map();
    this._romCanon = []; // Append-only ROM chain
    this._cascadeLinks = [];
    this._currentTick = 0;

    this.journal.registerInverseHandler('REVERT_TIER_PROMOTION', (state, params) => {
      return {
        ...state,
        tier: params.previousTier,
        epistemicValue: params.previousEpistemicValue
      };
    });
  }

  get currentTick() {
    return this._currentTick;
  }

  /**
   * Ingests raw material into FLUID_KINETIC.
   * Enforces the Atomic Intake Completeness Rule: artifact + contextFill = COMPLETE;
   * missing contextFill marks the intake PENDING_FILL (epistemic NEITHER / Omega) and blocks promotion.
   */
  ingestFluid({
    id,
    title = null,
    artifactContent,
    contextFill = null,
    scopes = ['scope:ideas-cues'],
    deferralReason = null,
    reDateAt = null,
    createdAt = new Date().toISOString()
  }) {
    if (!id || typeof artifactContent !== 'string' || artifactContent.trim().length === 0) {
      throw new Error('FLUID_INGEST_INVALID: id and non-empty artifactContent required.');
    }
    if (this._records.has(id)) {
      throw new Error(`DUPLICATE_MEMORY_ID: "${id}"`);
    }
    const validatedScopes = this.scopeRegistry.validateTagging(scopes, {
      deferralReason,
      reDateAt
    });
    const hasFill = typeof contextFill === 'string' && contextFill.trim().length > 0;
    const intakeStatus = hasFill ? 'COMPLETE' : 'PENDING_FILL';
    const epistemicValue = hasFill ? BELNAP.TRUE : BELNAP.NEITHER;

    const combinedText = hasFill ? `${artifactContent}\n${contextFill}` : artifactContent;
    const vec = encodeTextToTernary(combinedText, this.vsaDim, validatedScopes);
    const pageMeta = this.volume.putPage(id, vec);

    const record = {
      id,
      title: title || id,
      tier: MEMORY_TIERS.FLUID_KINETIC,
      intakeStatus,
      epistemicValue,
      artifactContent,
      contextFill: hasFill ? contextFill : null,
      scopes: validatedScopes,
      deferralReason,
      reDateAt,
      tickEntered: null,
      casSha256: pageMeta.casSha256,
      createdAt,
      updatedAt: createdAt,
      history: [{ toTier: MEMORY_TIERS.FLUID_KINETIC, at: createdAt, intakeStatus }]
    };

    this._records.set(id, record);
    const echoCatches = this.seedTraps.probeIntake({
      recordId: id,
      content: combinedText,
      scopes: validatedScopes,
      timestamp: createdAt
    });
    return { record: structuredClone(record), echoCatches };
  }

  /**
   * Supplies missing co-referential LIVE-FILL to lift a PENDING_FILL Fluid record to COMPLETE.
   */
  attachContextFill(id, contextFill, timestamp = new Date().toISOString()) {
    const rec = this._getMutableRecord(id);
    if (rec.tier !== MEMORY_TIERS.FLUID_KINETIC) {
      throw new Error('CONTEXT_FILL_ONLY_ON_FLUID_KINETIC');
    }
    if (typeof contextFill !== 'string' || contextFill.trim().length === 0) {
      throw new Error('EMPTY_CONTEXT_FILL');
    }
    rec.contextFill = contextFill;
    rec.intakeStatus = 'COMPLETE';
    if (rec.epistemicValue === BELNAP.NEITHER) {
      rec.epistemicValue = BELNAP.TRUE;
    }
    rec.updatedAt = timestamp;
    const vec = encodeTextToTernary(
      `${rec.artifactContent}\n${rec.contextFill}`,
      this.vsaDim,
      rec.scopes
    );
    const pageMeta = this.volume.putPage(id, vec);
    rec.casSha256 = pageMeta.casSha256;
    const echoCatches = this.seedTraps.probeIntake({
      recordId: id,
      content: `${rec.artifactContent}\n${rec.contextFill}`,
      scopes: rec.scopes,
      timestamp
    });
    return { record: structuredClone(rec), echoCatches };
  }

  /**
   * Strict stage-checked promotion across the 7-tier topology.
   */
  promote(id, targetTier, options = {}) {
    const {
      timestamp = new Date().toISOString(),
      adjudicationVerdict = null,
      seedCueText = null,
      catchThreshold = undefined
    } = options;

    const rec = this._getMutableRecord(id);
    const allowed = ALLOWED_TRANSITIONS[rec.tier];
    if (!allowed || !allowed.has(targetTier)) {
      throw new Error(
        `ILLEGAL_TIER_JUMP: Cannot promote "${id}" from ${rec.tier} directly to ${targetTier}.`
      );
    }

    if (rec.tier === MEMORY_TIERS.FLUID_KINETIC && targetTier === MEMORY_TIERS.TICK_RAM) {
      if (rec.intakeStatus !== 'COMPLETE') {
        throw new Error(
          `PENDING_FILL_GATE_BLOCKED: Record "${id}" lacks co-referential contextFill and cannot leave FLUID_KINETIC.`
        );
      }
    }

    if (targetTier === MEMORY_TIERS.ROM) {
      if (!adjudicationVerdict || typeof adjudicationVerdict !== 'string') {
        throw new Error(
          `ADJUDICATION_GATE_REQUIRED: Promotion of "${id}" to ROM requires an explicit adjudicationVerdict.`
        );
      }
      if (rec.epistemicValue === BELNAP.BOTH) {
        throw new Error(
          `CONTRADICTION_QUARANTINE: Record "${id}" has epistemicValue BOTH and must be resolved before ROM sealing.`
        );
      }
    }

    const prevTier = rec.tier;
    const prevEpistemic = rec.epistemicValue;
    const preState = { id: rec.id, tier: prevTier, epistemicValue: prevEpistemic };
    const postState = { id: rec.id, tier: targetTier, epistemicValue: rec.epistemicValue };

    const commit = this.journal.commit({
      forwardOp: { name: `PROMOTE_${prevTier}_TO_${targetTier}`, params: { id, targetTier } },
      inverseOp: {
        name: 'REVERT_TIER_PROMOTION',
        params: { id, previousTier: prevTier, previousEpistemicValue: prevEpistemic }
      },
      preState,
      postState,
      timestamp
    });

    rec.tier = targetTier;
    rec.updatedAt = timestamp;
    if (targetTier === MEMORY_TIERS.TICK_RAM) {
      rec.tickEntered = this._currentTick;
    }
    rec.history.push({
      fromTier: prevTier,
      toTier: targetTier,
      at: timestamp,
      commitSha: commit.commitSha
    });

    if (targetTier === MEMORY_TIERS.SEED_RAM) {
      this.seedTraps.plantSeed({
        seedId: rec.id,
        title: rec.title,
        cueText: seedCueText || rec.artifactContent,
        scopes: rec.scopes,
        catchThreshold,
        plantedAt: timestamp
      });
    }

    if (targetTier === MEMORY_TIERS.ROM) {
      const parentRomSha =
        this._romCanon.length === 0
          ? sha256Hex('rom-genesis-0000')
          : this._romCanon[this._romCanon.length - 1].romSha256;
      const romPayload = {
        index: this._romCanon.length,
        parentRomSha,
        recordId: rec.id,
        title: rec.title,
        artifactContent: rec.artifactContent,
        contextFill: rec.contextFill,
        scopes: rec.scopes,
        epistemicValue: rec.epistemicValue,
        adjudicationVerdict,
        casSha256: rec.casSha256,
        journalCommitSha: commit.commitSha,
        sealedAt: timestamp
      };
      const romEntry = Object.freeze({
        ...romPayload,
        romSha256: sha256Hex(canonicalJson(romPayload))
      });
      this._romCanon.push(romEntry);
      rec.romSha256 = romEntry.romSha256;
      Object.freeze(rec.history);
      Object.freeze(rec); // Enforce ROM immutability at object level as well
    }

    return structuredClone(rec);
  }

  /**
   * Advances Tick-RAM clock: any unpromoted TICK_RAM items from prior ticks expire cleanly
   * (Tick-RAM holds only the current tick's working state).
   */
  advanceTick() {
    this._currentTick += 1;
    const expiredIds = [];
    for (const [id, rec] of this._records.entries()) {
      if (rec.tier === MEMORY_TIERS.TICK_RAM && rec.tickEntered < this._currentTick) {
        this._records.delete(id);
        expiredIds.push(id);
      }
    }
    return { currentTick: this._currentTick, expiredTickRamIds: expiredIds };
  }

  /**
   * Updates Solid-State curated content in place (forbidden on ROM!).
   */
  curateSolidState(id, { artifactContent, epistemicValue, timestamp = new Date().toISOString() }) {
    const rec = this._getMutableRecord(id);
    if (rec.tier !== MEMORY_TIERS.SOLID_STATE) {
      throw new Error(`CURATE_REQUIRES_SOLID_STATE: Record "${id}" is in ${rec.tier}.`);
    }
    if (typeof artifactContent === 'string' && artifactContent.trim().length > 0) {
      rec.artifactContent = artifactContent;
      const vec = encodeTextToTernary(
        `${rec.artifactContent}\n${rec.contextFill || ''}`,
        this.vsaDim,
        rec.scopes
      );
      rec.casSha256 = this.volume.putPage(id, vec).casSha256;
    }
    if (epistemicValue) {
      rec.epistemicValue = epistemicValue;
    }
    rec.updatedAt = timestamp;
    return structuredClone(rec);
  }

  /**
   * Synthesizes sealed ROM entries + open Seed-RAM / Deferred threads into a Cascade-Hold link
   * with complete Fresh (<14d) / Aging (14-60d) / Stale (60d+) breakdown and explicit oldest-thread naming.
   */
  buildCascadeHoldLink({
    linkNumber,
    coversWindow,
    constitutionalDelta,
    referenceNow = new Date().toISOString()
  }) {
    if (typeof constitutionalDelta !== 'string' || constitutionalDelta.trim().length === 0) {
      throw new Error('CASCADE_CONSTITUTIONAL_LINE_REQUIRED');
    }
    const nowMs = Date.parse(referenceNow);
    const openThreads = [];

    for (const rec of this._records.values()) {
      const isOpen =
        rec.tier === MEMORY_TIERS.SEED_RAM ||
        rec.scopes.includes('scope:need-to-do') ||
        rec.scopes.includes('scope:need-to-defer');
      if (isOpen && rec.tier !== MEMORY_TIERS.ROM && rec.tier !== MEMORY_TIERS.CASCADE_HOLD) {
        const ageDays = Math.max(0, Math.floor((nowMs - Date.parse(rec.createdAt)) / 86400000));
        openThreads.push({ id: rec.id, title: rec.title, ageDays });
      }
    }

    let freshLt14d = 0;
    let aging14To60d = 0;
    let stale60dPlus = 0;
    let oldestThread = null;

    for (const t of openThreads) {
      if (t.ageDays < 14) freshLt14d += 1;
      else if (t.ageDays < 60) aging14To60d += 1;
      else stale60dPlus += 1;

      if (!oldestThread || t.ageDays > oldestThread.ageDays) {
        oldestThread = t;
      }
    }

    const parentCascadeSha =
      this._cascadeLinks.length === 0
        ? sha256Hex('cascade-genesis-0000')
        : this._cascadeLinks[this._cascadeLinks.length - 1].cascadeSha256;

    const payload = {
      linkNumber,
      coversWindow,
      parentCascadeSha,
      romCountIncluded: this._romCanon.length,
      romHeadSha:
        this._romCanon.length > 0 ? this._romCanon[this._romCanon.length - 1].romSha256 : null,
      openThreadsLedger: {
        totalOpen: openThreads.length,
        bands: {
          freshLt14d,
          aging14To60d,
          stale60dPlus
        },
        oldestThread: oldestThread
          ? { id: oldestThread.id, name: oldestThread.title, ageDays: oldestThread.ageDays }
          : null
      },
      constitutional: constitutionalDelta.trim(),
      createdAt: referenceNow
    };
    const link = Object.freeze({
      ...payload,
      cascadeSha256: sha256Hex(canonicalJson(payload))
    });
    this._cascadeLinks.push(link);
    return link;
  }

  /**
   * Associative coordinate search across tiers using Base-243 stored VSA vectors + scope filter.
   */
  associativeSearch(queryText, { scopes = [], tiers = null, topK = 5 } = {}) {
    const queryVec = encodeTextToTernary(queryText, this.vsaDim, scopes);
    const tierFilter = tiers ? new Set(tiers) : null;
    const scored = [];

    for (const rec of this._records.values()) {
      if (tierFilter && !tierFilter.has(rec.tier)) continue;
      if (scopes.length > 0 && !scopes.some((s) => rec.scopes.includes(s))) continue;
      const page = this.volume.getPage(rec.id);
      if (!page) continue;
      const similarity = ternaryCosineSimilarity(queryVec, page.trits);
      scored.push({
        id: rec.id,
        title: rec.title,
        tier: rec.tier,
        epistemicValue: rec.epistemicValue,
        scopes: rec.scopes,
        similarity: Number(similarity.toFixed(6))
      });
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  getRecord(id) {
    const r = this._records.get(id);
    return r ? structuredClone(r) : null;
  }

  listRecords({ tier = null } = {}) {
    const out = [];
    for (const r of this._records.values()) {
      if (!tier || r.tier === tier) {
        out.push(structuredClone(r));
      }
    }
    return out;
  }

  romCanon() {
    return [...this._romCanon];
  }

  cascadeLinks() {
    return [...this._cascadeLinks];
  }

  _getMutableRecord(id) {
    const rec = this._records.get(id);
    if (!rec) {
      throw new Error(`MEMORY_RECORD_NOT_FOUND: "${id}"`);
    }
    if (rec.tier === MEMORY_TIERS.ROM || Object.isFrozen(rec)) {
      throw new Error(
        `ROM_IMMUTABLE_VIOLATION: Record "${id}" is sealed in ROM; append a new record instead of mutating.`
      );
    }
    return rec;
  }
}
