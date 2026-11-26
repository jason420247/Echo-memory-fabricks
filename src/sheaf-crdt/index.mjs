/**
 * Brick 6 — fabrick-sheaf-crdt
 *
 * Multi-agent memory convergence & epistemic safety:
 * 1. Causal Merkle-CRDT Store: merges concurrent conflicting writes into Belnap-Dunn BOTH
 *    (discovered ambiguity) with preserved causal branches rather than silent Last-Writer-Wins.
 * 2. Cellular Sheaf Coboundary & Dirichlet Energy Engine: diagnoses consensus vs. harmonic
 *    obstruction across overlapping agent state spaces.
 * 3. Directed-Blindness Twin Membrane: strips evaluation rubrics, item maps, and expectations
 *    prior to dispatching bounded test/verifier subagents.
 */

import { canonicalJson, sha256Hex } from '../actuation/index.mjs';
import { BELNAP, belnapKnowledgeMerge } from '../epistemic/index.mjs';

export class MerkleCrdtStore {
  constructor(agentId = 'agent-primary') {
    this.agentId = agentId;
    this._nodes = new Map(); // nodeHash -> opNode
    this._keyHeads = new Map(); // key -> Set<nodeHash>
    this._logicalClock = 0;
  }

  put(key, value, { epistemicValue = BELNAP.TRUE, author = this.agentId } = {}) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('CRDT_KEY_REQUIRED');
    }
    this._logicalClock += 1;
    const parents = [...(this._keyHeads.get(key) || [])].sort();
    const payload = {
      key,
      value,
      epistemicValue,
      author,
      lamport: this._logicalClock,
      parents
    };
    const nodeHash = sha256Hex(canonicalJson(payload));
    const node = Object.freeze({ nodeHash, ...payload });
    this._applyNode(node);
    return node;
  }

  mergeRemoteNodes(remoteNodes) {
    let applied = 0;
    const sorted = [...remoteNodes].sort((a, b) => a.lamport - b.lamport);
    for (const raw of sorted) {
      const expected = sha256Hex(
        canonicalJson({
          key: raw.key,
          value: raw.value,
          epistemicValue: raw.epistemicValue,
          author: raw.author,
          lamport: raw.lamport,
          parents: raw.parents
        })
      );
      if (expected !== raw.nodeHash) {
        throw new Error(`CRDT_TAMPERED_NODE_HASH: ${raw.nodeHash}`);
      }
      if (!this._nodes.has(raw.nodeHash)) {
        this._applyNode(Object.freeze({ ...raw, parents: [...raw.parents] }));
        applied += 1;
      }
    }
    return { applied, totalNodes: this._nodes.size };
  }

  _applyNode(node) {
    this._nodes.set(node.nodeHash, node);
    this._logicalClock = Math.max(this._logicalClock, node.lamport);
    const heads = this._keyHeads.get(node.key) || new Set();
    for (const p of node.parents) {
      heads.delete(p);
    }
    // Only add as head if no existing node already lists this node as an ancestor
    let superseded = false;
    for (const existing of this._nodes.values()) {
      if (existing.key === node.key && existing.parents.includes(node.nodeHash)) {
        superseded = true;
        break;
      }
    }
    if (!superseded) {
      heads.add(node.nodeHash);
    }
    this._keyHeads.set(node.key, heads);
  }

  resolve(key) {
    const heads = this._keyHeads.get(key);
    if (!heads || heads.size === 0) return null;
    const headNodes = [...heads]
      .sort()
      .map((h) => this._nodes.get(h))
      .filter(Boolean);

    if (headNodes.length === 1) {
      const single = headNodes[0];
      return {
        key,
        status: 'CONVERGED',
        value: single.value,
        epistemicValue: single.epistemicValue,
        heads: [single.nodeHash],
        candidates: [single]
      };
    }

    // Multiple concurrent causal heads: check if values agree or diverge
    const serializedFirst = canonicalJson(headNodes[0].value);
    const allSameValue = headNodes.every((n) => canonicalJson(n.value) === serializedFirst);
    let mergedEpistemic = headNodes[0].epistemicValue;
    for (let i = 1; i < headNodes.length; i += 1) {
      mergedEpistemic = belnapKnowledgeMerge(mergedEpistemic, headNodes[i].epistemicValue);
    }
    if (!allSameValue) {
      // Disagreement is discovered ambiguity (BOTH), never forced silent overwrite
      mergedEpistemic = BELNAP.BOTH;
    }

    return {
      key,
      status: allSameValue ? 'CONVERGED_CONCURRENT' : 'DISCOVERED_AMBIGUITY',
      value: allSameValue ? headNodes[0].value : null,
      epistemicValue: mergedEpistemic,
      heads: headNodes.map((n) => n.nodeHash),
      candidates: headNodes
    };
  }

  exportNodes() {
    return [...this._nodes.values()];
  }
}

/**
 * Cellular Sheaf Laplacian & Asynchronous Diffusion Engine over vector stalks.
 */
export class CellularSheafGraph {
  constructor() {
    this._stalks = new Map(); // nodeId -> Float64Array
    this._edges = []; // { edgeId, u, v, Fu: number[][], Fv: number[][] }
  }

  setNodeStalk(nodeId, vector) {
    this._stalks.set(nodeId, Float64Array.from(vector));
  }

  getNodeStalk(nodeId) {
    const v = this._stalks.get(nodeId);
    return v ? Array.from(v) : null;
  }

