import staticPaths from '../_src/static-sitemap.json' with { type: 'json' };
import { BASE, SITEMAP_SIZE, fetchCatalog, createCatalog, renderNode, statusPage,
  sitemapEntries, sitemapXml, sitemapIndex, resolveNode } from '../_src/question-paper-catalog.mjs';

// Every request reads one current database snapshot. Deliberately no in-process,
// browser, or CDN content cache: an unpublish must take effect on the next request.
export function createHandler(load = fetchCatalog) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('CDN-Cache-Control','no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const reply = (status,body) => { res.statusCode=status; return res.end(req.method === 'HEAD' ? '' : body); };
    const missing = () => { res.setHeader('Content-Type','text/html; charset=utf-8'); res.setHeader('X-Robots-Tag','noindex, follow'); return reply(404,statusPage(404)); };
    if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return reply(405,'Method not allowed'); }
    try {
      const url = new URL(req.url,'https://www.medveda.in');
      // Route is set by the Vercel rewrite. Ignore it on ordinary public paths;
      // strip all unrelated query parameters through canonical redirects.
      const direct = url.pathname.startsWith('/api/');
      const route = direct ? req.query?.route : url.pathname;
      if (typeof route !== 'string' || route.length > 4096 || !route.startsWith('/')) return missing();
      // Normalize URI escaping without turning encoded slashes into separators.
      const path = route.split('/').map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
      const xml = path === '/sitemap.xml' || /^\/sitemaps\/(?:static|question-papers-[1-9]\d*)\.xml$/.test(path);
      if (!xml && path !== BASE && !path.startsWith(BASE+'/')) return missing();
      const redirect = destination => {
        // Temporary redirects must not cache publication state or old slugs.
        res.setHeader('Location',destination); return reply(307,'');
      };
      if (xml) {
        res.setHeader('Content-Type','application/xml; charset=utf-8');
        if (path === '/sitemaps/static.xml') return reply(200,sitemapXml(staticPaths.map(path => ({path}))));
        const catalog = createCatalog(await load());
        const entries = sitemapEntries(catalog);
        if (path === '/sitemap.xml') return reply(200,sitemapIndex(entries.length));
        const part = Number(path.match(/question-papers-([1-9]\d*)\.xml$/)?.[1]);
        const start = (part-1)*SITEMAP_SIZE;
        if (!Number.isSafeInteger(part) || start >= entries.length) return missing();
        return reply(200,sitemapXml(entries.slice(start,start+SITEMAP_SIZE)));
      }
      const query = new URLSearchParams(url.search);
      if (direct) query.delete('route');
      const rawPage = query.get('page');
      if (query.getAll('page').length > 1 || (rawPage !== null && !/^[1-9]\d*$/.test(rawPage))) return missing();
      const page = rawPage === null ? 1 : Number(rawPage);
      if (!Number.isSafeInteger(page)) return missing();
      const catalog = createCatalog(await load());
      if (path === BASE && !catalog.rows.length) {
        if (page !== 1) return missing();
        res.setHeader('X-Robots-Tag','noindex, follow'); return reply(200,statusPage(200));
      }
      const node = resolveNode(path,catalog);
      if (!node) return missing();
      const html = renderNode(node,catalog,page);
      if (!html) return missing();
      const canonical = node.path+(page > 1 ? '?page='+page : '');
      const actual = (direct ? path : url.pathname)+(query.size ? '?'+query.toString() : '');
      if (canonical !== actual) return redirect(canonical);
      if (page > 1) res.setHeader('X-Robots-Tag','noindex, follow');
      return reply(200,html);
    } catch (error) {
      if (error instanceof URIError) return missing();
      // No upstream payload, credentials, private record, or stack is returned.
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag','noindex, follow'); res.setHeader('Retry-After','60');
      return reply(503,statusPage(503));
    }
  };
}
export default createHandler();
