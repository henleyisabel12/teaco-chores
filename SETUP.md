# Teaco Chores — Setup Guide

Follow these steps in order. Takes about 20 minutes total.

---

## PART 1 — Firebase (your shared database, ~10 min)

Firebase is a free Google service that keeps both phones in sync in real time.

### 1.1 Create a Firebase project

1. Go to **https://console.firebase.google.com**
2. Sign in with a Google account
3. Click **"Add project"**
4. Name it `teaco-chores` (or anything you like)
5. Disable Google Analytics (not needed) → click **"Create project"**

### 1.2 Add a web app

1. On the project overview page, click the **</>** (Web) icon
2. Give it a nickname: `teaco-chores`
3. **Do NOT** check "Firebase Hosting" — we'll use Vercel instead
4. Click **"Register app"**
5. You'll see a code block with `firebaseConfig`. **Copy those values** — you'll need them in a moment.

### 1.3 Enable the Realtime Database

1. In the left sidebar, click **"Build"** → **"Realtime Database"**
2. Click **"Create Database"**
3. Choose the closest location to you (e.g. `us-central1`)
4. Select **"Start in test mode"** → click **"Enable"**
   _(Test mode allows read/write for 30 days. We'll secure it after.)_

### 1.4 Set database rules (so only your app can read/write)

1. In Realtime Database, click the **"Rules"** tab
2. Replace everything with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

3. Click **"Publish"**

> This is fine since the database only contains chore data (nothing sensitive).
> If you want stricter security later, you can add Firebase Authentication.

### 1.5 Fill in your credentials

Open the file **`src/firebaseConfig.js`** in a text editor and replace each
`REPLACE_WITH_YOUR_...` value with the corresponding value from your Firebase
`firebaseConfig` object. Example:

```js
export const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",
  authDomain: "teaco-chores.firebaseapp.com",
  projectId: "teaco-chores",
  storageBucket: "teaco-chores.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

Save the file.

---

## PART 2 — Deploy to Vercel (~10 min)

Vercel hosts your app for free and gives you a live URL.

### 2.1 Push the project to GitHub

1. Go to **https://github.com** and create a free account if you don't have one
2. Click **"New repository"** → name it `teaco-chores` → click **"Create repository"**
3. On your computer, open Terminal (Mac) or Command Prompt (Windows) in the
   project folder and run:

```bash
git init
git add .
git commit -m "initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/teaco-chores.git
git push -u origin main
```

_(Replace `YOUR_USERNAME` with your GitHub username)_

### 2.2 Deploy on Vercel

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **"Add New Project"**
3. Select your `teaco-chores` repository
4. Vercel will auto-detect it as a Vite project — no settings to change
5. Click **"Deploy"**

After ~1 minute, you'll get a URL like:
**`https://teaco-chores.vercel.app`**

That's your live app! 🎉

---

## PART 3 — Add to home screens (~2 min)

### iPhone (Safari only — won't work in Chrome on iOS)

1. Open the app URL in **Safari**
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it `Teaco Chores` → tap **"Add"**

### Android (Chrome)

1. Open the app URL in **Chrome**
2. Tap the **three-dot menu** (top right)
3. Tap **"Add to Home screen"**
4. Tap **"Add"**

---

## PART 4 — Share with your partner

Just send them the Vercel URL (e.g. `https://teaco-chores.vercel.app`).
They follow Part 3 to add it to their home screen.

**Both phones share the same data in real time.** When one of you checks off
a chore, the other phone updates within seconds.

Each person picks their own "active user" (the colored initials in the top
right) — this is stored on each device separately, so you don't need to
coordinate.

---

## Troubleshooting

**"connecting…" never goes away**
→ Your Firebase credentials in `src/firebaseConfig.js` are probably wrong.
  Double-check each value matches exactly what's in your Firebase console.

**Changes on one phone don't appear on the other**
→ Check that both devices are using the same URL.
→ Check your Firebase Realtime Database rules allow read/write.

**Chores aren't showing up as expected**
→ The app uses today's real date, not the Feb 21 2026 baseline used during
  development. All schedules are calculated relative to today.

---

## Updating the app later

Any time you want to change chore tasks, frequencies, or anything else:
1. Edit the files locally
2. Run `git add . && git commit -m "update" && git push`
3. Vercel automatically re-deploys within ~1 minute

---

*Built with React + Vite + Firebase Realtime Database + Vercel*
