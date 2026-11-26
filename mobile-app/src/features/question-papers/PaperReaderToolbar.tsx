import { ActivityIndicator, Alert, Platform, Share, Text, View } from 'react-native';
import { COLORS } from '../../theme/colors';
import { paperShareMessage, paperShareUrl } from './questionPaperLinks';
import { PaperButton, paperStyles } from './PaperLayout';
import type usePaperPdf from './usePaperPdf';

export default function PaperReaderToolbar({ title, pdf }: {
  title: string; pdf: ReturnType<typeof usePaperPdf>;
}) {
  const disabled = !pdf.value || pdf.busy || pdf.loading;
  const shareSupported = Platform.OS !== 'web' ||
    (typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  const share = async () => {
    if (!pdf.value || !pdf.isCurrent()) return;
    try {
      const message = paperShareMessage(pdf.paperId, title);
      await Share.share(Platform.OS === 'ios' ? { title, message, url: paperShareUrl(pdf.paperId) } : { title, message });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) Alert.alert('Sharing unavailable');
    }
  };
  return <View style={paperStyles.toolbar}>
    <View style={paperStyles.actions}>
      <PaperButton title={pdf.busy ? 'Downloading paper' : 'Download paper'}
        disabled={disabled} onPress={() => void pdf.download()} />
      <PaperButton title="Share paper link" secondary disabled={disabled || !shareSupported} onPress={() => void share()} />
    </View>
    {!!pdf.error && <View style={paperStyles.notice}>
      <Text accessibilityRole="alert" style={paperStyles.error}>{pdf.error}</Text>
      <PaperButton title="Retry" onPress={pdf.retry} disabled={pdf.loading || pdf.busy} />
    </View>}
    {!!pdf.status && !pdf.error && <View style={paperStyles.notice}>
      <Text accessibilityLiveRegion="polite" style={paperStyles.status}>{pdf.status}</Text>
    </View>}
  </View>;
}

export function PaperReaderLoading() {
  return <View style={paperStyles.readerLoading}>
    <ActivityIndicator color={COLORS.accent} accessibilityLabel="Loading PDF" />
  </View>;
}
