import { useEffect, useRef, useState } from "react";
import type { NavigationContainerRefWithCurrent, ParamListBase } from "@react-navigation/native";
import { supabase } from "../config/supabase";
import { setupNotificationResponseListener } from "../services/pushNotifications";
import { createNotificationRouter } from "../services/notificationRouting";

export default function useNotificationRouting(
  navigation: NavigationContainerRefWithCurrent<ParamListBase>,
  navigationReady: boolean,
  route: string | undefined,
) {
  const [auth, setAuth] = useState({ ready: false, signedIn: false });
  const router = useRef(createNotificationRouter(({ screen, params }) => navigation.navigate(screen, params))).current;

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      if (active) setAuth({ ready: true, signedIn: !!session });
    });
    void supabase.auth.getSession().then(({ data: session }) => {
      if (active && !receivedAuthEvent) setAuth({ ready: true, signedIn: !!session.session });
    }).catch(() => {
      if (active && !receivedAuthEvent) setAuth({ ready: true, signedIn: false });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    router.setReady(navigationReady && auth.signedIn, route);
  }, [router, navigationReady, auth.signedIn, route]);

  useEffect(() => {
    if (!navigationReady || !auth.ready) return;
    return setupNotificationResponseListener(router.receive);
  }, [navigationReady, auth.ready, router]);
}
