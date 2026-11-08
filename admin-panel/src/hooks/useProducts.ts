import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";
import type { ContentFilters } from "../types/filters";

import {
  addProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../services/productService";

import type { Product, ProductInput } from "../types/product";

export default function useProducts(filters: ContentFilters = {}) {
  const { courseId, yearId } = filters;
  const scope = JSON.stringify([courseId, yearId]);
  const beginRequest = useRequestGuard(scope);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readState, setReadState] = useState({ scope, hasLoaded: false });

  const loadProducts = useCallback(async (afterMutation = false) => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getProducts({ courseId, yearId });
      if (!current()) return;
      setProducts(data);
      setReadState({ scope, hasLoaded: true });
      setError(null);
    } catch (err) {
      if (!current()) return;
      setReadState((previous) => ({ scope, hasLoaded: previous.scope === scope && previous.hasLoaded }));
      console.error(err);
      setError(afterMutation ? "Saved, but the list could not refresh. Please retry." : "Could not load products. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, scope, beginRequest]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function createProduct(data: ProductInput) {
    await addProduct(data);
    await loadProducts(true);
  }

  async function editProduct(id: string, data: ProductInput) {
    await updateProduct(id, data);
    await loadProducts(true);
  }

  async function removeProduct(id: string) {
    await deleteProduct(id);
    await loadProducts(true);
  }

  const hasLoaded = readState.scope === scope && readState.hasLoaded;
  return {
    products: hasLoaded ? products : [],
    hasLoaded,
    loading: loading || readState.scope !== scope,
    error: readState.scope === scope ? error : null,
    reload: loadProducts,
    createProduct,
    editProduct,
    removeProduct,
  };
}
