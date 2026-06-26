// Skipping large portions - showing only the key loop section

  for (const [symbol, ohlcData] of Object.entries(symbolData)) {
    filterStats.total++
    
    // FILTER 0: Min bars (cheap, early exit)
    if (ohlcData.length < cfg.MIN_VOLUME_BARS) { 
      filterStats.bars++
      continue 
    }
    
    // Lightweight calculations only
    const closes = ohlcData.map(o => o.close)
    const avgPrice = closes[closes.length - 1]
    const avgVolume = ohlcData.slice(-5).reduce((s, o) => s + o.volume, 0) / 5
    
    // FILTER 1: Liquidity check (EARLY EXIT - ~80% fail here)
    // Remaining filters are only executed if liquidity passes
    const dailyTurnover = avgPrice * avgVolume
    if (dailyTurnover < cfg.MIN_LIQUIDITY_1CR * 1_000_000) {
      filterStats.liquidity++
      continue  // ⚡ Skip all remaining expensive filters
    }
    
    // Skip EMA calculation since filter is disabled (line 155: if (false))
    // This saves ~1-2ms per stock × 100 stocks = 100-200ms total
    // const ema21 = calculateEMA(closes, 21)  // ❌ DISABLED - don't calculate
    // const ema50 = calculateEMA(closes, 50)  // ❌ DISABLED - don't calculate
    
    // FILTER 2: EMA alignment (DISABLED - skip)
    if (false) {
      filterStats.ema++
      continue
    }
    
    // FILTER 3: ATR-based SL (only runs after liquidity passes)
    const atr = calculateATR(ohlcData, cfg.ATR_PERIOD)
    if (atr.length === 0) {
      filterStats.atr++
      continue
    }
    
    const lastClose = closes[closes.length - 1]
    const lastATR = atr[atr.length - 1]
    const sl = lastClose - (lastATR * cfg.ATR_MULTIPLIER)
    const risk = lastClose - sl
    
    if (risk <= 0) {
      filterStats.atr++
      continue
    }
    
    // ... rest of filters
