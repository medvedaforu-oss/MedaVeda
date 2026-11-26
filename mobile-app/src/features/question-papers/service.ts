import { supabase } from '../../config/supabase';
import { getCurrentUser } from '../../services/authState';
import type { Paper, PaperSession } from './types';
const PAGE_SIZE = 100;
function owner(): string {
  const id = getCurrentUser()?.id;
  if (!id) throw new Error('Sign in to view Question Papers.');
  return id;
}
function checkOwner(id: string) {
  if (owner() !== id) throw new Error('Your account changed. Reopen Question Papers.');
}
export async function listPapers(subjectId: string): Promise<Paper[]> {
  if (typeof subjectId !== 'string' || !subjectId.trim()) throw new Error('Choose a subject.');
  const account = owner(), result: Paper[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    checkOwner(account);
    const { data, error } = await supabase.from('question_papers').select('*')
      .eq('subject_id', subjectId).eq('published', true)
      .order('exam_year', { ascending: false }).order('exam_month', { ascending: false }).order('id')
      .range(offset, offset + PAGE_SIZE - 1);
    checkOwner(account);
    if (error) throw new Error('Could not load Question Papers. Connect to the internet and retry.');
    result.push(...((data ?? []) as Paper[]));
    if (!data || data.length < PAGE_SIZE) return result;
  }
}
export function groupSessions(papers: Paper[]): PaperSession[] {
  const sessions = new Map<string, PaperSession>();
  for (const paper of papers) {
    const key = `${paper.exam_year}-${paper.exam_session ? 'session:'+paper.exam_session.toLowerCase() : 'month:'+paper.exam_month}`;
    if (!sessions.has(key)) sessions.set(key, { exam_year: paper.exam_year, exam_month: paper.exam_month, ...(paper.exam_session ? {exam_session:paper.exam_session} : {}), papers: [] });
    sessions.get(key)!.papers.push(paper);
  }
  return [...sessions.values()].sort((a,b) => b.exam_year-a.exam_year || (b.exam_month ?? 0)-(a.exam_month ?? 0) || (a.exam_session ?? '').localeCompare(b.exam_session ?? ''));
}
export async function getPaperUrl(id: string, download = false): Promise<string> {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Choose a valid Question Paper.');
  const account = owner();
  const {data,error} = await supabase.functions.invoke('question-paper-access',{body:{action:'sign',id,download}});
  checkOwner(account);
  if (error || !data?.signedUrl) throw new Error('This Question Paper is unavailable. Refresh the PDF link and retry.');
  return data.signedUrl;
}
