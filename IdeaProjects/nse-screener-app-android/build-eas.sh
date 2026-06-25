#!/bin/bash

# NSE Screener Android App - Expo Build Script
# Uses Expo Build Service (requires Expo account)
# This is the EASIEST method - no local Android SDK needed

set -e

PROJECT_DIR="/Users/kamal/IdeaProjects/nse-screener-app-android"

echo "=========================================="
echo "NSE Screener - Expo Build Service"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

echo "✅ Prerequisites Check:"
echo "  1. Expo account created? (https://expo.dev)"
echo "  2. Expo CLI installed? (npm install -g expo-cli)"
echo ""

# Check if Expo CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
    echo ""
fi

echo "🔐 Logging into Expo..."
eas login

echo ""
echo "⚙️  Initializing EAS..."
eas init --id com.kamalg.nsescreener 2>/dev/null || true

echo ""
echo "🚀 Building Android APK in the cloud..."
echo "   This will take 5-15 minutes..."
echo ""

eas build --platform android --profile preview

echo ""
echo "✅ Build Complete!"
echo ""
echo "📱 Download APK:"
echo "  Check your Expo dashboard or the URL provided above"
echo ""
echo "🎉 Ready to share with others!"
