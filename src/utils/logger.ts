/**
 * Logger utility for capturing errors and debug info
 * Note: React Native cannot write directly to device filesystem without additional permissions
 * This provides console logging structure that can be captured via debugging tools
 */

interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  message: string
  data?: any
  stack?: string
}

// In-memory log buffer (for demo/testing)
let logBuffer: LogEntry[] = []
const MAX_LOGS = 1000

export function logDebug(message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'DEBUG',
    message,
    data: safeStringify(data),
  }
  addLog(entry)
  console.log(`[DEBUG] ${message}`, data)
}

export function logInfo(message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    data: safeStringify(data),
  }
  addLog(entry)
  console.log(`[INFO] ${message}`, data)
}

export function logWarn(message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'WARN',
    message,
    data: safeStringify(data),
  }
  addLog(entry)
  console.warn(`[WARN] ${message}`, data)
}

export function logError(message: string, error?: Error | any, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    data: safeStringify(data),
    stack: error?.stack || String(error),
  }
  addLog(entry)
  console.error(`[ERROR] ${message}`, error, data)
}

function addLog(entry: LogEntry) {
  logBuffer.push(entry)
  
  // Keep buffer size manageable
  if (logBuffer.length > MAX_LOGS) {
    logBuffer = logBuffer.slice(-MAX_LOGS)
  }
}

/**
 * Safely stringify data without breaking on circular refs or BigInt
 */
function safeStringify(data: any): string {
  try {
    if (!data) return ''
    
    // Handle BigInt manually
    const stringified = JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString()
      }
      if (typeof value === 'number') {
        // Ensure numbers don't have 'L' suffix
        return Number.isFinite(value) ? value : null
      }
      return value
    })
    
    return stringified
  } catch (err) {
    return `[Stringify Error: ${String(err)}]`
  }
}

/**
 * Get all logs (for debugging/export)
 */
export function getLogs(): LogEntry[] {
  return [...logBuffer]
}

/**
 * Get logs as formatted string
 */
export function getLogsAsText(): string {
  return logBuffer
    .map(
      (entry) =>
        `[${entry.timestamp}] ${entry.level}: ${entry.message}${
          entry.data ? ` | Data: ${entry.data}` : ''
        }${entry.stack ? ` | Stack: ${entry.stack}` : ''}`
    )
    .join('\n')
}

/**
 * Clear logs
 */
export function clearLogs() {
  logBuffer = []
}

/**
 * Export logs as JSON
 */
export function exportLogsAsJSON(): string {
  return JSON.stringify(logBuffer, null, 2)
}
