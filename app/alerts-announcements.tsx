import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";

const COLORS = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#111827",
  muted: "#5F6368",
  border: "#DDE3E0",
  white: "#FFFFFF",
  warning: "#EC1C24",
  warningText: "#B42318",
  warningBackground: "#FFF5F5",
  info: "#0879D1",
  infoText: "#164C89",
  infoBackground: "#F4F8FF",
};

type AlertKind = "warning" | "info";
type AlertItem = { kind: AlertKind; title: string; body: string; date: string };

const alerts: AlertItem[] = [
  { kind: "warning", title: "WARNING: Heavy Rainfall Detected", body: "Rainfall intensity is high in your area.\nPlease remain alert.", date: "May 27, 2025 8:30 AM" },
  { kind: "info", title: "INFO: Evacuation Drill", body: "Barangay-wide evacuation drill on\nMay 30, 2025 at 8:00 AM.", date: "May 26, 2025 6:45 AM" },
  { kind: "warning", title: "WARNING: Soil Moisture High", body: "Soil moisture level is above normal.\nLandslide risk may increase.", date: "May 26, 2025 2:10 PM" },
  { kind: "info", title: "INFO: Road Maintenance", body: "Road maintenance on Purok 3 main road\non May 29, 2025.", date: "May 25, 2025 9:15 AM" },
];

function AlertCard({ alert }: { alert: AlertItem }) {
  const isWarning = alert.kind === "warning";
  const color = isWarning ? COLORS.warning : COLORS.info;
  return (
    <View style={[styles.alertCard, { borderColor: isWarning ? "#FFD0D0" : "#CFE1F8", backgroundColor: isWarning ? COLORS.warningBackground : COLORS.infoBackground }]}>
      <View style={[styles.alertIcon, { backgroundColor: color }]}>
        <MaterialIcons name={isWarning ? "warning" : "info"} size={17} color={COLORS.white} />
      </View>
      <View style={styles.alertCopy}>
        <Text style={[styles.alertTitle, { color: isWarning ? COLORS.warningText : COLORS.infoText }]}>{alert.title}</Text>
        <Text style={styles.alertBody}>{alert.body}</Text>
        <View style={styles.dateRow}>
          <MaterialIcons name="calendar-today" size={11} color={COLORS.muted} />
          <Text style={styles.dateText}>{alert.date}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AlertsAnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const entranceStyle = useScreenEntrance();
  const [filter, setFilter] = useState("All");

  const cycleFilter = () => {
    setFilter((current) => current === "All" ? "Warnings" : current === "Warnings" ? "Info" : "All");
  };

  const visibleAlerts = filter === "All" ? alerts : alerts.filter((alert) => alert.kind === filter.toLowerCase());
  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.headerTitle}>Alerts &amp; Announcements</Text>
          <Pressable onPress={cycleFilter} hitSlop={10} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Cycle alert filter">
            <MaterialIcons name="filter-alt" size={19} color={COLORS.white} />
          </Pressable>
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.filterRow}>
            {["All", "Warnings", "Info"].map((option) => {
              const selected = filter === option;
              return (
                <Pressable key={option} onPress={() => setFilter(option)} style={[styles.filterButton, selected && styles.filterButtonSelected]} accessibilityRole="button" accessibilityLabel={`Show ${option}`}>
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.alertList}>{visibleAlerts.map((alert) => <AlertCard key={`${alert.title}-${alert.date}`} alert={alert} />)}</View>
          </ScrollView>
        </Animated.View>

        <View style={{ height: Platform.OS === "web" ? 0 : Math.max(insets.bottom - 2, 0), backgroundColor: COLORS.white }} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  pageTitle: { height: 36, color: COLORS.deepGreen, textAlign: "center", fontSize: 14, fontWeight: "800", paddingTop: 11 },
  header: { height: 51, backgroundColor: COLORS.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  headerButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.62 },
  contentArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 92 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 6, marginBottom: 10 },
  filterButton: { width: "31%", height: 22, borderWidth: 1, borderColor: "#E1E4E7", borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  filterButtonSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterText: { color: COLORS.ink, fontSize: 10, fontWeight: "600" },
  filterTextSelected: { color: COLORS.white },
  alertList: { gap: 8 },
  alertCard: { minHeight: 81, borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 10, flexDirection: "row" },
  alertIcon: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 1 },
  alertCopy: { flex: 1, marginLeft: 10 },
  alertTitle: { fontSize: 12, fontWeight: "800" },
  alertBody: { color: COLORS.ink, fontSize: 11, lineHeight: 16, marginTop: 4 },
  dateRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 5 },
  dateText: { color: COLORS.ink, fontSize: 10 },
  bottomNav: { height: 56, borderTopWidth: 1, borderTopColor: "#E4E7E5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: COLORS.white, shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: -2 }, elevation: 5 },
  navItem: { width: 54, height: 49, alignItems: "center", justifyContent: "center", gap: 3 },
  navPressed: { opacity: 0.58 },
  navLabel: { color: "#33383D", fontSize: 10 },
  navLabelActive: { color: COLORS.green, fontWeight: "800" },
});
