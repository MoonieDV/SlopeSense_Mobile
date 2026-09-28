import { useRef } from "react";
import { Animated } from "react-native";

export function useScreenEntrance() {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  return { opacity, transform: [{ translateY }] };
}