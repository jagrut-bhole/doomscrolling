# DoomScrolling (Reels Tracker) - Architecture & Native Permissions Guide

This guide explains how Instagram Reels tracking works, why **Expo Go** cannot run the background tracking services, and the exact step-by-step solutions to build and run the app on Android.

---

## 1. Why Expo Go Cannot Grant These Permissions

When testing inside the **Expo Go** client, you will notice that Android permissions like **Usage Access**, **Accessibility Service**, and **Display Over Other Apps** cannot be registered or executed:

```
❌ Expo Go Limitations:
- Expo Go is a pre-compiled, sandboxed Android app developed by Expo.
- It only contains standard, bundled Expo APIs (camera, sensors, SQLite, etc.).
- It CANNOT declare custom Android background services in AndroidManifest.xml.
```

### The 3 Required Android Permissions & What They Do:

| Permission | Android API / System Setting | Purpose in Reels Tracker | Can Expo Go Run It? |
| :--- | :--- | :--- | :---: |
| **Usage Access** | `android.permission.PACKAGE_USAGE_STATS` | Detects when `com.instagram.android` is actively open and tracks foreground session duration. | ❌ No |
| **Accessibility Service** | `android.permission.BIND_ACCESSIBILITY_SERVICE` | Listens for vertical swipe / scroll events (`TYPE_VIEW_SCROLLED`) inside Instagram Reels to count each transition. | ❌ No |
| **Display Over Other Apps** | `android.permission.SYSTEM_ALERT_WINDOW` | Renders the real-time floating timer and reel counter badge over Instagram while scrolling. | ❌ No |

Because **AccessibilityService** and **System Overlays** require dedicated native Java/Kotlin services registered in the native Android manifest, Android strictly forbids sandboxed apps like Expo Go from executing them.

---

## 2. The Solutions: Moving from Expo Go to a Native Build

To run the live background Reels tracker on an Android phone, you use an **Expo Development Build**. A Development Build gives you the same instant hot-reloading as Expo Go, but packages your own native `AndroidManifest.xml` and permissions.

You have two simple options:

---

### Option A: Local Development Build (Using Android Studio or Phone)

If you have Android Studio or an Android phone connected via USB debugging:

#### Step 1: Install `expo-dev-client`
Inside `doomScrolling-app`:
```bash
npx expo install expo-dev-client
```

#### Step 2: Generate the Native `android/` Folder
Run Prebuild to generate the native Android project with all permissions configured in `app.json`:
```bash
npx expo prebuild
```

#### Step 3: Run on your Android Device / Emulator
Connect your Android phone with USB debugging enabled, then run:
```bash
npx expo run:android
```
> **What this does**: It compiles a custom debug APK directly onto your phone. Once installed, start Metro with `npx expo start`, and you will have hot-reload with full access to Android Settings, Accessibility Service, and Overlays.

---

### Option B: Cloud Build with EAS (No Android Studio Needed on PC)

If you do not have Android Studio or an Android SDK installed locally, Expo can compile the APK for free in the cloud:

#### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

#### Step 2: Configure EAS Build
Inside `doomScrolling-app`:
```bash
eas build:configure
```

#### Step 3: Build the Android Development APK
```bash
eas build --platform android --profile development
```

#### Step 4: Install and Test
1. EAS will provide a direct download link / QR code for an `.apk` file.
2. Download and install this `.apk` directly onto your Android phone.
3. Open the installed app, run `npx expo start` on your computer, and connect.

---

## 3. How to Grant the Permissions on Your Android Phone

Once your Development Build APK is installed on your Android device:

1. **Usage Access**:
   - Open Android **Settings** → **Apps** → **Special app access** → **Usage access**.
   - Find **doomScrolling** and toggle **Permit usage access** to **ON**.

2. **Accessibility Service**:
   - Open Android **Settings** → **Accessibility** → **Installed services** (or **Downloaded apps**).
   - Find **doomScrolling Reels Tracker** and turn it **ON**.
   - *(Note: On Android 13+, if it says "Restricted setting", go to App Info for doomScrolling → tap the three dots in top-right → tap "Allow restricted settings", then re-enable Accessibility).*

3. **Display Over Other Apps**:
   - Open Android **Settings** → **Apps** → **Special app access** → **Display over other apps**.
   - Toggle **Allow display over other apps** to **ON**.

---

## 4. How to Test the Entire System Right Now in Expo Go

Even without an Android Development build, the entire application has been built with a **built-in testing architecture** so you can develop and validate every screen and backend API right away:

### 1. Test Session Simulator (Built-in)
- On the **Dashboard**, scroll to the bottom to find the **Test Session Simulator**.
- Tap **`+ Simulate 15 min Reels Session (22 Reels)`**.
- This writes realistic test sessions and reel swipe events into SQLite immediately.
- The **Today Overview cards**, **Daily Limit Progress Bar**, **Hourly Bar Graph**, **7-Day Analytics**, and **Recent Sessions** will all recalculate live.

### 2. Test Full Sessions History & Details
- Tap **View All →** or tap the **Sessions** icon on the floating dock.
- Tap any session in the list to open its detailed breakdown (showing duration, pace per reel, start/end timestamps, and reel transition timeline).

### 3. Test Cloud Sync to MongoDB
- Navigate to the **Profile** tab (or **Settings**).
- Tap **Sync SQLite Data to Cloud (MongoDB)**.
- It will send all recorded sessions and events to `POST /api/sync` on the backend, reconcile them in MongoDB, and display a confirmation alert.

### 4. Test Backend APIs
With your backend running (`bun run dev` or `npm run dev` in `doomScrolling-backend`):
- `GET http://localhost:5000/api/dashboard`
- `GET http://localhost:5000/api/sessions`
- `GET http://localhost:5000/api/sessions/:id`
- `POST http://localhost:5000/api/sync`
