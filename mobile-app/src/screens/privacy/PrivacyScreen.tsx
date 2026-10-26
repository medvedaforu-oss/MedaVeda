import { PRIVACY_INVENTORY } from "../../constants/privacyInventory";
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from "react-native";

import WebLink from "../../components/WebLink";
import { LEGAL, WEB } from "../../constants/legal";
import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";

export default function PrivacyScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        🔒 Privacy Policy
      </Text>

      <Text style={styles.intro}>
        MedVeda respects your privacy. This is a short summary of how
        we handle your personal data under India's Digital Personal
        Data Protection Act, 2023. The full policy is on our website.
      </Text>
      <WebLink label="Read full policy" url={WEB.privacy} />

      <Text style={styles.heading}>
        Information We Collect
      </Text>
      {PRIVACY_INVENTORY.map(row => (
        <View key={row.category} style={styles.inventoryRow}>
          <Text style={styles.inventoryLabel}>{row.category}</Text>
          <Text style={styles.body}>{row.data}{"\n"}Where: {row.provider}{"\n"}Purpose: {row.purpose}</Text>
        </View>
      ))}
      <Text style={styles.body}>
        We do not access device location, contacts or photos. Payment providers
        handle card, UPI PIN and bank credentials; we do not store them.
      </Text>
      <Text style={styles.heading}>
        How We Use Your Information
      </Text>
      <Text style={styles.body}>
        • Create and secure your account{"\n"}
        • Deliver purchased content and track your progress{"\n"}
        • Send account emails and notifications you allow{"\n"}
        • Fix bugs and improve the app{"\n"}
        • Provide support and prevent fraud and abuse{"\n\n"}
        We do not sell your personal data.
      </Text>
      <Text style={styles.heading}>
        Payments
      </Text>
      <Text style={styles.body}>
        Google Play processes digital Notes purchases in the Google Play
        Android app. Separate permitted distribution builds use Razorpay.
        We verify purchases and, where required by an enrolled payment
        program, report eligible Razorpay transactions and refunds to
        Google Play. We do not store your card numbers, UPI PIN or bank
        credentials.
      </Text>
      <Text style={styles.heading}>
        Who We Share Data With
      </Text>
      <Text style={styles.body}>
        Service providers that process data on our behalf:{"\n"}
        • Supabase – database, sign-in, server functions and file storage (project region: Seoul, South Korea){"\n"}
        • Razorpay – payments{"\n"}
        • Configured account-email provider (intended to be Resend; live setup requires verification){"\n"}
        • Sentry – crash and error reports{"\n"}
        • Expo and device push providers – push notifications{"\n"}
        • Google Play – app distribution, Google Play Billing, purchase
        verification and any required payment-program reporting{"\n\n"}
        Each provider follows its own privacy policy. We may also
        disclose data where the law requires it.
      </Text>
      <Text style={styles.heading}>
        Data Security
      </Text>
      <Text style={styles.body}>
        We use encrypted connections, per-user access rules, secure
        device storage for your session and time-limited links for
        paid notes.
      </Text>
      <Text style={styles.heading}>
        Children
      </Text>
      <Text style={styles.body}>
        MedVeda is for students of degree-level AYUSH courses and is
        not directed at children. If you are under 18, please use the
        app only with the consent and supervision of a parent or
        guardian.
      </Text>
      <Text style={styles.heading}>
        Data Retention
      </Text>
      <Text style={styles.body}>
        Account data is kept while your account is active. Successful in-app
        deletion erases account and linked study data and removes purchased access;
        limited transaction, invoice and tax records may remain for up to 8 years
        under the existing retention policy.{"\n"}
        Fraud-prevention email/phone hashes, the original account ID and first-purchase timestamp have a retention cutoff of 180 days from the first recorded purchase, including when an account is later deleted. Deleting an account does not restart that period. We have not yet confirmed automatic cleanup of these records; deletion at that cutoff is not guaranteed while cleanup is pending.{"\n"}
        The stated retention period for crash reports and usage data is up to
        12 months. Enforcement in provider settings and cleanup jobs still
        requires verification.
      </Text>
      <Text style={styles.heading}>
        Your Rights
      </Text>
      <Text style={styles.body}>
        You may ask for a summary of your data, correction of
        inaccurate data, erasure, withdrawal of consent, or to
        nominate someone to act for you. Email us from your
        registered address and we will respond within 30 days.
      </Text>
      <Text style={styles.heading}>
        Delete Your Account
      </Text>
      <Text style={styles.body}>
        Sign in, open Settings → Delete Account, and confirm Delete. Wait for
        success; if deletion fails, retry or contact support. Deletion removes
        access to your purchases and cannot be undone.{"\n"}
        If you cannot sign in, email {LEGAL.email} from your registered address
        with the subject "Delete my MedVeda account" and your registered mobile
        number. Email requests are handled within 30 days after identity checks.
        Successful sign-out/deletion clears account-owned downloads and offline
        study data. Some local settings/history may remain; clear app storage
        or uninstall to remove those copies. See retained exceptions above.
      </Text>
      <WebLink label="Account & data deletion help" url={WEB.deleteAccount} />
      <Text style={styles.heading}>
        Grievance Officer
      </Text>
      <Text style={styles.body}>
        Name: {LEGAL.grievanceOfficer}{"\n"}
        Email: {LEGAL.email}{"\n"}
        Phone: {LEGAL.phoneDisplay}{"\n"}
        Address: {LEGAL.address}{"\n\n"}
        We acknowledge complaints {LEGAL.grievanceAck} and resolve
        them {LEGAL.grievanceResolution}.
      </Text>
      <Text style={styles.footer}>
        Effective date: {LEGAL.effectiveDate}
      </Text>
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

  title: {
    fontSize: FONT.title,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },

  intro: {
    fontSize: FONT.body,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },

  heading: {
    fontSize: FONT.heading,
    fontWeight: "700",
    color: COLORS.accentLight,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },

  inventoryRow: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inventoryLabel: { fontWeight: "700", color: COLORS.accentLight, marginBottom: SPACING.sm },

  body: {
    fontSize: FONT.body,
    color: COLORS.text,
    lineHeight: 24,
  },

  footer: {
    marginTop: SPACING.xl,
    textAlign: "center",
    color: COLORS.subtitle,
  },
});
