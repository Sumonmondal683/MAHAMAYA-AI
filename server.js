"use strict";
/* ==========================================================================
   মহামায়া AI — গ্যালারি সার্ভার (কোনো npm প্যাকেজ লাগে না, শুধু Node.js 18+)
   চালান:  ADMIN_PASSWORD="কমপক্ষে-১০-অক্ষরের-পাসওয়ার্ড" node server.js
   ========================================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ---------- config ---------- */
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PROD = process.env.NODE_ENV === "production";
const TRUST_PROXY = process.env.TRUST_PROXY === "1"; // Render/Railway/Nginx-এর পেছনে চালালে 1 দিন
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const UP_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "gallery.json");
const CROWD_FILE = path.join(DATA_DIR, "crowd.json");

const MAX_BYTES = 3 * 1024 * 1024;     // একটি ছবির সর্বোচ্চ সাইজ (ক্লায়েন্ট আগেই ছোট করে পাঠায়)
const MAX_PENDING = 200;               // অপেক্ষমাণ ছবি এর বেশি জমলে নতুন আপলোড বন্ধ (ডিস্ক ভরে যাওয়া ঠেকাতে)
const UPLOADS_PER_HOUR = 5;            // প্রতি IP থেকে ঘণ্টায় সর্বোচ্চ আপলোড
const MAX_CAPTION = 120;
const SESSION_MS = 8 * 3600 * 1000;
const LOGIN_MAX_FAILS = 5, LOGIN_LOCK_MS = 15 * 60 * 1000;

if (ADMIN_PASSWORD.length < 10) {
  console.error("ADMIN_PASSWORD সেট করা নেই বা ১০ অক্ষরের কম। উদাহরণ:\n  ADMIN_PASSWORD='আপনার-শক্ত-পাসওয়ার্ড' node server.js");
  process.exit(1);
}

fs.mkdirSync(UP_DIR, { recursive: true });

/* ---------- tiny JSON "database" ---------- */
// ছবি হারানোর আসল কারণ ঠেকাতে: ডাটাবেস ফাইল পড়া না গেলে কখনোই খালি তালিকা দিয়ে ওভাররাইট করা হয় না।
let items = [];
let dbReadFailed = false;
function loadDb() {
  let raw = null;
  try { raw = fs.readFileSync(DB_FILE, "utf8"); }
  catch (e) { if (e.code !== "ENOENT") { dbReadFailed = true; console.error("gallery.json পড়া যায়নি:", e.message); } }
  if (raw !== null) {
    try {
      const j = JSON.parse(raw);
      if (!Array.isArray(j)) throw new Error("not an array");
      items = j;
    } catch (e) {
      dbReadFailed = true;
      const bak = DB_FILE + ".corrupt-" + Date.now();
      try { fs.copyFileSync(DB_FILE, bak); } catch (e2) { /* ignore */ }
      console.error("gallery.json নষ্ট ছিল, কপি রাখা হলো: " + bak + " (" + e.message + ")");
      // .tmp ফাইল থেকে উদ্ধারের চেষ্টা
      try { const j = JSON.parse(fs.readFileSync(DB_FILE + ".tmp", "utf8")); if (Array.isArray(j)) { items = j; dbReadFailed = false; console.error("tmp ফাইল থেকে উদ্ধার হয়েছে।"); } } catch (e3) { /* none */ }
    }
  }
  // ডিস্কে ছবি আছে কিন্তু তালিকায় নেই (আগে তালিকা হারালে এমন হয়) → অপেক্ষমাণ হিসেবে ফিরিয়ে আনা
  try {
    const known = new Set(items.map((x) => x.id));
    for (const f of fs.readdirSync(UP_DIR)) {
      const m = /^([a-f0-9]{24})\.jpg$/.exec(f);
      if (m && !known.has(m[1])) {
        const st = fs.statSync(path.join(UP_DIR, f));
        items.push({ id: m[1], caption: "", status: "pending", createdAt: st.mtimeMs, approvedAt: 0 });
        console.error("তালিকায় ছিল না, উদ্ধার করা হলো (অপেক্ষমাণ): " + f);
      }
    }
  } catch (e) { /* ignore */ }
}
loadDb();

