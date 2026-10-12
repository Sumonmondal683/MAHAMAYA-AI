/* ============================================================
   Mahamaya AI — Puja Crowd Tracker (পুজো ভিড় ট্র্যাকার)
   Anonymous, crowd-sourced "how crowded / how long is the queue" reports
   for big pandals & clubs. Self-contained: injects its own CSS + UI.

   Quick start:
     <script>window.MAHAMAYA_CROWD_CONFIG={backend:'local',lang:'bn',launcher:true}</script>
     <script src="crowd.js"></script>
   Chatbot hook:   const r = MahamayaCrowd.answer(userText);  // null if not a crowd question
   ============================================================ */
(function (root) {
'use strict';
const CFG = Object.assign({
  backend: 'local',          // 'local' (demo, this device only) | 'supabase' | 'firebase'
  supabase: {url: '', anonKey: '', table: 'crowd_reports'},
  firebase: {dbUrl: '', path: 'crowd_reports'},
  lang: 'bn',                // 'bn' | 'en'
  launcher: true,            // floating button that opens the tracker
  launcherPosition: 'left',  // 'left' | 'right' (keep away from your chat button)
  mount: null,               // CSS selector / element to render inline instead
  windowMin: 120,            // only reports newer than this count
  halfLifeMin: 30,           // newer reports weigh more
  cooldownMin: 15,           // per device, per pandal
  refreshSec: 60
}, root.MAHAMAYA_CROWD_CONFIG || {});

/* ---------- data: starter list (edit freely) ---------- */
const CITIES = [
  {id:'kol', bn:'কলকাতা', en:'Kolkata'}, {id:'how', bn:'হাওড়া', en:'Howrah'},
  {id:'chn', bn:'চন্দননগর', en:'Chandannagar'}, {id:'siu', bn:'সিউড়ি', en:'Suri'},
  {id:'sil', bn:'শিলিগুড়ি', en:'Siliguri'}, {id:'dur', bn:'দুর্গাপুর', en:'Durgapur'},
  {id:'asn', bn:'আসানসোল', en:'Asansol'}, {id:'brd', bn:'বর্ধমান', en:'Bardhaman'},
  {id:'krn', bn:'কৃষ্ণনগর', en:'Krishnanagar'}, {id:'oth', bn:'অন্যান্য', en:'Other'}
];
const P = (id, city, bn, en, alias) => ({id, city, bn, en, alias: [bn, en].concat(alias || [])});
const PANDALS = [
  P('k-sreebhumi','kol','শ্রীভূমি স্পোর্টিং ক্লাব','Sreebhumi Sporting Club',['শ্রীভূমি','লেক টাউন','Sreebhumi','Sribhumi']),
  P('k-santosh','kol','সন্তোষ মিত্র স্কয়ার','Santosh Mitra Square',['সন্তোষ মিত্র','Santosh Mitra']),
  P('k-collegesq','kol','কলেজ স্কোয়ার','College Square',['College Square']),
  P('k-maddox','kol','ম্যাডক্স স্কোয়ার','Maddox Square',['ম্যাডক্স','Maddox']),
  P('k-ekdalia','kol','একডালিয়া এভারগ্রিন','Ekdalia Evergreen',['একডালিয়া','Ekdalia']),
  P('k-singhi','kol','সিংহী পার্ক','Singhi Park',['সিংহী পার্ক','Singhi']),
  P('k-ballygunge','kol','বালিগঞ্জ কালচারাল অ্যাসোসিয়েশন','Ballygunge Cultural Association',['বালিগঞ্জ কালচারাল','Ballygunge']),
  P('k-suruchi','kol','সুরুচি সংঘ','Suruchi Sangha',['সুরুচি','Suruchi']),
  P('k-deshapriya','kol','দেশপ্রিয় পার্ক','Deshapriya Park',['দেশপ্রিয়','Deshapriya']),
  P('k-tridhara','kol','ত্রিধারা সম্মিলনী','Tridhara Sammilani',['ত্রিধারা','Tridhara']),
  P('k-bagbazar','kol','বাগবাজার সর্বজনীন','Bagbazar Sarbojanin',['বাগবাজার','Bagbazar']),
  P('k-kumartuli','kol','কুমারটুলি পার্ক সর্বজনীন','Kumartuli Park Sarbojanin',['কুমারটুলি','Kumartuli']),
  P('k-hatibagan','kol','হাতিবাগান সর্বজনীন','Hatibagan Sarbojanin',['হাতিবাগান','Hatibagan']),
  P('k-mdali','kol','মোহাম্মদ আলি পার্ক','Mohammad Ali Park',['মোহাম্মদ আলি','Mohammad Ali']),
  P('k-dumdum','kol','দমদম পার্ক তরুণ সংঘ','Dum Dum Park Tarun Sangha',['দমদম পার্ক','Dum Dum Park']),
  P('k-badamtala','kol','বাদামতলা আষার সংঘ','Badamtala Ashar Sangha',['বাদামতলা','Badamtala']),
  P('k-behala','kol','বেহালা নতুন দল','Behala Notun Dal',['বেহালা নতুন দল','Behala Notun']),
  P('k-chetla','kol','চেতলা অগ্রণী','Chetla Agrani',['চেতলা','Chetla']),
  P('k-naktala','kol','নাকতলা উদয়ন সংঘ','Naktala Udayan Sangha',['নাকতলা','Naktala']),
  P('k-95pally','kol','৯৫ পল্লি (যোধপুর পার্ক)','95 Pally (Jodhpur Park)',['৯৫ পল্লি','95 Pally','যোধপুর পার্ক','Jodhpur Park']),
  P('c-chandannagar','chn','চন্দননগর (আলোকসজ্জা)','Chandannagar Lighting',['চন্দননগর','Chandannagar']),
  P('s-chowrangi','siu','সিউড়ি চৌরঙ্গী','Suri Chowrangi',['সিউড়ি চৌরঙ্গী','সিউড়ি চৌরঙ্গি','Suri Chowrangi','Siuri Chowrangi']),
  P('o-chhoyer','oth','ছয়ের পল্লি','Chhoyer Pally',['ছয়ের পল্লী','6 Pally','Chhoyer Pally']),
  P('o-eker','oth','একের পল্লি','Eker Pally',['একের পল্লী','1 Pally','Eker Pally'])
];
const LEVELS = {
  bn: ['ফাঁকা', 'মাঝারি ভিড়', 'বেশ ভিড়', 'প্রচণ্ড ভিড়'],
  en: ['Quiet', 'Moderate', 'Crowded', 'Packed']
};
const COLORS = ['#1b9e5a', '#c9a100', '#e07a1f', '#c8372d'];
const WAITS = [0, 15, 30, 60, 90, 120, 180];
const T = {
  bn: {title:'পুজো ভিড় ট্র্যাকার', sub:'নামহীন, সবার দেওয়া তথ্যে তৈরি। লগইন লাগে না।', search:'পুজো বা ক্লাবের নাম খুঁজুন', all:'সব',
    report:'রিপোর্ট দিন', none:'এখনো কোনো তথ্য নেই', reports:'টি রিপোর্ট', ago:'মিনিট আগে', justNow:'এইমাত্র', wait:'আনুমানিক অপেক্ষা', min:'মিনিট',
    noWait:'লাইন নেই', low:'কম তথ্য — আন্দাজমাত্র', howCrowded:'এখন কেমন ভিড়?', howLong:'লাইনে কত মিনিট লাগতে পারে?', send:'পাঠান',
    thanks:'ধন্যবাদ! আপনার রিপোর্ট নামহীনভাবে যোগ হয়েছে।', cool:'এই পুজোর জন্য আপনি সম্প্রতি রিপোর্ট দিয়েছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    addOther:'+ অন্য পুজো / ক্লাব যোগ করুন', name:'পুজো / ক্লাবের নাম', city:'শহর', cancel:'বাতিল', next:'এগিয়ে যান', badName:'নামটি ২-৪০ অক্ষরের মধ্যে ও শুধু লেখা হতে হবে।',
    demo:'⚠ ডেমো মোড: রিপোর্ট শুধু এই ফোনে সেভ হচ্ছে। সবার সাথে শেয়ার করতে ব্যাকএন্ড জুড়তে হবে।', net:'ইন্টারনেট/সার্ভারে সমস্যা। আবার চেষ্টা করুন।',
    disc:'এটি দর্শকদের আন্দাজ, সরকারি তথ্য নয়। ভিড়ে সাবধানে থাকুন ও প্রশাসনের নির্দেশ মানুন।', open:'🚦 ভিড় দেখুন', close:'বন্ধ করুন', loading:'লোড হচ্ছে…',
    ansNone:'এই পুজোর কোনো সাম্প্রতিক রিপোর্ট নেই। আপনি ওখানে থাকলে ভিড়ের রিপোর্ট দিয়ে সাহায্য করতে পারেন।', ansQuietHead:'এখন তুলনামূলক ফাঁকা (সাম্প্রতিক রিপোর্ট অনুযায়ী):', ansQuietNone:'ফাঁকা বলে রিপোর্ট করা কোনো পুজো এই মুহূর্তে নেই।'},
  en: {title:'Puja Crowd Tracker', sub:'Anonymous and crowd-sourced. No login.', search:'Search pandal or club', all:'All',
    report:'Report', none:'No reports yet', reports:' reports', ago:'min ago', justNow:'just now', wait:'Est. wait', min:'min',
    noWait:'no queue', low:'Few reports — rough guess', howCrowded:'How crowded is it now?', howLong:'How long is the queue?', send:'Submit',
    thanks:'Thanks! Your report was added anonymously.', cool:'You reported this pandal recently. Please try again later.',
    addOther:'+ Add another pandal / club', name:'Pandal / club name', city:'City', cancel:'Cancel', next:'Continue', badName:'Name must be 2–40 characters of plain text.',
    demo:'⚠ Demo mode: reports are saved on this device only. Connect a backend to share them.', net:'Network/server problem. Please retry.',
    disc:'Visitor estimates, not official information. Stay careful in crowds and follow police instructions.', open:'🚦 Crowd', close:'Close', loading:'Loading…',
    ansNone:'No recent reports for this pandal. If you are there, a report would help others.', ansQuietHead:'Relatively quiet right now (per recent reports):', ansQuietNone:'No pandal is currently reported as quiet.'}
};
const tx = k => (T[CFG.lang] || T.bn)[k];
const bnDigits = s => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const num = n => CFG.lang === 'bn' ? bnDigits(n) : String(n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').normalize('NFC').toLowerCase().replace(/[\s.,'’"\-_/()]+/g, '');
const cityName = id => { const c = CITIES.find(x => x.id === id) || CITIES[CITIES.length - 1]; return c[CFG.lang] || c.bn; };
const pName = p => p[CFG.lang] || p.bn;

/* ---------- storage / backends ---------- */
function lsGet(k, d) { try { const v = root.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
const LOCAL_KEY = 'mahamayaCrowdReports', COOL_KEY = 'mahamayaCrowdCooldown';
const Backends = {
  server: {
    demo: false,
    async fetchRecent(since) {
      const res = await fetch(`/api/crowd?since=${encodeURIComponent(since)}`, {cache: 'no-store'});
      if (!res.ok) throw new Error('fetch ' + res.status);
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.items)) throw new Error('bad response');
      return data.items;
    },
    async submit(r) {
      const res = await fetch('/api/crowd', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(r)
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'submit ' + res.status);
      }
    }
  },
  local: {
    demo: true,
    async fetchRecent(since) { return lsGet(LOCAL_KEY, []).filter(r => r.t >= since); },
    async submit(r) { const a = lsGet(LOCAL_KEY, []); a.push(r); lsSet(LOCAL_KEY, a.slice(-500)); }
  },
  supabase: {
    async fetchRecent(since) {
      const c = CFG.supabase, res = await fetch(`${c.url}/rest/v1/${c.table}?select=pid,name,city,lvl,wait,t&t=gte.${since}&order=t.desc&limit=2000`, {headers: {apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey}});
      if (!res.ok) throw new Error('fetch ' + res.status); return res.json();
    },
    async submit(r) {
      const c = CFG.supabase, res = await fetch(`${c.url}/rest/v1/${c.table}`, {method: 'POST', headers: {apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal'}, body: JSON.stringify(r)});
      if (!res.ok) throw new Error('submit ' + res.status);
    }
  },
  firebase: {
    async fetchRecent(since) {
      const c = CFG.firebase, res = await fetch(`${c.dbUrl.replace(/\/$/, '')}/${c.path}.json?orderBy=%22t%22&startAt=${since}&limitToLast=2000`);
      if (!res.ok) throw new Error('fetch ' + res.status); const o = await res.json(); return o ? Object.values(o) : [];
    },
    async submit(r) {
      const c = CFG.firebase, res = await fetch(`${c.dbUrl.replace(/\/$/, '')}/${c.path}.json`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(r)});
      if (!res.ok) throw new Error('submit ' + res.status);
    }
  }
};
const backend = () => Backends[CFG.backend] || Backends.server;

/* ---------- core logic ---------- */
let reports = [];
function cleanName(s) {
  s = String(s || '').replace(/[<>&"'`\\{}[\]]/g, '').replace(/\s+/g, ' ').trim();
  return (s.length >= 2 && s.length <= 40 && !/https?:|www\.|@/i.test(s)) ? s : null;
}
function pidFor(name, city) { return 'c:' + city + ':' + norm(name); }
function validReport(r) {
  return r && typeof r.pid === 'string' && r.pid.length <= 80 && r.lvl >= 0 && r.lvl <= 3 && Number.isInteger(r.lvl) &&
    WAITS.indexOf(r.wait) >= 0 && Number.isFinite(r.t);
}
function weightedMedian(items) {                          // items: [{v,w}]
  if (!items.length) return null;
  const s = items.slice().sort((a, b) => a.v - b.v), total = s.reduce((x, i) => x + i.w, 0);
  let acc = 0; for (const i of s) { acc += i.w; if (acc >= total / 2) return i.v; }
  return s[s.length - 1].v;
}
function aggregate(list, now) {
  now = now || Date.now(); const out = {};
  list.filter(validReport).forEach(r => {
    const ageMin = (now - r.t) / 60000; if (ageMin < -2 || ageMin > CFG.windowMin) return;
    const a = out[r.pid] || (out[r.pid] = {pid: r.pid, name: r.name, city: r.city, items: [], last: 0});
    if (r.name && !a.name) a.name = r.name; if (r.city && !a.city) a.city = r.city;
    a.items.push({lvl: r.lvl, wait: r.wait, w: Math.pow(0.5, Math.max(0, ageMin) / CFG.halfLifeMin), age: Math.max(0, ageMin)});
    a.last = Math.max(a.last, r.t);
  });
  Object.keys(out).forEach(k => {
    const a = out[k], tw = a.items.reduce((x, i) => x + i.w, 0);
    a.count = a.items.length;
    a.level = Math.max(0, Math.min(3, Math.round(a.items.reduce((x, i) => x + i.lvl * i.w, 0) / tw)));
    a.wait = weightedMedian(a.items.map(i => ({v: i.wait, w: i.w})));
    a.agoMin = Math.round((now - a.last) / 60000);
    a.lowData = a.count < 2;
  });
  return out;
}
function allPandals(agg) {                               // known list + custom ones seen in reports
  const list = PANDALS.slice();
  Object.keys(agg).forEach(pid => {
    if (!PANDALS.find(p => p.id === pid) && agg[pid].name) list.push({id: pid, city: agg[pid].city || 'oth', bn: agg[pid].name, en: agg[pid].name, alias: [agg[pid].name], custom: true});
  });
  return list;
}
function findPandal(text, agg) {
  const q = norm(text); let best = null, bestLen = 0;
  allPandals(agg || aggregate(reports)).forEach(p => p.alias.forEach(a => { const n = norm(a); if (n.length >= 3 && q.indexOf(n) >= 0 && n.length > bestLen) { best = p; bestLen = n.length; } }));
  return best;
}
function describe(a) {
  if (!a) return tx('none');
  const lv = LEVELS[CFG.lang][a.level];
  const wait = a.wait === 0 ? tx('noWait') : `${tx('wait')} ~${num(a.wait)} ${tx('min')}`;
  const ago = a.agoMin <= 1 ? tx('justNow') : `${num(a.agoMin)} ${tx('ago')}`;
  return `${lv} · ${wait} (${num(a.count)}${tx('reports')}, ${ago})${a.lowData ? ' — ' + tx('low') : ''}`;
}
function answer(text) {                                  // chatbot hook: string or null
  const agg = aggregate(reports);
  if (/ফাঁকা|কম\s*ভিড়|ভিড়\s*কম|less\s*crowd|least\s*crowd|\bempty\b|\bquiet\b/i.test(text)) {
    const quiet = Object.values(agg).filter(a => a.level <= 1).sort((x, y) => x.level - y.level || x.wait - y.wait).slice(0, 3);
    if (!quiet.length) return tx('ansQuietNone');
    const nm = a => { const p = allPandals(agg).find(p => p.id === a.pid); return p ? pName(p) : a.name; };
    return tx('ansQuietHead') + '\n' + quiet.map(a => `• ${nm(a)}: ${describe(a)}`).join('\n');
  }
  const p = findPandal(text, agg);
  if (!p) return null;
  return agg[p.id] ? `${pName(p)}: ${describe(agg[p.id])}` : `${pName(p)}: ${tx('ansNone')}`;
}
async function refresh() {
  try { reports = await backend().fetchRecent(Date.now() - CFG.windowMin * 60000); } catch (e) { /* keep old data */ return false; }
  return true;
}
function cooldownLeft(pid) {
  const m = lsGet(COOL_KEY, {}), last = m[pid] || 0, left = CFG.cooldownMin * 60000 - (Date.now() - last);
  return left > 0 ? Math.ceil(left / 60000) : 0;
}
async function submitReport({pid, name, city, lvl, wait}) {
  const left = cooldownLeft(pid); if (left) return {ok: false, error: 'cool', left};
  const r = {pid, lvl, wait, t: Date.now()};
  if (pid.startsWith('c:')) { r.name = cleanName(name); r.city = city; if (!r.name) return {ok: false, error: 'name'}; }
  if (!validReport(r)) return {ok: false, error: 'bad'};
  try { await backend().submit(r); } catch (e) { return {ok: false, error: 'net'}; }
  const m = lsGet(COOL_KEY, {}); m[pid] = Date.now(); lsSet(COOL_KEY, m);
  reports.push(r); return {ok: true};
}

/* ---------- UI ---------- */
const CSS = `
.mc-root{--mc-bg:#fff;--mc-fg:#241a14;--mc-mut:#7a6a5e;--mc-line:#eadfd5;--mc-acc:#b3261e;--mc-soft:#fff3e8;font-family:"Noto Sans Bengali","DM Sans",system-ui,sans-serif;color:var(--mc-fg);background:var(--mc-bg);line-height:1.5}
@media(prefers-color-scheme:dark){.mc-root{--mc-bg:#1f1914;--mc-fg:#f4ebe3;--mc-mut:#b6a699;--mc-line:#3a2f27;--mc-soft:#2b221b}}
.mc-root *{box-sizing:border-box}.mc-wrap{padding:14px;max-width:760px;margin:auto}
.mc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.mc-h h2{margin:0;font-size:19px}.mc-h p{margin:3px 0 0;color:var(--mc-mut);font-size:12.5px}
.mc-demo{background:#fff3cd;color:#7a5200;border-radius:10px;padding:9px 11px;font-size:12px;margin:10px 0}
.mc-chips{display:flex;gap:7px;overflow-x:auto;padding:10px 0 4px;scrollbar-width:none}.mc-chip{flex:0 0 auto;border:1px solid var(--mc-line);background:var(--mc-bg);color:var(--mc-fg);border-radius:99px;padding:7px 13px;font-size:13px;cursor:pointer}
.mc-chip[aria-pressed=true]{background:var(--mc-acc);border-color:var(--mc-acc);color:#fff}
.mc-search{width:100%;margin:8px 0;padding:11px 12px;border:1px solid var(--mc-line);border-radius:11px;background:var(--mc-bg);color:var(--mc-fg);font:inherit}
.mc-card{border:1px solid var(--mc-line);border-radius:14px;padding:12px 13px;margin:9px 0;display:flex;gap:10px;align-items:center;justify-content:space-between}
.mc-card b{font-size:14.5px}.mc-meta{font-size:12px;color:var(--mc-mut)}.mc-badge{display:inline-block;color:#fff;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:700;margin:4px 6px 2px 0}
.mc-btn{border:0;border-radius:10px;padding:9px 13px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;background:var(--mc-acc);color:#fff;white-space:nowrap}.mc-btn.alt{background:var(--mc-soft);color:var(--mc-fg);border:1px solid var(--mc-line)}.mc-btn:disabled{opacity:.5}
.mc-sheet{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;z-index:100001}
.mc-box{background:var(--mc-bg);color:var(--mc-fg);width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px;max-height:90vh;overflow:auto}
.mc-box h3{margin:0 0 4px;font-size:16px}.mc-q{font-size:13px;font-weight:700;margin:14px 0 7px}
.mc-opts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.mc-opts.w{grid-template-columns:repeat(4,1fr)}
.mc-opt{border:2px solid var(--mc-line);background:var(--mc-bg);color:var(--mc-fg);border-radius:11px;padding:10px 6px;font:inherit;font-size:13px;cursor:pointer}.mc-opt[aria-pressed=true]{border-color:var(--mc-acc);background:var(--mc-soft);font-weight:700}
.mc-in{width:100%;padding:11px;border:1px solid var(--mc-line);border-radius:10px;background:var(--mc-bg);color:var(--mc-fg);font:inherit;margin-bottom:8px}
.mc-msg{font-size:13px;margin:10px 0;padding:9px 11px;border-radius:9px;background:var(--mc-soft)}.mc-row{display:flex;gap:8px;margin-top:14px}.mc-row .mc-btn{flex:1}
.mc-foot{font-size:11.5px;color:var(--mc-mut);margin-top:14px}
.mc-launch{position:fixed;bottom:18px;z-index:99999;border:0;border-radius:99px;padding:12px 17px;background:#b3261e;color:#fff;font:700 14px "Noto Sans Bengali",system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer}
.mc-full{position:fixed;inset:0;z-index:100000;overflow:auto;background:var(--mc-bg,#fff)}
`;
let rootEl = null, state = {city: 'all', q: '', timer: null}, fullEl = null;
function injectCSS() { if (document.getElementById('mc-css')) return; const s = document.createElement('style'); s.id = 'mc-css'; s.textContent = CSS; document.head.appendChild(s); }
function cardHTML(p, a) {
  const lv = a ? `<span class="mc-badge" style="background:${COLORS[a.level]}">${esc(LEVELS[CFG.lang][a.level])}</span>` : '';
  const info = a ? `${a.wait === 0 ? tx('noWait') : esc(tx('wait')) + ' ~' + num(a.wait) + ' ' + tx('min')}<br><span class="mc-meta">${num(a.count)}${tx('reports')} · ${a.agoMin <= 1 ? tx('justNow') : num(a.agoMin) + ' ' + tx('ago')}${a.lowData ? ' · ' + tx('low') : ''}</span>` : `<span class="mc-meta">${tx('none')}</span>`;
  return `<div class="mc-card"><div><b>${esc(pName(p))}</b><div class="mc-meta">${esc(cityName(p.city))}</div>${lv}<div style="font-size:13px">${info}</div></div><button class="mc-btn" data-rep="${esc(p.id)}">${tx('report')}</button></div>`;
}
function render() {
  if (!rootEl) return;
  const agg = aggregate(reports), list = allPandals(agg);
  const q = norm(state.q);
  const shown = list.filter(p => (state.city === 'all' || p.city === state.city) && (!q || p.alias.some(a => norm(a).indexOf(q) >= 0)))
    .sort((x, y) => ((agg[y.id] ? agg[y.id].last : 0) - (agg[x.id] ? agg[x.id].last : 0)) || pName(x).localeCompare(pName(y)));
  const usedCities = CITIES.filter(c => list.some(p => p.city === c.id));
  rootEl.querySelector('.mc-chips').innerHTML = `<button class="mc-chip" data-city="all" aria-pressed="${state.city === 'all'}">${tx('all')}</button>` + usedCities.map(c => `<button class="mc-chip" data-city="${c.id}" aria-pressed="${state.city === c.id}">${esc(c[CFG.lang])}</button>`).join('');
  rootEl.querySelector('.mc-list').innerHTML = shown.map(p => cardHTML(p, agg[p.id])).join('') || `<p class="mc-meta">${tx('none')}</p>`;
}
function build(el) {
  rootEl = el; el.classList.add('mc-root');
  el.innerHTML = `<div class="mc-wrap"><div class="mc-h"><div><h2>🚦 ${tx('title')}</h2><p>${tx('sub')}</p></div></div>${backend().demo ? `<div class="mc-demo">${tx('demo')}</div>` : ''}<div class="mc-chips"></div><input class="mc-search" type="search" placeholder="${esc(tx('search'))}" aria-label="${esc(tx('search'))}"><div class="mc-list">${tx('loading')}</div><button class="mc-btn alt" data-add style="width:100%;margin-top:6px">${tx('addOther')}</button><div class="mc-foot">${tx('disc')}</div></div>`;
  el.addEventListener('click', e => {
    const c = e.target.closest('[data-city]'); if (c) { state.city = c.dataset.city; render(); return; }
    const r = e.target.closest('[data-rep]'); if (r) { openReport(r.dataset.rep); return; }
    if (e.target.closest('[data-add]')) openAdd();
  });
  el.querySelector('.mc-search').addEventListener('input', e => { state.q = e.target.value; render(); });
  render();
}
function sheet(html) {
  const s = document.createElement('div'); s.className = 'mc-sheet mc-root'; s.innerHTML = `<div class="mc-box" role="dialog" aria-modal="true">${html}</div>`;
  s.addEventListener('click', e => { if (e.target === s) s.remove(); }); document.body.appendChild(s); return s;
}
function openReport(pid, custom) {
  const known = PANDALS.find(p => p.id === pid) || allPandals(aggregate(reports)).find(p => p.id === pid) || custom;
  if (!known) return;
  let lvl = null, wait = null;
  const s = sheet(`<h3>${esc(pName(known))}</h3><div class="mc-meta">${esc(cityName(known.city))}</div>
    <div class="mc-q">${tx('howCrowded')}</div><div class="mc-opts" data-g="lvl">${LEVELS[CFG.lang].map((l, i) => `<button class="mc-opt" data-v="${i}" aria-pressed="false" style="border-left:6px solid ${COLORS[i]}">${esc(l)}</button>`).join('')}</div>
    <div class="mc-q">${tx('howLong')}</div><div class="mc-opts w" data-g="wait">${WAITS.map(w => `<button class="mc-opt" data-v="${w}" aria-pressed="false">${num(w) + (w === 180 ? '+' : '')}</button>`).join('')}</div>
    <div class="mc-meta" style="margin-top:5px">${tx('min')}</div><div class="mc-msg" hidden></div>
    <div class="mc-row"><button class="mc-btn alt" data-x>${tx('cancel')}</button><button class="mc-btn" data-send disabled>${tx('send')}</button></div>`);
  const msg = s.querySelector('.mc-msg'), send = s.querySelector('[data-send]');
  s.addEventListener('click', async e => {
    if (e.target.closest('[data-x]')) { s.remove(); return; }
    const o = e.target.closest('.mc-opt');
    if (o) { const g = o.parentElement; g.querySelectorAll('.mc-opt').forEach(b => b.setAttribute('aria-pressed', String(b === o))); if (g.dataset.g === 'lvl') lvl = Number(o.dataset.v); else wait = Number(o.dataset.v); send.disabled = lvl === null || wait === null; return; }
    if (e.target.closest('[data-send]')) {
      send.disabled = true;
      const res = await submitReport({pid, name: known.custom || pid.startsWith('c:') ? known.bn : null, city: known.city, lvl, wait});
      msg.hidden = false;
      if (res.ok) { msg.textContent = tx('thanks'); render(); setTimeout(() => s.remove(), 1200); }
      else { msg.textContent = res.error === 'cool' ? tx('cool') : res.error === 'name' ? tx('badName') : tx('net'); send.disabled = false; }
    }
  });
}
function openAdd() {
  const s = sheet(`<h3>${tx('addOther')}</h3><input class="mc-in" maxlength="40" placeholder="${esc(tx('name'))}" aria-label="${esc(tx('name'))}"><select class="mc-in" aria-label="${esc(tx('city'))}">${CITIES.map(c => `<option value="${c.id}">${esc(c[CFG.lang])}</option>`).join('')}</select><div class="mc-msg" hidden></div><div class="mc-row"><button class="mc-btn alt" data-x>${tx('cancel')}</button><button class="mc-btn" data-go>${tx('next')}</button></div>`);
  s.addEventListener('click', e => {
    if (e.target.closest('[data-x]')) { s.remove(); return; }
    if (e.target.closest('[data-go]')) {
      const name = cleanName(s.querySelector('input').value), city = s.querySelector('select').value;
      if (!name) { const m = s.querySelector('.mc-msg'); m.hidden = false; m.textContent = tx('badName'); return; }
      const known = PANDALS.find(p => p.alias.some(a => norm(a) === norm(name)));      // typed a listed name → use the listed one
      s.remove(); openReport(known ? known.id : pidFor(name, city), known ? null : {id: pidFor(name, city), city, bn: name, en: name, alias: [name], custom: true});
    }
  });
}
function startPolling() { stopPolling(); state.timer = setInterval(async () => { if (await refresh()) render(); }, CFG.refreshSec * 1000); }
function stopPolling() { if (state.timer) { clearInterval(state.timer); state.timer = null; } }
async function mount(target) {
  injectCSS(); const el = typeof target === 'string' ? document.querySelector(target) : target; if (!el) return;
  build(el); await refresh(); render(); startPolling();
}
function openFull() {
  if (fullEl) return; injectCSS();
  fullEl = document.createElement('div'); fullEl.className = 'mc-full mc-root';
  const bar = document.createElement('div'); bar.style.cssText = 'position:sticky;top:0;z-index:2;padding:8px 12px;background:var(--mc-bg);border-bottom:1px solid var(--mc-line);text-align:right';
  bar.innerHTML = `<button class="mc-btn alt">${tx('close')} ✕</button>`; fullEl.appendChild(bar);
  const body = document.createElement('div'); fullEl.appendChild(body); document.body.appendChild(fullEl);
  bar.querySelector('button').onclick = closeFull; mount(body);
}
function closeFull() { if (fullEl) { fullEl.remove(); fullEl = null; stopPolling(); rootEl = null; } }
function init() {
  if (typeof document === 'undefined') return;
  const go = () => {
    if (CFG.mount) mount(CFG.mount);
    else if (CFG.launcher) {
      injectCSS(); const b = document.createElement('button'); b.className = 'mc-launch'; b.style[CFG.launcherPosition === 'right' ? 'right' : 'left'] = '16px'; b.textContent = tx('open'); b.onclick = openFull; document.body.appendChild(b);
      refresh();                                          // warm the cache so chatbot answers work before opening
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
}
root.MahamayaCrowd = {answer, mount, open: openFull, close: closeFull, refresh, config: CFG, pandals: PANDALS,
  _core: {aggregate, validReport, cleanName, findPandal, submitReport, cooldownLeft, describe, setReports: r => { reports = r; }, pidFor, norm}};
init();
})(typeof window !== 'undefined' ? window : globalThis);
