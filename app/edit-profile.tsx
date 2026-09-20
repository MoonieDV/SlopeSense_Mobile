import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { firebaseAuth } from "@/lib/firebase";
import { getFirebaseAuthMessage, getUserProfile, updateUserProfile } from "@/lib/firebase-auth";

const colors = { green: "#006B3C", deepGreen: "#004F2D", ink: "#111827", muted: "#5F6368", border: "#E1E5E7", paleGreen: "#EAF6ED", error: "#B42318" };
type FieldProps = { label: string; icon: keyof typeof MaterialIcons.glyphMap; value: string; onChangeText?: (value: string) => void; editable?: boolean; keyboardType?: "default" | "phone-pad" };

function ProfileField({ label, icon, value, onChangeText, editable = true, keyboardType = "default" }: FieldProps) {
  return <View style={styles.fieldBlock}><Text style={styles.fieldLabel}>{label}</Text><View style={[styles.inputWrap, !editable && styles.disabledInput]}><MaterialIcons name={icon} size={18} color={editable ? colors.muted : "#9AA1A7"} /><TextInput value={value} onChangeText={onChangeText} editable={editable} keyboardType={keyboardType} autoCapitalize={label === "Email" ? "none" : "words"} autoCorrect={false} style={styles.input} accessibilityLabel={label} /></View></View>;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) return;
      const storedProfile = await getUserProfile(user.uid);
      setName(user.displayName || storedProfile?.displayName || "");
      setEmail(user.email || storedProfile?.email || "");
      setPhone(storedProfile?.phone || "");
      setAddress(storedProfile?.address || "");
    });
    return unsubscribe;
  }, []);

  const saveProfile = async () => {
    const user = firebaseAuth.currentUser;
    if (!user || !name.trim()) { setMessage("Enter your name to continue."); return; }
    setIsSaving(true);
    setMessage("");
    try {
      await updateUserProfile({ uid: user.uid, displayName: name.trim(), phone: phone.trim(), address: address.trim() });
      router.replace("/profile" as RelativePathString);
    } catch (error) {
      setMessage(getFirebaseAuthMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white"><StatusBar style="light" /><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={styles.screen}><View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back"><MaterialIcons name="arrow-back" size={22} color="#FFFFFF" /></Pressable><Text style={styles.headerTitle}>Edit Profile</Text><View style={styles.headerSpacer} /></View><ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={styles.intro}><View style={styles.avatar}><MaterialIcons name="person" size={44} color={colors.green} /></View><View><Text style={styles.title}>Your profile</Text><Text style={styles.subtitle}>Keep your information up to date.</Text></View></View><View style={styles.form}><ProfileField label="Full Name" icon="person-outline" value={name} onChangeText={setName} /><ProfileField label="Email" icon="mail-outline" value={email} editable={false} /><ProfileField label="Phone Number" icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><ProfileField label="Address" icon="location-on" value={address} onChangeText={setAddress} /></View><Pressable onPress={saveProfile} disabled={isSaving} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, isSaving && styles.disabled]} accessibilityRole="button"><Text style={styles.saveText}>{isSaving ? "Saving..." : "Save Changes"}</Text></Pressable>{!!message && <Text style={styles.message}>{message}</Text>}</ScrollView></View></KeyboardAvoidingView></ScreenContainer>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: "#FFFFFF" }, header: { height: 54, paddingHorizontal: 16, backgroundColor: colors.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" }, headerSpacer: { width: 22 }, scrollContent: { padding: 18, paddingBottom: 100 }, intro: { flexDirection: "row", alignItems: "center", paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#EDF0F1" }, avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center", marginRight: 14 }, title: { color: colors.ink, fontSize: 17, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 }, form: { marginTop: 20 }, fieldBlock: { marginBottom: 15 }, fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", marginBottom: 6 }, inputWrap: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" }, disabledInput: { backgroundColor: "#F5F6F7" }, input: { flex: 1, color: colors.ink, fontSize: 13, marginLeft: 10, paddingVertical: 8 }, saveButton: { height: 46, borderRadius: 8, marginTop: 8, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }, saveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.65 }, message: { color: colors.error, textAlign: "center", fontSize: 12, marginTop: 10 },
});