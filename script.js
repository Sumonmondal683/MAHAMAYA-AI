"use strict";
/* ==========================================================================
   মহামায়া AI — core: calendar · Bengali search · chat UI
   Load order (all with defer): dataset.js → script.js → extras.js
   ========================================================================== */

/* ---------- small helpers ---------- */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const BN = "০১২৩৪৫৬৭৮৯";
const toBn = (n) => String(n).replace(/\d/g, (d) => BN[d]);
const hasBn = (s) => /[\u0980-\u09FF]/.test(s);
const hasDev = (s) => /[\u0900-\u097F]/.test(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
async function fetchJSON(url, ms = 8000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}

/* Bengali → Banglish (for the "Banglish" display mode) */
const b2l = (() => {
  const K = { "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou" };
  const V = { "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou" };
  const C = { "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng", "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n", "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n", "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n", "প": "p", "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m", "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s", "হ": "h", "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t" };
  const O = { "ং": "ng", "ঃ": "h", "ঁ": "n" };
  return (str) => {
    const s = String(str).normalize("NFC").replace(/\u09A1\u09BC/g, "ড়").replace(/\u09A2\u09BC/g, "ঢ়").replace(/\u09AF\u09BC/g, "য়");
    let o = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (C[ch]) {
        o += C[ch];
        const n = s[i + 1];
        if (K[n]) { o += K[n]; i++; }
        else if (n === "্") { i++; }
        else if (n && C[n]) o += "o";
      } else if (V[ch]) o += V[ch];
      else if (O[ch]) o += O[ch];
      else if (ch === "।") o += ".";
      else if (/[০-৯]/.test(ch)) o += BN.indexOf(ch);
      else if (ch === "\u200c" || ch === "\u200d") continue;
      else o += ch;
    }
    return o;
  };
})();

/* ---------- App object shared with extras.js ---------- */
const App = {
  lang: store.get("lang") || "bn",
  acts: {},      // act name → (bubbleBody, res) renderer
  intents: [],   // (query) → result | null, checked before search
  quick: [],     // quick-action buttons {id, label:{bn,en,hi}}
  UI: {},
  data: [],
};
const LOCALE = { bn: "bn-IN", en: "en-IN", hi: "hi-IN", bl: "en-IN" };

