import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ContentShareButton from "../../features/sharing/ContentShareButton";
import ErrorState from "../../components/ErrorState";
import { supabase } from "../../config/supabase";
import { getCurrentUser } from "../../services/authState";
import { getSecureNoteUrl } from "../../services/secureNotesService";

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { pdfUrl, noteId, title } = route.params ?? {};
  const owner = useRef(getCurrentUser()?.id);
  const generation = useRef(0);
  const [source, setSource] = useState(pdfUrl);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const invalidate = () => { generation.current++; };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id === owner.current) return;
      invalidate();
      pending.current = false;
      setBusy(false);
      setSource(undefined);
      setFailed(true);
    });
    return () => { invalidate(); data.subscription.unsubscribe(); };
  }, []);
  const retry = async () => {
    if (pending.current) return;
    if (!noteId || !owner.current || owner.current !== getCurrentUser()?.id) {
      navigation.goBack();
      return;
    }
    pending.current = true;
    setBusy(true);
    const run = ++generation.current;
    try {
      const url = await getSecureNoteUrl(noteId);
      if (run !== generation.current || getCurrentUser()?.id !== owner.current) return;
      setSource(url);
      setFailed(false);
    } catch {
      if (run === generation.current) setFailed(true);
    } finally {
      pending.current = false;
      if (run === generation.current) setBusy(false);
    }
  };
  if (failed || typeof source !== "string" || !/^https:\/\//i.test(source)) {
    return <View style={styles.container}><ErrorState
      message="Could not open this note. Connect to the internet and tap Retry. Paid Notes are online-only."
      onRetry={() => void retry()} busy={busy} /></View>;
  }
  return <View style={styles.container}>
    {!!noteId && <ContentShareButton type="note" id={noteId} title={title} />}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reload PDF with a fresh link"
      disabled={busy} onPress={() => void retry()} style={styles.reload}>
      <Text>{busy ? "Refreshing PDF…" : "Reload PDF with a fresh link"}</Text>
    </TouchableOpacity>
    {React.createElement("iframe", {
    src: source, title: "PDF Viewer", onError: () => setFailed(true),
    style: { flex: 1, width: "100%", height: "100%", border: "none" },
  })}</View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: "#fff" },
  reload: { minHeight: 48, padding: 12, alignItems: "center", justifyContent: "center" } });
