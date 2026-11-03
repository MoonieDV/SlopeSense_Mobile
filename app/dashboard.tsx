import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getSensorTimestamp, interpretResidentCondition, type ResidentCondition, type SensorReading, type SensorType } from "@/lib/current-conditions";
import { firebaseAuth } from "@/lib/firebase";
import { formatAnnouncementDate, subscribeToAnnouncements, type Announcement } from "@/lib/firebase-announcements";
import { subscribeToSensor } from "@/lib/sensor-data";

const colors = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  lightGreen: "#EFF8F1",
  ink: "#102B2B",
  muted: "#5F6D75",
  border: "#E5ECE8",
  blue: "#55A9E6",
  amber: "#F3B21A",
};

type IconName = keyof typeof MaterialIcons.glyphMap;

const SENSORS = [
  { id: "slope-01", type: "rainfall" as SensorType },
  { id: "soilSensor", type: "soilMoisture" as SensorType },
  { id: "tiltSensor", type: "tilt" as SensorType },
  { id: "vibrationSensor", type: "vibration" as SensorType },
];

const CONDITION_ICONS: Record<SensorType, IconName> = {
  rainfall: "cloud",
  soilMoisture: "grass",
  tilt: "terrain",
  vibration: "vibration",
};

const SEVERITY_COLORS = {
  normal: { accent: colors.green, pale: "#E4F1EA", border: colors.border },
  caution: { accent: "#D69E00", pale: "#FFF6DA", border: "#F3D98B" },
  warning: { accent: "#D97706", pale: "#FFF3E0", border: "#F4C277" },
  danger: { accent: "#C62828", pale: "#FDECEC", border: "#F2B8B8" },
};

function formatConditionTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

type DisplayCondition = {
  key: string;
  icon: IconName;
  title: string;
  message: string;
  severity: keyof typeof SEVERITY_COLORS;
  timestamp?: number;
};

