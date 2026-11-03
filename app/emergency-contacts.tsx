import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, Modal, TextInput, Linking, BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ref, push, onValue, update, remove } from "firebase/database";

import { ScreenContainer } from "@/components/screen-container";
import { useScreenEntrance } from "@/hooks/use-screen-entrance";
import { firebaseAuth, firebaseDatabase } from "@/lib/firebase";

const colors = {
  green: "#006B3C",
  deepGreen: "#004F2D",
  ink: "#07111F",
  muted: "#5D6474",
  paleGreen: "#EAF7F0",
  softGreen: "#D9F1E4",
  border: "#E8EEE9",
  red: "#DC2626",
  redBg: "#FEF2F2",
  redBorder: "#FECACA",
};

type LocalNumber = {
  id?: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  phone: string;
};

const initialLocalNumbers: LocalNumber[] = [
  {
    id: "default-1",
    title: "Barangay Hall",
    subtitle: "For local assistance and reporting.",
    icon: "account-balance",
    phone: "1234567",
  },
  {
    id: "default-2",
    title: "Municipal Disaster Risk Reduction and Management Office (MDRRMO)",
    subtitle: "Disaster response and coordination.",
    icon: "security",
    phone: "1234567",
  },
  {
    id: "default-3",
    title: "Philippine National Police (PNP)",
    subtitle: "For emergencies and public safety.",
    icon: "local-police",
    phone: "117",
  },
  {
    id: "default-4",
    title: "Bureau of Fire Protection (BFP)",
    subtitle: "For fire and rescue operations.",
    icon: "local-fire-department",
    phone: "911",
  },
  {
    id: "default-5",
    title: "Philippine Red Cross",
    subtitle: "For medical assistance and relief.",
    icon: "add-circle",
    phone: "143",
  },
];

