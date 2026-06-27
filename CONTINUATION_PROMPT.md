# NSE Screener Android App - Session Continuation Prompt

## CURRENT STATUS
**Date**: June 27, 2026  
**Active Branch**: `feature/performance-optimization`  
**Main Issue**: Gzip decompression failing in React Native/Expo for monthly data files

---

## PROJECT OVERVIEW

### Repos
- **Android App**: https://github.com/kamalg1989/nse-screener-app-android
- **Stock Data**: https://github.com/kamalg1989/nse-market-data (contains `monthly/` folder with consolidated data)

### Local Paths
```
/Users/kamal/IdeaProjects/nse-screener-app-android/
├── src/
│   ├── components/CandleChartInteractive.tsx    ← EMA lines restored
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── BacktestScreen.tsx                   ← Date picker added
│   │   └── SettingsScreen.tsx
│   └── utils/
│       ├── realDataFetcher.ts                   ← CURRENTLY BROKEN (gzip issue)
│       ├── emaCalculator.ts                     ← NaN handling added
│       ├── backtestEngine.ts                    ← Debug logs added
│       └── ...other utils
```

---

## DATA ARCHITECTURE (IMPORTANT)

### Migration: Individual Files → Monthly Consolidated
- **OLD**: Fetched 500 individual files (`/data/STOCK.json.gz`) = 25-50 seconds
- **NEW**: Fetch 9 monthly files (`/monthly/YYYY-MM.json.gz`) = 3-5 seconds (10x faster)
- **Correct GitHub URL**: `https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/monthly`
- **File Format**: `.json.gz` - gzipped JSON with structure: `{ "SYMBOL": [[date, o, h, l, c, v], ...], ... }`

### Data File Structure
```
{
  "RELIANCE": [["2026-06-27", 2850.5, 2875.0, 2840.0, 2860.2, 1000000], ...],
  "TCS": [["2026-06-27", 3240.0, 3265.5, 3230.0, 3255.1, 500000], ...],
  ...
}
```

---

## LAST SESSION WORK COMPLETED

### ✅ Fixed Issues
1. **EMA Lines Restored** in `CandleChartInteractive.tsx` inside clipped SVG group
2. **NaN Close Price Handling** in `emaCalculator.ts` (fallback to high if close is NaN)
3. **Date Picker Added** to BacktestScreen (DateTimePicker from `@react-native-community/datetimepicker`)
4. **URL Fixed** from `nse-stock-data` → `nse-market-data` repo

### 🔴 CURRENT BLOCKER: Gzip Decompression Error
**Console Error**: `TypeError: Cannot read property 'inflate' of undefined`
- Occurs when `pako.inflate()` is called in `realDataFetcher.ts`
- Files are fetching successfully (171KB+ responses received)
- But decompression fails because `pako` is undefined in React Native/Expo

**Root Cause**: `pako` library not properly available/loaded in Expo environment

---

## CURRENT realDataFetcher.ts STATUS

**Location**: `/Users/kamal/IdeaProjects/nse-screener-app-android/src/utils/realDataFetcher.ts`

**Latest Approach** (partially implemented):
```typescript
const GITHUB_MONTHLY_URL = 'https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/monthly'

// Try 1: response.text() auto-decompression (modern browsers)
jsonText = await response.text()

// Try 2: Fallback to pako.inflate() (manual decompression)
const decompressed = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' })
```

**Issue**: `pako` is imported but undefined at runtime in Expo

---

## WHAT NEEDS TO BE DONE

### IMMEDIATE (Critical)
1. **Fix Gzip Decompression** - Options:
   - Option A: Get `pako` working in Expo (try reinstall, different import)
   - Option B: Use native fetch auto-decompression (response.text() should auto-decompress)
   - Option C: Use alternative library compatible with React Native
   - Option D: Store uncompressed `.json` files instead of `.json.gz`

2. **Test Data Fetch**:
   ```bash
   npx expo start --reset-cache
   # Press 'a'
   # Watch console logs for data loading
   ```

### SECONDARY (High Priority)
1. Push feature branch to GitHub: `git push origin feature/performance-optimization`
2. Test BacktestScreen with real dates
3. Handle weekly chart EMA insufficiency (EMA 50/200 need 200+ candles, weekly has ~36)
4. Re-enable EMA filter in screener

