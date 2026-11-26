import { supabase } from "../config/supabase";
import { toCamelCase, toSnakeCase } from "../utils/caseConvert";
import type { Product, ProductInput } from "../types/product";
import { applyContentFilters, fetchAllPages } from "../utils/filters";
import type { ContentFilters } from "../types/filters";

const TABLE = "products";

// products.year_id only means "the scope='year' target", so only the course
// filter is applied here (see applyContentFilters).
export async function getProducts(filters: ContentFilters = {}): Promise<Product[]> {
  const rows = await fetchAllPages<any>(() => applyContentFilters(
    supabase.from(TABLE).select("*").order("created_at", { ascending: false }).order("id"),
    { courseId: filters.courseId }
  ));
  return rows.map((row) => toCamelCase<Product>(row));
}

// A Product only ever uses the id field(s) matching its `scope` (see
// types/product.ts) - the others are left as "" by the form. Postgres'
// uuid columns reject "" outright ("invalid input syntax for type uuid"),
// so any unused id must become `null`, not "", before it reaches Supabase.
function nullifyEmptyIds(payload: Record<string, any>) {
  const idKeys = ["chapterId", "subjectId", "yearId", "courseId"];
  const cleaned = { ...payload };
  for (const key of idKeys) {
    if (cleaned[key] === "") cleaned[key] = null;
  }
  // Blank/zero MRP means no advertised discount; JSON must carry null.
  if ("originalPrice" in cleaned) cleaned.originalPrice = cleaned.originalPrice == null || cleaned.originalPrice === 0 ? null : cleaned.originalPrice;
  return cleaned;
}

// chapterTitle / subjectTitle / yearTitle / yearTitles are UI-only display
// fields - not columns on the "products" table - so they must be stripped
// before sending to Supabase.
// Postgres error code for a unique-constraint violation. On the "products"
// table this fires when a Year/Subject/Chapter already has a Product
// pointing at it for that scope (e.g. two "full year" products for the
// same Year) - the DB enforces "one active product per target" so buyers
// never see two competing prices for the same thing.
const UNIQUE_VIOLATION = "23505";

function friendlyProductError(error: any): Error {
  if (error?.code === UNIQUE_VIOLATION) {
    return new Error(
      "A product already exists for this Year/Subject/Chapter. Edit the existing product instead, or pick a different selection."
    );
  }
  if (error?.code === "40001") {
    return new Error("This product changed or was deleted. Close this form, refresh the list, and reopen it before saving.");
  }
  return error;
}

export async function addProduct(data: ProductInput) {
  const { chapterTitle, subjectTitle, yearTitle, yearTitles, courseTitle, ...payload } = data;
  const { error } = await supabase.from(TABLE).insert(toSnakeCase(nullifyEmptyIds(payload)));
  if (error) throw friendlyProductError(error);
}

export async function updateProduct(id: string, data: ProductInput, revision: number) {
  if (!Number.isSafeInteger(revision) || revision <= 0)
    throw new Error("Reload the product before saving; its revision is missing.");
  // Allow only persisted, editable fields. A caller cannot submit revision/id,
  // timestamps, or UI labels even if it bypasses the TypeScript input type.
  const keys = ["title", "description", "scope", "productType", "price", "originalPrice", "thumbnail",
    "chapterId", "subjectId", "yearId", "yearIds", "active", "courseId"] as const;
  const payload = Object.fromEntries(keys.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]));
  const { error } = await supabase.rpc("products_update", {
    p_id: id, p_revision: revision, p_changes: toSnakeCase(nullifyEmptyIds(payload)),
  }).single();
  if (error) throw friendlyProductError(error);
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id).select("id").single();
  if (error) throw error;
}
