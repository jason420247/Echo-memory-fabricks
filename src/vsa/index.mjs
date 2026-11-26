/**
 * Brick 3 — fabrick-vsa
 *
 * Implements:
 * 1. Base-243 Balanced-Ternary Codec (5 trits/byte, FBRK binary wire format, byte-compatible with Python -S).
 * 2. Deterministic cross-language Mulberry32 seeded PRNG for reproducible hypervectors.
 * 3. Balanced-Ternary HDC/VSA (bind, bundle, cosine similarity, deterministic text->lattice encoder).
 * 4. GF(2^2) finite-field arithmetic + 4-Phase Quaternary VSA (exact single-pair unbinding & superposed frames).
 * 5. L1/L2/L3 Content-Addressed Elastic Volume + Two-Way Homeostatic Expansion/Contraction Regulator.
 */

import fs from 'node:fs';
import path from 'node:path';
import { canonicalJson, sha256Hex } from '../actuation/index.mjs';

export const FBRK_MAGIC = Buffer.from([0x46, 0x42, 0x52, 0x4b]); // "FBRK"
export const FBRK_VERSION = 1;
const POW3 = [1, 3, 9, 27, 81];

/**
 * Deterministic 32-bit unsigned Mulberry32 PRNG (identical bit-output in Node and Python -S).
 */
export function createSeededPrng(seed) {
  let state = seed >>> 0;
  return function nextUint32() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0)) ^ t;
    t = (t ^ (t >>> 14)) >>> 0;
    return t;
  };
}

/**
 * Packs an array/Int8Array of balanced trits in {-1, 0, +1} at 5 trits per byte (Base-243).
 */
export function packBase243(trits) {
  const n = trits.length;
  const byteLen = Math.ceil(n / 5);
  const packed = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i += 1) {
    let acc = 0;
    const base = i * 5;
    for (let k = 0; k < 5; k += 1) {
      const idx = base + k;
      const t = idx < n ? trits[idx] : 0;
      if (t !== -1 && t !== 0 && t !== 1) {
        throw new Error(`INVALID_TRIT_VALUE: expected -1, 0, or +1 at index ${idx}, got ${t}`);
      }
      acc += (t + 1) * POW3[k];
    }
    packed[i] = acc; // 0..242
  }
  return packed;
}

/**
 * Unpacks Base-243 bytes back into an Int8Array of length `tritLength` in {-1, 0, +1}.
 */
export function unpackBase243(packedBytes, tritLength) {
  const expectedByteLen = Math.ceil(tritLength / 5);
  if (packedBytes.length < expectedByteLen) {
    throw new Error(
      `BASE243_BUFFER_TOO_SHORT: need ${expectedByteLen} bytes for ${tritLength} trits, got ${packedBytes.length}`
    );
  }
  const out = new Int8Array(tritLength);
  for (let i = 0; i < expectedByteLen; i += 1) {
    let val = packedBytes[i];
    if (val > 242) {
      throw new Error(`INVALID_BASE243_BYTE: byte ${val} at index ${i} exceeds 242`);
    }
    const base = i * 5;
    for (let k = 0; k < 5; k += 1) {
      const idx = base + k;
      const digit = val % 3;
      val = Math.floor(val / 3);
      if (idx < tritLength) {
        out[idx] = digit - 1;
      }
    }
  }
  return out;
}

/**
 * Encodes trits into a self-verifying FBRK binary frame:
 * [0..3]  "FBRK"
 * [4]     version (1)
 * [5..8]  uint32be tritLength
 * [9..40] 32-byte SHA-256 of packed payload
 * [41..]  Base-243 packed payload bytes
 */
export function encodeFbrkFrame(trits) {
  const packed = packBase243(trits);
  const digestHex = sha256Hex(Buffer.from(packed));
  const digestBuf = Buffer.from(digestHex, 'hex');
  const header = Buffer.alloc(41);
  FBRK_MAGIC.copy(header, 0);
  header.writeUInt8(FBRK_VERSION, 4);
  header.writeUInt32BE(trits.length >>> 0, 5);
  digestBuf.copy(header, 9);
  return Buffer.concat([header, Buffer.from(packed)]);
}

