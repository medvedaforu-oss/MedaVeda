import { withRouteValidation } from "../../navigation/withRouteValidation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";

import { RouteProp, useRoute } from "@react-navigation/native";

import VideoCard from "../../components/VideoCard";
import ErrorState from "../../components/ErrorState";
import { openVideo } from "../../utils/videoLink";
import { RootStackParamList } from "../../types/navigation";
import EmptyState from "../../components/EmptyState";
import SearchBar from "../../components/SearchBar";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";

import { fetchVideosBySubject, Video } from "../../services/videosService";
import { traceVideo } from "../../utils/videoDiagnostics";
import { logError } from "../../utils/logger";

// MedVeda 2.0: Video Lectures are always free for every student, for
// the whole Subject - only PDF Notes are paid (and chapter-scoped)
// content. No purchase check, no lock icons, no Unlock panel here.
function VideosScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Videos">>();
  const { subjectId, subjectTitle } = route.params;

  const [search, setSearch] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setVideos([]);

    traceVideo("fetch.start");
    fetchVideosBySubject(subjectId)
      .then((data) => {
        traceVideo("fetch.resolved", { count: data.length });
        if (isMounted) setVideos(data);
      })
      .catch((err) => {
        traceVideo("fetch.failed");
        logError("Failed to load videos:", err);
        if (isMounted) {
          setError("Could not load videos. Check your internet connection and try again.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subjectId, attempt]);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase();
    return videos.filter((item) => (item.title ?? "").toLowerCase().includes(query));
  }, [videos, search]);

  const renderVideo = useCallback(({ item }: { item: Video; index: number }) => (
    <VideoCard
      title={item.title}
      locked={false}
      onPressIn={() => traceVideo("card.press-in")}
      onPress={() => {
        traceVideo("card.press", { raw: item.youtubeUrl });
        void openVideo(item.youtubeUrl);
      }}
    />
  ), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{subjectTitle}</Text>
      <Text style={styles.subtitle}>Video Lectures - Free</Text>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search Videos..."
      />

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setAttempt(value => value + 1)} />
      ) : (
        <FlatList initialNumToRender={6} windowSize={7} maxToRenderPerBatch={6}
          keyboardShouldPersistTaps="handled"
          data={filteredData}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: SPACING.sm, paddingBottom: SPACING.xl }}
          renderItem={renderVideo}
          ListEmptyComponent={<EmptyState title="🔍 No Videos Found" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: 60,
  },
  title: {
    fontSize: FONT.title,
    fontWeight: "bold",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT.body,
    color: COLORS.subtitle,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
});

export default withRouteValidation(VideosScreen, ["subjectId"], [], false);