/* ---------- UI strings ---------- */
App.UI.bn = {
  ph: "আপনার প্রশ্ন লিখুন…", send: "পাঠান", fresh: "নতুন চ্যাট", listen: "শুনুন", stop: "থামান", copy: "কপি করুন", copied: "কপি হয়েছে",
  meaning: "অর্থ দেখুন", hide: "অর্থ লুকান", more: (n) => `আরও ${toBn(n)}টি দেখুন`, less: "কম দেখুন", topicIntro: (c) => `"${c}" বিষয়ে এই প্রশ্নগুলির উত্তর আছে:`,
  hello: "নমস্কার, শুভ শারদীয়া! 🙏\nতিথি, পূজার সময়, আচার, মন্ত্র বা আবহাওয়া নিয়ে প্রশ্ন করুন। নিচের প্রশ্নগুলোও বেছে নিতে পারেন।",
  hi2: "নমস্কার! তিথি, পূজার সময়, আচার, মন্ত্র বা নিরাপত্তা নিয়ে প্রশ্ন করুন।",
  thanks: "আপনাকেও ধন্যবাদ। শুভ শারদীয়া! 🙏", wish: "আপনাকেও শুভেচ্ছা! মা দুর্গা সবার মঙ্গল করুন। 🙏",
  notFound: "দুঃখিত, এই বিষয়ে আমার কাছে তথ্য নেই। তিথি, পূজার সময়, আচার, মন্ত্র বা নিরাপত্তা নিয়ে জিজ্ঞাসা করতে পারেন।",
  maybe: "ঠিক এই প্রশ্নের উত্তর পাইনি। এগুলোর মধ্যে কোনওটা জানতে চাইছেন?", err: "কিছু একটা গোলমাল হয়েছে। আবার চেষ্টা করুন।",
  loadFail: "তথ্য লোড করা যায়নি। dataset.js ফাইলটি index.html-এর পাশে আছে কি না দেখুন।", retry: "আবার চেষ্টা করুন",
  trWait: "অনুবাদ করা হচ্ছে…", trFail: "অনুবাদ এখন পাওয়া যাচ্ছে না, তাই বাংলায় দেখানো হলো।",
  before: (n) => `মহাষষ্ঠীর আর ${toBn(n)} দিন বাকি`, beforeShort: (n) => `ষষ্ঠী আর ${toBn(n)} দিন`,
  todayIs: (name, wd) => `আজ ${name} (${wd})`, todayShort: (name) => `আজ ${name}`, after: "এ বছরের শারদীয়া দুর্গাপূজা শেষ হয়েছে। শুভ বিজয়া!", afterShort: "শুভ বিজয়া",
  schedTitle: "পূজার সময়সূচি ২০২৬", schedHint: "কোনও দিনে ট্যাপ করলে বিস্তারিত দেখাবে।", todayBadge: "আজ", src: "কলকাতার পঞ্জিকা, ভারতীয় প্রমাণ সময়",
  yt: "▶ ইউটিউবে খুলুন", tag: "বিষয়", topicsAria: "বিষয়", quickAria: "দ্রুত কাজ", langAria: "ভাষা",
  q: { schedule: "সময়সূচি", weather: "আবহাওয়া", pandal: "কাছের প্যান্ডেল", weapons: "দেবীর অস্ত্র" },
  foot: "কলকাতার পঞ্জিকা অনুযায়ী। স্থানীয় পূজা কমিটির সময় আলাদা হলে সেটাই মানুন।",
};
App.UI.en = {
  ph: "Type your question…", send: "Send", fresh: "New chat", listen: "Listen", stop: "Stop", copy: "Copy", copied: "Copied",
  meaning: "Show meaning", hide: "Hide meaning", more: (n) => `Show ${n} more`, less: "Show less", topicIntro: (c) => `Questions I can answer under "${c}":`,
  hello: "Namaskar, and happy Sharodiya! 🙏\nAsk about tithis, puja timings, rituals, mantras or the weather. You can also tap a question below.",
  hi2: "Namaskar! Ask about tithis, puja timings, rituals, mantras or safety.",
  thanks: "You're welcome. Shubho Sharodiya! 🙏", wish: "Warm wishes to you too! May Maa Durga bless everyone. 🙏",
  notFound: "Sorry, I don't have information on that. You can ask about tithis, puja timings, rituals, mantras or safety.",
  maybe: "I couldn't find that exact question. Did you mean one of these?", err: "Something went wrong. Please try again.",
  loadFail: "Could not load the data. Check that dataset.js is next to index.html.", retry: "Try again",
  trWait: "Translating…", trFail: "Translation is unavailable right now, so this is shown in Bengali.",
  before: (n) => `${n} day${n === 1 ? "" : "s"} to Maha Shashthi`, beforeShort: (n) => `Shashthi in ${n}d`,
  todayIs: (name, wd) => `Today: ${name} (${wd})`, todayShort: (name) => `Today: ${name}`, after: "This year's Sharodiya Durga Puja is over. Shubho Bijoya!", afterShort: "Shubho Bijoya",
  schedTitle: "Puja schedule 2026", schedHint: "Tap a day for details.", todayBadge: "Today", src: "Kolkata panjika, Indian Standard Time",
  yt: "▶ Open on YouTube", tag: "Topic", topicsAria: "Topics", quickAria: "Quick actions", langAria: "Language",
  q: { schedule: "Schedule", weather: "Weather", pandal: "Pandals near me", weapons: "Goddess's weapons" },
  foot: "Based on the Kolkata panjika. If your local puja committee announces different times, follow them.",
};
App.UI.hi = {
  ph: "अपना प्रश्न लिखें…", send: "भेजें", fresh: "नई चैट", listen: "सुनें", stop: "रोकें", copy: "कॉपी करें", copied: "कॉपी हो गया",
  meaning: "अर्थ देखें", hide: "अर्थ छिपाएँ", more: (n) => `${n} और देखें`, less: "कम देखें", topicIntro: (c) => `"${c}" विषय में इन प्रश्नों के उत्तर हैं:`,
  hello: "नमस्कार, शुभ शारदीय! 🙏\nतिथि, पूजा के समय, आचार, मंत्र या मौसम के बारे में पूछें। नीचे के प्रश्न भी चुन सकते हैं।",
  hi2: "नमस्कार! तिथि, पूजा के समय, आचार, मंत्र या सुरक्षा के बारे में पूछें।",
  thanks: "आपका भी धन्यवाद। शुभ शारदीय! 🙏", wish: "आपको भी शुभकामनाएँ! माँ दुर्गा सबका कल्याण करें। 🙏",
  notFound: "क्षमा करें, इस विषय पर मेरे पास जानकारी नहीं है। तिथि, पूजा के समय, आचार, मंत्र या सुरक्षा के बारे में पूछ सकते हैं।",
  maybe: "ठीक यही प्रश्न नहीं मिला। क्या इनमें से कुछ जानना चाहते हैं?", err: "कुछ गड़बड़ हो गई। फिर से कोशिश करें।",
  loadFail: "डेटा लोड नहीं हो सका। देखें कि dataset.js, index.html के पास है।", retry: "फिर कोशिश करें",
  trWait: "अनुवाद हो रहा है…", trFail: "अनुवाद अभी उपलब्ध नहीं है, इसलिए बांग्ला में दिखाया गया।",
  before: (n) => `महाषष्ठी में ${n} दिन शेष`, beforeShort: (n) => `षष्ठी में ${n} दिन`,
  todayIs: (name, wd) => `आज ${name} (${wd})`, todayShort: (name) => `आज ${name}`, after: "इस वर्ष की शारदीय दुर्गा पूजा समाप्त हो गई। शुभ विजया!", afterShort: "शुभ विजया",
  schedTitle: "पूजा का समय-सारणी 2026", schedHint: "विवरण के लिए किसी दिन पर टैप करें।", todayBadge: "आज", src: "कोलकाता पंजिका, भारतीय मानक समय",
  yt: "▶ यूट्यूब पर खोलें", tag: "विषय", topicsAria: "विषय", quickAria: "त्वरित कार्य", langAria: "भाषा",
  q: { schedule: "समय-सारणी", weather: "मौसम", pandal: "पास के पंडाल", weapons: "देवी के अस्त्र" },
  foot: "कोलकाता पंजिका पर आधारित। स्थानीय पूजा समिति का समय अलग हो तो वही मानें।",
};
/* Banglish = Bengali strings run through b2l */
App.UI.bl = new Proxy({}, {
  get: (_, k) => {
    const v = App.UI.bn[k];
    if (typeof v === "string") return b2l(v);
    if (typeof v === "function") return (...a) => b2l(v(...a));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([a, b]) => [a, b2l(b)]));
    return v;
  },
});
const T = () => App.UI[App.lang];
App.T = T;
App.addUI = (lang, obj) => Object.assign(App.UI[lang], obj);

