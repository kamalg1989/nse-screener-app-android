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

function trimToLookback(data: OHLC[], barCount: number): OHLC[] {
  // Keep last N bars (not days!)
  // Screening: 90 bars ≈ 90 trading days
  // Weekly: 60 bars ≈ 12 weeks ≈ 3 months (when aggregated to weekly)
  if (data.length <= barCount) return data
  return data.slice(-barCount)
}

export async function fetchRealStockData(
  symbol: string,
  purpose: "screening" | "weekly_chart" = "screening"
): Promise<OHLC[]> {
  try {
    const url = `${GITHUB_DATA_URL}/${symbol}.json.gz`
    const barCount = purpose === "screening" ? 90 : 60  // FIX: 60 bars for weekly = 3 months
    console.log(`[DEBUG] Fetching: ${url} (${purpose}, ${barCount} bars)`)

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
        console.log(`[DEBUG] Parsed ${data.length} total candles`)
      } catch (parseErr: any) {
        console.log(`[DEBUG] JSON Parse failed: ${parseErr.message}`)
        return []
      }

      // Trim to lookback period (90 or 60 bars)
      const trimmed = trimToLookback(data, barCount)
      console.log(`✓ ${symbol}: ${trimmed.length} candles LOADED (trimmed from ${data.length}, ${purpose})`)

      return convertArrayToOHLC(trimmed)
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.log(`❌ Fetch error for ${symbol}: ${error}`)
    return []
  }
}

