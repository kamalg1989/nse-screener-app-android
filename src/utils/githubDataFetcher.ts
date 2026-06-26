// Fetch NSE data from GitHub
export interface OHLC {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/data'

export async function fetchNSEData(symbol: string): Promise<OHLC[]> {
  try {
    // Try uncompressed first, then compressed
    let url = `${GITHUB_BASE_URL}/${symbol}.json`
    let response = await fetch(url)
    
    if (!response.ok) {
      // Try compressed version
      url = `${GITHUB_BASE_URL}/${symbol}.json.gz`
      response = await fetch(url)
      
      if (!response.ok) {
        console.log(`⚠️ ${symbol} not found`)
        return []
      }
    }

    const text = await response.text()
    
    // Handle empty or invalid responses
    if (!text || text.length < 10) {
      console.log(`⚠️ ${symbol} returned empty data`)
      return []
    }
    
    // Try to parse JSON - handle NaN values
    try {
      const sanitized = text.replace(/(\[|,)\s*NaN\s*(,|\])/gi, '$1null$2')
      const data = JSON.parse(sanitized)
      
      if (!Array.isArray(data)) {
        console.log(`⚠️ ${symbol} data is not an array`)
        return []
      }
      
      // Convert to OHLC format
      const ohlcData: OHLC[] = data
        .map((row: any[]) => ({
          date: row[0] || '',
          open: Number(row[1]) || 0,
          high: Number(row[2]) || 0,
          low: Number(row[3]) || 0,
          close: Number(row[4]) || 0,
          volume: Number(row[5]) || 0,
        }))
        .filter((o: OHLC) => o.close > 0 && o.date)
      
      console.log(`✅ ${symbol}: ${ohlcData.length} candles`)
      return ohlcData
    } catch (parseError) {
      console.log(`⚠️ ${symbol} parse error - likely gzipped data`)
      return []
    }
  } catch (error) {
    console.log(`⚠️ Error fetching ${symbol}`)
    return []
  }
}

// Fetch multiple symbols
export async function fetchMultipleSymbols(symbols: string[]): Promise<Record<string, OHLC[]>> {
  const results: Record<string, OHLC[]> = {}
  
  for (const symbol of symbols) {
    const data = await fetchNSEData(symbol)
    if (data.length > 0) {
      results[symbol] = data
    }
  }
  
  return results
}

// Common NSE stocks - top 20 with highest liquidity
export const NIFTY50_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY',
  'KOTAKBANK', 'SBIN', 'BAJAJFINSV', 'LT', 'MARUTI',
  'AXISBANK', 'WIPRO', 'ONGC', 'SUNPHARMA', 'BHARTIARTL',
  'HINDUNILVR', 'TITAN', 'NESTLEIND', 'POWERGRID', 'ITC',
]
