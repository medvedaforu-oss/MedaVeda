// Display only. Never use these labels to build routes, identities or SEO data.
export const cleanLabel = value => String(value).replace(/\s+/gu, ' ').trim();

export function displayLabel(value) {
  const label = cleanLabel(value);
  // Leave Indian-language and mixed-script text in its original case. Preserve
  // acronyms, ordinals and existing internal capitals in Latin labels too.
  if (/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}]/u.test(label)) return label;
  return label.replace(/(?<![\p{L}\p{M}\p{N}])[a-z][a-z’']*(?![\p{L}\p{M}\p{N}])/gu, (word, offset) =>
    offset && /^(?:and|of|the|in|for|with|to)$/i.test(word) ? word : word[0].toUpperCase() + word.slice(1));
}

function roman(value) {
  const number = Number(value);
  if (!/^[1-9]\d*$/.test(value) || number > 3999) return value;
  let rest = number, result = '';
  for (const [amount, letters] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]) {
    while (rest >= amount) { result += letters; rest -= amount; }
  }
  return result;
}

export function displayPaperNumber(value) {
  const number = cleanLabel(value).replace(/^(?:paper(?:\s+number)?|part)\s*[-–—:]?\s*/i, '');
  if (!number) return '';
  const formatted = /^\d+$/.test(number) ? roman(number) : /^[ivxlcdm]+$/i.test(number) ? number.toUpperCase() : number;
  return `Paper ${formatted}`;
}

export function displaySubject(value) {
  let label = cleanLabel(value);
  // Explicit Paper/Part notation is unambiguous. Bare numbers, dates, codes and
  // ordinals are never converted. A small terminal dash suffix on a multiword
  // subject is the catalog's existing part notation (e.g. "Adhyayan-1").
  label = label.replace(/\s*(?:[-–—]\s*)?\(?\b(paper(?:\s+number)?|part)\s*[-–—:]?\s*([1-9]\d{0,2}|[ivxlcdm]+)\)?\s*$/i,
    (_, kind, number, offset) => `${offset ? ' – ' : ''}${/^part$/i.test(kind) ? 'Part ' + roman(number.toUpperCase()) : displayPaperNumber(number)}`);
  label = label.replace(/^(.*\p{L})\s*[-–—]\s*([1-9]|10)$/u, (match, subject, number) =>
    /\p{L}[\p{L}\p{M}]*\s+[\p{L}\p{M}]{2,}$/u.test(subject) &&
    !/\b(?:Paper|Part|Type|Grade|Stage|Class|Level|Category)\s*$/i.test(subject) ? `${subject.trim()} – ${roman(number)}` : match);
  return displayLabel(label.replace(/\s+[-–—]\s+/g, ' – '));
}

export function displayCourse(value) {
  const label = cleanLabel(value);
  // Only expose medium when the course explicitly names it; never infer it
  // from the subject's language or add anything to the API projection.
  const match = label.match(/^(.+?)\s+(?:[·–—-]\s*)?(?:\(([\p{L}\p{M}]+)\s+medium\)|([\p{L}\p{M}]+)\s+medium)$/iu);
  return match ? { name: displayLabel(match[1]), medium: displayLabel(match[2] || match[3]) } : { name: displayLabel(label), medium: '' };
}

export function academicContext(paper) {
  const course = displayCourse(paper.course_name);
  const year = displayLabel(paper.year_title);
  const academic = year.toLowerCase().startsWith(course.name.toLowerCase() + ' ') ? year : `${course.name} · ${year}`;
  return [academic, course.medium && `${course.medium} Medium`].filter(Boolean).join(' · ');
}
