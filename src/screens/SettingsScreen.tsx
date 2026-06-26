import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import Slider from '@react-native-community/slider'
import { useSettings } from '../context/SettingsContext'
import { fetchAllStockData, DEFAULT_SYMBOLS } from '../utils/realDataFetcher'

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings()
  const [statsLoading, setStatsLoading] = useState(false)
  const [dataStats, setDataStats] = useState<any>(null)
  const [dataSource, setDataSource] = useState<'real' | 'mock'>('mock')

  useEffect(() => {
    loadDataStats()
  }, [])

  const loadDataStats = async () => {
    setStatsLoading(true)
    try {
      const realData = await fetchAllStockData(DEFAULT_SYMBOLS)
      if (Object.keys(realData).length > 0) {
        setDataSource('real')
        let totalCandles = 0
        let dateStart = ''
        let dateEnd = ''

        for (const [symbol, candles] of Object.entries(realData)) {
          if (Array.isArray(candles) && candles.length > 0) {
            totalCandles += candles.length
            if (!dateStart || candles[0]?.date < dateStart) dateStart = candles[0]?.date || ''
            if (!dateEnd || candles[candles.length - 1]?.date > dateEnd) dateEnd = candles[candles.length - 1]?.date || ''
          }
        }

        setDataStats({
          totalSymbols: Object.keys(realData).length,
          totalCandles,
          dateRangeStart: dateStart,
          dateRangeEnd: dateEnd,
          loadedSymbols: Object.keys(realData),
        })
      } else {
        setDataSource('mock')
      }
    } catch (error) {
      console.log('Error:', error)
      setDataSource('mock')
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Text style={styles.subtitle}>Configure Your Screener</Text>
      </View>

      {/* Data Source */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Data Source</Text>
        <View style={[styles.badge, dataSource === 'real' ? styles.realBadge : styles.mockBadge]}>
          <Text style={styles.badgeText}>
            {dataSource === 'real' ? '📊 Real NSE Data' : '🤖 Mock Data'}
          </Text>
        </View>

        {statsLoading ? (
          <View style={styles.statsBox}>
            <ActivityIndicator color="#007AFF" size="small" />
          </View>
        ) : dataStats ? (
          <View style={styles.statsBox}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Symbols:</Text>
              <Text style={styles.statValue}>{dataStats.totalSymbols}/{DEFAULT_SYMBOLS.length}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Candles:</Text>
              <Text style={styles.statValue}>{dataStats.totalCandles.toLocaleString()}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Date Range:</Text>
              <Text style={styles.statValue}>{dataStats.dateRangeStart}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>to {dataStats.dateRangeEnd}</Text>
            </View>
            {dataStats.loadedSymbols.length > 0 && (
              <View style={styles.symbolsBox}>
                <Text style={styles.symbolsLabel}>✓ Loaded: {dataStats.loadedSymbols.join(', ')}</Text>
              </View>
            )}
          </View>
        ) : null}

        <TouchableOpacity style={styles.refreshBtn} onPress={loadDataStats}>
          <Text style={styles.refreshText}>🔄 Refresh Stats</Text>
        </TouchableOpacity>
      </View>

      {/* EMA Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 EMA Settings</Text>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Fast EMA</Text>
            <Text style={styles.settingValue}>{Math.round(settings.emaFast)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={1}
            value={settings.emaFast}
            onValueChange={(v) => updateSettings({ emaFast: v })}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#DDD"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Mid EMA</Text>
            <Text style={styles.settingValue}>{Math.round(settings.emaMid)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={20}
            maximumValue={100}
            step={1}
            value={settings.emaMid}
            onValueChange={(v) => updateSettings({ emaMid: v })}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#DDD"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Slow EMA</Text>
            <Text style={styles.settingValue}>{Math.round(settings.emaSlow)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={200}
            step={1}
            value={settings.emaSlow}
            onValueChange={(v) => updateSettings({ emaSlow: v })}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#DDD"
          />
        </View>
      </View>

      {/* Risk Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Risk Settings</Text>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Min Liquidity (₹ Cr)</Text>
            <Text style={styles.settingValue}>{Math.round(settings.minLiquidity)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={100}
            step={5}
            value={settings.minLiquidity}
            onValueChange={(v) => updateSettings({ minLiquidity: v })}
            minimumTrackTintColor="#FF6B6B"
            maximumTrackTintColor="#DDD"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Risk per Trade (%)</Text>
            <Text style={styles.settingValue}>{(settings.riskPerTrade / 100).toFixed(2)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={500}
            step={50}
            value={settings.riskPerTrade}
            onValueChange={(v) => updateSettings({ riskPerTrade: v })}
            minimumTrackTintColor="#FF6B6B"
            maximumTrackTintColor="#DDD"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Min Risk/Reward Ratio</Text>
            <Text style={styles.settingValue}>{settings.minRiskRewardRatio.toFixed(1)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={3}
            step={0.1}
            value={settings.minRiskRewardRatio}
            onValueChange={(v) => updateSettings({ minRiskRewardRatio: v })}
            minimumTrackTintColor="#FF6B6B"
            maximumTrackTintColor="#DDD"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>ATR Multiplier</Text>
            <Text style={styles.settingValue}>{settings.atrMultiplier.toFixed(2)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={0.1}
            value={settings.atrMultiplier}
            onValueChange={(v) => updateSettings({ atrMultiplier: v })}
            minimumTrackTintColor="#FF6B6B"
            maximumTrackTintColor="#DDD"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Top Stocks to Show</Text>
            <Text style={styles.settingValue}>{Math.round(settings.topStocksCount)}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={settings.topStocksCount}
            onValueChange={(v) => updateSettings({ topStocksCount: v })}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#DDD"
          />
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>About Real Data</Text>
          <Text style={styles.infoText}>
            Data sourced from GitHub (nse-market-data). 15 years of daily OHLCV candles for 5 major NSE stocks. Updated end-of-day.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  subtitle: { fontSize: 11, color: '#666', marginTop: 4 },
  section: { margin: 12, paddingHorizontal: 0 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 10, paddingHorizontal: 12 },
  badge: { marginHorizontal: 12, padding: 10, borderRadius: 6, marginBottom: 12 },
  realBadge: { backgroundColor: '#E8F5E9' },
  mockBadge: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  statsBox: { marginHorizontal: 12, padding: 10, backgroundColor: '#FFF', borderRadius: 6, marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontSize: 10 },
  statLabel: { fontSize: 10, color: '#666' },
  statValue: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  symbolsBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  symbolsLabel: { fontSize: 9, color: '#666' },
  refreshBtn: { marginHorizontal: 12, padding: 10, backgroundColor: '#007AFF', borderRadius: 6, alignItems: 'center', marginBottom: 12 },
  refreshText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  setting: { marginHorizontal: 12, marginBottom: 10, padding: 10, backgroundColor: '#FFF', borderRadius: 6 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  settingLabel: { fontSize: 11, fontWeight: '600', color: '#333' },
  settingValue: { fontSize: 11, fontWeight: 'bold', color: '#007AFF' },
  slider: { width: '100%', height: 30 },
  infoBox: { marginHorizontal: 12, padding: 10, backgroundColor: '#F8F9FF', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#007AFF', marginBottom: 20 },
  infoTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  infoText: { fontSize: 10, color: '#666', lineHeight: 15 },
})
