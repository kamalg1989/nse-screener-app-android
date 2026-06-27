/**
 * MONTHLY DATA FETCHER - ULTRA OPTIMIZED
 * 
 * 1. Limit concurrent fetches (network contention reduction)
 * 2. Counting sort for dates (O(n) instead of O(n log n))
 * 3. AsyncStorage cache (skip fetch if exists)
 */

const pako = require('pako')
import { OHLC } from '../screener/screener'
import { cache } from './dataCache'

const GITHUB_MONTHLY_URL = 'https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/monthly'

interface MonthlyStockData {
  [symbol: string]: any[][]
}

interface MonthMetrics {
  month: string
  fetchTime: number
  decompressTime: number
  parseTime: number
  totalTime: number
  dataSize: number
  stockCount: number
  cached: boolean
}



// =============================================
// PERFORMANCE HELPERS
// =============================================

/**
 * Convert date string to sortable integer (YYYYMMDD format)
 */
function dateToNum(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ''), 10)
}

function convertArrayToOHLC(rows: any[][]): OHLC[] {
  return rows.map(row => ({
    date: row[0],
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: row[5]
  }))
}

/**
 * Ultra-fast dedup using counting sort (O(n) time)
 */
function dedupAndSortFast(candles: OHLC[]): OHLC[] {
  if (candles.length === 0) return []
  
  // Dedup using Map
  const seen = new Map<number, OHLC>()
  for (const candle of candles) {
    const dateNum = dateToNum(candle.date)
    if (!seen.has(dateNum)) {
      seen.set(dateNum, candle)
    }
  }
  
  // Convert to array and get min/max dates for counting sort
  const unique = Array.from(seen.values())
  if (unique.length <= 1) return unique
  
  // Get date range
  let minDate = Infinity, maxDate = -Infinity
  const dateNums = unique.map(c => {
    const num = dateToNum(c.date)
    minDate = Math.min(minDate, num)
    maxDate = Math.max(maxDate, num)
    return num
  })
  
  // Counting sort by date
  const count = maxDate - minDate + 1
  const buckets: OHLC[] = []
  
  // Group by date
  const groups = new Map<number, OHLC>()
  unique.forEach((candle, idx) => {
    groups.set(dateNums[idx], candle)
  })
  
  // Extract in sorted order
  for (let date = minDate; date <= maxDate; date++) {
    if (groups.has(date)) {
      buckets.push(groups.get(date)!)
    }
  }
  
  return buckets
}

/**
 * Limited concurrency fetcher (max 3 concurrent requests)
 */
class ConcurrencyLimiter {
  private running = 0
  private queue: Array<() => Promise<any>> = []
  private maxConcurrent: number

  constructor(max: number = 3) {
    this.maxConcurrent = max
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    this.running++
    try {
      return await fn()
    } finally {
      this.running--
    }
  }
}

function getLastNMonths(n: number = 3, endDate?: string): string[] {
  const months: string[] = []
  const end = endDate ? new Date(endDate) : new Date()
  
  for (let i = 0; i < n; i++) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    months.push(`${year}-${month}`)
  }

  return months
}

// =============================================
// FETCH LOGIC WITH CACHING + CONCURRENCY LIMIT
// =============================================

