export function validPaperId(id: unknown): id is string;
export function paperShareUrl(id: string): string;
export function paperShareMessage(id: string, title?: string): string;
export function parsePaperLink(url: string | null): { id: string; invalid?: never } | { invalid: true; id?: never } | null;
export function paperPlayUrl(id: string, now?: number): string;
export function parsePaperReferrer(raw: string, now: number, installedAt: number): { id: string } | null;

export type ContentType = 'question-paper' | 'note' | 'quiz';
export type ContentIntent = ({ id: string; invalid?: never } | { invalid: true; id?: never }) & { type: ContentType };
export function contentShareUrl(type: ContentType, id: string): string;
export function contentShareMessage(type: ContentType, id: string, title?: string): string;
export function parseContentLink(url: string | null): ContentIntent | null;
export function contentPlayUrl(type: ContentType, id: string, now?: number): string;
export function parseContentReferrer(raw: string, now: number, installedAt: number): { type: ContentType; id: string } | null;
