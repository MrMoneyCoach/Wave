import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Button, Card, ErrorBox, Field, Heading, Muted } from "@/components/ui";
import { spacing } from "@/lib/theme";

export default function ConfigScreen() {
  const router = useRouter();
  const { setConfig } = useAuth();
  const [webUrl, setWebUrl] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!webUrl || !supabaseUrl || !supabaseAnonKey) {
      setError("All three values are required.");
      return;
    }
    setBusy(true);
    try {
      await setConfig({
        webUrl: webUrl.trim(),
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim(),
      });
      router.replace("/sign-in");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Connect to Recap" }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Heading>Connect</Heading>
          <Muted>
            Point the app at your deployed Recap server and Supabase project. You can find these
            three values in the recap web app&apos;s README or .env.
          </Muted>
        </View>
        <Card>
          <Field
            label="Web URL"
            value={webUrl}
            onChangeText={setWebUrl}
            placeholder="https://recap.example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Field
            label="Supabase URL"
            value={supabaseUrl}
            onChangeText={setSupabaseUrl}
            placeholder="https://xxxx.supabase.co"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Field
            label="Supabase anon key"
            value={supabaseAnonKey}
            onChangeText={setSupabaseAnonKey}
            placeholder="eyJh..."
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={3}
          />
          {error && <ErrorBox>{error}</ErrorBox>}
          <Button label="Connect" onPress={save} loading={busy} />
        </Card>
      </ScrollView>
    </>
  );
}