const CATS = {
  basic: { bn: "পরিচিতি", en: "Basics", hi: "परिचय" }, ritual: { bn: "আচার", en: "Rituals", hi: "आचार" }, culture: { bn: "সংস্কৃতি", en: "Culture", hi: "संस्कृति" },
  mantra: { bn: "মন্ত্র", en: "Mantras", hi: "मंत्र" }, safety: { bn: "নিরাপত্তা", en: "Safety", hi: "सुरक्षा" }, calendar: { bn: "পঞ্জিকা", en: "Calendar", hi: "पंजिका" },
  mythology: { bn: "পুরাণ", en: "Mythology", hi: "पुराण" }, art: { bn: "শিল্প", en: "Art", hi: "कला" }, food: { bn: "ভোগ", en: "Food", hi: "भोग" },
  community: { bn: "সম্প্রদায়", en: "Community", hi: "समुदाय" }, environment: { bn: "পরিবেশ", en: "Environment", hi: "पर्यावरण" },
  history: { bn: "ইতিহাস", en: "History", hi: "इतिहास" }, weapons: { bn: "অস্ত্র", en: "Weapons", hi: "अस्त्र" },
};
const catName = (c) => (CATS[c] ? (App.lang === "bl" ? b2l(CATS[c].bn) : CATS[c][App.lang]) : "");
App.catName = catName;

