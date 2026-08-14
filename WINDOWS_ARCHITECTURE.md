# Windows Architecture Decision

**Date:** 2026-08-14
**Project:** NamibStudy Prep

## 1. Context and Constraints

- **React Native Mismatch:** The core Expo project uses React Native 0.86.2 and Expo SDK ~57.0.12. React Native Windows' currently supported stable release is 0.84.x (though 0.86 targets may exist, 0.84 is the verified safe path).
- **Expo Managed State:** The project is a pure managed Expo project with no existing `android/` or `ios/` folders.
- **Dependency Limitations:** RevenueCat (`react-native-purchases`) and certain Expo modules do not support Windows.
- **Rule of Thumb:** We cannot downgrade the main project, break Android/Web, or pollute the root `package.json` with incompatible React Native Windows dependencies. We also must absolutely avoid build artifact contamination or mixed package configuration.

## 2. Architecture Selection: Sibling Project Repository

We will adopt a **Sibling Project Architecture**. 

Instead of adding a `windows-app` folder inside the current repository, we will create a completely separate project directory `NamStudy-Prep-Windows` alongside the existing project.

### Why this is the safest approach:
1. **Total Build Isolation:** The Windows project has its own completely independent `package.json`, lockfile, build artifacts, MSIX configuration, and Store metadata.
2. **Zero Contamination:** Building the Windows native app will never write native files, lockfiles, or metadata into the Android/Web repository.
3. **Independent Versioning:** The Windows App can iterate (e.g., v1.0.0) independently from the Mobile App (e.g., v2.0.0).
4. **Controlled Source Sharing:** We will share specific TypeScript models, contexts, reusable UI components, and business logic by referencing the source directory from `NamStudy-Prep` through a local workspace/package reference or Metro configuration in the Windows project.

### Structure Diagram

```text
C:\Users\rouxn\source\repos\
│
├── NamStudy-Prep\                 ← EXISTING PROJECT (Untouched)
│   ├── app\
│   ├── components\
│   ├── context\
│   ├── assets\
│   ├── package.json               ← Expo 57 / RN 0.86.2
│   └── app.json
│
└── NamStudy-Prep-Windows\         ← NEW, SEPARATE PROJECT
    ├── windows\                   ← Generated Native VS Project
    ├── src\                       ← Windows entry points & shell
    ├── shims\                     ← Windows-specific mock implementations
    ├── assets\                    ← Store assets and metadata
    ├── package.json               ← RN 0.84.x, RNW 0.84.x
    └── metro.config.js            ← Configured to consume shared source from NamStudy-Prep
```

## 3. Handling Shared Dependencies

- **UI & Logic:** The Windows project will own its native navigation shell, UI adaptations, and entry points. We will selectively import shared business logic, types, Supabase services, auth logic, and reusable components from `NamStudy-Prep`. We will *not* import the raw `app/` folder verbatim to avoid Expo 57 module conflicts in the RN 0.84 runtime.
- **RevenueCat:** The Windows project will provide a real abstraction—not a fake RevenueCat implementation—explicitly reporting whatever Windows-supported subscription behavior is appropriate without returning fabricated Pro entitlements.
- **Routing:** Windows will have its own navigation shell (e.g. standard React Navigation or a Windows-safe routing layer) to host the imported screens and adjust the UX for desktop.

## 4. Bootstrapping Strategy

1. Create directory `../NamStudy-Prep-Windows`.
2. Initialize it as a standard React Native 0.84 project.
3. Install `react-native-windows@0.84.x`.
4. Configure `metro.config.js` in the Windows project to reference the `NamStudy-Prep` sibling directory.
5. Create initial Windows-specific entry points and shims for unsupported native modules.
