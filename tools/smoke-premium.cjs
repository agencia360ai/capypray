// Play, stories, places and the pond are premium doors (pack companion.home). Smoke runs use the dev web server,
// where the persisted sandbox entitlement is honored, so seed it once the app has created its storage.
exports.unlockPremium = async (page, origin = 'http://127.0.0.1:8081') => {
  await page.goto(origin + '/moments');
  await page.waitForFunction(async () => (await indexedDB.databases()).some(d => d.name === 'capy-prayer'));
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('capy-prayer', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('state', 'readwrite'); const store = tx.objectStore('state'); const r = store.get('kid');
      r.onsuccess = () => { const kid = JSON.parse(r.result || '{"state":{},"version":0}'); kid.state.premium = true; store.put(JSON.stringify(kid), 'kid'); };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
};
