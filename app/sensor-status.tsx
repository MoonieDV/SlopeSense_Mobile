import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";

const COLORS = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#111827",
  muted: "#5F6368",
  border: "#DDE3E0",
  paleGreen: "#EFF8F1",
  normal: "#DDF3E2",
  white: "#FFFFFF",
};

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

type Sensor = {
  icon: MaterialIconName;
  iconColor: string;
  name: string;
  model: string;
  value: string;
  unit: string;
  detail: string;
};

const sensors: Sensor[] = [
  { icon: "cloud", iconColor: "#0879D1", name: "Rainfall Sensor", model: "YL-83 Rainfall Sensor", value: "12.4", unit: "mm", detail: "Light Rain" },
  { icon: "grass", iconColor: "#4D2A13", name: "Soil Moisture Sensor", model: "Capacitive Soil Moisture Sensor", value: "35", unit: "%", detail: "Normal" },
  { icon: "sensors", iconColor: "#7B37F2", name: "Tilt Sensor", model: "SW-520D Tilt Sensor", value: "2.1", unit: "°", detail: "Stable" },
  { icon: "show-chart", iconColor: "#FF4A16", name: "Vibration Sensor", model: "SW-420 Vibration Sensor", value: "15", unit: "Hz", detail: "Stable" },
];

function SensorCard({ sensor }: { sensor: Sensor }) {
  return (
    <View style={styles.sensorCard}>
      <View style={[styles.sensorIcon, { backgroundColor: `${sensor.iconColor}12` }]}>
        <MaterialIcons name={sensor.icon} size={23} color={sensor.iconColor} />
      </View>
      <View style={styles.sensorCopy}>
        <Text style={styles.sensorName} numberOfLines={1}>{sensor.name}</Text>
        <Text style={styles.sensorModel} numberOfLines={1}>{sensor.model}</Text>
        <Text style={styles.normalBadge}>Normal</Text>
      </View>
      <View style={styles.sensorValue}>
        <Text style={styles.valueText}>{sensor.value} <Text style={styles.unitText}>{sensor.unit}</Text></Text>
        <Text style={styles.detailText}>{sensor.detail}</Text>
      </View>
    </View>
  );
}