// Retry logic with exponential backoff
async function fetchWithRetry(
  symbol: string,
  purpose: "screening" | "weekly_chart" = "screening",
  maxRetries: number = 3
): Promise<{ symbol: string; data: OHLC[] }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await fetchRealStockData(symbol, purpose)
      if (data.length > 0) {
        return { symbol, data }
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt)
        console.log(`[RETRY] ${symbol} attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  return { symbol, data: [] }
}

// Parallel fetching with concurrency limit (8 concurrent - balanced speed vs safety)
async function fetchWithConcurrency(
  symbols: string[],
  purpose: "screening" | "weekly_chart" = "screening",
  concurrency: number = 8  // OPTIMIZED: 6 → 8 for speed, 20 → 8 for safety
): Promise<Record<string, OHLC[]>> {
  const result: Record<string, OHLC[]> = {}
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)
    console.log(`[FETCH] Batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(symbols.length / concurrency)}: ${batch.length} symbols (concurrency: ${concurrency})`)

    const promises = batch.map(sym => fetchWithRetry(sym, purpose))
    const batchResults = await Promise.all(promises)

    batchResults.forEach(({ symbol, data }) => {
      if (data.length > 0) {
        result[symbol] = data
        successCount++
      } else {
        errorCount++
      }
    })

    console.log(`[PROGRESS] ${successCount} loaded, ${errorCount} failed (${i + concurrency}/${symbols.length})`)

    // Balanced delay (8 concurrent is safe, can use 75ms)
    if (i + concurrency < symbols.length) {
      await new Promise(r => setTimeout(r, 75))  // Mid-ground between 50ms (too fast) and 100ms
    }
  }

  console.log(`[DEBUG] Fetch complete: ${successCount} symbols loaded, ${errorCount} failed`)
  return result
}

export async function fetchAllStockData(
  symbols: string[],
  purpose: "screening" | "weekly_chart" = "screening"
): Promise<Record<string, OHLC[]>> {
  const fetchStartTime = Date.now()
  console.log(`[TIMER] Starting parallel fetch of ${symbols.length} symbols for ${purpose}... (8-concurrent BALANCED)`)
  
  const result = await fetchWithConcurrency(symbols, purpose, 8)  // OPTIMIZED: 8-concurrent (safe + fast)
  
  const fetchEndTime = Date.now()
  const totalTime = fetchEndTime - fetchStartTime
  const successCount = Object.keys(result).length
  const failureCount = symbols.length - successCount
  const throughput = (successCount / (totalTime / 1000)).toFixed(1)
  
  console.log('\n📊 ═══════════════════════════════════════')
  console.log('📊 DATA FETCH METRICS (8-CONCURRENT)')
  console.log('📊 ═══════════════════════════════════════')
  console.log(`📊 Total symbols:      ${symbols.length}`)
  console.log(`📊 Successful:         ${successCount}`)
  console.log(`📊 Failed:             ${failureCount}`)
  console.log(`📊 ─────────────────────────────────────`)
  console.log(`📊 ⏱️  TOTAL TIME:        ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`)
  console.log(`📊 Throughput:         ${throughput} symbols/sec`)
  console.log(`📊 Avg per symbol:     ${(totalTime / successCount).toFixed(0)}ms`)
  console.log('📊 ═══════════════════════════════════════\n')
  
  return result
}

export const DEFAULT_SYMBOLS = ["360ONE", "3MINDIA", "AADHARHFC", "AARTIIND", "AAVAS", "ABB", "ABBOTINDIA", "ABCAPITAL", "ABDL", "ABFRL", "ABLBL", "ABREL", "ABSLAMC", "ACC", "ACE", "ACMESOLAR", "ACUTAAS", "ADANIENSOL", "ADANIENT", "ADANIGREEN", "ADANIPORTS", "ADANIPOWER", "AEGISLOG", "AEGISVOPAK", "AFCONS", "AFFLE", "AIAENG", "AIIL", "AJANTPHARM", "ALKEM", "AMBER", "AMBUJACEM", "ANANDRATHI", "ANANTRAJ", "ANGELONE", "ANTHEM", "ANURAS", "APARINDS", "APLAPOLLO", "APOLLOHOSP", "APOLLOTYRE", "APTUS", "ARCHEXP", "ARCHIDPLY", "ARNDL", "ASAHIINDIA", "ASHOKLEY", "ASIANPAINT", "ASTERDM", "ASTRAL", "ATGL", "ATHERENERG", "ATUL", "AUBANK", "AUROPHARMA", "AWL", "AXISBANK", "BAJAJ-AUTO", "BAJAJFINSV", "BAJAJHFL", "BAJAJHLDNG", "BAJFINANCE", "BALKRISIND", "BALRAMCHIN", "BANDHANBNK", "BANKBARODA", "BANKINDIA", "BATAINDIA", "BAYERCROP", "BBTC", "BDL", "BEL", "BELRISE", "BEML", "BERGEPAINT", "BHARATFORG", "BHARTIARTL", "BHARTIHEXA", "BHEL", "BIKAJI", "BIOCON", "BLS", "BLUEDART", "BLUEJET", "BLUESTARCO", "BOSCHLTD", "BPCL", "BRIGADE", "BRITANNIA", "BSE", "BSOFT", "CAMS", "CANBK", "CANFINHOME", "CANHLIFE", "CAPLIPOINT", "CARBORUNIV", "CARTRADE", "CASTROLIND", "CCL", "CDSL", "CEATLTD", "CEMPRO", "CENTRALBK", "CESC", "CGCL", "CGPOWER", "CHALET", "CHAMBLFERT", "CHENNPETRO", "CHOICEIN", "CHOLAFIN", "CHOLAHLDNG", "CIEINDIA", "CIPLA", "CLEAN", "COALINDIA", "COCHINSHIP", "COFORGE", "COHANCE", "COLPAL", "CONCOR", "CONCORDBIO", "COROMANDEL", "CPPLUS", "CRAFTSMAN", "CREDITACC", "CRISIL", "CROMPTON", "CUB", "CUMMINSIND", "CYIENT", "DABUR", "DALBHARAT", "DATAPATTNS", "DCMSHRIRAM", "DEEPAKFERT", "DEEPAKNTR", "DELHIVERY", "DEVYANI", "DIVISLAB", "DIXON", "DLF", "DMART", "DOMS", "DRREDDY", "ECLERX", "EICHERMOT", "EIDPARRY", "EIHOTEL", "ELECON", "ELGIEQUIP", "EMAMILTD", "EMCURE", "EMMVEE", "ENDURANCE", "ENGINERSIN", "ENRIN", "ERIS", "ESCORTS", "ETERNAL", "EXIDEIND", "FACT", "FEDERALBNK", "FINCABLES", "FIRSTCRY", "FIVESTAR", "FLUOROCHEM", "FORCEMOT", "FORTIS", "FSL", "GABRIEL", "GAIL", "GALLANTT", "GESHIP", "GICRE", "GILLETTE", "GLAND", "GLAXO", "GLENMARK", "GMDCLTD", "GMRAIRPORT", "GODFRYPHLP", "GODIGIT", "GODREJCP", "GODREJIND", "GODREJPROP", "GPIL", "GRANULES", "GRAPHITE", "GRASIM", "GRAVITA", "GROWW", "GRSE", "GVTVD", "HAL", "HAVELLS", "HBLENGINE", "HCLTECH", "HDBFS", "HDFCAMC", "HDFCBANK", "HDFCLIFE", "HEG", "HEROMOTOCO", "HEXT", "HFCL", "HINDALCO", "HINDCOPPER", "HINDPETRO", "HINDUNILVR", "HINDZINC", "HOMEFIRST", "HONASA", "HONAUT", "HSCL", "HUDCO", "HYUNDAI", "ICICIAMC", "ICICIBANK", "ICICIGI", "ICICIPRULI", "IDBI", "IDEA", "IDFCFIRSTB", "IEX", "IFCI", "IGIL", "IGL", "IIFL", "IKS", "INDGN", "INDHOTEL", "INDIACEM", "INDIAMART", "INDIANB", "INDIGO", "INDUSINDBK", "INDUSTOWER", "INFY", "INOXWIND", "INTELLECT", "IOB", "IOC", "IPCALAB", "IRB", "IRCON", "IRCTC", "IREDA", "IRFC", "ITC", "ITCHOTELS", "ITI", "JKBANK", "JAINREC", "JBCHEPHARM", "JBMA", "JINDALSAW", "JINDALSTEL", "JIOFIN", "JKCEMENT", "JKTYRE", "JMFINANCIL", "JPPOWER", "JSL", "JSWCEMENT", "JSWDULUX", "JSWENERGY", "JSWINFRA", "JSWSTEEL", "JUBLFOOD", "JUBLINGREA", "JUBLPHARMA", "JWL", "JYOTICNC", "KAJARIACER", "KALYANKJIL", "KARURVYSYA", "KAYNES", "KEC", "KEI", "KFINTECH", "KIMS", "KIRLOSENG", "KOTAKBANK", "KPIL", "KPITTECH", "KPRMILL", "LALPATHLAB", "LATENTVIEW", "LAURUSLABS", "LEMONTREE", "LENSKART", "LGEINDIA", "LICHSGFIN", "LICI", "LINDEINDIA", "LLOYDSME", "LODHA", "LT", "LTF", "LTFOODS", "LTM", "LTTS", "LUPIN", "LUXIND", "MMFIN", "MAHABANK", "MANAPPURAM", "MANKIND", "MAPMYINDIA", "MARICO", "MARUTI", "MAXHEALTH", "MAZDOCK", "MCX", "MEDANTA", "MEESHO", "MFSL", "MGL", "MINDACORP", "MMTC", "MOTHERSON", "MOTILALOFS", "MPHASIS", "MRF", "MRPL", "MSUMI", "MUTHOOTFIN", "NAM-INDIA", "NATCOPHARM", "NATIONALUM", "NAUKRI", "NAVA", "NAVINFLUOR", "NBCC", "NCC", "NESTLEIND", "NETWEB", "NEULANDLAB", "NEWGEN", "NH", "NHPC", "NIACL", "NIVABUPA", "NLCINDIA", "NMDC", "NSLNISP", "NTPC", "NTPCGREEN", "NUVAMA", "NUVOCO", "NYKAA", "OBEROIRLTY", "OFSS", "OIL", "OLAELEC", "OLECTRA", "ONESOURCE", "ONGC", "PAGEIND", "PARADEEP", "PATANJALI", "PAYTM", "PCBL", "PERSISTENT", "PETRONET", "PFC", "PFIZER", "PGEL", "PHOENIXLTD", "PIDILITIND", "PIIND", "PINELABS", "PIRAMALFIN", "PNB", "PNBHOUSING", "POLICYBZR", "POLYCAB", "POLYMED", "POONAWALLA", "POWERGRID", "POWERINDIA", "PPLPHARMA", "PREMIERENE", "PRESTIGE", "PTCIL", "PVRINOX", "PWL", "RADICO", "RAILTEL", "RAINBOW", "RAMCOCEM", "RBLBANK", "RECLTD", "REDINGTON", "RELIANCE", "RHIM", "RITES", "RKFORGE", "RPOWER", "RRKABEL", "RVNL", "SAGILITY", "SAIL", "SAILIFE", "SAMMAANCAP", "SAPPHIRE", "SARDAEN", "SAREGAMA", "SBFC", "SBICARD", "SBILIFE", "SBIN", "SCHAEFFLER", "SCHNEIDER", "SCI", "SHREECEM", "SHRIRAMFIN", "SHYAMMETL", "SIEMENS", "SIGNATURE", "SJVN", "SOBHA", "SOLARINDS", "SONACOMS", "SONATSOFTW", "SPLPETRO", "SRF", "STARHEALTH", "SUMICHEM", "SUNDARMFIN", "SUNPHARMA", "SUNTV", "SUPREMEIND", "SUZLON", "SWANCORP", "SWIGGY", "SYNGENE", "SYRMA", "TARIL", "TATACAP", "TATACHEM", "TATACOMM", "TATACONSUM", "TATAELXSI", "TATAINVEST", "TATAPOWER", "TATASTEEL", "TATATECH", "TBOTEK", "TCS", "TECHM", "TECHNOE", "TEGA", "TEJASNET", "TENNIND", "THELEELA", "THERMAX", "TIINDIA", "TIMKEN", "TITAGARH", "TITAN", "TMCV", "TMPV", "TORNTPHARM", "TORNTPOWER", "TRAVELFOOD", "TRENT", "TRIDENT", "TRITURBINE", "TTML", "TVSMOTOR", "UBL", "UCOBANK", "ULTRACEMCO", "UNIONBANK", "UNITDSPR", "UNOMINDA", "UPL", "URBANCO", "USHAMART", "UTIAMC", "VAML", "VBL", "VEDL", "VEDPOWER", "VIJAYA", "VISL", "VMM", "VOGL", "VOLTAS", "VTL", "WAAREEENER", "WELCORP", "WELSPUNLIV", "WHIRLPOOL", "WIPRO", "WOCKPHARMA", "YESBANK", "ZEEL", "ZENSARTECH", "ZENTEC", "ZFCVINDIA", "ZYDUSLIFE", "ZYDUSWELL"]
