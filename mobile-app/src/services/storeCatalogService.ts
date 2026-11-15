import { getActiveYears } from "../repositories/yearsRepository";
import { getSubjectsByYear } from "../repositories/subjectsRepository";
import { fetchProductsByYear, fetchProductsBySubject, Product } from "./productsService";
import type { Year } from "./yearsService";
import type { Subject } from "./subjectsService";

export type YearBlock = {
  year: Year;
  yearProduct: Product | null;
  subjects: Subject[];
  subjectProducts: Record<string, Product | null>;
};

/** A complete live snapshot. Bypass catalog cache fallbacks and pending-read
 * sharing: Retry must reach the repository, and a failed read is never empty.
 * Commit all stages together so a missing price cannot masquerade as free Notes.
 */
export async function fetchStoreCatalog(courseId: string): Promise<YearBlock[]> {
  const years = await getActiveYears(courseId);
  return Promise.all([...years].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(async year => {
    const [products, subjects] = await Promise.all([
      fetchProductsByYear(year.id), getSubjectsByYear(year.id),
    ]);
    const sortedSubjects = [...subjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const lists = await Promise.all(sortedSubjects.map(subject => fetchProductsBySubject(subject.id)));
    const subjectProducts: Record<string, Product | null> = {};
    sortedSubjects.forEach((subject, index) => { subjectProducts[subject.id] = lists[index][0] ?? null; });
    return { year, yearProduct: products[0] ?? null, subjects: sortedSubjects, subjectProducts };
  }));
}
