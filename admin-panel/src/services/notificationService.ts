import { supabase } from "../config/supabase";

export interface SendNotificationPayload {
  title: string;
  body: string;
  type: string;
  requestId: string;
  data?: Record<string, any>;
}

export async function sendPushNotification(
  payload: SendNotificationPayload
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Admin session expired.");
  }

  const { data, error } = await supabase.functions.invoke(
    "send-push-notification",
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: payload,
    }
  );

  if (error) throw error;
  if (data?.code === "unknown_outcome" || data?.code === "enumeration_failed" || data?.unknown > 0 || data?.success === false) {
    throw new Error("Unknown outcome - check the notification feed before retrying.");
  }

  return data;
}