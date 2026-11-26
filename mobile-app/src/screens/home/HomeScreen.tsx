import PurchaseOwnershipStatus from "../../components/PurchaseOwnershipStatus";
import usePurchaseResource from "../../hooks/usePurchaseResource";
import useDashboardResource, { dashboardContextKey } from "../../hooks/useDashboardResource";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

import { useNavigation, useFocusEffect } from "@react-navigation/native";

import { fetchYears, Year } from "../../services/yearsService";
import { fetchProductsByYear, Product } from "../../services/productsService";
import { fetchMyPurchases } from "../../services/purchasesService";
import { fetchNotifications, getUnreadNotificationCount, AppNotification } from "../../services/notificationsService";
import { fetchLatestChapters, fetchRecommendedChapters, Chapter } from "../../services/chaptersService";
import { getLastViewedChapter, getRecentChapters, RecentChapterEntry } from "../../utils/recentActivity";

import useQuizStats from "../../hooks/useQuizStats";
import usePurchases from "../../hooks/usePurchases";
import usePurchase from "../../hooks/usePurchase";
import useCourseYear from "../../hooks/useCourseYear";
import { needsCourseYearSelection } from "../../services/courseState";
import { logAppOpen } from "../../services/analyticsService";
import { applyPendingReferralCode } from "../../services/referralsService";
import { getCurrentUser, getCurrentUserDisplayName } from "../../services/authState";

import YearCard from "../../components/YearCard";
import HomeHeader from "../../components/HomeHeader";
import StudentProfileCard from "../../components/StudentProfileCard";
import ContinueLearningCard from "../../components/ContinueLearningCard";
import DailyQuoteCard from "../../components/DailyQuoteCard";
import SectionHeader from "../../components/SectionHeader";
import NotificationRow from "../../components/NotificationRow";
import MiniChapterCard from "../../components/MiniChapterCard";
import BottomNav from "../../components/BottomNav";
import StaggerItem from "../../components/StaggerItem";
import ProductCard from "../../components/ProductCard";
import ProductPosterCard from "../../components/ProductPosterCard";
import FeatureCard from "../../components/FeatureCard";
import { SkeletonBlock, SkeletonCardRow, SkeletonStrip } from "../../components/Skeleton";

