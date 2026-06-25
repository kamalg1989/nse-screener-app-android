import React from 'react'
import { View, Dimensions, Text as RNText } from 'react-native'
import Svg, { Line, Rect, Path, G, Text as SvgText } from 'react-native-svg'
import { OHLC } from '../screener/screener'

interface CandleChartProps {
  data: OHLC[]
  width?: number
  height?: number
  timeframe?: 'daily' | 'weekly'
  ema10?: number[]
  ema21?: number[]
  ema50?: number[]
  ema200?: number[]
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

  // Slice data based on timeframe
  // Daily: last 90 candles, Weekly: all candles (already ~90 weeks)
  const displayData = timeframe === 'daily' 
    ? data.slice(Math.max(0, data.length - 90))
    : data

  // Get price range (exclude volume)
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

  // Date labels (X-axis) - show every Nth candle
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

  // Find forward period index
  const forwardStartIndex = forwardStartDate 
    ? displayData.findIndex((c) => c.date > forwardStartDate) 
    : -1

  // Render candles with volume
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
        {/* Volume bar */}
        <Rect
          x={x - candleWidth / 2}
          y={padding.top + chartHeight * 0.75}
          width={candleWidth}
          height={volY - (padding.top + chartHeight * 0.75)}
          fill={volumeColor}
        />
        {/* Wick */}
        <Line x1={x} y1={h} x2={x} y2={l} stroke={candleColor} strokeWidth="0.8" />
        {/* Body */}
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

  // EMA paths
  const emaLines = [
    { data: ema10, color: '#10B981', name: 'EMA10' },
    { data: ema21, color: '#EF4444', name: 'EMA21' },
    { data: ema50, color: '#3B82F6', name: 'EMA50' },
    { data: ema200, color: '#A855F7', name: 'EMA200' },
  ]

  const emaPath = (emaData?: number[]) => {
    if (!emaData || emaData.length === 0) return ''
    const start = emaData.length - displayData.length
    return emaData
      .slice(start)
      .map((price, idx) => {
        const x = scaleX(idx)
        const y = scaleY(price)
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  return (
    <View style={{ width, height, backgroundColor: '#1F2937', borderRadius: 8 }}>
      <Svg width={width} height={height}>
        {/* Background grid */}
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

        {/* Price labels (Y-axis) */}
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

        {/* Date labels (X-axis) */}
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

        {/* Candles & Volume */}
        {candles}

        {/* EMAs */}
        {emaLines.map(
          (line) =>
            line.data && (
              <Path
                key={line.name}
                d={emaPath(line.data)}
                stroke={line.color}
                strokeWidth="1.5"
                fill="none"
                opacity="0.8"
              />
            )
        )}
      </Svg>
    </View>
  )
}
