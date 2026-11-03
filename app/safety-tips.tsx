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

type Tip = {
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const tips: Tip[] = [
  {
    title: "Know Your Surroundings",
    description: "Be aware of the risks in your area such as slopes, rivers, and landslide-prone locations.",
    icon: "home",
  },
  {
    title: "Prepare an Emergency Kit",
    description: "Keep essential items ready such as water, food, first aid kit, flashlight, radio, and important documents.",
    icon: "medical-services",
  },
  {
    title: "Monitor Weather Updates",
    description: "Stay informed through the app and other reliable sources, especially during heavy rain.",
    icon: "cloud",
  },
  {
    title: "Create a Family Plan",
    description: "Discuss and plan evacuation routes, meeting places, and emergency contacts with your family.",
    icon: "people",
  },
  {
    title: "Keep Important Items Ready",
    description: "Keep flashlights, batteries, and power banks charged, especially during the rainy season.",
    icon: "flashlight-on",
  },
];

export default function SafetyTipsScreen() {
  const router = useRouter();
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.replace('/guide' as any); return true; }); return () => sub.remove(); }, [router]);
  const entranceStyle = useScreenEntrance();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/guide" as any)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Preparedness Guide</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.heroTextArea}>
                <View style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <MaterialIcons name="lightbulb" size={14} color={colors.green} />
                  </View>
                  <Text style={styles.badgeText}>Safety Tips</Text>
                </View>
                <Text style={styles.heroTitle}>Safety Tips{"\n"}for Everyone</Text>
                <Text style={styles.heroSubtitle}>Simple actions can make a big difference. Follow these tips to stay safe and prepared.</Text>
              </View>
              <Image source={require("@/assets/images/safetytips_icon.png")} style={styles.landscape} resizeMode="contain" accessibilityLabel="Illustration of a safety shield and house" />
            </View>

            {/* General Safety Tips */}
            <Text style={styles.sectionTitle}>General Safety Tips</Text>
            <View style={styles.tipsList}>
              {tips.map((tip, index) => (
                <View key={index} style={styles.tipCard}>
                  <View style={styles.tipIconBox}>
                    <MaterialIcons name={tip.icon} size={30} color={colors.green} />
                  </View>
                  <View style={styles.tipCopy}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDescription}>{tip.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Safety footer */}
            <View style={styles.safetyFooter}>
              <View style={styles.safetyIconCircle}>
                <MaterialIcons name="verified-user" size={26} color={colors.deepGreen} />
              </View>
              <View style={styles.safetyCopy}>
                <Text style={styles.safetyTitle}>Be Prepared. Stay Safe.</Text>
                <Text style={styles.safetyDescription}>Small steps today can help protect you, your family, and your community.</Text>
              </View>
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
  scrollContent: { paddingBottom: 24 },

  /* Hero */
  hero: { minHeight: 180, paddingTop: 14, paddingHorizontal: 15, overflow: "hidden" },
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
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 26, fontWeight: "900", marginTop: 14, marginLeft: 2, maxWidth: 210, letterSpacing: 0 },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7, marginLeft: 2, maxWidth: 200 },
  landscape: { position: "absolute", right: -10, bottom: 0, width: 140, height: 120, zIndex: 1 },

  /* Section Title */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.ink,
    marginHorizontal: 15,
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: 0,
  },

  /* Tips List */
  tipsList: { paddingHorizontal: 15, gap: 10 },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#17251E",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tipIconBox: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: colors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  tipCopy: { flex: 1 },
  tipTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", letterSpacing: 0 },
  tipDescription: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },

  /* Safety Footer */
  safetyFooter: {
    marginHorizontal: 15,
    marginTop: 20,
    backgroundColor: colors.paleGreen,
    borderRadius: 11,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  safetyIconCircle: {
    marginRight: 12,
    marginTop: 2,
  },
  safetyCopy: { flex: 1 },
  safetyTitle: { color: colors.deepGreen, fontSize: 13, fontWeight: "900", letterSpacing: 0 },
  safetyDescription: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },

  pressed: { opacity: 0.7 },
});





