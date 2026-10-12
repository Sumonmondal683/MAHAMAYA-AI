"use strict";
/* মহামায়া AI — ভিড় ট্র্যাকার ↔ চ্যাট জোড়া (Uses App, el from script.js) */
(() => {
  const A = App, C = window.MahamayaCrowd;
  if (!C) { console.warn("crowd.js লোড হয়নি — ফাইলটি সার্ভারে আছে কিনা এবং server.js আপডেট করা কিনা দেখুন"); return; }
  const L = () => (A.lang === "en" || A.lang === "bl" ? "en" : "bn"); // crowd.js শুধু bn/en জানে
  const sync = () => { C.config.lang = L(); };
  sync();

  const UI = {
    bn: { title: "পুজো ভিড় ট্র্যাকার", open: "🚦 ভিড় দেখুন / রিপোর্ট দিন", hint: "ভিড়ের রিপোর্ট দেখতে বা দিতে নিচের বোতাম চাপুন।" },
    en: { title: "Puja Crowd Tracker", open: "🚦 View / report crowd", hint: "Tap below to view or submit a crowd report." },
  };
  const U = () => UI[L()];

  A.quick.push({ id: "crowd", icon: "🚦", act: "crowd", label: { bn: "ভিড়", en: "Crowd", hi: "भीड़" } });

  A.acts.crowd = (b, res) => {
    sync();
    const card = el("div", "gal");
    card.append(el("h3", "", U().title));
    if (!(res && res.text)) card.append(el("p", "galmsg", U().hint)); // উত্তরের লেখা renderBot নিজেই দেখায়
    const btn = el("button", "galsend", U().open); btn.type = "button";
    btn.onclick = () => { sync(); C.open(); };
    card.append(btn); b.append(card);
  };

  // "শ্রীভূমিতে ভিড় কেমন?", "কোথায় এখন ফাঁকা?" — ভিড়ের প্রশ্ন হলে এখানেই উত্তর
  A.intents.push((q) => {
    sync();
    const r = C.answer(q);
    return r ? { act: "crowd", text: r } : null;
  });

  const prev = A.onLang;
  A.onLang = () => { if (prev) prev(); sync(); };
})();
