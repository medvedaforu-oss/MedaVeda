import type { Product } from "../types/product";
import type { Year } from "../types/year";
import type { Subject } from "../types/subject";
import type { Chapter } from "../types/chapter";

/** Hydrate display-only labels from lookups already loaded by Products. */
export function withProductCovers(
  products: Product[], years: Year[], subjects: Subject[], chapters: Chapter[],
): Product[] {
  const yearById = new Map(years.map(year => [year.id, year]));
  const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
  const chapterById = new Map(chapters.map(chapter => [chapter.id, chapter]));
  return products.map(product => {
    const chapter = product.scope === "chapter" ? chapterById.get(product.chapterId ?? "") : undefined;
    const subject = subjectById.get(chapter?.subjectId ?? product.subjectId ?? "");
    const year = yearById.get(chapter?.yearId ?? subject?.yearId ?? product.yearId ?? "");
    return { ...product,
      chapterTitle: chapter?.title ?? "-", subjectTitle: subject?.title ?? "-",
      yearTitle: year?.title ?? "-",
      yearTitles: (product.yearIds ?? []).map(id => yearById.get(id)?.title ?? "-"),
    };
  });
}
