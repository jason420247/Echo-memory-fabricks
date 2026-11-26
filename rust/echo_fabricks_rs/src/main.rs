//! Echo-Memory-Fabricks — Pure-`std` Native Rust Polyglot Adjudicator (`DELEGATE-B`)
//!
//! Zero external crates. Implements bit-compatible:
//! - FIPS 180-4 SHA-256
//! - Mulberry32 32-bit PRNG & seeded ternary hypervectors
//! - Base-243 (5 trits/byte) packing & self-verifying FBRK binary frames
//! - Belnap-Dunn Four-Valued Bilattice (TRUE, FALSE, NEITHER, BOTH)
//! - Per-Observer Dual-Window Adaptive Channel-Echo Kernel (with bit-identical dormancy)
//! - Reusable Type-Safe SteeringGate (bias clamping, drift alignment, recursion loop cap)

use std::env;

const FBRK_MAGIC: &[u8; 4] = b"FBRK";
const FBRK_VERSION: u8 = 1;
const POW3: [u16; 5] = [1, 3, 9, 27, 81];
const EPSILON: f64 = 1e-12;

const SHA256_K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

pub fn sha256_bytes(data: &[u8]) -> [u8; 32] {
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    let bit_len = (data.len() as u64) * 8;
    let mut padded = Vec::with_capacity(((data.len() + 9 + 63) / 64) * 64);
    padded.extend_from_slice(data);
    padded.push(0x80);
    while (padded.len() % 64) != 56 {
        padded.push(0x00);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    for chunk in padded.chunks_exact(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            let j = i * 4;
            w[i] = u32::from_be_bytes([chunk[j], chunk[j + 1], chunk[j + 2], chunk[j + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }

        let mut a = h[0];
        let mut b = h[1];
        let mut c = h[2];
        let mut d = h[3];
        let mut e = h[4];
        let mut f = h[5];
        let mut g = h[6];
        let mut hh = h[7];

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(SHA256_K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }

    let mut out = [0u8; 32];
    for (i, word) in h.iter().enumerate() {
        out[i * 4..(i + 1) * 4].copy_from_slice(&word.to_be_bytes());
    }
    out
}

pub fn bytes_to_hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Belnap {
    Neither,
    True,
    False,
    Both,
}

impl Belnap {
    pub fn support(self) -> (bool, bool) {
        match self {
            Belnap::Neither => (false, false),
            Belnap::True => (true, false),
            Belnap::False => (false, true),
            Belnap::Both => (true, true),
        }
    }

    pub fn from_support(t: bool, f: bool) -> Self {
        match (t, f) {
            (true, true) => Belnap::Both,
            (true, false) => Belnap::True,
            (false, true) => Belnap::False,
            (false, false) => Belnap::Neither,
        }
    }

    pub fn negate(self) -> Self {
        let (t, f) = self.support();
        Self::from_support(f, t)
    }

    pub fn knowledge_merge(self, other: Self) -> Self {
        let (ta, fa) = self.support();
        let (tb, fb) = other.support();
        Self::from_support(ta || tb, fa || fb)
    }
}

pub struct Mulberry32 {
    state: u32,
}

impl Mulberry32 {
    pub fn new(seed: u32) -> Self {
        Self { state: seed }
    }

    pub fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_add(0x6D2B79F5);
        let t1 = (self.state ^ (self.state >> 15)).wrapping_mul(self.state | 1);
        let t2 = t1.wrapping_add((t1 ^ (t1 >> 7)).wrapping_mul(t1 | 61)) ^ t1;
        t2 ^ (t2 >> 14)
    }
}

pub fn random_ternary_vector(dim: usize, seed: u32, sparsity_zero_prob: f64) -> Vec<i8> {
    let mut rng = Mulberry32::new(seed);
    let zero_threshold = (sparsity_zero_prob * 4294967296.0).floor() as u64;
    let mut out = Vec::with_capacity(dim);
    for _ in 0..dim {
        let r = rng.next_u32() as u64;
        if zero_threshold > 0 && r < zero_threshold {
            out.push(0);
        } else {
            let bit = rng.next_u32() & 1;
            out.push(if bit == 1 { 1 } else { -1 });
        }
    }
    out
}

pub fn pack_base243(trits: &[i8]) -> Vec<u8> {
    let n = trits.len();
    let byte_len = (n + 4) / 5;
    let mut out = vec![0u8; byte_len];
    for i in 0..byte_len {
        let mut acc: u16 = 0;
        let base = i * 5;
        for k in 0..5 {
            let idx = base + k;
            let t = if idx < n { trits[idx] } else { 0 };
            assert!(t == -1 || t == 0 || t == 1, "INVALID_TRIT_VALUE");
            acc += ((t + 1) as u16) * POW3[k];
        }
        out[i] = acc as u8;
    }
    out
}

pub fn unpack_base243(packed: &[u8], trit_length: usize) -> Vec<i8> {
    let expected = (trit_length + 4) / 5;
    assert!(packed.len() >= expected, "BASE243_BUFFER_TOO_SHORT");
    let mut out = vec![0i8; trit_length];
    for i in 0..expected {
        let mut val = packed[i] as u16;
        assert!(val <= 242, "INVALID_BASE243_BYTE");
        let base = i * 5;
        for k in 0..5 {
            let idx = base + k;
            let digit = (val % 3) as i8;
            val /= 3;
            if idx < trit_length {
                out[idx] = digit - 1;
            }
        }
    }
    out
}

pub fn encode_fbrk_frame(trits: &[i8]) -> Vec<u8> {
    let packed = pack_base243(trits);
    let digest = sha256_bytes(&packed);
    let mut frame = Vec::with_capacity(41 + packed.len());
    frame.extend_from_slice(FBRK_MAGIC);
    frame.push(FBRK_VERSION);
    frame.extend_from_slice(&(trits.len() as u32).to_be_bytes());
    frame.extend_from_slice(&digest);
    frame.extend_from_slice(&packed);
    frame
}

pub fn decode_fbrk_frame(frame: &[u8]) -> Result<Vec<i8>, &'static str> {
    if frame.len() < 41 {
        return Err("FBRK_FRAME_TOO_SHORT");
    }
    if &frame[0..4] != FBRK_MAGIC {
        return Err("FBRK_BAD_MAGIC");
    }
    if frame[4] != FBRK_VERSION {
        return Err("FBRK_UNSUPPORTED_VERSION");
    }
    let trit_len = u32::from_be_bytes([frame[5], frame[6], frame[7], frame[8]]) as usize;
    let payload = &frame[41..];
    let actual_digest = sha256_bytes(payload);
    if actual_digest.as_slice() != &frame[9..41] {
        return Err("FBRK_SHA256_INTEGRITY_MISMATCH");
    }
    Ok(unpack_base243(payload, trit_len))
}

#[derive(Clone, Debug)]
pub struct EchoStepResult {
    pub z_prime: f64,
    pub z_tilde: f64,
    pub lambda: f64,
    pub engaged: bool,
    pub d_stat: f64,
    pub trip_threshold: f64,
}

pub struct ChannelEchoKernel {
    pub w_fast: usize,
    pub w_slow: usize,
    pub lambda_max: f64,
    pub g_engage: f64,
    pub gamma: f64,
    pub trip_base: f64,
    sq_history: Vec<f64>,
    z_tilde_history: Vec<f64>,
    sample_count: usize,
}

impl ChannelEchoKernel {
    pub fn new() -> Self {
        Self {
            w_fast: 8,
            w_slow: 32,
            lambda_max: 4.0,
            g_engage: 2.0,
            gamma: 0.15,
            trip_base: 0.8,
            sq_history: Vec::new(),
            z_tilde_history: Vec::new(),
            sample_count: 0,
        }
    }

    pub fn step(&mut self, raw_z: f64, g_static: f64, sigma_pre: f64) -> EchoStepResult {
        self.sample_count += 1;
        let n = self.sample_count;
        let z_prime = if g_static == 0.0 { raw_z } else { raw_z - g_static };
        let z_sq = z_prime * z_prime;

        self.sq_history.push(z_sq);
        if self.sq_history.len() > self.w_slow {
            self.sq_history.remove(0);
        }

        let mut lambda = 1.0;
        let mut engaged = false;
        let mut z_tilde = z_prime;
        let mut transient_conf = 0.0;

        if n >= self.w_fast {
            let len = self.sq_history.len();
            let fast_sum: f64 = self.sq_history[len - self.w_fast..].iter().sum();
            let v_fast = fast_sum / (self.w_fast as f64);
            let slow_sum: f64 = self.sq_history.iter().sum();
            let v_slow = slow_sum / (len as f64);
            let raw_ratio = v_fast / v_slow.max(EPSILON);
            lambda = raw_ratio.clamp(1.0, self.lambda_max);

            let std_innov = z_prime.abs() / sigma_pre;
            engaged = (std_innov > self.g_engage) && (lambda > 1.0);
            if engaged {
                z_tilde = z_prime / lambda.sqrt();
                transient_conf = (lambda - 1.0) / (self.lambda_max - 1.0);
            }
        }

        self.z_tilde_history.push(z_tilde);
        if self.z_tilde_history.len() > self.w_slow {
            self.z_tilde_history.remove(0);
        }

        let energy_sum: f64 = self.z_tilde_history.iter().map(|x| x * x).sum();
        let d_stat = energy_sum.sqrt();
        let trip_threshold = if engaged {
            self.trip_base + self.gamma * transient_conf
        } else {
            self.trip_base
        };

        EchoStepResult {
            z_prime,
            z_tilde,
            lambda,
            engaged,
            d_stat,
            trip_threshold,
        }
    }
}

/// Type-safe SteeringGate governing attention bias clamping, drift alignment, and recursion caps.
pub struct SteeringGate {
    pub attention_bias_technical: f32,
    pub attention_bias_administrative: f32,
    pub nested_recurrence_depth_limit: u32,
}

impl SteeringGate {
    pub fn new() -> Self {
        Self {
            attention_bias_technical: 1.00,
            attention_bias_administrative: 0.15,
            nested_recurrence_depth_limit: 12,
        }
    }

    pub fn f_steer_bias(&mut self, technical_weight: f32, admin_weight: f32) {
        self.attention_bias_technical = technical_weight.clamp(0.0, 1.0);
        self.attention_bias_administrative = admin_weight.clamp(0.0, 1.0);
    }

    pub fn f_drift_align(&self, context_stream: &mut String, semantic_distance: f32) -> bool {
        if semantic_distance > 0.12 {
            context_stream.push_str("\n[SYSTEM_ACTION: REALIGN_CONTEXT_INVARIANTS]");
            true
        } else {
            false
        }
    }

    pub fn f_loop_cap(&self, active_subagent_depth: u32) -> bool {
        active_subagent_depth <= self.nested_recurrence_depth_limit
    }
}

fn run_self_test() -> String {
    // 1. FIPS 180-4 SHA-256 test vector ("abc")
    let abc_sha = bytes_to_hex(&sha256_bytes(b"abc"));
    assert_eq!(
        abc_sha,
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );

    // 2. Belnap-Dunn paraconsistency
    assert_eq!(Belnap::Neither.negate(), Belnap::Neither);
    assert_eq!(Belnap::Both.negate(), Belnap::Both);
    assert_eq!(Belnap::True.knowledge_merge(Belnap::False), Belnap::Both);

    // 3. Base-243 FBRK round-trip
    let trits = random_ternary_vector(257, 424242, 0.2);
    let frame = encode_fbrk_frame(&trits);
    let decoded = decode_fbrk_frame(&frame).expect("FBRK decode ok");
    assert_eq!(decoded, trits);
    let frame_sha = bytes_to_hex(&sha256_bytes(&frame));

    // 4. Channel-Echo bit-identical dormancy
    let mut kernel = ChannelEchoKernel::new();
    for z in [0.12, -0.08, 0.05, 0.19, -0.14, 0.03, -0.09, 0.11, -0.04, 0.07] {
        let step = kernel.step(z, 0.0, 1.0);
        assert!(!step.engaged);
        assert_eq!(step.z_tilde.to_bits(), step.z_prime.to_bits());
    }

    // 5. SteeringGate bounds
    let mut gate = SteeringGate::new();
    gate.f_steer_bias(1.5, -0.2);
    assert_eq!(gate.attention_bias_technical, 1.0);
    assert_eq!(gate.attention_bias_administrative, 0.0);
    assert!(gate.f_loop_cap(12));
    assert!(!gate.f_loop_cap(13));
    let mut stream = String::from("anchor");
    assert!(gate.f_drift_align(&mut stream, 0.20));

    format!(
        "{{\"ok\":true,\"runtime\":\"rust_std_only\",\"fbrkFrameHexSha256\":\"{}\"}}",
        frame_sha
    )
}

fn emit_parity_fixture(seed: u32) -> String {
    let trits = random_ternary_vector(128, seed, 0.15);
    let frame = encode_fbrk_frame(&trits);
    let frame_hex = bytes_to_hex(&frame);
    let frame_sha = bytes_to_hex(&sha256_bytes(&frame));

    let mut kernel = ChannelEchoKernel::new();
    let stream = [0.1, -0.2, 0.15, -0.05, 0.12, -0.18, 0.09, -0.11, 3.4, -2.9, 2.5, -2.1];
    let mut last = EchoStepResult {
        z_prime: 0.0,
        z_tilde: 0.0,
        lambda: 1.0,
        engaged: false,
        d_stat: 0.0,
        trip_threshold: 0.8,
    };
    for x in stream {
        last = kernel.step(x, 0.0, 1.0);
    }

    let trits_json: Vec<String> = trits.iter().map(|t| t.to_string()).collect();
    format!(
        "{{\"seed\":{},\"trits\":[{}],\"fbrkHex\":\"{}\",\"fbrkSha256\":\"{}\",\"kernelFinal\":{{\"engaged\":{},\"lambda\":{:.16},\"zTilde\":{:.16},\"dStat\":{:.16},\"tripThreshold\":{:.16}}}}}",
        seed,
        trits_json.join(","),
        frame_hex,
        frame_sha,
        if last.engaged { "true" } else { "false" },
        last.lambda,
        last.z_tilde,
        last.d_stat,
        last.trip_threshold
    )
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if let Some(pos) = args.iter().position(|a| a == "--parity-seed") {
        let seed: u32 = args
            .get(pos + 1)
            .expect("seed value required")
            .parse()
            .expect("valid u32 seed");
        println!("{}", emit_parity_fixture(seed));
    } else {
        println!("{}", run_self_test());
    }
}