/* ---------- Calendar (Kolkata panjika, IST) ---------- */
const DAYS = [
  { iso: "2026-10-16", id: 69, name: { bn: "মহাষষ্ঠী", en: "Maha Shashthi", hi: "महाषष्ठी" },
    key: { bn: "ষষ্ঠী রাত ৩:৪৭ পর্যন্ত · সন্ধ্যায় বোধন, আমন্ত্রণ, অধিবাস", en: "Shashthi till 3:47 AM · Bodhan, Amantran, Adhivas in the evening", hi: "षष्ठी भोर 3:47 तक · शाम को बोधन, आमंत्रण, अधिवास" } },
  { iso: "2026-10-17", id: 70, name: { bn: "মহাসপ্তমী", en: "Maha Saptami", hi: "महासप्तमी" },
    key: { bn: "সপ্তমী সারাদিন-রাত · নবপত্রিকা প্রবেশ ও স্থাপন", en: "Saptami all day & night · Nabapatrika entry", hi: "सप्तमी पूरे दिन-रात · नवपत्रिका प्रवेश" } },
  { iso: "2026-10-18", id: 71, name: { bn: "সপ্তমীর অধিক পূজা", en: "Extra Saptami puja", hi: "सप्तमी की अधिक पूजा" },
    key: { bn: "সপ্তমী ভোর ৫:৫৩ পর্যন্ত · রাত ১০:০৯–১১:৪৭ অর্দ্ধরাত্র পূজা", en: "Saptami till 5:53 AM · Ardharatra puja 10:09–11:47 PM", hi: "सप्तमी प्रातः 5:53 तक · रात 10:09–11:47 अर्द्धरात्र पूजा" } },
  { iso: "2026-10-19", id: 72, name: { bn: "মহাষ্টমী", en: "Maha Ashtami", hi: "महाअष्टमी" },
    key: { bn: "অষ্টমী সকাল ৭:৫০ পর্যন্ত · সন্ধিপূজা ৭:২৬–৮:১৪ · বলিদান ৭:৫০", en: "Ashtami till 7:50 AM · Sandhi puja 7:26–8:14 · Balidan 7:50", hi: "अष्टमी सुबह 7:50 तक · संधिपूजा 7:26–8:14 · बलिदान 7:50" } },
  { iso: "2026-10-20", id: 73, name: { bn: "মহানবমী", en: "Maha Navami", hi: "महानवमी" },
    key: { bn: "নবমী সকাল ৯:৩১ পর্যন্ত · নবরাত্রিক ব্রত সমাপ্ত", en: "Navami till 9:31 AM · Navaratrik vrata ends", hi: "नवमी सुबह 9:31 तक · नवरात्रिक व्रत पूर्ण" } },
  { iso: "2026-10-21", id: 74, name: { bn: "বিজয়া দশমী", en: "Vijaya Dashami", hi: "विजया दशमी" },
    key: { bn: "দশমী সকাল ১০:৪৭ পর্যন্ত · বিসর্জন, অপরাজিতা পূজা", en: "Dashami till 10:47 AM · Immersion, Aparajita puja", hi: "दशमी सुबह 10:47 तक · विसर्जन, अपराजिता पूजा" } },
];
App.DAYS = DAYS;
const lx = (o) => (App.lang === "bl" ? b2l(o.bn) : o[App.lang]);
const dayNum = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
const todayNum = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(); };
const diffDays = (s) => Math.round((dayNum(s) - todayNum()) / 864e5);
const fmtDate = (iso, opt) => new Date(dayNum(iso)).toLocaleDateString(LOCALE[App.lang], opt || { weekday: "long", day: "numeric", month: "long" });
App.fmtDate = fmtDate; App.LOCALE = LOCALE;

function festivalStatus() {
  const t = T(), n = diffDays(DAYS[0].iso);
  if (n > 0) return { text: t.before(n), short: t.beforeShort(n) };
  const now = DAYS.find((d) => diffDays(d.iso) === 0);
  if (now) return { text: t.todayIs(lx(now.name), new Date().toLocaleDateString(LOCALE[App.lang], { weekday: "long" })), short: t.todayShort(lx(now.name)) };
  return { text: t.after, short: t.afterShort };
}

/* ---------- text normalisation & retrieval ---------- */
const SYN = { "কয়টা": "কতগুলো", "কটা": "কতগুলো", "কয়টি": "কতগুলো", "কতটি": "কতগুলো", "কতগুলি": "কতগুলো", "কটায়": "কখন", "কয়টায়": "কখন", "কখনও": "কখন" };
const NOJOIN = new Set(["কী", "কোন", "এই", "ওই", "আজ", "কবে", "কত", "কখন", "মহা", "প্রথম"]);
const norm = (s) => {
  let n = String(s).normalize("NFC").toLowerCase()
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[০-৯]/g, (d) => BN.indexOf(d))
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()
    .replace(/(^| )কিভাবে(?= |$)/g, "$1কীভাবে").replace(/(^| )কি(?= |$)/g, "$1কী");
  const out = [];
  for (let w of n.split(" ")) {
    if (SYN[w]) w = SYN[w];
    if (out.length && w.startsWith("পূজা") && !NOJOIN.has(out[out.length - 1])) out[out.length - 1] += w; else out.push(w);
  }
  return out.join(" ");
};
const STOP = new Set(["কী", "হয়", "হলো", "হল", "আছে", "এবং", "ও", "করে", "করা", "বলুন", "বলো", "দাও", "সম্পর্কে", "জানতে", "চাই", "একটু", "আমাকে", "আমি", "এই", "এটা", "এটি",
  "the", "is", "are", "what", "of", "a", "an", "to", "in", "on", "for", "how", "when", "where", "does", "do", "me", "tell", "about", "i", "can", "my", "and", "or", "at", "please", "pls", "this", "it",
  "ki", "ke", "ta", "ti", "er", "ar", "o", "ei", "ekta", "amake", "bolo", "bolun", "dao", "janan", "jante", "chai", "kore", "hoy", "ache", "achhe"].map(norm));
