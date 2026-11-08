import LookupStatus from "../components/LookupStatus";
import { useMemo, useState } from "react";
import useCourses from "../hooks/useCourses";
import CoursePicker from "../components/CoursePicker";

import useOrders from "../hooks/useOrders";

import OrdersTable from "../components/OrdersTable";
import OrderFilter from "../components/OrderFilter";
import SearchBar from "../components/SearchBar";
import ConfirmDialog from "../components/ConfirmDialog";

import type { Order, OrderStatus } from "../types/order";

export default function Orders() {
  const { courses, loading: coursesLoading, error: coursesError, reload: reloadCourses } = useCourses();
  const [courseFilter, setCourseFilter] = useState("");

  const { orders, loading, hasLoaded, error, reload, changeStatus } = useOrders({ courseId: courseFilter || undefined });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [pendingChange, setPendingChange] = useState<{
    order: Order;
    status: OrderStatus;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.userName?.toLowerCase().includes(search.toLowerCase()) ||
        order.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
        order.productTitle?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !status || order.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);

  function requestStatusChange(order: Order, newStatus: OrderStatus) {
    if (newStatus === order.status) return;
    setActionError(null);
    setPendingChange({ order, status: newStatus });
  }

  async function confirmStatusChange() {
    if (!pendingChange) return;
    try {
      setSaving(true);
      setActionError(null);
      await changeStatus(pendingChange.order.id, pendingChange.status);
      setPendingChange(null);
    } catch (err) {
      console.error("Could not update this order:", err);
      setActionError(err instanceof Error ? err.message : "Could not update this order. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !hasLoaded) {
    return (
      <h2 className="text-xl">
        Loading...
      </h2>
    );
  }

  return (
    <div>
      <LookupStatus label="courses" loading={coursesLoading} error={coursesError} onRetry={reloadCourses} />
      {loading && <p role="status" className="mb-4 text-sm text-gray-500">Refreshing...</p>}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500 mt-1">
          View and manage student purchases.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
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
        <OrderFilter value={status} onChange={setStatus} />
      </div>

      {error && <div role="alert" className="text-red-500 mb-4"><p>{error}</p><button type="button" onClick={() => { void reload(); }}>Retry</button></div>}

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center shadow">
          <h2 className="text-xl font-semibold">No Orders Found</h2>
          <p className="text-gray-500 mt-2">Try changing your filters.</p>
        </div>
      ) : (
        <OrdersTable
          orders={filteredOrders}
          onStatusChange={requestStatusChange}
        />
      )}

      <ConfirmDialog
        open={!!pendingChange}
        title="Change Order Status?"
        message={
          pendingChange
            ? `Mark this order as "${pendingChange.status}" for ${pendingChange.order.userName || "this student"}?`
            : ""
        }
        error={actionError}
        loading={saving}
        confirmLabel="Update Status"
        loadingLabel="Updating..."
        onCancel={() => setPendingChange(null)}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
