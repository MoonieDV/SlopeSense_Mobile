import { useEffect } from 'react';
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";

const colors = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#07111F",
  muted: "#5D6474",
  paleGreen: "#EAF7F0",
  softGreen: "#D9F1E4",
  border: "#E8EEE9",
  red: "#DC2626",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
};

type Step = {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const steps: Step[] = [
  {
    title: "Move to higher and safer ground",
    description:
      "Immediately go to a higher area and away from slopes, hills, and riverbanks.",
    icon: "terrain",
  },
  {
    title: "Stay away from the path of the landslide",
    description:
      "Do not go near areas with falling rocks, soil, trees, or cracks.",
    icon: "do-not-disturb",
  },
  {
    title: "Evacuate immediately",
    description:
      "If advised by authorities or if you notice signs of a landslide, leave the area right away.",
    icon: "exit-to-app",
  },
  {
    title: "Help others if it is safe",
    description:
      "Assist children, elderly, and neighbors who need help.",
    icon: "people",
  },
  {
    title: "Stay informed",
    description:
      "Monitor updates and follow instructions from local authorities through the app or other reliable sources.",
    icon: "notifications-active",
  },
];

export default function DuringLandslideScreen() {
  const router = useRouter();
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.replace('/guide' as any); return true; }); return () => sub.remove(); }, [router]);
  const entranceStyle = useScreenEntrance();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/guide" as any)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Preparedness Guide</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.badge}>
                <View style={styles.badgeIcon}>
                  <MaterialIcons name="cloud" size={16} color={colors.green} />
                </View>
                <Text style={styles.badgeText}>During a Landslide</Text>
              </View>
              <Text style={styles.heroTitle}>Stay Safe During{"\n"}a Landslide</Text>
              <Text style={styles.heroSubtitle}>Follow these steps to protect yourself and others while a landslide is happening.</Text>
              <Image source={require("@/assets/images/landslide_icon.png")} style={styles.landscape} resizeMode="contain" accessibilityLabel="Illustration of a landslide" />
            </View>

            {/* Warning alert */}
            <View style={styles.warningBox}>
              <View style={styles.warningIconCircle}>
                <MaterialIcons name="error" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Stay away from the landslide area</Text>
                <Text style={styles.warningDescription}>Landslides can happen quickly and without warning.</Text>
              </View>
            </View>

            {/* Steps */}
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {steps.map((step, index) => (
                <View key={step.title} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepCard}>
                    <View style={styles.stepIconBox}>
                      <MaterialIcons name={step.icon} size={30} color={colors.green} />
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Safety footer */}
            <View style={styles.safetyFooter}>
              <View style={styles.safetyIconCircle}>
                <MaterialIcons name="verified-user" size={24} color={colors.green} />
              </View>
              <View style={styles.safetyCopy}>
                <Text style={styles.safetyTitle}>Your safety comes first.</Text>
                <Text style={styles.safetyDescription}>Act quickly, stay calm, and follow instructions from local authorities.</Text>
              </View>
            </View>

            <Pressable style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Next guide page">
              <Text style={styles.nextText}>Next</Text>
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={styles.dots}>
              {[0, 1, 2, 3, 4].map((dot) => (
                <View key={dot} style={[styles.dot, dot === 1 && styles.activeDot]} />
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBFDFC" },
  header: {
    height: 54,
    backgroundColor: colors.deepGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  backButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", letterSpacing: 0 },
  contentArea: { flex: 1 },
  scrollContent: { paddingBottom: 19 },

  /* Hero */
  hero: { minHeight: 166, paddingTop: 14, paddingHorizontal: 15, overflow: "hidden" },
  badge: {
    alignSelf: "flex-start",
    minHeight: 28,
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E4F1EA",
  },
  badgeIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.deepGreen, fontSize: 11, fontWeight: "800", marginLeft: 4 },
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 26, fontWeight: "900", marginTop: 14, marginLeft: 4, maxWidth: 205, letterSpacing: 0 },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7, marginLeft: 4, maxWidth: 200 },
  landscape: { position: "absolute", right: -18, bottom: 0, width: 180, height: 96 },

  /* Warning */
  warningBox: {
    marginHorizontal: 15,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  warningIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  warningContent: { flex: 1 },
  warningTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", letterSpacing: 0 },
  warningDescription: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },

  /* Timeline / Steps */
  timeline: { position: "relative", paddingHorizontal: 15, gap: 11, marginTop: 10 },
  timelineLine: { position: "absolute", left: 31, top: 18, bottom: 32, width: 1, backgroundColor: "#DCECE5" },
  stepRow: { flexDirection: "row", alignItems: "flex-start" },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.green,
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 1,
  },
  stepNumberText: { color: colors.green, fontSize: 14, fontWeight: "900" },
  stepCard: {
    flex: 1,
    minHeight: 88,
    marginLeft: 7,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#17251E",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  stepIconBox: {
    width: 58,
    height: 58,
    borderRadius: 9,
    backgroundColor: colors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCopy: { flex: 1, marginLeft: 14 },
  stepTitle: { color: colors.ink, fontSize: 13, lineHeight: 16, fontWeight: "900", letterSpacing: 0 },
  stepDescription: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 5 },

  /* Safety footer */
  safetyFooter: {
    marginHorizontal: 15,
    marginTop: 16,
    backgroundColor: colors.paleGreen,
    borderRadius: 11,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  safetyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  safetyCopy: { flex: 1 },
  safetyTitle: { color: colors.green, fontSize: 13, fontWeight: "900" },
  safetyDescription: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },

  /* Next button & dots */
  nextButton: {
    height: 40,
    marginHorizontal: 15,
    marginTop: 19,
    borderRadius: 11,
    backgroundColor: colors.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E3E7EA" },
  activeDot: { backgroundColor: colors.green },
  pressed: { opacity: 0.7 },
});