const SUF = ["গুলোর", "গুলো", "দের", "ের", "য়ে", "তে", "কে", "র", "য়", "ে"].map((s) => s.normalize("NFC")).sort((a, b) => b.length - a.length);
const stem = (w) => { if (!hasBn(w)) return w; for (const s of SUF) if (w.endsWith(s) && w.length - s.length >= 3) return w.slice(0, -s.length); return w; };
const toks = (s) => norm(s).split(" ").filter((w) => w && !STOP.has(w)).map(stem);
const grams = (s) => { const t = ` ${s} `, g = new Set(); for (let i = 0; i < t.length - 2; i++) g.add(t.slice(i, i + 3)); return g; };
const dice = (a, b) => { if (!a.size || !b.size) return 0; let c = 0; a.forEach((x) => b.has(x) && c++); return (2 * c) / (a.size + b.size); };

let DATA = [], IDX = [], DF = {};
const idf = (t) => Math.log(1 + DATA.length / (DF[t] || 1));
const wsum = (arr) => arr.reduce((s, t) => s + idf(t), 0);

function buildIndex(data) {
  DATA = data; DF = {};
  IDX = data.map((e) => {
    const qs = [e.question, ...(e.alternative_questions || []), ...(e.en_q || []), ...(e.bl_q || [])];
    const variants = [...new Set(qs)].map((q) => toks(q)).filter((v) => v.length);
    const kw = new Set((e.keywords || []).flatMap((k) => toks(k)));
    const all = new Set([...variants.flat(), ...kw]);
    all.forEach((t) => (DF[t] = (DF[t] || 0) + 1));
    return { e, variants, kw, vg: variants.map((v) => grams(v.join(" "))) };
  });
}

function rank(query) {
  const Q = [...new Set(toks(query))];
  if (!Q.length) return [];
  const qs = new Set(Q), qg = grams(Q.join(" ")), qw = wsum(Q);
  return IDX.map((it) => {
    let best = 0;
    it.variants.forEach((v, i) => {
      const shared = [...new Set(v.filter((t) => qs.has(t)))];
      const tok = (2 * wsum(shared)) / ((qw + wsum(v)) || 1);
      best = Math.max(best, 0.6 * tok + 0.4 * dice(qg, it.vg[i]));
    });
    const kwShared = [...it.kw].filter((t) => qs.has(t));
    return { e: it.e, score: best + 0.2 * (wsum(kwShared) / (qw || 1)) };
  }).sort((a, b) => b.score - a.score);
}

/* labels for suggestion chips, in the chosen language */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function qLabel(e) {
  if (App.lang === "en" && e.en_q && e.en_q[0]) return cap(e.en_q[0]) + "?";
  if (App.lang === "bl") return e.bl_q && e.bl_q[0] ? cap(e.bl_q[0]) + "?" : b2l(e.question);
  return e.question;
}
const chipOf = (e) => ({ label: qLabel(e), q: e.question });

/* ---------- translation helpers (only used when a local match fails) ---------- */
const trCache = new Map();
let mmBlocked = false;
async function mmTranslate(text, from, to) {
  if (mmBlocked || !text) return null;
  const key = `${from}|${to}|${text}`;
  if (trCache.has(key)) return trCache.get(key);
  const parts = [];
  text.split(/(?<=[।.\n])/).forEach((s) => { while (s.length > 420) { parts.push(s.slice(0, 420)); s = s.slice(420); } parts.push(s); });
  const out = [];
  try {
    for (const p of parts) {
      if (!p.trim()) { out.push(p); continue; }
      const j = await fetchJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(p)}&langpair=${from}|${to}`, 7000);
      const t = j && j.responseData && j.responseData.translatedText;
      if (!t || String(j.responseStatus) !== "200" || /MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(t)) { mmBlocked = true; return null; }
      out.push(t);
    }
  } catch (e) { return null; }
  const res = out.join("");
  trCache.set(key, res);
  return res;
}
async function banglishToBengali(q) {
  try {
    const j = await fetchJSON(`https://inputtools.google.com/request?text=${encodeURIComponent(q)}&itc=bn-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`, 5000);
    if (j && j[0] === "SUCCESS") return j[1].map((x) => x[1][0]).join(" ");
  } catch (e) { /* offline */ }
  return null;
}
async function toBengaliQuery(q) {
  if (hasDev(q)) return mmTranslate(q, "hi", "bn");
  const viaInput = await banglishToBengali(q);
  if (viaInput) return viaInput;
  return mmTranslate(q, "en", "bn");
}

