import { OHLC } from '../screener/screener'

/**
 * Calculate Exponential Moving Average (EMA)
 * Returns array with same length as input (pads with undefined for values before period)
 */
export function calculateEMA(data: number[], period: number): (number | undefined)[] {
  if (data.length === 0) return []
  if (data.length < period) {
    // Not enough data for this period - return array of undefined
    return new Array(data.length).fill(undefined)
  }

  const ema: (number | undefined)[] = new Array(data.length).fill(undefined)
  const multiplier = 2 / (period + 1)

  // Calculate initial SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i]
  }
  let emaValue = sum / period
  ema[period - 1] = emaValue

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    emaValue = data[i] * multiplier + emaValue * (1 - multiplier)
    ema[i] = Number.isFinite(emaValue) ? emaValue : undefined
  }

  return ema
}

/**
 * Calculate multiple EMAs from close prices
 * Returns full-length arrays with undefined padding at start
 */
export function calculateMultipleEMAs(ohlcData: OHLC[], periods: number[] = [10, 21, 50, 200]) {
  if (!ohlcData || ohlcData.length === 0) {
    return {
      '10': [],
      '21': [],
      '50': [],
      '200': [],
    }
  }

  const closePrices = ohlcData.map(candle => candle.close)
  
  const result: Record<number, (number | undefined)[]> = {}
  periods.forEach(period => {
    result[period] = calculateEMA(closePrices, period)
  })

  return result
}

/**
 * Get EMA values for a specific index
 */
export function getEMAValuesAtIndex(
  emaCalculations: Record<number, (number | undefined)[]>,
  index: number
): Record<number, number | null> {
  const result: Record<number, number | null> = {}
  
  Object.entries(emaCalculations).forEach(([period, values]) => {
    if (values && values.length > 0 && index < values.length) {
      const value = values[index]
      result[period] = (typeof value === 'number' && Number.isFinite(value)) ? value : null
    } else {
      result[period] = null
    }
  })

  return result
}
