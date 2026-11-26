import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import type { NavigationContainerRefWithCurrent, ParamListBase } from '@react-navigation/native';
import { getCurrentUser } from '../../services/authState';
import { getCourseYear, subscribeCourseYear } from '../../services/courseState';
import { resolveContentDestination } from '../sharing/contentDestination';
import { paperLinkQueue } from './paperLinkRuntime';

// Startup/login/onboarding own their transitions. Continue only after their normal route has settled.
const AUTH_ROUTES = new Set(['Splash', 'Login', 'Register', 'ForgotPassword', 'ResetPassword', 'SelectCourseYear']);
export default function useQuestionPaperRouting(
  navigation: NavigationContainerRefWithCurrent<ParamListBase>, ready: boolean, route?: string,
) {
  const readerRequest = useRef(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision(value => value + 1);
    const unsubscribe = paperLinkQueue.subscribe(update);
    const course = subscribeCourseYear(update);
    const app = AppState.addEventListener('change', update);
    return () => { unsubscribe(); course(); app.remove(); };
  }, []);
  useEffect(() => {
    const context = () => {
      const currentRoute = navigation.getCurrentRoute()?.name;
      const course = getCourseYear();
      const quizInStack = navigation.getRootState?.()?.routes.some(entry => entry.name === 'Quiz');
      return {
        owner: getCurrentUser()?.id ?? null, courseId: course.courseId,
        ready: ready && navigation.isReady() && AppState.currentState === 'active' &&
          !!currentRoute && !AUTH_ROUTES.has(currentRoute) && currentRoute !== 'Quiz' && !quizInStack && course.status === 'ready',
      };
    };
    void paperLinkQueue.process({
      context,
      resolve: resolveContentDestination,
      open: destination => {
        // Reuse an existing resource route, including Notes below its reader.
        // A new resource scope revalidates access and refreshes expiring URLs.
        navigation.navigate(destination.screen, { ...destination.params, courseId: destination.courseId, linkRevision: ++readerRequest.current }, { pop: true });
      },
      error: (message, retry) => Alert.alert('MedVeda', message,
        retry ? [{ text: 'Close', style: 'cancel' }, { text: 'Retry', onPress: retry }] : [{ text: 'OK' }]),
    });
  }, [navigation, ready, route, revision]);
}
