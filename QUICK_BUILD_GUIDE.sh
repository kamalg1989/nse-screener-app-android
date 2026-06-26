#!/bin/bash

# NSE Screener APK Building - Quick Start Guide
# This file is for reference - read the commands below

# ============================================
# 🚀 FASTEST WAY TO BUILD APK (Recommended)
# ============================================

# This uses Expo's cloud build service (easiest, no local Android SDK needed)

# STEP 1: Create Expo account (free)
# Visit: https://expo.dev and sign up

# STEP 2: Install EAS CLI
npm install -g eas-cli

# STEP 3: Login to Expo
eas login

# STEP 4: Navigate to project
cd /Users/kamal/IdeaProjects/nse-screener-app-android

# STEP 5: Build APK in cloud
eas build --platform android --profile preview

# STEP 6: Download APK from dashboard
# Takes 5-15 minutes, download link will be provided

# ============================================
# 🏗️ ALTERNATIVE: LOCAL BUILD
# ============================================

# If you prefer to build locally (requires Android SDK setup):

# STEP 1: Navigate to project
cd /Users/kamal/IdeaProjects/nse-screener-app-android

# STEP 2: Install dependencies
npm install

# STEP 3: Prebuild native Android files
npx expo prebuild --clean

# STEP 4: Build APK
cd android
./gradlew assembleRelease

# STEP 5: APK location
# /Users/kamal/IdeaProjects/nse-screener-app-android/android/app/build/outputs/apk/release/app-release.apk

# ============================================
# 📤 AFTER YOU GET THE APK
# ============================================

# The APK file (~50-80 MB) can be shared via:
# - Email
# - Google Drive
# - Telegram
# - WhatsApp
# - Firebase Hosting
# - GitHub Releases

# Installation on recipient's Android phone:
# 1. Download APK
# 2. Settings → Enable "Unknown Sources"
# 3. Open file manager → tap APK → Install
# 4. Done! App appears in app drawer

# ============================================
# ✅ VERIFICATION
# ============================================

# Test these features after installation:
# - Home tab: Shows stock opportunities
# - Click stock: Chart modal opens
# - Backtest tab: Date/weeks inputs work
# - Backtest button: Run analysis
# - Settings tab: Sliders are responsive
# - Refresh buttons: Re-load data

# ============================================
# 🆘 TROUBLESHOOTING
# ============================================

# Build stuck?
# → Check internet connection
# → Verify Expo login: eas whoami

# APK won't install?
# → Enable "Unknown sources" in Android settings
# → Check minimum Android 5.0

# App crashes on launch?
# → Ensure 100 MB free storage
# → Restart phone

# ============================================
# 📚 DOCUMENTATION
# ============================================

# For complete build guide, see: BUILD_GUIDE.pdf
# For installation guide, see: DISTRIBUTION_README.md
# For project info, see: https://github.com/kamalg1989/nse-screener-app-android
