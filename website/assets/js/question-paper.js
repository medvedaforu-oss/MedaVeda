(function () {
  'use strict';
  var PLAY = 'https://play.google.com/store/apps/details?id=in.medveda.app';
  var match = /^\/question-paper\/([^/]+)$/.exec(window.location.pathname);
  var intent = match ? MedvedaPaperLinks.parsePaperLink('https://www.medveda.in/question-paper/' + match[1]) : null;
  var open = document.getElementById('paper-open');
  if (!intent || !intent.id) {
    document.getElementById('paper-message').textContent = 'This Question Paper link is invalid. Ask the sender to share it again. You can still download MedVeda below.';
    return;
  }
  // An explicit action only. No installation probing, timed redirects or browser loops.
  if (/Android/i.test(window.navigator.userAgent)) {
    open.href = 'medveda://question-paper/' + intent.id;
    open.classList.remove('hidden');
    open.hidden = false;
  }
  document.querySelectorAll('a[href="' + PLAY + '"]').forEach(function (link) {
    function updateReferral() { link.href = MedvedaPaperLinks.paperPlayUrl(intent.id, Date.now()); }
    updateReferral();
    link.addEventListener('click', updateReferral);
  });
})();
