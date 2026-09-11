import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 700 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${process.env.CAPY_AVATAR_URL || 'http://127.0.0.1:5173'}/preview.html?bare=1`);
  await page.waitForFunction(() => window.__capyReady);
  const results = await page.evaluate(() => {
    const { sm, scene } = window.__capy;
    const update = sm.update.bind(sm);
    sm.update = () => {};
    const clean = name => name.replace(/[^\w-]/g, '');
    const bones = [];
    scene.traverse(node => { if (node.isBone) bones.push(node); });
    const head = bones.find(node => clean(node.name) === 'DEF-spine006');
    const faces = bones.filter(node => /^DEF-(ear|teeth|nose|eye|lid|tongue|jaw|chin|lip|brow|cheek|forehead|temple)/.test(node.name) && !node.parent?.isBone);
    let maxFaceError = 0, maxFacePositionError = 0, maxSize = 0, frames = 0;
    const measure = () => {
      sm.rig.restore(); scene.updateMatrixWorld(true);
      const inverse = head.matrixWorld.clone().invert();
      const expected = faces.map(node => inverse.clone().multiply(node.matrixWorld));
      sm.rig.apply(sm.look); scene.updateMatrixWorld(true);
      inverse.copy(head.matrixWorld).invert();
      faces.forEach((node, index) => {
        const actual = inverse.clone().multiply(node.matrixWorld);
        actual.elements.forEach((value, i) => { maxFaceError = Math.max(maxFaceError, Math.abs(value - expected[index].elements[i])); });
        for (const i of [12, 13, 14]) maxFacePositionError = Math.max(maxFacePositionError, Math.abs(actual.elements[i] - expected[index].elements[i]));
      });
      scene.traverse(mesh => {
        if (!mesh.isSkinnedMesh) return;
        mesh.skeleton.update(); mesh.computeBoundingBox();
        const bounds = mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
        const size = bounds.getSize(mesh.position.clone());
        maxSize = Math.max(maxSize, size.x, size.y, size.z);
        if (![size.x, size.y, size.z].every(Number.isFinite)) throw new Error('Non-finite skinned geometry');
      });
      frames++;
    };
    for (const gesture of ['wave_hello', 'heart', 'pray_hands', 'think', 'clap', 'celebrate', 'listen_nod']) {
      sm.speak(600000, gesture);
      for (let frame = 0; frame < 100; frame++) { update(1 / 30); if (frame % 5 === 0) measure(); }
      sm.lookAt(0.7, -0.4); update(1 / 30); measure(); sm.lookAt(0, 0);
      sm.idle(); for (let frame = 0; frame < 20; frame++) update(1 / 30);
    }
    for (let frame = 0; frame < 40; frame++) {
      sm.speak(600000, frame % 2 ? 'heart' : 'pray_hands'); update(0.08); measure();
    }
    sm.idle();
    for (let frame = 0; frame < 30; frame++) update(1 / 30);
    const remaining = sm.rig.controls.children.filter(node => node.name.startsWith('pose_')).map(node => Math.abs(node.position.x));
    for (const clip of ['idle_breathe', 'idle_look', 'talk_a', 'talk_b', 'sad', 'yawn', 'munch', 'kneel_pray', 'pray_hands', 'heart', 'sleep', 'wake']) {
      sm.cue(clip, { loop: true });
      for (let frame = 0; frame < 90; frame++) { update(1 / 30); if (frame % 15 === 0) measure(); }
    }
    sm.dispose();
    return { frames, facialRoots: faces.length, maxFaceError, maxFacePositionError, maxSize, residualPoseWeight: Math.max(...remaining) };
  });
  assert.ok(results.facialRoots > 40, 'Check the real exported facial roots');
  // The source bake has slightly nonuniform scales; matrix decomposition introduces tiny linear-part error.
  assert.ok(results.maxFaceError < 0.001, `Facial transform changed: ${results.maxFaceError}`);
  assert.ok(results.maxFacePositionError < 0.00001, `Face detached from head: ${results.maxFacePositionError}`);
  assert.ok(results.maxSize < 2.5, `Skinned mesh stretched: ${results.maxSize}`);
  assert.ok(results.residualPoseWeight < 0.0001, 'A held gesture remained after idle');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, ...results }, null, 2));
} finally { await browser.close(); }
