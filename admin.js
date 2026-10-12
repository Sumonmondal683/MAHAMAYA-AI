"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const BN = "০১২৩৪৫৬৭৮৯", toBn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
  let items = [], tab = "pending";

  const say = (t) => { $("msg").textContent = t || ""; };
  async function api(path, opt) {
    opt = opt || {};
    const r = await fetch(path, Object.assign({}, opt, { headers: Object.assign({ "X-Requested-With": "mahamaya-admin" }, opt.headers || {}) }));
    let j = null; try { j = await r.json(); } catch (e) { /* not json */ }
    return { r, j };
  }
  const post = (path, obj) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

  function showLogin() { $("login").hidden = false; $("panel").hidden = true; $("pw").focus(); }
  function showPanel() { $("login").hidden = true; $("panel").hidden = false; }

  async function load() {
    const { r, j } = await api("/api/admin/items");
    if (r.status === 401) return showLogin();
    if (!j || !j.ok) return say("তালিকা আনা যায়নি।");
    items = j.items; showPanel(); render();
  }

  function render() {
    const pend = items.filter((x) => x.status === "pending"), appr = items.filter((x) => x.status === "approved");
    $("tabPending").textContent = `অপেক্ষমাণ (${toBn(pend.length)})`;
    $("tabApproved").textContent = `অনুমোদিত (${toBn(appr.length)})`;
    $("tabPending").setAttribute("aria-selected", tab === "pending"); $("tabApproved").setAttribute("aria-selected", tab === "approved");
    const list = $("list"); list.textContent = "";
    const show = tab === "pending" ? pend : appr;
    if (!show.length) { const p = document.createElement("p"); p.className = "sub"; p.textContent = tab === "pending" ? "কোনও ছবি অপেক্ষায় নেই।" : "এখনও কোনও ছবি অনুমোদিত নেই।"; list.append(p); return; }
    show.forEach((it) => list.append(card(it)));
  }

  function btn(label, cls, fn) { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = label; b.onclick = fn; return b; }

  function card(it) {
    const d = document.createElement("div"); d.className = "item";
    const a = document.createElement("a"); a.href = `/api/admin/img/${it.id}`; a.target = "_blank"; a.rel = "noopener noreferrer";
    const im = document.createElement("img"); im.loading = "lazy"; im.src = `/api/admin/img/${it.id}`; im.alt = it.caption || "ছবি"; a.append(im);
    const body = document.createElement("div"); body.className = "body";
    const cap = document.createElement("div"); cap.className = "cap" + (it.caption ? "" : " none"); cap.textContent = it.caption || "(ক্যাপশন নেই)";
    const when = document.createElement("small"); when.textContent = new Date(it.createdAt).toLocaleString("bn-IN");
    const acts = document.createElement("div"); acts.className = "acts";
    if (it.status === "pending") acts.append(btn("✅ অনুমোদন", "ok", () => act(it.id, "approve")));
    else acts.append(btn("লুকান", "", () => act(it.id, "unpublish")));
    acts.append(btn("🗑️ মুছুন", "bad", () => { if (confirm("ছবিটি চিরতরে মুছে ফেলবেন?")) act(it.id, "delete"); }));
    body.append(cap, when, acts); d.append(a, body);
    return d;
  }

  async function act(id, action) {
    say("");
    const { r, j } = await post("/api/admin/action", { id, action });
    if (r.status === 401) return showLogin();
    if (!j || !j.ok) return say("কাজটি করা যায়নি।");
    load();
  }

  async function login() {
    const pw = $("pw").value; if (!pw) return;
    $("loginBtn").disabled = true; say("");
    const { r, j } = await post("/api/admin/login", { password: pw });
    $("loginBtn").disabled = false;
    if (r.ok && j && j.ok) { $("pw").value = ""; return load(); }
    say(r.status === 429 ? "অনেকবার ভুল হয়েছে। ১৫ মিনিট পরে আবার চেষ্টা করুন।" : "পাসওয়ার্ড ঠিক নয়।");
  }

  $("loginBtn").onclick = login;
  $("pw").onkeydown = (e) => { if (e.key === "Enter") login(); };
  $("tabPending").onclick = () => { tab = "pending"; render(); };
  $("tabApproved").onclick = () => { tab = "approved"; render(); };
  $("logoutBtn").onclick = async () => { await post("/api/admin/logout", {}); items = []; showLogin(); };
  load();
})();
