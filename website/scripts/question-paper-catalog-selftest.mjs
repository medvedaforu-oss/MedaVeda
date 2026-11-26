import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHandler } from '../api/question-papers.mjs';
import { BASE, PAGE_SIZE, SITEMAP_SIZE, validateCatalog, fetchCatalog, paths, slug, createCatalog, renderNode, sitemapEntries, sitemapXml, sitemapIndex } from '../_src/question-paper-catalog.mjs';
import { displayLabel, displaySubject, displayPaperNumber, displayCourse, academicContext } from '../_src/question-paper-display.mjs';
const require = createRequire(import.meta.url);
const codec = require('../assets/js/question-paper-links.js');
const SITE = 'https://www.medveda.in';
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const fixture = (n, changes = {}) => ({ id:id(n), title:'Fixture Anatomy Paper', course_id:'fixture-course',course_name:'Fixture course',course_order:1,
  year_id:'fixture-year',year_title:'Fixture year',year_order:1,subject_id:'fixture-subject',subject_title:'Fixture Anatomy',subject_order:1,
  exam_year:2023,exam_session:'Summer',exam_month:null,paper_number:'1',updated_at:'2026-11-26T00:00:00Z',...changes });
const rows = [fixture(1),fixture(2,{exam_session:'Winter'}),fixture(3,{exam_year:2025}),
  fixture(4,{course_id:'fixture-marathi',course_name:'Fixture Marathi',year_id:'fixture-year-m',subject_id:'fixture-subject-m',title:'शरीर रचना प्रश्नपत्रिका'}),
  fixture(5,{exam_session:null,exam_month:6,title:''}),fixture(6),fixture(7,{subject_id:'fixture-subject-2'})];
