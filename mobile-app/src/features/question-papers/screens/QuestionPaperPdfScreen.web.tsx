import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import { COLORS } from '../../../theme/colors';
import { SPACING } from '../../../theme/spacing';
import { paperStyles } from '../PaperLayout';
import PaperReaderToolbar, { PaperReaderLoading } from '../PaperReaderToolbar';
import usePaperPdf from '../usePaperPdf';
import usePaperWebPreview from '../usePaperWebPreview';

export default function QuestionPaperPdfScreen({ route }: NativeStackScreenProps<RootStackParamList, 'QuestionPaperPdf'>) {
  const { paperId, courseId, title, linkRevision } = route.params ?? {};
  const pdf = usePaperPdf(paperId, courseId, linkRevision);
  const preview = usePaperWebPreview(pdf.value, pdf.onViewerError);
  return <View style={paperStyles.screen}>
    <PaperReaderToolbar title={title || 'Paper'} pdf={pdf} />
    {pdf.loading || preview.loading ? <PaperReaderLoading /> : preview.value && !pdf.viewerError ?
      React.createElement('object', {
        key: preview.value, data: preview.value, type: 'application/pdf', 'aria-label': title || 'Paper PDF',
        style: { flex: 1, width: '100%', minHeight: 0, border: 0, backgroundColor: COLORS.white },
      }, React.createElement('p', { style: { padding: SPACING.lg, color: COLORS.background } },
        'PDF preview unavailable. Download to read.')) : null}
  </View>;
}
