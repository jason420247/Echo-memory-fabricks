#!/usr/bin/env python3
"""
Echo-Memory-Fabricks — Python 3.11+ `-S` Stdlib-Only Reference Core.

Byte-compatible with the Node.js >=22 ESM implementation across:
- Canonical JSON & SHA-256 digests
- Mulberry32 32-bit unsigned PRNG & seeded ternary hypervectors
- Base-243 (5 trits/byte) packing & self-verifying FBRK binary frames
- Belnap-Dunn Four-Valued Bilattice (TRUE, FALSE, NEITHER, BOTH)
- 4-Phase Quaternary VSA exact bind/unbind/bundle
- Per-Observer Dual-Window Adaptive Channel-Echo Kernel (with bit-identical dormancy)
"""

import hashlib
import json
import math
import struct
import sys
from typing import Any, Callable, Dict, List, Sequence, Tuple

FBRK_MAGIC = b"FBRK"
FBRK_VERSION = 1
POW3 = (1, 3, 9, 27, 81)
EPSILON = 1e-12

BELNAP_TRUE = "TRUE"
BELNAP_FALSE = "FALSE"
BELNAP_NEITHER = "NEITHER"
BELNAP_BOTH = "BOTH"

_TRUTH_SUPPORT = {
    BELNAP_NEITHER: (False, False),
    BELNAP_TRUE: (True, False),
    BELNAP_FALSE: (False, True),
    BELNAP_BOTH: (True, True),
}


def _from_support(t: bool, f: bool) -> str:
    if t and f:
        return BELNAP_BOTH
    if t:
        return BELNAP_TRUE
    if f:
        return BELNAP_FALSE
    return BELNAP_NEITHER


def belnap_negate(a: str) -> str:
    t, f = _TRUTH_SUPPORT[a]
    return _from_support(f, t)


def belnap_truth_meet(a: str, b: str) -> str:
    ta, fa = _TRUTH_SUPPORT[a]
    tb, fb = _TRUTH_SUPPORT[b]
    return _from_support(ta and tb, fa or fb)


def belnap_truth_join(a: str, b: str) -> str:
    ta, fa = _TRUTH_SUPPORT[a]
    tb, fb = _TRUTH_SUPPORT[b]
    return _from_support(ta or tb, fa and fb)


def belnap_knowledge_merge(a: str, b: str) -> str:
    ta, fa = _TRUTH_SUPPORT[a]
    tb, fb = _TRUTH_SUPPORT[b]
    return _from_support(ta or tb, fa or fb)


def belnap_knowledge_consensus(a: str, b: str) -> str:
    ta, fa = _TRUTH_SUPPORT[a]
    tb, fb = _TRUTH_SUPPORT[b]
    return _from_support(ta and tb, fa and fb)


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(data: bytes | str) -> str:
    raw = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(raw).hexdigest()


def _imul32(a: int, b: int) -> int:
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF


def mulberry32(seed: int) -> Callable[[], int]:
    """Exact bit-for-bit match with JS createSeededPrng(seed)."""
    state = seed & 0xFFFFFFFF

    def next_u32() -> int:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = _imul32(t ^ (t >> 15), t | 1)
        t = (t + _imul32(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        t = (t ^ ((state ^ (state >> 15)) if False else 0)) & 0xFFFFFFFF  # no-op clarity
        # Exact JS line: t = (t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0)) ^ t;
        # Wait: recompute cleanly from t1 = imul32(state ^ (state >> 15), state | 1)
        t1 = _imul32(state ^ (state >> 15), state | 1)
        t2 = ((t1 + _imul32(t1 ^ (t1 >> 7), t1 | 61)) & 0xFFFFFFFF) ^ t1
        return (t2 ^ (t2 >> 14)) & 0xFFFFFFFF

    return next_u32


def random_ternary_vector(dim: int, seed: int, sparsity_zero_prob: float = 0.0) -> List[int]:
    next_u32 = mulberry32(seed)
    zero_threshold = int(math.floor(sparsity_zero_prob * 4294967296.0))
    out: List[int] = []
    for _ in range(dim):
        r = next_u32()
        if zero_threshold > 0 and r < zero_threshold:
            out.append(0)
        else:
            bit = next_u32() & 1
            out.append(1 if bit == 1 else -1)
    return out


def pack_base243(trits: Sequence[int]) -> bytes:
    n = len(trits)
    byte_len = (n + 4) // 5
    out = bytearray(byte_len)
    for i in range(byte_len):
        acc = 0
        base = i * 5
        for k in range(5):
            idx = base + k
            t = trits[idx] if idx < n else 0
            if t not in (-1, 0, 1):
                raise ValueError(f"INVALID_TRIT_VALUE at {idx}: {t}")
            acc += (t + 1) * POW3[k]
        out[i] = acc
    return bytes(out)


def unpack_base243(packed: bytes, trit_length: int) -> List[int]:
    expected_bytes = (trit_length + 4) // 5
    if len(packed) < expected_bytes:
        raise ValueError("BASE243_BUFFER_TOO_SHORT")
    out = [0] * trit_length
    for i in range(expected_bytes):
        val = packed[i]
        if val > 242:
            raise ValueError(f"INVALID_BASE243_BYTE at {i}: {val}")
        base = i * 5
        for k in range(5):
            idx = base + k
            digit = val % 3
            val //= 3
            if idx < trit_length:
                out[idx] = digit - 1
    return out


def encode_fbrk_frame(trits: Sequence[int]) -> bytes:
    packed = pack_base243(trits)
    digest = hashlib.sha256(packed).digest()
    header = struct.pack(">4sBI32s", FBRK_MAGIC, FBRK_VERSION, len(trits), digest)
    return header + packed


def decode_fbrk_frame(frame: bytes) -> Dict[str, Any]:
    if len(frame) < 41:
        raise ValueError("FBRK_FRAME_TOO_SHORT")
    magic, version, trit_length, expected_digest = struct.unpack(">4sBI32s", frame[:41])
    if magic != FBRK_MAGIC:
        raise ValueError("FBRK_BAD_MAGIC")
    if version != FBRK_VERSION:
        raise ValueError(f"FBRK_UNSUPPORTED_VERSION: {version}")
    payload = frame[41:]
    actual_digest = hashlib.sha256(payload).digest()
    if actual_digest != expected_digest:
        raise ValueError("FBRK_SHA256_INTEGRITY_MISMATCH")
    return {
        "version": version,
        "tritLength": trit_length,
        "payloadSha256": actual_digest.hex(),
        "trits": unpack_base243(payload, trit_length),
    }


_PHASE_COS = (1, 0, -1, 0)
_PHASE_SIN = (0, 1, 0, -1)


def q4_bind(role_vec: Sequence[int], filler_vec: Sequence[int]) -> List[int]:
    return [(a + b) & 3 for a, b in zip(role_vec, filler_vec)]


def q4_unbind(bound_vec: Sequence[int], role_vec: Sequence[int]) -> List[int]:
    return [(c - a + 4) & 3 for c, a in zip(bound_vec, role_vec)]


def q4_bundle(vectors: Sequence[Sequence[int]]) -> List[int]:
    dim = len(vectors[0])
    out = [0] * dim
    for i in range(dim):
        re = 0
        im = 0
        for v in vectors:
            p = v[i] & 3
            re += _PHASE_COS[p]
            im += _PHASE_SIN[p]
        if abs(re) >= abs(im):
            out[i] = 0 if re >= 0 else 2
        else:
            out[i] = 1 if im >= 0 else 3
    return out


def q4_similarity(a: Sequence[int], b: Sequence[int]) -> float:
    total = sum(_PHASE_COS[(x - y + 4) & 3] for x, y in zip(a, b))
    return total / len(a)


class ChannelEchoKernel:
    """Per-observer dual-window adaptive transient kernel matching JS stepObserver."""

    def __init__(
        self,
        w_fast: int = 8,
        w_slow: int = 32,
        lambda_max: float = 4.0,
        g_engage: float = 2.0,
        gamma: float = 0.15,
        trip_base: float = 0.8,
        logistic_a: float = -4.0,
        logistic_b: float = 1.0,
    ) -> None:
        if w_fast < 1 or w_slow <= w_fast:
            raise ValueError("INVALID_WINDOW_CONFIG")
        self.w_fast = w_fast
        self.w_slow = w_slow
        self.lambda_max = lambda_max
        self.g_engage = g_engage
        self.gamma = gamma
        self.trip_base = trip_base
        self.logistic_a = logistic_a
        self.logistic_b = logistic_b
        self._observers: Dict[str, Dict[str, Any]] = {}

    def reset_run(self) -> None:
        self._observers.clear()

    def step_observer(
        self,
        observer_id: str,
        raw_z: float,
        g_static: float = 0.0,
        sigma_pre: float = 1.0,
        tick: int | None = None,
    ) -> Dict[str, Any]:
        st = self._observers.setdefault(
            observer_id,
            {
                "sq_history": [],
                "z_tilde_history": [],
                "sample_count": 0,
                "engaged_ticks": 0,
                "confirmed_at_tick": None,
            },
        )
        st["sample_count"] += 1
        n = st["sample_count"]

        z_prime = raw_z if g_static == 0.0 else raw_z - g_static
        z_sq = z_prime * z_prime
        st["sq_history"].append(z_sq)
        if len(st["sq_history"]) > self.w_slow:
            st["sq_history"].pop(0)

        v_fast = z_sq
        v_slow = z_sq
        lam = 1.0
        engaged = False
        adaptive_scale = 1.0
        transient_conf = 0.0
        z_tilde = z_prime

        if n >= self.w_fast:
            sq_hist = st["sq_history"]
            v_fast = sum(sq_hist[-self.w_fast :]) / self.w_fast
            v_slow = sum(sq_hist) / len(sq_hist)
            raw_ratio = v_fast / max(v_slow, EPSILON)
            lam = min(self.lambda_max, max(1.0, raw_ratio))
            std_innov = abs(z_prime) / sigma_pre
            engaged = (std_innov > self.g_engage) and (lam > 1.0)
            if engaged:
                st["engaged_ticks"] += 1
                adaptive_scale = math.sqrt(lam)
                z_tilde = z_prime / adaptive_scale
                transient_conf = (lam - 1.0) / (self.lambda_max - 1.0)

        st["z_tilde_history"].append(z_tilde)
        if len(st["z_tilde_history"]) > self.w_slow:
            st["z_tilde_history"].pop(0)

        energy_sum = sum(x * x for x in st["z_tilde_history"])
        d_stat = math.sqrt(energy_sum)
        posterior_conf = 1.0 / (1.0 + math.exp(-(self.logistic_a + self.logistic_b * d_stat)))
        trip_threshold = (
            self.trip_base + self.gamma * transient_conf if engaged else self.trip_base
        )

        eff_tick = tick if tick is not None else n
        if n >= self.w_fast and st["confirmed_at_tick"] is None and posterior_conf >= trip_threshold:
            st["confirmed_at_tick"] = eff_tick

        return {
            "observerId": observer_id,
            "sampleIndex": n,
            "tick": eff_tick,
            "zPrime": z_prime,
            "zTilde": z_tilde,
            "vFast": v_fast,
            "vSlow": v_slow,
            "lambda": lam,
            "engaged": engaged,
            "adaptiveScale": adaptive_scale,
            "transientConfidence": transient_conf,
            "dStat": d_stat,
            "posteriorConf": posterior_conf,
            "tripThreshold": trip_threshold,
            "confirmed": st["confirmed_at_tick"] is not None,
            "confirmedAtTick": st["confirmed_at_tick"],
            "engagedFraction": st["engaged_ticks"] / n,
        }


def run_self_test() -> Dict[str, Any]:
    # 1. Belnap-Dunn non-explosion & paraconsistency
    assert belnap_negate(BELNAP_NEITHER) == BELNAP_NEITHER
    assert belnap_negate(BELNAP_BOTH) == BELNAP_BOTH
    assert belnap_knowledge_merge(BELNAP_TRUE, BELNAP_FALSE) == BELNAP_BOTH

    # 2. Base-243 & FBRK roundtrip across non-multiple-of-5 dimension
    trits = random_ternary_vector(257, 424242, 0.2)
    frame = encode_fbrk_frame(trits)
    decoded = decode_fbrk_frame(frame)
    assert decoded["trits"] == trits

    # 3. Quaternary exact single-pair unbinding
    rng = mulberry32(999)
    role = [rng() & 3 for _ in range(512)]
    filler = [rng() & 3 for _ in range(512)]
    bound = q4_bind(role, filler)
    unbound = q4_unbind(bound, role)
    assert unbound == filler
    assert q4_similarity(unbound, filler) == 1.0

    # 4. Channel-Echo bit-identical nested reduction when dormant
    kernel = ChannelEchoKernel()
    quiet_samples = [0.12, -0.08, 0.05, 0.19, -0.14, 0.03, -0.09, 0.11, -0.04, 0.07, 0.02, -0.06]
    for z in quiet_samples:
        out = kernel.step_observer("obs-quiet", z)
        assert not out["engaged"]
        assert out["zTilde"] == out["zPrime"]

    return {
        "ok": True,
        "runtime": "python_stdlib_only",
        "sitePackagesLoaded": "site" in sys.modules,
        "fbrkFrameHexSha256": sha256_hex(frame),
        "sampleTritsPrefix": trits[:12],
    }


def emit_parity_fixture(seed: int) -> Dict[str, Any]:
    trits = random_ternary_vector(128, seed, 0.15)
    frame = encode_fbrk_frame(trits)
    kernel = ChannelEchoKernel()
    stream = [0.1, -0.2, 0.15, -0.05, 0.12, -0.18, 0.09, -0.11, 3.4, -2.9, 2.5, -2.1]
    traces = [kernel.step_observer("obs-parity", x) for x in stream]
    return {
        "seed": seed,
        "trits": trits,
        "fbrkHex": frame.hex(),
        "fbrkSha256": sha256_hex(frame),
        "kernelFinal": traces[-1],
    }


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--parity-seed" in args:
        idx = args.index("--parity-seed")
        seed_val = int(args[idx + 1])
        print(json.dumps(emit_parity_fixture(seed_val)))
    elif "--self-test" in args:
        result = run_self_test()
        if "--json" in args:
            print(json.dumps(result))
        else:
            print(f"PYTHON_SELF_TEST_OK sha={result['fbrkFrameHexSha256']}")
    else:
        print(json.dumps(run_self_test()))
