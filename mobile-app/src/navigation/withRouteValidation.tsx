import React from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import ErrorState from "../components/ErrorState";

/** Reject malformed/stale routes before mounting a screen or running its effects. */
export function withRouteValidation(Screen: React.ComponentType, required: string[], modes: string[] = [], requireMode = false) {
  return function ValidatedScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const params = route.params;
    const valid = params && typeof params === "object" && !Array.isArray(params) &&
      required.every(key => typeof params[key] === "string" && params[key].trim().length > 0 && params[key].length <= 200) &&
      (!modes.length || (params.mode === undefined && !requireMode) || modes.includes(params.mode));
    if (!valid) return <ErrorState message="This content link is incomplete. Return and choose the content again."
      onRetry={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")} />;
    return <Screen />;
  };
}
