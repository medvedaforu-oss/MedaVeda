(function () {
  var A = window.MedVedaAuth;
  var f = A.readFragment();

  if (f.error || f.errorCode) {
    A.setText("error-msg", A.friendlyError(f));
    A.show("state-error");
    return;
  }
  if ((f.type === "signup" || f.type === "email_change" || f.type === "magiclink") && f.accessToken) {
    var client = A.newClient();
    var token = f.accessToken;
    A.show("state-loading");
    function failed() {
      A.setText("error-msg", "We couldn't verify this link. Request a new one from the app and try again.");
      A.show("state-error");
    }
    if (!client) { failed(); return; }
    client.auth.getUser(token).then(function (res) {
      var user = res && res.data && res.data.user;
      if (!res || res.error || !user || !user.email_confirmed_at) { failed(); return; }
      if (user.email) A.setText("verified-email", user.email);
      A.show("state-success");
    }).catch(failed);
    token = null;
    return;
  }
  A.show("state-empty");
})();
