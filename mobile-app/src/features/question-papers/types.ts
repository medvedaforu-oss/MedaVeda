export interface Paper {
  id: string; subject_id: string; exam_year: number; exam_month: number | null; exam_session?: string | null; title?: string;
  paper_type: string; paper_number: string; object_path: string; published: boolean;
}
export interface PaperSession { exam_year: number; exam_month: number | null; exam_session?: string | null; papers: Paper[] }
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
