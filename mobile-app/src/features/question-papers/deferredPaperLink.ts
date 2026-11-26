import { parseContentReferrer, type ContentType } from './questionPaperLinks';
type Ports = {
  now(): number;
  installedAt(): Promise<Date>;
  referrer(): Promise<string>;
  getMarker(): Promise<string | null>;
  setMarker(value: string): Promise<void>;
  isCurrent(): boolean;
  receive(id: string, type?: ContentType): void;
};
/** Best effort; a referrer identifies content and never confers access. */
export async function readDeferredPaperLink(ports: Ports): Promise<void> {
  try {
    const installedAt = (await ports.installedAt()).getTime();
    if (!Number.isFinite(installedAt) || installedAt <= 0) return;
    if (await ports.getMarker() === String(installedAt)) return;
    const raw = await ports.referrer();
    const intent = parseContentReferrer(raw, ports.now(), installedAt);
    // Persist before enqueueing. Failure stays closed instead of replaying on every launch.
    await ports.setMarker(String(installedAt));
    if (intent && ports.isCurrent()) ports.receive(intent.id, intent.type);
  } catch {
    // No Play Store, sideload, unsupported native binary or unavailable storage: reopen the shared link.
  }
}
