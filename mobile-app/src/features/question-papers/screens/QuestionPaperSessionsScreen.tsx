import { useCallback } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import useCourseYear from '../../../hooks/useCourseYear';
import PaperLayout, { PaperCard, PaperEmpty, paperStyles } from '../PaperLayout';
import usePaperResource from '../usePaperResource';
import { groupSessions, listPapers } from '../service';
import { sessionLabel, paperTitle } from '../presentation';

export default function QuestionPaperSessionsScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'QuestionPaperSessions'>) {
  const { courseId } = useCourseYear();
  const { subjectId, subjectTitle, courseId: routeCourse } = route.params ?? {};
  const load = useCallback(async () => {
    if (!subjectId || !courseId || courseId !== routeCourse) throw new Error('Your course changed. Go back and choose an academic year.');
    return groupSessions(await listPapers(subjectId));
  }, [subjectId, courseId, routeCourse]);
  const resource = usePaperResource(`sessions:${courseId}:${subjectId}`, load);
  return <PaperLayout title={subjectTitle || 'Question Papers'} {...resource}>
    {(resource.value ?? []).map(session => <View key={`${session.exam_year}:${session.exam_session ?? session.exam_month}`} style={paperStyles.section}>
      <Text accessibilityRole="header" style={paperStyles.sectionHeading}>{sessionLabel(session)}</Text>
      {session.papers.map(paper => <PaperCard key={paper.id}
        title={paperTitle(paper)}
        onPress={() => navigation.navigate('QuestionPaperPdf', {
          paperId: paper.id, courseId: courseId!,
          title: `${paperTitle(paper)} · ${sessionLabel(paper)}`,
        })} />)}
    </View>)}
    {!resource.value?.length && <PaperEmpty title="No published papers available." />}
  </PaperLayout>;
}
