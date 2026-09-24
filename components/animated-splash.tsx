import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

export function AnimatedSplashScreen({ onFinish }: { onFinish?: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const textTranslateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const exit = Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start();

    const timer = setTimeout(() => {
      exit.start(() => {
        onFinish?.();
      });
    }, 1800);

    return () => {
      clearTimeout(timer);
    };
  }, [fade, onFinish, scale, textTranslateY]);

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <Image
        source={require("@/assets/images/splash_screen_bg.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessibilityLabel="Mountain landscape"
      />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <Image
            source={require("@/assets/images/mountain_icon.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="SlopeSense mountain logo"
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            {
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          SlopeSense
        </Animated.Text>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>Early Warning Today,</Text>
        <Text style={styles.subtitle}>A Safer Tomorrow.</Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  content: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 350,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  logo: {
    width: 340,
    height: 210,
  },
  title: {
    color: "#0d6b4a",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 38,
    fontFamily: "System",
  },
  divider: {
    width: 220,
    height: 2,
    backgroundColor: "#0d6b4a",
    marginTop: 12,
    marginBottom: 14,
  },
  subtitle: {
    color: "#0d6b4a",
    fontSize: 18,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 25,
    fontFamily: "System",
    letterSpacing: -0.4,
  },
});
