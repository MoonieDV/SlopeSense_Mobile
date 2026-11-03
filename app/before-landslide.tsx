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
};

type Step = {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const steps: Step[] = [
  {
    title: "Know your surroundings",
    description:
      "Be aware if you live in a landslide-prone area. Look for signs such as soil cracks, leaning trees, or unusual ground movement.",
    icon: "travel-explore",
  },
  {
    title: "Prepare an emergency kit",
    description:
      "Keep essential items ready such as water, food, first aid kit, flashlight, radio, and important documents.",
    icon: "backpack",
  },
  {
    title: "Identify a safe place",
    description: "Know where to go if you need to evacuate. Look for higher and safer ground near your area.",
    icon: "location-pin",
  },
  {
    title: "Stay informed",
    description: "Check weather updates and community announcements through the app and other reliable sources.",
    icon: "notifications",
  },
  {
    title: "Talk to your family",
    description: "Make a plan with your family and make sure everyone knows what to do in case of an emergency.",
    icon: "groups",
  },
];

export default function BeforeLandslideScreen() {
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
                  <MaterialIcons name="backpack" size={16} color={colors.green} />
                </View>
                <Text style={styles.badgeText}>Before a Landslide</Text>
              </View>
              <Text style={styles.heroTitle}>Be Ready Before{"\n"}It Happens</Text>
              <Text style={styles.heroSubtitle}>Follow these simple steps to keep you and your family safe.</Text>
              <Image source={require("@/assets/images/icon_1.png")} style={styles.landscape} resizeMode="contain" accessibilityLabel="Illustration of a home among forested hills" />
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

            <Pressable style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Next guide page">
              <Text style={styles.nextText}>Next</Text>
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={styles.dots}>
              {[0, 1, 2, 3, 4].map((dot) => (
                <View key={dot} style={[styles.dot, dot === 0 && styles.activeDot]} />
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
  timeline: { position: "relative", paddingHorizontal: 15, gap: 11 },
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





