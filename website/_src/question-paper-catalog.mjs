// Server-only orchestration. Public metadata is obtained exclusively from the
// fixed-projection RPC, never from the private table or the PDF signing service.
import { Buffer } from 'node:buffer';
import { render, SITE, PLAY, esc, icon } from './layout.mjs';
import { displayLabel, displaySubject, displayPaperNumber, displayCourse, academicContext } from './question-paper-display.mjs';

export const BASE = '/question-papers';
export const PAGE_SIZE = 48;
export const SITEMAP_SIZE = 1000;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FIELDS = ['id','title','course_id','course_name','course_order','year_id','year_title','year_order','subject_id','subject_title','subject_order','exam_year','exam_session','exam_month','paper_number','updated_at'];
const REQUIRED = ['id','course_id','course_name','year_id','year_title','subject_id','subject_title'];

export async function fetchCatalog(env = process.env, fetcher = fetch) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) throw new Error('Catalog configuration unavailable');
  // Fail closed if an operator accidentally supplies an elevated credential.
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* invalid */ }
  }
  if (!publicKey) throw new Error('A publishable or anon key is required');
  const response = await fetcher(url + '/rest/v1/rpc/question_paper_public_catalog', {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json',
      // Legacy anon JWTs require Authorization; publishable keys use apikey only.
      ...(!key.startsWith('sb_publishable_') ? { Authorization: 'Bearer ' + key } : {}) },
    body: '{}', cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Catalog request unavailable');
  // JSON aggregation is one database snapshot and is not silently capped by
  // PostgREST's table row limit. Bound memory, and fail rather than show partial data.
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024 * 1024) throw new Error('Catalog response exceeds safety limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  return validateCatalog(data);
}

export function validateCatalog(data) {
  if (!Array.isArray(data)) throw new Error('Invalid catalog response');
  const ids = new Set();
  return data.map(row => {
    if (!row || Object.keys(row).length !== FIELDS.length || Object.keys(row).some(k => !FIELDS.includes(k)) ||
      REQUIRED.some(k => typeof row[k] !== 'string' || !row[k].trim()) ||
      ['title','paper_number'].some(k => typeof row[k] !== 'string') ||
      !UUID.test(row.id) || ids.has(row.id) ||
      !Number.isInteger(row.exam_year) || row.exam_year < 1900 || row.exam_year > 9999 ||
      ['course_order','year_order','subject_order'].some(k => !Number.isInteger(row[k])) ||
      !(row.exam_session === null ? Number.isInteger(row.exam_month) && row.exam_month >= 1 && row.exam_month <= 12 :
        typeof row.exam_session === 'string' && row.exam_session.trim() && row.exam_month === null) ||
      typeof row.updated_at !== 'string' || !Number.isFinite(Date.parse(row.updated_at))) throw new Error('Invalid catalog metadata');
    ids.add(row.id);
    return Object.fromEntries(FIELDS.map(k => [k, row[k]]));
  });
}

export function slug(value) {
  // Preserve Unicode letters/marks (including Marathi), normalize punctuation.
  const normalized = value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return [...normalized].slice(0, 64).join('').replace(/-$/g, '') || 'item';
}
const identity = value => Buffer.from(value, 'utf8').toString('base64url');
const segment = (label, id) => encodeURIComponent(slug(label)) + '~' + identity(id);
export const sessionName = p => p.exam_session ?? MONTHS[p.exam_month - 1];
const sessionId = p => p.exam_session === null ? 'month:' + p.exam_month : 'session:' + p.exam_session;
export const paperTitle = p => p.title || [p.subject_title, p.paper_number ? 'Paper ' + p.paper_number.toUpperCase() : 'Question Paper'].join(' ');
export function paths(p) {
  const course = BASE + '/' + segment(p.course_name, p.course_id);
  const year = course + '/' + segment(p.year_title, p.year_id);
  const subject = year + '/' + segment(p.subject_title, p.subject_id);
  const exam = subject + '/' + p.exam_year;
  const session = exam + '/' + segment(sessionName(p), sessionId(p));
  return [BASE, course, year, subject, exam, session, session + '/' + encodeURIComponent(slug(paperTitle(p))) + '~' + p.id];
}
const compare = (a,b) => a.localeCompare(b, 'en', { numeric: true });
const paperCompare = (a,b) => b.exam_year - a.exam_year || compare(sessionName(a),sessionName(b)) || compare(a.paper_number,b.paper_number) || compare(paperTitle(a),paperTitle(b)) || compare(a.id,b.id);

