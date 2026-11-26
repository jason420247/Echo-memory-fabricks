/**
 * Brick 12b — fabrick-coarchitect
 *
 * Co-Architect Participant Registry, Internal Role Gauge, Single-Point-of-Failure (SPOF)
 * Auditor, and Trinity Command Assignment (`1 AUTHORIZE + 2 distinct DELEGATES`).
 */

import {
  ACTOR_CLASSES,
  PROVENANCE_ORIGINS,
  ProvenanceChain,
  canonicalJson,
  sha256Hex
} from '../actuation/index.mjs';

export const PARTICIPANT_TIERS = Object.freeze({
  SOVEREIGN_OPERATOR: 'SOVEREIGN_OPERATOR',
  PROVENANCE_CLASS_ADJUDICATOR: 'PROVENANCE_CLASS_ADJUDICATOR',
  CO_ARCHITECT_BUILDER: 'CO_ARCHITECT_BUILDER',
  ORACLE_RUNTIME: 'ORACLE_RUNTIME'
});

export class CoArchitectRegistry {
  constructor(provenanceChain = new ProvenanceChain()) {
    this.provenance = provenanceChain;
    this._participants = new Map();
    this._commandRoutes = new Map();
  }

  registerParticipant({
    participantId,
    actorClass,
    tier,
    substrate,
    roles = []
  }) {
    if (!participantId || !actorClass || !tier || !substrate) {
      throw new Error('COARCHITECT_PARTICIPANT_FIELDS_REQUIRED');
    }
    if (!Object.prototype.hasOwnProperty.call(PARTICIPANT_TIERS, tier)) {
      throw new Error(`INVALID_PARTICIPANT_TIER: "${tier}"`);
    }
    if (
      tier === PARTICIPANT_TIERS.SOVEREIGN_OPERATOR &&
      actorClass !== ACTOR_CLASSES.OPERATOR
    ) {
      throw new Error('SOVEREIGN_TIER_RESERVED_FOR_OPERATOR');
    }

    const entry = Object.freeze({
      participantId,
      actorClass,
      tier,
      substrate,
      roles: Object.freeze([...new Set(roles)])
    });
    this._participants.set(participantId, entry);
    return entry;
  }

  /**
   * Registers a critical command route enforcing the Trinity Command Structure:
   * 1 AUTHORIZE + 2 distinct DELEGATES (or an explicitly accepted SPOF with reason & reDateAt).
   */
  registerTrinityRoute({
    routeName,
    authorizeParticipantId,
    delegateAParticipantId,
    delegateBParticipantId = null,
    acceptedSpof = null
  }) {
    const auth = this._participants.get(authorizeParticipantId);
    const delA = this._participants.get(delegateAParticipantId);
    if (!auth || !delA) {
      throw new Error(`TRINITY_UNKNOWN_PARTICIPANT_FOR_ROUTE: "${routeName}"`);
    }

    if (!delegateBParticipantId || delegateAParticipantId === delegateBParticipantId) {
      // Single-point-of-failure only allowed if explicitly accepted with reason + reDateAt
      if (
        !acceptedSpof ||
        typeof acceptedSpof.reason !== 'string' ||
        acceptedSpof.reason.trim().length === 0 ||
        Number.isNaN(Date.parse(acceptedSpof.reDateAt || ''))
      ) {
        throw new Error(
          `SPOF_VIOLATION (${routeName}): Provide a distinct delegateBParticipantId or an explicit acceptedSpof { reason, reDateAt }.`
        );
      }
      const spofRoute = Object.freeze({
        routeName,
        mode: 'ACCEPTED_SPOF_WITH_REDATE',
        authorize: authorizeParticipantId,
        delegateA: delegateAParticipantId,
        delegateB: null,
        crossSubstrateDelegates: false,
        acceptedSpof: Object.freeze({ ...acceptedSpof })
      });
      this._commandRoutes.set(routeName, spofRoute);
      return spofRoute;
    }

    const delB = this._participants.get(delegateBParticipantId);
    if (!delB) {
      throw new Error(`TRINITY_UNKNOWN_DELEGATE_B: "${delegateBParticipantId}"`);
    }

    const route = Object.freeze({
      routeName,
      mode: 'FULL_TRINITY',
      authorize: authorizeParticipantId,
      delegateA: delegateAParticipantId,
      delegateB: delegateBParticipantId,
      crossSubstrateDelegates: delA.substrate !== delB.substrate,
      acceptedSpof: null
    });
    this._commandRoutes.set(routeName, route);
    return route;
  }

  /**
   * Records a co-architected artifact with verified participant contributions.
   */
  recordCoArchitectedBuild({
    artifactId,
    operatorContribution,
    systemContributions,
    recordedBy = ACTOR_CLASSES.ANTIGRAVITY_VM,
    recordedAt = new Date().toISOString()
  }) {
    const contributions = [
      {
        contributor: 'OPERATOR',
        part: operatorContribution,
        confidence: 1.0
      },
      ...systemContributions.map((sc) => ({
        contributor: 'SYSTEM',
        part: `[${sc.participantId}] ${sc.part}`,
        confidence: sc.confidence ?? 0.95
      }))
    ];
    return this.provenance.recordArtifact({
      artifactId,
      origin: PROVENANCE_ORIGINS.COMBINED,
      contributions,
      recordedBy,
      recordedAt
    });
  }

  /**
   * Sovereign Role & SPOF Gauge: measures total distinct internal roles fulfilled across participants.
   */
  gaugeSystemRoles() {
    const uniqueRoles = new Set();
    const substrates = new Set();
    for (const p of this._participants.values()) {
      substrates.add(p.substrate);
      for (const r of p.roles) uniqueRoles.add(r);
    }
    const routes = [...this._commandRoutes.values()];
    const fullTrinityCount = routes.filter((r) => r.mode === 'FULL_TRINITY').length;
    const spofAcceptedCount = routes.filter((r) => r.mode === 'ACCEPTED_SPOF_WITH_REDATE').length;

    const summary = {
      participantCount: this._participants.size,
      distinctRoleCount: uniqueRoles.size,
      distinctSubstrateCount: substrates.size,
      rolesCatalog: [...uniqueRoles].sort(),
      trinityRoutesCount: fullTrinityCount,
      acceptedSpofRoutesCount: spofAcceptedCount
    };
    return {
      ...summary,
      gaugeSha256: sha256Hex(canonicalJson(summary))
    };
  }
}
