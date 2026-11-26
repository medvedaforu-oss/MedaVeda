(function () {
  'use strict';
  // Enhance only installation links; the App action remains a verified HTTPS
  // App Link, and both actions work without JavaScript. Reuse the native codec.
  document.querySelectorAll('[data-paper-install]').forEach(function (link) {
    var id = link.getAttribute('data-paper-install');
    if (!MedvedaPaperLinks.validPaperId(id)) return;
    function updateReferral() { link.href = MedvedaPaperLinks.paperPlayUrl(id, Date.now()); }
    updateReferral();
    link.addEventListener('click', updateReferral);
  });
})();
