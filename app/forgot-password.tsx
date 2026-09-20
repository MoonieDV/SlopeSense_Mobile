import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { getFirebaseAuthMessage, sendPasswordReset } from "@/lib/firebase-auth";

const GREEN = "#006B3C";
const DEEP_GREEN = "#004F2D";
const INK = "#111827";
const MUTED = "#6B7280";
const BORDER = "#D7DCE1";
const ERROR = "#B42318";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentTranslate, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentTranslate]);

  const handleSubmit = async () => {
    setSubmitted(true);
    setMessage("");
    setIsSuccess(false);
    if (!email.trim()) {
      setMessage("Enter your email address to continue.");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setIsSuccess(true);
      setMessage("If an account exists for this email, a password reset link has been sent.");
    } catch (error) {
      setMessage(getFirebaseAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const emailError = submitted && !email.trim();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={styles.brandRow}><MaterialIcons name="terrain" size={38} color="#FFFFFF" /><Text style={styles.brandName}>SlopeSense</Text></View>
            <View style={styles.waveBack} /><View style={styles.waveFront} />
          </View>

          <Animated.View style={[styles.formShell, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
            <View style={styles.iconCircle}><MaterialIcons name="lock-reset" size={31} color={GREEN} /></View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>Enter your email and we&apos;ll send you a link to change your password.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrap, emailError && styles.inputError]}>
                <MaterialIcons name="mail-outline" size={19} color={emailError ? ERROR : MUTED} />
                <TextInput ref={emailRef} value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#7B818A" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleSubmit} style={styles.input} accessibilityLabel="Email address" />
              </View>

              <Pressable onPress={handleSubmit} disabled={isLoading} style={({ pressed }) => [styles.sendButton, pressed && styles.buttonPressed, isLoading && styles.disabledButton]} accessibilityRole="button" accessibilityLabel="Send password reset email">
                {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>Send Reset Link</Text>}
              </Pressable>
              {!!message && <Text style={[styles.feedback, !isSuccess && styles.feedbackError]} accessibilityLiveRegion="polite">{message}</Text>}
            </View>

            <Pressable onPress={() => router.replace("/" as RelativePathString)} style={({ pressed }) => [styles.backToLogin, pressed && styles.pressed]} accessibilityRole="button"><MaterialIcons name="arrow-back" size={16} color={GREEN} /><Text style={styles.backToLoginText}>Back to Login</Text></Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: "#FFFFFF", paddingBottom: 22 },
  hero: { height: 118, backgroundColor: DEEP_GREEN, overflow: "hidden", position: "relative", justifyContent: "center", alignItems: "center" },
  backButton: { position: "absolute", left: 17, top: 17, zIndex: 3, padding: 3 },
  brandRow: { zIndex: 3, flexDirection: "row", alignItems: "center", gap: 8, marginTop: -9 },
  brandName: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  waveBack: { position: "absolute", left: -40, right: -40, bottom: -72, height: 110, borderRadius: 100, backgroundColor: "#F2F7F4" },
  waveFront: { position: "absolute", left: -40, right: -40, bottom: -88, height: 116, borderRadius: 100, backgroundColor: "#FFFFFF" },
  formShell: { flex: 1, paddingHorizontal: 25, alignItems: "center" },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EAF6ED", alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 13 },
  title: { color: INK, fontSize: 21, lineHeight: 28, fontWeight: "800" },
  subtitle: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 310, marginTop: 4, marginBottom: 25 },
  form: { width: "100%", maxWidth: 420 },
  label: { color: INK, fontSize: 11, fontWeight: "700", marginBottom: 5 },
  inputWrap: { height: 48, borderWidth: 1, borderColor: BORDER, borderRadius: 7, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  inputError: { borderColor: ERROR },
  input: { flex: 1, color: INK, fontSize: 12, marginLeft: 9, paddingVertical: 0 },
  sendButton: { height: 48, borderRadius: 7, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", marginTop: 17, shadowColor: GREEN, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sendText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  disabledButton: { opacity: 0.75 },
  buttonPressed: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  feedback: { color: GREEN, textAlign: "center", fontSize: 11, lineHeight: 16, marginTop: 10 },
  feedbackError: { color: ERROR },
  backToLogin: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 28 },
  backToLoginText: { color: GREEN, fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});