import React from "react";
import { Text } from "react-native";
import ErrorState from "./ErrorState";
import { COLORS } from "../theme/colors";

export default function PurchaseOwnershipStatus({ loading, error, refresh }: {
  loading: boolean; error: string | null; refresh: () => void;
}) {
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (loading) return <Text style={{ color: COLORS.subtitle }}>Checking purchases…</Text>;
  return null;
}