// Paths and group keys retain exact database identities; equal display labels,
// punctuation, case, Unicode, and different media/course variants never merge.
export function createCatalog(rows) {
  const groups = new Map();
  const papers = new Map();
  for (const p of rows) {
    const chain = paths(p);
    const labels = ['Question Papers',p.course_name,p.year_title,p.subject_title,String(p.exam_year),sessionName(p),paperTitle(p)];
    for (let level = 0; level < chain.length; level++) {
      let node = groups.get(chain[level]);
      if (!node) {
        node = { path: chain[level], level, label: labels[level], sample: p, rows: [], children: new Map(),
          crumbs: chain.slice(0,level+1).flatMap((path,i) => i === 4 && level >= 5 ? [] : [{ path,
            label: i === 3 ? displaySubject(labels[i]) : i === 5 ? examination(p) : i === 6 ? 'Paper Details' : displayLabel(labels[i]) }]) };
        groups.set(node.path,node);
      }
      node.rows.push(p);
      if (level > 0) groups.get(chain[level-1]).children.set(node.path,node);
    }
    papers.set(p.id,groups.get(chain[6]));
  }
  return { groups, papers, rows };
}

const anchor = (path,label,cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(path)}">${esc(label)}</a>`;
function context(node) {
  const p = node.sample;
  return [p.course_name, ...(node.level >= 2 ? [p.year_title] : []), ...(node.level >= 3 ? [p.subject_title] : []),
    ...(node.level >= 5 ? [sessionName(p)] : []), ...(node.level >= 4 ? [String(p.exam_year)] : [])].join(' · ');
}
function baseMetadata(node) {
  if (node.level === 0) return { title: 'Previous Year Question Papers', description: 'Browse published Question Papers by course, academic year, subject and examination session. Access papers on the MedVeda Android app.' };
  const p = node.sample;
  const label = context(node);
  if (node.level === 6) {
    const number = p.paper_number ? ` · Paper ${p.paper_number.toUpperCase()}` : '';
    // Stable identity also disambiguates otherwise identical public titles.
    return { title: `${paperTitle(p)} · ${label}${number}`,
      description: `Find ${paperTitle(p)} (${label}${number}). Access this published Question Paper on the MedVeda Android app.` };
  }
  const next = ['','academic year','subject','examination session','session','paper'][node.level];
  return { title: `${label} Question Papers`, description: `Browse ${label} Question Papers by ${next}. View available published papers and access them on the MedVeda Android app.` };
}
function metadata(node, catalog) {
  const meta = baseMetadata(node);
  const duplicates = [...catalog.groups.values()].filter(other => other.level === node.level && baseMetadata(other).title === meta.title);
  if (duplicates.length > 1) {
    const p = node.sample;
    const reference = [p.course_id,p.year_id,p.subject_id,String(p.exam_year),sessionId(p),p.id].slice(0,node.level).join(' / ');
    meta.title += ` · ${reference}`;
    meta.description += ` Catalog reference: ${reference}.`;
  }
  return meta;
}
function sortedChildren(node) {
  // Keep the stored hierarchy/URLs, but skip examination-year pages in browsing.
  const children = node.level === 3 ? [...node.children.values()].flatMap(year => [...year.children.values()]) : [...node.children.values()];
  const sessionOrder = p => p.exam_session === 'Winter' ? 12 : p.exam_session === 'Summer' ? 6 : p.exam_month ?? 0;
  return children.sort((a,b) => [3,4].includes(node.level) ? b.sample.exam_year-a.sample.exam_year || sessionOrder(b.sample)-sessionOrder(a.sample) || Number(a.sample.exam_session === null)-Number(b.sample.exam_session === null) || compare(a.label,b.label) || compare(a.path,b.path) :
    node.level === 5 ? paperCompare(a.sample,b.sample) :
    (node.level === 0 ? a.sample.course_order-b.sample.course_order : node.level === 1 ? a.sample.year_order-b.sample.year_order :
      node.level === 2 ? a.sample.subject_order-b.sample.subject_order : 0) || compare(a.label,b.label) || compare(a.path,b.path));
}
const publishedCount = count => `${count} published ${count === 1 ? 'paper' : 'papers'}`;
const examination = p => `${displayLabel(sessionName(p))}-${p.exam_year}`;
// A sole paper needs no selection screen. The existing session URL stays valid
// for shared links and the clickable session breadcrumb, including as papers grow.
const navigationPath = node => node.level === 5 && node.rows.length === 1 ? paths(node.sample)[6] : node.path;
const chevron = '<svg class="qp-chevron" width="18" height="18" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
function navigationLabel(node) {
  if (node.level === 3) return displaySubject(node.sample.subject_title);
  if (node.level === 6) return displaySubject(paperTitle(node.sample));
  if (node.level === 5) return examination(node.sample);
  return displayLabel(node.label);
}
function pageHeading(node) {
  const p = node.sample;
  const course = displayCourse(p.course_name);
  const year = displayLabel(p.year_title);
  const subject = displaySubject(p.subject_title);
  const medium = course.medium ? `${course.medium} Medium` : '';
  const academicTitle = year.toLowerCase().startsWith(course.name.toLowerCase() + ' ') ? year : `${course.name} ${year}`;
  switch (node.level) {
    case 0: return { title:'Question Papers', supporting:['Browse by course, academic year, subject and examination session.'] };
    case 1: return { title:`${course.name} Question Papers`, supporting:[[medium,'Select your academic year.'].filter(Boolean).join(' · ')] };
    case 2: return { title:`${academicTitle} Question Papers`, supporting:[medium].filter(Boolean) };
    case 3: return { title:subject, supporting:[academicContext(p)] };
    case 4: return { title:subject, supporting:[academicContext(p),`Examination year ${p.exam_year}`] };
    case 5: return { title:`${examination(p)} Question Papers`, supporting:[academicContext(p),subject] };
    case 6: return { title:displaySubject(paperTitle(p)), supporting:[academicContext(p),[examination(p),displayPaperNumber(p.paper_number)].filter(Boolean).join(' · ')] };
  }
}
function card(node, heading = 3) {
  const p = node.sample;
  const sub = node.level === 6 ? [examination(p), displayPaperNumber(p.paper_number)].filter(Boolean).join(' · ') : '';
  const symbol = ['','layers','book','book','clock','clock','file'][node.level];
  return `<li><a class="card qp-card" href="${esc(navigationPath(node))}"><span class="icon">${icon(symbol)}</span><div class="qp-card-copy"><h${heading}>${esc(navigationLabel(node))}</h${heading}>${sub ? `<p class="meta">${esc(sub)}</p>` : ''}<span class="qp-card-count">${node.level === 6 ? 'Available in MedVeda app' : esc(publishedCount(node.rows.length))}</span></div>${chevron}</a></li>`;
}

