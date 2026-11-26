import type { Paper } from './types';
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export function sessionLabel(paper: {exam_year: number; exam_month: number | null; exam_session?: string | null}): string {
  return [paper.exam_session || (paper.exam_month ? months[paper.exam_month-1] : ''),paper.exam_year].filter(Boolean).join(' ');
}
export function paperTitle(paper: Pick<Paper,'title'|'paper_type'|'paper_number'>): string {
  return paper.title || [paper.paper_type, paper.paper_number ? `Paper ${paper.paper_number.toUpperCase()}` : ''].filter(Boolean).join(' · ') || 'Question paper';
}
