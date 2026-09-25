import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const json = p => JSON.parse(readFileSync(resolve(root, p), 'utf8').replace(/^\uFEFF/, ''));
const metadata = json('release/store-metadata.en-US.json');
const config = json('apps/mobile/app.json').expo;
const errors = [];
for (const [field,max] of Object.entries({appName:30,subtitle:30,promotionalText:170,keywords:100,shortDescription:80,description:4000})) {
 const n = [...metadata[field]].length; if(n>max) errors.push(`${field}: ${n}/${max}`); else console.log(`${field}: ${n}/${max}`);
}
for (const id of [config.ios.bundleIdentifier,config.android.package]) if(id!=='com.looplab.capypray') errors.push('Unexpected application ID');
if (!existsSync(resolve(root,'apps/mobile/assets/brand/icon.png'))) errors.push('Missing icon');
if (process.argv.includes('--strict')) {
 for(const [key,prefix] of [['EXPO_PUBLIC_RC_IOS_KEY','appl_'],['EXPO_PUBLIC_RC_ANDROID_KEY','goog_']]) if(!process.env[key]?.startsWith(prefix)) errors.push(`${key}: live platform SDK key required`);
 if (!/^[0-9a-f-]{36}$/i.test(process.env.EXPO_PUBLIC_EAS_PROJECT_ID||'')) errors.push('EAS project UUID required');
 if (process.env.CAPY_LEGAL_APPROVED!=='1') errors.push('CapyPray privacy/terms must be reviewed and published (CAPY_LEGAL_APPROVED=1)');
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Release static checks passed; store-account and device verification still required.');
