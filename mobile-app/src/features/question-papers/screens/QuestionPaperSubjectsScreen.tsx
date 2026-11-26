import { useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import useCourseYear from '../../../hooks/useCourseYear';
import { fetchSubjectsByYear } from '../../../services/subjectsService';
import PaperLayout, { PaperCard, PaperEmpty } from '../PaperLayout';
import usePaperResource from '../usePaperResource';

export default function QuestionPaperSubjectsScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'QuestionPaperSubjects'>) {
  const { courseId } = useCourseYear();
  const { yearId, yearTitle, courseId: routeCourse } = route.params ?? {};
  const load = useCallback(async () => {
    if (!yearId || !courseId || routeCourse !== courseId) throw new Error('Your course changed. Go back and choose an academic year.');
    return fetchSubjectsByYear(yearId);
  }, [yearId, courseId, routeCourse]);
  const resource = usePaperResource(`subjects:${courseId}:${yearId}`, load);
  return <PaperLayout title={yearTitle || 'Choose subject'} {...resource}>
    {(resource.value ?? []).map(subject => <PaperCard key={subject.id} title={subject.title}
      icon="book-outline"
      onPress={() => navigation.navigate('QuestionPaperSessions', {
        subjectId: subject.id, subjectTitle: subject.title, yearId, yearTitle, courseId: courseId!,
      })} />)}
    {!resource.value?.length && <PaperEmpty title="No subjects available." />}
  </PaperLayout>;
}