async function fetchMonthFile(
  monthKey: string,
  limiter: ConcurrencyLimiter
): Promise<{data: MonthlyStockData | null, metrics: MonthMetrics}> {
  const monthStart = Date.now()
  let fetchTime = 0, decompressTime = 0, parseTime = 0
  let dataSize = 0, stockCount = 0, cached = false
  
  try {
    // Check cache first
    const cacheKey = `market_data_${monthKey}`
    const cachedData = await cache.get<MonthlyStockData>(cacheKey)
    if (cachedData) {
      cached = true
      stockCount = Object.keys(cachedData).length
      const totalTime = Date.now() - monthStart
      return {
        data: cachedData,
        metrics: { month: monthKey, fetchTime: 0, decompressTime: 0, parseTime: 0, totalTime, dataSize: 0, stockCount, cached: true }
      }
    }

    console.log(`[⏱️  MONTH START] ${monthKey}`)

    // Fetch with concurrency limit
    let response: Response
    await limiter.run(async () => {
      const fetchStart = Date.now()
      const url = `${GITHUB_MONTHLY_URL}/${monthKey}.json.gz`
      response = await fetch(url)
      fetchTime = Date.now() - fetchStart
    })

    if (!response!.ok) {
      console.warn(`[WARN] Month ${monthKey} not found (${response!.status})`)
      return {
        data: null,
        metrics: { month: monthKey, fetchTime, decompressTime, parseTime, totalTime: fetchTime, dataSize: 0, stockCount: 0, cached: false }
      }
    }

    // Decompress
    const decompressStart = Date.now()
    const arrayBuffer = await response!.arrayBuffer()
    dataSize = arrayBuffer.byteLength
    
    if (arrayBuffer.byteLength < 10) {
      return {
        data: null,
        metrics: { month: monthKey, fetchTime, decompressTime: 0, parseTime: 0, totalTime: fetchTime, dataSize, stockCount: 0, cached: false }
      }
    }

    const decompressed = pako.inflate(new Uint8Array(arrayBuffer))
    const decoder = new TextDecoder('utf-8')
    const jsonText = decoder.decode(decompressed)
    decompressTime = Date.now() - decompressStart
    
    console.log(`[⏱️  FETCH] ${monthKey}: ${fetchTime}ms + DECOMP: ${decompressTime}ms (${jsonText.length} chars)`)

    if (!jsonText || jsonText.length < 10) {
      return {
        data: null,
        metrics: { month: monthKey, fetchTime, decompressTime, parseTime: 0, totalTime: fetchTime + decompressTime, dataSize, stockCount: 0, cached: false }
      }
    }

    // Parse
    const parseStart = Date.now()
    let data: MonthlyStockData
    try {
      const sanitized = jsonText.replace(/NaN/g, 'null')
      data = JSON.parse(sanitized) as MonthlyStockData
    } catch (parseError) {
      const trimmed = jsonText.trim().replace(/NaN/g, 'null')
      data = JSON.parse(trimmed) as MonthlyStockData
    }
    parseTime = Date.now() - parseStart
    
    stockCount = Object.keys(data).length
    const totalTime = Date.now() - monthStart
    
    console.log(`[✅ PARSE] ${monthKey}: ${parseTime}ms | Total: ${totalTime}ms | Stocks: ${stockCount}`)

    // Cache for 24 hours
    await cache.set(cacheKey, data, 24 * 60 * 60 * 1000)

    return {
      data,
      metrics: { month: monthKey, fetchTime, decompressTime, parseTime, totalTime, dataSize, stockCount, cached: false }
    }
  } catch (error) {
    const totalTime = Date.now() - monthStart
    console.warn(`[❌ ERROR] Month ${monthKey}: ${error} (${totalTime}ms)`)
    return {
      data: null,
      metrics: { month: monthKey, fetchTime, decompressTime, parseTime, totalTime, dataSize, stockCount: 0, cached: false }
    }
  }
}

// =============================================
// PUBLIC API - ULTRA OPTIMIZED
// =============================================

