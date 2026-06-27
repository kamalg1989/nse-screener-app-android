/**
 * Chart Configuration - Option E Auto-Density Scaling
 * 
 * Controls candlestick chart rendering behavior
 * Automatically scales candle width and label density based on data size
 */

// Density tiers based on pixels per candle
export const DENSITY_TIERS = {
  dense: {
    minPixelsPerCandle: 0,
    maxPixelsPerCandle: 2.5,
    candleWidth: 1.5,
    gapWidth: 0.8,
    labelInterval: 15  // Show every 15th label (sparse labels for dense data)
  },
  medium: {
    minPixelsPerCandle: 2.5,
    maxPixelsPerCandle: 5,
    candleWidth: 3,
    gapWidth: 1.2,
    labelInterval: 10  // Show every 10th label
  },
  sparse: {
    minPixelsPerCandle: 5,
    maxPixelsPerCandle: Infinity,
    candleWidth: 5,
    gapWidth: 1.5,
    labelInterval: 5   // Show every 5th label (dense labels for sparse data)
  }
}

// Chart configuration - easily configurable for different timeframes
export const CHART_CONFIG = {
  daily: {
    candles: 90,           // Total candles to fetch from data
    displayMode: 'scroll', // 'scroll' = show 30 at a time, 'full' = show all
    showCandles: 30,       // Show 30 at a time (scrollable)
    minCandles: 20,        // Minimum allowed
    maxCandles: 200        // Maximum allowed
  },
  weekly: {
    candles: 36,           // 9 months = ~36 weekly candles
    displayMode: 'full',   // Show all weeks at once
    showCandles: 36,       // Show all 36 weeks
    minCandles: 10,
    maxCandles: 100
  }
}

// Feature flags for future additions
export const FEATURE_FLAGS = {
  baseDetection: false,      // Enable when base detection is ready
  supportResistance: false,  // Enable when S/R detection is ready
  pivotPoints: false,        // Enable when pivot calculation is ready
  trendLines: false          // Enable when trend line drawing is ready
}

/**
 * Get density tier for given pixels per candle
 */
export function getDensityTier(pixelsPerCandle: number) {
  if (pixelsPerCandle < 2.5) return DENSITY_TIERS.dense
  if (pixelsPerCandle < 5) return DENSITY_TIERS.medium
  return DENSITY_TIERS.sparse
}

/**
 * Helper to calculate label interval based on data length
 */
export function calculateLabelInterval(dataLength: number, density: typeof DENSITY_TIERS.dense) {
  // Use density's labelInterval as base
  return Math.max(1, Math.ceil(dataLength / (Math.ceil(dataLength / density.labelInterval))))
}