/* ---------- answer logic ---------- */
function smallTalk(q) {
  const n = norm(q), t = T(), w = n.split(" ")[0];
  if (["হ্যালো", "হাই", "নমস্কার", "নমস্তে", "hi", "hello", "hey", "namaskar", "namaste", "नमस्ते", "नमस्कार", "हैलो"].includes(w)) return { text: t.hi2, chips: STARTERS().slice(0, 4) };
  if (/ধন্যবাদ|thanks?|thank you|dhonnobad|dhanyabad|धन्यवाद|शुक्रिया/.test(n)) return { text: t.thanks };
  if (/শুভ (বিজয়া|শারদীয়া|মহালয়া|পূজা)|happy (durga|puja|vijaya)|shubho|subho (bijoya|pujo)|शुभ (विजया|दशहरा|नवरात्रि)/.test(n)) return { text: t.wish };
  if (/বাকি|কতদিন|কত দিন|countdown|days left|koto ?din|कितने दिन/.test(n) ||
      /(^| )আজ(কের)? ?(কোন|কী)? ?(তিথি|পূজা|পূজার|দিন)|today.?s? (puja|tithi)|aaj (ki|kon) (tithi|pujo)|आज (कौन|क्या)/.test(n))
    return { text: festivalStatus().text, act: "schedule" };
  return null;
}
function decide(r) {
  const top = r[0];
  if (top && top.score >= 0.42)
    return { entry: top.e, chips: r.slice(1, 8).filter((x) => x.score > 0.2 && x.e.id !== top.e.id).slice(0, 3).map((x) => chipOf(x.e)) };
  if (top && top.score >= 0.22) return { text: T().maybe, chips: r.slice(0, 3).map((x) => chipOf(x.e)) };
  return { text: T().notFound, chips: STARTERS() };
}
const STARTER_IDS = [68, 164, 161, 65, 197, 201];
function STARTERS() { return STARTER_IDS.map((id) => DATA.find((e) => e.id === id)).filter(Boolean).map(chipOf); }

async function process(q, hidden) {
  const query = hidden || q;
  for (const f of App.intents) { const r = f(query); if (r) return r; }
  const st = smallTalk(query); if (st) return st;
  let r = rank(query);
  if (!hidden && (!r[0] || r[0].score < 0.5) && (!hasBn(query) || hasDev(query))) {
    const q2 = await toBengaliQuery(query);
    if (q2 && q2 !== query) {
      for (const f of App.intents) { const x = f(q2); if (x) return x; }
      const r2 = rank(q2);
      if (!r[0] || (r2[0] && r2[0].score > r[0].score)) r = r2;
    }
  }
  return decide(r);
}

/* ---------- rendering ---------- */
function fill(p, text) {
  p.textContent = "";
  String(text).split(/(https?:\/\/\S+)/).forEach((part) => {
    if (/^https?:/.test(part)) { const a = el("a", "lnk", T().yt); a.href = part; a.target = "_blank"; a.rel = "noopener"; p.append(a); }
    else p.append(part);
  });
}
function newBubble(role) {
  const m = el("div", `msg ${role}`), b = el("div", "bubble");
  m.append(b); $("log").append(m);
  return { m, b };
}
function keepVisible(m) {
  const l = $("log");
  requestAnimationFrame(() => {
    if (m.offsetHeight > l.clientHeight * 0.7) l.scrollTo({ top: m.offsetTop - 12, behavior: "smooth" });
    else l.scrollTo({ top: l.scrollHeight, behavior: "smooth" });
  });
}
App.keep = keepVisible;

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
  try {
    const ta = el("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.append(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch (e) { return false; }
}

/* text-to-speech */
let speakBtn = null;
function speak(text, btn) {
  const S = window.speechSynthesis; if (!S) return;
  const wasThis = speakBtn === btn;
  S.cancel();
  if (speakBtn) { speakBtn.textContent = "🔊 " + T().listen; speakBtn = null; }
  if (wasThis) return;
  const u = new SpeechSynthesisUtterance(String(text).replace(/https?:\/\/\S+/g, "").replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF▶]/gu, "").replace(/\s+/g, " "));
  u.lang = App.lang === "bl" ? "en-IN" : LOCALE[App.lang]; u.rate = 0.92;
  u.onend = u.onerror = () => { if (speakBtn === btn) { btn.textContent = "🔊 " + T().listen; speakBtn = null; } };
  speakBtn = btn; btn.textContent = "⏹ " + T().stop;
  S.speak(u);
}
App.speak = speak;
function toolBtn(label, fn) { const b = el("button", "tool", label); b.type = "button"; b.onclick = () => fn(b); return b; }
function addTools(b, getText, extra) {
  const row = el("div", "tools");
  if ("speechSynthesis" in window) row.append(toolBtn("🔊 " + T().listen, (btn) => speak(getText(), btn)));
  (extra || []).forEach((x) => row.append(x));
  if (row.children.length) b.append(row);
}

