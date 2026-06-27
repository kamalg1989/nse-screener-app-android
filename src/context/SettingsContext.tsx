import React, { createContext, useContext, useState } from 'react'

export interface Settings {
  // EMA/ATR
  emaFast: number
  emaMid: number
  emaSlow: number
  minLiquidity: number
  riskPerTrade: number
  minRiskRewardRatio: number
  atrMultiplier: number
  topStocksCount: number
  
  // PHASE 1: Entry Technique Detection
  enableHHHL: boolean
  enableInsideBar: boolean
  enablePinBar: boolean
  enableTrendBar: boolean
  enablePullback: boolean
  enableBreakout: boolean
  
  // Phase 1: Entry Technique Thresholds
  trendBarCloseThreshold: number
  pinBarMaxBodyPct: number
  pinBarMinWickPct: number
  minBarRangePct: number
  entryTickOffset: number
  
  // PHASE 1: Technical Filter
  enableEMA50Check: boolean
  enableSMA200Check: boolean
  trendMode: 'strict' | 'medium' | 'loose' | 'very_loose' | 'off'
  maxBaseRange: number
  volMultiplier: number
  baseRangeCheckBars: number

  // PHASE 2: Base Quality
  enableBaseQuality: boolean
  minPriorUpmove: number // 15% default
  maxGiveback: number // 30% default
  maxVolumeDryup: number // 1.3 default
  maxDistanceFromHigh: number // 5% default

  // PHASE 2: IFP (Institutional Footprint)
  enableIFP: boolean
  ifpLookback: number // 30 days default
  ifpMinScore: number // 0.25 default (0-1)
  ifpVolSurgeMultiple: number // 1.5x default
}

interface SettingsContextType {
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  // EMA/ATR
  emaFast: 9,
  emaMid: 21,
  emaSlow: 50,
  minLiquidity: 10,
  riskPerTrade: 100,
  minRiskRewardRatio: 1.5,
  atrMultiplier: 2.0,
  topStocksCount: 5,
  
  // PHASE 1: Entry Technique Detection
  enableHHHL: false,
  enableInsideBar: false,
  enablePinBar: false,
  enableTrendBar: false,
  enablePullback: false,
  enableBreakout: false,
  
  // Phase 1: Entry Technique Thresholds
  trendBarCloseThreshold: 0.70,
  pinBarMaxBodyPct: 0.35,
  pinBarMinWickPct: 0.55,
  minBarRangePct: 0.005,
  entryTickOffset: 1,
  
  // PHASE 1: Technical Filter
  enableEMA50Check: false,
  enableSMA200Check: false,
  trendMode: 'off' as const,
  maxBaseRange: 0.20,
  volMultiplier: 0.80,
  baseRangeCheckBars: 20,

  // PHASE 2: Base Quality
  enableBaseQuality: false,
  minPriorUpmove: 15,
  maxGiveback: 30,
  maxVolumeDryup: 1.3,
  maxDistanceFromHigh: 5,

  // PHASE 2: IFP
  enableIFP: false,
  ifpLookback: 30,
  ifpMinScore: 0.25,
  ifpVolSurgeMultiple: 1.5,
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
