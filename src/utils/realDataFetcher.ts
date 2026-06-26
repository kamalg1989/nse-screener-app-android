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

export const DEFAULT_SYMBOLS = ["360ONE", "3MINDIA", "AADHARHFC", "AARTIIND", "AAVAS", "ABB", "ABBOTINDIA", "ABCAPITAL", "ABDL", "ABFRL", "ABLBL", "ABREL", "ABSLAMC", "ACC", "ACE", "ACMESOLAR", "ACUTAAS", "ADANIENSOL", "ADANIENT", "ADANIGREEN", "ADANIPORTS", "ADANIPOWER", "AEGISLOG", "AEGISVOPAK", "AFCONS", "AFFLE", "AIAENG", "AIIL", "AJANTPHARM", "ALKEM", "AMBER", "AMBUJACEM", "ANANDRATHI", "ANANTRAJ", "ANGELONE", "ANTHEM", "ANURAS", "APARINDS", "APLAPOLLO", "APOLLOHOSP", "APOLLOTYRE", "APTUS", "AREexport const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']M", "ASAHIINDIA", "ASHOKLEY", "ASIANPAINT", "ASTERDM", "ASTRAL", "ATGL", "ATHERENERG", "ATUL", "AUBANK", "AUROPHARMA", "AWL", "AXISBANK", "BAJAJ-AUTO", "BAJAJFINSV", "BAJAJHFL", "BAJAJHLDNG", "BAJFINANCE", "BALKRISIND", "BALRAMCHIN", "BANDHANBNK", "BANKBARODA", "BANKINDIA", "BATAINDIA", "BAYERCROP", "BBTC", "BDL", "BEL", "BELRISE", "BEML", "BERGEPAINT", "BHARATFORG", "BHARTIARTL", "BHARTIHEXA", "BHEL", "BIKAJI", "BIOCON", "BLS", "BLUEDART", "BLUEJET", "BLUESTARCO", "BOSCHLTD", "BPCL", "BRIGADE", "BRITANNIA", "BSE", "BSOFT", "CAMS", "CANBK", "CANFINHOME", "CANHLIFE", "CAPLIPOINT", "CARBORUNIV", "CARTRADE", "CASTROLIND", "CCL", "CDSL", "CEATLTD", "CEMPRO", "CENTRALBK", "CESC", "CGCL", "CGPOWER", "CHALET", "CHAMBLFERT", "CHENNPETRO", "CHOICEIN", "CHOLAFIN", "CHOLAHLDNG", "CIEINDIA", "CIPLA", "CLEAN", "COALINDIA", "COCHINSHIP", "COFORGE", "COHANCE", "COLPAL", "CONCOR", "CONCORDBIO", "COROMANDEL", "CPPLUS", "CRAFTSMAN", "CREDITACC", "CRISIL", "CROMPTON", "CUB", "CUMMINSIND", "CYIENT", "DABUR", "DALBHARAT", "DATAPATTNS", "DCMSHRIRAM", "DEEPAKFERT", "DEEPAKNTR", "DELHIVERY", "DEVYANI", "DIVISLAB", "DIXON", "DLF", "DMART", "DOMS", "DRREDDY", "ECLERX", "EICHERMOT", "EIDPARRY", "EIHOTEL", "ELECON", "ELGIEQUIP", "EMAMILTD", "EMCURE", "EMMVEE", "ENDURANCE", "ENGINERSIN", "ENRIN", "ERIS", "ESCORTS", "ETERNAL", "EXIDEIND", "FACT", "FEDERALBNK", "FINCABLES", "FIRSTCRY", "FIVESTAR", "FLUOROCHEM", "FORCEMOT", "FORTIS", "FSL", "GABRIEL", "GAIL", "GALLANTT", "GESHIP", "GICRE", "GILLETTE", "GLAND", "GLAXO", "GLENMARK", "GMDCLTD", "GMRAIRPORT", "GODFRYPHLP", "GODIGIT", "GODREJCP", "GODREJIND", "GODREJPROP", "GPIL", "GRANULES", "GRAPHITE", "GRASIM", "GRAVITA", "GROWW", "GRSE", "GVTexport const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']D", "HAL", "HAVELLS", "HBLENGINE", "HCLTECH", "HDBFS", "HDFCAMC", "HDFCBANK", "HDFCLIFE", "HEG", "HEROMOTOCO", "HEXT", "HFCL", "HINDALCO", "HINDCOPPER", "HINDPETRO", "HINDUNILVR", "HINDZINC", "HOMEFIRST", "HONASA", "HONAUT", "HSCL", "HUDCO", "HYUNDAI", "ICICIAMC", "ICICIBANK", "ICICIGI", "ICICIPRULI", "IDBI", "IDEA", "IDFCFIRSTB", "IEX", "IFCI", "IGIL", "IGL", "IIFL", "IKS", "INDGN", "INDHOTEL", "INDIACEM", "INDIAMART", "INDIANB", "INDIGO", "INDUSINDBK", "INDUSTOWER", "INFY", "INOXWIND", "INTELLECT", "IOB", "IOC", "IPCALAB", "IRB", "IRCON", "IRCTC", "IREDA", "IRFC", "ITC", "ITCHOTELS", "ITI", "Jexport const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']KBANK", "JAINREC", "JBCHEPHARM", "JBMA", "JINDALSAW", "JINDALSTEL", "JIOFIN", "JKCEMENT", "JKTYRE", "JMFINANCIL", "JPPOWER", "JSL", "JSWCEMENT", "JSWDULUX", "JSWENERGY", "JSWINFRA", "JSWSTEEL", "JUBLFOOD", "JUBLINGREA", "JUBLPHARMA", "JWL", "JYOTICNC", "KAJARIACER", "KALYANKJIL", "KARURVYSYA", "KAYNES", "KEC", "KEI", "KFINTECH", "KIMS", "KIRLOSENG", "KOTAKBANK", "KPIL", "KPITTECH", "KPRMILL", "LALPATHLAB", "LATENTVIEW", "LAURUSLABS", "LEMONTREE", "LENSKART", "LGEINDIA", "LICHSGFIN", "LICI", "LINDEINDIA", "LLOYDSME", "LODHA", "LT", "LTF", "LTFOODS", "LTM", "LTTS", "LUPIN", "Mexport const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']M", "Mexport const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY']MFIN", "MAHABANK", "MANAPPURAM", "MANKIND", "MAPMYINDIA", "MARICO", "MARUTI", "MAXHEALTH", "MAZDOCK", "MCX", "MEDANTA", "MEESHO", "MFSL", "MGL", "MINDACORP", "MMTC", "MOTHERSON", "MOTILALOFS", "MPHASIS", "MRF", "MRPL", "MSUMI", "MUTHOOTFIN", "NAM-INDIA", "NATCOPHARM", "NATIONALUM", "NAUKRI", "NAVA", "NAVINFLUOR", "NBCC", "NCC", "NESTLEIND", "NETWEB", "NEULANDLAB", "NEWGEN", "NH", "NHPC", "NIACL", "NIVABUPA", "NLCINDIA", "NMDC", "NSLNISP", "NTPC", "NTPCGREEN", "NUVAMA", "NUVOCO", "NYKAA", "OBEROIRLTY", "OFSS", "OIL", "OLAELEC", "OLECTRA", "ONESOURCE", "ONGC", "PAGEIND", "PARADEEP", "PATANJALI", "PAYTM", "PCBL", "PERSISTENT", "PETRONET", "PFC", "PFIZER", "PGEL", "PHOENIXLTD", "PIDILITIND", "PIIND", "PINELABS", "PIRAMALFIN", "PNB", "PNBHOUSING", "POLICYBZR", "POLYCAB", "POLYMED", "POONAWALLA", "POWERGRID", "POWERINDIA", "PPLPHARMA", "PREMIERENE", "PRESTIGE", "PTCIL", "PVRINOX", "PWL", "RADICO", "RAILTEL", "RAINBOW", "RAMCOCEM", "RBLBANK", "RECLTD", "REDINGTON", "RELIANCE", "RHIM", "RITES", "RKFORGE", "RPOWER", "RRKABEL", "RVNL", "SAGILITY", "SAIL", "SAILIFE", "SAMMAANCAP", "SAPPHIRE", "SARDAEN", "SAREGAMA", "SBFC", "SBICARD", "SBILIFE", "SBIN", "SCHAEFFLER", "SCHNEIDER", "SCI", "SHREECEM", "SHRIRAMFIN", "SHYAMMETL", "SIEMENS", "SIGNATURE", "SJVN", "SOBHA", "SOLARINDS", "SONACOMS", "SONATSOFTW", "SPLPETRO", "SRF", "STARHEALTH", "SUMICHEM", "SUNDARMFIN", "SUNPHARMA", "SUNTV", "SUPREMEIND", "SUZLON", "SWANCORP", "SWIGGY", "SYNGENE", "SYRMA", "TARIL", "TATACAP", "TATACHEM", "TATACOMM", "TATACONSUM", "TATAELXSI", "TATAINVEST", "TATAPOWER", "TATASTEEL", "TATATECH", "TBOTEK", "TCS", "TECHM", "TECHNOE", "TEGA", "TEJASNET", "TENNIND", "THELEELA", "THERMAX", "TIINDIA", "TIMKEN", "TITAGARH", "TITAN", "TMCV", "TMPV", "TORNTPHARM", "TORNTPOWER", "TRAVELFOOD", "TRENT", "TRIDENT", "TRITURBINE", "TTML", "TVSMOTOR", "UBL", "UCOBANK", "ULTRACEMCO", "UNIONBANK", "UNITDSPR", "UNOMINDA", "UPL", "URBANCO", "USHAMART", "UTIAMC", "VAML", "VBL", "VEDL", "VEDPOWER", "VIJAYA", "VISL", "VMM", "VOGL", "VOLTAS", "VTL", "WAAREEENER", "WELCORP", "WELSPUNLIV", "WHIRLPOOL", "WIPRO", "WOCKPHARMA", "YESBANK", "ZEEL", "ZENSARTECH", "ZENTEC", "ZFCVINDIA", "ZYDUSLIFE", "ZYDUSWELL"]
