import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";
import { formatAnnouncementDate, subscribeToAnnouncements, type Announcement } from "@/lib/firebase-announcements";
import {
  RAIN_SENSOR_DEVICE_ID,
  formatRainfallLevel,
  isRainfallAlertLevel,
  subscribeToRainSensor,
  type RainSensorReading,
} from "@/lib/sensor-data";

const COLORS = {
  green: "#087A40",
  deepGreen: "#004F2D",
  ink: "#101D36",
  muted: "#59677B",
  white: "#FFFFFF",
  warning: "#E92525",
  warningBorder: "#F8D2D2",
  warningBackground: "#FFF7F7",
  infoBorder: "#D8EBDD",
  infoBackground: "#F8FCF9",
};

type AlertKind = "warning" | "info" | "announcement";
type AlertGroup = "Today" | "Yesterday" | "Earlier this week";
type FilterOption = "All" | "Warnings" | "Info";
type AlertItem = {
  id: string;
  kind: AlertKind;
  group: AlertGroup;
  label: string;
  title: string;
  body: string;
  date: string;
};

const GROUPS: AlertGroup[] = ["Today", "Yesterday", "Earlier this week"];

function groupForTimestamp(timestamp: number): AlertGroup {
  if (!timestamp) return "Earlier this week";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;
  if (timestamp >= startToday) return "Today";
  if (timestamp >= startYesterday) return "Yesterday";
  return "Earlier this week";
}

function formatSensorTimestamp(reading: RainSensorReading) {
  if (reading.updatedAt <= 1_700_000_000_000) return "Live sensor update";
  return new Date(reading.updatedAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AlertCard({ alert, onPress }: { alert: AlertItem; onPress: () => void }) {
  const isWarning = alert.kind === "warning";
  const icon = isWarning ? "warning" : alert.kind === "announcement" ? "campaign" : "description";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.alertCard, isWarning ? styles.warningCard : styles.infoCard, pressed && styles.cardPressed]} accessibilityRole="button" accessibilityLabel={`Read full details for ${alert.title}`}>
      <View style={[styles.alertIconCircle, isWarning ? styles.warningIconCircle : styles.infoIconCircle]}>
        <MaterialIcons name={icon} size={30} color={isWarning ? COLORS.warning : COLORS.green} />
      </View>
      <View style={styles.alertCopy}>
        <Text style={[styles.alertLabel, isWarning ? styles.warningLabel : styles.infoLabel]}>{alert.label}</Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.alertTitle}>{alert.title}</Text>
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.alertBody}>{alert.body}</Text>
        <View style={styles.dateRow}>
          <MaterialIcons name="calendar-today" size={15} color={COLORS.muted} />
          <Text style={styles.dateText}>{alert.date}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={isWarning ? COLORS.warning : COLORS.green} style={styles.cardChevron} />
    </Pressable>
  );
}

