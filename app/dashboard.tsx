import { MaterialIcons } from "@expo/vector-icons";
import { type RelativePathString, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { firebaseAuth } from "@/lib/firebase";

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

function RainIcon() {
  return (
    <View style={styles.rainIcon}>
      <MaterialIcons name="cloud" size={41} color={colors.blue} />
      <View style={styles.rainDrops}>
        <View style={styles.drop} />
        <View style={[styles.drop, styles.dropMiddle]} />
        <View style={styles.drop} />
      </View>
    </View>
  );
}

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
        <Text style={styles.updateTitle}>{title}</Text>
        <Text style={styles.updateTime}>{time}</Text>
        <Text style={styles.updateBody}>{body}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const [displayName, setDisplayName] = useState(firebaseAuth.currentUser?.displayName?.trim() || "Juan Dela Cruz");
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
            <MaterialIcons name="terrain" size={42} color="#FFFFFF" />
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
            <View style={styles.conditionCard}>
              <RainIcon />
              <View style={styles.conditionCopy}>
                <Text style={styles.conditionTitle}>Rainy conditions</Text>
                <Text style={styles.conditionBody}>It has been raining in your area.</Text>
              </View>
            </View>
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
            <UpdateCard
              featured
              icon="campaign"
              iconColor={colors.amber}
              iconBackground="#FFF6DA"
              title="Community Drill"
              time="May 30, 2025 - 8:00 AM"
              body="A community evacuation drill will be conducted on May 30, 2025 at 8:00 AM."
            />
          </Animated.View>

          <Animated.View style={{ opacity: sectionAnimations[4].opacity, transform: [{ translateY: sectionAnimations[4].y }] }}>
            <UpdateCard
              icon="assignment"
              iconColor={colors.green}
              iconBackground={colors.lightGreen}
              title="Safety Reminder"
              time="May 28, 2025"
              body="Avoid staying near slopes during heavy rain. Keep your family safe."
            />
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
    minHeight: 90,
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
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
