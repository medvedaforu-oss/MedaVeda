import { supabase } from "../config/supabase";
import { toCamelCase } from "../utils/caseConvert";
import { isNonplayTestBuild } from "../config/paymentProvider";

export async function getPurchasesByUser(uid: string) {
  const { data, error } = await supabase.from("purchases").select("*").eq("user_id", uid).eq("status", "success");
  if (error) throw error;

  // Returned camelCase (id + fields) - purchasesService maps these into
  // both OwnedScope[] and MyPurchase[] shapes depending on the caller.
  const real=(data ?? []).map((row) => toCamelCase<any>(row));
  if (!isNonplayTestBuild) return real;
  const test=await import("../services/nonplayTestService");
  const catalog=await test.testCatalog().catch(() => test.EMPTY_TEST_CATALOG);
  return [...real,...catalog.purchases];
}