export default function AlertsAnnouncementsScreen() {
  const entranceStyle = useScreenEntrance();
  const [filter, setFilter] = useState<FilterOption>("All");
  const [rainReading, setRainReading] = useState<RainSensorReading | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [cleared, setCleared] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => subscribeToRainSensor(RAIN_SENSOR_DEVICE_ID, setRainReading, () => undefined), []);
  useEffect(() => subscribeToAnnouncements(setAnnouncements), []);

  const alerts = useMemo(() => {
    if (cleared) return [];

    const items: AlertItem[] = announcements.map((announcement) => ({
      id: `announcement-${announcement.id}`,
      kind: "announcement",
      group: groupForTimestamp(announcement.timestamp),
      label: "Announcement",
      title: announcement.title,
      body: announcement.body,
      date: formatAnnouncementDate(announcement.timestamp),
    }));
    if (rainReading) {
      const isWarning = isRainfallAlertLevel(rainReading.level);
      items.unshift({
        id: `sensor-${rainReading.deviceId}`,
        kind: isWarning ? "warning" : "info",
        group: "Today",
        label: isWarning ? "Warning" : "Sensor Update",
        title: `${formatRainfallLevel(rainReading.level)} Detected`,
        body: `Rainfall sensor reading: ${rainReading.rawValue}. Current level: ${formatRainfallLevel(rainReading.level)}.`,
        date: formatSensorTimestamp(rainReading),
      });
    }

    if (filter === "Warnings") return items.filter((alert) => alert.kind === "warning");
    if (filter === "Info") return items.filter((alert) => alert.kind !== "warning");
    return items;
  }, [announcements, cleared, filter, rainReading]);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.headerTitle}>Alerts &amp; Announcements</Text>
          <View style={styles.headerButton} />
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            {GROUPS.map((group) => {
              const groupAlerts = alerts.filter((alert) => alert.group === group);
              if (groupAlerts.length === 0 && group !== "Today") return null;
              return (
                <View key={group} style={styles.alertGroup}>
                  {group === "Today" ? (
                    <View style={styles.todayHeader}>
                      <Text style={[styles.groupTitle, styles.todayTitle]}>Today</Text>
                      <View style={styles.todayActions}>
                        <View style={styles.filterControl}>
                          <Pressable onPress={() => setShowFilterMenu((visible) => !visible)} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Filter alerts, currently ${filter}`} accessibilityState={{ expanded: showFilterMenu }}>
                            <MaterialIcons name="filter-alt" size={17} color={COLORS.green} />
                            <Text numberOfLines={1} style={styles.toolbarText}>{filter === "All" ? "Filter" : filter}</Text>
                            <MaterialIcons name={showFilterMenu ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={17} color={COLORS.green} />
                          </Pressable>
                          {showFilterMenu && (
                            <View style={styles.filterMenu}>
                              {(["All", "Warnings", "Info"] as FilterOption[]).map((option) => (
                                <Pressable key={option} onPress={() => { setFilter(option); setShowFilterMenu(false); }} style={({ pressed }) => [styles.filterOption, filter === option && styles.filterOptionSelected, pressed && styles.pressed]} accessibilityRole="menuitem">
                                  <Text style={[styles.filterOptionText, filter === option && styles.filterOptionTextSelected]}>{option}</Text>
                                  {filter === option && <MaterialIcons name="check" size={16} color={COLORS.green} />}
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>
                        <Pressable onPress={() => { setCleared(true); setShowFilterMenu(false); }} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Clear all alerts">
                          <MaterialIcons name="delete-outline" size={18} color={COLORS.warning} />
                          <Text style={styles.clearButtonText}>Clear All</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : <Text style={styles.groupTitle}>{group}</Text>}
                  <View style={styles.alertList}>
                    {groupAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} onPress={() => setSelectedAlert(alert)} />)}
                  </View>
                </View>
              );
            })}

            {alerts.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="notifications-none" size={28} color={COLORS.green} />
                <Text style={styles.emptyTitle}>No alerts to display</Text>
                <Text style={styles.emptyBody}>New safety updates will appear here.</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
      <Modal visible={selectedAlert !== null} transparent animationType="fade" onRequestClose={() => setSelectedAlert(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailHeading}>Alert Details</Text>
              <Pressable onPress={() => setSelectedAlert(null)} hitSlop={8} style={styles.detailClose} accessibilityRole="button" accessibilityLabel="Close details">
                <MaterialIcons name="close" size={22} color={COLORS.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.detailLabel, selectedAlert?.kind === "warning" ? styles.warningLabel : styles.infoLabel]}>{selectedAlert?.label}</Text>
              <Text style={styles.detailTitle}>{selectedAlert?.title}</Text>
              <Text style={styles.detailDate}>{selectedAlert?.date}</Text>
              <Text style={styles.detailBody}>{selectedAlert?.body}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  header: { height: 51, backgroundColor: COLORS.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  headerButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.65 },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  contentArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 104 },
  todayHeader: { minHeight: 38, zIndex: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  todayActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterControl: { position: "relative", zIndex: 30 },
  toolbarButton: { height: 34, minWidth: 88, maxWidth: 106, borderWidth: 1, borderColor: "#CFE4D7", borderRadius: 17, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#F4FAF6" },
  clearButton: { height: 34, borderWidth: 1, borderColor: "#F2A7A7", borderRadius: 17, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFF4F4" },
  toolbarText: { flexShrink: 1, color: COLORS.green, fontSize: 10, fontWeight: "800" },
  clearButtonText: { color: COLORS.warning, fontSize: 10, fontWeight: "800" },
  filterMenu: { position: "absolute", top: 38, right: 0, width: 120, zIndex: 40, elevation: 10, overflow: "hidden", borderWidth: 1, borderColor: "#D8E4DC", borderRadius: 8, backgroundColor: COLORS.white, shadowColor: "#000000", shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  filterOption: { minHeight: 40, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8EEE9" },
  filterOptionSelected: { backgroundColor: "#EFF8F1" },
  filterOptionText: { color: COLORS.ink, fontSize: 11, fontWeight: "600" },
  filterOptionTextSelected: { color: COLORS.green, fontWeight: "800" },
  alertGroup: { marginBottom: 18 },
  groupTitle: { color: COLORS.ink, fontSize: 14, lineHeight: 19, fontWeight: "800", marginLeft: 2, marginBottom: 9 },
  todayTitle: { marginBottom: 0 },
  alertList: { gap: 10 },
  alertCard: { height: 122, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 13, flexDirection: "row", alignItems: "flex-start", elevation: 1, shadowColor: "#000000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  warningCard: { borderColor: COLORS.warningBorder, backgroundColor: COLORS.warningBackground },
  infoCard: { borderColor: "#E5E7EB", backgroundColor: COLORS.white },
  alertIconCircle: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 1 },
  warningIconCircle: { backgroundColor: "#FFE2E2" },
  infoIconCircle: { backgroundColor: "#E5F4E9" },
  alertCopy: { flex: 1, marginLeft: 13, paddingRight: 18 },
  cardChevron: { position: "absolute", right: 9, top: 50 },
  alertLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", marginBottom: 2 },
  warningLabel: { color: COLORS.warning },
  infoLabel: { color: COLORS.green },
  alertTitle: { color: COLORS.ink, fontSize: 13, lineHeight: 17, fontWeight: "800" },
  alertBody: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  dateText: { flexShrink: 1, color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  emptyState: { minHeight: 150, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800", marginTop: 8 },
  emptyBody: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "flex-end" },
  detailCard: { maxHeight: "78%", backgroundColor: COLORS.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 28 },
  detailHeader: { minHeight: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  detailHeading: { flex: 1, color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  detailClose: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  detailContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  detailLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  detailTitle: { color: COLORS.ink, fontSize: 17, lineHeight: 22, fontWeight: "800", marginTop: 3 },
  detailDate: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 5 },
  detailBody: { color: COLORS.ink, fontSize: 12, lineHeight: 20, marginTop: 16 },
});
