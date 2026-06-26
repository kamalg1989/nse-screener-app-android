import React from 'react'
import { View, Dimensions } from 'react-native'
import Svg, { Line, Rect, Path, G, Text as SvgText } from 'react-native-svg'
import { OHLC } from '../screener/screener'

interface CandleChartProps {
  data: OHLC[]
  width?: number
  height?: number
  timeframe?: 'daily' | 'weekly'
  ema10?: (number | undefined)[]
  ema21?: (number | undefined)[]
  ema50?: (number | undefined)[]
  ema200?: (number | undefined)[]
  forwardStartDate?: string
}

export function CandleChart({
  data,
  width = Dimensions.get('window').width - 32,
  height = 400,
  timeframe = 'daily',
  ema10,
  ema21,
  ema50,
  ema200,
  forwardStartDate,
}: CandleChartProps) {
  if (data.length === 0) return null

  // Track the starting index of displayed data in the full array
  const displayCount = timeframe === 'daily' ? 90 : data.length
  const startIndex = Math.max(0, data.length - displayCount)
  const displayData = data.slice(startIndex)

  // Get price range
  const prices = displayData.flatMap((d) => [d.high, d.low])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  // Get volume range
  const volumes = displayData.map((d) => d.volume)
  const maxVolume = Math.max(...volumes)

  const padding = { left: 50, right: 20, top: 20, bottom: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const candleWidth = Math.max(chartWidth / displayData.length - 1, 1.5)

  // Scale functions
  const scaleX = (index: number) =>
    padding.left + (index / Math.max(displayData.length - 1, 1)) * chartWidth
  const scaleY = (price: number) =>
    padding.top + ((maxPrice - price) / priceRange) * (chartHeight * 0.75)
  const scaleVolume = (volume: number) =>
    padding.top +
    chartHeight * 0.75 +
    (volume / maxVolume) * (chartHeight * 0.25)

  // Price labels (Y-axis)
  const priceLabels = []
  for (let i = 0; i <= 4; i++) {
    const price = minPrice + (priceRange * i) / 4
    priceLabels.push({
      price: price.toFixed(0),
      y: padding.top + (chartHeight * 0.75 * (4 - i)) / 4,
    })
  }

  // Date labels (X-axis)
  const labelInterval = Math.ceil(displayData.length / 6)
  const dateLabels = []
  for (let i = 0; i < displayData.length; i += labelInterval) {
    const dateStr = displayData[i].date
    const date = new Date(dateStr)
    const label = `${date.getDate()}/${String(date.getMonth() + 1).padStart(2, '0')}`
    dateLabels.push({
      label,
      x: scaleX(i),
    })
  }

  // Render candles
  const candles = displayData.map((candle, idx) => {
    const x = scaleX(idx)
    const o = scaleY(candle.open)
    const h = scaleY(candle.high)
    const l = scaleY(candle.low)
    const c = scaleY(candle.close)
    const volY = scaleVolume(candle.volume)

    const isUp = candle.close >= candle.open
    const candleColor = isUp ? '#10B981' : '#EF4444'
    const volumeColor = isUp ? '#10B98140' : '#EF444440'
    const bodyTop = Math.min(o, c)
    const bodyHeight = Math.abs(c - o) || 1

    return (
      <G key={`candle-${idx}`}>
        <Rect
          x={x - candleWidth / 2}
          y={padding.top + chartHeight * 0.75}
          width={candleWidth}
          height={volY - (padding.top + chartHeight * 0.75)}
          fill={volumeColor}
        />
        <Line x1={x} y1={h} x2={x} y2={l} stroke={candleColor} strokeWidth="0.8" />
        <Rect
          x={x - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={candleColor}
        />
      </G>
    )
  })

  // EMA path builder - handles undefined values AND offset
  const emaPath = (emaData?: (number | undefined)[]) => {
    if (!emaData || emaData.length === 0) return ''
    
    const validPoints: { x: number; y: number }[] = []
    
    // Iterate through the DISPLAY data indices
    for (let displayIdx = 0; displayIdx < displayData.length; displayIdx++) {
      // Convert display index to full data index
      const fullIdx = startIndex + displayIdx
      
      // Get price from full EMA array using full index
      const price = emaData[fullIdx]
      if (typeof price === 'number' && Number.isFinite(price)) {
        const x = scaleX(displayIdx)
        const y = scaleY(price)
        validPoints.push({ x, y })
      }
    }
    
    if (validPoints.length === 0) return ''
    
    return validPoints
      .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
  }

  const emaLines = [
    { data: ema10, color: '#10B981', name: 'EMA10' },
    { data: ema21, color: '#EF4444', name: 'EMA21' },
    { data: ema50, color: '#3B82F6', name: 'EMA50' },
    { data: ema200, color: '#A855F7', name: 'EMA200' },
  ]

  return (
    <View style={{ width, height, backgroundColor: '#1F2937', borderRadius: 8 }}>
      <Svg width={width} height={height}>
        {/* Grid */}
        {priceLabels.map((label, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="#404040"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}

        {/* Axes */}
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#6B7280"
          strokeWidth="1"
        />
        <Line
          x1={padding.left}
          y1={padding.top + chartHeight * 0.75}
          x2={width - padding.right}
          y2={padding.top + chartHeight * 0.75}
          stroke="#6B7280"
          strokeWidth="1"
        />
        <Line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="#6B7280"
          strokeWidth="1"
        />

        {/* Price labels */}
        {priceLabels.map((label, i) => (
          <SvgText
            key={`price-${i}`}
            x={padding.left - 10}
            y={label.y + 4}
            fontSize="10"
            fill="#9CA3AF"
            textAnchor="end"
          >
            {label.price}
          </SvgText>
        ))}

        {/* Date labels */}
        {dateLabels.map((label, i) => (
          <SvgText
            key={`date-${i}`}
            x={label.x}
            y={padding.top + chartHeight + 15}
            fontSize="9"
            fill="#9CA3AF"
            textAnchor="middle"
          >
            {label.label}
          </SvgText>
        ))}

        {/* Candles */}
        {candles}

        {/* EMAs - properly aligned with display data */}
        {emaLines.map(
          (line) => {
            const pathStr = emaPath(line.data)
            return pathStr ? (
              <Path
                key={line.name}
                d={pathStr}
                stroke={line.color}
                strokeWidth="1.5"
                fill="none"
                opacity="0.8"
              />
            ) : null
          }
        )}
      </Svg>
    </View>
  )
}