import { COLORS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import { SPACING } from "../../theme/spacing";
import { RADIUS } from "../../theme/radius";
import { SHADOW } from "../../theme/shadows";
import { logError } from "../../utils/logger";

// Each dashboard section owns its own loading state and fetches
// independently, so a slow/failing section never blocks the rest of the
// screen - this is what lets every section show its own skeleton.
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { totalAttempts, averagePercentage, loading: statsLoading } = useQuizStats();

  const [refreshing, setRefreshing] = useState(false);

  // Shared Course/Year state (loaded once after login). Every course-scoped
  // fetch below waits for it and re-runs if the course changes.
  const courseYear = useCourseYear();
  const { ready, courseId, courseTitle, yearId, yearTitle } = courseYear;

  // Safety net for the post-login gate: if the profile turns out to have no
  // course/year (e.g. it couldn't be loaded at login), ask for it now.
  useEffect(() => {
    if (needsCourseYearSelection(courseYear)) navigation.replace("SelectCourseYear");
  }, [courseYear, navigation]);

  const yearsResource = useDashboardResource(useCallback(() => fetchYears(courseId), [courseId]), [] as Year[], ready);
  const { value: years, loading: yearsLoading } = yearsResource;
  const yearsError = yearsResource.error
    ? (yearsResource.error as { code?: string }).code === "failed-precondition"
      ? "Setup needed: please contact MedVeda support, then reload."
      : "Could not load years. Pull down to try again."
    : null;
  const { refresh: loadYears } = yearsResource;

  const { value: yearProducts, loading: yearProductsLoading, refresh: loadYearProducts } = useDashboardResource(useCallback(async () => {
    const yrs = await fetchYears(courseId);
    const sorted = [...yrs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return Promise.all(sorted.map(async year => {
      const products = await fetchProductsByYear(year.id);
      return { year, product: products[0] ?? null };
    }));
  }, [courseId]), [] as { year: Year; product: Product | null }[], ready);

  const { isOwned, refresh: refreshPurchases2, loading: purchasesOwnershipLoading, error: purchasesOwnershipError } = usePurchases();
  const { buy, purchasing } = usePurchase();
  const { value: purchases, loading: purchasesLoading, error: purchasesError, refresh: loadPurchases } = usePurchaseResource(fetchMyPurchases);

  const { value: notifications, loading: notificationsLoading, refresh: loadNotifications } = useDashboardResource(fetchNotifications, [] as AppNotification[]);
  const { value: unreadNotificationCount, refresh: loadUnreadNotificationCount } = useDashboardResource(getUnreadNotificationCount, 0);
  const { value: latestChapters, loading: latestLoading, refresh: loadLatest } = useDashboardResource(
    useCallback(() => fetchLatestChapters(6, courseId), [courseId]), [] as Chapter[], ready);
  const { value: recommended, loading: recommendedLoading, refresh: loadRecommended } = useDashboardResource(
    useCallback(() => fetchRecommendedChapters(new Set(), yearId ?? years[0]?.id, 6, courseId), [years, courseId, yearId]),
    [] as Chapter[], ready && !yearsLoading);
  const { value: recent, loading: recentLoading, refresh: loadRecentActivity } = useDashboardResource(useCallback(async () => {
    const [last, list] = await Promise.all([getLastViewedChapter(courseId), getRecentChapters(courseId)]);
    return { last, list: list.slice(1, 6) };
  }, [courseId]), { last: null as RecentChapterEntry | null, list: [] as RecentChapterEntry[] }, ready);
  const { last: continueChapter, list: recentChapters } = recent;

  const email = getCurrentUser()?.email ?? "";
  const displayName = getCurrentUserDisplayName() || (email ? email.split("@")[0] : "Student");

  useEffect(() => {
    logAppOpen();
    // A referral code typed at sign-up is applied now that there's a session.
    applyPendingReferralCode().then((result) => {
      if (result?.status === "success") {
        Alert.alert("Referral applied", "Your friend's referral code has been applied.");
      }
    });
  }, []);

  useFocusEffect(useCallback(() => {
    void loadRecentActivity();
    void refreshPurchases2();
    void loadUnreadNotificationCount();
  }, [loadRecentActivity, refreshPurchases2, loadUnreadNotificationCount]));

  const refreshRun = useRef({ generation: 0, mounted: true });
  const context = dashboardContextKey();
  useEffect(() => {
    const run = refreshRun.current;
    run.mounted = true;
    run.generation++;
    setRefreshing(false);
    return () => { run.mounted = false; run.generation++; };
  }, [context]);
  const onRefresh = useCallback(() => {
    const run = refreshRun.current;
    const generation = ++run.generation;
    const key = dashboardContextKey();
    setRefreshing(true);
    void Promise.all([
      loadYears(), loadYearProducts(), loadPurchases(), loadNotifications(),
      loadUnreadNotificationCount(), loadLatest(), loadRecommended(), loadRecentActivity(),
    ]).catch(err => logError("Failed to refresh Home:", err)).finally(() => {
      if (run.mounted && run.generation === generation && key === dashboardContextKey()) setRefreshing(false);
    });
  }, [loadYears, loadYearProducts, loadPurchases, loadNotifications, loadUnreadNotificationCount, loadLatest, loadRecommended, loadRecentActivity]);

  const goToChapter = useCallback((c: { id: string; title: string; subjectId: string; subjectTitle: string; yearId: string; yearTitle: string }) => {
    navigation.navigate("ChapterDetails", {
      chapterId: c.id,
      chapterTitle: c.title,
      subjectId: c.subjectId,
      subjectTitle: c.subjectTitle,
      yearId: c.yearId,
      yearTitle: c.yearTitle,
    });
  }, [navigation]);

  const overallProgress = totalAttempts > 0 ? averagePercentage : 0;

  const renderYearProduct = useCallback(({ item: yp, index }: { item: { year: Year; product: Product | null }; index: number }) => {
    const product = yp.product as Product;
    const owned = isOwned(product);

    return (
      <StaggerItem index={index}>
        <ProductPosterCard
          title={yp.year.title}
          caption="Full Year Notes"
          price={product.price}
          originalPrice={product.originalPrice}
          owned={owned}
          colorIndex={index}
          icon="📚"
          onPress={() => {
            if (owned) navigation.navigate("MyPurchases");
            else navigation.navigate("Subjects", { yearId: yp.year.id, yearTitle: yp.year.title });
          }}
          onBuyPress={!owned && Platform.OS === "android" ? () => buy(product) : undefined}
          buying={purchasing}
        />
      </StaggerItem>
    );
  }, [buy, isOwned, navigation, purchasing]);

  const renderLatest = useCallback(({ item }: { item: Chapter; index: number }) => (
    <MiniChapterCard
      title={item.title}
      subtitle={item.subjectTitle}
      emoji="🆕"
      onPress={() => goToChapter(item as any)}
    />
  ), [goToChapter]);

  const renderRecommended = useCallback(({ item }: { item: Chapter; index: number }) => (
    <MiniChapterCard
      title={item.title}
      subtitle={item.subjectTitle}
      emoji="✨"
      onPress={() => goToChapter(item as any)}
    />
  ), [goToChapter]);

  const renderRecent = useCallback(({ item }: { item: RecentChapterEntry; index: number }) => (
    <MiniChapterCard
      title={item.chapterTitle}
      subtitle={item.subjectTitle}
      emoji="🕘"
      onPress={() =>
        goToChapter({
          id: item.chapterId,
          title: item.chapterTitle,
          subjectId: item.subjectId,
          subjectTitle: item.subjectTitle,
          yearId: item.yearId,
          yearTitle: item.yearTitle,
        })
      }
    />
  ), [goToChapter]);

  return (
    <View style={styles.screen}>
      <PurchaseOwnershipStatus loading={purchasesOwnershipLoading || purchasesLoading} error={purchasesOwnershipError || purchasesError} refresh={() => { void refreshPurchases2(); void loadPurchases(); }} />
      <HomeHeader unreadNotificationCount={unreadNotificationCount} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {statsLoading || purchasesLoading ? (
          <SkeletonBlock height={92} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.lg }} />
        ) : (
          <StudentProfileCard
            name={displayName}
            email={email}
            progressPercentage={overallProgress}
            purchasedCount={purchases.length}
            courseLabel={
              courseTitle ? `${courseTitle}${yearTitle ? ` · ${yearTitle}` : ""}` : undefined
            }
            onPress={() => navigation.navigate("Profile")}
          />
        )}

        {recentLoading ? (
          <SkeletonBlock height={72} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.lg }} />
        ) : continueChapter ? (
          <ContinueLearningCard
            chapterTitle={continueChapter.chapterTitle}
            subjectTitle={continueChapter.subjectTitle}
            yearTitle={continueChapter.yearTitle}
            onPress={() =>
              goToChapter({
                id: continueChapter.chapterId,
                title: continueChapter.chapterTitle,
                subjectId: continueChapter.subjectId,
                subjectTitle: continueChapter.subjectTitle,
                yearId: continueChapter.yearId,
                yearTitle: continueChapter.yearTitle,
              })
            }
          />
        ) : null}

        <SectionHeader title="Academic Years" />
        {yearsLoading ? (
          <SkeletonCardRow count={3} />
        ) : yearsError ? (
          <Text style={styles.emptyText}>{yearsError}</Text>
        ) : years.length === 0 ? (
          <Text style={styles.emptyText}>No academic years added yet. Add one from the admin panel.</Text>
        ) : (
          <View style={styles.yearsList}>
            {years.map((item, index) => (
              <StaggerItem key={item.id} index={index}>
                <YearCard
                  title={item.title}
                  icon={item.icon}
                  color={item.color}
                  onPress={() => navigation.navigate("Subjects", { yearId: item.id, yearTitle: item.title })}
                />
              </StaggerItem>
            ))}
          </View>
        )}

        <SectionHeader title="Quick Access" />
        <FeatureCard
          title="Question Papers"
          icon="📄"
          color={COLORS.accent}
          onPress={() => navigation.navigate("QuestionPaperYears")}
        />
        <FeatureCard
          title="PDF Notes"
          icon="📚"
          color={COLORS.success}
          onPress={() => navigation.navigate("Years", { mode: "notes" })}
        />
        <FeatureCard
          title="Video Lectures"
          icon="🎥"
          color={COLORS.info}
          onPress={() => navigation.navigate("Years", { mode: "videos" })}
        />
        <FeatureCard
          title="MCQ Test"
          icon="📝"
          color={COLORS.warning}
          onPress={() => navigation.navigate("Years", { mode: "quiz" })}
        />

        <SectionHeader title="Buy Notes" onSeeAll={() => navigation.navigate("Store")} />
        {yearProductsLoading ? (
          <SkeletonCardRow count={3} />
        ) : yearProducts.filter((yp) => yp.product !== null).length === 0 ? (
          <Text style={styles.emptyText}>
            No year-wise Notes packages available yet.
          </Text>
        ) : (
          <FlatList initialNumToRender={3} windowSize={5} maxToRenderPerBatch={3}
            data={yearProducts.filter((yp) => yp.product !== null)}
            keyExtractor={(yp) => yp.year.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ marginBottom: SPACING.lg }}
            renderItem={renderYearProduct}
          />
        )}

        <SectionHeader title="Latest Updates" onSeeAll={() => navigation.navigate("Search")} />
        {latestLoading ? (
          <SkeletonStrip count={3} />
        ) : latestChapters.length === 0 ? (
          <Text style={styles.emptyText}>No new updates right now.</Text>
        ) : (
          <FlatList initialNumToRender={3} windowSize={5} maxToRenderPerBatch={3}
            data={latestChapters}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ marginBottom: SPACING.lg }}
            renderItem={renderLatest}
          />
        )}

        <SectionHeader title="Recommended For You" />
        {recommendedLoading ? (
          <SkeletonStrip count={3} />
        ) : recommended.length === 0 ? (
          <Text style={styles.emptyText}>Explore a few chapters and we'll tailor picks for you.</Text>
        ) : (
          <FlatList initialNumToRender={3} windowSize={5} maxToRenderPerBatch={3}
            data={recommended}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ marginBottom: SPACING.lg }}
            renderItem={renderRecommended}
          />
        )}

        {(recentLoading || recentChapters.length > 0) && (
          <>
            <SectionHeader title="Recently Viewed" />
            {recentLoading ? (
              <SkeletonStrip count={3} />
            ) : (
              <FlatList initialNumToRender={3} windowSize={5} maxToRenderPerBatch={3}
                data={recentChapters}
                keyExtractor={(item) => item.chapterId}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ marginBottom: SPACING.lg }}
                renderItem={renderRecent}
              />
            )}
          </>
        )}

        <SectionHeader title="Purchased Packages" onSeeAll={() => navigation.navigate("MyPurchases")} />
        {purchasesLoading ? (
          <SkeletonCardRow count={2} />
        ) : purchases.length === 0 ? (
          <TouchableOpacity style={styles.storeBanner} activeOpacity={0.85} onPress={() => navigation.navigate("Store")}>
            <Text style={styles.storeBannerIcon}>🛍️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeBannerTitle}>Browse Notes</Text>
              <Text style={styles.storeBannerSubtitle}>Chapters, Subject & Year Packs, Bundles</Text>
            </View>
            <Text style={styles.storeBannerChevron}>›</Text>
          </TouchableOpacity>
        ) : (
          purchases.slice(0, 4).map((p) => (
            <ProductCard
              key={p.id}
              title={p.title}
              scope={p.scope}
              price={0}
              owned
              onPress={() => navigation.navigate("MyPurchases")}
            />
          ))
        )}

        <DailyQuoteCard />

        {!notificationsLoading && notifications.length > 0 && (
          <>
            <SectionHeader title="Notifications" />
            {notifications.slice(0, 3).map((n) => (
              <NotificationRow key={n.id} title={n.title} body={n.body} type={n.type} />
            ))}
          </>
        )}
      </ScrollView>

      <BottomNav active="Home" />

      {purchasing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  body: {
    flex: 1,
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.md,
  },

  yearsList: {
    marginBottom: SPACING.sm,
  },

  storeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW.card,
  },

  storeBannerIcon: {
    fontSize: 26,
    marginRight: SPACING.md,
  },

  storeBannerTitle: {
    fontSize: FONT.body,
    fontWeight: "700",
    color: COLORS.text,
  },

  storeBannerSubtitle: {
    fontSize: FONT.small,
    color: COLORS.subtitle,
    marginTop: 2,
  },

  storeBannerChevron: {
    fontSize: 26,
    fontWeight: "300",
    color: COLORS.accent,
  },

  emptyText: {
    color: COLORS.subtitle,
    fontSize: 15,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
