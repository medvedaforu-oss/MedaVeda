import { Linking } from "react-native";

let lastUrl: string | null = null;
let revision = 0;

function remember(url: string | null) {
  revision++;
  // Only retain recovery links; never keep unrelated URLs in the auth store.
  lastUrl = url?.startsWith("medveda://reset-password") ? url : null;
}

/** React Navigation must await storage before mounting the recovery screen. */
export async function getInitialDeepLinkUrl(): Promise<string | null> {
  const startedAt = revision;
  try {
    const url = await Linking.getInitialURL();
    // A warm link or cleanup that arrived during the read takes precedence.
    if (startedAt !== revision) return lastUrl;
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

export function clearLastDeepLinkUrl() {
  revision++;
  lastUrl = null;
}
