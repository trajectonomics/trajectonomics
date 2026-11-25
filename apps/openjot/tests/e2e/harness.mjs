// Shared plumbing for the browser tests in tests/. Zero dependencies: serves
// build/ with node:http, launches headless Chrome and talks to it over the
// Chrome DevTools Protocol with Node's built-in WebSocket.
//
// Env: CHROME_BIN=/path/to/chrome (default: google-chrome / chromium on PATH)

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const BUILD_DIR = join(ROOT, "build");

export function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

// Runs `vite build`. Returns true when build/ is ready.
export function buildApp() {
  const vite = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const result = spawnSync(process.execPath, [vite, "build", "--logLevel", "error"], { cwd: ROOT, stdio: "inherit" });
  return result.status === 0;
}

// ---------------------------------------------------------------- browser ---

export function findChrome() {
  if (process.env.CHROME_BIN) {
    return existsSync(process.env.CHROME_BIN) ? process.env.CHROME_BIN : null;
  }
  const names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (dir && existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function launchChrome(bin, extraArgs = []) {
  const profile = mkdtempSync(join(tmpdir(), "moojot-e2e-"));
  const proc = spawn(
    bin,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--hide-scrollbars",
      "--mute-audio",
      ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []),
      ...extraArgs,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const endpoint = new Promise((resolveEndpoint, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`Chrome did not start:\n${stderr}`)), 20000);
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolveEndpoint(match[1]);
      }
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (code ${code}):\n${stderr}`));
    });
  });
  const close = () => {
    proc.kill("SIGKILL");
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome may still hold files for a moment; the temp dir is harmless.
    }
  };
  return { endpoint, close };
}

export class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: ok, reject, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else ok(msg.result);
      } else if (msg.method) {
        for (const listener of this.listeners) listener(msg);
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((ok, reject) => {
      ws.addEventListener("open", ok, { once: true });
      ws.addEventListener("error", () => reject(new Error(`Cannot connect to ${url}`)), { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((ok, reject) => this.pending.set(id, { resolve: ok, reject, method }));
  }

  waitFor(method, sessionId, timeoutMs = 15000) {
    return new Promise((ok, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const listener = (msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter((l) => l !== listener);
          ok(msg.params);
        }
      };
      this.listeners.push(listener);
    });
  }

  close() {
    this.ws.close();
  }
}

// ----------------------------------------------------------------- server ---

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

export function serveBuild() {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = normalize(join(BUILD_DIR, pathname));
    if (!file.startsWith(BUILD_DIR + sep) && file !== BUILD_DIR) {
      res.writeHead(403).end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(BUILD_DIR, "index.html");
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => {
    server.listen(0, "127.0.0.1", () => ok({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
