import { OHLC } from '../screener/screener'

export interface EntrySignal {
  type: 'HH_HL' | 'INSIDE_BAR' | 'PIN_BAR' | 'TREND_BAR' | 'PULLBACK' | 'BREAKOUT' | null
  entryPrice: number
  slPrice: number
  signalDate: string
  confidence?: number
}

/**
 * Detect HH-HL (Higher High - Higher Low) pattern
 * Day2 has both higher high AND higher low than Day1
 */
export function detectHHHL(ohlcData: OHLC[], config: any): EntrySignal | null {
  if (ohlcData.length < 2) return null

  const day1 = ohlcData[ohlcData.length - 2]
  const day2 = ohlcData[ohlcData.length - 1]

  const d1_high = day1.high
  const d1_low = day1.low
  const d2_high = day2.high
  const d2_low = day2.low
  const d2_range = d2_high - d2_low

  // Check if range is significant
  if (d2_range < d2_low * config.minBarRangePct) return null

  // HH-HL: both higher
  if (d2_high > d1_high && d2_low > d1_low) {
    const entry = Math.max(d1_high, d2_high) + (config.minBarRangePct * d2_low) * config.entryTickOffset
    const sl = Math.min(d1_low, d2_low) - (config.minBarRangePct * d2_low) * 0.5

    return {
      type: 'HH_HL',
      entryPrice: entry,
      slPrice: sl,
      signalDate: day2.date,
      confidence: 0.85,
    }
  }

  return null
}

/**
 * Detect Inside Bar (Day2 is completely inside Day1 range)
 */
export function detectInsideBar(ohlcData: OHLC[], config: any): EntrySignal | null {
  if (ohlcData.length < 2) return null

  const day1 = ohlcData[ohlcData.length - 2]
  const day2 = ohlcData[ohlcData.length - 1]

  const d1_high = day1.high
  const d1_low = day1.low
  const d2_high = day2.high
  const d2_low = day2.low
  const d2_range = d2_high - d2_low

  // Check if range is significant
  if (d2_range < d2_low * config.minBarRangePct) return null

  // Inside bar: d2 completely within d1
  if (d2_high <= d1_high && d2_low >= d1_low) {
    const entry = d2_high + (config.minBarRangePct * d2_low) * config.entryTickOffset
    const sl = d2_low - (config.minBarRangePct * d2_low) * 0.5

    return {
      type: 'INSIDE_BAR',
      entryPrice: entry,
      slPrice: sl,
      signalDate: day2.date,
      confidence: 0.80,
    }
  }

  return null
}

/**
 * Detect Pin Bar (small body, large lower wick)
 * Body ≤ 35% of range, Lower wick ≥ 55% of range
 */
export function detectPinBar(ohlcData: OHLC[], config: any): EntrySignal | null {
  if (ohlcData.length < 2) return null

  const day1 = ohlcData[ohlcData.length - 2]
  const day2 = ohlcData[ohlcData.length - 1]

  const d2_open = day2.open
  const d2_high = day2.high
  const d2_low = day2.low
  const d2_close = day2.close
  const d2_range = d2_high - d2_low
  const d2_body = Math.abs(d2_close - d2_open)
  const d2_lower_wick = Math.min(d2_open, d2_close) - d2_low

  // Check if range is significant
  if (d2_range < d2_low * config.minBarRangePct) return null

  const body_pct = d2_range > 0 ? d2_body / d2_range : 0
  const wick_pct = d2_range > 0 ? d2_lower_wick / d2_range : 0

  // Pin bar: small body & large lower wick
  if (body_pct <= config.pinBarMaxBodyPct && wick_pct >= config.pinBarMinWickPct) {
    const entry = d2_high + (config.minBarRangePct * d2_low) * config.entryTickOffset
    const sl = d2_low - (config.minBarRangePct * d2_low) * 0.5

    return {
      type: 'PIN_BAR',
      entryPrice: entry,
      slPrice: sl,
      signalDate: day2.date,
      confidence: 0.78,
    }
  }

  return null
}

/**
 * Detect Trend Bar (strong close position ≥ 70% of range)
 */