validateCatalog(rows);
const catalog = createCatalog(rows);
const canonical = paths(rows[0])[6];
const attr = (html, key) => html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`))?.[1];
const ld = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]))[0];
let current = rows;
let calls = 0;
const handler = createHandler(async () => { calls++; return current; });
async function request(url, method = 'GET', selected = handler, query = {}) {
  const headers = {};
  const res = { statusCode:200, setHeader(k,v) { headers[k.toLowerCase()] = v; }, end(body) { this.body=body; } };
  await selected({url,method,query},res);
  assert.equal(headers['cache-control'],'no-store');
  assert.equal(headers['vercel-cdn-cache-control'],'no-store');
  assert.equal(headers['cdn-cache-control'],'no-store');
  return {status:res.statusCode,html:res.body,headers};
}
for (const [path,node] of catalog.groups) {
  const response = await request(path);
  assert.equal(response.status,200,path);
  const html = response.html;
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
  assert(html.includes(`rel="canonical" href="${SITE+path}"`));
  assert.equal(attr(html,'og:url'),SITE+path);
  assert.equal(attr(html,'og:title'),html.match(/<title>(.*?)<\/title>/s)[1]);
  assert.equal(attr(html,'twitter:description'),attr(html,'description'));
  assert(html.includes('href="/question-papers"'));
  assert(!/object_path|signedUrl|storage\/v1|service_role|validation_receipt|<iframe|<object/.test(html));
  const graph = ld(html)['@graph'];
  assert.equal(graph[0]['@type'],node.level === 6 ? 'WebPage' : 'CollectionPage');
  const crumbs = graph.find(n => n['@type'] === 'BreadcrumbList').itemListElement;
  assert.equal(crumbs.length,node.level+2-(node.level >= 5 ? 1 : 0));
  crumbs.forEach((c,i) => { assert.equal(c.position,i+1); assert(c.item.startsWith(SITE+'/')); });
  const visibleCrumbs = [...html.match(/<nav class="qp-breadcrumbs"[\s\S]*?<\/nav>/)[0].matchAll(/<(?:a|span)\b[^>]*>([^<]*)<\/(?:a|span)>/g)].map(m=>m[1]);
  assert.deepEqual(visibleCrumbs,crumbs.map(c=>c.name),'visible and structured breadcrumbs match');
  if (node.level >= 5) {
    assert.equal(crumbs.at(node.level === 6 ? -2 : -1).name,`${node.sample.exam_session ?? 'June'}-${node.sample.exam_year}`);
    assert(!crumbs.some(c=>c.item === SITE+paths(node.sample)[4]),'no separate examination year crumb');
  }
  const main = html.match(/<main id="main">([\s\S]*?)<\/main>/)[1];
  let previous = 0;
  for (const [,level] of main.matchAll(/<h([1-6])\b/g)) { assert(Number(level) <= previous+1); previous=Number(level); }
  if (node.level === 6) {
    assert(html.includes('Sign in to MedVeda to access this question paper.'));
    assert(html.includes(`href="${SITE}/question-paper/${node.sample.id}"`));
    assert(html.includes('https://play.google.com/store/apps/details?id=in.medveda.app'));
  }
}
assert(paths(rows[0])[6] !== paths(rows[5])[6], 'identical titles must retain unique identity');
assert.notEqual(attr(renderNode(catalog.papers.get(rows[0].id),catalog),'og:title'),attr(renderNode(catalog.papers.get(rows[5].id),catalog),'og:title'));
assert.notEqual(attr(renderNode(catalog.groups.get(paths(rows[0])[3]),catalog),'og:title'),attr(renderNode(catalog.groups.get(paths(rows[6])[3]),catalog),'og:title'));
const examPage = (await request(paths(rows[0])[3])).html;
const sessionCards = [...examPage.matchAll(/class="card qp-card" href="([^"]+)"[\s\S]*?<h3>(.*?)<\/h3>/g)].map(m=>({path:m[1],label:m[2]}));
assert.deepEqual(sessionCards.map(c=>c.label),['Summer-2025','Winter-2023','Summer-2023','June-2023']);
assert.equal(sessionCards[0].path,paths(rows[2])[6],'single-paper session opens details');
assert.equal(sessionCards[2].path,paths(rows[0])[5],'multiple-paper session opens existing list');
assert.equal((await request(sessionCards[2].path)).html.match(/class="card qp-card"/g).length,2,'session lists only its published papers');
assert.equal(new Set(sessionCards.map(c=>c.label)).size,sessionCards.length,'session cards are unique');
assert(!examPage.includes('>Examination Years</h2>'));
const listed = ld(examPage)['@graph'].find(n=>n['@type'] === 'ItemList').itemListElement;
assert.deepEqual(listed.map(n=>({path:new URL(n.url).pathname,label:n.name})),sessionCards,'structured list matches session cards and destinations');
assert.equal((await request(paths(rows[0])[4])).status,200,'existing examination-year URL remains functional');
assert.equal((await request(paths(rows[2])[5])).status,200,'existing single-paper session URL remains functional');
const winter2025 = fixture(10,{exam_year:2025,exam_session:'Winter'});
current = [...rows,winter2025];
const publishedSubject = (await request(paths(rows[0])[3])).html;
assert(publishedSubject.indexOf('>Winter-2025</h3>') < publishedSubject.indexOf('>Summer-2025</h3>'),'new publication appears newest first, Winter before Summer');
assert(publishedSubject.includes(`href="${paths(winter2025)[6]}"`));
current = [...rows,fixture(11,{exam_year:2025})];
assert((await request(paths(rows[0])[3])).html.includes(`href="${paths(rows[2])[5]}"`),'single to multiple publication updates card destination without build');
current = rows.filter(p=>p.id !== rows[5].id);
assert((await request(paths(rows[0])[3])).html.includes(`href="${paths(rows[0])[6]}"`),'unpublishing duplicate immediately restores direct paper navigation');
current = rows;
const marathi = (await request(paths(rows[3])[6])).html;
assert(marathi.includes('शरीर रचना प्रश्नपत्रिका'));
assert(slug('शरीर रचना').includes('शरीर'));
assert((await request(paths(rows[4])[5])).html.includes('June'));
assert(!paths(rows[4])[5].includes('summer'));
for (const url of [BASE+'/missing',canonical+'?page=2',canonical+'?page=0',canonical+'?page=1&page=2',BASE+'/%ZZ',BASE+'?page=99999999999999999']) assert.equal((await request(url)).status,404,url);
assert.equal((await request(canonical,'HEAD')).html,'');
assert.equal((await request(canonical,'POST')).status,405);
assert.equal((await request(canonical+'?utm_source=fixture')).headers.location,canonical);
assert.equal((await request(canonical+'?page=1')).headers.location,canonical);
const rewritten = await request('/api/question-papers?route='+encodeURIComponent(canonical), 'GET', handler, { route:canonical });
assert.equal(rewritten.status,200,'Vercel rewritten request');
for (const path of [BASE,canonical]) {
  const internal = new URLSearchParams({route:path});
  if (path !== BASE) internal.set('path',decodeURIComponent(path.slice(BASE.length+1)));
  const rewrittenPublic = await request(path+'?'+internal,'GET',handler,Object.fromEntries(internal));
  assert.equal(rewrittenPublic.status,200,'Vercel public pathname with injected route must not redirect to itself');
  const withTracking = await request(path+'?'+internal+'&utm_source=fixture','GET',handler,Object.fromEntries(internal));
  assert.equal(withTracking.status,307);
  assert.equal(withTracking.headers.location,path,'only public query parameters affect canonical redirects');
}
assert.equal((await request('/api/question-papers?route='+encodeURIComponent(paths(rows[3])[6]),'GET',handler,{route:decodeURI(paths(rows[3])[6])})).status,200,'Unicode rewrite must not loop');

// Complete lifecycle across fresh requests, without a build or invalidation hook.
const original = current;
current = rows.filter(p => p.id !== rows[0].id);
assert.equal((await request(canonical)).status,404,'unpublished/deleted paper');
assert(!(await request('/sitemaps/question-papers-1.xml')).html.includes(rows[0].id));
current = original.map(p => p.id === rows[0].id ? {...p,title:'Fixture revised title',subject_title:'Fixture renamed subject',exam_year:2026,exam_session:'Winter',updated_at:'2026-11-26T01:00:00Z'} : p);
const renamed = paths(current[0])[6];
const oldResponse = await request(canonical);
assert.equal(oldResponse.status,307); assert.equal(oldResponse.headers.location,renamed);
assert((await request(renamed)).html.includes('Fixture revised title'));
assert.equal((await request(paths(rows[0])[3])).status,200,'old category remains for other published papers');
const oldCourse = paths(current[0])[1];
current = current.map(p => ({...p,course_name:p.course_id === 'fixture-course' ? 'Fixture renamed course' : p.course_name}));
assert.equal((await request(oldCourse)).status,307,'renamed category canonicalizes by identity');
current = [];
assert.equal((await request(renamed)).status,404);
const empty = await request(BASE); assert.equal(empty.status,200); assert.match(empty.html,/No published/); assert.match(empty.headers['x-robots-tag'],/noindex/);
assert(!(await request('/sitemap.xml')).html.includes('question-papers-1.xml'));
current = original;
assert.equal((await request(canonical)).status,200,'publication appears immediately');
assert(calls > 30);
const unavailable = createHandler(async () => { throw new Error('SECRET private backend diagnostic'); });
for (const path of [BASE,canonical,'/sitemap.xml','/sitemaps/question-papers-1.xml']) {
  const response = await request(path,'GET',unavailable); assert.equal(response.status,503); assert(!response.html.includes('SECRET')); assert.match(response.headers['x-robots-tag'],/noindex/);
}

// Paginated HTML remains crawlable and non-indexable beyond useful first pages.
const many = Array.from({length:1200},(_,i) => fixture(i+1,{paper_number:String(i+1),title:'Fixture paper '+(i+1)}));
const growth = createCatalog(many);
const growthHandler = createHandler(async () => many);
const second = await request(paths(many[0])[5]+'?page=2','GET',growthHandler);
assert.equal(second.status,200); assert.match(second.html,/noindex, follow/); assert.match(second.html,/Page 2 of 25/);
const sessionPath = paths(many[0])[5];
const rewrittenSecond = await request(sessionPath+'?'+new URLSearchParams({route:sessionPath,path:decodeURIComponent(sessionPath.slice(BASE.length+1)),page:'2'}),'GET',growthHandler,{route:sessionPath});
assert.equal(rewrittenSecond.status,200,'Vercel rewrite must preserve canonical pagination without a redirect loop');
assert.equal((second.html.match(/class="card qp-card"/g)||[]).length,PAGE_SIZE);

// Display formatting must not feed back into catalog identities or SEO labels.
for (const [raw, expected] of [
  ['Samhita adhyayan-1','Samhita Adhyayan – I'],
  ['Kriya Sharir (Paper-1)','Kriya Sharir – Paper I'],
  ['Kriya Sharir (Paper-2)','Kriya Sharir – Paper II'],
  ['Padarth Vigyan (Paper-1)','Padarth Vigyan – Paper I'],
  ['Kriya Sharir – Paper I','Kriya Sharir – Paper I'],
  ['Clinical Science (Part-4)','Clinical Science – Part IV'],
  ['Paper number 1','Paper I'],
  ['ICD-10','ICD-10'], ['COVID-19','COVID-19'], ['Anatomy 2023','Anatomy 2023'],
  ['Diabetes Type-1','Diabetes Type-1'], ['Biochemistry B-1','Biochemistry B-1'],
  ['saṃhitā adhyayan','saṃhitā Adhyayan'],
  ['संहिता अध्ययन','संहिता अध्ययन'], ['शरीर रचना Paper-2','शरीर रचना – Paper II'],
]) {
  assert.equal(displaySubject(raw),expected);
  assert.equal(displaySubject(expected),expected,'display formatting is idempotent');
}
assert.equal(displayPaperNumber('Paper number 1'),'Paper I');
assert.equal(displayPaperNumber('2'),'Paper II');
assert.equal(displayPaperNumber('A'),'Paper A');
assert.equal(displayLabel(' BAMS   1st Year '),'BAMS 1st Year');
assert.deepEqual(displayCourse('BAMS Marathi Medium'),{name:'BAMS',medium:'Marathi'});
assert.deepEqual(displayCourse('BAMS (Hindi Medium)'),{name:'BAMS',medium:'Hindi'});
assert.deepEqual(displayCourse('BAMS'),{name:'BAMS',medium:''});
const displayFixture = fixture(99,{course_name:'BAMS Marathi Medium',year_title:'BAMS 1st Year',subject_title:'Samhita adhyayan-1'});
assert.equal(academicContext(displayFixture),'BAMS 1st Year · Marathi Medium');
const displayCatalog = createCatalog([displayFixture]);
const expectedHeadings = ['Question Papers','BAMS Question Papers','BAMS 1st Year Question Papers','Samhita Adhyayan – I','Samhita Adhyayan – I','Summer-2023 Question Papers','Fixture Anatomy Paper'];
for (const node of displayCatalog.groups.values()) {
  const html = renderNode(node,displayCatalog);
  assert.equal(html.match(/<h1>(.*?)<\/h1>/s)[1],expectedHeadings[node.level]);
  for (const [svg] of html.matchAll(/<svg\b[^>]*>/g)) {
    assert(/\bwidth="\d+"/.test(svg) && /\bheight="\d+"/.test(svg), 'icons retain explicit intrinsic dimensions without CSS');
  }
  assert.match(html, /href="\/assets\/css\/site\.css\?v=[a-f0-9]{12}"/, 'catalog CSS is versioned alongside the static build');
  assert(html.includes(`rel="canonical" href="${SITE+paths(displayFixture)[node.level]}"`));
  assert(!/<a\b[^>]*class="card qp-card"[^>]*>(?:(?!<\/a>)[\s\S])*<(?:a|button)\b/.test(html),'whole-card links have no nested controls');
}
assert.equal(displayFixture.subject_title,'Samhita adhyayan-1');
assert(paths(displayFixture)[3].includes('samhita-adhyayan-1~'));
const entries = sitemapEntries(growth);
assert.equal(entries.length,many.length+6);
assert.equal(new Set(entries.map(e=>e.path)).size,entries.length);
const index = sitemapIndex(entries.length);
assert(index.includes('question-papers-2.xml'));
const firstMap = await request('/sitemaps/question-papers-1.xml','GET',growthHandler);
const secondMap = await request('/sitemaps/question-papers-2.xml','GET',growthHandler);
assert.equal((firstMap.html.match(/<url>/g)||[]).length,SITEMAP_SIZE);
assert.equal((secondMap.html.match(/<url>/g)||[]).length,entries.length-SITEMAP_SIZE);
assert.equal((await request('/sitemaps/question-papers-3.xml','GET',growthHandler)).status,404);
assert(!sitemapXml(entries).includes('/question-paper/'));
assert(sitemapXml(entries).includes('<lastmod>2026-11-26T00:00:00.000Z</lastmod>'));
const staticMap = (await request('/sitemaps/static.xml')).html;
const oldStatic = readFileSync(new URL('../_src/static-sitemap.xml',import.meta.url),'utf8');
assert.deepEqual([...staticMap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).sort(),[...oldStatic.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).sort());
const config = JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
for (const path of [BASE,BASE+'/:path*','/sitemap.xml','/sitemaps/:file']) assert(config.rewrites.some(rule => rule.source === path && rule.destination.startsWith('/api/question-papers?route=')));
assert(readFileSync(new URL('../robots.txt',import.meta.url),'utf8').includes('Sitemap: '+SITE+'/sitemap.xml'));

// The fixed projection and renderer reject unexpected private fields, escape
// untrusted public text, and never evaluate template tokens from database data.
for (const bad of [null,{},[{...rows[0],object_path:'PRIVATE.pdf'}],[{...rows[0],exam_year:'2023'}],[rows[0],rows[0]],[{...rows[0],exam_session:null,exam_month:null}]]) assert.throws(()=>validateCatalog(bad));
const hostile = fixture(88,{title:'</script><script>alert("x")</script> {{PLAY_URL}} & <img src=x onerror=x>'});
const hostileCatalog = createCatalog([hostile]);
const safe = renderNode(hostileCatalog.papers.get(hostile.id),hostileCatalog);
assert(!safe.includes('<script>alert')); assert(!safe.includes('<img src=x'));
assert(safe.includes('{{PLAY_URL}}')); assert.equal(ld(safe)['@graph'][0].name.includes(hostile.title),true);
const environment = { SUPABASE_URL:'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture' };
let fetched = 0;
const fetcher = async (url,options) => {
  fetched++; assert.equal(url,environment.SUPABASE_URL+'/rest/v1/rpc/question_paper_public_catalog');
  assert.equal(options.cache,'no-store'); assert.equal(options.body,'{}'); assert.equal(options.headers.Authorization,undefined);
  return new Response(JSON.stringify(rows));
};
assert.deepEqual(await fetchCatalog(environment,fetcher),rows); assert.equal(fetched,1);
await assert.rejects(fetchCatalog({...environment,SUPABASE_PUBLISHABLE_KEY:'sb_secret_PRIVATE'},fetcher));
await assert.rejects(fetchCatalog(environment,async()=>new Response('SECRET',{status:500})));
await assert.rejects(fetchCatalog(environment,async()=>new Response('{}')));
await assert.rejects(fetchCatalog(environment,async()=>new Response(JSON.stringify([{...rows[0],object_path:'PRIVATE'}]))));
const bytes = new Uint8Array(1024*1024);
await assert.rejects(fetchCatalog(environment,async()=>new Response(new ReadableStream({start(controller){for(let i=0;i<17;i++)controller.enqueue(bytes);controller.close();}}))));
const jwt = 'header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.sig';
await assert.rejects(fetchCatalog({...environment,SUPABASE_PUBLISHABLE_KEY:jwt},fetcher));
const install = {href:'',getAttribute:()=>rows[0].id,addEventListener:(_,callback)=>{install.click=callback;}};
vm.runInNewContext(readFileSync(new URL('../assets/js/question-paper-catalog.js',import.meta.url),'utf8'),{document:{querySelectorAll:()=>[install]},MedvedaPaperLinks:codec,Date});
const play = new URL(install.href); assert.equal(play.searchParams.get('id'),'in.medveda.app');
assert.equal(codec.parsePaperReferrer(play.searchParams.get('referrer'),Date.now(),Date.now()).id,rows[0].id);
assert.equal(typeof install.click,'function');

// Optional real local-Postgres snapshots supplied by the isolated runner.
const snapshotArg = process.argv.indexOf('--snapshots');
if (snapshotArg >= 0) {
  const snapshots = JSON.parse(readFileSync(process.argv[snapshotArg+1],'utf8'));
  for (const data of Object.values(snapshots)) validateCatalog(data);
  const published = snapshots.published[0];
  const publishedPath = paths(published)[6];
  let state = snapshots.draft;
  const database = createHandler(async()=>state);
  assert.equal((await request(publishedPath,'GET',database)).status,404);
  state = snapshots.published;
  assert.equal((await request(publishedPath,'GET',database)).status,200);
  assert((await request('/sitemaps/question-papers-1.xml','GET',database)).html.includes(publishedPath));
  state = snapshots.edited;
  const editedPath = paths(state[0])[6];
  assert.equal((await request(publishedPath,'GET',database)).headers.location,editedPath);
  assert((await request(editedPath,'GET',database)).html.includes('Fixture edited title'));
  for (const stage of ['unpublished','deleted']) {
    state = snapshots[stage]; assert.equal((await request(editedPath,'GET',database)).status,404);
    assert(!(await request('/sitemap.xml','GET',database)).html.includes('question-papers-1.xml'));
  }
  console.log('PASS real local PostgreSQL Admin lifecycle snapshots -> initial HTML, redirects, SEO and sitemap');
}
console.log('PASS catalog hierarchy, Unicode/collisions/renames, lifecycle, server HTML, JSON-LD, social metadata, pagination/sitemap growth, security/error boundary and existing deferred-install codec');

if (process.argv.includes('--http')) {
  const { createServer } = await import('node:http');
  const httpHandler = createHandler(async()=>rows);
  const server = createServer((req,res)=>httpHandler(req,res));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try {
    const origin = 'http://127.0.0.1:'+server.address().port;
    for (const path of [BASE,canonical,paths(rows[3])[6],'/sitemap.xml','/sitemaps/static.xml','/sitemaps/question-papers-1.xml']) {
      const response = await fetch(origin+path);
      assert.equal(response.status,200);
      assert.equal(response.headers.get('cache-control'),'no-store');
      const html = await response.text();
      if (path.startsWith(BASE)) assert(html.includes('<h1>'));
      else assert(html.startsWith('<?xml'));
    }
    assert.equal((await fetch(origin+canonical,{method:'HEAD'})).status,200);
    assert.equal((await fetch(origin+canonical+'?page=0')).status,404);
    console.log('PASS local HTTP GET/HEAD responses: initial HTML, Unicode routes and XML sitemap transport (no browser or production deployment)');
  } finally {
    await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  }
}
