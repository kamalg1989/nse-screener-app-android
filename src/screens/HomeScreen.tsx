import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native'
import { useSettings } from '../context/SettingsContext'
import { fetchAllStockData, DEFAULT_SYMBOLS } from '../utils/realDataFetcher'

import { CandleChartInteractive as CandleChart } from '../components/CandleChartInteractive'
import { runScreener } from '../screener/screener'
import { calculateMultipleEMAs } from '../utils/emaCalculator'
import { aggregateToWeekly } from '../utils/weeklyAggregator'
import { OHLC } from '../screener/screener'
import { logDebug, logError, logInfo } from '../utils/logger'

interface Opportunity {
  symbol: string
  entry: number
  sl: number
  target: number
  rr: number
}

export function HomeScreen() {
  const { settings } = useSettings()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'real' | 'mock'>('mock')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(false)
  const [chartData, setChartData] = useState<any>(null)
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly'>('daily')
  const [allData, setAllData] = useState<Record<string, any>>({})
  const [emaCalculations, setEmaCalculations] = useState<Record<string, any>>({})
  const [weeklyData, setWeeklyData] = useState<Record<string, OHLC[]>>({})

  useEffect(() => {
    loadScreener()
  }, [settings])

  const loadScreener = async () => {
    setLoading(true)
    try {
      logInfo('Screener: Loading data', { source: 'Home' })
      
      // Fetch real data, fallback to mock
      const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
      const hasRealData = Object.keys(realData).length > 0
      const dataToUse = realData
      
      setDataSource(hasRealData ? 'real' : 'mock')
      setAllData(dataToUse)
      logInfo('Data loaded', { hasRealData, symbols: Object.keys(dataToUse).length })

      // Calculate EMAs and weekly data for all symbols
      const emaCalcs: Record<string, any> = {}
      const weeklyDatas: Record<string, OHLC[]> = {}
      
      Object.entries(dataToUse).forEach(([symbol, dailyCandles]) => {
        emaCalcs[symbol] = calculateMultipleEMAs(dailyCandles as OHLC[])
        weeklyDatas[symbol] = aggregateToWeekly(dailyCandles as OHLC[])
      })
      
      setEmaCalculations(emaCalcs)
      setWeeklyData(weeklyDatas)
      logDebug('EMA and weekly data calculated', { symbols: Object.keys(emaCalcs).length })

      // Run actual screener
      const results = await runScreener(dataToUse, {
        minLiquidity: settings.minLiquidity,
        emaFast: settings.emaFast,
        emaMid: settings.emaMid,
        emaSlow: settings.emaSlow,
        minRiskRewardRatio: settings.minRiskRewardRatio,
      })

      // Convert to opportunities format
      const opps: Opportunity[] = results
        .map(r => ({
          symbol: r.symbol,
          entry: r.entryPrice || 0,
          sl: r.stopLoss || 0,
          target: r.target || 0,
          rr: r.riskRewardRatio || 0,
        }))
        .slice(0, 5)

      setOpportunities(opps)
      logInfo('Screener complete', { opportunities: opps.length })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logError('Screener failed', error as Error, { dataSource })
      
      setDataSource('mock')
      
      setOpportunities([])
      
      Alert.alert(
        '⚠️ Screener Error',
        `${errorMsg}`,
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleStockPress = (symbol: string) => {
    const data = allData[symbol] || []
    if (Array.isArray(data) && data.length > 0) {
      setSelectedSymbol(symbol)
      setChartData(data)
      setChartTimeframe('daily')
      setShowChart(true)
    }
  }

  const getChartDataForTimeframe = () => {
    if (!selectedSymbol) return []
    
    if (chartTimeframe === 'daily') {
      return chartData || []
    } else {
      return weeklyData[selectedSymbol] || []
    }
  }

  const getEMAForTimeframe = (emaKey: string) => {
    if (!selectedSymbol) return undefined
    
    if (chartTimeframe === 'daily') {
      return emaCalculations[selectedSymbol]?.[emaKey]
    } else {
      // Calculate EMAs for weekly data
      const weeklyChartData = weeklyData[selectedSymbol] || []
      const weeklyEmaCals = calculateMultipleEMAs(weeklyChartData)
      return weeklyEmaCals[emaKey]
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏠 Daily Screener</Text>
        <Text style={styles.badge}>{dataSource === 'real' ? '📊 Real Data' : '🤖 Mock Data'}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Running screener...</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadScreener}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>

          <Text style={styles.count}>{opportunities.length} Opportunities Found</Text>

          {opportunities.length > 0 ? (
            <FlatList
              data={opportunities}
              keyExtractor={(item) => item.symbol}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => handleStockPress(item.symbol)}
                >
                  <View style={styles.cardRow}>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.rr}>R:R {item.rr.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.price}>Entry: ₹{item.entry.toFixed(0)} | SL: ₹{item.sl.toFixed(0)}</Text>
                  <Text style={styles.price}>Target: ₹{item.target.toFixed(0)}</Text>
                  <Text style={styles.hint}>Tap to view chart →</Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No opportunities found</Text>
            </View>
          )}
        </>
      )}

      <Modal visible={showChart} animationType="slide" onRequestClose={() => setShowChart(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedSymbol} - Chart</Text>
            <TouchableOpacity onPress={() => setShowChart(false)}>
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
            {chartData && chartData.length > 0 && (
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

            <View style={styles.details}>
              <Text style={styles.detailsTitle}>Entry Setup</Text>
              {opportunities.find(o => o.symbol === selectedSymbol) && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entry:</Text>
                    <Text style={styles.detailValue}>
                      ₹{opportunities.find(o => o.symbol === selectedSymbol)?.entry.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stop Loss:</Text>
                    <Text style={styles.detailValue}>
                      ₹{opportunities.find(o => o.symbol === selectedSymbol)?.sl.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Target:</Text>
                    <Text style={styles.detailValue}>
                      ₹{opportunities.find(o => o.symbol === selectedSymbol)?.target.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Risk/Reward:</Text>
                    <Text style={styles.detailValue}>
                      {opportunities.find(o => o.symbol === selectedSymbol)?.rr.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  badge: { fontSize: 11, color: '#666', marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 12, color: '#666', marginTop: 12 },
  refreshBtn: { margin: 12, padding: 10, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center' },
  refreshText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  count: { marginLeft: 16, fontSize: 12, fontWeight: 'bold', color: '#333', marginVertical: 8 },
  card: { marginHorizontal: 12, marginVertical: 6, padding: 12, backgroundColor: '#FFF', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#007AFF' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  symbol: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  rr: { fontSize: 11, fontWeight: 'bold', color: '#FF6B6B' },
  price: { fontSize: 10, color: '#666', marginVertical: 2 },
  hint: { fontSize: 9, color: '#007AFF', marginTop: 6 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#999' },
  modal: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  closeBtn: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', padding: 8 },
  timeframeToggle: { flexDirection: 'row', marginHorizontal: 12, marginVertical: 12, backgroundColor: '#F0F0F0', borderRadius: 8, padding: 4 },
  timeframeBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 6 },
  timeframeActive: { backgroundColor: '#007AFF' },
  timeframeBtnText: { fontSize: 11, fontWeight: '600', color: '#666' },
  timeframeActiveText: { color: '#FFF' },
  modalContent: { flex: 1, padding: 12 },
  chartContainer: { backgroundColor: '#FFF', borderRadius: 8, marginBottom: 12, padding: 8, alignItems: 'center' },
  legend: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 8, marginBottom: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  legendColor: { width: 12, height: 12, borderRadius: 2, marginRight: 8 },
  legendText: { fontSize: 10, color: '#333' },
  details: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 8, marginBottom: 20 },
  detailsTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  detailLabel: { fontSize: 11, color: '#666' },
  detailValue: { fontSize: 11, fontWeight: 'bold', color: '#333' },
})
