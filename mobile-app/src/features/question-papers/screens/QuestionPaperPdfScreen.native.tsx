import { useState } from 'react';
import { Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import { paperStyles } from '../PaperLayout';
import PaperReaderToolbar, { PaperReaderLoading } from '../PaperReaderToolbar';
import usePaperPdf from '../usePaperPdf';

export default function QuestionPaperPdfScreen({ route }: NativeStackScreenProps<RootStackParamList, 'QuestionPaperPdf'>) {
  const { paperId, courseId, title } = route.params ?? {};
  const pdf = usePaperPdf(paperId, courseId);
  const [page, setPage] = useState<{ source: string; current: number; total: number }>();
  return <View style={paperStyles.screen}>
    <PaperReaderToolbar title={title || 'Paper'} pdf={pdf} />
    {pdf.loading ? <PaperReaderLoading /> : pdf.value && !pdf.viewerError ? <View style={paperStyles.screen}>
      <Pdf key={pdf.value} source={{ uri: pdf.value, cache: false }} trustAllCerts={false}
        minScale={1} maxScale={5} enableDoubleTapZoom
        renderActivityIndicator={() => <PaperReaderLoading />}
        onPageChanged={(current, total) => {
          if (pdf.isCurrent() && pdf.value && Number.isInteger(current) && Number.isInteger(total) && current > 0 && current <= total) {
            setPage({ source: pdf.value, current, total });
          }
        }} onError={pdf.onViewerError} style={paperStyles.screen} />
      {page?.source === pdf.value && <Text accessibilityLabel={`Page ${page.current} of ${page.total}`}
        style={paperStyles.page}>{page.current} / {page.total}</Text>}
    </View> : null}
  </View>;
}
