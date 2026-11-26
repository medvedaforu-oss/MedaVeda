export interface Paper {
  id: string; revision: number; subject_id: string; exam_year: number; exam_month: number | null; exam_session?: string | null; title?: string;
  paper_type: string; paper_number: string; object_path: string; published: boolean;
  created_at: string; updated_at: string;
  subject?: { id: string; title: string; year_id: string;
    year: { id: string; title: string; course_id: string; course: {id: string; name: string} } };
}
export interface PaperInput {
  subject_id: string; exam_year: number; exam_month: number | null; exam_session?: string | null; title?: string;
  paper_type: string; paper_number: string; published: boolean;
}
export interface PaperFilters {
  courseId?: string; yearId?: string; subjectId?: string; examYear?: number;
  examMonth?: number; examSession?: string; published?: string; search?: string;
}
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
