import { useEffect, useState } from "react";
import { EMPTY_STREAK, getStreak, recordActivityToday, type StreakData } from "../utils/streakTracker";
import { getAuthEpoch, getCurrentUser, subscribeAuthUser } from "../services/authState";

export default function useStreak() {
  const [epoch, setEpoch] = useState(getAuthEpoch());
  const [state, setState] = useState<{ epoch: number; data: StreakData; loading: boolean; error: string | null }>({ epoch, data: EMPTY_STREAK, loading: true, error: null });
  useEffect(() => subscribeAuthUser(() => setEpoch(getAuthEpoch())), []);
  useEffect(() => {
    let alive = true;
    const owner = getCurrentUser()?.id;
    const current = () => alive && epoch === getAuthEpoch() && owner === getCurrentUser()?.id;
    setState({ epoch, data: EMPTY_STREAK, loading: true, error: null });
    void (async () => {
      try {
        const data = await recordActivityToday();
        if (current()) setState({ epoch, data, loading: false, error: null });
      } catch {
        // Preserve successfully read activity, but never display an unsaved increment.
        const data = await getStreak().catch(() => ({ ...EMPTY_STREAK }));
        if (current()) setState({ epoch, data, loading: false, error: "Study streak is unavailable." });
      }
    })();
    return () => { alive = false; };
  }, [epoch]);
  return state.epoch === getAuthEpoch() ? { ...state.data, loading: state.loading, error: state.error } : { ...EMPTY_STREAK, loading: true, error: null };
}