async function translateInto(p, bnText, lang, b) {
  const note = el("small", "note", T().trWait); b.append(note);
  const tr = await mmTranslate(bnText, "bn", lang === "hi" ? "hi" : "en");
  if (tr && App.lang === lang) { fill(p, tr); note.remove(); } else note.textContent = T().trFail;
}

function mantraView(b, e) {
  const card = el("div", "mantra");
  card.append(el("h3", "", (e.title || e.question).replace(/\s*(কী|কি)\?$/, "")));
  if (e.festival_day) card.append(el("span", "day", e.festival_day));
  const text = e.mantra || e.answer;
  card.append(el("pre", "", text));
  const tools = el("div", "tools");
  if ("speechSynthesis" in window) tools.append(toolBtn("🔊 " + T().listen, (btn) => speak(text, btn)));
  tools.append(toolBtn(T().copy, async (btn) => { if (await copyText(text)) { btn.textContent = T().copied; setTimeout(() => (btn.textContent = T().copy), 1500); } }));
  let box = null;
  if (e.meaning) {
    const m = e.meaning;
    const mt = typeof m === "string" ? m : App.lang === "bl" ? b2l(m.bn || "") : (m[App.lang] || m.bn || "");
    box = el("div", "mean"); box.hidden = true;
    String(mt).split("\n").forEach((t) => box.append(el("p", "", t)));
    tools.append(toolBtn(T().meaning, (btn) => { box.hidden = !box.hidden; btn.textContent = box.hidden ? T().meaning : T().hide; keepVisible(btn.closest(".msg")); }));
  }
  card.append(tools);
  if (box) card.append(box);
  b.append(card);
}

function entryView(b, e) {
  if (e.category === "mantra") return mantraView(b, e);
  const L = App.lang, p = el("p"); b.append(p);
  let txt = e.answer;
  if (L === "en" && e.en) txt = e.en; else if (L === "hi" && e.hi) txt = e.hi; else if (L === "bl") txt = b2l(e.answer);
  fill(p, txt);
  if ((L === "en" || L === "hi") && !e[L]) translateInto(p, e.answer, L, b);
  addTools(b, () => p.textContent);
}

function chipRow(items, limit) {
  const list = [], seen = new Set();
  items.forEach((it) => { const o = typeof it === "string" ? { label: it, q: it } : it; if (!seen.has(o.label)) { seen.add(o.label); list.push(o); } });
  const row = el("div", "chips");
  const mk = (o) => { const x = el("button", "", o.label); x.type = "button"; x.onclick = () => ask(o.label, o.q); return x; };
  const shown = limit && list.length > limit + 1 ? limit : list.length;
  list.slice(0, shown).forEach((o) => row.append(mk(o)));
  if (shown < list.length) {
    const rest = list.slice(shown), more = el("button", "more", T().more(rest.length)); more.type = "button";
    more.onclick = () => { more.remove(); rest.forEach((o) => row.append(mk(o))); keepVisible(row.closest(".msg")); };
    row.append(more);
  }
  return row;
}

function renderBot(res, slot) {
  const s = slot || newBubble("bot"), { m, b } = s;
  b.textContent = ""; b.classList.remove("typing");
  const e = res.entry;
  if (e) entryView(b, e);
  else if (res.text) { const p = el("p"); fill(p, res.text); b.append(p); }
  if (res.act && App.acts[res.act]) App.acts[res.act](b, res);
  if (e && CATS[e.category]) b.append(el("span", "tag", `${T().tag}: ${catName(e.category)}`));
  if (res.chips && res.chips.length) b.append(chipRow(res.chips, res.limit));
  keepVisible(m);
}
App.say = renderBot;

