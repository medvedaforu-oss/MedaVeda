import { supabase } from '../../config/supabase';
import { getCurrentUser } from '../../services/authState';
import { getPaperDestination } from '../question-papers/service';
import { validPaperId, type ContentType } from '../question-papers/questionPaperLinks';

export type ContentDestination = { screen: 'QuestionPaperPdf' | 'Notes' | 'QuizInfo'; params: Record<string, unknown> };
const unavailable = () => Object.assign(new Error('Content unavailable or access denied.'), { definitive: true });
/** Metadata only. Recipient session/RLS and the existing viewer enforce all content access. */
export async function resolveContentDestination(id: string, type: ContentType = 'question-paper'): Promise<ContentDestination> {
  if (!validPaperId(id)) throw unavailable();
  const owner = getCurrentUser()?.id;
  if (!owner) throw new Error('Sign in to open shared content.');
  const current = () => { if (getCurrentUser()?.id !== owner) throw new Error('Your account changed. Reopen the shared link.'); };
  if (type === 'question-paper') {
    const destination = await getPaperDestination(id);
    current();
    return { screen: 'QuestionPaperPdf', params: destination };
  }
  if (type !== 'note' && type !== 'quiz') throw unavailable();
  const { data, error } = await supabase.from(type === 'note' ? 'notes' : 'quiz_tests')
    .select(type === 'note' ? 'id,title,chapter_id,year_id,course_id' : 'id,title,subject_id,year_id,course_id')
    .eq('id', id).eq('active', true).maybeSingle();
  current();
  if (error) throw new Error('Could not load this content. Check your connection and retry.');
  if (!data) throw unavailable();
  if (type === 'quiz') return { screen: 'QuizInfo', params: { quizId: data.id, title: data.title } };
  const chapter = await supabase.from('chapters').select('id,title,subject_id,year_id,subjects(title),years(title)')
    .eq('id', 'chapter_id' in data ? data.chapter_id : '').eq('active', true).maybeSingle();
  current();
  if (chapter.error) throw new Error('Could not load this chapter. Check your connection and retry.');
  if (!chapter.data) throw unavailable();
  // NotesScreen opens the exact note with its existing purchase check and getSecureNoteUrl.
  return { screen: 'Notes', params: { noteId: data.id, chapterId: chapter.data.id,
    chapterTitle: chapter.data.title, subjectId: chapter.data.subject_id, yearId: chapter.data.year_id,
    subjectTitle: (chapter.data.subjects as unknown as {title?: string})?.title ?? '',
    yearTitle: (chapter.data.years as unknown as {title?: string})?.title ?? '' } };
}
