import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
};

type Step = {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const steps: Step[] = [
  {
    title: "Stay in a safe area",
    description: "Remain in a stable and safe location. Be alert for possible additional landslides.",
    icon: "health-and-safety",
  },
  {
    title: "Check for injuries",
    description: "Make sure you and others around you are safe. Provide first aid if needed and seek medical help for serious injuries.",
    icon: "medical-services",
  },
  {
    title: "Avoid affected areas",
    description: "Stay away from landslide sites, unstable slopes, and damaged roads or structures.",
    icon: "warning",
  },
  {
    title: "Check your home",
    description: "Before returning, check for damage to your home. Do not enter if there are cracks, unstable structures, or signs of danger.",
    icon: "home",
  },
  {
    title: "Follow official updates",
    description: "Monitor announcements from local authorities through the app or other reliable sources.",
    icon: "campaign",
  },
  {
    title: "Help in community recovery",
    description: "If it is safe, support your community by following guidance from local authorities and involved groups.",
    icon: "people",
  },
];

export default function AfterLandslideScreen() {
  const router = useRouter();
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
              <View style={styles.heroTextArea}>
                <View style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <MaterialIcons name="house" size={16} color={colors.green} />
                  </View>
                  <Text style={styles.badgeText}>After a Landslide</Text>
                </View>
                <Text style={styles.heroTitle}>What to Do{"\n"}After a Landslide</Text>
                <Text style={styles.heroSubtitle}>Follow these steps to stay safe and help your community recover.</Text>
              </View>
              <Image source={require("@/assets/images/icon_1.png")} style={styles.landscape} resizeMode="contain" accessibilityLabel="Illustration of a landslide recovery" />
            </View>

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
                <Text style={styles.safetyTitle}>Stay Safe. Stay Updated.</Text>
                <Text style={styles.safetyDescription}>Recovery can take time. Continue to follow safety advisories from local authorities.</Text>
              </View>
            </View>

            <Pressable onPress={() => router.replace("/guide" as any)} style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Finish guide">
              <Text style={styles.nextText}>Finish</Text>
              <MaterialIcons name="check" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={styles.dots}>
              {[0, 1, 2, 3, 4].map((dot) => (
                <View key={dot} style={[styles.dot, dot === 2 && styles.activeDot]} />
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
  heroTextArea: { zIndex: 2 },
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
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 26, fontWeight: "900", marginTop: 14, marginLeft: 4, maxWidth: 220, letterSpacing: 0 },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7, marginLeft: 4, maxWidth: 200 },
  landscape: { position: "absolute", right: -18, bottom: 0, width: 180, height: 96, zIndex: 1 },

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

