#!/usr/bin/env node
import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { PORTS, POLL_INTERVAL } from './config.js';
import { getJson } from './utils/http.js';
import { hashString } from './utils/hashing.js';

// TODO feature-app-bootstrap: Remove global state. Pass these dependencies via dependency injection or a context object.
// Shared CDP connection
let cdpConnection = null;
let lastSnapshot = null;
let lastSnapshotHash = null;

// TODO feature-cdp-service: Create a CdpDiscoveryService class responsible for finding the debug port.
// TODO feature-cdp-service: Write unit tests for CdpDiscoveryService.
// Find Antigravity CDP endpoint
async function discoverCDP() {
  for (const port of PORTS) {
    try {
      const list = await getJson(`http://127.0.0.1:${port}/json/list`);
      // Look for workbench specifically (where #cascade exists, which has the chat)
      const found = list.find(
        (t) =>
          t.url?.includes('workbench.html') ||
          (t.title && t.title.includes('workbench')),
      );
      if (found && found.webSocketDebuggerUrl) {
        return { port, url: found.webSocketDebuggerUrl };
      }
    } catch (_e) {
      // Ignore connection errors during discovery
    }
  }
  throw new Error(
    'CDP not found. Is Antigravity started with --remote-debugging-port=9000?',
  );
}

