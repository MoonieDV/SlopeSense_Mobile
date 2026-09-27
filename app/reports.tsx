import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { push, ref, serverTimestamp, set } from "firebase/database";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";
import { getDeviceLocation, searchLocationSuggestions, type DeviceLocation } from "@/lib/device-location";
import { firebaseAuth, firebaseDatabase } from "@/lib/firebase";

const COLORS = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#111827",
  muted: "#5F6368",
  border: "#DDE3E0",
  paleGreen: "#EFF8F1",
  white: "#FFFFFF",
};

const incidentTypes = ["Landslide", "Flooding", "Heavy Rainfall", "Road Damage", "Other"];

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const entranceStyle = useScreenEntrance();
  const [incidentType, setIncidentType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [showTypes, setShowTypes] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<DeviceLocation[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const skipNextLocationSearch = useRef(false);

  useEffect(() => {
    if (skipNextLocationSearch.current) {
      skipNextLocationSearch.current = false;
      return;
    }

    const query = location.trim();
    if (query.length < 3) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const suggestions = await searchLocationSuggestions(query);
        if (active) setLocationSuggestions(suggestions);
      } catch {
        if (active) setLocationSuggestions([]);
      } finally {
        if (active) setIsSearchingLocation(false);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [location]);

  const pickPhoto = async (source: "camera" | "gallery") => {
    setShowPhotoOptions(false);
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });

    if (!result.canceled && result.assets[0]?.uri) setPhotoUri(result.assets[0].uri);
  };

  const choosePhotoSource = () => {
    setShowPhotoOptions(true);
  };

  const fillCurrentLocation = async () => {
    if (isLocating) return;

    setIsLocating(true);
    try {
      const currentLocation = await getDeviceLocation();
      if (!currentLocation) {
        Alert.alert(
          "Location unavailable",
          "Enable Location Services and allow SlopeSense to access your location, then try again.",
        );
        return;
      }

      skipNextLocationSearch.current = true;
      setLocationSuggestions([]);
      setLocation(currentLocation.label);
    } catch {
      Alert.alert("Unable to get location", "Check your GPS signal and try again.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const user = firebaseAuth.currentUser;
    if (!user || !incidentType.trim() || !description.trim() || !location.trim()) {
      Alert.alert("Incomplete report", "Select an incident type and enter a location and description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const reportRef = push(ref(firebaseDatabase, "incidentReports"));
      await set(reportRef, {
        residentId: user.uid,
        incidentType,
        description,
        location,
        imageUrl: photoUri ?? "",
        timestamp: serverTimestamp(),
        status: "Pending",
      });
      setSubmitted(true);
    } catch {
      Alert.alert("Unable to submit report", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <Text style={styles.headerTitle}>Report an Incident</Text>
          <View style={styles.headerButton} />
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.noticeCard}>
            <MaterialIcons name="description" size={25} color={COLORS.deepGreen} />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Help keep your community safe</Text>
              <Text style={styles.noticeText}>Provide accurate information about the incident you have observed.</Text>
            </View>
          </View>

          <Text style={styles.label}>Incident Type</Text>
          <View style={[styles.selectWrap, showTypes && styles.selectWrapOpen]}>
            <Pressable onPress={() => setShowTypes((value) => !value)} style={styles.selectButton} accessibilityRole="button" accessibilityLabel="Select incident type">
              <Text style={[styles.selectText, !incidentType && styles.placeholderText]}>{incidentType || "Select incident type"}</Text>
              <MaterialIcons name={showTypes ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={19} color={COLORS.ink} />
            </Pressable>
            {showTypes && (
              <View style={styles.optionList}>
                {incidentTypes.map((type) => (
                  <Pressable key={type} onPress={() => { setIncidentType(type); setShowTypes(false); }} style={styles.option} accessibilityRole="button">
                    <Text style={styles.optionText}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.label}>Location</Text>
          <View style={styles.locationField}>
            <View style={[styles.inputWrap, styles.locationInputWrap]}>
              <MaterialIcons name="location-on" size={17} color={COLORS.ink} />
              <TextInput
                value={location}
                onChangeText={(value) => {
                  setLocationSuggestions([]);
                  setLocation(value);
                }}
                placeholder="Enter location"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                accessibilityLabel="Incident location"
                autoCorrect={false}
              />
              <Pressable onPress={() => void fillCurrentLocation()} disabled={isLocating} hitSlop={8} style={styles.locationButton} accessibilityRole="button" accessibilityLabel="Use current GPS location">
                {isLocating ? <ActivityIndicator size="small" color={COLORS.green} /> : <MaterialIcons name="my-location" size={19} color={COLORS.green} />}
              </Pressable>
            </View>
            {isSearchingLocation && <View style={styles.locationSearchStatus}><ActivityIndicator size="small" color={COLORS.green} /><Text style={styles.locationSearchText}>Finding locations...</Text></View>}
            {!isSearchingLocation && locationSuggestions.length > 0 && (
              <View style={styles.locationSuggestions}>
                {locationSuggestions.map((suggestion) => (
                  <Pressable
                    key={`${suggestion.latitude}-${suggestion.longitude}`}
                    onPress={() => {
                      skipNextLocationSearch.current = true;
                      setLocation(suggestion.label);
                      setLocationSuggestions([]);
                    }}
                    style={({ pressed }) => [styles.locationSuggestion, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${suggestion.label}`}
                  >
                    <MaterialIcons name="location-on" size={18} color={COLORS.green} />
                    <Text numberOfLines={2} style={styles.locationSuggestionText}>{suggestion.label}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => void Linking.openURL("https://www.openstreetmap.org/copyright")} style={styles.locationAttribution} accessibilityRole="link">
                  <Text style={styles.locationAttributionText}>© OpenStreetMap contributors</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.descriptionHeading}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.counter}>{description.length}/300</Text>
          </View>
          <View style={styles.descriptionWrap}>
            <TextInput value={description} onChangeText={(value) => setDescription(value.slice(0, 300))} placeholder="Describe what happened..." placeholderTextColor={COLORS.muted} style={styles.descriptionInput} multiline textAlignVertical="top" maxLength={300} accessibilityLabel="Incident description" />
          </View>

          <Text style={styles.label}>Photo (Optional)</Text>
          {photoUri ? (
            <View style={styles.photoPreviewCard}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" accessibilityLabel="Attached incident photo preview" />
              <View style={styles.photoPreviewActions}>
                <View style={styles.photoAttachedLabel}>
                  <MaterialIcons name="check-circle" size={17} color={COLORS.green} />
                  <Text style={styles.photoAttachedText}>Photo attached</Text>
                </View>
                <View style={styles.photoActionButtons}>
                  <Pressable onPress={choosePhotoSource} style={({ pressed }) => [styles.photoActionButton, pressed && styles.photoPressed]} accessibilityRole="button" accessibilityLabel="Change attached photo">
                    <MaterialIcons name="photo-camera" size={17} color={COLORS.green} />
                    <Text style={styles.changePhotoText}>Change</Text>
                  </Pressable>
                  <Pressable onPress={() => setPhotoUri(null)} style={({ pressed }) => [styles.removePhotoButton, pressed && styles.photoPressed]} accessibilityRole="button" accessibilityLabel="Remove attached photo">
                    <MaterialIcons name="delete-outline" size={18} color="#B42318" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <Pressable onPress={choosePhotoSource} style={({ pressed }) => [styles.photoBox, pressed && styles.photoPressed]} accessibilityRole="button" accessibilityLabel="Upload an incident photo">
              <View style={styles.photoIcon}><MaterialIcons name="photo-camera" size={27} color={COLORS.green} /></View>
              <Text style={styles.photoText}>Add a photo</Text>
              <Text style={styles.photoHint}>Take a photo or choose from your gallery</Text>
            </Pressable>
          )}
          <Text style={styles.fileHint}>JPG, PNG up to 5MB</Text>

          <Pressable onPress={() => void handleSubmit()} disabled={isSubmitting} style={({ pressed }) => [styles.submitButton, pressed && styles.submitPressed, isSubmitting && styles.disabledButton]} accessibilityRole="button" accessibilityLabel="Submit report">
            <Text style={styles.submitText}>Submit Report</Text>
          </Pressable>
          {submitted && <Text style={styles.successText}>Your incident report is ready to be submitted.</Text>}
          </ScrollView>
        </Animated.View>

        <View style={{ height: Platform.OS === "web" ? 0 : Math.max(insets.bottom - 2, 0), backgroundColor: COLORS.white }} />
      </View>
      <Modal visible={showPhotoOptions} transparent animationType="fade" onRequestClose={() => setShowPhotoOptions(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.photoOptionsCard}>
            <Text style={styles.photoOptionsTitle}>Attach a photo</Text>
            <Text style={styles.photoOptionsText}>Choose where to get the incident photo.</Text>
            <Pressable onPress={() => void pickPhoto("camera")} style={styles.photoOptionButton} accessibilityRole="button"><MaterialIcons name="photo-camera" size={21} color={COLORS.green} /><Text style={styles.photoOptionText}>Open Camera</Text></Pressable>
            <Pressable onPress={() => void pickPhoto("gallery")} style={styles.photoOptionButton} accessibilityRole="button"><MaterialIcons name="photo-library" size={21} color={COLORS.green} /><Text style={styles.photoOptionText}>Open Gallery</Text></Pressable>
            <Pressable onPress={() => setShowPhotoOptions(false)} style={styles.cancelButton} accessibilityRole="button"><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  header: { height: 56, backgroundColor: COLORS.deepGreen, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  headerButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.white, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.62 },
  contentArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 92 },
  noticeCard: { minHeight: 56, borderRadius: 6, backgroundColor: COLORS.paleGreen, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, marginBottom: 13 },
  noticeCopy: { flex: 1, marginLeft: 11 },
  noticeTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  noticeText: { color: COLORS.ink, fontSize: 11, lineHeight: 15, marginTop: 3 },
  label: { color: COLORS.ink, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  selectWrap: { zIndex: 2, marginBottom: 14 },
  selectWrapOpen: { zIndex: 50, elevation: 20 },
  selectButton: { height: 44, borderWidth: 1, borderColor: "#D5DADF", borderRadius: 7, paddingHorizontal: 12, alignItems: "center", justifyContent: "space-between", flexDirection: "row" },
  selectText: { color: COLORS.ink, fontSize: 12 },
  placeholderText: { color: COLORS.muted },
  optionList: { position: "absolute", top: 47, left: 0, right: 0, zIndex: 60, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 5, elevation: 24 },
  option: { minHeight: 40, justifyContent: "center", paddingHorizontal: 12 },
  optionText: { color: COLORS.ink, fontSize: 12 },
  inputWrap: { height: 44, borderWidth: 1, borderColor: "#D5DADF", borderRadius: 7, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", marginBottom: 14 },
  input: { flex: 1, color: COLORS.ink, fontSize: 12, marginLeft: 8, paddingVertical: 0 },
  locationField: { marginBottom: 14, zIndex: 10 },
  locationInputWrap: { marginBottom: 0, zIndex: 2, backgroundColor: COLORS.white },
  locationButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  locationSearchStatus: { position: "absolute", top: 44, left: 0, right: 0, minHeight: 40, zIndex: 20, elevation: 8, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, backgroundColor: COLORS.white, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  locationSearchText: { color: COLORS.muted, fontSize: 10 },
  locationSuggestions: { position: "absolute", top: 44, left: 0, right: 0, zIndex: 20, elevation: 8, maxHeight: 244, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, overflow: "hidden", backgroundColor: COLORS.white, shadowColor: "#000000", shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  locationSuggestion: { minHeight: 44, paddingHorizontal: 11, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 9, borderTopWidth: 1, borderTopColor: "#EEF1EF" },
  locationSuggestionText: { flex: 1, color: COLORS.ink, fontSize: 11, lineHeight: 15 },
  locationAttribution: { alignSelf: "stretch", alignItems: "flex-end", paddingVertical: 4, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: "#EEF1EF" },
  locationAttributionText: { color: COLORS.muted, fontSize: 8 },
  descriptionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { color: COLORS.ink, fontSize: 10, marginBottom: 5 },
  descriptionWrap: { height: 108, borderWidth: 1, borderColor: "#D5DADF", borderRadius: 7, marginBottom: 14 },
  descriptionInput: { flex: 1, color: COLORS.ink, fontSize: 12, lineHeight: 17, paddingHorizontal: 11, paddingTop: 10 },
  photoBox: { minHeight: 104, borderWidth: 1, borderStyle: "dashed", borderColor: "#BFCBC5", borderRadius: 8, backgroundColor: "#FAFCFB", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  photoPressed: { opacity: 0.62 },
  photoIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.paleGreen, alignItems: "center", justifyContent: "center" },
  photoText: { color: COLORS.ink, fontSize: 12, fontWeight: "700", marginTop: 7 },
  photoHint: { color: COLORS.muted, fontSize: 10, marginTop: 2 },
  photoPreviewCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: "hidden", backgroundColor: COLORS.white },
  photoPreview: { width: "100%", aspectRatio: 16 / 9, backgroundColor: COLORS.paleGreen },
  photoPreviewActions: { minHeight: 48, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  photoAttachedLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  photoAttachedText: { color: COLORS.ink, fontSize: 11, fontWeight: "700" },
  photoActionButtons: { flexDirection: "row", alignItems: "center", gap: 6 },
  photoActionButton: { minHeight: 34, paddingHorizontal: 9, borderRadius: 6, backgroundColor: COLORS.paleGreen, flexDirection: "row", alignItems: "center", gap: 5 },
  changePhotoText: { color: COLORS.green, fontSize: 11, fontWeight: "700" },
  removePhotoButton: { width: 34, height: 34, borderRadius: 6, backgroundColor: "#FFF1F0", alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", justifyContent: "flex-end" },
  photoOptionsCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 22, paddingBottom: 30 },
  photoOptionsTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800" },
  photoOptionsText: { color: COLORS.muted, fontSize: 12, marginTop: 4, marginBottom: 16 },
  photoOptionButton: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 9 },
  photoOptionText: { color: COLORS.ink, fontSize: 13, fontWeight: "700", marginLeft: 11 },
  cancelButton: { alignItems: "center", paddingVertical: 11, marginTop: 2 },
  cancelText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  fileHint: { color: COLORS.muted, fontSize: 10, marginTop: 5, marginBottom: 14 },
  submitButton: { height: 44, borderRadius: 7, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center" },
  submitPressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabledButton: { opacity: 0.55 },
  submitText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },
  successText: { color: COLORS.green, fontSize: 10, textAlign: "center", marginTop: 7 },
  bottomNav: { height: 56, borderTopWidth: 1, borderTopColor: "#E4E7E5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: COLORS.white, shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: -2 }, elevation: 5 },
  navItem: { width: 54, height: 49, alignItems: "center", justifyContent: "center", gap: 3 },
  navPressed: { opacity: 0.58 },
  navLabel: { color: "#33383D", fontSize: 10 },
  navLabelActive: { color: COLORS.green, fontWeight: "800" },
});