function breadcrumbs(crumbs) {
  return `<nav class="qp-breadcrumbs" aria-label="Breadcrumb"><ol><li>${anchor('/','Home')}</li>${crumbs.map((c,i) => {
    const label = c.label;
    return `<li>${i === crumbs.length-1 ? `<span aria-current="page">${esc(label)}</span>` : anchor(c.path,label)}</li>`;
  }).join('')}</ol></nav>`;
}
function jsonLd(node, meta, canonical, items) {
  const url = SITE + canonical;
  const breadcrumb = { '@type':'BreadcrumbList', '@id':url+'#breadcrumb', itemListElement:[{path:'/',label:'Home'},...node.crumbs].map((c,i) => ({'@type':'ListItem',position:i+1,name:c.label,item:SITE+c.path})) };
  const page = { '@type':node.level === 6 ? 'WebPage' : 'CollectionPage', '@id':url+'#webpage',url,name:meta.title+' | MedVeda',description:meta.description,
    breadcrumb:{'@id':url+'#breadcrumb'} };
  const graph = [page,breadcrumb];
  if (items.length) {
    graph.push({ '@type':'ItemList','@id':url+'#list', itemListElement:items.map((n,i) => ({'@type':'ListItem',position:i+1,name:navigationLabel(n),url:SITE+navigationPath(n)})) });
    page.mainEntity = {'@id':url+'#list'};
  }
  return {'@context':'https://schema.org','@graph':graph};
}
function pagination(node,page,pages) {
  if (pages <= 1) return '';
  return `<nav class="qp-pagination" aria-label="Results pages">${page > 1 ? anchor(node.path + (page === 2 ? '' : '?page='+(page-1)),'Previous page','btn ghost') : ''}<span>Page ${page} of ${pages}</span>${page < pages ? anchor(node.path+'?page='+(page+1),'Next page','btn ghost') : ''}</nav>`;
}

