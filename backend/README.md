# Optional local backend

This server **does not call OpenAI**. It does not need an API key. Ticket JSON never leaves this machine (`127.0.0.1`).

You usually **do not need this process**. The Chrome extension already summarizes **on-device**.

Use it only if you want summaries to run in a separate local Node process instead of inside Chrome.

```bash
cd "/Users/Omri-Arbitrip/Desktop/zendesk-sidepanel-extension/backend"
npm start
```

That starts `http://127.0.0.1:8787`. Leave the extension Options URL empty to keep everything inside the extension (recommended).
