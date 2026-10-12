"use strict";
/* ==========================================================================
   মহামায়া AI — extras: weather · nearby pandals · weapons · voice input
   Uses App, $, el, toBn, b2l, lx, fetchJSON, store from script.js
   ========================================================================== */
(() => {
  const A = App;

  /* ---------- strings ---------- */
  const X = {
    bn: {
      now: "এখন", feels: "অনুভূত", humidity: "আর্দ্রতা", wind: "বাতাস", rain: "বৃষ্টির সম্ভাবনা", sunrise: "সূর্যোদয়", sunset: "সূর্যাস্ত",
      pujaDays: "পূজার দিনের পূর্বাভাস", hourly: "আজ এখন থেকে", change: "জায়গা বদলান", searchPh: "শহর বা গ্রামের নাম", go: "খুঁজুন", locate: "আমার অবস্থান",
      loading: "আবহাওয়া দেখা হচ্ছে…", fail: "আবহাওয়ার তথ্য আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।", retry: "আবার চেষ্টা করুন",
      noPlace: "এই নামে কোনও জায়গা পাইনি। অন্য বানানে চেষ্টা করুন।", pick: "কোন জায়গাটি?", popular: "জনপ্রিয় জায়গা",
      tipRain: (d) => `বৃষ্টির সম্ভাবনা বেশি: ${d}। ছাতা বা রেনকোট সঙ্গে রাখুন।`, tipDry: "পূজার দিনগুলোতে বৃষ্টির সম্ভাবনা কম। তবু আকাশ দেখে বেরোনো ভালো।",
      updated: (t) => `আপডেট: ${t}`, source: "তথ্য: Open-Meteo", past: "শেষ", geoDenied: "অবস্থান পাওয়া যায়নি। নিচে জায়গার নাম লিখুন।", here: "আপনার অবস্থান",
      wTitle: "দেবী দুর্গার অস্ত্র ও দাতা দেবতা", wNote: "দেবীমাহাত্ম্য অনুসারে; প্রতিমাভেদে কিছু আলাদা হতে পারে।", wGiver: "দিয়েছেন",
      pTitle: "কাছের প্যান্ডেল ও মন্দির", pLoc: "আপনার অবস্থান নিয়ে কাছের প্যান্ডেল খুঁজতে নিচের বোতাম টিপুন।", pFind: "গুগল ম্যাপে প্যান্ডেল দেখুন", pTemple: "কাছের মন্দির দেখুন",
      pNoLoc: "অবস্থান পাওয়া যায়নি, তাই সাধারণ খোঁজ দেওয়া হলো।", pAt: (n) => `আপনার অবস্থান: ${n}`, pTip: "বড় ভিড়ের সময় (সন্ধ্যা ও অষ্টমী-নবমী) দূরের প্যান্ডেলে যাওয়ার আগে ম্যাপে রাস্তা দেখে নিন।",
      micNo: "এই ব্রাউজারে ভয়েস ইনপুট চলে না।", micDenied: "মাইক্রোফোনের অনুমতি দেওয়া হয়নি।", micLabel: "ভয়েসে বলুন", micOn: "শুনছি…",
    },
    en: {
      now: "Now", feels: "Feels like", humidity: "Humidity", wind: "Wind", rain: "Chance of rain", sunrise: "Sunrise", sunset: "Sunset",
      pujaDays: "Forecast for the puja days", hourly: "Next hours today", change: "Change place", searchPh: "City or village name", go: "Search", locate: "My location",
      loading: "Fetching weather…", fail: "Could not get the weather. Check your internet and try again.", retry: "Try again",
      noPlace: "No place found with that name. Try another spelling.", pick: "Which place?", popular: "Popular places",
      tipRain: (d) => `Higher chance of rain: ${d}. Keep an umbrella or raincoat handy.`, tipDry: "Low chance of rain on the puja days. Still, keep an eye on the sky.",
      updated: (t) => `Updated: ${t}`, source: "Data: Open-Meteo", past: "Over", geoDenied: "Could not get your location. Type a place name below.", here: "Your location",
      wTitle: "Goddess Durga's weapons and who gave them", wNote: "As per the Devi Mahatmya; idols may vary a little.", wGiver: "given by",
      pTitle: "Nearby pandals and temples", pLoc: "Tap below to use your location and find pandals near you.", pFind: "See pandals on Google Maps", pTemple: "See nearby temples",
      pNoLoc: "Could not get your location, so here is a general search.", pAt: (n) => `Your location: ${n}`, pTip: "In peak crowds (evenings, Ashtami–Navami) check the route on the map before heading to far pandals.",
      micNo: "Voice input is not supported in this browser.", micDenied: "Microphone permission was not granted.", micLabel: "Speak", micOn: "Listening…",
    },
    hi: {
      now: "अभी", feels: "महसूस", humidity: "नमी", wind: "हवा", rain: "बारिश की संभावना", sunrise: "सूर्योदय", sunset: "सूर्यास्त",
      pujaDays: "पूजा के दिनों का पूर्वानुमान", hourly: "आज अगले घंटे", change: "जगह बदलें", searchPh: "शहर या गाँव का नाम", go: "खोजें", locate: "मेरी लोकेशन",
      loading: "मौसम देखा जा रहा है…", fail: "मौसम की जानकारी नहीं मिली। इंटरनेट देखकर फिर कोशिश करें।", retry: "फिर कोशिश करें",
      noPlace: "इस नाम की कोई जगह नहीं मिली। दूसरी वर्तनी आज़माएँ।", pick: "कौन सी जगह?", popular: "लोकप्रिय जगहें",
      tipRain: (d) => `बारिश की संभावना अधिक: ${d}। छाता या रेनकोट साथ रखें।`, tipDry: "पूजा के दिनों में बारिश की संभावना कम है। फिर भी आसमान देखकर निकलें।",
      updated: (t) => `अपडेट: ${t}`, source: "डेटा: Open-Meteo", past: "बीत गया", geoDenied: "लोकेशन नहीं मिली। नीचे जगह का नाम लिखें।", here: "आपकी लोकेशन",
      wTitle: "देवी दुर्गा के अस्त्र और दाता देवता", wNote: "देवीमाहात्म्य के अनुसार; प्रतिमा के अनुसार कुछ भिन्न हो सकते हैं।", wGiver: "दाता",
      pTitle: "पास के पंडाल और मंदिर", pLoc: "अपनी लोकेशन से पास के पंडाल खोजने के लिए नीचे टैप करें।", pFind: "गूगल मैप्स पर पंडाल देखें", pTemple: "पास के मंदिर देखें",
      pNoLoc: "लोकेशन नहीं मिली, इसलिए सामान्य खोज दी गई है।", pAt: (n) => `आपकी लोकेशन: ${n}`, pTip: "भीड़ के समय (शाम, अष्टमी-नवमी) दूर के पंडाल जाने से पहले मैप में रास्ता देख लें।",
      micNo: "इस ब्राउज़र में वॉइस इनपुट नहीं चलता।", micDenied: "माइक्रोफ़ोन की अनुमति नहीं मिली।", micLabel: "बोलकर पूछें", micOn: "सुन रहा हूँ…",
    },
  };
  const S = (k, ...a) => {
    const v = X[A.lang === "bl" ? "bn" : A.lang][k];
    const r = typeof v === "function" ? v(...a) : v;
    return A.lang === "bl" ? b2l(r) : r;
  };
  const fmtTime = (iso) => { const [h, m] = iso.slice(11, 16).split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString(A.LOCALE[A.lang], { hour: "numeric", minute: "2-digit" }); };
  const fmtHour = (iso) => new Date(2000, 0, 1, Number(iso.slice(11, 13))).toLocaleTimeString(A.LOCALE[A.lang], { hour: "numeric" });
  const num = (n) => (A.lang === "bn" ? toBn(n) : String(n));

  /* ---------- weather codes ---------- */
  const WK = (c) => c === 0 ? "clear" : c === 1 ? "mclear" : c === 2 ? "partly" : c === 3 ? "overcast" : (c === 45 || c === 48) ? "fog" : (c >= 51 && c <= 55) ? "drizzle"
    : (c === 56 || c === 57 || c === 66 || c === 67) ? "frz" : c === 61 ? "rain_l" : c === 63 ? "rain" : c === 65 ? "rain_h" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "snow"
    : (c === 80 || c === 81) ? "shower" : c === 82 ? "shower_h" : c >= 95 ? "thunder" : "partly";
  const WI = { clear: "☀️", mclear: "🌤️", partly: "⛅", overcast: "☁️", fog: "🌫️", drizzle: "🌦️", frz: "🌧️", rain_l: "🌦️", rain: "🌧️", rain_h: "🌧️", shower: "🌦️", shower_h: "⛈️", snow: "❄️", thunder: "⛈️" };
  const WT = {
    clear: { bn: "পরিষ্কার আকাশ", en: "Clear sky", hi: "साफ़ आसमान" }, mclear: { bn: "প্রায় পরিষ্কার", en: "Mostly clear", hi: "लगभग साफ़" },
    partly: { bn: "আংশিক মেঘলা", en: "Partly cloudy", hi: "आंशिक बादल" }, overcast: { bn: "মেঘলা", en: "Overcast", hi: "घने बादल" },
    fog: { bn: "কুয়াশা", en: "Fog", hi: "कोहरा" }, drizzle: { bn: "গুঁড়ি গুঁড়ি বৃষ্টি", en: "Drizzle", hi: "हल्की बूंदाबांदी" },
    frz: { bn: "হিমশীতল বৃষ্টি", en: "Freezing rain", hi: "जमाने वाली बारिश" }, rain_l: { bn: "হালকা বৃষ্টি", en: "Light rain", hi: "हल्की बारिश" },
    rain: { bn: "বৃষ্টি", en: "Rain", hi: "बारिश" }, rain_h: { bn: "ভারী বৃষ্টি", en: "Heavy rain", hi: "भारी बारिश" },
    shower: { bn: "বৃষ্টির ঝাপটা", en: "Rain showers", hi: "बौछारें" }, shower_h: { bn: "প্রবল বৃষ্টির ঝাপটা", en: "Violent showers", hi: "तेज़ बौछारें" },
    snow: { bn: "তুষারপাত", en: "Snow", hi: "बर्फ़बारी" }, thunder: { bn: "বজ্রসহ বৃষ্টি", en: "Thunderstorm", hi: "गरज के साथ बारिश" },
  };
  const icon = (c, day = 1) => (c === 0 && !day ? "🌙" : WI[WK(c)]);
  const desc = (c) => lx(WT[WK(c)]);

  /* ---------- places ---------- */
  const PLACES = [
    { n: ["কলকাতা", "kolkata", "calcutta", "kolkatar", "कोलकाता"], bn: "কলকাতা", en: "Kolkata", hi: "कोलकाता", lat: 22.5726, lon: 88.3639 },
    { n: ["হাওড়া", "howrah", "haora", "हावड़ा"], bn: "হাওড়া", en: "Howrah", hi: "हावड़ा", lat: 22.5958, lon: 88.2636 },
    { n: ["দুর্গাপুর", "durgapur", "दुर्गापुर"], bn: "দুর্গাপুর", en: "Durgapur", hi: "दुर्गापुर", lat: 23.5204, lon: 87.3119 },
    { n: ["আসানসোল", "asansol", "आसनसोल"], bn: "আসানসোল", en: "Asansol", hi: "आसनसोल", lat: 23.6739, lon: 86.9524 },
    { n: ["বর্ধমান", "বর্ধমান", "bardhaman", "burdwan", "बर्धमान"], bn: "বর্ধমান", en: "Bardhaman", hi: "बर्धमान", lat: 23.2324, lon: 87.8615 },
    { n: ["সিউড়ি", "suri", "siuri", "सिउड़ी"], bn: "সিউড়ি", en: "Suri", hi: "सिउड़ी", lat: 23.9094, lon: 87.526 },
    { n: ["বোলপুর", "bolpur", "बोलपुर"], bn: "বোলপুর", en: "Bolpur", hi: "बोलपुर", lat: 23.6693, lon: 87.7173 },
    { n: ["কুতুরা", "kutura"], bn: "কুতুরা, বীরভূম", en: "Kutura, Birbhum", hi: "कुतुरा, बीरभूम", lat: 23.86894, lon: 87.53349 },
    { n: ["শিলিগুড়ি", "siliguri", "सिलीगुड़ी"], bn: "শিলিগুড়ি", en: "Siliguri", hi: "सिलीगुड़ी", lat: 26.7271, lon: 88.3953 },
    { n: ["দিল্লি", "delhi", "new delhi", "दिल्ली"], bn: "দিল্লি", en: "Delhi", hi: "दिल्ली", lat: 28.6139, lon: 77.209 },
  ];
  const placeName = (p) => (p.key ? lx(p) : p.name);
  const findKnown = (txt) => {
    const t = txt.toLowerCase().trim();
    return PLACES.find((p) => p.n.some((x) => x.toLowerCase() === t));
  };
  const savedPlace = () => { try { return JSON.parse(store.get("wx_place")); } catch (e) { return null; } };
  const savePlace = (p) => store.set("wx_place", JSON.stringify(p));
  const known = (p) => ({ key: 1, bn: p.bn, en: p.en, hi: p.hi, lat: p.lat, lon: p.lon });

  async function geocode(q) {
    const lang = A.lang === "hi" ? "hi" : A.lang === "bn" ? "bn" : "en";
    let j = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=${lang}&format=json`, 7000);
    let r = (j && j.results) || [];
    if (!r.length && lang !== "en") { j = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`, 7000); r = (j && j.results) || []; }
    r.sort((a, b) => (b.country_code === "IN") - (a.country_code === "IN"));
    return r.map((x) => ({ name: [x.name, x.admin1].filter(Boolean).join(", "), sub: x.country || "", lat: x.latitude, lon: x.longitude }));
  }
  function getCoords() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("no geo"));
      navigator.geolocation.getCurrentPosition((p) => res(p.coords), rej, { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
    });
  }
  async function reverseName(lat, lon) {
    try {
      const lang = A.lang === "bn" ? "bn" : A.lang === "hi" ? "hi" : "en";
      const j = await fetchJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`, 6000);
      return [j.locality || j.city, j.principalSubdivision].filter(Boolean).join(", ") || S("here");
    } catch (e) { return S("here"); }
  }

  /* ---------- weather card ---------- */
  function mountWeather(b, query) {
    const box = el("div", "wx"); b.append(box);
    const body = el("div", "wxbody"); const picker = el("div", "wxpick");
    box.append(body, picker);

    const status = (msg, retry) => {
      body.textContent = ""; body.append(el("p", "wxmsg", msg));
      if (retry) { const r = el("button", "tool", S("retry")); r.type = "button"; r.onclick = retry; body.append(r); }
      A.keep(box.closest(".msg"));
    };

    function buildPicker(note, results) {
      picker.textContent = "";
      if (note) picker.append(el("p", "wxmsg", note));
      const f = el("form", "wxform");
      const inp = el("input"); inp.type = "text"; inp.placeholder = S("searchPh"); inp.setAttribute("aria-label", S("searchPh")); inp.autocomplete = "off"; inp.enterKeyHint = "search";
      const go = el("button", "primary", S("go")); go.type = "submit";
      const loc = el("button", "ghost", "📍 " + S("locate")); loc.type = "button";
      f.append(inp, go, loc);
      f.onsubmit = (ev) => { ev.preventDefault(); if (inp.value.trim()) search(inp.value.trim()); };
      loc.onclick = useMyLocation;
      picker.append(f);
      if (results && results.length) {
        picker.append(el("p", "wxmsg", S("pick")));
        const list = el("div", "wxlist");
        results.forEach((r) => {
          const x = el("button", "", `${r.name}${r.sub ? " · " + r.sub : ""}`); x.type = "button";
          x.onclick = () => show({ name: r.name, lat: r.lat, lon: r.lon });
          list.append(x);
        });
        picker.append(list);
      } else {
        picker.append(el("p", "wxmsg small", S("popular")));
        const chips = el("div", "chips");
        PLACES.forEach((p) => { const x = el("button", "", lx(p)); x.type = "button"; x.onclick = () => show(known(p)); chips.append(x); });
        picker.append(chips);
      }
      picker.hidden = false;
      A.keep(box.closest(".msg"));
    }

    async function search(q) {
      const k = findKnown(q);
      if (k) return show(known(k));
      status(S("loading"));
      try {
        const r = await geocode(q);
        if (!r.length) { status(S("noPlace")); return buildPicker(null); }
        if (r.length === 1) return show({ name: r[0].name, lat: r[0].lat, lon: r[0].lon });
        status(S("pick")); buildPicker(null, r);
      } catch (e) { status(S("fail"), () => search(q)); }
    }
    async function useMyLocation() {
      status(S("loading"));
      try {
        const c = await getCoords();
        const name = await reverseName(c.latitude, c.longitude);
        show({ name, lat: c.latitude, lon: c.longitude });
      } catch (e) { status(S("geoDenied")); buildPicker(null); }
    }

    async function show(place) {
      savePlace(place); picker.hidden = true;
      status(S("loading"));
      try {
        const u = "https://api.open-meteo.com/v1/forecast?latitude=" + place.lat + "&longitude=" + place.lon +
          "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day" +
          "&hourly=temperature_2m,precipitation_probability,weather_code" +
          "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=16";
        const d = await fetchJSON(u, 9000);
        render(place, d);
      } catch (e) { console.error(e); status(S("fail"), () => show(place)); buildPicker(null); }
    }

    function render(place, d) {
      body.textContent = "";
      const c = d.current, di = d.daily.time.indexOf(c.time.slice(0, 10));
      const hi0 = d.hourly.time.indexOf(c.time.slice(0, 13) + ":00");
      const head = el("div", "wxhead");
      head.append(el("b", "", placeName(place)));
      const chg = el("button", "link", S("change")); chg.type = "button"; chg.onclick = () => buildPicker(null);
      head.append(chg);
      const now = el("div", "wxnow");
      now.append(el("span", "wxicon", icon(c.weather_code, c.is_day)));
      const tt = el("div", "wxtemp"); tt.append(el("strong", "", `${num(Math.round(c.temperature_2m))}°`), el("span", "", desc(c.weather_code)));
      now.append(tt);
      const rainNow = hi0 >= 0 ? d.hourly.precipitation_probability[hi0] : null;
      const facts = el("div", "wxfacts");
      const fact = (k, v) => { const f = el("div"); f.append(el("small", "", k), el("b", "", v)); facts.append(f); };
      fact(S("feels"), `${num(Math.round(c.apparent_temperature))}°`);
      fact(S("humidity"), `${num(Math.round(c.relative_humidity_2m))}%`);
      fact(S("wind"), `${num(Math.round(c.wind_speed_10m))} km/h`);
      if (rainNow != null) fact(S("rain"), `${num(rainNow)}%`);
      if (di >= 0) { fact(S("sunrise"), fmtTime(d.daily.sunrise[di])); fact(S("sunset"), fmtTime(d.daily.sunset[di])); }
      body.append(head, now, facts);

      /* puja days */
      const wet = [], grid = el("div", "wxdays");
      A.DAYS.forEach((day) => {
        const i = d.daily.time.indexOf(day.iso), cell = el("div", "wxday");
        const isToday = day.iso === c.time.slice(0, 10);
        if (isToday) cell.classList.add("today");
        cell.append(el("small", "", A.fmtDate(day.iso, { day: "numeric", month: "long" })), el("em", "", lx(day.name)));
        if (i < 0) cell.append(el("span", "na", Date.parse(day.iso) < Date.now() - 864e5 ? S("past") : "—"));
        else {
          const p = d.daily.precipitation_probability_max[i];
          cell.append(el("span", "wxdi", icon(d.daily.weather_code[i])),
            el("b", "", `${num(Math.round(d.daily.temperature_2m_max[i]))}° / ${num(Math.round(d.daily.temperature_2m_min[i]))}°`),
            el("span", "wxrain" + (p >= 50 ? " wet" : ""), `💧 ${num(p)}%`));
          if (p >= 50) wet.push(A.fmtDate(day.iso, { weekday: "short", day: "numeric", month: "long" }));
        }
        grid.append(cell);
      });
      const h1 = el("h4", "", S("pujaDays"));
      body.append(h1, grid);
      const tip = el("p", "wxtip" + (wet.length ? " wet" : ""), wet.length ? S("tipRain", wet.join(", ")) : S("tipDry"));
      body.append(tip);

      /* next hours */
      if (hi0 >= 0) {
        body.append(el("h4", "", S("hourly")));
        const strip = el("div", "wxhours");
        for (let k = 0; k < 8 && hi0 + k < d.hourly.time.length; k++) {
          const i = hi0 + k, cell = el("div"), hr = Number(d.hourly.time[i].slice(11, 13));
          cell.append(el("small", "", k === 0 ? S("now") : fmtHour(d.hourly.time[i])), el("span", "", icon(d.hourly.weather_code[i], hr >= 6 && hr < 18 ? 1 : 0)),
            el("b", "", `${num(Math.round(d.hourly.temperature_2m[i]))}°`), el("small", "", `💧${num(d.hourly.precipitation_probability[i])}%`));
          strip.append(cell);
        }
        body.append(strip);
      }
      body.append(el("p", "wxsrc", `${S("source")} · ${S("updated", fmtTime(c.time))}`));
      A.keep(box.closest(".msg"));
    }

    /* decide what to show first */
    (async () => {
      if (query) {
        const k = findKnown(query);
        if (k) return show(known(k));
        return search(query);
      }
      const sv = savedPlace();
      if (sv) return show(sv);
      status(S("loading"));
      try { await useMyLocation(); } catch (e) { buildPicker(S("geoDenied")); }
    })();
  }
  A.acts.weather = (b, res) => mountWeather(b, res.place);

  /* intent: weather */
  const WX_RE = /(weather|forecast|abohawa|aboh?awa|আবহাওয়া|ওয়েদার|তাপমাত্রা|পূর্বাভাস|मौसम|temperature|বৃষ্টি\s*(হবে|হচ্ছে|কেমন)|brishti\s*hobe|rain\s*(today|tomorrow|forecast))/gi;
  const FILL = new Set(["আজ", "আজকের", "আজকে", "এখন", "কেমন", "কী", "কি", "রকম", "থাকবে", "হবে", "বলো", "বলুন", "দাও", "দেখাও", "এর", "এ", "র", "ও", "in", "at", "of", "for", "the", "what", "whats", "what's", "hows", "how", "is", "today", "now", "tomorrow", "puja", "pujor", "pujo", "aj", "ajke", "aaj", "ki", "kemon", "rokom", "bolo", "dekhao", "dao", "er", "e", "te", "abar", "ar", "का", "में", "आज", "कैसा", "है", "बताओ", "পূজার", "পূজায়", "তে", "তে?"]);
  A.intents.push((q) => {
    WX_RE.lastIndex = 0;
    if (!WX_RE.test(q)) return null;
    const rest = q.replace(WX_RE, " ").replace(/[?!.,।]/g, " ").split(/\s+/).filter((w) => w && !FILL.has(w.toLowerCase()));
    return { act: "weather", place: rest.length && rest.length <= 3 ? rest.join(" ") : null };
  });

  /* ---------- weapons ---------- */
  const W = [
    ["🔱", "ত্রিশূল", "Trishul (trident)", "त्रिशूल", "শিব", "Shiva", "शिव"], ["🌀", "সুদর্শন চক্র", "Sudarshana Chakra (discus)", "सुदर्शन चक्र", "বিষ্ণু", "Vishnu", "विष्णु"],
    ["🐚", "শঙ্খ", "Conch (shankha)", "शंख", "বরুণ", "Varuna", "वरुण"], ["🔥", "শক্তি (বর্শা)", "Shakti (spear)", "शक्ति (भाला)", "অগ্নি", "Agni", "अग्नि"],
    ["🏹", "ধনুক ও তীরভরা তূণ", "Bow and quiver", "धनुष और तरकश", "পবন (বায়ু)", "Pavana (Vayu)", "पवन (वायु)"], ["⚡", "বজ্র ও ঘণ্টা", "Vajra and bell", "वज्र और घंटा", "ইন্দ্র", "Indra", "इंद्र"],
    ["⏳", "কালদণ্ড", "Kaladanda (staff of time)", "कालदंड", "যম", "Yama", "यम"], ["📿", "অক্ষমালা ও কমণ্ডলু", "Rosary and kamandalu", "अक्षमाला और कमंडलु", "ব্রহ্মা", "Brahma", "ब्रह्मा"],
    ["⚔️", "খড়্গ ও ঢাল", "Sword and shield", "खड्ग और ढाल", "কাল", "Kala (Time)", "काल"], ["🪓", "কুঠার ও অভেদ্য কবচ", "Axe and armour", "कुल्हाड़ी और कवच", "বিশ্বকর্মা", "Vishwakarma", "विश्वकर्मा"],
    ["🍷", "সুরাপাত্র", "Wine cup", "सुरापात्र", "কুবের", "Kubera", "कुबेर"], ["🐍", "নাগহার", "Serpent garland", "नागहार", "শেষনাগ", "Shesha Naga", "शेषनाग"],
    ["☀️", "সূর্যরশ্মি (তেজ)", "Sun's rays (radiance)", "सूर्य की किरणें (तेज)", "সূর্য", "Surya", "सूर्य"], ["🦁", "সিংহ (বাহন)", "Lion (mount)", "सिंह (वाहन)", "হিমালয়", "Himalaya", "हिमालय"],
  ];
  A.acts.weapons = (b) => {
    const card = el("div", "wlist"); card.append(el("h3", "", S("wTitle")));
    const ix = A.lang === "en" ? [2, 5] : A.lang === "hi" ? [3, 6] : [1, 4];
    W.forEach((w) => {
      const row = el("div", "wrow");
      const nm = A.lang === "bl" ? b2l(w[1]) : w[ix[0]], gv = A.lang === "bl" ? b2l(w[4]) : w[ix[1]];
      row.append(el("span", "wem", w[0]), el("span", "wnm", nm), el("span", "wgv", `${S("wGiver")} ${gv}`));
      card.append(row);
    });
    card.append(el("p", "shint", S("wNote"))); b.append(card);
  };
  A.intents.push((q) => {
    const n = q.toLowerCase();
    if (/অস্ত্র|astra|weapon|अस्त्र|शस्त्र/.test(n) && /কী কী|কি কি|সব|সকল|দশ|তালিকা|থাকে|list|all|what|which|ki ki|कौन|क्या/.test(n) && !/দিয়েছ|দিলেন|gave|given|diye|दिया/.test(n))
      return { act: "weapons" };
    return null;
  });

  /* ---------- nearby pandals ---------- */
  A.acts.pandal = (b) => {
    const card = el("div", "pandal"); card.append(el("h3", "", S("pTitle")));
    const msg = el("p", "", S("pLoc")), links = el("div", "chips");
    card.append(msg, links); b.append(card);
    const maps = (q, c) => "https://www.google.com/maps/search/" + encodeURIComponent(q) + (c ? `/@${c.latitude},${c.longitude},15z` : "");
    const addLinks = (c) => {
      links.textContent = "";
      [["🪔 " + S("pFind"), "durga puja pandal"], ["🛕 " + S("pTemple"), "temple"]].forEach(([label, q]) => {
        const a = el("a", "lnk", label); a.href = maps(q, c); a.target = "_blank"; a.rel = "noopener"; links.append(a);
      });
    };
    (async () => {
      try {
        const c = await getCoords();
        msg.textContent = S("pAt", await reverseName(c.latitude, c.longitude));
        addLinks(c);
      } catch (e) { msg.textContent = S("pNoLoc"); addLinks(null); }
      card.append(el("p", "shint", S("pTip")));
      A.keep(b.closest(".msg"));
    })();
  };

  /* ---------- voice input ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $("mic");
  if (!SR) { mic.hidden = true; }
  else {
    let rec = null;
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = A.lang === "bl" ? "bn-IN" : A.LOCALE[A.lang]; rec.interimResults = false; rec.maxAlternatives = 1;
      mic.classList.add("on"); $("input").placeholder = S("micOn");
      rec.onresult = (ev) => { const t = ev.results[0][0].transcript; if (t) A.ask(t); };
      rec.onerror = (ev) => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") A.say({ text: S("micDenied") }); };
      rec.onend = () => { rec = null; mic.classList.remove("on"); $("input").placeholder = A.T().ph; };
      try { rec.start(); } catch (e) { rec = null; mic.classList.remove("on"); }
    };
  }
  A.onLang = () => { mic.setAttribute("aria-label", S("micLabel")); mic.title = S("micLabel"); };

  /* ---------- quick actions (order matters) ---------- */
  A.quick.push({ id: "schedule", icon: "🗓️", act: "schedule" }, { id: "weather", icon: "☁️", act: "weather" },
    { id: "pandal", icon: "📍", act: "pandal" }, { id: "weapons", icon: "🔱", act: "weapons" });
})();
