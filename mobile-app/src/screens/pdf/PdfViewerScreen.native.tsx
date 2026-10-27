import React, { useEffect, useState } from "react";
import {
  AppState,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import Pdf from "react-native-pdf";
import { useNavigation, useRoute } from "@react-navigation/native";

import ErrorState from "../../components/ErrorState";
import { getAllDownloads } from "../../utils/downloadManager";
import { mayOpenOfflineNote } from "../../services/offlineNoteAccess";
import { supabase } from "../../config/supabase";
import { FONT } from "../../theme/fonts";
import { logError } from "../../utils/logger";

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // route.params can be undefined if this screen is ever reached without
  // being navigated to from an access-checked note (SRS: "Validate access
  // before every open request" - this is the last line of defense, on top
  // of the check already done before navigating here).
  const { pdfUrl } = route.params ?? {};

  // Downloaded Notes (roadmap change 8) are opened by passing their local
  // file:// URI in place of the usual remote pdfUrl - same screen, same
  // prop, no separate "offline viewer" needed. `cache: true` only makes
  // sense for a remote fetch, so skip it here.
  const isLocalFile = typeof pdfUrl === "string" && pdfUrl.startsWith("file://");

  const [access, setAccess] = useState<{ uri: string; allowed: boolean; message?: string } | null>(null);
  useEffect(() => {
    if (!isLocalFile) return;
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
        const allowed = !!item && await mayOpenOfflineNote(item.id);
        if (!current()) return;
        if (!allowed) {
          setAccess({ uri: pdfUrl, allowed: false,
            message: "Connect to verify access. Offline access lasts 7 days; refunded or revoked notes require an active purchase." });
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

  const [page, setPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(0);
  const [loadError, setLoadError] = useState(false);

  if (typeof pdfUrl !== "string" || !/^(https:\/\/|file:\/\/)/i.test(pdfUrl)) {
    return (
      <View style={styles.container}>
        <ErrorState
          message="This document couldn't be opened. Please go back and try again."
          onRetry={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (isLocalFile && (access?.uri !== pdfUrl || !access.allowed)) {
    return <View style={styles.container}>{access?.uri !== pdfUrl
      ? <ActivityIndicator size="large" />
      : <ErrorState message={access.message ?? "Connect to verify your access, then try again."}
          onRetry={() => navigation.goBack()} />}</View>;
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={isLocalFile
            ? "This PDF may be damaged. Remove it from Downloads and download it again while online."
            : "This PDF could not load. Check your connection and available storage, then reopen the note for a fresh link."}
          onRetry={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* react-native-pdf downloads and renders the actual PDF file (all
          pages, real text/graphics) instead of embedding Google Docs
          Viewer in a WebView. The old gview approach frequently failed to
          render the complete document (blank pages / partial content),
          especially with signed Firebase Storage URLs - this renders the
          full PDF reliably, with pinch-to-zoom and page-by-page scrolling. */}
      <Pdf
        source={{ uri: pdfUrl, cache: false }}
        style={styles.pdf}
        trustAllCerts={false}
        enablePaging={false}
        horizontal={false}
        fitPolicy={0}
        spacing={8}
        onLoadComplete={(pages) => {
          setNumberOfPages(pages);
        }}
        onPageChanged={(currentPage) => {
          setPage(currentPage);
        }}
        onError={(error) => {
          logError("PDF load error:", error);
          setLoadError(true);
        }}
        renderActivityIndicator={() => (
          <ActivityIndicator size="large" color="#8C3A22" />
        )}
      />

      {numberOfPages > 0 && (
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>
            Page {page} / {numberOfPages}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  pdf: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  pageBadge: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  pageBadgeText: {
    color: "#fff",
    fontSize: FONT.small,
    fontWeight: "600",
  },
});
