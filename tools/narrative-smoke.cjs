const {createRequire}=require('node:module');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=createRequire(path.resolve(__dirname,'../packages/avatar-web/package.json'))('playwright');
const pack=require('../packages/content/packs/christian-us-en-v1/pack.json');
(async()=>{
 const out=process.env.CAPY_SCREENSHOTS||path.resolve(__dirname,'../test-results/narrative');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM||undefined,headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8081/places');await page.getByText(pack.ui.placesTitle,{exact:true}).waitFor();
  // Isolated browser profile; unlock the existing story shelf through lesson completion.
  await page.evaluate(async ids=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('capy-prayer',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');const s=tx.objectStore('state');const r=s.get('kid');r.onsuccess=()=>{const k=JSON.parse(r.result||'{"state":{},"version":0}');Object.assign(k.state,{onboarded:true,introDone:true,kidName:'Mia',completed:Object.fromEntries(ids.map(id=>[id,true]))});s.put(JSON.stringify(k),'kid')};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
  },pack.lessons.map(l=>l.id));
  const buttonVisible=async label=>{
   const b=await page.getByText(label,{exact:true}).boundingBox();
   assert.ok(b && b.y>=0 && b.y+b.height<= (await page.viewportSize()).height+1,'Button fits viewport: '+label);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  };
  for(const story of pack.stories){
   await page.goto('http://127.0.0.1:8081/story/'+story.id);
   await page.getByText(pack.ui.next,{exact:true}).waitFor();await page.waitForTimeout(700);
   await page.getByText(pack.ui.next,{exact:true}).click();
   const rows=[...story.pages.map(p=>({text:p.text,cue:p.visual})),{text:story.moral,cue:story.moralVisual}];
   const sources=[];
   for(let i=0;i<rows.length;i++){
    const {text,cue}=rows[i];
    await page.getByText(text,{exact:true}).waitFor();
    const art=page.getByTestId('story-art-'+cue.art);
    await art.locator('img').evaluate(i=>i.decode());
    await page.getByTestId('narrative-story-'+cue.symbol).waitFor();
    sources.push(await art.locator('img').getAttribute('src'));
    await page.waitForTimeout(700);
    await buttonVisible(i===rows.length-1?pack.ui.theEnd:pack.ui.storyPage);
    if((story.id==='lost-sheep' && [0,1,3].includes(i))||(story.id==='calm-storm' && [1,2,3].includes(i)))
     await page.screenshot({path:path.join(out,story.id+'-'+(i+1)+'.png')});
    if(i<rows.length-1)await page.getByText(pack.ui.storyPage,{exact:true}).click();
   }
   assert.equal(new Set(sources).size,3,story.id+' has three story scenes');
   console.log('Story pages and moral: '+story.id);
  }
  await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:8081/story/lost-sheep');
  await page.getByText(pack.ui.next,{exact:true}).waitFor();await page.waitForTimeout(700);await page.getByText(pack.ui.next,{exact:true}).click();
  await page.getByTestId('narrative-detail').waitFor();await page.waitForTimeout(500);
  const still=await page.getByTestId('narrative-detail').evaluate(e=>getComputedStyle(e).transform);
  await page.waitForTimeout(700);assert.equal(await page.getByTestId('narrative-detail').evaluate(e=>getComputedStyle(e).transform),still);
  await buttonVisible(pack.ui.storyPage);await page.screenshot({path:path.join(out,'story-small-reduced-motion.png')});
  let prayerLines=0;
  for(const scene of pack.scenes){
   const prayer=pack.prayers.find(p=>p.id===scene.prayerId);if(!prayer)continue;
   await page.goto('http://127.0.0.1:8081/place/'+scene.id);
   await page.getByText(pack.ui.next,{exact:true}).waitFor();await page.waitForTimeout(700);await page.getByText(pack.ui.next,{exact:true}).click();
   for(let i=0;i<prayer.lines.length;i++){
    const line=prayer.lines[i];await page.getByTestId('narrative-prayer-'+line.visual.symbol).waitFor();
    await page.waitForTimeout(700);await buttonVisible(pack.ui.iSaidIt);prayerLines++;
    if(['kitchen','garden','bedroom'].includes(scene.background)&&i===0)await page.screenshot({path:path.join(out,'prayer-'+scene.background+'-small.png')});
    await page.getByText(pack.ui.iSaidIt,{exact:true}).click();
   }
  }
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:8081/lesson/moment-happy');
  await page.getByText(pack.ui.next,{exact:true}).waitFor();await page.waitForTimeout(700);await page.getByText(pack.ui.next,{exact:true}).click();
  await page.getByRole('button',{name:pack.companion.breathing.finish,exact:true}).click();
  await page.getByTestId('narrative-prayer-happy').waitFor();await page.waitForTimeout(900);
  await page.screenshot({path:path.join(out,'prayer-happy.png')});
  await page.getByText(pack.ui.iSaidIt,{exact:true}).click();await page.getByTestId('narrative-prayer-hands').waitFor();
  await page.waitForTimeout(900);await page.screenshot({path:path.join(out,'prayer-hands.png')});
  await page.getByText(pack.ui.iSaidIt,{exact:true}).click();await page.getByTestId('narrative-prayer-heart').waitFor();
  await page.goto('http://127.0.0.1:5173/preview.html?bare=1&clip=idle_breathe');await page.waitForFunction(()=>window.__capyReady===true);
  await page.screenshot({path:path.join(out,'avatar-preview.png')});
  assert.deepEqual(errors,[]);
  console.log('Passed: all 60 story steps, 30 loaded scenes, '+prayerLines+' place prayer lines, three moment prayer symbols, 320px layout and reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
