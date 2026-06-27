import { OHLC } from '../screener/screener'

/**
 * Aggregate daily OHLC data to weekly candles
 * Each week starts on Monday and ends on Friday
 */
export function aggregateToWeekly(dailyData: OHLC[]): OHLC[] {
  if (dailyData.length === 0) return []

  const weeklyCandles: OHLC[] = []
  let currentWeek: OHLC[] = []
  let currentWeekStart = ''

  for (const candle of dailyData) {
    const date = new Date(candle.date)
    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

    // Start new week (if Monday or first candle)
    if ((dayOfWeek === 1 && currentWeek.length > 0) || !currentWeekStart) {
      if (currentWeek.length > 0) {
        // Create weekly candle from accumulated data
        const weeklyCandle = createWeeklyCandle(currentWeek, currentWeekStart)
        weeklyCandles.push(weeklyCandle)
        currentWeek = []
      }
      currentWeekStart = candle.date
    }

    // Add to current week (Monday-Friday only)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      currentWeek.push(candle)
    }
  }

  // Add final week if there's any data
  if (currentWeek.length > 0) {
    const weeklyCandle = createWeeklyCandle(currentWeek, currentWeekStart)
    weeklyCandles.push(weeklyCandle)
  }

  return weeklyCandles
}

/**
 * Create a single weekly candle from daily candles
 */
function createWeeklyCandle(weekData: OHLC[], weekStartDate: string): OHLC {
  const opens = weekData.map(c => c.open)
  const highs = weekData.map(c => c.high)
  const lows = weekData.map(c => c.low)
  const closes = weekData.map(c => Number.isFinite(c.close) ? c.close : c.high) // Fallback to high if close is NaN
  const volumes = weekData.map(c => c.volume)

  // Find first valid open
  let firstOpen = opens[0]
  for (const o of opens) {
    if (Number.isFinite(o)) {
      firstOpen = o
      break
    }
  }

  // Get last valid close
  let lastClose = closes[closes.length - 1]
  for (let i = closes.length - 1; i >= 0; i--) {
    if (Number.isFinite(closes[i])) {
      lastClose = closes[i]
      break
    }
  }

  return {
    date: weekStartDate,
    open: firstOpen,
    high: Math.max(...highs),
    low: Math.min(...lows),
    close: lastClose,
    volume: volumes.reduce((a, b) => a + b, 0),
  }
}
