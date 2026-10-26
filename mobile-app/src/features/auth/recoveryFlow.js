/* Shared recovery controller. website/scripts/build.mjs copies this file verbatim.
 * Keep secrets in the caller/client only; errors exposed to UI are fixed messages.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MedVedaRecovery = factory();
})(typeof window !== "undefined" ? window : this, function () {
  var EXPIRED = ["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "jwt_expired", "otp_expired", "user_not_found", "user_banned"];
  var MESSAGES = {
    recovery_expired: "Your reset session is invalid or has expired. Request a new reset link from the app.",
    mfa_unavailable: "We couldn't find a verified authenticator for this account. If you cannot access your enrolled factor, contact MedVeda support for account recovery.",
    mfa_verification_failed: "That code didn't work or has expired. Enter a fresh code from your authenticator and try again.",
    mfa_required: "Verify your enrolled authenticator before changing your password.",
    network_error: "We couldn't reach the server. Check your connection and try again.",
    over_request_rate_limit: "Too many attempts. Please wait before trying again.",
    same_password: "Your new password must be different from your old one.",
    weak_password: "Use 8–32 characters including uppercase, lowercase, a number and a special character.",
    cleanup_failed: "Your password changed, but sign-out could not finish. Check your connection and retry sign-out.",
    busy: "Please wait for the current request to finish.",
    recovery_failed: "We couldn't complete password recovery. Please try again."
  };
  function recoveryError(code) {
    var error = new Error(MESSAGES[code] || MESSAGES.recovery_failed);
    error.code = code;
    return error;
  }
  function normalize(error) {
    var code = error && error.code;
    if (error && error.name === "AuthSessionMissingError" || EXPIRED.indexOf(code) !== -1) return recoveryError("recovery_expired");
    if (code === "insufficient_aal") return recoveryError("mfa_required");
    if (["mfa_verification_failed", "mfa_challenge_expired", "mfa_verification_rejected", "mfa_ip_address_mismatch"].indexOf(code) !== -1) return recoveryError("mfa_verification_failed");
    if (["mfa_factor_not_found", "mfa_factor_unverified", "mfa_totp_verify_disabled"].indexOf(code) !== -1) return recoveryError("mfa_unavailable");
    if (code === "over_request_rate_limit" || code === "over_sms_send_rate_limit" || error && error.status === 429) return recoveryError("over_request_rate_limit");
    if (MESSAGES[code]) return recoveryError(code);
    if (error && (error.name === "AuthRetryableFetchError" || error.name === "TypeError" || error.status === 0 || error.status >= 500)) return recoveryError("network_error");
    return recoveryError("recovery_failed");
  }
  function createRecoveryFlow(auth) {
    var phase = "idle", factors = [], imported = false, requireMfa = false, challengeRequired = false, busy = false;
    function snapshot() { return { phase: phase, factors: factors.slice() }; }
    function checked(result) { if (result.error) throw result.error; return result.data; }
    async function assurance(forceChallenge) {
      if (!imported) throw recoveryError("recovery_expired");
      // Remember a server-required challenge even if the next network check fails.
      if (forceChallenge) { challengeRequired = true; requireMfa = true; }
      var aal = checked(await auth.mfa.getAuthenticatorAssuranceLevel());
      if (!aal || !aal.currentLevel || !aal.nextLevel) throw recoveryError("recovery_expired");
      if (forceChallenge || aal.nextLevel === "aal2") requireMfa = true;
      if ((!challengeRequired && aal.currentLevel === "aal2") || (!requireMfa && aal.currentLevel === "aal1" && aal.nextLevel === "aal1")) {
        phase = "ready"; factors = []; return snapshot();
      }
      // Only verified, existing TOTP factors may be used. Never enroll during recovery.
      var listed = checked(await auth.mfa.listFactors());
      factors = ((listed && listed.all) || []).filter(function (f) { return f.status === "verified" && f.factor_type === "totp"; })
        .map(function (f, i) { return { id: f.id, label: "Authenticator " + (i + 1) }; });
      if (!factors.length) { phase = "blocked"; throw recoveryError("mfa_unavailable"); }
      phase = "mfa";
      return snapshot();
    }
    async function exclusive(work) {
      if (busy) throw recoveryError("busy");
      busy = true;
      try { return await work(); }
      catch (raw) {
        var error = normalize(raw);
        if (error.code === "recovery_expired") { phase = "expired"; imported = false; factors = []; }
        if (error.code === "mfa_unavailable") phase = "blocked";
        if (error.code === "mfa_required") { requireMfa = true; phase = "mfa"; }
        throw error;
      } finally { busy = false; }
    }
    async function cleanup() {
      phase = "cleanup";
      try {
        var result = await auth.signOut();
        if (result.error) throw result.error;
      } catch (_) { throw recoveryError("cleanup_failed"); }
      imported = false; factors = []; phase = "done";
      return snapshot();
    }
    return {
      snapshot: snapshot,
      start: function (tokens) { return exclusive(async function () {
        if (["expired", "blocked", "done", "cleanup"].indexOf(phase) !== -1) throw recoveryError("recovery_expired");
        if (!imported) {
          if (!tokens || !tokens.accessToken || !tokens.refreshToken) throw recoveryError("recovery_expired");
          var data = checked(await auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken }));
          if (!data || !data.session) throw recoveryError("recovery_expired");
          imported = true;
        }
        return assurance(false);
      }); },
      verify: function (factorId, code) { return exclusive(async function () {
        if (phase === "expired") throw recoveryError("recovery_expired");
        if (phase !== "mfa") throw recoveryError("mfa_required");
        if (!factors.some(function (f) { return f.id === factorId; })) throw recoveryError("mfa_unavailable");
        if (!/^\d{6}$/.test(code)) throw recoveryError("mfa_verification_failed");
        checked(await auth.mfa.challengeAndVerify({ factorId: factorId, code: code }));
        requireMfa = true; challengeRequired = false;
        var result = await assurance(false);
        if (result.phase !== "ready") throw recoveryError("mfa_required");
        return result;
      }); },
      updatePassword: function (password) { return exclusive(async function () {
        if (phase === "expired") throw recoveryError("recovery_expired");
        if (phase !== "ready") throw recoveryError("mfa_required");
        phase = "idle";
        var state = await assurance(false);
        if (state.phase !== "ready") return state;
        var result = await auth.updateUser({ password: password });
        if (result.error && result.error.code === "insufficient_aal") {
          phase = "idle"; return assurance(true);
        }
        checked(result);
        return cleanup();
      }); },
      retryCleanup: function () { return exclusive(async function () {
        if (phase !== "cleanup") throw recoveryError("recovery_failed");
        return cleanup();
      }); }
    };
  }
  return { createRecoveryFlow: createRecoveryFlow, recoveryError: recoveryError };
});
