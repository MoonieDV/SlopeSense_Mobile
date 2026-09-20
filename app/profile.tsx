import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { firebaseAuth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firebase-auth";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";

const colors = { green: "#006B3C", deepGreen: "#004F2D", ink: "#111827", muted: "#5F6368", border: "#E1E5E7", paleGreen: "#EAF6ED" };
type IconName = keyof typeof MaterialIcons.glyphMap;

function ProfileRow({ icon, label, value, onPress, destructive }: { icon: IconName; label: string; value?: string; onPress?: () => void; destructive?: boolean }) {
  const content = <View style={styles.profileRow}><MaterialIcons name={icon} size={22} color={destructive ? "#E01E2B" : colors.ink} /><View style={styles.rowCopy}><Text style={[styles.rowLabel, destructive && styles.destructiveText]}>{label}</Text>{value && <Text style={styles.rowValue}>{value}</Text>}</View>{onPress && !destructive && <MaterialIcons name="chevron-right" size={23} color={colors.ink} />}</View>;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{content}</Pressable> : content;
}

export default function ProfileScreen() {
  const router = useRouter();
  const entranceStyle = useScreenEntrance();
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({ displayName: "Resident", email: "", phone: "", address: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) return;

      const storedProfile = await getUserProfile(user.uid);
      setProfile({
        displayName: user.displayName?.trim() || storedProfile?.displayName?.trim() || "Resident",
        email: user.email || storedProfile?.email || "",
        phone: storedProfile?.phone || "",
        address: storedProfile?.address || "",
      });
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try { await signOut(firebaseAuth); router.replace("/" as RelativePathString); } catch { setMessage("Unable to log out right now."); }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.header}><Text style={styles.headerTitle}>Profile</Text></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={entranceStyle}>
            <View style={styles.identityBlock}>
              <View style={styles.avatar}><MaterialIcons name="person" size={54} color={colors.green} /></View>
              <View style={styles.identityCopy}><Text style={styles.name}>{profile.displayName}</Text><Text style={styles.role}>Resident</Text><Text style={styles.memberSince}>Member since {firebaseAuth.currentUser?.metadata.creationTime ? new Date(firebaseAuth.currentUser.metadata.creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "recently"}</Text></View>
              <Pressable style={styles.cameraButton} accessibilityRole="button" accessibilityLabel="Change profile photo"><MaterialIcons name="camera-alt" size={15} color="#FFFFFF" /></Pressable>
            </View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.group}>
              <ProfileRow icon="mail-outline" label="Email" value={profile.email || "Not provided"} />
              <ProfileRow icon="phone" label="Phone Number" value={profile.phone || "Not provided"} />
              <ProfileRow icon="location-on" label="Address" value={profile.address || "Not provided"} />
            </View>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.group}>
              <ProfileRow icon="person-outline" label="Edit Profile" onPress={() => router.push("/edit-profile" as RelativePathString)} />
              <ProfileRow icon="lock-outline" label="Change Password" onPress={() => setMessage("Password settings will be connected next.")} />
              <ProfileRow icon="logout" label="Logout" destructive onPress={logout} />
            </View>
            {!!message && <Text style={styles.message}>{message}</Text>}
          </Animated.View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { height: 54, backgroundColor: colors.deepGreen, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  scrollContent: { paddingBottom: 92 },
  identityBlock: { minHeight: 112, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EDF0F1" },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center" },
  identityCopy: { flex: 1, marginLeft: 16 },
  name: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  role: { color: colors.green, fontSize: 12, fontWeight: "700", marginTop: 5 },
  memberSince: { color: colors.muted, fontSize: 11, marginTop: 5 },
  cameraButton: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", marginTop: 38, marginLeft: -27, borderWidth: 2, borderColor: "#FFFFFF" },
  sectionTitle: { color: colors.green, fontSize: 12, fontWeight: "800", marginHorizontal: 5, marginTop: 16, marginBottom: 10 },
  group: { marginHorizontal: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 9, overflow: "hidden" },
  profileRow: { minHeight: 61, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EDF0F1" },
  rowCopy: { flex: 1, marginLeft: 17 },
  rowLabel: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  rowValue: { color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 3 },
  destructiveText: { color: "#E01E2B" },
  message: { color: colors.green, fontSize: 11, textAlign: "center", marginTop: 10 },
  bottomNav: { height: 58, borderTopWidth: 1, borderTopColor: "#E4E7E5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#FFFFFF" },
  navItem: { width: 58, height: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  navLabel: { color: "#71808B", fontSize: 10 },
  navLabelActive: { color: colors.green, fontWeight: "800" },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, position: "absolute", top: 1 },
});