function BottomNavigation({ active, onChange }: { active: string; onChange: (label: string) => void }) {
  const items: { label: string; icon: MaterialIconName }[] = [
    { label: "Home", icon: "home" },
    { label: "Alerts", icon: "notifications-none" },
    { label: "Reports", icon: "assignment" },
    { label: "Guide", icon: "menu-book" },
    { label: "Profile", icon: "person-outline" },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const selected = active === item.label;
        return (
          <Pressable key={item.label} onPress={() => onChange(item.label)} style={({ pressed }) => [styles.navItem, pressed && styles.navPressed]} accessibilityRole="button" accessibilityLabel={item.label}>
            <MaterialIcons name={item.icon} size={20} color={selected ? COLORS.ink : "#33383D"} />
            <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SensorStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeNav, setActiveNav] = useState("Home");
  const [lastUpdated, setLastUpdated] = useState("9:41 AM");

  const handleNavigation = (label: string) => {
    if (label === "Home") {
      router.replace("/dashboard" as RelativePathString);
      return;
    }
    if (label === "Alerts") {
      router.push("/alerts-announcements" as RelativePathString);
      return;
    }
    if (label === "Reports") {
      router.push("/reports" as RelativePathString);
      return;
    }
    if (label === "Guide") {
      router.push("/guide" as RelativePathString);
      return;
    }
    if (label === "Profile") {
      router.push("/profile" as RelativePathString);
      return;
    }
    setActiveNav(label);
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/dashboard" as RelativePathString)} hitSlop={10} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Go back to dashboard">
            <MaterialIcons name="arrow-back" size={22} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Sensor Status</Text>
          <Pressable onPress={() => setLastUpdated(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))} hitSlop={10} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Refresh sensor status">
            <MaterialIcons name="refresh" size={23} color={COLORS.white} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.systemCard}>
            <View style={styles.shieldCircle}><MaterialIcons name="verified-user" size={24} color={COLORS.white} /></View>
            <View style={styles.systemCopy}>
              <Text style={styles.systemTitle}>All Systems Normal</Text>
              <Text style={styles.systemSubtitle}>All sensors are operating{"\n"}within normal range.</Text>
            </View>
            <MaterialIcons name="wifi" size={43} color="#DCEDE1" style={styles.wifiIcon} />
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Live Sensor Readings</Text>
            <Text style={styles.updatedText}>Last updated: {lastUpdated}</Text>
          </View>
          <View style={styles.sensorList}>{sensors.map((sensor) => <SensorCard key={sensor.name} sensor={sensor} />)}</View>

          <View style={styles.aboutCard}>
            <MaterialIcons name="info-outline" size={16} color={COLORS.ink} />
            <View style={styles.aboutCopy}>
              <Text style={styles.aboutTitle}>About the Sensors</Text>
              <Text style={styles.aboutText}>These sensors continuously monitor environmental conditions that may indicate potential landslide risks in your area.</Text>
            </View>
          </View>
        </ScrollView>

        <BottomNavigation active={activeNav} onChange={handleNavigation} />
        <View style={{ height: Platform.OS === "web" ? 0 : Math.max(insets.bottom - 2, 0), backgroundColor: COLORS.white }} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  header: { height: 56, backgroundColor: COLORS.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  headerButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.62 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 13, paddingBottom: 10 },
  systemCard: { minHeight: 61, borderRadius: 7, backgroundColor: COLORS.paleGreen, flexDirection: "row", alignItems: "center", paddingHorizontal: 11, overflow: "hidden" },
  shieldCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.deepGreen },
  systemCopy: { flex: 1, marginLeft: 12 },
  systemTitle: { color: COLORS.ink, fontSize: 10, fontWeight: "800" },
  systemSubtitle: { color: COLORS.ink, fontSize: 8, lineHeight: 11, marginTop: 3 },
  wifiIcon: { marginRight: 7 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13, marginBottom: 7 },
  sectionTitle: { color: COLORS.ink, fontSize: 10, fontWeight: "800" },
  updatedText: { color: COLORS.muted, fontSize: 7 },
  sensorList: { gap: 5 },
  sensorCard: { minHeight: 54, borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 6, backgroundColor: COLORS.white },
  sensorIcon: { width: 34, height: 34, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sensorCopy: { flex: 1, marginLeft: 8, minWidth: 0 },
  sensorName: { color: COLORS.ink, fontSize: 9, fontWeight: "800" },
  sensorModel: { color: COLORS.muted, fontSize: 7, marginTop: 2 },
  normalBadge: { color: COLORS.deepGreen, backgroundColor: COLORS.normal, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, fontSize: 7, fontWeight: "700", alignSelf: "flex-start", marginTop: 3 },
  sensorValue: { width: 58, alignItems: "flex-end", justifyContent: "center" },
  valueText: { color: COLORS.ink, fontSize: 12, fontWeight: "800" },
  unitText: { fontSize: 10, fontWeight: "700" },
  detailText: { color: COLORS.deepGreen, fontSize: 7, fontWeight: "600", marginTop: 4 },
  aboutCard: { minHeight: 67, borderRadius: 6, backgroundColor: COLORS.paleGreen, flexDirection: "row", paddingHorizontal: 11, paddingVertical: 11, marginTop: 9 },
  aboutCopy: { flex: 1, marginLeft: 9 },
  aboutTitle: { color: COLORS.ink, fontSize: 9, fontWeight: "800" },
  aboutText: { color: COLORS.ink, fontSize: 8, lineHeight: 11, marginTop: 4 },
  bottomNav: { height: 56, borderTopWidth: 1, borderTopColor: "#E4E7E5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: COLORS.white, shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: -2 }, elevation: 5 },
  navItem: { width: 54, height: 49, alignItems: "center", justifyContent: "center", gap: 3 },
  navPressed: { opacity: 0.58 },
  navLabel: { color: "#33383D", fontSize: 7 },
  navLabelSelected: { color: COLORS.ink, fontWeight: "800" },
});
