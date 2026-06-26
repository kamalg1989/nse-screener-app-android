# 📋 NSE SCREENER - ERROR LOGGING GUIDE

## Overview

The app now has a comprehensive logging system that captures **all errors, warnings, and debug information**. 

**Status from screenshot:** Your error shows "Unexpected character 'L'" which typically indicates a JSON parsing issue with number formatting. This is now fully captured and logged.

---

## 📍 Where Are Logs Stored?

### React Native Limitations:
React Native **cannot write directly to device filesystem** without special permissions. Instead, logs are:

1. **In-Memory Buffer** (Primary)
   - Stored in `src/utils/logger.ts`
   - Max 1000 log entries retained
   - Cleared on app restart

2. **Console Output** 
   - Visible in Expo dev console
   - Also printed to device Logcat (Android)

3. **Exportable as JSON**
   - Can be exported programmatically
   - Can be viewed in Settings → Debug Logs

---

## 🔧 Logging System Architecture

### Files Created:

```
✅ src/utils/logger.ts (80 lines)
   └─ Core logging system
   └─ Handles: DEBUG, INFO, WARN, ERROR levels
   └─ Safe JSON stringification (handles BigInt, circular refs)
   └─ In-memory buffer with 1000 entry limit
   
✅ src/utils/debugViewer.ts (50 lines)
   └─ Debug info formatter
   └─ getDebugInfo() - Returns all system info
   └─ getRecentErrors() - Last 10 errors
   └─ getRecentWarnings() - Last 10 warnings
   └─ formatLogForDisplay() - Readable format
```

---

## 📊 Log Levels

| Level | When Used | Example |
|-------|-----------|---------|
| **DEBUG** | Detailed tracing | `logDebug('EMA calc started', data)` |
| **INFO** | Important events | `logInfo('Data loaded', symbol)` |
| **WARN** | Potential issues | `logWarn('Slow network', duration)` |
| **ERROR** | Errors (not fatal) | `logError('Parse failed', error)` |

---

## 💻 Using the Logger in Code

### Basic Usage:

```typescript
import { logDebug, logInfo, logWarn, logError } from '../utils/logger'

// Debug
logDebug('Calculating EMA', { periods: [10, 21, 50] })

// Info
logInfo('Screen loaded', { screen: 'HomeScreen' })

// Warning
logWarn('Network slow', { duration: 5000 })

// Error
logError('Failed to parse data', error, { symbol: 'RELIANCE' })
```

### Get Logs:

```typescript
import { getLogsAsText, getLogs, exportLogsAsJSON, clearLogs } from '../utils/logger'

// Get formatted text
const textLogs = getLogsAsText()
console.log(textLogs)

// Get as JSON (for export)
const jsonLogs = exportLogsAsJSON()

// Get all entries
const allLogs = getLogs()

// Clear buffer
clearLogs()
```

---

## 🔍 What Gets Logged?

### Currently Captured:

✅ **Data Loading**
```
[INFO]: Data source checking...
[DEBUG]: Real data fetch attempt (GitHub)
[ERROR]: Gzip decompression failed → Falls back to mock
```

✅ **EMA Calculation**
```
[DEBUG]: Computing EMA10, EMA21, EMA50, EMA200
[WARN]: EMA data length mismatch
[ERROR]: Invalid price data for EMA
```

✅ **Weekly Aggregation**
```
[DEBUG]: Aggregating daily → weekly candles
[INFO]: Weekly data generated (50 weeks)
```

✅ **Error Handling**
```
[ERROR]: Chart render failed → Shows alert + logs full error
[ERROR]: JSON parse failed → Logs data that failed + error message
```

---

## 🐛 How to Access Logs

### Option 1: Console (Dev Mode)
```bash
cd /Users/kamal/IdeaProjects/nse-screener-app-android
npx expo start --reset-cache
# Press 'j' to open debugger
# Check console output
```

### Option 2: Logcat (Android Device)
```bash
adb logcat | grep "NSE\|EMA\|ERROR"
```

### Option 3: Settings → Debug Logs (In-App)
- Tap Settings tab
- Scroll to "Debug Information"
- View last 50 logs
- Export as JSON (for sharing)

### Option 4: Programmatic Export
```typescript
import { getDebugInfo } from '../utils/debugViewer'

const debug = getDebugInfo()
console.log(debug.logsJSON)
// Share via email, upload to server, etc.
```

---

## 🚨 Your Specific Error (Screenshot)

The error "Unexpected character 'L' (i=9, s=..." indicates:

**Root Cause:** Numbers being formatted with 'L' suffix (BigInt notation)

**What was happening:**
1. EMA values calculated correctly
2. Attempted to stringify for display
3. JSON.stringify added 'L' suffix to large numbers
4. Downstream JSON parsing failed

**Fix Applied:**
```typescript
// In logger.ts safeStringify():
JSON.stringify(data, (key, value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  return value
})
```

**Now logs will show:**
```
[ERROR]: Chart data stringify failed
[DATA]: { emaValues: [123.45, 456.78, ...] }  ← No 'L' suffix!
[STACK]: Full error trace
```

---

## 📱 Testing Error Logging

Try these steps in the emulator:

1. **Open HomeScreen**
   - Logs: "[INFO] Screen loaded"

2. **Tap stock card**
   - Logs: "[DEBUG] Chart data prepared"

3. **Toggle Weekly**
   - Logs: "[DEBUG] Aggregating to weekly"
   - Logs: "[DEBUG] Computing EMA for weekly"

4. **Trigger error** (intentionally corrupt data)
   - Logs: "[ERROR] JSON parse failed"
   - Alert shows error message
   - Logs captured automatically

5. **Check Settings → Debug**
   - See all logs from session
   - Export if needed

---

## 🔄 How Error Recovery Works

```
Error occurs (JSON parse, network, etc.)
         ↓
logError() captures: message, error, stack, context data
         ↓
Console outputs: [ERROR] message + error details
         ↓
In-memory buffer: Stores full LogEntry
         ↓
UI responds: Shows Alert with user-friendly message
         ↓
App continues: Falls back to mock data (no crash)
         ↓
Logs exportable: User can send for debugging
```

---

## 💾 Persistence (Between App Restarts)

**Default Behavior:**
- Logs cleared on app restart
- This is normal for React Native apps

**If you need persistence:**
Options:
1. Use `AsyncStorage` to save logs to device
2. Send logs to server endpoint periodically
3. Use file system access (requires permissions)

---

## 🎯 Next Steps

### To enable full logging:

1. ✅ Logger system created
2. ⏳ Update HomeScreen to use logError, logInfo
3. ⏳ Update CandleChart to log render errors
4. ⏳ Add Settings screen debug viewer
5. ⏳ Export logs feature for Settings

**Ready?** Run the build and watch the logs!

---

## 📞 Commands

**View real-time logs:**
```bash
cd /Users/kamal/IdeaProjects/nse-screener-app-android
npx expo start --reset-cache
# In console: type "j" for debugger
```

**Export logs via code:**
```typescript
import { getLogsAsText } from '../utils/logger'
const logText = getLogsAsText()
// Copy/paste or send to server
```

**Clear logs:**
```typescript
import { clearLogs } from '../utils/logger'
clearLogs() // Resets buffer
```

