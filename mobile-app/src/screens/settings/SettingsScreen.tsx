import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
} from "react-native";

import { useNavigation } from "@react-navigation/native";

import SettingsItem from "../../components/SettingsItem";
import ConfirmationDialog from "../../components/ConfirmationDialog";

import { COLORS } from "../../theme/colors";
import { SPACING } from "../../theme/spacing";

import { deleteAccount } from "../../services/usersService";
import { performSignOut } from "../../services/authState";
import { logError } from "../../utils/logger";


export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Download MedVeda - The study app for BAMS, BHMS, BUMS, BSMS & BNYS students.\n\nhttps://play.google.com/store/apps/details?id=in.medveda.app",
      });
    } catch (error) {
      logError("Screen action failed", error);
    }
  };

  const handleContact = async () => {
    const url =
      "mailto:medvedaforu@gmail.com?subject=MedVeda Support";

    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      } else {
        Alert.alert("No Email App Found", "Please email medvedaforu@gmail.com directly.");
      }
    } catch {
      Alert.alert("Could Not Open Email", "Please email medvedaforu@gmail.com directly.");
    }
  };

  const handleRateApp = async () => {
    const packageName = "in.medveda.app";
    try {
      await Linking.openURL(`market://details?id=${packageName}`);
    } catch {
      try {
        await Linking.openURL(`https://play.google.com/store/apps/details?id=${packageName}`);
      } catch {
        Alert.alert("Could Not Open Store", "Check your connection and try again.");
      }
    }
  };

  const confirmLogout = async () => {
    setLogoutDialogVisible(false);

    try {
      await performSignOut();
      // Previously missing: without this, the user was left on this
      // screen after signing out (no global auth-state listener exists
      // to redirect them), able to keep tapping into screens with no
      // valid session.
      navigation.replace("Login");
    } catch (error) {
      logError("Screen action failed", error);

      Alert.alert(
        "Logout Failed",
        "Please try again."
      );
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);

    try {
      await deleteAccount();
      setDeleteDialogVisible(false);
      // No global auth-state listener redirects on sign-out (same reason
      // Logout above does it explicitly), so navigate away manually.
      navigation.replace("Login");
    } catch (error: any) {
      logError("Delete account failed:", error);
      setDeleteDialogVisible(false);

      Alert.alert(
        "Delete Account Failed",
        error?.message || "Something went wrong. Please try again, or contact support."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SettingsItem
        icon="⏰"
        title="Study Reminder"
        onPress={() => navigation.navigate("StudyReminder")}
      />

      <SettingsItem
        icon="🛍️"
        title="Notes"
        onPress={() => navigation.navigate("Store")}
      />

      <SettingsItem
        icon="⭐"
        title="Rate App"
        onPress={handleRateApp}
      />

      <SettingsItem
        icon="📤"
        title="Share App"
        onPress={handleShare}
      />

      <SettingsItem
        icon="📞"
        title="Contact Us"
        onPress={handleContact}
      />

      <SettingsItem
        icon="ℹ️"
        title="About MedVeda"
        onPress={() => navigation.navigate("About")}
      />

      <SettingsItem
        icon="🔒"
        title="Privacy Policy"
        onPress={() => navigation.navigate("Privacy")}
      />

      <SettingsItem
        icon="📜"
        title="Terms & Conditions"
        onPress={() => navigation.navigate("Terms")}
      />

      <SettingsItem
        icon="🚪"
        title="Logout"
        onPress={() => setLogoutDialogVisible(true)}
      />

      <SettingsItem
        icon="🗑️"
        title="Delete Account"
        destructive
        onPress={() => setDeleteDialogVisible(true)}
      />

      <ConfirmationDialog
        visible={logoutDialogVisible}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        destructive
        onConfirm={confirmLogout}
        onCancel={() => setLogoutDialogVisible(false)}
      />

      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Account"
        message="This requests permanent account deletion and removes access to your purchases. Some transaction records may be retained. This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        busy={deleting}
        destructive
        onConfirm={confirmDeleteAccount}
        onCancel={() => !deleting && setDeleteDialogVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
});
