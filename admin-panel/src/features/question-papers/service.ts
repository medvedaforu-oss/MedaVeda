import { supabase } from '../../config/supabase';
import { validatePdf } from '../../utils/pdfValidation';
import { validateInput } from './validation';
export { validateInput } from './validation';
import type { Paper, PaperInput, PaperFilters } from './types';
export const PAGE_SIZE = 25;
const projection = '*,subject:subjects!inner(id,title,year_id,year:years!inner(id,title,course_id,course:courses!inner(id,name)))';
function failure(error: { code?: string; message?: string }): Error {
  return new Error(error.code === '40001' ? 'Conflict: another Admin changed this paper. Reload before retrying.' : error.code === '23505' ? 'A paper with this subject, examination year/session, type and number already exists.' :
    (error.message || 'Question Paper request failed. Please retry.'));
}
export async function listPapers(filters: PaperFilters = {}, page = 0): Promise<{ rows: Paper[]; count: number }> {
  let q = supabase.from('question_papers').select(projection, { count: 'exact' });
  if (filters.courseId) q = q.eq('subject.year.course_id', filters.courseId);
  if (filters.yearId) q = q.eq('subject.year_id', filters.yearId);
  if (filters.subjectId) q = q.eq('subject_id', filters.subjectId);
  if (filters.examYear) q = q.eq('exam_year', filters.examYear);
  if (filters.examSession) q = q.eq('exam_session', filters.examSession);
  if (filters.examMonth) q = q.eq('exam_month', filters.examMonth);
  if (filters.published === 'true' || filters.published === 'false') q = q.eq('published', filters.published === 'true');
  const search = filters.search?.trim().slice(0, 100).replace(/[^\p{L}\p{N}\s-]/gu, '');
  if (search) q = q.or(`title.ilike.%${search}%,exam_session.ilike.%${search}%,paper_type.ilike.%${search}%,paper_number.ilike.%${search}%${/^\d{4}$/.test(search) ? `,exam_year.eq.${search}` : ''}`);
  const offset = Math.max(0, Math.floor(page)) * PAGE_SIZE;
  const { data, count, error } = await q.order('exam_year', { ascending: false }).order('exam_month', { ascending: false })
    .order('id').range(offset, offset + PAGE_SIZE - 1);
  if (error) throw failure(error);
  return { rows: (data ?? []) as unknown as Paper[], count: count ?? 0 };
}
export async function listExamSessions(): Promise<string[]> {
  const sessions = new Set(['Summer','Winter']);
  for (let offset=0; ; offset+=PAGE_SIZE) {
    const { data, error } = await supabase.from('question_papers').select('exam_session').not('exam_session','is',null)
      .order('id').range(offset,offset+PAGE_SIZE-1);
    if (error) throw failure(error);
    for (const row of data ?? []) if (row.exam_session) sessions.add(row.exam_session);
    if (!data || data.length<PAGE_SIZE) return [...sessions];
  }
}
export async function savePaper(input: PaperInput, file?: File, existing?: Pick<Paper, 'id' | 'object_path' | 'revision'>): Promise<Paper> {
  const data = validateInput(input);
  let path = existing?.object_path;
  if (file) {
    await validatePdf(file);
    path = `${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage.from('question-papers').upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (error) throw failure(error);
    const {data:validation,error:validationError} = await supabase.functions.invoke('question-paper-access',{body:{action:'validate',object_path:path}});
    if (validationError || validation?.validated !== true) throw new Error('Server PDF validation failed. Upload a valid PDF and retry.');
  }
  if (!path) throw new Error('Choose a full subject PDF.');
  const payload = { ...data, object_path: path };
  const q = existing ? supabase.rpc('question_papers_update', {p_id:existing.id,p_revision:existing.revision,p_changes:payload}) :
    supabase.from('question_papers').insert(payload);
  const { data: row, error } = await q.select('*').single();
  // Never delete a PDF on an ambiguous response: the database may have committed.
  // Detached files remain private and can be reviewed in a separately approved cleanup.
  if (error) throw failure(error);
  if (!row) throw new Error('Paper was not saved. Reload before retrying.');
  return row as Paper;
}
export async function setPublication(id: string, published: boolean, revision: number): Promise<void> {
  const { error } = await supabase.rpc('question_papers_update', {p_id:id,p_revision:revision,p_changes:{published}}).select('id').single();
  if (error) throw failure(error);
}
export async function deletePaper(id: string, revision: number): Promise<void> {
  const { error } = await supabase.rpc('question_papers_delete', {p_id:id,p_revision:revision}).select('id').single();
  if (error) throw failure(error);
}
export async function paperUrl(id: string, download = false): Promise<string> {
  const {data,error} = await supabase.functions.invoke('question-paper-access',{body:{action:'sign',id,download}});
  if (error || !data?.signedUrl) throw new Error('Could not open the PDF. Reload and retry.');
  return data.signedUrl;
}
