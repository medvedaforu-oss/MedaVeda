(function () {
  var A = window.MedVedaAuth;
  var f = A.readFragment();
  // Kept in memory only, to hand the session to the app on request.
  var originalFragment = f.raw;
  var client = null;
  var recovery = null;
  var busy = false;
  var phase = "idle";
  var otp = document.getElementById("mfa-code");
  var factor = document.getElementById("mfa-factor");
  var mfaSubmit = document.getElementById("mfa-submit");
  var retry = document.getElementById("recovery-retry");
  var cleanupRetry = document.getElementById("cleanup-retry");

  var form = document.getElementById("reset-form");
  var pw = document.getElementById("pw");
  var pw2 = document.getElementById("pw2");
  var submit = document.getElementById("submit-btn");
  var errBox = document.getElementById("form-error");

  var CHECKS = {
    length: function (p) { return p.length >= 8 && p.length <= 32; },
    lowercase: function (p) { return /[a-z]/.test(p); },
    uppercase: function (p) { return /[A-Z]/.test(p); },
    number: function (p) { return /\d/.test(p); },
    special: function (p) { return /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(p); }
  };
  var LABELS = ["Weak", "Weak", "Fair", "Good", "Strong"];
  var COLORS = ["#c0392b", "#c0392b", "#e0a857", "#3e8e7e", "#4c9a6b"];
  // Identical to mobile-app/src/validation/resetPasswordSchema.ts
  var POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]).{8,32}$/;
  var POLICY_MSG = "Password must be 8-32 characters and include an uppercase letter, a lowercase letter, a number, and a special character";

  function strength(p) {
    var passed = 0;
    Object.keys(CHECKS).forEach(function (k) {
      var ok = CHECKS[k](p);
      if (ok) passed++;
      var li = document.querySelector('[data-check="' + k + '"]');
      if (li) li.classList.toggle("ok", ok);
    });
    return p.length === 0 ? 0 : Math.max(0, passed - 1);
  }

  function openInApp() {
    var url = (A.cfg.appScheme || "medveda://") + "reset-password" + (originalFragment ? "#" + originalFragment : "");
    location.href = url;
  }

  function wireToggles() {
    document.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var input = document.getElementById(b.getAttribute("data-toggle"));
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        b.textContent = show ? "Hide" : "Show";
        b.setAttribute("aria-pressed", show ? "true" : "false");
      });
    });
  }

  function fail(msg, allowInApp) {
    A.setText("error-msg", msg);
    var inApp = document.getElementById("error-inapp");
    if (inApp) inApp.classList.toggle("hidden", !allowInApp);
    A.show("state-error");
  }

  function forgetLink() {
    originalFragment = f.raw = "";
    f.accessToken = f.refreshToken = null;
  }

  function render(state) {
    phase = state.phase;
    submit.disabled = busy || phase !== "ready";
    if (phase === "mfa") {
      pw.value = pw2.value = "";
      factor.textContent = "";
      state.factors.forEach(function (f) {
        var option = document.createElement("option");
        option.value = f.id; option.textContent = f.label;
        factor.appendChild(option);
      });
      A.setText("mfa-error", "");
      A.show("state-mfa"); otp.focus();
    } else if (phase === "ready") {
      A.show("state-form"); pw.focus();
    } else if (phase === "cleanup") {
      pw.value = pw2.value = ""; forgetLink(); A.show("state-cleanup");
    } else if (phase === "done") {
      pw.value = pw2.value = otp.value = ""; forgetLink(); A.show("state-done");
    }
  }

  function showError(error) {
    var state = recovery.snapshot();
    phase = state.phase;
    if (phase === "cleanup") { render(state); A.setText("cleanup-error", error.message); return; }
    if (phase === "expired" || phase === "blocked") {
      pw.value = pw2.value = otp.value = ""; forgetLink();
      retry.classList.add("hidden"); fail(error.message, false); return;
    }
    if (phase === "mfa") {
      render(state); A.setText("mfa-error", error.message); return;
    }
    if (phase === "ready") { errBox.textContent = error.message; return; }
    fail(error.message, false); retry.classList.remove("hidden");
  }

  // A synchronous guard protects both UI clicks and programmatic submissions.
  async function run(work) {
    if (busy) return;
    busy = true;
    submit.disabled = mfaSubmit.disabled = retry.disabled = cleanupRetry.disabled = true;
    try { render(await work()); }
    catch (error) { showError(error); }
    finally {
      busy = false; otp.value = "";
      submit.disabled = phase !== "ready";
      mfaSubmit.disabled = retry.disabled = cleanupRetry.disabled = false;
      submit.textContent = "Change password";
    }
  }

  function start() {
    return run(async function () {
      A.show("state-loading"); retry.classList.add("hidden");
      var state = await recovery.start(f);
      f.accessToken = f.refreshToken = null; f.raw = "";
      return state;
    });
  }

  function init() {
    document.querySelectorAll("[data-open-app-with-token]").forEach(function (b) { b.addEventListener("click", openInApp); });
    if (f.error || f.errorCode) { forgetLink(); fail(A.friendlyError(f), false); return; }
    if (f.type !== "recovery" || !f.accessToken || !f.refreshToken) { forgetLink(); A.show("state-empty"); return; }
    client = A.newClient();
    if (!client || !window.MedVedaRecovery) { fail("We couldn't load the secure password form. Check your connection and request a new reset link.", false); return; }
    recovery = window.MedVedaRecovery.createRecoveryFlow(client.auth);
    start();
  }

  document.getElementById("mfa-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy || phase !== "mfa") return;
    var code = otp.value.trim();
    A.setText("mfa-error", "");
    run(function () { return recovery.verify(factor.value, code); });
  });
  retry.addEventListener("click", start);
  cleanupRetry.addEventListener("click", function () { run(function () { return recovery.retryCleanup(); }); });

  wireToggles();

  pw.addEventListener("input", function () {
    var s = strength(pw.value);
    var bar = document.getElementById("strength-bar");
    bar.style.width = (s / 4 * 100) + "%";
    bar.style.background = COLORS[s];
    document.getElementById("strength-label").textContent = pw.value ? "Strength: " + LABELS[s] : "";
  });
  strength("");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy || phase !== "ready") return;
    errBox.textContent = "";
    if (!pw.value) { errBox.textContent = "New password is required"; pw.focus(); return; }
    if (!POLICY.test(pw.value)) { errBox.textContent = POLICY_MSG; pw.focus(); return; }
    if (!pw2.value) { errBox.textContent = "Confirm your new password"; pw2.focus(); return; }
    if (pw.value !== pw2.value) { errBox.textContent = "Passwords do not match"; pw2.focus(); return; }

    submit.textContent = "Saving…";
    run(function () { return recovery.updatePassword(pw.value); });
  });

  init();
})();
