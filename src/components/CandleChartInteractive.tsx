import React, { useState } from 'react'
import { View, Dimensions, Text, StyleSheet, GestureResponderEvent } from 'react-native'
import Svg, { Line, Rect, Path, G, Text as SvgText, Circle, Defs, ClipPath } from 'react-native-svg'
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

interface TooltipData {
  date: string
  close: number
  volume: number
  x: number
  y: number
}

export function CandleChartInteractive({
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
  const [selectedTooltip, setSelectedTooltip] = useState<TooltipData | null>(null)

  if (data.length === 0) return null

  // Track the starting index of displayed data in the full array
  // Daily: show last 90 candles, Weekly: show ALL aggregated candles (no trim)
  const displayCount = timeframe === 'daily' ? Math.min(90, data.length) : data.length
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
  
  // AUTO-DENSITY SCALING: Adapt to data size
  // Calculate pixels available per candle
  const pixelsPerCandle = chartWidth / displayData.length
  
  // Determine density tier and sizing
  let candleWidth: number
  let gapWidth: number
  let denseLabelInterval: number
  
  if (pixelsPerCandle < 2.5) {
    // DENSE: 90+ candles (daily chart)
    candleWidth = 1.5
    gapWidth = 0.8
    denseLabelInterval = Math.max(1, Math.ceil(displayData.length / 6))  // ~6 labels
  } else if (pixelsPerCandle < 5) {
    // MEDIUM: 30-60 candles
    candleWidth = 3
    gapWidth = 1.2
    denseLabelInterval = Math.max(1, Math.ceil(displayData.length / 8))  // ~8 labels
  } else {
    // SPARSE: < 30 candles (weekly chart)
    candleWidth = 5
    gapWidth = 1.5
    denseLabelInterval = Math.max(1, Math.ceil(displayData.length / 10))  // ~10 labels
  }

  // Scale functions - NO rounding to prevent candle collision
  // Use linear interpolation across available space
  const scaleX = (index: number) => {
    if (displayData.length <= 1) return padding.left + chartWidth / 2
    // Spread candles evenly across available width
    return padding.left + (index / (displayData.length - 1)) * chartWidth
  }
  
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

  // Date labels (X-axis) - auto-density based
  const dateLabels = []
  for (let i = 0; i < displayData.length; i += denseLabelInterval) {
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
    // Fallback: use high price if close is NaN/null
    const closePrice = Number.isFinite(candle.close) ? candle.close : candle.high
    const c = scaleY(closePrice)
    const volY = scaleVolume(candle.volume)

    const isUp = closePrice >= candle.open
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
        <Line x1={x} y1={h} x2={x} y2={l} stroke={candleColor} strokeWidth="0.5" opacity="0.6" />
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

  // EMA path builder
  const emaPath = (emaData?: (number | undefined)[]) => {
    if (!emaData || emaData.length === 0) return ''
    
    const validPoints: { x: number; y: number }[] = []
    
    for (let displayIdx = 0; displayIdx < displayData.length; displayIdx++) {
      const fullIdx = startIndex + displayIdx
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

  // Find end date separator position
  let endDateX: number | null = null
  if (forwardStartDate) {
    const endDateIndex = displayData.findIndex(d => d.date === forwardStartDate)
    if (endDateIndex >= 0) {
      endDateX = scaleX(endDateIndex)
    }
  }

  // Handle tap to show tooltip
  const handleChartPress = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent
    
    // Simple: find closest candle center using scaleX positions
    const relativeX = locationX - padding.left
    if (relativeX < 0 || relativeX > chartWidth) return
    
    // Linear interpolation: which candle index?
    const rawIndex = (relativeX / chartWidth) * (displayData.length - 1)
    const candleIndex = Math.round(rawIndex)
    
    if (candleIndex >= 0 && candleIndex < displayData.length) {
      const candle = displayData[candleIndex]
      const x = scaleX(candleIndex)
      // Fallback: use high price if close is NaN
      const closePrice = Number.isFinite(candle.close) ? candle.close : candle.high
      
      setSelectedTooltip({
        date: candle.date,
        close: closePrice,
        volume: candle.volume,
        x,
        y: scaleY(closePrice),
      })
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ width, height, backgroundColor: '#1F2937', borderRadius: 8 }}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleChartPress}
      >
        <Svg width={width} height={height}>
          {/* Clipping region - prevents candles from rendering outside chart area */}
          <Defs>
            <ClipPath id="chartClip">
              <Rect
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={chartHeight}
              />
            </ClipPath>
          </Defs>

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

          {/* Candles & EMAs - CLIPPED to prevent rendering outside chart area */}
          <G clipPath="url(#chartClip)">
            {/* Candles */}
            {candles}

            {/* EMAs */}
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
          </G>

          {/* Vertical line on selected candle - YELLOW DASHED */}
          {selectedTooltip && (
            <>
              {/* Yellow dashed line */}
              <Line
                x1={selectedTooltip.x}
                y1={padding.top}
                x2={selectedTooltip.x}
                y2={padding.top + chartHeight}
                stroke="#FFEB3B"
                strokeWidth="2"
                strokeDasharray="4,4"
                opacity="0.9"
              />
            </>
          )}

          {/* End date separator - CYAN DASHED (marks backtest vs forward period) */}
          {endDateX !== null && (
            <>
              <Line
                x1={endDateX}
                y1={padding.top}
                x2={endDateX}
                y2={padding.top + chartHeight}
                stroke="#06B6D4"
                strokeWidth="2.5"
                strokeDasharray="5,5"
                opacity="0.7"
              />
              {/* Label for end date */}
              <SvgText
                x={endDateX}
                y={padding.top + 15}
                fontSize="9"
                fill="#06B6D4"
                fontWeight="bold"
                textAnchor="middle"
              >
                📍 {forwardStartDate}
              </SvgText>
            </>
          )}
        </Svg>
      </View>

      {/* Compact Bottom Tooltip Bar - No overlap! */}
      {selectedTooltip && selectedTooltip.close != null && (
        <View style={styles.tooltipBar}>
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipData}>
              📅 {selectedTooltip.date}
            </Text>
            <Text style={styles.tooltipData}>
              💰 ₹{selectedTooltip.close?.toFixed(2) || 'N/A'}
            </Text>
            <Text style={styles.tooltipData}>
              📊 {((selectedTooltip.volume ?? 0) / 1000000).toFixed(2)}M
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  tooltipBar: {
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tooltipContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tooltipData: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
})