export function decodeFbrkFrame(frameBuf) {
  const buf = Buffer.isBuffer(frameBuf) ? frameBuf : Buffer.from(frameBuf);
  if (buf.length < 41) {
    throw new Error('FBRK_FRAME_TOO_SHORT');
  }
  if (!buf.subarray(0, 4).equals(FBRK_MAGIC)) {
    throw new Error('FBRK_BAD_MAGIC');
  }
  const version = buf.readUInt8(4);
  if (version !== FBRK_VERSION) {
    throw new Error(`FBRK_UNSUPPORTED_VERSION: ${version}`);
  }
  const tritLength = buf.readUInt32BE(5);
  const expectedShaHex = buf.subarray(9, 41).toString('hex');
  const payload = buf.subarray(41);
  const actualShaHex = sha256Hex(payload);
  if (actualShaHex !== expectedShaHex) {
    throw new Error('FBRK_SHA256_INTEGRITY_MISMATCH');
  }
  return {
    version,
    tritLength,
    payloadSha256: actualShaHex,
    trits: unpackBase243(payload, tritLength)
  };
}

/**
 * Generates a deterministic bipolar/balanced-ternary hypervector of dimension `dim`.
 * `sparsityZeroProb` = 0 yields dense {-1, +1}; >0 yields sparse {-1, 0, +1}.
 */
export function randomTernaryVector(dim, seed, sparsityZeroProb = 0.0) {
  const nextU32 = createSeededPrng(seed);
  const out = new Int8Array(dim);
  const zeroThreshold = Math.floor(sparsityZeroProb * 4294967296);
  for (let i = 0; i < dim; i += 1) {
    const r = nextU32();
    if (zeroThreshold > 0 && r < zeroThreshold) {
      out[i] = 0;
    } else {
      const bit = nextU32() & 1;
      out[i] = bit === 1 ? 1 : -1;
    }
  }
  return out;
}

export function ternaryBind(a, b) {
  if (a.length !== b.length) {
    throw new Error('VSA_DIM_MISMATCH');
  }
  const out = new Int8Array(a.length);
  for (let i = 0; i < a.length; i += 1) {
    out[i] = a[i] * b[i];
  }
  return out;
}

export function ternaryBundle(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error('VSA_BUNDLE_EMPTY');
  }
  const dim = vectors[0].length;
  const sums = new Int32Array(dim);
  for (const v of vectors) {
    if (v.length !== dim) throw new Error('VSA_DIM_MISMATCH');
    for (let i = 0; i < dim; i += 1) {
      sums[i] += v[i];
    }
  }
  const out = new Int8Array(dim);
  for (let i = 0; i < dim; i += 1) {
    out[i] = sums[i] > 0 ? 1 : sums[i] < 0 ? -1 : 0;
  }
  return out;
}

export function ternaryCosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error('VSA_DIM_MISMATCH');
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

function hashTokenSeed(token) {
  const hex = sha256Hex(token).slice(0, 8);
  return parseInt(hex, 16) >>> 0;
}

/**
 * Deterministically encodes arbitrary text + scope tags into a balanced-ternary hypervector
 * using character 3-grams and word tokens (zero external embedding model required).
 */
export function encodeTextToTernary(text, dim = 512, scopes = []) {
  const normalized = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s:_-]+/g, ' ')
    .trim();
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2);
  const features = [];
  for (const w of words) {
    features.push(`w:${w}`);
    if (w.length >= 4) {
      for (let i = 0; i <= w.length - 3; i += 1) {
        features.push(`g:${w.slice(i, i + 3)}`);
      }
    }
  }
  for (const s of scopes) {
    features.push(`s:${s.toLowerCase()}`);
    features.push(`s:${s.toLowerCase()}`); // weight scope anchor
  }
  if (features.length === 0) {
    return new Int8Array(dim);
  }
  const vecs = features.map((f) => randomTernaryVector(dim, hashTokenSeed(f), 0.1));
  return ternaryBundle(vecs);
}

