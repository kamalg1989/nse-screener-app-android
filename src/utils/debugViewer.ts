/**
 * Debug viewer for displaying logs in the app
 */

import { getLogsAsText, getLogs, exportLogsAsJSON } from './logger'

export function getDebugInfo() {
  return {
    timestamp: new Date().toISOString(),
    platform: 'react-native',
    appVersion: '1.0.0',
    totalLogs: getLogs().length,
    logsText: getLogsAsText(),
    logsJSON: exportLogsAsJSON(),
  }
}

export function getRecentErrors() {
  return getLogs()
    .filter(log => log.level === 'ERROR')
    .slice(-10)
}

export function getRecentWarnings() {
  return getLogs()
    .filter(log => log.level === 'WARN')
    .slice(-10)
}

export function formatLogForDisplay() {
  const logs = getLogs()
  if (logs.length === 0) return '📋 No logs yet'
  
  return logs
    .slice(-50) // Show last 50 logs
    .map(log => `[${log.level}] ${log.message}`)
    .join('\n')
}
