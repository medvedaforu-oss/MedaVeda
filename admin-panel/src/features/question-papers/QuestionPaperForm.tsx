import { useEffect, useRef, useState } from 'react';
import useDialogFocus from '../../hooks/useDialogFocus';
import { validatePdf } from '../../utils/pdfValidation';
import type { Course } from '../../types/course';
import type { Year } from '../../types/year';
import type { Subject } from '../../types/subject';
import { MONTHS, type Paper, type PaperInput } from './types';
import { savePaper, listExamSessions } from './service';

type Props = { paper?: Paper; courses: Course[]; years: Year[]; subjects: Subject[];
  onClose: () => void; onSaved: () => void };
const field = 'mt-1.5 h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-800 outline-none placeholder:text-gray-500 focus:border-green-600 focus:ring-1 focus:ring-green-600';
const label = 'block min-w-0 text-sm font-medium text-gray-700';
const button = 'min-h-10 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50';
export default function QuestionPaperForm({ paper, courses, years, subjects, onClose, onSaved }: Props) {
  const selectedSubject = subjects.find(s => s.id === paper?.subject_id);
  const selectedYear = years.find(y => y.id === selectedSubject?.yearId);
  const [course, setCourse] = useState(selectedYear?.courseId ?? '');
  const [year, setYear] = useState(selectedSubject?.yearId ?? '');
  const [input, setInput] = useState<PaperInput>({ subject_id: paper?.subject_id ?? '',
    exam_year: paper?.exam_year ?? new Date().getFullYear(), exam_month: paper ? paper.exam_month : null,
    exam_session: paper ? paper.exam_session ?? null : 'Summer', title: paper?.title ?? '',
    paper_type: paper?.paper_type ?? '', paper_number: paper?.paper_number ?? '', published: paper?.published ?? false });
  const [sessions, setSessions] = useState<string[]>(['Summer','Winter']);
  useEffect(() => { let current = true; listExamSessions().then(values => { if (current) setSessions(values); }).catch(() => {}); return () => { current = false; }; }, []);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingFile, setCheckingFile] = useState(false);
  const fileChecking = useRef(false);
  const pending = useRef(false), alive = useRef(true), fileRun = useRef({ generation: 0 });
  const focus = useDialogFocus(true, onClose, busy);
  useEffect(() => {
    const counter = fileRun.current;
    alive.current = true;
    return () => { alive.current = false; counter.generation++; };
  }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function selectFile(candidate?: File) {
    const run = ++fileRun.current.generation; setError(''); setFile(undefined);
    fileChecking.current = !!candidate; setCheckingFile(!!candidate);
    if (!candidate) return;
    try { await validatePdf(candidate); if (alive.current && run === fileRun.current.generation) setFile(candidate); }
    catch (e) { if (alive.current && run === fileRun.current.generation) setError(e instanceof Error ? e.message : 'Invalid PDF.'); }
    finally { if (alive.current && run === fileRun.current.generation) { fileChecking.current=false; setCheckingFile(false); } }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (pending.current || fileChecking.current) return;
    if (!subjects.some(s => s.id === input.subject_id && s.yearId === year) || !years.some(y => y.id === year && y.courseId === course)) {
      setError('Select a course, academic year and matching subject.'); return;
    }
    pending.current = true; setBusy(true); setError('');
    try { await savePaper(input, file, paper); if (alive.current) onSaved(); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Save failed. Reload before retrying.'); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
    <div ref={focus} role="dialog" aria-modal="true" aria-labelledby="qp-form-title" aria-describedby="qp-form-description" tabIndex={-1}
      className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg outline-none">
      <div className="shrink-0 border-b border-gray-200 px-5 py-4 sm:px-6">
        <h2 id="qp-form-title" className="text-lg font-semibold text-gray-900">{paper ? 'Edit Question Paper' : 'Add Question Paper'}</h2>
        <p id="qp-form-description" className="mt-1 text-sm text-gray-600">{paper ? 'Update paper details or replace the PDF document.' : 'Add examination details and upload the full subject PDF.'} <span className="whitespace-nowrap">* Required fields</span></p>
      </div>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <fieldset disabled={busy} className="min-w-0">
            <legend className="mb-3 text-sm font-semibold text-gray-900">Academic Details</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={label}>Course <span aria-hidden="true" className="text-red-700">*</span>
                <select className={field} required value={course} onChange={e => {
                  setCourse(e.target.value); setYear(''); setInput(i => ({...i, subject_id:''}));
                }}><option value="">Select course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </label>
              <label className={label}>Academic Year <span aria-hidden="true" className="text-red-700">*</span>
                <select className={field} required value={year} onChange={e => {
                  setYear(e.target.value); setInput(i => ({...i, subject_id:''}));
                }}><option value="">Select academic year</option>{years.filter(y => y.courseId === course).map(y => <option key={y.id} value={y.id}>{y.title}</option>)}</select>
              </label>
              <label className={label + ' sm:col-span-2'}>Subject <span aria-hidden="true" className="text-red-700">*</span>
                <select className={field} required value={input.subject_id} onChange={e => setInput(i => ({...i, subject_id:e.target.value}))}>
                  <option value="">Select subject</option>{subjects.filter(s => s.yearId === year).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset disabled={busy} className="min-w-0 border-t border-gray-200 pt-4">
            <legend className="pr-3 text-sm font-semibold text-gray-900">Examination Details</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={label}>Examination Year <span aria-hidden="true" className="text-red-700">*</span>
                <input className={field} type="number" required min={1900} max={9999} step={1} value={input.exam_year}
                  onChange={e => setInput(i => ({...i, exam_year: Number(e.target.value)}))} />
              </label>
              <label className={label}>Exam Session <span aria-hidden="true" className="text-red-700">*</span>
                <input className={field} required list="qp-exam-sessions" maxLength={60} aria-describedby="qp-session-help"
                  placeholder="Select or enter session"
                  value={input.exam_session ?? (input.exam_month ? `${MONTHS[input.exam_month-1]} (legacy)` : '')}
                  onChange={e => setInput(i => ({...i, exam_session:e.target.value, exam_month:null}))} />
                <datalist id="qp-exam-sessions">{sessions.map(session => <option key={session} value={session} />)}</datalist>
                <span id="qp-session-help" className="mt-1.5 block text-xs font-normal text-gray-600">Summer, Winter, or another valid session. New sessions are saved for reuse.</span>
              </label>
              <label className={label + ' sm:col-span-2'}>Question Paper Title <span aria-hidden="true" className="text-red-700">*</span>
                <input className={field} required maxLength={200} value={input.title ?? ''}
                  placeholder="e.g. Kriya Sharir - I" onChange={e => setInput(i => ({...i, title:e.target.value}))} />
              </label>
              <label className={label}>Paper Number <span className="font-normal text-gray-500">(optional)</span>
                <input className={field} maxLength={40} placeholder="e.g. I, II" value={input.paper_number}
                  onChange={e => setInput(i => ({...i, paper_number:e.target.value}))} />
              </label>
              <label className={label}>Paper Type <span className="font-normal text-gray-500">(optional)</span>
                <input className={field} maxLength={80} placeholder="e.g. Theory, practical" value={input.paper_type}
                  onChange={e => setInput(i => ({...i, paper_type:e.target.value}))} />
              </label>
            </div>
          </fieldset>

          <fieldset disabled={busy} className="min-w-0 border-t border-gray-200 pt-4">
            <legend className="pr-3 text-sm font-semibold text-gray-900">PDF Document</legend>
            <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className={label}>{paper ? 'Replace full subject PDF (optional)' : 'Full subject PDF'} {!paper && <span aria-hidden="true" className="text-red-700">*</span>}
                <input className="mt-2 block w-full min-w-0 rounded text-sm font-normal text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                  type="file" accept="application/pdf,.pdf" aria-describedby="qp-pdf-help qp-file-status"
                  required={!paper} onChange={e => void selectFile(e.target.files?.[0])} />
              </label>
              <p id="qp-pdf-help" className="mt-2 text-xs text-gray-600">PDF only · Maximum 50 MiB{paper ? ' · Keep the current PDF by leaving this unchanged.' : ''}</p>
              <p id="qp-file-status" role="status" className="mt-1 break-words text-sm text-gray-700">{checkingFile ? 'Validating PDF…' : file ? `Selected: ${file.name}` : paper ? 'Current PDF attached' : 'No PDF selected'}</p>
            </div>
            {preview && <div className="mt-3 overflow-hidden rounded-lg border border-gray-200"><p className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">Selected PDF preview</p>
              <iframe title="Selected Question Paper PDF preview" src={preview} className="h-80 w-full border-0" />
            </div>}
          </fieldset>

          <fieldset disabled={busy} className="min-w-0 border-t border-gray-200 pt-4">
            <legend className="pr-3 text-sm font-semibold text-gray-900">Publication</legend>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
              <input className="mt-0.5 h-4 w-4 shrink-0 accent-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700" type="checkbox" checked={input.published}
                aria-describedby="qp-publication-help" onChange={e => setInput(i => ({...i, published:e.target.checked}))} />
              <span><span className="block font-medium">Published</span><span id="qp-publication-help" className="mt-1 block text-gray-600">Published papers are free for signed-in students. Leave unchecked to save as a draft.</span></span>
            </label>
          </fieldset>
        </div>
        {error && <p role="alert" className="mx-5 mb-3 max-h-24 shrink-0 overflow-y-auto break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:mx-6">{error}</p>}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3 sm:px-6">
          <button type="button" disabled={busy} onClick={onClose} className={button + ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}>Cancel</button>
          <button disabled={busy || checkingFile} className={button + ' bg-green-700 text-white hover:bg-green-800'}>{busy ? 'Saving…' : 'Save Paper'}</button>
        </div>
      </form>
    </div>
  </div>;
}
