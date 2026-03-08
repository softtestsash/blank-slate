# Blank Slate

> *You don't need to know the number. You need to know the direction.*

Blank Slate is a blind weight-tracking app for iOS and Android. It intercepts data from your Bluetooth smart scale, hides the raw reading, and shows you only what actually matters — whether you're moving toward your goal.

---

## The Problem

Most weight-tracking apps show you a number every morning. That number fluctuates by 2–5 lbs daily due to water retention, digestion, salt, hormones, and sleep — none of which reflect fat or muscle change. The result is anxiety, not insight.

## The Solution

Blank Slate replaces the number with a **status pulse**:

| Color | Meaning |
|---|---|
| 🟢 **Green** | You're trending toward your goal weight, or you've arrived and are holding steady |
| 🟡 **Yellow** | You're drifting away from your goal |
| 🔵 **Blue** | You're in a plateau — no significant movement yet |

The pulse is driven by a **7-day Exponential Moving Average** of your scale readings. Daily noise is absorbed. Trend is surfaced.

Raw numbers are locked away until **Sunday morning** — the Weekly Reveal — when your week's average is shown alongside your progress toward your goal.

---

## The Golden Rule

> **Raw daily weight is never displayed.**

This is enforced at three layers:
1. The database — `raw_weight` is never selected into any user-facing query (except the Sunday aggregate)
2. The Zustand store — the status shape has no weight field (TypeScript enforced)
3. Components — `StatusPulse` and `ConsistencyRing` accept no numeric weight props

---

## Features

- **Onboarding** — Set your name, age, sex, current weight, and goal weight. The app infers your goal direction automatically.
- **Morning Ritual** — A short checklist (same time, same conditions) before the scale connects, ensuring weigh-ins are comparable.
- **BLE Scale Support** — Connects to Renpho and QN-Scale devices via Bluetooth LE. Developer mock mode available for testing without hardware.
- **Status Pulse** — Animated glow circle on the dashboard. Color only, no numbers.
- **Consistency Ring** — SVG ring showing weigh-in frequency this week and your current day streak.
- **Context Tags** — Tag each weigh-in with factors like salty food, alcohol, workout, or illness to help explain unusual swings.
- **Weekly Reveal** — Sunday-only animated "envelope open" that shows your weekly mean, delta from last week, progress to goal, and top context tags.

---

## Tech Stack

| | |
|---|---|
| Framework | React Native + Expo (bare workflow) |
| Language | TypeScript |
| Navigation | React Navigation v6 |
| State | Zustand |
| Database | expo-sqlite (SQLite, on-device) |
| Bluetooth | react-native-ble-plx |
| Animation | React Native Reanimated 3 + SVG |
| Date logic | date-fns |

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later

```bash
git clone <repo-url> blank-slate
cd blank-slate
npm install
```

---

## Why not Expo Go?

**Expo Go does not work with this app** and will show a `PlatformConstants` TurboModule error. Two reasons:

1. **react-native-ble-plx** is a custom native module. It is not bundled inside Expo Go.
2. **SDK 54 uses the New Architecture (TurboModules)** by default. Expo Go's native binary must exactly match the SDK in use. Any version mismatch — even a single minor version — causes `TurboModuleRegistry.getEnforcing('PlatformConstants')` to throw before any screen renders.

Use a **dev build** (below) or the **web preview** instead.

---

## Run in a Browser (UI Preview)

Fastest way to iterate on layout. Bluetooth is unavailable in browsers — mock mode fires a simulated scale reading after 2 seconds. Data resets on page refresh.

```bash
npx expo start --web
```

Open `http://localhost:8081`.

---

## Run on iPhone — Development Build

A dev build is a custom native binary that matches your exact SDK and includes all native modules (Bluetooth, SQLite). It replaces Expo Go and supports live reload exactly the same way.

