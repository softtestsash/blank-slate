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
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`

```bash
git clone <repo-url> blank-slate
cd blank-slate
npm install
```

---

## Run in a Browser (Expo Web)

Useful for quickly iterating on layout and non-BLE screens. Bluetooth and local storage are not available in the browser — the app will automatically use **mock mode** (a simulated scale reading fires after 2 seconds during the Ritual) and all screens render with empty/default data.

```bash
npx expo start --web
```

Then open `http://localhost:8081` in your browser.

> **Note:** Web is a UI preview only. Data does not persist between page refreshes. The canonical experience is on-device via Expo Go or a dev build.

---

## Run on iPhone

There are two ways depending on how much you need to test.

### Option A — Expo Go (no Bluetooth, fastest setup)

Best for testing onboarding, dashboard, and reveal screens. Bluetooth is unavailable in Expo Go; the ritual will run in mock mode.

1. Install **Expo Go** from the App Store on your iPhone.
2. Start the dev server:
   ```bash
   npx expo start
   ```
3. Open the Camera app on your iPhone and scan the QR code shown in the terminal.

### Option B — Development Build (full Bluetooth support)

Required to test actual BLE scale connections. You'll need a Mac with Xcode installed.

**Prerequisites:**
- Xcode 15 or later (from the Mac App Store)
- An Apple Developer account (free tier works for personal device testing)
- iPhone connected via USB and trusted on your Mac

**Steps:**

1. Generate the native iOS project:
   ```bash
   npx expo prebuild --platform ios
   ```

2. Install iOS dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```

3. Open the project in Xcode:
   ```bash
   open ios/BlankSlate.xcworkspace
   ```

4. In Xcode:
   - Select your iPhone as the target device (top toolbar)
   - Go to **Signing & Capabilities** and select your Apple ID team
   - Press **Run** (▶) or `Cmd + R`

5. Once installed, return to your terminal and start the JS bundler:
   ```bash
   npx expo start --dev-client
   ```
   Shake your iPhone or press the home button to open the Expo dev menu and connect to the bundler.

**Bluetooth permissions** are declared in `app.json` and will be requested automatically the first time the Ritual screen starts a scan.

> **Scale compatibility:** Tested against Renpho and QN-Scale devices using Service UUID `0000ffb0-0000-1000-8000-00805f9b34fb`. Other Bluetooth scales will not be detected.

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
- Running in `__DEV__` (Expo Go, local dev server)
- Running on web (Bluetooth not available in browsers)
- `react-native-ble-plx` native module is not found (Expo Go)

During the Ritual's "Awaiting Scale" step, a simulated stable reading fires after 2 seconds. To test with a real physical scale, use a **dev build** (see Option B above) and disable mock mode:

```ts
// src/services/bleListener.ts
export let MOCK_MODE = __DEV__ || BleManagerClass === null;
//                     ↑ change to: false
```

Or call `setMockMode(false)` from a debug menu at runtime.

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
