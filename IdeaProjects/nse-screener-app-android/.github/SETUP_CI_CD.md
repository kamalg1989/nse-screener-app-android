# 🔐 GitHub Actions - Setup Guide

## ✅ What This CI/CD Does

Automatically builds APK on every push to `main` branch:

1. **Triggered:** When code is pushed
2. **Build:** Uses Expo EAS Build (cloud)
3. **Release:** Creates GitHub Release with APK
4. **Download:** Users download APK from Releases page

---

## 🔑 Required Setup - One-Time Only!

### Step 1: Create Expo Token

```bash
eas login
eas token create  # Creates personal access token
```

**Or get existing token:**
```bash
eas token create --name github-actions
```

Copy the token (starts with `expo_...`)

---

### Step 2: Add GitHub Secret

1. Go to: `https://github.com/kamalg1989/nse-screener-app-android/settings/secrets/actions`
2. Click **"New repository secret"**
3. **Name:** `EXPO_TOKEN`
4. **Value:** Paste your Expo token
5. Click **"Add secret"**

---

## 🚀 How It Works

### Automatic Build on Every Push
```bash
git push origin main
# ↓
# GitHub Actions triggers automatically
# ↓
# eas build runs in cloud (15-20 minutes)
# ↓
# APK uploaded to GitHub Releases
# ↓
# Download link ready!
```

### Manual Trigger (Optional)
Go to GitHub repo → Actions → Build & Release APK → Run workflow

---

## 📥 Download APK After Build

1. Go to: `https://github.com/kamalg1989/nse-screener-app-android/releases`
2. Find latest release (e.g., "v1.0.0 (Build 123)")
3. Download `NSE-Screener-1.0.0.apk`
4. Share with others!

---

## 🔧 Workflow File Location

`.github/workflows/build-apk.yml`

**What it does:**
- Checks out code
- Installs dependencies
- Builds APK with EAS
- Creates GitHub Release
- Uploads APK to release

---

## ✨ Features

✅ Automatic on every push  
✅ Build history in GitHub Releases  
✅ One-click download  
✅ No manual building needed  
✅ No local Android SDK required  

---

## 🆘 Troubleshooting

### "EXPO_TOKEN secret not found"
→ Add secret in Settings → Secrets → Actions

### "Build failed"
→ Check GitHub Actions logs (Actions tab)

### "Download not working"
→ Check Expo's build status
→ Manually run: `eas build --platform android`

---

## 📊 Next Steps

1. ✅ Commit workflow to git
2. ✅ Push to GitHub
3. ✅ Add EXPO_TOKEN secret
4. ✅ Make a test commit
5. ✅ Watch Actions tab
6. ✅ Download APK from Releases!

---

**That's it!** From now on, every push builds an APK automatically. 🎉
