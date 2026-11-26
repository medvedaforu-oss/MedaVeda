import { useCallback, useEffect, useRef, useState } from 'react';
import { getCourses } from '../../services/courseService';
import { getYears } from '../../services/yearService';
import { getSubjects } from '../../services/subjectService';
import type { Course } from '../../types/course';
import type { Year } from '../../types/year';
import type { Subject } from '../../types/subject';
import { MONTHS, type Paper, type PaperFilters } from './types';
import { deletePaper, listPapers, listExamSessions, PAGE_SIZE, paperUrl, setPublication } from './service';
import QuestionPaperForm from './QuestionPaperForm';
const control = 'h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none placeholder:text-gray-500 focus:border-green-600 focus:ring-1 focus:ring-green-600';
const button = 'inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50';
const primary = button + ' bg-green-700 text-white hover:bg-green-800';
const secondary = button + ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
const action = 'rounded px-1.5 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50';
const cell = 'min-w-0 break-words px-4 py-2 align-top @4xl:px-3 @4xl:py-3';
const message = (e: unknown) => e instanceof Error ? e.message : 'Question Paper request failed. Please retry.';
export default function QuestionPapersPage() {
  const [courses, setCourses] = useState<Course[]>([]), [years, setYears] = useState<Year[]>([]), [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<string[]>(['Summer','Winter']);
  const [catalogReady, setCatalogReady] = useState(false), [catalogError, setCatalogError] = useState('');
  const [filters, setFilters] = useState<PaperFilters>({}), [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Paper[]>([]), [count, setCount] = useState(0), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [form, setForm] = useState<Paper | 'new' | null>(null);
  const [preview, setPreview] = useState<{id: string; url: string} | null>(null);
  const alive = useRef(true), mutation = useRef(false), previewRun = useRef({ generation: 0 });
  useEffect(() => {
    const counter = previewRun.current;
    alive.current = true;
    return () => { alive.current = false; counter.generation++; };
  }, []);
  useEffect(() => {
    let current = true; setCatalogReady(false); setCatalogError('');
    Promise.all([getCourses(), getYears(), getSubjects(), listExamSessions()]).then(([c,y,s,examSessions]) => {
      if (current) setSessions(examSessions);
      if (current) { setCourses(c); setYears(y); setSubjects(s); setCatalogReady(true); }
    }).catch(e => { if (current) setCatalogError(message(e)); });
    return () => { current = false; };
  }, [refresh]);
  useEffect(() => {
    let current = true; setLoading(true); setError(''); setRows([]);
    listPapers(filters, page).then(result => { if (current) { setRows(result.rows); setCount(result.count); } })
      .catch(e => { if (current) { setError(message(e)); setCount(0); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters, page, refresh]);
  function filter(next: PaperFilters) { setFilters(next); setPage(0); }
  const closeForm = useCallback(() => setForm(null), []);
  async function mutate(action: () => Promise<void>, refreshList = true) {
    if (mutation.current) return; if (refreshList) {previewRun.current.generation++;setPreview(null);} mutation.current = true; setBusy(true); setError('');
    try { await action(); if (alive.current && refreshList) { setPreview(null); setRefresh(n => n+1); } }
    catch (e) { if (alive.current) setError(message(e)); }
    finally { mutation.current = false; if (alive.current) setBusy(false); }
  }
  async function openPdf(paper: Paper, download = false) {
    if (mutation.current) return;
    const run = ++previewRun.current.generation;
    await mutate(async () => {
      const url = await paperUrl(paper.id, download);
      if (!alive.current || run !== previewRun.current.generation) return;
      if (download) { const a = document.createElement('a'); a.href=url; a.download=`question-paper-${paper.id}.pdf`; a.click(); }
      else setPreview({id:paper.id,url});
    }, false);
  }
  const hasFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  return <section className="@container min-w-0 space-y-4 text-gray-800" aria-labelledby="qp-page-title">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 id="qp-page-title" className="text-2xl font-semibold tracking-tight">Question Papers</h1>
        <p className="mt-1 text-sm text-gray-600">Manage subject examination papers and student access.</p>
      </div>
      <button className={primary} disabled={!catalogReady || busy} onClick={() => setForm('new')}>Add paper</button>
    </header>

    <div className="rounded-lg border border-gray-200 bg-white p-4" role="region" aria-label="Question Paper filters">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Filter papers</h2>
        <div className="flex items-center gap-3">
          <button className="rounded px-1 py-1 text-sm font-medium text-green-700 hover:text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasFilters} onClick={() => filter({})}>Reset Filters</button>
          <button className={secondary + ' min-h-8 px-3 py-1'} disabled={busy || loading} onClick={() => setRefresh(n=>n+1)}>Reload</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 @md:grid-cols-2 @3xl:grid-cols-4">
        <label className="min-w-0 space-y-1.5 @md:col-span-2">
          <span className="block text-sm font-medium text-gray-700">Search question papers</span>
          <input className={control} aria-label="Search title, session, number or examination year" placeholder="Search question papers…" value={filters.search ?? ''} onChange={e => filter({...filters, search:e.target.value})} />
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">Course</span>
          <select className={control} aria-label="Filter course" value={filters.courseId ?? ''} onChange={e => filter({...filters,courseId:e.target.value,yearId:'',subjectId:''})}>
            <option value="">All courses</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">Academic Year</span>
          <select className={control} aria-label="Filter academic year" value={filters.yearId ?? ''} onChange={e => filter({...filters,yearId:e.target.value,subjectId:''})}>
            <option value="">All academic years</option>{years.filter(y => !filters.courseId || y.courseId===filters.courseId).map(y => <option key={y.id} value={y.id}>{y.title}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">Subject</span>
          <select className={control} aria-label="Filter subject" value={filters.subjectId ?? ''} onChange={e => filter({...filters,subjectId:e.target.value})}>
            <option value="">All subjects</option>{subjects.filter(s => (!filters.yearId || s.yearId===filters.yearId) && (!filters.courseId || years.some(y=>y.id===s.yearId && y.courseId===filters.courseId))).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">Examination Year</span>
          <input className={control} aria-label="Filter examination year" placeholder="All exam years" type="number" min={1900} max={9999} value={filters.examYear ?? ''} onChange={e => filter({...filters,examYear:e.target.value?Number(e.target.value):undefined})} />
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">Exam Session</span>
          <select className={control} aria-label="Filter exam session" value={filters.examSession ?? ''} onChange={e => filter({...filters,examSession:e.target.value || undefined})}>
            <option value="">All exam sessions</option>{sessions.map(session => <option key={session} value={session}>{session}</option>)}
          </select>
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="block text-sm font-medium text-gray-700">Publication Status</span>
          <select className={control} aria-label="Filter publication status" value={filters.published ?? ''} onChange={e => filter({...filters,published:e.target.value})}>
            <option value="">All statuses</option><option value="true">Published</option><option value="false">Drafts (unpublished)</option>
          </select>
        </label>
      </div>
    </div>

    {catalogError && <p role="alert" className="break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Catalog: {catalogError}</p>}
    {error && <p role="alert" className="break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Question paper library</h2>
        {!loading && !error && <span className="text-sm text-gray-600">{count} {count === 1 ? 'paper' : 'papers'}{hasFilters ? ' found' : ''}</span>}
      </div>
      {loading ? <div role="status" className="px-6 py-14 text-center text-sm text-gray-600">Loading question papers…</div> : rows.length===0 ?
        <div className="px-5 py-12 text-center">
          <svg className="mx-auto mb-3 h-9 w-9 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h5" />
          </svg>
          <h3 className="text-base font-semibold">{error ? 'Unable to load question papers' : count > 0 ? 'No papers on this page' : hasFilters ? 'No matching question papers' : 'No question papers yet'}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">{error ? 'Use Reload to try again.' : count > 0 ? 'Use Previous to return to the available papers.' : hasFilters ? 'Try a different search or reset your filters.' : 'Add your first subject examination paper to get started.'}</p>
          {!error && count===0 && (hasFilters ? <button className={secondary + ' mt-4'} onClick={() => filter({})}>Reset Filters</button> :
            <button className={primary + ' mt-4'} disabled={!catalogReady || busy} onClick={() => setForm('new')}>Add paper</button>)}
        </div> :
        <table role="table" className="block w-full table-fixed text-left text-sm @4xl:table">
          <caption className="sr-only">Question papers with academic details, examination sessions, publication status and actions</caption>
          <thead role="rowgroup" className="hidden bg-gray-50 text-gray-600 @4xl:table-header-group"><tr role="row">
            {['Question Paper Title','Course','Academic Year','Subject','Exam Year','Exam Session','Status','Actions'].map((h,i)=><th scope="col" role="columnheader" key={h} className={'px-3 py-3 text-xs font-semibold ' + (i===0 ? 'w-[18%]' : i===3 ? 'w-[14%]' : i===7 ? 'w-[18%]' : 'w-[10%]')}>{h}</th>)}
          </tr></thead>
          <tbody role="rowgroup" className="block divide-y divide-gray-200 @4xl:table-row-group">{rows.map(p => <tr role="row" key={p.id} className="grid grid-cols-1 py-3 hover:bg-gray-50/60 @md:grid-cols-2 @4xl:table-row @4xl:py-0">
            <td role="cell" className={cell + ' @md:col-span-2'}>
              <span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Question Paper Title</span>
              <span className="font-medium text-gray-900">{p.title || [p.paper_type,p.paper_number].filter(Boolean).join(' · ') || 'Full subject paper'}</span>
              {p.title && (p.paper_type || p.paper_number) && <span className="mt-1 block text-xs text-gray-500">{[p.paper_type,p.paper_number].filter(Boolean).join(' · ')}</span>}
            </td>
            <td role="cell" className={cell}><span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Course</span>{p.subject?.year.course.name || '—'}</td>
            <td role="cell" className={cell}><span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Academic Year</span>{p.subject?.year.title || '—'}</td>
            <td role="cell" className={cell}><span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Subject</span>{p.subject?.title || '—'}</td>
            <td role="cell" className={cell}><span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Exam Year</span>{p.exam_year}</td>
            <td role="cell" className={cell}><span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Exam Session</span><span className="block">{p.exam_session || (p.exam_month ? MONTHS[p.exam_month-1] : '—')}</span><span className="text-xs text-gray-500">{p.exam_year}</span></td>
            <td role="cell" className={cell}><span className="mb-1 block text-xs text-gray-500 @4xl:hidden">Publication Status</span><span className={'inline-flex rounded px-2 py-1 text-xs font-medium ' + (p.published ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-700')}>{p.published?'Published':'Draft'}</span></td>
            <td role="cell" className={cell + ' @md:col-span-2'}><div className="flex flex-wrap items-center gap-x-2 gap-y-1" role="group" aria-label={'Actions for ' + (p.title || 'question paper')}>
              <button disabled={busy} className={action + ' text-green-700 hover:bg-green-50'} onClick={()=>void openPdf(p)}>Preview</button>
              <button disabled={busy} className={action + ' text-gray-700 hover:bg-gray-100'} onClick={()=>void openPdf(p,true)}>Download</button>
              <button disabled={busy || !catalogReady} className={action + ' text-gray-700 hover:bg-gray-100'} onClick={()=>{previewRun.current.generation++;setPreview(null);setForm(p);}}>Edit / replace</button>
              <button disabled={busy} className={action + ' text-green-700 hover:bg-green-50'} onClick={()=>void mutate(()=>setPublication(p.id,!p.published,p.revision))}>{p.published?'Unpublish':'Publish'}</button>
              <button disabled={busy} className={action + ' text-red-700 hover:bg-red-50'} onClick={()=>{ if(window.confirm('Delete this Question Paper? Students will lose access.')) void mutate(()=>deletePaper(p.id,p.revision)); }}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>}
      {!loading && count > 0 && <nav aria-label="Question paper pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
        <span className="text-sm text-gray-600">Page {page+1} of {Math.max(page+1, Math.ceil(count/PAGE_SIZE))} · {count} {count===1?'paper':'papers'}</span>
        <div className="flex gap-2"><button className={secondary} disabled={page===0 || loading || busy} onClick={()=>setPage(n=>n-1)}>Previous</button>
          <button className={secondary} disabled={(page+1)*PAGE_SIZE>=count || loading || busy} onClick={()=>setPage(n=>n+1)}>Next</button></div>
      </nav>}
    </div>

    {preview && <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-semibold">PDF preview</h2>
        <div className="flex flex-wrap gap-2"><button className={secondary} disabled={busy} onClick={()=>void openPdf({id:preview.id} as Paper)}>Refresh PDF link</button>
          <button className={secondary} onClick={()=>{ previewRun.current.generation++; setPreview(null); }}>Close preview</button></div></div>
      <iframe title="Question Paper PDF preview" src={preview.url} className="h-[70vh] w-full border-0" />
    </div>}
    {form && <QuestionPaperForm paper={form==='new'?undefined:form} courses={courses} years={years} subjects={subjects}
      onClose={closeForm} onSaved={()=>{previewRun.current.generation++;setPreview(null);setForm(null);setRefresh(n=>n+1);}} />}
  </section>;
}
