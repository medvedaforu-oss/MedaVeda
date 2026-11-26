type ContentType = 'question-paper' | 'note' | 'quiz';
export type PaperIntent = ({ id: string; invalid?: never } | { invalid: true; id?: never }) & { type?: ContentType };
type Pending = { intent: PaperIntent; owner: string | null; at: number; revision: number; attempted: boolean };
export type PaperDestination = { paperId: string; title: string; courseId: string };
type Context = { owner: string | null; ready: boolean; courseId?: string };
type Ports<D> = {
  context(): Context;
  resolve(id: string, type?: ContentType): Promise<D>;
  open(destination: D & { courseId: string }): void;
  error(message: string, retry?: () => void): void;
};
/** Only record IDs live here, in process memory; nothing survives sign-out or gets stored with a token. */
export class PaperLinkQueue<D = { paperId: string; title: string }> {
  pending: Pending | null = null;
  private owner: string | null = null;
  private revision = 0;
  private running = false;
  private lastDelivery: { key: string; at: number } | null = null;
  private listeners = new Set<() => void>();
  constructor(private now: () => number = Date.now) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit() { this.listeners.forEach(listener => listener()); }
  accountChanged(owner: string | null) {
    if (this.owner && this.owner !== owner) {
      this.pending = null;
      this.lastDelivery = null;
      this.revision++;
    }
    this.owner = owner;
    if (this.pending && !this.pending.owner && owner) this.pending.owner = owner;
    this.emit();
  }
  receive(intent: PaperIntent, owner: string | null) {
    this.accountChanged(owner);
    const key = `${intent.type ?? 'question-paper'}:${intent.id ?? 'invalid'}`, at = this.now();
    if ((this.pending && this.pending.intent.id === intent.id && (this.pending.intent.type ?? 'question-paper') === (intent.type ?? 'question-paper')) ||
        (this.lastDelivery?.key === key && at - this.lastDelivery.at < 1500)) return;
    this.lastDelivery = { key, at };
    this.pending = { intent, owner, at, revision: ++this.revision, attempted: false };
    this.emit();
  }
  async process(ports: Ports<D>): Promise<void> {
    const pending = this.pending, context = ports.context();
    if (!pending || this.running || pending.attempted || !context.ready) return;
    if (this.now() - pending.at > 86400000) { this.pending = null; return; }
    if (!context.owner || !context.courseId) return;
    if (pending.owner !== context.owner) { this.pending = null; return; }
    const current = () => this.pending === pending && pending.revision === this.revision &&
      ports.context().owner === context.owner && ports.context().courseId === context.courseId && ports.context().ready;
    if (pending.intent.invalid) {
      this.pending = null;
      ports.error('Invalid content link. Ask the sender to share it again.');
      return;
    }
    pending.attempted = true;
    this.running = true;
    try {
      const destination = await ports.resolve(pending.intent.id, pending.intent.type);
      if (!current()) return;
      ports.open({ ...destination, courseId: context.courseId });
      this.pending = null;
    } catch (error) {
      if (!current()) return;
      const definitive = (error as { definitive?: boolean })?.definitive === true;
      if (definitive) this.pending = null;
      ports.error(definitive ? 'This content is unavailable or your account does not have access.' :
        'Could not open this content. Check your internet connection and retry, or reopen the shared link.',
      definitive ? undefined : () => {
        if (this.pending !== pending) return;
        pending.attempted = false;
        this.emit();
      });
    } finally {
      this.running = false;
      // A background/account/course transition invalidates the response, but not a newer link.
      if (this.pending === pending && !current()) pending.attempted = false;
      if (this.pending && !this.pending.attempted) this.emit();
    }
  }
}
