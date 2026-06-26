import { OHLC } from '../screener/screener'

export interface BacktestTrade {
  symbol: string
  entryDate: string
  entryPrice: number
  exitDate: string
  exitPrice: number
  quantity: number
  pnl: number
  pnlPercent: number
  status: 'WIN' | 'LOSS' | 'BREAKEVEN'
}

export interface BacktestResult {
  symbol: string
  totalTrades: number
  winTrades: number
  lossTrades: number
  winRate: number
  avgPnl: number
  avgReturnPercent: number
  totalPnl: number
  maxDrawdown: number
  profitFactor: number
  trades: BacktestTrade[]
}

export interface ForwardLookResult {
  symbol: string
  entryPrice: number
  entryDate: string
  exitDate: string
  exitPrice: number
  pnl: number
  pnlPercent: number
  maxGain: number
  maxLoss: number
  status: 'WIN' | 'LOSS'
}

export interface BacktestSummary {
  totalSymbols: number
  totalTrades: number
  totalWins: number
  totalLosses: number
  overallWinRate: number
  totalPnl: number
  avgReturnPercent: number
  bestSymbol: string
  worstSymbol: string
  results: BacktestResult[]
  forwardResults?: ForwardLookResult[]
  forwardStartDate?: string
  forwardEndDate?: string
  forwardWinRate?: number
  forwardAvgReturn?: number
}

export function runBacktest(
  symbolData: Record<string, OHLC[]>,
  riskPercent: number = 1.0,
  minRR: number = 1.0,
  endDate?: string,
  runWeeks: number = 0
): BacktestSummary {
  const results: BacktestResult[] = []
  let totalTrades = 0
  let totalWins = 0
  let totalLosses = 0
  let totalPnl = 0

  for (const [symbol, ohlcData] of Object.entries(symbolData)) {
    if (ohlcData.length < 50) continue

    const filtered90Days = filterLast90Days(ohlcData, endDate)
    if (filtered90Days.length < 20) continue

    const trades = simulateTrades(symbol, filtered90Days, riskPercent, minRR)
    if (trades.length === 0) continue

    const result = calculateMetrics(symbol, trades)
    results.push(result)

    totalTrades += result.totalTrades
    totalWins += result.winTrades
    totalLosses += result.lossTrades
    totalPnl += result.totalPnl
  }

  const overallWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0
  const avgReturn = totalTrades > 0 ? totalPnl / (totalTrades * 100) : 0

  const best = results.reduce((a, b) => (b.totalPnl > a.totalPnl ? b : a), results[0])
  const worst = results.reduce((a, b) => (b.totalPnl < a.totalPnl ? b : a), results[0])

  // Forward-looking analysis if runWeeks > 0
  let forwardResults: ForwardLookResult[] = []
  let forwardWinRate = 0
  let forwardAvgReturn = 0

  if (runWeeks > 0 && endDate) {
    const passedSymbols = new Set(results.map((r) => r.symbol))

    const forwardStartDate = endDate
    const forwardEndDate = new Date(endDate)
    forwardEndDate.setDate(forwardEndDate.getDate() + runWeeks * 7)
    const forwardEndDateStr = formatDateString(forwardEndDate)

    for (const symbol of passedSymbols) {
      const ohlcData = symbolData[symbol]
      if (!ohlcData.length) continue

      const forwardData = ohlcData.filter(
        (c) => c.date > forwardStartDate && c.date <= forwardEndDateStr
      )
      if (forwardData.length === 0) continue

      const entryCandle = ohlcData.find((c) => c.date === forwardStartDate)
      if (!entryCandle) continue

      const entryPrice = entryCandle.close
      const entryDate = forwardStartDate
      const exitCandle = forwardData[forwardData.length - 1]
      const exitPrice = exitCandle.close
      const exitDate = exitCandle.date

      const pnl = (exitPrice - entryPrice) * 100
      const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100
      const maxGain = ((Math.max(...forwardData.map((c) => c.high)) - entryPrice) / entryPrice) * 100
      const maxLoss = ((Math.min(...forwardData.map((c) => c.low)) - entryPrice) / entryPrice) * 100
      const status = pnlPercent >= 0 ? 'WIN' : 'LOSS'

      forwardResults.push({
        symbol,
        entryPrice,
        entryDate,
        exitDate,
        exitPrice,
        pnl,
        pnlPercent,
        maxGain,
        maxLoss,
        status,
      })
    }

    if (forwardResults.length > 0) {
      const wins = forwardResults.filter((r) => r.status === 'WIN').length
      forwardWinRate = (wins / forwardResults.length) * 100
      forwardAvgReturn = forwardResults.reduce((s, r) => s + r.pnlPercent, 0) / forwardResults.length
    }
  }

  return {
    totalSymbols: results.length,
    totalTrades,
    totalWins,
    totalLosses,
    overallWinRate,
    totalPnl,
    avgReturnPercent: avgReturn,
    bestSymbol: best?.symbol || '',
    worstSymbol: worst?.symbol || '',
    results,
    forwardResults: forwardResults.length > 0 ? forwardResults : undefined,
    forwardStartDate: endDate,
    forwardEndDate: runWeeks > 0 && endDate ? formatDateString(new Date(new Date(endDate).getTime() + runWeeks * 7 * 24 * 60 * 60 * 1000)) : undefined,
    forwardWinRate: forwardResults.length > 0 ? forwardWinRate : undefined,
    forwardAvgReturn: forwardResults.length > 0 ? forwardAvgReturn : undefined,
  }
}

