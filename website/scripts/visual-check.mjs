// Reuse an installed Playwright library and browser; installs nothing.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_PATH=/path/to/chrome \
// node website/scripts/visual-check.mjs http://127.0.0.1:4173 /tmp/medveda-screenshots <public-catalog.json>
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { paths, validateCatalog } from '../_src/question-paper-catalog.mjs';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const [origin = 'http://127.0.0.1:4173', output = '/tmp/medveda-screenshots', snapshot] = process.argv.slice(2);
const rows = validateCatalog(JSON.parse(await readFile(snapshot, 'utf8')));
assert(rows.length, 'Use real published metadata for visual acceptance');
await mkdir(output, { recursive:true });
const launch = () => chromium.launch({ executablePath:process.env.CHROME_PATH, headless:true, args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-features=BackForwardCache'], chromiumSandbox:false });
const widths = process.env.VISUAL_WIDTHS ? process.env.VISUAL_WIDTHS.split(',').map(Number) : [360,390,768,1024,1440];
assert(widths.length && widths.every(width=>[360,390,768,1024,1440].includes(width)), 'Use supported visual acceptance widths');
let browser;
const pages = [
  ...paths(rows[0]).map((path, level) => ({ name:'catalog-'+level, path })),
  ...['','features','courses','how-it-works','faq','about','contact','download','privacy-policy','terms','refund-policy','disclaimer','shipping-policy','delete-account','reset-password','account-verified','note','quiz','question-paper','404'].map(path => ({ name:path || 'home', path:path==='404'?'/missing-page':'/'+path })),
  { name:'catalog-not-found', path:'/question-papers/missing' },
];
const previous = process.env.VISUAL_WIDTHS ? JSON.parse(await readFile(output+'/results.json','utf8')) : {results:[],errors:[]};
const results = previous.results.filter(result=>!widths.includes(result.width));
const errors = previous.errors;
try {
  for (const width of widths) {
    browser = await launch();
    const context = await browser.newContext({ reducedMotion:'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      if (response.status() >= 400 && response.request().resourceType() !== 'document') errors.push(`Asset HTTP ${response.status()}: ${response.url()}`);
    });
    page.on('requestfailed', request => errors.push(`Request failed: ${request.url()} (${request.failure()?.errorText})`));
    await page.setViewportSize({ width, height:900 });
    for (const item of pages) {
      const before = errors.length;
      const response = await page.goto(origin+item.path, { waitUntil:'networkidle' });
      assert.equal(response.status(), /not-found|^404$/.test(item.name) ? 404 : 200, item.path);
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const visible = e => e.getBoundingClientRect().width && e.getBoundingClientRect().height && getComputedStyle(e).visibility !== 'hidden';
        const rect = e => { const r=e.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
        const cards = [...document.querySelectorAll('.qp-card')].map(e => {
          const r=e.getBoundingClientRect(), style=getComputedStyle(e);
          const point=document.elementFromPoint(r.x+r.width/2, Math.min(r.y+r.height/2,innerHeight-1));
          return { ...rect(e), background:style.backgroundColor, border:style.borderTopWidth, display:style.display, decoration:style.textDecorationLine,
            hit:r.y >= innerHeight || point?.closest('a') === e,
            overflow:[...e.children].some(c => {const b=c.getBoundingClientRect(); return b.left<r.left-1 || b.right>r.right+1 || b.bottom>r.bottom+1;}) };
        });
        const headings=[...document.querySelectorAll('h1')].filter(visible).map(e=>({ size:parseFloat(getComputedStyle(e).fontSize),family:getComputedStyle(e).fontFamily,...rect(e) }));
        const icons=[...document.querySelectorAll('svg')].filter(visible).map(e=>({ ...rect(e),chevron:e.classList.contains('qp-chevron') }));
        const grid=document.querySelector('.qp-grid');
        const main=document.querySelector('main').getBoundingClientRect();
        const footer=document.querySelector('footer').getBoundingClientRect();
        return { overflow:document.documentElement.scrollWidth>innerWidth, headings, icons, cards,
          cssLoaded:[...document.styleSheets].some(s=>s.href?.includes('/site.css?v=') && s.cssRules.length>0),
          columns:grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
          sharedGrids:[...document.querySelectorAll('.grid.c2, .grid.c3')].map(e=>({ kind:e.classList.contains('c2')?2:3, columns:getComputedStyle(e).gridTemplateColumns.split(' ').length })),
          footerOverlap:footer.top<main.bottom-1,
          outside:[...document.querySelectorAll('main *')].filter(visible).filter(e=>!e.closest('.table-wrap')).filter(e=>{const r=e.getBoundingClientRect(); return r.right>innerWidth+1 || r.left< -1;}).map(e=>e.tagName+'.'+e.className).slice(0,5) };
      });
      const label=item.name+' at '+width;
      assert(metrics.cssLoaded, label+' missing CSS');
      assert(!metrics.overflow && !metrics.outside.length, label+' horizontal overflow '+metrics.outside);
      assert(!metrics.footerOverlap,label+' footer overlap');
      assert(metrics.headings.every(h=>h.size <= (item.name==='home'?42:32)),label+' oversized H1');
      assert(metrics.icons.every(i=>i.width<=32 && i.height<=32 && (!i.chevron || i.width===18 && i.height===18)),label+' oversized SVG');
      assert(metrics.cards.every(c=>c.display==='flex' && c.background!=='rgba(0, 0, 0, 0)' && parseFloat(c.border)>=1 && c.decoration==='none' && !c.overflow && c.hit),label+' broken card');
      if (item.name==='catalog-2') assert.equal(metrics.columns,width>=1200?4:width>=960?3:width>=600?2:1,label+' subject columns');
      for (const grid of metrics.sharedGrids) assert.equal(grid.columns,grid.kind===2?(width>=720?2:1):(width>=1000?3:width>=640?2:1),label+' shared grid columns');
      // Verify the complete card box is the interactive link and has visible focus/hover.
      if (metrics.cards.length) {
        const card=page.locator('.qp-card').first();
        await page.keyboard.press('Tab');
        await card.focus();
        assert.equal(await card.evaluate(e=>getComputedStyle(e).outlineStyle),'solid',label+' keyboard focus');
        await card.hover();
        assert.equal(await card.evaluate(e=>getComputedStyle(e).textDecorationLine),'none');
        await page.locator('h1:visible').first().click();
        await page.evaluate(()=>scrollTo(0,0));
      }
      if (width <= 1024) {
        const menu=page.locator('#menu-btn');
        await menu.click();
        assert.equal(await menu.getAttribute('aria-expanded'),'true');
        assert(await page.locator('#site-nav').isVisible(),label+' mobile navigation');
        assert(await page.locator('#site-nav a[href="/question-papers"]').isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'),'false');
        assert(!(await page.locator('#site-nav').isVisible()));
        await page.locator('h1:visible').first().click();
      }
      if (item.name === 'privacy-policy') {
        const table = page.locator('.table-wrap');
        assert(await table.evaluate(e => e.scrollWidth <= e.clientWidth || getComputedStyle(e).overflowX === 'auto'));
        assert(await table.locator('th').first().evaluate(e=>e.getBoundingClientRect().width >= 120), label+' compressed table columns');
        await table.evaluate(e => { e.scrollLeft = e.scrollWidth; });
        assert(await table.evaluate(e => e.scrollWidth <= e.clientWidth || e.scrollLeft > 0), label+' table scroll');
        await table.evaluate(e => { e.scrollLeft = 0; });
      }
      // Screenshots are taken from the actual rendered page, after interaction checks.
      await page.screenshot({ path:output+'/'+item.name+'-'+width+'.png', fullPage:[390,1440].includes(width) });
      results.push({ name:item.name, path:item.path,width,status:response.status(),...metrics,errors:errors.slice(before) });
    }
    // Exercise actual whole-card navigation through the hierarchy without leaving the preview.
    const storedChain=paths(rows[0]);
    const single=rows.filter(p=>paths(p)[5]===storedChain[5]).length===1;
    const chain=storedChain.filter((_,level)=>level!==4 && !(single && level===5));
    for(let level=0;level<chain.length-1;level++) {
      await page.goto(origin+chain[level]);
      // Exact href avoids confusing the same target in breadcrumbs and cards.
      const handle=await page.locator('main a').evaluateAll((links,href)=>links.findIndex(a=>a.getAttribute('href')===href),chain[level+1]);
      assert(handle>=0,'missing navigation level '+level);
      await page.locator('main a').nth(handle).click();
      assert.equal(new URL(page.url()).pathname,chain[level+1]);
    }
    await page.goto(origin+storedChain[6]);
    assert.equal(await page.getByRole('link',{name:'Open in MedVeda App',exact:true}).getAttribute('href'),'https://www.medveda.in/question-paper/'+rows[0].id);
    const install=new URL(await page.locator('[data-paper-install]').getAttribute('href'));
    assert.equal(install.origin,'https://play.google.com');
    assert.equal(install.searchParams.get('id'),'in.medveda.app');
    // Inspect the sticky header and footer after scrolling at desktop/mobile sizes.
    if ([390,1440].includes(width)) {
      await page.goto(origin+'/');
      await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
      await page.screenshot({path:output+'/footer-'+width+'.png'});
      assert.equal(await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().top),0);
    }
    await writeFile(output+'/results.json',JSON.stringify({results,errors},null,2));
    console.log(`PASS ${width}px: ${pages.length} rendered pages and complete catalog navigation`);
    // Release renderer caches between widths on memory-constrained machines.
    await browser.close();
  }
  // A 404 network diagnostic is expected on deliberate error pages; other errors fail.
  const unexpected=errors.filter(e=>!e.includes('404 (Not Found)'));
  assert.deepEqual(unexpected,[],'browser errors');
  console.log(`PASS ${results.length} real browser page/viewport checks; 5 navigation chains; focus, hover, menus, current CSS, icons, cards, typography, overflow and app destinations`);
} finally {
  await writeFile(output+'/results.json',JSON.stringify({results,errors},null,2));
  await browser?.close();
}
