import pako from 'pako'
import { OHLC } from '../screener/screener'

const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/data'

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

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export async function fetchRealStockData(symbol: string): Promise<OHLC[]> {
  try {
    const url = `${GITHUB_DATA_URL}/${symbol}.json.gz`
    console.log(`[DEBUG] Fetching: ${url}`)

    const response = await fetch(url, { timeout: 8000 })
    console.log(`[DEBUG] Response status: ${response.status}`)
    
    if (!response.ok) {
      console.log(`[DEBUG] Failed: HTTP ${response.status}`)
      return []
    }

    const text = await response.text()
    console.log(`[DEBUG] Response size: ${text.length} bytes`)
    
    if (!text || text.length < 50) {
      console.log(`[DEBUG] Response too small`)
      return []
    }

    console.log(`[DEBUG] Decompressing gzip...`)
    let decompressed: any
    try {
      const binaryData = base64ToUint8Array(text)
      decompressed = pako.inflate(binaryData, { to: 'string' })
      console.log(`[DEBUG] Decompressed successfully: ${decompressed.length} chars`)
    } catch (e) {
      console.log(`[DEBUG] Base64 decode failed, trying direct decompression...`)
      decompressed = pako.inflate(text, { to: 'string' })
    }

    if (!decompressed || decompressed.length < 10) {
      console.log(`[DEBUG] Decompressed data too small`)
      return []
    }

    const data = JSON.parse(decompressed) as any[][]
    console.log(`[DEBUG] Parsed JSON: ${data.length} rows`)
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[DEBUG] Data not array or empty`)
      return []
    }

    const ohlcData = convertArrayToOHLC(data)
    console.log(`✓ ${symbol}: ${ohlcData.length} candles LOADED (Real Data!)`)
    return ohlcData
  } catch (error) {
    console.log(`⚠️ ${symbol} ERROR: ${error}`)
    console.log(`⚠️ ${symbol} not available, using mock data`)
    return []
  }
}

export async function fetchAllStockData(symbols: string[]): Promise<Record<string, OHLC[]>> {
  const result: Record<string, OHLC[]> = {}
  console.log(`[DEBUG] Fetching ${symbols.length} symbols...`)

  const promises = symbols.map(async (symbol) => {
    const data = await fetchRealStockData(symbol)
    if (data.length > 0) {
      result[symbol] = data
    }
  })

  await Promise.all(promises)
  console.log(`[DEBUG] Fetch complete: ${Object.keys(result).length} symbols loaded`)
  return result
}

export const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']
