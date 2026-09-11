const {createRequire}=require('node:module');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=createRequire(path.resolve(__dirname,'../packages/avatar-web/package.json'))('playwright');
const pack=require('../packages/content/packs/christian-us-en-v1/pack.json');
(async()=>{
 const out=process.env.CAPY_SCREENSHOTS||path.resolve(__dirname,'../test-results/illustrations');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM||undefined,headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8081/places');
  await page.getByText(pack.ui.placesTitle,{exact:true}).waitFor();
  await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('capy-prayer',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');const s=tx.objectStore('state');const r=s.get('kid');r.onsuccess=()=>{const k=JSON.parse(r.result||'{"state":{},"version":0}');Object.assign(k.state,{onboarded:true,introDone:true,kidName:'Mia',completed:{},beacons:0});s.put(JSON.stringify(k),'kid')};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
  });
  await page.goto('http://127.0.0.1:8081');
  await page.getByRole('button',{name:'Happy',exact:true}).waitFor();
  await page.getByRole('button',{name:'Happy',exact:true}).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const row=page.getByTestId('feeling-art-happy').locator('../..');
  await row.screenshot({path:path.join(out,'feelings-row.png')});
  await page.screenshot({path:path.join(out,'home-illustrated.png')});
  for(const feeling of pack.companion.feelings){
   await page.getByRole('button',{name:feeling.label,exact:true}).click();
   await page.waitForURL('**/lesson/'+feeling.lessonId);
   await page.getByText(pack.ui.next,{exact:true}).waitFor();await page.waitForTimeout(700);
   await page.goto('http://127.0.0.1:8081');
  }
  await page.setViewportSize({width:320,height:568});
  await page.getByRole('button',{name:'Happy',exact:true}).scrollIntoViewIfNeeded();
  const boxes=await Promise.all(pack.companion.feelings.map(f=>page.getByRole('button',{name:f.label,exact:true}).boundingBox()));
  assert.ok(boxes.every(b=>b && Math.abs(b.y-boxes[0].y)<2 && b.width>=44));
  await row.screenshot({path:path.join(out,'feelings-small.png')});
  await page.goto('http://127.0.0.1:8081/moments');await page.getByText(pack.companion.moments[0].title,{exact:true}).waitFor();
  await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'moments-small.png')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:8081/stories');
  await page.getByText(pack.stories[0].title,{exact:true}).waitFor();
  const sources=[];
  for(const story of pack.stories){
   const cover=page.getByTestId('story-cover-'+story.id);await cover.scrollIntoViewIfNeeded();
   await cover.locator('img').evaluate(i=>i.decode());
   const imageBox=await cover.boundingBox();assert.ok(imageBox && Math.abs(imageBox.width-imageBox.height)<2,'Cover must remain square: '+story.id);
   sources.push(await cover.locator('img').getAttribute('src'));
   const button=cover.locator('..');assert.equal(await button.isDisabled(),!story.free);
  }
  assert.equal(new Set(sources).size,10);assert.ok(sources.every(s=>s.includes('/illustrations/stories/')));
  await page.getByText(pack.companion.ui.stories,{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'stories-illustrated.png')});
  await page.getByTestId('story-cover-lost-sheep').locator('..').click();
  await page.getByText(pack.ui.next,{exact:true}).click();
  await page.getByTestId('story-opening-art').waitFor();
  await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'story-opening.png')});
  await page.getByText(pack.ui.storyPage,{exact:true}).click();await page.getByText(pack.stories[0].pages[1].text,{exact:true}).waitFor();
  await page.goto('http://127.0.0.1:8081/stories');await page.setViewportSize({width:320,height:568});
  await page.getByTestId('story-cover-sower').scrollIntoViewIfNeeded();
  const smallCover=await page.getByTestId('story-cover-sower').boundingBox();assert.ok(smallCover && Math.abs(smallCover.width-smallCover.height)<2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'stories-small.png')});
  await page.goto('http://127.0.0.1:5173/preview.html?bare=1&clip=idle_breathe');await page.waitForFunction(()=>window.__capyReady===true);
  await page.screenshot({path:path.join(out,'avatar-preview.png')});
  assert.deepEqual(errors,[]);console.log('Passed: all five feeling routes, a single 320px row with 44px targets, moment cards, ten distinct loaded covers, existing story locks, opening artwork and story advance.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
