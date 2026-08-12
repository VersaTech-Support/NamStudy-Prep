# Build & Deployment Guide

This guide covers everything you need to set up, build, and deploy the NamStudy Prep application (v1.0.0).

## 1. Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [EAS CLI](https://expo.dev/eas) (`npm install -g eas-cli`)
- A [Supabase](https://supabase.com/) account and project
- A [RevenueCat](https://www.revenuecat.com/) account (for VIP Subscriptions)

## 2. Local Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Open your Supabase Dashboard.
   - Run the provided SQL migration script (`schools_migration.sql`) in the SQL Editor to create the necessary tables and Row Level Security (RLS) policies.
   - Create the following **Public Storage Buckets**:
     - `avatars` (For user profile pictures)
     - `school-logos` (For custom school hub branding)
     - `papers` (For blank past exam PDFs)
     - `solutions` (For worked solution PDFs)
   - Copy your Project URL and anon/public API Key.
   - Update `lib/supabase.ts` with your actual credentials.

3. **Start the Development Server**
   ```bash
   npx expo start
   ```
   Press `w` to open in the browser, `i` for iOS simulator, or `a` for Android emulator.

## 3. Building for Production

This project is configured to use Expo Application Services (EAS) for cloud builds. 

1. **Login to Expo**
   ```bash
   eas login
   ```

2. **Configure the Project**
   Ensure the `projectId` in `app.json` matches your Expo project.

3. **Trigger a Cloud Build**
   To build a production-ready APK for Android:
   ```bash
   eas build --platform android --profile production
   ```
   
   To build for iOS (requires an Apple Developer Account):
   ```bash
   eas build --platform ios --profile production
   ```

## 4. Web Deployment

To export the web version of the application as static files:
```bash
npm run build
```
This runs `npx expo export --platform web --clear`, outputting the bundled files to the `dist` directory, which can be deployed to any static host (Vercel, Netlify, Firebase Hosting, etc.).

## 5. Version Control Notice

**Important:** The application version is currently locked at `v1.0.0`. Do not increment this version number in `package.json` or `app.json` without verifying the entire upgrade path and Supabase schema compatibility.
