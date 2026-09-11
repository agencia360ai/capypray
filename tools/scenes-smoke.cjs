const {createRequire}=require('node:module');
const path=require('node:path');
const {chromium}=createRequire(path.resolve(__dirname,'../packages/avatar-web/package.json'))('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pack=require('../packages/content/packs/christian-us-en-v1/pack.json');
(async()=>{
 const out=process.env.CAPY_SCREENSHOTS||path.resolve(__dirname,'../test-results/scenes');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM||undefined,headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.clock.setFixedTime(new Date('2026-09-10T12:00:00'));
  for(const id of ['kitchen','garden','park','city','school','car']){
   await page.goto('http://127.0.0.1:8081/place/'+id);
   await page.getByText(pack.scenes.find(s=>s.id===id).title,{exact:true}).waitFor();
   await page.frameLocator('iframe').locator('canvas').waitFor();await page.waitForTimeout(900);
   const asset=await page.locator('img').evaluateAll((imgs,id)=>imgs.map(i=>i.src).find(s=>s.includes('/'+id+'-storybook.')),id);
   assert.ok(asset,'Missing storybook asset for '+id);
   assert.ok((await page.request.get(asset)).headers()['content-type'].startsWith('image/'));
   await page.screenshot({path:path.join(out,id+'-in-app.png')});
   if(id==='kitchen'){
    await page.getByText(pack.ui.next,{exact:true}).click();
    const prayer=pack.prayers.find(p=>p.id==='grace-god-is-great');
    for(const line of prayer.lines) {await page.getByText(line.text,{exact:true}).waitFor();await page.waitForTimeout(700);await page.getByText(pack.ui.iSaidIt,{exact:true}).click();}
    await page.getByText(pack.companion.breathing.title,{exact:true}).waitFor();
    await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'kitchen-breathing.png')});
   }
  }
  for(const [biome,beacons] of [['river',4],['mountain',8]]){
   await page.evaluate(async beacons=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('capy-prayer',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');const store=tx.objectStore('state');const r=store.get('kid');r.onsuccess=()=>{const kid=JSON.parse(r.result||'{"state":{},"version":0}');kid.state.beacons=beacons;store.put(JSON.stringify(kid),'kid')};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
   },beacons);
   await page.goto('http://127.0.0.1:8081/place/pond');await page.getByText(pack.ui.next,{exact:true}).waitFor();
   await page.frameLocator('iframe').locator('canvas').waitFor();await page.waitForTimeout(1200);
   const asset=await page.locator('img').evaluateAll((imgs,id)=>imgs.map(i=>i.src).find(s=>s.includes('/'+id+'-storybook.')),biome);
   assert.ok(asset,'Missing biome '+biome);assert.ok((await page.request.get(asset)).headers()['content-type'].startsWith('image/'));
   await page.getByText(pack.ui.next,{exact:true}).click();await page.getByText(pack.companion.breathing.title,{exact:true}).waitFor();
   await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,biome+'-in-app.png')});
  }
  await page.goto('http://127.0.0.1:8081/places');
  await page.getByText(pack.ui.placesTitle,{exact:true}).waitFor();
  await page.frameLocator('iframe').locator('canvas').waitFor();await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'places-in-app.png')});
  await page.setViewportSize({width:320,height:568});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByText('The Kitchen',{exact:true}).click();await page.getByText(pack.ui.next,{exact:true}).waitFor();
  await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,'kitchen-small.png')});
  assert.deepEqual(errors,[]);
  console.log('Passed: eight storybook backgrounds load, kitchen prayer and breathing work, reward biomes resolve, Places thumbnails and 320px navigation fit.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
