import { supabase } from "../config/supabase";
import type { ContentFilters } from "../types/filters";

export interface TopProduct {
  productId: string;
  productTitle: string;
  orders: number;
  revenue: number;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  refundedOrders: number;
  totalUsers: number;
  totalProducts: number;
  topProducts: TopProduct[];
}

// Only the course filter applies: orders/products carry a course_id but no
// meaningful per-row year.
export async function getAnalytics(filters: ContentFilters = {}): Promise<AnalyticsData> {
  const { data, error } = await supabase.rpc("get_admin_analytics", { p_course_id: filters.courseId ?? null });
  if (error) throw error;
  if (!data || !Number.isSafeInteger(data.totalOrders) || !Array.isArray(data.topProducts)) {
    throw new Error("Analytics snapshot unavailable.");
  }
  return data as AnalyticsData;
}
