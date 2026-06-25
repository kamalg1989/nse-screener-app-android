import { OHLC } from '../screener/screener'

// Aggregate daily candles to weekly - returns all 90 weeks
export function aggregateToWeekly(dailyData: OHLC[]): OHLC[] {
  if (dailyData.length === 0) return []

  const weekly: OHLC[] = []
  let currentWeek: OHLC[] = []
  let lastDayOfWeek = -1

  for (const candle of dailyData) {
    const date = new Date(candle.date)
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

    // Start new week on Monday (1) or first candle
    if ((dayOfWeek === 1 && lastDayOfWeek !== -1) || (lastDayOfWeek === -1 && dayOfWeek !== 0)) {
      if (currentWeek.length > 0) {
        weekly.push(aggregateCandles(currentWeek))
      }
      currentWeek = [candle]
    } else {
      currentWeek.push(candle)
    }

    lastDayOfWeek = dayOfWeek
  }

  // Add last week
  if (currentWeek.length > 0) {
    weekly.push(aggregateCandles(currentWeek))
  }

  return weekly
}

// Aggregate multiple candles into one OHLC
function aggregateCandles(candles: OHLC[]): OHLC {
  const opens = candles.map((c) => c.open)
  const closes = candles.map((c) => c.close)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const volumes = candles.map((c) => c.volume)

  return {
    date: candles[0].date, // Use first day of week
    open: opens[0],
    high: Math.max(...highs),
    low: Math.min(...lows),
    close: closes[closes.length - 1],
    volume: volumes.reduce((a, b) => a + b, 0),
  }
}
