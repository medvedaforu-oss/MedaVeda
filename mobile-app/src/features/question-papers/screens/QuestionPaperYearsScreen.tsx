import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types/navigation';
import useCourseYear from '../../../hooks/useCourseYear';
import { fetchYears } from '../../../services/yearsService';
import PaperLayout, { PaperCard, PaperEmpty } from '../PaperLayout';
import usePaperResource from '../usePaperResource';

export default function QuestionPaperYearsScreen() {
  const { courseId, ready } = useCourseYear();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const load = useCallback(async () => {
    if (!ready || !courseId) throw new Error('Select your course in your profile, then reopen Question Papers.');
    return fetchYears(courseId);
  }, [ready, courseId]);
  const resource = usePaperResource(`years:${courseId ?? ''}:${ready}`, load);
  return <PaperLayout title="Academic years" {...resource}>
    {(resource.value ?? []).map(year => <PaperCard key={year.id} title={year.title}
      icon="school-outline"
      onPress={() => navigation.navigate('QuestionPaperSubjects', {
        yearId: year.id, yearTitle: year.title, courseId: courseId!,
      })} />)}
    {!resource.value?.length && <PaperEmpty title="No academic years available." />}
  </PaperLayout>;
}
