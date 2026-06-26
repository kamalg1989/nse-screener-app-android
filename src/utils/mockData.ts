// Mock NSE data for testing (realistic OHLC data)
export interface OHLC {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const MOCK_DATA: Record<string, OHLC[]> = {
  RELIANCE: generateMockData(2150, 'RELIANCE'),
  TCS: generateMockData(3500, 'TCS'),
  HDFCBANK: generateMockData(1680, 'HDFCBANK'),
  ICICIBANK: generateMockData(950, 'ICICIBANK'),
  INFY: generateMockData(1850, 'INFY'),
}

function generateMockData(basePrice: number, symbol: string): OHLC[] {
  const data: OHLC[] = []
  let price = basePrice
  
  // Generate 630 candles backward (90 weeks × 7 days)
  for (let i = 630; i > 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Realistic price movement
    const change = (Math.random() - 0.48) * basePrice * 0.015
    const open = price
    const close = price + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.012)
    const low = Math.min(open, close) * (1 - Math.random() * 0.012)
    
    // High volume for realistic data
    const volume = Math.floor(Math.random() * 10000000) + 2000000
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })
    
    price = close
  }
  
  // Generate 120 candles forward (future data for forward testing)
  for (let i = 1; i <= 120; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    
    // Realistic price movement
    const change = (Math.random() - 0.48) * basePrice * 0.015
    const open = price
    const close = price + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.012)
    const low = Math.min(open, close) * (1 - Math.random() * 0.012)
    
    // High volume for realistic data
    const volume = Math.floor(Math.random() * 10000000) + 2000000
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })
    
    price = close
  }
  
  return data
}
