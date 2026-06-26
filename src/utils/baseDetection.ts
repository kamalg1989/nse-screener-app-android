import { OHLC } from '../screener/screener'

export interface BaseStrength {
  base: 'STRONG' | 'WEAK' | 'NONE'
  strength: number // 0-100 score
  momentum: 'UP' | 'DOWN' | 'NEUTRAL'
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
  signalQuality: number // 0-100
  details: string
}

export function detectBaseAdvanced(ohlcData: OHLC[]): BaseStrength {
  if (ohlcData.length < 21) return getWeakBase()

  const recent = ohlcData.slice(-21)
  const last = recent[recent.length - 1]
  const prev = recent[0]

  // 1. MOMENTUM: Price action in last 5 candles
  const last5 = recent.slice(-5)
  const momUp = last5.filter((c) => c.close > c.open).length
  const momentum: 'UP' | 'DOWN' | 'NEUTRAL' = momUp >= 3 ? 'UP' : momUp <= 2 ? 'DOWN' : 'NEUTRAL'

  // 2. TREND: 21-period high/low
  const high21 = Math.max(...recent.map((c) => c.high))
  const low21 = Math.min(...recent.map((c) => c.low))
  const pricePos = (last.close - low21) / (high21 - low21)
  const trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' =
    pricePos > 0.65 ? 'UPTREND' : pricePos < 0.35 ? 'DOWNTREND' : 'SIDEWAYS'

  // 3. VOLATILITY: ATR-based range
  const atr = calculateATR(recent, 14)
  const rangePercent = (atr / last.close) * 100
  const isVolatile = rangePercent > 2.5

  // 4. VOLUME: Compare last 5 to 21-period avg
  const vol21Avg = recent.reduce((s, c) => s + c.volume, 0) / recent.length
  const vol5Avg = last5.reduce((s, c) => s + c.volume, 0) / last5.length
  const volumeConfirm = vol5Avg > vol21Avg * 0.8

  // 5. CLOSE POSITION: High/Low quality
  const closePos = (last.close - last.low) / (last.high - last.low)
  const closeQuality = closePos > 0.6 ? 'STRONG' : closePos < 0.4 ? 'WEAK' : 'NEUTRAL'

  // Calculate overall scores
  let strengthScore = 0
  let signalScore = 0

  // Strength calculation
  if (trend === 'UPTREND') strengthScore += 30
  if (trend === 'DOWNTREND') strengthScore += 0
  if (momentum === 'UP') strengthScore += 25
  if (volumeConfirm) strengthScore += 20
  if (closeQuality === 'STRONG') strengthScore += 15
  if (isVolatile) strengthScore += 10

  // Signal quality calculation
  if (trend === 'UPTREND' && momentum === 'UP') signalScore += 35
  if (volumeConfirm && closeQuality === 'STRONG') signalScore += 30
  if (pricePos > 0.7) signalScore += 20
  if (isVolatile && closeQuality === 'STRONG') signalScore += 15

  // Determine base and details
  const base = strengthScore >= 60 ? 'STRONG' : strengthScore >= 30 ? 'WEAK' : 'NONE'
  const details =
    trend === 'UPTREND'
      ? `${trend} • ${momentum} • Range ${rangePercent.toFixed(1)}%`
      : `${trend} • ${momentum} • Range ${rangePercent.toFixed(1)}%`

  return {
    base,
    strength: Math.min(strengthScore, 100),
    momentum,
    trend,
    signalQuality: Math.min(signalScore, 100),
    details,
  }
}

function calculateATR(ohlcData: OHLC[], period: number): number {
  if (ohlcData.length < period) return 0

  let trSum = 0
  for (let i = 1; i < ohlcData.length; i++) {
    const curr = ohlcData[i]
    const prev = ohlcData[i - 1]
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    )
    trSum += tr
  }

  return trSum / (ohlcData.length - 1)
}

function getWeakBase(): BaseStrength {
  return {
    base: 'WEAK',
    strength: 0,
    momentum: 'NEUTRAL',
    trend: 'SIDEWAYS',
    signalQuality: 0,
    details: 'Insufficient data',
  }
}
