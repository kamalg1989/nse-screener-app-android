import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, FlatList } from 'react-native'
import { useSettings } from '../context/SettingsContext'
import { fetchAllStockData, DEFAULT_SYMBOLS } from '../utils/realDataFetcher'
import { MOCK_DATA } from '../utils/mockData'
import { CandleChart } from '../components/CandleChart'
import { runScreener } from '../screener/screener'

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
  const [allData, setAllData] = useState<Record<string, any>>({})

  useEffect(() => {
    loadScreener()
  }, [settings])

  const loadScreener = async () => {
    setLoading(true)
    try {
      // Fetch real data, fallback to mock
      const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
      const hasRealData = Object.keys(realData).length > 0
      const dataToUse = hasRealData ? realData : MOCK_DATA
      setDataSource(hasRealData ? 'real' : 'mock')
      setAllData(dataToUse)

      // Run actual screener
      const results = await runScreener(dataToUse, {
        minLiquidity: settings.minLiquidity,
        emaFast: settings.emaFast,
        emaMid: settings.emaMid,
        emaSlow: settings.emaSlow,
        minRiskRewardRatio: settings.minRiskRewardRatio,
      })

      // Convert to opportunities format
      const opps: Opportunity[] = results.map(r => ({
        symbol: r.symbol,
        entry: r.entryPrice || 0,
        sl: r.stopLoss || 0,
        target: r.target || 0,
        rr: r.riskRewardRatio || 0,
      })).slice(0, 5)

      setOpportunities(opps)
    } catch (error) {
      console.log('Error:', error)
      setDataSource('mock')
      setAllData(MOCK_DATA)
      setOpportunities([])
    } finally {
      setLoading(false)
    }
  }

  const handleStockPress = (symbol: string) => {
    const data = allData[symbol] || []
    if (Array.isArray(data) && data.length > 0) {
      setSelectedSymbol(symbol)
      setChartData(data)
      setShowChart(true)
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
            <Text style={styles.modalTitle}>{selectedSymbol} - Daily Chart</Text>
            <TouchableOpacity onPress={() => setShowChart(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {chartData && chartData.length > 0 && (
              <View style={styles.chartContainer}>
                <CandleChart
                  data={chartData}
                  width={360}
                  height={300}
                  timeframe="daily"
                />
              </View>
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
  modalContent: { flex: 1, padding: 12 },
  chartContainer: { backgroundColor: '#FFF', borderRadius: 8, marginBottom: 12, padding: 8, alignItems: 'center' },
  details: { backgroundColor: '#F8F9FF', padding: 12, borderRadius: 8, marginBottom: 20 },
  detailsTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  detailLabel: { fontSize: 11, color: '#666' },
  detailValue: { fontSize: 11, fontWeight: 'bold', color: '#333' },
})