/**
 * Exact GF(2^2) Finite-Field Tables over x^2 + x + 1 (elements 0, 1, 2=alpha, 3=alpha+1).
 */
const GF4_MUL_TABLE = [
  [0, 0, 0, 0],
  [0, 1, 2, 3],
  [0, 2, 3, 1],
  [0, 3, 1, 2]
];

export function gf4Add(a, b) {
  return (a ^ b) & 3;
}

export function gf4Mul(a, b) {
  return GF4_MUL_TABLE[a & 3][b & 3];
}

/**
 * 4-Phase Quaternary VSA ({0, 1, 2, 3} representing unit phasors {+1, +i, -1, -i}).
 * - Bind is modular phase addition (a + b) mod 4 (asymmetric, non-self-collapsing: bind(a,a) != 0).
 * - Unbind is exact modular phase subtraction (c - a + 4) mod 4 -> 100% lossless on single pairs,
 *   and high-capacity associative retrieval on bundled multi-slot frames.
 */
export function randomQuaternaryVector(dim, seed) {
  const nextU32 = createSeededPrng(seed);
  const out = new Uint8Array(dim);
  for (let i = 0; i < dim; i += 1) {
    out[i] = nextU32() & 3;
  }
  return out;
}

export function q4Bind(roleVec, fillerVec) {
  if (roleVec.length !== fillerVec.length) throw new Error('Q4_DIM_MISMATCH');
  const out = new Uint8Array(roleVec.length);
  for (let i = 0; i < roleVec.length; i += 1) {
    out[i] = (roleVec[i] + fillerVec[i]) & 3;
  }
  return out;
}

export function q4Unbind(boundVec, roleVec) {
  if (boundVec.length !== roleVec.length) throw new Error('Q4_DIM_MISMATCH');
  const out = new Uint8Array(boundVec.length);
  for (let i = 0; i < boundVec.length; i += 1) {
    out[i] = (boundVec[i] - roleVec[i] + 4) & 3;
  }
  return out;
}

const PHASE_COS = [1, 0, -1, 0];
const PHASE_SIN = [0, 1, 0, -1];

export function q4Bundle(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error('Q4_BUNDLE_EMPTY');
  }
  const dim = vectors[0].length;
  const out = new Uint8Array(dim);
  for (let i = 0; i < dim; i += 1) {
    let re = 0;
    let im = 0;
    for (const v of vectors) {
      const p = v[i] & 3;
      re += PHASE_COS[p];
      im += PHASE_SIN[p];
    }
    // Project summed phasor onto nearest 4th root of unity {0:(1,0), 1:(0,1), 2:(-1,0), 3:(0,-1)}
    if (Math.abs(re) >= Math.abs(im)) {
      out[i] = re >= 0 ? 0 : 2;
    } else {
      out[i] = im >= 0 ? 1 : 3;
    }
  }
  return out;
}

export function q4Similarity(a, b) {
  if (a.length !== b.length) throw new Error('Q4_DIM_MISMATCH');
  let sumCos = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = (a[i] - b[i] + 4) & 3;
    sumCos += PHASE_COS[diff];
  }
  return sumCos / a.length;
}

/**
 * Superposed Associative Crystal Frame storing role->filler pairs in a single fixed-width Q4 vector.
 */
export class SuperposedAssociativeFrame {
  constructor(dim = 1024) {
    this.dim = dim;
    this._codebook = new Map();
    this._pairs = [];
    this.frameVector = null;
  }

