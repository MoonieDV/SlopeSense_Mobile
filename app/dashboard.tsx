import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { firebaseAuth } from "@/lib/firebase";

const colors = {
  deepGreen: "#00552F",
  green: "#10804F",
  mint: "#E5F6EA",
  ink: "#17384A",
  muted: "#5D7280",
  border: "#DDEBE3",
  amber: "#D99311",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;
  const [displayName, setDisplayName] = useState(firebaseAuth.currentUser?.displayName?.trim() || "Resident");
  const scrollY = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useRef(
    Array.from({ length: 5 }, () => ({ opacity: new Animated.Value(0), y: new Animated.Value(16) })),
  ).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setDisplayName(user?.displayName?.trim() || "Resident");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    sectionAnimations.forEach(({ opacity, y }, index) => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, delay: index * 90, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, delay: index * 90, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }, [sectionAnimations]);

  const goTo = (path: RelativePathString) => router.push(path);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-[#F5FBF7]">
      <StatusBar style="light" />
      <View style={styles.screen}>
        <Animated.View style={[styles.header, { opacity: sectionAnimations[0].opacity }]}>
          <View style={styles.brandBlock}>
            <MaterialIcons name="terrain" size={42} color="#FFFFFF" />
            <View>
              <Text style={styles.brandName}>SlopeSense</Text>
              <Text style={styles.tagline}>Safer Communities, Stronger Tomorrow</Text>
            </View>
          </View>
          <View style={styles.headerArtworkSpacer} />
        </Animated.View>

        <Animated.ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isNarrow ? 16 : 20 }]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        >
          <Animated.View style={{ opacity: sectionAnimations[1].opacity, transform: [{ translateY: sectionAnimations[1].y }] }}>
            <View style={styles.introRow}>
              <View style={styles.introCopy}>
                <Text style={styles.greeting}>Good morning,</Text>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.introText}>Stay safe. We&apos;re monitoring your area.</Text>
              </View>
              <Animated.View
                style={[
                  styles.headerArtwork,
                  isNarrow && styles.headerArtworkNarrow,
                  {
                    transform: [
                      { scale: scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.58], extrapolate: "clamp" }) },
                      { translateY: scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, -3], extrapolate: "clamp" }) },
                    ],
                  },
                ]}
              >
                <Image source={require("@/assets/images/icon_1.png")} style={styles.headerArtworkImage} resizeMode="contain" accessibilityLabel="SlopeSense mountain landscape" />
              </Animated.View>
            </View>
            <Pressable style={[styles.locationPill, isNarrow && styles.locationPillNarrow]} accessibilityRole="button" accessibilityLabel="Change location">
              <MaterialIcons name="location-on" size={18} color={colors.green} />
              <Text style={styles.locationText}>Brgy. San Isidro</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.ink} />
            </Pressable>
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[2].opacity, transform: [{ translateY: sectionAnimations[2].y }] }}>
            <View style={[styles.riskCard, isNarrow && styles.riskCardNarrow]}>
              <View style={styles.riskCopy}>
                <View style={styles.shieldIcon}><MaterialIcons name="verified-user" size={30} color="#FFFFFF" /></View>
                <View style={[styles.riskTextBlock, isNarrow && styles.riskTextBlockNarrow]}>
                  <Text style={styles.eyebrow}>AREA STATUS</Text>
                  <Text style={styles.riskTitle}>LOW RISK</Text>
                  <Text style={styles.riskDescription}>Your area is currently being monitored. No immediate threat detected.</Text>
                  <View style={styles.updatedRow}><MaterialIcons name="schedule" size={16} color={colors.muted} /><Text style={styles.updatedText}>Last updated: 9:41 AM</Text></View>
                </View>
              </View>
              <View style={[styles.mountainScene, isNarrow && styles.mountainSceneNarrow]}>
                <View style={styles.sun} /><View style={styles.mountainBack} /><View style={styles.mountainFront} />
                <MaterialIcons name="home" size={37} color="#5EB37D" style={styles.sceneHouse} />
                <MaterialIcons name="park" size={29} color="#278959" style={styles.sceneTreeOne} />
                <MaterialIcons name="park" size={23} color="#399867" style={styles.sceneTreeTwo} />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[3].opacity, transform: [{ translateY: sectionAnimations[3].y }] }}>
            <View style={[styles.advisoryCard, isNarrow && styles.advisoryCardNarrow]}>
              <View style={styles.warningIcon}><MaterialIcons name="priority-high" size={27} color="#FFFFFF" /></View>
              <View style={[styles.advisoryCopy, isNarrow && styles.advisoryCopyNarrow]}>
                <Text style={[styles.eyebrow, { color: colors.amber }]}>SAFETY ADVISORY</Text>
                <Text style={styles.cardTitle}>Stay alert during heavy rainfall.</Text>
                <Text style={styles.cardBody}>Avoid areas near steep slopes and be extra careful when traveling.</Text>
              </View>
              <Pressable style={[styles.actionPill, isNarrow && styles.actionPillNarrow]} onPress={() => goTo("/alerts-announcements" as RelativePathString)} accessibilityRole="button">
                <Text style={styles.actionText}>View Alert</Text><MaterialIcons name="chevron-right" size={19} color={colors.green} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[4].opacity, transform: [{ translateY: sectionAnimations[4].y }] }}>
            <Pressable style={[styles.infoCard, isNarrow && styles.infoCardNarrow]} onPress={() => goTo("/alerts-announcements" as RelativePathString)} accessibilityRole="button">
              <View style={[styles.roundIcon, isNarrow && styles.roundIconNarrow, { backgroundColor: "#D9F2E2" }]}><MaterialIcons name="campaign" size={27} color={colors.green} /></View>
              <View style={[styles.infoCopy, isNarrow && styles.infoCopyNarrow]}>
                <Text style={styles.eyebrow}>LATEST ANNOUNCEMENT</Text>
                <Text style={styles.cardTitle}>Barangay Safety Advisory</Text>
                <Text style={styles.cardBody}>Residents near the hillside are advised to remain alert due to continuous rainfall.</Text>
                <View style={styles.updatedRow}><MaterialIcons name="schedule" size={16} color={colors.muted} /><Text style={styles.updatedText}>Today, 9:20 AM</Text></View>
              </View>
              <MaterialIcons name="chevron-right" size={23} color={colors.muted} style={styles.topChevron} />
            </Pressable>
            <Pressable style={[styles.infoCard, styles.reminderCard, isNarrow && styles.infoCardNarrow]} onPress={() => goTo("/guide" as RelativePathString)} accessibilityRole="button">
              <View style={[styles.roundIcon, isNarrow && styles.roundIconNarrow, { backgroundColor: "#49A56D" }]}><MaterialIcons name="home" size={27} color="#FFFFFF" /></View>
              <View style={[styles.infoCopy, isNarrow && styles.infoCopyNarrow]}>
                <Text style={styles.eyebrow}>PREPAREDNESS REMINDER</Text>
                <Text style={styles.cardTitle}>Know your evacuation route.</Text>
                <Text style={styles.cardBody}>Make sure everyone in your household knows where to go during an emergency.</Text>
              </View>
              <View style={styles.mapDecoration}><MaterialIcons name="location-on" size={28} color="#67B789" /></View>
              <View style={[styles.actionPill, isNarrow && styles.actionPillNarrow]}><Text style={styles.actionText}>Learn More</Text><MaterialIcons name="chevron-right" size={19} color={colors.green} /></View>
            </Pressable>
          </Animated.View>
        </Animated.ScrollView>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5FBF7" },
  header: { backgroundColor: colors.deepGreen, minHeight: 82, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  brandBlock: { flexDirection: "row", alignItems: "center" },
  brandName: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  tagline: { color: "#D7F0E0", fontSize: 9, marginTop: 2 },
  headerArtworkSpacer: { width: 40, height: 40 },
  headerArtwork: { width: 148, height: 94, justifyContent: "center", alignItems: "center", transformOrigin: "center", marginTop: -8, marginRight: -8 },
  headerArtworkNarrow: { width: 128, height: 82 },
  headerArtworkImage: { width: "100%", height: "100%" },
  scrollContent: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 104 },
  introRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  introRowNarrow: { flexDirection: "column" },
  introCopy: { flex: 1, paddingRight: 8 },
  greeting: { color: colors.muted, fontSize: 14 },
  name: { color: colors.ink, fontSize: 23, lineHeight: 28, fontWeight: "800", marginTop: 1 },
  introText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  locationPill: { backgroundColor: "#DFF3E8", borderRadius: 22, paddingVertical: 9, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", marginTop: 3, marginBottom: 14, maxWidth: 166 },
  locationPillNarrow: { alignSelf: "flex-start", marginTop: 12 },
  locationText: { color: colors.ink, fontSize: 11, fontWeight: "700", marginHorizontal: 4, flexShrink: 1 },
  riskCard: { minHeight: 184, borderRadius: 15, backgroundColor: colors.mint, borderWidth: 1, borderColor: "#CDEBD7", overflow: "hidden", flexDirection: "row", marginBottom: 14 },
  riskCardNarrow: { minHeight: 198 },
  riskCopy: { flex: 1, padding: 16, flexDirection: "row", zIndex: 2 },
  shieldIcon: { width: 44, height: 54, borderRadius: 16, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", marginRight: 11 },
  riskTextBlock: { flex: 1 },
  riskTextBlockNarrow: { paddingRight: 34 },
  eyebrow: { color: colors.green, fontSize: 10, letterSpacing: 0.5, fontWeight: "800", marginBottom: 5 },
  riskTitle: { color: colors.green, fontSize: 24, lineHeight: 27, fontWeight: "800" },
  riskDescription: { color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 6, maxWidth: 190 },
  updatedRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 5 },
  updatedText: { color: colors.muted, fontSize: 11 },
  mountainScene: { position: "absolute", bottom: 0, right: -4, width: "45%", height: "100%", overflow: "hidden" },
  mountainSceneNarrow: { width: "36%", opacity: 0.75 },
  sun: { width: 67, height: 39, borderTopLeftRadius: 70, borderTopRightRadius: 70, backgroundColor: "#FFFFFF", opacity: 0.72, position: "absolute", top: 35, right: 31 },
  mountainBack: { position: "absolute", bottom: 0, right: -20, width: 175, height: 130, backgroundColor: "#A3DAB2", transform: [{ rotate: "-31deg" }], borderRadius: 18 },
  mountainFront: { position: "absolute", bottom: -25, right: -30, width: 180, height: 130, backgroundColor: "#72C58F", transform: [{ rotate: "-20deg" }], borderRadius: 23 },
  sceneHouse: { position: "absolute", right: 40, bottom: 44 },
  sceneTreeOne: { position: "absolute", right: 6, bottom: 28 },
  sceneTreeTwo: { position: "absolute", right: 78, bottom: 30 },
  advisoryCard: { backgroundColor: "#FFFAEF", borderColor: "#F5E4B8", borderWidth: 1, borderRadius: 15, minHeight: 128, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  advisoryCardNarrow: { minHeight: 194, paddingBottom: 56 },
  warningIcon: { width: 42, height: 50, backgroundColor: "#E7A322", borderRadius: 9, alignItems: "center", justifyContent: "center", marginRight: 11 },
  advisoryCopy: { flex: 1, paddingRight: 4 },
  advisoryCopyNarrow: { minWidth: 0, paddingRight: 0, flexShrink: 1 },
  cardTitle: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  cardBody: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 5 },
  actionPill: { backgroundColor: "#DDF2E5", borderRadius: 20, flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 11, position: "absolute", right: 14, bottom: 14 },
  actionPillNarrow: { right: 14, bottom: 14 },
  actionText: { color: colors.green, fontSize: 12, fontWeight: "800", marginRight: 4 },
  infoCard: { backgroundColor: "#FFFFFF", borderColor: colors.border, borderWidth: 1, borderRadius: 15, minHeight: 154, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 14, overflow: "hidden" },
  infoCardNarrow: { minHeight: 184, flexDirection: "column", paddingBottom: 14 },
  roundIcon: { width: 44, height: 52, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 11 },
  roundIconNarrow: { marginRight: 0, marginBottom: 10 },
  infoCopyNarrow: { width: "100%", flex: 0, paddingRight: 0 },
  infoCopy: { flex: 1, paddingRight: 2 },
  topChevron: { position: "absolute", right: 14, top: 17 },
  reminderCard: { minHeight: 139, backgroundColor: colors.mint, borderColor: "#CDEBD7", paddingBottom: 45 },
  mapDecoration: { position: "absolute", right: 15, top: 14, opacity: 0.8 },
});
