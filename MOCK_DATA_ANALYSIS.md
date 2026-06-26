# 📊 NSE SCREENER APP - MOCK DATA ANALYSIS REPORT

## EXECUTIVE SUMMARY
The app has **hardcoded mock data** in 3 main locations with fallback logic.
When real data fails to load, it defaults to procedurally generated mock data.

---

## 🎯 MOCK DATA FILES & LOCATIONS

### 1. **PRIMARY MOCK DATA FILE**
📄 `src/utils/mockData.ts` (Main source of all mock data)

**What it does:**
- Defines `MOCK_DATA` object with 5 stocks
- Procedurally generates realistic OHLC data
- Not hardcoded values - algorithmically generated

**Stocks Included:**
```
RELIANCE   → Base Price: ₹2,150
TCS        → Base Price: ₹3,500
HDFCBANK   → Base Price: ₹1,680
ICICIBANK  → Base Price: ₹950
INFY       → Base Price: ₹1,850
```

**Generated Data Structure:**
- 630 candles BACKWARDS (90 weeks of historical data)
- 120 candles FORWARDS (future/forward testing data)
- Total: **750 candles per stock**
- Format: `[date, open, high, low, close, volume]`

**Generation Algorithm:**
```typescript
function generateMockData(basePrice, symbol):
  - Start with basePrice
  - For each candle:
    - Random price change: ±1.5% per day
    - OHLC calculated from random walk
    - Volume: 2-12M shares (random)
    - High/Low: ±1.2% from OHLC
```

---

## 📍 USAGE IN SCREENS

### 2. **HomeScreen.tsx** (Uses mock data)
**Location:** `src/screens/HomeScreen.tsx:16-25`

**Mock Data Integration:**
```typescript
import { MOCK_DATA } from '../utils/mockData'

// Fetches real data first
const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
const hasRealData = Object.keys(realData).length > 0

// FALLBACK TO MOCK
const dataToUse = hasRealData ? realData : MOCK_DATA  ← **Fallback**
setDataSource(hasRealData ? 'real' : 'mock')
```

**What's displayed:**
- `dataSource` state shows "📊 Real Data" or "🤖 Mock Data" badge
- Opportunities generated from whichever data source is available
- Refresh button re-runs the check

**Mock Hardcoding:**
- Initial state: `useState<'real' | 'mock'>('mock')` ← Default to mock
- Falls back if fetch fails

---

### 3. **BacktestScreen.tsx** (Uses mock data)
**Location:** `src/screens/BacktestScreen.tsx:18-32`

**Mock Data Integration:**
```typescript
import { MOCK_DATA } from '../utils/mockData'

const loadData = async () => {
  const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
  // FALLBACK TO MOCK
  const dataToUse = Object.keys(realData).length > 0 ? realData : MOCK_DATA
  setAllData(dataToUse)
}
```

**Backtesting Uses:**
- Allows historical date selection (e.g., 2026-01-15)
- Runs backtest on past data + forward period
- Leverages 750 candles for testing

---

### 4. **SettingsScreen.tsx** (Displays mock data status)
**Location:** `src/screens/SettingsScreen.tsx:8-45`

**Mock Data Integration:**
```typescript
const [dataSource, setDataSource] = useState<'real' | 'mock'>('mock')  ← Default

const loadDataStats = async () => {
  const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
  if (Object.keys(realData).length > 0) {
    setDataSource('real')
    // Display real data stats
  } else {
    setDataSource('mock')  ← Falls back to mock
  }
}
```

**Settings Display:**
- Shows "📊 Real NSE Data" or "🤖 Mock Data" badge
- Displays stats: Total symbols, candles, date range
- Has "Refresh Stats" button to re-check

---

