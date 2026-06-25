import { OHLC } from '../screener/screener'

const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/data'

/**
 * Converts array format [date, open, high, low, close, volume] to OHLC object
 */
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
 * Fetch and parse real stock data from GitHub
 * Falls back to empty array on any error (HomeScreen will use mockData)
 */
export async function fetchRealStockData(symbol: string): Promise<OHLC[]> {
  try {
    const url = `${GITHUB_DATA_URL}/${symbol}.json.gz`
    
    const response = await fetch(url, { timeout: 5000 })
    if (!response.ok) {
      return []
    }

    const text = await response.text()
    if (!text || text.length < 10) {
      return []
    }

    const data = JSON.parse(text) as any[][]
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    const ohlcData = convertArrayToOHLC(data)
    console.log(`✓ ${symbol}: ${ohlcData.length} candles`)
    return ohlcData
  } catch (error) {
    console.log(`⚠️ ${symbol} not available, using mock data`)
    return []
  }
}

/**
 * Fetch all symbols concurrently
 * Returns only successfully loaded symbols
 */
export async function fetchAllStockData(symbols: string[]): Promise<Record<string, OHLC[]>> {
  const result: Record<string, OHLC[]> = {}
  
  const promises = symbols.map(async (symbol) => {
    const data = await fetchRealStockData(symbol)
    if (data.length > 0) {
      result[symbol] = data
    }
  })
  
  await Promise.all(promises)
  return result
}

export const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']
