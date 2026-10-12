"use strict";
/* ==========================================================================
   মহামায়া AI — গ্যালারি: শুধু অ্যাডমিন-অনুমোদিত ছবি দেখায়; ছবি পাঠানোর ফর্ম আছে
   Uses App, el from script.js. Needs server.js running (see README-gallery.md)
   ========================================================================== */
(() => {
  const A = App;
  const API = String(window.GALLERY_API || "").replace(/\/$/, "");

  /* ---------- strings (Banglish is derived from Bengali automatically) ---------- */
  A.addUI("bn", {
    g_title: "পূজার গ্যালারি", g_loading: "ছবি আনা হচ্ছে…", g_empty: "এখনও কোনও ছবি অনুমোদিত হয়নি। আপনিই প্রথম ছবি পাঠান!",
    g_down: "গ্যালারি সার্ভার এখন চালু নেই। একটু পরে আবার চেষ্টা করুন।", g_photo: "পূজার ছবি", g_send: "📤 ছবি পাঠান", g_close: "বন্ধ করুন",
    g_prev: "আগের ছবি", g_next: "পরের ছবি", g_pick: "ছবি বাছুন", g_cap: "ছবির ক্যাপশন (ঐচ্ছিক)", g_submit: "জমা দিন", g_sending: "পাঠানো হচ্ছে…",
    g_note: "জমা দেওয়া ছবি অ্যাডমিন দেখে অনুমোদন করলে তবেই সবাইকে দেখানো হবে। শুধু নিজের তোলা, পূজা-সংক্রান্ত ছবি দিন।",
    g_ok: "ধন্যবাদ! ছবি জমা হয়েছে। অ্যাডমিন অনুমোদন করলে গ্যালারিতে দেখা যাবে।", g_rate: "আপনি অল্প সময়ে অনেক ছবি পাঠিয়েছেন। কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    g_full: "এখন নতুন ছবি নেওয়া হচ্ছে না। পরে চেষ্টা করুন।", g_bad: "এই ফাইলটি ছবি হিসেবে পড়া যায়নি। JPG, PNG বা WebP ছবি দিন।", g_big: "ছবিটি অনেক বড়। ছোট ছবি বেছে নিন।",
    g_err: "ছবি পাঠানো যায়নি। আবার চেষ্টা করুন।", g_hint: "ছবিতে ট্যাপ করলে বড় করে দেখাবে।",
  });
  A.addUI("en", {
    g_title: "Puja gallery", g_loading: "Loading photos…", g_empty: "No photos have been approved yet. Be the first to share one!",
    g_down: "The gallery server is not running right now. Please try again later.", g_photo: "Puja photo", g_send: "📤 Share a photo", g_close: "Close",
    g_prev: "Previous photo", g_next: "Next photo", g_pick: "Choose photo", g_cap: "Caption (optional)", g_submit: "Submit", g_sending: "Sending…",
    g_note: "Photos are shown to everyone only after an admin approves them. Please share only your own puja-related photos.",
    g_ok: "Thank you! Your photo was submitted. It will appear in the gallery once an admin approves it.", g_rate: "You sent many photos in a short time. Please try again later.",
    g_full: "New photos are not being accepted right now. Please try later.", g_bad: "That file could not be read as an image. Please use a JPG, PNG or WebP.", g_big: "That photo is too large. Please choose a smaller one.",
    g_err: "Could not send the photo. Please try again.", g_hint: "Tap a photo to enlarge it.",
  });
  A.addUI("hi", {
    g_title: "पूजा गैलरी", g_loading: "फ़ोटो लाई जा रही हैं…", g_empty: "अभी तक कोई फ़ोटो स्वीकृत नहीं हुई। सबसे पहले आप भेजिए!",
    g_down: "गैलरी सर्वर अभी चालू नहीं है। कृपया बाद में कोशिश करें।", g_photo: "पूजा की फ़ोटो", g_send: "📤 फ़ोटो भेजें", g_close: "बंद करें",
    g_prev: "पिछली फ़ोटो", g_next: "अगली फ़ोटो", g_pick: "फ़ोटो चुनें", g_cap: "कैप्शन (वैकल्पिक)", g_submit: "जमा करें", g_sending: "भेजी जा रही है…",
    g_note: "जमा की गई फ़ोटो एडमिन की मंज़ूरी के बाद ही सबको दिखेगी। केवल अपनी खींची, पूजा से जुड़ी फ़ोटो भेजें।",
    g_ok: "धन्यवाद! फ़ोटो जमा हो गई। एडमिन की मंज़ूरी के बाद गैलरी में दिखेगी।", g_rate: "आपने कम समय में बहुत फ़ोटो भेजीं। कुछ देर बाद फिर कोशिश करें।",
    g_full: "अभी नई फ़ोटो नहीं ली जा रहीं। बाद में कोशिश करें।", g_bad: "यह फ़ाइल फ़ोटो के रूप में नहीं पढ़ी जा सकी। JPG, PNG या WebP दें।", g_big: "फ़ोटो बहुत बड़ी है। छोटी फ़ोटो चुनें।",
    g_err: "फ़ोटो भेजी नहीं जा सकी। फिर कोशिश करें।", g_hint: "बड़ा देखने के लिए फ़ोटो पर टैप करें।",
  });
  A.quick.push({ id: "gallery", icon: "🖼️", act: "gallery", label: { bn: "গ্যালারি", en: "Gallery", hi: "गैलरी" } });

  /* ---------- lightbox ---------- */
  function openLightbox(list, start, opener) {
    const t = A.T();
    let i = start;
    const wrap = el("div", "gallb"); wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", t.g_title);
    const img = el("img"), cap = el("p", "gallb-cap");
    const mk = (cls, label, txt, fn) => { const b = el("button", cls, txt); b.type = "button"; b.setAttribute("aria-label", label); b.onclick = fn; return b; };
    const close = mk("gallb-x", t.g_close, "✕", () => done());
    const prev = mk("gallb-nav prev", t.g_prev, "‹", () => go(-1));
    const next = mk("gallb-nav next", t.g_next, "›", () => go(1));
    const show = () => {
      const it = list[i]; img.src = `${API}/img/${it.id}`; img.alt = it.caption || t.g_photo; cap.textContent = it.caption || "";
      prev.hidden = next.hidden = list.length < 2;
    };
    const go = (d) => { i = (i + d + list.length) % list.length; show(); };
    const onKey = (e) => { if (e.key === "Escape") done(); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1); };
    const done = () => { document.removeEventListener("keydown", onKey); wrap.remove(); document.body.style.overflow = ""; if (opener && opener.isConnected) opener.focus(); };
    wrap.onclick = (e) => { if (e.target === wrap) done(); };
    wrap.append(close, prev, img, next, cap);
    document.body.append(wrap); document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    show(); close.focus();
  }

  /* ---------- photo → small JPEG (EXIF/GPS বাদ পড়ে, সাইজও কমে) ---------- */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad")); };
      im.src = url;
    });
  }
  async function toJpeg(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("bad");
    if (file.size > 30 * 1024 * 1024) throw new Error("big");
    const im = await loadImage(file), w0 = im.naturalWidth, h0 = im.naturalHeight;
    if (!w0 || !h0) throw new Error("bad");
    for (const [max, q] of [[1600, 0.85], [1400, 0.72], [1100, 0.6]]) {
      const s = Math.min(1, max / Math.max(w0, h0)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w0 * s)); c.height = Math.max(1, Math.round(h0 * s));
      const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(im, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= 2.5 * 1024 * 1024) return blob;
    }
    throw new Error("big");
  }

  /* ---------- the card ---------- */
  A.acts.gallery = (b) => {
    const t = A.T(), card = el("div", "gal");
    card.append(el("h3", "", t.g_title));
    const msg = el("p", "galmsg", t.g_loading), grid = el("div", "galgrid"), tools = el("div", "tools"), hint = el("p", "shint", t.g_hint);
    hint.hidden = true;
    const form = buildForm(t, (text) => { msg.textContent = text; msg.hidden = !text; A.keep(b.closest(".msg")); });
    form.hidden = true;
    const toggle = el("button", "galsend", t.g_send); toggle.type = "button";
    toggle.onclick = () => { form.hidden = !form.hidden; if (!form.hidden) { form.querySelector("input[type=file]").focus(); A.keep(b.closest(".msg")); } };
    tools.append(toggle);
    card.append(msg, grid, hint, tools, form); b.append(card);

    const loadGallery = async () => {
      if (!card.isConnected) return;
      try {
        const j = await fetchJSON(`${API}/api/gallery`, 8000);
        if (!j || !j.ok || !Array.isArray(j.items)) throw new Error("bad");
        grid.textContent = "";
        if (!j.items.length) { msg.textContent = t.g_empty; msg.hidden = false; hint.hidden = true; return; }
        msg.hidden = true; hint.hidden = false;
        j.items.forEach((it, idx) => {
          const tile = el("button", "galtile"); tile.type = "button"; tile.setAttribute("aria-label", it.caption || t.g_photo);
          const im = el("img"); im.loading = "lazy"; im.decoding = "async"; im.alt = it.caption || t.g_photo; im.src = `${API}/img/${it.id}`;
          tile.append(im); tile.onclick = () => openLightbox(j.items, idx, tile); grid.append(tile);
        });
      } catch (e) { msg.textContent = t.g_down; msg.hidden = false; }
      A.keep(b.closest(".msg"));
    };
    loadGallery();
    const galleryTimer = setInterval(() => {
      if (!card.isConnected) { clearInterval(galleryTimer); return; }
      loadGallery();
    }, 30000);
  };

  function buildForm(t, say) {
    const f = el("form", "galform"); f.noValidate = true;
    const file = el("input"); file.type = "file"; file.accept = "image/jpeg,image/png,image/webp"; file.setAttribute("aria-label", t.g_pick);
    const prev = el("img", "galprev"); prev.hidden = true; prev.alt = "";
    const cap = el("input"); cap.type = "text"; cap.maxLength = 120; cap.placeholder = t.g_cap; cap.setAttribute("aria-label", t.g_cap); cap.autocomplete = "off";
    const go = el("button", "primary", t.g_submit); go.type = "submit"; go.disabled = true;
    let url = null;
    file.onchange = () => {
      if (url) URL.revokeObjectURL(url); url = null;
      const x = file.files && file.files[0];
      go.disabled = !x; prev.hidden = !x;
      if (x) { url = URL.createObjectURL(x); prev.src = url; }
      say("");
    };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const x = file.files && file.files[0]; if (!x) return;
      go.disabled = true; go.textContent = t.g_sending; say(t.g_sending);
      try {
        const blob = await toJpeg(x);
        const r = await fetch(`${API}/api/gallery`, { method: "POST", headers: { "Content-Type": "image/jpeg", "X-Caption": encodeURIComponent(cap.value.trim().slice(0, 120)) }, body: blob });
        if (r.status === 201) { say(t.g_ok); f.reset(); prev.hidden = true; f.hidden = true; }
        else say(r.status === 429 ? t.g_rate : r.status === 503 ? t.g_full : r.status === 413 ? t.g_big : r.status === 415 ? t.g_bad : t.g_err);
      } catch (e) { say(e && e.message === "bad" ? t.g_bad : e && e.message === "big" ? t.g_big : t.g_err); }
      go.textContent = t.g_submit; go.disabled = !(file.files && file.files[0]);
    };
    f.append(file, prev, cap, el("p", "shint", t.g_note), go);
    return f;
  }
})();
