/**
 * Local-only backend for the Arbitrip Zendesk Copilot.
 * Summarizes the extracted ticket on this machine. Does not call OpenAI
 * or any other remote AI provider. No API key.
 *
 *   GET  /health      → { ok: true, mode: "local" }
 *   POST /summarize   → { summary, drafts }
 */

import http from 'node:http';
import { summarizeTicket } from './summarize.js';

const PORT = Number(process.env.PORT || 8787);

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

function readBody(req, limitBytes = 1_500_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, mode: 'local', configured: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/summarize') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, err.message === 'payload_too_large' ? 413 : 400, {
        error: 'bad_request',
        message: 'Could not read the request body.',
      });
      return;
    }

    let parsed;
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      sendJson(res, 400, { error: 'bad_request', message: 'Body must be JSON.' });
      return;
    }

    const ticket = parsed.ticket;
    if (!ticket || typeof ticket !== 'object') {
      sendJson(res, 400, { error: 'bad_request', message: 'Expected JSON { "ticket": { ... } }.' });
      return;
    }

    console.info(`[summarize] local ticket ${ticket.id || 'unknown'} (not sent to any AI provider)`);
    sendJson(res, 200, summarizeTicket(ticket));
    return;
  }

  sendJson(res, 404, { error: 'not_found', message: 'Use GET /health or POST /summarize.' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.info(`Arbitrip copilot backend on http://127.0.0.1:${PORT}`);
  console.info('Mode: local only — no OpenAI, no API key, ticket data stays on this machine.');
  console.info('You can also leave the extension Options URL empty; the extension summarizes on-device by itself.');
});
