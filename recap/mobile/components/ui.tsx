import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import type { ReactNode } from "react";
import { colors, radius, spacing } from "@/lib/theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const tone =
    variant === "danger"
      ? { bg: colors.red, fg: "#fff", border: colors.red }
      : variant === "secondary"
        ? { bg: colors.paper2, fg: colors.ink, border: colors.line }
        : { bg: colors.ink, fg: colors.paper, border: colors.ink };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <Text style={[styles.btnLabel, { color: tone.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="rgba(11,11,12,0.35)"
        {...props}
        style={[styles.input, props.style]}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  btnLabel: { fontSize: 15, fontWeight: "500" },
  label: { fontSize: 12, fontWeight: "600", color: colors.ink },
  hint: { fontSize: 12, color: colors.muted },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.paper2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: { fontSize: 22, fontWeight: "600", color: colors.ink },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  errorBox: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redLine,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { color: colors.redInk, fontSize: 13 },
});
