import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import useLoadResource from '../../hooks/useLoadResource';
import LoadError from '../../components/LoadError';
import EmptyState from '../../components/EmptyState';
import ContentShareButton from '../../features/sharing/ContentShareButton';
import { resolveContentDestination } from '../../features/sharing/contentDestination';
import { fetchQuizTestById } from '../../services/quizService';
import { getCurrentUser } from '../../services/authState';
import { COLORS } from '../../theme/colors';
import { SPACING, STUDY_LAYOUT } from '../../theme/spacing';
import { FONT } from '../../theme/fonts';

/** A shared quiz identifies the test only. No attempt or countdown exists until Start is pressed. */
export default function QuizInfoScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const id = params?.quizId;
  const load = useCallback(() => resolveContentDestination(id, 'quiz'), [id, params?.linkRevision]);
  const { value, loading, error, retry } = useLoadResource(load, null);
  const [starting, setStarting] = useState(false);
  const busy = useRef(false), generation = useRef(0), focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true; setStarting(false); busy.current = false;
    return () => { focused.current = false; generation.current++; };
  }, [id]));
  async function start() {
    if (busy.current || !value || loading || error) return;
    busy.current = true; setStarting(true);
    const run = generation.current, owner = getCurrentUser()?.id;
    const current = () => focused.current && generation.current === run && getCurrentUser()?.id === owner;
    try {
      const test = await fetchQuizTestById(id); // Existing authenticated RPC rechecks access/publication and strips answer keys.
      if (!current()) return;
      if (!test || !test.active || !test.questions.length) throw new Error('This Quiz is unavailable or access is denied.');
      navigation.navigate('Quiz', { test, subjectId: test.subjectId, subjectTitle: test.subjectTitle,
        yearId: test.yearId, yearTitle: test.yearTitle });
    } catch (error) { if (current()) Alert.alert('Could not start Quiz', error instanceof Error ? error.message : 'Please retry online.'); }
    finally { if (current()) { busy.current = false; setStarting(false); } }
  }
  return <View style={styles.container}>
    {loading ? <ActivityIndicator color={COLORS.accent} /> : error ? <LoadError content="Quiz" retry={retry} /> : !value ?
      <EmptyState title="This Quiz is unavailable or access is denied." /> : <>
      <Text style={styles.title}>{String(value.params.title || 'Quiz')}</Text>
      <Text style={styles.text}>The complete test duration is 15 minutes. You can change answers and submit before time runs out. An interrupted attempt resumes with its original deadline.</Text>
      <ContentShareButton type="quiz" id={id} title={String(value.params.title || 'Quiz')} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Start Quiz" disabled={starting}
        style={styles.start} onPress={() => void start()}><Text style={styles.startText}>{starting ? 'Preparing Quiz…' : 'Start Quiz'}</Text></TouchableOpacity>
    </>}
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: COLORS.background, ...STUDY_LAYOUT, gap: SPACING.md },
  title: { color: COLORS.text, fontSize: FONT.title, fontWeight: '700' }, text: { color: COLORS.subtitle, fontSize: FONT.body },
  start: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderRadius: 10 },
  startText: { color: COLORS.white, fontWeight: '700' } });
