// Targeted Chrome acceptance using the same installed Playwright/Chrome inputs
// as visual-check.mjs. No dependencies are installed and no remote data is written.
// PLAYWRIGHT_MODULE=... CHROME_PATH=... node website/scripts/question-paper-navigation-browser.mjs <preview-origin> <public-catalog.json> <output-directory>
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createHandler } from '../api/question-papers.mjs';
import { paths, sessionName, validateCatalog } from '../_src/question-paper-catalog.mjs';
import { displaySubject } from '../_src/question-paper-display.mjs';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const [origin, snapshot, output] = process.argv.slice(2);
const rows = validateCatalog(JSON.parse(await readFile(snapshot, 'utf8')));
assert(rows.length, 'Use a real published catalog snapshot');
await mkdir(output, { recursive:true });
const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH, headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'], chromiumSandbox:false });
const errors = [], results = [];
let fixtureServer;
const sessionLabel = p => `${sessionName(p)}-${p.exam_year}`;
const sessionRows = (data,p) => data.filter(row=>paths(row)[5] === paths(p)[5]);
const target = (data,p) => paths(p)[sessionRows(data,p).length === 1 ? 6 : 5];
async function inspect(page, name, path, width, status = 200) {
  const response = await page.goto(path, {waitUntil:'networkidle'});
  assert.equal(response.status(), status, name);
  await page.evaluate(()=>document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const nav = document.querySelector('[aria-label="Breadcrumb"]');
    const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
    const visible = [...nav.querySelectorAll('li')].map(e=>({name:e.textContent,path:e.querySelector('a')?.getAttribute('href')}));
    const structured = graph.find(n=>n['@type']==='BreadcrumbList').itemListElement;
    const cards = [...document.querySelectorAll('.qp-card')].map(e=>{
      const r=e.getBoundingClientRect(), s=getComputedStyle(e);
      return {width:r.width,height:r.height,display:s.display,border:s.borderTopWidth,background:s.backgroundColor,
        decoration:s.textDecorationLine,overflow:[...e.children].some(c=>{const b=c.getBoundingClientRect();return b.left<r.left-1 || b.right>r.right+1 || b.bottom>r.bottom+1;})};
    });
    const main=document.querySelector('main').getBoundingClientRect();
    return {visible,structured,cards,canonical:document.querySelector('[rel="canonical"]').href,
      css:[...document.styleSheets].some(s=>s.href?.match(/site\.css\?v=[a-f0-9]{12}$/) && s.cssRules.length),
      overflow:document.documentElement.scrollWidth>innerWidth,
      footerOverlap:document.querySelector('footer').getBoundingClientRect().top<main.bottom-1,
      icons:[...document.querySelectorAll('.qp-chevron')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))};
  });
  assert(metrics.css && !metrics.overflow && !metrics.footerOverlap, name+' layout');
  assert(metrics.icons.every(i=>i.width===18 && i.height===18),name+' icon sizes');
  assert(metrics.cards.every(c=>c.display==='flex' && parseFloat(c.border)>=1 && c.background!=='rgba(0, 0, 0, 0)' && c.decoration==='none' && !c.overflow),name+' card design');
  assert.equal(metrics.canonical,'https://www.medveda.in'+new URL(path).pathname,name+' canonical');
  assert.deepEqual(metrics.visible.map(c=>c.name),metrics.structured.map(c=>c.name),name+' breadcrumb names');
  metrics.visible.forEach((c,i)=>{
    assert.equal(metrics.structured[i].position,i+1);
    if(c.path) assert.equal(metrics.structured[i].item,'https://www.medveda.in'+c.path,name+' breadcrumb links');
  });
  if(metrics.cards.length) {
    const card=page.locator('.qp-card').first();
    await card.focus();
    assert.equal(await card.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
    await card.hover();
    assert.equal(await card.evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
    await page.locator('h1').click();
  }
  await page.screenshot({path:output+'/'+name+'-'+width+'.png',fullPage:true});
  results.push({name,width,status:response.status(),...metrics});
}
try {
  // Local fixtures exercise cases absent from the published catalog. They are
  // served only in memory, through the actual production HTTP handler.
  const fixture = (n, exam_year, exam_session) => ({...rows[0],
    id:`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`,
    course_id:'local-navigation-fixture',course_name:'Local Navigation Fixture',
    year_id:'local-year',subject_id:'local-subject',subject_title:'Local Fixture Subject',
    title:`Local Fixture Paper ${n}`,paper_number:String(n),exam_year,exam_session,exam_month:null});
  const fixtures = validateCatalog([fixture(1,2025,'Winter'),fixture(2,2025,'Summer'),
    fixture(3,2024,'Winter'),fixture(4,2024,'Summer'),fixture(5,2023,'Summer'),fixture(6,2023,'Summer')]);
  let state=fixtures;
  const handler=createHandler(async()=>state);
  fixtureServer=createServer(async(req,res)=>{
    if(req.url.startsWith('/question-papers') || req.url.startsWith('/sitemap')) return handler(req,res);
    try {
      const response=await fetch(origin+req.url);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {res.writeHead(502);res.end();}
  });
  await new Promise((resolve,reject)=>{fixtureServer.once('error',reject);fixtureServer.listen(0,'127.0.0.1',resolve);});
  const local='http://127.0.0.1:'+fixtureServer.address().port;
  const sample=rows.find(p=>p.subject_title.toLowerCase().includes('samhita')) ?? rows[0];
  for(const width of [360,390,768,1024,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
    const chain=paths(sample);
    for(const [level,path] of chain.entries()) await inspect(page,'published-level-'+level,origin+path,width);
    // Click through the real hierarchy and confirm the year/session screens are
    // skipped exactly when their selection is unnecessary.
    await page.goto(origin+'/');
    await page.locator('#site-nav a[href="/question-papers"]').evaluate(e=>e.click());
    for(const path of [chain[1],chain[2],chain[3],target(rows,sample)]) {
      await page.locator(`main a[href="${path}"]`).first().click();
      assert.equal(new URL(page.url()).pathname,path);
    }
    if(sessionRows(rows,sample).length>1) await page.locator(`main a[href="${chain[6]}"]`).click();
    const crumb=page.locator('.qp-breadcrumbs a').filter({hasText:sessionLabel(sample)});
    assert.equal(await crumb.getAttribute('href'),chain[5]);
    assert(!await page.locator(`.qp-breadcrumbs a[href="${chain[4]}"]`).count());
    assert.equal(await page.locator('.qp-breadcrumbs [aria-current="page"]').textContent(),'Paper Details');
    await crumb.click();
    assert.equal(new URL(page.url()).pathname,chain[5],'combined breadcrumb remains functional');
    await page.goto(origin+chain[6]);
    assert.equal(await page.getByRole('link',{name:'Open in MedVeda App',exact:true}).getAttribute('href'),'https://www.medveda.in/question-paper/'+sample.id);
    const install=new URL(await page.locator('[data-paper-install]').getAttribute('href'));
    assert.equal(install.origin,'https://play.google.com');
    assert.equal(install.searchParams.get('id'),'in.medveda.app');
    if(width<=1024) {
      await page.locator('#menu-btn').click();
      assert.equal(await page.locator('#menu-btn').getAttribute('aria-expanded'),'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#menu-btn').getAttribute('aria-expanded'),'false');
    }
    state=fixtures;
    const subject=paths(fixtures[0])[3];
    await inspect(page,'fixture-sessions',local+subject,width);
    assert.deepEqual(await page.locator('.qp-card h3').allTextContents(),['Winter-2025','Summer-2025','Winter-2024','Summer-2024','Summer-2023']);
    const itemList=await page.evaluate(()=>JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(n=>n['@type']==='ItemList').itemListElement);
    assert.deepEqual(itemList.map(n=>new URL(n.url).pathname),await page.locator('.qp-card').evaluateAll(es=>es.map(e=>e.getAttribute('href'))));
    await page.locator('.qp-card').filter({hasText:'Winter-2025'}).click();
    assert.equal(new URL(page.url()).pathname,paths(fixtures[0])[6],'sole paper opens directly');
    await page.goto(local+subject);
    await page.locator('.qp-card').filter({hasText:'Summer-2023'}).click();
    assert.equal(new URL(page.url()).pathname,paths(fixtures[4])[5]);
    assert.deepEqual(await page.locator('.qp-card h3').allTextContents(),fixtures.slice(4).map(p=>displaySubject(p.title)));
    await inspect(page,'fixture-paper-list',page.url(),width);
    await page.locator('.qp-card').first().click();
    assert.equal(new URL(page.url()).pathname,paths(fixtures[4])[6]);
    await inspect(page,'fixture-details',page.url(),width);
    // Changes are visible on the next HTTP request; no build or cache flush.
    const newer=fixture(7,2026,'Winter');
    state=[...fixtures,newer];
    await page.goto(local+subject);
    assert.equal(await page.locator('.qp-card h3').first().textContent(),'Winter-2026');
    assert.equal(await page.locator('.qp-card').first().getAttribute('href'),paths(newer)[6]);
    state=[...state,fixture(8,2026,'Winter')];
    await page.reload();
    assert.equal(await page.locator('.qp-card').first().getAttribute('href'),paths(newer)[5]);
    state=fixtures.filter(p=>p.id!==fixtures[5].id);
    await page.reload();
    assert.equal(await page.locator('.qp-card').filter({hasText:'Summer-2023'}).getAttribute('href'),paths(fixtures[4])[6]);
    state=fixtures.filter(p=>p.exam_year!==2023);
    await page.reload();
    assert.equal(await page.locator('.qp-card').filter({hasText:'Summer-2023'}).count(),0);
    const map=await (await fetch(local+'/sitemaps/question-papers-1.xml')).text();
    assert(!map.includes(fixtures[4].id));
    await context.close();
    console.log(`PASS Chrome ${width}px: published flow, legacy URLs, breadcrumbs, App Links, layout; isolated multiple-paper, ordering and automatic publication updates`);
  }
  assert.deepEqual(errors,[],'browser console and network errors');
} finally {
  await writeFile(output+'/results.json',JSON.stringify({browser:browser.version(),results,errors},null,2));
  await browser.close();
  if(fixtureServer) await new Promise(resolve=>fixtureServer.close(resolve));
}
