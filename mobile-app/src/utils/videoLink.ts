import { Alert, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

/** Accept web links only; repair scheme-less legacy rows without dispatching custom intents. */
export function normalizeVideoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  let text = value.trim();
  if (text.startsWith("//")) text = `https:${text}`;
  else if (!/^[a-z][a-z\d+.-]*:/i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    url.protocol = "https:";
    const host = url.hostname.toLowerCase();
    if (["youtu.be", "youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = host === "youtu.be" ? parts[0] :
        parts[0] === "watch" ? url.searchParams.get("v") :
        ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null;
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      const watch = new URL("https://www.youtube.com/watch");
      watch.searchParams.set("v", id);
      const time = url.searchParams.get("t") || url.searchParams.get("start");
      if (time) watch.searchParams.set("t", time);
      const list = url.searchParams.get("list");
      if (list) watch.searchParams.set("list", list);
      return watch.toString();
    }
    // Drive and Vimeo links remain web URLs, preserving private-link tokens.
    return url.toString();
  } catch {
    return null;
  }
}

export async function openVideoLink(value: unknown): Promise<void> {
  const url = normalizeVideoUrl(value);
  if (!url) {
    Alert.alert("Video unavailable", "This video has a missing or invalid link. Please contact MedVeda support.");
    return;
  }
  const showFailure = () => Alert.alert("Couldn't open video", "Check your internet connection, then retry or open the video in your browser.", [
    { text: "Cancel", style: "cancel" },
    { text: "Retry", onPress: () => { void openVideoLink(url); } },
    { text: "Open in browser", onPress: () => {
      void WebBrowser.openBrowserAsync(url).catch(() => {
        Alert.alert("Browser unavailable", "Please enable a web browser on your device and try again.");
      });
    } },
  ]);
  try {
    // Android package visibility can reject canOpenURL even when ACTION_VIEW works.
    await Linking.openURL(url);
  } catch {
    showFailure();
  }
}
