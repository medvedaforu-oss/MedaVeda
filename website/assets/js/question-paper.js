(function () {
  'use strict';
  var PLAY = 'https://play.google.com/store/apps/details?id=in.medveda.app';
  var match = /^\/(question-paper|note|quiz)\/([^/]+)$/.exec(window.location.pathname);
  var intent = match ? MedvedaPaperLinks.parseContentLink('https://www.medveda.in/' + match[1] + '/' + match[2]) : null;
  var open = document.getElementById('paper-open');
  if (!intent || !intent.id) {
    document.getElementById('paper-message').textContent = 'This content link is invalid. Ask the sender to share it again. You can still download MedVeda below.';
    return;
  }
  // An explicit action only. No installation probing, timed redirects or browser loops.
  if (/Android/i.test(window.navigator.userAgent)) {
    open.href = 'medveda://' + intent.type + '/' + intent.id;
    open.classList.remove('hidden');
    open.hidden = false;
  }
  document.querySelectorAll('a[href="' + PLAY + '"]').forEach(function (link) {
    function updateReferral() { link.href = MedvedaPaperLinks.contentPlayUrl(intent.type, intent.id, Date.now()); }
    updateReferral();
    link.addEventListener('click', updateReferral);
  });
})();
