import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/radius';
import { contentShareMessage, contentShareUrl, validPaperId, type ContentType } from '../question-papers/questionPaperLinks';
import { copyLink, shareLink } from './shareLink';
export default function ContentShareButton({ type, id, title }: { type: ContentType; id: string; title?: string }) {
  if (!validPaperId(id)) return null;
  const url = contentShareUrl(type, id);
  return <TouchableOpacity style={styles.button} accessibilityRole="button"
    accessibilityLabel={`Share ${title || type} link`} accessibilityHint="Long press to copy link"
    accessibilityActions={[{ name: 'copy', label: 'Copy link' }]}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'copy') void copyLink(url); }}
    onPress={event => { event.stopPropagation?.(); void shareLink('MedVeda', contentShareMessage(type, id, title), url); }}
    onLongPress={() => void copyLink(url)}>
    <Ionicons name="share-social-outline" size={20} color={COLORS.accent} />
  </TouchableOpacity>;
}
const styles = StyleSheet.create({ button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
  borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceMuted } });
