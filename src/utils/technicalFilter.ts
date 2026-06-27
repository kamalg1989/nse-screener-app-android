import { OHLC } from '../screener/screener'

export interface TechnicalFilterResult {
  passed: boolean
  trendAlignment: boolean
  baseRangeOk: boolean
  volumeOk: boolean
  details: {
    ema50: number | null
    sma200: number | null
    lastClose: number
    baseRange: number
    mode: string
  }
}

/**
 * Calculate SMA (Simple Moving Average)
 */
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
  return sum / period
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null

  const k = 2 / (period + 1)
  let sum = 0
  for (let i = 0; i < period; i++) sum += prices[i]
  let emaVal = sum / period

  for (let i = period; i < prices.length; i++) {
    emaVal = prices[i] * k + emaVal * (1 - k)
  }

  return emaVal
}

/**
 * Main technical filter - checks trend alignment, base range, and volume
 */
export function checkTechnicalFilter(
  ohlcData: OHLC[],
  config: any
): TechnicalFilterResult {
  const result: TechnicalFilterResult = {
    passed: false,
    trendAlignment: false,
    baseRangeOk: false,
    volumeOk: false,
    details: {
      ema50: null,
      sma200: null,
      lastClose: 0,
      baseRange: 0,
      mode: config.trendMode,
    },
  }

  // Need minimum data for technical analysis
  if (ohlcData.length < 50) {
    console.log(`  ❌ [TECH] Insufficient data (${ohlcData.length} < 50)`)
    return result
  }

  const closes = ohlcData.map(o => o.close)
  const lastClose = closes[closes.length - 1]
  result.details.lastClose = lastClose

  // === TREND ALIGNMENT CHECK ===
  let trendPassed = true

  if (config.enableEMA50Check || config.enableSMA200Check) {
    const ema50 = config.enableEMA50Check ? calculateEMA(closes, 50) : null
    const sma200 = config.enableSMA200Check ? calculateSMA(closes, 200) : null

    result.details.ema50 = ema50
    result.details.sma200 = sma200

    const mode = config.trendMode || 'off'

    if (mode === 'strict') {
      // Strict (lenient): close > EMA50 > SMA200 (if SMA200 available, else pass)
      if (sma200 && ema50) {
        trendPassed = lastClose > ema50 && ema50 > sma200
      } else {
        // If SMA200 not available, pass (lenient mode)
        trendPassed = true
      }
    } else if (mode === 'medium') {
      // Medium (lenient): close > SMA200 AND close > EMA50 (if both available, else pass)
      if (sma200 && ema50) {
        trendPassed = lastClose > sma200 && lastClose > ema50
      } else if (sma200) {
        trendPassed = lastClose > sma200
      } else if (ema50) {
        trendPassed = lastClose > ema50
      } else {
        // If neither available, pass (lenient mode)
        trendPassed = true
      }
    } else if (mode === 'loose') {
      // Loose (lenient): close > SMA200 (if available, else pass)
      if (sma200) {
        trendPassed = lastClose > sma200
      } else {
        // If SMA200 not available, pass (lenient mode)
        trendPassed = true
      }
    } else if (mode === 'very_loose') {
      // Very loose (lenient): close >= SMA200 * (1 - buffer) (if available, else pass)
      if (sma200) {
        const buffer = config.trendCrossbackBuffer || 0.02
        trendPassed = lastClose >= sma200 * (1 - buffer)
      } else {
        // If SMA200 not available, pass (lenient mode)
        trendPassed = true
      }
    } else if (mode === 'off') {
      trendPassed = true
    }
  } else {
    // If EMA/SMA checks are disabled, automatically pass
    trendPassed = true
  }

  result.trendAlignment = trendPassed

  // === BASE RANGE CHECK ===
  const recentBars = ohlcData.slice(-config.baseRangeCheckBars)
  if (recentBars.length >= config.baseRangeCheckBars) {
    const highestHigh = Math.max(...recentBars.map(o => o.high))
    const lowestLow = Math.min(...recentBars.map(o => o.low))
    const baseRange = lowestLow > 0 ? (highestHigh - lowestLow) / lowestLow : 0
    result.details.baseRange = baseRange
    result.baseRangeOk = baseRange < config.maxBaseRange
    if (!result.baseRangeOk) console.log(`  ❌ [TECH] BaseRange too large (${(baseRange*100).toFixed(1)}% > ${(config.maxBaseRange*100).toFixed(1)}%)`)
  } else {
    result.baseRangeOk = true // Pass if not enough data
  }

  // === VOLUME CHECK ===
  const lastVolume = ohlcData[ohlcData.length - 1].volume
  const avgVolume = ohlcData.slice(-20).reduce((sum, o) => sum + o.volume, 0) / 20
  result.volumeOk = lastVolume > config.volMultiplier * avgVolume
  if (!result.volumeOk) console.log(`  ❌ [TECH] Volume too low (${lastVolume} < ${(config.volMultiplier * avgVolume).toFixed(0)})`)

  // === FINAL RESULT ===
  result.passed = result.trendAlignment && result.baseRangeOk && result.volumeOk

  return result
}