function filterLast90Days(ohlcData: OHLC[], endDate?: string): OHLC[] {
  if (!endDate || ohlcData.length === 0) return ohlcData

  const targetDateStr = endDate
  const targetDate = new Date(targetDateStr + 'T00:00:00Z')
  const startDate = new Date(targetDate)
  startDate.setDate(startDate.getDate() - 90)

  return ohlcData.filter((candle) => {
    return candle.date >= formatDateString(startDate) && candle.date <= targetDateStr
  })
}

function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function simulateTrades(
  symbol: string,
  ohlcData: OHLC[],
  riskPercent: number,
  minRR: number
): BacktestTrade[] {
  const trades: BacktestTrade[] = []
  const capital = 10000

  for (let i = 21; i < ohlcData.length - 15; i += 3) {
    const candle = ohlcData[i]
    const nextCandles = ohlcData.slice(i + 1, Math.min(i + 16, ohlcData.length))

    if (nextCandles.length < 5) continue

    const sma20 = calculateSMA(ohlcData.slice(i - 20, i), 20)
    if (candle.close <= sma20) continue

    const atr = calculateATR(ohlcData.slice(Math.max(0, i - 14), i + 1), 14)
    if (atr === 0) continue

    const sl = candle.close - atr * 1.5
    const risk = candle.close - sl
    if (risk <= 0) continue

    const target = candle.close + risk * Math.max(minRR, 1)

    let exitPrice = candle.close
    let exitDate = candle.date

    for (const nextCandle of nextCandles) {
      if (nextCandle.high >= target) {
        exitPrice = target
        exitDate = nextCandle.date
        break
      }
      if (nextCandle.low <= sl) {
        exitPrice = sl
        exitDate = nextCandle.date
        break
      }
      exitPrice = nextCandle.close
      exitDate = nextCandle.date
    }

    const riskAmount = (capital * riskPercent) / 100
    const quantity = Math.max(1, Math.floor(riskAmount / risk))

    const pnl = (exitPrice - candle.close) * quantity
    const pnlPercent = ((exitPrice - candle.close) / candle.close) * 100
    const status = pnl > 1 ? 'WIN' : pnl < -1 ? 'LOSS' : 'BREAKEVEN'

    trades.push({
      symbol,
      entryDate: candle.date,
      entryPrice: candle.close,
      exitDate,
      exitPrice,
      quantity,
      pnl,
      pnlPercent,
      status,
    })
  }

  return trades
}

function calculateMetrics(symbol: string, trades: BacktestTrade[]): BacktestResult {
  const winTrades = trades.filter((t) => t.status === 'WIN').length
  const lossTrades = trades.filter((t) => t.status === 'LOSS').length

  const winPnl = trades.filter((t) => t.status === 'WIN').reduce((s, t) => s + t.pnl, 0)
  const lossPnl = Math.abs(trades.filter((t) => t.status === 'LOSS').reduce((s, t) => s + t.pnl, 0))
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)

  return {
    symbol,
    totalTrades: trades.length,
    winTrades,
    lossTrades,
    winRate: trades.length > 0 ? (winTrades / trades.length) * 100 : 0,
    avgPnl: trades.length > 0 ? totalPnl / trades.length : 0,
    avgReturnPercent: trades.length > 0 ? (totalPnl / (trades.length * 100)) : 0,
    totalPnl,
    maxDrawdown: calculateDrawdown(trades),
    profitFactor: lossPnl > 0 ? winPnl / lossPnl : winPnl > 0 ? 999 : 0,
    trades,
  }
}

function calculateSMA(ohlcData: OHLC[], period: number): number {
  if (ohlcData.length < period) return 0
  const sum = ohlcData.slice(-period).reduce((s, c) => s + c.close, 0)
  return sum / period
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

function calculateDrawdown(trades: BacktestTrade[]): number {
  let peak = 0
  let maxDD = 0
  let runningPnl = 0

  for (const trade of trades) {
    runningPnl += trade.pnl
    if (runningPnl > peak) peak = runningPnl
    const dd = ((peak - runningPnl) / Math.max(peak, 1)) * 100
    maxDD = Math.max(maxDD, dd)
  }

  return maxDD
}