  registerSymbol(name, seed = null) {
    if (!this._codebook.has(name)) {
      const vec = randomQuaternaryVector(this.dim, seed !== null ? seed : hashTokenSeed(name));
      this._codebook.set(name, vec);
    }
    return this._codebook.get(name);
  }

  bindSlot(roleName, fillerName) {
    const r = this.registerSymbol(roleName);
    const f = this.registerSymbol(fillerName);
    this._pairs.push(q4Bind(r, f));
    this.frameVector = q4Bundle(this._pairs);
    return this.frameVector;
  }

  queryRole(roleName) {
    if (!this.frameVector) return null;
    const r = this.registerSymbol(roleName);
    const probe = q4Unbind(this.frameVector, r);
    let bestName = null;
    let bestScore = -Infinity;
    for (const [symName, symVec] of this._codebook.entries()) {
      const score = q4Similarity(probe, symVec);
      if (score > bestScore) {
        bestScore = score;
        bestName = symName;
      }
    }
    return { symbol: bestName, similarity: Number(bestScore.toFixed(6)) };
  }
}

/**
 * 3-Tier Content-Addressed Elastic Storage Fabric (L1 RAM LRU -> L2 FBRK CAS -> L3 Cold Archive)
 * paired with a Two-Way Homeostatic Regulator.
 */
export class ElasticCasVolume {
  constructor(options = {}) {
    this._maxL1Pages = options.maxL1Pages ?? 16;
    this._minL1Pages = options.minL1Pages ?? 4;
    this._ceilingL1Pages = options.ceilingL1Pages ?? 128;
    this._backingDir = options.backingDir || null;
    this._journal = options.journal || null;

    this._l1 = new Map(); // pageId -> Int8Array (Map iteration order = LRU)
    this._l2Cas = new Map(); // sha256 -> Buffer (in-memory or disk-mirrored CAS)
    this._pageTable = new Map(); // pageId -> { casSha256, tritLength, tier: 'L1' | 'L2' | 'L3' }
    this._l3Archive = new Map(); // casSha256 -> Buffer

    if (this._backingDir) {
      fs.mkdirSync(this._backingDir, { recursive: true });
    }
    if (this._journal) {
      this._journal.registerInverseHandler('RESTORE_L1_CAPACITY', (state, params) => {
        return { ...state, maxL1Pages: params.previousMaxL1Pages };
      });
    }
  }

  get maxL1Pages() {
    return this._maxL1Pages;
  }

  putPage(pageId, trits) {
    const frame = encodeFbrkFrame(trits);
    const casSha256 = sha256Hex(frame);

    if (!this._l2Cas.has(casSha256)) {
      this._l2Cas.set(casSha256, frame);
      if (this._backingDir) {
        fs.writeFileSync(path.join(this._backingDir, `${casSha256}.fbrk`), frame);
      }
    }

    if (this._l1.has(pageId)) {
      this._l1.delete(pageId);
    }
    this._l1.set(pageId, Int8Array.from(trits));
    this._pageTable.set(pageId, {
      casSha256,
      tritLength: trits.length,
      tier: 'L1'
    });
    this._enforceL1Cap();
    return { pageId, casSha256, byteLength: frame.length };
  }

  getPage(pageId) {
    const entry = this._pageTable.get(pageId);
    if (!entry) return null;

    if (this._l1.has(pageId)) {
      const val = this._l1.get(pageId);
      // Refresh LRU position
      this._l1.delete(pageId);
      this._l1.set(pageId, val);
      return { trits: val, sourceTier: 'L1', casSha256: entry.casSha256 };
    }

    let frame = this._l2Cas.get(entry.casSha256) || this._l3Archive.get(entry.casSha256);
    if (!frame && this._backingDir) {
      const diskPath = path.join(this._backingDir, `${entry.casSha256}.fbrk`);
      if (fs.existsSync(diskPath)) {
        frame = fs.readFileSync(diskPath);
      }
    }
    if (!frame) {
      throw new Error(`CAS_BLOB_MISSING: ${entry.casSha256}`);
    }
    const decoded = decodeFbrkFrame(frame);
    const sourceTier = entry.tier;

    // Promote back to L1 working set
    this._l1.set(pageId, decoded.trits);
    entry.tier = 'L1';
    this._enforceL1Cap();
    return { trits: decoded.trits, sourceTier, casSha256: entry.casSha256 };
  }

