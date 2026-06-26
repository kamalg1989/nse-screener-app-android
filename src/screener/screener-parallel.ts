// Parallel screener implementation
// This will replace the main runScreener function

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
    
    // FILTER 1: Liquidity check (EARLY EXIT - ~80% fail here)
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
    
    // FILTER 3: ATR-based SL
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
    
    // FILTER 4: R:R ratio
    const target = lastClose + (risk * 2)
    const rr = (target - lastClose) / risk
    
    if (rr < 1.0) {
      stats.rr++
      continue
    }
    
    // FILTER 5: Base detection
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
      qty: Math.floor(cfg.RISK_AMOUNT / risk),
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

// Main screener with parallel processing
export async function runScreener(
  symbolData: Record<string, OHLC[]>,
  settings?: any
): Promise<Alert[]> {
  console.log('🔍 [SCREENER] ========================================'')
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
  const results = await Promise.all(
    batches.map(batch => processSymbolBatch(batch, cfg))
  )
  
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
  
  console.log('📊 [SCREENER] Stats:', mergedStats)
  console.log('🎯 [SCREENER] Final opportunities:', allAlerts.length)
  console.log('🔍 [SCREENER] ========================================\n')
  
  // Sort by R:R descending
  return allAlerts.sort((a, b) => b.rr - a.rr)
}
