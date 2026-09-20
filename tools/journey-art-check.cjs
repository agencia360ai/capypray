const { createRequire } = require("node:module");
const path = require("node:path"), fs = require("node:fs"), assert = require("node:assert/strict");
const { chromium } = createRequire(path.resolve(__dirname, "../packages/avatar-web/package.json"))("playwright");
(async () => {
 const out=process.env.CAPY_SCREENSHOTS || path.resolve(__dirname,"../test-results/journey-art");
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM || undefined,headless:true,args:["--enable-unsafe-swiftshader"]});
 try {
  const page=await browser.newPage({viewport:{width:1180,height:1000},deviceScaleFactor:1});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(process.env.CAPY_ART_URL || "http://127.0.0.1:8084");
  await page.waitForFunction(()=>window.artManifest?.assets.length===8);
  const measurements=await page.evaluate(async()=>{
   const result=[];
   for(const a of window.artManifest.assets){
    const image=document.querySelector('[data-asset-id="'+a.id+'"]');await image.decode();
    const canvas=document.createElement("canvas");canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]===0)transparent++;
    const alpha=(x,y)=>data[(y*canvas.width+x)*4+3];
    result.push({id:a.id,width:canvas.width,height:canvas.height,transparent:transparent/(canvas.width*canvas.height),corners:[alpha(0,0),alpha(canvas.width-1,0),alpha(0,canvas.height-1),alpha(canvas.width-1,canvas.height-1)],center:alpha(Math.floor(canvas.width/2),Math.floor(canvas.height/2))});
   }
   return result;
  });
  const manifest=require("../apps/mobile/assets/illustrations/journey/manifest.json");
  for(const m of measurements){
   const expected=manifest.assets.find(a=>a.id===m.id);
   assert.equal(m.width,expected.width);assert.equal(m.height,expected.height);
   if(expected.kind==="sprite"){assert.ok(m.transparent>0.15);assert.deepEqual(m.corners,[0,0,0,0]);}
  }
  assert.equal(measurements.find(m=>m.id==="meadow-gateway").center,0);
  await page.screenshot({path:path.join(out,"kit-overview.png"),fullPage:true});
  await page.getByRole("button",{name:"Check dark background"}).click();
  await page.locator("#grid").screenshot({path:path.join(out,"alpha-dark.png")});
  await page.getByRole("button",{name:"Check dark background"}).click();
  await page.getByRole("button",{name:"Show current 3D Capy"}).click();
  await page.frameLocator("iframe").locator("canvas").waitFor({timeout:60000});
  await page.waitForTimeout(1800);
  await page.locator("#scene").screenshot({path:path.join(out,"layer-study-with-capy.png")});
  await page.setViewportSize({width:320,height:700});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,"kit-small.png"),fullPage:true});
  for(const clip of ["walk","pray_hands","kneel_pray"]){
   await page.goto("http://127.0.0.1:8084/viewer/preview.html?bare=1&clip="+clip);
   await page.waitForFunction(()=>window.__capyReady===true);
   await page.evaluate(clip=>{window.__capy.sm.play(clip,{loop:true,fade:0});window.__capy.sm.update(clip==="walk"?.35:2);},clip);
   await page.waitForTimeout(300);
   await page.screenshot({path:path.join(out,"avatar-"+clip+".png")});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,"asset-validation.json"),JSON.stringify(measurements,null,2));
  console.log("Passed: eight assets decoded, six true-alpha props, transparent arch opening, 320px layout, layered current Capy and three avatar preview clips.");
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