export function renderNode(node, catalog, page = 1) {
  const meta = metadata(node, catalog);
  const p = node.sample;
  let body, items = [];
  const canonical = node.path + (page > 1 ? '?page='+page : '');
  if (node.level === 6) {
    if (page !== 1) return null;
    const share = SITE + '/question-paper/' + p.id;
    // Use the verified HTTPS App Link. No installation probing/redirect timer.
    const course = displayCourse(p.course_name);
    const details = [['Course',course.name],...(course.medium ? [['Medium',course.medium]] : []),['Academic year',displayLabel(p.year_title)],['Subject',displaySubject(p.subject_title)],['Examination year',p.exam_year],['Examination session',displayLabel(sessionName(p))],...(p.paper_number ? [['Paper number',displayPaperNumber(p.paper_number).replace(/^Paper /,'')]] : [])];
    items = catalog.groups.get(paths(p)[5]).rows.filter(row => row.id !== p.id).sort(paperCompare).slice(0,6).map(row => catalog.papers.get(row.id));
    if (!items.length) items = catalog.groups.get(paths(p)[3]).rows.filter(row => row.id !== p.id).sort(paperCompare).slice(0,6).map(row => catalog.papers.get(row.id));
    body = `<div class="qp-detail"><section class="card"><h2>Question Paper details</h2><dl class="qp-facts">${details.map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
<section class="card qp-availability"><span class="icon">${icon('phone')}</span><h2>Access on MedVeda</h2>
<p>This question paper is available on the MedVeda app.</p><div class="btn-row">${anchor(share,'Open in MedVeda App','btn')}<a class="btn ghost" data-paper-install="${p.id}" href="${PLAY.replace(/&/g,'&amp;')}" aria-label="Download MedVeda App from the official Google Play Store">Download MedVeda App</a></div>
<p class="meta">Sign in to MedVeda to access this question paper. If the paper does not open automatically, tap Open in MedVeda App again.</p></section></div>
${items.length ? `<section class="qp-related"><h2>Related Question Papers</h2><ul class="qp-grid">${items.map(n => card(n)).join('')}</ul></section>` : ''}
<p class="qp-back">${anchor(paths(p)[3],`Browse all ${displaySubject(p.subject_title)} papers`)}</p>`;
  } else {
    const all = sortedChildren(node);
    const pages = Math.ceil(all.length/PAGE_SIZE);
    if (page > pages || page < 1) return null;
    items = all.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
    const heading = ['Browse courses','Academic years','Subjects','Examination Sessions','Examination Sessions','Available Question Papers'][node.level];
    // Main catalog exposes compact academic year cards, grouped by actual course.
    if (node.level === 0) {
      body = `<h2>${heading}</h2>${items.map(course => `<section class="qp-course"><a class="qp-course-link" href="${esc(course.path)}"><span class="icon">${icon('layers')}</span><div class="qp-card-copy"><h3>${esc(displayLabel(course.label))}</h3><span class="qp-card-count">${esc(publishedCount(course.rows.length))}</span></div>${chevron}</a><ul class="qp-grid qp-compact">${sortedChildren(course).slice(0,PAGE_SIZE).map(n => card(n,4)).join('')}</ul>${course.children.size > PAGE_SIZE ? `<p>${anchor(course.path,'View all academic years')}</p>` : ''}</section>`).join('')}`;
    } else body = `<div class="qp-results-head"><h2>${heading}</h2><span class="meta">${esc(publishedCount(node.rows.length))}</span></div><ul class="qp-grid${[1,3,4,5].includes(node.level) ? ' qp-compact' : ''}">${items.map(n => card(n)).join('')}</ul>`;
    body += pagination(node,page,pages);
  }
  const { title, supporting } = pageHeading(node);
  const html = render({ path:canonical, title:meta.title+(page > 1 ? ` · Page ${page}` : ''), description:meta.description,
    noindex:page > 1, jsonld:[jsonLd(node,meta,canonical,items)],
    scripts:node.level === 6 ? ['/assets/js/question-paper-links.js','/assets/js/question-paper-catalog.js'] : [] },
    `<section class="section qp-section"><div class="wrap">${breadcrumbs(node.crumbs)}<div class="section-head qp-heading${node.level === 6 ? ' qp-paper-heading' : ''}">${node.level === 6 ? `<span class="icon">${icon('file')}</span>` : ''}<div><span class="eyebrow">${node.level === 0 ? 'MedVeda study resources' : node.level === 6 ? 'Question Paper' : 'Question Papers'}</span><h1>${esc(title)}</h1>${supporting.map((text,i) => `<p class="${i === 0 ? 'lead' : 'meta qp-exam'}">${esc(text)}</p>`).join('')}</div></div>${body}</div></section>`, false);
  // Paginated pages stay crawlable and link onward; only useful first pages index.
  return html.replace('content="noindex, nofollow"','content="noindex, follow"');
}

