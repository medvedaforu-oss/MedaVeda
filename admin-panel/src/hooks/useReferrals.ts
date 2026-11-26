import useRequestGuard from "./useRequestGuard";
import { useCallback, useEffect, useState } from "react";

import {
  getReferralSettings,
  getReferralSettingsAudit,
  getReferrals,
  saveReferralSettings,
  rejectReferral,
} from "../services/referralService";

import type {
  Referral,
  ReferralSettings,
  ReferralSettingsAuditEntry,
  ReferralSettingsInput,
  ReferralStatus,
} from "../types/referral";

export default function useReferrals(status?: ReferralStatus) {
  const beginRequest = useRequestGuard(status ?? "");
  const beginSettings = useRequestGuard("settings");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const beginAudit = useRequestGuard("audit");
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [audit, setAudit] = useState<ReferralSettingsAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const current = beginRequest();
    if (!current()) return;
    try {
      setLoading(true);
      const list = await getReferrals(status);
      if (!current()) return;
      setReferrals(list);
      setError(null);
    } catch (err) {
      if (!current()) return;
      console.error(err);
      setError("Could not load referrals. Please try again.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [status, beginRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSettings = useCallback(async () => {
    const current = beginSettings();
    try {
      const row = await getReferralSettings();
      if (!current()) return;
      setSettings(row);
      setSettingsError(null);
    } catch {
      if (current()) setSettingsError("Could not load referral settings. Please try again.");
    }
  }, [beginSettings]);
  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const loadAudit = useCallback(async () => {
    const current = beginAudit();
    setAuditLoading(true); setAuditError(null);
    try {
      const log = await getReferralSettingsAudit(10);
      if (current()) setAudit(log);
    } catch (failure) {
      if (!current()) return;
      const status = (failure as { status?: number })?.status;
      const code = (failure as { code?: string })?.code;
      setAuditError(status === 401 || status === 403 || code === "42501"
        ? "History access denied. Sign in with an authorized Admin account and complete any required MFA."
        : "Could not load referral history. Please retry.");
    } finally { if (current()) setAuditLoading(false); }
  }, [beginAudit]);
  useEffect(() => { void loadAudit(); }, [loadAudit]);

  async function saveSettings(data: ReferralSettingsInput) {
    // Invalidate an earlier bootstrap read before the write starts.
    const current = beginSettings();
    await saveReferralSettings(data);
    if (!current()) return;
    await Promise.all([loadSettings(), loadAudit()]);
  }

  async function reject(id: string, reason?: string) {
    const result = await rejectReferral(id, reason);
    await load();
    return result;
  }

  return { referrals, settings, audit, auditLoading, auditError, reloadAudit: loadAudit, loading, error: error ?? settingsError,
    reload: () => Promise.all([load(), loadSettings(), loadAudit()]), saveSettings, reject };
}
