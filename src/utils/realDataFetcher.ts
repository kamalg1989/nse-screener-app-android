// @ts-ignore
const pako = require('pako')
import { OHLC } from '../screener/screener'

const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/data'

function convertArrayToOHLC(rows: any[][]): OHLC[] {
  return rows.map(row => (
    {
      date: row[0],
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
      volume: row[5]
    }
  ))
}

export async function fetchRealStockData(symbol: string): Promise<OHLC[]> {
  try {
    const url = `${GITHUB_DATA_URL}/${symbol}.json.gz`
    console.log(`[DEBUG] Fetching: ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.log(`[DEBUG] Failed: HTTP ${response.status}`)
        return []
      }

      const arrayBuffer = await response.arrayBuffer()
      console.log(`[DEBUG] Response size: ${arrayBuffer.byteLength} bytes`)
      
      if (!arrayBuffer || arrayBuffer.byteLength < 50) {
        console.log(`[DEBUG] Response too small`)
        return []
      }

      console.log(`[DEBUG] Decompressing gzip...`)
      
      let decompressed: string = ''
      try {
        const uint8Array = new Uint8Array(arrayBuffer)
        const inflated = pako.inflate(uint8Array)
        const decoder = new TextDecoder('utf-8')
        decompressed = decoder.decode(inflated)
        console.log(`[DEBUG] Decompressed: ${decompressed.length} chars`)
      } catch (e) {
        console.log(`[DEBUG] Decompression failed: ${e}`)
        return []
      }

      if (!decompressed || decompressed.length < 10) {
        console.log(`[DEBUG] Decompressed data too small`)
        return []
      }

      // Remove BOM if present
      let cleanJson = decompressed
      if (cleanJson.charCodeAt(0) === 0xFEFF) {
        cleanJson = cleanJson.slice(1)
      }
      cleanJson = cleanJson.trim()
      
      // FIX: Replace NaN with null (NaN is not valid JSON)
      cleanJson = cleanJson.replace(/\bNaN\b/g, 'null')
      console.log(`[DEBUG] Cleaned NaN values`)

      let data: any[][]
      try {
        data = JSON.parse(cleanJson)
        console.log(`✓ ${symbol}: ${data.length} candles LOADED`)
      } catch (parseErr: any) {
        console.log(`[DEBUG] JSON Parse failed: ${parseErr.message}`)
        return []
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[DEBUG] No data after parsing`)
        return []
      }

      const ohlcData = convertArrayToOHLC(data)
      return ohlcData
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.log(`⚠️  ${symbol} ERROR: ${fetchError}`)
      return []
    }
  } catch (error) {
    console.log(`⚠️  ${symbol} ERROR: ${error}`)
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
