import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, ClerkLoaded, useAuth as useClerkAuthHook } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { setAuthTokenGetter, setBaseUrl } from "@asaancare/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (process.env.EXPO_PUBLIC_API_URL) {
  setBaseUrl(process.env.EXPO_PUBLIC_API_URL);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function ClerkApiAuth() {
  const { getToken } = useClerkAuthHook();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function RootLayoutNav() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const colors = useColors();

  useEffect(() => {
    if (isLoading) return;
    const inTabs = segments[0] === "(tabs)";
    const inAuth = segments[0] === "login" || segments[0] === "register" || segments[0] === "index";
    if (!isLoggedIn && inTabs) {
      router.replace("/login");
    } else if (isLoggedIn && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn, isLoading, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="appointment/[id]"
          options={{
            headerShown: true,
            title: "Appointment",
            headerStyle: { backgroundColor: colors.navBackground },
            headerTintColor: colors.navForeground,
            headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          }}
        />
        <Stack.Screen
          name="doctor/[id]"
          options={{
            headerShown: true,
            title: "Doctor Profile",
            headerStyle: { backgroundColor: colors.navBackground },
            headerTintColor: colors.navForeground,
            headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError || Platform.OS === "web") {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ErrorBoundary>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <QueryClientProvider client={queryClient}>
                <ClerkApiAuth />
                <AuthProvider>
                  <RootLayoutNav />
                </AuthProvider>
              </QueryClientProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ErrorBoundary>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
