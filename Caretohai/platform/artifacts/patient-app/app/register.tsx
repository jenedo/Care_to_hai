import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (res.status === 409) {
        setError("An account with this email already exists. Please log in.");
        setLoading(false);
        return;
      }

      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      const { token, patient } = json.data;
      const ok = await login(patient.email, password);
      if (ok) {
        router.replace("/(tabs)");
      } else {
        setError("Account created! Please log in.");
        setLoading(false);
        router.replace("/login");
      }
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0284C7", "#0EA5E9", "#38BDF8"]}
      style={[styles.gradient, { paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <View style={styles.logoWrap}>
              <Feather name="heart" size={32} color="#fff" />
            </View>
            <Text style={styles.brand}>AsaanCare</Text>
            <Text style={styles.tagline}>صحت آپکے گھر</Text>
          </View>

          <View style={styles.card}>
            <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              نیا اکاؤنٹ بنائیں
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "#FEE2E2" }]}>
                <Feather name="alert-circle" size={14} color="#991B1B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="mail" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="phone" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+92-3001234567"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.replace("/login")} style={styles.loginLink}>
              <Text style={[styles.loginLinkText, { color: colors.mutedForeground }]}>
                Already have an account?{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Login</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  backBtn: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brand: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12 },
  errorText: { color: "#991B1B", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 4 },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  loginLink: { alignItems: "center", paddingVertical: 4 },
  loginLinkText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
