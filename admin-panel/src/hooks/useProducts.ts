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
  const beginRequest = useRequestGuard(JSON.stringify([courseId, yearId]));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const data = await getProducts({ courseId, yearId });
      if (!current()) return;
      setProducts(data);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load products. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [courseId, yearId, beginRequest]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function createProduct(data: ProductInput) {
    await addProduct(data);
    await loadProducts();
  }

  async function editProduct(id: string, data: ProductInput) {
    await updateProduct(id, data);
    await loadProducts();
  }

  async function removeProduct(id: string) {
    await deleteProduct(id);
    await loadProducts();
  }

  return {
    products,
    loading,
    error,
    reload: loadProducts,
    createProduct,
    editProduct,
    removeProduct,
  };
}
