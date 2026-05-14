import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Button, Card, ErrorBox, Field, Heading, Muted } from "@/components/ui";
import { spacing } from "@/lib/theme";

export default function SignInScreen() {
  const { supabase, resetConfig } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) {
    router.replace("/config");
    return null;
  }

  async function sendCode() {
    setError(null);
    setBusy(true);
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setPhase("code");
  }

  async function verify() {
    setError(null);
    setBusy(true);
    const { error } = await supabase!.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/home");
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sign in" }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Heading>Sign in</Heading>
          <Muted>
            {phase === "email"
              ? "We'll email you a 6-digit code. No password to remember."
              : `Check ${email} and paste the 6-digit code below.`}
          </Muted>
        </View>
        <Card>
          {phase === "email" ? (
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          ) : (
            <Field
              label="6-digit code"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
            />
          )}
          {error && <ErrorBox>{error}</ErrorBox>}
          {phase === "email" ? (
            <Button label="Send code" onPress={sendCode} loading={busy} disabled={!email} />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Button label="Sign in" onPress={verify} loading={busy} disabled={code.length < 6} />
              <Button label="Use a different email" variant="secondary" onPress={() => { setPhase("email"); setCode(""); }} />
            </View>
          )}
        </Card>
        <Button label="Reset server connection" variant="secondary" onPress={resetConfig} />
      </ScrollView>
    </>
  );
}