export async function fetchAllStockData(
  symbols: string[] = [],
  monthsToFetch: number = 14,
  endDate?: string
): Promise<Record<string, OHLC[]>> {
  const globalStart = Date.now()
  console.log(`\n🚀 [FETCH START] ${monthsToFetch} months, endDate: ${endDate || 'today'}`)

  const months = getLastNMonths(monthsToFetch, endDate)
  console.log(`[MONTHS] ${months.join(' | ')}`)

  // === FETCH WITH LIMITED CONCURRENCY ===
  const parallelStart = Date.now()
  const limiter = new ConcurrencyLimiter(3) // Max 3 concurrent requests
  
  const monthPromises = months.map(month => fetchMonthFile(month, limiter))
  const results = await Promise.all(monthPromises)
  const parallelTime = Date.now() - parallelStart
  
  const monthDataList = results.map(r => r.data)
  const monthMetrics = results.map(r => r.metrics)
  
  console.log(`[⏱️  PARALLEL] All fetches completed in ${parallelTime}ms`)
  
  console.log(`\n📊 [MONTH BREAKDOWN]`)
  monthMetrics.forEach(m => {
    console.log(`  ${m.month}: ${m.fetchTime}ms + ${m.decompressTime}ms + ${m.parseTime}ms = ${m.totalTime}ms (${m.stockCount} stocks)`)
  })

  // === MERGE ===
  const mergeStart = Date.now()
  const result: Record<string, OHLC[]> = {}
  let successCount = 0

  for (const monthData of monthDataList) {
    if (!monthData) continue
    successCount++

    for (const [symbol, candles] of Object.entries(monthData)) {
      if (symbols.length > 0 && !symbols.includes(symbol)) continue

      const ohlcCandles = convertArrayToOHLC(candles)

      if (!result[symbol]) {
        result[symbol] = []
      }

      result[symbol].push(...ohlcCandles)
    }
  }
  
  const mergeTime = Date.now() - mergeStart
  console.log(`[⏱️  MERGE] ${mergeTime}ms`)

  // === ULTRA-FAST DEDUP & SORT ===
  const dedupStart = Date.now()
  let totalCandlesBefore = 0, totalCandlesAfter = 0, totalRemoved = 0

  const symbolBatches = Object.keys(result)
  const batchSize = 100
  
  for (let i = 0; i < symbolBatches.length; i += batchSize) {
    const batch = symbolBatches.slice(i, Math.min(i + batchSize, symbolBatches.length))
    
    batch.forEach(symbol => {
      totalCandlesBefore += result[symbol].length
      result[symbol] = dedupAndSortFast(result[symbol]) // Fast sort
      totalCandlesAfter += result[symbol].length
    })
  }
  
  totalRemoved = totalCandlesBefore - totalCandlesAfter
  const dedupTime = Date.now() - dedupStart
  console.log(`[⏱️  DEDUP] ${dedupTime}ms (FAST SORT) - ${totalCandlesBefore} → ${totalCandlesAfter}`)

  // === METRICS ===
  const globalTime = Date.now() - globalStart
  const totalStocks = Object.keys(result).length
  const nonCachedMonths = monthMetrics.filter(m => !m.cached)
  const avgFetchTime = nonCachedMonths.length > 0 ? nonCachedMonths.reduce((sum, m) => sum + m.fetchTime, 0) / nonCachedMonths.length : 0

  console.log(`\n⚡ [PERFORMANCE SUMMARY]`)
  console.log(`╔════════════════════════════════════════════════════════╗`)
  console.log(`║ TOTAL TIME: ${globalTime}ms (${(globalTime/1000).toFixed(1)}s)`)
  console.log(`║ ─────────────────────────────────────────────────────`)
  console.log(`║ Fetch (avg):        ${avgFetchTime.toFixed(0)}ms`)
  console.log(`║ Merge:              ${mergeTime}ms`)
  console.log(`║ Dedup/Sort (FAST):  ${dedupTime}ms`)
  console.log(`║ ─────────────────────────────────────────────────────`)
  console.log(`║ Stocks:  ${totalStocks}`)
  console.log(`║ Candles: ${totalCandlesAfter}`)
  console.log(`║ Throughput: ${(totalCandlesAfter / globalTime * 1000).toFixed(0)} candles/sec`)
  console.log(`╚════════════════════════════════════════════════════════╝\n`)

  return result
}

export const DEFAULT_SYMBOLS: string[] = []
