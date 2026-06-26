import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Modal } from 'react-native'
import Slider from '@react-native-community/slider'
import { useSettings } from '../context/SettingsContext'
import { fetchAllStockData, DEFAULT_SYMBOLS } from '../utils/realDataFetcher'
import { MOCK_DATA } from '../utils/mockData'
import { runBacktest } from '../utils/backtestEngine'
import { CandleChartInteractive as CandleChart } from '../components/CandleChartInteractive'
import { calculateMultipleEMAs } from '../utils/emaCalculator'
import { aggregateToWeekly } from '../utils/weeklyAggregator'
import { OHLC } from '../screener/screener'

export function BacktestScreen() {
  const { settings } = useSettings()
  const [backTestDate, setBackTestDate] = useState('2026-01-15')
  const [runWeeks, setRunWeeks] = useState(4)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [allData, setAllData] = useState<Record<string, any>>({})
  const [emaCalculations, setEmaCalculations] = useState<Record<string, any>>({})
  const [weeklyData, setWeeklyData] = useState<Record<string, OHLC[]>>({})
  const [showForwardChart, setShowForwardChart] = useState(false)
  const [selectedForwardStock, setSelectedForwardStock] = useState<string | null>(null)
  const [forwardChartData, setForwardChartData] = useState<any>(null)
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly'>('daily')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
      const dataToUse = Object.keys(realData).length > 0 ? realData : MOCK_DATA
      setAllData(dataToUse)

      // Calculate EMAs and weekly data for all symbols
      const emaCalcs: Record<string, any> = {}
      const weeklyDatas: Record<string, OHLC[]> = {}
      
      Object.entries(dataToUse).forEach(([symbol, dailyCandles]) => {
        emaCalcs[symbol] = calculateMultipleEMAs(dailyCandles as OHLC[])
        weeklyDatas[symbol] = aggregateToWeekly(dailyCandles as OHLC[])
      })
      
      setEmaCalculations(emaCalcs)
      setWeeklyData(weeklyDatas)
    } catch (error) {
      console.log('Error loading data:', error)
      setAllData(MOCK_DATA)
    }
  }

  const handleRunBacktest = async () => {
    if (Object.keys(allData).length === 0) {
      await loadData()
      return
    }

    setLoading(true)
    try {
      const backtest = runBacktest(
        allData,
        settings.riskPerTrade / 10000,
        settings.minRiskRewardRatio,
        backTestDate,
        Math.round(runWeeks)
      )
      setResults(backtest)
    } catch (error) {
      console.log('Error running backtest:', error)
      alert('Error running backtest. Check date format (YYYY-MM-DD)')
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
    
    if (chartTimeframe === 'daily') {
      return emaCalculations[selectedForwardStock]?.[emaKey]
    } else {
      // Calculate EMAs for weekly data
      const weeklyChartData = weeklyData[selectedForwardStock] || []
      const weeklyEmaCals = calculateMultipleEMAs(weeklyChartData)
      return weeklyEmaCals[emaKey]
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Backtest</Text>
        <Text style={styles.subtitle}>Historical Analysis & Forward Period Testing</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Backtest Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={backTestDate}
          onChangeText={setBackTestDate}
          placeholder="2026-01-15"
        />

        <Text style={styles.label}>Forward Period: {Math.round(runWeeks)} weeks</Text>
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
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRunBacktest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>🚀 Run Backtest</Text>
          )}
        </TouchableOpacity>
      </View>

      {results && (
        <>
          <View style={styles.resultsSection}>
            <Text style={styles.resultTitle}>📈 Backtest Results</Text>
            <Text style={styles.resultSubtitle}>Date: {results.backtestDate} | Forward: {results.forwardWeeks} weeks</Text>

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

          {/* Timeframe Toggle */}
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
                    forwardStartDate={backTestDate}
                  />
                </View>

                {/* EMA Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>EMA 10 (Green)</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendText}>EMA 21 (Red)</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.legendText}>EMA 50 (Blue)</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendColor, { backgroundColor: '#A855F7' }]} />
                    <Text style={styles.legendText}>EMA 200 (Purple)</Text>
                  </View>
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
  label: { fontSize: 11, fontWeight: 'bold', color: '#333', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 8, marginTop: 6, fontSize: 12 },
  slider: { width: '100%', height: 40, marginVertical: 8 },
  button: { marginTop: 12, padding: 12, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
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
