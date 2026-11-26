import type { PaperInput } from './types';
export function validateInput(input: PaperInput): PaperInput {
  const session = input.exam_session?.trim().replace(/\s+/g, ' ');
  const normalized = { ...input, subject_id: input.subject_id.trim(),
    ...(input.title !== undefined ? { title: input.title.trim().replace(/\s+/g, ' ') } : {}),
    ...(input.exam_session !== undefined ? { exam_session: session ? (/^(summer|winter)$/i.test(session) ? session[0].toUpperCase()+session.slice(1).toLowerCase() : session) : null } : {}),
    paper_type: input.paper_type.trim().replace(/\s+/g, ' ').toLowerCase(),
    paper_number: input.paper_number.trim().replace(/\s+/g, ' ').toLowerCase() };
  const validPeriod = normalized.exam_session
    ? normalized.exam_month === null && normalized.exam_session.length <= 60 && /^[\p{L}\p{N}][\p{L}\p{N} ()/–—-]*$/u.test(normalized.exam_session) && !!normalized.title
    : Number.isInteger(input.exam_month) && input.exam_month! >= 1 && input.exam_month! <= 12;
  if (!normalized.subject_id || !Number.isInteger(input.exam_year) || input.exam_year < 1900 || input.exam_year > 9999 ||
      !validPeriod || (normalized.title?.length ?? 0) > 200 ||
      normalized.paper_type.length > 80 || normalized.paper_number.length > 40 || typeof input.published !== 'boolean') {
    throw new Error('Select a subject, valid examination year and session, and a question paper title (up to 200 characters).');
  }
  return normalized;
}
