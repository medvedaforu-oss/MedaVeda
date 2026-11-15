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
  const [auth, setAuth] = useState<{ ready: boolean; signedIn: boolean; userId: string | null }>({ ready: false, signedIn: false, userId: null });
  const router = useRef(createNotificationRouter(({ screen, params }) => navigation.navigate(screen, params))).current;

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      receivedAuthEvent = true;
      router.setAccount(session?.user.id ?? null);
      if (active) setAuth({ ready: true, signedIn: !!session, userId: session?.user.id ?? null });
    });
    void supabase.auth.getSession().then(({ data: session }) => {
      if (active && !receivedAuthEvent) {
        router.setAccount(session.session?.user.id ?? null);
        setAuth({ ready: true, signedIn: !!session.session, userId: session.session?.user.id ?? null });
      }
    }).catch(() => {
      if (active && !receivedAuthEvent) setAuth({ ready: true, signedIn: false, userId: null });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [router]);

  useEffect(() => {
    router.setReady(navigationReady && auth.signedIn, route);
  }, [router, navigationReady, auth.signedIn, auth.userId, route]);

  useEffect(() => {
    if (!navigationReady || !auth.ready) return;
    return setupNotificationResponseListener(router.receive);
  }, [navigationReady, auth.ready, router]);
}