/* ---------- shared crowd reports (persistent JSON store) ---------- */
let crowdReports = [];
try {
  const rawCrowd = fs.readFileSync(CROWD_FILE, "utf8");
  const parsedCrowd = JSON.parse(rawCrowd);
  if (Array.isArray(parsedCrowd)) crowdReports = parsedCrowd.filter((r) =>
    r && typeof r.pid === "string" && Number.isInteger(r.lvl) &&
    r.lvl >= 0 && r.lvl <= 3 && [0, 15, 30, 60, 90, 120, 180].includes(r.wait) &&
    Number.isFinite(r.t));
} catch (e) {
  if (e.code !== "ENOENT") console.error("crowd.json পড়া যায়নি:", e.message);
}
function saveCrowd() {
  const tmp = CROWD_FILE + ".tmp";
  const fd = fs.openSync(tmp, "w");
  try { fs.writeSync(fd, JSON.stringify(crowdReports)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(tmp, CROWD_FILE);
}
const crowdCooldowns = new Map();

const missing = items.filter((x) => !fs.existsSync(path.join(UP_DIR, x.id + ".jpg"))).length;
if (missing) console.error(`সতর্কতা: ${missing}টি ছবির ফাইল ডিস্কে নেই। হোস্টিংয়ে স্থায়ী ডিস্ক না থাকলে এমন হয় — DATA_DIR একটি persistent volume-এ দিন।`);
if (PROD && !process.env.DATA_DIR) console.error("সতর্কতা: production-এ DATA_DIR সেট করা নেই। ডেটা-ফোল্ডার: " + DATA_DIR + " — এটি স্থায়ী ডিস্কে না থাকলে রিস্টার্ট/ডিপ্লয়ে সব ছবি মুছে যাবে!");
console.log("ডেটা-ফোল্ডার: " + DATA_DIR + " | ছবি: " + items.length + "টি");
function save() {
  if (dbReadFailed && !items.length) return; // নষ্ট ফাইলের উপর খালি তালিকা বসানো হবে না
  const tmp = DB_FILE + ".tmp";
  const fd = fs.openSync(tmp, "w");
  try { fs.writeSync(fd, JSON.stringify(items)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, DB_FILE); // atomic
  dbReadFailed = false;
}
const ID_RE = /^[a-f0-9]{24}$/;
const find = (id) => (ID_RE.test(id) ? items.find((x) => x.id === id) : null);

/* ---------- helpers ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
const STATIC = {
  "/": "index.html", "/index.html": "index.html", "/script.js": "script.js", "/extras.js": "extras.js",
  "/dataset.js": "dataset.js", "/dataset.json": "dataset.json", "/gallery.js": "gallery.js", "/gallery.css": "gallery.css",
  "/admin": "admin.html", "/admin.js": "admin.js",
  "/crowd.js": "crowd.js", "/crowd-config.js": "crowd-config.js", "/crowd-hook.js": "crowd-hook.js",
};
const CSP_PAGE = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
  "img-src 'self' data: blob:; connect-src 'self' https:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const CSP_ADMIN = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function baseHeaders(extra) {
  const h = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "geolocation=(self), microphone=(self), camera=()",
  };
  if (PROD) h["Strict-Transport-Security"] = "max-age=31536000";
  return Object.assign(h, extra);
}
function send(res, status, body, headers) {
  res.writeHead(status, baseHeaders(headers));
  res.end(body);
}
function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
}
const fail = (res, status, code) => json(res, status, { ok: false, error: code });

function clientIP(req) {
  if (TRUST_PROXY) {
    const xff = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (xff.length) return xff[xff.length - 1]; // proxy-র যোগ করা শেষ এন্ট্রি, যা ক্লায়েন্ট জাল করতে পারে না
  }
  return req.socket.remoteAddress || "unknown";
}

/* sliding-window rate limit */
const hits = new Map();
function allow(key, limit, windowMs) {
  const now = Date.now(), arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
const fails = new Map(); // ip → {n, until}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) { const a = v.filter((t) => now - t < 3600e3); a.length ? hits.set(k, a) : hits.delete(k); }
  for (const [k, v] of fails) if (v.until < now && now - (v.last || 0) > LOGIN_LOCK_MS) fails.delete(k);
  for (const [k, v] of sessions) if (v < now) sessions.delete(k);
}, 10 * 60 * 1000).unref();

/* ---------- admin sessions ---------- */
const sessions = new Map(); // token → expiry
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
function isAdmin(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "");
  if (!m) return false;
  const exp = sessions.get(m[1]);
  if (!exp || exp < Date.now()) { sessions.delete(m[1]); return false; }
  return true;
}
function cookie(value, maxAge) {
  return `sid=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}` + (PROD ? "; Secure" : "");
}

/* ---------- request body ---------- */
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers["content-length"]);
    if (len > max) return reject(Object.assign(new Error("big"), { status: 413 }));
    const chunks = []; let n = 0, big = false;
    req.on("data", (c) => { n += c.length; if (n > max) { big = true; chunks.length = 0; } else if (!big) chunks.push(c); });
    req.on("end", () => (big ? reject(Object.assign(new Error("big"), { status: 413 })) : resolve(Buffer.concat(chunks))));
    req.on("error", reject);
  });
}

/* POST রিকোয়েস্ট শুধু নিজের সাইট থেকে (cross-site ফর্ম/স্ক্রিপ্ট আটকাতে) */
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}

