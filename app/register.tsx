import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { type RelativePathString, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { getFirebaseAuthMessage, registerWithEmail } from "@/lib/firebase-auth";

const GREEN = "#006B3C";
const DEEP_GREEN = "#004F2D";
const INK = "#111827";
const MUTED = "#6B7280";
const BORDER = "#D7DCE1";
const ERROR = "#B42318";

type FieldProps = {
  label: string;
  placeholder: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  error?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
};

function RegisterField({ label, placeholder, icon, value, onChangeText, keyboardType = "default", secureTextEntry, rightIcon, onRightPress, error, inputRef, onSubmitEditing }: FieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <MaterialIcons name={icon} size={17} color={error ? ERROR : MUTED} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#7B818A"
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          returnKeyType={onSubmitEditing ? "next" : "done"}
          onSubmitEditing={onSubmitEditing}
          style={styles.input}
          accessibilityLabel={label}
        />
        {rightIcon && onRightPress && (
          <Pressable onPress={onRightPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={secureTextEntry ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}>
            <MaterialIcons name={rightIcon} size={17} color={MUTED} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentTranslate, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentTranslate]);

  const tap = async (action?: () => void) => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action?.();
  };

  const handleRegister = async () => {
    setSubmitted(true);
    setMessage("");
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      setMessage("Complete all fields to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await registerWithEmail(email, password, `${firstName.trim()} ${lastName.trim()}`, phone.trim());
      router.replace("/dashboard" as RelativePathString);
    } catch (error) {
      setMessage(getFirebaseAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const missing = (value: string) => submitted && !value.trim();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white" systemBarColor={DEEP_GREEN}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.headerRow}>
              <View style={styles.headerSpacer} />
              <View style={styles.brandRow}>
                <Image source={require("@/assets/images/logo_icon.png")} style={styles.brandIcon} resizeMode="contain" accessibilityLabel="SlopeSense mountain logo" />
                <Text style={styles.brandName}>Create Account</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          <Animated.View style={[styles.formShell, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
            <View style={styles.introRow}>
              <View style={styles.introCopy}>
                <Text style={styles.title}>Create your Account</Text>
                <Text style={styles.subtitle}>Fill in your details to get started.</Text>
              </View>
              <Image source={require("@/assets/images/register_mountain_icon.png")} style={styles.mountainBadge} resizeMode="contain" accessibilityLabel="Register mountain illustration" />
            </View>

            <View style={styles.form}>
              <RegisterField label="First Name" placeholder="Enter your first name" icon="person-outline" value={firstName} onChangeText={setFirstName} error={missing(firstName)} inputRef={undefined} onSubmitEditing={() => lastNameRef.current?.focus()} />
              <RegisterField label="Last Name" placeholder="Enter your last name" icon="person-outline" value={lastName} onChangeText={setLastName} error={missing(lastName)} inputRef={lastNameRef} onSubmitEditing={() => emailRef.current?.focus()} />
              <RegisterField label="Email" placeholder="Enter your email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" error={missing(email)} inputRef={emailRef} onSubmitEditing={() => phoneRef.current?.focus()} />
              <RegisterField label="Phone Number" placeholder="Enter your phone number" icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={missing(phone)} inputRef={phoneRef} onSubmitEditing={() => passwordRef.current?.focus()} />
              <RegisterField label="Password" placeholder="Enter your password" icon="lock-outline" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} rightIcon={showPassword ? "visibility" : "visibility-off"} onRightPress={() => tap(() => setShowPassword((value) => !value))} error={missing(password)} inputRef={passwordRef} onSubmitEditing={() => confirmRef.current?.focus()} />
              <RegisterField label="Confirm Password" placeholder="Confirm your password" icon="lock-outline" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} rightIcon={showConfirm ? "visibility" : "visibility-off"} onRightPress={() => tap(() => setShowConfirm((value) => !value))} error={missing(confirmPassword)} inputRef={confirmRef} onSubmitEditing={handleRegister} />

              <Pressable onPress={() => tap(handleRegister)} disabled={isLoading} style={({ pressed }) => [styles.registerButton, pressed && styles.buttonPressed, isLoading && styles.disabledButton]} accessibilityRole="button" accessibilityLabel="Register">
                {isLoading ? <Text style={styles.registerText}>Creating…</Text> : <Text style={styles.registerText}>Register</Text>}
              </Pressable>
              {!!message && <Text style={[styles.feedback, message.includes("Complete") || message.includes("match") ? styles.feedbackError : null]} accessibilityLiveRegion="polite">{message}</Text>}
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already have an account?</Text>
              <Pressable onPress={() => tap(() => router.replace("/"))} style={({ pressed }) => [pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.loginLink}>Login</Text>
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
  scrollContent: { flexGrow: 1, backgroundColor: "#FFFFFF", paddingBottom: 20 },
  hero: { height: 92, backgroundColor: DEEP_GREEN, justifyContent: "center" },
  headerRow: { zIndex: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: -2 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandName: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  brandIcon: { width: 36, height: 36 },
  headerSpacer: { width: 32 },
  formShell: { flex: 1, paddingHorizontal: 25, alignItems: "center" },
  introRow: { width: "100%", maxWidth: 420, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 9, marginBottom: 5 },
  introCopy: { flex: 1 },
  title: { color: INK, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  subtitle: { color: "#20242A", fontSize: 10, lineHeight: 14, marginTop: 1 },
  mountainBadge: { width: 74, height: 49, marginTop: -5, marginRight: -7 },
  form: { width: "100%", maxWidth: 420 },
  fieldBlock: { marginBottom: 7 },
  fieldLabel: { color: INK, fontSize: 9, lineHeight: 12, fontWeight: "700", marginBottom: 3 },
  inputWrap: { height: 40, borderWidth: 1, borderColor: BORDER, borderRadius: 6, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  inputError: { borderColor: ERROR },
  input: { flex: 1, color: INK, fontSize: 11, marginLeft: 8, paddingVertical: 0 },
  registerButton: { height: 43, borderRadius: 6, marginTop: 5, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", shadowColor: GREEN, shadowOpacity: 0.14, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  registerText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  disabledButton: { opacity: 0.75 },
  buttonPressed: { transform: [{ scale: 0.975 }], opacity: 0.9 },
  pressed: { opacity: 0.65 },
  feedback: { color: GREEN, textAlign: "center", fontSize: 10, marginTop: 7 },
  feedbackError: { color: ERROR },
  loginRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 13 },
  loginPrompt: { color: "#20242A", fontSize: 10 },
  loginLink: { color: GREEN, fontSize: 10, fontWeight: "700" },
});
