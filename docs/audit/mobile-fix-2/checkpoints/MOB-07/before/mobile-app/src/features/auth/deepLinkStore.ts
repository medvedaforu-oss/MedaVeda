import { Linking } from "react-native";

let lastUrl: string | null = null;
let revision = 0;
// Consumption invalidates in-flight native reads without replacing the controller.
let readGeneration = 0;
const listeners = new Set<() => void>();
export function getRecoveryLinkRevision() { return revision; }
export function subscribeRecoveryLinks(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function remember(url: string | null) {
  readGeneration++;
  // Only retain recovery links; never keep unrelated URLs in the auth store.
  lastUrl = url?.startsWith("medveda://reset-password") ? url : null;
  // Unrelated links must not retire an active recovery controller.
  if (lastUrl) {
    revision++;
    listeners.forEach(listener => listener());
  }
}

/** React Navigation must await storage before mounting the recovery screen. */
export async function getInitialDeepLinkUrl(): Promise<string | null> {
  const startedAt = readGeneration;
  try {
    const url = await Linking.getInitialURL();
    // A warm link or cleanup that arrived during the read takes precedence.
    if (startedAt !== readGeneration) return lastUrl;
    remember(url);
    return url;
  } catch {
    return null;
  }
}

/** Store each warm link synchronously before navigation handles it. */
export function subscribeDeepLinks(listener: (url: string) => void): () => void {
  const subscription = Linking.addEventListener("url", ({ url }) => {
    remember(url);
    listener(url);
  });
  return () => subscription.remove();
}

export function getLastDeepLinkUrl(): string | null {
  return lastUrl;
}

export function clearLastDeepLinkUrl(expectedRevision = revision) {
  if (revision !== expectedRevision) return;
  readGeneration++;
  lastUrl = null;
}
