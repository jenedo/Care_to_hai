import { useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";

type VerificationStep = "none" | "email_code" | "second_factor";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>("none");

  const finishSignIn = async (sessionId: string) => {
    await setActive({ session: sessionId });
    router.replace("/(tabs)");
  };

  const handleLogin = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await finishSignIn(result.createdSessionId);
        return;
      }

      if (result.status === "needs_second_factor") {
        setVerificationStep("second_factor");
        Alert.alert(
          "Verification required",
          "Enter the code from your authenticator app.",
        );
        return;
      }

      const emailFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (emailFactor && "emailAddressId" in emailFactor) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
        setVerificationStep("email_code");
        Alert.alert("Check your email", "We sent you a verification code.");
        return;
      }

      Alert.alert(
        "Additional verification required",
        "Complete the verification step shown by Clerk, then try again.",
      );
    } catch (err: any) {
      Alert.alert("Login Failed", err.errors?.[0]?.message || "Check email and password");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn || !code.trim()) return;
    setLoading(true);
    try {
      let result;
      if (verificationStep === "email_code") {
        result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });
      } else {
        result = await signIn.attemptSecondFactor({
          strategy: "totp",
          code: code.trim(),
        });
      }

      if (result.status === "complete" && result.createdSessionId) {
        await finishSignIn(result.createdSessionId);
        return;
      }

      Alert.alert("Verification failed", "Invalid or expired code. Try again.");
    } catch (err: any) {
      Alert.alert("Verification failed", err.errors?.[0]?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  if (verificationStep !== "none") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify your account</Text>
        <Text style={styles.subtitle}>
          {verificationStep === "email_code"
            ? "Enter the code sent to your email"
            : "Enter your authenticator code"}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={handleVerifyCode} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setVerificationStep("none")} style={styles.linkBtn}>
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AsaanCare Doctor</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0ea5e9",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0ea5e9",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#0ea5e9", fontSize: 14 },
});
