# NSE Screener - Android Stock Screening & Backtesting App

![NSE Screener](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React Native](https://img.shields.io/badge/React%20Native-0.85.3-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**NSE Screener** is a professional-grade Android application for real-time stock screening, technical analysis, and backtesting on the Indian National Stock Exchange (NSE). Built with React Native and Expo, it combines cutting-edge technical indicators with historical data analysis.

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Running the App](#-running-the-app)
- [Building APK](#-building-apk)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [API & Data Sources](#-api--data-sources)
- [Usage Guide](#-usage-guide)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Features

### 📊 Daily Screener
- **Real-time Analysis:** Runs screener on NSE stock data (live or mock)
- **Technical Indicators:** EMA-based trend analysis with customizable periods
- **Smart Opportunities:** Identifies top 5 stocks by Risk/Reward ratio
- **Interactive Charts:** Tap any stock to view detailed candlestick charts
- **Data Source Badge:** Visual indicator showing Real vs Mock data

### 🔍 Backtest Engine
- **Historical Analysis:** Test strategies on past market data
- **Date Picker:** Select any backtest date (YYYY-MM-DD format)
- **Forward Period Testing:** Analyze 1-12 week forward periods
- **Detailed Statistics:** Win rate, average return, total P&L
- **Individual Trades:** View each trade's entry, exit, and P&L
- **Forward Period Highlighting:** Visual markers for forward period on charts

### ⚙️ Configurable Settings
- **EMA Indicators:** Fast (5-50), Mid (20-100), Slow (50-200 periods)
- **Risk Parameters:** Liquidity filter, position sizing, R:R ratios, ATR multiplier
- **Data Statistics:** Real-time display of loaded symbols and candle counts
- **Live Updates:** All settings update the screener immediately

### 📱 User Interface
- **4-Tab Navigation:** Home → Backtest → Results → Settings
- **Modal Charts:** Full-screen chart view with zoom support
- **Dark Mode Ready:** Professional color scheme for easy viewing
- **Responsive Design:** Optimized for all Android screen sizes

---

## 📖 Project Overview

### What Does This App Do?

NSE Screener helps traders and analysts:

1. **Screen Stocks Daily** - Automatically identify potential trading opportunities based on technical indicators
2. **Analyze History** - Backtest strategies on 15+ years of NSE historical data
3. **Test Strategies** - Evaluate forward periods to understand probability of wins
4. **Calculate Risk** - Precise entry, stop-loss, and target calculations
5. **Visualize Trends** - Professional candlestick charts with EMA overlays

### Use Cases

- **Day Traders:** Quick screening for intraday opportunities
- **Swing Traders:** Multi-day trend analysis with technical setup validation
- **Analysts:** Historical performance testing and strategy evaluation
- **Educators:** Learning technical analysis with real market data
- **Algorithm Developers:** Testing screener logic before production deployment

---

## 🔧 Technology Stack

### Frontend
- **Framework:** React Native with Expo 56.0.12
- **Language:** TypeScript 5.3
- **State Management:** React Context API
- **UI Components:** React Native built-in components
- **Charts:** Custom SVG-based CandleChart component

### Backend/Data
- **Data Source:** GitHub nse-market-data repository
- **Format:** JSON arrays compressed with gzip
- **Storage:** Local device storage (mock data fallback)
- **API:** RESTful fetch from GitHub CDN

### Development Tools
- **Package Manager:** npm
- **Build System:** Expo CLI & EAS Build
- **Version Control:** Git
- **Testing:** Expo Go (for development)

### Core Libraries
- `@react-native-community/slider` - Settings controls
- `react-native-svg` - Chart rendering
- `expo` - Framework and build tools
- `typescript` - Type safety

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **Expo Account** (free at https://expo.dev)
- **Android Device/Emulator** with Android 5.0+
- **Internet Connection**

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/kamalg1989/nse-screener-app-android.git
cd nse-screener-app-android

# 2. Install dependencies
npm install

# 3. Start the app in development mode
npx expo start

# 4. Press 'a' for Android emulator or scan QR code with Expo Go app
# App launches in ~30 seconds
```

That's it! The app is now running.

---

## 📦 Installation

### From Source (Development)

```bash
# Clone repository
git clone https://github.com/kamalg1989/nse-screener-app-android.git

# Install dependencies
cd nse-screener-app-android
npm install

# Check Node version (requires 16+)
node --version

# Verify React Native setup
npm ls react-native
```

### From APK (Production/Distribution)

See [Building APK](#-building-apk) section below.

---

## ▶️ Running the App

### Development Mode (Hot Reload)

```bash
# Terminal 1: Start Expo development server
cd /Users/kamal/IdeaProjects/nse-screener-app-android
npx expo start --reset-cache

# Terminal 2: Options appear
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR code with Expo Go app on real device
```

### On Android Emulator

```bash
# Using Pixel 5 emulator
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/Users/kamal/Library/Android/sdk
npx expo start --reset-cache
# Press 'a' at prompt
```

### On Physical Device

1. Install Expo Go app from Google Play Store
2. Open Expo Go
3. Scan QR code from `npx expo start` output
4. App loads on device (~15 seconds)

### Build for Production

```bash
# Using Expo Build Service (recommended - no Android SDK needed)
./build-eas.sh

# Or manually
eas build --platform android --profile preview
```

---

## 🏗️ Building APK

### Method 1: Expo Build Service (Easiest - Recommended)

**No local Android SDK installation needed!**

```bash
# 1. Setup (one-time)
npm install -g eas-cli
eas login  # Create free Expo account if needed

# 2. Build APK
cd nse-screener-app-android
./build-eas.sh

# 3. Download APK from Expo dashboard (takes 5-15 minutes)
```

**Pros:** No local setup, cloud-based, reliable  
**Cons:** Requires internet, Expo account

---

### Method 2: Local Build (Advanced)

**Requires Android SDK, Java 11+, and Android Studio**

```bash
# 1. Install prerequisites
# - Android SDK
# - Java Development Kit (JDK 11+)
# - Android Build Tools

# 2. Setup environment variables
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=$HOME/Library/Android/sdk

# 3. Generate native Android project
cd nse-screener-app-android
npx expo prebuild --clean

# 4. Build APK
cd android
./gradlew assembleRelease

# 5. APK location
# ./app/build/outputs/apk/release/app-release.apk
```

**Pros:** Full control, no external service dependency  
**Cons:** Requires Android SDK setup, slower initial build

---

### Sharing the APK

```bash
# APK file size: ~60-80 MB
# Share via:
# - Email
# - Google Drive / OneDrive
# - Telegram / WhatsApp
# - GitHub Releases
# - Firebase Hosting

# Installation on recipient's device:
# 1. Download APK
# 2. Settings → Enable "Unknown Sources"
# 3. Open file manager → Tap APK → Install
# 4. Launch "NSE Screener" from app drawer
```

---

## 📁 Project Structure

```
nse-screener-app-android/
│
├── App.tsx                           # Main app with tab navigation
├── app.json                          # Expo configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── .gitignore                        # Git ignore rules
│
├── src/
│   ├── app/                          # Expo navigation config
│   │   ├── _layout.tsx              # Root layout
│   │   ├── index.tsx                # Home route
│   │   └── explore.tsx              # Explore route
│   │
│   ├── screens/                      # Main app screens
│   │   ├── HomeScreen.tsx           # Daily screener
│   │   ├── BacktestScreen.tsx       # Backtest analysis
│   │   ├── SettingsScreen.tsx       # Configuration
│   │   └── [Results placeholder]
│   │
│   ├── components/                   # Reusable components
│   │   ├── CandleChart.tsx          # OHLC chart with EMAs
│   │   └── [Other UI components]
│   │
│   ├── screener/                     # Core screener logic
│   │   └── screener.ts              # runScreener() function
│   │
│   ├── utils/                        # Utility functions
│   │   ├── realDataFetcher.ts       # GitHub data fetching
│   │   ├── backtestEngine.ts        # Backtest analysis
│   │   ├── screener.ts              # Stock screening
│   │   ├── emaCalculator.ts         # EMA calculations
│   │   ├── baseDetection.ts         # Base pattern detection
│   │   ├── candleAggregation.ts     # Timeframe aggregation
│   │   ├── mockData.ts              # Mock data generator
│   │   └── githubDataFetcher.ts     # GitHub API wrapper
│   │
│   ├── context/                      # Global state
│   │   └── SettingsContext.tsx      # Settings context + hooks
│   │
│   ├── hooks/                        # Custom hooks
│   │   └── use-theme.ts
│   │
│   └── constants/                    # App constants
│       └── theme.ts
│
├── android/                          # Native Android (generated)
│   ├── app/                          # App build config
│   ├── gradle/                       # Gradle wrapper
│   └── [Generated on prebuild]
│
├── assets/                           # App icons & images
│   ├── icon.png                     # App icon
│   ├── splash.png                   # Splash screen
│   └── adaptive-icon.png            # Android adaptive icon
│
├── BUILD_GUIDE.pdf                   # Complete build documentation
├── DISTRIBUTION_README.md            # User installation guide
├── QUICK_BUILD_GUIDE.sh             # Quick reference
├── build-apk.sh                     # Local build script
├── build-eas.sh                     # Cloud build script
└── README.md                         # This file
```

---

## ⚙️ Configuration

### Available Settings (In-App)

**EMA Indicators**
| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| Fast EMA | 5-50 | 9 | Quick trend changes |
| Mid EMA | 20-100 | 21 | Medium trend |
| Slow EMA | 50-200 | 50 | Long-term trend |

**Risk Settings**
| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| Min Liquidity | 5-100 ₹Cr | 10 | Filter low-volume stocks |
| Risk per Trade | 0.5-5% | 1% | Position sizing |
| Min R:R Ratio | 0.5-3.0x | 1.5x | Risk/reward filter |
| ATR Multiplier | 1-5 | 2.0 | SL distance calculation |
| Top Stocks | 1-10 | 5 | Opportunities shown |

### Environment Variables

```bash
# Optional: Set for local development
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/Users/kamal/Library/Android/sdk
export NODE_ENV=development
```

---

## 📡 API & Data Sources

### Real Data Source

**GitHub Repository:** `kamalg1989/nse-market-data`

**Data Format:**
```json
[
  ["2026-06-24", 2850.45, 2865.50, 2840.20, 2858.75, 1250000],
  ["2026-06-23", 2845.30, 2860.00, 2835.50, 2852.00, 1180000],
  ...
]
// [Date, Open, High, Low, Close, Volume]
```

**Coverage:**
- **Symbols:** RELIANCE, TCS, HDFCBANK, ICICIBANK, INFY
- **Period:** 2011-2026 (15+ years)
- **Total Candles:** ~3,705 per symbol
- **Frequency:** Daily
- **Format:** Gzipped JSON (auto-decompressed by CDN)

**Fetch URL:**
```
https://raw.githubusercontent.com/kamalg1989/nse-market-data/main/data/{SYMBOL}.json.gz
```

### Fallback Data

If real data unavailable, app uses mock data:
- 630 historical candles (90 weeks backward)
- 120 forward candles (17 weeks forward)
- Realistic price movements
- All 5 symbols included

---

## 📱 Usage Guide

### Daily Screener (Home Tab)

```
1. App loads screener on launch
2. Shows "📊 Real Data" or "🤖 Mock Data" badge
3. Displays 5 top opportunities:
   - Stock symbol
   - Entry price
   - Stop-loss price
   - Target price
   - Risk/Reward ratio

4. Click any stock → Opens chart modal:
   - Candlestick chart with EMA overlays
   - Daily/weekly toggle
   - Entry/SL/Target details
   - Full trading setup

5. Refresh button re-runs screener with current settings
```

### Backtest Analysis (Backtest Tab)

```
1. Enter backtest date (e.g., 2026-01-15)
2. Adjust forward period slider (1-12 weeks)
3. Click "Run Backtest":
   - Shows statistics:
     * Total trades tested
     * Win rate %
     * Average return %
     * Total P&L

4. Forward period results show:
   - Symbol
   - Entry → Exit prices
   - P&L per trade

5. Click forward result → View chart with green highlighting
```

### Settings Configuration (Settings Tab)

```
1. Adjust EMA sliders:
   - Fast EMA (5-50)
   - Mid EMA (20-100)
   - Slow EMA (50-200)

2. Adjust risk sliders:
   - Min liquidity
   - Risk per trade
   - Min R:R ratio
   - ATR multiplier
   - Top stocks to show

3. View data statistics:
   - Symbols loaded (n/5)
   - Total candles available
   - Date range
   - Loaded symbol names

4. Refresh stats to update data source info
```

---

## 🐛 Troubleshooting

### App Won't Launch

**Problem:** Blank screen or crash on startup
**Solutions:**
```bash
# Clear cache and reinstall
npx expo start --reset-cache

# Check Node version
node --version  # Should be 16+

# Check dependencies
npm install

# Check TypeScript
npx tsc --version
```

---

### Data Not Loading

**Problem:** Home/Backtest tab shows "No opportunities"
**Solutions:**
- Check internet connection (required for real data)
- Real data fetch might be slow (5-10 seconds)
- App uses mock data as fallback automatically
- Tap refresh button to retry

---

### Build Fails

**Problem:** `eas build` or `./gradlew assembleRelease` fails
**Solutions:**
```bash
# Check Java version
java -version  # Should be 11+

# Clean cache
rm -rf node_modules package-lock.json
npm install

# For Expo build
eas logout
eas login  # Re-authenticate

# For local build
cd android
./gradlew clean
./gradlew assembleRelease
```

---

### Charts Not Displaying

**Problem:** Modal opens but chart is blank
**Solutions:**
- Ensure device has 100+ MB free RAM
- Close other apps
- Restart device
- Check if chart data has entries

---

## 🤝 Contributing

Contributions welcome! To contribute:

```bash
# 1. Fork repository
git clone https://github.com/yourusername/nse-screener-app-android.git

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Make changes and commit
git add .
git commit -m "Add feature: description"

# 4. Push and create Pull Request
git push origin feature/your-feature
```

**Contribution Areas:**
- New technical indicators
- Additional symbols
- UI/UX improvements
- Performance optimization
- Bug fixes
- Documentation

---

## 📝 License

This project is licensed under the **MIT License**. See LICENSE file for details.

---

## 📞 Support & Contact

**GitHub Issues:** Report bugs at https://github.com/kamalg1989/nse-screener-app-android/issues

**Discussions:** Share ideas at https://github.com/kamalg1989/nse-screener-app-android/discussions

**Documentation:** See BUILD_GUIDE.pdf and DISTRIBUTION_README.md

---

## 🎯 Roadmap

### Planned Features
- [ ] Multi-timeframe analysis (15m, 1h, 4h, daily, weekly)
- [ ] Additional technical indicators (MACD, RSI, Bollinger Bands)
- [ ] Portfolio tracking
- [ ] Alert system
- [ ] Export data to CSV
- [ ] Cloud sync across devices
- [ ] More NSE symbols
- [ ] Web version

### Version History

**v1.0.0 (June 2026)** - Initial Release
- Daily screener with real NSE data
- Backtest engine with forward-period analysis
- Interactive candlestick charts
- EMA-based technical analysis
- Configurable settings
- Android support

---

## 🙏 Acknowledgments

- **Data Source:** nse-market-data GitHub repository
- **Framework:** React Native and Expo
- **Charts:** Custom SVG implementation
- **Community:** All contributors and users

---

## ⚠️ Disclaimer

**This is an educational and analysis tool only.** It is NOT financial advice. Users are responsible for their own trading decisions. The app is provided "as-is" without warranties. Not liable for investment losses or technical issues.

---

**Built with ❤️ for NSE traders and analysts**

Happy screening! 📈

For latest updates, star ⭐ the repository: https://github.com/kamalg1989/nse-screener-app-android
