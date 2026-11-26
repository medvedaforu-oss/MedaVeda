export function validPaperId(id: unknown): id is string;
export function paperShareUrl(id: string): string;
export function paperShareMessage(id: string, title?: string): string;
export function parsePaperLink(url: string | null): { id: string; invalid?: never } | { invalid: true; id?: never } | null;
export function paperPlayUrl(id: string, now?: number): string;
export function parsePaperReferrer(raw: string, now: number, installedAt: number): { id: string } | null;
