import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { useState } from "react";
import {
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

import { ScreenContainer } from "@/components/screen-container";
import { changeCurrentUserPassword, getChangePasswordMessage } from "@/lib/firebase-auth";

const colors = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#111827",
  muted: "#5F6368",
  border: "#E1E5E7",
  paleGreen: "#EAF6ED",
  error: "#B42318",
};

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  autoComplete: "current-password" | "new-password";
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
};

function PasswordField({
  label,
  value,
  visible,
  autoComplete,
  onChangeText,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={autoComplete === "current-password" ? "password" : "newPassword"}
          style={styles.input}
          accessibilityLabel={label}
          returnKeyType={autoComplete === "current-password" ? "next" : "done"}
        />
        <Pressable
          onPress={onToggleVisibility}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        >
          <MaterialIcons name={visible ? "visibility-off" : "visibility"} size={20} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    setMessage("");
    setIsSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Complete all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Use a new password with at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setMessage("Choose a new password that is different from your current password.");
      return;
    }

    setIsSaving(true);
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsSuccess(true);
      setMessage("Your password has been changed successfully.");
    } catch (error) {
      setMessage(getChangePasswordMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Change Password</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <MaterialIcons name="lock-outline" size={31} color={colors.green} />
              </View>
              <View style={styles.introCopy}>
                <Text style={styles.title}>Secure your account</Text>
                <Text style={styles.subtitle}>Enter your current password before choosing a new one.</Text>
              </View>
            </View>

            <View style={styles.form}>
              <PasswordField
                label="Current Password"
                value={currentPassword}
                visible={showCurrentPassword}
                autoComplete="current-password"
                onChangeText={setCurrentPassword}
                onToggleVisibility={() => setShowCurrentPassword((visible) => !visible)}
              />
              <PasswordField
                label="New Password"
                value={newPassword}
                visible={showNewPassword}
                autoComplete="new-password"
                onChangeText={setNewPassword}
                onToggleVisibility={() => setShowNewPassword((visible) => !visible)}
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                visible={showConfirmPassword}
                autoComplete="new-password"
                onChangeText={setConfirmPassword}
                onToggleVisibility={() => setShowConfirmPassword((visible) => !visible)}
              />
              <Text style={styles.hint}>Your new password must contain at least 6 characters.</Text>
            </View>

            <Pressable
              onPress={submit}
              disabled={isSaving}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, isSaving && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel="Change password"
            >
              <Text style={styles.saveText}>{isSaving ? "Changing Password..." : "Change Password"}</Text>
            </Pressable>

            {!!message && (
              <View style={[styles.messageBox, isSuccess ? styles.successBox : styles.errorBox]}>
                <MaterialIcons
                  name={isSuccess ? "check-circle" : "error-outline"}
                  size={18}
                  color={isSuccess ? colors.green : colors.error}
                />
                <Text style={[styles.message, isSuccess && styles.successMessage]}>{message}</Text>
              </View>
            )}

            {isSuccess && (
              <Pressable onPress={() => router.replace("/profile" as RelativePathString)} style={styles.returnButton} accessibilityRole="button">
                <Text style={styles.returnText}>Return to Profile</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { height: 54, paddingHorizontal: 16, backgroundColor: colors.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  headerSpacer: { width: 22 },
  scrollContent: { padding: 18, paddingBottom: 100 },
  intro: { flexDirection: "row", alignItems: "center", paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#EDF0F1" },
  introIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center", marginRight: 14 },
  introCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  form: { marginTop: 20 },
  fieldBlock: { marginBottom: 15 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  inputWrap: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  input: { flex: 1, color: colors.ink, fontSize: 13, marginHorizontal: 10, paddingVertical: 8 },
  hint: { color: colors.muted, fontSize: 11, marginTop: -4 },
  saveButton: { height: 46, borderRadius: 8, marginTop: 20, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.65 },
  messageBox: { minHeight: 46, borderRadius: 8, borderWidth: 1, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center" },
  errorBox: { backgroundColor: "#FEF3F2", borderColor: "#FECDCA" },
  successBox: { backgroundColor: colors.paleGreen, borderColor: "#B7DEC4" },
  message: { flex: 1, color: colors.error, fontSize: 12, lineHeight: 17, marginLeft: 8 },
  successMessage: { color: colors.green },
  returnButton: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  returnText: { color: colors.green, fontSize: 12, fontWeight: "800" },
});
