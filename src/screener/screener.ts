import { detectBaseAdvanced } from '../utils/baseDetection'
// NSE Screener Core Logic

import { ScreenerSettings } from '../context/SettingsContext'
export interface OHLC {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Alert {
  symbol: string
  entry: number
  sl: number
  target: number
  rr: number
  risk: number
  reward: number
  qty: number
  timestamp: string
  base: 'STRONG' | 'WEAK' | 'NONE'
  strength?: number
  momentum?: 'UP' | 'DOWN' | 'NEUTRAL'
  trend?: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
  signalQuality?: number
}

export interface ScreenerConfig {
  MIN_LIQUIDITY_1CR: number
  MIN_VOLUME_BARS: number
  EMA_PERIOD: number
  ATR_PERIOD: number
  ATR_MULTIPLIER: number
  RISK_AMOUNT: number
}

const DEFAULT_CONFIG: ScreenerConfig = {
  MIN_LIQUIDITY_1CR: 10,
  MIN_VOLUME_BARS: 50,
  EMA_PERIOD: 21,
  ATR_PERIOD: 14,
  ATR_MULTIPLIER: 2.0,
  RISK_AMOUNT: 100, // ₹100 per trade
}

// Calculate EMA
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return []
  
  const ema: number[] = []
  const k = 2 / (period + 1)
  
  // Start with SMA
  let sum = 0
  for (let i = 0; i < period; i++) sum += closes[i]
  let emaVal = sum / period
  ema.push(emaVal)
  
  // Calculate EMA
  for (let i = period; i < closes.length; i++) {
    emaVal = closes[i] * k + emaVal * (1 - k)
    ema.push(emaVal)
  }
  
  return ema
}

// Calculate ATR (Average True Range)
export function calculateATR(ohlcData: OHLC[], period: number): number[] {
  const tr: number[] = []
  
  for (let i = 1; i < ohlcData.length; i++) {
    const high = ohlcData[i].high
    const low = ohlcData[i].low
    const prevClose = ohlcData[i - 1].close
    
    const tr1 = high - low
    const tr2 = Math.abs(high - prevClose)
    const tr3 = Math.abs(low - prevClose)
    
    tr.push(Math.max(tr1, tr2, tr3))
  }
  
  const atr: number[] = []
  let sum = 0
  
  for (let i = 0; i < period && i < tr.length; i++) {
    sum += tr[i]
  }
  
  atr.push(sum / period)
  
  for (let i = period; i < tr.length; i++) {
    const newATR = (atr[atr.length - 1] * (period - 1) + tr[i]) / period
    atr.push(newATR)
  }
  
  return atr
}

// Detect base

// Main screener function
export async function runScreener(
  symbolData: Record<string, OHLC[]>,
  settings?: any
): Promise<Alert[]> {
  // Use settings if provided, otherwise use defaults
  const cfg = settings ? {
    MIN_LIQUIDITY_1CR: settings.minLiquidity,
    MIN_VOLUME_BARS: 20,
    EMA_PERIOD: settings.emaFast,
    ATR_PERIOD: 14,
    ATR_MULTIPLIER: settings.atrMultiplier,
    BASE_SL_PCT: 0.92,
    TRAIL_PROFIT_LOCK: 0.5,
    MIN_LTP_BUFFER: 0.05,
  } : { ...DEFAULT_CONFIG }
  const alerts: Alert[] = []
  
  for (const [symbol, ohlcData] of Object.entries(symbolData)) {
    if (ohlcData.length < cfg.MIN_VOLUME_BARS) continue
    
    const closes = ohlcData.map(o => o.close)
    const avgPrice = closes[closes.length - 1]
    const avgVolume = ohlcData.slice(-5).reduce((s, o) => s + o.volume, 0) / 5
    
    // Filter 1: Liquidity check
    const dailyTurnover = avgPrice * avgVolume
    if (dailyTurnover < cfg.MIN_LIQUIDITY_1CR * 1_000_000) continue
    
    // Filter 2: EMA alignment (Close > EMA21 > EMA50)
    const ema21 = calculateEMA(closes, 21)
    const ema50 = calculateEMA(closes, 50)
    
    if (ema21.length === 0 || ema50.length === 0) continue
    
    const lastClose = closes[closes.length - 1]
    const lastEMA21 = ema21[ema21.length - 1]
    const lastEMA50 = ema50[ema50.length - 1]
    
    if (!(lastClose > lastEMA21 && lastEMA21 > lastEMA50)) continue
    
    // Filter 3: ATR-based SL
    const atr = calculateATR(ohlcData, cfg.ATR_PERIOD)
    if (atr.length === 0) continue
    
    const lastATR = atr[atr.length - 1]
    const sl = lastClose - (lastATR * cfg.ATR_MULTIPLIER)
    const risk = lastClose - sl
    
    if (risk <= 0) continue
    
    // Filter 4: Position sizing
    const qty = Math.floor(cfg.RISK_AMOUNT / risk)
    if (qty <= 0) continue
    
    // Filter 5: R:R ratio
    const target = lastClose + (risk * 2)
    const rr = (target - lastClose) / risk
    
    if (rr < 1.0) continue
    
    // Filter 6: Base detection
    const base = detectBaseAdvanced(ohlcData)
    
    const baseInfo = detectBaseAdvanced(ohlcData)
    alerts.push({
      symbol,
      entry: lastClose,
      sl,
      target,
      rr,
      risk,
      reward: target - lastClose,
      qty,
      timestamp: new Date().toISOString(),
      base: baseInfo.base,
      strength: baseInfo.strength,
      momentum: baseInfo.momentum,
      trend: baseInfo.trend,
      signalQuality: baseInfo.signalQuality,
    })
  }
  
  // Sort by R:R descending
  return alerts.sort((a, b) => b.rr - a.rr)
}

// Get top N stocks
export function getTopStocks(alerts: Alert[], count: number = 3): Alert[] {
  return alerts.slice(0, count)
}
