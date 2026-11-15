/** Fail closed before pricing, reservations, rate-limit writes or provider calls.
 * Only new checkout calls this. Owned historical verification remains available.
 */
export async function newOrdersEnabled(client: { from: (table: string) => any }): Promise<boolean> {
  try {
    const { data, error } = await client.from("purchase_settings")
      .select("new_orders_enabled").eq("id", true).maybeSingle();
    return !error && data?.new_orders_enabled === true;
  } catch { return false; }
}
