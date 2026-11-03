import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function useScreenEntrance() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return { opacity, transform: [{ translateY }] };
}