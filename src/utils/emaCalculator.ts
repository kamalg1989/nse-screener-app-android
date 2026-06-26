// Calculate EMA (Exponential Moving Average)
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return []

  const k = 2 / (period + 1)
  const ema: number[] = []

  // SMA for first value
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += closes[i]
  }
  ema[period - 1] = sum / period

  // EMA for remaining values
  for (let i = period; i < closes.length; i++) {
    const prevEMA = ema[i - 1]
    ema[i] = closes[i] * k + prevEMA * (1 - k)
  }

  // Fill initial values with interpolation
  for (let i = 0; i < period - 1; i++) {
    ema[i] = ema[period - 1] * ((i + 1) / period) + closes[i] * (1 - (i + 1) / period)
  }

  return ema
}

export function getEMAsForSymbol(ohlcData: any[]) {
  const closes = ohlcData.map((d) => d.close)
  return {
    ema10: calculateEMA(closes, 10),
    ema21: calculateEMA(closes, 21),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
  }
}