  archiveToColdL3(pageId) {
    const entry = this._pageTable.get(pageId);
    if (!entry) throw new Error(`PAGE_NOT_FOUND: ${pageId}`);
    this._l1.delete(pageId);
    const frame = this._l2Cas.get(entry.casSha256);
    if (frame) {
      this._l3Archive.set(entry.casSha256, frame);
      this._l2Cas.delete(entry.casSha256);
    }
    entry.tier = 'L3';
    return { pageId, tier: 'L3', casSha256: entry.casSha256 };
  }

  _enforceL1Cap() {
    while (this._l1.size > this._maxL1Pages) {
      const oldestKey = this._l1.keys().next().value;
      this._l1.delete(oldestKey);
      const meta = this._pageTable.get(oldestKey);
      if (meta && meta.tier === 'L1') {
        meta.tier = 'L2';
      }
    }
  }

  /**
   * Homeostatic two-way expansion/contraction regulator:
   * - Expands L1 capacity when ramUsedRatio < expandBelowRatio (default 0.75).
   * - Contracts L1 capacity & spills LRU pages to L2 Base-243 CAS when ramUsedRatio >= contractAboveRatio (default 0.85).
   */
  regulateHomeostasis({
    ramUsedRatio,
    expandBelowRatio = 0.75,
    contractAboveRatio = 0.85,
    timestamp = new Date().toISOString()
  }) {
    const prevCap = this._maxL1Pages;
    let nextCap = prevCap;
    let action = 'HOLD_STEADY';

    if (ramUsedRatio >= contractAboveRatio) {
      nextCap = Math.max(this._minL1Pages, Math.floor(prevCap / 2));
      action = nextCap < prevCap ? 'CONTRACT_AND_SPILL_L2' : 'AT_FLOOR_SPILL_CHECK';
    } else if (ramUsedRatio < expandBelowRatio) {
      nextCap = Math.min(this._ceilingL1Pages, prevCap * 2);
      action = nextCap > prevCap ? 'EXPAND_L1_HEADROOM' : 'AT_CEILING_HOLD';
    }

    if (nextCap !== prevCap) {
      if (this._journal) {
        this._journal.commit({
          forwardOp: { name: action, params: { newMaxL1Pages: nextCap, ramUsedRatio } },
          inverseOp: { name: 'RESTORE_L1_CAPACITY', params: { previousMaxL1Pages: prevCap } },
          preState: { maxL1Pages: prevCap },
          postState: { maxL1Pages: nextCap },
          timestamp
        });
      }
      this._maxL1Pages = nextCap;
      this._enforceL1Cap();
    }

    return {
      action,
      previousMaxL1Pages: prevCap,
      currentMaxL1Pages: this._maxL1Pages,
      l1ResidentCount: this._l1.size,
      uniqueCasBlobs: this._l2Cas.size + this._l3Archive.size
    };
  }

  stats() {
    let l1Count = 0;
    let l2Count = 0;
    let l3Count = 0;
    for (const meta of this._pageTable.values()) {
      if (meta.tier === 'L1') l1Count += 1;
      else if (meta.tier === 'L2') l2Count += 1;
      else if (meta.tier === 'L3') l3Count += 1;
    }
    const manifestHash = sha256Hex(
      canonicalJson([...this._pageTable.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    );
    return {
      totalLogicalPages: this._pageTable.size,
      l1Count,
      l2Count,
      l3Count,
      uniqueCasBlobs: this._l2Cas.size + this._l3Archive.size,
      maxL1Pages: this._maxL1Pages,
      manifestHash
    };
  }
}
