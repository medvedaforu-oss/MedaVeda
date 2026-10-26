import { Alert, Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";
import { parseVideoUrl, sanitizeVideoUrl } from "./videoUrl";
import { traceVideo } from "./videoDiagnostics";

export { normalizeVideoUrl } from "./videoUrl";

function copyLink(url: string) {
  void Clipboard.setStringAsync(url).then(() => {
    Alert.alert("Link copied", "Paste the link into YouTube or your browser.");
  }).catch(() => {
    Alert.alert("Couldn't copy link", "Please try again.");
  });
}

/** No auth/purchase checks and no canOpenURL gate, including for logged-out callers. */
export async function openVideo(value: unknown): Promise<void> {
  traceVideo("open.enter", { raw: value });
  const parsed = parseVideoUrl(value);
  traceVideo("parse.result", { sanitized: sanitizeVideoUrl(value), normalized: parsed?.url, youtubeId: parsed?.youtubeId });
  if (!parsed) {
    traceVideo("parse.invalid");
    const raw = typeof value === "string" ? value.trim() : "";
    Alert.alert("Video link unavailable", "This video link is missing or invalid. Please share it with MedVeda support.", [
      { text: "OK" },
      ...(raw ? [{ text: "Copy link", onPress: () => copyLink(raw) }] : []),
    ]);
    return;
  }
  const { url, youtubeId } = parsed;
  if (Platform.OS === "android" && youtubeId) {
    // Use the app-specific intent first; fall through if YouTube is not installed.
    // Preserve time/playlist context for app handlers that support those parameters.
    const parameters = new URL(url).searchParams;
    parameters.delete("v");
    const query = parameters.toString();
    const nativeUrl = `vnd.youtube://${youtubeId}${query ? `?${query}` : ""}`;
    try {
      traceVideo("native.attempt", { url: nativeUrl });
      await Linking.openURL(nativeUrl);
      traceVideo("native.resolved");
      return;
    } catch (error) {
      traceVideo("native.rejected", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  try {
    traceVideo("https.attempt", { url });
    await Linking.openURL(url);
    traceVideo("https.resolved");
    return;
  } catch (error) {
    traceVideo("https.rejected", { error: error instanceof Error ? error.message : String(error) });
  }
  try {
    traceVideo("browser.attempt", { url });
    const result = await WebBrowser.openBrowserAsync(url);
    if (result.type === "locked") throw new Error("Browser presentation locked");
    // Closing/canceling an opened browser is a user action, not an opening failure.
    traceVideo("browser.resolved", { type: result.type });
    return;
  } catch (error) {
    traceVideo("browser.rejected", { error: error instanceof Error ? error.message : String(error) });
  }
  traceVideo("open.failed");
  Alert.alert("Couldn't open video", "YouTube and the browser could not open this link. Check that a browser is enabled, then retry or copy the link.", [
    { text: "Cancel", style: "cancel" },
    { text: "Retry", onPress: () => { void openVideo(url); } },
    { text: "Copy link", onPress: () => copyLink(url) },
  ]);
}

// Compatibility for existing imports; there is only one opening implementation.
export const openVideoLink = openVideo;
