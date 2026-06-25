# NSE Screener - Android App Distribution Package

## About This App

**NSE Screener** is a professional-grade stock screening and backtesting application for the Indian National Stock Exchange (NSE).

### Key Features

✅ **Daily Screener** - Real-time NSE stock screening with technical analysis  
✅ **Backtest Engine** - Historical analysis with forward-period testing  
✅ **Interactive Charts** - Professional candlestick charts with EMA indicators  
✅ **Configurable Settings** - Adjust EMA periods, risk ratios, and more  
✅ **Real Data** - Powered by 15 years of historical NSE data  

---

## 📱 Installation Guide

### System Requirements

- **Android Version:** 5.0 (API 21) or higher
- **Device:** Any Android phone or tablet
- **Storage:** ~100 MB free space
- **Internet:** Required for data fetching

### Installation Steps

#### Method 1: Direct APK Installation (Easiest)

1. **Download APK**
   - Save `NSE-Screener-1.0.0.apk` to your Android device

2. **Enable Installation from Unknown Sources**
   - Settings → Apps & Notifications → Advanced → Special app access
   - Toggle "Install unknown apps" for your file manager

3. **Install the APK**
   - Open file manager
   - Navigate to Downloads folder
   - Tap `NSE-Screener-1.0.0.apk`
   - Tap "Install"

4. **Launch App**
   - Find "NSE Screener" in your app drawer
   - Tap to open

#### Method 2: Via ADB (For Developers)

```bash
adb install NSE-Screener-1.0.0.apk
```

---

## 🎯 Getting Started

### First Launch

1. **Home Tab**
   - App loads screener data (real or mock)
   - Shows 5 stock opportunities
   - Tap any stock to see chart

2. **Backtest Tab**
   - Enter backtest date (YYYY-MM-DD format)
   - Adjust forward period (weeks)
   - Click "Run Backtest" to analyze

3. **Settings Tab**
   - Adjust EMA values (9, 21, 50, etc.)
   - Set risk parameters
   - View data statistics

4. **Results Tab**
   - Placeholder for future results display

### Using the Screener

**Daily Screener:**
- Automatically runs on app launch
- Shows top 5 opportunities by Risk/Reward ratio
- Click stock to view full chart and trade details

**Backtest Analysis:**
- Analyze historical performance
- Test different date ranges
- See forward period results
- View individual trade statistics

---

## ⚙️ Configuration

### Available Settings

**EMA Indicators:**
- Fast: 5-50 (default: 9)
- Mid: 20-100 (default: 21)
- Slow: 50-200 (default: 50)

**Risk Parameters:**
- Min Liquidity: 5-100 ₹ Crore
- Risk per Trade: 0.5-5%
- Min Risk/Reward: 0.5-3.0x
- ATR Multiplier: 1-5

**Data Source:**
- Real: From GitHub nse-market-data repository
- Mock: Fallback if real data unavailable

---

## 📊 Data Sources

**Historical Data:**
- Source: https://github.com/kamalg1989/nse-market-data
- Coverage: 3,705 daily candles per stock (2011-2026)
- Symbols: RELIANCE, TCS, HDFCBANK, ICICIBANK, INFY

**Data Format:**
- [Date, Open, High, Low, Close, Volume]
- Updated daily (end of market hours)

---

## 🐛 Troubleshooting

### App Won't Install
- **Issue:** "Installation failed"
- **Solution:** Enable "Unknown Sources" in settings

### App Crashes on Launch
- **Issue:** Immediate crash
- **Solution:** 
  - Ensure Android 5.0+
  - Check sufficient storage (~100 MB free)
  - Restart phone and try again

### Data Not Loading
- **Issue:** Blank screens in screener
- **Solution:**
  - Check internet connection
  - Refresh button to retry
  - App uses mock data as fallback

### Charts Not Showing
- **Issue:** Charts don't render
- **Solution:**
  - Close other apps to free memory
  - Ensure sufficient device RAM
  - Update app to latest version

---

## 📞 Support & Feedback

**Project Repository:**  
https://github.com/kamalg1989/nse-screener-app-android

**Report Issues:**
- Create issue on GitHub
- Include device info and app version
- Describe steps to reproduce

**Feature Requests:**
- Submit via GitHub discussions
- Vote on existing requests

---

## 📋 Version Information

- **App:** NSE Screener
- **Version:** 1.0.0
- **Package:** com.kamalg.nsescreener
- **Release Date:** June 2026
- **Built With:** React Native, Expo, TypeScript

---

## ⚖️ Legal

### Disclaimer

This application is provided for educational and analysis purposes only. It is not financial advice. Users are responsible for their own trading decisions.

**Not Liable For:**
- Investment losses
- Incorrect data or calculations
- Network/connectivity issues
- Device compatibility issues

### Data Usage

- App fetches real data from public GitHub repository
- No personal data is collected or stored
- Local-only processing and calculations
- Works offline for mock data

---

## 🚀 Advanced Usage

### For Developers

**Clone Repository:**
```bash
git clone https://github.com/kamalg1989/nse-screener-app-android.git
cd nse-screener-app-android
npm install
npx expo start
```

**Build from Source:**
```bash
# Using Expo Build Service (easiest)
eas build --platform android

# Local build
npx expo prebuild --clean
cd android && ./gradlew assembleRelease
```

---

## 📝 Release Notes (v1.0.0)

**Initial Release Features:**
- ✅ Daily screener with real NSE data
- ✅ Backtest engine with forward-period analysis
- ✅ Interactive candlestick charts
- ✅ EMA-based technical indicators
- ✅ Configurable risk/reward settings
- ✅ Mock data fallback
- ✅ 4-tab navigation interface

**Known Limitations:**
- Mobile-only (Android 5.0+)
- Requires internet for real data
- Limited historical data to 15 years
- Single-device app (not synchronized)

---

**Ready to screen some stocks?** Launch the app and start analyzing! 📈

For the latest updates, visit: https://github.com/kamalg1989/nse-screener-app-android