### LATER (Medium Priority)
1. Cache monthly data (AsyncStorage 24hr TTL)
2. Base detection feature
3. Merge feature branch to main after full testing

---

## KEY CODE REFERENCES

### realDataFetcher API
```typescript
// Main function - fetches last N months
export async function fetchAllStockData(
  symbols: string[] = [],
  monthsToFetch: number = 3
): Promise<Record<string, OHLC[]>>

// Usage in screens:
const data = await fetchAllStockData(DEFAULT_SYMBOLS, 9)
// Returns: { RELIANCE: [...candles], TCS: [...candles], ... }
```

### BacktestScreen Date Handling
```typescript
// User selects date → triggers 9-month data fetch
handleDateChange(date) {
  const formattedDate = date.toISOString().split('T')[0]
  loadDataForDate(formattedDate, date)
}

// Fetch is fixed to last 9 months from TODAY (not from selected date)
const realData = await fetchAllStockData(DEFAULT_SYMBOLS, 9)
```

### EMA Calculator (Fixed)
```typescript
// Handles NaN close prices by falling back to high
const closePrices = ohlcData.map(candle => {
  const closePrice = Number.isFinite(candle.close) ? candle.close : candle.high
  return closePrice
})
```

---

## CONSOLE DEBUG PATTERNS TO WATCH

**Working data fetch should show:**
```
[DEBUG] Months to fetch: 2026-06, 2026-05, 2026-04, ...
[DEBUG] Fetching 9 month files in PARALLEL...
[DEBUG] Fetching month: 2026-06
[DEBUG] Reading response as text (auto-decompress gzip)...
✓ Month 2026-06: 504 stocks loaded
✓ Month 2026-05: 500 stocks loaded
📊 Unique stocks: 499
```

**Current broken output:**
```
[DEBUG] Response size: 171301 bytes
[DEBUG] Decompressing gzip...
[WARN] Error fetching month 2026-06: TypeError: Cannot read property 'inflate' of undefined
```

---

## PACKAGE DEPENDENCIES

**Critical for this session:**
```json
{
  "pako": "^3.0.0",
  "@react-native-community/datetimepicker": "^9.1.0",
  "react-native-svg": "^15.15.5"
}
```

**Install command** (if needed):
```bash
cd /Users/kamal/IdeaProjects/nse-screener-app-android
npm install pako
npx expo start --reset-cache
```

---

## BUILD/RUN COMMANDS

```bash
# Start development
npx expo start --reset-cache
# Then press 'a' for Android

# Reset cache completely
rm -rf node_modules/.cache
npx expo start --reset-cache

# Push changes
git add .
git commit -m "message"
git push origin feature/performance-optimization
```

---

## KNOWN ISSUES (Not in scope for this session)

1. **Weekly Chart EMAs**: EMA 50/200 never render (need 200 candles, weekly has ~36)
2. **NaN Data Quality**: 2026-06-16 has NaN close prices across all 500+ stocks
3. **Screener EMA Filter**: Currently disabled (all stocks marked as downtrend)

---

## PREVIOUS SESSION CONTEXT

**Last Major Work**: 
- Deployed `entry_engine.py` v3.0 on VPS (OHM trading system)
- Migrated screener from private sheet to shared `google_sheets_db` layer
- Built console safety guards for data integrity
- Set up GitHub Actions for daily candle updates

**NSE Screener Android Timeline**:
- Chart optimization session: Fixed EMA line rendering, NaN handling
- Backtest date picker: Added date selection, 9-month data window
- Current: Fixing data fetcher for monthly consolidated files

---

## QUICK REFERENCE: Test Checklist

- [ ] Data fetch completes in 3-5 seconds
- [ ] Console shows "504 stocks loaded" for recent months
- [ ] HomeScreen displays candlestick chart with EMA lines
- [ ] BacktestScreen date picker works
- [ ] Backtest runs and returns trades (or 0 if no matches)
- [ ] No "Cannot read property 'inflate'" errors

---

**Next Step**: Fix the gzip decompression issue. Start by checking if `pako` is properly installed and testing the data fetch in isolation.
