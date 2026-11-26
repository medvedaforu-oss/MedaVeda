import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View, Text, ActivityIndicator } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import Pdf from "react-native-pdf";
import { useNavigation, useRoute } from "@react-navigation/native";
import ErrorState from "../../components/ErrorState";
import { getAllDownloads } from "../../utils/downloadManager";
import { mayOpenOfflineNote } from "../../services/offlineNoteAccess";
import { supabase } from "../../config/supabase";
import { getCurrentUser } from "../../services/authState";
import { getSecureNoteUrl } from "../../services/secureNotesService";
import { FONT } from "../../theme/fonts";
import { logError } from "../../utils/logger";

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const { pdfUrl, noteId } = route.params ?? {};
  // A different document gets a new native view and lifecycle. Late callbacks
  // from the old document cannot change the new document's error/page state.
  return <PdfViewerSession key={`${noteId ?? ""}:${pdfUrl}`} pdfUrl={pdfUrl} noteId={noteId} />;
}

export function PdfViewerSession({ pdfUrl, noteId }: { pdfUrl?: string; noteId?: string }) {
  const navigation = useNavigation<any>();
  const isLocalFile = typeof pdfUrl === "string" && pdfUrl.startsWith("file://");
  const [access, setAccess] = useState<{ uri: string; allowed: boolean; message?: string } | null>(null);
  useEffect(() => {
    if (!isLocalFile || !pdfUrl) return;
    let alive = true;
    let generation = 0;
    let checking: number | null = null;
    const check = async () => {
      if (checking !== null || AppState.currentState !== "active") return;
      const run = generation;
      checking = run;
      const current = () => alive && generation === run && AppState.currentState === "active";
      try {
        const item = getAllDownloads().find((entry) => entry.contentType === "note" && entry.localUri === pdfUrl);
        const allowed = !!item && item.isFreePreview === true && await mayOpenOfflineNote(item.id);
        if (!current()) return;
        if (!allowed) {
          setAccess({ uri: pdfUrl, allowed: false,
            message: "Paid notes are online-only. Free-preview offline access lasts 7 days; revoked previews need a fresh online check. Connect and reopen this note from its chapter." });
          return;
        }
        const info = await FileSystem.getInfoAsync(pdfUrl);
        if (!current()) return;
        setAccess({ uri: pdfUrl, allowed: info.exists && info.size > 0,
          message: "This downloaded file is missing or empty. Remove it from Downloads and download it again while online." });
      } catch { if (current()) setAccess({ uri: pdfUrl, allowed: false,
        message: "This download could not be opened. Check access online, then download it again." }); }
      finally { if (checking === run) checking = null; }
    };
    const invalidate = () => { generation++; checking = null; setAccess(null); };
    void check();
    const app = AppState.addEventListener("change", (state) => {
      invalidate();
      if (state === "active") void check();
    });
    const { data } = supabase.auth.onAuthStateChange(() => { invalidate(); void check(); });
    const timer = setInterval(() => { if (AppState.currentState === "active") void check(); }, 60_000);
    return () => { alive = false; generation++; clearInterval(timer); app.remove(); data.subscription.unsubscribe(); };
  }, [isLocalFile, pdfUrl]);

  const [remoteUrl, setRemoteUrl] = useState(pdfUrl);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const alive = useRef(true);
  const owner = useRef(getCurrentUser()?.id);
  const [foreground, setForeground] = useState(AppState.currentState === "active");

  const retry = useCallback(async () => {
    if (busy.current || !alive.current) return;
    if (isLocalFile || !noteId) { navigation.goBack(); return; }
    if (!owner.current || getCurrentUser()?.id !== owner.current) {
      setLoadError(true);
      return;
    }
    busy.current = true;
    const run = ++generation.current;
    setRefreshing(true);
    setRemoteUrl(undefined);
    setLoadError(false);
    try {
      // Always use the existing server entitlement check; never reuse an expired
      // link, construct a storage URL, or silently fall back to public storage.
      const url = await getSecureNoteUrl(noteId);
      if (!alive.current || run !== generation.current || getCurrentUser()?.id !== owner.current) return;
      setPage(1);
      setNumberOfPages(0);
      setRevision(run);
      setRemoteUrl(url);
    } catch {
      if (alive.current && run === generation.current) setLoadError(true);
    } finally {
      if (alive.current && run === generation.current) {
        busy.current = false;
        setRefreshing(false);
      }
    }
  }, [isLocalFile, navigation, noteId]);

  useEffect(() => {
    alive.current = true;
    if (isLocalFile) return () => { alive.current = false; };
    const invalidate = () => {
      generation.current++;
      busy.current = false;
      setRefreshing(false);
      setRemoteUrl(undefined);
    };
    const app = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") invalidate();
      else if (noteId) void retry();
      else { setRevision(++generation.current); setRemoteUrl(pdfUrl); }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id === owner.current) return;
      invalidate();
      setLoadError(true);
    });
    // This mutable counter cancels work; it is intentionally read at cleanup time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { alive.current = false; generation.current++; app.remove(); data.subscription.unsubscribe(); };
  }, [isLocalFile, noteId, pdfUrl, retry]);

  const source = isLocalFile ? pdfUrl : remoteUrl;
  const allowed = !isLocalFile || (access?.uri === pdfUrl && access.allowed);
  useEffect(() => {
    if (!source || !allowed || numberOfPages > 0 || loadError || !foreground) return;
    // Native fetch/render can fail without a callback on older devices. Offer a
    // bounded recovery instead of a permanent blank/loading screen.
    const timer = setTimeout(() => setLoadError(true), 45_000);
    return () => clearTimeout(timer);
  }, [source, allowed, numberOfPages, loadError, foreground, revision]);

  if (typeof pdfUrl !== "string" || !/^(https:\/\/|file:\/\/)/i.test(pdfUrl)) {
    return <View style={styles.container}><ErrorState message="This document couldn't be opened. Please go back and try again."
      onRetry={() => navigation.goBack()} /></View>;
  }
  if (isLocalFile && !allowed) {
    return <View style={styles.container}>{access?.uri !== pdfUrl
      ? <ActivityIndicator size="large" />
      : <ErrorState message={access.message ?? "Connect to verify your access, then try again."}
          onRetry={() => navigation.goBack()} />}</View>;
  }
  if (loadError) {
    return <View style={styles.container}><ErrorState
      message={isLocalFile
        ? "This PDF may be damaged. Remove it from Downloads and download it again while online."
        : "Could not open this note. Connect to the internet and tap Retry. Paid Notes are online-only."}
      onRetry={() => void retry()} /></View>;
  }
  if (refreshing || !source || !foreground) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#8C3A22" />
      <Text style={{ color: "#fff" }}>Opening your note…</Text></View>;
  }
  const run = generation.current;
  const current = () => alive.current && run === generation.current;
  return <View style={styles.container}>
    <Pdf key={revision} source={{ uri: source, cache: false }} style={styles.pdf}
      trustAllCerts={false} enablePaging={false} horizontal={false} fitPolicy={0} spacing={8}
      onLoadComplete={(pages) => { if (current()) setNumberOfPages(pages); }}
      onPageChanged={(currentPage) => { if (current()) setPage(currentPage); }}
      onError={() => {
        if (!current()) return;
        // Native error messages can contain the entire signed URL. Never log it.
        logError("PDF fetch or render failed");
        setLoadError(true);
      }}
      renderActivityIndicator={() => <ActivityIndicator size="large" color="#8C3A22" />} />
    {numberOfPages > 0 && <View style={styles.pageBadge}>
      <Text style={styles.pageBadgeText}>Page {page} / {numberOfPages}</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#100C0A" },
  loading: { flex: 1, backgroundColor: "#100C0A", alignItems: "center", justifyContent: "center", gap: 12 },
  pdf: { flex: 1, width: "100%", height: "100%" },
  pageBadge: { position: "absolute", bottom: 20, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pageBadgeText: { color: "#fff", fontSize: FONT.small, fontWeight: "600" },
});
