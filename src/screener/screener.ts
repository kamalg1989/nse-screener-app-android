import { detectBaseAdvanced } from '../utils/baseDetection'
import { detectEntrySignal, EntrySignal } from '../utils/entryTechnique'
import { checkTechnicalFilter } from '../utils/technicalFilter'
import { assessBaseQuality } from '../utils/baseQuality'
import { detectIFP } from '../utils/ifp'

// NSE Screener Core Logic

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
  entryTechnique?: string
  entryConfidence?: number
  technicalFilterResult?: any
  baseQualityScore?: number
  ifpScore?: number
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
  RISK_AMOUNT: 100,
}

export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return []

  const ema: number[] = []
  const k = 2 / (period + 1)

  let sum = 0
  for (let i = 0; i < period; i++) sum += closes[i]
  let emaVal = sum / period
  ema.push(emaVal)

  for (let i = period; i < closes.length; i++) {
    emaVal = closes[i] * k + emaVal * (1 - k)
    ema.push(emaVal)
  }

  return ema
}

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

async function processSymbolBatch(
  symbols: [string, OHLC[]][],
  cfg: any,
  batchNum: number = 0
): Promise<{ alerts: Alert[]; stats: any }> {
  const alerts: Alert[] = []
  const stats = { total: 0, bars: 0, liquidity: 0, tech: 0, entry: 0, base: 0, ifp: 0, atr: 0, rr: 0, success: 0 }
  const debugMode = true
  const entryTechniquesEnabled = cfg.enableHHHL || cfg.enableInsideBar || cfg.enablePinBar || cfg.enableTrendBar || cfg.enablePullback || cfg.enableBreakout

  for (const [symbol, ohlcData] of symbols) {
    stats.total++

    if (ohlcData.length < cfg.MIN_VOLUME_BARS) {
      stats.bars++
      if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Min bars (${ohlcData.length} < ${cfg.MIN_VOLUME_BARS})`)
      continue
    }

    const closes = ohlcData.map((o) => o.close)
    const avgPrice = closes[closes.length - 1]
    const avgVolume = ohlcData.slice(-5).reduce((s, o) => s + o.volume, 0) / 5

    const dailyTurnover = avgPrice * avgVolume
    if (dailyTurnover < cfg.MIN_LIQUIDITY_1CR * 1_000_000) {
      stats.liquidity++
      if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Liquidity (₹${(dailyTurnover / 1_000_000).toFixed(1)}Cr < ₹${cfg.MIN_LIQUIDITY_1CR}Cr)`)
      continue
    }

    const lastClose = closes[closes.length - 1]

    if (cfg.enableEMA50Check || cfg.enableSMA200Check) {
      // Only run technical filter if trend alignment is actually being checked
      const techResult = checkTechnicalFilter(ohlcData, cfg)
      if (!techResult.passed) {
        stats.tech++
        if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Technical (trend:${techResult.trendAlignment} range:${techResult.baseRangeOk} vol:${techResult.volumeOk})`)
        continue
      }
    }

    const entrySignal = detectEntrySignal(ohlcData, cfg)
    if (!entrySignal && entryTechniquesEnabled) {
      stats.entry++
      if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Entry technique (none detected)`)
      continue
    }

    // === PHASE 2: Base Quality Assessment ===
    if (cfg.enableBaseQuality) {
      const baseQuality = assessBaseQuality(ohlcData, cfg)
      if (!baseQuality.passed) {
        stats.base++
        if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Base quality (${baseQuality.reason})`)
        continue
      }
      if (debugMode && symbol.length <= 5) console.log(`  ✓ [${symbol}] Base quality OK (upmove:${baseQuality.priorUpmove.toFixed(0)}% giveback:${baseQuality.giveback.toFixed(0)}%)`)
    }

    // === PHASE 2: IFP Detection ===
    if (cfg.enableIFP) {
      const ifp = detectIFP(ohlcData, cfg)
      if (!ifp.passed) {
        stats.ifp++
        if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] IFP score (${ifp.score.toFixed(2)} < ${cfg.ifpMinScore})`)
        continue
      }
      if (debugMode && symbol.length <= 5) console.log(`  ✓ [${symbol}] IFP score OK (${ifp.score.toFixed(2)}, surge:${ifp.surgeUpDays} dryup:${ifp.dryupDownDays})`)
    }

    let entry = lastClose
    let sl = lastClose
    let entryType = 'ATR'

    if (entrySignal) {
      entry = entrySignal.entryPrice
      sl = entrySignal.slPrice
      entryType = entrySignal.type || 'ATR'
    } else {
      const atr = calculateATR(ohlcData, cfg.ATR_PERIOD)
      if (atr.length === 0) {
        stats.atr++
        if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] ATR calc failed`)
        continue
      }
      const lastATR = atr[atr.length - 1]
      sl = lastClose - lastATR * cfg.ATR_MULTIPLIER
    }

    const risk = entry - sl

    if (risk <= 0) {
      stats.atr++
      if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Risk invalid (${risk.toFixed(0)})`)
      continue
    }

    const qty = Math.floor(cfg.RISK_AMOUNT / risk)
    if (qty <= 0) {
      stats.atr++
      if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] Qty invalid (${qty})`)
      continue
    }

    const target = entry + risk * 2
    const rr = (target - entry) / risk

    if (rr < cfg.minRiskRewardRatio || rr < 1.0) {
      stats.rr++
      if (debugMode && symbol.length <= 5) console.log(`  ❌ [${symbol}] R:R low (${rr.toFixed(2)} < ${cfg.minRiskRewardRatio})`)
      continue
    }

    const baseInfo = detectBaseAdvanced(ohlcData)

    stats.success++
    console.log(
      `✅ [${symbol}] ${entryType} Entry:${entry.toFixed(0)} SL:${sl.toFixed(0)} Target:${target.toFixed(0)} RR:${rr.toFixed(1)}`
    )

    alerts.push({
      symbol,
      entry,
      sl,
      target,
      rr,
      risk,
      reward: target - entry,
      qty,
      timestamp: new Date().toISOString(),
      base: baseInfo.base,
      strength: baseInfo.strength,
      momentum: baseInfo.momentum,
      trend: baseInfo.trend,
      signalQuality: baseInfo.signalQuality,
      entryTechnique: entryType,
      entryConfidence: entrySignal?.confidence,
    })
  }

  return { alerts, stats }
}

export async function runScreener(symbolData: Record<string, OHLC[]>, settings?: any): Promise<Alert[]> {
  const screenerStartTime = Date.now()

  console.log('🔍 [SCREENER] ========================================')
  console.log('🔍 [SCREENER] Starting screener (4-worker parallel)')
  console.log('🔍 [SCREENER] Total symbols received:', Object.keys(symbolData).length)

  const cfg = settings
    ? {
        MIN_LIQUIDITY_1CR: settings.minLiquidity,
        MIN_VOLUME_BARS: 20,
        EMA_PERIOD: settings.emaFast,
        ATR_PERIOD: 14,
        ATR_MULTIPLIER: settings.atrMultiplier || 2.0,
        minRiskRewardRatio: settings.minRiskRewardRatio || 1.0,
        RISK_AMOUNT: 100,
        enableHHHL: settings.enableHHHL,
        enableInsideBar: settings.enableInsideBar,
        enablePinBar: settings.enablePinBar,
        enableTrendBar: settings.enableTrendBar,
        enablePullback: settings.enablePullback,
        enableBreakout: settings.enableBreakout,
        trendBarCloseThreshold: settings.trendBarCloseThreshold || 0.7,
        pinBarMaxBodyPct: settings.pinBarMaxBodyPct || 0.35,
        pinBarMinWickPct: settings.pinBarMinWickPct || 0.55,
        minBarRangePct: settings.minBarRangePct || 0.005,
        entryTickOffset: settings.entryTickOffset || 1,
        enableEMA50Check: settings.enableEMA50Check,
        enableSMA200Check: settings.enableSMA200Check,
        trendMode: settings.trendMode || 'off',
        maxBaseRange: settings.maxBaseRange || 0.2,
        volMultiplier: settings.volMultiplier || 0.8,
        baseRangeCheckBars: settings.baseRangeCheckBars || 20,
        // PHASE 2
        enableBaseQuality: settings.enableBaseQuality,
        minPriorUpmove: settings.minPriorUpmove || 15,
        maxGiveback: settings.maxGiveback || 30,
        maxVolumeDryup: settings.maxVolumeDryup || 1.3,
        maxDistanceFromHigh: settings.maxDistanceFromHigh || 5,
        enableIFP: settings.enableIFP,
        ifpLookback: settings.ifpLookback || 30,
        ifpMinScore: settings.ifpMinScore || 0.25,
        ifpVolSurgeMultiple: settings.ifpVolSurgeMultiple || 1.5,
      }
    : { ...DEFAULT_CONFIG }

  console.log('\n⚙️  [CONFIG] Phase 1: Entry Techniques:', {
    HHHL: cfg.enableHHHL,
    Inside: cfg.enableInsideBar,
    Pin: cfg.enablePinBar,
    Trend: cfg.enableTrendBar,
    Pullback: cfg.enablePullback,
    Breakout: cfg.enableBreakout,
  })
  console.log('⚙️  [CONFIG] Phase 1: Technical Filter:', {
    EMA50: cfg.enableEMA50Check,
    SMA200: cfg.enableSMA200Check,
    TrendMode: cfg.trendMode,
    MaxBaseRange: cfg.maxBaseRange,
  })
  console.log('⚙️  [CONFIG] Phase 2: Base Quality:', { enabled: cfg.enableBaseQuality, minUpmove: cfg.minPriorUpmove })
  console.log('⚙️  [CONFIG] Phase 2: IFP:', { enabled: cfg.enableIFP, minScore: cfg.ifpMinScore })
  console.log('⚙️  [CONFIG] Liquidity:', cfg.MIN_LIQUIDITY_1CR, '₹ Cr\n')

  const symbolEntries = Object.entries(symbolData)
  const batchSize = Math.ceil(symbolEntries.length / 4)
  const batches = [
    symbolEntries.slice(0, batchSize),
    symbolEntries.slice(batchSize, batchSize * 2),
    symbolEntries.slice(batchSize * 2, batchSize * 3),
    symbolEntries.slice(batchSize * 3),
  ]

  console.log(`⚡ Processing ${symbolEntries.length} stocks in 4 batches\n`)

  const parallelStartTime = Date.now()
  const results = await Promise.all(
    batches.map((batch, i) => processSymbolBatch(batch, cfg, i))
  )
  const parallelTime = Date.now() - parallelStartTime

  const allAlerts = results.flatMap((r) => r.alerts)
  const mergedStats = results.reduce(
    (acc, r) => ({
      total: acc.total + r.stats.total,
      bars: acc.bars + r.stats.bars,
      liquidity: acc.liquidity + r.stats.liquidity,
      tech: acc.tech + r.stats.tech,
      entry: acc.entry + r.stats.entry,
      base: acc.base + r.stats.base,
      ifp: acc.ifp + r.stats.ifp,
      atr: acc.atr + r.stats.atr,
      rr: acc.rr + r.stats.rr,
      success: acc.success + r.stats.success,
    }),
    { total: 0, bars: 0, liquidity: 0, tech: 0, entry: 0, base: 0, ifp: 0, atr: 0, rr: 0, success: 0 }
  )

  const sortedAlerts = allAlerts.sort((a, b) => b.rr - a.rr)

  const screenerEndTime = Date.now()
  const screenerTotalTime = screenerEndTime - screenerStartTime

  console.log('\n📊 FILTER BREAKDOWN')
  console.log('📊 ═══════════════════════════════════════')
  console.log(`📊 Input stocks:       ${mergedStats.total}`)
  console.log(`📊 │`)
  console.log(`📊 ├─ Min bars:        ${mergedStats.bars} (-${((mergedStats.bars / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ Liquidity:       ${mergedStats.liquidity} (-${((mergedStats.liquidity / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ Technical:       ${mergedStats.tech} (-${((mergedStats.tech / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ Entry Tech:      ${mergedStats.entry} (-${((mergedStats.entry / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ Base Quality:    ${mergedStats.base} (-${((mergedStats.base / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ IFP Score:       ${mergedStats.ifp} (-${((mergedStats.ifp / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ ATR/Risk:        ${mergedStats.atr} (-${((mergedStats.atr / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 ├─ R:R Ratio:       ${mergedStats.rr} (-${((mergedStats.rr / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log(`📊 └─ ✅ SUCCESS:       ${mergedStats.success} (${((mergedStats.success / mergedStats.total) * 100).toFixed(0)}%)`)
  console.log('📊 ═══════════════════════════════════════')
  console.log(`📊 ⏱️  Screener time:    ${screenerTotalTime}ms (${(screenerTotalTime / 1000).toFixed(2)}s)`)
  console.log(`📊 Opportunities:      ${sortedAlerts.length}\n`)

  return sortedAlerts
}

export function getTopStocks(alerts: Alert[], count: number = 3): Alert[] {
  return alerts.slice(0, count)
}
