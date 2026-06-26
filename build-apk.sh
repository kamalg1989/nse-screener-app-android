#!/bin/bash

# NSE Screener Android App - APK Build Script
# This script builds the Android APK for distribution

set -e

PROJECT_DIR="/Users/kamal/IdeaProjects/nse-screener-app-android"
BUILD_OUTPUT_DIR="$PROJECT_DIR/build-output"
APP_NAME="NSE-Screener"
VERSION="1.0.0"

echo "=========================================="
echo "NSE Screener Android APK Builder"
echo "=========================================="
echo ""

# Create output directory
mkdir -p "$BUILD_OUTPUT_DIR"

cd "$PROJECT_DIR"

echo "📋 Project Information:"
echo "  Project: $PROJECT_DIR"
echo "  App Name: $APP_NAME"
echo "  Version: $VERSION"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🔍 Checking Android environment..."

# Check for Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME not set. Setting to default location..."
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

echo "  ANDROID_HOME: $ANDROID_HOME"
echo ""

echo "🛠️  Generating native Android project..."
npx expo prebuild --clean --yes

echo ""
echo "📦 Building Release APK..."
cd "$PROJECT_DIR/android"

if [ ! -f "gradlew" ]; then
    echo "❌ Gradle wrapper not found. Run 'npx expo prebuild' first."
    exit 1
fi

chmod +x gradlew
./gradlew assembleRelease

echo ""
echo "✅ Build Complete!"

# Copy APK to output directory
APK_FILE="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk"
OUTPUT_APK="$BUILD_OUTPUT_DIR/$APP_NAME-$VERSION.apk"

if [ -f "$APK_FILE" ]; then
    cp "$APK_FILE" "$OUTPUT_APK"
    SIZE=$(du -h "$OUTPUT_APK" | cut -f1)
    echo ""
    echo "📁 APK File Location:"
    echo "  $OUTPUT_APK"
    echo "  Size: $SIZE"
    echo ""
    echo "🎉 Ready to share!"
    echo ""
    echo "Next steps:"
    echo "  1. Download/transfer APK to Android device"
    echo "  2. Enable 'Unknown sources' in device settings"
    echo "  3. Install and launch app"
else
    echo "❌ APK build failed. Check error messages above."
    exit 1
fi
