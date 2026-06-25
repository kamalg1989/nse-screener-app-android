import React, { createContext, useContext, useState } from 'react'

export interface Settings {
  emaFast: number
  emaMid: number
  emaSlow: number
  minLiquidity: number
  riskPerTrade: number
  minRiskRewardRatio: number
  atrMultiplier: number
  topStocksCount: number
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  emaFast: 9,
  emaMid: 21,
  emaSlow: 50,
  minLiquidity: 10,
  riskPerTrade: 100,
  minRiskRewardRatio: 1.5,
  atrMultiplier: 2.0,
  topStocksCount: 5,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
