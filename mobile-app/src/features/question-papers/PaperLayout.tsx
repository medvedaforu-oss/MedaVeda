import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { SPACING, STUDY_LAYOUT } from '../../theme/spacing';
import { FONT } from '../../theme/fonts';
import { RADIUS } from '../../theme/radius';

export const paperStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  body: { ...STUDY_LAYOUT, paddingBottom: SPACING.xl, flexGrow: 1 },
  heading: { fontSize: FONT.heading, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  section: { marginBottom: SPACING.sm },
  sectionHeading: { fontSize: FONT.subHeading, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  text: { fontSize: FONT.small, lineHeight: 21, color: COLORS.subtitle, textAlign: 'center' },
  card: { minHeight: 72, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  tile: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: FONT.body, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: FONT.small, lineHeight: 20, color: COLORS.subtitle, marginTop: SPACING.xs },
  button: { minHeight: 44, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  secondaryButton: { backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border },
  buttonText: { fontSize: FONT.small, fontWeight: '600', color: COLORS.textOnPrimary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  empty: { paddingVertical: SPACING.xl, alignItems: 'center' },
  offline: { padding: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceMuted },
  notice: { marginTop: SPACING.sm, alignItems: 'flex-start' },
  status: { fontSize: FONT.small, lineHeight: 20, color: COLORS.subtitle },
  error: { fontSize: FONT.small, lineHeight: 20, color: COLORS.error, marginBottom: SPACING.sm },
  failure: { padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, alignItems: 'flex-start' },
  loading: { paddingVertical: SPACING.xl },
  readerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { paddingHorizontal: SPACING.screen, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  page: { fontSize: FONT.tiny, color: COLORS.subtitle, textAlign: 'center', padding: SPACING.xs },
});

export function PaperOffline() {
  const network = useNetInfo();
  if (network.isConnected !== false && network.isInternetReachable !== false) return null;
  return <View accessibilityRole="alert" accessibilityLabel="Offline" style={paperStyles.offline}>
    <Text style={paperStyles.status}>You’re offline. Connect to load question papers. Exported PDFs remain in your device’s download location.</Text>
  </View>;
}

export function PaperButton({ title, onPress, disabled = false, secondary = false }: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[paperStyles.button, secondary && paperStyles.secondaryButton, disabled && { opacity: 0.5 }]}>
    <Text style={paperStyles.buttonText}>{title}</Text>
  </TouchableOpacity>;
}

export function PaperCard({ title, subtitle, onPress, icon = 'document-text-outline' }: {
  title: string; subtitle?: string; onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
    onPress={onPress} activeOpacity={0.85} style={paperStyles.card}>
    <View style={paperStyles.tile}><Ionicons name={icon} size={24} color={COLORS.accent} /></View>
    <View style={paperStyles.cardContent}>
      <Text style={paperStyles.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={paperStyles.subtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.subtitle} />
  </TouchableOpacity>;
}

export function PaperEmpty({ title }: { title: string }) {
  return <View style={paperStyles.empty}><Text style={paperStyles.text}>{title}</Text></View>;
}

export default function PaperLayout({ title, loading, error, retry, children }: {
  title: string; loading: boolean; error?: string;
  retry: () => void; children?: ReactNode;
}) {
  return <ScrollView style={paperStyles.screen} contentContainerStyle={paperStyles.body}
    keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Text accessibilityRole="header" style={paperStyles.heading}>{title}</Text>
    <PaperOffline />
    {loading ? <ActivityIndicator style={paperStyles.loading} color={COLORS.accent} accessibilityLabel="Loading papers" /> : error ? <View style={paperStyles.failure}>
      <Text accessibilityRole="alert" style={paperStyles.error}>{error}</Text>
      <PaperButton title="Retry" onPress={retry} />
    </View> : children}
  </ScrollView>;
}
