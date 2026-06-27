import { OHLC } from '../screener/screener'

export interface BaseQualityResult {
  passed: boolean
  priorUpmove: number // % upward move before base
  giveback: number // % pullback during base
  volumeDryupRatio: number // vol ratio during base vs before
  distanceFromHigh: number // % distance from 60-day high
  reason?: string
}

/**
 * Base Quality Assessment
 * Evaluates: prior upmove ≥15%, giveback ≤30%, vol dryup ≤1.3, distance from high ≤5%
 */
export function assessBaseQuality(
  ohlcData: OHLC[],
  config: any
): BaseQualityResult {
  const result: BaseQualityResult = {
    passed: false,
    priorUpmove: 0,
    giveback: 0,
    volumeDryupRatio: 0,
    distanceFromHigh: 0,
  }

  // Need 60+ bars for lookback
  if (ohlcData.length < 60) {
    result.reason = 'Insufficient data (<60 bars)'
    return result
  }

  const current = ohlcData[ohlcData.length - 1]
  const lookback60 = ohlcData.slice(-60)

  // === 1. Prior Upmove (60 bars, min 15%) ===
  const lowestLow60 = Math.min(...lookback60.map(o => o.low))
  const currentHigh = current.high
  const priorUpmove = lowestLow60 > 0 ? ((currentHigh - lowestLow60) / lowestLow60) * 100 : 0

  result.priorUpmove = priorUpmove

  if (priorUpmove < 15) {
    result.reason = `Prior upmove too low (${priorUpmove.toFixed(1)}% < 15%)`
    return result
  }

  // === 2. Giveback During Base (recent ~20 bars) ===
  // Giveback = how much price pulled back from the high
  const recent20 = ohlcData.slice(-20)
  const highIn20 = Math.max(...recent20.map(o => o.high))
  const lowIn20 = Math.min(...recent20.map(o => o.low))
  const giveback = highIn20 > 0 ? ((highIn20 - lowIn20) / highIn20) * 100 : 0

  result.giveback = giveback

  if (giveback > 30) {
    result.reason = `Giveback too high (${giveback.toFixed(1)}% > 30%)`
    return result
  }

  // === 3. Volume Dryup Ratio ===
  // vol during base (last 20) vs vol before base (bars 40-60)
  const volBefore = ohlcData.slice(-60, -40).reduce((sum, o) => sum + o.volume, 0) / 20
  const volDuring = ohlcData.slice(-20).reduce((sum, o) => sum + o.volume, 0) / 20
  const volumeDryupRatio = volBefore > 0 ? volDuring / volBefore : 0

  result.volumeDryupRatio = volumeDryupRatio

  if (volumeDryupRatio > 1.3) {
    result.reason = `Volume dryup ratio too high (${volumeDryupRatio.toFixed(2)} > 1.3)`
    return result
  }

  // === 4. Distance from 60-day High (max 5%) ===
  const high60 = Math.max(...lookback60.map(o => o.high))
  const distanceFromHigh = high60 > 0 ? ((high60 - current.close) / high60) * 100 : 0

  result.distanceFromHigh = distanceFromHigh

  if (distanceFromHigh > 5) {
    result.reason = `Distance from high too far (${distanceFromHigh.toFixed(1)}% > 5%)`
    return result
  }

  // === All checks passed ===
  result.passed = true
  return result
}
