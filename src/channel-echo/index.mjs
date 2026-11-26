/**
 * Brick 5 — fabrick-channel-echo
 *
 * Per-Observer Dual-Window Adaptive Transient Kernel.
 * Distinguishes intrinsic observer "echo" ringing from persistent shifts:
 *   1. Relational residual: z'[n] = z[n] - g_static
 *   2. Dual-window covariance ratio: lambda[n] = clamp(V_fast / V_slow, 1, lambda_max)
 *   3. Standardized-innovation engagement gate: (|z'[n]| / sigma_pre > g_engage) && (lambda[n] > 1)
 *   4. Diagonal variance whitening: z_tilde[n] = z'[n] / sqrt(lambda[n]) when engaged, else exact z'[n]
 *   5. Graded forward trip modulation: trip[n] = trip_base + gamma * c[n]
 *
 * Guarantees bit-identical IEEE-754 nested reduction to the nominal baseline whenever unengaged.
 */

const EPSILON = 1e-12;

export class ChannelEchoKernel {
  constructor(config = {}) {
    this.wFast = config.wFast ?? 8;
    this.wSlow = config.wSlow ?? 32;
    this.lambdaMax = config.lambdaMax ?? 4.0;
    this.gEngage = config.gEngage ?? 2.0;
    this.gamma = config.gamma ?? 0.15;
    this.tripBase = config.tripBase ?? 0.8;
    this.logisticA = config.logisticA ?? -4.0;
    this.logisticB = config.logisticB ?? 1.0;

    if (this.wFast < 1 || this.wSlow <= this.wFast) {
      throw new Error('INVALID_WINDOW_CONFIG: require 1 <= wFast < wSlow');
    }
    if (this.lambdaMax <= 1.0) {
      throw new Error('INVALID_LAMBDA_MAX: require lambdaMax > 1.0');
    }

    this._observers = new Map();
  }

  resetRun() {
    this._observers.clear();
  }

  _getObserverState(observerId) {
    if (!this._observers.has(observerId)) {
      this._observers.set(observerId, {
        sqHistory: [], // trailing z'^2 ring buffer up to wSlow
        zTildeHistory: [],
        sampleCount: 0,
        engagedTicks: 0,
        confirmedAtTick: null
      });
    }
    return this._observers.get(observerId);
  }

  /**
   * Processes one causal post-flag sample for `observerId`.
   */
  stepObserver(
    observerId,
    { rawZ, gStatic = 0.0, sigmaPre = 1.0, tick = null }
  ) {
    if (typeof rawZ !== 'number' || Number.isNaN(rawZ)) {
      throw new Error('CHANNEL_ECHO_INVALID_RAW_Z');
    }
    if (typeof sigmaPre !== 'number' || sigmaPre <= 0) {
      throw new Error('CHANNEL_ECHO_INVALID_SIGMA_PRE');
    }

    const st = this._getObserverState(observerId);
    st.sampleCount += 1;
    const n = st.sampleCount;

    // 1. Relational residual (exact IEEE-754 subtraction; if gStatic === 0, zPrime === rawZ)
    const zPrime = gStatic === 0.0 ? rawZ : rawZ - gStatic;
    const zSq = zPrime * zPrime;

    st.sqHistory.push(zSq);
    if (st.sqHistory.length > this.wSlow) {
      st.sqHistory.shift();
    }

    let vFast = zSq;
    let vSlow = zSq;
    let lambda = 1.0;
    let engaged = false;
    let adaptiveScale = 1.0;
    let transientConfidence = 0.0;
    let zTilde = zPrime; // Bit-identical pass-through by default

    // Cold-start guard: dormant when n < wFast
    if (n >= this.wFast) {
      const len = st.sqHistory.length;
      let fastSum = 0.0;
      for (let i = len - this.wFast; i < len; i += 1) {
        fastSum += st.sqHistory[i];
      }
      vFast = fastSum / this.wFast;

      let slowSum = 0.0;
      for (let i = 0; i < len; i += 1) {
        slowSum += st.sqHistory[i];
      }
      vSlow = slowSum / len;

      const rawRatio = vFast / Math.max(vSlow, EPSILON);
      lambda = Math.min(this.lambdaMax, Math.max(1.0, rawRatio));

      const stdInnovation = Math.abs(zPrime) / sigmaPre;
      engaged = stdInnovation > this.gEngage && lambda > 1.0;

      if (engaged) {
        st.engagedTicks += 1;
        adaptiveScale = Math.sqrt(lambda);
        zTilde = zPrime / adaptiveScale;
        transientConfidence = (lambda - 1.0) / (this.lambdaMax - 1.0);
      }
    }

    st.zTildeHistory.push(zTilde);
    if (st.zTildeHistory.length > this.wSlow) {
      st.zTildeHistory.shift();
    }

    // Closed-form RMS detection statistic D_tilde over trailing window
    let energySum = 0.0;
    for (let i = 0; i < st.zTildeHistory.length; i += 1) {
      energySum += st.zTildeHistory[i] * st.zTildeHistory[i];
    }
    const dStat = Math.sqrt(energySum);
    const posteriorConf = 1.0 / (1.0 + Math.exp(-(this.logisticA + this.logisticB * dStat)));
    const tripThreshold =
      engaged ? this.tripBase + this.gamma * transientConfidence : this.tripBase;

    const confirmedNow =
      n >= this.wFast && st.confirmedAtTick === null && posteriorConf >= tripThreshold;
    if (confirmedNow) {
      st.confirmedAtTick = tick ?? n;
    }

    return {
      observerId,
      sampleIndex: n,
      tick: tick ?? n,
      zPrime,
      zTilde,
      vFast,
      vSlow,
      lambda,
      engaged,
      adaptiveScale,
      transientConfidence,
      dStat,
      posteriorConf,
      tripThreshold,
      confirmed: st.confirmedAtTick !== null,
      confirmedAtTick: st.confirmedAtTick,
      engagedFraction: st.engagedTicks / n
    };
  }
}

/**
 * Computes lag-1..maxLag autocorrelation energy sum(rho_k^2) for Gate-W whiteness diagnostics.
 */
export function computeLagAutocorrelationEnergy(series, maxLag = 8) {
  const n = series.length;
  if (n <= maxLag + 2) {
    return 0;
  }
  let mean = 0;
  for (let i = 0; i < n; i += 1) mean += series[i];
  mean /= n;

  const centered = new Float64Array(n);
  let varSum = 0;
  for (let i = 0; i < n; i += 1) {
    centered[i] = series[i] - mean;
    varSum += centered[i] * centered[i];
  }
  if (varSum <= EPSILON) return 0;

  let energy = 0;
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let cov = 0;
    for (let t = lag; t < n; t += 1) {
      cov += centered[t] * centered[t - lag];
    }
    const rho = cov / varSum;
    energy += rho * rho;
  }
  return energy;
}
