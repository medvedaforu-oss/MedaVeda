export const SEARCH_PAGE_SIZE = 250;
const MAX_SEARCH_ROWS_PER_TYPE = 10_000;
export type SearchPage = { size: number; after?: string };

/** Keyset pagination avoids the server's default row cap and deep offsets.
 * Fail explicitly at the memory bound instead of returning a partial index. */
export async function readAllSearchPages<T extends { id: string }>(
  load: (page: SearchPage) => Promise<T[]>,
): Promise<T[]> {
  const result: T[] = [];
  let after: string | undefined;
  while (true) {
    const rows = await load({ size: SEARCH_PAGE_SIZE, after });
    if (rows.length > SEARCH_PAGE_SIZE) throw new Error("Search page exceeded its requested size");
    result.push(...rows);
    if (result.length > MAX_SEARCH_ROWS_PER_TYPE) throw new Error("Search catalog is too large; please browse by subject");
    if (rows.length < SEARCH_PAGE_SIZE) return result;
    const next = rows.at(-1)?.id;
    if (!next || (after && next <= after)) throw new Error("Search pagination did not advance");
    after = next;
  }
}