/* schedule card */
App.acts.schedule = (b) => {
  const t = T(), card = el("div", "sched");
  card.append(el("h3", "", t.schedTitle));
  DAYS.forEach((d) => {
    const row = el("button", "srow"); row.type = "button";
    const isToday = diffDays(d.iso) === 0;
    if (isToday) row.classList.add("today");
    const date = el("span", "sdate", fmtDate(d.iso, { day: "numeric", month: "long", weekday: "short" }));
    const mid = el("span", "smid"); mid.append(el("b", "", lx(d.name)), el("span", "", lx(d.key)));
    row.append(date, mid);
    if (isToday) row.append(el("em", "", t.todayBadge));
    row.onclick = () => { const e = DATA.find((x) => x.id === d.id); if (e) ask(`${fmtDate(d.iso, { day: "numeric", month: "long" })} — ${lx(d.name)}`, e.question); };
    card.append(row);
  });
  card.append(el("p", "shint", `${t.schedHint} (${t.src})`));
  b.append(card);
};

/* ---------- chat flow ---------- */
let chain = Promise.resolve();
function ask(label, hidden) {
  label = String(label).trim(); if (!label) return;
  newBubble("user").b.append(el("p", "", label));
  const slot = newBubble("bot"); slot.b.classList.add("typing");
  const dots = el("span", "dots"); dots.append(el("i"), el("i"), el("i")); slot.b.append(dots);
  keepVisible(slot.m);
  chain = chain.then(() => process(label, hidden)).then((res) => renderBot(res, slot))
    .catch((err) => { console.error(err); renderBot({ text: T().err }, slot); });
}
App.ask = ask;
App.runAct = (act, label) => {
  newBubble("user").b.append(el("p", "", label));
  const slot = newBubble("bot");
  chain = chain.then(() => renderBot({ act }, slot));
};

function welcome() {
  $("log").textContent = "";
  renderBot({ text: T().hello, chips: STARTERS() });
}

function buildQuick() {
  const nav = $("quick"); nav.textContent = ""; nav.setAttribute("aria-label", T().quickAria);
  App.quick.forEach((q) => {
    const label = q.label ? lx(q.label) : T().q[q.id];
    const b = el("button", "", `${q.icon || ""} ${label}`.trim()); b.type = "button";
    b.onclick = () => App.runAct(q.act || q.id, label);
    nav.append(b);
  });
}
function buildTopics() {
  const nav = $("topics"); nav.textContent = ""; nav.setAttribute("aria-label", T().topicsAria);
  Object.keys(CATS).filter((c) => DATA.some((e) => e.category === c)).forEach((c) => {
    const b = el("button", "", catName(c)); b.type = "button";
    b.onclick = () => {
      newBubble("user").b.append(el("p", "", catName(c)));
      renderBot({ text: T().topicIntro(catName(c)), chips: DATA.filter((e) => e.category === c).map(chipOf), limit: 8 });
    };
    nav.append(b);
  });
}
function applyLang() {
  const t = T();
  document.documentElement.lang = App.lang === "bn" ? "bn" : App.lang === "hi" ? "hi" : App.lang === "en" ? "en" : "bn-Latn";
  $("input").placeholder = t.ph; $("send").setAttribute("aria-label", t.send); $("clear").setAttribute("aria-label", t.fresh); $("clear").title = t.fresh;
  $("lang").setAttribute("aria-label", t.langAria); $("lang").value = App.lang;
  $("foot").textContent = t.foot;
  $("countdown").textContent = festivalStatus().short;
  if (DATA.length) { buildTopics(); buildQuick(); }
  if (App.onLang) App.onLang();
}
App.applyLang = applyLang;

async function loadData() {
  if (window.DURGA_DATA) return window.DURGA_DATA;
  try { return await fetchJSON("dataset.json", 10000); } catch (e) { return await fetchJSON("dataset.json", 10000); }
}
async function init() {
  $("lang").onchange = (ev) => { App.lang = ev.target.value; store.set("lang", App.lang); applyLang(); };
  $("clear").onclick = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); welcome(); };
  $("form").onsubmit = (ev) => {
    ev.preventDefault();
    const i = $("input"), v = i.value; i.value = "";
    ask(v);
    if (!matchMedia("(pointer:coarse)").matches) i.focus();
  };
  applyLang();
  try {
    buildIndex(await loadData());
    App.data = DATA;
    applyLang(); welcome();
    $("input").disabled = $("send").disabled = false;
    if (!matchMedia("(pointer:coarse)").matches) $("input").focus();
  } catch (err) {
    console.error(err);
    $("log").textContent = "";
    const { b } = newBubble("bot");
    b.append(el("p", "", T().loadFail));
    const r = el("button", "tool", T().retry); r.type = "button"; r.onclick = () => location.reload(); b.append(r);
  }
}
document.addEventListener("DOMContentLoaded", init);
