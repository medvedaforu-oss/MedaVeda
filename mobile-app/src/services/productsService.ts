import {
  getProductsByChapter,
  getProductsBySubject,
  getProductsByYear,
  getBundleProducts,
  getAllActiveProducts,
} from "../repositories/productsRepository";

export type { Product, ProductScope } from "../types/product";

export {
  getProductsByChapter as fetchProductsByChapter,
  getProductsBySubject as fetchProductsBySubject,
  getProductsByYear as fetchProductsByYear,
  getBundleProducts as fetchBundleProducts,
  getAllActiveProducts as fetchAllProducts,
};

export async function fetchBuyOptionsForChapter(
  chapterId: string,
  subjectId: string,
  yearId: string,
  courseId?: string
) {
  const [chapterProducts, subjectProducts, yearProducts, bundleProducts] = await Promise.all([
    getProductsByChapter(chapterId),
    getProductsBySubject(subjectId),
    getProductsByYear(yearId),
    getBundleProducts(courseId),
  ]);

  // Never publish a partial/malformed tier as a complete catalog. Repository
  // reads are live and Promise.all rejects the snapshot if any tier fails.
  const tiers = [chapterProducts, subjectProducts, yearProducts, bundleProducts];
  const scopes = ["chapter", "subject", "year", "bundle"];
  tiers.forEach((products, index) => {
    if (!Array.isArray(products) || products.some(product =>
      !product || !product.id || !product.courseId || !product.title ||
      product.scope !== scopes[index] || !Number.isFinite(product.price) ||
      (index === 0 && product.chapterId !== chapterId) ||
      (index === 1 && product.subjectId !== subjectId) ||
      (index === 2 && product.yearId !== yearId) ||
      (index === 3 && (!Array.isArray(product.yearIds) || !product.yearIds.length ||
        product.yearIds.some(id => typeof id !== "string" || !id)))
    )) throw { code: "OPTIONS_INCOMPLETE" };
  });

  const relevantBundles = bundleProducts.filter((product) =>
    (product.yearIds ?? []).includes(yearId)
  );

  return [...chapterProducts, ...subjectProducts, ...yearProducts, ...relevantBundles]
    .filter(product => !courseId || product.courseId === courseId);
}