export default function EmergencyContactsScreen() {
  const router = useRouter();
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.replace('/guide' as any); return true; }); return () => sub.remove(); }, [router]);
  const entranceStyle = useScreenEntrance();

  const [modalVisible, setModalVisible] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  
  const [customContacts, setCustomContacts] = useState<LocalNumber[]>([]);
  const [editableLocalNumbers, setEditableLocalNumbers] = useState<LocalNumber[]>(initialLocalNumbers);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState("");
  const [editContactNumber, setEditContactNumber] = useState("");

  useEffect(() => {
    const user = firebaseAuth.currentUser;
    if (!user) return;

    const contactsRef = ref(firebaseDatabase, `users/${user.uid}/emergency_contacts`);
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedContacts: LocalNumber[] = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          title: value.title,
          subtitle: value.phone,
          icon: "person",
          phone: value.phone,
        }));
        setCustomContacts(parsedContacts);
      } else {
        setCustomContacts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveContact = () => {
    if (!contactName.trim() || !contactNumber.trim()) return;
    const user = firebaseAuth.currentUser;
    if (!user) return;

    const contactsRef = ref(firebaseDatabase, `users/${user.uid}/emergency_contacts`);
    push(contactsRef, {
      title: contactName,
      phone: contactNumber,
    });
    
    setContactName("");
    setContactNumber("");
    setModalVisible(false);
  };

  const openEditModal = (contact: LocalNumber) => {
    setEditContactId(contact.id!);
    setEditContactName(contact.title);
    setEditContactNumber(contact.phone);
    setEditModalVisible(true);
  };

  const handleUpdateContact = () => {
    if (!editContactName.trim() || !editContactNumber.trim() || !editContactId) return;

    if (editContactId.startsWith("default-")) {
      setEditableLocalNumbers(prev =>
        prev.map(c => c.id === editContactId ? { ...c, title: editContactName, phone: editContactNumber, subtitle: editContactNumber } : c)
      );
    } else {
      const user = firebaseAuth.currentUser;
      if (user) {
        const contactRef = ref(firebaseDatabase, `users/${user.uid}/emergency_contacts/${editContactId}`);
        update(contactRef, {
          title: editContactName,
          phone: editContactNumber,
        });
      }
    }
    setEditModalVisible(false);
  };

  const handleDeleteContact = () => {
    if (!editContactId) return;

    if (editContactId.startsWith("default-")) {
      setEditableLocalNumbers(prev => prev.filter(c => c.id !== editContactId));
    } else {
      const user = firebaseAuth.currentUser;
      if (user) {
        const contactRef = ref(firebaseDatabase, `users/${user.uid}/emergency_contacts/${editContactId}`);
        remove(contactRef);
      }
    }
    setEditModalVisible(false);
  };

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-white">
      <StatusBar style="light" />
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/guide" as any)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Preparedness Guide</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[styles.contentArea, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.heroTextArea}>
                <View style={styles.badge}>
                  <View style={styles.badgeIcon}>
                    <MaterialIcons name="phone" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.badgeText}>Emergency Contacts</Text>
                </View>
                <Text style={styles.heroTitle}>Emergency Contacts</Text>
                <Text style={styles.heroSubtitle}>Important contacts you may need in an emergency. Keep these numbers handy and accessible.</Text>
              </View>
              <Image source={require("@/assets/images/contact_icon.png")} style={styles.landscape} resizeMode="contain" accessibilityLabel="Illustration of a mobile phone with emergency contacts" />
            </View>

            {/* Add Contact CTA */}
            <Pressable onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.ctaBox, pressed && styles.pressed]}>
              <View style={styles.ctaIconBox}>
                <MaterialIcons name="person-add" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaTitle}>Add an Emergency Contact</Text>
                <Text style={styles.ctaSubtitle}>Save a contact for quick access.</Text>
              </View>
              <View style={styles.ctaRight}>
                <MaterialIcons name="add-circle" size={24} color="#FFFFFF" />
                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </View>
            </Pressable>

            {/* Emergency Hotline */}
            <Text style={styles.sectionTitle}>Emergency Hotline</Text>
            <View style={styles.hotlineCard}>
              <View style={styles.hotlineIconBox}>
                <MaterialIcons name="phone" size={28} color={colors.red} />
              </View>
              <View style={styles.hotlineCopy}>
                <Text style={styles.hotlineTitle}>Emergency Services</Text>
                <Text style={styles.hotlineSubtitle}>For life-threatening emergencies. Call immediately.</Text>
              </View>
              <View style={styles.hotlineRight}>
                <View style={styles.hotlineLabels}>
                  <Text style={styles.hotlineNum}>911</Text>
                  <Text style={styles.hotlineOrg}>NDRRMC</Text>
                </View>
                <Pressable onPress={() => handleCall("911")} style={({ pressed }) => [styles.callBtnRed, pressed && styles.pressed]}>
                  <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Local Emergency Numbers */}
            {editableLocalNumbers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Local Emergency Numbers</Text>
                <View style={styles.localList}>
                  {editableLocalNumbers.map((item) => (
                    <Pressable key={item.id} onPress={() => openEditModal(item)} style={({ pressed }) => [styles.localCard, pressed && styles.pressed]}>
                      <View style={styles.localIconBox}>
                        <MaterialIcons name={item.icon} size={26} color={colors.deepGreen} />
                      </View>
                      <View style={styles.localCopy}>
                        <Text style={styles.localTitle}>{item.title}</Text>
                        <Text style={styles.localSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Pressable onPress={(e) => { e.stopPropagation(); handleCall(item.phone); }} style={({ pressed }) => [styles.callBtnGreen, pressed && styles.pressed]}>
                        <MaterialIcons name="phone" size={20} color={colors.deepGreen} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Custom Emergency Contacts */}
            {customContacts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Personal Contacts</Text>
                <View style={styles.localList}>
                  {customContacts.map((item) => (
                    <Pressable key={item.id} onPress={() => openEditModal(item)} style={({ pressed }) => [styles.localCard, pressed && styles.pressed]}>
                      <View style={styles.localIconBox}>
                        <MaterialIcons name={item.icon} size={26} color={colors.deepGreen} />
                      </View>
                      <View style={styles.localCopy}>
                        <Text style={styles.localTitle}>{item.title}</Text>
                        <Text style={styles.localSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Pressable onPress={(e) => { e.stopPropagation(); handleCall(item.phone); }} style={({ pressed }) => [styles.callBtnGreen, pressed && styles.pressed]}>
                        <MaterialIcons name="phone" size={20} color={colors.deepGreen} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Safety footer */}
            <View style={styles.safetyFooter}>
              <View style={styles.safetyIconCircle}>
                <MaterialIcons name="verified-user" size={28} color={colors.deepGreen} />
              </View>
              <View style={styles.safetyCopy}>
                <Text style={styles.safetyTitle}>Keep these contacts accessible</Text>
                <Text style={styles.safetyDescription}>Save important numbers so you can quickly get help during an emergency.</Text>
              </View>
            </View>

          </ScrollView>
        </Animated.View>

        {/* Add Contact Modal */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Emergency Contact</Text>
                <Pressable onPress={() => setModalVisible(false)} style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}>
                  <MaterialIcons name="close" size={24} color={colors.ink} />
                </Pressable>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Contact Name"
                placeholderTextColor={colors.muted}
                value={contactName}
                onChangeText={setContactName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={contactNumber}
                onChangeText={setContactNumber}
              />
              <View style={[styles.modalActions, { justifyContent: "flex-end" }]}>
                <Pressable onPress={handleSaveContact} style={({ pressed }) => [styles.modalBtnSave, pressed && styles.pressed]}>
                  <Text style={styles.modalBtnSaveText}>Save Contact</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Contact Modal */}
        <Modal visible={editModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Emergency Contact</Text>
                <Pressable onPress={() => setEditModalVisible(false)} style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}>
                  <MaterialIcons name="close" size={24} color={colors.ink} />
                </Pressable>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Contact Name"
                placeholderTextColor={colors.muted}
                value={editContactName}
                onChangeText={setEditContactName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={editContactNumber}
                onChangeText={setEditContactNumber}
              />
              <View style={[styles.modalActions, { justifyContent: "space-between" }]}>
                <Pressable onPress={handleDeleteContact} style={({ pressed }) => [styles.modalBtnDelete, pressed && styles.pressed]}>
                  <Text style={styles.modalBtnDeleteText}>Delete</Text>
                </Pressable>
                <Pressable onPress={handleUpdateContact} style={({ pressed }) => [styles.modalBtnSave, pressed && styles.pressed]}>
                  <Text style={styles.modalBtnSaveText}>Update</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBFDFC" },
  header: {
    height: 54,
    backgroundColor: colors.deepGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  backButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", letterSpacing: 0 },
  contentArea: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  /* Hero */
  hero: { minHeight: 180, paddingTop: 14, paddingHorizontal: 15, overflow: "hidden" },
  heroTextArea: { zIndex: 2 },
  badge: {
    alignSelf: "flex-start",
    minHeight: 28,
    borderRadius: 14,
    paddingLeft: 6,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E4F1EA",
  },
  badgeIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.deepGreen, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.deepGreen, fontSize: 11, fontWeight: "800", marginLeft: 6 },
  heroTitle: { color: colors.ink, fontSize: 24, lineHeight: 26, fontWeight: "900", marginTop: 14, marginLeft: 2, maxWidth: 220, letterSpacing: 0 },
  heroSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7, marginLeft: 2, maxWidth: 200 },
  landscape: { position: "absolute", right: -25, bottom: 0, width: 190, height: 160, zIndex: 1 },

  /* Add Contact CTA */
  ctaBox: {
    backgroundColor: colors.deepGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 15,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#17251E",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaIconBox: { marginRight: 14 },
  ctaCopy: { flex: 1 },
  ctaTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "800", letterSpacing: 0 },
  ctaSubtitle: { color: "#D1E2D9", fontSize: 11, marginTop: 3 },
  ctaRight: { flexDirection: "row", alignItems: "center" },

  /* Section Titles */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.ink,
    marginHorizontal: 15,
    marginTop: 22,
    marginBottom: 10,
    letterSpacing: 0,
  },

  /* Hotline Card */
  hotlineCard: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  hotlineIconBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#FCE8E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hotlineCopy: { flex: 1, paddingRight: 10 },
  hotlineTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", letterSpacing: 0 },
  hotlineSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  hotlineRight: { flexDirection: "row", alignItems: "center" },
  hotlineLabels: { alignItems: "center", marginRight: 12 },
  hotlineNum: { color: colors.red, fontSize: 20, fontWeight: "900" },
  hotlineOrg: { color: colors.muted, fontSize: 9, fontWeight: "700", marginTop: -2 },
  callBtnRed: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Local Numbers List */
  localList: { paddingHorizontal: 15, gap: 10 },
  localCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#17251E",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  localIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  localCopy: { flex: 1, paddingRight: 10 },
  localTitle: { color: colors.ink, fontSize: 13, fontWeight: "900", letterSpacing: 0 },
  localSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  callBtnGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Safety Footer */
  safetyFooter: {
    marginHorizontal: 15,
    marginTop: 20,
    backgroundColor: colors.paleGreen,
    borderRadius: 11,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  safetyIconCircle: {
    marginRight: 12,
    marginTop: 2,
  },
  safetyCopy: { flex: 1 },
  safetyTitle: { color: colors.deepGreen, fontSize: 13, fontWeight: "900", letterSpacing: 0 },
  safetyDescription: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink,
  },
  modalCloseBtn: {
    padding: 4,
    marginRight: -4,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: "#F9FAFB",
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  modalBtnSave: {
    backgroundColor: colors.green,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  modalBtnSaveText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  modalBtnDelete: {
    backgroundColor: colors.redBg,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalBtnDeleteText: {
    color: colors.red,
    fontWeight: "800",
    fontSize: 14,
  },

  pressed: { opacity: 0.7 },
});






