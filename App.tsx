import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SettingsProvider } from './src/context/SettingsContext'
import { HomeScreen } from './src/screens/HomeScreen'
import { BacktestScreen } from './src/screens/BacktestScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'

type TabType = 'home' | 'backtest' | 'results' | 'settings'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('home')

  return (
    <View style={styles.container}>
      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'backtest' && <BacktestScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
        {activeTab === 'results' && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📈 Results Tab</Text>
            <Text style={styles.placeholderSubtext}>Coming Soon...</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabBarItem label="Home" icon="🏠" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <TabBarItem label="Backtest" icon="📊" active={activeTab === 'backtest'} onPress={() => setActiveTab('backtest')} />
        <TabBarItem label="Results" icon="📈" active={activeTab === 'results'} onPress={() => setActiveTab('results')} />
        <TabBarItem label="Settings" icon="⚙️" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>
    </View>
  )
}

function TabBarItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  placeholderText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  placeholderSubtext: { fontSize: 12, color: '#999' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFF',
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  activeTab: { borderTopColor: '#007AFF', backgroundColor: '#F8F9FF' },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 9, color: '#999', fontWeight: '600' },
  activeTabLabel: { color: '#007AFF' },
})
