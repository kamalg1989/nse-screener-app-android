import { OHLC } from '../screener/screener'

export interface IFPResult {
  passed: boolean
  score: number // 0-1, min 0.25 to pass
  surgeUpDays: number // up days with vol > 1.5x avg
  dryupDownDays: number // down days with vol < avg
  lookbackDays: number
  reason?: string
}

/**
 * IFP (Institutional Footprint) Detection
 * Scores based on:
 * - Volume surge days: up days with volume > 1.5x avg AND close position ≥ 60%
 * - Volume dryup days: down days with volume < avg
 * Score = (surge_up + dry_down) / lookback
 * Min score: 0.25 to pass
 */
export function detectIFP(
  ohlcData: OHLC[],
  config: any
): IFPResult {
  const lookbackDays = config.ifpLookback || 30
  const minScore = 0.25

  const result: IFPResult = {
    passed: false,
    score: 0,
    surgeUpDays: 0,
    dryupDownDays: 0,
    lookbackDays,
  }

  if (ohlcData.length < lookbackDays + 1) {
    result.reason = `Insufficient data (<${lookbackDays + 1} bars)`
    return result
  }

  const recent = ohlcData.slice(-lookbackDays)
  
  // Calculate average volume for reference
  const avgVolume = recent.reduce((sum, o) => sum + o.volume, 0) / lookbackDays
  const volSurgeThreshold = avgVolume * 1.5

  let surgeUpDays = 0
  let dryupDownDays = 0

  for (const candle of recent) {
    const isUp = candle.close > candle.open
    const isDown = candle.close < candle.open
    const range = candle.high - candle.low
    const closePosition = range > 0 ? (candle.close - candle.low) / range : 0

    // Volume surge day: UP day with vol > 1.5x avg AND close position ≥ 60%
    if (isUp && candle.volume > volSurgeThreshold && closePosition >= 0.6) {
      surgeUpDays++
    }

    // Volume dryup day: DOWN day with vol < avg
    if (isDown && candle.volume < avgVolume) {
      dryupDownDays++
    }
  }

  const score = (surgeUpDays + dryupDownDays) / lookbackDays
  
  result.surgeUpDays = surgeUpDays
  result.dryupDownDays = dryupDownDays
  result.score = score

  if (score >= minScore) {
    result.passed = true
  } else {
    result.reason = `IFP score too low (${score.toFixed(2)} < ${minScore})`
  }

  return result
}
