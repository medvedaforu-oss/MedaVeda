// Shared by the native app and the generated static website. Contains no credentials or access grants.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MedvedaPaperLinks = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ORIGIN = 'https://www.medveda.in';
  const PLAY = 'https://play.google.com/store/apps/details?id=in.medveda.app';
  const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const WEEK = 7 * 86400000;
  function validPaperId(id) { return typeof id === 'string' && UUID.test(id); }
  function paperShareUrl(id) {
    if (!validPaperId(id)) throw new Error('Invalid Question Paper link.');
    return ORIGIN + '/question-paper/' + id.toLowerCase();
  }
  function paperShareMessage(id, title) {
    const label = typeof title === 'string' ? title.replace(/[\r\n\u0000-\u001f]/g, ' ').trim().slice(0, 180) : '';
    return 'Study ' + (label || 'this Question Paper') + ' on MedVeda.\n\nOpen in MedVeda:\n' + paperShareUrl(id);
  }
  function parsePaperLink(url) {
    if (typeof url !== 'string') return null;
    const prefix = url.startsWith(ORIGIN + '/question-paper/') ? ORIGIN + '/question-paper/' :
      url.startsWith('medveda://question-paper/') ? 'medveda://question-paper/' : null;
    if (!prefix) return null;
    const id = url.slice(prefix.length);
    return validPaperId(id) ? { id: id.toLowerCase() } : { invalid: true };
  }
  function paperPlayUrl(id, now = Date.now()) {
    paperShareUrl(id);
    if (!Number.isSafeInteger(now) || now <= 0) throw new Error('Invalid referral time.');
    const referral = new URLSearchParams({ mv_qp: 'v1:' + id.toLowerCase() + ':' + Math.floor(now / 1000) });
    return PLAY + '&referrer=' + encodeURIComponent(referral.toString());
  }
  function parsePaperReferrer(raw, now, installedAt) {
    if (typeof raw !== 'string' || raw.length > 4096 || !Number.isFinite(now) || !Number.isFinite(installedAt)) return null;
    if (installedAt <= 0 || installedAt > now + 300000 || now - installedAt > WEEK) return null;
    const params = new URLSearchParams(raw);
    if (params.getAll('mv_qp').length !== 1) return null;
    const value = params.get('mv_qp');
    const match = /^v1:([0-9a-f-]{36}):([0-9]{10})$/i.exec(value || '');
    if (!match || !validPaperId(match[1])) return null;
    const clickedAt = Number(match[2]) * 1000;
    if (clickedAt > now + 300000 || clickedAt > installedAt + 300000 || now - clickedAt > WEEK || installedAt - clickedAt > WEEK) return null;
    return { id: match[1].toLowerCase() };
  }
  return { validPaperId, paperShareUrl, paperShareMessage, parsePaperLink, paperPlayUrl, parsePaperReferrer };
});
