import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
if (process.env.CAPY_RELEASE === '1') execFileSync(process.execPath, [resolve(root, 'tools/release-check.mjs'), '--strict'], { cwd: root, stdio: 'inherit' });
execFileSync(pnpm, ['audio:prepare'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
execFileSync(pnpm, ['--filter', '@capy/avatar-web', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