export function detectTrendBar(ohlcData: OHLC[], config: any): EntrySignal | null {
  if (ohlcData.length < 2) return null

  const day1 = ohlcData[ohlcData.length - 2]
  const day2 = ohlcData[ohlcData.length - 1]

  const d2_open = day2.open
  const d2_high = day2.high
  const d2_low = day2.low
  const d2_close = day2.close
  const d2_range = d2_high - d2_low

  // Check if range is significant
  if (d2_range < d2_low * config.minBarRangePct) return null

  const close_position = d2_range > 0 ? (d2_close - d2_low) / d2_range : 0

  // Trend bar: strong close position
  if (close_position >= config.trendBarCloseThreshold) {
    const entry = d2_high + (config.minBarRangePct * d2_low) * config.entryTickOffset
    const sl = d2_low - (config.minBarRangePct * d2_low) * 0.5

    return {
      type: 'TREND_BAR',
      entryPrice: entry,
      slPrice: sl,
      signalDate: day2.date,
      confidence: 0.82,
    }
  }

  return null
}

/**
 * Detect Pullback Trigger (bounce off EMA21)
 */
export function detectPullback(ohlcData: OHLC[], config: any): EntrySignal | null {
  if (ohlcData.length < 25) return null

  // Calculate EMA21
  const closes = ohlcData.map(o => o.close)
  const ema21 = calculateEMA(closes, 21)

  if (ema21.length === 0) return null

  const lastClose = closes[closes.length - 1]
  const lastLow = ohlcData[ohlcData.length - 1].low
  const lastEMA21 = ema21[ema21.length - 1]
  const prev3Lows = ohlcData.slice(-4, -1).map(o => o.low)
  const prev3LowestLow = Math.min(...prev3Lows)
  const prev3EMA21 = ema21.slice(-4, -1)

  // Check if touched EMA21 in last 3 bars
  const touchedEMA = prev3Lows.some(l => l <= lastEMA21 * 1.01)

  // Check if bounced above EMA21 and prior low
  const bounced = lastClose > lastEMA21 && lastLow > prev3LowestLow

  if (touchedEMA && bounced) {
    return {
      type: 'PULLBACK',
      entryPrice: ohlcData[ohlcData.length - 1].high,
      slPrice: prev3LowestLow,
      signalDate: ohlcData[ohlcData.length - 1].date,
      confidence: 0.75,
    }
  }

  return null
}

/**
 * Detect Breakout/Retest Trigger
 */
export function detectBreakout(ohlcData: OHLC[], config: any): EntrySignal | null {
  if (ohlcData.length < 30) return null

  // Base is prior 20 bars + 10 bar buffer
  const baseStart = Math.max(0, ohlcData.length - 30)
  const baseEnd = ohlcData.length - 10
  const base = ohlcData.slice(baseStart, baseEnd)

  if (base.length === 0) return null

  const baseHigh = Math.max(...base.map(o => o.high))
  const recent = ohlcData.slice(-10)

  // Check if broke above base
  const brokeAbove = recent.some(o => o.high > baseHigh)

  // Check if came back near base (within 1%)
  const cameBackNear = recent.slice(-5).some(o => o.low <= baseHigh * 1.01)

  // Check if currently above base
  const currentAbove = ohlcData[ohlcData.length - 1].close > baseHigh

  if (brokeAbove && cameBackNear && currentAbove) {
    return {
      type: 'BREAKOUT',
      entryPrice: ohlcData[ohlcData.length - 1].high,
      slPrice: baseHigh * 0.98,
      signalDate: ohlcData[ohlcData.length - 1].date,
      confidence: 0.80,
    }
  }

  return null
}

/**
 * Main entry technique detector - tries all enabled patterns
 */
export function detectEntrySignal(ohlcData: OHLC[], config: any): EntrySignal | null {
  // Try P0 entry techniques (in order of preference)
  if (config.enableHHHL) {
    const signal = detectHHHL(ohlcData, config)
    if (signal) return signal
  }

  if (config.enableInsideBar) {
    const signal = detectInsideBar(ohlcData, config)
    if (signal) return signal
  }

  if (config.enablePinBar) {
    const signal = detectPinBar(ohlcData, config)
    if (signal) return signal
  }

  if (config.enableTrendBar) {
    const signal = detectTrendBar(ohlcData, config)
    if (signal) return signal
  }

  // Try P2 entry triggers
  if (config.enablePullback) {
    const signal = detectPullback(ohlcData, config)
    if (signal) return signal
  }

  if (config.enableBreakout) {
    const signal = detectBreakout(ohlcData, config)
    if (signal) return signal
  }

  return null
}

/**
 * Helper: Calculate EMA
 */
function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return []

  const ema: number[] = []
  const k = 2 / (period + 1)

  // Initial SMA
  let sum = 0
  for (let i = 0; i < period; i++) sum += prices[i]
  let emaVal = sum / period
  ema.push(emaVal)

  // EMA calculation
  for (let i = period; i < prices.length; i++) {
    emaVal = prices[i] * k + emaVal * (1 - k)
    ema.push(emaVal)
  }

  return ema
}
