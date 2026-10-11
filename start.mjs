/**
 * This project is a Chrome extension, not a website.
 * npm start opens Chrome with this folder loaded unpacked.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = join(homedir(), '.arbitrip-copilot-chrome');

if (!existsSync(chromeBin)) {
  console.error('Google Chrome was not found at:');
  console.error(`  ${chromeBin}`);
  console.error('Install Chrome, or load this folder unpacked from chrome://extensions');
  process.exit(1);
}

mkdirSync(profile, { recursive: true });

console.log('Arbitrip Zendesk Copilot is a Chrome extension — not a local website.');
console.log(`Opening Chrome with this folder loaded:\n  ${root}\n`);
console.log('Sign in to Zendesk, open a ticket, then click the extension icon.');

const child = spawn(
  chromeBin,
  [
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${root}`,
    `--load-extension=${root}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://arbitrip-support.zendesk.com/agent',
  ],
  { detached: true, stdio: 'ignore' }
);

child.unref();