function SensorCardDeck({ readings, loaded }: { readings: Record<string, SensorReading | null>; loaded: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeY = useRef(new Animated.Value(0)).current;
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const animateSwipeRef = useRef<(direction: -1 | 1, resumeAfter?: boolean) => void>(() => {});
  const scheduleAutoPlayRef = useRef<() => void>(() => {});
  const conditions = useMemo(() => SENSORS
      .map((sensor) => interpretResidentCondition(sensor.type, readings[sensor.id]))
      .filter((condition): condition is ResidentCondition => condition !== null),
    [readings],
  );
  const cards = useMemo<DisplayCondition[]>(() => {
    if (!loaded) {
      return [{
        key: "loading",
        icon: "sync",
        title: "Checking Current Conditions",
        message: "Getting the latest updates for your area.",
        severity: "normal",
      }];
    }

    if (conditions.length === 0) {
      const timestamps = Object.values(readings)
        .filter((reading): reading is SensorReading => Boolean(reading))
        .map(getSensorTimestamp);
      return [{
        key: "normal",
        icon: "check-circle",
        title: "Conditions are Normal",
        message: "No unusual conditions have been detected in your area.",
        severity: "normal",
        timestamp: timestamps.length > 0 ? Math.max(...timestamps) : Date.now(),
      }];
    }

    return conditions.map((condition) => ({
      key: condition.sensorType,
      icon: CONDITION_ICONS[condition.sensorType],
      title: condition.title,
      message: `${condition.message} ${condition.advice}`,
      severity: condition.severity,
      timestamp: condition.timestamp,
    }));
  }, [conditions, loaded, readings]);
  const cardCountRef = useRef(cards.length);
  cardCountRef.current = cards.length;
  const cardKeys = cards.map((card) => card.key).join("|");

  const stopAutoPlay = () => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  };

  animateSwipeRef.current = (direction, resumeAfter = false) => {
    Animated.timing(swipeX, { toValue: direction * 500, duration: 300, useNativeDriver: false }).start(() => {
      setActiveIndex((current) => {
        const count = cardCountRef.current;
        return direction < 0 ? (current + 1) % count : (current - 1 + count) % count;
      });
      swipeX.setValue(0);
      swipeY.setValue(0);
      if (resumeAfter) scheduleAutoPlayRef.current();
    });
  };

  scheduleAutoPlayRef.current = () => {
    stopAutoPlay();
    if (cardCountRef.current > 1) {
      autoPlayTimer.current = setInterval(() => animateSwipeRef.current(-1), 4000);
    }
  };

  useEffect(() => {
    setActiveIndex(0);
    swipeX.setValue(0);
    swipeY.setValue(0);
    scheduleAutoPlayRef.current();
    return stopAutoPlay;
  }, [cardKeys, swipeX, swipeY]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => cardCountRef.current > 1 && Math.abs(gesture.dx) > 8,
    onPanResponderGrant: stopAutoPlay,
    onPanResponderMove: (_, gesture) => {
      swipeX.setValue(gesture.dx);
      swipeY.setValue(gesture.dy * 0.08);
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 70 || Math.abs(gesture.vx) > 0.5) {
        const direction = gesture.dx > 0 ? 1 : -1;
        animateSwipeRef.current(direction, true);
      } else {
        Animated.parallel([
          Animated.spring(swipeX, { toValue: 0, friction: 7, tension: 120, useNativeDriver: false }),
          Animated.spring(swipeY, { toValue: 0, friction: 7, tension: 120, useNativeDriver: false }),
        ]).start(() => scheduleAutoPlayRef.current());
      }
    },
  })).current;

  const rotate = swipeX.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-8deg", "0deg", "8deg"] });

  return (
    <View style={cardDeckStyles.wrapper}>
      <View style={cardDeckStyles.container}>
        {cards.map((card, cardIndex) => {
          const offset = ((cardIndex - activeIndex) % cards.length + cards.length) % cards.length;
          const isTop = offset === 0;
          const isVisible = offset <= 2;
          const palette = SEVERITY_COLORS[card.severity];
          const animatedStyle = isTop
            ? { transform: [{ translateX: swipeX }, { translateY: swipeY }, { rotate }], zIndex: 10, elevation: 10 }
            : { transform: [{ translateX: offset * 12 }, { scale: 1 - offset * 0.06 }], zIndex: 10 - offset, elevation: 10 - offset };

          return (
            <Animated.View
              key={card.key}
              style={[cardDeckStyles.card, animatedStyle, { opacity: isVisible ? 1 : 0 }]}
              {...(isTop && cards.length > 1 ? panResponder.panHandlers : {})}
            >
              <View style={cardDeckStyles.cardRow}>
                <View style={[cardDeckStyles.iconCircle, { backgroundColor: palette.pale }]}>
                  <MaterialIcons name={card.icon} size={21} color={palette.accent} />
                </View>
                <View style={cardDeckStyles.cardCopy}>
                  <Text style={cardDeckStyles.sensorLabel} numberOfLines={1}>{card.title}</Text>
                  <Text style={cardDeckStyles.message} numberOfLines={2}>{card.message}</Text>
                  <View style={cardDeckStyles.metaRow}>
                    {card.timestamp && <Text style={cardDeckStyles.updated}>Updated: {formatConditionTime(card.timestamp)}</Text>}
                    <View style={[cardDeckStyles.statusBadge, { backgroundColor: palette.pale }]}>
                      <View style={[cardDeckStyles.statusDot, { backgroundColor: palette.accent }]} />
                      <Text style={[cardDeckStyles.statusText, { color: palette.accent }]}>
                        {card.severity === "normal" ? "Normal" : card.severity === "danger" ? "Alert" : "Caution"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
      {cards.length > 1 && (
        <View style={cardDeckStyles.dotsRow}>
          {cards.map((card, index) => <View key={card.key} style={[cardDeckStyles.dot, index === activeIndex && cardDeckStyles.dotActive]} />)}
        </View>
      )}
    </View>
  );
}

const cardDeckStyles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  container: { height: 100, alignItems: "center" },
  card: { position: "absolute", width: "92%", right: 18, height: 90, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 13, shadowColor: "#0B1C1C", shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, justifyContent: "center" },
  cardRow: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, marginLeft: 12 },
  sensorLabel: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  message: { fontSize: 13, fontWeight: "700", color: colors.ink, lineHeight: 17, marginTop: 1 },
  metaRow: { minHeight: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  updated: { fontSize: 9, fontWeight: "600", color: colors.muted },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  statusDot: { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  statusText: { fontSize: 9, fontWeight: "700" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CBD5E1" },
  dotActive: { width: 18, backgroundColor: colors.green },
});
function HeaderBirds() {
  return (
    <View pointerEvents="none" style={styles.birds}>
      <MaterialIcons name="keyboard-arrow-up" size={16} color="#93652E" style={styles.birdLeft} />
      <MaterialIcons name="keyboard-arrow-up" size={13} color="#93652E" style={styles.birdRight} />
    </View>
  );
}

function ActionTile({
  title,
  body,
  icon,
  primary,
  onPress,
}: {
  title: string;
  body: string;
  icon: IconName;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionTile, primary && styles.primaryTile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <MaterialIcons name={icon} size={39} color={primary ? "#FFFFFF" : colors.green} />
      <Text style={[styles.actionTitle, primary && styles.primaryText]}>{title}</Text>
      <Text style={[styles.actionBody, primary && styles.primarySubtext]}>{body}</Text>
      <View style={[styles.tileArrow, primary && styles.primaryArrow]}>
        <MaterialIcons name="chevron-right" size={22} color={primary ? "#FFFFFF" : colors.ink} />
      </View>
    </Pressable>
  );
}

function UpdateCard({
  icon,
  iconColor,
  iconBackground,
  title,
  time,
  body,
  featured,
}: {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  time: string;
  body: string;
  featured?: boolean;
}) {
  return (
    <View style={[styles.updateCard, featured && styles.featuredUpdate]}>
      <View style={[styles.updateIcon, { backgroundColor: iconBackground }]}>
        <MaterialIcons name={icon} size={35} color={iconColor} />
      </View>
      <View style={styles.updateCopy}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.updateTitle}>{title}</Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.updateTime}>{time}</Text>
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.updateBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const [displayName, setDisplayName] = useState(firebaseAuth.currentUser?.displayName?.trim() || "Juan Dela Cruz");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false);
  const [sensorReadings, setSensorReadings] = useState<Record<string, SensorReading | null>>({});
  const [loadedSensors, setLoadedSensors] = useState<Record<string, boolean>>({});
  const sectionAnimations = useRef(
    Array.from({ length: 5 }, () => ({ opacity: new Animated.Value(0), y: new Animated.Value(14) })),
  ).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setDisplayName(user?.displayName?.trim() || "Juan Dela Cruz");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribes = SENSORS.map((sensor) =>
      subscribeToSensor(
        sensor.id,
        (reading) => {
          const receivedAt = Date.now();
          setSensorReadings((prev) => ({
            ...prev,
            [sensor.id]: reading && typeof reading === "object" ? { ...reading, receivedAt } : null,
          }));
          setLoadedSensors((prev) => ({ ...prev, [sensor.id]: true }));
        },
        () => {},
      )
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  useEffect(() => subscribeToAnnouncements(
    (items) => {
      setAnnouncements(items);
      setAnnouncementsLoaded(true);
    },
    () => setAnnouncementsLoaded(true),
  ), []);

  useEffect(() => {
    sectionAnimations.forEach(({ opacity, y }, index) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          delay: index * 75,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          delay: index * 75,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [sectionAnimations]);

  const goTo = (path: RelativePathString) => router.push(path);

  return (
    <ScreenContainer
      edges={["top", "left", "right", "bottom"]}
      containerClassName="bg-[#004F2D]"
      systemBarColor={colors.deepGreen}
    >
      <StatusBar style="light" />
      <View style={styles.screen}>
        <Animated.View style={[styles.header, { opacity: sectionAnimations[0].opacity }]}>
          <View style={styles.brandBlock}>
            <Image source={require("@/assets/images/logo_icon.png")} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="SlopeSense logo" />
            <Text style={styles.brandName}>SlopeSense</Text>
          </View>
          <View style={styles.headerArtworkSpacer} />
        </Animated.View>

        <Animated.ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isNarrow ? 11 : 13 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[styles.hero, { opacity: sectionAnimations[0].opacity, transform: [{ translateY: sectionAnimations[0].y }] }]}>
            <Image
              source={require("@/assets/images/icon_1.png")}
              style={styles.heroImage}
              resizeMode="contain"
              accessibilityLabel="Mountain community landscape"
            />
            <HeaderBirds />
            <View style={styles.heroCopy}>
              <Text style={styles.hello}>Hello,</Text>
              <Text numberOfLines={2} adjustsFontSizeToFit style={styles.name}>
                {displayName}!
              </Text>
              <Text style={styles.tagline}>Stay aware. Stay prepared.</Text>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[1].opacity, transform: [{ translateY: sectionAnimations[1].y }] }}>
            <SensorCardDeck readings={sensorReadings} loaded={SENSORS.every((sensor) => loadedSensors[sensor.id])} />
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[2].opacity, transform: [{ translateY: sectionAnimations[2].y }] }}>
            <Text style={styles.sectionTitle}>What you can do</Text>
            <View style={styles.actionGrid}>
              <ActionTile
                primary
                icon="edit-note"
                title="Report an Incident"
                body="See something unusual? Let us know."
                onPress={() => goTo("/reports" as RelativePathString)}
              />
              <ActionTile
                icon="menu-book"
                title="Safety Guide"
                body="Learn simple safety tips for you and your family."
                onPress={() => goTo("/guide" as RelativePathString)}
              />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[3].opacity, transform: [{ translateY: sectionAnimations[3].y }] }}>
            <View style={styles.latestHeader}>
              <Text style={styles.sectionTitle}>Latest Updates</Text>
              <Pressable
                onPress={() => goTo("/alerts-announcements" as RelativePathString)}
                style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="View all latest updates"
              >
                <Text style={styles.viewAllText}>View All</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.green} />
              </Pressable>
            </View>
            {announcements.slice(0, 2).map((announcement, index) => (
              <UpdateCard
                key={announcement.id}
                featured={index === 0}
                icon="campaign"
                iconColor={index === 0 ? colors.amber : colors.green}
                iconBackground={index === 0 ? "#FFF6DA" : colors.lightGreen}
                title={announcement.title}
                time={formatAnnouncementDate(announcement.timestamp)}
                body={announcement.body}
              />
            ))}
            {announcementsLoaded && announcements.length === 0 && (
              <View style={styles.emptyUpdates}>
                <MaterialIcons name="campaign" size={24} color={colors.muted} />
                <Text style={styles.emptyUpdatesText}>No announcements available.</Text>
              </View>
            )}
          </Animated.View>
        </Animated.ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    minHeight: 82,
    backgroundColor: colors.deepGreen,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandBlock: { flexDirection: "row", alignItems: "center", transform: [{ translateY: -4 }] },
  brandLogo: { width: 36, height: 36, marginRight: 8 },
  brandName: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  headerArtworkSpacer: { width: 40, height: 40 },
  scrollContent: { width: "100%", maxWidth: 430, alignSelf: "center", paddingTop: 0, paddingBottom: 104 },
  hero: {
    height: 146,
    marginHorizontal: -13,
    marginBottom: 9,
    overflow: "hidden",
    backgroundColor: "#EEF8FB",
  },
  heroImage: {
    position: "absolute",
    right: -50,
    bottom: -4,
    width: 265,
    height: 125,
  },
  heroCopy: { position: "absolute", left: 19, top: 18, width: 205 },
  hello: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: "800" },
  name: { color: colors.ink, fontSize: 23, lineHeight: 28, fontWeight: "900" },
  tagline: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  birds: { position: "absolute", right: 64, top: 28, width: 38, height: 20 },
  birdLeft: { position: "absolute", left: 0, top: 2, transform: [{ rotate: "28deg" }] },
  birdRight: { position: "absolute", right: 4, top: 0, transform: [{ rotate: "22deg" }] },
  conditionCard: {
    minHeight: 77,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    marginBottom: 19,
    shadowColor: "#0B1C1C",
    shadowOpacity: 0.08,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  rainIcon: { width: 51, height: 48, alignItems: "center", justifyContent: "flex-start", marginRight: 12 },
  rainDrops: { flexDirection: "row", gap: 7, marginTop: -7 },
  drop: { width: 5, height: 12, borderRadius: 4, backgroundColor: "#39A9E8", transform: [{ rotate: "18deg" }] },
  dropMiddle: { marginTop: 4 },
  conditionCopy: { flex: 1, paddingTop: 1 },
  conditionTitle: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: "800" },
  conditionBody: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  sectionTitle: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  actionGrid: { flexDirection: "row", gap: 9, marginTop: 9, marginBottom: 20 },
  actionTile: {
    flex: 1,
    minHeight: 123,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    overflow: "hidden",
    shadowColor: "#0B1C1C",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  primaryTile: { backgroundColor: colors.green, borderColor: colors.green },
  actionTitle: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: "800", marginTop: 8 },
  actionBody: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3, paddingRight: 20 },
  primaryText: { color: "#FFFFFF" },
  primarySubtext: { color: "#D7F1E1" },
  tileArrow: {
    position: "absolute",
    right: 12,
    bottom: 11,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#EEF4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryArrow: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  latestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  viewAllButton: { flexDirection: "row", alignItems: "center", paddingLeft: 10, paddingVertical: 4 },
  viewAllText: { color: colors.green, fontSize: 10, fontWeight: "800", marginRight: 2 },
  updateCard: {
    height: 96,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    shadowColor: "#0B1C1C",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  featuredUpdate: { borderColor: "#F7E7BA", backgroundColor: "#FFFCF5" },
  updateIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 3 },
  updateCopy: { flex: 1 },
  updateTitle: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: "800" },
  updateTime: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 1 },
  updateBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  emptyUpdates: { minHeight: 68, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FFFFFF" },
  emptyUpdatesText: { color: colors.muted, fontSize: 11 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