  /**
   * Adds a restriction edge e between u and v with linear restriction maps
   * Fu (edgeDim x dim(u)) and Fv (edgeDim x dim(v)).
   */
  addRestrictionEdge({ edgeId, u, v, mapU, mapV }) {
    if (!this._stalks.has(u) || !this._stalks.has(v)) {
      throw new Error('SHEAF_EDGE_UNKNOWN_NODE');
    }
    if (mapU.length !== mapV.length || mapU.length === 0) {
      throw new Error('SHEAF_EDGE_DIM_MISMATCH');
    }
    this._edges.push({ edgeId, u, v, mapU, mapV });
  }

  evaluateCoboundary(ambiguityThreshold = 0.05) {
    let dirichletEnergy = 0;
    const edgeResiduals = [];

    for (const edge of this._edges) {
      const xu = this._stalks.get(edge.u);
      const xv = this._stalks.get(edge.v);
      const edgeDim = edge.mapU.length;
      const diff = new Float64Array(edgeDim);
      let normSq = 0;

      for (let r = 0; r < edgeDim; r += 1) {
        let projU = 0;
        for (let c = 0; c < xu.length; c += 1) projU += edge.mapU[r][c] * xu[c];
        let projV = 0;
        for (let c = 0; c < xv.length; c += 1) projV += edge.mapV[r][c] * xv[c];
        diff[r] = projU - projV;
        normSq += diff[r] * diff[r];
      }

      dirichletEnergy += 0.5 * normSq;
      const residualNorm = Math.sqrt(normSq);
      edgeResiduals.push({
        edgeId: edge.edgeId,
        u: edge.u,
        v: edge.v,
        residualNorm: Number(residualNorm.toFixed(6)),
        status: residualNorm > ambiguityThreshold ? 'DISCOVERED_AMBIGUITY' : 'COHERENT'
      });
    }

    return {
      dirichletEnergy: Number(dirichletEnergy.toFixed(8)),
      coherent: edgeResiduals.every((e) => e.status === 'COHERENT'),
      edgeResiduals
    };
  }

  /**
   * Executes `steps` iterations of Sheaf Laplacian gradient descent x <- x - alpha * L_F x.
   */
  diffuse({ stepSize = 0.15, steps = 25 } = {}) {
    for (let iter = 0; iter < steps; iter += 1) {
      const grads = new Map();
      for (const [id, vec] of this._stalks.entries()) {
        grads.set(id, new Float64Array(vec.length));
      }

      for (const edge of this._edges) {
        const xu = this._stalks.get(edge.u);
        const xv = this._stalks.get(edge.v);
        const gu = grads.get(edge.u);
        const gv = grads.get(edge.v);
        const edgeDim = edge.mapU.length;

        for (let r = 0; r < edgeDim; r += 1) {
          let projU = 0;
          for (let c = 0; c < xu.length; c += 1) projU += edge.mapU[r][c] * xu[c];
          let projV = 0;
          for (let c = 0; c < xv.length; c += 1) projV += edge.mapV[r][c] * xv[c];
          const delta = projU - projV;

          // Fu^T * delta for u, -Fv^T * delta for v
          for (let c = 0; c < xu.length; c += 1) {
            gu[c] += edge.mapU[r][c] * delta;
          }
          for (let c = 0; c < xv.length; c += 1) {
            gv[c] -= edge.mapV[r][c] * delta;
          }
        }
      }

      for (const [id, vec] of this._stalks.entries()) {
        const g = grads.get(id);
        for (let i = 0; i < vec.length; i += 1) {
          vec[i] -= stepSize * g[i];
        }
      }
    }
    return this.evaluateCoboundary();
  }
}

const DEFAULT_BLIND_KEYS = new Set([
  'rubric',
  'expectedVerdict',
  'expectedOutput',
  'itemMap',
  'trapClause',
  'liveRunIdentity',
  'operatorPrivateNotes',
  'answerKey'
]);

/**
 * Directed-Blindness Twin Membrane: strips rubric/expectation keys recursively
 * so a bounded verifier subagent cannot see test metadata prior to after-action sealing.
 */
export function createBlindTwinProjection(workspaceState, extraForbiddenKeys = []) {
  const forbidden = new Set([...DEFAULT_BLIND_KEYS, ...extraForbiddenKeys]);
  let strippedFieldCount = 0;

  const scrub = (val) => {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(scrub);
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (forbidden.has(k)) {
        strippedFieldCount += 1;
        continue;
      }
      clean[k] = scrub(v);
    }
    return clean;
  };

  const projected = scrub(workspaceState);
  return {
    projection: projected,
    strippedFieldCount,
    projectionSha256: sha256Hex(canonicalJson(projected))
  };
}

/**
 * Mandatory pre-dispatch self-leak gauge verifying zero forbidden keys or rubric markers
 * remain in a twin-readable dispatch payload.
 */
export function preDispatchSelfLeakCheck(payload, extraForbiddenKeys = []) {
  const forbidden = new Set([...DEFAULT_BLIND_KEYS, ...extraForbiddenKeys]);
  const leakedPaths = [];

  const inspect = (val, currentPath) => {
    if (val === null || typeof val !== 'object') return;
    if (Array.isArray(val)) {
      val.forEach((item, idx) => inspect(item, `${currentPath}[${idx}]`));
      return;
    }
    for (const [k, v] of Object.entries(val)) {
      const nextPath = currentPath ? `${currentPath}.${k}` : k;
      if (forbidden.has(k)) {
        leakedPaths.push(nextPath);
      }
      inspect(v, nextPath);
    }
  };

  inspect(payload, '');
  return {
    leakFree: leakedPaths.length === 0,
    leakedPaths
  };
}
