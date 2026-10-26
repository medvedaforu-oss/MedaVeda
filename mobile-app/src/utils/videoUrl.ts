const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
  "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be",
]);

/** Clean pasted formatting without decoding reserved characters inside signed URLs. */
export function sanitizeVideoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let text = value;
  for (let pass = 0; pass < 3; pass++) {
    text = text.replace(/[\s\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "")
      .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "");
    // Decode a whole escaped link (including double encoding), not its query values.
    if (!text.includes("://") && /%[0-9a-f]{2}/i.test(text)) {
      try {
        const decoded = decodeURIComponent(text);
        if (decoded === text) break;
        text = decoded;
        continue;
      } catch { return null; }
    }
    break;
  }
  return text || null;
}

export type ParsedVideoUrl = { url: string; youtubeId: string | null };

export function parseVideoUrl(value: unknown): ParsedVideoUrl | null {
  let text = sanitizeVideoUrl(value);
  if (!text) return null;
  if (VIDEO_ID.test(text)) text = `https://www.youtube.com/watch?v=${text}`;
  if (text.startsWith("//")) text = `https:${text}`;
  else if (!/^[a-z][a-z\d+.-]*:/i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes(".")) return null;
    url.protocol = "https:";
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return { url: url.toString(), youtubeId: null };
    if (url.port) return null;
    const parts = url.pathname.split("/").filter(Boolean).map(part => decodeURIComponent(part));
    const list = url.searchParams.get("list");
    // A playlist has no individual video ID. Open its canonical web page directly.
    if (parts[0] === "playlist" || (parts[0] === "embed" && parts[1] === "videoseries")) {
      if (!list || !/^[A-Za-z0-9_-]+$/.test(list)) return null;
      return { url: `https://www.youtube.com/playlist?list=${list}`, youtubeId: null };
    }
    const id = host.endsWith("youtu.be") ? parts[0] : parts[0] === "watch" ? url.searchParams.get("v") :
      ["embed", "shorts", "live", "v", "e"].includes(parts[0]) ? parts[1] : null;
    if (!id || !VIDEO_ID.test(id)) return null;
    const watch = new URL("https://www.youtube.com/watch");
    watch.searchParams.set("v", id);
    const time = url.searchParams.get("t") || url.searchParams.get("start") ||
      new URLSearchParams(url.hash.slice(1)).get("t");
    if (time) watch.searchParams.set("t", time);
    if (list) watch.searchParams.set("list", list);
    return { url: watch.toString(), youtubeId: id };
  } catch { return null; }
}

export function normalizeVideoUrl(value: unknown): string | null {
  return parseVideoUrl(value)?.url ?? null;
}
