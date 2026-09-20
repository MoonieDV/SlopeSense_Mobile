import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";
import { RAIN_SENSOR_DEVICE_ID, formatRainfallLevel, isRainfallAlertLevel, subscribeToRainSensor, type RainSensorReading } from "@/lib/sensor-data";

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
type AlertItem = { kind: AlertKind; title: string; body: string; date: string; source?: "firebase" | "local" };

const alerts: AlertItem[] = [
  { kind: "info", title: "INFO: Evacuation Drill", body: "Barangay-wide evacuation drill on\nMay 30, 2025 at 8:00 AM.", date: "May 26, 2025 6:45 AM", source: "local" },
  { kind: "info", title: "INFO: Road Maintenance", body: "Road maintenance on Purok 3 main road\non May 29, 2025.", date: "May 25, 2025 9:15 AM", source: "local" },
];

function formatSensorTimestamp(reading: RainSensorReading) {
  if (reading.updatedAt > 1_700_000_000_000) {
    return new Date(reading.updatedAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return "Live Firebase sensor update";
}

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
        <View style={styles.metaRow}>
          <View style={styles.dateRow}>
            <MaterialIcons name="calendar-today" size={11} color={COLORS.muted} />
            <Text style={styles.dateText}>{alert.date}</Text>
          </View>
          {alert.source === "firebase" ? <Text style={styles.firebaseBadge}>Firebase</Text> : null}
        </View>
      </View>
    </View>
  );
}

function StateCard({ icon, title, body }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.stateCard}>
      <MaterialIcons name={icon} size={20} color={COLORS.deepGreen} />
      <View style={styles.stateCopy}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function AlertsAnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const entranceStyle = useScreenEntrance();
  const [filter, setFilter] = useState("All");
  const [rainReading, setRainReading] = useState<RainSensorReading | null>(null);
  const [isLoadingRain, setIsLoadingRain] = useState(true);
  const [sensorError, setSensorError] = useState(false);

  useEffect(() => {
    return subscribeToRainSensor(
      RAIN_SENSOR_DEVICE_ID,
      (reading) => {
        setRainReading(reading);
        setSensorError(false);
        setIsLoadingRain(false);
      },
      () => {
        setSensorError(true);
        setIsLoadingRain(false);
      },
    );
  }, []);

  const cycleFilter = () => {
    setFilter((current) => current === "All" ? "Warnings" : current === "Warnings" ? "Info" : "All");
  };

  const liveAlert: AlertItem | null = rainReading && isRainfallAlertLevel(rainReading.level)
    ? {
        kind: "warning",
        title: `WARNING: ${formatRainfallLevel(rainReading.level)} Detected`,
        body: `Rain sensor ${rainReading.deviceId} reported ${rainReading.rawValue} raw value.\nPlease remain alert and monitor evacuation advisories.`,
        date: formatSensorTimestamp(rainReading),
        source: "firebase",
      }
    : null;
  const availableAlerts = liveAlert ? [liveAlert, ...alerts] : alerts;
  const visibleAlerts = filter === "All" ? availableAlerts : availableAlerts.filter((alert) => alert.kind === filter.toLowerCase());
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
          {isLoadingRain ? (
            <StateCard icon="sync" title="Checking Firebase rainfall sensor" body="Waiting for the latest raindrop sensor reading." />
          ) : sensorError ? (
            <StateCard icon="cloud-off" title="Firebase sensor unavailable" body="Unable to read the raindrop sensor right now. Please check your connection or database rules." />
          ) : !liveAlert ? (
            <StateCard icon="verified-user" title="No active rainfall alert" body={rainReading ? `${formatRainfallLevel(rainReading.level)} is below the alert threshold.` : "No raindrop sensor reading has been received yet."} />
          ) : null}
          <View style={styles.alertList}>{visibleAlerts.map((alert) => <AlertCard key={`${alert.source ?? "alert"}-${alert.title}-${alert.date}`} alert={alert} />)}</View>
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
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { color: COLORS.ink, fontSize: 10 },
  firebaseBadge: { color: COLORS.deepGreen, backgroundColor: "#DDF3E2", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: "800", overflow: "hidden" },
  stateCard: { minHeight: 67, borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#F7FBF8", marginBottom: 8 },
  stateCopy: { flex: 1, marginLeft: 9 },
  stateTitle: { color: COLORS.ink, fontSize: 11, fontWeight: "800" },
  stateBody: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  bottomNav: { height: 56, borderTopWidth: 1, borderTopColor: "#E4E7E5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: COLORS.white, shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: -2 }, elevation: 5 },
  navItem: { width: 54, height: 49, alignItems: "center", justifyContent: "center", gap: 3 },
  navPressed: { opacity: 0.58 },
  navLabel: { color: "#33383D", fontSize: 10 },
  navLabelActive: { color: COLORS.green, fontWeight: "800" },
});