export function statusPage(status) {
  const title = status === 503 ? 'Question Papers temporarily unavailable' : status === 404 ? 'Question Paper page not found' : 'No published Question Papers yet';
  const description = status === 503 ? 'We could not load the Question Papers catalog. Please try again shortly.' : status === 404 ? 'This Question Paper or category is unavailable. Browse the current published catalog.' : 'Published Question Papers will appear here, organised by course, academic year, subject and examination session.';
  return render({ path:BASE,title,description,noindex:true },`<section class="section qp-section"><div class="wrap">${breadcrumbs([{path:BASE,label:'Question Papers'}])}<div class="card qp-status"><span class="icon">${icon(status === 404 ? 'search' : status === 503 ? 'info' : 'file')}</span><h1>${title}</h1><p${status === 503 ? ' role="alert"' : ''}>${description}</p><div class="btn-row">${anchor(BASE,status === 503 ? 'Try again' : 'Browse Question Papers','btn')}${anchor('/','MedVeda home','btn ghost')}</div></div></div></section>`,false);
}

export function sitemapEntries(catalog) {
  return [...catalog.groups.values()].sort((a,b) => compare(a.path,b.path)).map(node => ({path:node.path,...(node.level === 6 ? { lastmod:new Date(node.sample.updated_at).toISOString() } : {})}));
}
export function sitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(e => `<url><loc>${esc(SITE+e.path)}</loc>${e.lastmod ? `<lastmod>${esc(e.lastmod)}</lastmod>` : ''}</url>`).join('')}</urlset>\n`;
}
export function sitemapIndex(count) {
  const children = ['/sitemaps/static.xml',...Array.from({length:Math.ceil(count/SITEMAP_SIZE)},(_,i) => `/sitemaps/question-papers-${i+1}.xml`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${children.map(path => `<sitemap><loc>${SITE+path}</loc></sitemap>`).join('')}</sitemapindex>\n`;
}

export function resolveNode(path,catalog) {
  const exact = catalog.groups.get(path);
  if (exact) return exact;
  // Paper identity survives title, subject, course and examination edits. Old
  // valid hierarchy paths resolve to a fresh canonical URL by UUID, never PDF.
  const id = path.split('/').at(-1)?.match(/~([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/)?.[1];
  if (id && path.split('/').length === 8) return catalog.papers.get(id);
  // Category renames resolve by the complete, exact ancestor identity chain.
  const identityPath = value => value.split('/').map((s,i) => i < 2 || /^\d{4}$/.test(s) ? s : s.slice(s.lastIndexOf('~'))).join('/');
  const identityKey = identityPath(path);
  return [...catalog.groups.values()].find(node => node.level < 6 && identityPath(node.path) === identityKey);
}
