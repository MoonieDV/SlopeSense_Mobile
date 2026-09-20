import { MaterialIcons } from "@expo/vector-icons";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";

const colors = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#111827",
  muted: "#5F6368",
  border: "#E1E7E3",
  paleGreen: "#EEF8F0",
};

type IconName = keyof typeof MaterialIcons.glyphMap;
type GuideItem = { title: string; description: string; icon: IconName };

const guideItems: GuideItem[] = [
  { title: "Before a Landslide", description: "What you should do before it happens.", icon: "backpack" },
  { title: "During a Landslide", description: "What you should do during a landslide.", icon: "cloud" },
  { title: "After a Landslide", description: "What you should do after a landslide.", icon: "house" },
  { title: "Emergency Contacts", description: "Important contacts you may need in an emergency.", icon: "call" },
  { title: "Safety Tips", description: "General safety tips for everyone.", icon: "lightbulb-outline" },
];

export default function GuideScreen() {
  const entranceStyle = useScreenEntrance();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.headerTitle}>Preparedness Guide</Text>
          <View style={styles.headerButton} />
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.guideList}>
            {guideItems.map((item) => (
              <Pressable key={item.title} style={({ pressed }) => [styles.guideRow, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={item.title}>
                <View style={styles.guideIcon}><MaterialIcons name={item.icon} size={25} color={colors.green} /></View>
                <View style={styles.guideCopy}>
                  <Text style={styles.guideTitle}>{item.title}</Text>
                  <Text style={styles.guideDescription}>{item.description}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={23} color={colors.ink} />
              </Pressable>
            ))}
          </View>

          <View style={styles.reminder}>
            <View style={styles.reminderIcon}><MaterialIcons name="verified-user" size={25} color={colors.green} /></View>
            <View style={styles.reminderCopy}>
              <Text style={styles.reminderTitle}>Stay Prepared. Stay Safe.</Text>
              <Text style={styles.reminderText}>Being informed and prepared can help save lives and protect our community.</Text>
            </View>
          </View>
          </ScrollView>
        </Animated.View>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { height: 54, backgroundColor: colors.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 },
  headerButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  contentArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 7, paddingTop: 14, paddingBottom: 92 },
  guideList: { gap: 8 },
  guideRow: { minHeight: 68, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 8, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  guideIcon: { width: 49, height: 49, borderRadius: 9, backgroundColor: colors.paleGreen, alignItems: "center", justifyContent: "center" },
  guideCopy: { flex: 1, marginLeft: 15, paddingRight: 8 },
  guideTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  guideDescription: { color: colors.ink, fontSize: 11, lineHeight: 15, marginTop: 4 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
  reminder: { minHeight: 64, backgroundColor: colors.paleGreen, borderRadius: 5, marginTop: 17, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "flex-start" },
  reminderIcon: { width: 29, height: 29, alignItems: "center", justifyContent: "center" },
  reminderCopy: { flex: 1, marginLeft: 10 },
  reminderTitle: { color: colors.green, fontSize: 11, fontWeight: "800" },
  reminderText: { color: colors.ink, fontSize: 10, lineHeight: 14, marginTop: 4 },
  bottomNav: { height: 58, borderTopWidth: 1, borderTopColor: "#E4E7E5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "#FFFFFF" },
  navItem: { width: 58, height: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  navLabel: { color: colors.ink, fontSize: 10 },
  navLabelActive: { color: colors.green, fontWeight: "800" },
});