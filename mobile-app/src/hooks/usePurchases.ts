import { useMemo } from "react";
import usePurchaseResource from "./usePurchaseResource";
import { getCourseYear } from "../services/courseState";

import {
  fetchOwnedScopes,
  isChapterUnlocked,
  isProductOwned,
} from "../services/purchasesService";
import { Product } from "../services/productsService";

/**
 * Tracks everything the current user owns (as purchase "scopes" - chapter,
 * subject, year, or multi-year bundle), so screens can check "is this
 * chapter/product unlocked?" without re-fetching on every check.
 */
export default function usePurchases() {
  const { value, loading, error, refresh } = usePurchaseResource(fetchOwnedScopes);
  const courseId = getCourseYear().courseId;
  const ownedScopes = useMemo(() => value.filter(scope => !!courseId && scope.courseId === courseId), [value, courseId]);

  function isChapterOwned(chapter: { id: string; subjectId: string; yearId: string }) {
    return isChapterUnlocked(ownedScopes, chapter);
  }

  function isOwned(product: Product) {
    return isProductOwned(ownedScopes, product);
  }

  return { ownedScopes, isChapterOwned, isOwned, refresh, loading, error };
}