// TODO feature-cdp-service: Create a CdpClient class to encapsulate the WebSocket connection and JSON-RPC protocol.
// TODO feature-cdp-service: Implement proper error handling and reconnection logic within the CdpClient.
// TODO feature-cdp-service: Write unit tests for CdpClient.
// Connect to CDP
async function connectCDP(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  let idCounter = 1;
  const call = (method, params) =>
    new Promise((resolve, reject) => {
      const id = idCounter++;
      const handler = (msg) => {
        const data = JSON.parse(msg);
        if (data.id === id) {
          ws.off('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const contexts = [];
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.method === 'Runtime.executionContextCreated') {
        contexts.push(data.params.context);
      }
    } catch (_e) {
      // Ignore parse errors from non-JSON messages if any
    }
  });

  await call('Runtime.enable', {});
  await new Promise((r) => setTimeout(r, 1000));

  return { ws, call, contexts };
}

// TODO feature-snapshot-service: Create a SnapshotService class.
// TODO feature-snapshot-service: Extract the browser-side script into a separate file (e.g., src/scripts/capture.js) for better readability and potentially testing (even if just syntax checking).
// TODO feature-snapshot-service: Write unit tests for SnapshotService, mocking the CDP connection.
// Capture chat snapshot
async function captureSnapshot(cdp) {
  const CAPTURE_SCRIPT = `(() => {
        const cascade = document.getElementById('cascade');
        if (!cascade) return { error: 'cascade not found' };
        
        const cascadeStyles = window.getComputedStyle(cascade);
        
        // Clone cascade to modify it without affecting the original
        const clone = cascade.cloneNode(true);
        
        // Remove the input box / chat window (last direct child div containing contenteditable)
        const inputContainer = clone.querySelector('[contenteditable="true"]')?.closest('div[id^="cascade"] > div');
        if (inputContainer) {
            inputContainer.remove();
        }
        
        const html = clone.outerHTML;
        
        let allCSS = '';
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    allCSS += rule.cssText + '\\n';
                }
            } catch (e) { }
        }
        
        return {
            html: html,
            css: allCSS,
            backgroundColor: cascadeStyles.backgroundColor,
            color: cascadeStyles.color,
            fontFamily: cascadeStyles.fontFamily
        };
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const result = await cdp.call('Runtime.evaluate', {
        expression: CAPTURE_SCRIPT,
        returnByValue: true,
        contextId: ctx.id,
      });

      if (result.result && result.result.value) {
        return result.result.value;
      }
    } catch (_e) {
      // Continue to next context on failure
    }
  }

  return null;
}

// TODO feature-injection-service: Create a MessageInjectionService class.
// TODO feature-injection-service: Extract the browser-side script into a separate file (e.g., src/scripts/inject.js).
// TODO feature-injection-service: Write unit tests for MessageInjectionService, mocking the CDP connection.
// Inject message into Antigravity
async function injectMessage(cdp, text) {
  const EXPRESSION = `(async () => {
        const cancel = document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]');
        if (cancel && cancel.offsetParent !== null) return { ok:false, reason:"busy" };

        const editors = [...document.querySelectorAll('#cascade [data-lexical-editor="true"][contenteditable="true"][role="textbox"]')]
            .filter(el => el.offsetParent !== null);
        const editor = editors.at(-1);
        if (!editor) return { ok:false, error:"editor_not_found" };

        editor.focus();
        document.execCommand?.("selectAll", false, null);
        document.execCommand?.("delete", false, null);

        let inserted = false;
        try { inserted = !!document.execCommand?.("insertText", false, "${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"); } catch {}
        if (!inserted) {
            editor.textContent = "${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}";
            editor.dispatchEvent(new InputEvent("beforeinput", { bubbles:true, inputType:"insertText", data:"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }));
            editor.dispatchEvent(new InputEvent("input", { bubbles:true, inputType:"insertText", data:"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" }));
        }

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const submit = document.querySelector("svg.lucide-arrow-right")?.closest("button");
        if (submit && !submit.disabled) {
            submit.click();
            return { ok:true, method:"click_submit" };
        }

        // Submit button not found, but text is inserted - trigger Enter key
        editor.dispatchEvent(new KeyboardEvent("keydown", { bubbles:true, key:"Enter", code:"Enter" }));
        editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles:true, key:"Enter", code:"Enter" }));
        
        return { ok:true, method:"enter_keypress" };
    })()`;

  for (const ctx of cdp.contexts) {
    try {
      const result = await cdp.call('Runtime.evaluate', {
        expression: EXPRESSION,
        returnByValue: true,
        awaitPromise: true,
        contextId: ctx.id,
      });

      if (result.result && result.result.value) {
        return result.result.value;
      }
    } catch (_e) {
      // Continue to next context on failure
    }
  }

  return { ok: false, reason: 'no_context' };
}

// TODO feature-app-bootstrap: This should be part of the main application start sequence, not a standalone function.
// Initialize CDP connection
async function initCDP() {
  console.log('🔍 Discovering VS Code CDP endpoint...');
  const cdpInfo = await discoverCDP();
  console.log(`✅ Found VS Code on port ${cdpInfo.port}`);

  console.log('🔌 Connecting to CDP...');
  cdpConnection = await connectCDP(cdpInfo.url);
  console.log(
    `✅ Connected! Found ${cdpConnection.contexts.length} execution contexts\n`,
  );
}

// TODO feature-polling-manager: Create a PollingManager or BackgroundJobService to handle periodic tasks.
// TODO feature-polling-manager: Write unit tests for PollingManager.
// Background polling
async function startPolling(wss) {
  setInterval(async () => {
    if (!cdpConnection) return;

    try {
      const snapshot = await captureSnapshot(cdpConnection);
      if (snapshot && !snapshot.error) {
        const hash = hashString(snapshot.html);

        // Only update if content changed
        if (hash !== lastSnapshotHash) {
          lastSnapshot = snapshot;
          lastSnapshotHash = hash;

          // Broadcast to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'snapshot_update',
                  timestamp: new Date().toISOString(),
                }),
              );
            }
          });

          console.log(`📸 Snapshot updated (hash: ${hash})`);
        }
      }
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  }, POLL_INTERVAL);
}

// TODO feature-http-layer: Extract Express app creation into src/app.js.
// TODO feature-http-layer: Add tests for HTTP endpoints (e.g. using supertest).
// TODO feature-websocket-layer: Extract WebSocket logic into a WebSocketController or similar.
// TODO feature-websocket-layer: Add tests for WebSocket logic.
// Create Express app
async function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());
  app.use(express.static(join(__dirname, '../public')));

  // Get current snapshot
  app.get('/snapshot', (req, res) => {
    if (!lastSnapshot) {
      return res.status(503).json({ error: 'No snapshot available yet' });
    }
    res.json(lastSnapshot);
  });

  // Send message
  app.post('/send', async (req, res) => {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    if (!cdpConnection) {
      return res.status(503).json({ error: 'CDP not connected' });
    }

    const result = await injectMessage(cdpConnection, message);

    if (result.ok) {
      res.json({ success: true, method: result.method });
    } else {
      res.status(500).json({ success: false, reason: result.reason });
    }
  });

  // WebSocket connection
  wss.on('connection', (ws) => {
    console.log('📱 Client connected');

    ws.on('close', () => {
      console.log('📱 Client disconnected');
    });
  });

  return { server, wss };
}

// TODO feature-app-bootstrap: Refactor into a clean composition root.
// Main
async function main() {
  try {
    await initCDP();

    const { server, wss } = await createServer();

    // Start background polling
    startPolling(wss);

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📱 Access from mobile: http://<your-ip>:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
