# Building the NamMath Prep Android APK

Since you are using Expo, the recommended way to generate an APK is via **Expo Application Services (EAS)**.

## Prerequisites
1.  **Expo Account**: You need an account at [expo.dev](https://expo.dev).
2.  **EAS CLI**: Install it globally if you haven't:
    ```bash
    npm install -g eas-cli
    ```
3.  **Login**:
    ```bash
    eas login
    ```

## Step 1: Configure EAS Build
Run the following command in the project root to initialize the build configuration:
```bash
eas build:configure
```
Select **Android** when prompted.

## Step 2: Create a Build Profile
Open the generated `eas.json` and ensure you have a `preview` or `production` profile configured to output an APK (instead of an AAB for the Play Store).

Example `eas.json` snippet:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

## Step 3: Run the Build
Run this command to start the build on Expo's servers:
```bash
eas build -p android --profile preview
```

## Step 4: Download and Install
Once the build is complete, Expo will provide a URL to download the `.apk` file. You can:
1.  Download it directly to your phone.
2.  Scan the QR code provided in the terminal.

---

## Local Build (Alternative)
If you prefer to build locally (requires Android Studio and Java), you can use:
```bash
npx expo run:android --variant release
```
*Note: This is more complex to set up than EAS Build.*
