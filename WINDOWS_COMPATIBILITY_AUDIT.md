# Windows Compatibility Audit

**Date:** 2026-08-14
**Project:** NamibStudy Prep

## 1. Current Environment state

| Component | Current Version | Notes |
|---|---|---|
| **Expo SDK** | ~57.0.12 | Managed workflow. No `android/` or `ios/` folders present. |
| **React Native** | 0.86.2 | Newer than the current RN Windows release (0.84.x). |
| **React** | 19.2.3 | |
| **Expo Router** | ~57.0.12 | Handles all navigation. |
| **New Architecture** | Implicit (On) | Expo SDK 57 and RN 0.86 use New Architecture (Fabric) by default. RN Windows 0.82+ also requires Fabric. |
| **Hermes** | Implicit (On) | Default in Expo/React Native. |
| **Metro** | Custom config | Minimal config using `expo/metro-config`. Web is using `output: static`. |

## 2. Dependency Windows Support

| Package | Current Version | Windows Support | Notes & Actions Required |
|---|---|---|---|
| `@supabase/supabase-js` | ^2.49.4 | ✅ Yes | Fetch-based. Needs to ensure the custom `supabase.ts` window fix isn't broken. |
| `@react-native-async-storage/async-storage` | 2.2.0 | ✅ Yes | Supports Windows natively. |
| `react-native-purchases` | ^10.6.0 | ❌ No | RevenueCat lacks official Windows support. **Action:** Must provide a stub/mock or gracefully disable payments on Windows via platform-specific extensions (`.windows.tsx` or similar) to prevent compilation/runtime crashes. |
| `react-native-webview` | 13.16.1 | ✅ Yes | Supports Windows. |
| `react-native-reanimated` | 4.5.1 | ⚠️ Partial/Yes | Windows support exists but may require C++ workload installations or specific Fabric config. |
| `react-native-safe-area-context` | ~5.7.0 | ✅ Yes | |
| `react-native-screens` | ~4.26.0 | ✅ Yes | |
| `expo-document-picker` | ~57.0.1 | ❌/⚠️ | Expo native modules have mixed Windows support. |
| `expo-image` | ~57.0.2 | ❌/⚠️ | May fallback to React Native `Image` or need `react-native-image` mock. |
| `expo-splash-screen` | ~57.0.6 | ❌ No | Windows native project will handle its own splash screen. |
| `expo-status-bar` | ~57.0.1 | ❌ No | Ignored on Windows. |
| `expo-web-browser` | ~57.0.2 | ⚠️ | May need a `Linking.openURL` fallback for Windows. |

## 3. Risks & Architectural Conflicts

### React Native Version Mismatch
The project is using **React Native 0.86.2**, but the current known React Native Windows release is **0.84.x**. Attempting to install `react-native-windows@0.84.x` directly into this project will cause severe peer-dependency conflicts with React Native 0.86.2 and React 19, potentially destabilizing Android and Web.

### Expo Managed Workflow
The project is currently entirely managed by Expo. Adding `react-native-windows` directly to an Expo managed project is not officially supported by Expo CLI, and initializing Windows in the root may conflict with Expo's auto-generated structures or metro configurations.

### RevenueCat / Missing Native Modules
Modules like `react-native-purchases` will break the Windows build. We will need platform shims or to isolate payment logic behind a service interface.

## 4. Proposed Solution Direction

To satisfy the **Anti-Regression Rules** and **Stability** directives, we cannot downgrade React Native/Expo to 0.84, as it risks breaking the existing apps. 

Instead, we should implement a **Separate Windows Shell Architecture** within the repository.
- A `windows-app/` or `windows/` directory is created (potentially as a yarn workspace or simple independent package).
- It contains its own `package.json` locking React Native to 0.84.x and React to the compatible 18.x/19.x version required by RN 0.84.
- It shares code from the root project via Metro workspace/symlink configurations, consuming the existing `components/`, `app/`, `context/`, etc.
- Platform-specific files (e.g. mock services for RevenueCat) will be injected or overridden so the Windows app can build without crashing.

*Proceed to `WINDOWS_ARCHITECTURE.md` and Implementation Plan for the concrete design.*
