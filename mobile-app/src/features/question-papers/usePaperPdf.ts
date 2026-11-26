import { useCallback, useEffect, useRef, useState } from 'react';
import useCourseYear from '../../hooks/useCourseYear';
import { getCourseYear, subscribeCourseYear } from '../../services/courseState';
import { getCurrentUser, getAuthEpoch } from '../../services/authState';
import { getPaperUrl } from './service';
import { downloadPaper } from './download';
import usePaperResource from './usePaperResource';
export default function usePaperPdf(paperId: string, routeCourse: string, linkRevision?: number) {
  const {courseId} = useCourseYear();
  const owner = getCurrentUser()?.id;
  const scope = `${owner}:${courseId}:${paperId}:${linkRevision ?? ""}`;
  const latest = useRef(scope);
  const exportGeneration = useRef(0);
  if (latest.current !== scope) { exportGeneration.current++; latest.current=scope; }
  const alive = useRef(true), pending = useRef(false);
  const [busy,setBusy] = useState(false), [status,setStatus] = useState(''), [downloadError,setDownloadError] = useState('');
  const [viewerError,setViewerError] = useState('');
  const invalidateExport = useCallback(() => { exportGeneration.current++; }, []);
  useEffect(()=>{ alive.current=true; return ()=>{alive.current=false;invalidateExport();}; },[invalidateExport]);
  useEffect(()=>subscribeCourseYear(next=>{if(next.courseId!==routeCourse) exportGeneration.current++;}),[routeCourse]);
  useEffect(()=>{setStatus('');setDownloadError('');setViewerError('');},[scope]);
  const load=useCallback(async()=>{
    if (!courseId || routeCourse!==courseId) throw new Error('Your course changed. Go back and choose an academic year.');
    return getPaperUrl(paperId);
  },[paperId,courseId,routeCourse]);
  const resource=usePaperResource(scope,load);
  useEffect(()=>setViewerError(''),[resource.value]);
  const current=()=>resource.isCurrent() && alive.current && latest.current===scope && getCurrentUser()?.id===owner && getCourseYear().courseId===routeCourse;
  async function download() {
    if (pending.current || !current()) return;
    const generation=++exportGeneration.current, epoch=getAuthEpoch();
    // Export authority survives viewer reloads and the OS folder-picker handoff.
    const exportCurrent=()=>alive.current && generation===exportGeneration.current && latest.current===scope &&
      getAuthEpoch()===epoch && getCurrentUser()?.id===owner && getCourseYear().courseId===routeCourse;
    pending.current=true;setBusy(true);setStatus('');setDownloadError('');
    try {
      const url=await getPaperUrl(paperId,true);
      if (!exportCurrent()) return;
      const result=await downloadPaper(url,paperId,exportCurrent);
      if (exportCurrent()) setStatus(result);
    } catch(e) { if(exportCurrent()) setDownloadError(e instanceof Error?e.message:'Could not download the PDF.'); }
    finally {pending.current=false;if(alive.current)setBusy(false);}
  }
  return {...resource,paperId,busy,status,download,cancelDownload:()=>{exportGeneration.current++;setStatus('Download cancelled.');},viewerError,error:resource.error || viewerError || downloadError,
    onViewerError:()=>{if(current()) setViewerError('We couldn’t open this paper. Try again to request a fresh link.');},
    retry:()=>{setViewerError('');setDownloadError('');resource.retry();}};
}
