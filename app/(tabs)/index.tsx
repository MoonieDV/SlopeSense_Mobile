import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { requestPostAuthPermissions } from "@/lib/device-location";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import AnimatedWavyHeader from "@/components/AnimatedWavyHeader";
import { type RelativePathString, useRouter } from "expo-router";
import { getFirebaseAuthMessage, loginWithEmail } from "@/lib/firebase-auth";

const GREEN = "#006B3C";
const DEEP_GREEN = "#004F2D";
const INK = "#111827";
const MUTED = "#6B7280";
const BORDER = "#D7DCE1";
const ERROR = "#B42318";

export default function HomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(-12)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroTranslate, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(contentTranslate, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [contentOpacity, contentTranslate, heroOpacity, heroTranslate]);

  const press = async (action?: () => void) => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action?.();
  };

  const handleLogin = async () => {
    setSubmitted(true);
    setMessage("");
    if (!email.trim() || !password.trim()) {
      setMessage("Enter your email and password to continue.");
      return;
    }
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      await requestPostAuthPermissions();
      router.replace("/dashboard" as RelativePathString);
    } catch (error) {
      setMessage(getFirebaseAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const emailError = submitted && !email.trim();
  const passwordError = submitted && !password.trim();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white" systemBarColor="#006F3F">
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }]}>
            <AnimatedWavyHeader />
          </Animated.View>

          <Animated.View style={[styles.formShell, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
            <View style={styles.headingBlock}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Please login to continue.</Text>
            </View>

            <View style={styles.form}>
              <View style={[styles.inputWrap, emailError && styles.inputError]}>
                <MaterialIcons name="mail-outline" size={20} color={emailError ? ERROR : MUTED} />
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#7B818A"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  style={styles.input}
                  accessibilityLabel="Email address"
                />
              </View>

              <View style={[styles.inputWrap, passwordError && styles.inputError]}>
                <MaterialIcons name="lock-outline" size={20} color={passwordError ? ERROR : MUTED} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#7B818A"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={styles.input}
                  accessibilityLabel="Password"
                />
                <Pressable onPress={() => press(() => setShowPassword((value) => !value))} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                  <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={MUTED} />
                </Pressable>
              </View>

              <Pressable onPress={() => press(() => router.push("/forgot-password" as RelativePathString))} style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>

              <Pressable onPress={() => press(handleLogin)} disabled={isLoading} style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed, isLoading && styles.disabledButton]} accessibilityRole="button" accessibilityLabel="Login">
                {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginText}>Login</Text>}
              </Pressable>

              {!!message && <Text style={[styles.feedback, message.startsWith("Enter") && styles.feedbackError]} accessibilityLiveRegion="polite">{message}</Text>}

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.divider} />
              </View>

              <Pressable onPress={() => press(() => setMessage("Google sign-in will be connected next."))} style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]} accessibilityRole="button" accessibilityLabel="Continue with Google">
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don’t have an account?</Text>
              <Pressable onPress={() => press(() => router.push("/register"))} style={({ pressed }) => [pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.registerLink}>Register</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: "#FFFFFF", paddingBottom: 22 },
  hero: { height: 205, backgroundColor: DEEP_GREEN, overflow: "hidden", position: "relative" },
  formShell: { flex: 1, paddingHorizontal: 25, alignItems: "center" },
  headingBlock: { alignItems: "center", marginTop: 6, marginBottom: 24 },
  title: { color: INK, fontSize: 21, lineHeight: 28, fontWeight: "800" },
  subtitle: { color: "#20242A", fontSize: 12, lineHeight: 18, marginTop: 1 },
  form: { width: "100%", maxWidth: 420 },
  inputWrap: { height: 48, borderWidth: 1, borderColor: BORDER, borderRadius: 7, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", marginBottom: 10, backgroundColor: "#FFFFFF" },
  inputError: { borderColor: ERROR },
  input: { flex: 1, color: INK, fontSize: 12, marginLeft: 9, paddingVertical: 0 },
  forgotButton: { alignSelf: "flex-end", paddingVertical: 3, paddingHorizontal: 1, marginTop: -2, marginBottom: 17 },
  forgotText: { color: GREEN, fontSize: 11, fontWeight: "700" },
  loginButton: { height: 48, borderRadius: 7, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", shadowColor: GREEN, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  loginText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  disabledButton: { opacity: 0.75 },
  buttonPressed: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  pressed: { opacity: 0.65 },
  feedback: { color: GREEN, textAlign: "center", fontSize: 11, marginTop: 8 },
  feedbackError: { color: ERROR },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 11, marginVertical: 17 },
  divider: { flex: 1, height: 1, backgroundColor: "#D7DCE1" },
  orText: { color: "#464C55", fontSize: 10 },
  googleButton: { height: 48, borderRadius: 7, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, backgroundColor: "#FFFFFF" },
  googleG: { color: "#4285F4", fontSize: 19, fontWeight: "900" },
  googleText: { color: INK, fontSize: 12, fontWeight: "600" },
  registerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 25 },
  registerPrompt: { color: "#20242A", fontSize: 11 },
  registerLink: { color: GREEN, fontSize: 11, fontWeight: "700" },
});
