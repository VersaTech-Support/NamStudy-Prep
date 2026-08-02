import { Stack } from "expo-router";
import { UserProvider } from "@/context/UserContext";
import { StatusBar } from "expo-status-bar";

// Polyfill fetch to prevent Supabase from trying to import @supabase/node-fetch
if (typeof globalThis.fetch === 'undefined') {
  // @ts-ignore
  globalThis.fetch = fetch;
}

export default function RootLayout() {
  return (
    <UserProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="quiz/[topic]"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="payment"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="tutor" options={{ headerShown: false }} />

      </Stack>
    </UserProvider>
  );
}