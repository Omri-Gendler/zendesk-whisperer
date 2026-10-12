import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Opens Chrome with this folder loaded as an unpacked extension
const root = dirname(fileURLToPath(import.meta.url))
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profile = join(homedir(), '.arbitrip-copilot-chrome')

if (!existsSync(chromePath)) {
  console.error('Google Chrome was not found. Load this folder from chrome://extensions instead.')
  process.exit(1)
}

mkdirSync(profile, { recursive: true })
console.log('Opening Chrome with the extension loaded...')

const args = [
  '--user-data-dir=' + profile,
  '--load-extension=' + root,
  '--disable-extensions-except=' + root,
  // Chrome 137+ ignores --load-extension unless this feature is turned off
  '--disable-features=DisableLoadExtensionCommandLineSwitch',
  '--no-first-run',
  '--no-default-browser-check',
  'https://arbitrip-support.zendesk.com/agent',
]

spawn(chromePath, args, { detached: true, stdio: 'ignore' }).unref()
