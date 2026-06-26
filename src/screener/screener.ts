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

// Helper: Process a batch of symbols (worker function)
async function processSymbolBatch(
  symbols: [string, OHLC[]][],
  cfg: any
): Promise<{ alerts: Alert[]; stats: any }> {
  const alerts: Alert[] = []
  const stats = { total: 0, bars: 0, liquidity: 0, ema: 0, atr: 0, rr: 0, success: 0 }
  
  for (const [symbol, ohlcData] of symbols) {
    stats.total++
    
    if (ohlcData.length < cfg.MIN_VOLUME_BARS) { 
      stats.bars++
      continue 
    }
    
    const closes = ohlcData.map(o => o.close)
    const avgPrice = closes[closes.length - 1]
    const avgVolume = ohlcData.slice(-5).reduce((s, o) => s + o.volume, 0) / 5
    
    // Filter 1: Liquidity check (EARLY EXIT - ~80% fail here)
    const dailyTurnover = avgPrice * avgVolume
    if (dailyTurnover < cfg.MIN_LIQUIDITY_1CR * 1_000_000) {
      stats.liquidity++
      continue  // ⚡ Skip remaining expensive filters
    }
    
    // Filter 2: EMA alignment (DISABLED - skip calculation)
    if (false) {
      stats.ema++
      continue
    }
    
    const lastClose = closes[closes.length - 1]
    
    // Filter 3: ATR-based SL
    const atr = calculateATR(ohlcData, cfg.ATR_PERIOD)
    if (atr.length === 0) {
      stats.atr++
      continue
    }
    
    const lastATR = atr[atr.length - 1]
    const sl = lastClose - (lastATR * cfg.ATR_MULTIPLIER)
    const risk = lastClose - sl
    
    if (risk <= 0) {
      stats.atr++
      continue
    }
    
    // Filter 4: Position sizing
    const qty = Math.floor(cfg.RISK_AMOUNT / risk)
    if (qty <= 0) {
      stats.atr++
      continue
    }
    
    // Filter 5: R:R ratio
    const target = lastClose + (risk * 2)
    const rr = (target - lastClose) / risk
    
    if (rr < 1.0) {
      stats.rr++
      continue
    }
    
    // Filter 6: Base detection
    const baseInfo = detectBaseAdvanced(ohlcData)
    
    stats.success++
    console.log(`✅ [${symbol}] Entry:${lastClose.toFixed(0)} SL:${sl.toFixed(0)} Target:${target.toFixed(0)} RR:${rr.toFixed(1)}`)
    
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
  
  return { alerts, stats }
}

// Main screener with 4-worker parallel processing
export async function runScreener(
  symbolData: Record<string, OHLC[]>,
  settings?: any
): Promise<Alert[]> {
  const screenerStartTime = Date.now()
  
  console.log('🔍 [SCREENER] ========================================')
  console.log('🔍 [SCREENER] Starting screener (4-worker parallel)')
  console.log('🔍 [SCREENER] Total symbols received:', Object.keys(symbolData).length)
  
  // Use settings if provided, otherwise use defaults
  const cfg = settings ? {
    MIN_LIQUIDITY_1CR: settings.minLiquidity,
    MIN_VOLUME_BARS: 20,
    EMA_PERIOD: settings.emaFast,
    ATR_PERIOD: 14,
    ATR_MULTIPLIER: settings.atrMultiplier || 2.0,
    BASE_SL_PCT: 0.92,
    TRAIL_PROFIT_LOCK: 0.5,
    MIN_LTP_BUFFER: 0.05,
    RISK_AMOUNT: 100,
  } : { ...DEFAULT_CONFIG }
  
  console.log('⚙️  [SCREENER] Config:', { minLiquidity: cfg.MIN_LIQUIDITY_1CR, minVolumeBars: cfg.MIN_VOLUME_BARS })
  
  // Split into 4 batches for parallel processing
  const symbolEntries = Object.entries(symbolData)
  const batchSize = Math.ceil(symbolEntries.length / 4)
  const batches = [
    symbolEntries.slice(0, batchSize),
    symbolEntries.slice(batchSize, batchSize * 2),
    symbolEntries.slice(batchSize * 2, batchSize * 3),
    symbolEntries.slice(batchSize * 3),
  ]
  
  console.log(`⚡ [SCREENER] Processing ${symbolEntries.length} stocks with 4 parallel workers`)
  console.log(`   Batch sizes: ${batches.map(b => b.length).join(' + ')} stocks`)
  
  // Process all 4 batches in parallel
  const parallelStartTime = Date.now()
  const results = await Promise.all(
    batches.map(batch => processSymbolBatch(batch, cfg))
  )
  const parallelTime = Date.now() - parallelStartTime
  
  // Merge results from all workers
  const allAlerts = results.flatMap(r => r.alerts)
  const mergedStats = results.reduce((acc, r) => ({
    total: acc.total + r.stats.total,
    bars: acc.bars + r.stats.bars,
    liquidity: acc.liquidity + r.stats.liquidity,
    ema: acc.ema + r.stats.ema,
    atr: acc.atr + r.stats.atr,
    rr: acc.rr + r.stats.rr,
    success: acc.success + r.stats.success,
  }), { total: 0, bars: 0, liquidity: 0, ema: 0, atr: 0, rr: 0, success: 0 })
  
  // Sort by R:R descending
  const sortedAlerts = allAlerts.sort((a, b) => b.rr - a.rr)
  
  const screenerEndTime = Date.now()
  const screenerTotalTime = screenerEndTime - screenerStartTime
  
  // Print detailed metrics
  console.log('\n📊 ═══════════════════════════════════════')
  console.log('📊 SCREENER METRICS')
  console.log('📊 ═══════════════════════════════════════')
  console.log(`📊 Total scanned:      ${mergedStats.total}`)
  console.log(`📊 │`)
  console.log(`📊 ├─ Min bars filter: ${mergedStats.bars} (${((mergedStats.bars / mergedStats.total) * 100).toFixed(1)}%)`)
  console.log(`📊 ├─ Liquidity filter: ${mergedStats.liquidity} (${((mergedStats.liquidity / mergedStats.total) * 100).toFixed(1)}%)`)
  console.log(`📊 ├─ EMA filter:       ${mergedStats.ema} (${((mergedStats.ema / mergedStats.total) * 100).toFixed(1)}%)`)
  console.log(`📊 ├─ ATR filter:       ${mergedStats.atr} (${((mergedStats.atr / mergedStats.total) * 100).toFixed(1)}%)`)
  console.log(`📊 ├─ R:R filter:       ${mergedStats.rr} (${((mergedStats.rr / mergedStats.total) * 100).toFixed(1)}%)`)
  console.log(`📊 └─ Success:         ${mergedStats.success} (${((mergedStats.success / mergedStats.total) * 100).toFixed(1)}%)`)
  console.log('📊 ─────────────────────────────────────')
  console.log(`📊 Parallel processing: ${parallelTime}ms`)
  console.log(`📊 ⏱️  TOTAL TIME:        ${screenerTotalTime}ms (${(screenerTotalTime / 1000).toFixed(2)}s)`)
  console.log(`📊 Throughput:         ${(mergedStats.total / (screenerTotalTime / 1000)).toFixed(0)} stocks/sec`)
  console.log('📊 ═══════════════════════════════════════\n')
  
  console.log('📊 [SCREENER] Stats:', mergedStats)
  console.log('🎯 [SCREENER] Final opportunities:', sortedAlerts.length)
  console.log('🔍 [SCREENER] ========================================\n')
  
  return sortedAlerts
}

// Get top N stocks
export function getTopStocks(alerts: Alert[], count: number = 3): Alert[] {
  return alerts.slice(0, count)
}