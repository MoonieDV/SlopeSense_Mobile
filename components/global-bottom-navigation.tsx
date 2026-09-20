import { MaterialIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const colors = { green: "#10804F", muted: "#718394", border: "#E4ECE7" };
const items = [
  { label: "Home", icon: "home" as const, route: "/dashboard" },
  { label: "Alerts", icon: "notifications-none" as const, route: "/alerts-announcements" },
  { label: "Reports", icon: "description" as const, route: "/reports" },
  { label: "Guide", icon: "menu-book" as const, route: "/guide" },
  { label: "Profile", icon: "person-outline" as const, route: "/profile" },
];

export function GlobalBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!items.some((item) => item.route === pathname)) return null;

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.navigation}>
        {items.map((item) => {
          const active = pathname === item.route;
          return (
            <Pressable key={item.route} onPress={() => !active && router.replace(item.route as never)} style={({ pressed }) => [styles.item, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={item.label}>
              <MaterialIcons name={item.icon} size={25} color={active ? colors.green : colors.muted} />
              <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
              {active && <View style={styles.activeLine} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: colors.border },
  navigation: { height: 70, flexDirection: "row", justifyContent: "space-around", paddingTop: 8 },
  item: { width: "20%", alignItems: "center", position: "relative", paddingTop: 1 },
  label: { color: colors.muted, fontSize: 10, marginTop: 3 },
  activeLabel: { color: colors.green, fontWeight: "800" },
  activeLine: { position: "absolute", bottom: -9, width: 42, height: 3, borderRadius: 2, backgroundColor: colors.green },
  pressed: { opacity: 0.6 },
});