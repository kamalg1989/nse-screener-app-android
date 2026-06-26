# 🔐 How to Get Your EXPO_TOKEN

## Quick Steps

### Step 1: Login to Expo (If Not Already)

```bash
eas login
# Enter your email and password for expo.dev account
# If no account, create one at https://expo.dev
```

### Step 2: Create Personal Access Token

```bash
eas token create --name github-actions
```

You'll see output like:
```
✔ Token 'github-actions' created
Token: expo_abcd1234efgh5678ijkl9012mnop3456qrst7890
```

**Copy the token value** (starts with `expo_`)

---

## Detailed Steps (with screenshots)

### 1️⃣ Login via CLI

```bash
cd /Users/kamal/IdeaProjects/nse-screener-app-android
eas login
```

**Output:**
```
✔ Logged in
Email: kamal@example.com
```

---

### 2️⃣ Create Token

```bash
eas token create --name github-actions
```

**Output:**
```
✔ Token 'github-actions' created
✔ Created token for account @kamalg89

Token: expo_XXXX...XXXX

⚠️  This is the only time the token will be shown. Keep it safe.
```

---

### 3️⃣ Copy Your Token

Your token looks like:
```
expo_abcdef1234567890ghijkl9876543210mnopqr
```

**Save this somewhere safe** ✅

---

## Add to GitHub Secrets

### Steps:

1. Go to GitHub repo settings:
   ```
   https://github.com/kamalg1989/nse-screener-app-android/settings/secrets/actions
   ```

2. Click **"New repository secret"**

3. Fill in:
   - **Name:** `EXPO_TOKEN`
   - **Value:** `expo_abcdef...` (paste your token)

4. Click **"Add secret"** ✅

---

## Verify It Works

After adding the secret:

```bash
# Make a test commit
git commit --allow-empty -m "Test CI/CD"
git push origin main

# Check GitHub Actions
# Go to: Actions tab → Build & Release APK → Should start building!
```

---

## 🎯 That's It!

Your GitHub Actions workflow now has access to build APKs automatically. 🚀

---

## 🆘 Troubleshooting

### "I don't have an Expo account"
→ Create one at https://expo.dev (free)

### "Token not working"
→ Regenerate: `eas token create --name github-actions`

### "GitHub can't find the secret"
→ Double-check the name is exactly `EXPO_TOKEN` (case-sensitive)

### "Build still fails"
→ Check GitHub Actions logs for detailed error message

---

## Security Notes

✅ Token is private (only visible in GitHub Actions)  
✅ Can revoke anytime: `eas token delete`  
✅ Safe to commit code (token in secrets, not in repo)  

---

**Ready?** Get your token and add it to GitHub! 🔐
