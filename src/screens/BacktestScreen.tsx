import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Platform } from 'react-native'
import Slider from '@react-native-community/slider'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSettings } from '../context/SettingsContext'
import { fetchAllStockData, DEFAULT_SYMBOLS } from '../utils/realDataFetcher'

import { runBacktest } from '../utils/backtestEngine'
import { CandleChartInteractive as CandleChart } from '../components/CandleChartInteractive'
import { calculateMultipleEMAs } from '../utils/emaCalculator'
import { aggregateToWeekly } from '../utils/weeklyAggregator'
import { OHLC } from '../screener/screener'

export function BacktestScreen() {
  const { settings } = useSettings()
  const [selectedDate, setSelectedDate] = useState(new Date('2026-04-15'))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateString, setDateString] = useState('2026-04-15')
  const [runWeeks, setRunWeeks] = useState(4)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)  // Don't load initially
  const [results, setResults] = useState<any>(null)
  const [allData, setAllData] = useState<Record<string, any>>({})
  const [emaCalculations, setEmaCalculations] = useState<Record<string, any>>({})
  const [weeklyData, setWeeklyData] = useState<Record<string, OHLC[]>>({})
  const [showForwardChart, setShowForwardChart] = useState(false)
  const [selectedForwardStock, setSelectedForwardStock] = useState<string | null>(null)
  const [forwardChartData, setForwardChartData] = useState<any>(null)
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly'>('daily')
  const [debugLog, setDebugLog] = useState<string>('')

  // DON'T load data on mount - wait for date selection
  // This ensures data always matches the selected date

  // Handle date picker selection - automatically fetch data when date changes
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
    
    if (date) {
      console.log(`[🔄 BacktestScreen] Date changed from picker`)
      setSelectedDate(date)
      // Format date as YYYY-MM-DD
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}`
      console.log(`[📅 BacktestScreen] Selected date: ${formattedDate}`)
      setDateString(formattedDate)
      
      if (Platform.OS === 'ios') {
        setShowDatePicker(false)
      }
      
      // Automatically fetch data and calculate EMAs for the selected date
      addDebugLog(`📅 DATE SELECTED: ${formattedDate}`)
      loadDataForDate(formattedDate, date)
    }
  }

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => `${prev}[${timestamp}] ${message}\n`)
  }

  const loadDataForDate = async (date: string, dateObj: Date) => {
    setDataLoading(true)
    addDebugLog(`⏳ Fetching 9 months of data...`)
    console.log(`[📊 BacktestScreen] loadDataForDate called with: ${date}`)
    
    try {
      // Fetch 9 months of data ending on selected date
      console.log(`[📊 BacktestScreen] Calling fetchAllStockData for 9 months ending ${date}`)
      const realData = await fetchAllStockData(DEFAULT_SYMBOLS, 9, date)
      
      console.log(`[📊 BacktestScreen] Data fetched. Symbols count:`, Object.keys(realData).length)
      addDebugLog(`✓ Data fetched: ${Object.keys(realData).length} symbols`)
      
      const dataToUse = realData
      setAllData(dataToUse)

      // Calculate EMAs and weekly data
      console.log(`[📊 BacktestScreen] Calculating EMAs and weekly aggregation...`)
      const emaCalcs: Record<string, any> = {}
      const weeklyDatas: Record<string, OHLC[]> = {}
      
      Object.entries(dataToUse).forEach(([symbol, dailyCandles]) => {
        emaCalcs[symbol] = calculateMultipleEMAs(dailyCandles as OHLC[])
        weeklyDatas[symbol] = aggregateToWeekly(dailyCandles as OHLC[])
      })
      
      console.log(`[📊 BacktestScreen] EMA calculations complete`)
      setEmaCalculations(emaCalcs)
      setWeeklyData(weeklyDatas)
      setResults(null) // Clear previous results
      
      addDebugLog(`✓ EMAs & weekly data ready`)
      addDebugLog(`📊 Ready for backtest on ${date}`)
    } catch (error) {
      console.log('[❌ BacktestScreen] Error loading data for date:', error)
      addDebugLog(`❌ Error: ${String(error)}`)
    } finally {
      setDataLoading(false)
    }
  }

  const handleRunBacktest = async () => {
    console.log(`[🎯 BacktestScreen] handleRunBacktest called`)
    console.log(`[🎯 BacktestScreen] dateString: ${dateString}`)
    console.log(`[🎯 BacktestScreen] allData symbols: ${Object.keys(allData).length}`)
    console.log(`[🎯 BacktestScreen] runWeeks: ${Math.round(runWeeks)}`)
    
    if (Object.keys(allData).length === 0) {
      console.log(`[⚠️  BacktestScreen] No data loaded, cannot run backtest`)
      addDebugLog(`⚠️ No data loaded. Please select a date first.`)
      alert('Please select a date first to fetch data')
      return
    }

    setLoading(true)
    addDebugLog(`🚀 Running backtest on ${dateString}...`)
    
    try {
      console.log(`[🎯 BacktestScreen] Calling runBacktest with:`, {
        symbols: Object.keys(allData).length,
        date: dateString,
        forwardWeeks: Math.round(runWeeks),
        riskPerTrade: settings.riskPerTrade / 10000,
        minRiskRewardRatio: settings.minRiskRewardRatio
      })
      
      const backtest = runBacktest(
        allData,
        settings.riskPerTrade / 10000,
        settings.minRiskRewardRatio,
        dateString,
        Math.round(runWeeks)
      )
      
      console.log(`[✓ BacktestScreen] Backtest completed:`, {
        totalTrades: backtest.totalTrades,
        winRate: backtest.overallWinRate
      })
      
      setResults(backtest)
      addDebugLog(`✓ Backtest complete! Found ${backtest.totalTrades} trades`)
    } catch (error) {
      console.log('[❌ BacktestScreen] Error running backtest:', error)
      addDebugLog(`❌ Backtest error: ${String(error)}`)
      alert('Error running backtest. Check logs.')
    } finally {
      setLoading(false)
    }
  }

  const handleShowForward = (symbol: string) => {
    setSelectedForwardStock(symbol)
    if (allData[symbol]) {
      setForwardChartData(allData[symbol])
      setChartTimeframe('daily')
      setShowForwardChart(true)
    }
  }

  const getChartDataForTimeframe = () => {
    if (!selectedForwardStock) return []
    
    if (chartTimeframe === 'daily') {
      return forwardChartData || []
    } else {
      return weeklyData[selectedForwardStock] || []
    }
  }

  const getEMAForTimeframe = (emaKey: string) => {
    if (!selectedForwardStock) return undefined
    
    const keyNum = parseInt(emaKey) as any
    
    if (chartTimeframe === 'daily') {
      return emaCalculations[selectedForwardStock]?.[keyNum]
    } else {
      const weeklyChartData = weeklyData[selectedForwardStock] || []
      const weeklyEmaCals = calculateMultipleEMAs(weeklyChartData)
      return weeklyEmaCals[keyNum]
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Backtest</Text>
        <Text style={styles.subtitle}>Select date → 9 months data fetches automatically (parallel)</Text>
      </View>

      <View style={styles.section}>
        {/* Date Picker Button */}
        <Text style={styles.label}>📅 Select Backtest Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>{dateString}</Text>
          <Text style={styles.dateButtonIcon}>📆</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {dataLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#007AFF" size="small" />
            <Text style={styles.loadingText}>Fetching 9 months of data...</Text>
          </View>
        )}

        <Text style={styles.label}>⏱️ Forward Period: {Math.round(runWeeks)} weeks</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={12}
          step={1}
          value={runWeeks}
          onValueChange={setRunWeeks}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#DDD"
        />

        <TouchableOpacity
          style={[styles.button, (loading || dataLoading) && styles.buttonDisabled]}
          onPress={handleRunBacktest}
          disabled={loading || dataLoading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>🚀 Run Backtest</Text>
          )}
        </TouchableOpacity>

        {/* Debug Log Display */}
        {debugLog && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🔍 Debug Log</Text>
            <Text style={styles.debugText}>{debugLog}</Text>
          </View>
        )}
      </View>

      {results && (
        <>
          <View style={styles.resultsSection}>
            <Text style={styles.resultTitle}>📈 Backtest Results</Text>
            <Text style={styles.resultSubtitle}>Date: {dateString} | Forward: {results.forwardWeeks} weeks</Text>

            <View style={styles.statsGrid}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{results.totalTrades || 0}</Text>
                <Text style={styles.statLabel}>Total Trades</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {(results.overallWinRate || 0).toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#007AFF' }]}>
                  {(results.avgReturnPercent || 0).toFixed(2)}%
                </Text>
                <Text style={styles.statLabel}>Avg Return</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
                  ₹{((results.totalPnl || 0)).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Total PnL</Text>
              </View>
            </View>
          </View>

          {results.forwardResults && results.forwardResults.length > 0 && (
            <View style={styles.forwardSection}>
              <Text style={styles.forwardTitle}>📅 Forward Period Results ({results.forwardWeeks} weeks)</Text>
              {results.forwardResults.slice(0, 5).map((fwd: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.forwardCard}
                  onPress={() => handleShowForward(fwd.symbol)}
                >
                  <View style={styles.fwdRow}>
                    <Text style={styles.fwdSymbol}>{fwd.symbol}</Text>
                    <Text style={[styles.fwdValue, { color: (fwd.forwardPnL || 0) >= 0 ? '#10B981' : '#FF6B6B' }]}>
                      {(fwd.forwardPnL || 0) >= 0 ? '+' : ''}₹{(fwd.forwardPnL || 0).toFixed(0)}
                    </Text>
                  </View>
                  <Text style={styles.fwdDetail}>
                    Entry: ₹{(fwd.entryPrice || 0).toFixed(0)} → Exit: ₹{(fwd.exitPrice || 0).toFixed(0)}
                  </Text>
                  <Text style={styles.fwdHint}>Tap to view chart →</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      <Modal visible={showForwardChart} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedForwardStock} - Forward Period</Text>
            <TouchableOpacity onPress={() => setShowForwardChart(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeframeToggle}>
            <TouchableOpacity
              style={[
                styles.timeframeBtn,
                chartTimeframe === 'daily' && styles.timeframeActive,
              ]}
              onPress={() => setChartTimeframe('daily')}
            >
              <Text
                style={[
                  styles.timeframeBtnText,
                  chartTimeframe === 'daily' && styles.timeframeActiveText,
                ]}
              >
                📊 Daily
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeframeBtn,
                chartTimeframe === 'weekly' && styles.timeframeActive,
              ]}
              onPress={() => setChartTimeframe('weekly')}
            >
              <Text
                style={[
                  styles.timeframeBtnText,
                  chartTimeframe === 'weekly' && styles.timeframeActiveText,
                ]}
              >
                📈 Weekly
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {forwardChartData && forwardChartData.length > 0 && (
              <>
                <View style={styles.chartContainer}>
                  <CandleChart
                    data={getChartDataForTimeframe()}
                    width={360}
                    height={300}
                    timeframe={chartTimeframe}
                    ema10={getEMAForTimeframe('10')}
                    ema21={getEMAForTimeframe('21')}
                    ema50={getEMAForTimeframe('50')}
                    ema200={getEMAForTimeframe('200')}
                    forwardStartDate={dateString}
                  />
                </View>

                <View style={styles.legend}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>EMA 10 (Green)</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendText}>EMA 21 (Red)</Text>
                  </View>
                  {chartTimeframe === 'daily' && (
                    <>
                      <View style={styles.legendRow}>
                        <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.legendText}>EMA 50 (Blue)</Text>
                      </View>
                      <View style={styles.legendRow}>
                        <View style={[styles.legendColor, { backgroundColor: '#A855F7' }]} />
                        <Text style={styles.legendText}>EMA 200 (Purple)</Text>
                      </View>
                    </>
                  )}
                  {chartTimeframe === 'weekly' && (
                    <View style={styles.legendRow}>
                      <Text style={[styles.legendText, { color: '#999', fontStyle: 'italic' }]}>⚠️ EMA 50/200 require 50+ candles (not enough weekly data)</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 11, color: '#666', marginTop: 4 },
  section: { margin: 12, padding: 12, backgroundColor: '#FFF', borderRadius: 8 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#333', marginTop: 12 },
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, padding: 12, marginTop: 8, backgroundColor: '#F0F8FF' },
  dateButtonText: { fontSize: 14, fontWeight: 'bold', color: '#007AFF' },
  dateButtonIcon: { fontSize: 18 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 8, backgroundColor: '#F0F8FF', borderRadius: 6 },
  loadingText: { fontSize: 11, color: '#007AFF', marginLeft: 8 },
  slider: { width: '100%', height: 40, marginVertical: 8 },
  button: { marginTop: 12, padding: 12, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  debugContainer: { marginTop: 16, padding: 10, backgroundColor: '#F0F0F0', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#007AFF' },
  debugTitle: { fontSize: 10, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  debugText: { fontSize: 9, color: '#555', fontFamily: 'Courier' },
  resultsSection: { margin: 12, padding: 12, backgroundColor: '#FFF', borderRadius: 8 },
  resultTitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  resultSubtitle: { fontSize: 10, color: '#666', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  stat: { width: '48%', padding: 10, backgroundColor: '#F8F9FF', borderRadius: 6, marginBottom: 8, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 9, color: '#666', marginTop: 4 },
  forwardSection: { margin: 12, paddingHorizontal: 0 },
  forwardTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8, paddingHorizontal: 12 },
  forwardCard: { marginHorizontal: 12, marginVertical: 4, padding: 10, backgroundColor: '#FFF', borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#10B981' },
  fwdRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fwdSymbol: { fontSize: 11, fontWeight: 'bold' },
  fwdValue: { fontSize: 11, fontWeight: 'bold' },
  fwdDetail: { fontSize: 9, color: '#666', marginVertical: 2 },
  fwdHint: { fontSize: 8, color: '#007AFF', marginTop: 4 },
  modal: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 14, fontWeight: 'bold' },
  closeBtn: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  timeframeToggle: { flexDirection: 'row', marginHorizontal: 12, marginVertical: 12, backgroundColor: '#F0F0F0', borderRadius: 8, padding: 4 },
  timeframeBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 6 },
  timeframeActive: { backgroundColor: '#007AFF' },
  timeframeBtnText: { fontSize: 11, fontWeight: '600', color: '#666' },
  timeframeActiveText: { color: '#FFF' },
  modalContent: { flex: 1, padding: 12 },
  chartContainer: { backgroundColor: '#FFF', borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  legend: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 8, marginBottom: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  legendColor: { width: 12, height: 12, borderRadius: 2, marginRight: 8 },
  legendText: { fontSize: 10, color: '#333' },
})
