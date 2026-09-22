import { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const HEADER_GREEN = "#004F2D";
const GLOW_GREEN = "#007A45";
const FRONT_WAVE = "#FFFFFF";
const BACK_WAVE = "#EAF5EF";

type AnimatedWavyHeaderProps = {
  height?: number;
  title?: string;
};

function buildWavePath(width: number, height: number, amplitude: number, offset = 0) {
  const y = height * 0.45 + offset;
  const segment = width / 4;

  return [
    `M 0 ${y}`,
    `C ${segment * 0.8} ${y - amplitude}, ${segment * 1.2} ${y - amplitude}, ${segment * 2} ${y}`,
    `S ${segment * 3.2} ${y + amplitude}, ${segment * 4} ${y}`,
    `S ${segment * 5.2} ${y - amplitude}, ${segment * 6} ${y}`,
    `S ${segment * 7.2} ${y + amplitude}, ${segment * 8} ${y}`,
    `L ${width * 2} ${height}`,
    `L 0 ${height}`,
    "Z",
  ].join(" ");
}

function AnimatedWavyHeader({ height = 205, title = "SlopeSense" }: AnimatedWavyHeaderProps) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(windowWidth, 320);
  const waveHeight = 96;
  const frontProgress = useSharedValue(0);
  const backProgress = useSharedValue(0);

  const frontPath = useMemo(() => buildWavePath(width, waveHeight, 20), [width]);
  const backPath = useMemo(() => buildWavePath(width, waveHeight, 16, -6), [width]);

  useEffect(() => {
    frontProgress.value = 0;
    backProgress.value = 0;
    frontProgress.value = withRepeat(
      withTiming(-width, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    backProgress.value = withRepeat(
      withTiming(width, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [backProgress, frontProgress, width]);

  const frontWaveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: frontProgress.value }],
  }));

  const backWaveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width + backProgress.value }],
  }));

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.glow} />

      <View style={styles.brandRow} pointerEvents="none">
        <MaterialIcons name="terrain" size={56} color="#FFFFFF" />
        <Text style={styles.brandName}>{title}</Text>
      </View>

      <Animated.View style={[styles.waveLayer, styles.backWaveLayer, { width: width * 2, height: waveHeight }, backWaveStyle]}>
        <Svg width={width * 2} height={waveHeight} viewBox={`0 0 ${width * 2} ${waveHeight}`} preserveAspectRatio="none">
          <Path d={backPath} fill={BACK_WAVE} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.waveLayer, { width: width * 2, height: waveHeight }, frontWaveStyle]}>
        <Svg width={width * 2} height={waveHeight} viewBox={`0 0 ${width * 2} ${waveHeight}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="frontWaveFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={FRONT_WAVE} stopOpacity="0.98" />
              <Stop offset="1" stopColor={FRONT_WAVE} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Path d={frontPath} fill="url(#frontWaveFade)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default memo(AnimatedWavyHeader);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: HEADER_GREEN,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  glow: {
    backgroundColor: GLOW_GREEN,
    borderRadius: 170,
    height: 220,
    left: -56,
    opacity: 0.76,
    position: "absolute",
    right: -56,
    top: -92,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: -14,
    zIndex: 3,
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  waveLayer: {
    bottom: -1,
    left: 0,
    position: "absolute",
  },
  backWaveLayer: {
    bottom: 8,
    opacity: 0.95,
  },
});