## 🔄 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────┐
│  Screen Component (Home/Backtest/Settings)      │
└────────────────┬────────────────────────────────┘
                 │
                 ↓
        ┌─────────────────────┐
        │ fetchAllStockData()  │ ← realDataFetcher.ts
        └────────┬────────────┘
                 │
         ┌───────┴────────┐
         ↓                ↓
    ✅ Real Data Found   ❌ Real Data Failed
         │                │
         │                ↓
         │         FALLBACK: MOCK_DATA
         │         (mockData.ts)
         │                │
         └────────┬───────┘
                  ↓
         ┌────────────────────┐
         │  Use Data in:       │
         │  • Screener        │
         │  • Backtest        │
         │  • Chart Display   │
         └────────────────────┘
```

---

## 🔍 HARDCODED DEFAULT VALUES

| File | Line | Default Value | Purpose |
|------|------|---------------|---------|
| `HomeScreen.tsx` | 19 | `'mock'` | Initial data source state |
| `BacktestScreen.tsx` | 13 | `'2026-01-15'` | Default backtest start date |
| `BacktestScreen.tsx` | 14 | `4` | Default weeks to test |
| `SettingsScreen.tsx` | 9 | `'mock'` | Initial data source state |
| `mockData.ts` | 11-15 | Base prices (2150, 3500...) | Mock stock prices |

---

## 📊 MOCK DATA CHARACTERISTICS

**Realistic Elements:**
- ✅ Daily candles with OHLC structure
- ✅ Realistic volume (2M-12M shares)
- ✅ Random walk price movement (±1.5% per day)
- ✅ High/Low variation (±1.2%)
- ✅ Proper date sequencing (backward + forward)

**Limitations:**
- ❌ Not actual NSE historical data
- ❌ Randomly generated patterns
- ❌ No correlation to real market events
- ❌ Procedurally generated each time (not cached)

---

## 🚨 WHY MOCK DATA IS STILL SHOWING

**Root Cause:** Data fetch from GitHub is failing

**Reasons:**
1. ✅ `realDataFetcher.ts` trying to fetch `.json.gz` files
2. ✅ `pako` installed but may not be decompressing correctly
3. ✅ React Native `fetch()` handling binary gzip data incorrectly
4. ✅ GitHub rates might be limiting requests

**Console Evidence:**
```
⚠️ RELIANCE not available, using mock data
⚠️ TCS not available, using mock data
⚠️ HDFCBANK not available, using mock data
⚠️ ICICIBANK not available, using mock data
⚠️ INFY not available, using mock data
```

---

## ✅ WHAT NEEDS TO HAPPEN

### Option 1: **Fix Real Data Fetching** (RECOMMENDED)
```
1. Debug realDataFetcher.ts gzip decompression
2. Test pako.inflate() with actual GitHub data
3. Add error logging to see exact failure point
4. Once fixed, real data will load automatically
5. Mock data becomes backup only
```

### Option 2: **Keep Mock Data as Default**
```
Mock data is FINE for:
- ✅ Demo/Testing
- ✅ UI/UX validation
- ✅ Algorithm backtesting
- ✅ Development

But needs real data for:
- ❌ Live screening
- ❌ Production trading
```

---

## 📋 SUMMARY TABLE

| Aspect | Status | Details |
|--------|--------|---------|
| Mock Data Source | ✅ Active | `mockData.ts` generating 750 candles per stock |
| Real Data Fallback | ⏳ Failing | Gzip decompression not working in React Native |
| Mock Data Coverage | ✅ Complete | All 5 default symbols have mock data |
| Data Flow Logic | ✅ Correct | Proper try-fetch-fallback architecture |
| UI Indicators | ✅ Working | Badge shows "🤖 Mock Data" correctly |

---

## 🎯 RECOMMENDATION

**Status:** App is functioning correctly with mock data as fallback.

**Next Steps:**
1. Debug why gzip decompression is failing
2. Check if `pako` is properly installed in bundled code
3. Test React Native `fetch()` with binary data
4. Once fixed, real 500-stock data from your repo will load

**For Now:** Mock data is sufficient for testing app functionality. The real data will seamlessly replace it once the fetch issue is resolved.

