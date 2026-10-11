# Arbitrip Zendesk Copilot

Internal Manifest V3 Chrome extension. It opens a **side panel** while an agent works in the Zendesk agent workspace (`https://arbitrip-support.zendesk.com/*`), reads the **currently open ticket from the page**, and shows a summary plus copy-ready reply drafts.

It is **not** a Zendesk App. It **never** calls the Zendesk API. It **never** writes into Zendesk (no auto-send, no composer insert). Ticket text is **never** sent to OpenAI, cloud Gemini, or other public AI hosts.

Generate tries, in order, all **on this computer**:

1. Chrome’s on-device Prompt API (Gemini Nano) if the machine supports it
2. Ollama on `localhost` / `127.0.0.1` if you set that URL in Options
3. Built-in rules (`local-summarizer.js`) if no local model is ready

## File list

```
zendesk-sidepanel-extension/
  manifest.json
  background.js
  content-script.js
  local-summarizer.js
  local-llm.js
  sidepanel.html
  sidepanel.js
  sidepanel.css
  options.html
  options.js
  options.css
  icons/icon16.png
  icons/icon48.png
  icons/icon128.png
  backend/          (optional local Node server)
  README.md
```

| File | Role |
| --- | --- |
| `manifest.json` | MV3: side panel, content script, service worker, Options. Zendesk host + local Ollama. |
| `content-script.js` | Read-only DOM extraction. `SELECTORS` / `LABELS` at the top — retune here when Zendesk markup changes. |
| `local-llm.js` | Chrome on-device Prompt API + localhost Ollama. Rejects remote hosts. |
| `local-summarizer.js` | Rules fallback if no local model is ready. |
| `background.js` | Relays ticket data to the panel; health-check for local models. |
| `sidepanel.*` | Copilot UI: extract preview, Generate, drafts with **Copy**. |
| `options.*` | Chrome Nano toggle + optional local Ollama URL. |
| `icons/` | Toolbar / management icons (navy + amber). |
| `backend/` | Optional local Node server (`npm start` in that folder). The extension already summarizes on-device without it. |

## How Generate works

Click **Generate**. The extension first tries Chrome’s **on-device** model (Gemini Nano). If that is unavailable, it can call **Ollama on this computer** (`127.0.0.1` only). If neither is ready, it falls back to `local-summarizer.js` rules. Ticket JSON is never POSTed to a remote host.

Open Options to see whether Nano is available, or to point at local Ollama (`http://127.0.0.1:11434`, then `ollama pull llama3.1`). Remote Ollama / public AI URLs are rejected.

## Load unpacked (local testing)

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder:
   `/Users/Omri-Arbitrip/Desktop/zendesk-sidepanel-extension`
4. Open Options: leave Chrome on-device model checked. Optionally set Ollama to `http://127.0.0.1:11434` if you have Ollama running.
5. Sign in to `https://arbitrip-support.zendesk.com` and open a **real ticket** (`/agent/tickets/…`).
6. Click the extension icon in the toolbar. The side panel is enabled **only** on this Zendesk host (same pattern as Chrome’s own Gemini side panel).
7. Expand **Extracted from this ticket** and confirm id, subject, thread, and Traider fields look right.
8. Click **Generate Summary**. Drafts are grouped by party (client / hotel / supplier). **Copy** puts text on the clipboard only — paste into Zendesk yourself. The Zendesk composer must stay untouched by the extension.

If the preview is empty or wrong, do **not** start rewriting extraction logic. Update only the `SELECTORS` / `LABELS` object at the top of `content-script.js`, then reload the extension on `chrome://extensions`.

Zendesk Agent Workspace is a SPA: switching tickets does not reload the page. A `MutationObserver` re-extracts; the panel **clears** the previous summary so you never see another ticket’s AI output.

## Local models (Ollama)

If Chrome Nano is not available, install [Ollama](https://ollama.com) on this Mac, then:

```
ollama pull llama3.1
ollama serve
```

In Options set Ollama URL to `http://127.0.0.1:11434`. Remote URLs are rejected. The ticket is sent only to that loopback address.

## Optional local backend

You usually do **not** need this. Generate already runs inside Chrome.

To run summaries in a separate local Node process instead:

```
cd "/Users/Omri-Arbitrip/Desktop/zendesk-sidepanel-extension/backend"
npm start
```

That listens on `http://127.0.0.1:8787` only. Ticket JSON never leaves this machine.

## Permissions (least privilege)

**Always granted**

- `sidePanel`, `activeTab`, `scripting`, `storage`
- `host_permissions`: Zendesk workspace + `http://127.0.0.1:11434/*` and `http://localhost:11434/*` (Ollama on this computer)

**Optional**

- Other `localhost` / `127.0.0.1` ports, requested only if you save a different local Ollama URL in Options.

## Enterprise install (not Web Store)

This is an internal/enterprise extension. Do not submit it to the public Chrome Web Store.

After you pin a version (packed `.crx` + update URL, or an internal file share):

- Policy **ExtensionInstallForcelist**: `<extension-id>;<update-url>`
- Grant the backend origin via **ExtensionSettings** `runtime_allowed_hosts` / equivalent so agents are not prompted for host permission, **or** keep the Options prompt for first-time setup.

Unpacked testing does not need policy. The extension id is assigned when Chrome first loads the unpacked folder (`chrome://extensions` → Details).

## Non-goals

- No Zendesk REST, Sunshine, or App/iframe embedding
- No auto-send or auto-insert into the Zendesk composer
- No sending ticket data to OpenAI or other public AI APIs
- No public Web Store packaging or review flow
