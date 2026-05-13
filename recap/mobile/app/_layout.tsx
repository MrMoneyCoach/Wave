import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.paper },
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: colors.paper },
            headerShadowVisible: false,
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
