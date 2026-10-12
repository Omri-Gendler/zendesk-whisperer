# Zendesk Whisperer

A Chrome extension that reads the open Zendesk ticket and writes a short internal note and reply drafts.
It runs on your own computer: Chrome's built-in AI, a local Ollama model, or simple rules as a fallback.

## Features

- Side panel next to the Zendesk ticket
- Reads the ticket subject and messages from the page
- Summary in our internal note format (order, supplier, description, actions, follow-up)
- Reply drafts for the guest, and for the hotel or supplier when needed
- Copy buttons. Nothing is sent or written into Zendesk automatically

## Tech stack

- JavaScript, HTML and CSS (no framework, no build step)
- Chrome Extension Manifest V3 (side panel, content script, service worker)
- Chrome built-in AI (Gemini Nano) or [Ollama](https://ollama.com)

## Installation

1. Clone this repo
2. Open `chrome://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and choose this folder
4. Open a ticket on arbitrip-support.zendesk.com and click the extension icon

### Ollama (optional)

```bash
ollama pull llama3.1
launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
```

Restart Ollama after setting `OLLAMA_ORIGINS`, because Ollama blocks Chrome extensions without it.
Chrome's built-in AI works best in English, so for Hebrew tickets turn it off in the extension options.