const cleanCaption = (s) => Array.from(String(s).normalize("NFC").replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()).slice(0, MAX_CAPTION).join("");

/* ---------- routes ---------- */
async function handle(req, res) {
  let url;
  try { url = new URL(req.url, "http://localhost"); } catch (e) { return fail(res, 400, "bad_url"); }
  const p = url.pathname, method = req.method;

  /* --- public: shared crowd tracker --- */
  if (p === "/api/crowd" && method === "GET") {
    const requested = Number(url.searchParams.get("since")) || (Date.now() - 2 * 3600e3);
    const since = Math.max(Date.now() - 2 * 3600e3, Math.min(Date.now(), requested));
    const list = crowdReports.filter((r) => r.t >= since).slice(-2000);
    return json(res, 200, { ok: true, items: list });
  }
  if (p === "/api/crowd" && method === "POST") {
    if (!sameOrigin(req)) return fail(res, 403, "origin");
    const ip = clientIP(req);
    if (!allow("crowd:" + ip, 20, 3600e3)) return fail(res, 429, "rate");
    let r;
    try { r = JSON.parse((await readBody(req, 4096)).toString("utf8")); }
    catch (e) { return fail(res, 400, "bad_json"); }
    const pid = typeof r.pid === "string" ? r.pid : "";
    const lvl = r.lvl, wait = r.wait;
    const city = typeof r.city === "string" && /^[a-z]{3}$/.test(r.city) ? r.city : "oth";
    const name = typeof r.name === "string"
      ? cleanCaption(r.name).slice(0, 40) : "";
    if (!/^[\p{L}\p{N}:-]{1,120}$/u.test(pid) || !Number.isInteger(lvl) || lvl < 0 || lvl > 3 ||
        ![0, 15, 30, 60, 90, 120, 180].includes(wait) ||
        (pid.startsWith("c:") && name.length < 2)) return fail(res, 400, "invalid_report");
    const cooldownKey = ip + ":" + pid, last = crowdCooldowns.get(cooldownKey) || 0;
    if (Date.now() - last < 15 * 60e3) return fail(res, 429, "cooldown");
    const report = { pid, lvl, wait, t: Date.now() };
    if (pid.startsWith("c:")) { report.name = name; report.city = city; }
    crowdReports.push(report);
    const cutoff = Date.now() - 24 * 3600e3;
    crowdReports = crowdReports.filter((x) => x.t >= cutoff).slice(-10000);
    saveCrowd();
    crowdCooldowns.set(cooldownKey, Date.now());
    return json(res, 201, { ok: true });
  }

  /* --- public: approved list --- */
  if (p === "/api/gallery" && method === "GET") {
    const list = items.filter((x) => x.status === "approved")
      .sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0)).slice(0, 120)
      .map((x) => ({ id: x.id, caption: x.caption, t: x.approvedAt }));
    return json(res, 200, { ok: true, items: list });
  }

  /* --- public: submit a photo --- */
  if (p === "/api/gallery" && method === "POST") {
    if (!sameOrigin(req)) return fail(res, 403, "origin");
    const ip = clientIP(req);
    if (!allow("up:" + ip, UPLOADS_PER_HOUR, 3600e3)) return fail(res, 429, "rate");
    if (items.filter((x) => x.status === "pending").length >= MAX_PENDING) return fail(res, 503, "queue_full");
    const ct = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (ct !== "image/jpeg") return fail(res, 415, "type");
    const capHeader = String(req.headers["x-caption"] || "");
    if (capHeader.length > 2000) return fail(res, 400, "caption");
    let caption = "";
    try { caption = cleanCaption(decodeURIComponent(capHeader)); } catch (e) { return fail(res, 400, "caption"); }
    let buf;
    try { buf = await readBody(req, MAX_BYTES); } catch (e) { return fail(res, e.status || 400, "size"); }
    // ম্যাজিক বাইট + শেষ মার্কার যাচাই — ফাইলটা সত্যিই JPEG কি না
    if (buf.length < 1024 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return fail(res, 415, "type");
    const id = crypto.randomBytes(12).toString("hex");
    fs.writeFileSync(path.join(UP_DIR, id + ".jpg"), buf, { flag: "wx", mode: 0o600 });
    items.push({ id, caption, status: "pending", createdAt: Date.now(), approvedAt: 0 });
    save();
    return json(res, 201, { ok: true });
  }

  /* --- public: approved image file --- */
  let m = /^\/img\/([a-f0-9]{24})$/.exec(p);
  if (m && method === "GET") {
    const it = find(m[1]);
    if (!it || it.status !== "approved") return fail(res, 404, "not_found");
    return sendImage(res, it, "public, max-age=3600");
  }

  /* --- admin API --- */
  if (p.startsWith("/api/admin/")) {
    if (p === "/api/admin/login" && method === "POST") {
      if (!sameOrigin(req)) return fail(res, 403, "origin");
      const ip = clientIP(req), f = fails.get(ip) || { n: 0, until: 0 };
      if (f.until > Date.now()) return fail(res, 429, "locked");
      let body; try { body = JSON.parse((await readBody(req, 2048)).toString("utf8")); } catch (e) { return fail(res, 400, "bad_json"); }
      const ok = typeof body.password === "string" && crypto.timingSafeEqual(sha(body.password), sha(ADMIN_PASSWORD));
      if (!ok) {
        f.n++; f.last = Date.now(); if (f.n >= LOGIN_MAX_FAILS) { f.until = Date.now() + LOGIN_LOCK_MS; f.n = 0; }
        fails.set(ip, f);
        await new Promise((r) => setTimeout(r, 600)); // brute-force ধীর করতে
        return fail(res, 401, "bad_password");
      }
      fails.delete(ip);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, Date.now() + SESSION_MS);
      res.writeHead(200, baseHeaders({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": cookie(token, SESSION_MS / 1000) }));
      return res.end('{"ok":true}');
    }

    if (!isAdmin(req)) return fail(res, 401, "auth");

    if (method === "POST") { // CSRF-এর অতিরিক্ত বাধা: কাস্টম হেডার + একই origin
      if (!sameOrigin(req) || req.headers["x-requested-with"] !== "mahamaya-admin") return fail(res, 403, "csrf");
    }

    if (p === "/api/admin/logout" && method === "POST") {
      const t = /sid=([a-f0-9]{64})/.exec(req.headers.cookie || ""); if (t) sessions.delete(t[1]);
      res.writeHead(200, baseHeaders({ "Content-Type": "application/json; charset=utf-8", "Set-Cookie": cookie("", 0) }));
      return res.end('{"ok":true}');
    }
    if (p === "/api/admin/items" && method === "GET") {
      const list = items.slice().sort((a, b) => b.createdAt - a.createdAt).map((x) => ({ id: x.id, caption: x.caption, status: x.status, createdAt: x.createdAt, approvedAt: x.approvedAt }));
      return json(res, 200, { ok: true, items: list });
    }
    m = /^\/api\/admin\/img\/([a-f0-9]{24})$/.exec(p);
    if (m && method === "GET") {
      const it = find(m[1]); if (!it) return fail(res, 404, "not_found");
      return sendImage(res, it, "private, no-store");
    }
    if (p === "/api/admin/action" && method === "POST") {
      let b; try { b = JSON.parse((await readBody(req, 2048)).toString("utf8")); } catch (e) { return fail(res, 400, "bad_json"); }
      const it = find(String(b.id || ""));
      if (!it) return fail(res, 404, "not_found");
      if (b.action === "approve") { it.status = "approved"; it.approvedAt = Date.now(); }
      else if (b.action === "unpublish") { it.status = "pending"; it.approvedAt = 0; }
      else if (b.action === "delete") {
        try { fs.unlinkSync(path.join(UP_DIR, it.id + ".jpg")); } catch (e) { /* already gone */ }
        items = items.filter((x) => x !== it);
      } else return fail(res, 400, "bad_action");
      save();
      return json(res, 200, { ok: true });
    }
    return fail(res, 404, "not_found");
  }

  /* --- static files (শুধু তালিকাভুক্ত ফাইল; data/ বা server.js কখনো দেওয়া হয় না) --- */
  if ((method === "GET" || method === "HEAD") && STATIC[p]) {
    const file = path.join(ROOT, STATIC[p]);
    let data; try { data = fs.readFileSync(file); } catch (e) { return fail(res, 404, "not_found"); }
    const isHtml = file.endsWith(".html");
    const h = { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" };
    if (isHtml) h["Content-Security-Policy"] = STATIC[p] === "admin.html" ? CSP_ADMIN : CSP_PAGE;
    if (STATIC[p] === "admin.html") h["X-Robots-Tag"] = "noindex, nofollow";
    return send(res, 200, method === "HEAD" ? undefined : data, h);
  }
  return fail(res, method === "GET" ? 404 : 405, "not_found");
}

function sendImage(res, it, cache) {
  fs.readFile(path.join(UP_DIR, it.id + ".jpg"), (err, data) => {
    if (err) return fail(res, 404, "not_found");
    send(res, 200, data, {
      "Content-Type": "image/jpeg", "Cache-Control": cache,
      "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline",
    });
  });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => { console.error(err); if (!res.headersSent) fail(res, 500, "server"); else res.end(); });
});
server.headersTimeout = 15000; server.requestTimeout = 30000; server.maxHeadersCount = 60;
server.listen(PORT, HOST, () => console.log(`মহামায়া AI চালু: http://localhost:${PORT}   (অ্যাডমিন: /admin)`));