There are two paths: **local** (requires Mac + Xcode) or **cloud** (no Mac required, uses Expo's build service).

---

### Option A — Local Build (Mac + Xcode)

**Prerequisites:**
- macOS with Xcode 15 or later
- Apple Developer account (free tier works for personal device testing)
- iPhone connected via USB and trusted

**Steps:**

```bash
# 1. Generate native iOS project
npx expo prebuild --platform ios

# 2. Install native dependencies
cd ios && pod install && cd ..

# 3. Open in Xcode
open ios/BlankSlate.xcworkspace
```

In Xcode:
- Select your iPhone as the target (top toolbar)
- Go to **Signing & Capabilities** → select your Apple ID team
- Press **Run** (`Cmd + R`) — this compiles and installs the app on your phone

```bash
# 4. Once installed, start the JS bundler
npm run dev
```

Shake your iPhone to open the Expo dev menu. The app will connect to your bundler automatically.

---

### Option B — Cloud Build via EAS (no Mac required)

[EAS Build](https://expo.dev/eas) compiles the native binary in Expo's cloud and emails you a link to install it on your iPhone. Free tier available.

**Prerequisites:**
- An [Expo account](https://expo.dev/signup) (free)
- EAS CLI: `npm install -g eas-cli`

**Steps:**

```bash
# 1. Log in
eas login

# 2. Configure your project (first time only)
eas build:configure

# 3. Build a development binary for iPhone
eas build --profile development --platform ios
```

When the build finishes (~10–15 min), you'll get a QR code to install the `.ipa` on your device via the Expo website.

```bash
# 4. Start the JS bundler
npm run dev
```

Scan the QR shown in the terminal from within the installed dev client app on your iPhone.

> **Note:** For ad-hoc distribution (no TestFlight), register your iPhone's UDID in your Apple Developer account before building. EAS will guide you through this.

---

### Bluetooth Permissions

Permissions are declared in `app.json` and requested automatically on first scan. The app targets Renpho and QN-Scale devices using Service UUID `0000ffb0-0000-1000-8000-00805f9b34fb`.

---

## Project Structure

```
src/
├── db/
│   ├── schema.ts          # SQLite DDL
│   └── db.ts              # Query helpers (typed, Golden Rule enforced)
├── services/
│   ├── trendEngine.ts     # 7-day EMA + goal-oriented status
│   └── bleListener.ts     # BLE scanner, Renpho parser, mock mode
├── store/
│   └── useAppStore.ts     # Zustand (profile, status, ritual state)
├── navigation/
│   └── AppNavigator.tsx   # Onboarding gate + tab navigator
├── components/
│   ├── StatusPulse.tsx    # Animated glow circle (color = status only)
│   ├── ConsistencyRing.tsx # SVG weigh-in frequency ring
│   ├── ChecklistItem.tsx
│   └── TagChip.tsx
└── screens/
    ├── Onboarding/
    │   ├── NameAgeScreen.tsx
    │   ├── CurrentWeightScreen.tsx
    │   └── TargetWeightScreen.tsx
    ├── DashboardScreen.tsx  # Pulse + ring, no numbers
    ├── RitualScreen.tsx     # Checklist → Scale → Tagging → Complete
    └── RevealScreen.tsx     # Sunday-only weekly average reveal
```

---

## Mock Mode

BLE mock mode is enabled automatically when:
- Running in `__DEV__` (local dev server)
- Running on web (Bluetooth not available in browsers)
- `react-native-ble-plx` native module is not found at call time

During the Ritual's "Awaiting Scale" step, a simulated stable reading fires after 2 seconds. To test with a real physical scale, use a **dev build** and set mock mode off:

```ts
// src/services/bleListener.ts
export let MOCK_MODE = false; // was: __DEV__
```

Or call `setMockMode(false)` at runtime (e.g. from a debug menu).

---

## Roadmap

### v0.1 — Blind MVP &nbsp; ✅ &nbsp; *current*
> Core loop: weigh in daily, see a color, get the number on Sunday.

- [x] **Blind tracking** — Raw weight hidden every day; only trend status is shown
- [x] **Status Pulse** — Goal-oriented color: Green (toward goal) · Yellow (away from goal) · Blue (plateau)
- [x] **Morning Ritual** — Guided checklist before stepping on the scale for consistent conditions
- [x] **Bluetooth scale support** — Renpho / QN-Scale BLE integration
- [x] **Context tagging** — Log factors like salt, alcohol, workout, or poor sleep after each weigh-in
- [x] **Consistency Ring** — Visual weigh-in streak for the week, no numbers shown
- [x] **Weekly Reveal** — Sunday-only envelope that shows your week's average and progress toward goal
- [x] **Onboarding** — Set name, age, sex, current weight, and goal weight on first launch

---

### v0.2 — Daily Companion &nbsp; 🔲 &nbsp; *next*
> Make the app a reliable part of the morning routine.

- [ ] **Daily reminder** — Configurable push notification at your preferred weigh-in time
- [ ] **Profile editing** — Update name, goal weight, or unit (lbs/kg) after onboarding
- [ ] **BLE error recovery** — Retry button and clearer status when the scale doesn't connect
- [ ] **App icon & splash screen** — Polished first impression on the home screen
- [ ] **Android permissions** — Graceful Bluetooth permission prompts on Android 12+

---

### v0.3 — Deeper Insight &nbsp; 🔲
> Understand *why* the trend is moving, not just which direction.

- [ ] **Tag correlation** — Show which context tags (e.g. alcohol, poor sleep) tend to precede upward swings
- [ ] **Body composition** — Muscle % and fat % delta if your scale broadcasts it
- [ ] **Reveal trend chart** — A simple weight-over-time sparkline, visible on the Sunday reveal only
- [ ] **Monthly summary** — First-of-month view showing 4-week average and net change

---

### v0.4 — Ecosystem &nbsp; 🔲
> Connect Blank Slate to the rest of your health data.

- [ ] **Apple Health integration** — Write daily weigh-in to Health (opt-in)
- [ ] **Multiple profiles** — Support for more than one person on a shared device
- [ ] **Data export** — Download your full history as a CSV

---

### v1.0 — App Store &nbsp; 🔲
> Ship it.

- [ ] **iOS App Store** — Submission and review
- [ ] **Google Play** — Submission and review
- [ ] **Privacy policy** — Required for store listings
- [ ] **iCloud backup** — Restore weekly summaries on a new device

---

### Backlog / Considering
> Ideas on the radar — no timeline yet.

- [ ] Apple Watch companion — glanceable pulse color on your wrist, no numbers
- [ ] Home screen widget — streak count and pulse color only
- [ ] AI-generated weekly note — pattern observations from tags + trend, no prescriptive advice
- [ ] Customizable checklist items — add, remove, or reorder your morning ritual steps
