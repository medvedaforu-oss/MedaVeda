import { withProductCovers } from "../utils/productCovers";
import LookupStatus from "../components/LookupStatus";
import { useCallback, useEffect, useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useRequestGuard from "../hooks/useRequestGuard";
import { getBillingStatuses } from "../services/playBillingSyncService";
import type { BillingStatuses } from "../types/playBilling";
import useProducts from "../hooks/useProducts";
import useYears from "../hooks/useYears";
import useSubjects from "../hooks/useSubjects";
import useChapters from "../hooks/useChapters";

import ProductHeader from "../components/ProductHeader";
import ProductFilter from "../components/ProductFilter";
import ProductTable from "../components/ProductTable";
import ProductFormModal from "../components/ProductFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchBar from "../components/SearchBar";

import type { Product, ProductInput } from "../types/product";

export default function Products() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { products, loading, hasLoaded, error, reload, createProduct, editProduct, removeProduct } =
    useProducts({ courseId: courseFilter || undefined });

  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useYears();
  const { subjects, loading: subjectsLoading, error: subjectsError, reload: reloadSubjects } = useSubjects();
  const { chapters, loading: chaptersLoading, error: chaptersError, reload: reloadChapters } = useChapters();

  const billingVersion = JSON.stringify([courseFilter, loading, error, products.map(product => [product.id, product.revision, product.price, product.active, product.productType])]);
  const [billingRead, setBillingRead] = useState<{ version: string; statuses: BillingStatuses }>({ version: "", statuses: {} });
  const billing = !loading && !error && billingRead.version === billingVersion ? billingRead.statuses : {};
  const [billingError, setBillingError] = useState<string | null>(null);
  const beginBillingRequest = useRequestGuard(billingVersion);
  const loadBilling = useCallback(async () => {
    if (loading || error) return;
    const current = beginBillingRequest();
    try {
      const statuses = await getBillingStatuses();
      if (!current()) return;
      const matched = Object.fromEntries(products.flatMap(product => {
        const status = statuses[product.id];
        return status && status.productRevision === product.revision ? [[product.id, status]] : [];
      }));
      const mismatch = products.some(product => statuses[product.id] &&
        statuses[product.id].productRevision !== product.revision);
      setBillingRead({ version: billingVersion, statuses: matched });
      setBillingError(mismatch ? "Products changed. Refreshing before showing billing readiness." : null);
      if (mismatch) void reload();
    } catch {
      if (!current()) return;
      // A failed refresh cannot continue presenting a previous Ready readout.
      setBillingRead({ version: billingVersion, statuses: {} });
      setBillingError("Could not load Google Play Billing status. Please retry.");
    }
  }, [beginBillingRequest, billingVersion, products, reload, loading, error]);
  useEffect(() => {
    void loadBilling();
    const timer = setInterval(() => { void loadBilling(); }, 30_000);
    return () => clearInterval(timer);
  }, [loadBilling]);

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("");

  const lookupsReady = !coursesLoading && !coursesError && !yearsLoading && !yearsError && !subjectsLoading && !subjectsError && !chaptersLoading && !chaptersError;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const productsWithCovers = useMemo(() => withProductCovers(products, years, subjects, chapters),
    [products, years, subjects, chapters]);
  const filteredProducts = useMemo(() => {
    return productsWithCovers.filter((product) => {
      const matchesSearch = product.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesScope = !scope || product.scope === scope;

      return matchesSearch && matchesScope;
    });
  }, [productsWithCovers, search, scope]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  async function handleSubmit(data: ProductInput) {
    if (editing) {
      await editProduct(editing.id, data, editing.revision);
    } else {
      await createProduct(data);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setActionError(null);
      await removeProduct(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Could not delete this product:", err);
      setActionError(err instanceof Error ? err.message : "Could not delete this product. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !hasLoaded) {
    return <h2>Loading...</h2>;
  }

  return (
    <div>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      <LookupStatus label="years" loading={yearsLoading} error={yearsError} onRetry={reloadYears} />
      <LookupStatus label="subjects" loading={subjectsLoading} error={subjectsError} onRetry={reloadSubjects} />
      <LookupStatus label="chapters" loading={chaptersLoading} error={chaptersError} onRetry={reloadChapters} />
      {loading && <p role="status" className="mb-4 text-sm text-gray-500">Refreshing...</p>}
      <ProductHeader onAdd={openCreate} />

      {lookupsReady && years.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Create at least one Year (and Subject) before adding Products.
        </p>
      )}

      <div className="flex gap-4 mb-6">
        <div className="w-48">
          <CoursePicker
            courses={courses}
            value={courseFilter}
            onChange={(id) => {
              setCourseFilter(id);
            }}
            label=""
            placeholder="All Courses"
          />
        </div>

        <SearchBar value={search} onChange={setSearch} />
        <ProductFilter value={scope} onChange={setScope} />
      </div>

      {error && <div role="alert" className="text-red-500 mb-4"><p>{error}</p><button type="button" onClick={() => { void reload(); }}>Retry</button></div>}

      <p className="mb-3 text-sm text-gray-600">Publication controls visibility. Paid Notes require verified Google Play readiness before purchase.</p>
      {billingError && <div role="alert" className="mb-4 text-amber-700"><p>{billingError}</p><button type="button" onClick={() => { void loadBilling(); }}>Recheck status</button></div>}
      <ProductTable
        billing={billing}
        products={filteredProducts}
        onEdit={openEdit}
        onDelete={(product) => { setActionError(null); setDeleteTarget(product); }}
      />

      <ProductFormModal
        lookupsReady={lookupsReady}
        open={formOpen}
        courses={courses}
        years={years}
        subjects={subjects}
        chapters={chapters}
        initialData={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This action cannot be undone.`}
        error={actionError}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
